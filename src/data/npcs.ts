import type { Screen } from '../types'

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
    id: 'mira_bellwether',
    nome: 'Mira Bellwether',
    titulo: 'Mercadora de Estrada',
    regionId: 'campos_dourados',
    x: 10,
    y: 7,
    facing: 'left',
    sprite: 'assets/npcs/sprites/mira-bellwether-sprite.png',
    portrait: 'assets/npcs/mira-bellwether.webp',
    services: ['shop'],
    screen: 'shop',
    dialogue: [
      'Moedas pesam menos quando viram equipamento bom.',
      'Compro o que sobrou da viagem e vendo o que talvez salve a próxima.',
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
]

export function npcsForRegion(regionId: string) {
  return NPCS.filter(npc => npc.regionId === regionId)
}
