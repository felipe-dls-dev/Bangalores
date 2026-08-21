import { describe, it, expect, vi } from 'vitest'
import { useGame, EQUIPMENT, EQUIPMENT_LEVELS, resolveCombatRoll, deriveLevel, guildMissionById, druidHealProc, equipmentAffinity, enemyIntentFor, equipmentSetCounts, itemSkillEffectText, applyElementalStatus, tickStatus, collectionMastery } from './game'

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

describe('sistemas de build aprofundados', () => {
  it('todo equipamento não-bolsa possui efeito ativo estruturado', () => {
    for (const item of EQUIPMENT.filter(e => e.slot !== 'bolsa')) {
      expect(item.activeEffect).toBeDefined()
      expect(itemSkillEffectText(item)).toContain(item.activeEffect!.description)
    }
  })

  it('conjuntos são contados pelo setId explícito', () => {
    const pieces = EQUIPMENT.filter(e => e.setId === 'lua').slice(0, 2)
    expect(pieces).toHaveLength(2)
    const equipped = Object.fromEntries(pieces.map((e, index) => [index ? 'capacete' : 'peitoral', e.id]))
    expect(equipmentSetCounts({ equipped } as any).lua).toBe(2)
  })

  it('intenções inimigas são previsíveis e chefes convocam reforços', () => {
    const boss = { ...fakeEnemy, boss: true, fase: 2 }
    expect(enemyIntentFor(boss, 4).type).toBe('summon')
    expect(enemyIntentFor(fakeEnemy, 1).label.length).toBeGreaterThan(0)
  })

  it('elementos de dano possuem durações distintas', () => {
    const fire = applyElementalStatus({}, 'fogo', 10, true).status
    const poison = applyElementalStatus({}, 'natureza', 10, true).status
    expect(fire.burn?.turns).toBe(1)
    expect(poison.poison?.turns).toBe(3)
    expect(tickStatus(poison).damage).toBeGreaterThan(0)
  })

  it('coleção concede marcos permanentes de domínio', () => {
    expect(collectionMastery({ discoveredCards: Array(100).fill('carta') } as any)).toMatchObject({ life: 5, attack: 1 })
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
    // and the full level range regardless of size, wildly over-pricing the strongest of e.g.
    // 3 items. A group of N items may only reach the (N-1)th rung of EQUIPMENT_LEVELS, never
    // jump straight to the top tier — mirrors the Math.min(EQUIPMENT_LEVELS.length-1, N-1)
    // clamp in balanceEquipment itself, so this stays correct regardless of how the scale
    // is tuned (e.g. levels 1-17 vs. the current 1-100).
    const groups = new Map<string, typeof EQUIPMENT>()
    for (const item of EQUIPMENT) {
      if (item.slot === 'bolsa') continue
      const key = groupKey(item)
      groups.set(key, [...(groups.get(key) ?? []), item])
    }
    for (const items of groups.values()) {
      if (items.length > 4) continue
      const levels = items.map(i => i.nivelMinimo ?? 1)
      const maxAllowed = EQUIPMENT_LEVELS[Math.min(EQUIPMENT_LEVELS.length - 1, items.length - 1)]
      expect(Math.max(...levels)).toBeLessThanOrEqual(maxAllowed)
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

const fakeEnemy = { id: 'x', nome: 'Inimigo de Teste', vida: 999, ataque: 3, dificuldade: 2, ouro: 5, habilidade: '' } as any

describe('combate: postura defensiva e Fervor de Combate', () => {
  it('defend() só age no turno do jogador e com inimigo vivo', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ enemy: undefined, playerTurn: true, animating: false, braced: false } as any)
    useGame.getState().defend()
    expect(useGame.getState().braced).toBe(false) // sem inimigo, não faz nada

    useGame.setState({ enemy: fakeEnemy, enemyHp: 999, playerTurn: false, animating: false, braced: false } as any)
    useGame.getState().defend()
    expect(useGame.getState().braced).toBe(false) // fora do turno, não faz nada
  })

  it('primeira ativação da postura defensiva não consome o turno e dura até desativar', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ enemy: fakeEnemy, enemyHp: 999, playerTurn: true, animating: false, braced: false, braceBonusUsed: false, extraHeroAttacks: 0 } as any)
    useGame.getState().defend()
    const s1 = useGame.getState()
    expect(s1.braced).toBe(true)
    expect(s1.braceBonusUsed).toBe(true)
    expect(s1.playerTurn).toBe(true) // não perde o turno na primeira vez: pode agir mais uma vez

    // Desativar consome o turno normalmente, igual a qualquer outra ação.
    useGame.setState({ playerTurn: true, animating: false } as any)
    useGame.getState().defend()
    const s2 = useGame.getState()
    expect(s2.braced).toBe(false)
    expect(s2.playerTurn).toBe(false)

    // Reativar depois do primeiro uso já consome o turno (o bônus só vale uma vez por batalha).
    useGame.setState({ playerTurn: true, animating: false } as any)
    useGame.getState().defend()
    const s3 = useGame.getState()
    expect(s3.braced).toBe(true)
    expect(s3.playerTurn).toBe(false)
  })

  it('useFervor() é bloqueado abaixo do medidor cheio e consome o medidor imediatamente ao usar', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ enemy: fakeEnemy, enemyHp: 999, playerTurn: true, animating: false, fervor: 2 } as any)
    useGame.getState().useFervor()
    expect(useGame.getState().fervor).toBe(2)

    useGame.setState({ fervor: 3 } as any)
    useGame.getState().useFervor()
    const s = useGame.getState()
    expect(s.fervor).toBe(0)
    expect(s.animating).toBe(true)
  })

  it('newGame() zera braced e fervor de uma campanha anterior', () => {
    useGame.getState().newGame('arcanista')
    useGame.setState({ braced: true, fervor: 3 } as any)
    useGame.getState().newGame('guerreiro')
    const s = useGame.getState()
    expect(s.braced).toBe(false)
    expect(s.fervor).toBe(0)
  })
})

describe('combate: atacar um capanga específico', () => {
  it('dano vai para o capanga escolhido, não para o inimigo principal', () => {
    vi.useFakeTimers()
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    try {
      useGame.getState().newGame('guerreiro')
      useGame.setState({
        enemy: fakeEnemy, enemyHp: 999, playerTurn: true, animating: false,
        combatMinions: [{ id: 'm1', nome: 'Capanga de Teste', hp: 10, maxHp: 10, ataque: 2 }]
      } as any)
      useGame.getState().attack('m1')
      vi.advanceTimersByTime(2600)
      const s = useGame.getState()
      expect(s.enemyHp).toBe(999)
      expect(s.combatMinions?.[0].hp).toBeLessThan(10)
    } finally {
      randomSpy.mockRestore()
      vi.useRealTimers()
    }
  })
})

describe('limite de poções temporárias', () => {
  it('bloqueia uma segunda unidade da mesma poção e permite combinar poções diferentes', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ screen: 'inventory', inventory: { elixir_forca: 2, oleo_encantado: 1 }, pendingAttackBonus: 0, activePotionIds: [] } as any)

    useGame.getState().useConsumable('elixir_forca')
    useGame.getState().useConsumable('elixir_forca')
    expect(useGame.getState().inventory.elixir_forca).toBe(1)
    expect(useGame.getState().pendingAttackBonus).toBe(2)

    useGame.getState().useConsumable('oleo_encantado')
    expect(useGame.getState().inventory.oleo_encantado).toBeUndefined()
    expect(useGame.getState().pendingAttackBonus).toBe(5)
  })
})
