import type { Equipment, Rarity, Slot } from '../types'
import { CURATED_FORGE_RECIPES, type ForgeRecipe } from './expansion'

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

// Itens comuns não têm encaixe de pedra (equipmentSocketCount retorna 0 para raridade comum
// em store/game.ts), então a escolha de atributo só fica disponível a partir de incomum.
function buildRecipeFor(item: Equipment): ForgeRecipe {
 const tier = RARITY_TIER[item.raridade ?? 'comum']
 const materials: Record<string, number> = { fragmento_fisico: 3 + tier * 2 }
 if (tier >= 2) materials.essencia_magica = tier * 2
 return {
  id: `receita_${item.id}`,
  nome: item.nome,
  equipmentId: item.id,
  raridade: RARITY_LABEL[item.raridade ?? 'comum'],
  materials,
  attributeChoice: tier >= 1
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
