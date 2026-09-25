// Previsão de combate no modo cooperativo. Só LÊ o estado compartilhado da batalha: enumera as combinações de
// dados e resume, usando as MESMAS contas de coopMath.ts que o combate cooperativo usa (CoopContext.tsx).
// Diferenças de propósito em relação ao solo (store/combatPreview.ts): o coop não tem elemento/postura quebrada
// no golpe do herói, a defesa do inimigo vem da dificuldade, e o inimigo sorteia quem ataca.

import type { Element } from '../data/expansion'
import { attackValue, consumeStun, hasCraftedEffect, resolveCombatRoll, rollPenaltyFrom, specializationBonuses, tickStatus, useGame } from '../store/game'
import { summarize, type DamagePreview, type EnemyThreatPreview, type Outcome } from '../store/combatPreview'
import type { Enemy } from '../types'
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

type Snapshot = ReturnType<typeof useGame.getState>
type Battle = Record<string, any>

const FACES = [1, 2, 3, 4, 5, 6] as const

/** O que o golpe do herói usa no coop (mesmos números que performCoopAttack em main.tsx manda para coopAttack). */
export interface CoopAttackInputs {
  attackBase: number
  defenseBase: number
  rollBonus: number
  critBoost: boolean
  critChancePct: number
  critDamageBonusPct: number
}

/** Números do golpe do herói contra o inimigo principal (ou contra um capanga, que não tem defesa). */
export function coopAttackInputs(g: Snapshot, enemy: Pick<Enemy, 'boss' | 'dificuldade'>, targetMinion = false): CoopAttackInputs {
  const spec = specializationBonuses(g)
  const bossBonus = targetMinion ? 0 : (g.talents.includes('cacador') && enemy.boss ? 2 : 0) + (enemy.boss ? spec.bossDamage : 0) + g.firstStrikeBonus
  return {
    attackBase: attackValue(g) + bossBonus,
    defenseBase: Math.max(0, (enemy.dificuldade ?? 1) - 2),
    rollBonus: g.heroRollBonus + (g.classRollBonus ?? 0),
    critBoost: hasCraftedEffect(g, 'critico'),
    critChancePct: (hasCraftedEffect(g, 'critico_forjado') ? 0.05 : 0) + spec.crit,
    critDamageBonusPct: hasCraftedEffect(g, 'dano_critico_bonus') ? 0.1 : 0,
  }
}

export interface CoopHeroAttackPreview extends DamagePreview {
  /** O golpe mais forte já derruba o inimigo (vida dele ≤ dano máximo). */
  finisher: boolean
}

/** Prévia do ataque comum do herói no coop. `undefined` se não for a vez, estiver atordoado ou sem batalha. */
export function previewCoopHeroAttack(battle: Battle | undefined, userId: string, input: CoopAttackInputs, options: { targetMinion?: boolean } = {}): CoopHeroAttackPreview | undefined {
  if (!battle || battle.status !== 'playing') return undefined
  const group = battle.groupBuff ?? {}
  const personal = battle.playerBuffs?.[userId] ?? {}
  if (personal.stunned) return undefined
  const target = Boolean(options.targetMinion)
  const totalRollBonus = coopHeroRollBonus(group, personal, input.rollBonus)
  const totalCritBoost = coopHeroCritBoost(group, input.critBoost)
  const buffedAttack = coopBuffedAttack(input.attackBase, group, personal)
  const enemyStunned = !target && Boolean(battle.enemyStatus?.stunned)
  const fear = Number(battle.enemyFearPenalty ?? 0)
  const statusPenalty = target ? 0 : rollPenaltyFrom(battle.enemyStatus)
  const forced = Math.max(0, Math.min(1, input.critChancePct))

  const outcomes: Outcome[] = []
  for (const d of FACES) {
    const defenseRoll = enemyStunned ? 1 : coopHeroDefenseRoll(d, fear, statusPenalty)
    const strike = (attackRoll: number) => resolveCombatRoll(buffedAttack, target ? 0 : input.defenseBase, attackRoll, defenseRoll, input.critDamageBonusPct).damage
    if (forced > 0) outcomes.push({ p: forced / 6, damage: strike(6), crit: true })
    for (const n of FACES) {
      const attackRoll = coopHeroAttackRoll(n, totalRollBonus, totalCritBoost)
      outcomes.push({ p: (1 - forced) / 36, damage: strike(attackRoll), crit: attackRoll === 6 })
    }
  }
  const summary = summarize(outcomes)
  const enemyHp = target ? Number.POSITIVE_INFINITY : Number(battle.enemyHp ?? Number.POSITIVE_INFINITY)
  return { ...summary, finisher: summary.max >= enemyHp }
}

export interface CoopMemberVitals {
  hp: number
  maxHp?: number
  defense?: number
  shield?: number
  rollBonus?: number
  critDefenseBoost?: boolean
  dodgeBoost?: boolean
  resistances?: Element[]
}

export interface CoopThreatPreview extends EnemyThreatPreview {
  /** Chance (0–1) de o inimigo escolher VOCÊ como alvo neste turno (provocação decide, senão sorteio entre os vivos). */
  targetChance: number
  /** O inimigo está atordoado e perde a vez. */
  enemyStunned: boolean
  /** Capangas vivos que também atacam no turno do inimigo (o dano deles não entra na faixa). */
  minionsAlive: number
}

/**
 * Prévia do golpe principal do inimigo SE ele escolher este jogador. Reproduz o começo do turno do inimigo
 * (medo e bônus de grupo vencendo, condições do inimigo e do jogador andando) antes de rolar os dados.
 */
export function previewCoopEnemyAttack(input: { battle: Battle | undefined; userId: string; heroId?: string; vitals: CoopMemberVitals | undefined; livingCount: number }): CoopThreatPreview | undefined {
  const { battle, userId, heroId, vitals } = input
  if (!battle || battle.status !== 'playing' || !battle.enemy || !vitals) return undefined
  const enemy = battle.enemy as Enemy
  const minionsAlive = (Array.isArray(battle.combatMinions) ? battle.combatMinions : []).filter((m: any) => m.hp > 0).length

  // Relógios que andam no começo do turno do inimigo (medo, bônus de grupo, condições).
  let fear = Number(battle.enemyFearPenalty ?? 0)
  const fearTurns = Number(battle.fearTurnsLeft ?? 0)
  if (fearTurns > 0 && fearTurns - 1 <= 0) fear = 0
  let group: Battle = { ...(battle.groupBuff ?? {}) }
  if (Number(group.arcaneTurnsLeft ?? 0) > 0 && Number(group.arcaneTurnsLeft) - 1 <= 0) {
    const { roll: _r, attackPct: _a, defensePct: _d, arcaneTurnsLeft: _t, ...rest } = group
    group = rest
  }
  const enemyStatusAfterTick = tickStatus(battle.enemyStatus).status
  const enemyStun = consumeStun(enemyStatusAfterTick)
  const noThreat = (): CoopThreatPreview => ({ min: 0, max: 0, average: 0, critChance: 0, zeroChance: 1, dodgeChance: 0, shield: Number(vitals.shield ?? 0), lethal: false, intentLabel: 'Atordoado', targetChance: 0, enemyStunned: true, minionsAlive })
  if (enemyStun.wasStunned) return noThreat()

  const myTick = tickStatus(battle.playerBuffs?.[userId])
  let personal: Battle = myTick.status
  if (Number(personal.buffTurnsLeft ?? 0) > 0 && Number(personal.buffTurnsLeft) - 1 <= 0) {
    const { attackPct: _a, defensePct: _d, buffTurnsLeft: _b, ...rest } = personal
    personal = rest
  }
  const myStun = consumeStun(personal)
  const enemyPenalty = fear + rollPenaltyFrom(enemyStun.status)
  const bonus = Number(battle.enemyRollBonus ?? 0)
  const druidEdge = heroId === 'druida' ? 0.25 : 0
  const defenseBase = coopMemberDefenseBase(Number(vitals.defense ?? 0), coopMemberDefensePct(group, personal))
  const statusPenalty = rollPenaltyFrom(myStun.status)
  const rollBonus = Number(group.roll ?? 0) + Number(vitals.rollBonus ?? 0)
  const enemyElement = (enemy.elemento ?? 'fisico') as Element
  const resisted = (vitals.resistances ?? []).includes(enemyElement)
  const dodgeChance = 1 - (1 - (heroId === 'cacadora' || heroId === 'cacador' ? 0.2 : 0)) * (1 - (vitals.dodgeBoost ? 0.05 : 0))

  const outcomes: Outcome[] = []
  for (const n of FACES) {
    for (const d of FACES) {
      const defenseRoll = myStun.wasStunned ? 1 : coopMemberDefenseRoll(d, rollBonus, Boolean(vitals.critDefenseBoost), statusPenalty)
      for (const [weight, luck] of [
        [1 - druidEdge, false],
        [druidEdge, true],
      ] as const) {
        if (weight <= 0) continue
        const attackRoll = coopEnemyAttackRoll(n, bonus, luck, enemyPenalty)
        const resolved = resolveCombatRoll(Number(enemy.ataque ?? 1), defenseBase, attackRoll, defenseRoll).damage
        const { damage } = coopEnemyDamage({ resolvedDamage: resolved, dodged: false, resisted, shield: Number(vitals.shield ?? 0), intercepting: false })
        outcomes.push({ p: weight / 36, damage, crit: attackRoll === 6 })
      }
    }
  }
  const landed = summarize(outcomes)
  const taunted = battle.tauntUserId === userId
  const tauntElsewhere = Boolean(battle.tauntUserId) && !taunted && input.livingCount > 1
  const targetChance = tauntElsewhere ? 0 : taunted ? 1 : 1 / Math.max(1, input.livingCount)
  return {
    min: dodgeChance >= 1 ? 0 : landed.min,
    max: landed.max,
    average: Math.round(landed.average * (1 - dodgeChance)),
    critChance: landed.critChance * (1 - dodgeChance),
    zeroChance: dodgeChance + (1 - dodgeChance) * landed.zeroChance,
    dodgeChance,
    shield: Number(vitals.shield ?? 0),
    // sangramento/queimadura/veneno do próprio jogador batem ANTES do golpe do inimigo (começo do turno dele)
    lethal: landed.max >= Number(vitals.hp ?? 0) - myTick.damage && dodgeChance < 1,
    intentLabel: 'Ataque direto',
    targetChance,
    enemyStunned: false,
    minionsAlive,
  }
}
