import type { Equipment } from '../types'

// Armas de assinatura das três novas classes (Monge, Sacerdotisa, Conjurador). Cada classe
// mantém arma exclusiva mesmo quando compartilha armadura com outra classe — ver
// sharedEquipment.ts para os conjuntos compartilhados de peitoral/capacete/calças/botas.
export const NEW_HEROES_WEAPONS: Equipment[] = [
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
