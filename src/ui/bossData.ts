// Dados da tela do chefe (modo Moderno): fases, fraquezas, adequação de nível e preparo. Só funções puras
// sobre regras que já existem em store/game.ts, para a tela (BossIntroModern.tsx) apenas desenhar.

import { ELEMENT_ADVANTAGES, type Element } from '../data/expansion'
import { CONSUMABLES, summonBossMinions } from '../store/game'
import type { Enemy } from '../types'

export const ELEMENT_LABELS: Record<Element, string> = {
  fisico: 'Físico',
  fogo: 'Fogo',
  gelo: 'Gelo',
  natureza: 'Natureza',
  sombra: 'Sombra',
  luz: 'Luz',
  arcano: 'Arcano',
}

export interface BossPhase {
  n: number
  title: string
  /** Vida (em %) em que o chefe entra na fase; a primeira começa em 100. */
  entersAt: number
  attack: number
  notes: string[]
}

/**
 * Fases do chefe, como o combate realmente as aplica (playerAttack em game.ts): ao cruzar cada limiar de
 * vida o chefe ganha +1 de Ataque e convoca capangas (até 2); a cada 4 turnos ele convoca reforços e,
 * da 2ª fase em diante, a cada 5 turnos recupera 8% da vida (enemyIntentFor / enemyAttack).
 */
export function bossPhases(enemy: Pick<Enemy, 'ataque' | 'vida' | 'nivel' | 'dificuldade'> & { maxFases?: number }): BossPhase[] {
  const total = Math.max(1, enemy.maxFases ?? 2)
  return Array.from({ length: total }, (_, index) => {
    const n = index + 1
    const attack = enemy.ataque + index
    if (n === 1) return { n, title: 'Fase 1', entersAt: 100, attack, notes: ['Luta sozinho contra você.'] }
    // Os capangas nascem com o Ataque que o chefe tinha ANTES de subir de fase (playerAttack em game.ts).
    const minions = summonBossMinions({ ...(enemy as Enemy), ataque: enemy.ataque + index - 1 }, n)
    const first = minions[0]
    const notes = [`+1 de Ataque (${attack}).`, `Convoca ${minions.length} capanga${minions.length > 1 ? 's' : ''} (${first.hp} de vida, ataque ${first.ataque}).`, 'A cada 5 turnos recupera 8% da vida.']
    return { n, title: `Fase ${n}`, entersAt: Math.round((1 - index / total) * 100), attack, notes }
  })
}

export const BOSS_TURN_RULES = ['A cada 4 turnos convoca reforços.'] as const

export interface BossWeakness {
  element: Element
  /** Elementos que o chefe sofre a mais (+35% de dano). */
  weakTo: Element[]
  /** Elementos que ele resiste (−25% de dano). */
  resists: Element[]
}

/** Elemento do chefe e o que o fere ou o resiste (chefe sem elemento definido usa Sombra, como o combate). */
export function bossWeakness(enemy: Pick<Enemy, 'elemento' | 'boss'>): BossWeakness {
  const element: Element = enemy.elemento ?? (enemy.boss ? 'sombra' : 'fisico')
  const table = ELEMENT_ADVANTAGES[element]
  const resists = new Set<Element>(table.strongAgainst)
  if (element !== 'fisico') resists.add(element)
  return { element, weakTo: [...table.weakAgainst], resists: [...resists] }
}

/** O que a arma que o herói está usando faz contra este chefe. */
export function weaponMatchup(weapon: Element, boss: BossWeakness): 'fraqueza' | 'resistencia' | 'neutro' {
  if (weapon === 'fisico') return 'neutro'
  if (boss.weakTo.includes(weapon)) return 'fraqueza'
  if (boss.resists.includes(weapon)) return 'resistencia'
  return 'neutro'
}

export type LevelFit = 'below' | 'within' | 'above'

export interface LevelAdvice {
  fit: LevelFit
  label: string
  range: string
}

/** Compara o nível do herói com a faixa recomendada da sub-região do chefe. */
export function levelAdvice(heroLevel: number, sub?: { nivelMin: number; nivelMax: number }): LevelAdvice | undefined {
  if (!sub) return undefined
  const range = sub.nivelMin === sub.nivelMax ? `${sub.nivelMin}` : `${sub.nivelMin}–${sub.nivelMax}`
  if (heroLevel < sub.nivelMin) return { fit: 'below', label: 'Abaixo do recomendado', range }
  if (heroLevel > sub.nivelMax) return { fit: 'above', label: 'Acima do recomendado', range }
  return { fit: 'within', label: 'Dentro do recomendado', range }
}

export interface BossPreparation {
  healingPotions: number
  otherConsumables: number
  blessings: number
  hpPercent: number
}

type PrepState = { inventory: Record<string, number>; protectionBlessings?: number; hp: number }

/** Resumo do que o jogador leva para a luta: poções de cura, outros consumíveis, bênçãos e vida atual. */
export function bossPreparation(state: PrepState, maxHp: number): BossPreparation {
  let healing = 0
  let other = 0
  for (const [id, qty] of Object.entries(state.inventory)) {
    if (!(qty > 0)) continue
    const item = CONSUMABLES.find((c) => c.id === id)
    if (!item) continue
    if (item.tipo === 'cura') healing += qty
    else other += qty
  }
  return {
    healingPotions: healing,
    otherConsumables: other,
    blessings: state.protectionBlessings ?? 0,
    hpPercent: maxHp > 0 ? Math.round((state.hp / maxHp) * 100) : 0,
  }
}
