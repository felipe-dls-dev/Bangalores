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
import { NEW_HEROES_WEAPONS } from '../data/newHeroesWeapons'
import { SHARED_EQUIPMENT, SHARED_CLASS_PROGRESSION } from '../data/sharedEquipment'
import { BONUS_EQUIPMENT } from '../data/bonusEquipment'
import { EXPANDED_SUBREGIONS } from '../data/expandedSubregions'
import { STEELMERE_SUBREGIONS } from '../data/subregioesSteelmere'
import monsterArt from '../data/monsterArt.json'
import eventArt from '../data/eventArt.json'
import bossArt from '../data/bossArt.json'
import { BESTIARY_MILESTONES, CLASS_ELEMENT, DIFFICULTIES, FORGE_BONUS_LABELS, FORGE_BONUS_MATERIAL, FORGE_GEMS, REGION_MATERIALS, SPECIALIZATION_CHOICES, STORY_CHAPTERS, TALENTS, type DifficultyMode, type Element, type ForgeBonus, type ForgeChoice, type ForgeEffect } from '../data/expansion'
import { buildForgeRecipes } from '../data/forgeRecipes'
import type { Hero, Equipment, Consumable, Enemy, Territory, Subregion, Slot, Screen, Rarity, GameEvent, CustomCard, EquipmentActiveEffect, EquipmentSetId } from '../types'

const HD_ART:Record<string,string> = {
  'assets/art/monsters/cabra_malgor.webp':'assets/art/hd/monsters/cabra-malgor-hd.webp',
  'assets/art/monsters/corvo_ignaroth.webp':'assets/art/hd/monsters/corvo-ignaroth-hd.webp',
  'assets/art/monsters/espectro_rainha.webp':'assets/art/hd/monsters/espectro-rainha-hd.webp',
  'assets/art/monsters/fanatico_orgulho.webp':'assets/art/hd/monsters/fanatico-orgulho-hd.webp',
  'assets/art/monsters/grumnak.webp':'assets/art/pilot/grumnak-hd-v2.webp',
  'assets/art/monsters/guardia_seiva.webp':'assets/art/hd/monsters/guardia-seiva-hd.webp',
  'assets/art/monsters/ilusionista_areias.webp':'assets/art/hd/monsters/ilusionista-areias-hd.webp',
  'assets/art/monsters/sentinela_runas.webp':'assets/art/pilot/sentinela-runas-hd-v2.webp',
  'assets/art/monsters/steelmere/automato-sentinela.webp':'assets/art/hd/monsters/automato-sentinela-hd.webp',
  'assets/art/monsters/steelmere/batedor-a-vapor.webp':'assets/art/hd/monsters/batedor-a-vapor-hd.webp',
  'assets/art/monsters/steelmere/elemental-de-vapor.webp':'assets/art/hd/monsters/elemental-de-vapor-hd.webp',
  'assets/art/monsters/steelmere/arauto-blindado.webp':'assets/art/hd/monsters/arauto-blindado-hd.webp',
  'assets/art/monsters/steelmere/automato-corrompido.webp':'assets/art/hd/monsters/automato-corrompido-hd.webp',
  'assets/art/monsters/steelmere/espectro-mecanico.webp':'assets/art/hd/monsters/espectro-mecanico-hd.webp',
  'assets/art/bosses/boss_bandoleiro.webp':'assets/art/hd/bosses/capitao-bandoleiros-hd.webp',
  'assets/art/bosses/boss_seiva.webp':'assets/art/hd/bosses/matriarca-seiva-hd.webp',
  'assets/art/bosses/boss_minotauro.webp':'assets/art/hd/bosses/rei-minotauro-hd.webp',
  'assets/art/bosses/boss_necromante.webp':'assets/art/hd/bosses/necromante-supremo-hd.webp',
  'assets/art/bosses/boss_malgor.webp':'assets/art/hd/bosses/malgor-rei-sombrio-hd.webp',
  'assets/art/bosses/boss_troll.webp':'assets/art/pilot/troll-anciao-hd-v2.webp'
}
const hdArt=(path:string)=>{
  if(path.startsWith('assets/art/monsters/steelmere/')){
    const filename=path.split('/').pop() || ''
    const stem=filename.replace(/\.[^.]+$/,'')
    return `assets/art/hd/monsters/steelmere/${stem}-hd.webp`
  }
  return HD_ART[path]??path
}
const MONSTER_ART=monsterArt as Record<string,string>
const EVENT_ART=eventArt as Record<string,string>
const BOSS_ART=bossArt as Record<string,string>
const namedMonsterArt=(name:string,fallback:string)=>MONSTER_ART[name]??fallback
const hdCollectionArt=(path:string|undefined,collection:string)=>{
  if(!path)return path
  const filename=path.split('/').pop()
  const stem=filename?.replace(/\.[^.]+$/,'')
  if(!stem)return path
  const hdStem=stem.endsWith('-hd')?stem:`${stem}-hd`
  return `assets/art/hd/${collection}/${hdStem}.webp`
}

const EQUIPMENT_HD_OVERRIDES:Record<string,string> = {
  lamina_sentinela:'assets/art/hd/equipment/lamina-ultimo-sentinela-hd-v2.webp',
  machado_cinzento:'assets/art/hd/equipment/machado-montanhas-cinzentas-hd-v2.webp'
}

export const HEROES = heroes as Hero[]
function equipmentSetId(item:Equipment):EquipmentSetId|undefined{const value=`${item.id} ${item.nome}`.toLocaleLowerCase('pt-BR');if(/lua|lunar|lunargenta|abdendriel/.test(value))return'lua';if(/cinza|dragão|escarlate/.test(value))return'cinzas';if(/khar|runa|bronze|kholgard/.test(value))return'khar';if(/eclipse|sombr|malgor|véu|vazio/.test(value))return'eclipse'}
function equipmentActiveEffect(item:Equipment):EquipmentActiveEffect|undefined{if(item.slot==='bolsa')return;const text=`${item.nome} ${item.habilidade}`.toLocaleLowerCase('pt-BR');if(/antídoto|purific|clareza/.test(text))return{type:'cleanse',value:1,uses:1,description:'Remove todas as condições negativas.'};if(/destino|tempo|mente/.test(text))return{type:'reroll',value:1,uses:1,description:'Concede +1 na próxima rolagem.'};if(/escudo|muro|baluarte|proteção|guardião/.test(text))return{type:'shield',value:3,uses:1,description:'Concede 3 de escudo.'};if(/recupere|vida|cura|seiva|orvalho/.test(text))return{type:'heal',value:4,uses:1,description:'Recupera até 4 de vida.'};if(/fogo|brasa|chama/.test(text))return{type:'element',value:2,uses:1,element:'fogo',description:'Ataque +2 que aplica queimadura.'};if(/gelo|geada|inverno/.test(text))return{type:'element',value:2,uses:1,element:'gelo',description:'Ataque +2 que aplica congelamento.'};if(/veneno|natureza|floresta/.test(text))return{type:'element',value:2,uses:1,element:'natureza',description:'Ataque +2 que aplica veneno.'};if(item.slot==='mao_direita')return{type:'attack',value:3,uses:1,description:'Realiza um ataque com +3 de dano base.'};return{type:'shield',value:2,uses:1,description:'Concede 2 de escudo.'}}
function enrichEquipment(item:Equipment):Equipment{return{...item,setId:item.setId??equipmentSetId(item),activeEffect:item.activeEffect??equipmentActiveEffect(item)}}
const RAW_EQUIPMENT = [...(equipments as Equipment[]).map(equipment=>enrichEquipment({
  ...equipment,
  arte:EQUIPMENT_HD_OVERRIDES[equipment.id]??hdCollectionArt(equipment.arte,'equipment')
})),...EXTRA_EQUIPMENT,...CLASS_OFFHANDS,...CLASS_HEADGEAR,...CLASS_ARMOR,...CLASS_LEGWEAR,...CLASS_BOOTS,...NEW_CLASS_EQUIPMENT,...NEW_HEROES_WEAPONS,...SHARED_EQUIPMENT,...SHARED_CLASS_PROGRESSION,...BONUS_EQUIPMENT,...BACKPACKS].map(enrichEquipment)
// Economia da loja: mantém o balanceamento-base anterior (1,6×) e aplica
// o novo encarecimento global de 10× a equipamentos e consumíveis.
const ITEM_PRICE_MULTIPLIER=16
// Profundidade máxima considerada no multiplicador de vida/ouro da masmorra (startDungeon):
// além desse andar o multiplicador para de crescer, porque o nível do inimigo (nivel) já
// satura em sub.nivelMax+2 bem antes disso -- sem esse teto, vida/ouro continuavam subindo
// pra sempre com a profundidade mesmo depois do nível parar de subir.
const DUNGEON_SCALING_DEPTH=25
// Garante que a masmorra nunca fique mais fácil (ou pare de recompensar melhor) de um andar
// pro seguinte: a dificuldade tem que crescer pelo menos esse tanto (em enemyPointCost) a cada
// andar; recompensa (xp/ouro) sobe entre o mínimo e o máximo abaixo -- nunca cai, nunca dispara.
const DUNGEON_MIN_DIFFICULTY_GROWTH=.04
const DUNGEON_REWARD_MIN_GROWTH=.02
const DUNGEON_REWARD_MAX_GROWTH=.12
export const LIFE_CHANCE:Record<string,number>={essencia_vital:.35,elixir_fenix:.5}
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

const STARTER_GOLD=100
const starter: Record<string,{equipped:Partial<Record<Slot,string>>, items:Record<string,number>, gold:number}> = {
  guerreiro: { equipped:{mao_direita:'lamina_vento',mao_esquerda:'leve_estrada',peitoral:'armor_leao_valoria',bolsa:'sacola_4'}, items:{pocao_cura:1}, gold:STARTER_GOLD },
  guardiao: { equipped:{mao_direita:'machado_bronze',mao_esquerda:'pesado_bronze',peitoral:'armor_pesada_khardur',bolsa:'sacola_4'}, items:{pocao_cura:2}, gold:STARTER_GOLD },
  arcanista: { equipped:{mao_direita:'orbe_veu',mao_esquerda:'grimorio_lua',peitoral:'veste_estrelas',bolsa:'sacola_4'}, items:{pocao_cura:1,elixir_reflexo:1}, gold:STARTER_GOLD },
  cacadora: { equipped:{mao_direita:'facas_predador',peitoral:'traje_raposa',bolsa:'sacola_4'}, items:{pocao_cura:1,bomba_fumaca:1}, gold:STARTER_GOLD }
  ,druida: { equipped:{mao_direita:'druida_arma_broto_de_abdendriel',mao_esquerda:'druida_mao_esquerda_broto_de_abdendriel',peitoral:'druida_peitoral_broto_de_abdendriel',bolsa:'sacola_4'}, items:{pocao_cura:2}, gold:STARTER_GOLD }
  ,cacador: { equipped:{mao_direita:'cacador_arma_vigia_das_cinzas',mao_esquerda:'cacador_mao_esquerda_vigia_das_cinzas',peitoral:'cacador_peitoral_vigia_das_cinzas',bolsa:'sacola_4'}, items:{pocao_cura:1,bomba_fumaca:1}, gold:STARTER_GOLD }
  ,monge: { equipped:{mao_direita:'manoplas_brasa',peitoral:'traje_andarilhos',bolsa:'sacola_4'}, items:{pocao_cura:1}, gold:STARTER_GOLD }
  ,sacerdotisa: { equipped:{mao_direita:'cetro_alvorada',peitoral:'manto_ordem_vida',bolsa:'sacola_4'}, items:{pocao_cura:2}, gold:STARTER_GOLD }
  ,conjurador: { equipped:{mao_direita:'totem_eco',peitoral:'veste_circulo_arcano',bolsa:'sacola_4'}, items:{pocao_cura:1,elixir_reflexo:1}, gold:STARTER_GOLD }
}

// Tour de boas-vindas: percorre as mesmas telas do menu superior (`nav`, em main.tsx), uma
// por vez, navegando de verdade para cada uma enquanto explica o que ela faz. Começa assim
// que uma campanha nova é criada (newGame) e pode ser refeito a qualquer momento pelo botão
// na tela de Tutorial. tourStep undefined = tour inativo; um índice válido = passo atual.
export const TOUR_STEPS:{screen:Screen;title:string;text:string;highlights:string[];tip:string}[] = [
 {screen:'map',title:'Comece pelo Mapa',text:'Explore Havendown e Steelmere por regiões e sub-regiões. Cada destino mostra nível recomendado, progresso e encontros necessários para revelar o chefe.',highlights:['Eventos e escolhas durante a viagem','Chefes, masmorras e revanche progressiva'],tip:'Comece por um destino próximo do seu nível.'},
 {screen:'character',title:'Construa seu herói',text:'Na Ficha você distribui atributos, consulta habilidades e transforma uma das nove classes em uma build própria.',highlights:['12 talentos desbloqueados até o nível 90','Especializações nos níveis 10, 25, 50 e 75'],tip:'Vida, Ataque e Defesa têm efeitos diferentes; leia o resumo antes de investir.'},
 {screen:'inventory',title:'Prepare a Mochila',text:'Consumíveis e equipamentos guardados ficam aqui. Poções, elixires, óleos e utilitários podem mudar uma luta difícil.',highlights:['Consumíveis não ocupam espaços de equipamento','A bolsa equipada define a capacidade'],tip:'Leve cura antes de enfrentar um chefe ou entrar em uma masmorra.'},
 {screen:'equipment',title:'Monte sua build',text:'Equipe até dez slots, compare atributos e respeite requisitos de nível, classe e afinidade.',highlights:['Conjuntos concedem bônus combinados','Elementos, resistências, pedras e efeitos ativos'],tip:'O maior Ataque nem sempre vence uma boa combinação de conjunto e resistência.'},
 {screen:'shop',title:'Negocie na Loja',text:'Compre pelo carrinho, filtre o catálogo e venda o que não usa. Itens épicos e lendários são conquistados em desafios e na Forja.',highlights:['Validação de ouro, nível, classe e espaço','Compra em lote e venda direta'],tip:'Reserve ouro para aprimoramentos e especializações.'},
 {screen:'forge',title:'Domine a Forja',text:'Desmonte espólios, reúna materiais regionais e crie ou aprimore equipamentos com receitas cada vez mais avançadas.',highlights:['Melhorias até +3, pedras e efeitos forjados','Sintonia elemental e experiência de Forjador'],tip:'Pedras instaladas ficam presas ao item; confira a build antes de confirmar.'},
 {screen:'guild',title:'Cresça na Guilda',text:'Aceite contratos de caça, chefes e entrega. As missões evoluem e concedem ouro, reputação e novos ranks.',highlights:['Ranks de Ferro a Campeão','Viagem rápida para o objetivo ativo'],tip:'Mantenha um contrato ativo enquanto explora para progredir mais rápido.'},
 {screen:'chronicle',title:'Acompanhe as Crônicas',text:'Aqui ficam história, escolhas e consequências, dificuldade, bestiário e a leitura completa da sua build.',highlights:['Modos Aventura, Veterano e Lendário','Marcos do bestiário e bônus de conjunto'],tip:'Consulte a intenção do inimigo e suas resistências antes de cada turno.'},
 {screen:'gallery',title:'Complete a Coleção',text:'Heróis, itens, criaturas, chefes e eventos descobertos viram cartas consultáveis com arte ampliada.',highlights:['Marcos de domínio em 25, 100 e 250 descobertas','Filtros por tipo e progresso visível'],tip:'Explorar novos lugares também fortalece seu domínio da coleção.'},
 {screen:'coop',title:'Aventure-se em dupla',text:'Crie uma sala em tempo real ou entre por código. O grupo confirma o destino e enfrenta o combate em turnos compartilhados.',highlights:['Recompensas por dano e cura realizados','Prontidão, presença e progresso sincronizados'],tip:'O modo online precisa estar configurado para criar salas.'},
 {screen:'tutorial',title:'Seu manual está sempre aqui',text:'Este tutorial reúne início rápido, combate, progressão e todos os sistemas avançados. Abra apenas o capítulo que precisar.',highlights:['Regras detalhadas e dicas práticas','Tour disponível novamente a qualquer momento'],tip:'Agora volte ao Mapa e faça sua primeira exploração.'},
]

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

// Curva única (sem tabela fixa nem quebra de fórmula) cobrindo 1-200: quadrática, "desafiadora
// mas alcançável". Nível 100 (o endgame atual, com conteúdo/equipamentos) exige ~3,38 milhões de
// XP acumulado; nível 200 (sem conteúdo próprio ainda -- fica pro próximo continente) ~26,9
// milhões, como meta de longuíssimo prazo. Farmar xp antes disso estava rápido demais.
function costForLevel(level:number){
  return Math.max(1,Math.round(10*Math.pow(level,2)))
}
export function deriveLevel(totalXp:number){ let lvl=1, spent=0; while(totalXp >= spent+costForLevel(lvl)){spent+=costForLevel(lvl);lvl++} return {lvl,progress:totalXp-spent,next:costForLevel(lvl)} }
const EQUIPMENT_INSTANCE_SEPARATOR='@@'
export function equipmentBaseId(ref?:string){return (ref??'').split(EQUIPMENT_INSTANCE_SEPARATOR)[0]}
export function equipmentByRef(ref?:string){return EQUIPMENT.find(e=>e.id===equipmentBaseId(ref))}
function eqById(ref?:string){return equipmentByRef(ref)}
export function createEquipmentInstance(baseId:string){return `${equipmentBaseId(baseId)}${EQUIPMENT_INSTANCE_SEPARATOR}${Date.now().toString(36)}${Math.random().toString(36).slice(2,9)}`}
function equipmentRefMatches(ref:string|undefined,baseId:string|undefined){return Boolean(ref&&baseId&&equipmentBaseId(ref)===equipmentBaseId(baseId))}
function migrateEquipmentInstances<T extends Record<string,any>>(state:T):T{
 const bag:string[]=state.equipmentBag??[],equipped:Record<string,string|undefined>=state.equipped??{}
 if([...bag,...Object.values(equipped).filter(Boolean)].every(ref=>ref!.includes(EQUIPMENT_INSTANCE_SEPARATOR)))return state
 const preferred:Record<string,string>={}
 const migratedEquipped=Object.fromEntries(Object.entries(equipped).map(([slot,ref])=>{if(!ref)return[slot,ref];const next=ref.includes(EQUIPMENT_INSTANCE_SEPARATOR)?ref:createEquipmentInstance(ref);preferred[equipmentBaseId(ref)]??=next;return[slot,next]}))
 const migratedBag=bag.map(ref=>{const next=ref.includes(EQUIPMENT_INSTANCE_SEPARATOR)?ref:createEquipmentInstance(ref);preferred[equipmentBaseId(ref)]??=next;return next})
 const migrateRecord=(record:Record<string,any>={})=>Object.fromEntries(Object.entries(record).map(([ref,value])=>[ref.includes(EQUIPMENT_INSTANCE_SEPARATOR)?ref:preferred[equipmentBaseId(ref)]??ref,value]))
 return{...state,equipmentBag:migratedBag,equipped:migratedEquipped,equipmentUpgrades:migrateRecord(state.equipmentUpgrades),equipmentGems:migrateRecord(state.equipmentGems),forgedGemLocked:migrateRecord(state.forgedGemLocked),craftedEffects:migrateRecord(state.craftedEffects),equipmentElements:migrateRecord(state.equipmentElements),equipmentResistances:migrateRecord(state.equipmentResistances)}
}
export type WeaponAffinity='guerreiro'|'guardiao'|'cacadora'|'arcanista'|'druida'|'cacador'|'monge'|'sacerdotisa'|'conjurador'
// Escala de progressão 1-100: 12 tiers (em vez dos 8 antigos, que paravam no nível 17) para dar
// aos ~570 itens do acervo atual um caminho de conquista mais longo — raro só começa a partir do
// nível 17, épico exige nível 47+ e lendário só a partir do nível 78, perto do teto de 100. Grupos
// pequenos continuam limitados a um prefixo desta lista (ver Math.min abaixo em balanceEquipment),
// então um grupo de 2-3 itens nunca pula direto para o topo da escala.
export const EQUIPMENT_LEVELS=[1,5,10,17,26,36,47,58,68,78,89,100]
const LEVEL_RARITY:Rarity[]=['comum','incomum','incomum','raro','raro','raro','epico','epico','epico','lendario','lendario','lendario']
const FREE_EQUIPMENT=new Set(['lamina_vento','leve_estrada','armor_leao_valoria','machado_bronze','pesado_bronze','armor_pesada_khardur','orbe_veu','grimorio_lua','veste_estrelas','facas_predador','broquel_raposa','traje_raposa','pederneira_ancestrais','armadura_couro','botas_viajante','calcas_batedor','druida_arma_broto_de_abdendriel','druida_mao_esquerda_broto_de_abdendriel','druida_peitoral_broto_de_abdendriel','cacador_arma_vigia_das_cinzas','cacador_mao_esquerda_vigia_das_cinzas','cacador_peitoral_vigia_das_cinzas','sacola_4'])
// Só comum/incomum/raro (tiers 0-5) chegam a ser comprados na loja de verdade (épico/lendário são
// bloqueados em buyEquipment, só saem via Forja) — então o desconto de "início de jogo" se
// concentra nesses tiers e converge para preço cheio a partir do raro avançado (tier 4+), sem
// mexer no valor de venda/forja dos itens de ponta. Com ouro inicial de 10-20 e as primeiras
// vitórias rendendo poucas moedas, o preço cheio (Math.max(item.preco,floor)*MULTIPLIER) deixava
// literalmente nenhum equipamento comprável no começo da jornada.
const TIER_PRICE_FACTOR=[.1,.25,.4,.6,.8,1,1,1,1,1,1,1]
function equipmentPower(e:Equipment){return e.ataque*2+e.defesa*2+e.vida*.5}
function balanceEquipment(items:Equipment[]){
 const groups=new Map<string,Equipment[]>()
 for(const item of items){const affinity=item.slot==='mao_direita'?equipmentAffinity(item):undefined;const owner=item.classeExclusiva??affinity??'universal';const key=`${owner}:${item.slot}`;groups.set(key,[...(groups.get(key)??[]),item])}
 const balanced=new Map<string,Equipment>()
 for(const group of groups.values()){
  const sorted=[...group].sort((a,b)=>equipmentPower(a)-equipmentPower(b)||a.preco-b.preco||a.nome.localeCompare(b.nome,'pt-BR'))
  const priced=sorted.map((item,index)=>{const tier=sorted.length===1?0:Math.round(index*Math.min(EQUIPMENT_LEVELS.length-1,sorted.length-1)/(sorted.length-1));const free=FREE_EQUIPMENT.has(item.id);const level=free?1:EQUIPMENT_LEVELS[tier];return{item,level,rarity:free?item.raridade:LEVEL_RARITY[tier],preco:Math.max(item.preco,8+level*3)*TIER_PRICE_FACTOR[free?0:tier]}})
  // Um preço-base mais alto do que o piso do seu tier só é mantido (nunca reduzido) até aqui, então um item
  // mais fraco cujo preço original veio inflado (ex.: por causa de uma habilidade especial) podia acabar
  // custando mais do que um item estritamente melhor no mesmo grupo (mesmo dentro do mesmo tier, já que o
  // tier agrupa faixas de poder, não valores exatos). `sorted`/`priced` já está em ordem crescente de poder,
  // então basta percorrer do mais forte para o mais fraco reduzindo cada preço ao mínimo já visto à frente.
  let ceiling=Infinity
  for(let i=priced.length-1;i>=0;i--){priced[i].preco=Math.min(priced[i].preco,ceiling);ceiling=Math.min(ceiling,priced[i].preco)}
  for(const{item,level,rarity,preco}of priced)balanced.set(item.id,{...item,nivelMinimo:level,raridade:rarity,preco})
 }
 return items.map(item=>{const result=item.slot==='bolsa'?item:(balanced.get(item.id)??{...item,nivelMinimo:1});return{...result,preco:Math.ceil(result.preco*ITEM_PRICE_MULTIPLIER)}})
}
export const EQUIPMENT=balanceEquipment(RAW_EQUIPMENT)
export const FORGE_RECIPES=buildForgeRecipes(EQUIPMENT)
export function equipmentBagCapacity(s:{equipped:Partial<Record<Slot,string>>}){return eqById(s.equipped.bolsa)?.capacidade??8}
export function equipmentRequiredLevel(e:Equipment){return Math.max(1,e.nivelMinimo??1)}
export function equipmentLevelAllowed(e:Equipment,xp:number){return deriveLevel(xp).lvl>=equipmentRequiredLevel(e)}
const CONSUMABLE_LOOT_LEVEL:Record<Rarity,number>={comum:1,incomum:4,raro:8,epico:12,lendario:16,mitico:20,heroico:20}
function monsterLootLevel(enemy:Enemy){const level=Math.max(1,enemy.nivel??enemy.dificuldade);return level+(enemy.boss?2:enemy.elite?1:0)}
// Chances de espólio e a divisão equipamento/consumível abaixo foram elevadas depois que
// jogadores relataram matar dezenas de inimigos nas Planícies e só receber poções -- o piso
// de 30% de qualquer drop, combinado com o sorteio 50/50 entre equipamento e consumível,
// deixava um equipamento a cada 6-7 vitórias em média nos primeiros níveis.
// bonus soma as fontes de "mais chance de espólio" que existiam no jogo mas nunca eram lidas em
// lugar nenhum: a escolha de história 'trofeu' (storyModifiers().drop), a especialização
// 'tesouro' (specializationBonuses().loot) e o efeito forjado 'sorte' (hasCraftedEffect(s,'sorte'),
// das receitas de Orbe das Colheitas/Relíquia do Explorador) -- o jogador pagava ou escolhia esses
// bônus e eles nunca mudavam a chance real de um monstro largar algo.
export function monsterDropChance(enemy:Enemy,bonus=0){const level=Math.max(1,enemy.nivel??enemy.dificuldade);const base=enemy.boss?1:enemy.elite?Math.min(.9,.68+level*.012):Math.min(.72,.42+level*.012);return Math.min(1,base+bonus)}
function equipmentTierIndex(level:number){return EQUIPMENT_LEVELS.reduce((idx,lvl,i)=>lvl<=level?i:idx,0)}
// Drop pode "vislumbrar" até 1 tier acima do nível atual do herói — o item cai na bolsa mesmo que
// ele ainda não possa equipar (equipmentLevelAllowed continua bloqueando o equip), virando uma meta
// visível de conquista em vez de um teto que nunca surpreende.
function equipmentLootPool(enemy:Enemy,heroId:string|undefined,heroLevel:number){const reachLevel=EQUIPMENT_LEVELS[Math.min(EQUIPMENT_LEVELS.length-1,equipmentTierIndex(heroLevel)+1)];const cap=Math.min(reachLevel,monsterLootLevel(enemy));return EQUIPMENT.filter(e=>!FREE_EQUIPMENT.has(e.id)&&equipmentRequiredLevel(e)<=cap&&equipmentClassAllowed(e,heroId))}
function consumableLootPool(enemy:Enemy){const cap=monsterLootLevel(enemy);return CONSUMABLES.filter(item=>(CONSUMABLE_LOOT_LEVEL[item.raridade??'comum']??1)<=cap)}
// Épico e lendário continuam podendo cair de inimigos/baús/missões, mas com chance muito menor —
// o caminho confiável para essas raridades é a Forja (loja bloqueia a compra direta delas).
const RARITY_LOOT_WEIGHT:Record<Rarity,number>={comum:100,incomum:60,raro:30,epico:6,lendario:2,mitico:2,heroico:2}
// Usada só quando o efeito forjado 'sorte' está ativo ("melhor qualidade de espólios") --
// reduz o peso de comum/incomum e aumenta o de raro em diante, deslocando o sorteio pra cima
// sem tornar épico/lendário tão comuns quanto os tiers baixos.
const RARITY_LOOT_WEIGHT_BOOSTED:Record<Rarity,number>={comum:55,incomum:55,raro:45,epico:12,lendario:5,mitico:5,heroico:5}
function pickWeightedEquipment(pool:Equipment[],boosted=false):Equipment|undefined{
 if(!pool.length)return undefined
 const table=boosted?RARITY_LOOT_WEIGHT_BOOSTED:RARITY_LOOT_WEIGHT
 const weight=(e:Equipment)=>table[e.raridade??'comum']??table.comum
 let roll=Math.random()*pool.reduce((sum,e)=>sum+weight(e),0)
 for(const e of pool){roll-=weight(e);if(roll<=0)return e}
 return pool[pool.length-1]
}
export function equipmentAffinity(e:Equipment):WeaponAffinity|undefined{if(e.tipoEquipamento==='arco'||e.tipoEquipamento==='balestra')return'cacador';if(e.tipoEquipamento==='cajado_natureza'||e.tipoEquipamento==='pergaminho')return'druida';if(e.tipoEquipamento==='manopla')return'monge';if(e.tipoEquipamento==='cetro_sagrado')return'sacerdotisa';if(e.tipoEquipamento==='totem_invocacao')return'conjurador';const name=e.nome.toLocaleLowerCase('pt-BR');if(/arco|balestra/.test(name))return'cacador';if(/cajado.*(broto|raiz|orvalho|carvalho|lua verde|seiva|lunargenta|arquedruida)|pergaminho/.test(name))return'druida';if(/manopla|punho/.test(name))return'monge';if(/cetro|báculo/.test(name))return'sacerdotisa';if(/totem/.test(name))return'conjurador';if(/espada|lâmina/.test(name))return'guerreiro';if(/machado|martelo/.test(name))return'guardiao';if(/faca|adaga/.test(name))return'cacadora';if(/cajado|orbe/.test(name))return'arcanista';return undefined}
const FACAS_OFFHAND_ATTACK_BONUS=1
export function equipmentWeaponClass(e?:Equipment):'facas'|'adaga'|undefined{if(!e||e.slot!=='mao_direita')return undefined;if(e.tipoEquipamento==='facas')return'facas';if(e.tipoEquipamento==='adaga')return'adaga';const name=e.nome.toLocaleLowerCase('pt-BR');if(/facas?\b/.test(name))return'facas';if(/adaga/.test(name))return'adaga';return undefined}
export type AttackAnimType='corte'|'facas'|'martelo'|'magico'|'furo'|'garras'|'espinhos'
export function heroWeaponAnimationType(weaponId?:string):AttackAnimType{
 const e=eqById(weaponId)
 if(!e)return'corte'
 const weaponClass=equipmentWeaponClass(e)
 if(weaponClass==='facas')return'facas'
 if(weaponClass==='adaga')return'corte'
 if(e.tipoEquipamento==='arco'||e.tipoEquipamento==='balestra')return'furo'
 if(e.tipoEquipamento==='cajado_natureza')return'espinhos'
 if(e.tipoEquipamento==='manopla')return'garras'
 if(e.tipoEquipamento==='cetro_sagrado'||e.tipoEquipamento==='totem_invocacao')return'magico'
 const name=e.nome.toLocaleLowerCase('pt-BR')
 if(/martelo/.test(name))return'martelo'
 if(/manopla|punho/.test(name))return'garras'
 if(/cetro|báculo|totem/.test(name))return'magico'
 if(/cajado|orbe|grim[óo]rio|varinha|tomo/.test(name))return'magico'
 if(/arco|balestra|besta\b/.test(name))return'furo'
 return'corte'
}
export function enemyWeaponAnimationType(enemy:Enemy):AttackAnimType{
 const nome=enemy.nome.toLocaleLowerCase('pt-BR'),hab=(enemy.habilidade??'').toLocaleLowerCase('pt-BR')
 if(/flecha|seta\b|besta\b|arco\b|dispara|tiro/.test(hab)||/arqueiro|atirador|besteiro/.test(nome))return'furo'
 if(/lobo|urso|fera|felino|c[ãa]o\b|corvo|ave\b|javali|aranha|inseto|escorpi|verme|drag[ãa]o|draconato|wyrm|filhote|garra/.test(nome))return'garras'
 if(/golem|sentinela|guardi[ãa]o|guardi[ãa]|magma|pedra|metal|ferro|armadura/.test(nome))return'martelo'
 if(/ilusionista|arcano|feiticeir|mago|xam[ãa]|esp[íi]rito|fantasma|espectro|necro|sombra/.test(nome))return'magico'
 return'corte'
}
export function equipmentAttackForHero(e:Equipment,heroId?:string){const affinity=equipmentAffinity(e);return affinity&&heroId!==affinity?Math.max(0,e.ataque-1):e.ataque}
export function equipmentCompatibility(e:Equipment,heroId?:string){const affinity=equipmentAffinity(e);if(!affinity)return{affinity:undefined,compatible:true,penalty:0};const compatible=heroId===affinity;return{affinity,compatible,penalty:compatible?0:e.ataque-equipmentAttackForHero(e,heroId)}}
export function equipmentClassAllowed(e:Equipment,heroId?:string){if(!e.classeExclusiva)return true;return Array.isArray(e.classeExclusiva)?e.classeExclusiva.includes(heroId??''):e.classeExclusiva===heroId}

interface Loot { gold:number; xp:number; itemId?:string; equipmentId?:string; missedEquipmentId?:string; title:string }
interface EventResult { message:string; roll?:number; tone:'good'|'bad'|'neutral' }
interface CombatRoll { attacker:'hero'|'enemy'; naturalAttackRoll:number; attackRoll:number; attackBonus:number; defenseRoll:number; attackBase:number; defenseBase:number; attackEffect:string; defenseEffect:string; damage:number; selfDamage:number; shieldBlocked?:number }
interface FleeRoll { roll:number; outcome:'failed'|'neutral'|'success' }
export interface CombatMinion { id:string; nome:string; hp:number; maxHp:number; ataque:number }
export type SummonType='atacante'|'defensor'|'arcano'
export interface Summon { tipo:SummonType; nome:string; hp:number; maxHp:number; ataque:number; defesa:number }
export const SUMMON_ATTACK_ANIMATION:Record<SummonType,AttackAnimType>={atacante:'garras',arcano:'magico',defensor:'martelo'}
export type EnemyIntentType='attack'|'heavy'|'guard'|'status'|'summon'|'recover'
export interface EnemyIntent{type:EnemyIntentType;label:string;description:string}
export function enemyIntentFor(enemy:Enemy,turn:number):EnemyIntent{const phase=enemy.fase??1;if(enemy.boss&&turn%4===0)return{type:'summon',label:'Convocar reforços',description:'Invocará capangas antes do próximo golpe.'};if(enemy.boss&&phase>1&&turn%5===0)return{type:'recover',label:'Regeneração sombria',description:'Recuperará parte da vida antes de atacar.'};const cycle=(turn+enemy.dificuldade)%4;if(cycle===0)return{type:'heavy',label:'Ataque pesado',description:'Causará mais dano, mas ficará sem proteção.'};if(cycle===1)return{type:'guard',label:'Guarda fechada',description:'Recebe +2 de defesa até realizar sua ação.'};if(cycle===2)return{type:'status',label:`Golpe de ${enemy.elemento??'físico'}`,description:'Tentará aplicar uma condição elemental.'};return{type:'attack',label:'Ataque direto',description:'Executará um ataque normal.'}}
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
// step é limitado ao mesmo teto da dificuldade (9, já que dificuldade satura em 10) --
// antes só a dificuldade/quantidade saturavam e o ouro (1+step*.65) crescia sem limite a
// cada nova geração da mesma missão repetida, permitindo ouro infinito entregando sempre o
// mesmo item barato (ex.: Armadura de Couro Batido) por uma recompensa cada vez maior.
function evolvedGuildMission(base:GuildMission,generation:number):GuildMission{if(generation<=1)return base;const step=Math.min(9,generation-1),difficulty=Math.min(10,base.dificuldade+step),quantity=base.tipo==='delivery'?1:base.quantidade+step*(base.tipo==='boss'?1:2),gold=base.recompensa.tipo==='gold'?Math.round(base.recompensa.valor*(1+step*.65)):base.recompensa.valor;return{...base,id:`${base.id}__${generation}`,nome:`${base.nome} ${['','II','III','IV','V','VI','VII','VIII','IX','X'][Math.min(9,generation-1)]??`+${step}`}`,descricao:base.tipo==='delivery'?base.descricao:`${/\d+/.test(base.descricao)?base.descricao.replace(/\d+/,String(quantity)):`${base.descricao} Desta vez são necessárias ${quantity} vitórias.`} A ameaça está mais perigosa nesta nova etapa.`,quantidade:quantity,dificuldade:difficulty,recompensa:{...base.recompensa,valor:gold}}}
export function guildMissionById(id:string){const [baseId,generationText]=id.split('__'),base=BASE_GUILD_MISSIONS.find(m=>m.id===baseId);return base?evolvedGuildMission(base,Number(generationText)||1):undefined}
export function availableGuildMissions(claimed:string[]=[]){return BASE_GUILD_MISSIONS.map(base=>{let generation=1;while(claimed.includes(generation===1?base.id:`${base.id}__${generation}`))generation++;return evolvedGuildMission(base,generation)})}
interface GameState {
 screen:Screen; heroId?:string; hp:number; gold:number; xp:number; attributePoints:number; attr:{vida:number;ataque:number;defesa:number}; allocatedAttr:{vida:number;ataque:number;defesa:number}; balanceVersion:number;
 inventory:Record<string,number>; equipmentBag:string[]; equipped:Partial<Record<Slot,string>>; territory:string; regionId:string; world:string; subregionId?:string; victories:Record<string,number>; subregionVictories:Record<string,number>; bossesDefeated:string[]; subregionBossesDefeated:string[];
 enemy?:Enemy; enemyHp:number; enemyIntent?:EnemyIntent; combatMinions?:CombatMinion[]; combatTurn:number; combatLog:string[]; coin?:'cara'|'coroa'; playerTurn:boolean; animating:boolean; animationActor?:'hero'|'enemy'; lastDamage?:number; combatRoll?:CombatRoll; fleeRoll?:FleeRoll; heroRollBonus:number; enemyRollBonus:number; enemyFearPenalty:number; heroSkillUses:number; itemSkillUsed:boolean; shield:number; combatAttackPct:number; combatDefensePct:number; classRollBonus:number; classBuffTurns:number; summon?:Summon; summonAttackFx?:{types:AttackAnimType[];nonce:number}; lifeWardActive:boolean; phoenixUsed:boolean; extraHeroAttacks:number; guardianTaunt:boolean; groupCriticalBoost:boolean; braced:boolean; braceBonusUsed:boolean; fervor:number; firstStrikeBonus:number; heroStatus?:StatusEffects; enemyStatus?:StatusEffects; supportFx?:{type:'fortificacao'|'cura'|'cura-item'};
 summons?:Summon[];
 loot?:Loot; selectedGallery:number; shopMode:'buy'|'sell'; explorationNote?:string; currentEvent?:GameEvent; eventResult?:EventResult; pendingAttackBonus:number; activePotionIds:string[]; regenBoostUntil?:number; lastPassiveHealAt?:number; customCards:CustomCard[]; campaigns:Record<string,CampaignSave>; activeCampaignId?:string; guildAccepted:string[]; guildProgress:Record<string,number>; guildClaimed:string[]; guildNotice?:string;
 difficultyMode:DifficultyMode;talents:string[];specializations:Record<string,string>;materials:Record<string,number>;equipmentUpgrades:Record<string,number>;equipmentGems:Record<string,string[]>;forgedGemLocked:Record<string,boolean>;craftedEffects:Record<string,ForgeEffect>;equipmentElements:Record<string,Element>;equipmentResistances:Record<string,Element>;forgeXp?:number;forgeAttempts?:number;forgeSuccesses?:number;forgeResult?:{success:boolean;message:string;id:number};bestiary:Record<string,{encontros:number;vitorias:number}>;discoveredCards:string[];revengeWins:Record<string,number>;consecutiveDefeats:number;lastDefeatKey?:string;dungeonDepth:number;dungeonActive:boolean;dungeonSubregionId?:string;dungeonLastCost?:number;dungeonLastXpReward?:number;dungeonLastGoldReward?:number;storyFlags:string[];storyChapterId:string;storyChoices:Record<string,string>;storyNotice?:string;coopBattlesCompleted:string[];tourStep?:number;
 newGame:(heroId:string)=>void; setScreen:(s:Screen)=>void; travelWorld:(world:string)=>void; startCoopCombat:(enemy:Enemy,subregionId:string)=>void; syncCoopEnemyHp:(hp:number)=>void; completeCoopVictory:(battleId:string,subregionId:string,enemy:Enemy,rewardShare:number)=>void; receiveCoopEnemyAttack:(damage:number,roll:any)=>void; receiveCoopHeroAction:(damage:number,roll:any)=>void; receiveCoopSupportFx:(type:'fortificacao'|'cura'|'cura-item')=>void; receiveCoopHeal:(amount:number)=>void; completeCoopDefeat:(battleId:string)=>void; completeCoopFlee:(battleId:string)=>void; continueGame:()=>void; loadCampaign:(id:string)=>void; deleteCampaign:(id:string)=>void; acceptGuildMission:(id:string)=>void; claimGuildMission:(id:string)=>void; openRegion:(t:Territory)=>void; openSubregion:(subregionId:string)=>void; startEncounter:(subregionId:string)=>void; startBoss:()=>void;
 startTour:()=>void; nextTourStep:()=>void; prevTourStep:()=>void; endTour:()=>void;
 attack:(targetMinionId?:string)=>void; heroSkill:()=>void; summonMonster:(tipo:SummonType)=>void; itemSkill:(equipmentId?:string)=>void; useConsumable:(id:string)=>void; flee:()=>void; defend:()=>void; useFervor:()=>void;
 buyConsumable:(id:string)=>void; buyEquipment:(id:string)=>void; sellConsumable:(id:string)=>void; sellEquipment:(id:string)=>void;
 equip:(id:string)=>void; unequip:(slot:Slot)=>void; addAttribute:(k:'vida'|'ataque'|'defesa')=>void; setSelectedGallery:(n:number)=>void; toggleShopMode:()=>void; resolveEvent:(accept:boolean,approach?:'class')=>void; finishEvent:()=>void; finishLoot:()=>void; clearSave:()=>void;
 addCustomCard:(card:Omit<CustomCard,'id'|'criadoEm'>)=>void; removeCustomCard:(id:string)=>void;
 setDifficulty:(mode:DifficultyMode)=>void;unlockTalent:(id:string)=>void;chooseSpecialization:(level:number,id:string)=>void;resetSpecializations:()=>void;attuneEquipment:(id:string,element:Element)=>void;craftEquipment:(recipeId?:string,choice?:ForgeChoice)=>void;upgradeEquipment:(id:string)=>void;dismantleEquipment:(id:string)=>void;socketGem:(equipmentId:string,gemId:string)=>void;removeGem:(equipmentId:string,index:number)=>void;startDungeon:()=>void;selectDungeon:(subregionId:string)=>void;leaveDungeon:()=>void;startRevenge:(subregionId:string)=>void;chooseStory:(choiceId:string)=>void;
}

export function isNavigationLocked(state:Pick<GameState,'screen'|'dungeonActive'>){return state.screen==='combat'||(state.screen==='loot'&&state.dungeonActive)}

const EVENT_CHAINS=[
 ['A Última Carta','O Mensageiro dos Corvos','O Julgamento do Mercador'],
 ['A Flor que Canta','A Árvore das Cem Portas','A Fonte dos Nomes Perdidos'],
 ['O Ferreiro sem Material','A Forja Adormecida','O Último Ferreiro'],
 ['O Grito na Névoa','O Peregrino sem Rosto','A Aurora Negra']
]
function nextStoryEvent(s:GameState){for(const chain of EVENT_CHAINS){for(let i=1;i<chain.length;i++){if(s.storyFlags.includes(chain[i-1])&&!s.storyFlags.includes(chain[i])){const next=EVENTS.find(e=>e.nome===chain[i]);if(next)return next}}}return undefined}
// A "habilidade" de um equipamento é texto de flavor (usado em toda outra tela do jogo) e ao
// mesmo tempo o gatilho por palavra-chave do botão "Usar" em combate (itemSkill em game.ts) --
// mostrar esse texto como "o que a habilidade faz" é enganoso na maioria dos itens, já que a
// frase raramente descreve o efeito mecânico real. Esta função devolve o efeito de fato.
export function itemSkillEffectText(item:Pick<Equipment,'habilidade'|'activeEffect'>){return item.activeEffect?`Ativa: ${item.activeEffect.description} Uso único por batalha.`:'Este equipamento não possui efeito ativo.'}
export function equipmentSetCounts(s:GameState){const ids=Object.values(s.equipped).map(id=>eqById(id)?.setId);return{lua:ids.filter(id=>id==='lua').length,cinzas:ids.filter(id=>id==='cinzas').length,khar:ids.filter(id=>id==='khar').length,eclipse:ids.filter(id=>id==='eclipse').length}}
export function specializationBonuses(s:GameState){const choices=Object.values(s.specializations??{});return{attack:(choices.includes('lenda')?2:0),defense:(choices.includes('defensiva')?1:0)+(choices.includes('baluarte')?2:0)+(choices.includes('lenda')?2:0),life:(choices.includes('vital')?10:0)+(choices.includes('utilidade')?5:0),crit:choices.includes('ofensiva') ? .05 : 0,bossDamage:choices.includes('carrasco')?3:0,loot:choices.includes('tesouro') ? .1 : 0,reward:choices.includes('fortuna') ? .2 : 0,elemental:choices.includes('elemental'),fenix:choices.includes('fênix')}}
export function storyModifiers(s:GameState){const choices=Object.values(s.storyChoices??{});return{attack:choices.includes('tomar')?2:choices.includes('roubo')?1:0,defense:(choices.includes('selar')||choices.includes('luz'))?1:0,reward:(choices.includes('pagamento')||choices.includes('vender')) ? .1 : 0,drop:choices.includes('trofeu') ? .08 : 0,forge:(choices.includes('guilda')||choices.includes('ritual')) ? .05 : 0}}
// Normaliza o nome exibido de um inimigo para a chave "real" da criatura usada no bestiário/
// coleção -- precisa remover TODOS os prefixos decorativos (masmorra, vingança, variante),
// senão o mesmo monstro vira uma chave diferente por andar/vingança e nunca acumula vitórias.
export function enemyDisplayKey(name:string){return name.replace(/^Masmorra \d+: /,'').replace(/^Vingança \d+: /,'').replace(/^(Veterano|Elite|Campeão): /,'')}
export function bestiaryDamageBonus(s:GameState,enemy:Enemy|undefined){if(!enemy)return 0;const key=enemyDisplayKey(enemy.nome),wins=s.bestiary[key]?.vitorias??0;return wins>=BESTIARY_MILESTONES[2].wins?1:0}
export function collectionMastery(s:GameState){const count=(s.discoveredCards??[]).length;return{count,life:count>=25?5:0,attack:count>=100?1:0,defense:count>=250?1:0,next:count<25?25:count<100?100:count<250?250:undefined}}
export function hasCraftedEffect(s:GameState,effect:ForgeEffect){return Object.values(s.equipped).some(id=>Boolean(id)&&s.craftedEffects?.[id!]===effect)}
const RARITY_TIER:Record<Rarity,number>={comum:0,incomum:1,raro:2,epico:3,lendario:4,mitico:5,heroico:6}
export const RARITY_LABEL:Record<Rarity,string>={comum:'Comum',incomum:'Incomum',raro:'Raro',epico:'Épico',lendario:'Lendário',mitico:'Mítico',heroico:'Heroico'}
// Forjar sem bônus um item comum continua só custando os materiais de sempre. A partir de
// incomum, a peça também exige "sacrificar" peças prontas de uma raridade abaixo -- sobem
// no forno e viram a peça de cima, então cada tier fica mais raro por depender do anterior.
// Só cobre até lendário porque nenhum equipamento mítico/heroico existe hoje; o padrão de 3
// peças do tier anterior é reaproveitado como extensão natural caso isso mude.
export const FORGE_SACRIFICE:Partial<Record<Rarity,{rarity:Rarity,qty:number}>>={incomum:{rarity:'comum',qty:1},raro:{rarity:'incomum',qty:2},epico:{rarity:'raro',qty:3},lendario:{rarity:'epico',qty:3},mitico:{rarity:'lendario',qty:3},heroico:{rarity:'mitico',qty:3}}
export function forgeSacrificeOwned(s:{equipmentBag:string[]},rarity:Rarity){return s.equipmentBag.filter(id=>(eqById(id)?.raridade??'comum')===rarity).length}
export function druidHealProc(s:GameState){
 if(s.heroId!=='druida')return{chance:0,amount:0}
 const items=[eqById(s.equipped.mao_direita),eqById(s.equipped.mao_esquerda)].filter((e):e is Equipment=>Boolean(e&&(e.tipoEquipamento==='cajado_natureza'||e.tipoEquipamento==='pergaminho')))
 if(!items.length)return{chance:0,amount:0}
 let chance=0,amount=0
 for(const item of items){const tier=RARITY_TIER[item.raridade??'comum']??0,level=item.nivelMinimo??1;chance+=.05+tier*.025+level*.005;amount+=1+tier+Math.floor(level/4)}
 return{chance:Math.min(.45,chance),amount:Math.max(1,amount)}
}
export function equipmentSocketCount(e:Equipment){const rarity=e.raridade??'comum';return rarity==='mitico'||rarity==='heroico'?3:rarity==='lendario'||rarity==='epico'?2:rarity==='raro'||rarity==='incomum'?1:0}
// Peso de material por slot: antes só armas ganhavam +1 físico fixo sobre os demais slots, e
// mágico/chance de pedra eram idênticos para QUALQUER slot da mesma raridade -- uma espada rara
// e um anel raro rendiam exatamente o mesmo material e a mesma chance de pedra ao desmontar.
// Agora todo o rendimento (físico, mágico, chance de pedra) escala pelo mesmo peso: armas e
// peitoral (peças mais robustas) rendem mais, joias (anéis/amuleto) e a bolsa rendem menos.
export const SLOT_MATERIAL_WEIGHT:Record<Slot,number>={mao_direita:1.3,mao_esquerda:1.15,peitoral:1.15,calcas:1,capacete:.95,botas:.9,amuleto:.75,anel_1:.65,anel_2:.65,bolsa:.5}
export function dismantlePreview(e:Equipment){const tier=Math.max(1,Math.ceil(equipmentRequiredLevel(e)/4)),weight=SLOT_MATERIAL_WEIGHT[e.slot]??1,physical=Math.max(1,Math.round(tier*weight)),magical=Math.max(0,Math.round(((e.raridade==='comum'?0:1)+(e.raridade==='epico'||e.raridade==='lendario'||e.raridade==='mitico'?1:0))*weight)),gemChance=Math.min(.85,(.08+tier*.05+(equipmentSocketCount(e)*.12))*weight);return{physical,magical,gemChance}}
// Custo de aprimoramento (Aprimorar +1/+2/+3): antes era fixo (10+(nivel+1)*10 = 20/30/40 ouro
// pra QUALQUER item), tão barato que aprimorar um comum de nível 1 custava o mesmo que um
// mítico de nível 100. Agora escala com o nível mínimo do item e sua raridade (RARITY_TIER),
// então equipar algo realmente poderoso custa proporcionalmente mais pra aprimorar.
export function equipmentUpgradeCost(e:Equipment,currentLevel:number){const itemLevel=equipmentRequiredLevel(e),rarityMult=1+RARITY_TIER[e.raridade??'comum']*.35;return Math.round((10+itemLevel*2)*(currentLevel+1)*rarityMult)}
// Bônus de pedras (gemas) instaladas numa peça específica -- separado de stats() porque também
// é usado pra exibir o valor "de fato equipado" nas telas de Equipamento/Mochila, não só no
// cálculo de combate.
export function equipmentGemBonus(itemId:string|undefined,s:GameState){let atk=0,def=0,life=0,roll=0;for(const gemId of (itemId&&s.equipmentGems?.[itemId])??[]){const gem=FORGE_GEMS.find(g=>g.id===gemId);if(gem?.stat==='ataque')atk+=gem.value;if(gem?.stat==='defesa')def+=gem.value;if(gem?.stat==='vida')life+=gem.value;if(gem?.stat==='rolagem')roll+=gem.value}return{atk,def,life,roll}}
// Separa, para UMA peça (equipada ou na mochila), o quanto cada fonte contribui pros seus
// atributos: 'base' (catálogo + afinidade de classe + statsByClass -- os "atributos normais"
// do item para este herói), 'upgrade' (aprimoramento pago na Forja, equipmentUpgrades) e 'gems'
// (pedras em equipmentGems -- tanto instaladas manualmente na Oficina quanto refinadas via
// bônus de atributo da Forja, que usam o mesmo mecanismo, então não dá pra distinguir uma da
// outra pelo número). stats() usa isso pra montar o total do personagem; a tela de Equipamentos
// usa o mesmo breakdown pra explicar cada peça -- antes a tela somava só base+pedra e nunca
// mostrava o aprimoramento, então uma arma aprimorada aparecia com um "Ataque" menor no slot do
// que ela de fato contribuía pro total do personagem.
export function equipmentInstanceBreakdown(e:Equipment,ref:string|undefined,s:GameState){
 const classDelta=e.statsByClass?.[s.heroId??'']??{},up=ref?s.equipmentUpgrades?.[ref]??0:0,gems=equipmentGemBonus(ref,s)
 const base={atk:equipmentAttackForHero(e,s.heroId)+(classDelta.ataque??0),def:e.defesa+(classDelta.defesa??0),life:e.vida+(classDelta.vida??0)}
 const upgrade={atk:e.ataque?up:0,def:e.defesa?Math.floor((up+1)/2):0,life:up}
 return{base,upgrade,gems,total:{atk:base.atk+upgrade.atk+gems.atk,def:base.def+upgrade.def+gems.def,life:base.life+upgrade.life+gems.life,roll:gems.roll}}
}
// Antes o forjador maxava no nível 10 e a receita exigida vinha só da posição do item na
// lista ordenada por raridade/preço -- com os heróis agora evoluindo até o nível 100
// (EQUIPMENT_LEVELS), qualquer peça lendária ficava liberada cedo demais, bastando bater o
// teto de maestria sem relação nenhuma com o quão avançado o personagem realmente estava.
// Agora a maestria vai até FORGE_MASTERY_MAX e a receita exige um nível de forjador
// proporcional ao nível mínimo real do item (equipmentRequiredLevel, 1–100), com um
// acréscimo pela raridade -- então itens de fim de jogo exigem forja de fim de jogo.
// Além do nível de forjador, forjar também passou a exigir o nível do PERSONAGEM: o mesmo
// nível mínimo do item (equipmentRequiredLevel) que já era exigido pra equipá-lo, agora
// também é exigido pra forjá-lo -- sem isso o jogador podia forjar e guardar na mochila um
// item de nível 100 muito antes de conseguir usá-lo. Os itens mais fortes do jogo (nível
// mínimo 100) por coincidência batem exatamente em forjador nível 20 (o teto), o que já
// deixa "nível de forja 20 + nível de jogador 100" andando juntos nas peças de ponta.
export const FORGE_MASTERY_MAX=20
export function forgeLevelInfo(xp:number){let level=1,spent=0,next=40;while(level<FORGE_MASTERY_MAX&&xp>=spent+next){spent+=next;level++;next=40+level*25}const max=level>=FORGE_MASTERY_MAX;return{level,progress:max?next:xp-spent,next,max}}
export function forgeRecipeLevel(recipeId:string){const recipe=FORGE_RECIPES.find(r=>r.id===recipeId),item=recipe&&EQUIPMENT.find(e=>e.id===recipe.equipmentId);if(!item)return FORGE_MASTERY_MAX;const itemLevel=equipmentRequiredLevel(item),tier=RARITY_TIER[item.raridade??'comum'];return Math.min(FORGE_MASTERY_MAX,Math.max(1,Math.ceil(itemLevel/5)+Math.floor(tier/2)))}
export function forgeSuccessChance(recipeId:string,forgeXp:number,bonus=0){const mastery=forgeLevelInfo(forgeXp).level,required=forgeRecipeLevel(recipeId);return Math.max(.15,Math.min(.75,.45+(mastery-required)*.06+bonus))}
export function storyRequirementProgress(s:GameState){const chapter=STORY_CHAPTERS.find(c=>c.id===s.storyChapterId),req=chapter?.requirement;if(!req)return{current:1,required:1,complete:true};let current=0;if(req.type==='victories')current=req.target?SUBREGIONS.filter(sub=>sub.regionId===req.target).reduce((sum,sub)=>sum+(s.subregionVictories[sub.id]??0),0):Object.values(s.victories).reduce((a,b)=>a+b,0);if(req.type==='bosses')current=s.subregionBossesDefeated.length;if(req.type==='material')current=s.materials[req.target??'']??0;if(req.type==='upgrade')current=Object.values(s.equipmentUpgrades).filter(v=>v>0).length;if(req.type==='region')current=SUBREGIONS.filter(sub=>sub.regionId===req.target&&s.subregionBossesDefeated.includes(sub.id)).length;return{current:Math.min(current,req.amount),required:req.amount,complete:current>=req.amount}}

function currentSubregion(s:GameState){ return SUBREGIONS.find(x=>x.id===s.subregionId) }
function rarityForVariant(v:string):Rarity{ return v==='Campeão'?'epico':v==='Elite'?'raro':v==='Veterano'?'incomum':'comum' }

// Orçamento equivalente ao de um herói: 2 de Vida custam 1 ponto; 1 de Ataque ou Defesa custa 1.
// Inimigos podem ficar abaixo do teto para preservar encontros iniciais, mas nunca acima dele.
export function enemyDefenseValue(enemy:Pick<Enemy,'defesa'|'nivel'|'dificuldade'>){return Math.max(0,enemy.defesa??(enemy.nivel??enemy.dificuldade??1)-2)}
export function enemyPointCost(enemy:Pick<Enemy,'vida'|'ataque'|'defesa'|'nivel'|'dificuldade'>){return enemy.vida/2+enemy.ataque+enemyDefenseValue(enemy)}
// O orçamento de um chefe com múltiplas fases nunca cobrou o dano das capangas que ele invoca
// ao mudar de fase (e a cada 4 turnos depois disso, enquanto durar o combate) -- vida/ataque/
// defesa do chefe eram dimensionados como se ele lutasse sozinho a partir da fase 2, mas na
// prática o jogador também apanha das capangas todo turno. Isso deixava chefes de 2+ fases
// efetivamente mais fortes do que o orçamento sugeria, sobretudo em lutas longas (baixo nível,
// pouco dano do herói) onde muitos ciclos de invocação se acumulam. O incremento por fase caiu
// de .2 para .12 para compensar esse custo que nunca esteve no orçamento.
export function enemyPointBudget(enemy:Pick<Enemy,'nivel'|'dificuldade'|'boss'|'maxFases'|'variante'>,allowance=1){
 const level=Math.max(1,enemy.nivel??enemy.dificuldade??1)
 const variant=enemy.variante==='Campeão'?1.6:enemy.variante==='Elite'?1.35:enemy.variante==='Veterano'?1.15:1
 const boss=enemy.boss?1.6+Math.min(4,enemy.maxFases??1)*.12:1
 return (10+level*2)*variant*boss*allowance
}
export function balanceEnemyByLevel<T extends Enemy>(enemy:T,allowance=1):T{
 const defesaBase=enemyDefenseValue(enemy),withDefense={...enemy,defesa:defesaBase},budget=enemyPointBudget(withDefense,allowance),cost=enemyPointCost(withDefense)
 if(cost<=budget)return withDefense
 const scale=budget/cost
 let vida=Math.max(1,Math.floor(enemy.vida*scale)),ataque=Math.max(1,Math.floor(enemy.ataque*scale)),defesa=Math.max(0,Math.floor(defesaBase*scale))
 while(vida/2+ataque+defesa>budget&&vida>1)vida--
 while(vida/2+ataque+defesa>budget&&ataque>1)ataque--
 while(vida/2+ataque+defesa>budget&&defesa>0)defesa--
 return{...enemy,vida,ataque,defesa}
}

// Recompensas de xp e ouro eram a MESMA coisa (victory() usava en.xpReward??gold, e a maioria
// dos inimigos nunca definia xpReward) — ou seja, ouro (ajustado pra economia/loja) e xp
// (deveria acompanhar o custo de subir de nível) estavam amarrados sem nenhuma relação com
// deriveLevel/costForLevel. Isso é o que deixava um único chefe (ex.: Astrônomo Devorado)
// entregar 800+ de xp: o valor de ouro daquela sub-região nunca foi pensado como xp. Agora as
// duas são calculadas separadamente e todo caminho de combate (buildEnemy/buildBoss/
// buildRevengeBoss/masmorra/coop) define xpReward explicitamente, sem fallback pro ouro.
const REWARD_VARIANT_MULT:Record<string,number>={Campeão:2.2,Elite:1.6,Veterano:1.25,Comum:1}
function rewardVariantMult(variant?:string){return REWARD_VARIANT_MULT[variant??'Comum']??1}
function rewardBossMult(maxFases?:number){return 2.4+Math.min(4,maxFases??1)*.3}
// Quantos xp "vale" cada nível, dividido pela dificuldade da sub-região (encontrosNecessarios)
// e por este fator: cada faixa de nível costuma ter ~3 sub-regiões cobrindo-a em paralelo (o
// jogador não depende de uma só pra progredir), então uma sub-região sozinha não deve entregar
// o custo de nível inteiro em poucos encontros.
const SUBREGION_OVERLAP_FACTOR=3
function subregionXpBudget(sub:Pick<Subregion,'nivelMin'|'nivelMax'>){let total=0;for(let l=sub.nivelMin;l<=sub.nivelMax;l++)total+=costForLevel(l);return total}
export function xpRewardForLevel(level:number,opts:{boss?:boolean;variant?:string;maxFases?:number;sub?:Pick<Subregion,'nivelMin'|'nivelMax'|'encontrosNecessarios'>}={}):number{
 const lvl=Math.max(1,Math.round(level))
 const base=opts.sub?subregionXpBudget(opts.sub)/Math.max(1,opts.sub.encontrosNecessarios)/SUBREGION_OVERLAP_FACTOR:costForLevel(lvl)/SUBREGION_OVERLAP_FACTOR
 const mult=opts.boss?rewardBossMult(opts.maxFases):rewardVariantMult(opts.variant)
 return Math.max(1,Math.round(base*mult))
}
const GOLD_BASE=4,GOLD_PER_LEVEL=1.5
function goldRewardRange(level:number,opts:{boss?:boolean;variant?:string;maxFases?:number}={}){
 const lvl=Math.max(1,Math.round(level)),mult=opts.boss?rewardBossMult(opts.maxFases):rewardVariantMult(opts.variant),base=(GOLD_BASE+lvl*GOLD_PER_LEVEL)*mult
 const min=Math.max(1,Math.round(base*.65)),max=Math.max(min+1,Math.round(base*1.45))
 return{min,max}
}
// Ouro deixou de ser um valor único derivado do inimigo: sorteia dentro de uma faixa
// min/max própria (independente do xp), então o mesmo tipo de encontro paga um pouco
// diferente a cada vitória em vez de um número fixo e previsível.
export function rollGoldReward(level:number,opts:{boss?:boolean;variant?:string;maxFases?:number}={}):number{const{min,max}=goldRewardRange(level,opts);return min+Math.floor(Math.random()*(max-min+1))}
function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value))}
// Usado só na masmorra pra GARANTIR que um andar nunca fique mais fraco que o anterior: o
// monstro/variante sorteado (buildEnemy/buildBoss) pode, por puro acaso, sair mais fraco que o
// da sala de trás. Se o custo (enemyPointCost) já vier maior que o mínimo exigido, o inimigo
// fica como está (mantém a variedade do sorteio); só quando fica abaixo é que é reescalado pra
// cima -- nunca pra baixo.
function scaleEnemyToAtLeastCost(enemy:Enemy,minCost:number):Enemy{
 const defesaBase=enemyDefenseValue(enemy),cost=enemy.vida/2+enemy.ataque+defesaBase
 if(cost>=minCost||cost<=0)return{...enemy,defesa:defesaBase}
 const scale=minCost/cost
 return{...enemy,vida:Math.max(1,Math.ceil(enemy.vida*scale)),ataque:Math.max(1,Math.ceil(enemy.ataque*scale)),defesa:Math.max(0,Math.ceil(defesaBase*scale))}
}

// A força de campos_dourados (a região inicial) caía de vez, de um desconto fixo (.45-.58x) pra
// nenhum desconto (1x), assim que o jogador cruzava pra sub-região seguinte -- um degrau único
// bem no começo da campanha, em vez de uma rampa. Isso deixava os primeiros chefes fora de
// campos_dourados (ex.: Matriarca da Seiva Negra, nivelMax 10) desproporcionalmente mais duros
// que o chefe anterior, mesmo o jogador tendo acabado de subir só 1-2 níveis. Agora o desconto
// se estende, decrescendo aos poucos, até nivelMax 18 (onde já haveria tempo de sobra pra
// equipar/nivelar) em vez de sumir de uma vez em nivelMax 8.
function noviceDamping(nivelMax:number,floor:number){
  if(nivelMax<=8)return floor
  if(nivelMax>=18)return 1
  return floor+(nivelMax-8)*(1-floor)/(18-8)
}
export function buildEnemy(sub:Subregion, playerLevel:number):Enemy{
  const base=sub.inimigos[Math.floor(Math.random()*sub.inimigos.length)]
  const startingRegion=sub.regionId==='campos_dourados'
  const targetLevel=Math.max(sub.nivelMin,Math.min(sub.nivelMax+1,Math.round((sub.nivelMin+sub.nivelMax)/2 + (Math.random()-.5)*2)))
  const effectiveLevel=Math.max(targetLevel,Math.min(sub.nivelMax+2,Math.round(targetLevel*.7+playerLevel*.3)))
  const r=Math.random()
  const variant=startingRegion?(r<.015?'Campeão':r<.065?'Elite':r<.22?'Veterano':'Comum'):(r<.06?'Campeão':r<.21?'Elite':r<.48?'Veterano':'Comum')
  const hpMult=variant==='Campeão'?2.05:variant==='Elite'?1.55:variant==='Veterano'?1.22:1
  const atkMult=variant==='Campeão'?1.42:variant==='Elite'?1.24:variant==='Veterano'?1.1:1
  const levelDelta=Math.max(0,effectiveLevel-sub.nivelMin)
  const scaledHp=Math.ceil(base.vida*(1+levelDelta*.12)*hpMult*noviceDamping(sub.nivelMax,.45))
  const scaledAtk=Math.ceil(base.ataque*(1+levelDelta*.07)*atkMult*noviceDamping(sub.nivelMax,.55))
  const prefix=variant==='Comum'?'':`${variant}: `
  const extra=variant==='Campeão'?' • Aura de campeão':variant==='Elite'?' • Técnica de elite':variant==='Veterano'?' • Experiência de combate':''
  return balanceEnemyByLevel({
    id:`${sub.id}_${base.nome.toLowerCase().replace(/[^a-z0-9]+/g,'_')}_${Date.now()}`,
    nome:prefix+base.nome, ataque:scaledAtk, vida:scaledHp, ouro:rollGoldReward(effectiveLevel,{variant}), xpReward:xpRewardForLevel(effectiveLevel,{variant,sub}), dificuldade:effectiveLevel,
    habilidade:base.habilidade+extra, imagem:base.arte, arte:base.arte, raridade:rarityForVariant(variant), elite:variant==='Elite'||variant==='Campeão', nivel:effectiveLevel, variante:variant, elemento:REGION_MATERIALS[sub.regionId]?.elemento
  })
}
export function buildBoss(sub:Subregion):Enemy{
  const b=sub.chefe
  const startingRegion=sub.regionId==='campos_dourados'
  return balanceEnemyByLevel({id:`boss_${sub.id}`,nome:b.nome,ataque:Math.max(1,Math.ceil(b.ataque*noviceDamping(sub.nivelMax,.58))),vida:Math.max(1,Math.ceil(b.vida*noviceDamping(sub.nivelMax,.55))),ouro:rollGoldReward(sub.nivelMax,{boss:true,maxFases:b.maxFases}),xpReward:xpRewardForLevel(sub.nivelMax,{boss:true,maxFases:b.maxFases,sub}),dificuldade:sub.nivelMax,habilidade:b.habilidade,imagem:b.arte,arte:b.arte,raridade:b.raridade,boss:true,maxFases:startingRegion?Math.min(2,b.maxFases??2):b.maxFases,fase:1,nivel:sub.nivelMax,elemento:REGION_MATERIALS[sub.regionId]?.elemento})
}
function difficultyEnemy(enemy:Enemy,mode:DifficultyMode){const multiplier=DIFFICULTIES[mode].enemy;return balanceEnemyByLevel({...enemy,ataque:Math.max(1,Math.ceil(enemy.ataque*multiplier)),vida:Math.max(1,Math.ceil(enemy.vida*multiplier)),ouro:Math.ceil(enemy.ouro*DIFFICULTIES[mode].reward),xpReward:enemy.xpReward!=null?Math.round(enemy.xpReward*DIFFICULTIES[mode].reward):enemy.xpReward},multiplier)}
export function buildCoopEnemy(subregionId:string,playerLevel:number,mode:DifficultyMode){const sub=SUBREGIONS.find(item=>item.id===subregionId);return sub?difficultyEnemy(buildEnemy(sub,playerLevel),mode):undefined}
export function buildCoopSubregionBoss(subregionId:string,mode:DifficultyMode){const sub=SUBREGIONS.find(item=>item.id===subregionId);return sub?difficultyEnemy(buildBoss(sub),mode):undefined}
export function buildCoopRegionBoss(regionId:string,mode:DifficultyMode){const region=TERRITORIES.find(item=>item.id===regionId),base=region&&BOSSES[region.dificuldade];return region&&base?difficultyEnemy({...base,id:`coop_region_boss_${region.id}`,nome:`${base.nome} • Soberano de ${region.nome}`,ouro:rollGoldReward(region.nivelMax,{boss:true,maxFases:base.maxFases}),xpReward:xpRewardForLevel(region.nivelMax,{boss:true,maxFases:base.maxFases})},mode):undefined}
// A recompensa por vingança repetida crescia sem limite (1.5+wins*.25, nunca travava) --
// dava pra farmar o mesmo chefe dezenas de vezes e cada vitória valer mais que a anterior
// pra sempre. O poder de combate (power) continua crescendo sem teto de propósito (isso já
// desestimula naturalmente repetir demais), mas a recompensa agora estabiliza depois de 10
// vitórias (multiplicador máximo 2.5×).
//
// Bug relatado por jogadores: a defesa do chefe de vingança nunca aumentava -- na prática ela
// ficava travada no valor do chefe original (nivelMax-2), porque `{...base, ...}` já trazia um
// `defesa` numérico definido, e enemyDefenseValue() só recalcula quando o campo está indefinido.
// Ataque e vida escalavam via `power`, mas defesa não escalava com nada, então a cada vingança
// ele parecia relativamente mais fraco na defesa (nunca mais forte, como era a intenção). A
// função também nunca recebia o nível do jogador, então um herói de nível alto revisitando uma
// sub-região antiga enfrentava sempre o mesmo chefe fraco. Agora o nível efetivo cresce com wins
// E com o nível do jogador (o maior dos dois), e a defesa é recalculada a partir desse nível.
export function buildRevengeBoss(sub:Subregion,wins:number,playerLevel=0):Enemy{const base=buildBoss(sub),power=1.35+wins*.18,level=Math.max((base.nivel??base.dificuldade)+wins*3,playerLevel),rewardMult=1+Math.min(wins,10)*.15;return balanceEnemyByLevel({...base,id:`revenge_${sub.id}_${Date.now()}`,nome:`Vingança ${wins+1}: ${base.nome}`,ataque:Math.ceil(base.ataque*power),vida:Math.ceil(base.vida*power),defesa:Math.max(1,level-2),ouro:Math.round((base.ouro??1)*rewardMult),xpReward:Math.round((base.xpReward??1)*rewardMult),maxFases:Math.min(5,(base.maxFases??2)+1),habilidade:`${base.habilidade} • Memória da derrota • Fúria vingativa`,revenge:true,nivel:level,dificuldade:level})}

function campaignSnapshot(source:any):CampaignSave{const snapshot:any={savedAt:Date.now()};for(const [key,value] of Object.entries(source)){if(typeof value!=='function'&&key!=='campaigns'&&key!=='activeCampaignId'&&key!=='customCards')snapshot[key]=value}return snapshot}
function saveActiveCampaign(state:GameState){if(!state.activeCampaignId||!state.heroId||state.screen==='menu'||state.screen==='select'||state.screen==='cardCreator')return state.campaigns;return{...state.campaigns,[state.activeCampaignId]:campaignSnapshot(state)}}
function resumableScreen(screen?:Screen):Screen{return !screen||screen==='menu'||screen==='select'||screen==='cardCreator'?'map':screen}
function reputationFromClaims(ids:string[]=[]){return ids.reduce((sum,id)=>sum+(guildMissionById(id)?.dificuldade??0),0)}
function normalizeAttributes(source:any){if(source?.balanceVersion>=2&&source?.allocatedAttr)return{attr:source.attr,allocatedAttr:source.allocatedAttr,balanceVersion:2};const attr={vida:Math.max(0,source?.attr?.vida??0),ataque:Math.max(0,source?.attr?.ataque??0),defesa:Math.max(0,source?.attr?.defesa??0)},earned=Math.max(0,deriveLevel(source?.xp??0).lvl-1),spent=Math.max(0,earned-(source?.attributePoints??0)),defesa=Math.min(attr.defesa,spent),ataque=Math.min(attr.ataque,Math.max(0,spent-defesa)),vida=Math.min(attr.vida,Math.max(0,spent-defesa-ataque));return{attr:{...attr,ataque},allocatedAttr:{vida,ataque,defesa},balanceVersion:2}}

export const useGame = create<GameState>()(persist((set,get)=>({
  coopBattlesCompleted:[],
  enemyIntent:undefined,
  screen:'menu',hp:0,gold:0,xp:0,attributePoints:0,attr:{vida:0,ataque:0,defesa:0},allocatedAttr:{vida:0,ataque:0,defesa:0},balanceVersion:2,inventory:{},equipmentBag:[],equipped:{},territory:'Planícies de Alvora',regionId:'campos_dourados',world:'havendown',subregionId:undefined,victories:{},subregionVictories:{},bossesDefeated:[],subregionBossesDefeated:[],enemyHp:0,combatTurn:0,combatLog:[],playerTurn:false,animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,heroRollBonus:0,enemyRollBonus:0,enemyFearPenalty:0,heroSkillUses:0,itemSkillUsed:false,shield:0,classRollBonus:0,classBuffTurns:0,summon:undefined,lifeWardActive:false,phoenixUsed:false,groupCriticalBoost:false,braced:false,braceBonusUsed:false,fervor:0,firstStrikeBonus:0,heroStatus:{},enemyStatus:{},selectedGallery:0,shopMode:'buy',explorationNote:undefined,currentEvent:undefined,eventResult:undefined,pendingAttackBonus:0,activePotionIds:[],customCards:[],campaigns:{},activeCampaignId:undefined,guildAccepted:[],guildProgress:{},guildClaimed:[],guildNotice:undefined,difficultyMode:'veterano',talents:[],specializations:{},materials:{},equipmentUpgrades:{},equipmentGems:{},forgedGemLocked:{},craftedEffects:{},equipmentElements:{},equipmentResistances:{},forgeResult:undefined,bestiary:{},discoveredCards:[],revengeWins:{},consecutiveDefeats:0,lastDefeatKey:undefined,dungeonDepth:0,dungeonActive:false,dungeonSubregionId:undefined,storyFlags:[],storyChapterId:'prologo',storyChoices:{},storyNotice:undefined,
  newGame:(heroId:string)=>{const previous=get();const h=HEROES.find(x=>x.id===heroId)!;const st=starter[heroId]??starter.guerreiro;const initialHp=h.vida+Object.values(st.equipped).reduce((sum,id)=>sum+(eqById(id)?.vida??0),0);const equipped=Object.fromEntries(Object.entries(st.equipped).map(([slot,id])=>[slot,createEquipmentInstance(id)]));const activeCampaignId=`campaign_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;const discoveredCards=[`hero:${heroId}`,...Object.values(st.equipped).map(id=>`equipment:${id}`),...Object.keys(st.items).map(id=>`consumable:${id}`)];const next:any={screen:'map',heroId,hp:initialHp,gold:st.gold,xp:0,attributePoints:1,attr:{vida:0,ataque:0,defesa:0},allocatedAttr:{vida:0,ataque:0,defesa:0},balanceVersion:2,inventory:{...st.items},equipmentBag:[],equipped,territory:'Planícies de Alvora',regionId:'campos_dourados',world:'havendown',subregionId:undefined,victories:{},subregionVictories:{},bossesDefeated:[],subregionBossesDefeated:[],enemy:undefined,enemyHp:0,combatTurn:0,combatLog:[],coin:undefined,playerTurn:false,animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,heroRollBonus:0,enemyRollBonus:0,enemyFearPenalty:0,heroSkillUses:0,itemSkillUsed:false,shield:0,classRollBonus:0,classBuffTurns:0,summon:undefined,lifeWardActive:false,phoenixUsed:false,groupCriticalBoost:false,braced:false,braceBonusUsed:false,fervor:0,firstStrikeBonus:0,heroStatus:{},enemyStatus:{},combatMinions:[],combatAttackPct:0,combatDefensePct:0,extraHeroAttacks:0,guardianTaunt:false,loot:undefined,currentEvent:undefined,eventResult:undefined,pendingAttackBonus:0,explorationNote:undefined,selectedGallery:0,shopMode:'buy',guildAccepted:[],guildProgress:{},guildClaimed:[],difficultyMode:previous.difficultyMode??'veterano',talents:[],materials:{},equipmentUpgrades:{},equipmentGems:{},forgedGemLocked:{},craftedEffects:{},equipmentElements:{},equipmentResistances:{},forgeResult:undefined,bestiary:{},discoveredCards,revengeWins:{},dungeonDepth:0,dungeonActive:false,dungeonSubregionId:undefined,storyFlags:[],storyChapterId:'prologo',storyChoices:{},storyNotice:undefined,tourStep:0};const campaigns={...saveActiveCampaign(previous),[activeCampaignId]:campaignSnapshot(next)};set({...next,campaigns,activeCampaignId})},
  setScreen:(screen:Screen)=>{const state=get();if(isNavigationLocked(state))return;set({screen,campaigns:saveActiveCampaign(state)})},
  travelWorld:(world:string)=>{const state=get();if(!worldUnlocked(state,world))return;const first=[...TERRITORIES].filter(t=>(t.mundo??'havendown')===world).sort((a,b)=>a.dificuldade-b.dificuldade)[0];if(!first)return;set({world,regionId:first.id,territory:first.nome,subregionId:undefined,screen:'map',campaigns:saveActiveCampaign(state)})},
  startCoopCombat:(enemy:Enemy,subregionId:string)=>{const sub=SUBREGIONS.find(item=>item.id===subregionId),region=sub&&TERRITORIES.find(item=>item.id===sub.regionId),s=get() as GameState;if(!sub||!region)return;const warriorLuck=s.heroId==='guerreiro'&&Math.random()<.5,sets=equipmentSetCounts(s),setShield=sets.khar>=4?3:0,setRoll=enemy.boss&&sets.eclipse>=4?1:0,setStrike=sets.cinzas>=4?2:0;set({screen:'combat',regionId:region.id,territory:region.nome,subregionId,enemy,enemyHp:enemy.vida,combatTurn:1,combatLog:['Batalha cooperativa iniciada. A iniciativa foi sorteada para todo o grupo.',...(warriorLuck?['Fortuna do Guerreiro: +1 em todos os dados nesta batalha.']:[]),...(setShield?[`Conjunto de Kholgard: +${setShield} de escudo inicial.`]:[]),...(setRoll?['Conjunto do Sol Negro: +1 nas rolagens contra chefes.']:[]),...(setStrike?[`Arsenal das Cinzas: +${setStrike} de dano no primeiro ataque.`]:[])],playerTurn:false,animating:false,combatRoll:undefined,lastDamage:undefined,shield:s.shield+setShield,heroSkillUses:0,itemSkillUsed:false,heroRollBonus:(s.talents.includes('destino')?1:0)+setRoll+(warriorLuck?1:0)+equipmentRollBonus(s),classRollBonus:warriorLuck?1:0,classBuffTurns:0,summon:undefined,lifeWardActive:false,phoenixUsed:false,groupCriticalBoost:false,braced:false,braceBonusUsed:false,fervor:0,firstStrikeBonus:setStrike,heroStatus:{},enemyStatus:{},combatMinions:[],combatAttackPct:0,combatDefensePct:0,extraHeroAttacks:0,guardianTaunt:false})},
  syncCoopEnemyHp:(hp:number)=>{const s=get();if(s.screen!=='combat'||!s.enemy)return;const next=Math.max(0,hp);if(next!==s.enemyHp)set({enemyHp:next})},
  completeCoopVictory:(battleId:string,subregionId:string,enemy:Enemy,rewardShare:number)=>{const s=get(),completedBattles=s.coopBattlesCompleted??[],wasDefeated=s.hp<=0;if(!battleId||!subregionId||!enemy||completedBattles.includes(battleId))return;const sub=SUBREGIONS.find(item=>item.id===subregionId),region=sub&&TERRITORIES.find(item=>item.id===sub.regionId);if(!sub||!region)return;const share=Math.max(0,Math.min(1,Number.isFinite(rewardShare)?rewardShare:0)),personalReward=Math.floor(enemy.ouro*share);set({coopBattlesCompleted:[...completedBattles,battleId],screen:'combat',regionId:region.id,territory:region.nome,subregionId,enemy:{...enemy,ouro:personalReward},enemyHp:0});victory(set,get);if(wasDefeated){const loot=get().loot;applyDefeatPenalty(set,get,'Você foi derrotado durante o combate cooperativo.');set({screen:'loot',loot})}const completed=get();set({campaigns:saveActiveCampaign(completed)})},
  completeCoopDefeat:(battleId:string)=>{const s=get(),completedBattles=s.coopBattlesCompleted??[];if(!battleId||completedBattles.includes(battleId))return;set({coopBattlesCompleted:[...completedBattles,battleId]});applyDefeatPenalty(set,get,'Sua equipe foi derrotada em combate cooperativo.');set({screen:'loot',loot:{gold:0,xp:0,title:'EQUIPE DERROTADA'}});const completed=get();set({campaigns:saveActiveCampaign(completed)})},
  completeCoopFlee:(battleId:string)=>{const s=get(),completedBattles=s.coopBattlesCompleted??[];if(!battleId||completedBattles.includes(battleId))return;set({coopBattlesCompleted:[...completedBattles,battleId],screen:s.subregionId?'region':'map',enemy:undefined,enemyHp:0,combatMinions:[],combatLog:[],playerTurn:false,animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,shield:0,braced:false,braceBonusUsed:false,fervor:0,firstStrikeBonus:0,classBuffTurns:0,summon:undefined,lifeWardActive:false,phoenixUsed:false,groupCriticalBoost:false,heroStatus:{},enemyStatus:{},pendingAttackBonus:0,heroRollBonus:0,enemyRollBonus:0,enemyFearPenalty:0});const completed=get();set({campaigns:saveActiveCampaign(completed)})},
  receiveCoopEnemyAttack:(damage:number,roll:any)=>{const s=get();if(s.screen!=='combat'||!s.enemy)return;const blocked=Math.max(0,Number(roll?.shieldBlocked??0));set({hp:Math.max(0,s.hp-damage),shield:Math.max(0,s.shield-blocked),combatRoll:{attacker:'enemy',naturalAttackRoll:roll.attackRoll,attackRoll:roll.attackRoll,attackBonus:0,defenseRoll:roll.defenseRoll,attackBase:s.enemy.ataque,defenseBase:defenseValue(s),attackEffect:attackEffect(roll.attackRoll),defenseEffect:defenseEffect(roll.defenseRoll),damage,selfDamage:0,shieldBlocked:blocked||undefined},animating:true,animationActor:'enemy',lastDamage:damage});setTimeout(()=>set({animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined}),COMBAT_ROLL_DISPLAY_MS)},
  receiveCoopHeroAction:(damage:number,roll:any)=>{const s=get();if(s.screen!=='combat'||!s.enemy)return;const attackRoll=roll?.attackRoll??0,defenseRoll=roll?.defenseRoll??0;set({combatRoll:{attacker:'hero',naturalAttackRoll:attackRoll,attackRoll,attackBonus:0,defenseRoll,attackBase:0,defenseBase:0,attackEffect:attackEffect(attackRoll||3),defenseEffect:defenseEffect(defenseRoll||3),damage,selfDamage:0},animating:true,animationActor:'hero',lastDamage:damage});setTimeout(()=>set({animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined}),COMBAT_ROLL_DISPLAY_MS)},
  receiveCoopSupportFx:(type:'fortificacao'|'cura'|'cura-item')=>{const s=get();if(s.screen!=='combat')return;triggerSupportFx(set,get,type)},
  receiveCoopHeal:(amount:number)=>{const s=get();if(s.screen!=='combat'||amount<=0)return;set({hp:Math.min(maxHp(s),s.hp+amount)})},
  continueGame:()=>{const state=get(),saved=state.activeCampaignId&&state.campaigns[state.activeCampaignId];if(saved){const migrated=migrateEquipmentInstances(saved);set({...migrated,...normalizeAttributes(migrated),campaigns:state.campaigns,activeCampaignId:state.activeCampaignId,guildAccepted:migrated.guildAccepted??[],guildProgress:migrated.guildProgress??{},guildClaimed:migrated.guildClaimed??[],guildNotice:undefined,screen:resumableScreen(migrated.screen),animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,playerTurn:migrated.screen==='combat'&&migrated.enemy?true:(migrated.playerTurn??false)})}else set({screen:state.heroId?'map':'select'})},
  loadCampaign:(id:string)=>{const state=get(),saved=state.campaigns[id];if(!saved)return;const migrated=migrateEquipmentInstances(saved),campaigns=saveActiveCampaign(state);set({...migrated,...normalizeAttributes(migrated),campaigns,activeCampaignId:id,guildAccepted:migrated.guildAccepted??[],guildProgress:migrated.guildProgress??{},guildClaimed:migrated.guildClaimed??[],guildNotice:undefined,screen:resumableScreen(migrated.screen),animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,playerTurn:migrated.screen==='combat'&&migrated.enemy?true:(migrated.playerTurn??false)})},
  deleteCampaign:(id:string)=>{const state=get(),campaigns={...state.campaigns};delete campaigns[id];if(id===state.activeCampaignId)set({campaigns,activeCampaignId:undefined,heroId:undefined,screen:'menu',hp:0,gold:0,xp:0,equipmentBag:[],inventory:{},equipped:{}});else set({campaigns})},
  acceptGuildMission:(id:string)=>{const state=get(),mission=guildMissionById(id),rank=guildRankFor(reputationFromClaims(state.guildClaimed));if(!mission||GUILD_RANKS.findIndex(r=>r.id===rank.id)<GUILD_RANKS.findIndex(r=>r.id===mission.rank)||state.guildAccepted.includes(id)||state.guildClaimed.includes(id))return;set({guildAccepted:[...state.guildAccepted,id],guildProgress:{...state.guildProgress,[id]:state.guildProgress[id]??0},guildNotice:`Missão aceita: ${mission.nome}.`})},
  claimGuildMission:(id:string)=>{const state=get(),mission=guildMissionById(id);if(!mission||state.guildClaimed.includes(id))return;const deliveryIndex=mission.tipo==='delivery'&&mission.itemId?state.equipmentBag.findIndex((ref:string)=>equipmentRefMatches(ref,mission.itemId)):-1;const deliverySlot=mission.tipo==='delivery'&&mission.itemId&&deliveryIndex<0?(Object.entries(state.equipped).find(([,ref])=>equipmentRefMatches(ref as string|undefined,mission.itemId))?.[0] as Slot|undefined):undefined;const complete=mission.tipo==='delivery'?(deliveryIndex>=0||Boolean(deliverySlot)):(state.guildProgress[id]??0)>=mission.quantidade;if(!complete)return;const reputation=reputationFromClaims(state.guildClaimed),newRank=guildRankFor(reputation+mission.dificuldade),promotion=newRank.id!==guildRankFor(reputation).id?` Promoção alcançada: rank ${newRank.nome}!`:'';const consumeDelivery=(bag:string[])=>{if(deliveryIndex>=0)bag.splice(deliveryIndex,1)};const equippedAfterDelivery=()=>{if(!deliverySlot)return state.equipped;const equipped={...state.equipped};delete equipped[deliverySlot];return equipped};
   // Entregar uma missão sempre concede XP além da recompensa em ouro/equipamento (antes só dava
   // reputação de guilda) -- proporcional à dificuldade da missão (1-10, cresce a cada geração
   // repetida), na mesma ordem de grandeza de uma boa vitória em combate. Sobe de nível igual a
   // qualquer outra fonte de XP, inclusive ganhando pontos de atributo se cruzar um nível.
   const xpReward=Math.round(mission.dificuldade*15),before=deriveLevel(state.xp).lvl,xp=state.xp+xpReward,after=deriveLevel(xp).lvl,attributePoints=state.attributePoints+Math.max(0,after-before),xpNotice=` +${xpReward} XP.`
   if(mission.recompensa.tipo==='gold'){const equipmentBag=[...state.equipmentBag];consumeDelivery(equipmentBag);set({gold:state.gold+mission.recompensa.valor,xp,attributePoints,equipmentBag,equipped:equippedAfterDelivery(),guildClaimed:[...state.guildClaimed,id],guildNotice:`${mission.tipo==='delivery'?'Item entregue. ':''}Recompensa recebida: ${mission.recompensa.valor} moedas de ouro.${xpNotice}${promotion}`})}else{if(state.equipmentBag.length>=equipmentBagCapacity(state))return;const pool=EQUIPMENT.filter(e=>equipmentLevelAllowed(e,state.xp)&&equipmentClassAllowed(e,state.heroId)&&e.slot!=='bolsa');const reward=pickWeightedEquipment(pool)??EQUIPMENT[0];const equipmentBag=[...state.equipmentBag];consumeDelivery(equipmentBag);equipmentBag.push(createEquipmentInstance(reward.id));set({equipmentBag,xp,attributePoints,equipped:equippedAfterDelivery(),guildClaimed:[...state.guildClaimed,id],guildNotice:`${mission.tipo==='delivery'?'Item entregue. ':''}Recompensa recebida: ${reward.nome}.${xpNotice}${promotion}`})}},
  openRegion:(t:Territory)=>set({regionId:t.id,territory:t.nome,subregionId:undefined,explorationNote:undefined,screen:'region'}),
  openSubregion:(subregionId:string)=>{const sub=SUBREGIONS.find(x=>x.id===subregionId);const region=sub&&TERRITORIES.find(x=>x.id===sub.regionId);if(!sub||!region)return;set({regionId:region.id,territory:region.nome,subregionId:sub.id,explorationNote:`Destino selecionado no mapa: ${sub.nome}.`,screen:'region'})},
  startEncounter:(subregionId:string)=>{
    const sub=SUBREGIONS.find(x=>x.id===subregionId); if(!sub)return
    const s=get(); const progress=s.subregionVictories[sub.id]??0
    set({subregionId:sub.id,territory:sub.nome,explorationNote:undefined})
    if(progress>=sub.encontrosNecessarios && !s.subregionBossesDefeated.includes(sub.id)){ set({screen:'bossIntro',enemy:difficultyEnemy(buildBoss(sub),s.difficultyMode)}); return }
    // Parte das explorações revela uma carta de missão antes do próximo combate.
    const eventRoll=Math.random()
    if(eventRoll<.35){const currentEvent=nextStoryEvent(s)??EVENTS[Math.floor(Math.random()*EVENTS.length)];set({screen:'event',currentEvent,eventResult:undefined});return}
    const lvl=deriveLevel(s.xp).lvl; beginCombat(set,get,difficultyEnemy(buildEnemy(sub,lvl),s.difficultyMode))
  },
  // BossIntro (startEncounter/startRevenge) já grava o inimigo com a dificuldade aplicada, pra
  // que a prévia mostre exatamente os atributos que o combate vai usar -- aplicar de novo aqui
  // dobraria o multiplicador (ex.: 0.88 vira 0.77) e fazia a prévia (sem dificuldade) e o
  // combate real (com dificuldade aplicada duas vezes) mostrarem números diferentes.
  startBoss:()=>{const s=get(),sub=currentSubregion(s);if(!sub)return;const enemy=s.enemy?.boss?s.enemy:difficultyEnemy(buildBoss(sub),s.difficultyMode);beginCombat(set,get,enemy)},
  attack:(targetMinionId?:string)=>playerAttack(set,get,targetMinionId?'Ataque direcionado':'Ataque',0,false,targetMinionId),
  defend:()=>{const s=get();if(!s.playerTurn||s.animating||!s.enemy)return
   if(heroStunned(set,get))return
   if(s.braced){set({braced:false,playerTurn:false});addLog(set,'Postura defensiva desativada.');enemyAfterDelay(set,get);return}
   if(!s.braceBonusUsed){set({braced:true,braceBonusUsed:true});addLog(set,'Postura defensiva ativada: +2 de Defesa até o fim da batalha ou até você desativá-la. Você ainda pode agir neste turno.');return}
   set({braced:true,playerTurn:false});addLog(set,'Postura defensiva reativada: +2 de Defesa até o fim da batalha ou até você desativá-la.');enemyAfterDelay(set,get)},
  useFervor:()=>{const s=get();if((s.fervor??0)<3||!s.playerTurn||s.animating||!s.enemy)return;playerAttack(set,get,'Fervor de Combate',0,false,undefined,true)},
  heroSkill:()=>{const s=get();if((s.heroSkillUses??0)>=1||!s.playerTurn||s.animating||!s.enemy)return;if(s.heroId==='conjurador')return;if(heroStunned(set,get))return;set({heroSkillUses:(s.heroSkillUses??0)+1});if(s.heroId==='guardiao'){set({guardianTaunt:true,combatDefensePct:.15,classBuffTurns:3});addLog(set,'PROVOCAR: +15% de Defesa base por até 3 turnos (e, em combate cooperativo, os inimigos passam a priorizar o Guardião).');triggerSupportFx(set,get,'fortificacao');enemyAfterDelay(set,get);return}if(s.heroId==='guerreiro'){const refreshedBleed=s.enemyStatus?.bleed?{...s.enemyStatus,bleed:{...s.enemyStatus.bleed,turns:3}}:s.enemyStatus;set({combatAttackPct:.1,combatDefensePct:.1,enemyFearPenalty:1,classBuffTurns:3,enemyStatus:refreshedBleed});addLog(set,`Ímpeto Marcial: Ataque e Defesa base aumentados em 10% (arredondados para cima) e Medo no inimigo (-1 em todas as rolagens dele), por até 3 turnos.${s.enemyStatus?.bleed?' O sangramento do inimigo foi renovado para 3 turnos.':''}`);triggerSupportFx(set,get,'fortificacao');enemyAfterDelay(set,get);return}if(s.heroId==='cacadora'){set({extraHeroAttacks:1});addLog(set,'Ataque Duplo: você pode atacar duas vezes neste turno.');return}if(s.heroId==='arcanista'){set({classRollBonus:1,combatAttackPct:.1,combatDefensePct:.1,classBuffTurns:3});addLog(set,'Ascensão Arcana: +1 nas rolagens e +10% de Ataque e Defesa para o grupo, por até 3 turnos.');triggerSupportFx(set,get,'fortificacao');enemyAfterDelay(set,get);return}if(s.heroId==='druida'){const heal=Math.max(1,Math.ceil(maxHp(s)*.3)),amount=Math.min(heal,maxHp(s)-s.hp),hadStatus=Boolean(s.heroStatus&&Object.keys(s.heroStatus).length);set({hp:s.hp+amount,heroStatus:{}});addLog(set,`Brisa Revigorante: recuperou ${amount} de vida do campeão mais ferido${hadStatus?' e purificou seus efeitos negativos':''}.`);triggerSupportFx(set,get,'cura');enemyAfterDelay(set,get);return}if(s.heroId==='cacador'){set({groupCriticalBoost:true,classBuffTurns:2});addLog(set,'Marca do Predador: resultados 5 e 6 passam a causar ataques críticos para o grupo, por 2 turnos.');triggerSupportFx(set,get,'fortificacao');enemyAfterDelay(set,get);return}if(s.heroId==='monge'){playerAttack(set,get,'Golpe Flamejante',2,true,undefined,false,'fogo');return}if(s.heroId==='sacerdotisa'){set({lifeWardActive:true});addLog(set,'Bênção da Vida: se você for derrotada nesta batalha, sobreviverá uma vez com 30% da vida máxima.');triggerSupportFx(set,get,'fortificacao');enemyAfterDelay(set,get)}},
  summonMonster:(tipo:SummonType)=>{const s=get(),existing=(s.heroSkillUses??0)>0?(s.summons??(s.summon?[s.summon]:[])):[];if(s.heroId!=='conjurador'||existing.length>=2||(s.heroSkillUses??0)>=2||!s.playerTurn||s.animating||!s.enemy)return;if(heroStunned(set,get))return;const level=deriveLevel(s.xp).lvl,summon=buildSummon(tipo,level),typeLabel=tipo==='atacante'?'ofensiva':tipo==='defensor'?'defensiva':'arcana',summons=[...existing,summon]
   set({heroSkillUses:(s.heroSkillUses??0)+1,summons,summon:summons[0],...(summons.some(fera=>fera.tipo==='arcano')?{combatAttackPct:.1,combatDefensePct:.1}:{})})
   addLog(set,`Conjurar Fera Espectral (${typeLabel}) • ${summons.length}/2: ${summon.nome} surge ao seu lado com ${summon.maxHp} de vida, ${summon.ataque} de ataque e ${summon.defesa} de defesa.${tipo==='arcano'?' Enquanto estiver viva, concede +10% de Ataque e Defesa a você.':tipo==='defensor'?' Tem alta chance de interceptar ataques inimigos no seu lugar.':' Ataca ao seu lado a cada turno.'}`)
   triggerSupportFx(set,get,'fortificacao');enemyAfterDelay(set,get)},
  // A bolsa também está em s.equipped (slot 'bolsa') e sempre tem uma "habilidade" preenchida
  // (o texto de capacidade, ex. "Capacidade: permite guardar até 8 equipamentos"), então sem
  // excluir esse slot ela podia ser escolhida como "o item com habilidade ativa" -- o jogador
  // via um ataque acontecer em nome da mochila, sem nenhum efeito real de habilidade por trás.
  // equipmentId escolhe qual peça ativar (seleção agora fica na lista "Habilidades dos itens",
  // não mais num botão único e ambíguo na caixa de combate) -- sem ID, cai de volta no primeiro
  // item equipado com habilidade, pra manter compatibilidade com quem ainda chama sem argumento.
  itemSkill:(equipmentId?:string)=>{const s=get();if(s.itemSkillUsed||!s.playerTurn||s.animating||!s.enemy)return;const equippedIds=Object.values(s.equipped) as (string|undefined)[],item=(equipmentId?eqById(equipmentId):undefined)??equippedIds.map(id=>eqById(id)).find(e=>e?.activeEffect);if(!item||item.slot==='bolsa'||!item.activeEffect||!equippedIds.some(ref=>equipmentRefMatches(ref,item.id))){addLog(set,'Nenhum equipamento com habilidade ativa.');return}const effect=item.activeEffect;set({itemSkillUsed:true});if(effect.type==='shield'){set({shield:s.shield+effect.value});addLog(set,`${item.nome}: +${effect.value} Escudo.`);triggerSupportFx(set,get,'fortificacao');enemyAfterDelay(set,get);return}if(effect.type==='heal'){const amount=Math.min(effect.value,maxHp(s)-s.hp);set({hp:s.hp+amount});addLog(set,`${item.nome}: recuperou ${amount} de vida.`);triggerSupportFx(set,get,'cura-item');enemyAfterDelay(set,get);return}if(effect.type==='cleanse'){set({heroStatus:{}});addLog(set,`${item.nome}: todas as condições negativas foram removidas.`);triggerSupportFx(set,get,'cura-item');enemyAfterDelay(set,get);return}if(effect.type==='reroll'){set({heroRollBonus:s.heroRollBonus+effect.value,itemSkillUsed:true});addLog(set,`${item.nome}: +${effect.value} na próxima rolagem.`);enemyAfterDelay(set,get);return}playerAttack(set,get,item.nome,effect.value,true,undefined,false,effect.type==='element'?effect.element:undefined)},
  useConsumable:(id:string)=>{
   const s=get(),it=CONSUMABLES.find(x=>x.id===id)
   if(!it||(s.inventory[id]??0)<=0)return
   const activeIds:string[]=s.activePotionIds??[]
   const persistent=it.tipo==='ataque'||it.tipo==='escudo'
   const persistentActive=activeIds.includes(id)&&((it.tipo==='ataque'&&s.pendingAttackBonus>0)||(it.tipo==='escudo'&&s.shield>0))
   const regenActive=it.tipo==='regen_boost'&&(s.regenBoostUntil??0)>Date.now()
   if(persistentActive||regenActive){const message=`${it.nome} já está ativa. Aguarde o efeito terminar antes de usar outra unidade.`;set({explorationNote:message});if(s.screen==='combat')addLog(set,message);return}
   if(s.screen==='combat'&&(!s.playerTurn||s.animating||!s.enemy))return
   if(s.screen==='combat'&&heroStunned(set,get))return
   const inv={...s.inventory,[id]:(s.inventory[id]??0)-1};if(inv[id]<=0)delete inv[id]
   const activePotionIds=persistent?[...activeIds.filter(activeId=>activeId!==id),id]:activeIds
   const value=consumableEffectiveValue(it,s);let resultMessage=`${it.nome} utilizado.`
   if(it.tipo==='cura'){const healed=Math.max(0,Math.min(value,maxHp(s)-s.hp));resultMessage=`${it.nome}: recuperou ${healed} de vida.`;set({inventory:inv,hp:s.hp+healed,explorationNote:resultMessage})}
   else if(it.tipo==='vida_max'){const success=Math.random()<(LIFE_CHANCE[id]??.35);if(success){const newMax=maxHp(s)+value,newHp=id==='elixir_fenix'?newMax:Math.min(newMax,s.hp+value);resultMessage=`${it.nome}: sucesso! Vida máxima aumentada permanentemente em ${value}.`;set({inventory:inv,attr:{...s.attr,vida:s.attr.vida+value},hp:newHp,explorationNote:resultMessage})}else{resultMessage=`${it.nome}: a tentativa falhou e a vida máxima não aumentou.`;set({inventory:inv,explorationNote:resultMessage})}}
   else if(it.tipo==='escudo'){resultMessage=`${it.nome}: +${value} de escudo para o próximo combate.`;set({inventory:inv,shield:s.shield+value,activePotionIds,explorationNote:resultMessage})}
   else if(it.tipo==='regen_boost'){resultMessage=`${it.nome}: cura acelerada ativada.`;set({inventory:inv,regenBoostUntil:Date.now()+3600000,lastPassiveHealAt:Date.now(),explorationNote:resultMessage})}
   else{resultMessage=`${it.nome}: +${value} de ataque até o fim do próximo combate.`;set({inventory:inv,pendingAttackBonus:s.pendingAttackBonus+Math.max(1,value),activePotionIds,explorationNote:resultMessage})}
   if(s.screen==='combat'){addLog(set,resultMessage);if(it.tipo==='cura')triggerSupportFx(set,get,'cura-item');else if(it.tipo==='escudo')triggerSupportFx(set,get,'fortificacao');enemyAfterDelay(set,get)}
  },
  flee:()=>{const s=get();if(!s.playerTurn||s.animating)return;const roll=Math.floor(Math.random()*6)+1;const outcome:FleeRoll['outcome']=roll>=5?'success':roll===4?'neutral':'failed';set({animating:true,playerTurn:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:{roll,outcome}});addLog(set,roll>=5?`Fuga: dado ${roll}. Você conseguiu escapar!`:roll===4?'Fuga: dado 4. Você não escapou, mas manteve sua ação.':`Fuga: dado ${roll}. A tentativa falhou e você perdeu o turno.`);setTimeout(()=>{const current=get();if(current.screen!=='combat'||!current.enemy)return;if(outcome==='success'){set({screen:current.subregionId?'region':'map',subregionId:undefined,explorationNote:undefined,enemy:undefined,pendingAttackBonus:0,shield:0,braced:false,braceBonusUsed:false,fervor:0,firstStrikeBonus:0,classBuffTurns:0,summon:undefined,lifeWardActive:false,groupCriticalBoost:false,heroStatus:{},enemyStatus:{},animating:false,fleeRoll:undefined,heroRollBonus:0,enemyRollBonus:0,dungeonActive:false,dungeonDepth:0});return}if(outcome==='neutral'){set({animating:false,playerTurn:true,fleeRoll:undefined});return}set({fleeRoll:undefined});enemyAfterDelay(set,get)},COMBAT_ROLL_DISPLAY_MS)},
  buyConsumable:(id:string)=>{const s=get(),it=CONSUMABLES.find(x=>x.id===id),key=`consumable:${id}`,known=s.discoveredCards??[];if(!it||s.gold<it.preco)return;set({gold:s.gold-it.preco,inventory:{...s.inventory,[id]:(s.inventory[id]??0)+1},discoveredCards:known.includes(key)?known:[...known,key]})},
  buyEquipment:(id:string)=>{const s=get(),e=eqById(id),key=`equipment:${e?.id}`,known=s.discoveredCards??[];if(!e||!equipmentClassAllowed(e,s.heroId)||!equipmentLevelAllowed(e,s.xp)||e.raridade==='epico'||e.raridade==='lendario'||s.gold<e.preco||s.equipmentBag.length>=equipmentBagCapacity(s))return;set({gold:s.gold-e.preco,equipmentBag:[...s.equipmentBag,createEquipmentInstance(e.id)],discoveredCards:known.includes(key)?known:[...known,key]})},
  sellConsumable:(id:string)=>{const s=get(),it=CONSUMABLES.find(x=>x.id===id);if(!it||(s.inventory[id]??0)<=0)return;const inv={...s.inventory,[id]:(s.inventory[id]??0)-1};if(inv[id]<=0)delete inv[id];set({inventory:inv,gold:s.gold+Math.max(1,Math.floor(it.preco/2))})},
  sellEquipment:(id:string)=>{const s=get(),idx=s.equipmentBag.indexOf(id),e=eqById(id);if(idx<0||!e)return;const bag=[...s.equipmentBag];bag.splice(idx,1);const equipmentUpgrades={...s.equipmentUpgrades},equipmentGems={...s.equipmentGems},forgedGemLocked={...s.forgedGemLocked},craftedEffects={...s.craftedEffects},equipmentElements={...s.equipmentElements},equipmentResistances={...s.equipmentResistances};delete equipmentUpgrades[id];delete equipmentGems[id];delete forgedGemLocked[id];delete craftedEffects[id];delete equipmentElements[id];delete equipmentResistances[id];set({equipmentBag:bag,equipmentUpgrades,equipmentGems,forgedGemLocked,craftedEffects,equipmentElements,equipmentResistances,gold:s.gold+Math.max(1,Math.floor(e.preco/2))})},
  equip:(id:string)=>{const s=get(),e=eqById(id);if(!e||!equipmentClassAllowed(e,s.heroId)||!equipmentLevelAllowed(e,s.xp))return;const idx=s.equipmentBag.indexOf(id);if(idx<0)return;let slot=e.slot; if(slot==='anel_1'&&s.equipped.anel_1) slot='anel_2'; if(slot==='mao_esquerda'&&equipmentWeaponClass(eqById(s.equipped.mao_direita))==='facas')return; const old=s.equipped[slot]; const bag=[...s.equipmentBag];bag.splice(idx,1);if(old)bag.push(old);const equipped={...s.equipped,[slot]:id};if(slot==='mao_direita'&&equipmentWeaponClass(e)==='facas'&&equipped.mao_esquerda){bag.push(equipped.mao_esquerda);delete equipped.mao_esquerda}if(slot==='bolsa'&&bag.length>(e.capacidade??8))return;set({equipmentBag:bag,equipped})},
  unequip:(slot:Slot)=>{const s=get(),id=s.equipped[slot];if(!id||slot==='bolsa'||s.equipmentBag.length>=equipmentBagCapacity(s))return;const eq={...s.equipped};delete eq[slot];set({equipped:eq,equipmentBag:[...s.equipmentBag,id]})},
  addAttribute:(k:'vida'|'ataque'|'defesa')=>{const s=get();if(s.attributePoints<=0)return;set({attributePoints:s.attributePoints-1,attr:{...s.attr,[k]:s.attr[k]+1},allocatedAttr:{...s.allocatedAttr,[k]:s.allocatedAttr[k]+1},hp:k==='vida'?s.hp+1:s.hp})},
  setSelectedGallery:(selectedGallery:number)=>set({selectedGallery}),
  toggleShopMode:()=>set({shopMode:get().shopMode==='buy'?'sell':'buy'}),
  resolveEvent:(accept:boolean,approach?:'class')=>{const s=get(),known=s.discoveredCards??[],key=s.currentEvent&&`event:${s.currentEvent.id}`;if(key&&!known.includes(key))set({discoveredCards:[...known,key]});resolveExplorationEvent(set,get,accept,approach)},
  finishEvent:()=>{const result=get().eventResult;set({screen:'region',currentEvent:undefined,eventResult:undefined,explorationNote:result?.message})},
  finishLoot:()=>set({screen:get().subregionId?'region':'map',subregionId:undefined,explorationNote:undefined,enemy:undefined,enemyHp:0,combatLog:[],coin:undefined,playerTurn:false,animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,heroRollBonus:0,enemyRollBonus:0,enemyFearPenalty:0,heroSkillUses:0,itemSkillUsed:false,braced:false,braceBonusUsed:false,fervor:0,firstStrikeBonus:0,classBuffTurns:0,summon:undefined,lifeWardActive:false,groupCriticalBoost:false,heroStatus:{},enemyStatus:{},dungeonActive:false,dungeonDepth:0}),
  clearSave:()=>set({screen:'menu',heroId:undefined,hp:0,gold:0,xp:0,inventory:{},equipmentBag:[],equipped:{},territory:'Planícies de Alvora',regionId:'campos_dourados',subregionId:undefined,victories:{},subregionVictories:{},bossesDefeated:[],subregionBossesDefeated:[],currentEvent:undefined,eventResult:undefined,pendingAttackBonus:0,campaigns:{},activeCampaignId:undefined}),
  addCustomCard:(card:Omit<CustomCard,'id'|'criadoEm'>)=>{const s=get();set({customCards:[...s.customCards,{...card,id:`custom_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,criadoEm:Date.now()}]})},
  removeCustomCard:(id:string)=>{const s=get();set({customCards:s.customCards.filter((c:CustomCard)=>c.id!==id)})}
  ,setDifficulty:(difficultyMode:DifficultyMode)=>set({difficultyMode})
  ,unlockTalent:(id:string)=>{const s=get(),talent=TALENTS.find(t=>t.id===id),level=deriveLevel(s.xp).lvl;if(!talent||level<talent.level||s.talents.includes(id))return;set({talents:[...s.talents,id]})}
  ,chooseSpecialization:(level:number,id:string)=>{const s=get(),tier=SPECIALIZATION_CHOICES.find(t=>t.level===level),option=tier?.options.find(o=>o.id===id);if(!tier||!option||deriveLevel(s.xp).lvl<level||(s.specializations??{})[String(level)])return;set({specializations:{...(s.specializations??{}),[String(level)]:id},explorationNote:`Especialização escolhida: ${option.nome}.`})}
  ,resetSpecializations:()=>{const s=get(),cost=100+Object.keys(s.specializations??{}).length*75;if(s.gold<cost)return;set({gold:s.gold-cost,specializations:{},explorationNote:`Especializações redefinidas por ${cost} ouro.`})}
  ,attuneEquipment:(id:string,element:Element)=>{const s=get(),item=eqById(id),material=Object.values(REGION_MATERIALS).find(m=>m.elemento===element),cost=80;if(!item||!material||!Object.values(s.equipped).includes(id)||s.gold<cost||(s.materials[material.id]??0)<3)return;const materials={...s.materials,[material.id]:s.materials[material.id]-3};if(item.slot==='mao_direita')set({gold:s.gold-cost,materials,equipmentElements:{...s.equipmentElements,[id]:element},explorationNote:`${item.nome} agora causa dano de ${element}.`});else set({gold:s.gold-cost,materials,equipmentResistances:{...s.equipmentResistances,[id]:element},explorationNote:`${item.nome} agora concede resistência a ${element}.`})}
  ,craftEquipment:(recipeId?:string,choice?:ForgeChoice)=>{
   const s=get(),recipe=FORGE_RECIPES.find(r=>r.id===recipeId),item=recipe&&eqById(recipe.equipmentId),required=recipe?forgeRecipeLevel(recipe.id):99,requiredPlayerLevel=item?equipmentRequiredLevel(item):999,forgeXp=s.forgeXp??0
   const isAttribute=choice==='ataque'||choice==='defesa'||choice==='vida'
   const gem=choice&&recipe?.attributeChoice?(isAttribute?FORGE_GEMS.find(g=>g.stat===choice):FORGE_GEMS.find(g=>g.id===FORGE_BONUS_MATERIAL[choice as ForgeBonus])):undefined
   if(choice&&!gem)return
   // Forjar um bônus (atributo ou efeito especial) não cria mais uma peça do zero: ela
   // refina uma cópia SEM BÔNUS que o jogador já possui (na mochila ou equipada), lapidando
   // a peça existente em vez de duplicá-la. Por isso a mochila não precisa ter espaço livre
   // aqui, e o sucesso não empurra um novo item pra bag -- só marca a que já existe. A
   // fabricação sem bônus continua igual a antes.
   // Prioriza a cópia EQUIPADA sobre qualquer cópia avulsa na mochila -- antes, com duas cópias
   // do mesmo item (uma equipada, uma sobrando na mochila), o bônus sempre ia pra primeira cópia
   // encontrada na mochila (ordem antiga), deixando a peça equipada sem o bônus escolhido mesmo
   // após um refino bem-sucedido, sem nenhum aviso de que a cópia errada foi lapidada.
   const ownedRefs=[...Object.values(s.equipped).filter((ref):ref is string=>Boolean(ref)),...s.equipmentBag]
   const targetRef=item&&ownedRefs.find(ref=>equipmentRefMatches(ref,item.id)&&!s.craftedEffects[ref]&&!s.forgedGemLocked?.[ref])
   const hasUnbonusedCopy=Boolean(targetRef)
   if(gem&&!hasUnbonusedCopy)return
   // Refino de gema de ATRIBUTO lapida a cópia existente, mas ela precisa ter um encaixe
   // livre -- sem essa checagem, a gema forjada substituía (em vez de somar a) qualquer pedra
   // já socketada manualmente na mesma peça, perdendo-a sem reembolso. Bônus especiais
   // (crítico/esquiva/cura) não ocupam encaixe nenhum (vão para craftedEffects, não
   // equipmentGems), então não devem ser bloqueados por um encaixe físico já cheio -- isso
   // fazia o refino de bônus falhar em silêncio numa peça que já tinha uma pedra de atributo.
   if(isAttribute&&gem&&item&&targetRef&&(s.equipmentGems[targetRef]??[]).length>=equipmentSocketCount(item))return
   // Forjar sem bônus uma peça acima de comum também "sacrifica" peças prontas de uma
   // raridade abaixo (ex.: um item raro pede 2 incomuns), além dos materiais normais -- só
   // vale pra fabricação nova (gem indefinido é a fabricação; refino de bônus não sacrifica).
   const sacrifice=!choice?FORGE_SACRIFICE[item?.raridade??'comum']:undefined
   const sacrificeOwned=sacrifice?forgeSacrificeOwned(s,sacrifice.rarity):0
   if(sacrifice&&sacrificeOwned<sacrifice.qty)return
   const cost=gem?{...recipe!.materials,[gem.id]:(recipe!.materials[gem.id]??0)+1}:recipe?.materials
   if(!recipe||!item||!cost||forgeLevelInfo(forgeXp).level<required||deriveLevel(s.xp).lvl<requiredPlayerLevel||(!gem&&!sacrifice&&s.equipmentBag.length>=equipmentBagCapacity(s))||!equipmentClassAllowed(item,s.heroId)||Object.entries(cost).some(([id,qty])=>(s.materials[id]??0)<qty))return
   const materials={...s.materials},success=Math.random()<forgeSuccessChance(recipe.id,forgeXp,storyModifiers(s).forge),xpGain=success?18+required*7:8+required*3
   for(const [id,qty] of Object.entries(cost))materials[id]-=success?qty:Math.max(1,Math.ceil(qty/2))
   // Sacrifício some mesmo em falha (metade, igual aos materiais) -- só a peça nova em si
   // depende do sucesso. Removidas de trás pra frente pra não bagunçar índices ao dar splice.
   const bag=[...s.equipmentBag]
   if(sacrifice){
    let toConsume=success?sacrifice.qty:Math.max(1,Math.ceil(sacrifice.qty/2))
    for(let i=bag.length-1;i>=0&&toConsume>0;i--){if((eqById(bag[i])?.raridade??'comum')===sacrifice.rarity){bag.splice(i,1);toConsume--}}
   }
   const createdRef=success&&!gem?createEquipmentInstance(item.id):undefined
   if(createdRef)bag.push(createdRef)
   const forgedRef=targetRef??createdRef
   const bonusEffect=!isAttribute&&choice?choice as ForgeBonus:undefined
   // Elemento (arma) ou resistência (qualquer outro slot) só existem em itens forjados com
   // sucesso ou obtidos de chefes — a loja nunca vende equipamento com essas propriedades.
   const forgedElement=CLASS_ELEMENT[(s.heroId as keyof typeof CLASS_ELEMENT)]??'fisico'
   const sacrificeText=sacrifice?` (consumindo ${sacrifice.qty} peça${sacrifice.qty===1?'':'s'} ${RARITY_LABEL[sacrifice.rarity]})`:''
   const message=success?(gem?`Refinamento bem-sucedido: ${recipe.nome} — ${isAttribute?gem.texto:FORGE_BONUS_LABELS[choice as ForgeBonus]} aplicado permanentemente à peça que você já possuía. +${xpGain} XP de Forja.`:`Forja bem-sucedida: ${recipe.nome}${sacrificeText}. O item ganhou ${item.slot==='mao_direita'?`elemento ${forgedElement}`:`resistência a ${forgedElement}`}. +${xpGain} XP de Forja.`):(gem?`O refinamento de ${recipe.nome} falhou. A peça continua sem o bônus e metade dos materiais foi perdida, mas você ganhou +${xpGain} XP de Forja.`:`A fabricação de ${recipe.nome} falhou${sacrifice?' e parte das peças sacrificadas se perdeu':''}. Metade dos materiais foi perdida, mas você ganhou +${xpGain} XP de Forja.`)
   const resultId=Date.now()
   set({
    materials,
    equipmentBag:bag,
    forgeXp:forgeXp+xpGain,
    forgeAttempts:(s.forgeAttempts??0)+1,
    forgeSuccesses:(s.forgeSuccesses??0)+(success?1:0),
    ...(success?{
     craftedEffects:bonusEffect&&forgedRef?{...s.craftedEffects,[forgedRef]:bonusEffect}:recipe.effect&&forgedRef?{...s.craftedEffects,[forgedRef]:recipe.effect}:s.craftedEffects,
     ...(isAttribute&&gem&&targetRef?{equipmentGems:{...s.equipmentGems,[targetRef]:[...(s.equipmentGems[targetRef]??[]),gem.id]},forgedGemLocked:{...s.forgedGemLocked,[targetRef]:true}}:{}),
     // Elemento/resistência só nascem da fabricação de uma peça nova do zero (gem indefinido) --
     // o refino de uma gema de atributo/bônus (gem definido) numa peça que o jogador já possuía
     // não deveria mexer nisso, e sobrescrevia silenciosamente uma atonização paga antes via
     // attuneEquipment.
     ...(forgedRef&&!gem?(item.slot==='mao_direita'?{equipmentElements:{...s.equipmentElements,[forgedRef]:forgedElement}}:{equipmentResistances:{...s.equipmentResistances,[forgedRef]:forgedElement}}):{})
    }:{}),
    explorationNote:message,
    forgeResult:{success,message,id:resultId}
   })
   setTimeout(()=>{if((get() as GameState).forgeResult?.id===resultId)set({forgeResult:undefined})},FORGE_RESULT_DISPLAY_MS)
  }
  ,upgradeEquipment:(id:string)=>{const s=get(),item=eqById(id),level=s.equipmentUpgrades[id]??0;if(!item||level>=3)return;const cost=equipmentUpgradeCost(item,level);if(s.gold<cost)return;set({gold:s.gold-cost,equipmentUpgrades:{...s.equipmentUpgrades,[id]:level+1},explorationNote:`${item.nome} aprimorado para +${level+1}.`})}
  ,dismantleEquipment:(id:string)=>{const s=get(),index=s.equipmentBag.indexOf(id),item=eqById(id);if(index<0||!item)return;const yieldInfo=dismantlePreview(item),materials={...s.materials,fragmento_fisico:(s.materials.fragmento_fisico??0)+yieldInfo.physical,essencia_magica:(s.materials.essencia_magica??0)+yieldInfo.magical},installed=s.equipmentGems[id]??[];for(const gem of installed)materials[gem]=(materials[gem]??0)+1;let gemName='';if(Math.random()<yieldInfo.gemChance){const gem=FORGE_GEMS[Math.floor(Math.random()*FORGE_GEMS.length)];materials[gem.id]=(materials[gem.id]??0)+1;gemName=` • Pedra encontrada: ${gem.nome}`};const bag=[...s.equipmentBag];bag.splice(index,1);const equipmentUpgrades={...s.equipmentUpgrades},equipmentGems={...s.equipmentGems},forgedGemLocked={...s.forgedGemLocked},craftedEffects={...s.craftedEffects},equipmentElements={...s.equipmentElements},equipmentResistances={...s.equipmentResistances};delete equipmentUpgrades[id];delete equipmentGems[id];delete forgedGemLocked[id];delete craftedEffects[id];delete equipmentElements[id];delete equipmentResistances[id];set({equipmentBag:bag,equipmentUpgrades,equipmentGems,forgedGemLocked,craftedEffects,equipmentElements,equipmentResistances,materials,explorationNote:`${item.nome} desmontado: +${yieldInfo.physical} fragmentos físicos, +${yieldInfo.magical} essências mágicas${gemName}.`})}
  ,socketGem:(equipmentId:string,gemId:string)=>{const s=get(),item=eqById(equipmentId),installed=s.equipmentGems[equipmentId]??[];if(!item||!Object.values(s.equipped).includes(equipmentId)||installed.length>=equipmentSocketCount(item)||(s.materials[gemId]??0)<=0||!FORGE_GEMS.some(g=>g.id===gemId))return;set({materials:{...s.materials,[gemId]:s.materials[gemId]-1},equipmentGems:{...s.equipmentGems,[equipmentId]:[...installed,gemId]},explorationNote:`Pedra instalada em ${item.nome}.`})}
  // Pedras ficam fixas no item onde foram instaladas: removê-las não devolve o material --
  // antes o jogador podia tirar e reinstalar a mesma pedra em outro equipamento de graça,
  // então socketGem/removeGem funcionavam como um "empréstimo" sem custo real. Agora remover
  // destrói a pedra, e só o encaixe fica livre para uma pedra nova.
  ,removeGem:(equipmentId:string,index:number)=>{const s=get(),installed=[...(s.equipmentGems[equipmentId]??[])],gemId=installed[index],gem=FORGE_GEMS.find(g=>g.id===gemId);if(!gemId||(index===0&&s.forgedGemLocked?.[equipmentId]))return;installed.splice(index,1);set({equipmentGems:{...s.equipmentGems,[equipmentId]:installed},explorationNote:`${gem?.nome??'A pedra'} foi perdida ao ser removida. Pedras instaladas ficam fixas no item.`})}
  ,startDungeon:()=>{
    const s=get(),sub=SUBREGIONS.find(x=>x.id===s.dungeonSubregionId)??SUBREGIONS.find(x=>x.id===s.subregionId)??SUBREGIONS.find(x=>x.regionId===s.regionId)??SUBREGIONS[0]
    const freshRun=!s.dungeonActive,depth=(s.dungeonActive?s.dungeonDepth:0)+1
    // Cada sala da masmorra é um combate completo. Ao avançar, consome os bônus de poção
    // limitados ao "próximo combate" antes de montar o inimigo seguinte. Efeitos com duração
    // própria (como regenBoostUntil) e melhorias permanentes não são alterados aqui.
    const isBoss=depth%5===0
    const enemy=difficultyEnemy(isBoss?buildBoss(sub):buildEnemy(sub,deriveLevel(s.xp).lvl+depth),s.difficultyMode)
    const scalingDepth=Math.min(depth,DUNGEON_SCALING_DEPTH)
    const enemyLevel=enemy.nivel??enemy.dificuldade??1
    const dungeonLevel=enemyLevel+scalingDepth
    let dungeonEnemy:Enemy=balanceEnemyByLevel({...enemy,nome:`Masmorra ${depth}: ${enemy.nome}`,vida:Math.ceil(enemy.vida*(1+scalingDepth*.12)),dungeon:true,nivel:dungeonLevel,dificuldade:dungeonLevel})

    // Cada andar precisa ser sempre mais desafiador que o anterior -- o sorteio de monstro/
    // variante (buildEnemy) sozinho não garantia isso, dava pra cair num andar mais fraco que o
    // de trás por puro acaso. Exige um crescimento mínimo de custo de combate em relação ao
    // último andar desta descida; se o sorteio natural já for mais forte que isso, fica como
    // está (preserva a variedade dos monstros/variantes).
    if(!freshRun&&s.dungeonLastCost!=null){
      const minCost=s.dungeonLastCost*(1+DUNGEON_MIN_DIFFICULTY_GROWTH)
      if(enemyPointCost(dungeonEnemy)<minCost)dungeonEnemy=scaleEnemyToAtLeastCost(dungeonEnemy,minCost)
    }
    const currentCost=enemyPointCost(dungeonEnemy)

    // Recompensa também sobe a cada andar, mas nunca "demais": fica sempre entre
    // DUNGEON_REWARD_MIN_GROWTH e DUNGEON_REWARD_MAX_GROWTH em relação ao andar anterior desta
    // descida (nunca cai, nunca dispara). Continua usando scalingDepth (com teto) como base
    // "natural", igual ao rebalanceamento anterior desse mesmo bug.
    const naturalXp=Math.round((enemyLevel*4+scalingDepth*6)*(isBoss?1.6:1))
    const naturalGold=Math.ceil(enemy.ouro*(1+scalingDepth*.18))
    const xpReward=freshRun||s.dungeonLastXpReward==null?naturalXp:Math.round(clamp(naturalXp,s.dungeonLastXpReward*(1+DUNGEON_REWARD_MIN_GROWTH),s.dungeonLastXpReward*(1+DUNGEON_REWARD_MAX_GROWTH)))
    const goldReward=freshRun||s.dungeonLastGoldReward==null?naturalGold:Math.round(clamp(naturalGold,s.dungeonLastGoldReward*(1+DUNGEON_REWARD_MIN_GROWTH),s.dungeonLastGoldReward*(1+DUNGEON_REWARD_MAX_GROWTH)))
    dungeonEnemy={...dungeonEnemy,xpReward,ouro:goldReward}

    beginCombat(set,get,dungeonEnemy)
    set({dungeonDepth:depth,dungeonActive:true,dungeonSubregionId:sub.id,dungeonLastCost:currentCost,dungeonLastXpReward:xpReward,dungeonLastGoldReward:goldReward})
  }
  // Escolha explícita do alvo da masmorra (Painel de Masmorras): antes o alvo vinha implícito
  // da sub-região explorada no mapa (s.subregionId), então não dava pra escolher uma masmorra
  // sem primeiro navegar até lá. Trocar de alvo com uma expedição em andamento encerra a
  // expedição atual (mesma regra de leaveDungeon) -- profundidade e escala não fazem sentido
  // ao trocar de região no meio de uma masmorra.
  ,selectDungeon:(subregionId:string)=>{const s=get();if(!SUBREGIONS.some(x=>x.id===subregionId)||subregionId===s.dungeonSubregionId)return;const abandoning=s.dungeonActive&&s.dungeonSubregionId&&s.dungeonSubregionId!==subregionId;set({dungeonSubregionId:subregionId,...(abandoning?{dungeonActive:false,dungeonDepth:0,dungeonLastCost:undefined,dungeonLastXpReward:undefined,dungeonLastGoldReward:undefined}:{})})}
  ,leaveDungeon:()=>set({screen:'map',subregionId:undefined,dungeonActive:false,dungeonDepth:0,dungeonLastCost:undefined,dungeonLastXpReward:undefined,dungeonLastGoldReward:undefined,loot:undefined,explorationNote:'Expedição encerrada. Os espólios conquistados foram preservados.'})
  ,startRevenge:(subregionId:string)=>{const s=get(),sub=SUBREGIONS.find(x=>x.id===subregionId);if(!sub||!s.subregionBossesDefeated.includes(subregionId))return;set({subregionId,regionId:sub.regionId,territory:sub.nome,screen:'bossIntro',enemy:difficultyEnemy(buildRevengeBoss(sub,s.revengeWins[subregionId]??0,deriveLevel(s.xp).lvl),s.difficultyMode)})}
  ,chooseStory:(choiceId:string)=>{const s=get(),chapter=STORY_CHAPTERS.find(c=>c.id===s.storyChapterId),choice=chapter?.choices.find(c=>c.id===choiceId),progress=storyRequirementProgress(s);if(!chapter||!choice||!progress.complete)return;const materials={...s.materials};if(choice.material)materials[choice.material]=(materials[choice.material]??0)+1;set({storyChapterId:choice.next,storyChoices:{...s.storyChoices,[chapter.id]:choice.id},storyFlags:s.storyFlags.includes(`historia:${choice.id}`)?s.storyFlags:[...s.storyFlags,`historia:${choice.id}`],gold:s.gold+(choice.gold??0),materials,storyNotice:choice.consequence})}
  ,startTour:()=>set({tourStep:0,screen:TOUR_STEPS[0].screen})
  ,nextTourStep:()=>{const step=(get().tourStep??0)+1;if(step>=TOUR_STEPS.length){set({tourStep:undefined});return}set({tourStep:step,screen:TOUR_STEPS[step].screen})}
  ,prevTourStep:()=>{const step=(get().tourStep??0)-1;if(step<0)return;set({tourStep:step,screen:TOUR_STEPS[step].screen})}
  ,endTour:()=>set({tourStep:undefined})
}),{name:'bangalores-save-v1',merge:(persisted:any,current:any)=>{let merged:any={...current,...persisted,equipped:{...(persisted?.equipped??{}),bolsa:persisted?.equipped?.bolsa??'mochila_pequena_8'},regionId:persisted?.regionId??'campos_dourados',world:persisted?.world??'havendown',subregionVictories:persisted?.subregionVictories??{},subregionBossesDefeated:persisted?.subregionBossesDefeated??[],pendingAttackBonus:persisted?.pendingAttackBonus??0,currentEvent:persisted?.currentEvent,eventResult:persisted?.eventResult,customCards:persisted?.customCards??[],campaigns:persisted?.campaigns??{},guildAccepted:persisted?.guildAccepted??[],guildProgress:persisted?.guildProgress??{},guildClaimed:persisted?.guildClaimed??[],difficultyMode:persisted?.difficultyMode??'veterano',talents:persisted?.talents??[],materials:persisted?.materials??{},equipmentUpgrades:persisted?.equipmentUpgrades??{},equipmentGems:persisted?.equipmentGems??{},forgedGemLocked:persisted?.forgedGemLocked??{},craftedEffects:persisted?.craftedEffects??{},equipmentElements:persisted?.equipmentElements??{},equipmentResistances:persisted?.equipmentResistances??{},bestiary:persisted?.bestiary??{},revengeWins:persisted?.revengeWins??{},consecutiveDefeats:persisted?.consecutiveDefeats??0,lastDefeatKey:persisted?.lastDefeatKey,dungeonDepth:persisted?.dungeonDepth??0,dungeonActive:persisted?.dungeonActive??false,storyFlags:persisted?.storyFlags??[],storyChapterId:persisted?.storyChapterId??'prologo',storyChoices:persisted?.storyChoices??{},storyNotice:persisted?.storyNotice,guildNotice:undefined,forgeResult:undefined,tourStep:undefined,animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,playerTurn:persisted?.screen==='combat'&&persisted?.enemy?true:(persisted?.playerTurn??false)};merged=migrateEquipmentInstances(merged);Object.assign(merged,normalizeAttributes(merged));if(merged.heroId&&!merged.activeCampaignId){const id=`campaign_legacy_${Date.now()}`;merged.activeCampaignId=id;merged.campaigns={...merged.campaigns,[id]:campaignSnapshot(merged)}}return merged}}))

function stats(s:GameState){const h=HEROES.find(x=>x.id===s.heroId);let atk=(h?.ataque??0)+s.attr.ataque+s.pendingAttackBonus+(s.talents?.includes('precisao')?1:0)+(s.talents?.includes('poder_interior')?1:0)+(s.talents?.includes('instinto_predador')?2:0),life=(h?.vida??0)+s.attr.vida+(s.talents?.includes('vigor')?5:0)+(s.talents?.includes('resiliencia')?8:0)+(s.talents?.includes('apice_heroico')?15:0),def=(h?.defesa??0)+s.attr.defesa+(s.talents?.includes('muralha')?1:0)+(s.talents?.includes('reflexos')?1:0)+(s.talents?.includes('guarda_ancestral')?2:0),roll=0;const atkBase=atk,lifeBase=life,defBase=def;Object.values(s.equipped).forEach(id=>{const e=eqById(id);if(e){const b=equipmentInstanceBreakdown(e,id,s);atk+=b.total.atk;life+=b.total.life;def+=b.total.def;roll+=b.total.roll}});const sets=equipmentSetCounts(s);if(sets.lua>=2)def+=1;if(sets.lua>=4)life+=4;if(sets.cinzas>=2)atk+=1;if(sets.khar>=2)life+=3;if(sets.eclipse>=2)atk+=1;if(equipmentWeaponClass(eqById(s.equipped.mao_direita))==='facas'&&!s.equipped.mao_esquerda)atk+=FACAS_OFFHAND_ATTACK_BONUS;return{atk,life,def,roll,atkFromItems:atk-atkBase,lifeFromItems:life-lifeBase,defFromItems:def-defBase}}
// Exposto pra UI (Tela de Equipamentos): quanto do ataque/defesa/vida atual vem só dos itens
// equipados (armas, armaduras, pedras e bônus de conjunto), separado da base do herói/atributos/talentos.
export function equipmentStatBonus(s:GameState){const st=stats(s);return{atk:st.atkFromItems,def:st.defFromItems,life:st.lifeFromItems}}
// A gema Ametista Arcana (stat 'rolagem') soma à mesma bolsa de bônus do talento Senhor do
// Destino: um empurrão na primeira rolagem de ataque de cada combate (heroRollBonus é zerado
// após o primeiro golpe, então isso nunca vale para o resto da batalha).
function equipmentRollBonus(s:GameState){return stats(s).roll}
export function maxHp(s:GameState){return stats(s).life+specializationBonuses(s).life+collectionMastery(s).life}
export function attackValue(s:GameState){const base=stats(s).atk+specializationBonuses(s).attack+storyModifiers(s).attack+collectionMastery(s).attack;return Math.ceil(base*(1+(s.combatAttackPct??0)))}
export function defenseValue(s:GameState){const base=stats(s).def+specializationBonuses(s).defense+storyModifiers(s).defense+collectionMastery(s).defense;return Math.ceil(base*(1+(s.combatDefensePct??0)))}
export function levelInfo(xp:number){return deriveLevel(xp)}
// O talento Alquimista de Campo soma +1 ao valor de todo consumível usado, mas a descrição do
// item (texto fixo em itens.json, ex. "Recupera até 8 pontos de vida") nunca refletia esse
// bônus -- o jogador via um número na carta e recebia outro. consumableDescription mostra o
// valor efetivo já somado ao texto quando o talento está ativo, em vez de deixar a UI mentir.
export function consumableAlquimistaBonus(s:GameState){return s.talents?.includes('alquimista')?1:0}
export function consumableEffectiveValue(it:Consumable,s:GameState){return it.valor+consumableAlquimistaBonus(s)+((s.specializations??{})['50']==='alquimia'?2:0)}
export function consumableDescription(it:Consumable,s:GameState){const bonus=consumableAlquimistaBonus(s);return bonus?`${it.descricao} Com Alquimista de Campo: +${bonus} (valor efetivo ${it.valor+bonus}).`:it.descricao}

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
   const pool=EQUIPMENT.filter(e=>equipmentLevelAllowed(e,s.xp)&&equipmentClassAllowed(e,s.heroId));const equipment=pickWeightedEquipment(pool)??EQUIPMENT[0];set({...common,equipmentBag:[...s.equipmentBag,createEquipmentInstance(equipment.id)],eventResult:{message:`O ferreiro entregou: ${equipment.nome}.`,roll,tone:'good'}});return
 }
 if(event.tipo==='item'){const item=CONSUMABLES[Math.floor(Math.random()*CONSUMABLES.length)];set({...common,inventory:{...s.inventory,[item.id]:(s.inventory[item.id]??0)+1},eventResult:{message:`Você recebeu: ${item.nome}.`,roll,tone:'good'}});return}

 const success=roll>=4
 const amount=Math.max(1,event.valor)
 if(success){set({...common,gold:s.gold+amount,eventResult:{message:`Sucesso! Você recebeu ${amount} de ouro.`,roll,tone:'good'}})}
 else {const loss=Math.min(s.gold,Math.max(1,Math.ceil(amount/2)));set({...common,gold:s.gold-loss,eventResult:{message:`A tentativa falhou. Você perdeu ${loss} de ouro.`,roll,tone:'bad'}})}
}

function beginCombat(set:any,get:any,enemy:Enemy){const coin=Math.random()<.5?'cara':'coroa';const s=get() as GameState,key=enemyDisplayKey(enemy.nome),discovery=`${enemy.boss?'boss':enemy.elite?'elite':'monster'}:${key}`,discoveries=s.discoveredCards??[];const known=s.bestiary[key]??{encontros:0,vitorias:0},sets=equipmentSetCounts(s),setShield=sets.khar>=4?3:0,setRoll=enemy.boss&&sets.eclipse>=4?1:0,setStrike=sets.cinzas>=4?2:0,warriorLuck=s.heroId==='guerreiro'&&Math.random()<.5;set({screen:'combat',enemy,enemyHp:enemy.vida,combatTurn:1,combatLog:[`${enemy.variante&&enemy.variante!=='Comum'?enemy.variante+' • ':''}Nível ${enemy.nivel??enemy.dificuldade}.`,`Afinidade elemental: ${enemy.elemento??(enemy.boss?'sombra':'físico')}.`,...(warriorLuck?['Fortuna do Guerreiro ativada: +1 em todos os dados nesta batalha.']:[]),...(setShield?[`Conjunto de Kholgard: +${setShield} de escudo inicial.`]:[]),...(setRoll?[`Conjunto do Sol Negro: +1 nas rolagens contra chefes.`]:[]),...(setStrike?[`Arsenal das Cinzas: +${setStrike} de dano no primeiro ataque.`]:[]),`Moeda: ${coin.toUpperCase()}. ${coin==='cara'?'Você':'Inimigo'} começa.`],coin,playerTurn:coin==='cara',animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined,heroRollBonus:(s.talents.includes('destino')?1:0)+setRoll+(warriorLuck?1:0)+equipmentRollBonus(s),enemyRollBonus:0,enemyFearPenalty:0,heroSkillUses:0,itemSkillUsed:false,shield:s.shield+setShield,classRollBonus:warriorLuck?1:0,classBuffTurns:0,summon:undefined,lifeWardActive:false,phoenixUsed:false,groupCriticalBoost:false,braced:false,braceBonusUsed:false,fervor:0,firstStrikeBonus:setStrike,heroStatus:{},enemyStatus:{},combatMinions:[],combatAttackPct:0,combatDefensePct:0,extraHeroAttacks:0,guardianTaunt:false,bestiary:{...s.bestiary,[key]:{...known,encontros:known.encontros+1}},discoveredCards:discoveries.includes(discovery)?discoveries:[...discoveries,discovery]});if(coin==='coroa')setTimeout(()=>enemyAttack(set,get),800)}
function addLog(set:any,msg:string){set((s:GameState)=>({combatLog:[...s.combatLog.slice(-12),msg]}))}
function triggerSupportFx(set:any,get:any,type:'fortificacao'|'cura'|'cura-item'){set({supportFx:{type}});setTimeout(()=>{if((get() as GameState).supportFx?.type===type)set({supportFx:undefined})},1600)}
export function summonBossMinions(enemy:Enemy,phase:number):CombatMinion[]{const count=Math.min(2,phase),level=enemy.nivel??enemy.dificuldade??1,hp=Math.max(4,Math.ceil(enemy.vida*.14)),attack=Math.max(2,Math.ceil(enemy.ataque*.45));return Array.from({length:count},(_,index)=>({id:`minion_${phase}_${index}_${Date.now()}`,nome:index?'Capanga veterano':'Capanga do chefe',hp,maxHp:hp,ataque:attack+Math.floor(level/8)}))}
// As feras acompanham o Conjurador até o nível 100. Antes, o crescimento parava no nível 17
// e deixava todas as invocações com apenas 7–10 de vida no restante da campanha.
const SUMMON_NAMES:Record<SummonType,string>={atacante:'Fera Espectral Feroz',defensor:'Guardião Espectral',arcano:'Sombra Arcana'}
export const SUMMON_INTERCEPT_CHANCE:Record<SummonType,number>={atacante:.15,defensor:.8,arcano:.35}
export function buildSummon(tipo:SummonType,level:number):Summon{
 const lvl=Math.max(1,Math.min(100,Math.floor(level)))
 const base={hp:10+Math.round(lvl*.75),atk:3+Math.round(lvl*.42),def:2+Math.round(lvl*.38)}
 const stats=tipo==='atacante'
  ?{hp:base.hp,atk:base.atk+3+Math.floor(lvl*.08),def:Math.max(1,base.def-3)}
  :tipo==='defensor'
   ?{hp:base.hp+6+Math.floor(lvl*.18),atk:Math.max(1,base.atk-2),def:base.def+5+Math.floor(lvl*.08)}
   :{hp:Math.max(8,base.hp-2),atk:Math.max(2,base.atk-1),def:base.def}
 return{tipo,nome:SUMMON_NAMES[tipo],hp:stats.hp,maxHp:stats.hp,ataque:stats.atk,defesa:stats.def}
}
const COMBAT_ROLL_DISPLAY_MS=2500
const FORGE_RESULT_DISPLAY_MS=3200
export function attackEffect(roll:number){return roll===1?'Falha crítica':roll===2?'Ataque desajeitado':roll<=4?'Ataque normal':roll===5?'Ataque forte':'Ataque crítico'}
export function defenseEffect(roll:number){return roll===1?'Falha crítica':roll===2?'Defesa fraca':roll<=4?'Defesa normal':roll===5?'Defesa forte':'Defesa perfeita'}
const HERO_ATTACK_FLAVOR:Record<string,((arma:string)=>string)[]>={
 guerreiro:[arma=>`avança com fúria e crava ${arma} no inimigo`,arma=>`golpeia com força bruta usando ${arma}`,arma=>`ruge um grito de guerra e ataca com ${arma}`,arma=>`avança sem hesitar e desfere um corte selvagem com ${arma}`],
 guardiao:[arma=>`avança com o escudo à frente e golpeia com ${arma}`,arma=>`bloqueia o caminho do inimigo e retribui com ${arma}`,arma=>`protege a linha de frente e contra-ataca com ${arma}`,arma=>`firma os pés no chão e golpeia com ${arma}`],
 cacadora:[arma=>`desliza pelas sombras e ataca com ${arma}`,arma=>`golpeia com agilidade felina usando ${arma}`,arma=>`aproveita uma brecha e acerta com ${arma}`,arma=>`ataca com precisão letal usando ${arma}`],
 cacador:[arma=>`mira com precisão e ataca com ${arma}`,arma=>`avança em silêncio e golpeia com ${arma}`,arma=>`aproveita uma abertura e acerta com ${arma}`,arma=>`ataca com instinto de caçador usando ${arma}`],
 arcanista:[arma=>`conjura energia arcana e golpeia com ${arma}`,arma=>`canaliza poder arcano e ataca com ${arma}`,arma=>`tece um feitiço rápido e golpeia com ${arma}`,arma=>`libera uma explosão de magia com ${arma}`],
 druida:[arma=>`invoca a fúria da natureza e ataca com ${arma}`,arma=>`canaliza o poder de Abdendriel e golpeia com ${arma}`,arma=>`ataca com a força selvagem da floresta usando ${arma}`,arma=>`golpeia com a energia da terra usando ${arma}`],
 monge:[arma=>`avança em silêncio e desfere um golpe certeiro com ${arma}`,arma=>`encadeia uma sequência fluida e acerta com ${arma}`,arma=>`canaliza o chi interior e golpeia com ${arma}`,arma=>`rompe a guarda do inimigo usando ${arma}`],
 sacerdotisa:[arma=>`ergue ${arma} e golpeia com luz abençoada`,arma=>`canaliza fé e retribui com ${arma}`,arma=>`avança com serenidade e ataca com ${arma}`,arma=>`golpeia com convicção usando ${arma}`],
 conjurador:[arma=>`ergue ${arma} e conjura poder arcano contra o inimigo`,arma=>`sussurra um pacto e golpeia com ${arma}`,arma=>`canaliza a fera invocada e ataca com ${arma}`,arma=>`tece um feitiço sombrio e golpeia com ${arma}`],
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
export function resolveCombatRoll(attackBase:number,defenseBase:number,attackRoll:number,defenseRoll:number,critBonusPct=0){
 if(attackRoll===1)return{damage:0,selfDamage:Math.max(1,Math.floor(attackBase*.1))}
 const effectiveAttack=attackBase+(attackRoll===5?1:0)
 let damage=Math.max(1,effectiveAttack-defenseBase)
 if(attackRoll===6)damage=Math.max(1,Math.floor(damage*(1.5+critBonusPct)))
 if(defenseRoll===1)damage=Math.max(1,Math.floor(damage*1.5))
 else if(defenseRoll===2)damage+=1
 else if(defenseRoll===5)damage=Math.max(0,damage-1)
 else if(defenseRoll===6)damage=Math.floor(damage*.5)
 return{damage,selfDamage:0}
}
// Sistema de condições elementais: cada elemento de ataque tem uma chance de aplicar uma
// condição correspondente no alvo, a menos que ele resista (equipamento defensivo com o
// mesmo elemento). DOTs (sangramento/queimadura/veneno) causam dano fixo por alguns turnos;
// congelamento/agarrado/cegueira penalizam TODAS as rolagens (ataque e defesa) do afetado;
// atordoamento é de uso único — cancela a próxima defesa do afetado OU pula a próxima ação
// dele, o que acontecer primeiro.
export type StatusEffects={bleed?:{turns:number;amount:number};burn?:{turns:number;amount:number};poison?:{turns:number;amount:number};frozen?:number;grabbed?:number;blinded?:number;stunned?:boolean}
const ELEMENT_STATUS:Partial<Record<Element,'bleed'|'burn'|'poison'|'frozen'|'grabbed'|'blinded'|'stunned'>>={fisico:'bleed',fogo:'burn',natureza:'poison',gelo:'frozen',sombra:'grabbed',luz:'blinded',arcano:'stunned'}
export const STATUS_LABELS:Record<string,string>={bleed:'Sangrando',burn:'Pegando fogo',poison:'Envenenado',frozen:'Congelado',grabbed:'Agarrado',blinded:'Cego',stunned:'Atordoado'}
// Efeito elemental só é testado num acerto crítico (rolagem natural 6) — os call-sites de
// applyElementalStatus checam isso antes de chamar a função. Quando testado, 50% de chance de
// aplicar, e a condição dura só até o próximo turno do alvo.
const STATUS_PROC_CHANCE=.5
// Elemento/resistência não são propriedades fixas do catálogo (a loja só vende equipamento
// "normal"): são concedidos por instância de equipamento — ao forjar com sucesso ou ao
// receber um item ao derrotar um chefe — e guardados em equipmentElements/equipmentResistances
// pelo id do equipamento, no mesmo padrão já usado por equipmentGems/craftedEffects.
export function heroWeaponElement(s:GameState):Element{const id=s.equipped.mao_direita;return (id?s.equipmentElements?.[id]:undefined)??'fisico'}
export function heroHasResistance(s:GameState,element:Element){return (Object.values(s.equipped) as (string|undefined)[]).some(id=>id&&s.equipmentResistances?.[id]===element)}
export function heroResistances(s:GameState):Element[]{return Array.from(new Set((Object.values(s.equipped) as (string|undefined)[]).map(id=>id?s.equipmentResistances?.[id]:undefined).filter((r):r is Element=>Boolean(r))))}
export function rollPenaltyFrom(status?:StatusEffects){return status?(status.frozen?1:0)+(status.grabbed?1:0)+(status.blinded?1:0):0}
// extraTurn: especialização 'elemental' (Domínio Elemental) -- só se aplica quando é o HERÓI
// aplicando a condição no inimigo (chamador passa a especialização do próprio jogador), nunca
// quando o inimigo aplica no herói, senão o bônus do jogador beneficiaria o ataque inimigo.
export function applyElementalStatus(status:StatusEffects|undefined,element:Element,attackPower:number,force=false,extraTurn=false):{status:StatusEffects;appliedKind?:string}{
 const kind=ELEMENT_STATUS[element],current=status??{},bonus=extraTurn?1:0
 if(!kind||(!force&&Math.random()>=STATUS_PROC_CHANCE))return{status:current}
 if(kind==='stunned')return{status:{...current,stunned:true},appliedKind:kind}
 if(kind==='frozen')return{status:{...current,frozen:2+bonus},appliedKind:kind}
 if(kind==='grabbed')return{status:{...current,grabbed:2+bonus},appliedKind:kind}
 if(kind==='blinded')return{status:{...current,blinded:1+bonus},appliedKind:kind}
 const existing=current[kind]
 if(kind==='bleed')return{status:{...current,bleed:{turns:2+bonus,amount:Math.max(1,(existing?.amount??0)+Math.round(attackPower*.18))}},appliedKind:kind}
 if(kind==='burn')return{status:{...current,burn:{turns:1+bonus,amount:Math.max(2,Math.round(attackPower*.38))}},appliedKind:kind}
 return{status:{...current,poison:{turns:3+bonus,amount:Math.max(1,Math.round(attackPower*.16))}},appliedKind:kind}
}
export function tickStatus(status?:StatusEffects):{status:StatusEffects;damage:number;messages:string[]}{
 const current:StatusEffects={...(status??{})},messages:string[]=[]
 let damage=0
 for(const kind of ['bleed','burn','poison'] as const){
  const effect=current[kind]
  if(!effect)continue
  damage+=effect.amount
  messages.push(`${STATUS_LABELS[kind]}: sofre ${effect.amount} de dano.`)
  if(effect.turns<=1)delete current[kind]
  else current[kind]={...effect,turns:effect.turns-1}
 }
 if(current.frozen!==undefined){if(current.frozen<=1)delete current.frozen;else current.frozen-=1}
 if(current.grabbed!==undefined){if(current.grabbed<=1)delete current.grabbed;else current.grabbed-=1}
 if(current.blinded!==undefined){if(current.blinded<=1)delete current.blinded;else current.blinded-=1}
 return{status:current,damage,messages}
}
export function consumeStun(status?:StatusEffects):{status:StatusEffects;wasStunned:boolean}{
 if(!status?.stunned)return{status:status??{},wasStunned:false}
 const rest={...status};delete rest.stunned
 return{status:rest,wasStunned:true}
}
function heroStunned(set:any,get:any):boolean{
 const s=get() as GameState
 if(!s.heroStatus?.stunned)return false
 const rest={...s.heroStatus};delete rest.stunned
 set({heroStatus:rest})
 addLog(set,'Você está atordoado e perde a ação neste turno.')
 enemyAfterDelay(set,get)
 return true
}
function applyDefeatPenalty(set:any,get:any,reason='Você foi derrotado.'){
 const s=get() as GameState
 // Bênção da Vida (Sacerdotisa): se o ward estiver armado, intercepta a derrota uma vez por
 // batalha em vez de encerrar o combate — sobrevive com 30% da vida máxima.
 if(s.heroId==='sacerdotisa'&&s.lifeWardActive){
  const revived=Math.max(1,Math.ceil(maxHp(s)*.3))
  set({hp:revived,lifeWardActive:false,animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,playerTurn:true})
  addLog(set,`Bênção da Vida protege você da derrota! Sobrevive com ${revived} de vida.`)
  return
 }
 // Pacto da Fênix (especialização de nível 75): ao contrário da Bênção da Vida (ativação manual
 // da Sacerdotisa via heroSkill), é passiva -- dispara sozinha na primeira derrota de cada combate.
 if(specializationBonuses(s).fenix&&!s.phoenixUsed){
  const revived=Math.max(1,Math.ceil(maxHp(s)*.2))
  set({hp:revived,phoenixUsed:true,animating:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,playerTurn:true})
  addLog(set,`Pacto da Fênix impede sua derrota! Sobrevive com ${revived} de vida.`)
  return
 }
 // A penalidade de derrota era sempre a mesma (30% do ouro + 20% de chance de perder um
 // equipamento), não importa quantas vezes seguidas o jogador já tivesse perdido pro MESMO
 // inimigo. Isso criava uma espiral sem saída: cada nova derrota deixava o personagem mais
 // fraco (menos ouro pra poções/loja, chance de perder o próprio equipamento), tornando a
 // PRÓXIMA tentativa ainda mais provável de falhar -- sem nenhum mecanismo de misericórdia.
 // Agora, a partir da 2ª derrota seguida contra o mesmo inimigo, a penalidade decresce (a
 // primeira derrota continua com a severidade de sempre), até parar de tirar equipamento e
 // de tirar mais que uma fração mínima do ouro -- dando espaço pra reagrupar em vez de
 // afundar cada vez mais na mesma parede.
 const defeatKey=s.enemy?enemyDisplayKey(s.enemy.nome):''
 const priorLosses=defeatKey&&defeatKey===s.lastDefeatKey?(s.consecutiveDefeats??0):0
 const goldLossPct=Math.max(.08,.3-priorLosses*.06)
 const equipmentLossChance=Math.max(0,.2-priorLosses*.07)
 const goldLost=Math.min(s.gold,Math.ceil(s.gold*goldLossPct))
 const eligible=(Object.entries(s.equipped) as [Slot,string][]).filter(([,id])=>Boolean(id))
 const lostEntry=eligible.length&&Math.random()<equipmentLossChance?eligible[Math.floor(Math.random()*eligible.length)]:undefined
 const equipped={...s.equipped}
 let equipmentBag=[...s.equipmentBag]
 const equipmentUpgrades={...s.equipmentUpgrades},equipmentGems={...s.equipmentGems},craftedEffects={...s.craftedEffects},forgedGemLocked={...s.forgedGemLocked},equipmentElements={...s.equipmentElements},equipmentResistances={...s.equipmentResistances}
 let itemMessage='Nenhum equipamento foi perdido.'
 if(lostEntry){
  const [slot,id]=lostEntry
  delete equipped[slot]
  const storedLost=slot==='bolsa'?[...equipmentBag]:[]
  if(slot==='bolsa')equipmentBag=[]
  const remainingEquipped=new Set(Object.values(equipped))
  for(const lostId of [id,...storedLost])if(!remainingEquipped.has(lostId)){delete equipmentUpgrades[lostId];delete equipmentGems[lostId];delete craftedEffects[lostId];delete forgedGemLocked[lostId];delete equipmentElements[lostId];delete equipmentResistances[lostId]}
  itemMessage=slot==='bolsa'
   ?`A bolsa ${eqById(id)?.nome??id} foi perdida com ${storedLost.length} equipamento${storedLost.length===1?'':'s'} armazenado${storedLost.length===1?'':'s'}. Os consumíveis foram preservados.`
   :`O equipamento ${eqById(id)?.nome??id} foi perdido, incluindo suas melhorias e encaixes.`
 }
 const recovered={...s,equipped,gold:s.gold-goldLost,hp:0} as GameState
 const recoveredHp=maxHp(recovered)
 const penalty=`Derrota: você perdeu ${goldLost} moedas de ouro. ${itemMessage} Após o resgate, sua vida foi restaurada para ${recoveredHp}/${recoveredHp}.`
 addLog(set,`${reason} ${penalty}`)
 // Derrota dentro de uma masmorra encerra a expedição (mesma regra de leaveDungeon) -- sem
 // isso, dungeonActive/dungeonDepth continuavam intactos e a próxima entrada na masmorra
 // retomava (e seguia aumentando) a partir da profundidade anterior, ficando mais difícil
 // mesmo depois de o jogador ter sido derrotado.
 set({screen:s.subregionId?'region':'map',subregionId:undefined,explorationNote:penalty,gold:s.gold-goldLost,equipped,equipmentBag,equipmentUpgrades,equipmentGems,forgedGemLocked,craftedEffects,equipmentElements,equipmentResistances,hp:recoveredHp,enemy:undefined,enemyHp:0,combatMinions:[],pendingAttackBonus:0,shield:0,braced:false,braceBonusUsed:false,fervor:0,firstStrikeBonus:0,classBuffTurns:0,summon:undefined,lifeWardActive:false,groupCriticalBoost:false,heroStatus:{},enemyStatus:{},combatRoll:undefined,fleeRoll:undefined,heroRollBonus:0,enemyRollBonus:0,enemyFearPenalty:0,animating:false,animationActor:undefined,lastDamage:undefined,playerTurn:false,dungeonActive:false,dungeonDepth:0,consecutiveDefeats:priorLosses+1,lastDefeatKey:defeatKey})
}
function playerAttack(set:any,get:any,label:string,bonus=0,alreadyAnimating=false,targetMinionId?:string,forceCrit=false,forceStatusElement?:Element){
 const s=get() as GameState
 if(!s.enemy||!s.playerTurn||s.animating&&!alreadyAnimating)return
 if(forceCrit&&(s.fervor??0)<3)return
 if(heroStunned(set,get))return
 const target=targetMinionId?(s.combatMinions??[]).find(m=>m.id===targetMinionId&&m.hp>0):undefined
 const forgedCrit=!forceCrit&&hasCraftedEffect(s,'critico_forjado')&&Math.random()<.05
 const enemyStun=target?{status:s.enemyStatus??{},wasStunned:false}:consumeStun(s.enemyStatus)
 const intent=enemyIntentFor(s.enemy,s.combatTurn)
 const spec=specializationBonuses(s),specCrit=!forceCrit&&Math.random()<spec.crit
 const attackBase=attackValue(s)+bonus+s.firstStrikeBonus+(!target&&s.enemy.boss?spec.bossDamage:0)+(!target&&s.talents.includes('cacador')&&s.enemy.boss?2:0)+(!target?bestiaryDamageBonus(s,s.enemy):0),defenseBase=target?0:enemyDefenseValue(s.enemy)+(intent.type==='guard'?2:0),naturalAttackRoll=forceCrit||forgedCrit||specCrit?6:Math.floor(Math.random()*6)+1,attackBonus=s.heroRollBonus+(s.classRollBonus??0)-rollPenaltyFrom(s.heroStatus),attackRoll=forceCrit||forgedCrit||specCrit?6:Math.max(1,Math.min(6,naturalAttackRoll+attackBonus+((hasCraftedEffect(s,'critico')||s.groupCriticalBoost)&&naturalAttackRoll===5?1:0))),defenseRoll=enemyStun.wasStunned?1:Math.max(1,Math.floor(Math.random()*6)+1-(s.enemyFearPenalty??0)-(target?0:rollPenaltyFrom(s.enemyStatus)))
 const critBonusPct=hasCraftedEffect(s,'dano_critico_bonus')?.1:0
 const {damage,selfDamage}=resolveCombatRoll(attackBase,defenseBase,attackRoll,defenseRoll,critBonusPct)
 const combatRoll:CombatRoll={attacker:'hero',naturalAttackRoll,attackRoll,attackBonus,defenseRoll,attackBase,defenseBase,attackEffect:attackEffect(attackRoll),defenseEffect:defenseEffect(defenseRoll),damage,selfDamage}
 const healProc=druidHealProc(s),healed=Math.random()<healProc.chance,forgedHeal=hasCraftedEffect(s,'cura_forjada')&&Math.random()<.05,curaBonusMult=1+(hasCraftedEffect(s,'cura_bonus')?.1:0),rawHeal=((healed?healProc.amount:0)+(forgedHeal?Math.max(2,Math.round(attackBase*.25)):0))*curaBonusMult,healAmount=rawHeal>0?Math.max(0,Math.min(Math.round(rawHeal),maxHp(s)-s.hp)):0
 const monkFervorProc=s.heroId==='monge'&&attackRoll===5&&Math.random()<.25
 const fervor=forceCrit?0:attackRoll===6||monkFervorProc?Math.min(3,(s.fervor??0)+1):(s.fervor??0)
 const statusResult=!target&&damage>0&&!selfDamage&&(Boolean(forceStatusElement)||naturalAttackRoll===6)?applyElementalStatus(enemyStun.status,forceStatusElement??heroWeaponElement(s),attackBase,Boolean(forceStatusElement),spec.elemental):{status:enemyStun.status,appliedKind:undefined as string|undefined}
 set({animating:true,playerTurn:false,animationActor:selfDamage?'enemy':'hero',lastDamage:selfDamage||damage,combatRoll,heroRollBonus:0,firstStrikeBonus:0,enemyRollBonus:attackRoll===2?1:s.enemyRollBonus,enemyStatus:statusResult.status,hp:healAmount>0?s.hp+healAmount:s.hp,fervor})
 if(healAmount>0)triggerSupportFx(set,get,'cura')
 const heroName=HEROES.find(h=>h.id===s.heroId)?.nome??'O herói',weaponName=eqById(s.equipped.mao_direita)?.nome,narration=`${heroApproachPhrase(s.heroId,weaponName)}, ${attackTierPhrase(attackRoll)}`
 const foeName=target?target.nome:s.enemy.nome
 const defenseNarration=selfDamage?'':` ${foeName} ${defenseTierPhrase(defenseRoll)}.`
 addLog(set,`${heroName} ${narration}.${defenseNarration} ${label}: dado ${attackRoll} (${attackEffect(attackRoll)}) contra defesa ${defenseRoll} (${defenseEffect(defenseRoll)}). ${selfDamage?`Recebeu ${selfDamage} de dano.`:`Causou ${damage} de dano${target?` a ${foeName}`:''}.`}${attackRoll===2?' Inimigo recebe +1 na próxima rolagem.':''}${healAmount>0?` A energia natural do equipamento pulsa e recupera ${healAmount} de vida.`:''}${enemyStun.wasStunned?` ${foeName} estava atordoado e não conseguiu se defender.`:''}${statusResult.appliedKind?` ${foeName} fica ${STATUS_LABELS[statusResult.appliedKind]}.`:''}`)
 setTimeout(()=>{
  const now=get() as GameState,en=now.enemy
  if(!en){set({animating:false,playerTurn:false,animationActor:undefined,lastDamage:undefined});return}
  if(selfDamage){const heroHp=Math.max(0,now.hp-selfDamage);set({hp:heroHp});if(heroHp<=0)setTimeout(()=>applyDefeatPenalty(set,get,'Você sucumbiu após uma falha crítica.'),900);else enemyAfterDelay(set,get);return}
  const grantsExtraTurn=now.extraHeroAttacks>0
  if(target){
   const nowMinions=(now.combatMinions??[]).map(m=>m.id===target.id?{...m,hp:Math.max(0,m.hp-damage)}:m),felled=nowMinions.find(m=>m.id===target.id)!.hp<=0
   addLog(set,`${target.nome}${felled?' foi derrotado.':' recuou, ferido.'}`)
   if(grantsExtraTurn){set({combatMinions:nowMinions,extraHeroAttacks:now.extraHeroAttacks-1,animating:false,playerTurn:true,animationActor:undefined,lastDamage:undefined,combatRoll:undefined});addLog(set,'Ataque Duplo: realize o segundo ataque.')}
   else{set({combatMinions:nowMinions});enemyAfterDelay(set,get)}
   return
  }
  const hp=now.enemyHp-damage
  if(en.boss&&en.maxFases&&hp>0){const threshold=en.vida*(1-(en.fase??1)/en.maxFases);if((en.fase??1)<en.maxFases&&hp<=threshold){const nf=(en.fase??1)+1,minions=summonBossMinions(en,nf);set({enemy:{...en,fase:nf,ataque:en.ataque+1},enemyHp:Math.max(hp,1),combatMinions:minions});addLog(set,`FASE ${nf}! ${en.nome} invocou ${minions.length} capanga${minions.length>1?'s':''}. Cada um terá seu próprio ataque.`);enemyAfterDelay(set,get);return}}
  if(hp<=0)victory(set,get);else if(grantsExtraTurn){set({enemyHp:hp,extraHeroAttacks:now.extraHeroAttacks-1,animating:false,playerTurn:true,animationActor:undefined,lastDamage:undefined,combatRoll:undefined});addLog(set,'Ataque Duplo: realize o segundo ataque.')}else{set({enemyHp:hp});enemyAfterDelay(set,get)}
 },COMBAT_ROLL_DISPLAY_MS)
}
function runEnemyAttack(set:any,get:any){const current=get() as GameState;if(!current.enemy){set({animating:false,playerTurn:false,animationActor:undefined,lastDamage:undefined});return}enemyAttack(set,get)}
function enemyAfterDelay(set:any,get:any){
 const s=get() as GameState
 const activeSummons=((s.heroSkillUses??0)>0?(s.summons?.length?s.summons:(s.summon?[s.summon]:[])):[]).filter(fera=>fera.hp>0).slice(0,2)
 if(activeSummons.length&&s.enemy){
  const en=s.enemy,nextSummons=[...activeSummons],summonAttackTypes:AttackAnimType[]=[];let enemyHp=s.enemyHp,heroHp=s.hp
  for(let index=0;index<nextSummons.length&&enemyHp>0;index++){
   const summon=nextSummons[index],attackBase=summon.ataque,defenseBase=enemyDefenseValue(en),attackRoll=Math.floor(Math.random()*6)+1,defenseRoll=Math.floor(Math.random()*6)+1,resolved=resolveCombatRoll(attackBase,defenseBase,attackRoll,defenseRoll)
   summonAttackTypes.push(SUMMON_ATTACK_ANIMATION[summon.tipo])
   if(resolved.selfDamage>0){const hp=Math.max(0,summon.hp-resolved.selfDamage),died=hp<=0;nextSummons[index]={...summon,hp};addLog(set,`${summon.nome} ataca, mas erra completamente e sofre ${resolved.selfDamage} de dano.${died?` ${summon.nome} caiu em combate.`:''}`)}
   else if(resolved.damage>0){enemyHp=Math.max(0,enemyHp-resolved.damage);const healAmount=Math.max(0,Math.min(1,maxHp(s)-heroHp));heroHp+=healAmount;addLog(set,`${summon.nome} ataca: dado ${attackRoll} (${attackEffect(attackRoll)}) contra defesa ${defenseRoll} (${defenseEffect(defenseRoll)}). Causou ${resolved.damage} de dano a ${en.nome}.${healAmount>0?' O vínculo recupera 1 de vida.':''}`)}
  }
  const survivors=nextSummons.filter(fera=>fera.hp>0);set({summons:survivors,summon:survivors[0],enemyHp,hp:heroHp,summonAttackFx:{types:summonAttackTypes,nonce:Date.now()},...(!survivors.some(fera=>fera.tipo==='arcano')?{combatAttackPct:0,combatDefensePct:0}:{})})
  if(enemyHp<=0){victory(set,get);return}
 }
 const tick=tickStatus(s.heroStatus)
 if(tick.damage>0){
  const hp=Math.max(0,s.hp-tick.damage)
  set({heroStatus:tick.status,hp})
  for(const m of tick.messages)addLog(set,`Você: ${m}`)
  if(hp<=0){setTimeout(()=>applyDefeatPenalty(set,get,'Você sucumbiu aos efeitos de status.'),600);return}
 }else if(Object.keys(tick.status).length!==Object.keys(s.heroStatus??{}).length)set({heroStatus:tick.status})
 if((s.classBuffTurns??0)>0){
  const turnsLeft=s.classBuffTurns-1
  if(turnsLeft<=0){
   const expired:any={classBuffTurns:0},label=s.heroId==='guerreiro'?'Ímpeto Marcial':s.heroId==='arcanista'?'Ascensão Arcana':s.heroId==='cacador'?'Marca do Predador':s.heroId==='guardiao'?'Provocar':undefined
   if(s.heroId==='guerreiro')Object.assign(expired,{combatAttackPct:0,combatDefensePct:0,enemyFearPenalty:0})
   else if(s.heroId==='arcanista')Object.assign(expired,{classRollBonus:0,combatAttackPct:0,combatDefensePct:0})
   else if(s.heroId==='cacador')Object.assign(expired,{groupCriticalBoost:false})
   else if(s.heroId==='guardiao')Object.assign(expired,{combatDefensePct:0})
   set(expired)
   if(label)addLog(set,`${label} se dissipou.`)
  }else set({classBuffTurns:turnsLeft})
 }
 const enemyId=(get() as GameState).enemy?.id;set({animating:true,playerTurn:false,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined});setTimeout(()=>runEnemyAttack(set,get),650);setTimeout(()=>{const stalled=get() as GameState;if(stalled.screen==='combat'&&stalled.enemy?.id===enemyId&&stalled.animating&&!stalled.playerTurn){set({animating:false,playerTurn:true,animationActor:undefined,lastDamage:undefined,combatRoll:undefined,fleeRoll:undefined});addLog(set,'Fluxo do combate recuperado. Seu turno continua.')}},COMBAT_ROLL_DISPLAY_MS+1800)
}
function resolveMinionAttacks(set:any,get:any,onComplete:()=>void){const start=get() as GameState,minions=(start.combatMinions??[]).filter(minion=>minion.hp>0);if(!minions.length){onComplete();return}let index=0;const strike=()=>{const s=get() as GameState,minion=minions[index++];if(!minion||s.screen!=='combat'||s.hp<=0){onComplete();return}const dodged=((s.heroId==='cacadora'||s.heroId==='cacador')&&Math.random()<.2),druidaLuck=s.heroId==='druida'&&Math.random()<.25,attackRoll=Math.max(1,Math.floor(Math.random()*6)+1-(s.enemyFearPenalty??0)-(druidaLuck?1:0)),defenseRoll=Math.floor(Math.random()*6)+1,defenseBase=defenseValue(s)+(s.braced?2:0),resolved=resolveCombatRoll(minion.ataque,defenseBase,attackRoll,defenseRoll),rawDamage=dodged?0:resolved.damage,blocked=Math.min(s.shield,rawDamage),damage=Math.max(0,rawDamage-blocked),hp=Math.max(0,s.hp-damage);set({hp,shield:s.shield-blocked,animationActor:'enemy',lastDamage:damage,combatRoll:{attacker:'enemy',naturalAttackRoll:attackRoll,attackRoll,attackBonus:0,defenseRoll,attackBase:minion.ataque,defenseBase,attackEffect:attackEffect(attackRoll),defenseEffect:defenseEffect(defenseRoll),damage,selfDamage:0}});addLog(set,dodged?`${minion.nome} atacou, mas você esquivou completamente.`:`${minion.nome} atacou e causou ${damage} de dano${blocked?` (${blocked} bloqueado)`:''}.`);if(hp<=0){setTimeout(()=>applyDefeatPenalty(set,get,'Você foi derrotado pelos capangas do chefe.'),700);return}if(index<minions.length)setTimeout(strike,500);else setTimeout(onComplete,450)};strike()}
function enemyAttack(set:any,get:any){
 const pre=get() as GameState
 if(!pre.enemy){set({animating:false,playerTurn:false,animationActor:undefined,lastDamage:undefined});return}
 const enemyStun=consumeStun(pre.enemyStatus)
 if(enemyStun.wasStunned){
  set({enemyStatus:enemyStun.status,animating:false,playerTurn:true,animationActor:undefined,lastDamage:undefined,combatRoll:undefined})
  addLog(set,`${pre.enemy.nome} está atordoado e perde a ação neste turno.`)
  return
 }
 const tick=tickStatus(pre.enemyStatus)
 if(tick.damage>0){
  const enemyHpTicked=Math.max(0,pre.enemyHp-tick.damage)
  set({enemyStatus:tick.status,enemyHp:enemyHpTicked})
  for(const m of tick.messages)addLog(set,`${pre.enemy.nome}: ${m}`)
  if(enemyHpTicked<=0){victory(set,get);return}
 }else if(Object.keys(tick.status).length!==Object.keys(pre.enemyStatus??{}).length)set({enemyStatus:tick.status})
 const s=get() as GameState
 if(!s.enemy){set({animating:false,playerTurn:false,animationActor:undefined,lastDamage:undefined});return}
 const enemy=s.enemy,intent=enemyIntentFor(enemy,s.combatTurn)
 if(intent.type==='summon'&&enemy.boss&&!(s.combatMinions??[]).some(m=>m.hp>0)){const reinforcements=summonBossMinions(enemy,enemy.fase??1);set({combatMinions:reinforcements});addLog(set,`${enemy.nome} convoca ${reinforcements.length} reforço${reinforcements.length>1?'s':''}.`)}
 if(intent.type==='recover'&&enemy.boss){const restored=Math.max(1,Math.ceil(enemy.vida*.08));set({enemyHp:Math.min(enemy.vida,s.enemyHp+restored)});addLog(set,`${enemy.nome} recupera ${restored} de vida antes de atacar.`)}
 const summons=((s.heroSkillUses??0)>0?(s.summons?.length?s.summons:(s.summon?[s.summon]:[])):[]).filter(fera=>fera.hp>0).slice(0,2)
 const summon=[...summons].sort((a,b)=>SUMMON_INTERCEPT_CHANCE[b.tipo]-SUMMON_INTERCEPT_CHANCE[a.tipo]).find(fera=>Math.random()<SUMMON_INTERCEPT_CHANCE[fera.tipo])
 const intercepting=Boolean(summon)
 const attackBase=Math.ceil(enemy.ataque*(intent.type==='heavy'?1.35:1)),defenseBase=intercepting?summon!.defesa:defenseValue(s)+(s.braced?2:0),naturalAttackRoll=Math.floor(Math.random()*6)+1,attackBonus=s.enemyRollBonus-rollPenaltyFrom(s.enemyStatus),attackRoll=Math.max(1,Math.min(6,naturalAttackRoll+attackBonus-(s.heroId==='druida'&&Math.random()<.25?1:0)-(s.enemyFearPenalty??0))),naturalDefenseRoll=Math.floor(Math.random()*6)+1,defenseRoll=intercepting?Math.max(1,naturalDefenseRoll):Math.max(1,Math.min(6,naturalDefenseRoll+(s.classRollBonus??0)+(hasCraftedEffect(s,'defesa_perfeita')&&naturalDefenseRoll===5?1:0)-rollPenaltyFrom(s.heroStatus)))
 const dodged=!intercepting&&(((s.heroId==='cacadora'||s.heroId==='cacador')&&Math.random()<.2)||(hasCraftedEffect(s,'esquiva_forjada')&&Math.random()<.05)),resolved=resolveCombatRoll(attackBase,defenseBase,attackRoll,defenseRoll);let raw=dodged?0:resolved.damage,shield=s.shield
 const enemyElement=enemy.elemento??'fisico',resisted=!intercepting&&heroHasResistance(s,enemyElement)
 if(resisted&&raw>0)raw=Math.max(0,raw-1)
 const blocked=intercepting?0:Math.min(shield,raw),enemyName=enemy.nome,enemyApproach=enemyApproachPhrase(enemy),heroName=HEROES.find(h=>h.id===s.heroId)?.nome??'Você';raw-=blocked;if(!intercepting)shield-=blocked
 const statusResult=!intercepting&&!dodged&&!resolved.selfDamage&&raw>0&&!resisted&&(naturalAttackRoll===6||intent.type==='status')?applyElementalStatus(s.heroStatus,enemyElement,attackBase,intent.type==='status'):{status:s.heroStatus??{},appliedKind:undefined as string|undefined}
 const priestDefenseHeal=!intercepting&&!resolved.selfDamage&&s.heroId==='sacerdotisa'&&defenseRoll>=5&&Math.random()<.2?1:0
 const summonDamage=intercepting?raw:0,summonHpAfter=intercepting?Math.max(0,summon!.hp-summonDamage):0,summonDied=intercepting&&summonHpAfter<=0
 const hp=intercepting?s.hp:Math.min(maxHp(s),Math.max(0,s.hp-raw)+priestDefenseHeal),enemyHp=Math.max(0,s.enemyHp-resolved.selfDamage)
 const combatRoll:CombatRoll={attacker:'enemy',naturalAttackRoll,attackRoll,attackBonus,defenseRoll,attackBase,defenseBase,attackEffect:attackEffect(attackRoll),defenseEffect:defenseEffect(defenseRoll),damage:raw,selfDamage:resolved.selfDamage,shieldBlocked:blocked}
 const summonsAfter=intercepting?summons.map(fera=>fera===summon?{...fera,hp:summonHpAfter}:fera).filter(fera=>fera.hp>0):summons
 set({shield,animating:true,animationActor:resolved.selfDamage?'hero':'enemy',lastDamage:resolved.selfDamage||raw,combatRoll,playerTurn:false,enemyRollBonus:0,heroRollBonus:attackRoll===2?1:s.heroRollBonus,heroStatus:statusResult.status,fervor:defenseRoll===6?Math.min(3,(s.fervor??0)+1):(s.fervor??0),...(intercepting?{summons:summonsAfter,summon:summonsAfter[0],...(!summonsAfter.some(fera=>fera.tipo==='arcano')?{combatAttackPct:0,combatDefensePct:0}:{})}:{})})
 setTimeout(()=>{
  const current=get() as GameState
  if(current.screen!=='combat'||!current.enemy)return
  if(resolved.selfDamage){addLog(set,`${enemyName} ${enemyApproach}, ${attackTierPhrase(attackRoll)}, sofrendo ${resolved.selfDamage} de dano do próprio golpe.`);if(enemyHp<=0){victory(set,get);return}set({enemyHp,hp,animating:false,animationActor:undefined,combatRoll:undefined});resolveMinionAttacks(set,get,()=>{const latest=get() as GameState;if(latest.screen==='combat')set({playerTurn:true,combatTurn:latest.combatTurn+1})});return}
  set({hp,animationActor:undefined,combatRoll:undefined,playerTurn:false})
  if(intercepting)addLog(set,`${enemyName} ${enemyApproach}, ${attackTierPhrase(attackRoll)}, mas ${summon!.nome} intercepta o golpe! Dado ${attackRoll} (${attackEffect(attackRoll)}) contra defesa ${defenseRoll} (${defenseEffect(defenseRoll)}); a fera sofre ${summonDamage} de dano${summonDied?' e cai em combate!':'.'}`)
  else addLog(set,dodged?`${enemyName} ${enemyApproach}, mas a Esquiva do Ladino faz o golpe errar completamente.`:`${enemyName} ${enemyApproach}, ${attackTierPhrase(attackRoll)}. ${heroName} ${defenseTierPhrase(defenseRoll)}. Dado ${attackRoll} (${attackEffect(attackRoll)}) contra defesa ${defenseRoll} (${defenseEffect(defenseRoll)}); causou ${raw} de dano${blocked?` (${blocked} bloqueado)`:''}${resisted?' (resistência elemental reduziu o dano)':''}.${attackRoll===2?' Você recebe +1 na próxima rolagem.':''}${statusResult.appliedKind?` Você fica ${STATUS_LABELS[statusResult.appliedKind]}.`:''}${priestDefenseHeal?' A fé da Sacerdotisa recupera 1 de vida.':''}`)
  if(hp<=0){setTimeout(()=>applyDefeatPenalty(set,get),900);return}resolveMinionAttacks(set,get,()=>{const latest=get() as GameState;if(latest.screen==='combat')set({animating:false,animationActor:undefined,lastDamage:undefined,playerTurn:true,combatTurn:latest.combatTurn+1})})
 },COMBAT_ROLL_DISPLAY_MS)
}
function victory(set:any,get:any){const s=get() as GameState,en=s.enemy!;
// Um combate de masmorra "aponta" para dungeonSubregionId (o alvo escolhido no Painel de
// Masmorras), não para subregionId (a última sub-região visitada no mapa) -- os dois podem
// divergir livremente (ex.: trocar de aba com uma expedição escolhida mas ainda não iniciada).
// Sem isso, vitórias/chefe/material de masmorra eram creditados à sub-região/região erradas.
const encounterSubId=en.dungeon?s.dungeonSubregionId:s.subregionId;const encounterSub=SUBREGIONS.find(x=>x.id===encounterSubId);const encounterRegionId=encounterSub?.regionId??s.regionId;
// 'fortuna' (especialização) some ouro E materiais; os bônus de história (storyModifiers().reward)
// só descrevem ouro -- nenhum dos dois estava sendo somado em lugar nenhum antes desta correção.
const spec=specializationBonuses(s),rewardGoldBonus=storyModifiers(s).reward+spec.reward
const gold=Math.round(en.ouro*(1+rewardGoldBonus));const before=deriveLevel(s.xp).lvl;const xp=s.xp+(en.xpReward??0);const after=deriveLevel(xp).lvl;const points=s.attributePoints+Math.max(0,after-before);const key=encounterSubId??s.territory;const victories={...s.victories,[s.territory]:(s.victories[s.territory]??0)+1};const subregionVictories={...s.subregionVictories,[key]:(s.subregionVictories[key]??0)+1};let bosses=[...s.bossesDefeated],subBosses=[...s.subregionBossesDefeated];if(en.boss){if(!bosses.includes(String(en.dificuldade)))bosses.push(String(en.dificuldade));
// Um "chefe" de masmorra (a cada 5º andar) só credita o chefe REAL da sub-região -- liberando
// o ✓ no Mapa e o Salão da Vingança -- se a exploração normal dessa sub-região (encontrosNecessarios)
// já tiver sido cumprida; senão vira só um andar mais difícil, sem marcar nada como "derrotado".
const bossGateMet=!en.dungeon||(s.subregionVictories[encounterSubId??'']??0)>=(encounterSub?.encontrosNecessarios??Infinity)
if(bossGateMet&&encounterSubId&&!subBosses.includes(encounterSubId))subBosses.push(encounterSubId)}const enemyName=en.nome.toLocaleLowerCase('pt-BR'),regionDifficulty=TERRITORIES.find(t=>t.id===encounterRegionId)?.dificuldade??0,guildProgress={...s.guildProgress};for(const id of s.guildAccepted){if(s.guildClaimed.includes(id))continue;const mission=guildMissionById(id);if(!mission)continue;const matches=mission.tipo==='any'||(mission.tipo==='boss'&&Boolean(en.boss)&&(!mission.alvo||enemyName.includes(mission.alvo))&&(!mission.regiaoMinima||regionDifficulty>=mission.regiaoMinima))||(mission.tipo==='specific'&&Boolean(mission.alvo)&&enemyName.includes(mission.alvo!));if(matches)guildProgress[id]=Math.min(mission.quantidade,(guildProgress[id]??0)+1)}let equipmentBag=[...s.equipmentBag],inventory={...s.inventory};let equipmentId:string|undefined,equipmentRef:string|undefined,itemId:string|undefined,missedEquipmentId:string|undefined
// O tipo do espólio (equipamento OU consumível) é sorteado antes de checar se a bolsa tem
// espaço -- antes, bolsa cheia trocava silenciosamente um sorteio de equipamento por um
// consumível qualquer, então o jogador nunca sabia que "ganhou" um item e o perdeu por falta
// de espaço. Agora, ao sortear equipamento com a bolsa cheia, nenhum consumível substituto é
// dado: o loot registra qual equipamento foi perdido e por quê.
const lootChanceBonus=storyModifiers(s).drop+specializationBonuses(s).loot+(hasCraftedEffect(s,'sorte')?.15:0),lootQualityBoost=hasCraftedEffect(s,'sorte')
if(Math.random()<monsterDropChance(en,lootChanceBonus)){const equipmentPool=equipmentLootPool(en,s.heroId,after),consumablePool=consumableLootPool(en);const rollsEquipment=Math.random()<.62&&equipmentPool.length>0;if(rollsEquipment){const e=pickWeightedEquipment(equipmentPool,lootQualityBoost)!;if(equipmentBag.length<equipmentBagCapacity(s)){equipmentRef=createEquipmentInstance(e.id);equipmentBag.push(equipmentRef);equipmentId=e.id}else missedEquipmentId=e.id}else if(consumablePool.length){const i=consumablePool[Math.floor(Math.random()*consumablePool.length)];inventory[i.id]=(inventory[i.id]??0)+1;itemId=i.id}}const baseName=enemyDisplayKey(en.nome);const record=s.bestiary[baseName]??{encontros:1,vitorias:0},material=REGION_MATERIALS[encounterRegionId]??REGION_MATERIALS.campos_dourados,materialQty=Math.round((en.boss?3:en.elite?2:1)*(1+spec.reward));const materials={...s.materials,[material.id]:(s.materials[material.id]??0)+materialQty};const revengeWins=en.revenge&&encounterSubId?{...s.revengeWins,[encounterSubId]:(s.revengeWins[encounterSubId]??0)+1}:s.revengeWins;
const discoveredCards=[...(s.discoveredCards??[])];if(equipmentId&&!discoveredCards.includes(`equipment:${equipmentId}`))discoveredCards.push(`equipment:${equipmentId}`);if(itemId&&!discoveredCards.includes(`consumable:${itemId}`))discoveredCards.push(`consumable:${itemId}`)
// Elemento/resistência em espólio só podem acontecer quando um CHEFE derruba o item — mesmo
// assim, metade dos drops de chefe continua "normal", igual ao que a loja vende. Monstros e
// elites comuns nunca soltam equipamento com essas propriedades.
let equipmentElements=s.equipmentElements,equipmentResistances=s.equipmentResistances
if(equipmentRef&&en.boss&&Math.random()<.5){const dropped=eqById(equipmentRef);if(dropped)if(dropped.slot==='mao_direita')equipmentElements={...s.equipmentElements,[equipmentRef]:material.elemento};else equipmentResistances={...s.equipmentResistances,[equipmentRef]:material.elemento}}
set({gold:s.gold+gold,xp,attributePoints:points,victories,subregionVictories,bossesDefeated:bosses,subregionBossesDefeated:subBosses,guildProgress,equipmentBag,inventory,materials,revengeWins,discoveredCards,equipmentElements,equipmentResistances,bestiary:{...s.bestiary,[baseName]:{...record,vitorias:record.vitorias+1}},consecutiveDefeats:0,lastDefeatKey:undefined,screen:'loot',enemy:undefined,enemyHp:0,animating:false,animationActor:undefined,lastDamage:undefined,playerTurn:false,pendingAttackBonus:0,shield:0,activePotionIds:[],loot:{gold,xp:en.xpReward??0,itemId,equipmentId,missedEquipmentId,title:en.revenge?'VINGANÇA CONCLUÍDA':en.boss?'CHEFE DERROTADO':en.variante==='Campeão'?'CAMPEÃO DERROTADO':'VITÓRIA'}})}
