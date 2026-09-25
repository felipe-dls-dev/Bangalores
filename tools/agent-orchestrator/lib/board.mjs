// Lógica pura do quadro de tarefas: nada aqui toca disco nem relógio (o "agora" entra por
// parâmetro), para que tudo seja testável sem processos externos. A persistência com lock
// fica em store.mjs.

export const STATUSES = ['todo', 'in_progress', 'blocked', 'review', 'done', 'cancelled']
export const ASSIGNEES = ['claude', 'codex', 'antigravity', 'felipe']
export const KINDS = ['art', 'qa', 'code', 'research', 'docs', 'other']
export const PRIORITIES = ['P0', 'P1', 'P2', 'P3']

// Ciclo: todo -> in_progress -> review -> done. `review` é o "pronto para revisão" do agente
// (equivale ao READY FOR CODE do doc de handoff); só o orquestrador leva a `done`.
const TRANSITIONS = {
  todo: ['in_progress', 'blocked', 'cancelled'],
  in_progress: ['review', 'blocked', 'todo', 'done', 'cancelled'],
  blocked: ['todo', 'in_progress', 'cancelled'],
  review: ['done', 'todo', 'in_progress', 'cancelled'],
  done: ['todo'],
  cancelled: ['todo'],
}

export function emptyBoard() {
  return { version: 1, nextId: 1, tasks: [] }
}

const uniq = (list) => [...new Set((list ?? []).map((s) => String(s).trim()).filter(Boolean))]

export function normalizePath(p) {
  const segments = String(p).replace(/\\/g, '/').replace(/^\.\//, '').split('/')
  const literal = []
  for (const seg of segments) {
    if (seg.includes('*')) break // `public/assets/**` reserva a pasta `public/assets`
    literal.push(seg)
  }
  return literal.filter(Boolean).join('/').toLowerCase()
}

export function pathsOverlap(a, b) {
  const x = normalizePath(a)
  const y = normalizePath(b)
  if (!x || !y) return false
  return x === y || x.startsWith(`${y}/`) || y.startsWith(`${x}/`)
}

export function findTask(board, id) {
  const task = board.tasks.find((t) => t.id === String(id).toUpperCase())
  if (!task) throw new Error(`Tarefa ${id} não existe.`)
  return task
}

function assertIn(value, allowed, label) {
  if (!allowed.includes(value)) throw new Error(`${label} inválido: "${value}". Use: ${allowed.join(', ')}.`)
}

function note(task, by, event, text, now) {
  task.history.push({ at: now, by, event, ...(text ? { note: text } : {}) })
  task.updatedAt = now
}

export function createTask(board, input, now) {
  const title = String(input.title ?? '').trim()
  if (!title) throw new Error('title é obrigatório.')
  const assignee = input.assignee ?? 'claude'
  const kind = input.kind ?? 'other'
  const priority = input.priority ?? 'P2'
  assertIn(assignee, ASSIGNEES, 'assignee')
  assertIn(kind, KINDS, 'kind')
  assertIn(priority, PRIORITIES, 'priority')
  const dependsOn = uniq(input.dependsOn).map((d) => d.toUpperCase())
  for (const dep of dependsOn) findTask(board, dep)

  const task = {
    id: `T-${String(board.nextId).padStart(3, '0')}`,
    title,
    description: String(input.description ?? '').trim(),
    kind,
    assignee,
    priority,
    status: 'todo',
    dependsOn,
    paths: uniq(input.paths),
    acceptance: uniq(input.acceptance),
    refs: uniq(input.refs),
    createdBy: input.createdBy ?? 'claude',
    createdAt: now,
    updatedAt: now,
    activeRun: null,
    runs: [],
    feedback: [],
    result: null,
    history: [],
  }
  board.nextId += 1
  note(task, task.createdBy, 'created', `atribuída a ${assignee}`, now)
  board.tasks.push(task)
  return task
}

/** Dependências ainda não concluídas (cancelada também bloqueia: ajuste depends_on). */
export function blockedBy(board, task) {
  return task.dependsOn.filter((id) => board.tasks.find((t) => t.id === id)?.status !== 'done')
}

export function isReady(board, task) {
  return task.status === 'todo' && blockedBy(board, task).length === 0
}

/** Tarefas em andamento de OUTRO dono que mexem nas mesmas pastas/arquivos. */
export function findPathConflicts(board, task) {
  if (!task.paths.length) return []
  const out = []
  for (const other of board.tasks) {
    if (other.id === task.id || other.status !== 'in_progress' || !other.paths.length) continue
    const shared = task.paths.filter((p) => other.paths.some((q) => pathsOverlap(p, q)))
    if (shared.length) out.push({ id: other.id, title: other.title, assignee: other.assignee, paths: shared })
  }
  return out
}

const priorityRank = (p) => PRIORITIES.indexOf(p)

export function pickNext(board, agent) {
  return board.tasks
    .filter((t) => t.assignee === agent && isReady(board, t))
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || a.id.localeCompare(b.id))[0]
}

/**
 * Atualiza campos e/ou status. `patch.summary`/`patch.deliverables` registram o resultado
 * (é o que o agente manda ao dizer "terminei").
 */
export function updateTask(board, id, patch, by, now) {
  const task = findTask(board, id)
  const changes = []

  for (const field of ['title', 'description']) {
    if (patch[field] !== undefined && patch[field] !== task[field]) {
      task[field] = String(patch[field]).trim()
      changes.push(field)
    }
  }
  if (patch.assignee !== undefined && patch.assignee !== task.assignee) {
    assertIn(patch.assignee, ASSIGNEES, 'assignee')
    task.assignee = patch.assignee
    changes.push(`assignee→${patch.assignee}`)
  }
  if (patch.kind !== undefined && patch.kind !== task.kind) {
    assertIn(patch.kind, KINDS, 'kind')
    task.kind = patch.kind
    changes.push(`kind→${patch.kind}`)
  }
  if (patch.priority !== undefined && patch.priority !== task.priority) {
    assertIn(patch.priority, PRIORITIES, 'priority')
    task.priority = patch.priority
    changes.push(`priority→${patch.priority}`)
  }
  if (patch.dependsOn !== undefined) {
    const deps = uniq(patch.dependsOn).map((d) => d.toUpperCase())
    for (const dep of deps) {
      findTask(board, dep)
      if (dep === task.id) throw new Error('Uma tarefa não pode depender dela mesma.')
    }
    task.dependsOn = deps
    changes.push('dependsOn')
  }
  for (const field of ['paths', 'acceptance', 'refs']) {
    if (patch[field] !== undefined) {
      task[field] = uniq(patch[field])
      changes.push(field)
    }
  }

  if (patch.summary !== undefined || patch.deliverables !== undefined) {
    task.result = {
      ...(task.result ?? {}),
      summary: patch.summary !== undefined ? String(patch.summary).trim() : task.result?.summary ?? '',
      deliverables: patch.deliverables !== undefined ? uniq(patch.deliverables) : task.result?.deliverables ?? [],
      verdict: task.result?.verdict ?? null,
      reportedBy: by,
    }
    changes.push('result')
  }

  if (patch.status !== undefined && patch.status !== task.status) {
    assertIn(patch.status, STATUSES, 'status')
    if (!TRANSITIONS[task.status].includes(patch.status)) {
      throw new Error(`Transição ${task.status} → ${patch.status} não é permitida (permitidas: ${TRANSITIONS[task.status].join(', ')}).`)
    }
    if (patch.status === 'in_progress' && !patch.force) {
      const pending = blockedBy(board, task)
      if (pending.length) throw new Error(`${task.id} depende de ${pending.join(', ')} (ainda não concluídas). Use force para ignorar.`)
      const conflicts = findPathConflicts(board, task)
      if (conflicts.length) throw new Error(conflictMessage(task, conflicts))
    }
    if (['todo', 'done', 'cancelled'].includes(patch.status)) task.activeRun = null
    const from = task.status
    task.status = patch.status
    changes.push(`${from}→${patch.status}`)
  }

  if (!changes.length && !patch.note) throw new Error('Nada para atualizar: informe status, note ou algum campo.')
  note(task, by, changes.length ? `update: ${changes.join(', ')}` : 'note', patch.note, now)
  return task
}

export function conflictMessage(task, conflicts) {
  const detail = conflicts.map((c) => `${c.id} (${c.assignee}) em ${c.paths.join(', ')}`).join('; ')
  return `${task.id} mexe em áreas que já estão em andamento: ${detail}. Espere terminar, ajuste paths ou use force.`
}

/** O orquestrador aceita (→ done) ou devolve com feedback (→ todo, o feedback vai no próximo brief). */
export function reviewTask(board, id, verdict, feedback, by, now) {
  const task = findTask(board, id)
  if (task.status !== 'review') throw new Error(`${task.id} está em "${task.status}", só dá para revisar o que está em "review".`)
  if (verdict === 'accept') {
    task.status = 'done'
    note(task, by, 'review: aceita', feedback, now)
  } else if (verdict === 'changes_requested') {
    if (!String(feedback ?? '').trim()) throw new Error('changes_requested exige feedback explicando o que ajustar.')
    task.feedback.push({ at: now, by, text: String(feedback).trim() })
    task.status = 'todo'
    task.activeRun = null
    note(task, by, 'review: mudanças pedidas', feedback, now)
  } else {
    throw new Error('verdict inválido: use accept ou changes_requested.')
  }
  return task
}

/** Aplica o desfecho de uma execução headless (chamado pelo runner ao terminar o processo). */
export function applyRunOutcome(board, taskId, runId, outcome, now) {
  const task = findTask(board, taskId)
  if (task.activeRun !== runId) return null // cancelada ou substituída: não pisar no estado atual
  task.activeRun = null
  const { parsed, text, failure } = outcome
  const tail = String(text ?? '').trim().slice(-600)

  if (failure) {
    task.status = 'blocked'
    task.result = { summary: `Execução falhou: ${failure}${tail ? `\n${tail}` : ''}`, deliverables: [], verdict: 'FALHA', reportedBy: task.assignee }
    note(task, task.assignee, `execução ${runId} falhou`, failure, now)
    return task
  }
  task.result = {
    summary: parsed.summary || tail || '(o agente não devolveu texto)',
    deliverables: parsed.deliverables,
    verdict: parsed.verdict ?? 'SEM_FORMATO',
    blockers: parsed.blockers || undefined,
    reportedBy: task.assignee,
  }
  task.status = parsed.verdict === 'BLOQUEADO' ? 'blocked' : 'review'
  note(task, task.assignee, `execução ${runId} terminou`, `veredito: ${task.result.verdict}`, now)
  return task
}

export function summarize(board, task) {
  return {
    id: task.id,
    title: task.title,
    assignee: task.assignee,
    kind: task.kind,
    priority: task.priority,
    status: task.status,
    ready: isReady(board, task),
    blockedBy: blockedBy(board, task),
    refs: task.refs,
    running: Boolean(task.activeRun),
    updatedAt: task.updatedAt,
  }
}
