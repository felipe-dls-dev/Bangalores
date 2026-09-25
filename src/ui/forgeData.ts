// Dados do catálogo de receitas da Forja no modo Moderno: quais receitas existem para o herói, quais ele
// consegue criar agora e o filtro da lista. As regras de "consegue criar" espelham craftEquipment (store/game.ts)
// para a fabricação sem bônus, e o teste forgeData.test.ts as confere contra a ação de verdade.

import { FORGE_CATEGORY_ORDER, forgeCategory, type ForgeCategory } from '../data/forgeRecipes'
import {
  EQUIPMENT,
  FORGE_RECIPES,
  FORGE_SACRIFICE,
  deriveLevel,
  equipmentBagCapacity,
  equipmentClassAllowed,
  equipmentRequiredLevel,
  forgeLevelInfo,
  forgeRecipeLevel,
  forgeSacrificeOwned,
  useGame,
} from '../store/game'
import type { Equipment } from '../types'

type State = ReturnType<typeof useGame.getState>

export interface RecipeEntry {
  recipe: (typeof FORGE_RECIPES)[number]
  item: Equipment
}

export type ForgeCategoryFilter = 'all' | ForgeCategory

/** Receitas que o herói pode usar (as de outra classe nem aparecem), na ordem do catálogo. */
export function recipeEntries(heroId?: string): RecipeEntry[] {
  const entries: RecipeEntry[] = []
  for (const recipe of FORGE_RECIPES) {
    const item = EQUIPMENT.find((e) => e.id === recipe.equipmentId)
    if (item && equipmentClassAllowed(item, heroId)) entries.push({ recipe, item })
  }
  return entries
}

export type ReadinessStatus = 'ready' | 'missing' | 'sacrifice' | 'locked' | 'bag'

export interface RecipeReadiness {
  canCraft: boolean
  status: ReadinessStatus
  /** Texto curto para a etiqueta da lista. */
  label: string
  /** Quantos materiais faltam (0 se nenhum). */
  missing: number
}

/** A receita pode ser fabricada agora (sem escolher bônus)? Espelha o portão de craftEquipment. */
export function recipeReadiness({ recipe, item }: RecipeEntry, s: State): RecipeReadiness {
  const forgeRequired = forgeRecipeLevel(recipe.id)
  const playerRequired = equipmentRequiredLevel(item)
  const masteryLocked = forgeLevelInfo(s.forgeXp ?? 0).level < forgeRequired
  const playerLocked = deriveLevel(s.xp).lvl < playerRequired
  const missing = Object.entries(recipe.materials).filter(([id, qty]) => (s.materials[id] ?? 0) < qty).length
  const sacrifice = FORGE_SACRIFICE[item.raridade ?? 'comum']
  const needsSacrifice = Boolean(sacrifice) && forgeSacrificeOwned(s, sacrifice!.rarity) < sacrifice!.qty
  const bagFull = !sacrifice && s.equipmentBag.length >= equipmentBagCapacity(s)

  if (masteryLocked || playerLocked) {
    return { canCraft: false, status: 'locked', missing, label: playerLocked ? `Nível ${playerRequired}` : `Forjador ${forgeRequired}` }
  }
  if (missing) return { canCraft: false, status: 'missing', missing, label: `Faltam ${missing}` }
  if (needsSacrifice) return { canCraft: false, status: 'sacrifice', missing: 0, label: 'Faltam peças' }
  if (bagFull) return { canCraft: false, status: 'bag', missing: 0, label: 'Mochila cheia' }
  return { canCraft: true, status: 'ready', missing: 0, label: 'Pronta' }
}

const RANK: Record<ReadinessStatus, number> = { ready: 0, bag: 1, sacrifice: 2, missing: 3, locked: 4 }

export interface RecipeFilter {
  category: ForgeCategoryFilter
  query: string
  readyOnly: boolean
}

/** Filtra por categoria e busca e põe as prontas primeiro, depois as mais próximas de ficar prontas. */
export function filterRecipes(entries: RecipeEntry[], filter: RecipeFilter, s: State): Array<RecipeEntry & { readiness: RecipeReadiness }> {
  const query = filter.query.trim().toLowerCase()
  return entries
    .filter((e) => (filter.category === 'all' || forgeCategory(e.item.slot) === filter.category) && (!query || `${e.recipe.nome} ${e.item.nome} ${e.item.habilidade ?? ''} ${e.recipe.effectText ?? ''}`.toLowerCase().includes(query)))
    .map((e, index) => ({ ...e, readiness: recipeReadiness(e, s), index }))
    .filter((e) => !filter.readyOnly || e.readiness.canCraft)
    .sort((a, b) => RANK[a.readiness.status] - RANK[b.readiness.status] || a.readiness.missing - b.readiness.missing || a.index - b.index)
    .map(({ index: _index, ...rest }) => rest)
}

export function categoryCounts(entries: RecipeEntry[]): Record<ForgeCategory, number> {
  const counts = Object.fromEntries(FORGE_CATEGORY_ORDER.map((c) => [c, 0])) as Record<ForgeCategory, number>
  for (const e of entries) counts[forgeCategory(e.item.slot)]++
  return counts
}
