import { beforeEach, describe, expect, it } from 'vitest'
import { ATTRIBUTE_RULES } from '../data/heroStatProfiles'
import { EQUIPMENT, STANCE_DEFENSE_PCT, armorValue, defenseValue, heroDodgeChance, heroElementalResistance, useGame, xpForLevel, type BattleStance } from '../store/game'
import { armorMitigation } from '../store/heroStats'
import { coopEnemyDamage, coopMemberDefenseBase, coopMemberDefensePct, coopMemberDodge } from './coopMath'
import { previewCoopEnemyAttack, type CoopMemberVitals } from './coopPreview'

// O coop tem que usar as MESMAS contas do solo para Armadura, esquiva e resistências (Vigor).
const ME = 'me'
const state = () => useGame.getState()
const battle = (over: Record<string, unknown> = {}) => ({
  status: 'playing', enemy: { nome: 'Chefe', ataque: 15, elemento: 'fisico', boss: true }, enemyHp: 200, groupBuff: {}, playerBuffs: { [ME]: {} }, enemyStatus: {},
  enemyFearPenalty: 0, fearTurnsLeft: 0, enemyRollBonus: 0, combatMinions: [], ...over,
})
const threat = (vitals: CoopMemberVitals, over: Record<string, unknown> = {}, heroId = 'guerreiro') => previewCoopEnemyAttack({ battle: battle(over) as any, userId: ME, heroId, vitals, livingCount: 1 })!

describe('coop: Armadura', () => {
  it('com Armadura publicada, a mitigação segue a mesma curva do solo', () => {
    for (const armor of [0, 1, 4, 10, 25, 60]) {
      expect(coopMemberDefenseBase({ armor }, 0)).toBe(Math.ceil(armorMitigation(armor)))
    }
  })

  it('os bônus percentuais (postura, grupo) valem sobre a Armadura antes da curva, como no solo', () => {
    useGame.getState().newGame('guardiao')
    const armored = EQUIPMENT.filter((e) => e.slot !== 'bolsa' && (e.defesa ?? 0) > 0 && (!e.classeExclusiva || [e.classeExclusiva].flat().includes('guardiao'))).slice(0, 4)
    const equipped: Record<string, string> = {}
    for (const item of armored) equipped[item.slot] = `${item.id}@@coop${item.slot}`
    useGame.setState({ xp: xpForLevel(100), equipped } as any)
    expect(armorValue(state())).toBeGreaterThan(0)
    for (const stance of ['ofensiva', 'neutra', 'defensiva'] as BattleStance[]) {
      useGame.setState({ battleStance: stance, combatDefensePct: 0.1 } as any)
      const solo = defenseValue(state())
      const pct = coopMemberDefensePct({ defensePct: 0.1 }, { battleStance: stance })
      expect(pct).toBeCloseTo(0.1 + STANCE_DEFENSE_PCT[stance])
      expect(coopMemberDefenseBase({ armor: armorValue(state()) }, pct), stance).toBe(solo)
    }
  })

  it('sem Armadura publicada (cliente antigo), usa a defesa já mitigada como antes', () => {
    expect(coopMemberDefenseBase({ defense: 6 }, 0)).toBe(6)
    expect(coopMemberDefenseBase({ defense: 6 }, 0.1)).toBe(7)
    expect(coopMemberDefenseBase(6, 0.1)).toBe(7)
    expect(coopMemberDefenseBase({}, 0.5)).toBe(0)
  })

  it('Armadura zero continua zero mesmo com buffs (buff não cria Armadura)', () => {
    expect(coopMemberDefenseBase({ armor: 0 }, 0.5)).toBe(0)
  })

  it('mais Armadura publicada reduz o dano previsto, mas nunca zera o golpe', () => {
    const naked = threat({ hp: 200, maxHp: 200, armor: 0, shield: 0, rollBonus: 0 })
    const armored = threat({ hp: 200, maxHp: 200, armor: 40, shield: 0, rollBonus: 0 })
    const extreme = threat({ hp: 200, maxHp: 200, armor: 100_000, shield: 0, rollBonus: 0 })
    expect(armored.max).toBeLessThan(naked.max)
    expect(armored.average).toBeLessThanOrEqual(naked.average)
    expect(extreme.max).toBeGreaterThan(0)
  })
})

describe('coop: esquiva', () => {
  beforeEach(() => useGame.getState().newGame('cacadora'))

  it('usa a esquiva publicada (Destreza + passiva + forjada, já com teto)', () => {
    const published = heroDodgeChance(state())
    expect(coopMemberDodge({ dodgeChance: published }, 'cacadora')).toBeCloseTo(published)
    expect(coopMemberDodge({ dodgeChance: 5 }, 'cacadora')).toBe(1)
    expect(coopMemberDodge({ dodgeChance: -1 }, 'cacadora')).toBe(0)
  })

  it('sem esquiva publicada, cai na regra antiga da classe e nunca passa do teto', () => {
    expect(coopMemberDodge({}, 'cacadora')).toBeCloseTo(0.2)
    expect(coopMemberDodge({}, 'cacador')).toBeCloseTo(0.2)
    expect(coopMemberDodge({}, 'guerreiro')).toBe(0)
    expect(coopMemberDodge({ dodgeBoost: true }, 'cacadora')).toBeLessThanOrEqual(ATTRIBUTE_RULES.esquiva.tetoTotal)
  })

  it('a previsão do golpe do inimigo usa a esquiva publicada do membro', () => {
    const none = threat({ hp: 100, maxHp: 100, armor: 0, dodgeChance: 0, shield: 0, rollBonus: 0 })
    const evasive = threat({ hp: 100, maxHp: 100, armor: 0, dodgeChance: 0.4, shield: 0, rollBonus: 0 })
    expect(none.dodgeChance).toBe(0)
    expect(evasive.dodgeChance).toBeCloseTo(0.4)
    expect(evasive.average).toBeLessThan(none.average)
  })
})

describe('coop: resistência do Vigor a elementos', () => {
  it('reduz dano elemental, mas não o físico, e nunca abaixo de 1', () => {
    const elemental = { resolvedDamage: 10, dodged: false, resisted: false, shield: 0, intercepting: false, elementalEnemy: true }
    const physical = { ...elemental, elementalEnemy: false }
    expect(coopEnemyDamage({ ...elemental, elementalResist: 0 }).damage).toBe(10)
    expect(coopEnemyDamage({ ...elemental, elementalResist: 0.3 }).damage).toBe(7)
    expect(coopEnemyDamage({ ...physical, elementalResist: 0.3 }).damage).toBe(10)
    expect(coopEnemyDamage({ ...elemental, elementalResist: 5 }).damage).toBeGreaterThanOrEqual(1)
    expect(coopEnemyDamage({ ...elemental, resolvedDamage: 1, elementalResist: 0.75 }).damage).toBe(1)
  })

  it('a resistência publicada por um herói de Vigor alto é a mesma do solo', () => {
    useGame.getState().newGame('guardiao')
    useGame.setState({ attr: { forca: 0, magia: 0, vigor: 30, destreza: 0 } } as any)
    const published = heroElementalResistance(state())
    expect(published).toBeGreaterThan(0)
    const low = threat({ hp: 100, maxHp: 100, armor: 0, shield: 0, rollBonus: 0, elementalResist: 0 }, { enemy: { nome: 'Fênix', ataque: 15, elemento: 'fogo' } })
    const resistant = threat({ hp: 100, maxHp: 100, armor: 0, shield: 0, rollBonus: 0, elementalResist: published }, { enemy: { nome: 'Fênix', ataque: 15, elemento: 'fogo' } })
    expect(resistant.max).toBeLessThanOrEqual(low.max)
    expect(resistant.average).toBeLessThanOrEqual(low.average)
  })

  it('golpe físico ignora a resistência elemental na previsão', () => {
    const a = threat({ hp: 100, maxHp: 100, armor: 0, shield: 0, rollBonus: 0, elementalResist: 0 })
    const b = threat({ hp: 100, maxHp: 100, armor: 0, shield: 0, rollBonus: 0, elementalResist: 0.6 })
    expect(b.max).toBe(a.max)
    expect(b.average).toBe(a.average)
  })
})
