import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ATTRIBUTE_RULES, HERO_STAT_PROFILES } from '../data/heroStatProfiles'
import type { Equipment } from '../types'
import {
  EQUIPMENT,
  STARTER_ARMOR_BONUS,
  armorValue,
  attackValue,
  championStats,
  defenseValue,
  energyNow,
  heroAbilityPotency,
  heroDodgeChance,
  heroSkillEnergyCost,
  maxHp,
  useGame,
  xpForLevel,
} from './game'
import { armorMitigation } from './heroStats'

const state = () => useGame.getState()
const HERO_IDS = Object.keys(HERO_STAT_PROFILES)
const enemy = { id: 'x', nome: 'Boneco de Treino', vida: 999, ataque: 1, dificuldade: 1, ouro: 1, habilidade: '' } as any

// Item sintético só destes testes: mostra que os campos explícitos somam nos atributos.
const TEST_ITEM: Equipment = {
  id: 'zz_capacete_teste',
  nome: 'Capacete de Teste',
  slot: 'capacete',
  preco: 1,
  ataque: 0,
  vida: 0,
  defesa: 0,
  forca: 2,
  magia: 1,
  vigor: 3,
  destreza: 4,
  vidaMaxima: 5,
  energia: 2,
  armadura: 6,
  resistencias: { fogo: 0.1 },
  habilidade: '',
  imagem: '',
}
const TEST_REF = `${TEST_ITEM.id}@@teste`

function fresh(heroId: string, patch: Record<string, unknown> = {}) {
  state().newGame(heroId as any)
  useGame.setState({ xp: xpForLevel(1), equipped: {}, equipmentBag: [], talents: [], specializations: {}, equipmentUpgrades: {}, equipmentGems: {}, pendingAttackBonus: 0, ...patch } as any)
  useGame.setState({ hp: maxHp(state()) } as any) // sem o kit inicial, a Vida máxima é outra: recomeça cheia
}

describe('atributos do Campeão no jogo', () => {
  beforeEach(() => fresh('guerreiro'))

  it('um herói novo começa com Vida cheia, Energia cheia e Armadura zero', () => {
    for (const id of HERO_IDS) {
      fresh(id)
      expect(state().hp, id).toBe(maxHp(state()))
      expect(energyNow(state()), id).toBe(championStats(state()).energiaMaxima)
      expect(armorValue(state()), id).toBe(0)
      expect(state().balanceVersion).toBe(3)
    }
  })

  it('Força só alimenta ataque físico; Magia só o mágico (por classe)', () => {
    fresh('guerreiro')
    const warrior = attackValue(state())
    useGame.setState({ attr: { ...state().attr, magia: 30 } } as any)
    expect(attackValue(state())).toBe(warrior)
    useGame.setState({ attr: { ...state().attr, forca: 4 } } as any)
    expect(attackValue(state())).toBeGreaterThan(warrior)

    fresh('arcanista')
    const mage = attackValue(state())
    useGame.setState({ attr: { ...state().attr, forca: 30 } } as any)
    expect(attackValue(state())).toBe(mage)
    useGame.setState({ attr: { ...state().attr, magia: 4 } } as any)
    expect(attackValue(state())).toBeGreaterThan(mage)
  })

  it('Vigor aumenta a Vida Máxima e a resistência, mas não a Armadura', () => {
    const before = { hp: maxHp(state()), armor: armorValue(state()), resist: championStats(state()).resistenciaElemental }
    useGame.setState({ attr: { ...state().attr, vigor: 10 } } as any)
    expect(maxHp(state())).toBe(before.hp + 10 * ATTRIBUTE_RULES.vigorVidaPorPonto)
    expect(armorValue(state())).toBe(before.armor)
    expect(championStats(state()).resistenciaElemental).toBeGreaterThan(before.resist)
  })

  it('gastar um ponto em Vigor cura a Vida ganha, sem passar do máximo', () => {
    useGame.setState({ attributePoints: 1 } as any)
    const hpBefore = state().hp
    state().addAttribute('vigor')
    expect(state().attributePoints).toBe(0)
    expect(state().allocatedAttr.vigor).toBe(1)
    expect(state().hp).toBe(hpBefore + ATTRIBUTE_RULES.vigorVidaPorPonto)
    expect(state().hp).toBeLessThanOrEqual(maxHp(state()))
  })

  it('addAttribute recusa atributos antigos e sem pontos', () => {
    useGame.setState({ attributePoints: 0 } as any)
    state().addAttribute('forca')
    expect(state().allocatedAttr.forca).toBe(0)
    useGame.setState({ attributePoints: 2 } as any)
    state().addAttribute('defesa' as any)
    expect(state().attributePoints).toBe(2)
  })

  it('a Destreza dá esquiva com teto mesmo em quantidade absurda', () => {
    fresh('cacadora')
    const low = heroDodgeChance(state())
    useGame.setState({ attr: { ...state().attr, destreza: 100_000 } } as any)
    expect(heroDodgeChance(state())).toBeGreaterThan(low)
    expect(heroDodgeChance(state())).toBeLessThanOrEqual(ATTRIBUTE_RULES.esquiva.tetoTotal)
  })
})

describe('Armadura vem só de equipamento, gemas e efeitos de equipamento', () => {
  beforeEach(() => fresh('guerreiro'))

  it('o antigo "defesa" de um item vira Armadura e a mitigação tem retorno decrescente', () => {
    const armored = EQUIPMENT.filter((e) => e.slot !== 'bolsa' && (e.defesa ?? 0) > 0 && (!e.classeExclusiva || [e.classeExclusiva].flat().includes('guerreiro'))).slice(0, 6)
    expect(armored.length).toBeGreaterThan(2)
    let armor = 0
    let mitigation = 0
    const gains: number[] = []
    const equipped: Record<string, string> = {}
    for (const item of armored) {
      if (equipped[item.slot]) continue
      equipped[item.slot] = `${item.id}@@t${item.slot}`
      useGame.setState({ equipped: { ...equipped }, xp: xpForLevel(100) } as any)
      const nextArmor = armorValue(state())
      const nextMitigation = defenseValue(state())
      if (nextArmor > armor) gains.push((nextMitigation - mitigation) / (nextArmor - armor))
      armor = nextArmor
      mitigation = nextMitigation
    }
    expect(armor).toBeGreaterThan(0)
    expect(mitigation).toBeGreaterThan(0)
    expect(mitigation).toBeLessThan(armorMitigation(1_000_000) + 1)
    // retorno decrescente: cada Armadura extra rende menos que a primeira peça
    if (gains.length > 1) expect(gains[gains.length - 1]).toBeLessThanOrEqual(gains[0] + 1e-9)
  })

  it('gemas de defesa somam na Armadura (Safira da Guarda) e gemas de ataque no poder ofensivo', () => {
    const helmet = EQUIPMENT.find((e) => e.slot === 'capacete' && (!e.classeExclusiva || [e.classeExclusiva].flat().includes('guerreiro')))!
    const ref = `${helmet.id}@@gema`
    useGame.setState({ xp: xpForLevel(100), equipped: { capacete: ref } } as any)
    const armor = armorValue(state())
    const force = championStats(state()).linhas.forca.bonus
    useGame.setState({ equipmentGems: { [ref]: ['safira_guardia', 'rubi_forja'] } } as any)
    expect(armorValue(state())).toBe(armor + 1)
    expect(championStats(state()).linhas.forca.bonus).toBe(force + 2)
  })

  it('o bônus percentual de combate (buff/postura) age sobre a Armadura, nunca cria Armadura do nada', () => {
    expect(defenseValue(state())).toBe(0)
    useGame.setState({ combatDefensePct: 0.5 } as any)
    expect(defenseValue(state())).toBe(0)
  })

  it('a Armadura não se confunde com escudo: o escudo continua separado no estado de combate', () => {
    useGame.setState({ shield: 7 } as any)
    expect(armorValue(state())).toBe(0)
    expect(state().shield).toBe(7)
  })
})

describe('fontes de bônus nos atributos (equipamento, forja, gemas, talentos, especializações)', () => {
  beforeEach(() => {
    EQUIPMENT.push(TEST_ITEM)
  })
  afterEach(() => {
    const index = EQUIPMENT.findIndex((e) => e.id === TEST_ITEM.id)
    if (index >= 0) EQUIPMENT.splice(index, 1)
  })

  it('campos explícitos do equipamento somam em cada atributo e recurso', () => {
    fresh('guerreiro', { xp: xpForLevel(100) })
    const before = championStats(state())
    useGame.setState({ equipped: { capacete: TEST_REF } } as any)
    const after = championStats(state())
    expect(after.linhas.forca.bonus - before.linhas.forca.bonus).toBe(2)
    expect(after.linhas.magia.bonus - before.linhas.magia.bonus).toBe(1)
    expect(after.linhas.vigor.bonus - before.linhas.vigor.bonus).toBe(3)
    expect(after.linhas.destreza.bonus - before.linhas.destreza.bonus).toBe(4)
    expect(after.energiaMaxima - before.energiaMaxima).toBe(2)
    expect(after.armadura - before.armadura).toBe(6)
    expect(after.vidaMaxima - before.vidaMaxima).toBe(5 + 3 * ATTRIBUTE_RULES.vigorVidaPorPonto)
    expect(after.resistencias.fogo).toBeGreaterThan(before.resistencias.fogo)
  })

  it('o valor da classe e o bônus ficam separados (valor não muda ao equipar)', () => {
    fresh('guerreiro', { xp: xpForLevel(100) })
    const before = championStats(state()).linhas.forca.valor
    useGame.setState({ equipped: { capacete: TEST_REF } } as any)
    expect(championStats(state()).linhas.forca.valor).toBe(before)
  })

  it('o antigo Ataque de itens e talentos vira Força nas classes físicas e Magia nas mágicas', () => {
    const weapon = EQUIPMENT.find((e) => e.slot === 'mao_direita' && e.ataque > 0 && !e.classeExclusiva)
    expect(weapon).toBeTruthy()
    fresh('guerreiro', { xp: xpForLevel(100), talents: ['precisao'] })
    expect(championStats(state()).linhas.forca.bonus).toBe(1)
    expect(championStats(state()).linhas.magia.bonus).toBe(0)
    fresh('arcanista', { xp: xpForLevel(100), talents: ['precisao'] })
    expect(championStats(state()).linhas.magia.bonus).toBe(1)
    expect(championStats(state()).linhas.forca.bonus).toBe(0)
  })

  it('talentos: Muralha e Guarda Ancestral dão Vigor, Reflexos dá Destreza, Vigor/Resiliência dão Vida', () => {
    fresh('guerreiro', { xp: xpForLevel(100), talents: ['muralha', 'guarda_ancestral', 'reflexos', 'vigor', 'resiliencia'] })
    const s = championStats(state())
    expect(s.linhas.vigor.bonus).toBe(1 + 2)
    expect(s.linhas.destreza.bonus).toBe(1)
    expect(s.linhas.vidaMaxima.bonus).toBe(5 + 8 + (1 + 2) * ATTRIBUTE_RULES.vigorVidaPorPonto)
    expect(s.armadura).toBe(0) // talento nunca dá Armadura
  })

  it('especializações: Caminho da Guarda/Baluarte dão Vigor e nunca Armadura', () => {
    fresh('guerreiro', { xp: xpForLevel(100), specializations: { '10': 'defensiva', '50': 'baluarte' } })
    const s = championStats(state())
    expect(s.linhas.vigor.bonus).toBe(1 + 2)
    expect(s.armadura).toBe(0)
    fresh('guerreiro', { xp: xpForLevel(100), specializations: { '25': 'vital' } })
    expect(championStats(state()).linhas.vidaMaxima.bonus).toBe(10)
  })

  it('aprimoramento de forja aumenta os bônus do item equipado', () => {
    const weapon = EQUIPMENT.find((e) => e.slot === 'mao_direita' && e.ataque > 0 && (!e.classeExclusiva || [e.classeExclusiva].flat().includes('guerreiro')))!
    const ref = `${weapon.id}@@forja`
    fresh('guerreiro', { xp: xpForLevel(100), equipped: { mao_direita: ref } })
    const before = championStats(state()).linhas.forca.bonus
    useGame.setState({ equipmentUpgrades: { [ref]: 3 } } as any)
    expect(championStats(state()).linhas.forca.bonus).toBeGreaterThan(before)
  })

  it('bônus temporário de ataque entra no atributo ofensivo e sai junto com o bônus', () => {
    fresh('guerreiro')
    const before = championStats(state()).linhas.forca.total
    useGame.setState({ pendingAttackBonus: 3 } as any)
    expect(championStats(state()).linhas.forca.total).toBe(before + 3)
    useGame.setState({ pendingAttackBonus: 0 } as any)
    expect(championStats(state()).linhas.forca.total).toBe(before)
  })
})

describe('Energia no combate solo', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    vi.useFakeTimers()
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })
  afterEach(() => {
    randomSpy.mockRestore()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  const startCombat = (heroId: string, patch: Record<string, unknown> = {}) => {
    fresh(heroId)
    useGame.setState({ screen: 'combat', enemy, enemyHp: 999, hp: maxHp(state()), playerTurn: true, animating: false, autoCombat: false, heroSkillCooldown: 0, heroSkillUses: 0, combatTurn: 1, energy: championStats(state()).energiaMaxima, energyTurn: 1, combatLog: [], summons: [], summon: undefined, ...patch } as any)
  }

  it('a habilidade gasta o custo da classe e entra em recarga', () => {
    startCombat('guerreiro')
    const cost = heroSkillEnergyCost('guerreiro')
    const before = energyNow(state())
    state().heroSkill()
    expect(state().heroSkillUses).toBe(1)
    expect(energyNow(state())).toBe(before - cost)
  })

  it('sem Energia suficiente a habilidade fica bloqueada: nada é gasto nem a recarga começa', () => {
    startCombat('guerreiro', { energy: 3, energyTurn: 1 })
    state().heroSkill()
    expect(state().heroSkillUses).toBe(0)
    expect(state().heroSkillCooldown).toBe(0)
    expect(energyNow(state())).toBe(3)
    expect(state().combatLog.some((line) => line.includes('Energia insuficiente'))).toBe(true)
  })

  it('a Energia regenera por rodada e nunca passa do máximo', () => {
    startCombat('guerreiro', { energy: 0, energyTurn: 1, combatTurn: 1 })
    expect(energyNow(state())).toBe(0)
    useGame.setState({ combatTurn: 3 } as any)
    expect(energyNow(state())).toBe(2 * ATTRIBUTE_RULES.energia.regeneracaoPorRodada)
    useGame.setState({ combatTurn: 500 } as any)
    expect(energyNow(state())).toBe(championStats(state()).energiaMaxima)
  })

  it('o Conjurador paga Energia por fera invocada e é bloqueado sem ela', () => {
    startCombat('conjurador')
    state().summonMonster('atacante')
    expect(state().heroSkillUses).toBe(1)
    expect(energyNow(state())).toBe(championStats(state()).energiaMaxima - heroSkillEnergyCost('conjurador'))
    startCombat('conjurador', { energy: 1, energyTurn: 1 })
    state().summonMonster('atacante')
    expect(state().heroSkillUses).toBe(0)
  })

  it('save antigo sem Energia gravada começa cheio, não zerado', () => {
    startCombat('guerreiro')
    useGame.setState({ energy: undefined, energyTurn: undefined } as any)
    expect(energyNow(state())).toBe(championStats(state()).energiaMaxima)
  })

  it('a Energia nunca fica negativa', () => {
    startCombat('guerreiro', { energy: -50, energyTurn: 1 })
    expect(energyNow(state())).toBe(0)
  })

  it('o Golpe Supremo não gasta Energia (barra própria)', () => {
    startCombat('guerreiro', { ultimateGauge: 100 })
    const before = energyNow(state())
    state().ultimateAttack()
    expect(energyNow(state())).toBeGreaterThanOrEqual(before)
  })
})

describe('potência das habilidades por atributo', () => {
  it('vale 1 no valor inicial e sobe ao investir no atributo de escala', () => {
    for (const id of HERO_IDS) {
      fresh(id)
      expect(heroAbilityPotency(state()), id).toBe(1)
      const key = HERO_STAT_PROFILES[id].habilidade.atributoEscala
      useGame.setState({ attr: { ...state().attr, [key]: 10 } } as any)
      expect(heroAbilityPotency(state()), id).toBeGreaterThan(1)
    }
  })

  it('atributos que não escalam a habilidade não mudam a potência', () => {
    fresh('druida') // escala com Magia
    useGame.setState({ attr: { ...state().attr, forca: 40, destreza: 40 } } as any)
    expect(heroAbilityPotency(state())).toBe(1)
  })
})

describe('começo do jogo perto do que era antes da mudança', () => {
  // Defesa total (classe + kit inicial) de cada classe no nível 1 ANTES do novo modelo, medida no código anterior.
  const OLD_KIT_DEFENSE: Record<string, number> = { guerreiro: 8, cacadora: 3, arcanista: 5, guardiao: 9, druida: 6, cacador: 5, monge: 6, sacerdotisa: 6, conjurador: 4 }
  const OLD_KIT_LIFE: Record<string, number> = { guerreiro: 22, cacadora: 21, arcanista: 22, guardiao: 32, druida: 24, cacador: 21, monge: 19, sacerdotisa: 23, conjurador: 24 }
  const OLD_KIT_ATTACK: Record<string, number> = { guerreiro: 4, cacadora: 7, arcanista: 8, guardiao: 3, druida: 5, cacador: 7, monge: 6, sacerdotisa: 4, conjurador: 5 }

  it('Vida e ataque do kit inicial são idênticos aos de antes; a mitigação fica a no máximo 1 ponto', () => {
    for (const id of HERO_IDS) {
      state().newGame(id as any)
      expect(maxHp(state()), `${id}: Vida`).toBe(OLD_KIT_LIFE[id])
      expect(attackValue(state()), `${id}: ataque`).toBe(OLD_KIT_ATTACK[id])
      expect(Math.abs(defenseValue(state()) - OLD_KIT_DEFENSE[id]), `${id}: mitigação ${defenseValue(state())} vs ${OLD_KIT_DEFENSE[id]}`).toBeLessThanOrEqual(1)
    }
  })

  it('o bônus de Armadura da peça inicial vale só para a classe dona do kit', () => {
    state().newGame('guerreiro')
    const ref = state().equipped.peitoral!
    const base = EQUIPMENT.find((e) => e.id === ref.split('@@')[0])!
    expect(base.statsByClass?.guerreiro?.defesa).toBe(STARTER_ARMOR_BONUS.guerreiro.bonus)
    expect(Object.keys(base.statsByClass ?? {})).toEqual(['guerreiro'])
  })
})

describe('todas as nove classes ponta a ponta', () => {
  it('cada classe tem Vida, Energia, ataque e habilidade coerentes com o perfil', () => {
    for (const id of HERO_IDS) {
      fresh(id)
      const profile = HERO_STAT_PROFILES[id]
      const stats = championStats(state())
      expect(stats.vidaMaxima, id).toBe(profile.vidaBase + profile.base.vigor * ATTRIBUTE_RULES.vigorVidaPorPonto)
      expect(stats.energiaMaxima, id).toBe(profile.energiaBase)
      expect(attackValue(state()), id).toBeGreaterThan(0)
      expect(heroSkillEnergyCost(id), id).toBe(profile.habilidade.custoEnergia)
      expect(Number.isFinite(stats.poder), id).toBe(true)
    }
  })
})
