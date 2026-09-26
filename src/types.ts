import type { Element } from './data/expansion'
import type { EquipmentAttributeProfile } from './data/equipmentAttributes'
export type Slot = 'amuleto'|'capacete'|'bolsa'|'anel_1'|'peitoral'|'anel_2'|'calcas'|'mao_esquerda'|'mao_direita'|'botas'
export type Screen = 'menu'|'select'|'map'|'dungeon'|'achievements'|'guild'|'chronicle'|'forge'|'region'|'event'|'character'|'inventory'|'equipment'|'shop'|'gallery'|'tutorial'|'coop'|'combat'|'bossIntro'|'loot'|'cardCreator'|'camp'
export type Rarity = 'comum'|'incomum'|'raro'|'epico'|'lendario'|'mitico'|'heroico'
export type ShopCategory = 'arma'|'equipamento'|'consumivel'
export type ShopTier = 'simples'|'superior'
export type EquipmentSetId='lua'|'cinzas'|'khar'|'eclipse'
export type EquipmentActiveEffectType='attack'|'shield'|'heal'|'cleanse'|'reroll'|'execute'|'element'
export interface EquipmentActiveEffect { type:EquipmentActiveEffectType; value:number; uses?:number; element?:Element; description:string }
export interface Hero { id:string; nome:string; vida:number; ataque:number; defesa?:number; habilidade:string; imagem:string; arte?:string; raridade?:Rarity }
// classeExclusiva aceita uma classe só (uso tradicional) ou uma lista de classes — usado pelos
// conjuntos compartilhados entre duas ou três classes aparentadas (ex: Sacerdotisa+Druida).
// statsByClass permite uma variação sutil de atributos por classe no MESMO item compartilhado
// (ex: a Sacerdotisa ganha +1 vida, a Druida ganha +1 defesa no mesmo manto).
// `ataque`/`defesa`/`vida` são o ORÇAMENTO da peça: data/equipmentAttributes.ts os converte em Força ou Magia (a escola
// da peça de classe; nas universais, o ataque de quem veste), Vigor, Destreza, Armadura, Vida, Energia e Esquiva conforme
// o estilo e a raridade (`perfilAtributos`, montado junto com o catálogo). Campos explícitos opcionais (Força, Magia,
// Vigor, Destreza, Vida Máxima, Energia, Armadura, Esquiva em pontos percentuais, resistências) somam por cima da conversão.
export interface Equipment { id:string; nome:string; slot:Slot; preco:number; ataque:number; vida:number; defesa:number; forca?:number; magia?:number; vigor?:number; destreza?:number; vidaMaxima?:number; energia?:number; armadura?:number; esquiva?:number; resistencias?:Partial<Record<Element,number>>; perfilAtributos?:EquipmentAttributeProfile; habilidade:string; imagem:string; arte?:string; raridade?:Rarity; classeExclusiva?:string|string[]; statsByClass?:Record<string,{ataque?:number;vida?:number;defesa?:number}>; tipoEquipamento?:string; nivelMinimo?:number; capacidade?:number; setId?:EquipmentSetId; activeEffect?:EquipmentActiveEffect }
export interface Consumable { id:string; nome:string; tipo:string; valor:number; preco:number; descricao:string; imagem:string; arte?:string; raridade?:Rarity }
export interface GameEvent { id:string; nome:string; tipo:string; valor:number; descricao:string; imagem:string; arte?:string }
export interface Enemy { id:string; nome:string; ataque:number; defesa?:number; vida:number; ouro:number; dificuldade:number; habilidade:string; imagem:string; arte?:string; raridade?:Rarity; elite?:boolean; boss?:boolean; fase?:number; maxFases?:number; nivel?:number; variante?:string; revenge?:boolean; dungeon?:boolean; elemento?:Element; fraqueza?:string; xpReward?:number }
export interface Territory { id:string; nome:string; x:number; y:number; dificuldade:number; nivelMin:number; nivelMax:number; descricao:string; mundo?:string }
export interface SubregionEnemy { nome:string; ataque:number; vida:number; ouro:number; habilidade:string; arte:string }
export interface SubregionBoss { nome:string; ataque:number; vida:number; ouro:number; habilidade:string; arte:string; maxFases:number; raridade:Rarity }
export interface Subregion { id:string; regionId:string; nome:string; descricao:string; nivelMin:number; nivelMax:number; encontrosNecessarios:number; icone:string; temaLoot:string; desafios:string[]; inimigos:SubregionEnemy[]; chefe:SubregionBoss }
export interface CustomCard { id:string; nome:string; kind:string; raridade:Rarity; ataque:number; defesa:number; vida:number; habilidade:string; imagem:string; zoom:number; panX:number; panY:number; criadoEm:number }
