import { describe, expect, it } from 'vitest'
import { coopContributions, coopRewardShare, coopShareTable } from './coopMath'

const members = [
  { user_id: 'a', display_name: 'Ana', hero_id: 'guerreiro' },
  { user_id: 'b', display_name: 'Beto', hero_id: 'druida' },
  { user_id: 'c', display_name: 'Caio', hero_id: 'arcanista' },
]

// Referência: o rateio exatamente como estava escrito em CoopBattleSync (main.tsx) antes de virar helper.
function referenceShare(battle: any, userId: string, memberCount: number) {
  const damage = battle.damageByPlayer ?? {}, healing = battle.healingByPlayer ?? {}, resisted = battle.damageResistedByPlayer ?? {}
  const contributors = new Set([...Object.keys(damage), ...Object.keys(healing), ...Object.keys(resisted)])
  const contributions: Record<string, number> = Object.fromEntries([...contributors].map((id) => [id, Math.max(0, Number(damage[id]) || 0) + Math.max(0, Number(healing[id]) || 0) + Math.max(0, Number(resisted[id]) || 0)]))
  const total = Object.values(contributions).reduce((sum, value) => sum + value, 0)
  const mine = contributions[userId] ?? 0
  return total > 0 ? mine / total : 1 / Math.max(1, memberCount)
}

const battles = [
  { damageByPlayer: { a: 100, b: 20 }, healingByPlayer: { b: 40 }, damageResistedByPlayer: { a: 60 } },
  { damageByPlayer: { a: 10 } },
  { damageByPlayer: { a: 0, b: 0 } },
  {},
  { damageByPlayer: { a: -5, b: 30 }, healingByPlayer: { c: 'x' } },
]

describe('rateio da recompensa no coop', () => {
  it('bate com a conta original em vários cenários (inclusive sem contribuição e valores estranhos)', () => {
    for (const battle of battles) for (const m of members) expect(coopRewardShare(battle, m.user_id, members.length)).toBeCloseTo(referenceShare(battle, m.user_id, members.length), 10)
  })

  it('soma dano, cura e dano evitado', () => {
    expect(coopContributions(battles[0])).toEqual({ a: 160, b: 60 })
  })

  it('sem nenhuma contribuição divide igual entre os membros', () => {
    expect(coopRewardShare({}, 'a', 4)).toBeCloseTo(0.25, 10)
    expect(coopRewardShare({ damageByPlayer: { a: 0 } }, 'b', 2)).toBeCloseTo(0.5, 10)
  })

  it('a tabela lista todos, ordenada por parte, e as partes somam 1', () => {
    const table = coopShareTable(battles[0], members)
    expect(table.map((r) => r.userId)).toEqual(['a', 'b', 'c'])
    expect(table.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1, 10)
    expect(table[0]).toMatchObject({ name: 'Ana', damage: 100, healing: 0, resisted: 60 })
    expect(table[2].share).toBe(0) // quem não contribuiu fica com 0
  })

  it('empate mantém a ordem dos membros', () => {
    const table = coopShareTable({}, members)
    expect(table.map((r) => r.userId)).toEqual(['a', 'b', 'c'])
  })

  it('membro sem nome vira "Aventureiro"', () => {
    expect(coopShareTable({}, [{ user_id: 'z' }])[0].name).toBe('Aventureiro')
  })
})
