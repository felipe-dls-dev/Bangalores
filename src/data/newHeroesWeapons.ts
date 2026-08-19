import type { Equipment } from '../types'

// Armas de assinatura das três novas classes (Monge, Sacerdotisa, Conjurador). Cada classe
// mantém arma exclusiva mesmo quando compartilha armadura com outra classe — ver
// sharedEquipment.ts para os conjuntos compartilhados de peitoral/capacete/calças/botas.
// O tier 1 de cada arma é o item base; os outros 7 tiers da progressão estão logo abaixo,
// gerados a partir do mesmo tema.
export const NEW_HEROES_WEAPONS_TIER1: Equipment[] = [
 {
  id: 'manoplas_brasa', nome: 'Manoplas da Brasa Viva', slot: 'mao_direita', preco: 15, ataque: 1, vida: 0, defesa: 0,
  habilidade: 'Nós de guerra aquecidos por chi ardente; cada golpe crepita como brasa.',
  imagem: 'assets/art/equipment/manoplas_brasa.webp', arte: 'assets/art/hd/equipment/manoplas-brasa-hd.webp',
  raridade: 'comum', classeExclusiva: 'monge', tipoEquipamento: 'manopla', nivelMinimo: 1
 },
 {
  id: 'cetro_alvorada', nome: 'Cetro da Alvorada', slot: 'mao_direita', preco: 16, ataque: 1, vida: 0, defesa: 0,
  habilidade: 'Cetro rúnico que canaliza luz de Khar-Dur; ilumina o campo de batalha.',
  imagem: 'assets/art/equipment/cetro_alvorada.webp', arte: 'assets/art/hd/equipment/cetro-alvorada-hd.webp',
  raridade: 'comum', classeExclusiva: 'sacerdotisa', tipoEquipamento: 'cetro_sagrado', nivelMinimo: 1
 },
 {
  id: 'totem_eco', nome: 'Totem do Eco Arcano', slot: 'mao_direita', preco: 15, ataque: 1, vida: 0, defesa: 0,
  habilidade: 'Totem esculpido em osso negro; guarda o vínculo com criaturas conjuradas.',
  imagem: 'assets/art/equipment/totem_eco.webp', arte: 'assets/art/hd/equipment/totem-eco-hd.webp',
  raridade: 'comum', classeExclusiva: 'conjurador', tipoEquipamento: 'totem_invocacao', nivelMinimo: 1
 }
]

interface WeaponLine { classe: string; tipo: string; label: string; themes: string[]; ability: (theme: string) => string }
const LINES: WeaponLine[] = [
 {
  classe: 'monge', tipo: 'manopla', label: 'Manoplas',
  themes: ['do Punho Incandescente', 'da Fúria Vulcânica', 'do Dragão de Ignaris', 'da Chama Eterna', 'do Punho Sagrado', 'do Monge Ascendido', 'do Avatar de Ignaris'],
  ability: theme => `Fúria ${theme}: golpes marciais intensificados por chi ardente.`
 },
 {
  classe: 'sacerdotisa', tipo: 'cetro_sagrado', label: 'Cetro',
  themes: ['da Luz Guardiã', 'dos Anciões de Khar-Dur', 'da Fé Inabalável', 'do Amanhecer Eterno', 'da Comunhão Divina', 'da Alta Sacerdotisa', 'da Luz Suprema'],
  ability: theme => `Luz ${theme}: canaliza o poder sagrado de Khar-Dur.`
 },
 {
  classe: 'conjurador', tipo: 'totem_invocacao', label: 'Totem',
  themes: ['dos Espíritos Ligados', 'da Fera Selada', 'do Pacto Sombrio', 'do Eclipse Negro', 'dos Mil Ecos', 'do Grande Conjurador', 'do Sol Negro Absoluto'],
  ability: theme => `Eco ${theme}: fortalece o vínculo com a fera invocada.`
 }
]

// Tiers 2-8 de cada arma (o tier 1 já existe acima). Nível mínimo, raridade e preço final de
// cada tier são recalculados automaticamente por balanceEquipment (game.ts) a partir do poder
// relativo dentro do mesmo grupo classe+slot.
const weaponTiers = (line: WeaponLine): Equipment[] => line.themes.map((theme, index) => {
 const i = index + 1, id = `${line.classe}_arma_t${i}`
 return {
  id, nome: `${line.label} ${theme}`, slot: 'mao_direita', preco: 15 + i * 4, ataque: 1 + i, vida: 0, defesa: 0,
  habilidade: line.ability(theme),
  imagem: `assets/art/hd/hero-weapons/${id}.webp`, arte: `assets/art/hd/hero-weapons/${id}.webp`,
  classeExclusiva: line.classe, tipoEquipamento: line.tipo
 } as Equipment
})

export const NEW_HEROES_WEAPONS: Equipment[] = [...NEW_HEROES_WEAPONS_TIER1, ...LINES.flatMap(weaponTiers)]
