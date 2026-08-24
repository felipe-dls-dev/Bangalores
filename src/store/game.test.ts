import { describe, it, expect, vi } from 'vitest'
import { useGame, EQUIPMENT, EQUIPMENT_LEVELS, CONSUMABLES, SUBREGIONS, resolveCombatRoll, deriveLevel, guildMissionById, druidHealProc, equipmentAffinity, enemyIntentFor, equipmentSetCounts, itemSkillEffectText, applyElementalStatus, tickStatus, collectionMastery, buildCoopEnemy, buildCoopSubregionBoss, buildSummon, buildEnemy, buildBoss, buildRevengeBoss, balanceEnemyByLevel, enemyPointBudget, enemyPointCost, attackValue, maxHp, SUMMON_ATTACK_ANIMATION, forgeLevelInfo, monsterDropChance, equipmentByRef, equipmentUpgradeMaterialCost, UPGRADE_SUCCESS_CHANCE, UPGRADE_REGRESS_CHANCE, equipmentInstanceBreakdown } from './game'

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

describe('cópias independentes na desmontagem da forja', () => {
  it('preserva a pedra e os bônus da bota equipada ao desmontar outra cópia', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99)
    try {
      useGame.getState().newGame('guerreiro')
      const enhancedBoots = 'botas_viajante@@enhanced'
      const plainBoots = 'botas_viajante@@plain'
      useGame.setState({
        equipmentBag: [plainBoots],
        equipped: { ...useGame.getState().equipped, botas: enhancedBoots },
        materials: { rubi_forja: 0 },
        equipmentGems: { [enhancedBoots]: ['rubi_forja'] },
        forgedGemLocked: { [enhancedBoots]: true },
        craftedEffects: { [enhancedBoots]: 'critico_forjado' },
        equipmentResistances: { [enhancedBoots]: 'fogo' },
        equipmentUpgrades: { [enhancedBoots]: 2 },
      } as any)

      useGame.getState().dismantleEquipment(plainBoots)
      const state = useGame.getState()

      expect(state.equipmentBag).toEqual([])
      expect(state.equipped.botas).toBe(enhancedBoots)
      expect(state.equipmentGems[enhancedBoots]).toEqual(['rubi_forja'])
      expect(state.forgedGemLocked[enhancedBoots]).toBe(true)
      expect(state.craftedEffects[enhancedBoots]).toBe('critico_forjado')
      expect(state.equipmentResistances[enhancedBoots]).toBe('fogo')
      expect(state.equipmentUpgrades[enhancedBoots]).toBe(2)
      expect(state.materials.rubi_forja).toBe(0)
    } finally {
      randomSpy.mockRestore()
    }
  })

  it('limpa os bônus somente ao desmontar a última cópia existente', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99)
    try {
      useGame.getState().newGame('guerreiro')
      const enhancedBoots = 'botas_viajante@@last-copy'
      useGame.setState({
        equipmentBag: [enhancedBoots],
        equipped: { ...useGame.getState().equipped, botas: undefined },
        materials: { rubi_forja: 0 },
        equipmentGems: { [enhancedBoots]: ['rubi_forja'] },
        forgedGemLocked: { [enhancedBoots]: true },
        craftedEffects: { [enhancedBoots]: 'critico_forjado' },
        equipmentResistances: { [enhancedBoots]: 'fogo' },
        equipmentUpgrades: { [enhancedBoots]: 2 },
      } as any)

      useGame.getState().dismantleEquipment(enhancedBoots)
      const state = useGame.getState()

      expect(state.equipmentGems[enhancedBoots]).toBeUndefined()
      expect(state.forgedGemLocked[enhancedBoots]).toBeUndefined()
      expect(state.craftedEffects[enhancedBoots]).toBeUndefined()
      expect(state.equipmentResistances[enhancedBoots]).toBeUndefined()
      expect(state.equipmentUpgrades[enhancedBoots]).toBeUndefined()
      expect(state.materials.rubi_forja).toBe(1)
    } finally {
      randomSpy.mockRestore()
    }
  })

  it('vender a peça bonificada remove apenas os registros daquela instância', () => {
    useGame.getState().newGame('guerreiro')
    const enhancedBoots = 'botas_viajante@@sold-enhanced'
    const plainBoots = 'botas_viajante@@kept-plain'
    useGame.setState({
      equipmentBag: [enhancedBoots, plainBoots],
      equipmentGems: { [enhancedBoots]: ['rubi_forja'] },
      equipmentUpgrades: { [enhancedBoots]: 2 },
      equipmentResistances: { [enhancedBoots]: 'fogo' },
    } as any)

    useGame.getState().sellEquipment(enhancedBoots)
    const state = useGame.getState()

    expect(state.equipmentBag).toEqual([plainBoots])
    expect(state.equipmentGems[enhancedBoots]).toBeUndefined()
    expect(state.equipmentUpgrades[enhancedBoots]).toBeUndefined()
    expect(state.equipmentResistances[enhancedBoots]).toBeUndefined()
    expect(state.equipmentGems[plainBoots]).toBeUndefined()
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

  it('preserva na próxima batalha os bônus usados no resumo da masmorra', () => {
    vi.useFakeTimers()
    try {
      useGame.getState().newGame('guerreiro')
      const regenBoostUntil = Date.now() + 3_600_000
      useGame.setState({
        dungeonActive: true,
        dungeonDepth: 1,
        pendingAttackBonus: 5,
        shield: 7,
        activePotionIds: ['elixir_forca', 'elixir_reflexo_prateado'],
        regenBoostUntil,
      } as any)

      useGame.getState().startDungeon()
      let state = useGame.getState()
      expect(state.dungeonDepth).toBe(2)
      expect(state.pendingAttackBonus).toBe(5)
      expect(state.shield).toBe(7)
      expect(state.activePotionIds).toEqual(['elixir_forca', 'elixir_reflexo_prateado'])
      expect(state.regenBoostUntil).toBe(regenBoostUntil)

      useGame.setState({ pendingAttackBonus: 3, shield: 4, activePotionIds: ['oleo_encantado'] } as any)
      useGame.getState().leaveDungeon()
      state = useGame.getState()
      expect(state.pendingAttackBonus).toBe(3)
      expect(state.shield).toBe(4)
      expect(state.activePotionIds).toEqual(['oleo_encantado'])
      expect(state.regenBoostUntil).toBe(regenBoostUntil)
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('preserva os bônus do resumo ao voltar ao mapa ou ao modo cooperativo', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ screen: 'loot', dungeonActive: false, pendingAttackBonus: 3, shield: 4, activePotionIds: ['oleo_encantado'] } as any)

    useGame.getState().finishLoot()
    const state = useGame.getState()
    expect(state.pendingAttackBonus).toBe(3)
    expect(state.shield).toBe(4)
    expect(state.activePotionIds).toEqual(['oleo_encantado'])
  })

  it('limpa os bônus usados antes de abrir o resumo da batalha vencida', () => {
    vi.useFakeTimers()
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(.99)
    try {
      useGame.getState().newGame('guerreiro')
      useGame.setState({ screen: 'combat', enemy: { ...fakeEnemy, vida: 1 }, enemyHp: 1, playerTurn: true, animating: false, pendingAttackBonus: 5, shield: 7, activePotionIds: ['elixir_forca', 'tonico_guardiao'] } as any)
      useGame.getState().attack()
      vi.advanceTimersByTime(4_000)

      const state = useGame.getState()
      expect(state.screen).toBe('loot')
      expect(state.pendingAttackBonus).toBe(0)
      expect(state.shield).toBe(0)
      expect(state.activePotionIds).toEqual([])
    } finally {
      randomSpy.mockRestore()
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('bloqueia a navegação enquanto o resumo da sala da masmorra está aberto', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ screen: 'loot', dungeonActive: true, dungeonDepth: 3 } as any)

    useGame.getState().setScreen('map')
    expect(useGame.getState().screen).toBe('loot')
    expect(useGame.getState().dungeonActive).toBe(true)

    useGame.getState().leaveDungeon()
    expect(useGame.getState().screen).toBe('map')
    expect(useGame.getState().dungeonActive).toBe(false)

    useGame.getState().setScreen('inventory')
    expect(useGame.getState().screen).toBe('inventory')
  })

  it('mantém poções e buffs corretos durante 100 transições de salas', () => {
    vi.useFakeTimers()
    try {
      useGame.getState().newGame('guerreiro')
      const attackPotions = CONSUMABLES.filter(item => item.tipo === 'ataque')
      const shieldPotions = CONSUMABLES.filter(item => item.tipo === 'escudo')
      const regenBoostUntil = Date.now() + 3_600_000
      useGame.setState({ attr: { vida: 4, ataque: 0, defesa: 0 }, regenBoostUntil } as any)
      const permanentMaxHp = maxHp(useGame.getState())
      useGame.getState().startDungeon()

      // Simula cem vitórias seguidas: aplica um buff de cada categoria na tela de espólio e
      // avança para o próximo combate, alternando todas as poções existentes dessas categorias.
      for (let cycle = 0; cycle < 100; cycle++) {
        const attackPotion = attackPotions[cycle % attackPotions.length]
        const shieldPotion = shieldPotions[cycle % shieldPotions.length]
        useGame.setState({
          screen: 'loot',
          inventory: { [attackPotion.id]: 2, [shieldPotion.id]: 2 },
          pendingAttackBonus: 0,
          shield: 0,
          activePotionIds: [],
        } as any)
        const attackBeforePotion = attackValue(useGame.getState())

        useGame.getState().useConsumable(attackPotion.id)
        useGame.getState().useConsumable(attackPotion.id)
        useGame.getState().useConsumable(shieldPotion.id)
        useGame.getState().useConsumable(shieldPotion.id)
        let state = useGame.getState()

        expect(attackValue(state), `ataque no ciclo ${cycle + 1}`).toBe(attackBeforePotion + attackPotion.valor)
        expect(state.shield, `escudo no ciclo ${cycle + 1}`).toBe(shieldPotion.valor)
        expect(state.inventory[attackPotion.id], `limite de ataque no ciclo ${cycle + 1}`).toBe(1)
        expect(state.inventory[shieldPotion.id], `limite de escudo no ciclo ${cycle + 1}`).toBe(1)
        expect(state.activePotionIds, `IDs ativos no ciclo ${cycle + 1}`).toEqual([attackPotion.id, shieldPotion.id])

        useGame.getState().startDungeon()
        state = useGame.getState()
        expect(state.dungeonDepth, `profundidade no ciclo ${cycle + 1}`).toBe(cycle + 2)
        expect(state.pendingAttackBonus, `preparação de ataque no ciclo ${cycle + 1}`).toBe(attackPotion.valor)
        expect(state.shield, `preparação de escudo no ciclo ${cycle + 1}`).toBe(shieldPotion.valor)
        expect(state.activePotionIds, `poções reservadas no ciclo ${cycle + 1}`).toEqual([attackPotion.id, shieldPotion.id])
        expect(state.regenBoostUntil, `regeneração no ciclo ${cycle + 1}`).toBe(regenBoostUntil)
        expect(state.attr.vida, `atributo permanente no ciclo ${cycle + 1}`).toBe(4)
        expect(maxHp(state), `vida total no ciclo ${cycle + 1}`).toBeGreaterThanOrEqual(permanentMaxHp)
      }
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })
})

describe('Conjurador com duas feras espectrais', () => {
  it('mantém duas invocações simultâneas e bloqueia uma terceira', () => {
    vi.useFakeTimers()
    try {
      useGame.getState().newGame('conjurador')
      useGame.setState({ enemy: fakeEnemy, enemyHp: 999, playerTurn: true, animating: false, heroSkillUses: 0, summon: undefined, summons: [] } as any)
      useGame.getState().summonMonster('atacante')
      useGame.setState({ playerTurn: true, animating: false } as any)
      useGame.getState().summonMonster('defensor')
      useGame.setState({ playerTurn: true, animating: false } as any)
      useGame.getState().summonMonster('arcano')

      const state = useGame.getState()
      expect(state.summons).toHaveLength(2)
      expect(state.summons?.map(summon => summon.tipo)).toEqual(['atacante', 'defensor'])
      expect(state.heroSkillUses).toBe(2)
    } finally {
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('escala os atributos das três invocações até o nível 100', () => {
    const levels = [1, 10, 25, 50, 75, 100]
    let previous = { atacante: buildSummon('atacante', 1), defensor: buildSummon('defensor', 1), arcano: buildSummon('arcano', 1) }

    for (const level of levels.slice(1)) {
      const current = { atacante: buildSummon('atacante', level), defensor: buildSummon('defensor', level), arcano: buildSummon('arcano', level) }
      for (const type of ['atacante', 'defensor', 'arcano'] as const) {
        expect(current[type].maxHp).toBeGreaterThan(previous[type].maxHp)
        expect(current[type].ataque).toBeGreaterThanOrEqual(previous[type].ataque)
        expect(current[type].defesa).toBeGreaterThanOrEqual(previous[type].defesa)
      }
      expect(current.defensor.maxHp).toBeGreaterThan(current.atacante.maxHp)
      expect(current.defensor.defesa).toBeGreaterThan(current.atacante.defesa)
      expect(current.atacante.ataque).toBeGreaterThan(current.defensor.ataque)
      previous = current
    }
  })

  it('usa a animação temática de ataque de cada invocação', () => {
    expect(SUMMON_ATTACK_ANIMATION).toEqual({ atacante: 'garras', arcano: 'magico', defensor: 'martelo' })
  })

  it('não deixa as invocações morrerem no primeiro ataque comum compatível', () => {
    for (const level of [1, 10, 25, 50, 75, 100]) {
      const enemy = balanceEnemyByLevel({ id: `enemy-${level}`, nome: 'Inimigo compatível', ataque: 4 + level, defesa: Math.max(0, level - 2), vida: 20 + level * 3, ouro: 1, dificuldade: level, nivel: level, habilidade: '', imagem: '' })
      for (const type of ['atacante', 'defensor', 'arcano'] as const) {
        const summon = buildSummon(type, level)
        const hit = resolveCombatRoll(enemy.ataque, summon.defesa, 3, 3)
        expect(hit.damage, `${type} no nível ${level}`).toBeLessThan(summon.maxHp)
      }
    }
  })
})

describe('balanceamento da região inicial', () => {
  it('mantém encontros comuns e o primeiro chefe adequados a heróis recém-criados', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(.9)
    try {
      const enemy = buildCoopEnemy('campos_estrada', 1, 'veterano')!
      const boss = buildCoopSubregionBoss('campos_estrada', 'veterano')!
      expect(enemy.ataque).toBeLessThanOrEqual(4)
      expect(enemy.vida).toBeLessThanOrEqual(14)
      expect(boss.ataque).toBeLessThanOrEqual(6)
      expect(boss.vida).toBeLessThanOrEqual(31)
      expect(boss.ouro).toBeGreaterThanOrEqual(36)
    } finally {
      randomSpy.mockRestore()
    }
  })
})

describe('orçamento de pontos dos inimigos', () => {
  it('usa a equivalência 2 Vida = 1 ponto, 1 Ataque = 1 e 1 Defesa = 1', () => {
    expect(enemyPointCost({ vida: 2, ataque: 1, defesa: 1, nivel: 1, dificuldade: 1 })).toBe(3)
    expect(enemyPointCost({ vida: 20, ataque: 5, defesa: 4, nivel: 1, dificuldade: 1 })).toBe(19)
  })

  it('reduz um inimigo de nível 49 com 3000 de vida ao teto do nível', () => {
    const enemy = balanceEnemyByLevel({ id: 'extremo', nome: 'Extremo', ataque: 80, vida: 3000, ouro: 1, dificuldade: 49, nivel: 49, habilidade: '', imagem: '' })
    expect(enemy.vida).toBeLessThan(3000)
    expect(enemyPointCost(enemy)).toBeLessThanOrEqual(enemyPointBudget(enemy))
  })

  it('mantém comuns, chefes e vinganças de todas as regiões dentro do orçamento', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(.01)
    try {
      for (const subregion of SUBREGIONS) {
        const enemies = [
          buildEnemy(subregion, subregion.nivelMax),
          buildBoss(subregion),
          buildRevengeBoss(subregion, 10),
        ]
        for (const enemy of enemies) {
          expect(enemyPointCost(enemy), `${subregion.id}: ${enemy.nome}`).toBeLessThanOrEqual(enemyPointBudget(enemy))
          expect(enemy.vida, `${subregion.id}: vida positiva`).toBeGreaterThan(0)
          expect(enemy.ataque, `${subregion.id}: ataque positivo`).toBeGreaterThan(0)
        }
      }
    } finally {
      randomSpy.mockRestore()
    }
  })

  it('valida 100 encontros distribuídos entre várias sub-regiões', () => {
    const coveredSubregions = new Set<string>()
    let checked = 0

    for (let index = 0; index < 100; index++) {
      const subregion = SUBREGIONS[index % SUBREGIONS.length]
      const playerLevel = Math.max(1, subregion.nivelMin + index % Math.max(1, subregion.nivelMax - subregion.nivelMin + 1))
      const enemy = index % 10 === 0
        ? buildRevengeBoss(subregion, Math.floor(index / 10))
        : index % 5 === 0
          ? buildBoss(subregion)
          : buildEnemy(subregion, playerLevel)

      coveredSubregions.add(subregion.id)
      checked++
      expect(enemy.nivel ?? enemy.dificuldade, `nível do caso ${index + 1}`).toBeGreaterThan(0)
      expect(enemy.vida, `vida do caso ${index + 1}: ${enemy.nome}`).toBeGreaterThan(0)
      expect(enemy.ataque, `ataque do caso ${index + 1}: ${enemy.nome}`).toBeGreaterThan(0)
      expect(enemyPointCost(enemy), `orçamento do caso ${index + 1}: ${enemy.nome}`).toBeLessThanOrEqual(enemyPointBudget(enemy))
    }

    expect(checked).toBe(100)
    expect(coveredSubregions.size).toBe(Math.min(100, SUBREGIONS.length))
  })
})

describe('bugs corrigidos no sistema de forja', () => {
  it('stats() aplica aprimoramentos e gemas pela instância equipada, não pelo id genérico do catálogo', () => {
    useGame.getState().newGame('guerreiro')
    const weaponRef = 'lamina_vento@@upgrade-test'
    useGame.setState({ equipped: { ...useGame.getState().equipped, mao_direita: weaponRef } } as any)
    const baseline = attackValue(useGame.getState())
    useGame.setState({ equipmentUpgrades: { [weaponRef]: 2 }, equipmentGems: { [weaponRef]: ['rubi_forja'] } } as any)
    const boosted = attackValue(useGame.getState())
    // +2 do aprimoramento (a arma tem ataque>0) e +2 da gema (Rubi da Forja) -- antes da correção,
    // stats() procurava essas duas coisas pelo id genérico ('lamina_vento'), uma chave que
    // upgradeEquipment/socketGem nunca escrevem (eles usam a referência da instância equipada),
    // então nenhum dos dois bônus chegava a valer em combate.
    expect(boosted - baseline).toBe(4)
  })

  it('craftEquipment (refino de atributo) não sobrescreve atonização elemental nem substitui pedras já socketadas', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      useGame.getState().newGame('guerreiro')
      const weaponRef = 'lamina_cinzas@@refine-test'
      useGame.setState({
        xp: 50_000_000,
        forgeXp: 100000,
        equipped: { ...useGame.getState().equipped, mao_direita: weaponRef },
        equipmentBag: [],
        materials: { fragmento_fisico: 50, essencia_magica: 50, rubi_forja: 10 },
        equipmentElements: { [weaponRef]: 'gelo' },
        equipmentGems: { [weaponRef]: ['safira_guardia'] },
        forgedGemLocked: {},
        craftedEffects: {},
      } as any)
      useGame.getState().craftEquipment('receita_lamina_cinzas', 'ataque')
      const s = useGame.getState()
      // Refinar um bônus de atributo não deveria mexer em elemento/resistência (isso só nasce
      // de fabricar uma peça nova do zero) nem substituir a gema já instalada manualmente --
      // antes da correção, ambos eram sobrescritos incondicionalmente.
      expect(s.equipmentElements[weaponRef]).toBe('gelo')
      expect(s.equipmentGems[weaponRef]).toEqual(['safira_guardia', 'rubi_forja'])
    } finally {
      randomSpy.mockRestore()
    }
  })

  it('craftEquipment (refino de bônus especial) não é bloqueado por um encaixe de pedra já cheio', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      useGame.getState().newGame('guerreiro')
      const weaponRef = 'lamina_cinzas@@bonus-socket-test'
      useGame.setState({
        xp: 50_000_000,
        forgeXp: 100000,
        equipped: { ...useGame.getState().equipped, mao_direita: weaponRef },
        equipmentBag: [],
        materials: { fragmento_fisico: 50, essencia_magica: 50, rubi_forja: 10 },
        // Lâmina das Cinzas Eternas é épica: 2 encaixes, já ambos preenchidos manualmente.
        equipmentGems: { [weaponRef]: ['safira_guardia', 'rubi_forja'] },
        forgedGemLocked: {},
        craftedEffects: {},
      } as any)
      useGame.getState().craftEquipment('receita_lamina_cinzas', 'critico_forjado')
      const s = useGame.getState()
      // Bônus especial (%) não ocupa encaixe -- vai para craftedEffects, não equipmentGems --
      // então um encaixe físico já cheio não deveria impedir esse refino. Antes da correção, a
      // checagem de encaixe livre se aplicava também aqui e bloqueava o refino em silêncio.
      expect(s.craftedEffects[weaponRef]).toBe('critico_forjado')
      expect(s.equipmentGems[weaponRef]).toEqual(['safira_guardia', 'rubi_forja'])
    } finally {
      randomSpy.mockRestore()
    }
  })

  it('forgeLevelInfo trava o progresso em 100% ao atingir o nível máximo', () => {
    const maxed = forgeLevelInfo(999999)
    expect(maxed.max).toBe(true)
    expect(maxed.progress).toBeLessThanOrEqual(maxed.next)
  })

  it('monsterDropChance soma o bônus de chance de espólio (história, especialização e o efeito forjado "sorte")', () => {
    // storyModifiers().drop, specializationBonuses().loot e o efeito forjado 'sorte' (das
    // receitas de Orbe das Colheitas/Relíquia do Explorador) eram todos calculados mas nunca
    // somados à chance real de um monstro largar espólio -- o jogador via a promessa ("mais
    // chance de espólio") sem nenhum efeito de fato.
    const enemy = { nivel: 10, boss: false, elite: false } as any
    const base = monsterDropChance(enemy)
    expect(monsterDropChance(enemy, 0.15)).toBeCloseTo(Math.min(1, base + 0.15), 10)
    expect(monsterDropChance({ ...enemy, boss: true }, 0.5)).toBe(1) // já era 100%; nunca passa de 1
  })

  it('equipmentInstanceBreakdown separa base/aprimoramento/pedra e stats() soma exatamente o total dela', () => {
    useGame.getState().newGame('guerreiro')
    const weaponRef = 'lamina_vento@@breakdown-test'
    useGame.setState({ equipped: { ...useGame.getState().equipped, mao_direita: weaponRef }, equipmentUpgrades: { [weaponRef]: 2 }, equipmentGems: { [weaponRef]: ['rubi_forja'] } } as any)
    const s = useGame.getState()
    const item = equipmentByRef(weaponRef)!
    const b = equipmentInstanceBreakdown(item, weaponRef, s as any)
    // lamina_vento é incomum com ataque próprio: aprimoramento +2 soma +2 de ataque, a gema
    // Rubi da Forja soma +2 -- a tela de Equipamentos precisa mostrar essas duas fontes
    // separadas do "normal" (base), não só a soma total.
    expect(b.upgrade.atk).toBe(2)
    expect(b.gems.atk).toBe(2)
    expect(b.total.atk).toBe(b.base.atk + b.upgrade.atk + b.gems.atk)
    // O mesmo breakdown por instância é o que stats()/attackValue() usam por baixo -- não pode
    // haver diferença entre o que a peça soma sozinha e o que ela credita no total do herói.
    const baseline = attackValue({ ...s, equipmentUpgrades: {}, equipmentGems: {} } as any)
    expect(attackValue(s) - baseline).toBe(b.upgrade.atk + b.gems.atk)
  })
})

describe('aprimoramento com risco de falha e regressão', () => {
  const equipTestWeapon = () => {
    useGame.getState().newGame('guerreiro')
    const weaponRef = 'lamina_vento@@upgrade-risk-test'
    useGame.setState({
      equipped: { ...useGame.getState().equipped, mao_direita: weaponRef },
      gold: 999_999,
      materials: { fragmento_fisico: 999, essencia_magica: 999 },
    } as any)
    return weaponRef
  }

  it('equipmentUpgradeMaterialCost só exige essência mágica a partir do nível-alvo +2', () => {
    const item = equipmentByRef('lamina_vento')! // incomum (tier 1)
    expect(equipmentUpgradeMaterialCost(item, 1)).toEqual({ fragmento_fisico: 5 })
    expect(equipmentUpgradeMaterialCost(item, 2)).toEqual({ fragmento_fisico: 7, essencia_magica: 3 })
    expect(equipmentUpgradeMaterialCost(item, 3)).toEqual({ fragmento_fisico: 9, essencia_magica: 4 })
  })

  it('chance de sucesso cai e chance de regressão sobe a cada nível-alvo', () => {
    expect(UPGRADE_SUCCESS_CHANCE[1]).toBeGreaterThan(UPGRADE_SUCCESS_CHANCE[2])
    expect(UPGRADE_SUCCESS_CHANCE[2]).toBeGreaterThan(UPGRADE_SUCCESS_CHANCE[3])
    expect(UPGRADE_REGRESS_CHANCE[1]).toBe(0) // nível 0 não tem pra onde regredir
    expect(UPGRADE_REGRESS_CHANCE[2]).toBeLessThan(UPGRADE_REGRESS_CHANCE[3])
  })

  it('sucesso: avança um nível, consome ouro e o custo cheio de materiais, e concede XP de Forja', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      const weaponRef = equipTestWeapon()
      const before = useGame.getState()
      useGame.getState().upgradeEquipment(weaponRef)
      const after = useGame.getState()
      expect(after.equipmentUpgrades[weaponRef]).toBe(1)
      expect(after.materials.fragmento_fisico).toBe(before.materials.fragmento_fisico - 5)
      expect(after.gold).toBeLessThan(before.gold)
      expect(after.forgeAttempts).toBe((before.forgeAttempts ?? 0) + 1)
      expect(after.forgeSuccesses).toBe((before.forgeSuccesses ?? 0) + 1)
      expect(after.forgeXp ?? 0).toBeGreaterThan(before.forgeXp ?? 0)
    } finally {
      randomSpy.mockRestore()
    }
  })

  it('falha em +1: nível permanece 0 (nada pra regredir), perde metade dos materiais, mas ainda conta a tentativa', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999)
    try {
      const weaponRef = equipTestWeapon()
      const before = useGame.getState()
      useGame.getState().upgradeEquipment(weaponRef)
      const after = useGame.getState()
      expect(after.equipmentUpgrades[weaponRef] ?? 0).toBe(0)
      expect(after.materials.fragmento_fisico).toBe(before.materials.fragmento_fisico - 3) // ceil(5/2)
      expect(after.forgeAttempts).toBe((before.forgeAttempts ?? 0) + 1)
      expect(after.forgeSuccesses).toBe(before.forgeSuccesses ?? 0)
    } finally {
      randomSpy.mockRestore()
    }
  })

  it('falha em +2 pode regredir o nível para +1 quando a rolagem de regressão também "acerta"', () => {
    // newGame/createEquipmentInstance também consomem Math.random() (sufixo da referência de
    // instância) -- o spy da sequência só pode entrar em cena DEPOIS que a preparação do teste
    // já rolou os próprios randoms dela, senão a sequência é consumida na ordem errada.
    const weaponRef = equipTestWeapon()
    useGame.setState({ equipmentUpgrades: { [weaponRef]: 1 } })
    const sequence = [0.999, 0.001] // falha o sucesso, depois "acerta" a regressão
    let i = 0
    const randomSpy = vi.spyOn(Math, 'random').mockImplementation(() => sequence[i++] ?? 0.5)
    try {
      useGame.getState().upgradeEquipment(weaponRef)
      expect(useGame.getState().equipmentUpgrades[weaponRef]).toBe(0)
    } finally {
      randomSpy.mockRestore()
    }
  })

  it('bloqueia a tentativa (nenhuma mudança de estado) se faltar ouro ou material', () => {
    const weaponRef = equipTestWeapon()
    useGame.setState({ materials: {} })
    const before = useGame.getState()
    useGame.getState().upgradeEquipment(weaponRef)
    const after = useGame.getState()
    expect(after.equipmentUpgrades[weaponRef] ?? 0).toBe(0)
    expect(after.gold).toBe(before.gold)
    expect(after.forgeAttempts ?? 0).toBe(before.forgeAttempts ?? 0)
  })

  it('avisa o resultado pelo mesmo banner da Forja (forgeResult), já que a tela não exibe explorationNote', () => {
    // Sem isso, sucesso/falha/regressão do aprimoramento mudavam o estado em silêncio -- a
    // tela da Forja não renderiza explorationNote em lugar nenhum, então o jogador só saberia
    // pelos números mudando depois, sem nenhum aviso da regressão.
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    try {
      const weaponRef = equipTestWeapon()
      useGame.getState().upgradeEquipment(weaponRef)
      const result = useGame.getState().forgeResult
      expect(result?.kind).toBe('upgrade')
      expect(result?.success).toBe(true)
      expect(result?.message).toContain('aprimorado para +1')
    } finally {
      randomSpy.mockRestore()
    }
  })

  it('não faz nada além do nível +3 (máximo)', () => {
    const weaponRef = equipTestWeapon()
    useGame.setState({ equipmentUpgrades: { [weaponRef]: 3 } })
    const before = useGame.getState()
    useGame.getState().upgradeEquipment(weaponRef)
    expect(useGame.getState().equipmentUpgrades[weaponRef]).toBe(3)
    expect(useGame.getState().gold).toBe(before.gold)
  })
})
