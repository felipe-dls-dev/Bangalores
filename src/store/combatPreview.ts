// Previsão de combate (solo): quanto o próximo golpe do herói causa e quanto o golpe seguinte do
// inimigo pode custar. Só LÊ o estado -- não muda nada e não sorteia nada: enumera as combinações
// de dados que o combate real pode produzir e resume o resultado.
//
// Espelha playerAttack() (ataque do herói) e a fase do inimigo em game.ts. Se uma regra de dano
// mudar lá, o teste combatPreview.test.ts (que compara com o combate de verdade) acusa a diferença.

import { ELEMENT_ADVANTAGES } from '../data/expansion'
import {
  attackValue,
  bestiaryDamageBonus,
  defenseValue,
  enemyDefenseValue,
  enemyIntentFor,
  hasCraftedEffect,
  heroHasResistance,
  heroResistanceReduction,
  heroWeaponElement,
  resolveCombatRoll,
  rollPenaltyFrom,
  specializationBonuses,
  useGame,
} from './game'

type Snapshot = ReturnType<typeof useGame.getState>

export interface DamagePreview {
  /** Menor e maior dano possíveis (todas as combinações de dados). */
  min: number
  max: number
  /** Dano médio, arredondado. */
  average: number
  /** Chance (0–1) de o dado de ataque cair em crítico (6). */
  critChance: number
  /** Chance (0–1) de o golpe não causar dano nenhum. */
  zeroChance: number
}

export interface HeroAttackPreview extends DamagePreview {
  /** A arma do herói acerta uma fraqueza ou bate numa resistência do inimigo. */
  elemental?: 'fraqueza' | 'resistencia'
  /** O inimigo está com a postura quebrada: o golpe leva +50%. */
  staggered: boolean
}

export interface EnemyThreatPreview extends DamagePreview {
  /** Chance (0–1) de o herói esquivar sem sofrer dano. */
  dodgeChance: number
  /** Escudo do herói neste momento: já está descontado do dano previsto. */
  shield: number
  /** O pior caso deixa o herói sem vida. */
  lethal: boolean
  intentLabel: string
}

export interface PreviewOptions {
  /** Ignora a intenção do turno e considera um ataque direto (para telas fora do combate, como a do chefe). */
  plainAttack?: boolean
}

const PLAIN_INTENT = { type: 'attack', label: 'Ataque direto', description: '' } as const

export interface Outcome {
  p: number
  damage: number
  crit: boolean
}

const FACES = [1, 2, 3, 4, 5, 6] as const
const clampRoll = (value: number) => Math.max(1, Math.min(6, value))

export function summarize(outcomes: Outcome[]): DamagePreview {
  const total = outcomes.reduce((sum, o) => sum + o.p, 0) || 1
  const damages = outcomes.map((o) => o.damage)
  return {
    min: Math.min(...damages),
    max: Math.max(...damages),
    average: Math.round(outcomes.reduce((sum, o) => sum + o.p * o.damage, 0) / total),
    critChance: outcomes.filter((o) => o.crit).reduce((sum, o) => sum + o.p, 0) / total,
    zeroChance: outcomes.filter((o) => o.damage <= 0).reduce((sum, o) => sum + o.p, 0) / total,
  }
}

/** Prévia do ataque comum do herói contra o inimigo atual. `undefined` fora de um combate solo. */
export function previewHeroAttack(s: Snapshot, options: PreviewOptions = {}): HeroAttackPreview | undefined {
  const enemy = s.enemy
  if (!enemy) return undefined
  const intent = options.plainAttack ? PLAIN_INTENT : enemyIntentFor(enemy, s.combatTurn)
  const spec = specializationBonuses(s)
  const attackBase =
    attackValue(s) + s.firstStrikeBonus + (enemy.boss ? spec.bossDamage : 0) + (s.talents.includes('cacador') && enemy.boss ? 2 : 0) + bestiaryDamageBonus(s, enemy)
  const defenseBase = enemyDefenseValue(enemy) + (intent.type === 'guard' ? 2 : 0)
  const attackBonus = s.heroRollBonus + (s.classRollBonus ?? 0) - rollPenaltyFrom(s.heroStatus)
  const critRule = hasCraftedEffect(s, 'critico') || Boolean(s.groupCriticalBoost)
  const critBonusPct = hasCraftedEffect(s, 'dano_critico_bonus') ? 0.1 : 0
  const forcedCrit = 1 - (1 - (hasCraftedEffect(s, 'critico_forjado') ? 0.05 : 0)) * (1 - spec.crit)
  const defensePenalty = (s.enemyFearPenalty ?? 0) + rollPenaltyFrom(s.enemyStatus)
  const stunned = Boolean(s.enemyStatus?.stunned)

  const heroElement = heroWeaponElement(s)
  const enemyElement = enemy.elemento ?? (enemy.boss ? 'sombra' : 'fisico')
  const weak = ELEMENT_ADVANTAGES[enemyElement]?.weakAgainst ?? []
  const strong = ELEMENT_ADVANTAGES[enemyElement]?.strongAgainst ?? []
  const elemental: HeroAttackPreview['elemental'] =
    heroElement !== 'fisico' && weak.includes(heroElement) ? 'fraqueza' : heroElement !== 'fisico' && (heroElement === enemyElement || strong.includes(heroElement)) ? 'resistencia' : undefined
  const staggered = Boolean(s.isStaggered)

  const strike = (attackRoll: number, defenseRoll: number) => {
    let damage = resolveCombatRoll(attackBase, defenseBase, attackRoll, defenseRoll, critBonusPct).damage
    if (elemental === 'fraqueza' && damage > 0) damage = Math.max(1, Math.round(damage * 1.35))
    else if (elemental === 'resistencia' && damage > 0) damage = Math.max(1, Math.round(damage * 0.75))
    if (staggered && damage > 0) damage = Math.max(1, Math.round(damage * 1.5))
    return damage
  }

  const outcomes: Outcome[] = []
  for (const d of FACES) {
    const defenseRoll = stunned ? 1 : Math.max(1, d - defensePenalty)
    outcomes.push({ p: (forcedCrit / 6), damage: strike(6, defenseRoll), crit: true })
    for (const n of FACES) {
      const attackRoll = clampRoll(n + attackBonus + (critRule && n === 5 ? 1 : 0))
      outcomes.push({ p: ((1 - forcedCrit) / 36), damage: strike(attackRoll, defenseRoll), crit: attackRoll === 6 })
    }
  }
  return { ...summarize(outcomes.filter((o) => o.p > 0)), elemental, staggered }
}

/** Prévia do golpe que o inimigo dá depois da ação do herói neste turno. */
export function previewEnemyAttack(s: Snapshot, options: PreviewOptions = {}): EnemyThreatPreview | undefined {
  const enemy = s.enemy
  if (!enemy) return undefined
  const intent = options.plainAttack ? PLAIN_INTENT : enemyIntentFor(enemy, s.combatTurn)
  const attackBase = Math.ceil(enemy.ataque * (intent.type === 'heavy' ? 1.35 : 1))
  const defenseBase = defenseValue(s)
  const attackBonus = s.enemyRollBonus - rollPenaltyFrom(s.enemyStatus) - (s.enemyFearPenalty ?? 0)
  const druidEdge = s.heroId === 'druida' ? 0.25 : 0
  const defenseBonus = s.classRollBonus ?? 0
  const perfectDefense = hasCraftedEffect(s, 'defesa_perfeita')
  const defensePenalty = rollPenaltyFrom(s.heroStatus)
  const dodgeChance = 1 - (1 - (s.heroId === 'cacadora' || s.heroId === 'cacador' ? 0.2 : 0)) * (1 - (hasCraftedEffect(s, 'esquiva_forjada') ? 0.05 : 0))

  const enemyElement = enemy.elemento ?? 'fisico'
  const resisted = heroHasResistance(s, enemyElement)
  const reduction = resisted ? heroResistanceReduction(s, enemyElement) : 0
  const shield = s.shield ?? 0

  const hit = (attackRoll: number, defenseRoll: number) => {
    let raw = resolveCombatRoll(attackBase, defenseBase, attackRoll, defenseRoll).damage
    if (resisted && raw > 0) raw = Math.max(0, raw - reduction)
    return raw - Math.min(shield, raw)
  }

  const outcomes: Outcome[] = []
  for (const n of FACES) {
    for (const d of FACES) {
      const defenseRoll = clampRoll(d + defenseBonus + (perfectDefense && d === 5 ? 1 : 0) - defensePenalty)
      for (const [weight, edge] of [
        [1 - druidEdge, 0],
        [druidEdge, 1],
      ] as const) {
        if (weight <= 0) continue
        const attackRoll = clampRoll(n + attackBonus - edge)
        outcomes.push({ p: weight / 36, damage: hit(attackRoll, defenseRoll), crit: attackRoll === 6 })
      }
    }
  }
  const landed = summarize(outcomes)
  // A esquiva anula o golpe inteiro: entra na média e no "zero", mas não muda o pior caso.
  const average = Math.round(landed.average * (1 - dodgeChance))
  const zeroChance = dodgeChance + (1 - dodgeChance) * landed.zeroChance
  return {
    min: dodgeChance >= 1 ? 0 : landed.min,
    max: landed.max,
    average,
    critChance: landed.critChance * (1 - dodgeChance),
    zeroChance,
    dodgeChance,
    shield,
    lethal: landed.max >= s.hp && dodgeChance < 1,
    intentLabel: intent.label,
  }
}
