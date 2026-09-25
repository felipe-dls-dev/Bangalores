// Texto da Previsão de combate (modo Moderno). Funções puras sobre os números de combatPreview.ts:
// a tela (CombatForecast.tsx) só desenha o que sai daqui.

import type { EnemyThreatPreview, HeroAttackPreview } from '../store/combatPreview'

export const rangeLabel = (min: number, max: number) => (min === max ? `${max}` : `${min}–${max}`)

export function percentLabel(chance: number): string {
  const value = Math.round(chance * 100)
  return value === 0 && chance > 0 ? '<1%' : `${value}%`
}

export interface ForecastLine {
  /** Faixa de dano, como "3–8". */
  range: string
  /** Notas curtas ("média 5", "crítico 17%", "fraqueza elemental +35%"). */
  notes: string[]
}

export function heroForecast(p: Omit<HeroAttackPreview, 'staggered'> & { staggered?: boolean; finisher?: boolean }): ForecastLine {
  const notes = [`média ${p.average}`, `crítico ${percentLabel(p.critChance)}`]
  if (p.finisher) notes.push('o golpe mais forte derruba o inimigo')
  if (p.zeroChance > 0) notes.push(`${percentLabel(p.zeroChance)} de não causar dano`)
  if (p.elemental === 'fraqueza') notes.push('fraqueza elemental +35%')
  if (p.elemental === 'resistencia') notes.push('inimigo resiste −25%')
  if (p.staggered) notes.push('postura quebrada +50%')
  return { range: rangeLabel(p.min, p.max), notes }
}

export type ThreatLevel = 'safe' | 'warn' | 'lethal'

export interface ThreatLine extends ForecastLine {
  level: ThreatLevel
}

export interface CoopThreatInfo {
  /** Chance (0–1) de o inimigo escolher este jogador. */
  targetChance: number
  minionsAlive: number
  enemyStunned: boolean
}

/** `hp` é a vida atual do herói: o aviso sobe de nível conforme o pior caso se aproxima dela. */
export function enemyForecast(p: EnemyThreatPreview, hp: number, options: { summons?: boolean; coop?: CoopThreatInfo } = {}): ThreatLine {
  if (options.coop?.enemyStunned) return { range: '0', notes: ['o inimigo está atordoado e perde a vez'], level: 'safe' }
  const notes = [`média ${p.average}`]
  if (options.coop) notes.push(options.coop.targetChance >= 1 ? 'ele vai atacar você' : options.coop.targetChance <= 0 ? 'ele está provocado por outro' : `${percentLabel(options.coop.targetChance)} de chance de ser o alvo`)
  if (options.coop && options.coop.minionsAlive > 0) notes.push(`${options.coop.minionsAlive} capanga${options.coop.minionsAlive > 1 ? 's' : ''} também atacam`)
  if (p.dodgeChance > 0) notes.push(`esquiva ${percentLabel(p.dodgeChance)}`)
  if (p.shield > 0) notes.push(`escudo absorve até ${p.shield}`)
  if (options.summons) notes.push('feras podem interceptar')
  const canTargetYou = !options.coop || options.coop.targetChance > 0
  const level: ThreatLevel = !canTargetYou ? 'safe' : p.lethal ? 'lethal' : p.max >= hp * 0.5 ? 'warn' : 'safe'
  if (level === 'lethal') notes.push('pode derrubar você')
  return { range: rangeLabel(p.min, p.max), notes, level }
}
