import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import heroes from '../data/herois.json'
import equipments from '../data/equipamentos.json'
import consumables from '../data/itens.json'
import monsters from '../data/monstros.json'
import territories from '../data/territorios.json'
import territoriosSteelmere from '../data/territoriosSteelmere.json'
import subregions from '../data/subregioes.json'
import events from '../data/eventos.json'
import { EXTRA_EQUIPMENT, EXTRA_EVENTS, EXTRA_SUBREGION_ENEMIES } from '../data/extraContent'
import { CLASS_OFFHANDS } from '../data/offhands'
import { CLASS_HEADGEAR } from '../data/headgear'
import { CLASS_ARMOR } from '../data/armorSets'
import { CLASS_LEGWEAR } from '../data/legwear'
import { CLASS_BOOTS } from '../data/boots'
import { BACKPACKS } from '../data/backpacks'
import { NEW_CLASS_EQUIPMENT } from '../data/newClassEquipment'
import { EXPANDED_SUBREGIONS } from '../data/expandedSubregions'
import { STEELMERE_SUBREGIONS } from '../data/subregioesSteelmere'
import monsterArt from '../data/monsterArt.json'
import eventArt from '../data/eventArt.json'
import bossArt from '../data/bossArt.json'
import { DIFFICULTIES, FORGE_GEMS, FORGE_RECIPES, REGION_MATERIALS, STORY_CHAPTERS, TALENTS, type DifficultyMode, type ForgeEffect } from '../data/expansion'
import type { Hero, Equipment, Consumable, Enemy, Territory, Subregion, Slot, Screen, Rarity, GameEvent, CustomCard } from '../types'

const HD_ART:Record<string,string> = {
  'assets/art/monsters/cabra_malgor.webp':'assets/art/hd/monsters/cabra-malgor-hd.webp',
  'assets/art/monsters/corvo_ignaroth.webp':'assets/art/hd/monsters/corvo-ignaroth-hd.webp',
  'assets/art/monsters/espectro_rainha.webp':'assets/art/hd/monsters/espectro-rainha-hd.webp',
  'assets/art/monsters/fanatico_orgulho.webp':'assets/art/hd/monsters/fanatico-orgulho-hd.webp',
  'assets/art/monsters/grumnak.webp':'assets/art/pilot/grumnak-hd-v2.webp',
  'assets/art/monsters/guardia_seiva.webp':'assets/art/hd/monsters/guardia-seiva-hd.webp',
  'assets/art/monsters/ilusionista_areias.webp':'assets/art/hd/monsters/ilusionista-areias-hd.webp',
  'assets/art/monsters/sentinela_runas.webp':'assets/art/pilot/sentinela-runas-hd-v2.webp',
  'assets/art/bosses/boss_bandoleiro.webp':'assets/art/hd/bosses/capitao-bandoleiros-hd.webp',
  'assets/art/bosses/boss_seiva.webp':'assets/art/hd/bosses/matriarca-seiva-hd.webp',
  'assets/art/bosses/boss_minotauro.webp':'assets/art/hd/bosses/rei-minotauro-hd.webp',
  'assets/art/bosses/boss_necromante.webp':'assets/art/hd/bosses/necromante-supremo-hd.webp',
  'assets/art/bosses/boss_malgor.webp':'assets/art/hd/bosses/malgor-rei-sombrio-hd.webp',
  'assets/art/bosses/boss_troll.webp':'assets/art/pilot/troll-anciao-hd-v2.webp'
}
const hdArt=(path:string)=>HD_ART[path]??path
const MONSTER_ART=monsterArt as Record<string,string>
const EVENT_ART=eventArt as Record<string,string>
const BOSS_ART=bossArt as Record<string,string>
const namedMonsterArt=(name:string,fallback:string)=>MONSTER_ART[name]??fallback
const hdCollectionArt=(path:string|undefined,collection:string)=>{
  if(!path)return path
  const filename=path.split('/').pop()
  const stem=filename?.replace(/\.[^.]+$/,'')
  return stem?`assets/art/hd/${collection}/${stem}-hd.webp`:path
}

const EQUIPMENT_HD_OVERRIDES:Record<string,string> = {
  lamina_sentinela:'assets/art/hd/equipment/lamina-ultimo-sentinela-hd-v2.webp',
  machado_cinzento:'assets/art/hd/equipment/machado-montanhas-cinzentas-hd-v2.webp'
}

export const HEROES = heroes as Hero[]
const RAW_EQUIPMENT = [...(equipments as Equipment[]).map(equipment=>({
  ...equipment,
  arte:EQUIPMENT_HD_OVERRIDES[equipment.id]??hdCollectionArt(equipment.arte,'equipment')
})),...EXTRA_EQUIPMENT,...CLASS_OFFHANDS,...CLASS_HEADGEAR,...CLASS_ARMOR,...CLASS_LEGWEAR,...CLASS_BOOTS,...NEW_CLASS_EQUIPMENT,...BACKPACKS]
// Economia da loja: mantém o balanceamento-base anterior (1,6×) e aplica
// o novo encarecimento global de 10× a equipamentos e consumíveis.
const ITEM_PRICE_MULTIPLIER=16
const LIFE_CHANCE:Record<string,number>={essencia_vital:.35,elixir_fenix:.5}
export const CONSUMABLES = [...(consumables as Consumable[]).map(consumable=>({...consumable,preco:Math.ceil(consumable.preco*ITEM_PRICE_MULTIPLIER),descricao:consumable.tipo==='vida_max'?`${Math.round((LIFE_CHANCE[consumable.id]??.35)*100)}% de chance de aumentar permanentemente a vida máxima em ${consumable.valor}.${consumable.id==='elixir_fenix'?' Recupera toda a vida em caso de sucesso.':` Cura ${consumable.valor} em caso de sucesso.`}`:consumable.descricao,arte:hdCollectionArt(consumable.arte,'consumables')})),{id:'tonico_regeneracao',nome:'Tônico da Regeneração Acelerada',tipo:'regen_boost',valor:1,preco:960,descricao:'Durante 1 hora, recupera 1 ponto de vida a cada 30 segundos fora de combate.',imagem:'assets/art/consumables/pocao_cura.webp',arte:'assets/art/hd/consumables/pocao_cura-hd.webp',raridade:'raro' as Rarity}]
const ALL_SUBREGIONS=[...(subregions as Subregion[]),...EXPANDED_SUBREGIONS,...STEELMERE_SUBREGIONS]
const SUBREGIONS_LEVEL:Record<string,number>=Object.fromEntries(ALL_SUBREGIONS.map(subregion=>[subregion.id,subregion.nivelMin]))
const extraMonsters:Enemy[]=Object.entries(EXTRA_SUBREGION_ENEMIES).flatMap(([subregionId,list])=>list.map((monster,index)=>{const arte=namedMonsterArt(monster.nome,monster.arte);return{id:`extra_${subregionId}_${index}`,nome:monster.nome,ataque:monster.ataque,vida:monster.vida,ouro:monster.ouro,dificuldade:SUBREGIONS_LEVEL[subregionId]??1,habilidade:monster.habilidade,imagem:arte,arte,raridade:'incomum'}}))
export const MONSTERS = [...(monsters as Enemy[]).map(monster=>{const fallback=monster.arte?hdArt(monster.arte):monster.imagem;const arte=namedMonsterArt(monster.nome,fallback);return{...monster,imagem:arte,arte}}),...extraMonsters]
export const TERRITORIES = [...(territories as Territory[]).map(t=>({...t,mundo:'havendown'})),...(territoriosSteelmere as Territory[]).map(t=>({...t,mundo:'steelmere'}))]
export function worldUnlocked(s:GameState,world:string){if(world==='havendown')return true;return s.storyChapterId==='epilogo_luz'||s.storyChapterId==='epilogo_sombra'}
export const SUBREGIONS = ALL_SUBREGIONS.map(subregion=>({...subregion,inimigos:[...subregion.inimigos.map(enemy=>({...enemy,arte:namedMonsterArt(enemy.nome,hdArt(enemy.arte))})),...(EXTRA_SUBREGION_ENEMIES[subregion.id]??[]).map(enemy=>({...enemy,arte:namedMonsterArt(enemy.nome,enemy.arte)}))],chefe:{...subregion.chefe,arte:BOSS_ART[subregion.chefe.nome]??hdArt(subregion.chefe.arte)}}))
const eventArtFromSource=(event:GameEvent)=>{
  const sourceNumber=Number(event.imagem.match(/\/(\d{3})_eventos_/)?.[1])
  const artNumber=sourceNumber>=196&&sourceNumber<=215?sourceNumber-195:1
  return `assets/art/events/event-${String(artNumber).padStart(2,'0')}.jpg`
}
export const EVENTS = [...(events as GameEvent[]).map(event=>({...event,arte:EVENT_ART[event.nome]??eventArtFromSource(event)})),...EXTRA_EVENTS.map(event=>({...event,arte:EVENT_ART[event.nome]??event.arte}))]

const slotOrder: Slot[] = ['amuleto','capacete','bolsa','mao_direita','peitoral','mao_esquerda','anel_1','calcas','anel_2','botas']
export const SLOT_ORDER = slotOrder

const starter: Record<string,{equipped:Partial<Record<Slot,string>>, items:Record<string,number>, gold:number}> = {
  guerreiro: { equipped:{mao_direita:'lamina_vento',mao_esquerda:'leve_estrada',peitoral:'armor_leao_valoria',bolsa:'mochila_pequena_8'}, items:{pocao_cura:1}, gold:15 },
  guardiao: { equipped:{mao_direita:'machado_bronze',mao_esquerda:'pesado_bronze',peitoral:'armor_pesada_khardur',bolsa:'mochila_pequena_8'}, items:{pocao_cura:2}, gold:10 },
  arcanista: { equipped:{mao_direita:'orbe_veu',mao_esquerda:'grimorio_lua',peitoral:'veste_estrelas',bolsa:'mochila_pequena_8'}, items:{pocao_cura:1,elixir_reflexo:1}, gold:20 },
  cacadora: { equipped:{mao_direita:'facas_predador',peitoral:'traje_raposa',bolsa:'mochila_pequena_8'}, items:{pocao_cura:1,bomba_fumaca:1}, gold:18 }
  ,druida: { equipped:{mao_direita:'druida_arma_broto_lunargenta',mao_esquerda:'druida_mao_esquerda_broto_lunargenta',peitoral:'druida_peitoral_broto_lunargenta',bolsa:'mochila_pequena_8'}, items:{pocao_cura:2}, gold:16 }
  ,cacador: { equipped:{mao_direita:'cacador_arma_vigia_das_cinzas',mao_esquerda:'cacador_mao_esquerda_vigia_das_cinzas',peitoral:'cacador_peitoral_vigia_das_cinzas',bolsa:'mochila_pequena_8'}, items:{pocao_cura:1,bomba_fumaca:1}, gold:17 }
}

// Mantidos para a Galeria e compatibilidade com saves antigos.
const bossByDifficulty: Record<number,Enemy> = {
  1:{id:'boss_bandoleiro',nome:'Capitão dos Bandoleiros',ataque:5,vida:26,ouro:16,dificuldade:1,habilidade:'Tiro Duplo a cada 3º turno',imagem:'assets/cards/ladroes/1_pipo.jpg',arte:'assets/art/hd/bosses/capitao-bandoleiros-hd.webp',raridade:'epico',boss:true,maxFases:2},
  2:{id:'boss_seiva',nome:'Matriarca da Seiva Negra',ataque:6,vida:34,ouro:22,dificuldade:2,habilidade:'Regenera 3 de vida ao mudar de fase',imagem:'assets/cards/catalogo/192_monstros_005.jpg',arte:'assets/art/hd/bosses/matriarca-seiva-hd.webp',raridade:'epico',boss:true,maxFases:2},
  3:{id:'boss_troll',nome:'Troll Ancião de Kholgard',ataque:7,vida:42,ouro:28,dificuldade:3,habilidade:'Regeneração e Pisotear',imagem:'assets/cards/catalogo/188_monstros_001.jpg',arte:'assets/art/pilot/troll-anciao-hd-v2.webp',raridade:'epico',boss:true,maxFases:2},
  4:{id:'boss_minotauro',nome:'Rei Minotauro de Ignaris',ataque:8,vida:50,ouro:34,dificuldade:4,habilidade:'Fúria abaixo de 50% da vida',imagem:'assets/cards/catalogo/193_monstros_006.jpg',arte:'assets/art/hd/bosses/rei-minotauro-hd.webp',raridade:'lendario',boss:true,maxFases:2},
  5:{id:'boss_necromante',nome:'Necromante Supremo',ataque:9,vida:58,ouro:42,dificuldade:5,habilidade:'Dreno de vida',imagem:'assets/cards/catalogo/195_monstros_008.jpg',arte:'assets/art/hd/bosses/necromante-supremo-hd.webp',raridade:'lendario',boss:true,maxFases:2},
  6:{id:'boss_malgor',nome:'Malgor, o Rei Sombrio',ataque:10,vida:72,ouro:60,dificuldade:6,habilidade:'Três fases e ataque crescente',imagem:'assets/cards/equipamentos/coracao_malgor.jpg',arte:'assets/art/hd/bosses/malgor-rei-sombrio-hd.webp',raridade:'mitico',boss:true,maxFases:3}
}
export const BOSSES = Object.fromEntries(Object.entries(bossByDifficulty).map(([difficulty,boss])=>{const arte=BOSS_ART[boss.nome]??boss.arte;return[difficulty,{...boss,imagem:arte,arte}]})) as Record<number,Enemy>

const xpCosts=[10,14,19,25,33,43,56,72,92,116,145,180,220,265,315,370,430,495]
function costForLevel(level:number){
  while(xpCosts.length < level){ xpCosts.push(Math.ceil(xpCosts[xpCosts.length-1]*1.2)) }
  return xpCosts[level-1] ?? 10
}
function deriveLevel(totalXp:number){ let lvl=1, spent=0; while(totalXp >= spent+costForLevel(lvl)){spent+=costForLevel(lvl);lvl++} return {lvl,progress:totalXp-spent,next:costForLevel(lvl)} }
function eqById(id?:string){ return EQUIPMENT.find(e=>e.id===id) }
export type WeaponAffinity='guerreiro'|'guardiao'|'cacadora'|'arcanista'|'druida'|'cacador'
const EQUIPMENT_LEVELS=[1,3,5,7,9,11,14,17]
const LEVEL_RARITY:Rarity[]=['comum','incomum','raro','raro','epico','epico','lendario','lendario']
const FREE_EQUIPMENT=new Set(['lamina_vento','leve_estrada','armor_leao_valoria','machado_bronze','pesado_bronze','armor_pesada_khardur','orbe_veu','grimorio_lua','veste_estrelas','facas_predador','broquel_raposa','traje_raposa','pederneira_ancestrais','armadura_couro','botas_viajante','calcas_batedor'])
function equipmentPower(e:Equipment){return e.ataque*2+e.defesa*2+e.vida*.5}
function balanceEquipment(items:Equipment[]){
 const groups=new Map<string,Equipment[]>()
 for(const item of items){const affinity=item.slot==='mao_direita'?equipmentAffinity(item):undefined;const owner=item.classeExclusiva??affinity??'universal';const key=`${owner}:${item.slot}`;groups.set(key,[...(groups.get(key)??[]),item])}
 const balanced=new Map<string,Equipment>()
 for(const group of groups.values()){
  const sorted=[...group].sort((a,b)=>equipmentPower(a)-equipmentPower(b)||a.preco-b.preco||a.nome.localeCompare(b.nome,'pt-BR'))
  sorted.forEach((item,index)=>{const tier=sorted.length===1?0:Math.round(index*7/(sorted.length-1));const free=FREE_EQUIPMENT.has(item.id);const level=free?1:EQUIPMENT_LEVELS[tier];balanced.set(item.id,{...item,nivelMinimo:level,raridade:free?item.raridade:LEVEL_RARITY[tier],preco:Math.max(item.preco,8+level*3)})})
 }
 return items.map(item=>{const result=item.slot==='bolsa'?item:(balanced.get(item.id)??{...item,nivelMinimo:1});return{...result,preco:Math.ceil(result.preco*ITEM_PRICE_MULTIPLIER)}})
}
export const EQUIPMENT=balanceEquipment(RAW_EQUIPMENT)
export function equipmentBagCapacity(s:{equipped:Partial<Record<Slot,string>>}){return eqById(s.equipped.bolsa)?.capacidade??8}
export function equipmentRequiredLevel(e:Equipment){return Math.max(1,e.nivelMinimo??1)}
export function equipmentLevelAllowed(e:Equipment,xp:number){return deriveLevel(xp).lvl>=equipmentRequiredLevel(e)}
const CONSUMABLE_LOOT_LEVEL:Record<Rarity,number>={comum:1,incomum:4,raro:8,epico:12,lendario:16,mitico:20,heroico:20}
function monsterLootLevel(enemy:Enemy){const level=Math.max(1,enemy.nivel??enemy.dificuldade);return level+(enemy.boss?2:enemy.elite?1:0)}
function monsterDropChance(enemy:Enemy){const level=Math.max(1,enemy.nivel??enemy.dificuldade);return enemy.boss?1:enemy.elite?Math.min(.82,.58+level*.012):Math.min(.58,.30+level*.012)}
function equipmentLootPool(enemy:Enemy,heroId:string|undefined,heroLevel:number){const cap=Math.min(heroLevel,monsterLootLevel(enemy));return EQUIPMENT.filter(e=>!FREE_EQUIPMENT.has(e.id)&&equipmentRequiredLevel(e)<=cap&&equipmentClassAllowed(e,heroId))}
function consumableLootPool(enemy:Enemy){const cap=monsterLootLevel(enemy);return CONSUMABLES.filter(item=>(CONSUMABLE_LOOT_LEVEL[item.raridade??'comum']??1)<=cap)}
export function equipmentAffinity(e:Equipment):WeaponAffinity|undefined{if(e.tipoEquipamento==='arco'||e.tipoEquipamento==='balestra')return'cacador';if(e.tipoEquipamento==='cajado_natureza'||e.tipoEquipamento==='pergaminho')return'druida';const name=e.nome.toLocaleLowerCase('pt-BR');if(/arco|balestra/.test(name))return'cacador';if(/cajado.*(broto|raiz|orvalho|carvalho|lua verde|seiva|lunargenta|arquedruida)|pergaminho/.test(name))return'druida';if(/espada|lâmina/.test(name))return'guerreiro';if(/machado|martelo/.test(name))return'guardiao';if(/faca|adaga/.test(name))return'cacadora';if(/cajado|orbe/.test(name))return'arcanista';return undefined}
const FACAS_OFFHAND_ATTACK_BONUS=1
export function equipmentWeaponClass(e?:Equipment):'facas'|'adaga'|undefined{if(!e||e.slot!=='mao_direita')return undefined;if(e.tipoEquipamento==='facas')return'facas';if(e.tipoEquipamento==='adaga')return'adaga';const name=e.nome.toLocaleLowerCase('pt-BR');if(/facas?\b/.test(name))return'facas';if(/adaga/.test(name))return'adaga';return undefined}
export function equipmentAttackForHero(e:Equipment,heroId?:string){const affinity=equipmentAffinity(e);return affinity&&heroId!==affinity?Math.max(0,e.ataque-1):e.ataque}
export function equipmentCompatibility(e:Equipment,heroId?:string){const affinity=equipmentAffinity(e);if(!affinity)return{affinity:undefined,compatible:true,penalty:0};const compatible=heroId===affinity;return{affinity,compatible,penalty:compatible?0:e.ataque-equipmentAttackForHero(e,heroId)}}
export function equipmentClassAllowed(e:Equipment,heroId?:string){return !e.classeExclusiva||e.classeExclusiva===heroId}

interface Loot { gold:number; xp:number; itemId?:string; equipmentId?:string; title:string }
interface EventResult { message:string; roll?:number; tone:'good'|'bad'|'neutral' }
interface CombatRoll { attacker:'hero'|'enemy'; naturalAttackRoll:number; attackRoll:number; attackBonus:number; defenseRoll:number; attackBase:number; defenseBase:number; attackEffect:string; defenseEffect:string; damage:number; selfDamage:number; shieldBlocked?:number }
interface FleeRoll { roll:number; outcome:'failed'|'neutral'|'success' }
export interface CombatMinion { id:string; nome:string; hp:number; maxHp:number; ataque:number }
interface CampaignSave { savedAt:number; heroId?:string; screen?:Screen; xp?:number; territory?:string; [key:string]:any }
export type GuildRankId='ferro'|'bronze'|'prata'|'ouro'|'platina'|'diamante'|'campeao'
export interface GuildRank { id:GuildRankId; nome:string; minimo:number; cor:string }
export const GUILD_RANKS:GuildRank[]=[
 {id:'ferro',nome:'Ferro',minimo:0,cor:'#8d8580'},{id:'bronze',nome:'Bronze',minimo:25,cor:'#b87333'},{id:'prata',nome:'Prata',minimo:75,cor:'#c5ccd3'},{id:'ouro',nome:'Ouro',minimo:160,cor:'#e5b84b'},{id:'platina',nome:'Platina',minimo:300,cor:'#74d4c5'},{id:'diamante',nome:'Diamante',minimo:500,cor:'#65bfff'},{id:'campeao',nome:'Campeão',minimo:800,cor:'#d783ff'}
]
export function guildRankFor(reputation:number){return [...GUILD_RANKS].reverse().find(rank=>reputation>=rank.minimo)??GUILD_RANKS[0]}
export interface GuildMission { id:string; nome:string; descricao:string; tipo:'any'|'specific'|'boss'|'delivery'; quantidade:number; alvo?:string; itemId?:string; local?:string; destinoId?:string; recompensa:{tipo:'gold'|'equipment';valor:number}; dificuldade:number; rank:GuildRankId; regiaoMinima?:number }
export const GUILD_MISSIONS:GuildMission[]=[
 {id:'caca_inicial',nome:'Limpeza das Estradas',descricao:'Derrote quaisquer 3 monstros nas terras de Havendown.',tipo:'any',quantidade:3,local:'Estrada das Planícies de Alvora',destinoId:'campos_estrada',recompensa:{tipo:'gold',valor:12},dificuldade:1,rank:'ferro'},
 {id:'ameaca_goblin',nome:'Ameaça Goblin',descricao:'Derrote 3 inimigos que possuam Goblin no nome.',tipo:'specific',alvo:'goblin',quantidade:3,local:'Clareira dos Goblins',destinoId:'lunar_goblins',recompensa:{tipo:'gold',valor:22},dificuldade:2,rank:'ferro'},
 {id:'entrega_couro',nome:'Suprimentos para os Recrutas',descricao:'Compre ou encontre uma Armadura de Couro Batido e entregue-a à Guilda.',tipo:'delivery',itemId:'armadura_couro',quantidade:1,recompensa:{tipo:'gold',valor:24},dificuldade:1,rank:'ferro'},
 {id:'caca_lobos',nome:'Peles para a Guilda',descricao:'Derrote 3 inimigos que possuam Lobo no nome.',tipo:'specific',alvo:'lobo',quantidade:3,local:'Bosque de Abdendriel',destinoId:'lunar_bosque',recompensa:{tipo:'equipment',valor:1},dificuldade:2,rank:'bronze'},
 {id:'entrega_runas',nome:'Relíquia da Guarda Antiga',descricao:'Adquira as Runas do Antigo Guardião e entregue-as aos estudiosos da Guilda.',tipo:'delivery',itemId:'runas_guardiao',quantidade:1,recompensa:{tipo:'gold',valor:40},dificuldade:2,rank:'bronze'},
 {id:'prova_chefes',nome:'Prova do Caçador',descricao:'Derrote qualquer chefe de sub-região.',tipo:'boss',quantidade:1,local:'Ponte de Eldrimar',destinoId:'campos_ponte',recompensa:{tipo:'equipment',valor:1},dificuldade:3,rank:'prata'},
 {id:'veterano_guilda',nome:'Veterano da Guilda',descricao:'Derrote 10 monstros de qualquer espécie.',tipo:'any',quantidade:10,local:'Campos Amaldiçoados',destinoId:'mortas_campos',recompensa:{tipo:'equipment',valor:1},dificuldade:4,rank:'ouro'},
 {id:'entrega_manto',nome:'Escamas para a Fortaleza',descricao:'Obtenha um Manto de Cinzas do Dragão e entregue-o para reforçar as defesas da Guilda.',tipo:'delivery',itemId:'manto_cinzas',quantidade:1,recompensa:{tipo:'gold',valor:65},dificuldade:4,rank:'ouro'},
 {id:'dominio_chefes',nome:'Domínio dos Tiranos',descricao:'Derrote 2 chefes diferentes ou repetidos nas regiões avançadas.',tipo:'boss',quantidade:2,local:'Catacumbas de Morvath',destinoId:'mortas_catacumbas',recompensa:{tipo:'gold',valor:85},dificuldade:5,rank:'platina',regiaoMinima:4},
 {id:'entrega_coracao',nome:'O Coração Partido',descricao:'Entregue o Coração Partido de Malgor para que a Guilda possa selar sua energia.',tipo:'delivery',itemId:'coracao_malgor',quantidade:1,recompensa:{tipo:'gold',valor:120},dificuldade:6,rank:'diamante'},
 {id:'queda_ignaroth',nome:'A Queda de Ignaroth',descricao:'Derrote o chefe Ignaroth no Ninho do Dragão Vermelho.',tipo:'boss',alvo:'ignaroth',quantidade:1,local:'Ninho do Dragão Vermelho',destinoId:'pico_ninho_dragao',recompensa:{tipo:'gold',valor:140},dificuldade:6,rank:'diamante'}
]
const BASE_GUILD_MISSIONS=[...GUILD_MISSIONS]
const guildRankForDifficulty=(difficulty:number):GuildRankId=>difficulty>=9?'campeao':difficulty>=8?'diamante':difficulty>=7?'platina':difficulty>=6?'ouro':difficulty>=4?'prata':difficulty>=3?'bronze':'ferro'
function evolvedGuildMission(base:GuildMission,generation:number):GuildMission{if(generation<=1)return base;const step=generation-1,difficulty=Math.min(10,base.dificuldade+step),quantity=base.tipo==='delivery'?1:base.quantidade+step*(base.tipo==='boss'?1:2),gold=base.recompensa.tipo==='gold'?Math.round(base.recompensa.valor*(1+step*.65)):base.recompensa.valor;return{...base,id:`${base.id}__${generation}`,nome:`${base.nome} ${['','II','III','IV','V','VI','VII','VIII','IX','X'][Math.min(9,generation-1)]??`+${step}`}`,descricao:base.tipo==='delivery'?base.descricao:`${/\d+/.test(base.descricao)?base.descricao.replace(/\d+/,String(quantity)):`${base.descricao} Desta vez são necessárias ${quantity} vitórias.`} A ameaça está mais perigosa nesta nova etapa.`,quantidade:quantity,dificuldade:difficulty,recompensa:{...base.recompensa,valor:gold}}}
export function guildMissionById(id:string){const [baseId,generationText]=id.split('__'),base=BASE_GUILD_MISSIONS.find(m=>m.id===baseId);return base?evolvedGuildMission(base,Number(generationText)||1):undefined}
export function availableGuildMissions(claimed:string[]=[]){return BASE_GUILD_MISSIONS.map(base=>{let generation=1;while(claimed.includes(generation===1?base.id:`${base.id}__${generation}`))generation++;return evolvedGuildMission(base,generation)})}
interface GameState {
 screen:Screen; heroId?:string; hp:number; gold:number; xp:number; attributePoints:number; attr:{vida:number;ataque:number;defesa:number}; allocatedAttr:{vida:number;ataque:number;defesa:number}; balanceVersion:number;
 inventory:Record<string,number>; equipmentBag:string[]; equipped:Partial<Record<Slot,string>>; territory:string; regionId:string; world:string; subregionId?:string; victories:Record<string,number>; subregionVictories:Record<string,number>; bossesDefeated:string[]; subregionBossesDefeated:string[];
 enemy?:Enemy; enemyHp:number; combatMinions?:CombatMinion[]; combatTurn:number; combatLog:string[]; coin?:'cara'|'coroa'; playerTurn:boolean; animating:boolean; animationActor?:'hero'|'enemy'; lastDamage?:number; combatRoll?:CombatRoll; fleeRoll?:FleeRoll; heroRollBonus:number; enemyRollBonus:number; heroSkillUsed:boolean; itemSkillUsed:boolean; shield:number; combatAttackPct:number; combatDefensePct:number; classRollBonus:number; extraHeroAttacks:number; guardianTaunt:boolean; groupCriticalBoost:boolean;
 loot?:Loot; selectedGallery:number; shopMode:'buy'|'sell'; explorationNote?:string; currentEvent?:GameEvent; eventResult?:EventResult; pendingAttackBonus:number; customCards:CustomCard[]; campaigns:Record<string,CampaignSave>; activeCampaignId?:string; guildAccepted:string[]; guildProgress:Record<string,number>; guildClaimed:string[]; guildNotice?:string;
 difficultyMode:DifficultyMode;talents:string[];materials:Record<string,number>;equipmentUpgrades:Record<string,number>;equipmentGems:Record<string,string[]>;craftedEffects:Record<string,ForgeEffect>;forgeXp?:number;forgeAttempts?:number;forgeSuccesses?:number;bestiary:Record<string,{encontros:number;vitorias:number}>;discoveredCards:string[];revengeWins:Record<string,number>;dungeonDepth:number;dungeonActive:boolean;storyFlags:string[];storyChapterId:string;storyChoices:Record<string,string>;storyNotice?:string;coopBattlesCompleted:string[];
 newGame:(heroId:string)=>void; setScreen:(s:Screen)=>void; travelWorld:(world:string)=>void; startCoopCombat:(enemy:Enemy,subregionId:string)=>void; syncCoopEnemyHp:(hp:number)=>void; completeCoopVictory:(battleId:string,subregionId:string,enemy:Enemy,rewardShare:number)=>void; receiveCoopEnemyAttack:(damage:number,roll:any)=>void; receiveCoopHeal:(amount:number)=>void; completeCoopDefeat:(battleId:string)=>void; continueGame:()=>void; loadCampaign:(id:string)=>void; deleteCampaign:(id:string)=>void; acceptGuildMission:(id:string)=>void; claimGuildMission:(id:string)=>void; openRegion:(t:Territory)=>void; openSubregion:(subregionId:string)=>void; startEncounter:(subregionId:string)=>void; startBoss:()=>void;
 attack:()=>void; heroSkill:()=>void; itemSkill:()=>void; useConsumable:(id:string)=>void; flee:()=>void;
 buyConsumable:(id:string)=>void; buyEquipment:(id:string)=>void; sellConsumable:(id:string)=>void; sellEquipment:(id:string)=>void;
 equip:(id:string)=>void; unequip:(slot:Slot)=>void; addAttribute:(k:'vida'|'ataque'|'defesa')=>void; setSelectedGallery:(n:number)=>void; toggleShopMode:()=>void; resolveEvent:(accept:boolean,approach?:'class')=>void; finishEvent:()=>void; finishLoot:()=>void; clearSave:()=>void;
 addCustomCard:(card:Omit<CustomCard,'id'|'criadoEm'>)=>void; removeCustomCard:(id:string)=>void;
 setDifficulty:(mode:DifficultyMode)=>void;unlockTalent:(id:string)=>void;craftEquipment:(recipeId?:any)=>void;upgradeEquipment:(id:string)=>void;dismantleEquipment:(id:string)=>void;socketGem:(equipmentId:string,gemId:string)=>void;removeGem:(equipmentId:string,index:number)=>void;startDungeon:()=>void;leaveDungeon:()=>void;startRevenge:(subregionId:string)=>void;chooseStory:(choiceId:string)=>void;
}

const EVENT_CHAINS=[
 ['A Última Carta','O Mensageiro dos Corvos','O Julgamento do Mercador'],
 ['A Flor que Canta','A Árvore das Cem Portas','A Fonte dos Nomes Perdidos'],
 ['O Ferreiro sem Material','A Forja Adormecida','O Último Ferreiro'],
 ['O Grito na Névoa','O Peregrino sem Rosto','A Aurora Negra']
]
function nextStoryEvent(s:GameState){for(const chain of EVENT_CHAINS){for(let i=1;i<chain.length;i++){if(s.storyFlags.includes(chain[i-1])&&!s.storyFlags.includes(chain[i])){const next=EVENTS.find(e=>e.nome===chain[i]);if(next)return next}}}return undefined}
function equipmentSetCounts(s:GameState){const names=Object.values(s.equipped).map(id=>eqById(id)?.nome.toLocaleLowerCase('pt-BR')??'');return{lua:names.filter(n=>/lua|lunar|lunargenta|abdendriel/.test(n)).length,cinzas:names.filter(n=>/cinza|dragão|escarlate/.test(n)).length,khar:names.filter(n=>/khar|runa|bronze|kholgard/.test(n)).length,eclipse:names.filter(n=>/eclipse|sombr|malgor/.test(n)).length}}
function hasCraftedEffect(s:GameState,effect:ForgeEffect){return Object.values(s.equipped).some(id=>Boolean(id)&&s.craftedEffects?.[id!]===effect)}
export function equipmentSocketCount(e:Equipment){const rarity=e.raridade??'comum';return rarity==='mitico'||rarity==='heroico'?3:rarity==='lendario'||rarity==='epico'?2:rarity==='raro'||rarity==='incomum'?1:0}
export function dismantlePreview(e:Equipment){const tier=Math.max(1,Math.ceil(equipmentRequiredLevel(e)/4)),physical=Math.max(1,tier+(e.slot==='mao_direita'||e.slot==='mao_esquerda'?1:0)),magical=Math.max(0,(e.raridade==='comum'?0:1)+(e.raridade==='epico'||e.raridade==='lendario'||e.raridade==='mitico'?1:0)),gemChance=Math.min(.85,.08+tier*.05+(equipmentSocketCount(e)*.12));return{physical,magical,gemChance}}
export function forgeLevelInfo(xp:number){let level=1,spent=0,next=40;while(level<10&&xp>=spent+next){spent+=next;level++;next=40+level*25}return{level,progress:xp-spent,next,max:level>=10}}
export function forgeRecipeLevel(recipeId:string){return Math.min(6,Math.max(1,FORGE_RECIPES.findIndex(r=>r.id===recipeId)+1))}
export function forgeSuccessChance(recipeId:string,forgeXp:number){const mastery=forgeLevelInfo(forgeXp).level,required=forgeRecipeLevel(recipeId);return Math.max(.45,Math.min(.95,.72+(mastery-required)*.06))}
export function storyRequirementProgress(s:GameState){const chapter=STORY_CHAPTERS.find(c=>c.id===s.storyChapterId),req=chapter?.requirement;if(!req)return{current:1,required:1,complete:true};let current=0;if(req.type==='victories')current=req.target?SUBREGIONS.filter(sub=>sub.regionId===req.target).reduce((sum,sub)=>sum+(s.subregionVictories[sub.id]??0),0):Object.values(s.victories).reduce((a,b)=>a+b,0);if(req.type==='bosses')current=s.subregionBossesDefeated.length;if(req.type==='material')current=s.materials[req.target??'']??0;if(req.type==='upgrade')current=Object.values(s.equipmentUpgrades).filter(v=>v>0).length;if(req.type==='region')current=SUBREGIONS.filter(sub=>sub.regionId===req.target&&s.subregionBossesDefeated.includes(sub.id)).length;return{current:Math.min(current,req.amount),required:req.amount,complete:current>=req.amount}}

function currentSubregion(s:GameState){ return SUBREGIONS.find(x=>x.id===s.subregionId) }
function rarityForVariant(v:string):Rarity{ return v==='Campeão'?'epico':v==='Elite'?'raro':v==='Veterano'?'incomum':'comum' }

function buildEnemy(sub:Subregion, playerLevel:number):Enemy{
  const base=sub.inimigos[Math.floor(Math.random()*sub.inimigos.length)]
  const targetLevel=Math.max(sub.nivelMin,Math.min(sub.nivelMax+1,Math.round((sub.nivelMin+sub.nivelMax)/2 + (Math.random()-.5)*2)))
  const effectiveLevel=Math.max(targetLevel,Math.min(sub.nivelMax+2,Math.round(targetLevel*.7+playerLevel*.3)))
  const r=Math.random()
  const variant=r<.06?'Campeão':r<.21?'Elite':r<.48?'Veterano':'Comum'
  const hpMult=variant==='Campeão'?2.05:variant==='Elite'?1.55:variant==='Veterano'?1.22:1
  const atkMult=variant==='Campeão'?1.42:variant==='Elite'?1.24:variant==='Veterano'?1.1:1
  const goldMult=variant==='Campeão'?2.3:variant==='Elite'?1.7:variant==='Veterano'?1.28:1
  const levelDelta=Math.max(0,effectiveLevel-sub.nivelMin)
  const scaledHp=Math.ceil(base.vida*(1+levelDelta*.12)*hpMult)
  const scaledAtk=Math.ceil(base.ataque*(1+levelDelta*.07)*atkMult)
  const prefix=variant==='Comum'?'':`${variant}: `
  const extra=variant==='Campeão'?' • Aura de campeão':variant==='Elite'?' • Técnica de elite':variant==='Veterano'?' • Experiência de combate':''
  return {
    id:`${sub.id}_${base.nome.toLowerCase().replace(/[^a-z0-9]+/g,'_')}_${Date.now()}`,
    nome:prefix+base.nome, ataque:scaledAtk, vida:scaledHp, ouro:Math.ceil(base.ouro*(1+levelDelta*.08)*goldMult), dificuldade:effectiveLevel,
    habilidade:base.habilidade+extra, imagem:base.arte, arte:base.arte, raridade:rarityForVariant(variant), elite:variant==='Elite'||variant==='Campeão', nivel:effectiveLevel, variante:variant
  }
}
function buildBoss(sub:Subregion):Enemy{
  const b=sub.chefe
  return {id:`boss_${sub.id}`,nome:b.nome,ataque:b.ataque,vida:b.vida,ouro:b.ouro,dificuldade:sub.nivelMax,habilidade:b.habilidade,imagem:b.arte,arte:b.arte,raridade:b.raridade,boss:true,maxFases:b.maxFases,fase:1,nivel:sub.nivelMax}
}
function difficultyEnemy(enemy:Enemy,mode:DifficultyMode){const multiplier=DIFFICULTIES[mode].enemy;return{...enemy,ataque:Math.max(1,Math.ceil(enemy.ataque*multiplier)),vida:Math.max(1,Math.ceil(enemy.vida*multiplier)),ouro:Math.ceil(enemy.ouro*DIFFICULTIES[mode].reward)}}
export function buildCoopEnemy(subregionId:string,playerLevel:number,mode:DifficultyMode){const sub=SUBREGIONS.find(item=>item.id===subregionId);return sub?difficultyEnemy(buildEnemy(sub,playerLevel),mode):undefined}
export function buildCoopSubregionBoss(subregionId:string,mode:DifficultyMode){const sub=SUBREGIONS.find(item=>item.id===subregionId);return sub?difficultyEnemy(buildBoss(sub),mode):undefined}
export function buildCoopRegionBoss(regionId:string,mode:DifficultyMode){const region=TERRITORIES.find(item=>item.id===regionId),base=region&&BOSSES[region.dificuldade];return region&&base?difficultyEnemy({...base,id:`coop_region_boss_${region.id}`,nome:`${base.nome} • Soberano de ${region.nome}`},mode):undefined}
function buildRevengeBoss(sub:Subregion,wins:number):Enemy{const base=buildBoss(sub),power=1.35+wins*.18;return{...base,id:`revenge_${sub.id}_${Date.now()}`,nome:`Vingança ${wins+1}: ${base.nome}`,ataque:Math.ceil(base.ataque*power),vida:Math.ceil(base.vida*power),ouro:Math.ceil(base.ouro*(1.5+wins*.25)),maxFases:Math.min(5,(base.maxFases??2)+1),habilidade:`${base.habilidade} • Memória da derrota • Fúria vingativa`,revenge:true}}

function campaignSnapshot(source:any):CampaignSave{const snapshot:any={savedAt:Date.now()};for(const [key,value] of Object.entries(source)){if(typeof value!=='function'&&key!=='campaigns'&&key!=='activeCampaignId'&&key!=='customCards')snapshot[key]=value}return snapshot}
function saveActiveCampaign(state:GameState){if(!state.activeCampaignId||!state.heroId||state.screen==='menu'||state.screen==='select'||state.screen==='cardCreator')return state.campaigns;return{...state.campaigns,[state.activeCampaignId]:campaignSnapshot(state)}}
function resumableScreen(screen?:Screen):Screen{return !screen||screen==='menu'||screen==='select'||screen==='cardCreator'?'map':screen}
function reputationFromClaims(ids:string[]=[]){return ids.reduce((sum,id)=>sum+(guildMissionById(id)?.dificuldade??0),0)}
function normalizeAttributes(source:any){if(source?.balanceVersion>=2&&source?.allocatedAttr)return{attr:source.attr,allocatedAttr:source.allocatedAttr,balanceVersion:2};const attr={vida:Math.max(0,source?.attr?.vida??0),ataque:Math.max(0,source?.attr?.ataque??0),defesa:Math.max(0,source?.attr?.defesa??0)},earned=Math.max(0,deriveLevel(source?.xp??0).lvl-1),spent=Math.max(0,earned-(source?.attributePoints??0)),defesa=Math.min(attr.defesa,spent),ataque=Math.min(attr.ataque,Math.max(0,spent-defesa)),vida=Math.min(attr.vida,Math.max(0,spent-defesa-ataque));return{attr:{...attr,ataque},allocatedAttr:{vida,ataque,defesa},balanceVersion:2}}

export const useGame = create<GameState>()(persist((set,get)=>({
  coopBattlesCompleted:[],
  screen:'menu',hp:0,gold:0,xp:0,attributePoints:0,attr:{vida:0,ataque:0,defesa:0},allocatedAttr:{vida:0,ataque:0,defesa:0},balanceVersion:2,inventory:{},equipmentBag:[],equipped:{},territory:'Planícies de Alvora',regionId:'campos_dourados',world:'havendown',subregionId:undefined,victories:{},subregionVictories:{},bossesDefeated:[],subregionBossesDefeated:[],enemyHp:0,combatTurn:0,combatLog:[],playerTurn:false,animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,heroRollBonus:0,enemyRollBonus:0,heroSkillUsed:false,itemSkillUsed:false,shield:0,selectedGallery:0,shopMode:'buy',explorationNote:undefined,currentEvent:undefined,eventResult:undefined,pendingAttackBonus:0,customCards:[],campaigns:{},activeCampaignId:undefined,guildAccepted:[],guildProgress:{},guildClaimed:[],guildNotice:undefined,difficultyMode:'veterano',talents:[],materials:{},equipmentUpgrades:{},equipmentGems:{},craftedEffects:{},bestiary:{},discoveredCards:[],revengeWins:{},dungeonDepth:0,dungeonActive:false,storyFlags:[],storyChapterId:'prologo',storyChoices:{},storyNotice:undefined,
  newGame:(heroId:string)=>{const previous=get();const h=HEROES.find(x=>x.id===heroId)!;const st=starter[heroId]??starter.guerreiro;const initialHp=h.vida+Object.values(st.equipped).reduce((sum,id)=>sum+(eqById(id)?.vida??0),0);const activeCampaignId=`campaign_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;const discoveredCards=[`hero:${heroId}`,...Object.values(st.equipped).map(id=>`equipment:${id}`),...Object.keys(st.items).map(id=>`consumable:${id}`)];const next:any={screen:'map',heroId,hp:initialHp,gold:st.gold,xp:0,attributePoints:0,attr:{vida:0,ataque:0,defesa:0},allocatedAttr:{vida:0,ataque:0,defesa:0},balanceVersion:2,inventory:{...st.items},equipmentBag:[],equipped:{...st.equipped},territory:'Planícies de Alvora',regionId:'campos_dourados',world:'havendown',subregionId:undefined,victories:{},subregionVictories:{},bossesDefeated:[],subregionBossesDefeated:[],enemy:undefined,enemyHp:0,combatTurn:0,combatLog:[],coin:undefined,playerTurn:false,animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,heroRollBonus:0,enemyRollBonus:0,heroSkillUsed:false,itemSkillUsed:false,shield:0,loot:undefined,currentEvent:undefined,eventResult:undefined,pendingAttackBonus:0,explorationNote:undefined,selectedGallery:0,shopMode:'buy',guildAccepted:[],guildProgress:{},guildClaimed:[],difficultyMode:previous.difficultyMode??'veterano',talents:[],materials:{},equipmentUpgrades:{},bestiary:{},discoveredCards,revengeWins:{},dungeonDepth:0,dungeonActive:false,storyFlags:[],storyChapterId:'prologo',storyChoices:{},storyNotice:undefined};const campaigns={...saveActiveCampaign(previous),[activeCampaignId]:campaignSnapshot(next)};set({...next,campaigns,activeCampaignId})},
  setScreen:(screen:Screen)=>{const state=get();set({screen,campaigns:saveActiveCampaign(state)})},
  travelWorld:(world:string)=>{const state=get();if(!worldUnlocked(state,world))return;const first=[...TERRITORIES].filter(t=>(t.mundo??'havendown')===world).sort((a,b)=>a.dificuldade-b.dificuldade)[0];if(!first)return;set({world,regionId:first.id,territory:first.nome,subregionId:undefined,screen:'map',campaigns:saveActiveCampaign(state)})},
  startCoopCombat:(enemy:Enemy,subregionId:string)=>{const sub=SUBREGIONS.find(item=>item.id===subregionId),region=sub&&TERRITORIES.find(item=>item.id===sub.regionId),s=get() as GameState;if(!sub||!region)return;const warriorLuck=s.heroId==='guerreiro'&&Math.random()<.5;set({screen:'combat',regionId:region.id,territory:region.nome,subregionId,enemy,enemyHp:enemy.vida,combatTurn:1,combatLog:['Batalha cooperativa iniciada. A iniciativa foi sorteada para todo o grupo.',...(s.heroId==='guardiao'?['Passivo do Guardião: +2 de Defesa.']:[]),...(warriorLuck?['Fortuna do Guerreiro: +1 em todos os dados nesta batalha.']:[])],playerTurn:false,animating:false,combatRoll:undefined,lastDamage:undefined,shield:0,heroSkillUsed:false,itemSkillUsed:false,heroRollBonus:0,classRollBonus:warriorLuck?1:0,combatAttackPct:0,combatDefensePct:0,extraHeroAttacks:0,guardianTaunt:false})},
  syncCoopEnemyHp:(hp:number)=>{const s=get();if(s.screen!=='combat'||!s.enemy)return;const next=Math.max(0,hp);if(next!==s.enemyHp)set({enemyHp:next})},
  completeCoopVictory:(battleId:string,subregionId:string,enemy:Enemy,rewardShare:number)=>{const s=get(),completedBattles=s.coopBattlesCompleted??[],wasDefeated=s.hp<=0;if(!battleId||!subregionId||!enemy||completedBattles.includes(battleId))return;const sub=SUBREGIONS.find(item=>item.id===subregionId),region=sub&&TERRITORIES.find(item=>item.id===sub.regionId);if(!sub||!region)return;const share=Math.max(0,Math.min(1,Number.isFinite(rewardShare)?rewardShare:0)),personalReward=Math.floor(enemy.ouro*share);set({coopBattlesCompleted:[...completedBattles,battleId],screen:'combat',regionId:region.id,territory:region.nome,subregionId,enemy:{...enemy,ouro:personalReward},enemyHp:0});victory(set,get);if(wasDefeated){const loot=get().loot;applyDefeatPenalty(set,get,'Você foi derrotado durante o combate cooperativo.');set({screen:'loot',loot})}const completed=get();set({campaigns:saveActiveCampaign(completed)})},
  completeCoopDefeat:(battleId:string)=>{const s=get(),completedBattles=s.coopBattlesCompleted??[];if(!battleId||completedBattles.includes(battleId))return;set({coopBattlesCompleted:[...completedBattles,battleId]});applyDefeatPenalty(set,get,'Sua equipe foi derrotada em combate cooperativo.');set({screen:'loot',loot:{gold:0,xp:0,title:'EQUIPE DERROTADA'}});const completed=get();set({campaigns:saveActiveCampaign(completed)})},
  receiveCoopEnemyAttack:(damage:number,roll:any)=>{const s=get();if(s.screen!=='combat'||!s.enemy)return;set({hp:Math.max(0,s.hp-damage),combatRoll:{attacker:'enemy',naturalAttackRoll:roll.attackRoll,attackRoll:roll.attackRoll,attackBonus:0,defenseRoll:roll.defenseRoll,attackBase:s.enemy.ataque,defenseBase:defenseValue(s),attackEffect:attackEffect(roll.attackRoll),defenseEffect:defenseEffect(roll.defenseRoll),damage,selfDamage:0},animating:true,animationActor:'enemy',lastDamage:damage});setTimeout(()=>set({animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined}),COMBAT_ROLL_DISPLAY_MS)},
  receiveCoopHeal:(amount:number)=>{const s=get();if(s.screen!=='combat'||amount<=0)return;set({hp:Math.min(maxHp(s),s.hp+amount)})},
  continueGame:()=>{const state=get(),saved=state.activeCampaignId&&state.campaigns[state.activeCampaignId];if(saved)set({...saved,...normalizeAttributes(saved),campaigns:state.campaigns,activeCampaignId:state.activeCampaignId,guildAccepted:saved.guildAccepted??[],guildProgress:saved.guildProgress??{},guildClaimed:saved.guildClaimed??[],guildNotice:undefined,screen:resumableScreen(saved.screen),animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,playerTurn:saved.screen==='combat'&&saved.enemy?true:(saved.playerTurn??false)});else set({screen:state.heroId?'map':'select'})},
  loadCampaign:(id:string)=>{const state=get(),saved=state.campaigns[id];if(!saved)return;const campaigns=saveActiveCampaign(state);set({...saved,...normalizeAttributes(saved),campaigns,activeCampaignId:id,guildAccepted:saved.guildAccepted??[],guildProgress:saved.guildProgress??{},guildClaimed:saved.guildClaimed??[],guildNotice:undefined,screen:resumableScreen(saved.screen),animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,playerTurn:saved.screen==='combat'&&saved.enemy?true:(saved.playerTurn??false)})},
  deleteCampaign:(id:string)=>{const state=get(),campaigns={...state.campaigns};delete campaigns[id];if(id===state.activeCampaignId)set({campaigns,activeCampaignId:undefined,heroId:undefined,screen:'menu',hp:0,gold:0,xp:0,equipmentBag:[],inventory:{},equipped:{}});else set({campaigns})},
  acceptGuildMission:(id:string)=>{const state=get(),mission=guildMissionById(id),rank=guildRankFor(reputationFromClaims(state.guildClaimed));if(!mission||GUILD_RANKS.findIndex(r=>r.id===rank.id)<GUILD_RANKS.findIndex(r=>r.id===mission.rank)||state.guildAccepted.includes(id)||state.guildClaimed.includes(id))return;set({guildAccepted:[...state.guildAccepted,id],guildProgress:{...state.guildProgress,[id]:state.guildProgress[id]??0},guildNotice:`Missão aceita: ${mission.nome}.`})},
  claimGuildMission:(id:string)=>{const state=get(),mission=guildMissionById(id);if(!mission||state.guildClaimed.includes(id))return;const deliveryIndex=mission.tipo==='delivery'&&mission.itemId?state.equipmentBag.indexOf(mission.itemId):-1;const deliverySlot=mission.tipo==='delivery'&&mission.itemId&&deliveryIndex<0?(Object.entries(state.equipped).find(([,itemId])=>itemId===mission.itemId)?.[0] as Slot|undefined):undefined;const complete=mission.tipo==='delivery'?(deliveryIndex>=0||Boolean(deliverySlot)):(state.guildProgress[id]??0)>=mission.quantidade;if(!complete)return;const reputation=reputationFromClaims(state.guildClaimed),newRank=guildRankFor(reputation+mission.dificuldade),promotion=newRank.id!==guildRankFor(reputation).id?` Promoção alcançada: rank ${newRank.nome}!`:'';const consumeDelivery=(bag:string[])=>{if(deliveryIndex>=0)bag.splice(deliveryIndex,1)};const equippedAfterDelivery=()=>{if(!deliverySlot)return state.equipped;const equipped={...state.equipped};delete equipped[deliverySlot];return equipped};if(mission.recompensa.tipo==='gold'){const equipmentBag=[...state.equipmentBag];consumeDelivery(equipmentBag);set({gold:state.gold+mission.recompensa.valor,equipmentBag,equipped:equippedAfterDelivery(),guildClaimed:[...state.guildClaimed,id],guildNotice:`${mission.tipo==='delivery'?'Item entregue. ':''}Recompensa recebida: ${mission.recompensa.valor} moedas de ouro.${promotion}`})}else{if(state.equipmentBag.length>=equipmentBagCapacity(state))return;const pool=EQUIPMENT.filter(e=>equipmentLevelAllowed(e,state.xp)&&equipmentClassAllowed(e,state.heroId)&&e.slot!=='bolsa');const reward=pool[Math.floor(Math.random()*pool.length)]??EQUIPMENT[0];const equipmentBag=[...state.equipmentBag];consumeDelivery(equipmentBag);equipmentBag.push(reward.id);set({equipmentBag,equipped:equippedAfterDelivery(),guildClaimed:[...state.guildClaimed,id],guildNotice:`${mission.tipo==='delivery'?'Item entregue. ':''}Recompensa recebida: ${reward.nome}.${promotion}`})}},
  openRegion:(t:Territory)=>set({regionId:t.id,territory:t.nome,subregionId:undefined,explorationNote:undefined,screen:'region'}),
  openSubregion:(subregionId:string)=>{const sub=SUBREGIONS.find(x=>x.id===subregionId);const region=sub&&TERRITORIES.find(x=>x.id===sub.regionId);if(!sub||!region)return;set({regionId:region.id,territory:region.nome,subregionId:sub.id,explorationNote:`Destino selecionado no mapa: ${sub.nome}.`,screen:'region'})},
  startEncounter:(subregionId:string)=>{
    const sub=SUBREGIONS.find(x=>x.id===subregionId); if(!sub)return
    const s=get(); const progress=s.subregionVictories[sub.id]??0
    set({subregionId:sub.id,territory:sub.nome,explorationNote:undefined})
    if(progress>=sub.encontrosNecessarios && !s.subregionBossesDefeated.includes(sub.id)){ set({screen:'bossIntro',enemy:buildBoss(sub)}); return }
    // Parte das explorações revela uma carta de missão antes do próximo combate.
    const eventRoll=Math.random()
    if(eventRoll<.35){const currentEvent=nextStoryEvent(s)??EVENTS[Math.floor(Math.random()*EVENTS.length)];set({screen:'event',currentEvent,eventResult:undefined});return}
    const lvl=deriveLevel(s.xp).lvl; beginCombat(set,get,difficultyEnemy(buildEnemy(sub,lvl),s.difficultyMode))
  },
  startBoss:()=>{const s=get(),sub=currentSubregion(s);if(sub)beginCombat(set,get,difficultyEnemy(s.enemy?.revenge?s.enemy:buildBoss(sub),s.difficultyMode))},
  attack:()=>playerAttack(set,get,'Ataque',0),
  heroSkill:()=>{const s=get();if(s.heroSkillUsed||!s.playerTurn||s.animating||!s.enemy)return;set({heroSkillUsed:true});if(s.heroId==='guardiao'){set({guardianTaunt:true});addLog(set,'PROVOCAR: os inimigos passam a priorizar o Guardião.');enemyAfterDelay(set,get);return}if(s.heroId==='guerreiro'){set({combatAttackPct:(s.combatAttackPct??0)+.1,combatDefensePct:(s.combatDefensePct??0)+.1});addLog(set,'Ímpeto Marcial: Ataque e Defesa base aumentados em 10% (arredondados para cima).');enemyAfterDelay(set,get);return}if(s.heroId==='cacadora'){set({extraHeroAttacks:1});addLog(set,'Ataque Duplo: você pode atacar duas vezes neste turno.');return}if(s.heroId==='arcanista'){set({classRollBonus:(s.classRollBonus??0)+2,combatAttackPct:(s.combatAttackPct??0)+.1,combatDefensePct:(s.combatDefensePct??0)+.1});addLog(set,'Ascensão Arcana: +2 nas rolagens e +10% de Ataque e Defesa para o grupo.');enemyAfterDelay(set,get);return}if(s.heroId==='druida'){const heal=Math.max(1,Math.ceil(maxHp(s)*.3)),amount=Math.min(heal,maxHp(s)-s.hp);set({hp:s.hp+amount});addLog(set,`Renovo de Abdendriel: recuperou ${amount} de vida do campeão mais ferido.`);enemyAfterDelay(set,get);return}if(s.heroId==='cacador'){set({groupCriticalBoost:true});addLog(set,'Marca do Predador: resultados 5 e 6 passam a causar ataques críticos.');enemyAfterDelay(set,get)}},
  itemSkill:()=>{ const s=get(); if(s.itemSkillUsed||!s.playerTurn||s.animating||!s.enemy)return; const equippedIds=Object.values(s.equipped) as (string|undefined)[]; const item=equippedIds.map(id=>eqById(id)).find(e=>e?.habilidade); if(!item){addLog(set,'Nenhum equipamento com habilidade ativa.');return} set({itemSkillUsed:true}); const txt=item.habilidade.toLowerCase(); if(txt.includes('escudo')){set({shield:s.shield+3});addLog(set,`${item.nome}: +3 Escudo.`);enemyAfterDelay(set,get);return} if(txt.includes('recupere')){const m=maxHp(s);set({hp:Math.min(m,s.hp+4)});addLog(set,`${item.nome}: recuperou 4 de vida.`);enemyAfterDelay(set,get);return} playerAttack(set,get,item.nome,3,true) },
  useConsumable:(id:string)=>{ const s=get(),it=CONSUMABLES.find(x=>x.id===id);if(!it||(s.inventory[id]??0)<=0)return;if(s.screen==='combat'&&(!s.playerTurn||s.animating||!s.enemy))return;const inv={...s.inventory,[id]:(s.inventory[id]??0)-1};if(inv[id]<=0)delete inv[id];let resultMessage=`${it.nome} utilizado.`;if(it.tipo==='cura')set({inventory:inv,hp:Math.min(maxHp(s),s.hp+it.valor)});else if(it.tipo==='vida_max'){const success=Math.random()<(LIFE_CHANCE[id]??.35);if(success){const newMax=maxHp(s)+it.valor,newHp=id==='elixir_fenix'?newMax:Math.min(newMax,s.hp+it.valor);resultMessage=`${it.nome}: sucesso! Vida máxima aumentada permanentemente em ${it.valor}.`;set({inventory:inv,attr:{...s.attr,vida:s.attr.vida+it.valor},hp:newHp,explorationNote:resultMessage})}else{resultMessage=`${it.nome}: a tentativa falhou e a vida máxima não aumentou.`;set({inventory:inv,explorationNote:resultMessage})}}else if(it.tipo==='escudo')set({inventory:inv,shield:s.shield+it.valor});else if(it.tipo==='regen_boost'){resultMessage=`${it.nome}: cura acelerada ativada.`;set({inventory:inv,explorationNote:resultMessage})}else{resultMessage=`${it.nome}: +${it.valor} de ataque até o fim do próximo combate.`;set({inventory:inv,pendingAttackBonus:s.pendingAttackBonus+Math.max(1,it.valor),explorationNote:resultMessage})}if(s.screen==='combat'){addLog(set,resultMessage);enemyAfterDelay(set,get)} },
  flee:()=>{const s=get();if(!s.playerTurn||s.animating)return;const roll=Math.floor(Math.random()*6)+1;const outcome:FleeRoll['outcome']=roll>=5?'success':roll===4?'neutral':'failed';set({animating:true,playerTurn:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:{roll,outcome}});addLog(set,roll>=5?`Fuga: dado ${roll}. Você conseguiu escapar!`:roll===4?'Fuga: dado 4. Você não escapou, mas manteve sua ação.':`Fuga: dado ${roll}. A tentativa falhou e você perdeu o turno.`);setTimeout(()=>{const current=get();if(current.screen!=='combat'||!current.enemy)return;if(outcome==='success'){set({screen:current.subregionId?'region':'map',subregionId:undefined,explorationNote:undefined,enemy:undefined,pendingAttackBonus:0,shield:0,animating:false,fleeRoll:undefined,heroRollBonus:0,enemyRollBonus:0});return}if(outcome==='neutral'){set({animating:false,playerTurn:true,fleeRoll:undefined});return}set({fleeRoll:undefined});enemyAfterDelay(set,get)},COMBAT_ROLL_DISPLAY_MS)},
  buyConsumable:(id:string)=>{const s=get(),it=CONSUMABLES.find(x=>x.id===id),key=`consumable:${id}`,known=s.discoveredCards??[];if(!it||s.gold<it.preco)return;set({gold:s.gold-it.preco,inventory:{...s.inventory,[id]:(s.inventory[id]??0)+1},discoveredCards:known.includes(key)?known:[...known,key]})},
  buyEquipment:(id:string)=>{const s=get(),e=eqById(id),key=`equipment:${id}`,known=s.discoveredCards??[];if(!e||!equipmentClassAllowed(e,s.heroId)||!equipmentLevelAllowed(e,s.xp)||s.gold<e.preco||s.equipmentBag.length>=equipmentBagCapacity(s))return;set({gold:s.gold-e.preco,equipmentBag:[...s.equipmentBag,id],discoveredCards:known.includes(key)?known:[...known,key]})},
  sellConsumable:(id:string)=>{const s=get(),it=CONSUMABLES.find(x=>x.id===id);if(!it||(s.inventory[id]??0)<=0)return;const inv={...s.inventory,[id]:(s.inventory[id]??0)-1};if(inv[id]<=0)delete inv[id];set({inventory:inv,gold:s.gold+Math.max(1,Math.floor(it.preco/2))})},
  sellEquipment:(id:string)=>{const s=get(),idx=s.equipmentBag.indexOf(id),e=eqById(id);if(idx<0||!e)return;const bag=[...s.equipmentBag];bag.splice(idx,1);set({equipmentBag:bag,gold:s.gold+Math.max(1,Math.floor(e.preco/2))})},
  equip:(id:string)=>{const s=get(),e=eqById(id);if(!e||!equipmentClassAllowed(e,s.heroId)||!equipmentLevelAllowed(e,s.xp))return;const idx=s.equipmentBag.indexOf(id);if(idx<0)return;let slot=e.slot; if(slot==='anel_1'&&s.equipped.anel_1) slot='anel_2'; if(slot==='mao_esquerda'&&equipmentWeaponClass(eqById(s.equipped.mao_direita))==='facas')return; const old=s.equipped[slot]; const bag=[...s.equipmentBag];bag.splice(idx,1);if(old)bag.push(old);const equipped={...s.equipped,[slot]:id};if(slot==='mao_direita'&&equipmentWeaponClass(e)==='facas'&&equipped.mao_esquerda){bag.push(equipped.mao_esquerda);delete equipped.mao_esquerda}if(slot==='bolsa'&&bag.length>(e.capacidade??8))return;set({equipmentBag:bag,equipped})},
  unequip:(slot:Slot)=>{const s=get(),id=s.equipped[slot];if(!id||slot==='bolsa'||s.equipmentBag.length>=equipmentBagCapacity(s))return;const eq={...s.equipped};delete eq[slot];set({equipped:eq,equipmentBag:[...s.equipmentBag,id]})},
  addAttribute:(k:'vida'|'ataque'|'defesa')=>{const s=get();if(s.attributePoints<=0)return;set({attributePoints:s.attributePoints-1,attr:{...s.attr,[k]:s.attr[k]+1},allocatedAttr:{...s.allocatedAttr,[k]:s.allocatedAttr[k]+1},hp:k==='vida'?s.hp+1:s.hp})},
  setSelectedGallery:(selectedGallery:number)=>set({selectedGallery}),
  toggleShopMode:()=>set({shopMode:get().shopMode==='buy'?'sell':'buy'}),
  resolveEvent:(accept:boolean,approach?:'class')=>{const s=get(),known=s.discoveredCards??[],key=s.currentEvent&&`event:${s.currentEvent.id}`;if(key&&!known.includes(key))set({discoveredCards:[...known,key]});resolveExplorationEvent(set,get,accept,approach)},
  finishEvent:()=>{const result=get().eventResult;set({screen:'region',currentEvent:undefined,eventResult:undefined,explorationNote:result?.message})},
  finishLoot:()=>set({screen:get().subregionId?'region':'map',subregionId:undefined,explorationNote:undefined,enemy:undefined,enemyHp:0,combatLog:[],coin:undefined,playerTurn:false,animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,heroRollBonus:0,enemyRollBonus:0,heroSkillUsed:false,itemSkillUsed:false,shield:0,pendingAttackBonus:0,dungeonActive:false,dungeonDepth:0}),
  clearSave:()=>set({screen:'menu',heroId:undefined,hp:0,gold:0,xp:0,inventory:{},equipmentBag:[],equipped:{},territory:'Planícies de Alvora',regionId:'campos_dourados',subregionId:undefined,victories:{},subregionVictories:{},bossesDefeated:[],subregionBossesDefeated:[],currentEvent:undefined,eventResult:undefined,pendingAttackBonus:0,campaigns:{},activeCampaignId:undefined}),
  addCustomCard:(card:Omit<CustomCard,'id'|'criadoEm'>)=>{const s=get();set({customCards:[...s.customCards,{...card,id:`custom_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,criadoEm:Date.now()}]})},
  removeCustomCard:(id:string)=>{const s=get();set({customCards:s.customCards.filter((c:CustomCard)=>c.id!==id)})}
  ,setDifficulty:(difficultyMode:DifficultyMode)=>set({difficultyMode})
  ,unlockTalent:(id:string)=>{const s=get(),talent=TALENTS.find(t=>t.id===id),level=deriveLevel(s.xp).lvl;if(!talent||level<talent.level||s.talents.includes(id))return;set({talents:[...s.talents,id]})}
  ,craftEquipment:(recipeId?:string)=>{const s=get(),recipe=FORGE_RECIPES.find(r=>r.id===recipeId),item=recipe&&eqById(recipe.equipmentId),required=recipe?forgeRecipeLevel(recipe.id):99,forgeXp=s.forgeXp??0;if(!recipe||!item||forgeLevelInfo(forgeXp).level<required||s.equipmentBag.length>=equipmentBagCapacity(s)||!equipmentClassAllowed(item,s.heroId)||Object.entries(recipe.materials).some(([id,qty])=>(s.materials[id]??0)<qty))return;const materials={...s.materials},success=Math.random()<forgeSuccessChance(recipe.id,forgeXp),xpGain=success?18+required*7:8+required*3;for(const [id,qty] of Object.entries(recipe.materials))materials[id]-=success?qty:Math.max(1,Math.ceil(qty/2));set({materials,forgeXp:forgeXp+xpGain,forgeAttempts:(s.forgeAttempts??0)+1,forgeSuccesses:(s.forgeSuccesses??0)+(success?1:0),...(success?{equipmentBag:[...s.equipmentBag,item.id],craftedEffects:recipe.effect?{...s.craftedEffects,[item.id]:recipe.effect}:s.craftedEffects}:{}),explorationNote:success?`Forja bem-sucedida: ${recipe.nome}. +${xpGain} XP de Forja.`:`A fabricação de ${recipe.nome} falhou. Metade dos materiais foi perdida, mas você ganhou +${xpGain} XP de Forja.`})}
  ,upgradeEquipment:(id:string)=>{const s=get(),item=eqById(id),level=s.equipmentUpgrades[id]??0,cost=10+(level+1)*10;if(!item||level>=3||s.gold<cost)return;set({gold:s.gold-cost,equipmentUpgrades:{...s.equipmentUpgrades,[id]:level+1},explorationNote:`${item.nome} aprimorado para +${level+1}.`})}
  ,dismantleEquipment:(id:string)=>{const s=get(),index=s.equipmentBag.indexOf(id),item=eqById(id);if(index<0||!item)return;const yieldInfo=dismantlePreview(item),materials={...s.materials,fragmento_fisico:(s.materials.fragmento_fisico??0)+yieldInfo.physical,essencia_magica:(s.materials.essencia_magica??0)+yieldInfo.magical},installed=s.equipmentGems[id]??[];for(const gem of installed)materials[gem]=(materials[gem]??0)+1;let gemName='';if(Math.random()<yieldInfo.gemChance){const gem=FORGE_GEMS[Math.floor(Math.random()*FORGE_GEMS.length)];materials[gem.id]=(materials[gem.id]??0)+1;gemName=` • Pedra encontrada: ${gem.nome}`};const bag=[...s.equipmentBag];bag.splice(index,1);const equipmentGems={...s.equipmentGems};delete equipmentGems[id];set({equipmentBag:bag,equipmentGems,materials,explorationNote:`${item.nome} desmontado: +${yieldInfo.physical} fragmentos físicos, +${yieldInfo.magical} essências mágicas${gemName}.`})}
  ,socketGem:(equipmentId:string,gemId:string)=>{const s=get(),item=eqById(equipmentId),installed=s.equipmentGems[equipmentId]??[];if(!item||!Object.values(s.equipped).includes(equipmentId)||installed.length>=equipmentSocketCount(item)||(s.materials[gemId]??0)<=0||!FORGE_GEMS.some(g=>g.id===gemId))return;set({materials:{...s.materials,[gemId]:s.materials[gemId]-1},equipmentGems:{...s.equipmentGems,[equipmentId]:[...installed,gemId]},explorationNote:`Pedra instalada em ${item.nome}.`})}
  ,removeGem:(equipmentId:string,index:number)=>{const s=get(),installed=[...(s.equipmentGems[equipmentId]??[])],gemId=installed[index];if(!gemId)return;installed.splice(index,1);set({materials:{...s.materials,[gemId]:(s.materials[gemId]??0)+1},equipmentGems:{...s.equipmentGems,[equipmentId]:installed},explorationNote:'Pedra removida e devolvida ao inventário.'})}
  ,startDungeon:()=>{const s=get(),sub=SUBREGIONS.find(x=>x.regionId===s.regionId)??SUBREGIONS[0],depth=(s.dungeonActive?s.dungeonDepth:0)+1;const enemy=difficultyEnemy(depth%5===0?buildBoss(sub):buildEnemy(sub,deriveLevel(s.xp).lvl+depth),s.difficultyMode);beginCombat(set,get,{...enemy,nome:`Masmorra ${depth}: ${enemy.nome}`,vida:Math.ceil(enemy.vida*(1+depth*.12)),ouro:Math.ceil(enemy.ouro*(1+depth*.18)),dungeon:true});set({dungeonDepth:depth,dungeonActive:true})}
  ,leaveDungeon:()=>set({screen:'map',subregionId:undefined,dungeonActive:false,dungeonDepth:0,loot:undefined,explorationNote:'Expedição encerrada. Os espólios conquistados foram preservados.'})
  ,startRevenge:(subregionId:string)=>{const s=get(),sub=SUBREGIONS.find(x=>x.id===subregionId);if(!sub||!s.subregionBossesDefeated.includes(subregionId))return;set({subregionId,regionId:sub.regionId,territory:sub.nome,screen:'bossIntro',enemy:buildRevengeBoss(sub,s.revengeWins[subregionId]??0)})}
  ,chooseStory:(choiceId:string)=>{const s=get(),chapter=STORY_CHAPTERS.find(c=>c.id===s.storyChapterId),choice=chapter?.choices.find(c=>c.id===choiceId),progress=storyRequirementProgress(s);if(!chapter||!choice||!progress.complete)return;const materials={...s.materials};if(choice.material)materials[choice.material]=(materials[choice.material]??0)+1;set({storyChapterId:choice.next,storyChoices:{...s.storyChoices,[chapter.id]:choice.id},storyFlags:s.storyFlags.includes(`historia:${choice.id}`)?s.storyFlags:[...s.storyFlags,`historia:${choice.id}`],gold:s.gold+(choice.gold??0),materials,storyNotice:choice.consequence})}
}),{name:'bangalores-save-v1',merge:(persisted:any,current:any)=>{const merged={...current,...persisted,equipped:{...(persisted?.equipped??{}),bolsa:persisted?.equipped?.bolsa??'mochila_pequena_8'},regionId:persisted?.regionId??'campos_dourados',world:persisted?.world??'havendown',subregionVictories:persisted?.subregionVictories??{},subregionBossesDefeated:persisted?.subregionBossesDefeated??[],pendingAttackBonus:persisted?.pendingAttackBonus??0,currentEvent:persisted?.currentEvent,eventResult:persisted?.eventResult,customCards:persisted?.customCards??[],campaigns:persisted?.campaigns??{},guildAccepted:persisted?.guildAccepted??[],guildProgress:persisted?.guildProgress??{},guildClaimed:persisted?.guildClaimed??[],difficultyMode:persisted?.difficultyMode??'veterano',talents:persisted?.talents??[],materials:persisted?.materials??{},equipmentUpgrades:persisted?.equipmentUpgrades??{},equipmentGems:persisted?.equipmentGems??{},craftedEffects:persisted?.craftedEffects??{},bestiary:persisted?.bestiary??{},revengeWins:persisted?.revengeWins??{},dungeonDepth:persisted?.dungeonDepth??0,dungeonActive:persisted?.dungeonActive??false,storyFlags:persisted?.storyFlags??[],storyChapterId:persisted?.storyChapterId??'prologo',storyChoices:persisted?.storyChoices??{},storyNotice:persisted?.storyNotice,guildNotice:undefined,animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,playerTurn:persisted?.screen==='combat'&&persisted?.enemy?true:(persisted?.playerTurn??false)};Object.assign(merged,normalizeAttributes(merged));if(merged.heroId&&!merged.activeCampaignId){const id=`campaign_legacy_${Date.now()}`;merged.activeCampaignId=id;merged.campaigns={...merged.campaigns,[id]:campaignSnapshot(merged)}}return merged}}))

function stats(s:GameState){const h=HEROES.find(x=>x.id===s.heroId);let atk=(h?.ataque??0)+s.attr.ataque+s.pendingAttackBonus+(s.talents?.includes('precisao')?1:0),life=(h?.vida??0)+s.attr.vida+(s.talents?.includes('vigor')?5:0),def=s.attr.defesa+(s.talents?.includes('muralha')?1:0);Object.values(s.equipped).forEach(id=>{const e=eqById(id);if(e){const up=s.equipmentUpgrades?.[e.id]??0;atk+=equipmentAttackForHero(e,s.heroId)+(e.ataque?up:0);life+=e.vida+up;def+=e.defesa+(e.defesa?Math.floor((up+1)/2):0);for(const gemId of s.equipmentGems?.[e.id]??[]){const gem=FORGE_GEMS.find(g=>g.id===gemId);if(gem?.stat==='ataque')atk+=gem.value;if(gem?.stat==='defesa')def+=gem.value;if(gem?.stat==='vida')life+=gem.value}}});const sets=equipmentSetCounts(s);if(sets.lua>=2)def+=1;if(sets.lua>=4)life+=4;if(sets.cinzas>=2)atk+=1;if(sets.khar>=2)life+=3;if(sets.eclipse>=2)atk+=1;if(equipmentWeaponClass(eqById(s.equipped.mao_direita))==='facas'&&!s.equipped.mao_esquerda)atk+=FACAS_OFFHAND_ATTACK_BONUS;return{atk,life,def}}
export function maxHp(s:GameState){return stats(s).life}
export function attackValue(s:GameState){const base=stats(s).atk;return Math.ceil(base*(1+(s.combatAttackPct??0)))}
export function defenseValue(s:GameState){const base=stats(s).def;return Math.ceil(base*(1+(s.combatDefensePct??0)))+(s.screen==='combat'&&s.heroId==='guardiao'?2:0)}
export function levelInfo(xp:number){return deriveLevel(xp)}

function advanceExploration(s:GameState){
 const id=s.subregionId
 return id?{...s.subregionVictories,[id]:(s.subregionVictories[id]??0)+1}:s.subregionVictories
}

function resolveExplorationEvent(set:any,get:any,accept:boolean,approach?:'class'){
 const s=get() as GameState
 const event=s.currentEvent
 if(!event||s.eventResult)return
 const progress=advanceExploration(s)
 if(!accept){set({subregionVictories:progress,eventResult:{message:`Você evitou ${event.nome} e seguiu viagem. A exploração avançou.`,tone:'neutral'}});return}

 const roll=Math.min(6,Math.floor(Math.random()*6)+1+(approach==='class'?1:0))
 const flags=s.storyFlags.includes(event.nome)?s.storyFlags:[...s.storyFlags,event.nome]
 const common={subregionVictories:progress,storyFlags:flags}
 if(event.tipo==='ouro'){set({...common,gold:s.gold+event.valor,eventResult:{message:`Missão concluída: +${event.valor} de ouro.`,roll,tone:'good'}});return}
 if(event.tipo==='dano'){const damage=Math.min(Math.max(0,s.hp-1),event.valor);set({...common,hp:s.hp-damage,eventResult:{message:damage?`O perigo cobrou seu preço: -${damage} de vida.`:'Você escapou por pouco e não perdeu vida.',roll,tone:damage?'bad':'neutral'}});return}
 if(event.tipo==='cura'){const healed=Math.min(event.valor,Math.max(0,maxHp(s)-s.hp));set({...common,hp:s.hp+healed,eventResult:{message:`Você recebeu ajuda e recuperou ${healed} de vida.`,roll,tone:'good'}});return}
 if(event.tipo==='escudo'){set({...common,shield:s.shield+event.valor,eventResult:{message:`Aliado conquistado: +${event.valor} de escudo para o próximo combate.`,roll,tone:'good'}});return}
 if(event.tipo==='ataque'){set({...common,pendingAttackBonus:s.pendingAttackBonus+event.valor,eventResult:{message:`Bênção de combate: +${event.valor} de ataque no próximo combate.`,roll,tone:'good'}});return}
 if(event.tipo==='dano_ouro'){const damage=Math.min(Math.max(0,s.hp-1),1);set({...common,hp:s.hp-damage,gold:s.gold+event.valor,eventResult:{message:`Você interrompeu o ritual: -${damage} de vida e +${event.valor} de ouro.`,roll,tone:'neutral'}});return}
 if(event.tipo==='equipamento'){
   if(s.equipmentBag.length>=equipmentBagCapacity(s)){const gold=Math.max(2,event.valor*2);set({...common,gold:s.gold+gold,eventResult:{message:`Sua mochila estava cheia; o ferreiro pagou ${gold} de ouro pelo material.`,roll,tone:'neutral'}});return}
   const pool=EQUIPMENT.filter(e=>equipmentLevelAllowed(e,s.xp)&&equipmentClassAllowed(e,s.heroId));const equipment=pool[Math.floor(Math.random()*pool.length)]??EQUIPMENT[0];set({...common,equipmentBag:[...s.equipmentBag,equipment.id],eventResult:{message:`O ferreiro entregou: ${equipment.nome}.`,roll,tone:'good'}});return
 }
 if(event.tipo==='item'){const item=CONSUMABLES[Math.floor(Math.random()*CONSUMABLES.length)];set({...common,inventory:{...s.inventory,[item.id]:(s.inventory[item.id]??0)+1},eventResult:{message:`Você recebeu: ${item.nome}.`,roll,tone:'good'}});return}

 const success=roll>=4
 const amount=Math.max(1,event.valor)
 if(success){set({...common,gold:s.gold+amount,eventResult:{message:`Sucesso! Você recebeu ${amount} de ouro.`,roll,tone:'good'}})}
 else {const loss=Math.min(s.gold,Math.max(1,Math.ceil(amount/2)));set({...common,gold:s.gold-loss,eventResult:{message:`A tentativa falhou. Você perdeu ${loss} de ouro.`,roll,tone:'bad'}})}
}

function beginCombat(set:any,get:any,enemy:Enemy){const coin=Math.random()<.5?'cara':'coroa';const s=get() as GameState,key=enemy.nome.replace(/^Vingança \d+: /,'').replace(/^(Veterano|Elite|Campeão): /,''),discovery=`${enemy.boss?'boss':enemy.elite?'elite':'monster'}:${key}`,discoveries=s.discoveredCards??[];const known=s.bestiary[key]??{encontros:0,vitorias:0},sets=equipmentSetCounts(s),setShield=sets.khar>=4?3:0,setRoll=enemy.boss&&sets.eclipse>=4?1:0,warriorLuck=s.heroId==='guerreiro'&&Math.random()<.5;set({screen:'combat',enemy,enemyHp:enemy.vida,combatTurn:1,combatLog:[`${enemy.variante&&enemy.variante!=='Comum'?enemy.variante+' • ':''}Nível ${enemy.nivel??enemy.dificuldade}.`,`Afinidade elemental: ${enemy.elemento??(enemy.boss?'sombra':'físico')}.`,...(s.heroId==='guardiao'?['Passivo do Guardião: +2 de Defesa.']:[]),...(warriorLuck?['Fortuna do Guerreiro ativada: +1 em todos os dados nesta batalha.']:[]),...(setShield?[`Conjunto de Kholgard: +${setShield} de escudo inicial.`]:[]),...(setRoll?[`Conjunto do Sol Negro: +1 nas rolagens contra chefes.`]:[]),`Moeda: ${coin.toUpperCase()}. ${coin==='cara'?'Você':'Inimigo'} começa.`],coin,playerTurn:coin==='cara',animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,heroRollBonus:(s.talents.includes('destino')?1:0)+setRoll+(warriorLuck?1:0),enemyRollBonus:0,heroSkillUsed:false,itemSkillUsed:false,shield:s.shield+setShield,combatAttackPct:0,combatDefensePct:0,extraHeroAttacks:0,guardianTaunt:false,bestiary:{...s.bestiary,[key]:{...known,encontros:known.encontros+1}},discoveredCards:discoveries.includes(discovery)?discoveries:[...discoveries,discovery]});if(coin==='coroa')setTimeout(()=>enemyAttack(set,get),800)}
function addLog(set:any,msg:string){set((s:GameState)=>({combatLog:[...s.combatLog.slice(-12),msg]}))}
function summonBossMinions(enemy:Enemy,phase:number):CombatMinion[]{const count=Math.min(2,phase),level=enemy.nivel??enemy.dificuldade??1,hp=Math.max(4,Math.ceil(enemy.vida*.14)),attack=Math.max(2,Math.ceil(enemy.ataque*.45));return Array.from({length:count},(_,index)=>({id:`minion_${phase}_${index}_${Date.now()}`,nome:index?'Capanga veterano':'Capanga do chefe',hp,maxHp:hp,ataque:attack+Math.floor(level/8)}))}
const COMBAT_ROLL_DISPLAY_MS=2500
function attackEffect(roll:number){return roll===1?'Falha crítica':roll===2?'Ataque desajeitado':roll<=4?'Ataque normal':roll===5?'Ataque forte':'Ataque crítico'}
function defenseEffect(roll:number){return roll===1?'Falha crítica':roll===2?'Defesa fraca':roll<=4?'Defesa normal':roll===5?'Defesa forte':'Defesa perfeita'}
const HERO_ATTACK_FLAVOR:Record<string,((arma:string)=>string)[]>={
 guerreiro:[arma=>`avança com fúria e crava ${arma} no inimigo`,arma=>`golpeia com força bruta usando ${arma}`,arma=>`ruge um grito de guerra e ataca com ${arma}`,arma=>`avança sem hesitar e desfere um corte selvagem com ${arma}`],
 guardiao:[arma=>`avança com o escudo à frente e golpeia com ${arma}`,arma=>`bloqueia o caminho do inimigo e retribui com ${arma}`,arma=>`protege a linha de frente e contra-ataca com ${arma}`,arma=>`firma os pés no chão e golpeia com ${arma}`],
 cacadora:[arma=>`desliza pelas sombras e ataca com ${arma}`,arma=>`golpeia com agilidade felina usando ${arma}`,arma=>`aproveita uma brecha e acerta com ${arma}`,arma=>`ataca com precisão letal usando ${arma}`],
 cacador:[arma=>`mira com precisão e ataca com ${arma}`,arma=>`avança em silêncio e golpeia com ${arma}`,arma=>`aproveita uma abertura e acerta com ${arma}`,arma=>`ataca com instinto de caçador usando ${arma}`],
 arcanista:[arma=>`conjura energia arcana e golpeia com ${arma}`,arma=>`canaliza poder arcano e ataca com ${arma}`,arma=>`tece um feitiço rápido e golpeia com ${arma}`,arma=>`libera uma explosão de magia com ${arma}`],
 druida:[arma=>`invoca a fúria da natureza e ataca com ${arma}`,arma=>`canaliza o poder de Abdendriel e golpeia com ${arma}`,arma=>`ataca com a força selvagem da floresta usando ${arma}`,arma=>`golpeia com a energia da terra usando ${arma}`],
}
function pick<T>(arr:T[]){return arr[Math.floor(Math.random()*arr.length)]}
function heroApproachPhrase(heroId:string|undefined,weapon:string|undefined){
 const arma=weapon??'as próprias mãos',pool=HERO_ATTACK_FLAVOR[heroId??'']??HERO_ATTACK_FLAVOR.guerreiro
 return pick(pool)(arma)
}
const ATTACK_TIER_PHRASE:Record<number,string[]>={
 1:['mas o golpe sai desastrado e acerta o próprio corpo','mas escorrega e o golpe se volta contra si mesmo','mas perde o equilíbrio e sofre com o próprio ataque'],
 2:['mas o golpe é desajeitado e abre uma brecha perigosa','mas erra o ângulo e deixa a guarda aberta','mas o movimento hesitante expõe uma falha na defesa'],
 3:['e o golpe acerta em cheio','e o ataque conecta normalmente','e acerta o alvo sem dificuldade'],
 4:['e o golpe acerta em cheio','e o ataque conecta normalmente','e acerta o alvo sem dificuldade'],
 5:['e desfere um golpe forte e preciso','e acerta com força extra','e o golpe conecta com potência redobrada'],
 6:['e acerta um golpe absolutamente certeiro e devastador','e o ataque é um sucesso absoluto, decisivo','e desfere um golpe crítico impecável'],
}
function attackTierPhrase(roll:number){return pick(ATTACK_TIER_PHRASE[roll]??ATTACK_TIER_PHRASE[3])}
const DEFENSE_TIER_PHRASE:Record<number,string[]>={
 1:['erra completamente a defesa e sofre o golpe em cheio','falha a guarda e é pego em cheio pelo ataque','não consegue reagir a tempo e recebe o golpe com força total'],
 2:['ergue uma defesa fraca e absorve pouco do impacto','reage tarde demais e bloqueia só parte do golpe','vacila na guarda e deixa o ataque quase intacto'],
 3:['bloqueia o ataque normalmente','consegue se defender sem dificuldade','absorve o golpe com uma defesa sólida'],
 4:['bloqueia o ataque normalmente','consegue se defender sem dificuldade','absorve o golpe com uma defesa sólida'],
 5:['reage a tempo e reduz o impacto do golpe','apara boa parte do ataque com uma defesa firme','consegue amortecer o golpe com eficiência'],
 6:['realiza uma defesa perfeita e neutraliza quase todo o impacto','bloqueia com uma técnica impecável, cortando o dano pela metade','ergue uma guarda impecável e minimiza o estrago'],
}
function defenseTierPhrase(roll:number){return pick(DEFENSE_TIER_PHRASE[roll]??DEFENSE_TIER_PHRASE[3])}
const ENEMY_ATTACK_FLAVOR:[RegExp,string[]][]=[
 [/lobo|urso|fera|felino|c[ãa]o\b|corvo|ave\b|besta|javali/,['salta e morde com fúria animal','rosna e investe com presas afiadas','ataca com instinto selvagem','avança em silêncio e golpeia com garras']],
 [/goblin|bandid|salteador|mercen[áa]ri|guarda|cultista|fan[áa]tic|ladr[ãa]o|pirata|capit[ãa]o/,['avança gritando e golpeia sem cuidado','ataca com uma arma improvisada','investe com selvageria tosca','ri com escárnio e ataca']],
 [/drag[ãa]o|draconato|wyrm|filhote/,['solta um rugido e ataca com garras flamejantes','golpeia com a cauda e cospe brasas','avança com fúria draconiana','abre as asas e mergulha em ataque']],
 [/esquelet|zumbi|morto|espectro|fantasma|necro|sombra/,['avança com movimentos rígidos e sinistros','golpeia com uma força além da morte','desliza como sombra e ataca','ergue os braços e golpeia com um gemido gélido']],
 [/aranha|inseto|verme|escorpi/,['ataca com presas venenosas','golpeia com múltiplas patas afiadas','envolve o alvo em fios pegajosos e ataca']],
 [/golem|sentinela|guardi[ãa]o|guardi[ãa]|magma|pedra|metal|ferro|armadura/,['avança com passos pesados e golpeia','desfere um golpe lento mas devastador','ataca com força bruta e mecânica']],
 [/ilusionista|arcano|feiticeir|mago|xam[ãa]/,['conjura energia sombria e ataca','canaliza um feitiço rápido e golpeia','tece uma ilusão e ataca de surpresa']],
]
const ENEMY_BOSS_FLAVOR=['avança com fúria implacável e ataca','solta um rugido ensurdecedor antes do golpe','ataca com toda a força de um chefe da região','concentra poder sombrio e desfere um golpe devastador']
function enemyApproachPhrase(enemy:Enemy){
 const nome=enemy.nome.toLocaleLowerCase('pt-BR'),categoria=ENEMY_ATTACK_FLAVOR.find(([regex])=>regex.test(nome))?.[1]??['avança e golpeia sem hesitar','ataca com selvageria','desfere um golpe rápido']
 const pool=enemy.boss?[...categoria,...ENEMY_BOSS_FLAVOR]:categoria
 return pick(pool)
}
export function resolveCombatRoll(attackBase:number,defenseBase:number,attackRoll:number,defenseRoll:number){
 if(attackRoll===1)return{damage:0,selfDamage:Math.max(1,Math.floor(attackBase*.2))}
 const effectiveAttack=attackBase+(attackRoll===5?1:0)
 let damage=Math.max(1,effectiveAttack-defenseBase)
 if(attackRoll===6)damage=Math.max(1,Math.floor(damage*1.5))
 if(defenseRoll===1)damage=Math.max(1,Math.floor(damage*1.5))
 else if(defenseRoll===2)damage+=1
 else if(defenseRoll===5)damage=Math.max(0,damage-1)
 else if(defenseRoll===6)damage=Math.floor(damage*.5)
 return{damage,selfDamage:0}
}
function applyDefeatPenalty(set:any,get:any,reason='Você foi derrotado.'){
 const s=get() as GameState
 const goldLost=Math.min(s.gold,Math.ceil(s.gold*.3))
 const eligible=(Object.entries(s.equipped) as [Slot,string][]).filter(([,id])=>Boolean(id))
 const lostEntry=eligible.length&&Math.random()<.2?eligible[Math.floor(Math.random()*eligible.length)]:undefined
 const equipped={...s.equipped}
 let equipmentBag=[...s.equipmentBag]
 const equipmentUpgrades={...s.equipmentUpgrades},equipmentGems={...s.equipmentGems},craftedEffects={...s.craftedEffects}
 let itemMessage='Nenhum equipamento foi perdido.'
 if(lostEntry){
  const [slot,id]=lostEntry
  delete equipped[slot]
  const storedLost=slot==='bolsa'?[...equipmentBag]:[]
  if(slot==='bolsa')equipmentBag=[]
  const remainingEquipped=new Set(Object.values(equipped))
  for(const lostId of [id,...storedLost])if(!remainingEquipped.has(lostId)){delete equipmentUpgrades[lostId];delete equipmentGems[lostId];delete craftedEffects[lostId]}
  itemMessage=slot==='bolsa'
   ?`A bolsa ${eqById(id)?.nome??id} foi perdida com ${storedLost.length} equipamento${storedLost.length===1?'':'s'} armazenado${storedLost.length===1?'':'s'}. Os consumíveis foram preservados.`
   :`O equipamento ${eqById(id)?.nome??id} foi perdido, incluindo suas melhorias e encaixes.`
 }
 const recovered={...s,equipped,gold:s.gold-goldLost,hp:0} as GameState
 const recoveredHp=maxHp(recovered)
 const penalty=`Derrota: você perdeu ${goldLost} moedas de ouro. ${itemMessage} Após o resgate, sua vida foi restaurada para ${recoveredHp}/${recoveredHp}.`
 addLog(set,`${reason} ${penalty}`)
 set({screen:s.subregionId?'region':'map',subregionId:undefined,explorationNote:penalty,gold:s.gold-goldLost,equipped,equipmentBag,equipmentUpgrades,equipmentGems,craftedEffects,hp:recoveredHp,enemy:undefined,enemyHp:0,combatMinions:[],pendingAttackBonus:0,shield:0,combatRoll:undefined,fleeRoll:undefined,heroRollBonus:0,enemyRollBonus:0,animating:false,animationActor:undefined,lastDamage:undefined,playerTurn:false})
}
function playerAttack(set:any,get:any,label:string,bonus=0,alreadyAnimating=false){
 const s=get() as GameState
 if(!s.enemy||!s.playerTurn||s.animating&&!alreadyAnimating)return
 const attackBase=attackValue(s)+bonus,defenseBase=Math.max(0,(s.enemy.dificuldade??1)-2),naturalAttackRoll=Math.floor(Math.random()*6)+1,attackBonus=s.heroRollBonus+(s.classRollBonus??0),attackRoll=Math.min(6,naturalAttackRoll+attackBonus+((hasCraftedEffect(s,'critico')||s.groupCriticalBoost)&&naturalAttackRoll===5?1:0)),defenseRoll=Math.floor(Math.random()*6)+1
 const {damage,selfDamage}=resolveCombatRoll(attackBase,defenseBase,attackRoll,defenseRoll)
 const combatRoll:CombatRoll={attacker:'hero',naturalAttackRoll,attackRoll,attackBonus,defenseRoll,attackBase,defenseBase,attackEffect:attackEffect(attackRoll),defenseEffect:defenseEffect(defenseRoll),damage,selfDamage}
 set({animating:true,playerTurn:false,animationActor:selfDamage?'enemy':'hero',lastDamage:selfDamage||damage,combatRoll,heroRollBonus:0,enemyRollBonus:attackRoll===2?1:s.enemyRollBonus})
 const heroName=HEROES.find(h=>h.id===s.heroId)?.nome??'O herói',weaponName=eqById(s.equipped.mao_direita)?.nome,narration=`${heroApproachPhrase(s.heroId,weaponName)}, ${attackTierPhrase(attackRoll)}`
 const defenseNarration=selfDamage?'':` ${s.enemy.nome} ${defenseTierPhrase(defenseRoll)}.`
 addLog(set,`${heroName} ${narration}.${defenseNarration} ${label}: dado ${attackRoll} (${attackEffect(attackRoll)}) contra defesa ${defenseRoll} (${defenseEffect(defenseRoll)}). ${selfDamage?`Recebeu ${selfDamage} de dano.`:`Causou ${damage} de dano.`}${attackRoll===2?' Inimigo recebe +1 na próxima rolagem.':''}`)
 setTimeout(()=>{
  const now=get() as GameState,en=now.enemy
  if(!en){set({animating:false,playerTurn:false,animationActor:undefined,lastDamage:undefined});return}
  if(selfDamage){const heroHp=Math.max(0,now.hp-selfDamage);set({hp:heroHp});if(heroHp<=0)setTimeout(()=>applyDefeatPenalty(set,get,'Você sucumbiu após uma falha crítica.'),900);else enemyAfterDelay(set,get);return}
  const minions=[...(now.combatMinions??[])],interceptor=minions.find(minion=>minion.hp>0),intercepted=Boolean(interceptor&&damage>0&&Math.random()<.45)
  if(intercepted&&interceptor){interceptor.hp=Math.max(0,interceptor.hp-damage);set({combatMinions:minions});addLog(set,`${interceptor.nome} entrou na frente e recebeu ${damage} de dano${interceptor.hp<=0?', sendo derrotado':''}.`);enemyAfterDelay(set,get);return}
  const hp=now.enemyHp-damage
  if(en.boss&&en.maxFases&&hp>0){const threshold=en.vida*(1-(en.fase??1)/en.maxFases);if((en.fase??1)<en.maxFases&&hp<=threshold){const nf=(en.fase??1)+1,minions=summonBossMinions(en,nf);set({enemy:{...en,fase:nf,ataque:en.ataque+1},enemyHp:Math.max(hp,1),combatMinions:minions});addLog(set,`FASE ${nf}! ${en.nome} invocou ${minions.length} capanga${minions.length>1?'s':''}. Cada um terá seu próprio ataque.`);enemyAfterDelay(set,get);return}}
  if(hp<=0)victory(set,get);else if(now.extraHeroAttacks>0){set({enemyHp:hp,extraHeroAttacks:now.extraHeroAttacks-1,animating:false,playerTurn:true,animationActor:undefined,lastDamage:undefined,combatRoll:undefined});addLog(set,'Ataque Duplo: realize o segundo ataque.')}else{set({enemyHp:hp});enemyAfterDelay(set,get)}
 },COMBAT_ROLL_DISPLAY_MS)
}
function runEnemyAttack(set:any,get:any){const current=get() as GameState;if(!current.enemy){set({animating:false,playerTurn:false,animationActor:undefined,lastDamage:undefined});return}enemyAttack(set,get)}
function enemyAfterDelay(set:any,get:any){const enemyId=(get() as GameState).enemy?.id;set({animating:true,playerTurn:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined});setTimeout(()=>runEnemyAttack(set,get),650);setTimeout(()=>{const stalled=get() as GameState;if(stalled.screen==='combat'&&stalled.enemy?.id===enemyId&&stalled.animating&&!stalled.playerTurn){set({animating:false,playerTurn:true,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined});addLog(set,'Fluxo do combate recuperado. Seu turno continua.')}},COMBAT_ROLL_DISPLAY_MS+1800)}
function resolveMinionAttacks(set:any,get:any,onComplete:()=>void){const start=get() as GameState,minions=(start.combatMinions??[]).filter(minion=>minion.hp>0);if(!minions.length){onComplete();return}let index=0;const strike=()=>{const s=get() as GameState,minion=minions[index++];if(!minion||s.screen!=='combat'||s.hp<=0){onComplete();return}const defenseRoll=Math.floor(Math.random()*6)+1,resolved=resolveCombatRoll(minion.ataque,defenseValue(s),Math.floor(Math.random()*6)+1,defenseRoll),blocked=Math.min(s.shield,resolved.damage),damage=Math.max(0,resolved.damage-blocked),hp=Math.max(0,s.hp-damage);set({hp,shield:s.shield-blocked,animationActor:'enemy',lastDamage:damage});addLog(set,`${minion.nome} atacou e causou ${damage} de dano${blocked?` (${blocked} bloqueado)`:''}.`);if(hp<=0){setTimeout(()=>applyDefeatPenalty(set,get,'Você foi derrotado pelos capangas do chefe.'),700);return}if(index<minions.length)setTimeout(strike,500);else setTimeout(onComplete,450)};strike()}
function enemyAttack(set:any,get:any){
 const s=get() as GameState
 if(!s.enemy){set({animating:false,playerTurn:false,animationActor:undefined,lastDamage:undefined});return}
 const attackBase=s.enemy.ataque,defenseBase=defenseValue(s),naturalAttackRoll=Math.floor(Math.random()*6)+1,attackBonus=s.enemyRollBonus,attackRoll=Math.max(1,Math.min(6,naturalAttackRoll+attackBonus-(s.heroId==='druida'&&Math.random()<.25?1:0))),naturalDefenseRoll=Math.floor(Math.random()*6)+1,defenseRoll=Math.min(6,naturalDefenseRoll+(s.classRollBonus??0)+(hasCraftedEffect(s,'defesa_perfeita')&&naturalDefenseRoll===5?1:0))
 const dodged=(s.heroId==='cacadora'||s.heroId==='cacador')&&Math.random()<.2,resolved=resolveCombatRoll(attackBase,defenseBase,attackRoll,defenseRoll);let raw=dodged?0:resolved.damage,shield=s.shield
 const blocked=Math.min(shield,raw),enemyName=s.enemy.nome,enemyApproach=enemyApproachPhrase(s.enemy),heroName=HEROES.find(h=>h.id===s.heroId)?.nome??'Você';raw-=blocked;shield-=blocked
 const hp=Math.max(0,s.hp-raw),enemyHp=Math.max(0,s.enemyHp-resolved.selfDamage)
 const combatRoll:CombatRoll={attacker:'enemy',naturalAttackRoll,attackRoll,attackBonus,defenseRoll,attackBase,defenseBase,attackEffect:attackEffect(attackRoll),defenseEffect:defenseEffect(defenseRoll),damage:raw,selfDamage:resolved.selfDamage,shieldBlocked:blocked}
 set({shield,animating:true,animationActor:resolved.selfDamage?'hero':'enemy',lastDamage:resolved.selfDamage||raw,combatRoll,playerTurn:false,enemyRollBonus:0,heroRollBonus:attackRoll===2?1:s.heroRollBonus})
 setTimeout(()=>{
  const current=get() as GameState
  if(current.screen!=='combat'||!current.enemy)return
  if(resolved.selfDamage){addLog(set,`${enemyName} ${enemyApproach}, ${attackTierPhrase(attackRoll)}, sofrendo ${resolved.selfDamage} de dano do próprio golpe.`);if(enemyHp<=0){victory(set,get);return}set({enemyHp,hp,animating:false,animationActor:undefined,combatRoll:undefined,playerTurn:true,combatTurn:current.combatTurn+1});return}
  set({hp,animationActor:undefined,combatRoll:undefined,playerTurn:false})
  addLog(set,dodged?`${enemyName} ${enemyApproach}, mas a Esquiva do Ladino faz o golpe errar completamente.`:`${enemyName} ${enemyApproach}, ${attackTierPhrase(attackRoll)}. ${heroName} ${defenseTierPhrase(defenseRoll)}. Dado ${attackRoll} (${attackEffect(attackRoll)}) contra defesa ${defenseRoll} (${defenseEffect(defenseRoll)}); causou ${raw} de dano${blocked?` (${blocked} bloqueado)`:''}.${attackRoll===2?' Você recebe +1 na próxima rolagem.':''}`)
  if(hp<=0){setTimeout(()=>applyDefeatPenalty(set,get),900);return}resolveMinionAttacks(set,get,()=>{const latest=get() as GameState;if(latest.screen==='combat')set({animating:false,animationActor:undefined,lastDamage:undefined,playerTurn:true,combatTurn:latest.combatTurn+1})})
 },COMBAT_ROLL_DISPLAY_MS)
}
function victory(set:any,get:any){const s=get() as GameState,en=s.enemy!;const gold=en.ouro;const before=deriveLevel(s.xp).lvl;const xp=s.xp+gold;const after=deriveLevel(xp).lvl;const points=s.attributePoints+Math.max(0,after-before);const key=s.subregionId??s.territory;const victories={...s.victories,[s.territory]:(s.victories[s.territory]??0)+1};const subregionVictories={...s.subregionVictories,[key]:(s.subregionVictories[key]??0)+1};let bosses=[...s.bossesDefeated],subBosses=[...s.subregionBossesDefeated];if(en.boss){if(!bosses.includes(String(en.dificuldade)))bosses.push(String(en.dificuldade));if(s.subregionId&&!subBosses.includes(s.subregionId))subBosses.push(s.subregionId)}const enemyName=en.nome.toLocaleLowerCase('pt-BR'),regionDifficulty=TERRITORIES.find(t=>t.id===s.regionId)?.dificuldade??0,guildProgress={...s.guildProgress};for(const id of s.guildAccepted){if(s.guildClaimed.includes(id))continue;const mission=guildMissionById(id);if(!mission)continue;const matches=mission.tipo==='any'||(mission.tipo==='boss'&&Boolean(en.boss)&&(!mission.alvo||enemyName.includes(mission.alvo))&&(!mission.regiaoMinima||regionDifficulty>=mission.regiaoMinima))||(mission.tipo==='specific'&&Boolean(mission.alvo)&&enemyName.includes(mission.alvo!));if(matches)guildProgress[id]=Math.min(mission.quantidade,(guildProgress[id]??0)+1)}let equipmentBag=[...s.equipmentBag],inventory={...s.inventory};let equipmentId:string|undefined,itemId:string|undefined;if(Math.random()<monsterDropChance(en)){const equipmentPool=equipmentLootPool(en,s.heroId,after),consumablePool=consumableLootPool(en);const canStoreEquipment=equipmentBag.length<equipmentBagCapacity(s);if(Math.random()<.5&&canStoreEquipment&&equipmentPool.length){const e=equipmentPool[Math.floor(Math.random()*equipmentPool.length)];equipmentBag.push(e.id);equipmentId=e.id}else if(consumablePool.length){const i=consumablePool[Math.floor(Math.random()*consumablePool.length)];inventory[i.id]=(inventory[i.id]??0)+1;itemId=i.id}}const baseName=en.nome.replace(/^Vingança \d+: /,'').replace(/^(Veterano|Elite|Campeão): /,'');const record=s.bestiary[baseName]??{encontros:1,vitorias:0},material=REGION_MATERIALS[s.regionId]??REGION_MATERIALS.campos_dourados,materialQty=en.boss?3:en.elite?2:1;const materials={...s.materials,[material.id]:(s.materials[material.id]??0)+materialQty};const revengeWins=en.revenge&&s.subregionId?{...s.revengeWins,[s.subregionId]:(s.revengeWins[s.subregionId]??0)+1}:s.revengeWins;
const discoveredCards=[...(s.discoveredCards??[])];if(equipmentId&&!discoveredCards.includes(`equipment:${equipmentId}`))discoveredCards.push(`equipment:${equipmentId}`);if(itemId&&!discoveredCards.includes(`consumable:${itemId}`))discoveredCards.push(`consumable:${itemId}`)
set({gold:s.gold+gold,xp,attributePoints:points,victories,subregionVictories,bossesDefeated:bosses,subregionBossesDefeated:subBosses,guildProgress,equipmentBag,inventory,materials,revengeWins,discoveredCards,bestiary:{...s.bestiary,[baseName]:{...record,vitorias:record.vitorias+1}},screen:'loot',enemy:undefined,enemyHp:0,animating:false,animationActor:undefined,lastDamage:undefined,playerTurn:false,loot:{gold,xp:gold,itemId,equipmentId,title:en.revenge?'VINGANÇA CONCLUÍDA':en.boss?'CHEFE DERROTADO':en.variante==='Campeão'?'CAMPEÃO DERROTADO':'VITÓRIA'}})}
