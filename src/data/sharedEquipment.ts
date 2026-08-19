import type { Equipment } from '../types'

// Conjuntos exclusivos compartilhados entre duas ou três classes aparentadas — em vez de
// duplicar arte/conteúdo para cada classe nova, o mesmo item serve para o grupo inteiro,
// com uma variação sutil de atributos por classe (statsByClass) para manter identidade mesmo
// em peças compartilhadas. A arma (mão direita) continua exclusiva de cada classe — ver
// newHeroesWeapons.ts — só a armadura é compartilhada.
// Cada linha aqui é o primeiro tier (nível 1) de um conjunto de progressão; os tiers
// seguintes podem ser adicionados depois seguindo o mesmo padrão de armorSets.ts.
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
