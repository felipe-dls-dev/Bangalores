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

export function heroForecast(p: HeroAttackPreview): ForecastLine {
  const notes = [`média ${p.average}`, `crítico ${percentLabel(p.critChance)}`]
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

/** `hp` é a vida atual do herói: o aviso sobe de nível conforme o pior caso se aproxima dela. */
export function enemyForecast(p: EnemyThreatPreview, hp: number, options: { summons?: boolean } = {}): ThreatLine {
  const notes = [`média ${p.average}`]
  if (p.dodgeChance > 0) notes.push(`esquiva ${percentLabel(p.dodgeChance)}`)
  if (p.shield > 0) notes.push(`escudo absorve até ${p.shield}`)
  if (options.summons) notes.push('feras podem interceptar')
  const level: ThreatLevel = p.lethal ? 'lethal' : p.max >= hp * 0.5 ? 'warn' : 'safe'
  if (level === 'lethal') notes.push('pode derrubar você')
  return { range: rangeLabel(p.min, p.max), notes, level }
}
