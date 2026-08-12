import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import heroes from '../data/herois.json'
import equipments from '../data/equipamentos.json'
import consumables from '../data/itens.json'
import monsters from '../data/monstros.json'
import territories from '../data/territorios.json'
import subregions from '../data/subregioes.json'
import events from '../data/eventos.json'
import { EXTRA_EQUIPMENT, EXTRA_EVENTS, EXTRA_SUBREGION_ENEMIES } from '../data/extraContent'
import { CLASS_OFFHANDS } from '../data/offhands'
import { CLASS_HEADGEAR } from '../data/headgear'
import { CLASS_ARMOR } from '../data/armorSets'
import { CLASS_LEGWEAR } from '../data/legwear'
import { CLASS_BOOTS } from '../data/boots'
import { BACKPACKS } from '../data/backpacks'
import { EXPANDED_SUBREGIONS } from '../data/expandedSubregions'
import monsterArt from '../data/monsterArt.json'
import eventArt from '../data/eventArt.json'
import bossArt from '../data/bossArt.json'
import { DIFFICULTIES, REGION_MATERIALS, TALENTS, type DifficultyMode } from '../data/expansion'
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
})),...EXTRA_EQUIPMENT,...CLASS_OFFHANDS,...CLASS_HEADGEAR,...CLASS_ARMOR,...CLASS_LEGWEAR,...CLASS_BOOTS,...BACKPACKS]
const ITEM_PRICE_MULTIPLIER=1.6
const LIFE_CHANCE:Record<string,number>={essencia_vital:.35,elixir_fenix:.5}
export const CONSUMABLES = (consumables as Consumable[]).map(consumable=>({...consumable,preco:Math.ceil(consumable.preco*ITEM_PRICE_MULTIPLIER),descricao:consumable.tipo==='vida_max'?`${Math.round((LIFE_CHANCE[consumable.id]??.35)*100)}% de chance de aumentar permanentemente a vida máxima em ${consumable.valor}.${consumable.id==='elixir_fenix'?' Recupera toda a vida em caso de sucesso.':` Cura ${consumable.valor} em caso de sucesso.`}`:consumable.descricao,arte:hdCollectionArt(consumable.arte,'consumables')}))
const ALL_SUBREGIONS=[...(subregions as Subregion[]),...EXPANDED_SUBREGIONS]
const SUBREGIONS_LEVEL:Record<string,number>=Object.fromEntries(ALL_SUBREGIONS.map(subregion=>[subregion.id,subregion.nivelMin]))
const extraMonsters:Enemy[]=Object.entries(EXTRA_SUBREGION_ENEMIES).flatMap(([subregionId,list])=>list.map((monster,index)=>{const arte=namedMonsterArt(monster.nome,monster.arte);return{id:`extra_${subregionId}_${index}`,nome:monster.nome,ataque:monster.ataque,vida:monster.vida,ouro:monster.ouro,dificuldade:SUBREGIONS_LEVEL[subregionId]??1,habilidade:monster.habilidade,imagem:arte,arte,raridade:'incomum'}}))
export const MONSTERS = [...(monsters as Enemy[]).map(monster=>{const fallback=monster.arte?hdArt(monster.arte):monster.imagem;const arte=namedMonsterArt(monster.nome,fallback);return{...monster,imagem:arte,arte}}),...extraMonsters]
export const TERRITORIES = territories as Territory[]
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
  cacadora: { equipped:{mao_direita:'facas_predador',mao_esquerda:'broquel_raposa',peitoral:'traje_raposa',bolsa:'mochila_pequena_8'}, items:{pocao_cura:1,bomba_fumaca:1}, gold:18 }
}

// Mantidos para a Galeria e compatibilidade com saves antigos.
const bossByDifficulty: Record<number,Enemy> = {
  1:{id:'boss_bandoleiro',nome:'Capitão dos Bandoleiros',ataque:5,vida:26,ouro:16,dificuldade:1,habilidade:'Tiro Duplo a cada 3º turno',imagem:'assets/cards/ladroes/1_pipo.jpg',arte:'assets/art/hd/bosses/capitao-bandoleiros-hd.webp',raridade:'epico',boss:true,maxFases:2},
  2:{id:'boss_seiva',nome:'Matriarca da Seiva Negra',ataque:6,vida:34,ouro:22,dificuldade:2,habilidade:'Regenera 3 de vida ao mudar de fase',imagem:'assets/cards/catalogo/192_monstros_005.jpg',arte:'assets/art/hd/bosses/matriarca-seiva-hd.webp',raridade:'epico',boss:true,maxFases:2},
  3:{id:'boss_troll',nome:'Troll Ancião de Khar-Dur',ataque:7,vida:42,ouro:28,dificuldade:3,habilidade:'Regeneração e Pisotear',imagem:'assets/cards/catalogo/188_monstros_001.jpg',arte:'assets/art/pilot/troll-anciao-hd-v2.webp',raridade:'epico',boss:true,maxFases:2},
  4:{id:'boss_minotauro',nome:'Rei Minotauro Escarlate',ataque:8,vida:50,ouro:34,dificuldade:4,habilidade:'Fúria abaixo de 50% da vida',imagem:'assets/cards/catalogo/193_monstros_006.jpg',arte:'assets/art/hd/bosses/rei-minotauro-hd.webp',raridade:'lendario',boss:true,maxFases:2},
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
export type WeaponAffinity='guerreiro'|'guardiao'|'cacadora'|'arcanista'
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
export function equipmentAffinity(e:Equipment):WeaponAffinity|undefined{const name=e.nome.toLocaleLowerCase('pt-BR');if(/espada|lâmina/.test(name))return'guerreiro';if(/machado|martelo/.test(name))return'guardiao';if(/faca|adaga/.test(name))return'cacadora';if(/cajado|orbe/.test(name))return'arcanista';return undefined}
export function equipmentAttackForHero(e:Equipment,heroId?:string){const affinity=equipmentAffinity(e);return affinity&&heroId!==affinity?Math.max(0,e.ataque-1):e.ataque}
export function equipmentCompatibility(e:Equipment,heroId?:string){const affinity=equipmentAffinity(e);if(!affinity)return{affinity:undefined,compatible:true,penalty:0};const compatible=heroId===affinity;return{affinity,compatible,penalty:compatible?0:e.ataque-equipmentAttackForHero(e,heroId)}}
export function equipmentClassAllowed(e:Equipment,heroId?:string){return !e.classeExclusiva||e.classeExclusiva===heroId}

interface Loot { gold:number; xp:number; itemId?:string; equipmentId?:string; title:string }
interface EventResult { message:string; roll?:number; tone:'good'|'bad'|'neutral' }
interface CombatRoll { attacker:'hero'|'enemy'; naturalAttackRoll:number; attackRoll:number; attackBonus:number; defenseRoll:number; attackBase:number; defenseBase:number; attackEffect:string; defenseEffect:string; damage:number; selfDamage:number; shieldBlocked?:number }
interface FleeRoll { roll:number; outcome:'failed'|'neutral'|'success' }
interface CampaignSave { savedAt:number; heroId?:string; screen?:Screen; xp?:number; territory?:string; [key:string]:any }
export type GuildRankId='ferro'|'bronze'|'prata'|'ouro'|'platina'|'diamante'|'campeao'
export interface GuildRank { id:GuildRankId; nome:string; minimo:number; cor:string }
export const GUILD_RANKS:GuildRank[]=[
 {id:'ferro',nome:'Ferro',minimo:0,cor:'#8d8580'},{id:'bronze',nome:'Bronze',minimo:4,cor:'#b87333'},{id:'prata',nome:'Prata',minimo:8,cor:'#c5ccd3'},{id:'ouro',nome:'Ouro',minimo:11,cor:'#e5b84b'},{id:'platina',nome:'Platina',minimo:19,cor:'#74d4c5'},{id:'diamante',nome:'Diamante',minimo:24,cor:'#65bfff'},{id:'campeao',nome:'Campeão',minimo:36,cor:'#d783ff'}
]
export function guildRankFor(reputation:number){return [...GUILD_RANKS].reverse().find(rank=>reputation>=rank.minimo)??GUILD_RANKS[0]}
export interface GuildMission { id:string; nome:string; descricao:string; tipo:'any'|'specific'|'boss'|'delivery'; quantidade:number; alvo?:string; itemId?:string; local?:string; destinoId?:string; recompensa:{tipo:'gold'|'equipment';valor:number}; dificuldade:number; rank:GuildRankId }
export const GUILD_MISSIONS:GuildMission[]=[
 {id:'caca_inicial',nome:'Limpeza das Estradas',descricao:'Derrote quaisquer 3 monstros nas terras de Eldravar.',tipo:'any',quantidade:3,local:'Estrada dos Campos Dourados',destinoId:'campos_estrada',recompensa:{tipo:'gold',valor:12},dificuldade:1,rank:'ferro'},
 {id:'ameaca_goblin',nome:'Ameaça Goblin',descricao:'Derrote 3 inimigos que possuam Goblin no nome.',tipo:'specific',alvo:'goblin',quantidade:3,local:'Clareira dos Goblins',destinoId:'lunar_goblins',recompensa:{tipo:'gold',valor:22},dificuldade:2,rank:'ferro'},
 {id:'entrega_couro',nome:'Suprimentos para os Recrutas',descricao:'Compre ou encontre uma Armadura de Couro Batido e entregue-a à Guilda.',tipo:'delivery',itemId:'armadura_couro',quantidade:1,recompensa:{tipo:'gold',valor:24},dificuldade:1,rank:'ferro'},
 {id:'caca_lobos',nome:'Peles para a Guilda',descricao:'Derrote 3 inimigos que possuam Lobo no nome.',tipo:'specific',alvo:'lobo',quantidade:3,local:'Bosque de Lunargenta',destinoId:'lunar_bosque',recompensa:{tipo:'equipment',valor:1},dificuldade:2,rank:'bronze'},
 {id:'entrega_runas',nome:'Relíquia da Guarda Antiga',descricao:'Adquira as Runas do Antigo Guardião e entregue-as aos estudiosos da Guilda.',tipo:'delivery',itemId:'runas_guardiao',quantidade:1,recompensa:{tipo:'gold',valor:40},dificuldade:2,rank:'bronze'},
 {id:'prova_chefes',nome:'Prova do Caçador',descricao:'Derrote qualquer chefe de sub-região.',tipo:'boss',quantidade:1,local:'Ponte de Eldrimar',destinoId:'campos_ponte',recompensa:{tipo:'equipment',valor:1},dificuldade:3,rank:'prata'},
 {id:'veterano_guilda',nome:'Veterano da Guilda',descricao:'Derrote 10 monstros de qualquer espécie.',tipo:'any',quantidade:10,local:'Campos Amaldiçoados',destinoId:'mortas_campos',recompensa:{tipo:'equipment',valor:1},dificuldade:4,rank:'ouro'},
 {id:'entrega_manto',nome:'Escamas para a Fortaleza',descricao:'Obtenha um Manto de Cinzas do Dragão e entregue-o para reforçar as defesas da Guilda.',tipo:'delivery',itemId:'manto_cinzas',quantidade:1,recompensa:{tipo:'gold',valor:65},dificuldade:4,rank:'ouro'},
 {id:'dominio_chefes',nome:'Domínio dos Tiranos',descricao:'Derrote 2 chefes diferentes ou repetidos nas regiões avançadas.',tipo:'boss',quantidade:2,local:'Catacumbas de Morvath',destinoId:'mortas_catacumbas',recompensa:{tipo:'gold',valor:85},dificuldade:5,rank:'platina'},
 {id:'entrega_coracao',nome:'O Coração Partido',descricao:'Entregue o Coração Partido de Malgor para que a Guilda possa selar sua energia.',tipo:'delivery',itemId:'coracao_malgor',quantidade:1,recompensa:{tipo:'gold',valor:120},dificuldade:6,rank:'diamante'},
 {id:'queda_ignaroth',nome:'A Queda de Ignaroth',descricao:'Derrote o chefe Ignaroth no Ninho do Dragão Vermelho.',tipo:'boss',alvo:'ignaroth',quantidade:1,local:'Ninho do Dragão Vermelho',destinoId:'pico_ninho_dragao',recompensa:{tipo:'gold',valor:140},dificuldade:6,rank:'diamante'}
]
interface GameState {
 screen:Screen; heroId?:string; hp:number; gold:number; xp:number; attributePoints:number; attr:{vida:number;ataque:number;defesa:number}; allocatedAttr:{vida:number;ataque:number;defesa:number}; balanceVersion:number;
 inventory:Record<string,number>; equipmentBag:string[]; equipped:Partial<Record<Slot,string>>; territory:string; regionId:string; subregionId?:string; victories:Record<string,number>; subregionVictories:Record<string,number>; bossesDefeated:string[]; subregionBossesDefeated:string[];
 enemy?:Enemy; enemyHp:number; combatTurn:number; combatLog:string[]; coin?:'cara'|'coroa'; playerTurn:boolean; animating:boolean; animationActor?:'hero'|'enemy'; lastDamage?:number; combatRoll?:CombatRoll; fleeRoll?:FleeRoll; heroRollBonus:number; enemyRollBonus:number; heroSkillUsed:boolean; itemSkillUsed:boolean; shield:number;
 loot?:Loot; selectedGallery:number; shopMode:'buy'|'sell'; explorationNote?:string; currentEvent?:GameEvent; eventResult?:EventResult; pendingAttackBonus:number; customCards:CustomCard[]; campaigns:Record<string,CampaignSave>; activeCampaignId?:string; guildAccepted:string[]; guildProgress:Record<string,number>; guildClaimed:string[]; guildNotice?:string;
 difficultyMode:DifficultyMode;talents:string[];materials:Record<string,number>;equipmentUpgrades:Record<string,number>;bestiary:Record<string,{encontros:number;vitorias:number}>;revengeWins:Record<string,number>;dungeonDepth:number;storyFlags:string[];
 newGame:(heroId:string)=>void; setScreen:(s:Screen)=>void; continueGame:()=>void; loadCampaign:(id:string)=>void; deleteCampaign:(id:string)=>void; acceptGuildMission:(id:string)=>void; claimGuildMission:(id:string)=>void; openRegion:(t:Territory)=>void; openSubregion:(subregionId:string)=>void; startEncounter:(subregionId:string)=>void; startBoss:()=>void;
 attack:()=>void; heroSkill:()=>void; itemSkill:()=>void; useConsumable:(id:string)=>void; flee:()=>void;
 buyConsumable:(id:string)=>void; buyEquipment:(id:string)=>void; sellConsumable:(id:string)=>void; sellEquipment:(id:string)=>void;
 equip:(id:string)=>void; unequip:(slot:Slot)=>void; addAttribute:(k:'vida'|'ataque'|'defesa')=>void; setSelectedGallery:(n:number)=>void; toggleShopMode:()=>void; resolveEvent:(accept:boolean)=>void; finishEvent:()=>void; finishLoot:()=>void; clearSave:()=>void;
 addCustomCard:(card:Omit<CustomCard,'id'|'criadoEm'>)=>void; removeCustomCard:(id:string)=>void;
 setDifficulty:(mode:DifficultyMode)=>void;unlockTalent:(id:string)=>void;craftEquipment:()=>void;upgradeEquipment:(id:string)=>void;dismantleEquipment:(id:string)=>void;startDungeon:()=>void;startRevenge:(subregionId:string)=>void;
}

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
function buildRevengeBoss(sub:Subregion,wins:number):Enemy{const base=buildBoss(sub),power=1.35+wins*.18;return{...base,id:`revenge_${sub.id}_${Date.now()}`,nome:`Vingança ${wins+1}: ${base.nome}`,ataque:Math.ceil(base.ataque*power),vida:Math.ceil(base.vida*power),ouro:Math.ceil(base.ouro*(1.5+wins*.25)),maxFases:Math.min(5,(base.maxFases??2)+1),habilidade:`${base.habilidade} • Memória da derrota • Fúria vingativa`,revenge:true}}

function campaignSnapshot(source:any):CampaignSave{const snapshot:any={savedAt:Date.now()};for(const [key,value] of Object.entries(source)){if(typeof value!=='function'&&key!=='campaigns'&&key!=='activeCampaignId'&&key!=='customCards')snapshot[key]=value}return snapshot}
function saveActiveCampaign(state:GameState){if(!state.activeCampaignId||!state.heroId||state.screen==='menu'||state.screen==='select'||state.screen==='cardCreator')return state.campaigns;return{...state.campaigns,[state.activeCampaignId]:campaignSnapshot(state)}}
function resumableScreen(screen?:Screen):Screen{return !screen||screen==='menu'||screen==='select'||screen==='cardCreator'?'map':screen}
function reputationFromClaims(ids:string[]=[]){return ids.reduce((sum,id)=>sum+(GUILD_MISSIONS.find(m=>m.id===id)?.dificuldade??0),0)}
function normalizeAttributes(source:any){if(source?.balanceVersion>=2&&source?.allocatedAttr)return{attr:source.attr,allocatedAttr:source.allocatedAttr,balanceVersion:2};const attr={vida:Math.max(0,source?.attr?.vida??0),ataque:Math.max(0,source?.attr?.ataque??0),defesa:Math.max(0,source?.attr?.defesa??0)},earned=Math.max(0,deriveLevel(source?.xp??0).lvl-1),spent=Math.max(0,earned-(source?.attributePoints??0)),defesa=Math.min(attr.defesa,spent),ataque=Math.min(attr.ataque,Math.max(0,spent-defesa)),vida=Math.min(attr.vida,Math.max(0,spent-defesa-ataque));return{attr:{...attr,ataque},allocatedAttr:{vida,ataque,defesa},balanceVersion:2}}

export const useGame = create<GameState>()(persist((set,get)=>({
  screen:'menu',hp:0,gold:0,xp:0,attributePoints:0,attr:{vida:0,ataque:0,defesa:0},allocatedAttr:{vida:0,ataque:0,defesa:0},balanceVersion:2,inventory:{},equipmentBag:[],equipped:{},territory:'Campos Dourados',regionId:'campos_dourados',subregionId:undefined,victories:{},subregionVictories:{},bossesDefeated:[],subregionBossesDefeated:[],enemyHp:0,combatTurn:0,combatLog:[],playerTurn:false,animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,heroRollBonus:0,enemyRollBonus:0,heroSkillUsed:false,itemSkillUsed:false,shield:0,selectedGallery:0,shopMode:'buy',explorationNote:undefined,currentEvent:undefined,eventResult:undefined,pendingAttackBonus:0,customCards:[],campaigns:{},activeCampaignId:undefined,guildAccepted:[],guildProgress:{},guildClaimed:[],guildNotice:undefined,difficultyMode:'veterano',talents:[],materials:{},equipmentUpgrades:{},bestiary:{},revengeWins:{},dungeonDepth:0,storyFlags:[],
  newGame:(heroId:string)=>{const previous=get();const h=HEROES.find(x=>x.id===heroId)!;const st=starter[heroId]??starter.guerreiro;const initialHp=h.vida+Object.values(st.equipped).reduce((sum,id)=>sum+(eqById(id)?.vida??0),0);const activeCampaignId=`campaign_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;const next:any={screen:'map',heroId,hp:initialHp,gold:st.gold,xp:0,attributePoints:0,attr:{vida:0,ataque:0,defesa:0},allocatedAttr:{vida:0,ataque:0,defesa:0},balanceVersion:2,inventory:{...st.items},equipmentBag:[],equipped:{...st.equipped},territory:'Campos Dourados',regionId:'campos_dourados',subregionId:undefined,victories:{},subregionVictories:{},bossesDefeated:[],subregionBossesDefeated:[],enemy:undefined,enemyHp:0,combatTurn:0,combatLog:[],coin:undefined,playerTurn:false,animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,heroRollBonus:0,enemyRollBonus:0,heroSkillUsed:false,itemSkillUsed:false,shield:0,loot:undefined,currentEvent:undefined,eventResult:undefined,pendingAttackBonus:0,explorationNote:undefined,selectedGallery:0,shopMode:'buy',guildAccepted:[],guildProgress:{},guildClaimed:[],difficultyMode:previous.difficultyMode??'veterano',talents:[],materials:{},equipmentUpgrades:{},bestiary:{},revengeWins:{},dungeonDepth:0,storyFlags:[]};const campaigns={...saveActiveCampaign(previous),[activeCampaignId]:campaignSnapshot(next)};set({...next,campaigns,activeCampaignId})},
  setScreen:(screen:Screen)=>{const state=get();set({screen,campaigns:saveActiveCampaign(state)})},
  continueGame:()=>{const state=get(),saved=state.activeCampaignId&&state.campaigns[state.activeCampaignId];if(saved)set({...saved,...normalizeAttributes(saved),campaigns:state.campaigns,activeCampaignId:state.activeCampaignId,guildAccepted:saved.guildAccepted??[],guildProgress:saved.guildProgress??{},guildClaimed:saved.guildClaimed??[],guildNotice:undefined,screen:resumableScreen(saved.screen),animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,playerTurn:saved.screen==='combat'&&saved.enemy?true:(saved.playerTurn??false)});else set({screen:state.heroId?'map':'select'})},
  loadCampaign:(id:string)=>{const state=get(),saved=state.campaigns[id];if(!saved)return;const campaigns=saveActiveCampaign(state);set({...saved,...normalizeAttributes(saved),campaigns,activeCampaignId:id,guildAccepted:saved.guildAccepted??[],guildProgress:saved.guildProgress??{},guildClaimed:saved.guildClaimed??[],guildNotice:undefined,screen:resumableScreen(saved.screen),animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,playerTurn:saved.screen==='combat'&&saved.enemy?true:(saved.playerTurn??false)})},
  deleteCampaign:(id:string)=>{const state=get(),campaigns={...state.campaigns};delete campaigns[id];if(id===state.activeCampaignId)set({campaigns,activeCampaignId:undefined,heroId:undefined,screen:'menu',hp:0,gold:0,xp:0,equipmentBag:[],inventory:{},equipped:{}});else set({campaigns})},
  acceptGuildMission:(id:string)=>{const state=get(),mission=GUILD_MISSIONS.find(m=>m.id===id),rank=guildRankFor(reputationFromClaims(state.guildClaimed));if(!mission||GUILD_RANKS.findIndex(r=>r.id===rank.id)<GUILD_RANKS.findIndex(r=>r.id===mission.rank)||state.guildAccepted.includes(id)||state.guildClaimed.includes(id))return;set({guildAccepted:[...state.guildAccepted,id],guildProgress:{...state.guildProgress,[id]:state.guildProgress[id]??0},guildNotice:`Missão aceita: ${mission.nome}.`})},
  claimGuildMission:(id:string)=>{const state=get(),mission=GUILD_MISSIONS.find(m=>m.id===id);if(!mission||state.guildClaimed.includes(id))return;const deliveryIndex=mission.tipo==='delivery'&&mission.itemId?state.equipmentBag.indexOf(mission.itemId):-1,complete=mission.tipo==='delivery'?deliveryIndex>=0:(state.guildProgress[id]??0)>=mission.quantidade;if(!complete)return;const reputation=reputationFromClaims(state.guildClaimed),newRank=guildRankFor(reputation+mission.dificuldade),promotion=newRank.id!==guildRankFor(reputation).id?` Promoção alcançada: rank ${newRank.nome}!`:'';if(mission.recompensa.tipo==='gold'){const equipmentBag=[...state.equipmentBag];if(deliveryIndex>=0)equipmentBag.splice(deliveryIndex,1);set({gold:state.gold+mission.recompensa.valor,equipmentBag,guildClaimed:[...state.guildClaimed,id],guildNotice:`${mission.tipo==='delivery'?'Item entregue. ':''}Recompensa recebida: ${mission.recompensa.valor} moedas de ouro.${promotion}`})}else{if(state.equipmentBag.length>=equipmentBagCapacity(state))return;const pool=EQUIPMENT.filter(e=>equipmentLevelAllowed(e,state.xp)&&equipmentClassAllowed(e,state.heroId)&&e.slot!=='bolsa');const reward=pool[Math.floor(Math.random()*pool.length)]??EQUIPMENT[0];set({equipmentBag:[...state.equipmentBag,reward.id],guildClaimed:[...state.guildClaimed,id],guildNotice:`Recompensa recebida: ${reward.nome}.${promotion}`})}},
  openRegion:(t:Territory)=>set({regionId:t.id,territory:t.nome,subregionId:undefined,explorationNote:undefined,screen:'region'}),
  openSubregion:(subregionId:string)=>{const sub=SUBREGIONS.find(x=>x.id===subregionId);const region=sub&&TERRITORIES.find(x=>x.id===sub.regionId);if(!sub||!region)return;set({regionId:region.id,territory:region.nome,subregionId:sub.id,explorationNote:`Destino selecionado no mapa: ${sub.nome}.`,screen:'region'})},
  startEncounter:(subregionId:string)=>{
    const sub=SUBREGIONS.find(x=>x.id===subregionId); if(!sub)return
    const s=get(); const progress=s.subregionVictories[sub.id]??0
    set({subregionId:sub.id,territory:sub.nome,explorationNote:undefined})
    if(progress>=sub.encontrosNecessarios && !s.subregionBossesDefeated.includes(sub.id)){ set({screen:'bossIntro',enemy:buildBoss(sub)}); return }
    // Parte das explorações revela uma carta de missão antes do próximo combate.
    const eventRoll=Math.random()
    if(eventRoll<.35){const currentEvent=EVENTS[Math.floor(Math.random()*EVENTS.length)];set({screen:'event',currentEvent,eventResult:undefined});return}
    const lvl=deriveLevel(s.xp).lvl; beginCombat(set,get,difficultyEnemy(buildEnemy(sub,lvl),s.difficultyMode))
  },
  startBoss:()=>{const s=get(),sub=currentSubregion(s);if(sub)beginCombat(set,get,difficultyEnemy(s.enemy?.revenge?s.enemy:buildBoss(sub),s.difficultyMode))},
  attack:()=>playerAttack(set,get,'Ataque',0),
  heroSkill:()=>{ const s=get(); if(s.heroSkillUsed||!s.playerTurn||s.animating||!s.enemy)return; set({heroSkillUsed:true}); const h=HEROES.find(x=>x.id===s.heroId); let bonus=2; if(s.heroId==='guardiao'){set({shield:s.shield+3}); addLog(set,'Habilidade do herói: +3 Escudo.'); enemyAfterDelay(set,get);return} if(s.heroId==='guerreiro'){set({shield:s.shield+2});addLog(set,'Habilidade do herói: +2 Escudo.');enemyAfterDelay(set,get);return} if(s.heroId==='arcanista')bonus=4; if(s.heroId==='cacadora')bonus=3; addLog(set,`${h?.nome}: habilidade ativada!`); playerAttack(set,get,'Habilidade',bonus,true) },
  itemSkill:()=>{ const s=get(); if(s.itemSkillUsed||!s.playerTurn||s.animating||!s.enemy)return; const equippedIds=Object.values(s.equipped) as (string|undefined)[]; const item=equippedIds.map(id=>eqById(id)).find(e=>e?.habilidade); if(!item){addLog(set,'Nenhum equipamento com habilidade ativa.');return} set({itemSkillUsed:true}); const txt=item.habilidade.toLowerCase(); if(txt.includes('escudo')){set({shield:s.shield+3});addLog(set,`${item.nome}: +3 Escudo.`);enemyAfterDelay(set,get);return} if(txt.includes('recupere')){const m=maxHp(s);set({hp:Math.min(m,s.hp+4)});addLog(set,`${item.nome}: recuperou 4 de vida.`);enemyAfterDelay(set,get);return} playerAttack(set,get,item.nome,3,true) },
  useConsumable:(id:string)=>{ const s=get(),it=CONSUMABLES.find(x=>x.id===id);if(!it||(s.inventory[id]??0)<=0)return;if(s.screen==='combat'&&(!s.playerTurn||s.animating||!s.enemy))return;const inv={...s.inventory,[id]:(s.inventory[id]??0)-1};if(inv[id]<=0)delete inv[id];let resultMessage=`${it.nome} utilizado.`;if(it.tipo==='cura')set({inventory:inv,hp:Math.min(maxHp(s),s.hp+it.valor)});else if(it.tipo==='vida_max'){const success=Math.random()<(LIFE_CHANCE[id]??.35);if(success){const newMax=maxHp(s)+it.valor,newHp=id==='elixir_fenix'?newMax:Math.min(newMax,s.hp+it.valor);resultMessage=`${it.nome}: sucesso! Vida máxima aumentada permanentemente em ${it.valor}.`;set({inventory:inv,attr:{...s.attr,vida:s.attr.vida+it.valor},hp:newHp,explorationNote:resultMessage})}else{resultMessage=`${it.nome}: a tentativa falhou e a vida máxima não aumentou.`;set({inventory:inv,explorationNote:resultMessage})}}else if(it.tipo==='escudo')set({inventory:inv,shield:s.shield+it.valor});else{resultMessage=`${it.nome}: +${it.valor} de ataque até o fim do próximo combate.`;set({inventory:inv,pendingAttackBonus:s.pendingAttackBonus+Math.max(1,it.valor),explorationNote:resultMessage})}if(s.screen==='combat'){addLog(set,resultMessage);enemyAfterDelay(set,get)} },
  flee:()=>{const s=get();if(!s.playerTurn||s.animating)return;const roll=Math.floor(Math.random()*6)+1;const outcome:FleeRoll['outcome']=roll>=5?'success':roll===4?'neutral':'failed';set({animating:true,playerTurn:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:{roll,outcome}});addLog(set,roll>=5?`Fuga: dado ${roll}. Você conseguiu escapar!`:roll===4?'Fuga: dado 4. Você não escapou, mas manteve sua ação.':`Fuga: dado ${roll}. A tentativa falhou e você perdeu o turno.`);setTimeout(()=>{const current=get();if(current.screen!=='combat'||!current.enemy)return;if(outcome==='success'){set({screen:current.subregionId?'region':'map',subregionId:undefined,explorationNote:undefined,enemy:undefined,pendingAttackBonus:0,shield:0,animating:false,fleeRoll:undefined,heroRollBonus:0,enemyRollBonus:0});return}if(outcome==='neutral'){set({animating:false,playerTurn:true,fleeRoll:undefined});return}set({fleeRoll:undefined});enemyAfterDelay(set,get)},COMBAT_ROLL_DISPLAY_MS)},
  buyConsumable:(id:string)=>{const s=get(),it=CONSUMABLES.find(x=>x.id===id);if(!it||s.gold<it.preco)return;set({gold:s.gold-it.preco,inventory:{...s.inventory,[id]:(s.inventory[id]??0)+1}})},
  buyEquipment:(id:string)=>{const s=get(),e=eqById(id);if(!e||!equipmentClassAllowed(e,s.heroId)||!equipmentLevelAllowed(e,s.xp)||s.gold<e.preco||s.equipmentBag.length>=equipmentBagCapacity(s))return;set({gold:s.gold-e.preco,equipmentBag:[...s.equipmentBag,id]})},
  sellConsumable:(id:string)=>{const s=get(),it=CONSUMABLES.find(x=>x.id===id);if(!it||(s.inventory[id]??0)<=0)return;const inv={...s.inventory,[id]:(s.inventory[id]??0)-1};if(inv[id]<=0)delete inv[id];set({inventory:inv,gold:s.gold+Math.max(1,Math.floor(it.preco/2))})},
  sellEquipment:(id:string)=>{const s=get(),idx=s.equipmentBag.indexOf(id),e=eqById(id);if(idx<0||!e)return;const bag=[...s.equipmentBag];bag.splice(idx,1);set({equipmentBag:bag,gold:s.gold+Math.max(1,Math.floor(e.preco/2))})},
  equip:(id:string)=>{const s=get(),e=eqById(id);if(!e||!equipmentClassAllowed(e,s.heroId)||!equipmentLevelAllowed(e,s.xp))return;const idx=s.equipmentBag.indexOf(id);if(idx<0)return;let slot=e.slot; if(slot==='anel_1'&&s.equipped.anel_1) slot='anel_2'; const old=s.equipped[slot]; const bag=[...s.equipmentBag];bag.splice(idx,1);if(old)bag.push(old);if(slot==='bolsa'&&bag.length>(e.capacidade??8))return;set({equipmentBag:bag,equipped:{...s.equipped,[slot]:id}})},
  unequip:(slot:Slot)=>{const s=get(),id=s.equipped[slot];if(!id||slot==='bolsa'||s.equipmentBag.length>=equipmentBagCapacity(s))return;const eq={...s.equipped};delete eq[slot];set({equipped:eq,equipmentBag:[...s.equipmentBag,id]})},
  addAttribute:(k:'vida'|'ataque'|'defesa')=>{const s=get();if(s.attributePoints<=0)return;set({attributePoints:s.attributePoints-1,attr:{...s.attr,[k]:s.attr[k]+1},allocatedAttr:{...s.allocatedAttr,[k]:s.allocatedAttr[k]+1},hp:k==='vida'?s.hp+1:s.hp})},
  setSelectedGallery:(selectedGallery:number)=>set({selectedGallery}),
  toggleShopMode:()=>set({shopMode:get().shopMode==='buy'?'sell':'buy'}),
  resolveEvent:(accept:boolean)=>resolveExplorationEvent(set,get,accept),
  finishEvent:()=>{const result=get().eventResult;set({screen:'region',currentEvent:undefined,eventResult:undefined,explorationNote:result?.message})},
  finishLoot:()=>set({screen:get().subregionId?'region':'map',subregionId:undefined,explorationNote:undefined,enemy:undefined,enemyHp:0,combatLog:[],coin:undefined,playerTurn:false,animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,heroRollBonus:0,enemyRollBonus:0,heroSkillUsed:false,itemSkillUsed:false,shield:0,pendingAttackBonus:0}),
  clearSave:()=>set({screen:'menu',heroId:undefined,hp:0,gold:0,xp:0,inventory:{},equipmentBag:[],equipped:{},territory:'Campos Dourados',regionId:'campos_dourados',subregionId:undefined,victories:{},subregionVictories:{},bossesDefeated:[],subregionBossesDefeated:[],currentEvent:undefined,eventResult:undefined,pendingAttackBonus:0,campaigns:{},activeCampaignId:undefined}),
  addCustomCard:(card:Omit<CustomCard,'id'|'criadoEm'>)=>{const s=get();set({customCards:[...s.customCards,{...card,id:`custom_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,criadoEm:Date.now()}]})},
  removeCustomCard:(id:string)=>{const s=get();set({customCards:s.customCards.filter((c:CustomCard)=>c.id!==id)})}
  ,setDifficulty:(difficultyMode:DifficultyMode)=>set({difficultyMode})
  ,unlockTalent:(id:string)=>{const s=get(),talent=TALENTS.find(t=>t.id===id),level=deriveLevel(s.xp).lvl;if(!talent||level<talent.level||s.talents.includes(id))return;set({talents:[...s.talents,id]})}
  ,craftEquipment:()=>{const s=get(),available=(Object.entries(s.materials) as [string,number][]).filter(([,qty])=>qty>=3);if(!available.length||s.equipmentBag.length>=equipmentBagCapacity(s))return;const [material]=available[0],pool=EQUIPMENT.filter(e=>equipmentLevelAllowed(e,s.xp)&&equipmentClassAllowed(e,s.heroId)&&e.slot!=='bolsa');const item=pool[Math.floor(Math.random()*pool.length)];if(!item)return;set({materials:{...s.materials,[material]:s.materials[material]-3},equipmentBag:[...s.equipmentBag,item.id],explorationNote:`Forjado: ${item.nome}.`})}
  ,upgradeEquipment:(id:string)=>{const s=get(),item=eqById(id),level=s.equipmentUpgrades[id]??0,cost=10+(level+1)*10;if(!item||level>=3||s.gold<cost)return;set({gold:s.gold-cost,equipmentUpgrades:{...s.equipmentUpgrades,[id]:level+1},explorationNote:`${item.nome} aprimorado para +${level+1}.`})}
  ,dismantleEquipment:(id:string)=>{const s=get(),index=s.equipmentBag.indexOf(id);if(index<0)return;const material=REGION_MATERIALS[s.regionId]??REGION_MATERIALS.campos_dourados,bag=[...s.equipmentBag];bag.splice(index,1);set({equipmentBag:bag,materials:{...s.materials,[material.id]:(s.materials[material.id]??0)+2},explorationNote:`Item desmontado: +2 ${material.nome}.`})}
  ,startDungeon:()=>{const s=get(),sub=SUBREGIONS.find(x=>x.regionId===s.regionId)??SUBREGIONS[0],depth=s.dungeonDepth+1;const enemy=difficultyEnemy(buildEnemy(sub,deriveLevel(s.xp).lvl+depth),s.difficultyMode);beginCombat(set,get,{...enemy,nome:`Masmorra ${depth}: ${enemy.nome}`,vida:Math.ceil(enemy.vida*(1+depth*.12)),ouro:Math.ceil(enemy.ouro*(1+depth*.18)),dungeon:true});set({dungeonDepth:depth})}
  ,startRevenge:(subregionId:string)=>{const s=get(),sub=SUBREGIONS.find(x=>x.id===subregionId);if(!sub||!s.subregionBossesDefeated.includes(subregionId))return;set({subregionId,regionId:sub.regionId,territory:sub.nome,screen:'bossIntro',enemy:buildRevengeBoss(sub,s.revengeWins[subregionId]??0)})}
}),{name:'bangalores-save-v1',merge:(persisted:any,current:any)=>{const merged={...current,...persisted,equipped:{...(persisted?.equipped??{}),bolsa:persisted?.equipped?.bolsa??'mochila_pequena_8'},regionId:persisted?.regionId??'campos_dourados',subregionVictories:persisted?.subregionVictories??{},subregionBossesDefeated:persisted?.subregionBossesDefeated??[],pendingAttackBonus:persisted?.pendingAttackBonus??0,currentEvent:persisted?.currentEvent,eventResult:persisted?.eventResult,customCards:persisted?.customCards??[],campaigns:persisted?.campaigns??{},guildAccepted:persisted?.guildAccepted??[],guildProgress:persisted?.guildProgress??{},guildClaimed:persisted?.guildClaimed??[],difficultyMode:persisted?.difficultyMode??'veterano',talents:persisted?.talents??[],materials:persisted?.materials??{},equipmentUpgrades:persisted?.equipmentUpgrades??{},bestiary:persisted?.bestiary??{},revengeWins:persisted?.revengeWins??{},dungeonDepth:persisted?.dungeonDepth??0,storyFlags:persisted?.storyFlags??[],guildNotice:undefined,animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,playerTurn:persisted?.screen==='combat'&&persisted?.enemy?true:(persisted?.playerTurn??false)};Object.assign(merged,normalizeAttributes(merged));if(merged.heroId&&!merged.activeCampaignId){const id=`campaign_legacy_${Date.now()}`;merged.activeCampaignId=id;merged.campaigns={...merged.campaigns,[id]:campaignSnapshot(merged)}}return merged}}))

function stats(s:GameState){const h=HEROES.find(x=>x.id===s.heroId);let atk=(h?.ataque??0)+s.attr.ataque+s.pendingAttackBonus+(s.talents?.includes('precisao')?1:0),life=(h?.vida??0)+s.attr.vida+(s.talents?.includes('vigor')?5:0),def=s.attr.defesa+(s.talents?.includes('muralha')?1:0);Object.values(s.equipped).forEach(id=>{const e=eqById(id);if(e){const up=s.equipmentUpgrades?.[e.id]??0;atk+=equipmentAttackForHero(e,s.heroId)+(e.ataque?up:0);life+=e.vida+up;def+=e.defesa+(e.defesa?Math.floor((up+1)/2):0)}});return{atk,life,def}}
export function maxHp(s:GameState){return stats(s).life}
export function attackValue(s:GameState){return stats(s).atk}
export function defenseValue(s:GameState){return stats(s).def}
export function levelInfo(xp:number){return deriveLevel(xp)}

function advanceExploration(s:GameState){
 const id=s.subregionId
 return id?{...s.subregionVictories,[id]:(s.subregionVictories[id]??0)+1}:s.subregionVictories
}

function resolveExplorationEvent(set:any,get:any,accept:boolean){
 const s=get() as GameState
 const event=s.currentEvent
 if(!event||s.eventResult)return
 const progress=advanceExploration(s)
 if(!accept){set({subregionVictories:progress,eventResult:{message:`Você evitou ${event.nome} e seguiu viagem. A exploração avançou.`,tone:'neutral'}});return}

 const roll=Math.floor(Math.random()*6)+1
 const common={subregionVictories:progress}
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

function beginCombat(set:any,get:any,enemy:Enemy){const coin=Math.random()<.5?'cara':'coroa';const s=get() as GameState,key=enemy.nome.replace(/^(Veterano|Elite|Campeão): /,'');const known=s.bestiary[key]??{encontros:0,vitorias:0};set({screen:'combat',enemy,enemyHp:enemy.vida,combatTurn:1,combatLog:[`${enemy.variante&&enemy.variante!=='Comum'?enemy.variante+' • ':''}Nível ${enemy.nivel??enemy.dificuldade}.`,`Afinidade elemental: ${enemy.elemento??(enemy.boss?'sombra':'físico')}.`,`Moeda: ${coin.toUpperCase()}. ${coin==='cara'?'Você':'Inimigo'} começa.`],coin,playerTurn:coin==='cara',animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,heroRollBonus:s.talents.includes('destino')?1:0,enemyRollBonus:0,heroSkillUsed:false,itemSkillUsed:false,shield:s.shield+(s.heroId==='guardiao'?2:0),bestiary:{...s.bestiary,[key]:{...known,encontros:known.encontros+1}}});if(coin==='coroa')setTimeout(()=>enemyAttack(set,get),800)}
function addLog(set:any,msg:string){set((s:GameState)=>({combatLog:[...s.combatLog.slice(-12),msg]}))}
const COMBAT_ROLL_DISPLAY_MS=2500
function attackEffect(roll:number){return roll===1?'Falha crítica':roll===2?'Ataque desajeitado':roll<=4?'Ataque normal':roll===5?'Ataque forte':'Ataque crítico'}
function defenseEffect(roll:number){return roll===1?'Falha crítica':roll===2?'Defesa fraca':roll<=4?'Defesa normal':roll===5?'Defesa forte':'Defesa perfeita'}
function resolveCombatRoll(attackBase:number,defenseBase:number,attackRoll:number,defenseRoll:number){
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
function playerAttack(set:any,get:any,label:string,bonus=0,alreadyAnimating=false){
 const s=get() as GameState
 if(!s.enemy||!s.playerTurn||s.animating&&!alreadyAnimating)return
 const attackBase=attackValue(s)+bonus,defenseBase=Math.max(0,(s.enemy.dificuldade??1)-2),naturalAttackRoll=Math.floor(Math.random()*6)+1,attackBonus=s.heroRollBonus,attackRoll=Math.min(6,naturalAttackRoll+attackBonus),defenseRoll=Math.floor(Math.random()*6)+1
 const {damage,selfDamage}=resolveCombatRoll(attackBase,defenseBase,attackRoll,defenseRoll)
 const combatRoll:CombatRoll={attacker:'hero',naturalAttackRoll,attackRoll,attackBonus,defenseRoll,attackBase,defenseBase,attackEffect:attackEffect(attackRoll),defenseEffect:defenseEffect(defenseRoll),damage,selfDamage}
 set({animating:true,playerTurn:false,animationActor:selfDamage?'enemy':'hero',lastDamage:selfDamage||damage,combatRoll,heroRollBonus:0,enemyRollBonus:attackRoll===2?1:s.enemyRollBonus})
 addLog(set,`${label}: dado ${attackRoll} (${attackEffect(attackRoll)}) contra defesa ${defenseRoll} (${defenseEffect(defenseRoll)}). ${selfDamage?`Recebeu ${selfDamage} de dano.`:`Causou ${damage} de dano.`}${attackRoll===2?' Inimigo recebe +1 na próxima rolagem.':''}`)
 setTimeout(()=>{
  const now=get() as GameState,en=now.enemy
  if(!en){set({animating:false,playerTurn:false,animationActor:undefined,lastDamage:undefined});return}
  if(selfDamage){const heroHp=Math.max(0,now.hp-selfDamage);set({hp:heroHp});if(heroHp<=0){addLog(set,'Você foi derrotado e retornou à região selecionada.');setTimeout(()=>{const current=get() as GameState;set({screen:current.subregionId?'region':'map',subregionId:undefined,explorationNote:undefined,hp:maxHp(current),enemy:undefined,pendingAttackBonus:0,shield:0,combatRoll:undefined,heroRollBonus:0,enemyRollBonus:0})},900)}else enemyAfterDelay(set,get);return}
  const hp=now.enemyHp-damage
  if(en.boss&&en.maxFases&&hp>0){const threshold=en.vida*(1-(en.fase??1)/en.maxFases);if((en.fase??1)<en.maxFases&&hp<=threshold){const nf=(en.fase??1)+1;set({enemy:{...en,fase:nf,ataque:en.ataque+1},enemyHp:Math.max(hp,1)});addLog(set,`FASE ${nf}! ${en.nome} ficou mais agressivo.`);enemyAfterDelay(set,get);return}}
  if(hp<=0)victory(set,get);else{set({enemyHp:hp});enemyAfterDelay(set,get)}
 },COMBAT_ROLL_DISPLAY_MS)
}
function runEnemyAttack(set:any,get:any){const current=get() as GameState;if(!current.enemy){set({animating:false,playerTurn:false,animationActor:undefined,lastDamage:undefined});return}enemyAttack(set,get)}
function enemyAfterDelay(set:any,get:any){const enemyId=(get() as GameState).enemy?.id;set({animating:true,playerTurn:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined});setTimeout(()=>runEnemyAttack(set,get),650);setTimeout(()=>{const stalled=get() as GameState;if(stalled.screen==='combat'&&stalled.enemy?.id===enemyId&&stalled.animating&&!stalled.playerTurn){set({animating:false,playerTurn:true,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined});addLog(set,'Fluxo do combate recuperado. Seu turno continua.')}},COMBAT_ROLL_DISPLAY_MS+1800)}
function enemyAttack(set:any,get:any){
 const s=get() as GameState
 if(!s.enemy){set({animating:false,playerTurn:false,animationActor:undefined,lastDamage:undefined});return}
 const attackBase=s.enemy.ataque,defenseBase=defenseValue(s),naturalAttackRoll=Math.floor(Math.random()*6)+1,attackBonus=s.enemyRollBonus,attackRoll=Math.min(6,naturalAttackRoll+attackBonus),defenseRoll=Math.floor(Math.random()*6)+1
 const resolved=resolveCombatRoll(attackBase,defenseBase,attackRoll,defenseRoll);let raw=resolved.damage,shield=s.shield
 const blocked=Math.min(shield,raw),enemyName=s.enemy.nome;raw-=blocked;shield-=blocked
 const hp=Math.max(0,s.hp-raw),enemyHp=Math.max(0,s.enemyHp-resolved.selfDamage)
 const combatRoll:CombatRoll={attacker:'enemy',naturalAttackRoll,attackRoll,attackBonus,defenseRoll,attackBase,defenseBase,attackEffect:attackEffect(attackRoll),defenseEffect:defenseEffect(defenseRoll),damage:raw,selfDamage:resolved.selfDamage,shieldBlocked:blocked}
 set({shield,animating:true,animationActor:resolved.selfDamage?'hero':'enemy',lastDamage:resolved.selfDamage||raw,combatRoll,playerTurn:false,enemyRollBonus:0,heroRollBonus:attackRoll===2?1:s.heroRollBonus})
 setTimeout(()=>{
  const current=get() as GameState
  if(current.screen!=='combat'||!current.enemy)return
  if(resolved.selfDamage){addLog(set,`${enemyName}: falha crítica e recebeu ${resolved.selfDamage} de dano.`);if(enemyHp<=0){victory(set,get);return}set({enemyHp,hp,animating:false,animationActor:undefined,combatRoll:undefined,playerTurn:true,combatTurn:current.combatTurn+1});return}
  set({hp,animating:false,animationActor:undefined,combatRoll:undefined,playerTurn:hp>0,combatTurn:current.combatTurn+1})
  addLog(set,`${enemyName}: dado ${attackRoll} (${attackEffect(attackRoll)}) contra defesa ${defenseRoll} (${defenseEffect(defenseRoll)}); causou ${raw} de dano${blocked?` (${blocked} bloqueado)`:''}.${attackRoll===2?' Você recebe +1 na próxima rolagem.':''}`)
  if(hp<=0){addLog(set,'Você foi derrotado e retornou à região selecionada.');setTimeout(()=>set({screen:current.subregionId?'region':'map',subregionId:undefined,explorationNote:undefined,hp:maxHp({...current,hp} as GameState),enemy:undefined,pendingAttackBonus:0,shield:0}),900)}
 },COMBAT_ROLL_DISPLAY_MS)
}
function victory(set:any,get:any){const s=get() as GameState,en=s.enemy!;const gold=en.ouro;const before=deriveLevel(s.xp).lvl;const xp=s.xp+gold;const after=deriveLevel(xp).lvl;const points=s.attributePoints+Math.max(0,after-before);const key=s.subregionId??s.territory;const victories={...s.victories,[s.territory]:(s.victories[s.territory]??0)+1};const subregionVictories={...s.subregionVictories,[key]:(s.subregionVictories[key]??0)+1};let bosses=[...s.bossesDefeated],subBosses=[...s.subregionBossesDefeated];if(en.boss){if(!bosses.includes(String(en.dificuldade)))bosses.push(String(en.dificuldade));if(s.subregionId&&!subBosses.includes(s.subregionId))subBosses.push(s.subregionId)}const enemyName=en.nome.toLocaleLowerCase('pt-BR'),guildProgress={...s.guildProgress};for(const id of s.guildAccepted){if(s.guildClaimed.includes(id))continue;const mission=GUILD_MISSIONS.find(m=>m.id===id);if(!mission)continue;const matches=mission.tipo==='any'||(mission.tipo==='boss'&&Boolean(en.boss)&&(!mission.alvo||enemyName.includes(mission.alvo)))||(mission.tipo==='specific'&&Boolean(mission.alvo)&&enemyName.includes(mission.alvo!));if(matches)guildProgress[id]=Math.min(mission.quantidade,(guildProgress[id]??0)+1)}let equipmentBag=[...s.equipmentBag],inventory={...s.inventory};let equipmentId:string|undefined,itemId:string|undefined;if(Math.random()<monsterDropChance(en)){const equipmentPool=equipmentLootPool(en,s.heroId,after),consumablePool=consumableLootPool(en);const canStoreEquipment=equipmentBag.length<equipmentBagCapacity(s);if(Math.random()<.5&&canStoreEquipment&&equipmentPool.length){const e=equipmentPool[Math.floor(Math.random()*equipmentPool.length)];equipmentBag.push(e.id);equipmentId=e.id}else if(consumablePool.length){const i=consumablePool[Math.floor(Math.random()*consumablePool.length)];inventory[i.id]=(inventory[i.id]??0)+1;itemId=i.id}}const baseName=en.nome.replace(/^Vingança \d+: /,'').replace(/^(Veterano|Elite|Campeão): /,'');const record=s.bestiary[baseName]??{encontros:1,vitorias:0},material=REGION_MATERIALS[s.regionId]??REGION_MATERIALS.campos_dourados,materialQty=en.boss?3:en.elite?2:1;const materials={...s.materials,[material.id]:(s.materials[material.id]??0)+materialQty};const revengeWins=en.revenge&&s.subregionId?{...s.revengeWins,[s.subregionId]:(s.revengeWins[s.subregionId]??0)+1}:s.revengeWins;
set({gold:s.gold+gold,xp,attributePoints:points,victories,subregionVictories,bossesDefeated:bosses,subregionBossesDefeated:subBosses,guildProgress,equipmentBag,inventory,materials,revengeWins,bestiary:{...s.bestiary,[baseName]:{...record,vitorias:record.vitorias+1}},screen:'loot',enemy:undefined,enemyHp:0,animating:false,animationActor:undefined,lastDamage:undefined,playerTurn:false,loot:{gold,xp:gold,itemId,equipmentId,title:en.revenge?'VINGANÇA CONCLUÍDA':en.boss?'CHEFE DERROTADO':en.variante==='Campeão'?'CAMPEÃO DERROTADO':'VITÓRIA'}})}
