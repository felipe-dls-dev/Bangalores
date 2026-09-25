// Processo desanexado que executa UM agente headless e grava o desfecho no quadro.
// Uso (interno): node runner.mjs <runId>

import fs from 'node:fs'
import { spawn } from 'node:child_process'
import { loadRun, patchRun, mutateBoard, readTail } from './lib/store.mjs'
import { applyRunOutcome } from './lib/board.mjs'
import { parseReport, detectHeadlessFailure } from './lib/brief.mjs'
import { killTree } from './lib/dispatch.mjs'

const runId = process.argv[2]
if (!runId) {
  console.error('uso: node runner.mjs <runId>')
  process.exit(2)
}

const run = loadRun(runId)
if (!run) {
  console.error(`execução ${runId} não encontrada`)
  process.exit(2)
}

const now = () => new Date().toISOString()
const outFd = fs.openSync(run.files.out, 'a')
const errFd = fs.openSync(run.files.err, 'a')
const stdinFd = run.stdinFile ? fs.openSync(run.stdinFile, 'r') : null

let timedOut = false
let finished = false

function finish({ exitCode, spawnError }) {
  if (finished) return
  finished = true
  clearTimeout(timer)
  const current = loadRun(runId)
  if (current?.status === 'cancelled') return process.exit(0) // o orquestrador já cuidou do estado

  // O resultado do agente vem do arquivo de "última mensagem" (codex) ou do stdout (agy).
  const text =
    (run.resultFrom === 'lastMessage' ? readTail(run.files.lastMessage, 20000) : '').trim() ||
    readTail(run.files.out, 20000)
  const stderrText = readTail(run.files.err, 4000).trim()
  const parsed = parseReport(text)
  const failure = spawnError
    ? `não consegui iniciar o agente: ${spawnError}`
    : timedOut
      ? `estourou o limite de ${run.timeoutMinutes} min e foi interrompido`
      : exitCode !== 0
        ? `saiu com código ${exitCode}`
        : parsed.verdict
          ? ''
          : detectHeadlessFailure(`${text}\n${stderrText}`) // o agy escreve o erro em stderr e sai com 0

  mutateBoard((board) => {
    applyRunOutcome(board, run.taskId, runId, { parsed, text: text || stderrText, failure }, now())
  })
  patchRun(runId, {
    status: failure ? 'failed' : 'finished',
    endedAt: now(),
    exitCode,
    parsed,
  })
  process.exit(0)
}

let child
let timer
try {
  child = spawn(run.bin, run.args, {
    cwd: run.cwd,
    stdio: [stdinFd ?? 'ignore', outFd, errFd],
    windowsHide: true,
  })
} catch (err) {
  finish({ exitCode: null, spawnError: err.message })
}

if (child) {
  patchRun(runId, { agentPid: child.pid })
  timer = setTimeout(
    () => {
      timedOut = true
      killTree(child.pid)
    },
    (run.timeoutMinutes ?? 30) * 60 * 1000
  )
  child.on('error', (err) => finish({ exitCode: null, spawnError: err.message }))
  child.on('close', (code) => finish({ exitCode: code }))
}
