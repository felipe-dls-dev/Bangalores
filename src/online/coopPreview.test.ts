import { describe, expect, it } from 'vitest'
import { STANCE_ATTACK_PCT, STANCE_DEFENSE_PCT, resolveCombatRoll, rollPenaltyFrom, useGame, type BattleStance } from '../store/game'
import { coopAttackInputs, previewCoopEnemyAttack, previewCoopHeroAttack, type CoopAttackInputs, type CoopMemberVitals } from './coopPreview'
import {
  coopBuffedAttack,
  coopEnemyAttackRoll,
  coopEnemyDamage,
  coopHeroAttackRoll,
  coopHeroCritBoost,
  coopHeroDefenseRoll,
  coopHeroRollBonus,
  coopMemberDefenseBase,
  coopMemberDefensePct,
  coopMemberDefenseRoll,
} from './coopMath'

const FACES = [1, 2, 3, 4, 5, 6]
const ME = 'me'
const clamp = (v: number) => Math.max(1, Math.min(6, v))
const baseInput: CoopAttackInputs = { attackBase: 14, defenseBase: 4, rollBonus: 0, critBoost: false, critChancePct: 0, critDamageBonusPct: 0 }
const baseVitals: CoopMemberVitals = { hp: 30, maxHp: 30, defense: 6, shield: 0, rollBonus: 0 }
const battleWith = (over: Record<string, unknown> = {}) => ({
  status: 'playing', enemy: { nome: 'Chefe', ataque: 15, elemento: 'fogo', boss: true }, enemyHp: 200, groupBuff: {}, playerBuffs: { [ME]: {} }, enemyStatus: {},
  enemyFearPenalty: 0, fearTurnsLeft: 0, enemyRollBonus: 0, combatMinions: [], ...over,
})

// Referência: as contas do golpe do herói exatamente como estavam escritas dentro de coopAttack antes de virarem helpers.
function referenceHero(battle: any, input: CoopAttackInputs, target = false) {
  const group = battle.groupBuff ?? {}
  const personal = battle.playerBuffs?.[ME] ?? {}
  const totalRollBonus = Number(group.roll ?? 0) + Number(personal.roll ?? 0) + Number(personal.nextRoll ?? 0) + input.rollBonus - rollPenaltyFrom(personal)
  const totalCritBoost = Boolean(group.critBoost) || input.critBoost
  const buffedAttack = Math.ceil(input.attackBase * (1 + Number(group.attackPct ?? 0) + Number(personal.attackPct ?? 0) + STANCE_ATTACK_PCT[(personal.battleStance ?? 'neutra') as BattleStance]))
  const damages: number[] = []
  for (const n of FACES) for (const d of FACES) {
    const attackRoll = clamp(n + totalRollBonus + (totalCritBoost && n === 5 ? 1 : 0))
    const stunned = Boolean(battle.enemyStatus?.stunned)
    const defenseRoll = stunned && !target ? 1 : Math.max(1, d - Number(battle.enemyFearPenalty ?? 0) - (target ? 0 : rollPenaltyFrom(battle.enemyStatus)))
    damages.push(resolveCombatRoll(buffedAttack, target ? 0 : input.defenseBase, attackRoll, defenseRoll, input.critDamageBonusPct).damage)
  }
  return damages
}

describe('coopMath: contas de dado do coop', () => {
  it('bônus e crítico do herói somam grupo, pessoal, próximo golpe e tiram condições', () => {
    expect(coopHeroRollBonus({ roll: 1 }, { roll: 1, nextRoll: 1 }, 1)).toBe(4)
    expect(coopHeroRollBonus({}, { frozen: 2 }, 0)).toBe(-1)
    expect(coopHeroCritBoost({ critBoost: true }, false)).toBe(true)
    expect(coopHeroCritBoost({}, false)).toBe(false)
  })

  it('dado de ataque do herói limita em 1–6 e o 5 vira 6 com a Marca do Predador', () => {
    expect(coopHeroAttackRoll(6, 3, false)).toBe(6)
    expect(coopHeroAttackRoll(1, -3, false)).toBe(1)
    expect(coopHeroAttackRoll(5, 0, true)).toBe(6)
    expect(coopHeroAttackRoll(4, 0, true)).toBe(4)
  })

  it('defesa do inimigo cai com medo e condições, mas nunca abaixo de 1', () => {
    expect(coopHeroDefenseRoll(4, 1, 1)).toBe(2)
    expect(coopHeroDefenseRoll(1, 3, 3)).toBe(1)
  })

  it('ataque com bônus de grupo, pessoal e postura', () => {
    expect(coopBuffedAttack(10, {}, {})).toBe(10)
    // mesma conta do jogo, com a imprecisão de ponto flutuante de sempre (10 × 1,2 vira 12,000…02 e sobe para 13)
    expect(coopBuffedAttack(10, { attackPct: 0.1 }, { attackPct: 0.1 })).toBe(Math.ceil(10 * (1 + 0.1 + 0.1)))
    expect(coopBuffedAttack(10, { attackPct: 0.1 }, {})).toBeGreaterThan(10)
    expect(coopBuffedAttack(10, {}, { battleStance: 'ofensiva' })).toBe(Math.ceil(10 * (1 + STANCE_ATTACK_PCT.ofensiva)))
  })

  it('REGRESSÃO: inimigo congelado/assustado ataca mais FRACO, não mais forte (o sinal estava invertido)', () => {
    const plain = coopEnemyAttackRoll(4, 0, false, 0)
    const frozen = coopEnemyAttackRoll(4, 0, false, 1)
    const afraid = coopEnemyAttackRoll(4, 0, false, 2)
    expect(frozen).toBeLessThan(plain)
    expect(afraid).toBeLessThan(frozen)
    expect(coopEnemyAttackRoll(4, 0, true, 0)).toBe(3) // sorte da Druida
    expect(coopEnemyAttackRoll(1, 0, false, 5)).toBe(1)
    expect(coopEnemyAttackRoll(6, 5, false, 0)).toBe(6)
  })

  it('defesa do membro: bônus, defesa perfeita com 5 e condições', () => {
    expect(coopMemberDefenseRoll(3, 1, false, 0)).toBe(4)
    expect(coopMemberDefenseRoll(5, 0, true, 0)).toBe(6)
    expect(coopMemberDefenseRoll(2, 0, false, 5)).toBe(1)
    expect(coopMemberDefensePct({ defensePct: 0.1 }, { battleStance: 'defensiva' })).toBeCloseTo(0.1 + STANCE_DEFENSE_PCT.defensiva, 5)
    expect(coopMemberDefenseBase(6, 0.1)).toBe(7)
  })

  it('dano no membro: esquiva zera, resistência tira 1, escudo absorve, fera intercepta sem escudo', () => {
    expect(coopEnemyDamage({ resolvedDamage: 8, dodged: true, resisted: false, shield: 3, intercepting: false })).toEqual({ damage: 0, shieldBlocked: 0 })
    expect(coopEnemyDamage({ resolvedDamage: 8, dodged: false, resisted: true, shield: 0, intercepting: false })).toEqual({ damage: 7, shieldBlocked: 0 })
    expect(coopEnemyDamage({ resolvedDamage: 8, dodged: false, resisted: false, shield: 3, intercepting: false })).toEqual({ damage: 5, shieldBlocked: 3 })
    expect(coopEnemyDamage({ resolvedDamage: 8, dodged: false, resisted: false, shield: 3, intercepting: true })).toEqual({ damage: 8, shieldBlocked: 0 })
    expect(coopEnemyDamage({ resolvedDamage: 0, dodged: false, resisted: true, shield: 0, intercepting: false })).toEqual({ damage: 0, shieldBlocked: 0 })
  })
})

describe('previsão do ataque do herói no coop bate com a conta de referência', () => {
  const cases: Array<[string, Record<string, unknown>, Partial<CoopAttackInputs>]> = [
    ['sem bônus', {}, {}],
    ['bônus de grupo (Ascensão Arcana)', { groupBuff: { roll: 1, attackPct: 0.1 } }, {}],
    ['bônus pessoal e postura ofensiva', { playerBuffs: { [ME]: { attackPct: 0.1, battleStance: 'ofensiva', roll: 1 } } }, {}],
    ['Marca do Predador (5 vira 6)', { groupBuff: { critBoost: true } }, {}],
    ['inimigo com medo', { enemyFearPenalty: 2 }, {}],
    ['inimigo congelado', { enemyStatus: { frozen: 2 } }, {}],
    ['inimigo atordoado (defesa vira 1)', { enemyStatus: { stunned: true } }, {}],
    ['herói cego', { playerBuffs: { [ME]: { blinded: 2 } } }, {}],
    ['próximo golpe com bônus', { playerBuffs: { [ME]: { nextRoll: 1 } } }, {}],
    ['dano crítico extra', {}, { critDamageBonusPct: 0.1 }],
    ['ataque alto e defesa alta do inimigo', {}, { attackBase: 30, defenseBase: 12 }],
  ]

  for (const [name, over, inputOver] of cases) {
    it(name, () => {
      const battle = battleWith(over)
      const input = { ...baseInput, ...inputOver }
      const preview = previewCoopHeroAttack(battle, ME, input)!
      const reference = referenceHero(battle, input)
      expect(preview.min).toBe(Math.min(...reference))
      expect(preview.max).toBe(Math.max(...reference))
      const mean = reference.reduce((a, b) => a + b, 0) / reference.length
      expect(Math.abs(preview.average - mean)).toBeLessThanOrEqual(1)
    })
  }

  it('contra capanga não há defesa nem condições do inimigo principal', () => {
    const battle = battleWith({ enemyFearPenalty: 3, enemyStatus: { frozen: 2, stunned: true } })
    const preview = previewCoopHeroAttack(battle, ME, baseInput, { targetMinion: true })!
    const reference = referenceHero(battle, baseInput, true)
    expect(preview.max).toBe(Math.max(...reference))
    expect(preview.min).toBe(Math.min(...reference))
  })

  it('crítico forjado entra na chance de crítico', () => {
    const plain = previewCoopHeroAttack(battleWith(), ME, baseInput)!
    const forged = previewCoopHeroAttack(battleWith(), ME, { ...baseInput, critChancePct: 0.05 })!
    expect(plain.critChance).toBeCloseTo(1 / 6, 5)
    expect(forged.critChance).toBeGreaterThan(plain.critChance)
  })

  it('sem previsão quando você está atordoado ou a batalha acabou', () => {
    expect(previewCoopHeroAttack(battleWith({ playerBuffs: { [ME]: { stunned: true } } }), ME, baseInput)).toBeUndefined()
    expect(previewCoopHeroAttack(battleWith({ status: 'won' }), ME, baseInput)).toBeUndefined()
    expect(previewCoopHeroAttack(undefined, ME, baseInput)).toBeUndefined()
  })

  it('avisa quando o golpe mais forte já derruba o inimigo', () => {
    expect(previewCoopHeroAttack(battleWith({ enemyHp: 5 }), ME, baseInput)!.finisher).toBe(true)
    expect(previewCoopHeroAttack(battleWith({ enemyHp: 5000 }), ME, baseInput)!.finisher).toBe(false)
  })
})

/** Referência do golpe do inimigo num membro, já com o sinal das condições corrigido. */
function referenceEnemy(battle: any, vitals: CoopMemberVitals, personal: any = {}, group: any = {}, enemyPenalty = 0, druid = false) {
  const defenseBase = Math.ceil(Number(vitals.defense ?? 0) * (1 + Number(group.defensePct ?? 0) + Number(personal.defensePct ?? 0) + STANCE_DEFENSE_PCT[(personal.battleStance ?? 'neutra') as BattleStance]))
  const results: number[] = []
  for (const luck of druid ? [false, true] : [false]) {
    for (const n of FACES) for (const d of FACES) {
      const attackRoll = clamp(n + Number(battle.enemyRollBonus ?? 0) - (luck ? 1 : 0) - enemyPenalty)
      const defenseRoll = clamp(d + Number(group.roll ?? 0) + Number(vitals.rollBonus ?? 0) + (vitals.critDefenseBoost && d === 5 ? 1 : 0) - rollPenaltyFrom(personal))
      let raw = resolveCombatRoll(Number(battle.enemy.ataque), defenseBase, attackRoll, defenseRoll).damage
      if ((vitals.resistances ?? []).includes(battle.enemy.elemento) && raw > 0) raw = Math.max(0, raw - 1)
      results.push(raw - Math.min(Number(vitals.shield ?? 0), raw))
    }
  }
  return results
}

describe('previsão do golpe do inimigo no coop', () => {
  const threat = (over: Record<string, unknown> = {}, vitals: Partial<CoopMemberVitals> = {}, extra: Record<string, unknown> = {}) =>
    previewCoopEnemyAttack({ battle: battleWith(over), userId: ME, heroId: 'guerreiro', vitals: { ...baseVitals, ...vitals }, livingCount: 3, ...extra })!

  it('base: bate com a conta de referência', () => {
    const p = threat()
    const reference = referenceEnemy(battleWith(), baseVitals)
    expect(p.min).toBe(Math.min(...reference))
    expect(p.max).toBe(Math.max(...reference))
    expect(Math.abs(p.average - reference.reduce((a, b) => a + b, 0) / reference.length)).toBeLessThanOrEqual(1)
  })

  it('escudo e resistência elemental (fogo) reduzem o dano', () => {
    const open = threat()
    expect(threat({}, { shield: 3 }).max).toBe(Math.max(0, open.max - 3))
    const resisted = threat({}, { resistances: ['fogo'] })
    expect(resisted.max).toBe(Math.max(...referenceEnemy(battleWith(), { ...baseVitals, resistances: ['fogo'] })))
    expect(resisted.max).toBeLessThan(open.max)
  })

  it('REGRESSÃO: inimigo congelado ou com medo causa menos dano, não mais', () => {
    const plain = threat()
    expect(threat({ enemyStatus: { frozen: 3 } }).average).toBeLessThan(plain.average)
    expect(threat({ enemyFearPenalty: 2, fearTurnsLeft: 3 }).average).toBeLessThan(plain.average)
  })

  it('medo que acaba neste turno não conta (o relógio anda antes do golpe)', () => {
    expect(threat({ enemyFearPenalty: 2, fearTurnsLeft: 1 }).average).toBe(threat().average)
  })

  it('bônus de grupo que acaba neste turno não protege mais', () => {
    const protectedRoll = threat({ groupBuff: { roll: 1, defensePct: 0.1, arcaneTurnsLeft: 3 } })
    const expiring = threat({ groupBuff: { roll: 1, defensePct: 0.1, arcaneTurnsLeft: 1 } })
    expect(expiring.average).toBeGreaterThan(protectedRoll.average)
    expect(expiring.average).toBe(threat().average)
  })

  it('postura defensiva reduz o dano previsto', () => {
    expect(threat({ playerBuffs: { [ME]: { battleStance: 'defensiva' } } }).average).toBeLessThan(threat().average)
  })

  it('Druida: 25% de chance de −1 no dado do inimigo; Ladino: 20% de esquiva', () => {
    const druid = previewCoopEnemyAttack({ battle: battleWith(), userId: ME, heroId: 'druida', vitals: baseVitals, livingCount: 3 })!
    const reference = referenceEnemy(battleWith(), baseVitals, {}, {}, 0, true)
    expect(druid.max).toBe(Math.max(...reference))
    expect(druid.average).toBeLessThanOrEqual(threat().average)
    const rogue = previewCoopEnemyAttack({ battle: battleWith(), userId: ME, heroId: 'cacadora', vitals: baseVitals, livingCount: 3 })!
    expect(rogue.dodgeChance).toBeCloseTo(0.2, 5)
    expect(threat().dodgeChance).toBe(0)
  })

  it('chance de o inimigo escolher você: sorteio entre os vivos, ou provocação', () => {
    expect(threat({}, {}, { livingCount: 4 }).targetChance).toBeCloseTo(0.25, 5)
    expect(threat({}, {}, { livingCount: 1 }).targetChance).toBe(1)
    expect(threat({ tauntUserId: ME }).targetChance).toBe(1)
    expect(threat({ tauntUserId: 'outro' }).targetChance).toBe(0)
  })

  it('inimigo atordoado perde a vez: sem ameaça', () => {
    const p = threat({ enemyStatus: { stunned: true } })
    expect(p.enemyStunned).toBe(true)
    expect(p.max).toBe(0)
    expect(p.lethal).toBe(false)
  })

  it('você atordoado não defende (dado 1) e o aviso de derrota considera o sangramento do começo do turno', () => {
    expect(threat({ playerBuffs: { [ME]: { stunned: true } } }).average).toBeGreaterThan(threat().average)
    const lethalByBleed = threat({ playerBuffs: { [ME]: { bleed: { turns: 2, amount: 20 } } } }, { hp: 25 })
    const noBleed = threat({}, { hp: 25 })
    expect(lethalByBleed.lethal).toBe(true)
    expect(noBleed.lethal).toBe(false)
  })

  it('conta os capangas vivos', () => {
    expect(threat({ combatMinions: [{ hp: 5 }, { hp: 0 }, { hp: 3 }] }).minionsAlive).toBe(2)
  })

  it('sem batalha ou sem seus dados vitais não há previsão', () => {
    expect(previewCoopEnemyAttack({ battle: undefined, userId: ME, vitals: baseVitals, livingCount: 2 })).toBeUndefined()
    expect(previewCoopEnemyAttack({ battle: battleWith(), userId: ME, vitals: undefined, livingCount: 2 })).toBeUndefined()
  })
})

describe('coopAttackInputs: mesmos números que o combate manda', () => {
  it('soma bônus de chefe e primeiro golpe e usa a defesa da dificuldade', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ firstStrikeBonus: 2, heroRollBonus: 1, classRollBonus: 1, talents: [] } as any)
    const boss = coopAttackInputs(useGame.getState(), { boss: true, dificuldade: 5 })
    const normal = coopAttackInputs(useGame.getState(), { boss: false, dificuldade: 5 })
    expect(boss.defenseBase).toBe(3)
    expect(boss.rollBonus).toBe(2)
    expect(boss.attackBase - normal.attackBase).toBe(0) // sem especialização/talento de chefe
    expect(normal.attackBase).toBeGreaterThan(0)
    expect(coopAttackInputs(useGame.getState(), { boss: true, dificuldade: 1 }).defenseBase).toBe(0)
    const minion = coopAttackInputs(useGame.getState(), { boss: true, dificuldade: 5 }, true)
    expect(minion.attackBase).toBe(normal.attackBase - 2) // capanga não recebe o bônus de primeiro golpe
  })

  it('talento de caçador de chefes soma +2 só contra chefe', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ firstStrikeBonus: 0, talents: ['cacador'] } as any)
    const boss = coopAttackInputs(useGame.getState(), { boss: true, dificuldade: 3 })
    const normal = coopAttackInputs(useGame.getState(), { boss: false, dificuldade: 3 })
    expect(boss.attackBase - normal.attackBase).toBe(2)
  })
})
