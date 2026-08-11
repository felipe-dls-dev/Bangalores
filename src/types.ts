export type Slot = 'amuleto'|'capacete'|'anel_1'|'peitoral'|'anel_2'|'calcas'|'mao_esquerda'|'mao_direita'|'botas'
export type Screen = 'menu'|'select'|'map'|'region'|'event'|'character'|'inventory'|'equipment'|'shop'|'gallery'|'combat'|'bossIntro'|'loot'|'cardCreator'
export type Rarity = 'comum'|'incomum'|'raro'|'epico'|'lendario'|'mitico'|'heroico'
export interface Hero { id:string; nome:string; vida:number; ataque:number; habilidade:string; imagem:string; arte?:string; raridade?:Rarity }
export interface Equipment { id:string; nome:string; slot:Slot; preco:number; ataque:number; vida:number; defesa:number; habilidade:string; imagem:string; arte?:string; raridade?:Rarity; classeExclusiva?:'guerreiro'|'guardiao'|'cacadora'|'arcanista'; tipoEquipamento?:string; nivelMinimo?:number }
export interface Consumable { id:string; nome:string; tipo:string; valor:number; preco:number; descricao:string; imagem:string; arte?:string; raridade?:Rarity }
export interface GameEvent { id:string; nome:string; tipo:string; valor:number; descricao:string; imagem:string; arte?:string }
export interface Enemy { id:string; nome:string; ataque:number; vida:number; ouro:number; dificuldade:number; habilidade:string; imagem:string; arte?:string; raridade?:Rarity; elite?:boolean; boss?:boolean; fase?:number; maxFases?:number; nivel?:number; variante?:string }
export interface Territory { id:string; nome:string; x:number; y:number; dificuldade:number; nivelMin:number; nivelMax:number; descricao:string }
export interface SubregionEnemy { nome:string; ataque:number; vida:number; ouro:number; habilidade:string; arte:string }
export interface SubregionBoss { nome:string; ataque:number; vida:number; ouro:number; habilidade:string; arte:string; maxFases:number; raridade:Rarity }
export interface Subregion { id:string; regionId:string; nome:string; descricao:string; nivelMin:number; nivelMax:number; encontrosNecessarios:number; icone:string; temaLoot:string; desafios:string[]; inimigos:SubregionEnemy[]; chefe:SubregionBoss }
export interface CustomCard { id:string; nome:string; kind:string; raridade:Rarity; ataque:number; defesa:number; vida:number; habilidade:string; imagem:string; zoom:number; panX:number; panY:number; criadoEm:number }
