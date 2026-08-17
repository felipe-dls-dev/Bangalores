import { describe, it, expect } from 'vitest'
import { useGame, EQUIPMENT, resolveCombatRoll, deriveLevel, guildMissionById, druidHealProc, equipmentAffinity } from './game'

// Must mirror balanceEquipment's own grouping key exactly (game.ts), including the
// weapon-affinity fallback for mao_direita items with no classeExclusiva — a naive
// classeExclusiva-only grouping produces false-positive "violations" here, the same
// mistake made (and fixed) earlier this session when auditing shop prices manually.
function groupKey(item: (typeof EQUIPMENT)[number]) {
  const affinity = item.slot === 'mao_direita' ? equipmentAffinity(item) : undefined
  const owner = item.classeExclusiva ?? affinity ?? 'universal'
  return `${owner}:${item.slot}`
}

describe('resolveCombatRoll', () => {
  it('roll 1 is a fumble: no damage to target, self-damage instead', () => {
    const r = resolveCombatRoll(10, 2, 1, 3)
    expect(r.damage).toBe(0)
    expect(r.selfDamage).toBeGreaterThan(0)
  })
  it('roll 6 is a critical hit: more damage than a normal roll', () => {
    const normal = resolveCombatRoll(10, 2, 3, 3)
    const crit = resolveCombatRoll(10, 2, 6, 3)
    expect(crit.damage).toBeGreaterThan(normal.damage)
    expect(crit.selfDamage).toBe(0)
  })
  it('defense roll 6 (perfect defense) roughly halves damage vs defense roll 3', () => {
    const normalDefense = resolveCombatRoll(10, 2, 4, 3)
    const perfectDefense = resolveCombatRoll(10, 2, 4, 6)
    expect(perfectDefense.damage).toBeLessThan(normalDefense.damage)
  })
  it('damage is never negative and always at least 1 on a real hit', () => {
    const r = resolveCombatRoll(1, 50, 3, 3)
    expect(r.damage).toBeGreaterThanOrEqual(1)
  })
})

describe('deriveLevel', () => {
  it('starts at level 1 with zero xp', () => {
    expect(deriveLevel(0).lvl).toBe(1)
  })
  it('level is monotonically non-decreasing as xp grows', () => {
    let lastLvl = 1
    for (let xp = 0; xp <= 5000; xp += 137) {
      const lvl = deriveLevel(xp).lvl
      expect(lvl).toBeGreaterThanOrEqual(lastLvl)
      lastLvl = lvl
    }
  })
})

describe('EQUIPMENT balancing (balanceEquipment)', () => {
  it('within any class/slot group, price never decreases as power increases', () => {
    const groups = new Map<string, typeof EQUIPMENT>()
    for (const item of EQUIPMENT) {
      if (item.slot === 'bolsa') continue
      const key = groupKey(item)
      groups.set(key, [...(groups.get(key) ?? []), item])
    }
    const power = (e: (typeof EQUIPMENT)[number]) => e.ataque * 2 + e.defesa * 2 + e.vida * 0.5
    // Pairwise (not adjacent-after-sort) so items tied on power don't produce false
    // positives from arbitrary tie-break ordering: a strictly weaker item must never
    // cost strictly more than a strictly stronger one in the same group.
    let violations = 0
    for (const items of groups.values()) {
      for (const a of items) for (const b of items) {
        if (power(a) < power(b) && a.preco > b.preco) violations++
      }
    }
    expect(violations).toBe(0)
  })

  it('small equipment groups do not get stretched across the full rarity range', () => {
    // Regression guard: groups with only a few items used to always span comum..lendário
    // and level 1..17 regardless of size, wildly over-pricing the strongest of e.g. 3 items.
    const groups = new Map<string, typeof EQUIPMENT>()
    for (const item of EQUIPMENT) {
      if (item.slot === 'bolsa') continue
      const key = groupKey(item)
      groups.set(key, [...(groups.get(key) ?? []), item])
    }
    for (const items of groups.values()) {
      if (items.length > 4) continue
      const levels = items.map(i => i.nivelMinimo ?? 1)
      expect(Math.max(...levels)).toBeLessThanOrEqual(items.length * 2)
    }
  })
})

describe('guildMissionById', () => {
  it('generation 1 (base id) resolves to the base mission', () => {
    const mission = guildMissionById('caca_inicial')
    expect(mission?.nome).toBe('Limpeza das Estradas')
  })
  it('later generations are harder and pay more than the base', () => {
    const base = guildMissionById('caca_inicial')!
    const gen2 = guildMissionById('caca_inicial__2')!
    expect(gen2.dificuldade).toBeGreaterThan(base.dificuldade)
    if (gen2.recompensa.tipo === 'gold' && base.recompensa.tipo === 'gold') {
      expect(gen2.recompensa.valor).toBeGreaterThan(base.recompensa.valor)
    }
  })
  it('unknown mission ids resolve to undefined', () => {
    expect(guildMissionById('nao_existe')).toBeUndefined()
  })
})

describe('newGame() resets all per-combat/session bonus fields', () => {
  it('does not leak state from a previous campaign into a fresh one', () => {
    useGame.getState().newGame('arcanista')
    // simulate a "dirty" previous session the way real skills would leave it
    useGame.setState({
      classRollBonus: 10,
      groupCriticalBoost: true,
      combatAttackPct: 0.3,
      combatDefensePct: 0.3,
      extraHeroAttacks: 2,
      guardianTaunt: true,
      combatMinions: [{ id: 'ghost', nome: 'Capanga Fantasma', hp: 5, maxHp: 5, ataque: 3 }],
      equipmentGems: { alguma_espada: ['rubi'] },
      craftedEffects: { alguma_espada: 'critico' }
    } as any)

    useGame.getState().newGame('guerreiro')
    const s = useGame.getState()
    expect(s.classRollBonus).toBe(0)
    expect(s.groupCriticalBoost).toBe(false)
    expect(s.combatAttackPct).toBe(0)
    expect(s.combatDefensePct).toBe(0)
    expect(s.extraHeroAttacks).toBe(0)
    expect(s.guardianTaunt).toBe(false)
    expect(s.combatMinions).toEqual([])
    expect(s.equipmentGems).toEqual({})
    expect(s.craftedEffects).toEqual({})
  })
})

describe('druidHealProc', () => {
  it('is zero for non-Druida heroes regardless of equipment', () => {
    useGame.getState().newGame('guerreiro')
    const s = useGame.getState()
    expect(druidHealProc(s).chance).toBe(0)
  })
  it('is zero for the Druida with no nature weapon/offhand equipped', () => {
    useGame.getState().newGame('druida')
    useGame.setState({ equipped: {} } as any)
    const s = useGame.getState()
    expect(druidHealProc(s).chance).toBe(0)
  })
  it('scales up with higher rarity/level gear', () => {
    useGame.getState().newGame('druida')
    const starter = useGame.getState()
    const starterProc = druidHealProc(starter)

    const topWeapon = EQUIPMENT.filter(e => e.classeExclusiva === 'druida' && e.slot === 'mao_direita').sort((a, b) => (b.nivelMinimo ?? 0) - (a.nivelMinimo ?? 0))[0]
    const topOffhand = EQUIPMENT.filter(e => e.classeExclusiva === 'druida' && e.slot === 'mao_esquerda').sort((a, b) => (b.nivelMinimo ?? 0) - (a.nivelMinimo ?? 0))[0]
    useGame.setState({ equipped: { ...useGame.getState().equipped, mao_direita: topWeapon.id, mao_esquerda: topOffhand.id } } as any)
    const topProc = druidHealProc(useGame.getState())

    expect(topProc.chance).toBeGreaterThan(starterProc.chance)
    expect(topProc.amount).toBeGreaterThan(starterProc.amount)
    expect(topProc.chance).toBeLessThanOrEqual(0.45)
  })
})
