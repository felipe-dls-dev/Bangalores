import { describe, expect, it } from 'vitest'
import {
  emptyBoard, createTask, updateTask, reviewTask, blockedBy, isReady, pickNext,
  findPathConflicts, pathsOverlap, normalizePath, applyRunOutcome,
} from '../lib/board.mjs'

const T0 = '2026-09-24T12:00:00.000Z'
const make = (board, input) => createTask(board, input, T0)

describe('createTask', () => {
  it('gera ids sequenciais T-001, T-002 e aplica padrões', () => {
    const board = emptyBoard()
    const a = make(board, { title: 'A' })
    const b = make(board, { title: 'B', assignee: 'codex', kind: 'art', priority: 'P0' })
    expect([a.id, b.id]).toEqual(['T-001', 'T-002'])
    expect(a).toMatchObject({ assignee: 'claude', kind: 'other', priority: 'P2', status: 'todo' })
    expect(b).toMatchObject({ assignee: 'codex', kind: 'art', priority: 'P0' })
  })

  it('rejeita título vazio, enum inválido e dependência inexistente', () => {
    const board = emptyBoard()
    expect(() => make(board, { title: '  ' })).toThrow(/title/)
    expect(() => make(board, { title: 'x', assignee: 'gpt' })).toThrow(/assignee/)
    expect(() => make(board, { title: 'x', priority: 'P9' })).toThrow(/priority/)
    expect(() => make(board, { title: 'x', dependsOn: ['T-042'] })).toThrow(/T-042/)
    expect(board.tasks).toHaveLength(0)
  })

  it('normaliza listas: tira vazios e duplicatas', () => {
    const t = make(emptyBoard(), { title: 'x', paths: ['a', ' a ', '', 'b'], refs: ['ART-1', 'ART-1'] })
    expect(t.paths).toEqual(['a', 'b'])
    expect(t.refs).toEqual(['ART-1'])
  })
})

describe('dependências', () => {
  it('a dependente só fica pronta quando a anterior está done', () => {
    const board = emptyBoard()
    const a = make(board, { title: 'A' })
    const b = make(board, { title: 'B', dependsOn: ['t-001'] })
    expect(blockedBy(board, b)).toEqual(['T-001'])
    expect(isReady(board, b)).toBe(false)
    expect(() => updateTask(board, b.id, { status: 'in_progress' }, 'claude', T0)).toThrow(/depende de T-001/)

    updateTask(board, a.id, { status: 'in_progress' }, 'claude', T0)
    updateTask(board, a.id, { status: 'done' }, 'claude', T0)
    expect(isReady(board, b)).toBe(true)
  })

  it('não permite depender de si mesma', () => {
    const board = emptyBoard()
    const a = make(board, { title: 'A' })
    expect(() => updateTask(board, a.id, { dependsOn: [a.id] }, 'claude', T0)).toThrow(/dela mesma/)
  })
})

describe('transições de status', () => {
  it('bloqueia saltos inválidos (todo -> done) e aceita o ciclo normal', () => {
    const board = emptyBoard()
    const a = make(board, { title: 'A' })
    expect(() => updateTask(board, a.id, { status: 'done' }, 'claude', T0)).toThrow(/não é permitida/)
    updateTask(board, a.id, { status: 'in_progress' }, 'codex', T0)
    updateTask(board, a.id, { status: 'review', summary: 'feito', deliverables: ['x.png'] }, 'codex', T0)
    expect(a.result).toMatchObject({ summary: 'feito', deliverables: ['x.png'], reportedBy: 'codex' })
    expect(a.history.at(-1)).toMatchObject({ by: 'codex' })
  })

  it('exige alguma mudança ou nota', () => {
    const board = emptyBoard()
    const a = make(board, { title: 'A' })
    expect(() => updateTask(board, a.id, {}, 'claude', T0)).toThrow(/Nada para atualizar/)
    expect(() => updateTask(board, 'T-099', { note: 'x' }, 'claude', T0)).toThrow(/não existe/)
  })
})

describe('paths e colisão', () => {
  it('normaliza globs e separadores do Windows', () => {
    expect(normalizePath('public\\Assets\\battle\\**')).toBe('public/assets/battle')
    expect(normalizePath('./src/*.ts')).toBe('src')
  })

  it('detecta pai/filho e ignora pastas irmãs', () => {
    expect(pathsOverlap('public/assets/battle/**', 'public/assets/battle/sprites/x.png')).toBe(true)
    expect(pathsOverlap('public/assets/battle', 'public/assets/battle-old')).toBe(false)
    expect(pathsOverlap('src', 'public')).toBe(false)
  })

  it('impede iniciar tarefa cuja pasta já está em andamento e libera com force', () => {
    const board = emptyBoard()
    const a = make(board, { title: 'A', paths: ['public/assets/battle/**'] })
    const b = make(board, { title: 'B', assignee: 'antigravity', paths: ['public/assets/battle/sprites'] })
    updateTask(board, a.id, { status: 'in_progress' }, 'codex', T0)
    expect(findPathConflicts(board, b)).toHaveLength(1)
    expect(() => updateTask(board, b.id, { status: 'in_progress' }, 'antigravity', T0)).toThrow(/T-001/)
    updateTask(board, b.id, { status: 'in_progress', force: true }, 'antigravity', T0)
    expect(b.status).toBe('in_progress')
  })
})

describe('pickNext', () => {
  it('escolhe a mais prioritária pronta do agente, ignorando bloqueadas e de outros', () => {
    const board = emptyBoard()
    make(board, { title: 'baixa', assignee: 'codex', priority: 'P3' })
    const blocked = make(board, { title: 'bloqueada', assignee: 'codex', priority: 'P0', dependsOn: ['T-001'] })
    const urgent = make(board, { title: 'urgente', assignee: 'codex', priority: 'P1' })
    make(board, { title: 'de outro', assignee: 'antigravity', priority: 'P0' })
    expect(pickNext(board, 'codex').id).toBe(urgent.id)
    expect(pickNext(board, 'codex').id).not.toBe(blocked.id)
    expect(pickNext(board, 'felipe')).toBeUndefined()
  })
})

describe('reviewTask', () => {
  const inReview = () => {
    const board = emptyBoard()
    const a = make(board, { title: 'A', assignee: 'codex' })
    updateTask(board, a.id, { status: 'in_progress' }, 'codex', T0)
    updateTask(board, a.id, { status: 'review' }, 'codex', T0)
    return { board, a }
  }

  it('accept leva a done', () => {
    const { board, a } = inReview()
    reviewTask(board, a.id, 'accept', '', 'claude', T0)
    expect(a.status).toBe('done')
  })

  it('changes_requested devolve a todo guardando o feedback', () => {
    const { board, a } = inReview()
    expect(() => reviewTask(board, a.id, 'changes_requested', ' ', 'claude', T0)).toThrow(/feedback/)
    reviewTask(board, a.id, 'changes_requested', 'Refaça o fundo.', 'claude', T0)
    expect(a.status).toBe('todo')
    expect(a.feedback.map((f) => f.text)).toEqual(['Refaça o fundo.'])
  })

  it('só revisa o que está em review', () => {
    const board = emptyBoard()
    const a = make(board, { title: 'A' })
    expect(() => reviewTask(board, a.id, 'accept', '', 'claude', T0)).toThrow(/review/)
  })
})

describe('applyRunOutcome', () => {
  const running = () => {
    const board = emptyBoard()
    const a = make(board, { title: 'A', assignee: 'codex' })
    a.status = 'in_progress'
    a.activeRun = 'R-1'
    return { board, a }
  }
  const parsed = (over = {}) => ({ verdict: 'CONCLUIDO', summary: 'ok', deliverables: ['a.png'], blockers: '', ...over })

  it('relatório CONCLUIDO -> review com o resumo do agente', () => {
    const { board, a } = running()
    applyRunOutcome(board, a.id, 'R-1', { parsed: parsed(), text: 'texto' }, T0)
    expect(a).toMatchObject({ status: 'review', activeRun: null })
    expect(a.result).toMatchObject({ verdict: 'CONCLUIDO', summary: 'ok', deliverables: ['a.png'] })
  })

  it('BLOQUEADO vira blocked; falha do processo vira blocked com a causa', () => {
    const { board, a } = running()
    applyRunOutcome(board, a.id, 'R-1', { parsed: parsed({ verdict: 'BLOQUEADO' }), text: '' }, T0)
    expect(a.status).toBe('blocked')

    const other = running()
    applyRunOutcome(other.board, other.a.id, 'R-1', { parsed: parsed({ verdict: null }), text: 'stderr', failure: 'saiu com código 1' }, T0)
    expect(other.a.status).toBe('blocked')
    expect(other.a.result.summary).toMatch(/saiu com código 1/)
  })

  it('sem o bloco de relatório vai para review marcado SEM_FORMATO', () => {
    const { board, a } = running()
    applyRunOutcome(board, a.id, 'R-1', { parsed: parsed({ verdict: null, summary: '' }), text: 'fiz tudo' }, T0)
    expect(a.status).toBe('review')
    expect(a.result).toMatchObject({ verdict: 'SEM_FORMATO', summary: 'fiz tudo' })
  })

  it('ignora o desfecho de uma execução cancelada/substituída', () => {
    const { board, a } = running()
    a.activeRun = 'R-2'
    expect(applyRunOutcome(board, a.id, 'R-1', { parsed: parsed(), text: '' }, T0)).toBeNull()
    expect(a.status).toBe('in_progress')
  })
})
