import type { Equipment, Rarity, Slot } from '../types'
import { CURATED_FORGE_RECIPES, type ForgeEffect, type ForgeRecipe } from './expansion'

export const FORGE_CATEGORY_ORDER = ['mao_direita', 'capacete', 'peitoral', 'calcas', 'botas', 'mao_esquerda', 'acessorio'] as const
export type ForgeCategory = typeof FORGE_CATEGORY_ORDER[number]
export const FORGE_CATEGORY_LABELS: Record<ForgeCategory, string> = {
 mao_direita: 'Armas',
 capacete: 'Elmos',
 peitoral: 'Peitorais',
 calcas: 'Calças',
 botas: 'Botas',
 mao_esquerda: 'Escudos e Fetiches',
 acessorio: 'Acessórios'
}
export function forgeCategory(slot: Slot): ForgeCategory {
 return slot === 'amuleto' || slot === 'anel_1' || slot === 'anel_2' ? 'acessorio' : slot as ForgeCategory
}

const RARITY_TIER: Record<Rarity, number> = { comum: 0, incomum: 1, raro: 2, epico: 3, lendario: 4, mitico: 5, heroico: 6 }
const RARITY_LABEL: Record<Rarity, string> = { comum: 'Comum', incomum: 'Incomum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário', mitico: 'Mítico', heroico: 'Heroico' }

function gemForItem(item: Equipment): string {
 const atkScore = item.ataque * 2, defScore = item.defesa * 2, lifeScore = item.vida
 if (atkScore > 0 && atkScore >= defScore && atkScore >= lifeScore) return 'rubi_forja'
 if (defScore > 0 && defScore >= lifeScore) return 'safira_guardia'
 if (lifeScore > 0) return 'esmeralda_vital'
 return 'ametista_arcana'
}
function effectForSlot(slot: Slot): ForgeEffect {
 if (slot === 'mao_direita') return 'critico'
 if (slot === 'capacete' || slot === 'peitoral' || slot === 'calcas' || slot === 'botas') return 'defesa_perfeita'
 return 'sorte'
}
function effectTextFor(effect: ForgeEffect): string {
 if (effect === 'critico') return '+10% de chance de elevar ataques fortes a críticos'
 if (effect === 'defesa_perfeita') return '+10% de chance de transformar defesa forte em perfeita'
 return '+10% de chance de espólio e melhoria da qualidade'
}

function buildRecipeFor(item: Equipment): ForgeRecipe {
 const tier = RARITY_TIER[item.raridade ?? 'comum']
 const materials: Record<string, number> = { fragmento_fisico: 3 + tier * 2 }
 if (tier >= 2) materials.essencia_magica = tier * 2
 if (tier >= 3) materials[gemForItem(item)] = tier >= 5 ? 2 : 1
 const effect = tier >= 4 ? effectForSlot(item.slot) : undefined
 return {
  id: `receita_${item.id}`,
  nome: item.nome,
  equipmentId: item.id,
  raridade: RARITY_LABEL[item.raridade ?? 'comum'],
  materials,
  effect,
  effectText: effect ? effectTextFor(effect) : undefined
 }
}

export function buildForgeRecipes(equipment: Equipment[]): ForgeRecipe[] {
 const curatedIds = new Set(CURATED_FORGE_RECIPES.map(r => r.equipmentId))
 const generated = equipment.filter(e => e.slot !== 'bolsa' && !curatedIds.has(e.id)).map(buildRecipeFor)
 const byId = new Map(equipment.map(e => [e.id, e]))
 return [...CURATED_FORGE_RECIPES, ...generated].sort((a, b) => {
  const ea = byId.get(a.equipmentId), eb = byId.get(b.equipmentId)
  const ta = RARITY_TIER[ea?.raridade ?? 'comum'], tb = RARITY_TIER[eb?.raridade ?? 'comum']
  return ta - tb || (ea?.preco ?? 0) - (eb?.preco ?? 0) || a.nome.localeCompare(b.nome, 'pt-BR')
 })
}
