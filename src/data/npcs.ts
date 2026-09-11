import type { Screen, ShopCategory, ShopTier } from '../types'

export type NpcService = 'guild' | 'shop' | 'forge' | 'chronicle'
export type NpcFacing = 'up' | 'down' | 'left' | 'right'

export interface NpcDefinition {
  id: string
  nome: string
  titulo: string
  regionId: string
  x: number
  y: number
  facing?: NpcFacing
  sprite: string
  portrait?: string
  services: NpcService[]
  dialogue: string[]
  screen: Screen
  shopCategory?: ShopCategory
  shopTier?: ShopTier
}

export const NPCS: NpcDefinition[] = [
  {
    id: 'brenna_ashcombe',
    nome: 'Brenna Ashcombe',
    titulo: 'Mestra da Guilda',
    regionId: 'campos_dourados',
    x: 8,
    y: 7,
    facing: 'down',
    sprite: 'assets/npcs/sprites/brenna-ashcombe-sprite.png',
    portrait: 'assets/npcs/brenna-ashcombe.webp',
    services: ['guild'],
    screen: 'guild',
    dialogue: [
      'A Guilda sempre tem os olhos abertos. Volte quando precisar de trabalho.',
      'Tenho contratos para quem ainda sabe voltar inteiro.',
      'Se trouxe provas do trabalho feito, a Guilda honra a recompensa.',
    ],
  },
  {
    id: 'borin_fenrick',
    nome: 'Borin Fenrick',
    titulo: 'Ferreiro Runico',
    regionId: 'khar_dur',
    x: 11,
    y: 9,
    facing: 'down',
    sprite: 'assets/npcs/sprites/borin-fenrick-sprite.png',
    portrait: 'assets/npcs/borin-fenrick.webp',
    services: ['forge'],
    screen: 'forge',
    dialogue: [
      'Metal bom fala baixo. Metal ruim grita quando quebra.',
      'Traga material, ouro e coragem. A forja cobra os tres.',
    ],
  },
  // Planicies de Alvora (regiao inicial, nivel 1-8): trio de vendedores "simples" -- so vendem
  // equipamento comum/incomum (armas e armaduras) ou pocoes comuns. Substituem a Mira: em vez
  // de uma unica loja generica, cada um cobre uma categoria, restrita ao proprio tier.
  {
    id: 'toby_harlan',
    nome: 'Toby Harlan',
    titulo: 'Negociante de Laminas',
    regionId: 'campos_dourados',
    x: 9,
    y: 10,
    facing: 'down',
    sprite: 'assets/npcs/sprites/weapon-vendor-simples-sprite.png',
    services: ['shop'],
    screen: 'shop',
    shopCategory: 'arma',
    shopTier: 'simples',
    dialogue: [
      'Toda lamina que vendo ja provou o proprio aco antes de chegar ate voce.',
      'Nada raro por aqui -- so ferro confiavel pra quem esta comecando.',
    ],
  },
  {
    id: 'colm_aldric',
    nome: 'Colm Aldric',
    titulo: 'Couraceiro Itinerante',
    regionId: 'campos_dourados',
    x: 11,
    y: 10,
    facing: 'down',
    sprite: 'assets/npcs/sprites/armor-vendor-simples-sprite.png',
    services: ['shop'],
    screen: 'shop',
    shopCategory: 'equipamento',
    shopTier: 'simples',
    dialogue: [
      'Curo e reforco cada peca com as proprias maos. Nao e bonito, mas aguenta golpe.',
      'Comece protegido. O resto voce conquista nas estradas.',
    ],
  },
  {
    id: 'sela_hartwin',
    nome: 'Sela Hartwin',
    titulo: 'Boticaria de Estrada',
    regionId: 'campos_dourados',
    x: 10,
    y: 11,
    facing: 'down',
    sprite: 'assets/npcs/sprites/potion-vendor-simples-sprite.png',
    services: ['shop'],
    screen: 'shop',
    shopCategory: 'consumivel',
    shopTier: 'simples',
    dialogue: [
      'Aprendi a destilar antes de aprender a ler. Minhas pocoes nao falham.',
      'Cura simples, mas cura de verdade. Leve quantas precisar.',
    ],
  },
  // Pico de Ignaris (regiao vulcanica, nivel 18-36): trio "superior" -- equipamento raro e
  // pocoes incomuns/raras/epicas, condizente com o nivel de quem ja chegou tao longe.
  {
    id: 'cassian_draye',
    nome: 'Cassian Draye',
    titulo: 'Mestre de Armas Raras',
    regionId: 'pico_escarlate',
    x: 9,
    y: 13,
    facing: 'down',
    sprite: 'assets/npcs/sprites/weapon-vendor-superior-sprite.png',
    services: ['shop'],
    screen: 'shop',
    shopCategory: 'arma',
    shopTier: 'superior',
    dialogue: [
      'Cada lamina aqui ja sobreviveu ao Pico. Isso diz mais que qualquer selo de qualidade.',
      'Nao vendo pra qualquer um. Mas voce ja chegou longe o bastante.',
    ],
  },
  {
    id: 'alaric_thorne',
    nome: 'Alaric Thorne',
    titulo: 'Mestre Couraceiro',
    regionId: 'pico_escarlate',
    x: 13,
    y: 13,
    facing: 'down',
    sprite: 'assets/npcs/sprites/armor-vendor-superior-sprite.png',
    services: ['shop'],
    screen: 'shop',
    shopCategory: 'equipamento',
    shopTier: 'superior',
    dialogue: [
      'Forjo cada peca perto da lava. O calor separa o aco fraco do forte.',
      'Isso aqui nao e pra iniciante. E pra quem pretende voltar vivo do proximo chefe.',
    ],
  },
  {
    id: 'ophira_vane',
    nome: 'Ophira Vane',
    titulo: 'Alquimista de Ignaris',
    regionId: 'pico_escarlate',
    x: 11,
    y: 14,
    facing: 'down',
    sprite: 'assets/npcs/sprites/potion-vendor-superior-sprite.png',
    services: ['shop'],
    screen: 'shop',
    shopCategory: 'consumivel',
    shopTier: 'superior',
    dialogue: [
      'Destilo com cinzas vulcanicas. O efeito e mais forte, o preco tambem.',
      'Pocoes simples nao bastam mais na sua altura. Estas sim.',
    ],
  },
]

export function npcsForRegion(regionId: string) {
  return NPCS.filter(npc => npc.regionId === regionId)
}
