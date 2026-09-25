import { describe, expect, it } from 'vitest'
import { emptyBoard, createTask, updateTask, reviewTask } from '../lib/board.mjs'
import { buildBrief, parseReport, detectHeadlessFailure } from '../lib/brief.mjs'

const T0 = '2026-09-24T12:00:00.000Z'

describe('parseReport', () => {
  it('lê o bloco padrão', () => {
    const r = parseReport(
      ['Terminei.', '', 'RESULTADO: CONCLUIDO', 'RESUMO: Gerei o sprite e conferi o alpha.', 'ENTREGAVEIS:', '- public/assets/a.png', '- public/assets/b.png', 'BLOQUEIOS: nenhum'].join('\n')
    )
    expect(r).toEqual({
      verdict: 'CONCLUIDO',
      summary: 'Gerei o sprite e conferi o alpha.',
      deliverables: ['public/assets/a.png', 'public/assets/b.png'],
      blockers: '',
    })
  })

  it('tolera markdown, acentos, crases e resumo em várias linhas', () => {
    const r = parseReport(
      ['**RESULTADO:** CONCLUÍDO', '**RESUMO:** Primeira linha.', 'Segunda linha.', '**ENTREGÁVEIS:**', '1. `src/x.ts`', '* `src/y.ts`', '**BLOQUEIOS/DÚVIDAS:** nenhum'].join('\n')
    )
    expect(r.verdict).toBe('CONCLUIDO')
    expect(r.summary).toBe('Primeira linha.\nSegunda linha.')
    expect(r.deliverables).toEqual(['src/x.ts', 'src/y.ts'])
    expect(r.blockers).toBe('')
  })

  it('reconhece PARCIAL e BLOQUEADO com o motivo', () => {
    expect(parseReport('RESULTADO: PARCIAL\nRESUMO: metade').verdict).toBe('PARCIAL')
    const r = parseReport('RESULTADO: BLOQUEADO\nRESUMO: parei\nBLOQUEIOS: falta decidir o tamanho do tile')
    expect(r.verdict).toBe('BLOQUEADO')
    expect(r.blockers).toBe('falta decidir o tamanho do tile')
  })

  it('usa a ÚLTIMA ocorrência (o agente pode ter ecoado o formato antes)', () => {
    const r = parseReport('RESULTADO: CONCLUIDO | PARCIAL | BLOQUEADO\n\nfiz coisas\n\nRESULTADO: PARCIAL\nRESUMO: só a metade')
    expect(r.verdict).toBe('PARCIAL')
    expect(r.summary).toBe('só a metade')
  })

  it('devolve vazio quando não há relatório', () => {
    expect(parseReport('só conversa')).toEqual({ verdict: null, summary: '', deliverables: [], blockers: '' })
    expect(parseReport('')).toMatchObject({ verdict: null })
  })
})

describe('detectHeadlessFailure', () => {
  it('reconhece a negação de permissão do agy', () => {
    expect(detectHeadlessFailure('jetski: no output produced — a tool required the "command" permission that headless mode cannot prompt for, so it was auto-denied.')).toMatch(/unattended/)
    expect(detectHeadlessFailure('RESULTADO: CONCLUIDO')).toBe('')
  })
})

describe('buildBrief', () => {
  const setup = () => {
    const board = emptyBoard()
    const dep = createTask(board, { title: 'Base', assignee: 'codex' }, T0)
    dep.status = 'done'
    dep.result = { summary: 'Base pronta em public/assets/base.png', deliverables: [] }
    const task = createTask(
      board,
      {
        title: 'Sprite do boss', description: 'Gerar o sprite do boss final.', assignee: 'codex', kind: 'art',
        dependsOn: [dep.id], paths: ['public/assets/battle/**'], acceptance: ['PNG com alpha'], refs: ['ART-099'],
      },
      T0
    )
    return { board, task }
  }

  it('reúne papel, objetivo, aceite, áreas, contexto das dependências e regras', () => {
    const { board, task } = setup()
    const brief = buildBrief(task, board)
    expect(brief).toContain('# Tarefa T-002 — Sprite do boss')
    expect(brief).toContain('Codex')
    expect(brief).toContain('Gerar o sprite do boss final.')
    expect(brief).toContain('- PNG com alpha')
    expect(brief).toContain('`public/assets/battle/**`')
    expect(brief).toContain('T-001 (Base): Base pronta')
    expect(brief).toContain('ART-099')
    expect(brief).toContain('docs/VISUAL_DEVELOPMENT_HANDOFF.md')
    expect(brief).toContain('Não faça commit')
    expect(brief).toContain('RESULTADO: CONCLUIDO')
  })

  it('o modo paste menciona task_update; o dispatch não', () => {
    const { board, task } = setup()
    expect(buildBrief(task, board, { mode: 'paste' })).toContain('task_update')
    expect(buildBrief(task, board, { mode: 'dispatch' })).not.toContain('task_update')
  })

  it('o feedback da revisão anterior entra no brief seguinte', () => {
    const { board, task } = setup()
    updateTask(board, task.id, { status: 'in_progress' }, 'codex', T0)
    updateTask(board, task.id, { status: 'review' }, 'codex', T0)
    reviewTask(board, task.id, 'changes_requested', 'O fundo não está transparente.', 'claude', T0)
    expect(buildBrief(task, board)).toContain('O fundo não está transparente.')
  })

  it('o formato que pedimos ao agente é o que o parser entende (round-trip)', () => {
    const { board, task } = setup()
    const template = buildBrief(task, board).split('```')[1]
    expect(parseReport(template.replace('CONCLUIDO | PARCIAL | BLOQUEADO', 'CONCLUIDO')).verdict).toBe('CONCLUIDO')
  })
})
