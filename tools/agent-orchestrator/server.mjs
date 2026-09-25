// Servidor MCP (stdio) "bangalores-orchestrator": quadro de tarefas compartilhado + despacho
// headless para Codex e Antigravity. Feito para o Claude Code orquestrar os outros agentes,
// mas qualquer cliente MCP (Codex, Antigravity) pode se conectar ao mesmo quadro em disco.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { ASSIGNEES, KINDS, PRIORITIES, STATUSES, createTask, findTask, isReady, blockedBy, pickNext, reviewTask, summarize, updateTask, findPathConflicts, conflictMessage } from './lib/board.mjs'
import { mutateBoard, readBoard, loadRun, readTail } from './lib/store.mjs'
import { AGENTS, resolveBinary } from './lib/agents.mjs'
import { buildBrief } from './lib/brief.mjs'
import { dispatchTask, cancelRun, reconcileOrphans, isAlive } from './lib/dispatch.mjs'
import { readHandoffStatus } from './lib/handoff.mjs'

const now = () => new Date().toISOString()

const INSTRUCTIONS = `Quadro de tarefas para orquestrar Claude Code, Codex (arte) e Antigravity (QA) no Bangalores Web.
Fluxo: task_create -> task_dispatch (Codex/Antigravity rodam sozinhos em segundo plano) ou task_brief (texto para colar num agente já aberto) -> acompanhar com task_list/task_get -> task_review (accept ou changes_requested com feedback).
- Ciclo de status: todo -> in_progress -> review -> done. Só o orquestrador aceita (review -> done).
- paths evita colisão: duas tarefas em andamento não podem tocar as mesmas pastas/arquivos (a menos que force).
- depends_on encadeia tarefas; a dependente só fica pronta quando as anteriores estão done.
- handoff_status lê as filas que já existem nos docs (ART-XXX, QA-XXX). O quadro referencia esses ids em refs.
- Agentes conectados a este mesmo MCP podem chamar task_next (pegar a próxima) e task_update (reportar) sozinhos.`

const server = new McpServer({ name: 'bangalores-orchestrator', version: '0.1.0' }, { instructions: INSTRUCTIONS })

const text = (t) => ({ content: [{ type: 'text', text: t }] })
const json = (o) => text(JSON.stringify(o, null, 2))

/** Registra uma ferramenta; qualquer erro vira resposta isError em vez de derrubar o servidor. */
function tool(name, title, description, inputSchema, handler) {
  server.registerTool(name, { title, description, inputSchema }, async (args) => {
    try {
      return await handler(args ?? {})
    } catch (err) {
      return { isError: true, content: [{ type: 'text', text: `Erro: ${err.message}` }] }
    }
  })
}

const assignee = z.enum(ASSIGNEES)
const status = z.enum(STATUSES)

function line(board, task) {
  const s = summarize(board, task)
  const flags = [s.running ? 'executando' : '', s.status === 'todo' && !s.ready ? `bloqueada por ${s.blockedBy.join(',')}` : ''].filter(Boolean)
  return `${s.id} [${s.priority}] ${s.status.padEnd(11)} ${s.assignee.padEnd(11)} ${s.kind.padEnd(8)} ${s.title}${s.refs.length ? `  {${s.refs.join(', ')}}` : ''}${flags.length ? `  (${flags.join('; ')})` : ''}`
}

// ---------------------------------------------------------------------------------------

tool(
  'agents_list',
  'Agentes e carga de trabalho',
  'Lista os agentes (Claude Code, Codex, Antigravity, Felipe), o papel de cada um, se dá para despachar tarefas para eles sem interface (executável encontrado) e quantas tarefas cada um tem por status.',
  {},
  () => {
    reconcileOrphans()
    const board = readBoard()
    const out = Object.entries(AGENTS).map(([id, a]) => {
      const mine = board.tasks.filter((t) => t.assignee === id)
      const counts = Object.fromEntries(STATUSES.map((s) => [s, mine.filter((t) => t.status === s).length]).filter(([, n]) => n))
      const binary = a.dispatchable ? resolveBinary(id) : null
      return { agent: id, label: a.label, role: a.role, docs: a.docs, headless: a.dispatchable ? (binary ? { available: true, binary } : { available: false }) : null, tasks: counts }
    })
    return json(out)
  }
)

tool(
  'task_create',
  'Criar tarefa',
  'Cria uma tarefa no quadro. Escreva `description` como brief completo (o agente só verá isso + as regras do projeto): objetivo, contexto, o que NÃO fazer. Use `paths` para reservar as pastas/arquivos que ela vai mexer (evita colisão com outra tarefa em andamento) e `refs` para ligar a ART-XXX/QA-XXX.',
  {
    title: z.string().describe('Título curto e específico.'),
    description: z.string().optional().describe('Brief completo da tarefa.'),
    assignee: assignee.optional().describe('Quem executa (padrão: claude).'),
    kind: z.enum(KINDS).optional().describe('art, qa, code, research, docs ou other.'),
    priority: z.enum(PRIORITIES).optional().describe('P0 (urgente) a P3. Padrão P2.'),
    depends_on: z.array(z.string()).optional().describe('Ids (T-001) que precisam estar done antes.'),
    paths: z.array(z.string()).optional().describe('Pastas/arquivos que a tarefa toca, ex.: public/assets/battle/**'),
    acceptance: z.array(z.string()).optional().describe('Critérios de aceite verificáveis.'),
    refs: z.array(z.string()).optional().describe('Ids existentes nos docs: ART-033, QA-005…'),
  },
  (a) =>
    text(
      mutateBoard((board) => {
        const task = createTask(board, { ...a, dependsOn: a.depends_on }, now())
        return `Criada: ${line(board, task)}`
      })
    )
)

tool(
  'task_list',
  'Listar tarefas',
  'Lista tarefas do quadro, mais prioritárias primeiro. Por padrão esconde done/cancelled. `needs_attention` mostra só o que exige ação do orquestrador (em revisão ou bloqueadas).',
  {
    assignee: assignee.optional(),
    status: status.optional(),
    kind: z.enum(KINDS).optional(),
    needs_attention: z.boolean().optional().describe('Só review + blocked.'),
    include_closed: z.boolean().optional().describe('Incluir done e cancelled.'),
  },
  (a) => {
    const fixed = reconcileOrphans()
    const board = readBoard()
    let tasks = board.tasks
    if (a.assignee) tasks = tasks.filter((t) => t.assignee === a.assignee)
    if (a.status) tasks = tasks.filter((t) => t.status === a.status)
    if (a.kind) tasks = tasks.filter((t) => t.kind === a.kind)
    if (a.needs_attention) tasks = tasks.filter((t) => ['review', 'blocked'].includes(t.status))
    else if (!a.include_closed && !a.status) tasks = tasks.filter((t) => !['done', 'cancelled'].includes(t.status))
    tasks = [...tasks].sort((x, y) => PRIORITIES.indexOf(x.priority) - PRIORITIES.indexOf(y.priority) || x.id.localeCompare(y.id))
    const head = fixed.length ? `⚠ Execuções órfãs bloqueadas: ${fixed.join(', ')}\n` : ''
    return text(head + (tasks.length ? tasks.map((t) => line(board, t)).join('\n') : 'Nenhuma tarefa com esse filtro.'))
  }
)

tool(
  'task_get',
  'Detalhes da tarefa',
  'Mostra a tarefa completa (descrição, aceite, histórico, resultado reportado) e, se houver execução headless, o estado dela e o final do log do agente.',
  { id: z.string(), log_chars: z.number().int().min(0).max(20000).optional().describe('Quantos caracteres do final do log (padrão 1500).') },
  (a) => {
    reconcileOrphans()
    const board = readBoard()
    const task = findTask(board, a.id)
    const runId = task.activeRun ?? task.runs.at(-1)
    const run = runId ? loadRun(runId) : null
    const view = { ...task, ready: isReady(board, task), blockedBy: blockedBy(board, task) }
    if (run) {
      const limit = a.log_chars ?? 1500
      view.lastRun = {
        id: run.id,
        agent: run.agent,
        status: run.status,
        startedAt: run.startedAt,
        endedAt: run.endedAt,
        exitCode: run.exitCode,
        runnerAlive: isAlive(run.runnerPid),
        logTail: readTail(run.files.out, limit).trim(),
        errTail: run.status === 'failed' ? readTail(run.files.err, Math.min(limit, 1500)).trim() : undefined,
      }
    }
    return json(view)
  }
)

tool(
  'task_update',
  'Atualizar tarefa',
  'Altera status, campos ou registra uma nota. Agentes usam isto para reportar: `status: "review"` + `summary` + `deliverables` quando terminam (ou `blocked` com `note` explicando). `by` identifica quem está atualizando.',
  {
    id: z.string(),
    by: assignee.optional().describe('Quem está atualizando (padrão claude).'),
    status: status.optional(),
    note: z.string().optional().describe('Nota que entra no histórico.'),
    summary: z.string().optional().describe('Resumo do que foi feito (resultado).'),
    deliverables: z.array(z.string()).optional().describe('Arquivos criados/alterados.'),
    title: z.string().optional(),
    description: z.string().optional(),
    assignee: assignee.optional().describe('Reatribuir.'),
    kind: z.enum(KINDS).optional(),
    priority: z.enum(PRIORITIES).optional(),
    depends_on: z.array(z.string()).optional(),
    paths: z.array(z.string()).optional(),
    acceptance: z.array(z.string()).optional(),
    refs: z.array(z.string()).optional(),
    force: z.boolean().optional().describe('Ignora dependências pendentes e conflito de paths ao ir para in_progress.'),
  },
  (a) =>
    text(
      mutateBoard((board) => {
        const { id, by, depends_on, ...patch } = a
        const task = updateTask(board, id, { ...patch, dependsOn: depends_on }, by ?? 'claude', now())
        return `Atualizada: ${line(board, task)}`
      })
    )
)

tool(
  'task_next',
  'Pegar a próxima tarefa',
  'Para agentes conectados a este MCP: reserva (→ in_progress) a tarefa pronta de maior prioridade atribuída ao agente e devolve o brief completo. Devolve aviso se não houver nada pronto.',
  { agent: assignee.describe('Quem está pedindo trabalho.'), force: z.boolean().optional() },
  (a) => {
    const picked = mutateBoard((board) => {
      const task = pickNext(board, a.agent)
      if (!task) return null
      if (!a.force) {
        const conflicts = findPathConflicts(board, task)
        if (conflicts.length) throw new Error(conflictMessage(task, conflicts))
      }
      updateTask(board, task.id, { status: 'in_progress', note: 'reservada via task_next', force: true }, a.agent, now())
      return { id: task.id, brief: buildBrief(task, board, { mode: 'paste' }) }
    })
    return text(picked ? picked.brief : `Nenhuma tarefa pronta para ${a.agent}.`)
  }
)

tool(
  'task_review',
  'Revisar entrega',
  'O orquestrador julga uma tarefa em `review`: `accept` a conclui (done); `changes_requested` devolve para todo com o feedback, que aparece no próximo brief/despacho.',
  { id: z.string(), verdict: z.enum(['accept', 'changes_requested']), feedback: z.string().optional().describe('Obrigatório em changes_requested.') },
  (a) =>
    text(
      mutateBoard((board) => {
        const task = reviewTask(board, a.id, a.verdict, a.feedback, 'claude', now())
        return `Revisada: ${line(board, task)}`
      })
    )
)

tool(
  'task_brief',
  'Gerar brief para colar',
  'Devolve o prompt completo da tarefa (papel, objetivo, aceite, regras do projeto, formato de relatório) para colar num agente que já está aberto, como o app do Codex. Não altera o quadro.',
  { id: z.string(), mode: z.enum(['paste', 'dispatch']).optional().describe('paste (padrão) inclui a dica de reportar via task_update.') },
  (a) => {
    const board = readBoard()
    return text(buildBrief(findTask(board, a.id), board, { mode: a.mode ?? 'paste' }))
  }
)

tool(
  'task_dispatch',
  'Despachar para o agente (headless)',
  'Roda o agente responsável pela tarefa em segundo plano (Codex: `codex exec`; Antigravity: `agy --print`) e devolve na hora. Ao terminar, a tarefa vai para `review` (ou `blocked`) com o relatório dele; acompanhe com task_get/task_list. Nunca usa bypass de sandbox.',
  {
    id: z.string(),
    sandbox: z.enum(['read-only', 'workspace-write']).optional().describe('Só Codex. Padrão workspace-write.'),
    model: z.string().optional().describe('Sobrescreve o modelo do agente.'),
    timeout_minutes: z.number().int().min(1).max(240).optional().describe('Padrão 30.'),
    unattended: z.boolean().optional().describe('Só Antigravity: aprova permissões sozinho (--dangerously-skip-permissions). Use só se ele travar pedindo confirmação.'),
    force: z.boolean().optional().describe('Ignora dependências pendentes e conflito de paths.'),
  },
  (a) => {
    const run = dispatchTask(a.id, { sandbox: a.sandbox, model: a.model, timeoutMinutes: a.timeout_minutes, unattended: a.unattended, force: a.force })
    return text(`Despachada ${run.taskId} para ${run.agent} (execução ${run.id}, runner pid ${run.runnerPid}). Acompanhe com task_get ${run.taskId}; cancele com run_cancel.`)
  }
)

tool(
  'run_cancel',
  'Cancelar execução',
  'Interrompe a execução headless em andamento da tarefa (mata o agente) e devolve a tarefa para todo.',
  { id: z.string(), reason: z.string().optional() },
  (a) => {
    const run = cancelRun(a.id, a.reason)
    return text(`Execução ${run?.id ?? '(desconhecida)'} cancelada; ${a.id.toUpperCase()} voltou para todo.`)
  }
)

tool(
  'handoff_status',
  'Filas dos docs (ART/QA)',
  'Lê os docs que já coordenam Codex e Antigravity: pedidos ART-XXX (docs/VISUAL_DEVELOPMENT_HANDOFF.md) e achados QA-XXX (docs/QA_TESTING_GUIDE.md), mostrando o que ainda está aberto.',
  { source: z.enum(['art', 'qa', 'all']).optional(), state: z.enum(['open', 'all']).optional().describe('open (padrão) esconde o que já foi integrado/resolvido.') },
  (a) => {
    const { art, qa, missing } = readHandoffStatus(a.source ?? 'all')
    const only = (items) => (a.state === 'all' ? items : items.filter((i) => i.open))
    const parts = []
    if (a.source !== 'qa') parts.push(`## ART (handoff visual): ${only(art).length} de ${art.length}`, ...only(art).map((i) => `${i.id}  ${i.status}  —  ${i.title}${i.owner ? `  (${i.owner})` : ''}`))
    if (a.source !== 'art') parts.push(`## QA (guia de playtest): ${only(qa).length} de ${qa.length}`, ...only(qa).map((i) => `${i.id}  ${i.status}${i.severity ? ` / ${i.severity}` : ''}  —  ${i.title}`))
    if (missing.length) parts.push(`(não encontrei: ${missing.join(', ')})`)
    return text(parts.join('\n'))
  }
)

await server.connect(new StdioServerTransport())
