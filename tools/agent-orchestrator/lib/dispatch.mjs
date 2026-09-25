// Despacho headless: prepara a execução e sobe o runner desacoplado; cancela e reconcilia.
//
// O runner (runner.mjs) é um processo separado e "desanexado" de propósito: ele sobrevive a
// reinício do servidor MCP/sessão do Claude Code e é ele quem grava o desfecho no quadro.

import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { AGENTS, resolveBinary, buildInvocation } from './agents.mjs'
import { buildBrief, parseReport } from './brief.mjs'
import { blockedBy, findPathConflicts, conflictMessage, findTask, applyRunOutcome } from './board.mjs'
import { mutateBoard, saveRun, loadRun, patchRun, runPaths } from './store.mjs'
import { repoRoot, runsDir } from './paths.mjs'

const runnerScript = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'runner.mjs')
const now = () => new Date().toISOString()

export function isAlive(pid) {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return err.code === 'EPERM' // existe, mas sem permissão para sinalizar
  }
}

/** Mata o processo e os filhos dele (no Windows o agente é neto do runner). */
export function killTree(pid) {
  if (!pid) return
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true })
  else {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      // já morreu
    }
  }
}

/**
 * Marca a tarefa como em andamento e dispara o runner. Retorna o registro da execução.
 * Valida agente, binário, dependências e conflito de pastas ANTES de gastar uma execução.
 */
export function dispatchTask(taskId, opts = {}) {
  const runId = `R-${taskId.toUpperCase()}-${Date.now().toString(36)}`
  let assignee
  let brief

  mutateBoard((board) => {
    const task = findTask(board, taskId)
    assignee = task.assignee
    if (!AGENTS[assignee]?.dispatchable) throw new Error(`${AGENTS[assignee].label} não tem execução headless; use task_brief e entregue o texto a essa pessoa/agente.`)
    if (task.activeRun) throw new Error(`${task.id} já tem uma execução em andamento (${task.activeRun}). Use run_cancel antes de despachar de novo.`)
    if (!['todo', 'blocked'].includes(task.status)) throw new Error(`${task.id} está em "${task.status}"; só dá para despachar tarefas em todo ou blocked.`)
    if (!opts.force) {
      const pending = blockedBy(board, task)
      if (pending.length) throw new Error(`${task.id} depende de ${pending.join(', ')} (ainda não concluídas). Use force para ignorar.`)
      const conflicts = findPathConflicts(board, task)
      if (conflicts.length) throw new Error(conflictMessage(task, conflicts))
    }
    if (!resolveBinary(assignee)) throw new Error(`Não achei o executável de ${AGENTS[assignee].label}. Defina ORCH_${assignee === 'codex' ? 'CODEX' : 'AGY'}_BIN.`)

    task.status = 'in_progress'
    task.activeRun = runId
    task.runs.push(runId)
    task.history.push({ at: now(), by: 'claude', event: 'despachada', note: `execução ${runId} (${assignee})` })
    task.updatedAt = now()
    brief = buildBrief(task, board, { mode: 'dispatch' })
  })

  const paths = runPaths(runId)
  const cwd = repoRoot()
  const timeoutMinutes = opts.timeoutMinutes ?? 30
  try {
    fs.mkdirSync(runsDir(), { recursive: true })
    fs.writeFileSync(paths.brief, brief)
    const bin = resolveBinary(assignee)
    const inv = buildInvocation(assignee, {
      bin,
      cwd,
      briefFile: paths.brief,
      lastMessageFile: paths.lastMessage,
      sandbox: opts.sandbox,
      model: opts.model,
      unattended: opts.unattended,
      timeoutMinutes,
    })
    const run = {
      id: runId,
      taskId: taskId.toUpperCase(),
      agent: assignee,
      status: 'running',
      startedAt: now(),
      endedAt: null,
      exitCode: null,
      timeoutMinutes,
      cwd,
      bin: inv.bin,
      args: inv.args,
      stdinFile: inv.stdinFile,
      resultFrom: inv.resultFrom,
      files: paths,
      runnerPid: null,
      agentPid: null,
    }
    saveRun(run)
    const child = spawn(process.execPath, [runnerScript, runId], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    })
    child.unref()
    return patchRun(runId, { runnerPid: child.pid })
  } catch (err) {
    // Não deixa a tarefa presa em in_progress por causa de uma falha de preparo.
    mutateBoard((board) => {
      const task = findTask(board, taskId)
      if (task.activeRun === runId) {
        task.activeRun = null
        task.status = 'todo'
        task.history.push({ at: now(), by: 'claude', event: 'despacho falhou', note: err.message })
        task.updatedAt = now()
      }
    })
    throw err
  }
}

/** Cancela a execução ativa da tarefa: mata os processos e devolve a tarefa para todo. */
export function cancelRun(taskId, reason = 'cancelada pelo orquestrador') {
  let run = null
  mutateBoard((board) => {
    const task = findTask(board, taskId)
    if (!task.activeRun) throw new Error(`${task.id} não tem execução em andamento.`)
    run = loadRun(task.activeRun)
    task.activeRun = null
    task.status = 'todo'
    task.history.push({ at: now(), by: 'claude', event: 'execução cancelada', note: reason })
    task.updatedAt = now()
    if (run) {
      run.status = 'cancelled'
      run.endedAt = now()
      saveRun(run)
    }
  })
  if (run) {
    killTree(run.runnerPid)
    killTree(run.agentPid)
  }
  return run
}

/**
 * Execuções cujo runner morreu sem gravar o desfecho (máquina reiniciada, processo morto no
 * Gerenciador de Tarefas) ficariam eternamente "em andamento". Detecta e bloqueia a tarefa.
 */
export function reconcileOrphans() {
  const fixed = []
  mutateBoard((board) => {
    for (const task of board.tasks) {
      if (!task.activeRun) continue
      const run = loadRun(task.activeRun)
      if (!run || run.status !== 'running') {
        if (run?.status === 'cancelled') task.activeRun = null
        continue
      }
      if (run.runnerPid && isAlive(run.runnerPid)) continue
      applyRunOutcome(board, task.id, run.id, { failure: 'o processo do runner desapareceu antes de terminar', text: '' }, now())
      run.status = 'failed'
      run.endedAt = now()
      saveRun(run)
      fixed.push(task.id)
    }
  })
  return fixed
}

export { parseReport }
