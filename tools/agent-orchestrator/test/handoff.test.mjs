import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseHandoff, parseQa } from '../lib/handoff.mjs'
import { repoRoot } from '../lib/paths.mjs'

describe('parseHandoff', () => {
  const doc = [
    '## Request Log',
    '### ART-011 - Treasure chest variants',
    'Status: INTEGRATED',
    'Owner: Codex; integration: Claude Code',
    '',
    '### ART-033 - Novo sprite',
    'Status: READY FOR CODE',
    'Requested by: Claude Code',
    '',
    '### ART-034 - Sem status',
    'Gameplay purpose: x',
  ].join('\n')

  it('extrai id, título, status e dono; INTEGRATED não é aberto', () => {
    const items = parseHandoff(doc)
    expect(items.map((i) => [i.id, i.status, i.open])).toEqual([
      ['ART-011', 'INTEGRATED', false],
      ['ART-033', 'READY FOR CODE', true],
      ['ART-034', '(sem Status)', true],
    ])
    expect(items[0].owner).toMatch(/Codex/)
  })

  it('ignora o template ART-XXX', () => {
    expect(parseHandoff('### ART-XXX - Short feature name\nStatus: REQUESTED')).toEqual([])
  })
})

describe('parseQa', () => {
  const doc = [
    '## Findings Log',
    '### QA-001 - Desync',
    'Found by: Antigravity',
    'Severity: confusing',
    '',
    '### QA-003 - Favicon',
    'Status: resolved by Codex.',
    'Found by: Antigravity',
    'Severity: cosmetic',
    '',
    '### QA-005 - Corrigido no lugar',
    'Found by: Antigravity',
    'Fix applied: ajustei o guard em game.ts',
    '',
    '### QA-006 - Ainda sem correção',
    'Fix applied: none yet, falta decisão',
  ].join('\n')

  it('resolvido = Status resolved ou Fix applied real; "none yet" continua aberto', () => {
    expect(parseQa(doc).map((i) => [i.id, i.open])).toEqual([
      ['QA-001', true],
      ['QA-003', false],
      ['QA-005', false],
      ['QA-006', true],
    ])
    expect(parseQa(doc)[0]).toMatchObject({ severity: 'confusing', foundBy: 'Antigravity' })
  })

  it('ignora o template QA-XXX', () => {
    expect(parseQa('### QA-XXX - Short title\nFound by: x')).toEqual([])
  })
})

describe('docs reais do repositório', () => {
  const read = (rel) => fs.readFileSync(path.join(repoRoot(), rel), 'utf8')

  it('acha os pedidos ART e sabe que ART-011 já foi integrado', () => {
    const items = parseHandoff(read('docs/VISUAL_DEVELOPMENT_HANDOFF.md'))
    expect(items.length).toBeGreaterThan(20)
    expect(items.find((i) => i.id === 'ART-011')).toMatchObject({ open: false })
  })

  it('acha os achados QA e reconhece o QA-003 como resolvido', () => {
    const items = parseQa(read('docs/QA_TESTING_GUIDE.md'))
    expect(items.length).toBeGreaterThanOrEqual(3)
    expect(items.find((i) => i.id === 'QA-003')).toMatchObject({ open: false })
  })
})
