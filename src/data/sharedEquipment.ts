import type { Equipment, Rarity, Slot } from '../types'

// Conjuntos exclusivos compartilhados entre duas ou três classes aparentadas — em vez de
// duplicar arte/conteúdo para cada classe nova, o mesmo item serve para o grupo inteiro,
// com uma variação sutil de atributos por classe (statsByClass) para manter identidade mesmo
// em peças compartilhadas. A arma (mão direita) continua exclusiva de cada classe — ver
// newHeroesWeapons.ts — só a armadura é compartilhada.
// Cada linha aqui é o tier 1 (o item base) de uma progressão de 8 tiers — os outros 7 tiers,
// mais os slots de capacete/calças/botas, estão gerados logo abaixo a partir do mesmo tema.
export const SHARED_EQUIPMENT: Equipment[] = [
 {
  id: 'manto_ordem_vida', nome: 'Manto da Ordem da Vida', slot: 'peitoral', preco: 18, ataque: 0, vida: 2, defesa: 1,
  habilidade: 'Tecido bento que protege quem cuida dos outros. A Sacerdotisa e a Druida moldam sua proteção de formas diferentes.',
  imagem: 'assets/art/equipment/manto_ordem_vida.webp', arte: 'assets/art/hd/equipment/manto-ordem-vida-hd.webp',
  raridade: 'incomum', classeExclusiva: ['sacerdotisa', 'druida'], tipoEquipamento: 'veste_vital', nivelMinimo: 1,
  statsByClass: { sacerdotisa: { vida: 1 }, druida: { defesa: 1 } }
 },
 {
  id: 'veste_circulo_arcano', nome: 'Veste do Círculo Arcano', slot: 'peitoral', preco: 20, ataque: 0, vida: 1, defesa: 1,
  habilidade: 'Robe tecido com fios do Sol Negro. O Arcanista amplifica seu próprio poder; o Conjurador reparte a energia com o que invoca.',
  imagem: 'assets/art/equipment/veste_circulo_arcano.webp', arte: 'assets/art/hd/equipment/veste-circulo-arcano-hd.webp',
  raridade: 'incomum', classeExclusiva: ['arcanista', 'conjurador'], tipoEquipamento: 'veste_arcana', nivelMinimo: 1,
  statsByClass: { arcanista: { ataque: 1 }, conjurador: { vida: 1 } }
 },
 {
  id: 'traje_andarilhos', nome: 'Traje dos Andarilhos', slot: 'peitoral', preco: 18, ataque: 0, vida: 1, defesa: 1,
  habilidade: 'Roupas leves feitas para quem depende de agilidade, não de couraça. Cada um dos três a ajusta ao próprio estilo de luta.',
  imagem: 'assets/art/equipment/traje_andarilhos.webp', arte: 'assets/art/hd/equipment/traje-andarilhos-hd.webp',
  raridade: 'incomum', classeExclusiva: ['monge', 'cacadora', 'cacador'], tipoEquipamento: 'traje_leve', nivelMinimo: 1,
  statsByClass: { monge: { ataque: 1 }, cacadora: { vida: 1 }, cacador: { defesa: 1 } }
 }
]

interface SharedGroup {
 id: string; classes: string[]; tipo: string
 slotLabel: Partial<Record<Slot, string>>
 // 8 nomes temáticos, um por tier — o índice 0 só nomeia capacete/calças/botas do tier 1
 // (o peitoral do tier 1 já existe acima, com nome próprio).
 themes: string[]
 ability: (theme: string) => string
 statsByClass: (bonus: number) => Record<string, { ataque?: number; vida?: number; defesa?: number }>
}

const GROUPS: SharedGroup[] = [
 {
  id: 'ordem_vida', classes: ['sacerdotisa', 'druida'], tipo: 'veste_vital',
  slotLabel: { capacete: 'Véu', peitoral: 'Manto', calcas: 'Saia', botas: 'Sandálias' },
  themes: ['Ordem da Vida', 'Amanhecer Bento', 'Comunhão Sagrada', 'Véu da Piedade', 'Luz Radiante de Khar-Dur', 'Bênção Ancestral', 'Coração Eterno', 'Vida Suprema'],
  ability: theme => `Bênção de ${theme}: protege quem cuida dos outros, moldada de forma diferente pela Sacerdotisa e pela Druida.`,
  statsByClass: bonus => ({ sacerdotisa: { vida: bonus }, druida: { defesa: bonus } })
 },
 {
  id: 'circulo_arcano', classes: ['arcanista', 'conjurador'], tipo: 'veste_arcana',
  slotLabel: { capacete: 'Capuz', peitoral: 'Veste', calcas: 'Calças', botas: 'Botas' },
  themes: ['Círculo Arcano', 'Véu do Sol Negro', 'Sigilo dos Conjuradores', 'Eclipse Absoluto', 'Estrelas Mortas', 'Vazio Arcano', 'Regência do Sol Negro', 'Última Sombra'],
  ability: theme => `Poder de ${theme}: canaliza a energia do Sol Negro, amplificada de forma diferente pela Arcanista e pelo Conjurador.`,
  statsByClass: bonus => ({ arcanista: { ataque: bonus }, conjurador: { vida: bonus } })
 },
 {
  id: 'andarilhos', classes: ['monge', 'cacadora', 'cacador'], tipo: 'traje_leve',
  slotLabel: { capacete: 'Capuz', peitoral: 'Traje', calcas: 'Calças', botas: 'Botas' },
  themes: ['Andarilhos', 'Trilha dos Ventos', 'Passo Silencioso', 'Caminho dos Foragidos', 'Sombra Errante', 'Última Trilha', 'Andarilho Lendário', 'Peregrino Eterno'],
  ability: theme => `Preparo de ${theme}: favorece agilidade e reflexos, ajustado ao estilo do Monge, da Caçadora e do Caçador.`,
  statsByClass: bonus => ({ monge: { ataque: bonus }, cacadora: { vida: bonus }, cacador: { defesa: bonus } })
 }
]

const ART_FOLDER: Record<string, string> = { capacete: 'shared-headgear', peitoral: 'shared-armor', calcas: 'shared-legwear', botas: 'shared-boots' }
// A linha da Ordem da Vida ainda não possui todas as artes dedicadas no pacote visual.
// Mantemos um fallback de calças já existente para evitar imagens quebradas enquanto os
// tiers específicos são produzidos; isso também corrige imediatamente a Saia de Amanhecer Bento.
const sharedArtPath = (group: SharedGroup, slot: Slot, id: string) =>
  group.id === 'ordem_vida'
    ? slot === 'calcas'
      ? 'assets/art/hd/equipment-extra/calcas_nevoa-hd.webp'
      : slot === 'peitoral'
        ? 'assets/art/hd/equipment/manto-ordem-vida-hd.webp'
        : `assets/art/hd/shared-${slot === 'capacete' ? 'headgear' : 'boots'}/andarilhos_${slot === 'capacete' ? 'capacete' : 'botas'}_t1.webp`
    : `assets/art/hd/${ART_FOLDER[slot]}/${id}.webp`
// Vida/defesa por slot e índice de tier (0-7), no mesmo padrão de newClassEquipment.ts.
const slotStats = (slot: Slot, i: number) => {
 const high = Math.floor(i / 2)
 if (slot === 'peitoral') return { vida: 3 + high, defesa: 1 + i }
 if (slot === 'capacete') return { vida: 1 + Math.floor(i / 3), defesa: 1 + i }
 if (slot === 'calcas') return { vida: 1 + Math.floor(i / 4), defesa: i }
 return { vida: Math.floor(i / 4), defesa: i }
}
const armorLine = (group: SharedGroup, slot: Slot, tiers: number[]): Equipment[] => tiers.map(i => {
 const stat = slotStats(slot, i), bonus = 1 + Math.floor(i / 4), label = group.slotLabel[slot]!, theme = group.themes[i]
 const id = `${group.id}_${slot}_t${i}`
 return {
  id, nome: `${label} de ${theme}`, slot, preco: 14 + i * 3, ataque: 0, vida: stat.vida, defesa: stat.defesa,
  habilidade: group.ability(theme),
  imagem: sharedArtPath(group, slot, id), arte: sharedArtPath(group, slot, id),
  classeExclusiva: group.classes, tipoEquipamento: group.tipo,
  statsByClass: group.statsByClass(bonus)
 } as Equipment
})

// 7 tiers novos de peitoral (o tier 1 já existe em SHARED_EQUIPMENT acima) + 8 tiers completos
// de capacete/calças/botas por grupo — 93 peças no total. Mão esquerda ficou de fora de
// propósito: Druida e Caçador já têm linha própria de pergaminho/aljava exclusiva
// (newClassEquipment.ts), e a Caçadora costuma lutar com facas, que bloqueiam esse slot.
// Nível mínimo, raridade e preço final de cada peça são recalculados automaticamente por
// balanceEquipment (game.ts) a partir do poder relativo dentro do mesmo grupo classe+slot —
// por isso não são definidos aqui, só a progressão relativa de atributos entre os tiers.
export const SHARED_CLASS_PROGRESSION: Equipment[] = GROUPS.flatMap(group => [
 ...armorLine(group, 'capacete', [0, 1, 2, 3, 4, 5, 6, 7]),
 ...armorLine(group, 'peitoral', [1, 2, 3, 4, 5, 6, 7]),
 ...armorLine(group, 'calcas', [0, 1, 2, 3, 4, 5, 6, 7]),
 ...armorLine(group, 'botas', [0, 1, 2, 3, 4, 5, 6, 7])
])
