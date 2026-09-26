import React from 'react'
import ReactDOM from 'react-dom/client'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Heart, LayoutDashboard, Map, ScrollText, Backpack, Shield, ShieldHalf, ShoppingBag, ShoppingCart, Trash2, Images, BookOpen, History, ChevronDown, Users, Wifi, WifiOff, Copy, LogOut, Menu, Sword, Sparkles, Zap, Coins, Trophy, Skull, Package, Plus, Minus, ArrowLeft, ArrowRight, ArrowLeftRight, FlaskConical, Footprints, Dices, Wand2, Upload, ImageOff, ZoomIn, Mail, Lock, Unlock, Search, ArrowUpDown, KeyRound, Plane, CheckCircle2, XCircle, Gem, UserRound, Quote, Bell, Volume2, VolumeX, X, Contrast, Swords, Leaf, Target, Flame, HeartPulse, Ghost, Scale } from 'lucide-react'
import { TileWorldExplorer, getRegionMap, ALL_MONOLITHS, REGION_UI_THEME } from './regionMap'
import { useGame, currentBlessingPrice, isNavigationLocked, equipmentByRef, equipmentBaseId, HEROES, EQUIPMENT, CONSUMABLES, MONSTERS, TERRITORIES, SUBREGIONS, BOSSES, EVENTS, GUILD_MISSIONS, GUILD_RANKS, guildRankFor, availableGuildMissions, guildMissionById, SLOT_ORDER, maxHp, attackValue, defenseValue, armorValue, championStats, energyNow, fervorEnergyCost, heroDodgeChance, heroElementalResistance, heroEffectResistance, heroAbilityPotency, heroSkillEnergyCost, HERO_CLASS_NAMES, levelInfo, regionListSort, canFastTravelToRegion, equipmentAffinity, equipmentAttackForHero, equipmentCompatibility, equipmentClassAllowed, equipmentRequiredLevel, equipmentLevelAllowed, equipmentBagCapacity, equipmentWeaponClass, storyRequirementProgress, equipmentSocketCount, dismantlePreview, forgeLevelInfo, forgeRecipeLevel, forgeSuccessChance, worldUnlocked, heroWeaponAnimationType, enemyWeaponAnimationType, enemyIntentFor, enemyDefenseValue, druidHealProc, hasCraftedEffect, equipmentSetCounts, FORGE_RECIPES, LIFE_CHANCE, heroWeaponElement, heroResistances, attunementItemLevel, attunementResistanceReduction, attunementStatusChance, equipmentStatBonus, STATUS_LABELS, consumableEffectiveValue, consumableDescription, equipmentGemBonus, equipmentUpgradeCost, itemSkillEffectText, TOUR_STEPS, FORGE_SACRIFICE, RARITY_LABEL, forgeSacrificeOwned, SUMMON_ATTACK_ANIMATION, enemyDisplayKey, storyModifiers, specializationBonuses, equipmentInstanceBreakdown, equipmentUpgradeMaterialCost, UPGRADE_SUCCESS_CHANCE, HERO_ULTIMATES, ultimateEffects, STANCE_LABELS, type AttackAnimType, type BattleStance, type Summon, type SummonType, type GuildRankId, ACHIEVEMENTS, unlockedAchievements } from './store/game'
import type { Slot, Rarity, Subregion, GameEvent, Equipment, Territory } from './types'
import { BESTIARY_MILESTONES, CLASS_IDENTITIES, DIFFICULTIES, ELEMENTS, ELEMENT_ADVANTAGES, FORGE_BONUS_LABELS, FORGE_BONUS_MATERIAL, FORGE_GEMS, FORGE_MATERIALS, REGION_MATERIALS, SET_BONUSES, SPECIALIZATION_CHOICES, STATUS_INFO, STORY_CHAPTERS, SUBREGION_THEME_MATERIALS, TALENTS, HERO_SUBCLASSES, activeChallenges, type DifficultyMode, type Element as GameElement, type ForgeAttribute, type ForgeBonus, type ForgeChoice } from './data/expansion'
import { FORGE_CATEGORY_LABELS, FORGE_CATEGORY_ORDER, forgeCategory } from './data/forgeRecipes'
import { MAX_PROTECTION_BLESSINGS, VAULT_SLOTS_PER_UPGRADE, vaultCapacity, vaultUpgradePrice } from './store/guildVault'
import { crystalsLabel } from './data/crystals'
import { useUiMode, toggleUiMode, getUiMode } from './ui/uiMode'
import { ModernNav } from './ui/ModernNav'
import { MODERN_ONLY_SCREEN_LABELS } from './ui/navGroups'
import { CampScreen } from './ui/CampScreen'
import { HeroSelectModern } from './ui/HeroSelectModern'
import { ChampionCard, ChampionDetailsDialog } from './ui/ChampionCard'
import { HeroKitSummary } from './ui/HeroKitSummary'
import { championCardForActiveHero, championCardForKit } from './ui/championCardSources'
import { formatNumber as formatStatNumber, percentText } from './ui/championCardData'
import { gainEnergy } from './store/heroStats'
import { ATTRIBUTE_HINTS, ATTRIBUTE_LABELS, ATTRIBUTE_RULES, PRIMARY_ATTRIBUTES, heroStatProfile, offenseLabel, offenseShort, type PrimaryAttributeKey } from './data/heroStatProfiles'
import { CombatForecast } from './ui/CombatForecast'
import { BossIntroModern } from './ui/BossIntroModern'
import { VictoryModern } from './ui/VictoryModern'
import { ForgeCatalogModern } from './ui/ForgeCatalogModern'
import { PaperdollModern } from './ui/PaperdollModern'
import { SectionPanel, SectionTabs } from './ui/SectionTabs'
import { previewEnemyAttack, previewHeroAttack } from './store/combatPreview'
import { coopAttackInputs, previewCoopEnemyAttack, previewCoopHeroAttack } from './online/coopPreview'
import { coopRewardShare, coopShareTable } from './online/coopMath'
import { npcsForRegion, npcById, type NpcDefinition } from './data/npcs'
import { STORY_QUESTS, questById, questsOfferedByNpc, questsDeliverableToNpc, type StoryQuest } from './data/storyQuests'
import { onlineConfigured } from './online/supabase'
import { CoopProvider, useCoop, type MarketListing } from './online/CoopContext'
import { selectCoopAutoSummonType, shouldUseCoopAutoHeroSkill } from './online/coopAutoCombat'
import { selectAutoItemSkill } from './autoCombat'
import { playSfx, isAudioMuted, setAudioMuted, type SfxId } from './audio'
import { AuthProvider, useAuth } from './online/AuthContext'
import PersistentCoopScreen, { CoopEmoteBar, CoopEmoteToast } from './online/CoopScreen'
import './styles.css'
import { BattleSpriteActor } from './components/BattleSpriteActor'
import { resolveFighterAnimationState, normalizeEnemySpriteId, preloadBattleSpriteImages, type BattleViewMode } from './battleSprites'

gsap.registerPlugin(useGSAP)
// O tremor de crítico, o brilho holográfico e o tilt 3D das cartas só respeitavam
// prefers-reduced-motion (a preferência do sistema operacional) -- sem nenhuma forma de o
// jogador desligar os efeitos manualmente caso o navegador/SO não exponha essa opção, ou caso
// prefira sons/estática mas ainda queira menos agitação visual. effectsReduced() combina as
// duas fontes; o toggle "Reduzir efeitos visuais" no menu superior grava a preferência manual.
const REDUCE_EFFECTS_KEY='bangalores_reduce_effects'
function getReduceEffectsPref():boolean{try{return localStorage.getItem(REDUCE_EFFECTS_KEY)==='1'}catch{return false}}
function setReduceEffectsPref(value:boolean){try{localStorage.setItem(REDUCE_EFFECTS_KEY,value?'1':'0')}catch{}}
const HIGH_CONTRAST_KEY='bangalores_high_contrast'
function getHighContrastPref():boolean{try{return localStorage.getItem(HIGH_CONTRAST_KEY)==='1'}catch{return false}}
function setHighContrastPref(value:boolean){try{localStorage.setItem(HIGH_CONTRAST_KEY,value?'1':'0')}catch{}}
function effectsReduced():boolean{return getReduceEffectsPref()||(typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)}
// Números que sobem/descem (ouro, XP) trocavam de valor num salto seco -- sem nenhuma
// transição, o "cha-ching" de uma recompensa passava despercebido. Conta do valor anterior
// até o novo via GSAP em vez de re-renderizar dígito a dígito (mais barato e sem jank do que
// animar via React state a cada frame). Ignorado por completo sob prefers-reduced-motion.
function AnimatedNumber({value,duration=.8}:{value:number;duration?:number}){
 const ref=React.useRef<HTMLSpanElement>(null)
 const shown=React.useRef(value)
 useGSAP(()=>{
  const el=ref.current
  if(!el)return
  if(effectsReduced()){el.textContent=String(value);shown.current=value;return}
  const counter={n:shown.current}
  gsap.to(counter,{n:value,duration,ease:'power2.out',onUpdate:()=>{el.textContent=String(Math.round(counter.n))}})
  shown.current=value
 },[value])
 return <span ref={ref}>{shown.current}</span>
}

const ATTACK_SFX:Record<AttackAnimType,SfxId>={corte:'atkCorte',facas:'atkFacas',martelo:'atkMartelo',magico:'atkMagico',furo:'atkDisparo',garras:'atkGarras',espinhos:'atkEspinhos'}

const nav=[['map','Mapa',Map],['character','Ficha',ScrollText],['inventory','Mochila',Backpack],['equipment','Equipamentos',Shield],['shop','Loja',ShoppingBag],['forge','Forja',Wand2],['guild','Guilda',Trophy],['chronicle','Crônicas',History],['gallery','Coleção',Images],['coop','Coop',Users],['tutorial','Tutorial',BookOpen]] as const
// Telas que o topo Moderno alcança hoje (o Acampamento entra quando a tela 'camp' existir) e o
// rótulo de cada uma, reaproveitados da lista plana do modo Clássico.
const MODERN_AVAILABLE_SCREENS:ReadonlySet<string>=new Set<string>([...nav.map(([id])=>id),'camp'])
// No modo Moderno, continuar/carregar uma campanha que estava no mapa aterrissa no Acampamento (o
// hub). Telas que precisam ser retomadas de verdade (combate, evento, saque) nunca são puladas.
function landOnCampIfModern(){if(getUiMode()==='modern'&&useGame.getState().screen==='map')useGame.getState().setScreen('camp')}
const navLabel=(screen:string)=>nav.find(([id])=>id===screen)?.[1]??MODERN_ONLY_SCREEN_LABELS[screen]??screen
const slotNames:Record<Slot,string>={amuleto:'Amuleto',capacete:'Capacete',bolsa:'Bolsa',anel_1:'Anel 1',peitoral:'Peitoral',anel_2:'Anel 2',calcas:'Calças',mao_esquerda:'Mão esquerda',mao_direita:'Mão direita',botas:'Botas'}
const classNames:Record<string,string>=HERO_CLASS_NAMES
// O antigo "Ataque" de equipamento e talento vira o atributo ofensivo da classe: Força, Magia ou os dois (híbrido).
const activeHeroId=()=>useGame.getState().heroId
// classeExclusiva pode ser uma classe só ou uma lista (conjuntos compartilhados) — normaliza
// pra um rótulo único de exibição, unindo os nomes quando o item é compartilhado.
function classOwnerLabel(owner?:string|string[]):string{if(!owner)return'Universal';const list=Array.isArray(owner)?owner:[owner];return list.map(id=>classNames[id]??id).join(' / ')}
const heroSkillNames:Record<string,string>={guerreiro:'Ímpeto Marcial',guardiao:'Provocar',cacadora:'Ataque Duplo',arcanista:'Ascensão Arcana',druida:'Brisa Revigorante',cacador:'Marca do Predador',monge:'Golpe Flamejante',sacerdotisa:'Bênção da Vida',conjurador:'Conjurar Fera Espectral'}
// Ícone por classe pro selo de nível do HUD (antes era uma estrela genérica pra todo mundo) --
// cada um remete à identidade da classe (espada do guerreiro, lâminas duplas da caçadora, etc).
const heroClassIcons:Record<string,typeof Sword>={guerreiro:Sword,cacadora:Swords,arcanista:Wand2,guardiao:Shield,druida:Leaf,cacador:Target,monge:Flame,sacerdotisa:HeartPulse,conjurador:Ghost}
// O texto de habilidade dos heróis já é escrito no formato "Passivo: ... Ativo: ...", mas
// aparecia como um parágrafo único na Ficha, difícil de separar rapidamente na leitura. Alguns
// heróis (Guardião, Arcanista) não têm trecho de Passivo, então o grupo é opcional no regex.
function heroAbilityParts(text:string):{passivo?:string;ativo:string}{
 const m=text.match(/^(?:Passivo:\s*(.*?)\s*)?Ativo\s*[:—]\s*(.*)$/s)
 if(!m)return{ativo:text}
 return{passivo:m[1]||undefined,ativo:m[2]}
}
// Themed card frames per region, matching each region's lore (lava/volcano -> fire, undead catacombs -> death, etc).
// Regions left out (campos_dourados, trilhouro) keep the default gold frame-overlay.png.
const CATEGORY_FRAME:Record<string,string>={CHEFE:'red',ELITE:'purple',INIMIGO:'green'}
// Paleta de interface acompanha a região ativa sem alterar as regras de jogo.
// O dourado continua sendo o fallback para o menu e regiões sem uma identidade própria.
// (REGION_UI_THEME agora vive em regionMap.tsx -- ver comentário lá.)
const ELEMENT_LABELS:Record<string,string>={fisico:'Físico',fogo:'Fogo',gelo:'Gelo',natureza:'Natureza',sombra:'Sombra',luz:'Luz',arcano:'Arcano'}
// Elemento (arma) e resistência (demais slots) só existem em itens forjados com sucesso ou
// obtidos de chefes — a loja nunca atribui essas propriedades, então a nota só aparece
// quando o id específico deste item ganhou o atributo (equipmentElements/equipmentResistances).
// Duração real de cada condição (ver applyElementalStatus em store/game.ts, que é quem define
// os valores de fato): NÃO é uniforme -- este texto dizia "todas duram exatamente 1 turno" pra
// toda condição, mas só Pegando fogo e Cego realmente duram 1; Sangrando/Congelado/Agarrado
// duram 2 e Envenenado dura 3 (a especialização Domínio Elemental soma +1 turno a todas quando
// o herói é quem aplica). O tooltip do badge de status em combate mostrava esse "1 turno" errado
// pra 4 das 7 condições -- alinhado agora com STATUS_INFO (data/expansion.ts), que sempre esteve
// correto.
const STATUS_DURATION_NOTE:Record<string,string>={bleed:'Sangrando: dano a cada turno, dura 2 turnos (a especialização Domínio Elemental soma +1).',burn:'Pegando fogo: dano único, dura 1 turno.',poison:'Envenenado: dano a cada turno, dura 3 turnos (a especialização Domínio Elemental soma +1).',frozen:'Congelado: penaliza rolagens de ataque e defesa, dura 2 turnos (a especialização Domínio Elemental soma +1).',grabbed:'Agarrado: penaliza rolagens de ataque e defesa, dura 2 turnos (a especialização Domínio Elemental soma +1).',blinded:'Cego: penaliza rolagens de ataque e defesa, dura 1 turno.',stunned:'Atordoado: cancela a próxima defesa ou ação (uso único, some após isso).'}
const STATUS_TOOLTIP_COPY:Record<string,{name:string;element:string;effect:string}>={bleed:{name:'Sangrando',element:'Físico',effect:'Sofre dano no fim do turno. Reaplicações aumentam o dano acumulado.'},burn:{name:'Pegando fogo',element:'Fogo',effect:'Sofre uma explosão curta de dano no próximo ciclo de status.'},poison:{name:'Envenenado',element:'Natureza',effect:'Sofre dano leve por vários turnos, pressionando combates longos.'},frozen:{name:'Congelado',element:'Gelo',effect:'Recebe penalidade nas rolagens de ataque e defesa enquanto durar.'},grabbed:{name:'Agarrado',element:'Sombra',effect:'Recebe penalidade nas rolagens de ataque e defesa enquanto durar.'},blinded:{name:'Cego',element:'Luz',effect:'Recebe penalidade nas rolagens por um curto período.'},stunned:{name:'Atordoado',element:'Arcano',effect:'Perde a próxima ação ou defesa; some quando é consumido.'},fear:{name:'Medo',element:'Habilidade',effect:'Sofre -1 nas rolagens enquanto o efeito de intimidação estiver ativo.'}}
const statusLabel=(kind:string)=>STATUS_TOOLTIP_COPY[kind]?.name??STATUS_LABELS[kind as keyof typeof STATUS_LABELS]??kind
function elementalNote(g:{equipmentElements:Record<string,string>;equipmentResistances:Record<string,string>;equipmentUpgrades:Record<string,number>;xp:number},id:string){
 const e=equipmentByRef(id)
 if(!e)return''
 const level=attunementItemLevel(g as any,id),element=g.equipmentElements[id],res=g.equipmentResistances[id]
 if(element)return ` • Elemento: ${ELEMENT_LABELS[element]} (${Math.round(attunementStatusChance(g as any,id)*100)}% de condição em críticos, nível ${level})`
 if(res)return ` • Resistência: ${ELEMENT_LABELS[res]} (-${attunementResistanceReduction(g as any,id)} dano elemental, nível ${level})`
 return''
}
// Pedras instaladas numa peça específica não apareciam em lugar nenhum fora da Forja -- o
// jogador via os atributos "de fábrica" do item em toda outra tela (Equipamentos, Mochila) e
// não tinha como saber, só olhando a peça, que ela tinha um bônus forjado/socketado.
function gemNote(itemId:string|undefined,g:{equipmentGems:Record<string,string[]>}){const ids=itemId?g.equipmentGems[itemId]??[]:[];if(!ids.length)return''
 const names=ids.map(gemId=>FORGE_GEMS.find(x=>x.id===gemId)?.texto).filter(Boolean)
 return names.length?` • Pedra${names.length>1?'s':''}: ${names.join(', ')}`:''
}
// As 5 receitas curadas (facas_gemeas, lamina_sentinela, manto_cinzas, foice_colheitas,
// amuleto_dragao) concedem um efeito próprio (crítico/defesa perfeita/sorte) só disponível
// fabricando aquela peça específica -- os outros 5 (FORGE_BONUS_LABELS) vêm do refino de
// atributo/bônus, disponível em qualquer peça incomum+ cuja receita tenha attributeChoice.
const CURATED_EFFECT_LABELS:Record<string,string>={critico:'Rolagens 5 também causam crítico',defesa_perfeita:'Defesas com rolagem 5 tornam-se perfeitas',sorte:'Mais chance e qualidade de espólio'}
const CRAFTED_EFFECT_LABELS:Record<string,string>={...FORGE_BONUS_LABELS,...CURATED_EFFECT_LABELS}
// O efeito especial forjado (crítico, esquiva, cura...) não aparecia em nenhuma tela fora da
// Forja -- igual ao problema que gemNote já resolvia para pedras, mas para o efeito único que
// craftEquipment aplica em craftedEffects.
function craftedEffectNote(itemId:string|undefined,g:{craftedEffects:Record<string,string>}){const effect=itemId?g.craftedEffects[itemId]:undefined;if(!effect)return''
 return ` • Efeito forjado: ${CRAFTED_EFFECT_LABELS[effect]??effect}`
}
function compatibilityLabel(e:any,heroId?:string){if(e.slot==='bolsa')return`Universal • Capacidade: ${e.capacidade??8} espaços`;if(e.classeExclusiva)return equipmentClassAllowed(e,heroId)?`Exclusivo: ${classOwnerLabel(e.classeExclusiva)} • compatível`:`Exclusivo para ${classOwnerLabel(e.classeExclusiva)}`;const c=equipmentCompatibility(e,heroId);if(!c.affinity)return'Arma neutra • sem penalidade de classe';return c.compatible?`Afinidade: ${classNames[c.affinity]} • bônus completo`:`Afinidade: ${classNames[c.affinity]} • penalidade: -${c.penalty} ATQ`}
// Explica, pra UM atributo de UMA peça, quanto vem dos atributos normais do item (catálogo +
// afinidade de classe + statsByClass), quanto do aprimoramento pago na Forja (equipmentUpgrades)
// e quanto de pedra(s) (equipmentGems -- instaladas na Oficina ou refinadas via bônus de
// atributo da Forja; mesmo mecanismo, não dá pra distinguir uma da outra pelo número). Antes o
// total mostrado na tela de Equipamentos somava só normal+pedra e nunca incluía o aprimoramento,
// então uma peça aprimorada aparecia com um total menor do que ela de fato somava no personagem.
function statDetail(normal:number,forja:number,pedra:number){const extras=[forja?`forja +${forja}`:'',pedra?`pedra +${pedra}`:''].filter(Boolean);return extras.length?` (normal +${normal}, ${extras.join(', ')})`:''}
function equipmentStatParts(e:Equipment,ref:string|undefined,g:{heroId?:string;equipmentUpgrades:Record<string,number>;equipmentGems:Record<string,string[]>}){
 const b=equipmentInstanceBreakdown(e,ref,g as any)
 return{atk:b.total.atk,def:b.total.def,life:b.total.life,atkDetail:statDetail(b.base.atk,b.upgrade.atk,b.gems.atk),defDetail:statDetail(b.base.def,b.upgrade.def,b.gems.def),lifeDetail:statDetail(b.base.life,b.upgrade.life,b.gems.life)}
}
const eliteGallery=MONSTERS.map(x=>({...x,id:`elite_${x.id}`,nome:`Elite: ${x.nome}`,ataque:Math.ceil(x.ataque*1.24),vida:Math.ceil(x.vida*1.55),ouro:Math.ceil(x.ouro*1.7),habilidade:`${x.habilidade} • Técnica de elite`,elite:true,raridade:'raro' as Rarity,kind:'Elite'}))
const allGallery=[...HEROES.map(x=>({...x,kind:'Herói'})),...EQUIPMENT.map(x=>({...x,kind:'Equipamento'})),...CONSUMABLES.map(x=>({...x,kind:'Consumível'})),...MONSTERS.map(x=>({...x,kind:'Monstro'})),...eliteGallery,...Object.values(BOSSES).map(x=>({...x,kind:'Chefe'})),...EVENTS.map(x=>({...x,kind:'Evento'}))]
const galleryCategories=[['Todos','Todas'],['Herói','Heróis'],['Equipamento','Equipamentos'],['Consumível','Consumíveis'],['Monstro','Monstros'],['Elite','Monstros de elite'],['Chefe','Chefes'],['Evento','Eventos']] as const
const shopTabs=['Armas','Equipamentos','Consumíveis'] as const
type ShopTab=typeof shopTabs[number]
const weaponFilters=[['Todos','Todas'],['guerreiro','Guerreiro'],['guardiao','Guardião'],['cacadora','Ladino'],['arcanista','Mago'],['druida','Druida'],['cacador','Caçador'],['monge','Monge'],['sacerdotisa','Sacerdotisa'],['conjurador','Conjurador'],['neutra','Neutras']] as const
const equipmentFilters=[['Todos','Todos'],['bolsa','Bolsas'],['mao_esquerda','Mão esquerda'],['peitoral','Armaduras'],['capacete','Capacetes'],['calcas','Calças'],['botas','Botas'],['aneis','Anéis'],['amuleto','Amuletos']] as const
const consumableFilters=[['Todos','Todos'],['cura','Cura'],['bonus','Bônus']] as const
const sortOptions=[['padrao','Padrão'],['preco','Preço'],['raridade','Raridade'],['nome','Nome']] as const
// No mapa estreito do celular o rótulo de um pino perto da borda (ex: x=.91) estourava
// o container arredondado e ficava cortado, já que .map-wrap/.panel usam overflow:hidden
// para as bordas arredondadas. Pinos perto da borda ganham uma classe que reancoram o
// rótulo pela lateral/topo em vez de centralizar, mantendo tudo dentro do mapa.
function pinEdgeClass(x:number,y:number){let cls='';if(x<.16)cls+=' edge-left';else if(x>.84)cls+=' edge-right';if(y<.14)cls+=' edge-top';return cls}

const rarityLabel:Record<Rarity,string>={comum:'Comum',incomum:'Incomum',raro:'Raro',epico:'Épico',lendario:'Lendário',mitico:'Mítico',heroico:'Heróico'}
const PREMIUM_EASE:[number,number,number,number]=[0.22,1,0.36,1]
function rarityMotionTier(rarity:Rarity){return ({comum:'base',incomum:'base',raro:'elevated',epico:'rare',lendario:'rare',mitico:'rare',heroico:'hero'} as const)[rarity]}
function rarityMotionProps(rarity:Rarity,delay=0){
 if(effectsReduced())return {initial:false as const,animate:{opacity:1,y:0,scale:1},transition:{duration:0}}
 const tier=rarityMotionTier(rarity)
 const y=tier==='base'?10:tier==='elevated'?14:18
 const scale=tier==='base'?.985:tier==='elevated'?.975:.955
 const duration=tier==='base'?.26:tier==='elevated'?.34:.46
 return {initial:{opacity:0,y,scale,filter:'blur(5px)'},animate:{opacity:1,y:0,scale:1,filter:'blur(0px)'},transition:{duration,delay,ease:PREMIUM_EASE}}
}
function rarityHoverLift(rarity:Rarity){
 return effectsReduced()?undefined:({comum:{y:-2,scale:1.006},incomum:{y:-3,scale:1.008},raro:{y:-4,scale:1.012},epico:{y:-5,scale:1.016},lendario:{y:-6,scale:1.02},mitico:{y:-6,scale:1.02},heroico:{y:-6,scale:1.018}} as const)[rarity]
}
function cardArt(card:any){return card.arte??card.imagem}
function artText(card:any){return card.habilidade??card.descricao??'Uma figura importante nas terras de Havendown.'}
function eventMission(event:GameEvent){
 const name=event.nome.toLocaleLowerCase('pt-BR')
 const setting=/rainha|valoria/.test(name)?'Um vestígio da antiga corte de Valoria surgiu no caminho e ainda pode mudar o destino de alguém.':/malgor|morto|espectro|profana|negra|sem rosto/.test(name)?'A presença sombria adiante não pertence inteiramente ao mundo dos vivos, e ignorá-la pode deixar uma ameaça para os próximos viajantes.':/drag|fogo|cinza|rubi|forja|vulc/.test(name)?'Calor, cinzas e sinais de poder ancestral anunciam uma oportunidade rara, mas aproximar-se exigirá coragem.':/lua|lobo|flor|árvore|fada|corvo|névoa|lago/.test(name)?'Os sinais da natureza conduzem a um acontecimento incomum, daqueles que recompensam quem sabe observar antes de agir.':/ferreiro|mercador|taver|caravana|contraband|cartógrafo/.test(name)?'Um viajante precisa de ajuda para concluir seu trabalho e oferece parte do que possui em troca da sua intervenção.':'Algo fora do comum interrompe a jornada. Há pouco tempo para decidir entre investigar ou preservar forças e seguir viagem.'
 const objective=event.tipo==='ouro'?'Conclua o pedido apresentado e garanta o pagamento combinado.':event.tipo==='cura'?'Aproxime-se, preste auxílio e aceite a recuperação oferecida.':event.tipo==='escudo'?'Ajude a figura encontrada para receber uma proteção no próximo combate.':event.tipo==='ataque'?'Supere o desafio e obtenha uma bênção ofensiva para o próximo combate.':event.tipo==='equipamento'?'Ajude a recuperar ou preparar a peça prometida para receber um equipamento compatível.':event.tipo==='item'?'Investigue o local e recupere o suprimento oferecido.':event.tipo==='dano_ouro'?'Enfrente o perigo e recolha a recompensa, aceitando sofrer um ferimento.':event.tipo==='dano'?'Atravesse ou investigue a ameaça, sabendo que ela pode ferir o herói.':'Aceite o desafio e obtenha sucesso em uma rolagem de 4 a 6.'
 const reward=event.tipo==='ouro'?`Receber ${event.valor} moedas de ouro.`:event.tipo==='cura'?`Recuperar até ${event.valor} pontos de vida.`:event.tipo==='escudo'?`Receber +${event.valor} de escudo para o próximo combate.`:event.tipo==='ataque'?`Receber +${event.valor} de ataque para o próximo combate.`:event.tipo==='equipamento'?'Receber um equipamento compatível com o nível e a classe do herói.':event.tipo==='item'?'Receber um consumível aleatório.':event.tipo==='dano_ouro'?`Receber ${event.valor} moedas de ouro.`:event.tipo==='ouro_risco'?`Receber ${event.valor} moedas de ouro em caso de sucesso.`:'Avançar na exploração após enfrentar o acontecimento.'
 const risk=event.tipo==='ouro_risco'?`Rolagem obrigatória: 4–6 é sucesso; na falha, você perde até ${Math.max(1,Math.ceil(event.valor/2))} moedas.`:event.tipo==='dano_ouro'?'Custo conhecido: o herói sofre 1 ponto de dano.':event.tipo==='dano'?`O herói pode sofrer até ${event.valor} pontos de dano, mas não será derrotado pelo encontro.`:'Não há penalidade oculta nem teste de sucesso nesta missão.'
 return{setting,objective,reward,risk,risky:event.tipo==='ouro_risco'}
}
function artStats(card:any,kind?:string){
 if(kind==='Evento')return 'Encontro de exploração'
 if(kind==='Equipamento')return card.slot==='bolsa'?`Nível ${equipmentRequiredLevel(card)} • Capacidade ${card.capacidade??8} espaços`:`Nível ${equipmentRequiredLevel(card)} • ${offenseLabel(activeHeroId())} +${card.ataque??0} • Armadura +${card.defesa??0} • Vida +${card.vida??0}`
 if(kind==='Consumível')return `${card.tipo??'Efeito'} • Valor ${card.valor??0}`
 if(kind==='Herói'){const champion=card.id?championCardForKit(card.id):undefined;if(champion)return champion.atributos.map(a=>`${a.label} ${formatStatNumber(a.valor+a.bonus)}`).join(' • ')+` • Vida ${formatStatNumber(champion.vida.max)}`;return `Ataque ${card.ataque??0} • Defesa ${card.defesa??0} • Vida ${card.vida??0}`}
 return `Ataque ${card.ataque??0} • Vida ${card.vida??0}${card.ouro!==undefined?` • Recompensa ${card.ouro} ouro`:''}`
}
const ASSET_REVISION='20260820-hd'
// Ícone dos Cristais de Éter. Enquanto a arte do ART-034 (assets/ui/currency/aether-crystal.png) não
// for integrada, usa o ícone Gem em violeta: com src nulo não faz nenhum pedido de imagem (evita 404).
const CRYSTAL_ICON_SRC:string|null='assets/ui/currency/aether-crystal.png'
function CrystalIcon({size=17}:{size?:number}){
 const [failed,setFailed]=React.useState(false)
 if(!CRYSTAL_ICON_SRC||failed)return <Gem size={size} className="crystal-icon-fallback" aria-hidden="true"/>
 return <img className="crystal-icon" width={size} height={size} src={assetUrl(CRYSTAL_ICON_SRC)} alt="" aria-hidden="true" onError={()=>setFailed(true)}/>
}
function assetUrl(path:string){
 if(/^(data:|blob:|https?:)/.test(path))return path
 const normalized=path.replace(/^(\.\/|\/)+/,'')
 const url=`${import.meta.env.BASE_URL}${normalized}`
 return `${url}${url.includes('?')?'&':'?'}v=${ASSET_REVISION}`
}
function EquipmentComparison({item,current,currentTotal,candidateTotal,heroId}:{item:(typeof EQUIPMENT)[number];current?:typeof item;currentTotal?:{attack:number;defense:number;life:number};candidateTotal?:{attack:number;defense:number;life:number};heroId?:string}){const values=(equipment:typeof item,total?:{attack:number;defense:number;life:number})=>({attack:total?.attack??equipmentAttackForHero(equipment,heroId),defense:total?.defense??equipment.defesa,life:total?.life??equipment.vida,capacity:equipment.capacidade});const candidate=values(item,candidateTotal),equipped=current?values(current,currentTotal):undefined;const metric=(label:string,value:number,currentValue?:number)=>{const delta=currentValue===undefined?0:value-currentValue;return <span><small>{label}</small><b>{value>=0?'+':''}{value}</b>{currentValue!==undefined&&delta!==0&&<em className={delta>0?'better':'worse'}>{delta>0?'+':''}{delta}</em>}</span>};return <section className="equipment-compare"><h3>Comparação de equipamentos</h3><div><article className="compare-candidate"><small>ITEM SELECIONADO</small><strong>{item.nome}</strong><div className="compare-stats">{item.slot==='bolsa'?metric('Espaços',candidate.capacity??8,equipped?.capacity):<>{metric(offenseLabel(heroId),candidate.attack,equipped?.attack)}{metric('Armadura',candidate.defense,equipped?.defense)}{metric('Vida',candidate.life,equipped?.life)}</>}</div><p><b>Habilidade</b>{item.habilidade}</p></article>{current?<article className="compare-equipped"><small>EQUIPADO AGORA</small><strong>{current.nome}</strong><div className="compare-stats">{current.slot==='bolsa'?metric('Espaços',equipped?.capacity??8):<>{metric(offenseLabel(heroId),equipped?.attack??0)}{metric('Armadura',equipped?.defense??0)}{metric('Vida',equipped?.life??0)}</>}</div><p><b>Habilidade</b>{current.habilidade}</p></article>:<article className="compare-empty"><small>EQUIPADO AGORA</small><strong>Slot vazio</strong><p>Nenhum item será substituído.</p></article>}</div></section>}
function ArtPreview({image,name,text,stats,className,imgStyle,compareEquipment=false,allowEquip=false,instanceRef}:{image:string;name:string;text?:string;stats?:string;className?:string;imgStyle?:React.CSSProperties;compareEquipment?:boolean;allowEquip?:boolean;instanceRef?:string}){
 const [open,setOpen]=React.useState(false)
 const equipped=useGame(state=>state.equipped),heroId=useGame(state=>state.heroId),xp=useGame(state=>state.xp),equipmentBag=useGame(state=>state.equipmentBag),equip=useGame(state=>state.equip),equipmentGems=useGame(state=>state.equipmentGems),craftedEffects=useGame(state=>state.craftedEffects),equipmentUpgrades=useGame(state=>state.equipmentUpgrades)
 React.useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[open])
 const equipment=(compareEquipment||className?.includes('slot-art-preview'))?EQUIPMENT.find(item=>item.nome===name):undefined
 const emblem=equipment?cardEmblem(equipment,'Equipamento'):undefined
 const owner=equipment?.classeExclusiva??(equipment?equipmentAffinity(equipment):undefined)
 // Comparava a referência de instância equipada (com sufixo '@@...') contra o id genérico do
 // catálogo -- nunca eram iguais, então ownSlot ficava sempre indefinido e a comparação
 // aparecia mesmo pra um item que já estava equipado (comparando a peça com ela mesma).
 const ownSlot=equipment&&(Object.entries(equipped) as [Slot,string][]).find(([,id])=>id&&equipmentBaseId(id)===equipment.id)?.[0]
 const targetSlot=equipment?(ownSlot??(equipment.slot==='anel_1'&&equipped.anel_1?'anel_2':equipment.slot)):undefined
 const currentRef=targetSlot?equipped[targetSlot]:undefined
 const currentEquipment=currentRef?equipmentByRef(currentRef):undefined
 // A comparação (EquipmentComparison) usava só os atributos BASE do catálogo dos dois lados
 // (item candidato E item já equipado), ignorando aprimoramento (+1/+2/+3), pedras da Forja e
 // o bônus por classe de cada instância -- uma peça forjada/aprimorada aparecia mais fraca do
 // que realmente é (nos dois lados), podendo levar a trocar por uma peça pior por engano. Usa
 // o mesmo breakdown de stats()/tela de Equipamentos em vez de recalcular a fórmula de novo.
 const pseudoState={heroId,equipmentUpgrades,equipmentGems} as any
 const instanceTotal=(ref:string|undefined,eq:Equipment|undefined)=>{if(!ref||!eq)return undefined;const b=equipmentInstanceBreakdown(eq,ref,pseudoState);return{attack:b.total.atk,defense:b.total.def,life:b.total.life}}
 const currentTotal=instanceTotal(currentRef,currentEquipment)
 const candidateTotal=instanceTotal(instanceRef,equipment)
 const classAllowed=equipment?equipmentClassAllowed(equipment,heroId):false
 const levelAllowed=equipment?equipmentLevelAllowed(equipment,xp):false
 const bagFits=equipment?equipment.slot!=='bolsa'||equipmentBag.length<=(equipment.capacidade??8):false
 const equipLabel=!classAllowed?'Impossível equipar':!levelAllowed?`Requer nível ${equipment?equipmentRequiredLevel(equipment):1}`:!bagFits?`Reduza para ${equipment?.capacidade??8} itens`:(currentEquipment?'Substituir item equipado':'Equipar item')
 const src=assetUrl(image)
 // O botão "Equipar item" comparava equipmentBag (refs de instância, com sufixo '@@...') com
 // equipment.id (id genérico do catálogo) -- nunca eram iguais, então o botão nunca aparecia
 // pra nenhuma peça real da mochila, e mesmo que aparecesse chamaria equip(equipment.id), que
 // falha em silêncio (equip() procura o id exato dentro de equipmentBag). bagRef usa a
 // instância explícita repassada por quem já sabe qual cópia é essa (ItemCard) e confirma que
 // ela está mesmo na mochila (não equipada -- aí o botão não faz sentido).
 const bagRef=instanceRef&&equipmentBag.includes(instanceRef)?instanceRef:undefined
 // A janela de detalhes mostrava os bônus POSSÍVEIS da Forja (todas as pedras/efeitos que a
 // peça aceita), não os que ela de fato tem -- o jogador via uma lista genérica igual pra
 // qualquer cópia do item, mesmo numa peça já forjada. Agora resolve a referência de instância
 // (equipada via ownSlot, ou a explícita passada por quem já sabe qual cópia da mochila é essa)
 // e lista só o que está realmente aplicado nela: pedras em equipmentGems e o efeito especial
 // em craftedEffects, os dois já chaveados pela instância (não pelo id genérico do catálogo).
 const resolvedRef=instanceRef??(ownSlot?equipped[ownSlot]:undefined)
 const appliedGemLabels:string[]=resolvedRef?(equipmentGems[resolvedRef]??[]).map(gemId=>FORGE_GEMS.find(gem=>gem.id===gemId)?.texto).filter((label):label is NonNullable<typeof label>=>Boolean(label)):[]
 const appliedEffect=resolvedRef?craftedEffects[resolvedRef]:undefined
 const appliedEffectLabel=appliedEffect?(CRAFTED_EFFECT_LABELS[appliedEffect]??appliedEffect):undefined
 const appliedBonusEntries=[...appliedGemLabels,...(appliedEffectLabel?[appliedEffectLabel]:[])]
 // O portal (createPortal) ficava ANINHADO dentro do próprio <span> que abre a visualização
 // (onClick={...setOpen(true)}) -- React encaminha eventos sintéticos de um portal pela árvore
 // React, não pela árvore do DOM, então um clique no fundo do overlay (que não chama
 // stopPropagation) borbulhava, na visão do React, direto para esse <span> gatilho e disparava
 // de novo o setOpen(true) dele, reabrindo a janela no mesmo clique que devia fechá-la -- por
 // isso "clique fora para fechar" nunca funcionava, embora o botão × (dentro do card, onde a
 // propagação já para) funcionasse normalmente. Portal agora é irmão do gatilho, não filho dele.
 return <>
 <span className={`art-preview-trigger ${className??''}`} onClick={event=>{event.stopPropagation();setOpen(true)}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();setOpen(true)}}} role="button" tabIndex={0} aria-haspopup="dialog" aria-label={`Ampliar arte de ${name}`}>
  {image&&<img src={src} alt={name} style={imgStyle}/>}
  {emblem&&<img className="slot-class-emblem" src={assetUrl(emblem)} alt={classOwnerLabel(owner)} aria-hidden="true"/>}
 </span>
 {open&&createPortal(<span className="art-preview-overlay" role="dialog" aria-modal="true" aria-label={`Arte completa de ${name}`} onClick={event=>{event.stopPropagation();setOpen(false)}}><span className={`art-preview-card${equipment&&!ownSlot?' equipment-comparison-preview':''}`} onClick={event=>event.stopPropagation()}><img src={src} alt={name}/><span className="art-preview-copy"><button className="art-preview-close" onClick={()=>setOpen(false)} aria-label="Fechar visualização">×</button><small>ARTE COMPLETA</small><strong>{name}</strong>{text&&<span>{text}</span>}{stats&&<b>{stats}</b>}{equipment&&resolvedRef&&<div className="art-preview-forge-bonuses"><small className="forge-bonus-title">Bônus aplicados nesta peça</small>{appliedBonusEntries.length?<ul>{appliedBonusEntries.map((label,i)=><li key={i}>{label}</li>)}</ul>:<p>Nenhum bônus da Forja aplicado ainda.</p>}</div>}{equipment&&!ownSlot&&<EquipmentComparison item={equipment} current={currentEquipment} currentTotal={currentTotal} candidateTotal={candidateTotal} heroId={heroId}/>} {equipment&&bagRef&&<button className="primary preview-equip-action" disabled={!classAllowed||!levelAllowed||!bagFits} title={!classAllowed?'Este item não pode ser usado por esta classe.':!levelAllowed?`Disponível no nível ${equipmentRequiredLevel(equipment)}`:!bagFits?'Há equipamentos demais para esta bolsa.':undefined} onClick={()=>{equip(bagRef);setOpen(false)}}>{equipLabel}</button>}<em>Clique fora da janela ou pressione Esc para fechar</em></span></span></span>,document.body)}
 </>
}
function cardRarity(card:any,kind?:string):Rarity{
 if(card.raridade)return card.raridade as Rarity
 if(kind==='Chefe'||card.boss)return 'lendario'
 if(kind==='Herói')return 'heroico'
 if(typeof card.preco==='number'){if(card.preco>=40)return'lendario';if(card.preco>=30)return'epico';if(card.preco>=22)return'raro';if(card.preco>=14)return'incomum'}
 if(typeof card.dificuldade==='number'){if(card.dificuldade>=5)return'epico';if(card.dificuldade>=3)return'raro';if(card.dificuldade>=2)return'incomum'}
 return 'comum'
}
const cardSystemRoot='assets/ui/card-system/'
function cardEmblem(card:any,kind:string){
 if(kind==='Chefe'||card.boss)return cardSystemRoot+'enemy-boss-v2.webp'
 if(kind==='Elite'||card.elite)return cardSystemRoot+'enemy-elite-v2.webp'
 if(kind==='Monstro')return cardSystemRoot+'enemy-common-v2.webp'
 const rawClassId=kind==='Herói'?card.id:(card.classeExclusiva??(kind==='Equipamento'?equipmentAffinity(card):undefined))
 const classId=Array.isArray(rawClassId)?rawClassId[0]:rawClassId
 const icon=({guerreiro:'class-warrior.webp',guardiao:'class-guardian.webp',cacadora:'class-rogue.webp',arcanista:'class-arcanist.webp',druida:'class-arcanist.webp',cacador:'class-rogue.webp',monge:'class-warrior.webp',sacerdotisa:'class-guardian.webp',conjurador:'class-arcanist.webp'} as Record<string,string>)[classId]
 return cardSystemRoot+(icon??'class-universal.webp')
}
function cardBadge(card:any,kind:string,rarity:Rarity){
 if(kind==='Chefe'||card.boss)return'Chefe'
 if(kind==='Elite'||card.elite)return'Elite'
 if(kind==='Monstro')return'Comum'
 return rarityLabel[rarity]
}
const fxRoot=cardSystemRoot+'fx/'
function AttackFX({type,critical}:{type:AttackAnimType;critical?:boolean}){
 return <img className="fx-overlay-img fx-attack" src={assetUrl(fxRoot+type+(critical?'-critico':'')+'.webp')} alt="" aria-hidden="true"/>
}
function SupportFX({type}:{type:'fortificacao'|'cura'|'cura-item'}){
 return <img className="fx-overlay-img fx-support" src={assetUrl(fxRoot+type+'.webp')} alt="" aria-hidden="true"/>
}
// Tilt 3D + brilho holográfico ao mouse, na cor da própria raridade da carta (var(--rarity)
// já existe por card). Só liga em ponteiro fino com hover real e fora de prefers-reduced-motion
// -- sem isso, tocar a carta no celular deixaria um tilt "preso" sem como resetar via pointerleave.
function useCardTilt(enabled:boolean){
 const ref=React.useRef<HTMLElement|null>(null)
 useGSAP(()=>{
  const el=ref.current
  if(!enabled||!el)return
  if(!window.matchMedia('(hover:hover) and (pointer:fine)').matches)return
  if(effectsReduced())return
  let rect:DOMRect|undefined
  let raf=0
  const state={rx:0,ry:0,gx:50,gy:50,lift:0,scale:1}
  const render=()=>{
   raf=0
   el.style.setProperty('--tilt-rx',`${state.rx.toFixed(2)}deg`)
   el.style.setProperty('--tilt-ry',`${state.ry.toFixed(2)}deg`)
   el.style.setProperty('--tilt-gx',`${state.gx.toFixed(1)}%`)
   el.style.setProperty('--tilt-gy',`${state.gy.toFixed(1)}%`)
   el.style.setProperty('--tilt-lift',`${state.lift.toFixed(2)}px`)
   el.style.setProperty('--tilt-scale',state.scale.toFixed(3))
  }
  const queueRender=()=>{if(!raf)raf=requestAnimationFrame(render)}
  const animateState=(patch:Partial<typeof state>,duration:number)=>gsap.to(state,{...patch,duration,ease:'power3.out',overwrite:true,onUpdate:queueRender})
  const measure=()=>{rect=el.getBoundingClientRect()}
  const onEnter=()=>{measure();el.dataset.tiltActive='true';animateState({lift:-8,scale:1.018},.24)}
  const onMove=(event:PointerEvent)=>{
   if(!rect)measure()
   if(!rect)return
   const px=(event.clientX-rect.left)/rect.width,py=(event.clientY-rect.top)/rect.height
   animateState({rx:(.5-py)*12,ry:(px-.5)*12,gx:px*100,gy:py*100},.2)
  }
  const onLeave=()=>{el.dataset.tiltActive='false';animateState({rx:0,ry:0,gx:50,gy:50,lift:0,scale:1},.32)}
  const onWindowResize=()=>{rect=undefined}
  el.addEventListener('pointerenter',onEnter)
  el.addEventListener('pointermove',onMove)
  el.addEventListener('pointerleave',onLeave)
  window.addEventListener('resize',onWindowResize)
  return()=>{
   if(raf)cancelAnimationFrame(raf)
   gsap.killTweensOf(state)
   el.removeEventListener('pointerenter',onEnter)
   el.removeEventListener('pointermove',onMove)
   el.removeEventListener('pointerleave',onLeave)
   window.removeEventListener('resize',onWindowResize)
   el.dataset.tiltActive='false'
   el.style.removeProperty('--tilt-rx')
   el.style.removeProperty('--tilt-ry')
   el.style.removeProperty('--tilt-gx')
   el.style.removeProperty('--tilt-gy')
   el.style.removeProperty('--tilt-lift')
   el.style.removeProperty('--tilt-scale')
  }
 },{scope:ref,dependencies:[enabled],revertOnUpdate:true})
 return ref
}
function CardFrame({card,kind,artStyle,frameTheme,attackFx,attackFxCritical,supportFx,tilt,holoMode}:{card:any;kind:string;artStyle?:React.CSSProperties;frameTheme?:string;attackFx?:AttackAnimType;attackFxCritical?:boolean;supportFx?:'fortificacao'|'cura'|'cura-item';tilt?:boolean;holoMode?:'off'|'full'|'frame'|'art'}){
 const tiltRef=useCardTilt(Boolean(tilt))
 const rarity=cardRarity(card,kind),baseEffect=card.habilidade??card.descricao??'Sem efeito especial.',effect=kind==='Equipamento'?`Nível ${equipmentRequiredLevel(card)} • ${baseEffect}`:baseEffect
 const enemy=kind==='Monstro'||kind==='Elite'||kind==='Chefe'||card.boss||card.elite
 const attack=card.ataque??0,defense=card.defesa??(enemy?Math.max(0,(card.dificuldade??1)-2):0),life=card.vida??(kind==='Consumível'?card.valor??0:0)
 const nameLength=String(card.nome??'').length,nameSize=nameLength>32?'name-xlong':nameLength>23?'name-long':nameLength>16?'name-medium':'name-short',effectLength=String(effect).length,effectSize=effectLength>92?'effect-xlong':effectLength>66?'effect-long':effectLength>42?'effect-medium':'effect-short'
 // holoMode deixa o Criador de cartas testar o arco-íris isolado na moldura (usa a própria
 // transparência do PNG da moldura como máscara) ou isolado na arte (fica dentro de .ornate-art,
 // que já recorta/posiciona atrás da moldura) -- os demais usos de CardFrame não passam holoMode
 // e continuam com o comportamento antigo (carta inteira quando tilt, nada quando não).
 // O card tem cantos vazios/transparentes fora do desenho da moldura (ela não é um retângulo
 // cheio). Um brilho aplicado ao retângulo inteiro (::before/::after antigos) vazava nesses
 // cantos vazios, parecendo um bug. Por isso TUDO -- inclusive o "spot" de raridade, que antes
 // era genérico via .tilt-card::before -- agora é confinado à própria moldura (máscara) ou à
 // arte (.ornate-art já recorta), nunca ao retângulo cheio do card. "Carta inteira" = os dois
 // pares (moldura+arte) ligados ao mesmo tempo, não mais um terceiro efeito por cima de tudo.
 const frameSrc=assetUrl(cardSystemRoot+(frameTheme?`frame-${frameTheme}.png`:'frame-overlay.png'))
 const frameMaskStyle={maskImage:`url(${frameSrc})`,WebkitMaskImage:`url(${frameSrc})`} as React.CSSProperties
 const mode=holoMode??(tilt?'full':'off')
 const showFrameRainbow=mode==='frame'||mode==='full',showArtRainbow=mode==='art'||mode==='full'
 return <article ref={tiltRef as React.RefObject<HTMLElement>} data-rarity-tier={rarityMotionTier(rarity)} className={`game-card ornate-card rarity-${rarity} ${enemy?'ornate-enemy':''} ${nameSize} ${effectSize} ${frameTheme?`frame-theme-${frameTheme}`:''} ${tilt?'tilt-card':''}`}>
  <div className="ornate-art"><ArtPreview image={cardArt(card)} name={card.nome} text={artText(card)} stats={artStats(card,kind)} imgStyle={artStyle}/>{tilt&&<div className="ornate-art-spot"/>}{showArtRainbow&&<div className="ornate-art-holo"/>}</div>
  <img className="ornate-frame" src={frameSrc} alt="" aria-hidden="true"/>
  {tilt&&<div className="ornate-frame-spot" style={frameMaskStyle}/>}
  {showFrameRainbow&&<div className="ornate-frame-holo" style={frameMaskStyle}/>}
  {/* Sheen ambiente (CSS puro, ver .ornate-frame-idle): só entra em ação pra raridade
      épico+ via seletor de raridade no CSS -- sempre presente aqui, nunca observável em
      cartas comuns/incomuns/raras. Ao contrário do spot/holo acima, não depende de hover
      nem de holoMode, então funciona em toque/mobile também. */}
  <div className="ornate-frame-idle" style={frameMaskStyle}/>
  <h2 className="ornate-name">{card.nome}</h2>
  <img className="ornate-emblem" src={assetUrl(cardEmblem(card,kind))} alt={enemy?`Categoria ${cardBadge(card,kind,rarity)}`:`Compatibilidade de ${kind}`}/>
  <strong className="ornate-badge">{cardBadge(card,kind,rarity)}</strong>
  <span className="ornate-stat ornate-attack">{enemy?attack:`+${attack}`}</span>
  <span className="ornate-stat ornate-defense">{enemy?defense:`+${defense}`}</span>
  <span className="ornate-stat ornate-life">{enemy?life:`+${life}`}</span>
  <p className="ornate-effect">{effect}</p>
  {attackFx&&<AttackFX type={attackFx} critical={attackFxCritical}/>}
  {supportFx&&<SupportFX type={supportFx}/>}
 </article>
}

// O autosave via zustand persist sempre foi silencioso -- o jogador nunca tinha confirmação
// de que o progresso realmente gravou. Usa "estado parou de mudar por 700ms" como proxy de
// "a gravação no localStorage já aconteceu" (persist escreve de forma síncrona a cada set()),
// em vez de mexer no middleware; ignora a primeira mudança (hidratação do save ao abrir o app).
function SaveIndicator(){
 const [visible,setVisible]=React.useState(false)
 React.useEffect(()=>{
  let settleTimer:ReturnType<typeof setTimeout>|null=null,hideTimer:ReturnType<typeof setTimeout>|null=null,skippedFirst=false
  const unsubscribe=useGame.subscribe(()=>{
   if(!skippedFirst){skippedFirst=true;return}
   if(settleTimer)clearTimeout(settleTimer)
   settleTimer=setTimeout(()=>{
    setVisible(true)
    if(hideTimer)clearTimeout(hideTimer)
    hideTimer=setTimeout(()=>setVisible(false),1800)
   },700)
  })
  return()=>{unsubscribe();if(settleTimer)clearTimeout(settleTimer);if(hideTimer)clearTimeout(hideTimer)}
 },[])
 return <div className={`save-indicator${visible?' show':''}`} role="status" aria-live="polite"><CheckCircle2 size={13}/>Progresso salvo</div>
}
function App(){
 React.useEffect(()=>{document.documentElement.classList.toggle('reduce-effects',getReduceEffectsPref());document.documentElement.classList.toggle('high-contrast',getHighContrastPref())},[])
 // Histórico de progresso (item 48): registra um ponto a cada level up, não a cada mudança de
 // xp (isso geraria dezenas de pontos por combate só de ganhar experiência aos poucos). Guarda
 // só os últimos 60 pontos -- é um gráfico de tendência, não um log de auditoria.
 React.useEffect(()=>{let lastLevel=levelInfo(useGame.getState().xp).lvl;return useGame.subscribe((state:any)=>{const lvl=levelInfo(state.xp).lvl;if(lvl<=lastLevel)return;lastLevel=lvl;const history=[...(state.progressHistory??[]),{at:Date.now(),level:lvl,gold:state.gold,bosses:state.subregionBossesDefeated.length}].slice(-60);useGame.setState({progressHistory:history} as any)})},[])
 React.useEffect(()=>{const heal=()=>{const s=useGame.getState() as any;if(!s.heroId||s.hp<=0)return;const now=Date.now();if(s.lastPassiveHealAt==null||s.screen==='combat'){useGame.setState({lastPassiveHealAt:now} as any);return}const interval=s.regenBoostUntil>now?30000:60000,points=Math.floor((now-s.lastPassiveHealAt)/interval);if(points>0)useGame.setState({hp:Math.min(maxHp(s),s.hp+points),lastPassiveHealAt:s.lastPassiveHealAt+points*interval} as any)};heal();const timer=setInterval(heal,10000),unsubscribe=useGame.subscribe((state:any,previous:any)=>{if((state.inventory.tonico_regeneracao??0)<(previous.inventory.tonico_regeneracao??0))useGame.setState({regenBoostUntil:Date.now()+3600000,lastPassiveHealAt:Date.now(),explorationNote:'Tônico da Regeneração Acelerada: cura acelerada ativa por 1 hora.'} as any)});return()=>{clearInterval(timer);unsubscribe()}},[])
 // Histórico de progresso (item 48): registra um ponto a cada level up, não a cada mudança de
 // xp (isso geraria dezenas de pontos por combate só de ganhar experiência aos poucos). Guarda
 // só os últimos 60 pontos -- é um gráfico de tendência, não um log de auditoria.
 React.useEffect(()=>{let lastLevel=levelInfo(useGame.getState().xp).lvl;return useGame.subscribe((state:any)=>{const lvl=levelInfo(state.xp).lvl;if(lvl<=lastLevel)return;lastLevel=lvl;const history=[...(state.progressHistory??[]),{at:Date.now(),level:lvl,gold:state.gold,bosses:state.subregionBossesDefeated.length}].slice(-60);useGame.setState({progressHistory:history} as any)})},[])
 React.useEffect(()=>useGame.subscribe((state:any)=>{const ids:string[]=state.activePotionIds??[],active=ids.filter(id=>{const item=CONSUMABLES.find(candidate=>candidate.id===id);return item?.tipo==='ataque'?state.pendingAttackBonus>0:item?.tipo==='escudo'?state.shield>0:false});if(active.length!==ids.length)useGame.setState({activePotionIds:active} as any)}),[])
 // Som de clique genérico -- um único listener delegado no documento em vez de tocar o som
 // em cada um dos centenas de <button> do app individualmente. Ignora botões desabilitados
 // (não representam uma ação real) para não tocar som em cliques que não fizeram nada.
 React.useEffect(()=>{const onClick=(event:MouseEvent)=>{const button=(event.target as HTMLElement)?.closest?.('button');if(button&&!button.disabled)playSfx('click',.28)};document.addEventListener('click',onClick);return()=>document.removeEventListener('click',onClick)},[])
 const g=useGame();
 React.useEffect(()=>{let previous=g.screen;return useGame.subscribe((state:any)=>{if(state.screen==='loot'&&previous!=='loot'){playSfx(state.loot?.title==='EQUIPE DERROTADA'?'defeat':'coin',.5)}previous=state.screen})},[g.screen])
 const hero=HEROES.find(h=>h.id===g.heroId)
 const [fleeConfirm,setFleeConfirm]=React.useState(false)
 React.useEffect(()=>{if(g.screen!=='combat')setFleeConfirm(false)},[g.screen])
 React.useEffect(()=>{
  const handleEscape=(event:KeyboardEvent)=>{
   if(event.key!=='Escape'||document.querySelector('.art-preview-overlay'))return
   event.preventDefault()
   if(fleeConfirm){setFleeConfirm(false);return}
   if(g.screen==='combat'){setFleeConfirm(true);return}
   if(hero&&g.screen!=='map')g.setScreen('map')
  }
  document.addEventListener('keydown',handleEscape)
  return()=>document.removeEventListener('keydown',handleEscape)
 },[fleeConfirm,g.screen,hero,g.setScreen])
 const regionTheme=REGION_UI_THEME[g.regionId]??'gold'
 // O tema também vai para o <html>: diálogos em portal (fora do .app-shell) acompanham as cores da região.
 React.useEffect(()=>{document.documentElement.setAttribute('data-region-theme',regionTheme);return()=>document.documentElement.removeAttribute('data-region-theme')},[regionTheme])
 // Atributo no <html> para o CSS diferenciar os modos sem passar props por todas as telas.
 const uiMode=useUiMode()
 React.useEffect(()=>{document.documentElement.dataset.uiMode=uiMode},[uiMode])
 // O Acampamento só existe no modo Moderno: no Clássico (ou ao trocar de modo estando nele), vai para o Mapa.
 React.useEffect(()=>{if(g.screen==='camp'&&uiMode!=='modern')useGame.getState().setScreen('map')},[g.screen,uiMode])
 return <div className="app-shell" data-region-theme={regionTheme} data-ui-mode={uiMode}><CoopBattleSync/><SaveIndicator/>
   {g.screen!=='menu'&&g.screen!=='select'&&g.screen!=='event'&&g.screen!=='cardCreator'&&<TopBar/>}
   <AnimatePresence mode="wait">
    <motion.main key={g.screen} className="screen" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.22}}>
      {g.screen==='menu'&&<MainMenu/>}{g.screen==='select'&&<HeroSelect/>}{g.screen==='camp'&&uiMode==='modern'&&<CampScreen assetUrl={assetUrl} heroArt={hero=>cardArt(hero)} classLabel={id=>classNames[id]??id} chapterArt={storyChapterArt} crystalIcon={size=><CrystalIcon size={size}/>} onGo={target=>g.setScreen(target as any)}/>}{g.screen==='map'&&<MapScreen/>}{g.screen==='guild'&&<GuildScreen/>}{g.screen==='chronicle'&&<ChronicleScreen/>}{g.screen==='forge'&&<ForgeScreen/>}{g.screen==='region'&&<><RegionScreen/><RegionRevengePanel/></>}{g.screen==='event'&&<EventScreen/>}{g.screen==='character'&&<CharacterScreen/>}{g.screen==='inventory'&&<InventoryScreen/>}{g.screen==='equipment'&&<EquipmentScreen/>}{g.screen==='shop'&&<ShopScreen/>}{g.screen==='gallery'&&<GalleryScreen/>}{g.screen==='tutorial'&&<TutorialScreen/>}{g.screen==='coop'&&<PersistentCoopScreen/>}{g.screen==='combat'&&<CombatScreen/>}{g.screen==='bossIntro'&&<BossIntro/>}{g.screen==='loot'&&<LootScreen/>}{g.screen==='cardCreator'&&<CardCreatorScreen/>}
      {g.screen==='inventory'&&g.explorationNote&&/(sucesso|tentativa falhou)/i.test(g.explorationNote)&&<div className="consumable-result"><Sparkles/>{g.explorationNote}</div>}
    </motion.main>
   </AnimatePresence>
   {fleeConfirm&&<div className="escape-confirm-overlay" role="presentation" onClick={()=>setFleeConfirm(false)}><section className="escape-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="escape-flee-title" onClick={event=>event.stopPropagation()}><Footprints/><small>ATALHO ESC DURANTE O COMBATE</small><h2 id="escape-flee-title">Tentar fugir?</h2><p>Um dado amarelo será rolado: <b>5–6</b> permite escapar, <b>4</b> mantém sua ação e <b>1–3</b> encerra seu turno.</p>{(!g.playerTurn||g.animating)&&<span>Aguarde o seu turno para tentar fugir.</span>}<div><button onClick={()=>setFleeConfirm(false)}>Continuar combate</button><button className="primary" disabled={!g.playerTurn||g.animating} title={!g.playerTurn||g.animating?'Aguarde o seu turno para tentar fugir.':undefined} onClick={()=>{setFleeConfirm(false);g.flee()}}><Footprints/>Rolar dado de fuga</button></div></section></div>}
   {g.storyNotice && (
     <aside className="story-toast-banner" onClick={() => useGame.setState({ storyNotice: undefined })}>
       <Sparkles size={16} />
       <span>{g.storyNotice}</span>
       <button aria-label="Fechar aviso"><X size={14} /></button>
     </aside>
   )}
   <TourOverlay/>
   {hero&&g.screen!=='menu'&&g.screen!=='select'&&g.screen!=='cardCreator'&&<footer className="footer-tip">Bangalore's • Auto-save ativo • A aventura continua no próximo acesso.</footer>}
 </div>
}

// Tour de boas-vindas: navega de verdade pelas telas do menu superior (TOUR_STEPS, em
// store/game.ts) enquanto mostra um cartão flutuante explicando cada uma. Não bloqueia a
// tela por trás -- o jogador pode clicar em qualquer lugar enquanto o cartão flutua por cima.
function TourOverlay(){
 const g=useGame()
 React.useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==='Escape')g.endTour()};if(g.tourStep!=null)document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[g.tourStep,g.endTour])
 // Se o jogador navegar manualmente para fora do roteiro do tour (ex: clicar num nav e cair
 // em combate), o cartão fecha sozinho em vez de continuar flutuando sobre uma tela que já
 // não bate com o passo atual.
 React.useEffect(()=>{if(g.tourStep!=null&&!TOUR_STEPS.some(t=>t.screen===g.screen))g.endTour()},[g.screen,g.tourStep,g.endTour])
 if(g.tourStep==null)return null
 const step=TOUR_STEPS[g.tourStep]
 if(!step)return null
 const Icon=nav.find(([id])=>id===step.screen)?.[2]??Sparkles
 const isFirst=g.tourStep===0,isLast=g.tourStep===TOUR_STEPS.length-1
 return <div className="tour-overlay" role="dialog" aria-modal="false" aria-label="Tour de boas-vindas">
  <div className="tour-card">
   <button className="tour-skip" onClick={g.endTour} aria-label="Pular tour">Pular<XCircle size={14}/></button>
   <div className="tour-card-head"><span className="tour-icon"><Icon size={20}/></span><div><small>PASSO {g.tourStep+1} DE {TOUR_STEPS.length}</small><h3>{step.title}</h3></div></div>
   <p>{step.text}</p>
   <ul className="tour-highlights">{step.highlights.map(item=><li key={item}>{item}</li>)}</ul>
   <aside className="tour-tip"><Sparkles size={14}/><span><b>Dica:</b> {step.tip}</span></aside>
   <div className="tour-dots">{TOUR_STEPS.map((_,i)=><span key={i} className={i===g.tourStep?'active':''}/>)}</div>
   <div className="tour-actions">
    <button disabled={isFirst} onClick={g.prevTourStep}>Voltar</button>
    <button className="primary" onClick={isLast?g.finishTour:g.nextTourStep}>{isLast?'Concluir tour':'Próximo'}</button>
   </div>
  </div>
 </div>
}

const EMPTY_MARKET:MarketListing[]=[]
function CoopBattleSync(){
 const coop=useCoop(),screen=useGame(state=>state.screen),hp=useGame(state=>state.hp),xp=useGame(state=>state.xp),shield=useGame(state=>state.shield),subregionVictories=useGame(state=>state.subregionVictories),enemyHp=useGame(state=>state.enemyHp),dungeonActive=useGame(state=>state.dungeonActive),sync=useGame(state=>state.syncCoopEnemyHp),completeVictory=useGame(state=>state.completeCoopVictory),completeDefeat=useGame(state=>state.completeCoopDefeat),completeFlee=useGame(state=>state.completeCoopFlee),receiveEnemy=useGame(state=>state.receiveCoopEnemyAttack),receiveHeroAction=useGame(state=>state.receiveCoopHeroAction),receiveSupportFx=useGame(state=>state.receiveCoopSupportFx),receiveHeal=useGame(state=>state.receiveCoopHeal),receiveMarketSale=useGame(state=>state.receiveMarketSale),battle=coop.room?.shared_state?.battle as {id?:string;status?:string;subregionId?:string;enemy?:any;enemyHp?:number;damageByPlayer?:Record<string,number>;healingByPlayer?:Record<string,number>;damageResistedByPlayer?:Record<string,number>;activeUserId?:string;lastRoll?:any;fleeRoll?:{roll:number;outcome:'success'|'neutral'|'failed'};minionRolls?:any[];summonRolls?:any[];turn?:number}|undefined,market=(coop.room?.shared_state?.market as MarketListing[]|undefined)??EMPTY_MARKET,handledEnemyTurn=React.useRef(''),receivedRoll=React.useRef(''),receivedHeroRoll=React.useRef(''),receivedAbility=React.useRef(''),receivedHeal=React.useRef(''),receivedSelf=React.useRef(''),receivedMinions=React.useRef(''),receivedSummons=React.useRef(''),handledDefeat=React.useRef(''),handledFlee=React.useRef(''),enemyExecutor=React.useRef(coop.resolveEnemyTurn),publishedVitals=React.useRef(''),joinedBattle=React.useRef(''),settledSales=React.useRef<Set<string>>(new Set())
 enemyExecutor.current=coop.resolveEnemyTurn
 React.useEffect(()=>{const roomId=coop.room?.id,userId=coop.userId,g=useGame.getState(),myMaxHp=maxHp(g),myAttack=attackValue(g),myDefense=defenseValue(g),myArmor=armorValue(g),myDodge=heroDodgeChance(g),myElementalResist=heroElementalResistance(g),myEffectResist=heroEffectResistance(g),myVigor=championStats(g).linhas.vigor.total,myEnergyMax=championStats(g).energiaMaxima,level=levelInfo(xp).lvl,rollBonus=g.classRollBonus??0,critDefenseBoost=hasCraftedEffect(g,'defesa_perfeita'),dodgeBoost=hasCraftedEffect(g,'esquiva_forjada'),weaponAnim=heroWeaponAnimationType(g.equipped.mao_direita),resistances=heroResistances(g),locked=isNavigationLocked(g),key=`${roomId}:${userId}:${hp}:${myMaxHp}:${myAttack}:${myDefense}:${myArmor}:${myDodge}:${myElementalResist}:${myEffectResist}:${myVigor}:${myEnergyMax}:${level}:${shield}:${rollBonus}:${critDefenseBoost}:${dodgeBoost}:${weaponAnim}:${resistances.join(',')}:${locked}`;if(!roomId||!userId||publishedVitals.current===key)return;publishedVitals.current=key;void coop.publishProgress(subregionVictories,{hp,maxHp:myMaxHp,level,attack:myAttack,defense:myDefense,armor:myArmor,dodgeChance:myDodge,elementalResist:myElementalResist,effectResist:myEffectResist,vigor:myVigor,energyMax:myEnergyMax,shield,rollBonus,critDefenseBoost,dodgeBoost,weaponAnim,resistances,locked})},[coop.room?.id,coop.userId,hp,xp,shield,subregionVictories,screen,dungeonActive,coop.publishProgress])
 // Antes só PersistentCoopScreen (montado só com screen==='coop') detectava o início de uma
 // batalha compartilhada -- quem estivesse em qualquer outra tela (Loja, Ficha, Forja...) nunca
 // era puxado pra luta até voltar manualmente pra aba do coop, e a iniciativa da batalha ficava
 // travada esperando a vez de alguém que nem sabia que a luta tinha começado. Esse componente
 // fica montado o jogo inteiro, então entra aqui em qualquer tela -- exceto se isNavigationLocked
 // (o próprio jogador preso no combate solo ou no saque de uma masmorra): forçar a troca de tela
 // por baixo dele corromperia esse fluxo em andamento. Nesse caso só adia: a checagem reroda a
 // cada mudança de tela/masmorra e entra assim que a pessoa se libertar. safeStartMapBattle (em
 // CoopContext.tsx) usa o mesmo sinal pra impedir o líder de nem iniciar a caçada nesse caso.
 React.useEffect(()=>{
  if(battle?.status!=='playing'||!battle.id||!battle.enemy||!battle.subregionId||joinedBattle.current===battle.id)return
  const g=useGame.getState()
  if(isNavigationLocked(g))return
  joinedBattle.current=battle.id
  g.startCoopCombat(battle.enemy,battle.subregionId)
 },[battle?.id,battle?.status,battle?.enemy,battle?.subregionId,screen,dungeonActive])
 // battle.status==='playing' + joinedBattle.current===battle.id garantem que só sincroniza a
 // vida do inimigo quando o combate na tela É essa batalha coop específica E ela ainda está
 // rolando -- sem essas duas checagens, um jogador que entra numa masmorra SOLO enquanto ainda
 // está numa sala coop (dungeon usa a mesma tela 'combat') tinha o monstro zerado na hora: o
 // objeto battle da sala fica preso no estado da ÚLTIMA luta coop (ex.: status 'won' e
 // enemyHp:0 de uma vitória anterior, já com joinedBattle.current apontando pro mesmo id de
 // quando essa luta ainda estava em andamento), e como esse efeito só checava screen==='combat',
 // ele aplicava esse 0 leftover no inimigo da masmorra solo antes do primeiro ataque.
 React.useEffect(()=>{if(!battle?.id||battle.status!=='playing'||typeof battle.enemyHp!=='number'||screen!=='combat'||joinedBattle.current!==battle.id||enemyHp===battle.enemyHp)return;sync(battle.enemyHp)},[battle?.id,battle?.status,battle?.enemyHp,screen,enemyHp,sync])
 // Negociador: quando um anúncio meu vira 'sold', credito o ouro localmente (funciona em
 // qualquer tela, não só com o Negociador aberto) e só então peço pra remover o anúncio da sala
 // -- settledSales evita creditar de novo caso settleMarketSale precise ser tentado mais de uma
 // vez (ex.: falha de rede na primeira remoção).
 React.useEffect(()=>{
  const mySales=market.filter(item=>item.status==='sold'&&item.sellerId===coop.userId&&!settledSales.current.has(item.id))
  if(!mySales.length)return
  for(const sale of mySales){settledSales.current.add(sale.id);receiveMarketSale(sale.price);void coop.settleMarketSale(sale.id)}
 },[market,coop.userId,receiveMarketSale,coop.settleMarketSale])
 // A cura prestada ao grupo (proc passivo em ataques + Brisa Revigorante da Druida) e o dano
 // resistido (mitigado por defesa/escudo/resistência/esquiva/interceptação de fera, somado em
 // workingResisted -- ver strike() em CoopContext.tsx) contam junto com o dano causado no
 // rateio de ouro/XP — quem manteve o time de pé também ajudou a vencer a batalha, seja curando
 // os aliados ou segurando os golpes por eles, não só quem bateu no inimigo (um tank não cura
 // nem causa tanto dano quanto um mago, por exemplo, mas sustenta o grupo do mesmo jeito).
 React.useEffect(()=>{if(battle?.status!=='won'||!battle.id||!battle.subregionId||!battle.enemy)return;const share=coopRewardShare(battle,coop.userId,coop.members.length);completeVictory(battle.id,battle.subregionId,battle.enemy,share)},[battle?.id,battle?.status,battle?.subregionId,battle?.enemy,battle?.damageByPlayer,battle?.healingByPlayer,battle?.damageResistedByPlayer,coop.userId,coop.members.length,completeVictory])
 React.useEffect(()=>{if(battle?.status!=='lost'||!battle.id||handledDefeat.current===battle.id)return;handledDefeat.current=battle.id;completeDefeat(battle.id)},[battle?.id,battle?.status,completeDefeat])
 React.useEffect(()=>{if(battle?.status!=='fled'||!battle.id||handledFlee.current===battle.id)return;handledFlee.current=battle.id;completeFlee(battle.id)},[battle?.id,battle?.status,completeFlee])
 // 900ms -> 2000ms: com várias pessoas de verdade lendo o log (em vez de só uma IA decidindo),
 // o turno do inimigo chegava rápido demais pra dar tempo de acompanhar o que tinha acabado de
 // acontecer. 2s é o mesmo mínimo pedido pra cada ação de batalha no coop (ver também o auto-
 // combate logo abaixo, em CombatScreen).
 React.useEffect(()=>{const key=`${battle?.id}:${battle?.turn}:${battle?.activeUserId}`;if(screen!=='combat'||battle?.activeUserId!=='enemy'||coop.room?.host_id!==coop.userId||handledEnemyTurn.current===key)return;const timer=setTimeout(()=>{handledEnemyTurn.current=key;void enemyExecutor.current()},2000);return()=>clearTimeout(timer)},[battle?.id,battle?.turn,battle?.activeUserId,screen,coop.room?.host_id,coop.userId])
 React.useEffect(()=>{const roll=battle?.lastRoll,key=`${battle?.id}:${battle?.turn}`;if(screen!=='combat'||roll?.attacker!=='enemy'||roll.targetUserId!==coop.userId||receivedRoll.current===key)return;receivedRoll.current=key;receiveEnemy(Number(roll.damage??0),roll)},[battle?.id,battle?.turn,battle?.lastRoll,screen,coop.userId,receiveEnemy])
 React.useEffect(()=>{const roll=battle?.lastRoll,key=`hero:${battle?.id}:${battle?.turn}`;if(screen!=='combat'||roll?.attacker!=='hero'||receivedHeroRoll.current===key)return;receivedHeroRoll.current=key;receiveHeroAction(Number(roll.damage??0),roll,roll.attackerUserId===coop.userId)},[battle?.id,battle?.turn,battle?.lastRoll,screen,coop.userId,receiveHeroAction])
 React.useEffect(()=>{
  const roll=battle?.lastRoll,key=`ability:${battle?.id}:${battle?.turn}`
  if(screen!=='combat'||roll?.attacker!=='ability'||receivedAbility.current===key)return
  receivedAbility.current=key
  const type=String(roll.effectType??'')
  if(type==='WARRIOR_BUFF'||type==='ARCANE_GROUP_BUFF'||type==='HUNTER_CRITICAL'||type==='SUMMON_BOND'||/escudo/i.test(type))receiveSupportFx('fortificacao')
  else if(type==='DRUID_HEAL'||type==='PRIEST_REVIVE')receiveSupportFx('cura')
  else if(type==='ITEM_CLEANSE'||/recuper/i.test(type))receiveSupportFx('cura-item')
  else if(Number(roll.damage)>0)receiveHeroAction(Number(roll.damage),{})
 },[battle?.id,battle?.turn,battle?.lastRoll,screen,receiveSupportFx,receiveHeroAction])
 React.useEffect(()=>{const roll=battle?.lastRoll,key=`heal:${battle?.id}:${battle?.turn}`;if(screen!=='combat'||!roll?.healAmount||roll.healTargetUserId!==coop.userId||receivedHeal.current===key)return;receivedHeal.current=key;receiveHeal(Number(roll.healAmount??0))},[battle?.id,battle?.turn,battle?.lastRoll,screen,coop.userId,receiveHeal])
 React.useEffect(()=>{const roll=battle?.lastRoll,key=`self:${battle?.id}:${battle?.turn}`;if(screen!=='combat'||!roll?.selfDamage||roll.selfDamageUserId!==coop.userId||receivedSelf.current===key)return;receivedSelf.current=key;receiveEnemy(Number(roll.selfDamage??0),{})},[battle?.id,battle?.turn,battle?.lastRoll,screen,coop.userId,receiveEnemy])
 // Capangas de chefe agora existem no coop também — cada um pode acertar um alvo diferente
 // do inimigo principal no mesmo turno, então aplica cada golpe relevante separadamente.
 React.useEffect(()=>{const rolls=battle?.minionRolls,key=`minions:${battle?.id}:${battle?.turn}`;if(screen!=='combat'||!Array.isArray(rolls)||!rolls.length||receivedMinions.current===key)return;receivedMinions.current=key;for(const roll of rolls)if(roll?.targetUserId===coop.userId)receiveEnemy(Number(roll.damage??0),roll)},[battle?.id,battle?.turn,battle?.minionRolls,screen,coop.userId,receiveEnemy])
 // Feras espectrais de Conjuradores atacam o inimigo compartilhado -- todo cliente conectado
 // (não só quem invocou a fera) precisa tremer o card do inimigo e mostrar o ícone de arma da
 // fera, igual ao solo, já que o inimigo (ao contrário de um capanga mirando um jogador
 // específico) é o mesmo para a mesa inteira.
 React.useEffect(()=>{const rolls=battle?.summonRolls,key=`summons:${battle?.id}:${battle?.turn}`;if(screen!=='combat'||!Array.isArray(rolls)||!rolls.length||receivedSummons.current===key)return;receivedSummons.current=key;for(const roll of rolls)receiveHeroAction(Number(roll.damage??0),{summonAttackType:roll.attackType})},[battle?.id,battle?.turn,battle?.summonRolls,screen,receiveHeroAction])
 React.useEffect(()=>{if(screen==='combat'&&useGame.getState().hp<=0&&battle?.activeUserId===coop.userId)void coop.coopAbility('Derrota',0,'não pode mais agir')},[screen,battle?.activeUserId,coop.userId])
 return null
}

const HUD_HEAL_POPUP_MS=1100 // duração do "+1" verde no HUD -- mais curta/sutil que a do mapa (ver heal-popup-rise-hud no CSS), cabe melhor no badge pequeno de vida

function TopBar(){
 const g=useGame();const auth=useAuth();const h=HEROES.find(x=>x.id===g.heroId);const level=levelInfo(g.xp).lvl,capacity=equipmentBagCapacity(g)
 const [menuOpen,setMenuOpen]=React.useState(false)
 const uiMode=useUiMode(),modernUi=uiMode==='modern'
 const uiModeLabel=modernUi?'Voltar à interface clássica':'Experimentar a interface moderna'
 const [muted,setMutedState]=React.useState(isAudioMuted())
 const toggleMute=()=>{const next=!muted;setAudioMuted(next);setMutedState(next)}
 const [reduceEffects,setReduceEffectsState]=React.useState(getReduceEffectsPref())
 const toggleReduceEffects=()=>{const next=!reduceEffects;setReduceEffectsPref(next);document.documentElement.classList.toggle('reduce-effects',next);setReduceEffectsState(next)}
 const [highContrast,setHighContrastState]=React.useState(getHighContrastPref())
 const toggleHighContrast=()=>{const next=!highContrast;setHighContrastPref(next);document.documentElement.classList.toggle('high-contrast',next);setHighContrastState(next)}
 const [bonusClock,setBonusClock]=React.useState(Date.now())
 const menuRef=React.useRef<HTMLDivElement>(null)
 const regenUntil=Number((g as any).regenBoostUntil??0),regenRemaining=Math.max(0,regenUntil-bonusClock)
 React.useEffect(()=>{if(regenUntil<=Date.now())return;setBonusClock(Date.now());const timer=setInterval(()=>setBonusClock(Date.now()),30000);return()=>clearInterval(timer)},[regenUntil])
 const regenMinutes=Math.max(1,Math.ceil(regenRemaining/60000))
 const [healPopups,setHealPopups]=React.useState<Array<{id:number}>>([])
 const healPopupIdRef=React.useRef(0)
 // Tônico da Regeneração Acelerada: existia há muito tempo só como contador visual (regenMinutes
 // acima) -- regenBoostUntil/lastPassiveHealAt eram gravados ao usar o item, mas nada lia de
 // volta pra aplicar a cura de fato. Checa a cada 1s (fino o bastante pra não perder o instante
 // dos 30s); tickPassiveRegen (game.ts) decide sozinho se cura de verdade.
 React.useEffect(()=>{
  if(regenUntil<=Date.now())return
  const id=window.setInterval(()=>{
   if(useGame.getState().tickPassiveRegen()){
    const popupId=++healPopupIdRef.current
    setHealPopups(prev=>[...prev,{id:popupId}])
    window.setTimeout(()=>setHealPopups(prev=>prev.filter(p=>p.id!==popupId)),HUD_HEAL_POPUP_MS)
   }
  },1000)
  return()=>window.clearInterval(id)
 },[regenUntil])
 React.useEffect(()=>{if(!menuOpen)return;const close=(event:MouseEvent)=>{if(menuRef.current&&!menuRef.current.contains(event.target as Node))setMenuOpen(false)};const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')setMenuOpen(false)};document.addEventListener('mousedown',close);document.addEventListener('keydown',closeOnEscape);return()=>{document.removeEventListener('mousedown',close);document.removeEventListener('keydown',closeOnEscape)}},[menuOpen])
 // No celular, o .topbar não é sticky (rola junto com a página, ver styles.css) -- o botão
 // "Menu" pode estar bem abaixo do topo quando o HUD quebra linha, então o dropdown (que abre
 // pra baixo dele) frequentemente ultrapassava o rodapé da tela. max-height:min(80vh,...) sozinho
 // não resolve porque não sabe o quanto de espaço realmente sobra ABAIXO do botão -- mede isso na
 // hora de abrir e usa como teto real (com o próprio overflow-y:auto do CSS cobrindo o resto).
 // Fecha ao rolar a página porque a posição do dropdown (absolute, não fixed) ficaria obsoleta.
 const [dropdownMaxHeight,setDropdownMaxHeight]=React.useState<number|undefined>(undefined)
 React.useEffect(()=>{
  if(!menuOpen)return
  const wrap=menuRef.current
  if(wrap){const bottom=wrap.getBoundingClientRect().bottom;setDropdownMaxHeight(Math.max(180,window.innerHeight-bottom-18))}
  const onScroll=()=>setMenuOpen(false)
  window.addEventListener('scroll',onScroll,{passive:true})
  return()=>window.removeEventListener('scroll',onScroll)
 },[menuOpen])
 const inCombat=g.screen==='combat'
 const navigationLocked=isNavigationLocked(g)
 const navigationLockTitle=inCombat?'Fuja da batalha para acessar outras telas.':'Escolha avançar ou encerrar a expedição antes de acessar outras telas.'
 React.useEffect(()=>{if(navigationLocked)setMenuOpen(false)},[navigationLocked])
 const goTo=(screen:string)=>{if(navigationLocked)return;g.setScreen(screen as any);setMenuOpen(false)}
 {/* No mobile (<=760px), .nav-tooltip vira legenda estática sempre visível abaixo do ícone
     (ver styles.css) -- não é mais um tooltip de :hover. Sempre mostrar o texto de bloqueio
     ali (navigationLocked?navigationLockTitle:label) fazia os 10 ícones do menu exibirem a
     mesma frase longa repetida em vez do nome de cada tela, uma vez que o herói entrasse em
     combate. O nome curto (label) fica sempre na legenda; o motivo do bloqueio continua
     disponível via title (tooltip nativo, funciona em hover e toque prolongado). */}
 return <header className="topbar">{modernUi?<nav className="nav-modern"><ModernNav screen={g.screen} locked={navigationLocked} lockTitle={navigationLockTitle} available={MODERN_AVAILABLE_SCREENS} labelOf={navLabel} onGo={(target)=>g.setScreen(target as any)}/><GuildHerald/></nav>:<nav>{nav.map(([id,label,Icon])=><button key={id} aria-label={label} disabled={navigationLocked} title={navigationLocked?navigationLockTitle:undefined} className={(g.screen===id||(id==='map'&&g.screen==='region'))?'active':''} onClick={()=>{if(navigationLocked)return;g.setScreen(id)}}><Icon size={18}/><span className="nav-tooltip">{label}</span></button>)}<GuildHerald/></nav>}<div className="hud"><span className="hud-vital" title="Vida atual e vida máxima"><Heart className="heart" fill="currentColor"/><strong>{g.hp}/{maxHp(g)}</strong>{healPopups.map(popup=><span key={popup.id} className="hud-heal-popup"><span className="heal-popup-plus1">+1</span></span>)}</span><span className="hud-vital hud-energy" title="Energia atual e máxima: habilidades e Fervor de Combate gastam; atacar (mais com crítico) e descansar na fogueira recuperam"><Zap size={16} aria-hidden/><strong aria-label={`Energia ${energyNow(g)} de ${championStats(g).energiaMaxima}`}>{energyNow(g)}/{championStats(g).energiaMaxima}</strong></span>{Boolean(g.pendingAttackBonus||g.shield||regenRemaining)&&<div className="hud-bonuses" aria-label="Bônus temporários ativos">{g.pendingAttackBonus>0&&<span className="hud-bonus bonus-attack" tabIndex={0} role="status" aria-label={`Bônus de ataque: mais ${g.pendingAttackBonus} no próximo combate`}><Sword size={16}/><b>+{g.pendingAttackBonus}</b><span className="bonus-tooltip"><strong>Força aumentada</strong><small>+{g.pendingAttackBonus} de Poder de ataque durante o próximo combate. O bônus será removido ao terminar a batalha.</small></span></span>}{g.shield>0&&<span className="hud-bonus bonus-shield" tabIndex={0} role="status" aria-label={`Escudo ativo: ${g.shield} pontos`}><ShieldHalf size={16}/><b>+{g.shield}</b><span className="bonus-tooltip"><strong>Proteção ativa</strong><small>{g.shield} pontos de Escudo disponíveis. Eles absorvem dano antes da Vida e permanecem para o próximo combate.</small></span></span>}{regenRemaining>0&&<span className="hud-bonus bonus-regen" tabIndex={0} role="status" aria-label={`Regeneração acelerada ativa por mais ${regenMinutes} minutos`}><FlaskConical size={16}/><b>{regenMinutes}m</b><span className="bonus-tooltip"><strong>Regeneração acelerada</strong><small>Recupera 1 ponto de Vida a cada 30 segundos fora de combate. Tempo restante aproximado: {regenMinutes} minuto{regenMinutes===1?'':'s'}.</small></span></span>}</div>}<span className="hud-resource hud-bag" title={`${g.equipmentBag.length} equipamentos guardados em ${capacity} espaços`}><Backpack size={17}/><strong>{g.equipmentBag.length}/{capacity}</strong></span><span className="hud-resource hud-gold" title={`${g.gold} moedas de ouro`}><Coins size={17}/><strong><AnimatedNumber value={g.gold}/></strong></span>{(modernUi||(g.crystals??0)>0)&&<span className="hud-resource hud-crystals" title={crystalsLabel(g.crystals??0)}><CrystalIcon/><strong>{g.crystals??0}</strong></span>}<span className="hud-level" title={`${g.xp} de experiência total`}>{React.createElement(heroClassIcons[g.heroId??'']??Sparkles,{size:16})}<small>NÍVEL</small><strong><AnimatedNumber value={level}/></strong></span><div className="brand">Bangalore's</div><button className={`ui-mode-toggle${modernUi?' active':''}`} onClick={toggleUiMode} aria-pressed={modernUi} aria-label={uiModeLabel} title={uiModeLabel}><LayoutDashboard size={16}/><span>{modernUi?'Moderna':'Clássica'}</span></button><div className="menu-dropdown-wrap" ref={menuRef}><button className="menu-mini" disabled={navigationLocked} title={navigationLocked?navigationLockTitle:undefined} aria-haspopup="true" aria-expanded={menuOpen} onClick={()=>setMenuOpen(o=>!o)}><Menu size={18}/>Menu<ChevronDown size={14} className={'menu-caret'+(menuOpen?' open':'')}/></button>{menuOpen&&<div className="menu-dropdown" role="menu" style={dropdownMaxHeight?{maxHeight:dropdownMaxHeight}:undefined}>
   {auth.user?.email&&<div className="menu-dropdown-account" title={auth.user.email}><Mail size={13}/><span>{auth.user.email}</span></div>}
   {navigationLocked&&<p className="menu-dropdown-notice">{navigationLockTitle}</p>}
   <div className="menu-dropdown-screens">{nav.map(([id,label,Icon])=><button key={id} role="menuitem" disabled={navigationLocked} title={navigationLocked?navigationLockTitle:undefined} className={g.screen===id?'active':''} onClick={()=>goTo(id)}><Icon size={16}/><span>{label}</span></button>)}</div>
   <div className="menu-dropdown-divider"/>
   <button role="menuitem" onClick={toggleMute}>{muted?<VolumeX size={16}/>:<Volume2 size={16}/>}<span>{muted?'Ativar sons':'Desativar sons'}</span></button>
   <button role="menuitem" onClick={toggleReduceEffects} title="Reduz tremores de combate, brilhos e animações de cartas para uma experiência mais tranquila"><Zap size={16}/><span>{reduceEffects?'Efeitos visuais completos':'Reduzir efeitos visuais'}</span></button>
   <button role="menuitem" onClick={toggleHighContrast} title="Aumenta o contraste de textos e bordas para facilitar a leitura"><Contrast size={16}/><span>{highContrast?'Desativar alto contraste':'Ativar alto contraste'}</span></button>
   <button role="menuitem" onClick={()=>{toggleUiMode();setMenuOpen(false)}} title="Alterna entre a interface clássica e a interface moderna (a escolha fica salva neste navegador)"><LayoutDashboard size={16}/><span>{uiModeLabel}</span></button>
   <div className="menu-dropdown-divider"/>
   <button role="menuitem" className="menu-dropdown-exit" onClick={()=>goTo('menu')}><ArrowLeftRight size={16}/><span>Trocar de campanha</span></button>
   <button role="menuitem" className="menu-dropdown-exit" onClick={()=>goTo('menu')}><LogOut size={16}/><span>Sair do jogo</span></button>
   {onlineConfigured&&<button role="menuitem" className="menu-dropdown-exit" onClick={()=>{setMenuOpen(false);void auth.signOut()}}><KeyRound size={16}/><span>Sair da conta</span></button>}
 </div>}</div></div></header>}

const TUTORIAL_CHAPTERS=[
 ['História de Havendown','Havendown é um reino dividido por guerras, monstros e antigas forças arcanas. Como aventureiro, você atravessa regiões cada vez mais perigosas, ajuda a Guilda e reúne poder para enfrentar os soberanos do Reino do Sol Negro.'],
 ['Primeiros passos e acessos','Use o menu superior para abrir Mapa, Ficha, Mochila, Equipamentos, Loja, Forja, Guilda, Crônicas, Coleção, Coop e este Tutorial. Passe o mouse sobre cada ícone para ver o nome da tela (no celular, o nome já aparece embaixo do ícone). A tecla Esc retorna ao mapa; durante uma batalha, ela abre a confirmação da tentativa de fuga. O menu (botão "Menu", no canto superior direito) também tem um interruptor de sons — o jogo tem efeitos sonoros de clique, combate, forja e espólio, e podem ser desativados a qualquer momento sem perder progresso.'],
 ['Heróis, classes e atributos','Nove heróis estão disponíveis — Guerreiro, Guardião, Caçadora, Arcanista, Druida, Caçador, Monge, Sacerdotisa e Conjurador —, cada um com identidade, passiva e equipamentos preferidos. Força alimenta os ataques físicos e Magia os mágicos, curas, escudos e reforços; Vigor define a Vida Máxima e a resistência a elementos e efeitos; Destreza dá esquiva e iniciativa. A Armadura vem só do equipamento. Cada habilidade ativa gasta Energia, que começa cheia em cada batalha. Subir de nível concede pontos para distribuir na Ficha.'],
 ['Mapa-mundi e viagem rápida','No mapa-mundi, os marcadores abrem regiões diretamente. A viagem rápida (clicar num marcador ou num nome da lista lateral) só fica liberada para Planícies de Alvora, que está sempre aberta de qualquer lugar, e para a região onde você está; as demais só são alcançadas caminhando pelas passagens entre os mapas navegáveis, descritas a seguir. Marcadores verdes indicam chefes já derrotados; o cadeado mostra destinos ainda bloqueados.'],
 ['Mapas navegáveis, NPCs e saídas','As regiões de Havendown são mapas navegáveis, no estilo de um RPG clássico: use WASD ou as setas para caminhar, ou clique num ponto do mapa para o personagem seguir até lá sozinho. Marcadores no formato de losango abrem sub-regiões; personagens parados no mapa (como Brenna da Guilda, Borin da Forja e os vendedores especializados) bloqueiam passagem e conversam ao se aproximar (clique ou tecla E/Enter) — um balão de alerta avisa quando há missão, forja ou compra disponível. Marcadores de seta levam direto para a região vizinha, sem precisar voltar ao mapa-mundi. Cada passo tem uma chance de emboscada: ao ser emboscado, escolha tentar fugir (mesma chance da fuga em combate) ou aceitar o desafio. Regiões sem mapa navegável ainda usam a grade de sub-regiões tradicional.'],
 ['Exploração e eventos','Durante a viagem surgem encontros com história, objetivo, recompensa e risco. Leia os efeitos antes de aceitar. Algumas abordagens especiais dependem da classe ou de características do herói.'],
 ['Combate e turnos','Em seu turno, ataque, use a habilidade do herói, ative uma habilidade de equipamento, consuma um item, assuma a postura defensiva ou tente fugir. A postura defensiva concede +20% de Armadura (e −20% de Poder de ataque) contra qualquer golpe (incluindo capangas) e dura até o fim da batalha ou até ser desativada; a primeira ativação de cada batalha não consome o turno, então você ainda pode agir depois — reativá-la mais tarde já custa o turno normalmente. A Energia sobe a cada ataque normal (mais com crítico) e ao descansar na fogueira; o Fervor de Combate gasta Energia em um ataque crítico garantido, e as habilidades do herói também custam Energia. Buffs e debuffs de habilidades de herói (como Ímpeto Marcial, Ascensão Arcana e Marca do Predador) duram no máximo 3 turnos consecutivos — Marca do Predador dura 2 — e se dissipam sozinhos ao final desse período. Chefes podem mudar de fase, convocar capangas e fazer cada capanga atacar em seu próprio turno.'],
 ['Dados de ataque e defesa','O dado vermelho representa ataque e o azul representa defesa. No ataque: 1 causa falha crítica, 2 concede vantagem ao inimigo, 3–4 é normal, 5 fortalece e 6 causa crítico. Na defesa: 1 agrava, 2 adiciona dano, 3–4 é normal, 5 reduz 1 e 6 reduz o dano pela metade.'],
 ['Elementos e condições','Armas podem ter um elemento de ataque (físico, fogo, gelo, natureza, sombra, luz ou arcano) e cada acerto crítico (rolagem 6) tem 50% de chance de aplicar a condição daquele elemento no alvo: Sangrando (físico, 2 turnos) e Envenenado (natureza, 3 turnos) causam dano ao fim de cada turno e podem se acumular com reaplicações; Pegando fogo (fogo) causa uma explosão única de dano em 1 turno; Congelado (gelo) e Agarrado (sombra) penalizam todas as rolagens de ataque e defesa do afetado por 2 turnos; Cego (luz) penaliza as rolagens por 1 turno; Atordoado (arcano) cancela a próxima defesa do alvo ou faz com que perca a próxima ação (uso único). O badge de status durante o combate mostra quantos turnos restam (ex.: "Congelado ×2"), atualizado a cada rodada. Equipamentos de defesa podem ter resistência a um elemento, o que bloqueia a condição correspondente e reduz o dano recebido daquele tipo de ataque. Essas propriedades nunca vêm da Loja: só surgem ao forjar um item com sucesso (o elemento reflete a afinidade da sua classe) ou ao derrotar um chefe, que às vezes derruba equipamento já imbuído com o elemento da região.'],
 ['Fuga e derrota','Na fuga, 5–6 permite escapar, 4 mantém sua ação e 1–3 perde o turno. Ao ser derrotado, você perde 30% do ouro e há 20% de chance de perder um equipamento. Se a bolsa for perdida, todos os equipamentos guardados nela também são destruídos; consumíveis permanecem.'],
 ['Espólios e progressão','Vitórias concedem ouro, experiência, materiais e chance de itens apropriados ao nível do inimigo. Monstros fortes oferecem melhores recompensas. Chefes liberam progresso regional e podem ser desafiados novamente pelo sistema de Vingança.'],
 ['Mochila, bolsas e consumíveis','A mochila separa consumíveis dos equipamentos guardados. Bolsas equipadas determinam a quantidade de espaços. Consumíveis não ocupam esses espaços e podem curar ou conceder bônus temporários e permanentes.'],
 ['Equipamentos, classes e conjuntos','Cada slot aceita um tipo de item. Armas favorecem classes específicas e podem aplicar penalidade fora da afinidade; equipamentos exclusivos não podem ser usados por outra classe. Alguns conjuntos de armadura são exclusivos de duas ou três classes aparentadas ao mesmo tempo (ex: Sacerdotisa e Druida, Arcanista e Conjurador, Monge/Caçadora/Caçador) — o mesmo item veste todas elas, mas com uma variação sutil de atributos por classe. Compare atributos e habilidades antes de substituir um item. Conjuntos, elementos, condições e pedras ampliam as combinações.'],
 ['Comércio e carrinho','Na Loja, filtre por categoria e adicione itens ao carrinho. Ouro e produtos só são transferidos após Confirmar compra. O sistema valida dinheiro, nível, classe e espaço da bolsa. No modo de venda, a transação continua direta. Mira Bellwether, a mercadora, recebe você no topo da tela e comenta sobre sua carteira e o andamento da campanha.'],
 ['Forja, receitas e experiência','Desmonte equipamentos para obter materiais físicos, mágicos e pedras. Receitas exigem nível de Forjador e nível de Jogador (peças mais fortes pedem os dois mais altos). A partir de Incomum, fabricar sem bônus também sacrifica peças prontas de uma raridade abaixo (Incomum pede 1 Comum, Raro 2 Incomuns, Épico 3 Raros, Lendário 3 Épicos). Escolher um atributo ou efeito especial não cria uma peça nova: refina uma cópia sem bônus que você já possui, permanentemente. Toda tentativa concede experiência de Forja; falhas consomem metade dos materiais e das peças sacrificadas, sem produzir nada. Borin Fenrick, o mestre ferreiro, acompanha o trabalho na bancada. A tela da Forja tem um tutorial completo com o passo a passo, incluindo o serviço de sintonia elemental (sintonizar o dano da arma ou dar resistência a outras peças equipadas, por 80 de ouro e 3 materiais da afinidade).'],
 ['Aprimoramentos e encaixes','Equipamentos podem ser aprimorados até +3 e receber pedras dentro do limite de encaixes. Cada nível de aprimoramento custa ouro e materiais e tem sua própria chance de sucesso: +1 é provável, +2 é raro e +3 é uma aposta de fim de jogo. Falhar em +2 ou +3 pode regredir o nível atual da peça, e toda falha consome metade dos materiais. Pedras concedem bônus especializados. Desmontar ou perder o item também remove aprimoramentos, pedras e efeitos forjados vinculados a ele.'],
 ['Guilda e ranking de aventureiro','A Guilda oferece dezenas de contratos, organizados por rank exigido, e organiza a campanha. Complete missões para ganhar reputação e avançar pelos ranks Ferro, Bronze, Prata, Ouro, Platina, Diamante e Campeão. Contratos melhores exigem ranks maiores. Brenna Ashcombe, a Mestra da Guilda, recebe você na tela e comenta sobre contratos ativos, chefes derrotados e sequências de derrota.'],
 ['Missões da Guilda','Há missões para derrotar criaturas, caçar alvos específicos, vencer chefes, entregar equipamentos e coletar materiais regionais. Acompanhe a missão ativa no mapa e use a viagem rápida para alcançar a região indicada. Ao concluir uma missão, um desafio mais difícil ocupa seu lugar. O sino ao lado do ícone do Tutorial, no menu superior, avisa quando a Guilda tem algo para você — inclusive contratos que você ainda nem aceitou, mas já pode entregar de imediato porque o item ou material pedido já está com você.'],
 ['Masmorras','Masmorras são sequências de combates com profundidade crescente. Quanto mais longe o aventureiro avança, maiores são o perigo e as recompensas. Você pode encerrar a expedição e preservar os espólios já conquistados.'],
 ['Talentos e habilidades','A Árvore de Talentos fica na Ficha. Talentos são liberados por nível e especializam o herói. No modo solo, a habilidade do herói e a habilidade de equipamento podem ser usadas uma vez por combate; observe quando os botões ficam disponíveis. No cooperativo, a habilidade do herói pode ser usada uma vez por jogador presente na sala, enquanto a habilidade de equipamento continua com um único uso por batalha, compartilhado entre todo o grupo.'],
 ['Modo cooperativo','Na tela Coop, crie uma sala ou entre com um código, escolha seu herói e fique pronto. O anfitrião define o destino e todos precisam aceitar a viagem para a batalha começar. A ordem de ataque é sorteada entre o grupo e o inimigo; cada jogador age só no seu turno, mas todos acompanham o combate em tempo real, com miniaturas mostrando a vida atual dos colegas. Fugir com sucesso encerra a batalha para o grupo inteiro, não apenas para quem tentou. Ao vencer, ouro e experiência são divididos proporcionalmente à contribuição de cada jogador — dano causado, somado à cura realizada e ao dano resistido (mitigado por defesa, escudo ou resistência) —, não em partes iguais.'],
 ['Campanhas e salvamento','O progresso é salvo automaticamente no navegador. É possível criar campanhas com heróis diferentes, carregar uma campanha anterior ou excluí-la no menu inicial. O salvamento é local ao navegador e dispositivo utilizados.'],
 ['Coleção e leitura das cartas','A Coleção reúne as cartas descobertas de heróis, equipamentos, consumíveis, monstros, elites, chefes e eventos. Clique na arte para ampliar e consultar detalhes. Os ícones identificam classe, afinidade ou categoria do inimigo.']
] as const
const TUTORIAL_ADVANCED=[
 {title:'Especializações e identidade da build',text:'Além dos atributos e 12 talentos, cada herói toma decisões de especialização nos níveis 10, 25, 50 e 75. Cada escolha favorece um estilo diferente e pode ser redefinida mediante custo.',bullets:['Confira passiva, habilidade ativa e afinidades da classe.','Use o resumo de build nas Crônicas para conferir conjuntos, elemento, resistências e bônus ativos.']},
 {title:'Intenções, chefes e capangas',text:'O inimigo anuncia a intenção da próxima ação: ataque, golpe pesado, guarda, condição, convocação ou recuperação. Use essa informação para decidir entre atacar, defender ou consumir um recurso.',bullets:['Chefes mudam de fase e podem recuperar vida ou convocar capangas.','Capangas têm alvo próprio; eliminar a ameaça certa pode ser melhor que atacar o chefe.']},
 {title:'Bestiário e domínio da coleção',text:'Vencer a mesma criatura desbloqueia marcos no bestiário: primeiro suas estatísticas, depois afinidades e, por fim, bônus de dano. Descobertas na Coleção também concedem recompensas permanentes.',bullets:['Bestiário: 1 vitória revela atributos, 3 revelam afinidade e 5 concedem +1 de dano.','Coleção: 25 descobertas dão +5 de Vida, 100 dão +1 de Poder de ataque e 250 dão +1 de Vigor.']},
 {title:'Sintonia elemental e combinações avançadas',text:'A Forja permite sintonizar equipamentos com elementos e resistências. Combine isso com pedras, aprimoramentos, efeitos forjados e conjuntos para preparar respostas específicas a cada região.',bullets:['Resistência reduz o dano elemental e bloqueia sua condição.','Leia o resumo da build e a ficha do inimigo antes de trocar uma peça.']},
] as const

const QUICK_START=[
 ['1','Escolha um destino','No Mapa, procure uma sub-região do seu nível.'],
 ['2','Prepare-se','Equipe as melhores peças e leve itens de cura.'],
 ['3','Leia o inimigo','Durante a luta, observe intenção, elemento e condições.'],
 ['4','Evolua','Distribua atributos, escolha talentos e aceite contratos.'],
 ['5','Crie sua build','Use conjuntos, Forja, especializações e resistências.'],
] as const

function TutorialScreen(){
 const g=useGame()
 const chapters=[...TUTORIAL_CHAPTERS.map(([title,text])=>({title,text,bullets:[] as readonly string[]})),...TUTORIAL_ADVANCED]
 const [open,setOpen]=React.useState<number[]>([0])
 const toggle=(index:number)=>setOpen(current=>current.includes(index)?current.filter(i=>i!==index):[...current,index])
 return <div className="tutorial-page">
  <header className="tutorial-hero"><BookOpen/><div><span className="eyebrow">MANUAL DO AVENTUREIRO</span><h1>Aprenda Bangalore's</h1><p>Dos primeiros passos às builds avançadas: consulte uma regra ou refaça o passeio guiado pelas telas.</p></div></header>
  <section className="tutorial-start"><div className="tutorial-start-head"><div><span className="eyebrow">ROTA RECOMENDADA</span><h2>Seu início em 5 passos</h2></div><button className="primary" onClick={g.startTour}><Sparkles size={15}/>Iniciar tour guiado</button></div><div className="tutorial-start-grid">{QUICK_START.map(([number,title,text])=><article key={number}><b>{number}</b><div><strong>{title}</strong><p>{text}</p></div></article>)}</div></section>
  <div className="tutorial-tools"><strong>Manual por assunto</strong><span>{chapters.length} capítulos para consulta</span><button onClick={()=>setOpen(chapters.map((_,i)=>i))}>Abrir todos</button><button onClick={()=>setOpen([])}>Recolher todos</button></div>
  <section className="tutorial-chapters">{chapters.map(({title,text,bullets},index)=>{const expanded=open.includes(index);return <article className={expanded?'open':''} key={title}><button aria-expanded={expanded} onClick={()=>toggle(index)}><span>{String(index+1).padStart(2,'0')}</span><strong>{title}</strong><ChevronDown/></button>{expanded&&<motion.div className="tutorial-chapter-body" initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}}><p>{text}</p>{bullets.length>0&&<ul>{bullets.map(item=><li key={item}>{item}</li>)}</ul>}</motion.div>}</article>})}</section>
 </div>
}
// Elementos comuns às telas iniciais (menu e login): canto superior direito com o botão de alternar
// a interface e o "Sair da conta", e o logotipo do modo Moderno (no Clássico o logotipo mora dentro
// do cartão e este bloco fica oculto pelo CSS).
function MenuChrome(){
 const auth=useAuth(),modern=useUiMode()==='modern'
 const label=modern?'Voltar à interface clássica':'Experimentar a interface moderna'
 return <><div className="menu-corner"><button className={`ui-mode-toggle${modern?' active':''}`} onClick={toggleUiMode} aria-pressed={modern} aria-label={label} title={label}><LayoutDashboard size={16}/><span>{modern?'Moderna':'Clássica'}</span></button>{onlineConfigured&&auth.user&&<button className="menu-account-exit" onClick={()=>void auth.signOut()} title={`Conectado como ${auth.user.email}. Clique para sair e trocar de conta.`}><KeyRound size={14}/><span>Sair da conta</span></button>}</div><div className="menu-logo ui-modern-only"><div className="brand big">Bangalore's</div><small>A GUERRA POR HAVENDOWN</small></div></>
}
function AuthScreen(){
 const auth=useAuth()
 const [mode,setMode]=React.useState<'signin'|'signup'|'reset'>('signin')
 const [email,setEmail]=React.useState('')
 const [password,setPassword]=React.useState('')
 const [notice,setNotice]=React.useState('')
 const changeMode=(next:typeof mode)=>{setMode(next);auth.clearError();setNotice('')}
 const submit=async(event:React.FormEvent)=>{
  event.preventDefault()
  setNotice('')
  if(mode==='reset'){if(await auth.resetPassword(email))setNotice('Se este e-mail tiver uma conta, enviamos um link para redefinir a senha.');return}
  if(mode==='signup'){const result=await auth.signUp(email,password);if(result==='pending')setNotice('Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.');return}
  await auth.signIn(email,password)
 }
 return <div className="hero-bg menu-hero"><div className="menu-atmosphere"/><MenuChrome/><section className="menu-card auth-card">
  <p className="menu-eyebrow ui-classic-only">AS CRÔNICAS DE HAVENDOWN</p>
  <p className="menu-eyebrow ui-modern-only">PORTAL DE HAVENDOWN</p>
  <div className="brand big ui-classic-only">Bangalore's</div>
  <div className="menu-divider ui-classic-only"><span/></div>
  <p className="tagline">{mode==='signup'?'Crie sua conta':mode==='reset'?'Recuperar senha':'Entre para continuar'}</p>
  <p className="menu-intro">Sua conta guarda o progresso das suas campanhas com segurança, mesmo que você troque de navegador ou apague os dados deste dispositivo.</p>
  <div className="auth-tabs ui-modern-only" role="tablist" aria-label="Acesso à conta">{([['signin','Entrar'],['signup','Criar conta'],['reset','Recuperar senha']] as const).map(([id,label])=><button key={id} type="button" role="tab" aria-selected={mode===id} className={mode===id?'active':''} onClick={()=>changeMode(id)}>{label}</button>)}</div>
  <form className="auth-form" onSubmit={submit}>
   <label className="field"><span className="field-label"><Mail size={15}/>E-mail</span><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@exemplo.com"/></label>
   {mode!=='reset'&&<label className="field"><span className="field-label"><Lock size={15}/>Senha</span><input type="password" required minLength={6} autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"/></label>}
   {auth.error&&<p className="auth-error">{auth.error}</p>}
   {notice&&<p className="auth-notice">{notice}</p>}
   <button className="primary" type="submit" disabled={auth.busy}>{auth.busy?'Aguarde...':mode==='signup'?'Criar conta':mode==='reset'?'Enviar link de recuperação':'Entrar'}</button>
  </form>
  <div className="auth-links ui-classic-only">
   {mode==='signin'&&<><button className="ghost-action" onClick={()=>changeMode('signup')}><KeyRound size={15}/>Criar uma conta nova</button><button className="link-action" onClick={()=>changeMode('reset')}>Esqueci minha senha</button></>}
   {mode==='signup'&&<button className="link-action" onClick={()=>changeMode('signin')}>Já tenho conta, entrar</button>}
   {mode==='reset'&&<button className="link-action" onClick={()=>changeMode('signin')}>Voltar para o login</button>}
  </div>
 </section><aside className="menu-scene-caption"><small>A GUERRA POR HAVENDOWN</small><strong>O reino precisa de um novo campeão.</strong></aside></div>
}
function AuthGate({children}:{children:React.ReactNode}){
 const auth=useAuth()
 if(!onlineConfigured)return <>{children}</>
 if(auth.status==='loading')return <div className="hero-bg menu-hero"><div className="menu-atmosphere"/><section className="menu-card auth-card"><p className="menu-eyebrow">AS CRÔNICAS DE HAVENDOWN</p><div className="brand big">Bangalore's</div><p className="tagline">Carregando sua conta...</p></section></div>
 if(auth.status==='signedOut')return <AuthScreen/>
 return <>{children}</>
}
function MainMenu(){const g=useGame();const campaigns=Object.entries(g.campaigns).sort(([,a],[,b])=>(b.savedAt??0)-(a.savedAt??0));return <div className="hero-bg menu-hero"><div className="menu-atmosphere"/><MenuChrome/><section className={`menu-card${campaigns.length?' menu-with-campaigns':''}`}><p className="menu-eyebrow ui-classic-only">AS CRÔNICAS DE HAVENDOWN</p><div className="brand big ui-classic-only">Bangalore's</div><div className="menu-divider ui-classic-only"><span/></div><p className="tagline ui-classic-only">Um RPG de cartas, escolhas e conquistas</p><p className="menu-eyebrow ui-modern-only">SUA AVENTURA</p><h2 className="menu-headline ui-modern-only">O reino ainda resiste.</h2><div className="screen-intro"><small className="ui-classic-only">COMECE PELO ESSENCIAL</small><p className="ui-classic-only">Escolha um herói, leia a identidade da classe e siga por uma campanha que combine com seu estilo de jogo.</p><div className="screen-actions">{g.heroId&&g.activeCampaignId&&<button className="primary" onClick={()=>{g.continueGame();landOnCampIfModern()}}>Continuar campanha atual</button>}<button onClick={()=>g.setScreen('select')}>Nova campanha</button><button className="ghost-action" onClick={()=>g.setScreen('cardCreator')}><Wand2 size={17}/>Criador de cartas</button></div></div>{campaigns.length>0&&<section className="campaign-library"><div className="campaign-library-title"><span>Campanhas salvas</span><small>{campaigns.length} {campaigns.length===1?'campanha':'campanhas'}</small></div><div className="campaign-list">{campaigns.map(([id,save])=>{const campaignHero=HEROES.find(hero=>hero.id===save.heroId),level=levelInfo(save.xp??0).lvl,active=id===g.activeCampaignId;return <article className={active?'active':''} key={id}><img src={campaignHero?assetUrl(cardArt(campaignHero)):''} alt=""/><div><strong>{campaignHero?.nome??'Herói desconhecido'}</strong><span>Nível {level} • {save.territory??'Planícies de Alvora'}</span><small>{active?'Campanha atual':`Salva em ${new Date(save.savedAt).toLocaleString('pt-BR')}`}</small></div><button className="campaign-load" onClick={()=>{g.loadCampaign(id);landOnCampIfModern()}}>{active?'Continuar':'Carregar'}</button><button className="campaign-delete" title="Excluir campanha" aria-label={`Excluir campanha de ${campaignHero?.nome??'herói'}`} onClick={()=>window.confirm('Excluir permanentemente esta campanha?')&&g.deleteCampaign(id)}>×</button></article>})}</div></section>}{campaigns.length>0&&<button className="danger-link clear-campaigns" onClick={()=>window.confirm('Apagar todas as campanhas salvas?')&&g.clearSave()}>Apagar todas as campanhas</button>}<p className="save-note"><span>◆</span> {onlineConfigured?'Cada campanha é salva automaticamente e sincronizada com a sua conta.':'Cada campanha é salva automaticamente neste navegador.'}</p></section><aside className="menu-scene-caption"><small>A GUERRA POR HAVENDOWN</small><strong>O reino precisa de um novo campeão.</strong></aside></div>}
function HeroSelect(){const g=useGame(),uiMode=useUiMode();return uiMode==='modern'?<HeroSelectModern assetUrl={assetUrl} classLabel={id=>classNames[id]??id} onBack={()=>g.setScreen('menu')} onConfirm={id=>g.newGame(id)}/>:<HeroSelectClassic/>}
function HeroSelectClassic(){const g=useGame();const [selected,setSelected]=React.useState<(typeof HEROES)[number]>();const [detailsId,setDetailsId]=React.useState<string>();const detailsOpener=React.useRef<HTMLElement|null>(null);const confirmRef=React.useRef<HTMLButtonElement>(null);const detailsCard=detailsId?championCardForKit(detailsId):undefined,selectedCard=selected?championCardForKit(selected.id):undefined;React.useEffect(()=>{if(!selected||detailsId)return;confirmRef.current?.focus();const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setSelected(undefined)};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[selected,detailsId]);const openDetails=(id:string,event:React.MouseEvent)=>{detailsOpener.current=event.currentTarget as HTMLElement;setDetailsId(id)},closeDetails=()=>{setDetailsId(undefined);detailsOpener.current?.focus()};return <div className="select-page"><button className="hero-select-back" onClick={()=>g.setScreen('menu')}><ArrowLeft/>Voltar ao menu</button><div className="section-title"><h1>Escolha seu herói</h1><p>Compare os números de cada classe e clique na imagem para selecionar. A escolha é permanente nesta campanha.</p></div><div className="hero-grid">{HEROES.map((h,index)=><motion.article {...rarityMotionProps('heroico',index*.045)} whileHover={rarityHoverLift('heroico')} whileTap={effectsReduced()?undefined:{scale:.985}} className="hero-card hero-choice-card" key={h.id}><button className="hero-select-image" onClick={()=>setSelected(h)} aria-label={`Selecionar ${h.nome}`}><img src={assetUrl(cardArt(h))} alt={h.nome}/><span>Selecionar herói</span></button><div className="hero-choice-copy"><h2>{classNames[h.id]??h.nome}</h2><p className="hero-choice-fullname">{h.nome}</p>{championCardForKit(h.id)&&<HeroKitSummary data={championCardForKit(h.id)!} onOpenDetails={event=>openDetails(h.id,event)}/>}</div></motion.article>)}</div>{selected&&<div className="hero-confirm-overlay" role="presentation" onClick={()=>setSelected(undefined)}><section className="hero-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="hero-confirm-title" onClick={event=>event.stopPropagation()}><img src={assetUrl(cardArt(selected))} alt=""/><div><small>CONFIRMAR PERSONAGEM</small><h2 id="hero-confirm-title">Escolher {selected.nome}?</h2>{selectedCard&&<p className="hero-confirm-summary">{selectedCard.habilidade.nome} · {formatStatNumber(selectedCard.habilidade.custoEnergia)} de Energia · Vida {formatStatNumber(selectedCard.vida.max)} · Armadura {formatStatNumber(selectedCard.armadura.valor)}</p>}<div><button onClick={()=>setSelected(undefined)}>Voltar</button><button ref={confirmRef} className="primary" onClick={()=>g.newGame(selected.id)}>Iniciar aventura</button></div></div></section></div>}{detailsCard&&<ChampionDetailsDialog data={detailsCard} onClose={closeDetails}/>}</div>}
const STORY_ACT_CINEMATIC:Record<number,string>={1:'act-01-havendown',2:'act-02-forge',3:'act-03-flame-crown',4:'act-04-black-sun'}
function storyChapterArt(chapter:(typeof STORY_CHAPTERS)[number]){if(chapter.id==='epilogo_luz')return'ending-dawn';if(chapter.id==='epilogo_sombra')return'ending-throne';return STORY_ACT_CINEMATIC[chapter.act]}
function StoryCinematic({name}:{name?:string}){const[failed,setFailed]=React.useState(false);if(!name||failed)return null;return <img className="story-campaign-art" src={assetUrl(`assets/story/cinematics/${name}.webp`)} alt="" onError={()=>setFailed(true)}/>}
function StoryCampaignPanel(){const g=useGame(),chapter=STORY_CHAPTERS.find(c=>c.id===g.storyChapterId)??STORY_CHAPTERS[0],progress=storyRequirementProgress(g);return <section className="panel story-campaign"><StoryCinematic name={storyChapterArt(chapter)}/><h2 className="panel-title">Ato {chapter.act} • {chapter.title}</h2><span className="story-region">{chapter.region}</span><blockquote><strong>{chapter.speaker}</strong><p>“{chapter.dialogue}”</p></blockquote>{chapter.requirement&&<div className={`story-objective ${progress.complete?'complete':''}`}><span>{progress.complete?'✓':'◆'}</span><div><strong>{chapter.requirement.label}</strong><small>{progress.current}/{progress.required} concluído</small><i style={{width:`${progress.current/progress.required*100}%`}}/></div></div>}{g.storyNotice&&<p className="story-notice">Consequência: {g.storyNotice}</p>}<div className="story-choices">{chapter.choices.length?chapter.choices.map(choice=><button key={choice.id} disabled={!progress.complete} title={!progress.complete?`Cumpra o objetivo do capítulo (${chapter.requirement?.label}) para decidir.`:undefined} onClick={()=>g.chooseStory(choice.id)}><strong>{choice.text}</strong><small>{choice.consequence}</small></button>):<div className="story-ending"><Trophy/><strong>Campanha narrativa concluída</strong><small>Suas decisões permanecem registradas nesta campanha.</small></div>}</div></section>}
function ForgeSalvagePanel(){const g=useGame();return <section className="panel salvage-panel"><h2 className="panel-title">Oficina de desmontagem e encaixes</h2><div className="salvage-wallet">{[...FORGE_MATERIALS,...FORGE_GEMS].map(m=><span key={m.id}><b>{g.materials[m.id]??0}</b><small>{m.nome}</small></span>)}</div><div className="salvage-list">{g.equipmentBag.map((id,index)=>{const item=equipmentByRef(id);if(!item)return null;const preview=dismantlePreview(item);return <article key={`${id}-${index}`}><ArtPreview className="forge-item-art" image={cardArt(item)} name={item.nome} text={item.habilidade}/><div><strong>{item.nome}</strong><small>Rende {preview.physical} físico • {preview.magical} mágico • {Math.round(preview.gemChance*100)}% de pedra</small></div><button className="danger-action" onClick={()=>g.dismantleEquipment(id)}>Desmontar</button></article>})}</div><h3>Encaixes dos equipamentos ativos</h3><p className="socket-warning">Pedras instaladas ficam fixas no item: removê-las as destrói, em vez de devolvê-las ao inventário para reaproveitar em outro equipamento.</p><div className="socket-list">{Object.values(g.equipped).map(id=>{const item=equipmentByRef(id);if(!item)return null;const capacity=equipmentSocketCount(item),installed=g.equipmentGems[id!]??[];return <article key={id}><ArtPreview className="forge-item-art" image={cardArt(item)} name={item.nome} text={item.habilidade}/><strong>{item.nome}</strong><small>{installed.length}/{capacity} encaixes utilizados</small><div className="socket-row">{Array.from({length:capacity}).map((_,i)=>{const gem=FORGE_GEMS.find(x=>x.id===installed[i]),locked=i===0&&g.forgedGemLocked?.[id!];return gem?locked?<span key={i} className="gem-locked" title="Pedra forjada no item: só sai desmontando.">{gem.nome} • {gem.texto} 🔒</span>:<button key={i} title="Remover destrói a pedra -- ela não volta ao inventário." onClick={()=>window.confirm(`Remover ${gem.nome} de ${item.nome}? A pedra será destruída, não devolvida ao inventário.`)&&g.removeGem(id!,i)}>{gem.nome} • {gem.texto} ×</button>:<span key={i}>Vazio</span>})}</div>{installed.length<capacity&&<select defaultValue="" onChange={e=>{if(e.target.value){g.socketGem(id!,e.target.value);e.target.value=''}}}><option value="">Instalar uma pedra (fica fixa no item)...</option>{FORGE_GEMS.filter(gem=>(g.materials[gem.id]??0)>0).map(gem=><option value={gem.id} key={gem.id}>{gem.nome} ({gem.texto})</option>)}</select>}</article>})}</div></section>}
function RecipeCard({recipe,item,g,mastery}:{recipe:typeof FORGE_RECIPES[number],item:Equipment,g:any,mastery:{level:number}}){
 const [choice,setChoice]=React.useState<ForgeChoice|undefined>(undefined)
 const isAttribute=choice==='ataque'||choice==='defesa'||choice==='vida'
 const gem=choice?(isAttribute?FORGE_GEMS.find(x=>x.stat===choice):FORGE_GEMS.find(x=>x.id===FORGE_BONUS_MATERIAL[choice as ForgeBonus])):undefined
 const cost=gem?{...recipe.materials,[gem.id]:(recipe.materials[gem.id]??0)+1}:recipe.materials
 const missing=Object.entries(cost).filter(([id,qty])=>(g.materials[id]??0)<qty)
 // Além do nível de forjador, forjar agora também exige o nível do personagem -- o mesmo
 // nível mínimo que já era exigido pra equipar o item (equipmentRequiredLevel), pra evitar
 // que o jogador forje e guarde peças de fim de jogo muito antes de poder sequer usá-las.
 const required=forgeRecipeLevel(recipe.id),requiredPlayerLevel=equipmentRequiredLevel(item),playerLevel=levelInfo(g.xp).lvl
 const masteryLocked=mastery.level<required,playerLocked=playerLevel<requiredPlayerLevel,locked=masteryLocked||playerLocked
 const chance=Math.round(forgeSuccessChance(recipe.id,g.forgeXp??0,storyModifiers(g).forge)*100)
 // Forjar com bônus não fabrica uma peça nova: refina uma cópia SEM BÔNUS que o jogador já
 // tem (na mochila ou equipada). Sem essa cópia base, a forja bloqueia o bônus escolhido —
 // por isso não consome espaço da mochila (a peça que sai já existia).
 const targetRef=[...Object.values(g.equipped),...g.equipmentBag].find((ref):ref is string=>Boolean(ref)&&equipmentBaseId(ref as string)===item.id&&!g.craftedEffects[ref as string]&&!g.forgedGemLocked?.[ref as string])
 const hasUnbonusedCopy=!!targetRef
 // Bônus especial (não-atributo) não ocupa encaixe -- só a gema de atributo compete com pedras
 // já socketadas manualmente na mesma peça (mesma regra de craftEquipment em game.ts).
 const socketFull=isAttribute&&!!targetRef&&(g.equipmentGems[targetRef]??[]).length>=equipmentSocketCount(item)
 const needsBaseCopy=!!gem&&(!hasUnbonusedCopy||socketFull)
 // Fabricar sem bônus uma peça acima de comum também sacrifica peças prontas de uma
 // raridade abaixo (ex.: raro pede 2 incomuns), além dos materiais normais.
 const sacrifice=!choice?FORGE_SACRIFICE[item.raridade??'comum']:undefined
 const sacrificeOwned=sacrifice?forgeSacrificeOwned(g,sacrifice.rarity):0
 const needsSacrifice=!!sacrifice&&sacrificeOwned<sacrifice.qty
 const canCraft=!locked&&!missing.length&&!needsBaseCopy&&!needsSacrifice&&(!!gem||!!sacrifice||g.equipmentBag.length<equipmentBagCapacity(g))
 // Resumo do que sai da forja: os atributos base do item continuam os mesmos de sempre, o
 // bônus escolhido (se houver) é permanente e fica preso a ESTA peça (mesma regra de
 // socketGem/removeGem — não dá pra tirar e reaproveitar em outro item depois). Forjar um
 // bônus não cria uma peça nova: refina a cópia sem bônus que o jogador já possui.
 const summary=needsBaseCopy
  ?(socketFull?`Essa peça já tem uma pedra socketada e não sobrou encaixe livre — remova a pedra atual ou refine outra cópia sem bônus.`:`Você precisa ter ${recipe.nome} SEM BÔNUS (na mochila ou equipada) antes de refinar esse bônus nela.`)
  :isAttribute&&gem
  ?`A peça que você já possui sairá refinada com ${gem.texto} permanente, fixado nela (não pode ser removido para outro item sem perdê-lo).`
  :choice&&gem
  ?`A peça que você já possui sairá refinada com o efeito especial "${FORGE_BONUS_LABELS[choice as ForgeBonus]}" permanente.`
  :sacrifice
  ?`Sem bônus selecionado: a fabricação consome ${sacrifice.qty} peça${sacrifice.qty===1?'':'s'} ${RARITY_LABEL[sacrifice.rarity]} (você tem ${sacrificeOwned}) além dos materiais ao lado.`
  :'Sem bônus selecionado: a peça sairá apenas com os atributos base ao lado, sem nenhum encaixe ocupado.'
 return <article className={canCraft?'ready':locked?'forge-locked':''}>
  <ArtPreview className="forge-item-art" image={cardArt(item)} name={recipe.nome} text={recipe.effectText??item.habilidade}/>
  <div>
   <small>{recipe.raridade} • FORJADOR NÍVEL {required} • JOGADOR NÍVEL {requiredPlayerLevel}</small>
   <strong>{recipe.nome}</strong>
   <span className="forge-base-stats">{item.slot==='bolsa'?`Capacidade: ${item.capacidade} espaços`:`${offenseLabel(activeHeroId())} +${item.ataque} • Armadura +${item.defesa} • Vida +${item.vida}`} • {equipmentSocketCount(item)} encaixe{equipmentSocketCount(item)===1?'':'s'}</span>
   <span className="forge-chance">Chance de sucesso: {chance}%</span>
   {recipe.effectText&&<em>{recipe.effectText}</em>}
   {recipe.attributeChoice&&<div className="forge-attribute-picker">
    <button type="button" className={!choice?'active':''} title="Forjar sem ocupar nenhum encaixe de pedra" onClick={()=>setChoice(undefined)}>Sem bônus</button>
    {(['ataque','defesa','vida'] as ForgeAttribute[]).map(stat=>{const option=FORGE_GEMS.find(x=>x.stat===stat)!;return <button type="button" key={stat} title={`${option.texto}, permanente e fixo nesta peça`} className={choice===stat?'active':''} onClick={()=>setChoice(stat)}>{option.texto}</button>})}
    {(Object.keys(FORGE_BONUS_LABELS) as ForgeBonus[]).map(bonus=><button type="button" key={bonus} title={`${FORGE_BONUS_LABELS[bonus]}, permanente nesta peça`} className={choice===bonus?'active':''} onClick={()=>setChoice(bonus)}>{FORGE_BONUS_LABELS[bonus]}</button>)}
   </div>}
   <p className="forge-choice-summary">{summary}</p>
  </div>
  <ul>
   {sacrifice&&<li className={sacrificeOwned>=sacrifice.qty?'met':'missing'}>Peça {RARITY_LABEL[sacrifice.rarity]}: {sacrificeOwned}/{sacrifice.qty}</li>}
   {Object.entries(cost).map(([id,qty])=>{const source=[...FORGE_MATERIALS,...FORGE_GEMS].find(m=>m.id===id),owned=g.materials[id]??0;return <li className={owned>=qty?'met':'missing'} key={id}>{source?.nome??id}: {owned}/{qty}</li>})}
  </ul>
  <button className={canCraft?'primary':''} disabled={!canCraft} onClick={()=>g.craftEquipment(recipe.id,choice)}>{masteryLocked&&playerLocked?`Requer Forjador nível ${required} e jogador nível ${requiredPlayerLevel}`:masteryLocked?`Requer Forjador nível ${required}`:playerLocked?`Requer nível de jogador ${requiredPlayerLevel}`:needsBaseCopy?'Requer a peça sem bônus':needsSacrifice?`Faltam peças ${RARITY_LABEL[sacrifice!.rarity]}`:canCraft?(gem?'Refinar bônus':'Tentar forjar'):missing.length?`Faltam ${missing.length} materiais`:'Mochila cheia'}</button>
 </article>
}
type ForgeCategoryFilter='all'|ReturnType<typeof forgeCategory>
function RecipeCatalog(){
 const g=useGame(),uiMode=useUiMode(),mastery=forgeLevelInfo(g.forgeXp??0)
 return uiMode==='modern'?<ForgeCatalogModern art={item=>assetUrl(cardArt(item))} renderRecipe={({recipe,item})=><RecipeCard recipe={recipe} item={item} g={g} mastery={mastery}/>}/>:<RecipeCatalogClassic/>
}
function RecipeCatalogClassic(){
 const g=useGame(),mastery=forgeLevelInfo(g.forgeXp??0)
 const [category,setCategory]=React.useState<ForgeCategoryFilter>('all'),[search,setSearch]=React.useState('')
 const entries=FORGE_RECIPES.map(recipe=>({recipe,item:EQUIPMENT.find(e=>e.id===recipe.equipmentId)})).filter(entry=>entry.item&&equipmentClassAllowed(entry.item,g.heroId)) as {recipe:typeof FORGE_RECIPES[number],item:Equipment}[]
 const counts=FORGE_CATEGORY_ORDER.reduce((acc,cat)=>({...acc,[cat]:entries.filter(e=>forgeCategory(e.item.slot)===cat).length}),{} as Record<string,number>)
 const query=search.trim().toLowerCase()
 const shown=entries.filter(e=>(category==='all'||forgeCategory(e.item.slot)===category)&&(!query||`${e.recipe.nome} ${e.item.nome} ${e.item.habilidade??''} ${e.recipe.effectText??''}`.toLowerCase().includes(query)))
 return <section className="panel recipe-panel forge-workbench-card">
  <div className="forge-panel-head"><div><small>CATÁLOGO</small><h2>Receitas de fabricação</h2></div><span>{shown.length}/{entries.length}</span></div>
  <div className="forge-catalog-toolbar">
   <label className="forge-search"><Search size={15}/><input type="search" placeholder="Buscar receita..." value={search} onChange={e=>setSearch(e.target.value)} aria-label="Buscar receita"/></label>
   {search&&<button className="forge-clear-search" type="button" onClick={()=>setSearch('')}><X size={14}/>Limpar</button>}
  </div>
  <div className="forge-category-tabs">
   <button className={category==='all'?'active':''} onClick={()=>setCategory('all')}>Todas<b>{entries.length}</b></button>
   {FORGE_CATEGORY_ORDER.map(cat=><button key={cat} className={category===cat?'active':''} onClick={()=>setCategory(cat)}>{FORGE_CATEGORY_LABELS[cat]}<b>{counts[cat]??0}</b></button>)}
  </div>
  {shown.length?<div className="recipe-grid">{shown.map(({recipe,item},index)=><motion.div key={recipe.id} {...rarityMotionProps(item.raridade??'comum',index*.025)}><RecipeCard recipe={recipe} item={item} g={g} mastery={mastery}/></motion.div>)}</div>:<div className="forge-empty"><Search/><strong>Nenhuma receita encontrada</strong><span>Ajuste a busca ou troque o filtro de categoria.</span></div>}
 </section>
}
function TalentPanel(){
 const g=useGame(),level=levelInfo(g.xp).lvl,specializations=g.specializations??{}
 type TreeNode={id:string;x:number;y:number;kind:'talent'|'choice'|'subclass';level:number;label:string;text:string;selected?:boolean;unlocked?:boolean;locked?:boolean;disabled?:boolean;onClick?:()=>void}
 type TreeLink=[string,string]
 const talentById=Object.fromEntries(TALENTS.map(t=>[t.id,t])) as Record<string,typeof TALENTS[number]>
 const baseLayout:[string,number,number][]=[['vigor',50,8],['precisao',34,21],['muralha',66,21],['alquimista',20,36],['cacador',50,36],['destino',80,36],['reflexos',35,51],['poder_interior',65,51],['resiliencia',50,64],['instinto_predador',35,79],['guarda_ancestral',65,79],['apice_heroico',50,92]]
 const baseNodes:TreeNode[]=baseLayout.map(([id,x,y])=>{const t=talentById[id],unlocked=g.talents.includes(id),locked=level<t.level;return{id,x,y,kind:'talent',level:t.level,label:t.nome,text:t.texto,unlocked,locked,disabled:locked||unlocked,onClick:()=>g.unlockTalent(id)}})
 const baseLinks:TreeLink[]=[['vigor','precisao'],['vigor','muralha'],['precisao','alquimista'],['precisao','cacador'],['muralha','cacador'],['muralha','destino'],['alquimista','reflexos'],['destino','poder_interior'],['reflexos','resiliencia'],['poder_interior','resiliencia'],['resiliencia','instinto_predador'],['resiliencia','guarda_ancestral'],['instinto_predador','apice_heroico'],['guarda_ancestral','apice_heroico']]
 const specRows=SPECIALIZATION_CHOICES.map(tier=>{const isSubclass=tier.level===30&&Boolean(g.heroId&&HERO_SUBCLASSES[g.heroId]),options=isSubclass?HERO_SUBCLASSES[g.heroId!]:tier.options,y:{[key:number]:number}={10:10,25:31,30:52,50:73,75:92},xs=options.length===2?[36,64]:[19,50,81],chosen=specializations[String(tier.level)];return{level:tier.level,nodes:options.map((option,index)=>{const selected=chosen===option.id,locked=level<tier.level,disabled=locked||Boolean(chosen&&!selected);return{id:`spec-${tier.level}-${option.id}`,x:xs[index],y:y[tier.level]??50,kind:isSubclass?'subclass':'choice',level:tier.level,label:option.nome,text:(option as any).passiva??option.texto,selected,unlocked:selected,locked,disabled,onClick:()=>g.chooseSpecialization(tier.level,option.id)} as TreeNode})}})
 const specializationNodes=specRows.flatMap(row=>row.nodes)
 const specLinks:TreeLink[]=specRows.slice(0,-1).flatMap((row,index)=>{const next=specRows[index+1];if(!next)return[];if(row.nodes.length===next.nodes.length)return row.nodes.map((node,nodeIndex)=>[node.id,next.nodes[nodeIndex].id] as TreeLink);if(row.nodes.length===3&&next.nodes.length===2)return[[row.nodes[0].id,next.nodes[0].id],[row.nodes[1].id,next.nodes[0].id],[row.nodes[1].id,next.nodes[1].id],[row.nodes[2].id,next.nodes[1].id]] as TreeLink[];if(row.nodes.length===2&&next.nodes.length===3)return[[row.nodes[0].id,next.nodes[0].id],[row.nodes[0].id,next.nodes[1].id],[row.nodes[1].id,next.nodes[1].id],[row.nodes[1].id,next.nodes[2].id]] as TreeLink[];return[]})
 const nodeIcon=(node:TreeNode)=>{
  const meaning=`${node.id} ${node.label} ${node.text}`.toLocaleLowerCase('pt-BR')
  if(/consum|alquim/.test(meaning))return FlaskConical
  if(/ouro|fortuna|esp[oó]lio|explorador/.test(meaning))return Coins
  if(/element|fogo|f[eê]nix/.test(meaning))return Flame
  if(/vida|vigor|resili|sobrevive|apice|paladino/.test(meaning))return HeartPulse
  if(/defesa|armadura|guarda|muralha|baluarte|colosso/.test(meaning))return Shield
  if(/cr[ií]t|precis[aã]o/.test(meaning))return Target
  if(/chefe|tirano|carrasco/.test(meaning))return Skull
  if(/rolagem|destino/.test(meaning))return Dices
  if(/reflex|sombra|fantasma/.test(meaning))return Footprints
  if(/arcano|mago|cronoturgo/.test(meaning))return Wand2
  if(/ataque|ru[ií]na|berserker|gladiador|assassina/.test(meaning))return Sword
  if(/poder|instinto/.test(meaning))return Zap
  return node.kind==='subclass'?(heroClassIcons[g.heroId??'']??Sparkles):Gem
 }
 const renderTree=(nodes:TreeNode[],links:TreeLink[],title:string,subtitle:string,className:string)=>{
  const nodeMap=Object.fromEntries(nodes.map(n=>[n.id,n])) as Record<string,TreeNode>
  const isActive=(id:string)=>Boolean(nodeMap[id]?.unlocked||nodeMap[id]?.selected)
  const connector=(a:TreeNode,b:TreeNode)=>{const mid=(a.y+b.y)/2;return`M ${a.x} ${a.y} L ${a.x} ${mid} L ${b.x} ${mid} L ${b.x} ${b.y}`}
  return <section className={`talent-branch ${className}`}>
   <div className="talent-branch-title"><strong>{title}</strong><small>{subtitle}</small></div>
   <div className="talent-tree-canvas" role="group" aria-label={title}>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{links.map(([from,to])=>{const a=nodeMap[from],b=nodeMap[to];if(!a||!b)return null;return <path key={`${from}-${to}`} d={connector(a,b)} className={isActive(from)&&isActive(to)?'active':''}/>})}</svg>
    {nodes.map(node=>{const Icon=nodeIcon(node);return <button key={node.id} type="button" className={`talent-node ${node.kind}${node.unlocked||node.selected?' unlocked':''}${node.locked?' locked':''}${node.selected?' selected':''}`} style={{left:`${node.x}%`,top:`${node.y}%`}} aria-disabled={node.disabled} onClick={()=>{if(!node.disabled)node.onClick?.()}} aria-label={`${node.label}. Nível ${node.level}. ${node.text}`}><span><Icon size={node.kind==='subclass'?23:19} strokeWidth={2}/></span><b>{node.level}</b><em role="tooltip"><strong>{node.label}</strong><small>Nível {node.level} • {node.text}</small></em></button>})}
   </div>
  </section>
 }
 return <Panel title="Árvore de talentos"><div className="talent-tree-wrap">
  <div className="talent-tree-head"><span><strong>Nível {level}</strong><small>{g.talents.length}/{TALENTS.length} talentos • {Object.keys(specializations).length}/{SPECIALIZATION_CHOICES.length} caminhos</small></span><button className="danger-action" disabled={!Object.keys(specializations).length} title={!Object.keys(specializations).length?'Nenhum caminho escolhido ainda':undefined} onClick={g.resetSpecializations}>Redefinir caminhos</button></div>
  <div className="talent-tree-grid">
   {renderTree(baseNodes,baseLinks,'Talentos gerais','Desbloqueios permanentes por nível','core')}
   {renderTree(specializationNodes,specLinks,'Caminhos da build','Escolhas por marco de progressão','paths')}
  </div>
 </div></Panel>
}
function DungeonPanel(){
 const g=useGame(),lvl=levelInfo(g.xp).lvl
 const world=g.world??'havendown'
 const regions=[...TERRITORIES].filter(t=>(t.mundo??'havendown')===world).sort(regionListSort)
 const worldSubregions=SUBREGIONS.filter(sub=>regions.some(r=>r.id===sub.regionId))
 const activeId=g.dungeonSubregionId??g.subregionId
 const active=worldSubregions.find(sub=>sub.id===activeId)??worldSubregions.find(sub=>sub.regionId===g.regionId)??worldSubregions[0]
 return <Panel title="Masmorras">
  <p>Sequências crescentes de ameaças, com chefe a cada cinco salas e recompensas progressivas. Escolha a região que servirá de base para a expedição.</p>
  {g.dungeonActive&&<p className="dungeon-warning">Expedição em andamento em {active?.nome}. Trocar de região encerra o progresso atual (profundidade {g.dungeonDepth}).</p>}
  <div className="dungeon-picker">{regions.map(region=>{
   const subs=worldSubregions.filter(sub=>sub.regionId===region.id).sort((a,b)=>a.nivelMin-b.nivelMin)
   if(!subs.length)return null
   return <div className="dungeon-region-group" key={region.id}><strong>{region.nome}</strong><div className="dungeon-sub-row">{subs.map(sub=>{
    const isActive=sub.id===active?.id,danger=dangerFor(lvl,sub.nivelMin,sub.nivelMax)
    return <button key={sub.id} className={`dungeon-sub-button danger-${danger.cls}${isActive?' active':''}`} onClick={()=>g.selectDungeon(sub.id)}><span>{sub.nome}</span><small>Nível {sub.nivelMin}–{sub.nivelMax}</small></button>
   })}</div></div>
  })}</div>
  <button className="primary" disabled={!active} title={!active?'Escolha uma sub-região acima para servir de base da expedição':undefined} onClick={g.startDungeon}>Entrar na masmorra{active?` • ${active.nome}`:''} • Profundidade {g.dungeonDepth+1}</button>
 </Panel>
}
function EquipmentRulesPanel(){const g=useGame(),sets=equipmentSetCounts(g),weapon=equipmentByRef(g.equipped.mao_direita),equipped=(Object.values(g.equipped) as string[]).map(id=>equipmentByRef(id)).filter(Boolean);return <Panel className="build-summary" title="Resumo completo da build"><div className="build-summary-grid"><span><small>PODER DE ATAQUE</small><strong>{attackValue(g)}</strong></span><span><small>ARMADURA</small><strong>{armorValue(g)}</strong></span><span><small>VIDA MÁXIMA</small><strong>{maxHp(g)}</strong></span><span><small>ELEMENTO</small><strong>{heroWeaponElement(g)}</strong></span></div><h3>Conjuntos</h3><div className="build-tags">{SET_BONUSES.map((set,index)=>{const count=[sets.lua,sets.cinzas,sets.khar,sets.eclipse][index];return <span className={count>=2?'active':''} key={set.nome}><b>{set.nome}</b> {count}/4 • {count>=4?set.four:count>=2?set.two:'bônus inativo'}</span>})}</div><h3>Efeitos equipados</h3><div className="build-tags"><span>Arma: {weapon?.nome??'nenhuma'} ({heroWeaponElement(g)})</span>{heroResistances(g).map(r=><span key={r}>Resistência: {r}</span>)}{equipped.filter(e=>e?.activeEffect).map(e=><span key={e!.id}>{e!.nome}: {e!.activeEffect!.description}</span>)}</div><details><summary>Regras elementais</summary><p><b>Elementos:</b> {ELEMENTS.join(' • ')}</p><p><b>Condições:</b> {STATUS_INFO.map(s=>`${s[0]}: ${s[1]}`).join(' • ')}</p></details></Panel>}
function RegionRevengePanel(){const g=useGame(),subs=SUBREGIONS.filter(s=>s.regionId===g.regionId&&g.subregionBossesDefeated.includes(s.id));if(!subs.length)return null;return <div className="moved-systems region-revenge-panel"><Panel title="Salão da Vingança"><p>Chefes já derrotados nesta região podem ser enfrentados novamente, mais fortes e valiosos.</p><div className="system-list">{subs.map(sub=><button key={sub.id} onClick={()=>g.startRevenge(sub.id)}><strong>{sub.chefe.nome}</strong><small>{sub.nome} • Vinganças vencidas: {g.revengeWins[sub.id]??0}</small></button>)}</div></Panel></div>}
// Janela modal (não um banner perdido no topo da página) -- garante que o jogador veja o
// resultado da forja/aprimoramento não importa em que ponto da tela ele clicou o botão.
function ForgeResultDialog(){
 const g=useGame(),result=g.forgeResult
 const attunementResult=result&&result.message.toLowerCase().includes('sintonia')
 const title=attunementResult?(result.success?'Sintonia bem-sucedida!':'Sintonia falhou'):result?.kind==='upgrade'?(result.success?'Aprimoramento bem-sucedido!':'Aprimoramento falhou'):(result?.success?'Forja bem-sucedida!':'Fabricação falhou')
 const subtitle=attunementResult?'Afinidade elemental':result?.kind==='upgrade'?'Reforço estrutural':'Trabalho de bancada'
 const close=()=>useGame.setState({forgeResult:undefined})
 React.useEffect(()=>{if(result)playSfx(result.success?'forgeSuccess':'forgeFail')},[result?.id])
 return <AnimatePresence>{result&&<motion.div key={result.id} className="forge-result-overlay" role="presentation" onClick={close} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.18}}>
  <motion.div className={`forge-result-dialog ${result.success?'success':'failure'}`} role="status" aria-live="assertive" aria-modal="true" onClick={e=>e.stopPropagation()} initial={{opacity:0,y:-12,scale:.94}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-12,scale:.94}} transition={{duration:.25}}>
   <div className="forge-result-aura"/>
   <div className="forge-result-icon">{result.success?<CheckCircle2/>:<XCircle/>}</div>
   <small>{subtitle}</small>
   <h2>{title}</h2>
   <p>{result.message}</p>
   <div className="forge-result-meta">
    <span><b>{result.success?'Sucesso':'Falha'}</b><small>{result.success?'A peça avançou.' :'Os recursos foram consumidos.'}</small></span>
    <span><b>{attunementResult?'Sintonia':result?.kind==='upgrade'?'Upgrade':'Forja'}</b><small>{result.success?'Continue refinando sua build.' :'Reúna materiais antes da próxima tentativa.'}</small></span>
   </div>
   <button className="primary" onClick={close}>Entendi</button>
  </motion.div>
 </motion.div>}</AnimatePresence>
}
type ForgeMaterialEntry={id:string;nome:string;kind:'region';elemento:GameElement;regionId:string}|{id:string;nome:string;kind:'dismantle'}|{id:string;nome:string;kind:'gem';texto:string}|{id:string;nome:string;kind:'bioma';elemento:GameElement}
function MaterialSourceDialog({material,onClose}:{material:ForgeMaterialEntry;onClose:()=>void}){
 const region=material.kind==='region'?TERRITORIES.find(t=>t.id===material.regionId):undefined
 const subs=material.kind==='region'?SUBREGIONS.filter(s=>s.regionId===material.regionId):[]
 return <div className="hero-confirm-overlay" role="presentation" onClick={onClose}><section className="material-info-dialog" role="dialog" aria-modal="true" aria-labelledby="material-info-title" onClick={e=>e.stopPropagation()}>
  <small>MATERIAL DE FORJA</small>
  <h2 id="material-info-title">{material.nome}</h2>
  {material.kind==='region'&&<p>Este material não é obtido desmontando equipamentos. Ele é conseguido derrotando inimigos em <b>{region?.nome??'uma região desconhecida'}</b>: inimigos comuns concedem 1 unidade, elites 2 e chefes 3 por vitória (a especialização Fortuna Real aumenta essa quantidade em 20%).</p>}
  {material.kind==='dismantle'&&material.id==='essencia_magica'&&<p>Obtida desmontando equipamentos <b>Incomuns ou melhores</b> na Oficina de desmontagem (mais abaixo) — peças Comuns não rendem essência mágica. Raridades Épica, Lendária e Mítica rendem ainda mais. Armas e armaduras pesadas rendem mais que acessórios e bolsas.</p>}
  {material.kind==='dismantle'&&material.id!=='essencia_magica'&&<p>Obtido desmontando qualquer equipamento na Oficina de desmontagem (mais abaixo), de qualquer raridade. Armas e armaduras pesadas rendem mais que acessórios e bolsas.</p>}
  {material.kind==='gem'&&<p>{material.texto} — obtida ao desmontar equipamentos (a chance aumenta com o nível do item e o número de encaixes da peça, que por sua vez depende da raridade) ou recuperada ao desmontar uma peça que já tinha esta pedra instalada. Usada para instalar um bônus de atributo nos encaixes de uma peça na Oficina, ou para refinar o bônus de atributo/efeito especial de uma receita na Forja.</p>}
  {material.kind==='bioma'&&<p>Material temático: cai como bônus extra (25% de chance) ao vencer um combate numa sub-região cujo tema de loot combine com ele — reforça a identidade daquele lugar específico, além do material regional de sempre.</p>}
  {subs.length>0&&<div className="material-info-subs"><small>SUB-REGIÕES</small><ul>{subs.map(s=><li key={s.id}>{s.nome}</li>)}</ul></div>}
  <button className="primary" onClick={onClose}>Fechar</button>
 </section></div>
}
// Tutorial dedicado da Forja: os cards resumem o header (nível de Forjador, chance de
// sucesso) mas o jogador só descobria a maioria destas regras (sacrifício por raridade,
// bônus como refino em vez de criação) tentando forjar e sendo bloqueado. Recolhido por
// padrão pra não empurrar o catálogo de receitas pra baixo em quem já sabe as regras.
function ForgeTutorialPanel({showAttunement=true}:{showAttunement?:boolean}={}){
 const [open,setOpen]=React.useState(false),[attunementPrompt,setAttunementPrompt]=React.useState<null|{id:string;element:GameElement;name:string;effect:string;material:string;type:'weapon'|'armor'}>(null),[expandedAttunement,setExpandedAttunement]=React.useState<string|null>(null),g=useGame(),weapon=equipmentByRef(g.equipped.mao_direita)
 const attunementTheme:Record<GameElement,{glow:string;border:string;accent:string}>={fisico:{glow:'rgba(179,120,49,.28)',border:'#9a6633',accent:'#efc77a'},fogo:{glow:'rgba(193,71,29,.28)',border:'#c15c2d',accent:'#ffb47f'},gelo:{glow:'rgba(74,144,183,.28)',border:'#4a90b7',accent:'#b7e6ff'},natureza:{glow:'rgba(78,143,71,.28)',border:'#5d8c43',accent:'#c7ef9a'},sombra:{glow:'rgba(104,78,140,.28)',border:'#8260aa',accent:'#d5bef7'},luz:{glow:'rgba(185,158,69,.28)',border:'#d7bc63',accent:'#fff1b8'},arcano:{glow:'rgba(110,92,189,.28)',border:'#8875f0',accent:'#ddd6ff'}}
 const attunementDetails:Record<GameElement,{condition:string;impact:string;influence:string;armor:string}>={
  fisico:{condition:'Sangrando',impact:'no crítico da arma, o inimigo recebe Sangramento: dano fixo ao fim de cada turno por 2 turnos, com aumento quando a arma é mais forte.',influence:'não reduz sua própria rolagem; pune o alvo inimigo com dano contínuo.',armor:'na armadura, reduz dano físico recebido e bloqueia Sangramento.'},
  fogo:{condition:'Pegando fogo',impact:'no crítico da arma, o inimigo recebe dano de fogo ao longo de 1 turno; o valor cresce com o poder do golpe.',influence:'é uma pressão curta e explosiva, não uma penalidade de rolagem.',armor:'na armadura, reduz dano de fogo recebido e bloqueia Queimadura.'},
  gelo:{condition:'Congelado',impact:'no crítico da arma, o inimigo fica Congelado e sofre penalidade nas rolagens de ataque e defesa por 1 turno, ou mais se houver bônus de especialização.',influence:'reduz a qualidade das rolagens do inimigo; é uma condição de controle curta e confiável.',armor:'na armadura, reduz dano de gelo recebido e bloqueia Congelamento.'},
  natureza:{condition:'Envenenado',impact:'no crítico da arma, o inimigo recebe Veneno: dano fixo ao fim de cada turno por 3 turnos, escalando com a força do ataque.',influence:'não mexe nas rolagens; desgasta o alvo inimigo com dano contínuo.',armor:'na armadura, reduz dano de natureza recebido e bloqueia Envenenamento.'},
  sombra:{condition:'Agarrado',impact:'no crítico da arma, o inimigo fica Agarrado e sofre penalidade nas rolagens de ataque e defesa por 1 turno, ou mais se houver bônus de especialização.',influence:'é uma condição de controle curta que atrapalha a resposta do inimigo.',armor:'na armadura, reduz dano de sombra recebido e bloqueia Agarramento.'},
  luz:{condition:'Cego',impact:'no crítico da arma, o inimigo fica Cego e sofre penalidade nas rolagens de ataque e defesa por 1 turno.',influence:'enfraquece a precisão do inimigo e abre uma janela curta de pressão.',armor:'na armadura, reduz dano de luz recebido e bloqueia Cegueira.'},
  arcano:{condition:'Atordoado',impact:'no crítico da arma, o inimigo pode ter a próxima ação ou defesa cancelada, em vez de só sofrer uma penalidade numérica.',influence:'é o efeito mais disruptivo: ele para o turno do alvo em vez de apenas reduzir valores.',armor:'na armadura, reduz dano arcano recebido e bloqueia Atordoamento.'}
 }
 // attuneEquipment (game.ts) já sabia dar resistência elemental a qualquer peça que não seja a
 // arma (ramifica por item.slot!=='mao_direita'), mas só a arma tinha botões nesta tela -- a
 // metade "resistência" da função ficava impossível de usar. Bolsa fica de fora (não é peça de
 // combate, não faz sentido "resistir" a um elemento).
 const armorEntries=(Object.entries(g.equipped) as [Slot,string|undefined][]).filter(([slot,id])=>slot!=='mao_direita'&&slot!=='bolsa'&&id).map(([,id])=>({id:id!,item:equipmentByRef(id!)})).filter((entry):entry is{id:string;item:(typeof EQUIPMENT)[number]}=>Boolean(entry.item))
 return <section className="panel forge-tutorial">
  <button type="button" className="forge-tutorial-toggle" aria-expanded={open} onClick={()=>setOpen(o=>!o)}>
   <span><BookOpen size={16}/>Como funciona a Forja</span>
   <ChevronDown/>
  </button>
  {open&&<div className="mechanics-grid forge-tutorial-grid">
   <div className="mechanics-card"><small>1. ESCOLHA A RECEITA</small><p>Abra uma categoria no Catálogo de receitas e escolha um item. Cada card mostra o nível de Forjador e o nível de Jogador exigidos e a chance de sucesso atual — os dois precisam estar liberados antes de tentar forjar.</p></div>
   <div className="mechanics-card"><small>2. JUNTE OS MATERIAIS</small><p>Desmonte equipamentos na Oficina de desmontagem (mais abaixo) para render fragmentos, essências e pedras, ou derrote inimigos nas regiões que produzem os materiais exclusivos de cada receita. Sub-regiões com um tema de loot reconhecível (Machados, Runas, Veneno...) também têm chance de render um material extra combinando com esse tema.</p></div>
   <div className="mechanics-card"><small>3. SACRIFÍCIO POR RARIDADE</small><p>Peças Comuns fabricam só com materiais. A partir de Incomum, fabricar sem bônus também consome peças prontas de uma raridade abaixo: Incomum pede 1 Comum, Raro pede 2 Incomuns, Épico pede 3 Raros e Lendário pede 3 Épicos. Qualquer peça sobrando na mochila com a raridade certa serve — não precisa ser do mesmo tipo.</p></div>
   <div className="mechanics-card"><small>4. BÔNUS É REFINO, NÃO CRIAÇÃO</small><p>A partir de Incomum, dá pra escolher um atributo ou efeito especial. Isso não fabrica uma peça nova: exige que você já tenha a MESMA peça sem bônus (na mochila ou equipada) e a refina no lugar, sem duplicar. O bônus fica permanente, preso a essa peça.</p></div>
   <div className="mechanics-card"><small>5. SUCESSO E FALHA</small><p>Toda tentativa concede XP de Forja e conta pro seu nível de Forjador, ganhe ou perca. Em sucesso, a peça (ou o bônus) sai pronta. Em falha, metade dos materiais e das peças sacrificadas se perde e nada é produzido.</p></div>
   <div className="mechanics-card"><small>6. DEPOIS DE FORJAR</small><p>Na Oficina de desmontagem você recicla itens indesejados em materiais e instala pedras extras nos encaixes livres dos equipamentos ativos — pedras removidas são destruídas, não devolvidas. Aprimoramentos (+1 a +3) custam ouro e materiais, concedem XP de Forja como qualquer tentativa, e reforçam os atributos base do item — mas não são garantidos: +1 tem boa chance de sucesso, +2 é raro e +3 é uma aposta; falhar em +2 ou +3 arrisca regredir o nível da peça, e a falha ainda consome metade dos materiais.</p></div>
  </div>}
  {showAttunement&&(weapon||armorEntries.length>0)&&<div className="attunement-service">
   <strong>Serviço de sintonia elemental</strong>
   <small>Sintonize o dano da sua arma ou conceda resistência elemental às demais peças equipadas: 80 ouro e 3 materiais da afinidade, por peça.</small>
   {/* attuneEquipment exige a referência de instância equipada (com sufixo '@@...'), não o id
       genérico do catálogo -- weapon.id (vindo de equipmentByRef) é o id base, então os botões
       de sintonia da arma nunca faziam nada (Object.values(s.equipped).includes(id) sempre
       falhava). g.equipped.mao_direita é a referência de instância de verdade. */}
   {weapon&&<div className="attunement-item"><button type="button" className="attunement-item-toggle" aria-expanded={expandedAttunement===g.equipped.mao_direita} onClick={()=>setExpandedAttunement(x=>x===g.equipped.mao_direita?null:g.equipped.mao_direita!)}><span>{weapon.nome}<em>Dano da arma — atual: {heroWeaponElement(g)}</em></span><ChevronDown/></button>
    {expandedAttunement===g.equipped.mao_direita&&<div className="attunement-elements">{ELEMENTS.map(element=>{const material=Object.values(REGION_MATERIALS).find(m=>m.elemento===element);const unavailable=g.gold<80||!material||(g.materials[material.id]??0)<3;return <button key={element} className={`${heroWeaponElement(g)===element?'selected':''}${unavailable?' unavailable':''}`} onClick={()=>material&&setAttunementPrompt({id:g.equipped.mao_direita!,element,name:weapon.nome,effect:`os ataques desta arma passarão a causar dano de ${ELEMENT_LABELS[element]}.`,material:material.nome,type:'weapon'})}>{element}</button>})}</div>}
   </div>}
   {armorEntries.map(({id,item})=><div className="attunement-item" key={id}><button type="button" className="attunement-item-toggle" aria-expanded={expandedAttunement===id} onClick={()=>setExpandedAttunement(x=>x===id?null:id)}><span>{item.nome}<em>Resistência — atual: {g.equipmentResistances[id]??'nenhuma'}</em></span><ChevronDown/></button>
    {expandedAttunement===id&&<div className="attunement-elements">{ELEMENTS.map(element=>{const material=Object.values(REGION_MATERIALS).find(m=>m.elemento===element);const unavailable=g.gold<80||!material||(g.materials[material.id]??0)<3;return <button key={element} className={`${g.equipmentResistances[id]===element?'selected':''}${unavailable?' unavailable':''}`} onClick={()=>material&&setAttunementPrompt({id,element,name:item.nome,effect:`esta peça reduzirá dano de ${ELEMENT_LABELS[element]} e bloqueará sua condição elemental.`,material:material.nome,type:'armor'})}>{element}</button>})}</div>}
   </div>)}
   {attunementPrompt&&<div className="attunement-modal-overlay" role="presentation" onClick={()=>setAttunementPrompt(null)}>
    <section className={`attunement-modal ${attunementPrompt.type}`} role="dialog" aria-modal="true" aria-labelledby="attunement-title" style={{'--attune-glow':attunementTheme[attunementPrompt.element].glow,'--attune-border':attunementTheme[attunementPrompt.element].border,'--attune-accent':attunementTheme[attunementPrompt.element].accent} as React.CSSProperties} onClick={e=>e.stopPropagation()}>
     <div className={`attunement-modal-badge ${attunementPrompt.type}`}>
      {attunementPrompt.type==='weapon'?<Sword size={14}/>:<Shield size={14}/>}
      <span>{attunementPrompt.type==='weapon'?'DANO DA ARMA':'RESISTENCIA'}</span>
     </div>
     <h2 id="attunement-title">Sintonizar {attunementPrompt.name} com {ELEMENT_LABELS[attunementPrompt.element]}?</h2>
     <p className="attunement-modal-effect"><strong>Efeito imediato:</strong> {attunementPrompt.effect}</p>
     <div className="attunement-modal-impact">
      <span>
       <small>Condição aplicada</small>
       <b>{attunementDetails[attunementPrompt.element].condition}</b>
      </span>
      <span>
       <small>Como funciona</small>
       <b>{attunementPrompt.type==='weapon'?attunementDetails[attunementPrompt.element].impact:attunementDetails[attunementPrompt.element].armor}</b>
      </span>
      <span>
       <small>Influência no combate</small>
       <b>{attunementDetails[attunementPrompt.element].influence}</b>
      </span>
     </div>
     <div className="attunement-modal-meta">
      <span><small>Custo</small><b>80 ouro</b></span>
      <span><small>Material</small><b>3 {attunementPrompt.material}</b></span>
      <span><small>Sucesso</small><b>60%</b></span>
     </div>
     {(()=>{const material=Object.values(REGION_MATERIALS).find(m=>m.nome===attunementPrompt.material),goldMissing=Math.max(0,80-g.gold),materialMissing=material?Math.max(0,3-(g.materials[material.id]??0)):3,missing=[goldMissing>0?`${goldMissing} ouro`:null,materialMissing>0?`${materialMissing} ${attunementPrompt.material}`:null].filter(Boolean) as string[];return <div className={`attunement-modal-requirements${missing.length?' missing':''}`}>
      <small>{missing.length?'Faltam':'Pronto para aplicar'}</small>
      <p>{missing.length?`Você precisa de ${missing.join(' e ')} para confirmar esta sintonia.`:'Você já tem tudo para aplicar esta receita agora.'}</p>
     </div>})()}
     <div className="attunement-modal-risk">
      <strong>Falha</strong>
      <span>Todos os recursos são consumidos.</span>
     </div>
     <p className="attunement-modal-note">{attunementPrompt.type==='weapon'?'Armas aplicam a condição no inimigo. O elemento define o tipo de dano e o tipo de desvantagem em crítico; não afeta a rolagem do jogador por si só.':'Resistência troca a afinidade elemental da peça, reduz o dano desse tipo e bloqueia a condição associada quando o inimigo a aplica.'}</p>
     <div className="attunement-modal-actions">
      <button onClick={()=>setAttunementPrompt(null)}>Cancelar</button>
      <button className="primary" onClick={()=>{const prompt=attunementPrompt;setAttunementPrompt(null);g.attuneEquipment(prompt.id,prompt.element)}}>Confirmar</button>
     </div>
    </section>
   </div>}
  </div>}
 </section>
}
const BLACKSMITH={nome:'Borin Fenrick',titulo:'Mestre Ferreiro de Havendown',retrato:'assets/npcs/borin-fenrick.webp'}
const BLACKSMITH_WELCOME=[
 'Bigorna quente, martelo pronto. Traga os materiais e vamos ver o que sai daqui.',
 'Toda peça boa que você usa por aí passou nessa forja antes.',
 'Fabricar leva tempo, aprimorar leva sorte. Os dois valem o risco.',
 'Não existe metal que essa forja não tenha dobrado, cedo ou tarde.'
]
const BLACKSMITH_LOW_MATERIALS=[
 'Sua bolsa de materiais tá bem magra. Volte pro campo antes de me pedir milagre.',
 'Sem minério, sem escama, sem essência — não dá pra forjar no ar.',
 'Traga o que a região tem pra oferecer. A forja não inventa material do nada.'
]
const BLACKSMITH_VETERAN=[
 'Você já domina essa forja melhor que muito aprendiz que passou por aqui.',
 'Seu nível de forjador fala por si. Poucos chegam tão longe na bigorna.',
 'Continue assim e logo serei eu perguntando os segredos a você.'
]
function blacksmithLine(masteryLevel:number,attempts:number,totalMaterials:number){
 const pool=masteryLevel>=6?BLACKSMITH_VETERAN:(attempts>0&&totalMaterials===0)?BLACKSMITH_LOW_MATERIALS:BLACKSMITH_WELCOME
 return pool[(masteryLevel+attempts)%pool.length]
}
type ForgeWorkbench='craft'|'upgrade'|'workshop'|'attune'
function ForgeMasteryPanel({mastery,rate,attempts,successes}:{mastery:ReturnType<typeof forgeLevelInfo>;rate:number;attempts:number;successes:number}){
 const progress=mastery.max?100:Math.min(100,mastery.progress/mastery.next*100)
 return <section className="forge-side-card forge-mastery-card"><header><span><small>MAESTRIA</small><strong>Nível {mastery.level}</strong></span><Sparkles size={18}/></header><div className="forge-xp"><span>{mastery.max?'Maestria máxima':`${mastery.progress}/${mastery.next} XP`}</span><div className="xp-track"><div style={{width:`${progress}%`}}/></div></div><div className="forge-side-stats"><span><small>Sucessos</small><b>{successes}/{attempts}</b></span><span><small>Taxa</small><b>{rate}%</b></span></div></section>
}
function forgeMaterialSource(m:ForgeMaterialEntry){return m.kind==='region'?`Região • ${ELEMENT_LABELS[m.elemento]}`:m.kind==='bioma'?`Sub-região • ${ELEMENT_LABELS[m.elemento]}`:m.kind==='gem'?m.texto:'Desmontagem'}
function ForgeMaterialsPanel({materials,totalMaterials,onSelect}:{materials:ForgeMaterialEntry[];totalMaterials:number;onSelect:(material:ForgeMaterialEntry)=>void}){
 const g=useGame(),groups:{kind:ForgeMaterialEntry['kind'];label:string}[]=[{kind:'region',label:'Regionais'},{kind:'bioma',label:'Sub-regiões'},{kind:'dismantle',label:'Base'},{kind:'gem',label:'Pedras'}]
 return <section className="forge-side-card forge-materials-panel"><header><span><small>MATERIAIS</small><strong>{totalMaterials}</strong></span><Package size={18}/></header><div className="forge-material-groups">{groups.map(group=>{const list=materials.filter(m=>m.kind===group.kind),owned=list.reduce((sum,m)=>sum+(g.materials[m.id]??0),0);return <section className="forge-material-group" key={group.kind}><div className="forge-material-group-title"><span>{group.label}</span><b>{owned}</b></div><div>{list.map(m=><button key={m.id} type="button" onClick={()=>onSelect(m)} title="Ver origem do material"><b>{g.materials[m.id]??0}</b><span><strong>{m.nome}</strong><small>{forgeMaterialSource(m)}</small></span></button>)}</div></section>})}</div></section>
}
function ForgeUpgradePanel(){
 const g=useGame()
 const refs=[...(Object.entries(g.equipped) as [Slot,string|undefined][]).flatMap(([slot,ref])=>ref&&slot!=='bolsa'?[{ref,source:'Equipado'}]:[]),...g.equipmentBag.flatMap(ref=>{const item=equipmentByRef(ref);return item?.slot==='bolsa'?[]:[{ref,source:'Mochila'}]})]
 const seen=new Set<string>()
 const entries=refs.filter(({ref})=>{if(seen.has(ref))return false;seen.add(ref);return true}).map(({ref,source})=>({ref,source,item:equipmentByRef(ref)})).filter((entry):entry is {ref:string;source:string;item:Equipment}=>Boolean(entry.item))
 return <section className="panel forge-workbench-card forge-upgrade-panel"><div className="forge-panel-head"><div><small>APRIMORAMENTO</small><h2>Reforçar equipamentos</h2></div><span>{entries.length}</span></div>{entries.length?<div className="forge-upgrade-list">{entries.map(({ref,item,source},index)=>{const rarity=item.raridade??'comum',upLevel=g.equipmentUpgrades[ref]??0
  if(upLevel>=3)return <motion.article key={ref} {...rarityMotionProps(rarity,index*.025)} className={`forge-upgrade-card item-rarity-${rarity} maxed`}><ArtPreview className="forge-item-art" image={cardArt(item)} name={item.nome} text={item.habilidade}/><div><small>{source} • {RARITY_LABEL[rarity]}</small><strong>{item.nome} +{upLevel}</strong><p>Nível máximo de aprimoramento.</p></div><span className="forge-upgrade-state"><CheckCircle2 size={15}/>Máximo</span></motion.article>
  const targetLevel=(upLevel+1) as 1|2|3,goldCost=equipmentUpgradeCost(item,upLevel),matCost=equipmentUpgradeMaterialCost(item,targetLevel)
  const upgradeFails=g.equipmentUpgradeFails?.[`${ref}:${targetLevel}`]??0,chance=Math.round(Math.min(.95,UPGRADE_SUCCESS_CHANCE[targetLevel]+upgradeFails*.08)*100)
  const canAfford=g.gold>=goldCost&&Object.entries(matCost).every(([mid,qty])=>(g.materials[mid]??0)>=qty)
  return <motion.article key={ref} {...rarityMotionProps(rarity,index*.025)} whileHover={rarityHoverLift(rarity)} className={`forge-upgrade-card item-rarity-${rarity}${canAfford?' ready':' locked'}`}><ArtPreview className="forge-item-art" image={cardArt(item)} name={item.nome} text={item.habilidade}/><div><small>{source} • {RARITY_LABEL[rarity]} • Atual +{upLevel}</small><strong>{item.nome}</strong><p>Próximo reforço: +{targetLevel}{targetLevel>1?' • falha pode regredir':''}{upgradeFails>0?` • bônus de persistência +${Math.min(65,upgradeFails*8)}%`:''}</p><div className="forge-upgrade-costs"><span className={g.gold>=goldCost?'met':'missing'}><Coins size={13}/>{goldCost} ouro</span>{Object.entries(matCost).map(([mid,qty])=>{const owned=g.materials[mid]??0,name=FORGE_MATERIALS.find(m=>m.id===mid)?.nome??mid;return <span key={mid} className={owned>=qty?'met':'missing'}>{owned}/{qty} {name}</span>})}<span><Dices size={13}/>{chance}%</span></div></div><button className={canAfford?'primary':''} disabled={!canAfford} title={!canAfford?'Ouro ou materiais insuficientes':undefined} onClick={()=>g.upgradeEquipment(ref)}>Aprimorar +{targetLevel}</button></motion.article>})}</div>:<div className="forge-empty"><ArrowUpDown/><strong>Nenhum equipamento para aprimorar</strong><span>Guarde ou equipe uma peça de combate para liberar reforços.</span></div>}</section>
}
function ForgeScreen(){const g=useGame()
 const materials:ForgeMaterialEntry[]=[...Object.entries(REGION_MATERIALS).map(([regionId,m]):ForgeMaterialEntry=>({id:m.id,nome:m.nome,kind:'region',elemento:m.elemento,regionId})),...SUBREGION_THEME_MATERIALS.map((m):ForgeMaterialEntry=>({id:m.id,nome:m.nome,kind:'bioma',elemento:m.elemento})),...FORGE_MATERIALS.map((m):ForgeMaterialEntry=>({id:m.id,nome:m.nome,kind:'dismantle'})),...FORGE_GEMS.map((m):ForgeMaterialEntry=>({id:m.id,nome:m.nome,kind:'gem',texto:m.texto}))]
 const mastery=forgeLevelInfo(g.forgeXp??0),rate=(g.forgeAttempts??0)?Math.round((g.forgeSuccesses??0)/(g.forgeAttempts??1)*100):0,totalMaterials=Object.values(g.materials).reduce((sum,n)=>sum+n,0)
 const [materialInfo,setMaterialInfo]=React.useState<ForgeMaterialEntry|undefined>(undefined),[activeWorkbench,setActiveWorkbench]=React.useState<ForgeWorkbench>('craft')
 const recipeCount=FORGE_RECIPES.filter(recipe=>{const item=EQUIPMENT.find(e=>e.id===recipe.equipmentId);return item&&equipmentClassAllowed(item,g.heroId)}).length
 const upgradeCount=new Set([...(Object.entries(g.equipped) as [Slot,string|undefined][]).filter(([slot,ref])=>slot!=='bolsa'&&ref).map(([,ref])=>ref!),...g.equipmentBag.filter(ref=>equipmentByRef(ref)?.slot!=='bolsa')]).size
 const socketCount=(Object.entries(g.equipped) as [Slot,string|undefined][]).filter(([slot,ref])=>{const item=ref?equipmentByRef(ref):undefined;return slot!=='bolsa'&&!!item&&equipmentSocketCount(item)>0}).length
 const attuneCount=(Object.entries(g.equipped) as [Slot,string|undefined][]).filter(([slot,ref])=>slot!=='bolsa'&&ref).length
 const workbenches:{id:ForgeWorkbench;label:string;description:string;count:string;icon:React.ReactNode}[]=[
  {id:'craft',label:'Receitas',description:'Criar e refinar peças',count:String(recipeCount),icon:<Sparkles/>},
  {id:'upgrade',label:'Aprimorar',description:'Reforçar itens ativos',count:String(upgradeCount),icon:<ArrowUpDown/>},
  {id:'workshop',label:'Oficina',description:'Desmontar e encaixar',count:String(g.equipmentBag.length+socketCount),icon:<Gem/>},
  {id:'attune',label:'Sintonia',description:'Afinidade elemental',count:String(attuneCount),icon:<Zap/>}
 ]
 const active=workbenches.find(w=>w.id===activeWorkbench)??workbenches[0]
 return <div className="forge-page forge-redesign"><ForgeResultDialog/><section className="forge-hero-v2"><div className="forge-hero-copy"><span className="eyebrow">OFICINA DE HAVENDOWN</span><h1>Forja</h1><p>{blacksmithLine(mastery.level,g.forgeAttempts??0,totalMaterials)}</p><div className="forge-hero-actions"><button className="primary" onClick={()=>setActiveWorkbench('craft')}><Sparkles size={16}/>Receitas</button><button onClick={()=>setActiveWorkbench('upgrade')}><ArrowUpDown size={16}/>Aprimorar</button></div></div><aside className="forge-blacksmith-card"><img src={assetUrl(BLACKSMITH.retrato)} alt={BLACKSMITH.nome}/><div><small>{BLACKSMITH.titulo}</small><strong>{BLACKSMITH.nome}</strong><span>Ouro disponível: {g.gold}</span></div></aside></section><nav className="forge-workbench-nav" aria-label="Bancadas da Forja">{workbenches.map(bench=><button key={bench.id} className={activeWorkbench===bench.id?'active':''} onClick={()=>setActiveWorkbench(bench.id)}>{bench.icon}<span><strong>{bench.label}</strong><small>{bench.description}</small></span><b>{bench.count}</b></button>)}</nav><div className="forge-workspace-v2"><main className="forge-workbench-shell"><div className="forge-active-head"><span>{active.icon}</span><div><small>BANCADA ATIVA</small><h2>{active.label}</h2><p>{active.description}</p></div></div><AnimatePresence mode="wait" initial={false}><motion.div key={activeWorkbench} className="forge-workbench-content" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.18}}>{activeWorkbench==='craft'?<RecipeCatalog/>:activeWorkbench==='upgrade'?<ForgeUpgradePanel/>:activeWorkbench==='workshop'?<ForgeSalvagePanel/>:<ForgeTutorialPanel/>}</motion.div></AnimatePresence></main><aside className="forge-side-panel"><ForgeMasteryPanel mastery={mastery} rate={rate} attempts={g.forgeAttempts??0} successes={g.forgeSuccesses??0}/><ForgeMaterialsPanel materials={materials} totalMaterials={totalMaterials} onSelect={setMaterialInfo}/><ForgeTutorialPanel showAttunement={false}/></aside></div>{materialInfo&&<MaterialSourceDialog material={materialInfo} onClose={()=>setMaterialInfo(undefined)}/>}</div>
}
function Panel({title,children,className=''}:{title?:string;children:React.ReactNode;className?:string}){const content=className.split(' ').includes('summary'),guildHead=className.split(' ').includes('guild-head');const nodes=React.Children.toArray(children);return <section className={'panel '+className}>{title&&<h2 className="panel-title">{title}</h2>}{content?<>{nodes.slice(0,-4)}<hr/><MapGuildMissions/></>:children}{guildHead&&<button className="guild-reset-rank" onClick={()=>window.confirm('Zerar ranking, contratos aceitos e progresso da Guilda? Seus demais itens e avanços serão preservados.')&&useGame.setState({guildAccepted:[],guildProgress:{},guildClaimed:[],guildNotice:'Ranking da Guilda reiniciado para teste.'})}>Reiniciar ranking</button>}</section>}
// Painel reutilizável de "NPC falando com o jogador" -- mesmo visual da Brenna na Guilda,
// agora também usado pela mercadora da Loja e pelo ferreiro da Forja, para que essas telas
// deixem de ser puros formulários e ganhem uma voz por trás do balcão.
function NpcBanner({name,title,line,image,icon}:{name:string;title:string;line:string;image?:string;icon?:React.ReactNode}){
 return <Panel className="npc-banner"><span className="npc-banner-portrait">{image?<img src={assetUrl(image)} alt={name}/>:icon??<UserRound/>}</span><div className="npc-banner-copy"><span className="npc-banner-name">{name}<small>{title}</small></span><p><Quote size={13}/>{line}</p></div></Panel>
}
const WORLD_MAPS:Record<string,{base:string;hd:string;label:string}>={havendown:{base:'./assets/maps/eldravar-pixel-v2.png',hd:'./assets/maps/eldravar-pixel-v2.png',label:'Havendown'},steelmere:{base:'./assets/maps/steelmere.png',hd:'./assets/maps/steelmere.png',label:'Steelmere'}}
// Reúne, num só lugar no mapa, as duas fontes de "missão ativa" da campanha: os contratos da
// Guilda (já existia) e o objetivo do capítulo atual das Crônicas (StoryCampaignPanel) --
// antes só aparecia visitando a tela de Crônicas, então não dava pra acompanhar sem sair do mapa.
function MapGuildMissions(){
  const g=useGame()
  const missions=GUILD_MISSIONS.filter(m=>g.guildAccepted.includes(m.id)&&!g.guildClaimed.includes(m.id))
  const chapter=STORY_CHAPTERS.find(c=>c.id===g.storyChapterId)??STORY_CHAPTERS[0]
  const storyProgress=chapter.requirement?storyRequirementProgress(g):undefined
  const activeQuests=Object.keys(g.activeStoryQuests??{}).map(id=>questById(id)).filter((q):q is StoryQuest=>Boolean(q))
  const total=missions.length+(storyProgress?1:0)+activeQuests.length

  if(!total)return <section className="map-mission-empty"><strong>Missão ativa</strong><Trophy/><p>Nenhum contrato ativo.</p><button onClick={()=>g.setScreen('guild')}>Visitar a Guilda</button></section>

  return <section className="map-active-missions">
    <div className="map-mission-title"><strong>Missões ativas</strong><span>{total}</span></div>
    {activeQuests.map(q=>{
      const targetRegion=TERRITORIES.find(t=>t.id===q.targetRegionId)
      const targetNpc=npcById(q.targetNpcId)
      const hasItem=q.questItem?(g.questItems?.[q.questItem.id]??0)>=q.questItem.quantity:true
      return <article className={`story-active-quest ${hasItem?'ready':''}`} key={q.id}>
        <header>
          <Mail/>
          <div>
            <small>{hasItem?'ENCOMENDA PRONTA PARA ENTREGA':`HISTÓRIA • ATO ${q.act}`}</small>
            <strong>{q.title}</strong>
          </div>
        </header>
        <p>{q.summary}</p>
        <div className="map-mission-progress">
          <span>Destino: <b>{targetRegion?.nome??q.targetRegionId}</b> ({targetNpc?.nome??'Destinatário'})</span>
        </div>
        {q.questItem&&<span className="quest-tracker-item">{q.questItem.icon??'📦'} {q.questItem.name} — {hasItem?'✓ Em posse':'✗ Item ausente'}</span>}
        <footer>
          <span>+{q.reward.gold} ouro • +{q.reward.xp} XP</span>
          {targetRegion&&<button onClick={()=>g.openRegion(targetRegion)}>Ir para {targetRegion.nome}</button>}
        </footer>
      </article>
    })}
    {storyProgress&&<article className={storyProgress.complete?'ready':''}><header><History/><div><small>{storyProgress.complete?'OBJETIVO CONCLUÍDO':`CRÔNICAS • ATO ${chapter.act}`}</small><strong>{chapter.requirement!.label}</strong></div></header><p>{chapter.title} — {chapter.region}</p><div className="map-mission-progress"><span>Progresso <b>{storyProgress.current}/{storyProgress.required}</b></span><div className="xp-track"><div style={{width:`${Math.min(100,storyProgress.current/storyProgress.required*100)}%`}}/></div></div><footer><span>{storyProgress.complete?'Pronto para decidir o rumo':'Campanha narrativa'}</span><button onClick={()=>g.setScreen('chronicle')}>{storyProgress.complete?'Escolher rumo':'Ver em Crônicas'}</button></footer></article>}
    {missions.map(m=>{const progress=guildMissionProgress(g,m),ready=progress>=m.quantidade;return <article className={ready?'ready':''} key={m.id}><header><Trophy/><div><small>{ready?'OBJETIVO CONCLUÍDO':'CONTRATO DA GUILDA'}</small><strong>{m.nome}</strong></div></header><p>{m.descricao}</p><div className="map-mission-progress"><span>{m.tipo==='delivery'?'Entrega':m.tipo==='material'?'Coleta':'Progresso'} <b>{progress}/{m.quantidade}</b></span><div className="xp-track"><div style={{width:`${Math.min(100,progress/m.quantidade*100)}%`}}/></div></div><footer><span>{m.recompensa.tipo==='gold'?`${m.recompensa.valor} ouro`:'Equipamento compatível'}</span>{ready&&<button onClick={()=>g.setScreen('guild')}>Resgatar na Guilda</button>}</footer></article>})}
    <button className="map-mission-guild-link" onClick={()=>g.setScreen('guild')}>Abrir Guilda</button>
  </section>
}

function MapScreen(){
 const g=useGame()
 const world=g.world??'havendown',worldInfo=WORLD_MAPS[world]
 React.useEffect(()=>{const image=document.querySelector<HTMLImageElement>('.map-wrap>img');if(image)image.src=worldInfo.hd},[world])
 const li=levelInfo(g.xp),regions=[...TERRITORIES].filter(t=>(t.mundo??'havendown')===world).sort(regionListSort)
 const worldSubregions=SUBREGIONS.filter(sub=>regions.some(r=>r.id===sub.regionId))
 const completedSubregions=worldSubregions.filter(sub=>g.subregionBossesDefeated.includes(sub.id)).length
 const completedRegions=regions.filter(region=>{const subs=worldSubregions.filter(sub=>sub.regionId===region.id);return subs.length>0&&subs.every(sub=>g.subregionBossesDefeated.includes(sub.id))}).length
 const otherWorld=world==='havendown'?'steelmere':'havendown',otherUnlocked=worldUnlocked(g,otherWorld)
 // Viagem rápida (clique direto numa região/sub-região no mapa) foi removida: agora a única
 // forma de se mover entre regiões é caminhar pelas setas ANTERIOR/PRÓXIMA REGIÃO na tela da
 // região (region-step-nav), que já tem o aviso de PERIGO EXTREMO. O mapa continua clicável
 // só pra reabrir a região onde você já está -- sem isso, sair pra Mochila/Ficha e voltar pelo
 // Mapa não dava como reentrar na região atual em exploração -- e, sempre, Planícies de Alvora
 // (HOME_REGION_ID), o ponto de retorno que nunca se fecha.
 const canFastTravel=(id:string)=>canFastTravelToRegion(id,g.regionId,Boolean(getRegionMap(id)))
 return <div className="map-layout map-layout-with-index"><Panel className="map-region-index"><div className="map-index-head"><span className="eyebrow">EXPLORAÇÃO</span><h2>Regiões de {worldInfo.label}</h2><p>Destinos organizados por nível de dificuldade.</p></div><div className="screen-intro"><small>COMO LER O MAPA</small><p>Cada região e sub-região tem um nível recomendado. O painel lateral resume sua build atual e ajuda a decidir se vale avançar ou revisar o equipamento.</p></div>{world==='havendown'&&otherUnlocked&&<motion.div {...rarityMotionProps('raro',.04)} className="world-travel-card"><small>ROTAS ENTRE MUNDOS</small><p>Quando quiser mudar de cenário, siga para Steelmere e use o outro mapa como base da viagem.</p><button className="map-travel-button" onClick={()=>g.travelWorld(otherWorld)}><Plane size={16}/>Viajar para Steelmere</button></motion.div>}{otherUnlocked&&world!=='havendown'&&<motion.div {...rarityMotionProps('raro',.04)}><button className="map-travel-button" onClick={()=>g.travelWorld(otherWorld)}><Plane size={16}/>Voltar para {WORLD_MAPS[otherWorld].label}</button></motion.div>}{!otherUnlocked&&<motion.div {...rarityMotionProps('comum',.04)} className="world-travel-card world-travel-debug"><small>ATALHO DE TESTE</small><p>Pula a missão da travessia (q_cross_oceans) só pra validar Steelmere sem precisar cumprir a história.</p><button className="map-travel-button" onClick={()=>g.debugTravelWorld(otherWorld)}><Plane size={16}/>[Teste] Viajar para {WORLD_MAPS[otherWorld].label}</button></motion.div>}<div className="map-index-totals"><span><Map/><small>REGIÕES</small><strong>{completedRegions}/{regions.length}</strong></span><span><ScrollText/><small>SUB-REGIÕES</small><strong>{completedSubregions}/{worldSubregions.length}</strong></span></div><div className="map-region-list">{regions.map((region,index)=>{const subs=worldSubregions.filter(sub=>sub.regionId===region.id).sort((a,b)=>a.nivelMin-b.nivelMin),done=subs.filter(sub=>g.subregionBossesDefeated.includes(sub.id)).length,completed=subs.length>0&&done===subs.length,unlocked=canFastTravel(region.id);return <motion.section {...rarityMotionProps(completed?'incomum':'comum',index*.035)} className={`map-index-region${completed?' completed':''}${unlocked?'':' locked'}`} key={region.id}><button className="map-index-region-button" disabled={!unlocked} title={unlocked?undefined:'Caminhe até esta região pelas setas ANTERIOR/PRÓXIMA REGIÃO a partir da região onde você está.'} onClick={()=>g.openRegion(region)}><span className="map-index-difficulty">{region.dificuldade}</span><span><strong>{region.nome}</strong><small>Nível {region.nivelMin}–{region.nivelMax}</small></span><b>{done}/{subs.length}</b></button>{subs.length>0?<div className="map-index-subs">{subs.map(sub=>{const subDone=g.subregionBossesDefeated.includes(sub.id);return <button className={subDone?'completed':''} disabled={!unlocked} title={unlocked?undefined:'Caminhe até esta região primeiro.'} key={sub.id} onClick={()=>unlocked&&g.openSubregion(sub.id)}><i>{subDone?'✓':'◆'}</i><span>{sub.nome}<small>Nível {sub.nivelMin}–{sub.nivelMax}</small></span></button>})}</div>:<p className="map-index-soon">Sub-regiões em construção.</p>}</motion.section>})}</div></Panel><Panel className="map-panel"><div className="screen-intro"><small>DESTINO ATUAL</small><p>O marcador da sua região atual reabre a exploração de onde você parou, e Planícies de Alvora está sempre aberta para você voltar. Para chegar a outra região, use as setas ANTERIOR/PRÓXIMA REGIÃO a partir da região onde você está.</p></div><motion.div {...rarityMotionProps('epico',.06)} className="map-wrap"><img src={worldInfo.base} alt={`Mapa de ${worldInfo.label}`}/>{regions.map((t,i)=>{const subs=worldSubregions.filter(s=>s.regionId===t.id);const completed=subs.length>0&&subs.every(s=>g.subregionBossesDefeated.includes(s.id));const unlocked=canFastTravel(t.id);return <button key={t.id} className={`map-sub-pin map-territory-pin${completed?' completed':''}${unlocked?'':' locked'}${pinEdgeClass(t.x,t.y)}`} style={{left:`${t.x*100}%`,top:`${t.y*100}%`,'--i':i} as React.CSSProperties} disabled={!unlocked} onClick={()=>g.openRegion(t)} title={unlocked?`Explorar ${t.nome}`:`Caminhe até ${t.nome} pelas setas ANTERIOR/PRÓXIMA REGIÃO a partir da região onde você está.`} aria-label={unlocked?`Explorar território ${t.nome}`:`${t.nome} só se abre caminhando a partir da região atual`}><span>{completed?'✓':unlocked?'◆':'🔒'}</span><b>{t.nome}</b></button>})}</motion.div></Panel><Panel title="Resumo do herói" className="summary"><Stat label="Vida" value={`${g.hp}/${maxHp(g)}`}/><Stat label="Poder de ataque" value={attackValue(g)}/><Stat label="Armadura" value={armorValue(g)}/><Stat label="Ouro" value={g.gold}/><Stat label="Equip. guardados" value={`${g.equipmentBag.length}/${equipmentBagCapacity(g)}`}/><hr/><div className="level-row"><strong>Nível {li.lvl}</strong><span>{li.progress}/{li.next} XP</span></div><div className="xp-track"><div style={{width:`${Math.min(100,li.progress/li.next*100)}%`}}/></div><p className="muted">Experiência total: {g.xp}</p><p className={g.attributePoints?'points hot':'points'}>Pontos de atributo: {g.attributePoints}</p><hr/><strong>Exploração de {worldInfo.label}</strong><p className="muted">Use as setas ANTERIOR/PRÓXIMA REGIÃO, dentro da região atual, para caminhar até outros destinos.</p><p className="hint">Marcadores verdes indicam chefes já derrotados; o cadeado mostra regiões que só se abrem caminhando a partir da região atual (Planícies de Alvora nunca fica trancada).</p></Panel></div>
}

function dangerFor(level:number,min:number,max:number){if(level<min-2)return {label:'PERIGO EXTREMO',stars:5,cls:'deadly'};if(level<min)return {label:'Difícil',stars:4,cls:'hard'};if(level<=max)return {label:'Adequado',stars:3,cls:'fair'};if(level<=max+3)return {label:'Fácil',stars:2,cls:'easy'};return {label:'Muito fácil',stars:1,cls:'easy'}}
// Andar de região em região (setas ANTERIOR/PRÓXIMA) sempre foi de propósito livre de qualquer
// trava de progresso -- é o caminho manual pra quem ainda não liberou viagem rápida (ver
// comentário em MapScreen). Isso deixa um personagem recém-criado chegar a pé numa região de
// nível 30+ sem barreira nenhuma, e a única pista de perigo era uma estrela na tela anterior.
// Em vez de bloquear esse "sequence break" (mantém a liberdade de quem sabe o que está fazendo),
// confirma explicitamente antes do combate quando o desnível é PERIGO EXTREMO -- evita a surpresa
// de abrir uma luta perdida sem aviso nenhum, sem tirar a opção de continuar mesmo assim.
function confirmExtremeDanger(level:number,enemyLevel:number,enemyName:string):Promise<boolean>{
 if(level>=enemyLevel-2)return Promise.resolve(true)
 return new Promise(resolve=>{
  const overlay=document.createElement('div');overlay.className='coop-risk-overlay'
  overlay.innerHTML=`<section role="dialog"><small>PERIGO EXTREMO</small><h2>Inimigo muito acima do seu nível</h2><p>${enemyName} está no nível <b>${enemyLevel}</b>, bem acima do seu nível <b>${level}</b>. É bem provável que essa batalha termine em derrota rápida. Deseja continuar mesmo assim?</p><div><button data-action="cancel">Recuar</button><button class="primary" data-action="continue">Enfrentar mesmo assim</button></div></section>`
  overlay.onclick=event=>{const action=(event.target as HTMLElement).closest('button')?.dataset.action;if(!action)return;overlay.remove();resolve(action==='continue')}
  document.body.appendChild(overlay)
 })
}
// Contratos da Guilda direto no diálogo da Brenna no mapa navegável -- os já aceitos (prontos
// pra resgate ou ainda em progresso) e os disponíveis pro rank atual -- pra aceitar/resgatar
// sem precisar abrir a tela cheia da Guilda. Mesma fonte de dados que o GuildHerald usa
// (availableGuildMissions, pura e sempre atual), só que aqui os botões agem direto.
function BrennaMissionPanel(){
 const g=useGame()
 const missions=availableGuildMissions(g.guildClaimed)
 const reputation=g.guildClaimed.reduce((sum,id)=>sum+(guildMissionById(id)?.dificuldade??0),0)
 const rankIndex=GUILD_RANKS.findIndex(r=>r.id===guildRankFor(reputation).id)
 const bagFull=g.equipmentBag.length>=equipmentBagCapacity(g)
 const active=sortGuildMissionsByRank(missions.filter(m=>g.guildAccepted.includes(m.id)&&!g.guildClaimed.includes(m.id)))
 const available=sortGuildMissionsByRank(missions.filter(m=>!g.guildAccepted.includes(m.id)&&!g.guildClaimed.includes(m.id)&&rankIndex>=GUILD_RANKS.findIndex(r=>r.id===m.rank)))
 if(!active.length&&!available.length)return null
 return <div className="npc-mission-panel">
  {active.length>0&&<div className="npc-mission-group"><small>EM ANDAMENTO</small>{active.slice(0,3).map(m=>{
   const progress=guildMissionProgress(g,m),ready=progress>=m.quantidade,equipmentReward=m.recompensa.tipo==='equipment'
   return <div key={m.id} className={`npc-mission-row${ready?' ready':''}`}>
    <div className="npc-mission-info"><strong>{m.nome}</strong><span>{progress}/{m.quantidade}</span></div>
    <p className="npc-mission-desc">{m.descricao}</p>
    <div className="xp-track"><div style={{width:`${Math.min(100,progress/m.quantidade*100)}%`}}/></div>
    {ready?<button className="primary" disabled={equipmentReward&&bagFull} onClick={()=>g.claimGuildMission(m.id)}>{equipmentReward&&bagFull?'Bolsa cheia':m.tipo==='delivery'||m.tipo==='material'?'Entregar':'Resgatar'}</button>:<small className="npc-mission-hint">{m.tipo==='delivery'?'Precisa do item na bolsa':m.tipo==='material'?'Colete o material pedido':'Continue avançando'}</small>}
   </div>})}
   {active.length>3&&<small className="npc-mission-more">+{active.length-3} contrato(s) em andamento no quadro</small>}
  </div>}
  {available.length>0&&<div className="npc-mission-group"><small>DISPONÍVEIS</small>{available.slice(0,3).map(m=><div key={m.id} className="npc-mission-row">
    <div className="npc-mission-info"><strong>{m.nome}</strong><span>{m.recompensa.tipo==='gold'?`${m.recompensa.valor} ouro`:'Equipamento'}</span></div>
    <p className="npc-mission-desc">{m.descricao}</p>
    <button onClick={()=>g.acceptGuildMission(m.id)}>Aceitar</button>
   </div>)}
   {available.length>3&&<small className="npc-mission-more">+{available.length-3} contrato(s) no quadro</small>}
  </div>}
 </div>
}
// Loja em miniatura direto no diálogo do vendedor especializado no mapa -- em vez de navegar
// pra tela cheia da Loja, lista os itens da categoria+tier dele (reaproveitando ShopEquipment/
// ShopConsumable, que já cuidam de preço, bloqueio de nível/classe e raridade) com um carrinho
// simples embutido. Vender não é suportado aqui -- pra vender de volta, use a Loja do menu.
function VendorShopPanel({npc}:{npc:NpcDefinition}){
 const g=useGame()
 const [cart,setCart]=React.useState<Record<string,number>>({})
 const category=npc.shopCategory!,tier=npc.shopTier!
 const tierMatch=(item:{raridade?:Rarity})=>{
  const r=item.raridade??'comum'
  if(category==='consumivel')return tier==='simples'?r==='comum':r!=='comum'
  return tier==='simples'?(r==='comum'||r==='incomum'):r==='raro'
 }
 // Armas não são de fato restritas por classe (equipmentClassAllowed deixa passar quase tudo);
 // a Loja completa só mostra a classe do herói por padrão via filtro de UI. Sem esse filtro
 // aqui, reproduzimos o mesmo recorte na hora de montar a lista -- senão a mini loja mistura
 // armas de todas as classes, a maioria inútil pro herói atual.
 const items:Array<{id:string;nome:string;preco:number}>=category==='consumivel'
  ?CONSUMABLES.filter(tierMatch)
  :EQUIPMENT.filter(e=>category==='arma'?e.slot==='mao_direita':e.slot!=='mao_direita').filter(e=>equipmentClassAllowed(e,g.heroId)).filter(e=>category!=='arma'||!equipmentAffinity(e)||equipmentAffinity(e)===g.heroId).filter(tierMatch)
 const lines=Object.entries(cart).filter(([,q])=>q>0).flatMap(([id,qty])=>{const item=items.find(i=>i.id===id);return item?[{id,qty,item}]:[]})
 const count=lines.reduce((sum,line)=>sum+line.qty,0),total=lines.reduce((sum,line)=>sum+line.item.preco*line.qty,0)
 const equipmentCount=category==='consumivel'?0:count
 const valid=count>0&&total<=g.gold&&g.equipmentBag.length+equipmentCount<=equipmentBagCapacity(g)
 const add=(id:string)=>setCart(current=>({...current,[id]:(current[id]??0)+1}))
 const dec=(id:string)=>setCart(current=>{const next={...current};if((next[id]??0)<=1)delete next[id];else next[id]--;return next})
 const remove=(id:string)=>setCart(current=>{const next={...current};delete next[id];return next})
 const confirm=()=>{if(!valid)return;lines.forEach(line=>{for(let i=0;i<line.qty;i++)category==='consumivel'?g.buyConsumable(line.id):g.buyEquipment(line.id)});setCart({})}
 if(!items.length)return <p className="npc-shop-empty">Nada em estoque no momento.</p>
 return <div className="npc-shop-panel">
  <div className="npc-shop-items">{items.map(item=>category==='consumivel'?<ShopConsumable key={item.id} id={item.id} onAdd={()=>add(item.id)} quantity={cart[item.id]??0}/>:<ShopEquipment key={item.id} id={item.id} onAdd={()=>add(item.id)} quantity={cart[item.id]??0}/>)}</div>
  {count>0&&<div className="npc-shop-cart">
   <div className="npc-shop-cart-lines">{lines.map(line=><div key={line.id} className="npc-shop-cart-line">
    <span className="npc-shop-cart-name">{line.item.nome}</span>
    <div className="npc-shop-cart-qty"><button title="Diminuir" onClick={()=>dec(line.id)}><Minus size={12}/></button><b>{line.qty}</b><button title="Aumentar" onClick={()=>add(line.id)}><Plus size={12}/></button></div>
    <span className="npc-shop-cart-line-total">{line.qty*line.item.preco}</span>
    <button className="npc-shop-cart-remove" title="Remover" onClick={()=>remove(line.id)}><Trash2 size={13}/></button>
   </div>)}</div>
   <div className="npc-shop-cart-footer"><span><ShoppingCart size={14}/>{count} {count===1?'item':'itens'} • <b>{total} ouro</b></span><button className="primary" disabled={!valid} title={!valid?(!count?'Carrinho vazio':total>g.gold?'Ouro insuficiente':'Bolsa de equipamentos cheia'):undefined} onClick={confirm}>Confirmar compra</button></div>
  </div>}
 </div>
}
function NpcStoryQuestSection({ npc, onClose }: { npc: NpcDefinition; onClose: () => void }) {
  const g = useGame()
  const deliverable = questsDeliverableToNpc(npc.id, g.activeStoryQuests ?? {})
  const offered = questsOfferedByNpc(npc.id, g.completedStoryQuests ?? [], g.activeStoryQuests ?? {})
  const activeFromSource = STORY_QUESTS.filter(q => q.sourceNpcId === npc.id && g.activeStoryQuests?.[q.id])

  if (!deliverable.length && !offered.length && !activeFromSource.length) return null

  return (
    <div className="npc-quest-container">
      {deliverable.map(quest => {
        const hasItem = quest.questItem ? (g.questItems?.[quest.questItem.id] ?? 0) >= quest.questItem.quantity : true
        return (
          <div key={quest.id} className={`npc-quest-card deliverable ${hasItem ? 'ready' : 'waiting'}`}>
            <div className="npc-quest-badge">
              {hasItem ? '📦 PRONTO PARA ENTREGA' : '⏳ AGUARDANDO PRODUTO'}
            </div>
            <h3 className="npc-quest-title">{quest.title}</h3>
            <p className="npc-quest-speech">“{hasItem ? quest.dialogue.targetWelcome : quest.dialogue.inProgress}”</p>
            {quest.questItem && (
              <div className="npc-quest-item-req">
                <span>{quest.questItem.icon ?? '📦'} {quest.questItem.name}</span>
                <b>{hasItem ? '✓ Na mochila de crônicas' : '✗ Item ausente'}</b>
              </div>
            )}
            <div className="npc-quest-reward-preview">
              <small>RECOMPENSA:</small>
              <span>+{quest.reward.gold} Ouro • +{quest.reward.xp} XP {quest.reward.loreTitle ? `• Título: ${quest.reward.loreTitle}` : ''}</span>
            </div>
            {hasItem && (
              <button
                className="npc-quest-turnin-btn"
                onClick={() => {
                  g.turnInStoryQuest(quest.id)
                  playSfx('levelup')
                  playSfx('coin')
                }}
              >
                Entregar Encomenda e Concluir
              </button>
            )}
          </div>
        )
      })}

      {offered.map(quest => {
        const targetTerritory = TERRITORIES.find(t => t.id === quest.targetRegionId)
        const targetNpc = npcById(quest.targetNpcId)
        return (
          <div key={quest.id} className="npc-quest-card offered">
            <div className="npc-quest-badge">
              ✨ NOVA MISSÃO (ATO {quest.act})
            </div>
            <h3 className="npc-quest-title">{quest.title}</h3>
            <p className="npc-quest-speech">“{quest.dialogue.offer}”</p>
            <div className="npc-quest-travel-target">
              <Footprints size={14} />
              <span><b>Destino:</b> {targetTerritory?.nome ?? quest.targetRegionId} ({targetNpc?.nome ?? 'Destinatário'})</span>
            </div>
            {quest.questItem && (
              <div className="npc-quest-item-req">
                <small>RECEBERÁ:</small>
                <span>{quest.questItem.icon ?? '📦'} {quest.questItem.name} ({quest.questItem.description})</span>
              </div>
            )}
            <div className="npc-quest-reward-preview">
              <small>RECOMPENSA AO ENTREGAR:</small>
              <span>+{quest.reward.gold} Ouro • +{quest.reward.xp} XP</span>
            </div>
            <button
              className="npc-quest-accept-btn"
              onClick={() => {
                g.acceptStoryQuest(quest.id)
                playSfx('coin')
              }}
            >
              Aceitar Missão
            </button>
          </div>
        )
      })}

      {activeFromSource.map(quest => {
        const targetTerritory = TERRITORIES.find(t => t.id === quest.targetRegionId)
        const targetNpc = npcById(quest.targetNpcId)
        return (
          <div key={quest.id} className="npc-quest-card in-progress">
            <div className="npc-quest-badge">EM ANDAMENTO</div>
            <h3 className="npc-quest-title">{quest.title}</h3>
            <p className="npc-quest-speech">“{quest.dialogue.inProgress}”</p>
            <small className="npc-quest-reminder">
              Lembrete: Viaje até <b>{targetTerritory?.nome ?? quest.targetRegionId}</b> e procure por <b>{targetNpc?.nome ?? quest.targetNpcId}</b>.
            </small>
          </div>
        )
      })}
    </div>
  )
}

function NpcDialog({ npc, onClose }: { npc: NpcDefinition; onClose: () => void }) {
  const g = useGame()
  const deliverable = questsDeliverableToNpc(npc.id, g.activeStoryQuests ?? {})
  const offered = questsOfferedByNpc(npc.id, g.completedStoryQuests ?? [], g.activeStoryQuests ?? {})
  const status = deliverable.length > 0 ? 'ready' : offered.length > 0 ? 'available' : 'default'
  const dialogueIndex = status === 'ready' ? 2 : status === 'available' ? 1 : 0
  const speech = npc.dialogue[dialogueIndex] ?? npc.dialogue[0]
  const territory = TERRITORIES.find(t => t.id === npc.regionId)

  return (
    <div className="regionmap-encounter-backdrop" onClick={onClose}>
      <section className="regionmap-npc-dialog story-npc-dialog" onClick={event => event.stopPropagation()}>
        <div className="regionmap-npc-dialog-head">
          <span className="npc-banner-portrait">
            <img src={assetUrl(npc.portrait ?? npc.sprite)} alt={npc.nome} />
          </span>
          <div>
            <span className="eyebrow">PERSONAGEM • {territory?.nome.toUpperCase() ?? 'HAVENDOWN'}</span>
            <h2>{npc.nome}</h2>
            <small>{npc.titulo}</small>
          </div>
          <button className="npc-dialog-close-btn" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>

        <NpcStoryQuestSection npc={npc} onClose={onClose} />

        <p className="npc-dialogue-quote"><Quote size={15} />{speech}</p>

        {npc.services.includes('guild') && <BrennaMissionPanel />}
        {npc.shopCategory && <VendorShopPanel npc={npc} />}

        <div className="npc-dialog-footer-actions">
          <button onClick={onClose}>Continuar explorando</button>
          {!npc.shopCategory && npc.services.some(s => s !== 'quest') && (
            <button className="primary" onClick={() => { onClose(); g.setScreen(npc.screen) }}>
              {npc.services.includes('guild') ? 'Abrir Guilda' : npc.services.includes('forge') ? 'Abrir Forja' : 'Abrir'}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

function RegionNpcBar({ regionId, onSelectNpc }: { regionId: string; onSelectNpc: (npc: NpcDefinition) => void }) {
  const g = useGame()
  const npcs = npcsForRegion(regionId)
  if (!npcs.length) return null

  return (
    <div className="region-npcs-bar">
      <div className="region-npcs-header">
        <Users size={16} />
        <span>Personagens na Região ({npcs.length})</span>
      </div>
      <div className="region-npcs-chips">
        {npcs.map(npc => {
          const hasDeliverable = questsDeliverableToNpc(npc.id, g.activeStoryQuests ?? {}).some(q => {
            if (q.questItem) return (g.questItems?.[q.questItem.id] ?? 0) >= q.questItem.quantity
            return true
          })
          const hasOffered = questsOfferedByNpc(npc.id, g.completedStoryQuests ?? [], g.activeStoryQuests ?? {}).length > 0
          const statusClass = hasDeliverable ? 'chip-ready' : hasOffered ? 'chip-available' : ''
          const badgeText = hasDeliverable ? 'Entregar!' : hasOffered ? 'Nova Missão!' : npc.services.includes('guild') ? 'Guilda' : npc.services.includes('forge') ? 'Forja' : npc.services.includes('shop') ? 'Loja' : undefined

          return (
            <button key={npc.id} className={`region-npc-chip ${statusClass}`} onClick={() => onSelectNpc(npc)}>
              <div className="region-npc-avatar">
                <img src={assetUrl(npc.portrait ?? npc.sprite)} alt={npc.nome} />
                {hasDeliverable && <span className="npc-chip-indicator ready">!</span>}
                {!hasDeliverable && hasOffered && <span className="npc-chip-indicator available">!</span>}
              </div>
              <div className="region-npc-info">
                <strong>{npc.nome}</strong>
                <small>{badgeText ?? npc.titulo}</small>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RegionMapView({region,subs,level,selectedSub}:{region:Territory;subs:Subregion[];level:number;selectedSub?:Subregion}){
 const g=useGame()
 const map=getRegionMap(region.id)!
 const [activeSub,setActiveSub]=React.useState<Subregion|undefined>(selectedSub??subs[0])
 const [encounterPrompt,setEncounterPrompt]=React.useState<Subregion|undefined>()
 const [activeNpc,setActiveNpc]=React.useState<NpcDefinition|undefined>()
 const [showBattleDetails,setShowBattleDetails]=React.useState(false)
 const [monolithPicker,setMonolithPicker]=React.useState(false)
 const [chestNotice,setChestNotice]=React.useState<string|undefined>()
 const handleActivateMonolith=(monolithId:string)=>{g.discoverMonolith(monolithId);setMonolithPicker(true)}
 const handleOpenChest=(chest:{id:string;name:string;x:number;y:number;icon?:string;contents:{gold:number;materials?:Record<string,number>;consumables?:Record<string,number>}})=>{
  if(!g.openMapChest(chest.id,chest))return
  setChestNotice(useGame.getState().explorationNote)
 }
 React.useEffect(()=>setActiveSub(selectedSub??subs[0]),[region.id,selectedSub,subs])
 const startLoc=selectedSub&&map.locations.find(l=>l.subId===selectedSub.id)
 const savedPos=g.regionMapPositions?.[region.id]
  const initialPos=savedPos??(startLoc?{x:startLoc.x,y:startLoc.y}:undefined)
  const mapSpriteId=['guerreiro','guardiao','cacadora','arcanista','druida','cacador','monge','sacerdotisa','conjurador'].includes(g.heroId??'')?g.heroId:undefined
  // Névoa de guerra: quem já tinha posição salva nesta região andou por ela antes da névoa
  // existir -- herda o mapa todo revelado (uma vez) em vez de reaparecer no escuro num save
  // antigo. Regiões nunca visitadas começam totalmente cobertas.
  const knownTiles=g.exploredMapTiles?.[region.id]
  const exploredSet=React.useMemo(()=>{
    if(knownTiles)return new Set(knownTiles)
    if(!savedPos)return new Set<string>()
    const all=new Set<string>()
    for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++)all.add(`${x},${y}`)
    return all
  },[knownTiles,savedPos,map])
  React.useEffect(()=>{
    if(knownTiles||!savedPos)return
    const all:Array<{x:number;y:number}>=[]
    for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++)all.push({x,y})
    g.revealMapTiles(region.id,all)
  },[knownTiles,savedPos,region.id,map])
  const locationStatus=(subId:string):'done'|'ready'|'default'=>{const sub=subs.find(s=>s.id===subId);if(!sub)return 'default';if(g.subregionBossesDefeated.includes(sub.id))return 'done';const wins=g.subregionVictories[sub.id]??0;return wins>=sub.encontrosNecessarios?'ready':'default'}
  const handleEnter=(subId:string)=>{const sub=subs.find(s=>s.id===subId);if(sub){setActiveSub(sub);setEncounterPrompt(sub);setShowBattleDetails(false)}}
  const world=region.mundo??'havendown',worldProgression=[...TERRITORIES].filter(t=>(t.mundo??'havendown')===world).sort(regionListSort),regionIndex=worldProgression.findIndex(t=>t.id===region.id),exitTargets={prev:worldProgression[regionIndex-1],next:worldProgression[regionIndex+1]} as const
  const regionExits=(map.exits??[]).flatMap(exit=>{const target=exit.targetRegionId?TERRITORIES.find(t=>t.id===exit.targetRegionId):exitTargets[exit.id as 'prev'|'next'];return target?[{...exit,label:target.nome,region:target,theme:REGION_UI_THEME[target.id]}]:[]})
  const handleExit=(exitId:string)=>{const exit=regionExits.find(item=>item.id===exitId);if(exit)g.openRegion(exit.region)}
  const npcs=npcsForRegion(region.id)
 const npcStatus=(npc:NpcDefinition):'ready'|'available'|'default'=>{
  const hasDeliverable=questsDeliverableToNpc(npc.id,g.activeStoryQuests??{}).some(q=>{
    if(q.questItem)return (g.questItems?.[q.questItem.id]??0)>=q.questItem.quantity
    return true
  })
  if(hasDeliverable)return 'ready'
  const hasOffered=questsOfferedByNpc(npc.id,g.completedStoryQuests??[],g.activeStoryQuests??{}).length>0
  if(hasOffered)return 'available'
  if(npc.services.includes('guild')){const missions=availableGuildMissions(g.guildClaimed),ready=missions.some(m=>g.guildAccepted.includes(m.id)&&!g.guildClaimed.includes(m.id)&&guildMissionProgress(g,m)>=m.quantidade);if(ready)return'ready';const available=missions.some(m=>!g.guildAccepted.includes(m.id)&&!g.guildClaimed.includes(m.id));return available?'available':'default'}
  if(npc.services.includes('forge')){const canUpgrade=Object.values(g.equipped).some(ref=>{if(!ref)return false;const item=equipmentByRef(ref);if(!item)return false;const current=g.equipmentUpgrades[ref]??0;if(current>=3)return false;const target=(current+1)as 1|2|3,goldCost=equipmentUpgradeCost(item,current),materialCost=equipmentUpgradeMaterialCost(item,target);return g.gold>=goldCost&&Object.entries(materialCost).every(([id,qty])=>(g.materials[id]??0)>=qty)});return canUpgrade?'available':'default'}
  if(npc.services.includes('shop')&&npc.shopCategory!=='consumivel'){return g.equipmentBag.length>=equipmentBagCapacity(g)-1?'available':'default'}
  return'default'
 }
 const sub=activeSub??subs[0]
 if(!sub)return null
 const wins=g.subregionVictories[sub.id]??0,bossDown=g.subregionBossesDefeated.includes(sub.id),ready=wins>=sub.encontrosNecessarios&&!bossDown,danger=dangerFor(level,sub.nivelMin,sub.nivelMax)
 const encounterDialog=encounterPrompt&&<div className="regionmap-encounter-backdrop" onClick={()=>setEncounterPrompt(undefined)}><section className={`regionmap-encounter-prompt${showBattleDetails?' details':''}`} onClick={event=>event.stopPropagation()}>{showBattleDetails?<><span className="eyebrow">DETALHES DA BATALHA</span><SubregionCard sub={encounterPrompt} level={level}/><button className="regionmap-details-back" onClick={()=>setShowBattleDetails(false)}>Voltar</button></>:<><span className="eyebrow">PONTO DE EXPLORAÇÃO</span><h2>{encounterPrompt.nome}</h2><p>{encounterPrompt.descricao}</p><div><button onClick={()=>setEncounterPrompt(undefined)}>Continuar explorando</button><button className="primary" onClick={()=>setShowBattleDetails(true)}>Ver detalhes da batalha</button></div></>}</section></div>
 const acceptAmbush=async()=>{const enemy=g.ambush?.enemy;if(!enemy)return;const enemyLevel=enemy.nivel??enemy.dificuldade??1;if(level<enemyLevel-2&&!await confirmExtremeDanger(level,enemyLevel,enemy.nome))return;g.acceptAmbush()}
 const ambushDialog=g.ambush&&<div className="regionmap-encounter-backdrop"><section className="regionmap-ambush-prompt"><span className="eyebrow">EMBOSCADA</span><h2>Você foi atacado!</h2><div className="regionmap-ambush-enemy"><img src={assetUrl(cardArt(g.ambush.enemy))} alt={g.ambush.enemy.nome}/><div><strong>{g.ambush.enemy.nome}</strong><small>Nível {g.ambush.enemy.nivel??g.ambush.enemy.dificuldade}</small></div></div><p>Um inimigo surge do nada e bloqueia seu caminho. Fugir usa a mesma chance de uma fuga em combate.</p><div><button onClick={()=>g.fleeAmbush()}>Tentar fugir</button><button className="primary" onClick={acceptAmbush}>Aceitar o desafio</button></div></section></div>
 const npcDialog=activeNpc&&<NpcDialog npc={activeNpc} onClose={()=>setActiveNpc(undefined)}/>
 const discoveredMonolithList=ALL_MONOLITHS.filter(m=>(g.discoveredMonoliths??[]).includes(m.id))
 const monolithDialog=monolithPicker&&<div className="regionmap-encounter-backdrop" onClick={()=>setMonolithPicker(false)}><section className="regionmap-monolith-prompt" onClick={event=>event.stopPropagation()}><span className="eyebrow">MONÓLITO DE TELETRANSPORTE</span><h2>Viajar para...</h2>{discoveredMonolithList.length<=1?<p>Nenhum outro monólito descoberto ainda. Explore mais regiões para encontrar outros.</p>:<div className="regionmap-monolith-list">{discoveredMonolithList.map(m=>{const here=m.regionId===region.id;return <button key={m.id} disabled={here} onClick={()=>{g.travelToMonolith(m.id);setMonolithPicker(false)}}><strong>{m.name}</strong><small>{TERRITORIES.find(t=>t.id===m.regionId)?.nome??m.regionId}{here?' (aqui)':''}</small></button>})}</div>}<button className="regionmap-monolith-close" onClick={()=>setMonolithPicker(false)}>Fechar</button></section></div>
 const chestDialog=chestNotice&&<div className="regionmap-encounter-backdrop" onClick={()=>setChestNotice(undefined)}><section className="regionmap-chest-prompt" onClick={event=>event.stopPropagation()}><span className="eyebrow">BAÚ ABERTO</span><p>{chestNotice}</p><button className="primary" onClick={()=>setChestNotice(undefined)}>Continuar</button></section></div>
 return <section className="regionmap-shell">
  <div className="regionmap-stage"><div className="regionmap-stage-title"><Map size={18}/><span>Região de {region.nome}</span></div><TileWorldExplorer map={map} playerSprite={mapSpriteId} initialPosition={initialPos} paused={Boolean(encounterPrompt||activeNpc||g.ambush||monolithPicker||chestNotice)} onEnterLocation={handleEnter} locationStatus={locationStatus} exits={regionExits} onEnterExit={handleExit} npcs={npcs} npcStatus={npcStatus} onInteractNpc={setActiveNpc} onAmbush={subId=>g.triggerAmbush(subId)} onPositionChange={pos=>g.setRegionMapPosition(region.id,pos)} openedChests={g.openedChests} onOpenChest={handleOpenChest} onRestCampfire={campfire=>g.restAtCampfire(region.id,campfire)} onCampfireTick={()=>g.campfireHealTick()} exploredTiles={exploredSet} onExplore={tiles=>g.revealMapTiles(region.id,tiles)} defeatedWanderers={g.defeatedWanderers} customPins={g.customPins?.[region.id]} onTogglePin={(x,y)=>g.toggleCustomPin(region.id,x,y)} activatedLevers={g.activatedLevers} onActivateLever={leverId=>g.activateLever(leverId)} discoveredMonoliths={g.discoveredMonoliths} onActivateMonolith={handleActivateMonolith} discoveredSecrets={g.discoveredSecrets} onDiscoverSecret={key=>g.discoverSecret(key)}/></div>
  <aside className="regionmap-inspector"><span className="eyebrow">LOCAL ATUAL</span><h2>{sub.nome}</h2><div className="regionmap-inspector-preview" style={{backgroundImage:`url(${map.background})`}}><span>{sub.icone}</span></div><p>{sub.descricao}</p><div className="regionmap-details"><div><small>EXPLORAÇÃO</small><strong>{Math.min(wins,sub.encontrosNecessarios)}/{sub.encontrosNecessarios}</strong></div><div><small>PERIGO</small><strong className={`danger-${danger.cls}`}>{danger.label}</strong></div><div><small>CHEFE</small><strong>{bossDown?'Derrotado':ready?'Disponível':'Oculto'}</strong></div></div><div className="regionmap-loot"><small>RECOMPENSAS</small><span>{sub.temaLoot}</span></div><button className={ready?'primary boss-button':'primary'} onClick={()=>setEncounterPrompt(sub)}>{bossDown?'EXPLORAR NOVAMENTE':ready?'ENFRENTAR CHEFE':'EXPLORAR LOCAL'}</button></aside>
  <footer className="regionmap-dialogue"><div className="regionmap-dialogue-avatar"><img src={assetUrl(`assets/maps/sprites/${mapSpriteId??'adventurer'}/down_1.png`)} alt=""/></div><p>{ready?'O caminho à frente ficou silencioso. Algo poderoso aguarda nesta área.':sub.desafios[0]??'Explore a região para descobrir novos desafios.'}</p><span>▼</span></footer>
  <div className="regionmap-navigation"><Footprints size={20}/><div><strong>Exploração livre</strong><small>Use WASD ou as setas para caminhar até os marcadores.</small></div></div>
  {encounterDialog}
  {npcDialog}
  {ambushDialog}
  {monolithDialog}
  {chestDialog}
 </section>
}
function RegionScreen(){const g=useGame();const [selectedNpc,setSelectedNpc]=React.useState<NpcDefinition|undefined>();const progression=[...TERRITORIES].sort(regionListSort);const region=progression.find(t=>t.id===g.regionId)??progression[0],world=region.mundo??'havendown',worldProgression=progression.filter(t=>(t.mundo??'havendown')===world),regionIndex=worldProgression.findIndex(t=>t.id===region.id),weaker=worldProgression[regionIndex-1],stronger=worldProgression[regionIndex+1],worldLabel=WORLD_MAPS[world].label,otherWorld=world==='havendown'?'steelmere':'havendown',otherUnlocked=worldUnlocked(g,otherWorld);const lvl=levelInfo(g.xp).lvl;const subs=SUBREGIONS.filter(s=>s.regionId===region.id);const selectedSub=g.subregionId?subs.find(s=>s.id===g.subregionId):undefined;const visibleSubs=selectedSub?[selectedSub]:subs;const hasMap=Boolean(getRegionMap(region.id));return <div className={`region-page${hasMap?' region-page-mapview':''}`}><Panel className="region-head"><button className="region-back" onClick={()=>g.setScreen('map')}><ArrowLeft/>Mapa</button><div><span className="eyebrow">REGIÃO • {worldLabel.toUpperCase()} • DIFICULDADE {region.dificuldade}</span><h1>{region.nome}</h1><p>{region.descricao}</p></div><div className="region-side-actions"><div className="region-level"><small>Nível recomendado</small><strong>{region.nivelMin}–{region.nivelMax}</strong><span>Seu nível: {lvl}</span></div>{otherUnlocked&&<button className="region-world-button" onClick={()=>g.travelWorld(otherWorld)}><Plane size={15}/>Ir para {WORLD_MAPS[otherWorld].label}</button>}</div></Panel><motion.nav {...rarityMotionProps('raro',.04)} className="region-step-nav" aria-label="Navegação entre regiões do mesmo mundo"><button disabled={!weaker} onClick={()=>weaker&&g.openRegion(weaker)}><ArrowLeft/><span><small>REGIÃO ANTERIOR</small><strong>{weaker?.nome??'Primeira região'}</strong>{weaker&&<em>Nível {weaker.nivelMin}–{weaker.nivelMax}</em>}</span></button><button disabled={!stronger} onClick={()=>stronger&&g.openRegion(stronger)}><span><small>PRÓXIMA REGIÃO</small><strong>{stronger?.nome??'Última região'}</strong>{stronger&&<em>Nível {stronger.nivelMin}–{stronger.nivelMax}</em>}</span><ArrowRight/></button></motion.nav><RegionNpcBar regionId={region.id} onSelectNpc={setSelectedNpc}/>{selectedSub&&!hasMap&&<button className="subregion-list-back" onClick={()=>g.openRegion(region)}><ArrowLeft/>Ver todas as sub-regiões de {region.nome}</button>}{g.explorationNote&&<div className="exploration-note"><Sparkles/>{g.explorationNote}</div>}{hasMap?<RegionMapView key={region.id} region={region} subs={subs} level={lvl} selectedSub={selectedSub}/>:<div className={`subregion-grid${selectedSub?' selected':''}`}>{visibleSubs.map((sub,index)=><SubregionCard key={sub.id} sub={sub} level={lvl} index={index}/>)}</div>}{selectedNpc&&<NpcDialog npc={selectedNpc} onClose={()=>setSelectedNpc(undefined)}/>}</div>}
function EventScreen(){const g=useGame();const event=g.currentEvent??EVENTS[0];const result=g.eventResult;const mission=eventMission(event);const hero=HEROES.find(h=>h.id===g.heroId);return <div className="event-page"><div className="event-backdrop"/><Panel className="event-card-panel"><span className="eyebrow">ENCONTRO DE EXPLORAÇÃO</span><div className="event-layout"><div className="event-art"><img src={assetUrl(event.arte??event.imagem)} alt={event.nome}/><span>MISSÃO</span></div><div className="event-copy"><ScrollText className="event-icon"/><h1>{event.nome}</h1><p className="event-description">{event.descricao}</p>{!result?<><section className="event-briefing"><div><small>HISTÓRIA</small><p>{mission.setting}</p></div><div><small>SUA MISSÃO</small><p>{mission.objective}</p></div><div className="event-stakes"><span><Coins/><em>RECOMPENSA</em><strong>{mission.reward}</strong></span><span className={mission.risky?'risk':''}><Dices/><em>RISCO</em><strong>{mission.risk}</strong></span></div></section><div className={`event-warning${mission.risky?' risk':''}`}><Dices/><div><strong>{mission.risky?'Esta missão exige uma rolagem':'Decisão sem rolagem de sucesso'}</strong><small>{mission.risky?'Resultados de 4 a 6 representam sucesso. Confira o risco acima antes de aceitar.':'Ao aceitar, o efeito descrito será aplicado diretamente.'}</small></div></div><div className="event-actions"><button className="primary" onClick={()=>g.resolveEvent(true)}>ACEITAR MISSÃO</button><button onClick={()=>g.resolveEvent(true,'class')}>ABORDAGEM: {hero?.nome.toLocaleUpperCase('pt-BR')??'HERÓI'} (+1)</button><button onClick={()=>g.resolveEvent(false)}>SEGUIR VIAGEM</button></div></>:<div className={`event-result ${result.tone}`}>{result.roll&&<div className="event-die"><Dices/><span>{result.roll}</span></div>}<div><small>RESULTADO</small><strong>{result.message}</strong></div><button className="primary" onClick={g.finishEvent}>CONTINUAR EXPLORAÇÃO</button></div>}</div></div></Panel></div>}
function SubregionCard({sub,level,index=0}:{sub:Subregion;level:number;index?:number}){const g=useGame();const wins=g.subregionVictories[sub.id]??0;const bossDown=g.subregionBossesDefeated.includes(sub.id);const danger=dangerFor(level,sub.nivelMin,sub.nivelMax);const ready=wins>=sub.encontrosNecessarios&&!bossDown;const rarity:Rarity=ready?'lendario':bossDown?'incomum':danger.cls==='deadly'?'epico':danger.cls==='hard'?'raro':'comum';const engage=async()=>{if(danger.cls==='deadly'&&!await confirmExtremeDanger(level,sub.nivelMin,sub.nome))return;g.startEncounter(sub.id)};return <motion.article {...rarityMotionProps(rarity,index*.04)} whileHover={rarityHoverLift(rarity)} whileTap={effectsReduced()?undefined:{scale:.988}} className={`subregion-card danger-${danger.cls}`}><div className="subregion-top"><span className="subregion-icon">{sub.icone}</span><div><h2>{sub.nome}</h2><p>Nível {sub.nivelMin}–{sub.nivelMax}</p></div><span className={`danger-badge ${danger.cls}`}>{danger.label}</span></div><p className="subregion-desc">{sub.descricao}</p><div className="subregion-progress"><div><span>Exploração</span><strong>{Math.min(wins,sub.encontrosNecessarios)}/{sub.encontrosNecessarios}</strong></div><div className="xp-track"><div style={{width:`${Math.min(100,wins/sub.encontrosNecessarios*100)}%`}}/></div></div><div className="subregion-meta"><span>★{'★'.repeat(Math.max(0,danger.stars-1))}{'☆'.repeat(Math.max(0,5-danger.stars))}</span><span>{bossDown?'✓ Chefe derrotado':ready?'CHEFE DISPONÍVEL':'Chefe oculto'}</span></div><div className="subregion-details"><small><b>Loot:</b> {sub.temaLoot}</small><small><b>Desafios:</b> {sub.desafios.slice(0,3).join(' • ')}</small></div><button className={ready?'primary boss-button':'primary'} onClick={engage}>{bossDown?'Explorar novamente':ready?'ENFRENTAR CHEFE':'EXPLORAR'}</button>{bossDown&&<button className="revenge-button" onClick={()=>g.startRevenge(sub.id)}>VINGANÇA • NÍVEL {(g.revengeWins[sub.id]??0)+1}</button>}</motion.article>}

function Stat({label,value}:{label:string;value:React.ReactNode}){return <div className="stat"><span>{label}</span><strong>{value}</strong></div>}
function consumableBonusActive(item:{id:string;tipo:string},state:any){return item.tipo==='regen_boost'?Number(state.regenBoostUntil??0)>Date.now():(state.activePotionIds??[]).includes(item.id)&&((item.tipo==='ataque'&&state.pendingAttackBonus>0)||(item.tipo==='escudo'&&state.shield>0))}
// Item 48 do Quadro de Contratos: um gráfico simples da evolução de nível ao longo da campanha,
// alimentado pelo progressHistory que a App já grava a cada level up (ver main.tsx, próximo do
// topo). SVG desenhado à mão -- não precisa de biblioteca de gráfico pra uma polyline com pontos.
function ProgressHistoryPanel(){
 const g=useGame(),history=g.progressHistory??[]
 if(history.length<2)return <Panel title="Histórico de progresso"><p className="muted">Continue jogando e suba de nível para ver aqui a evolução do seu herói ao longo desta campanha.</p></Panel>
 const W=560,H=120,pad=10
 const levels=history.map(h=>h.level),maxLevel=Math.max(...levels),minLevel=Math.min(...levels),range=Math.max(1,maxLevel-minLevel)
 const points=history.map((h,i)=>[pad+(i/(history.length-1))*(W-pad*2),H-pad-((h.level-minLevel)/range)*(H-pad*2)] as const)
 const last=history[history.length-1]
 return <Panel title="Histórico de progresso" className="progress-history-panel">
  <p className="muted">Cada ponto marca um nível alcançado nesta campanha — do nível {history[0].level} ao {last.level}.</p>
  <svg viewBox={`0 0 ${W} ${H}`} className="progress-history-chart" role="img" aria-label={`Gráfico de evolução de nível, do nível ${history[0].level} ao nível ${last.level}`}>
   <polyline points={points.map(([x,y])=>`${x},${y}`).join(' ')} fill="none" stroke="var(--gold)" strokeWidth="2"/>
   {points.map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i===points.length-1?4.5:2.5} fill={i===points.length-1?'var(--gold2)':'var(--gold)'}/>)}
  </svg>
  <div className="progress-history-stats"><span><small>NÍVEL ATUAL</small><strong>{last.level}</strong></span><span><small>OURO NESSE MARCO</small><strong>{last.gold}</strong></span><span><small>CHEFES DERROTADOS</small><strong>{last.bosses}</strong></span></div>
 </Panel>
}
function CharacterScreen(){const g=useGame();const h=HEROES.find(x=>x.id===g.heroId)!;const li=levelInfo(g.xp),permanentLife=g.permanentLife??0,champion=championStats(g),championCard=championCardForActiveHero(g),profile=heroStatProfile(g.heroId);const ability=heroAbilityParts(h.habilidade);const now=Date.now(),lastClaim=g.dailyRewardClaimedAt??0,hoursSince=(now-lastClaim)/(1000*3600),dailyEligible=hoursSince>=20,nextClaimHours=Math.max(0,Math.ceil(20-hoursSince));const subChoiceId=g.specializations?.['30'];const subChoice=g.heroId?HERO_SUBCLASSES[g.heroId]?.find((s:any)=>s.id===subChoiceId):undefined;const totalAllocated=PRIMARY_ATTRIBUTES.reduce((sum,key)=>sum+(g.allocatedAttr[key]??0),0);return <><div className="char-grid"><Panel className="portrait-panel">{championCard&&<ChampionCard data={championCard} assetUrl={assetUrl}/>}<h1 className="char-fullname">{h.nome}</h1>{subChoice&&<div className="subclass-badge"><Sparkles size={14}/><span>{subChoice.nome} • {subChoice.titulo}</span></div>}<div className="points-box">Pontos disponíveis <strong>{g.attributePoints}</strong></div></Panel><Panel title="Atributos"><p className={`attr-points-callout${g.attributePoints?' hot':''}`}><Plus size={15}/>{g.attributePoints?<>Você tem <strong>{g.attributePoints}</strong> {g.attributePoints===1?'ponto':'pontos'} de atributo para distribuir abaixo.</>:'Nenhum ponto de atributo disponível agora — suba de nível para ganhar mais.'}</p>{PRIMARY_ATTRIBUTES.map(key=>{const line=champion.linhas[key],temp=key!=='vigor'&&key!=='destreza'&&g.pendingAttackBonus&&(profile.ataqueBasico==='hibrido'||(profile.ataqueBasico==='fisico')===(key==='forca'))?g.pendingAttackBonus:0;return <AttrRow key={key} label={ATTRIBUTE_LABELS[key]} value={formatStatNumber(line.total)} n={g.allocatedAttr[key]} detail={[line.bonus?`${line.bonus>0?'+':'−'}${formatStatNumber(Math.abs(line.bonus))} de equipamento e talentos`:'',temp?`+${temp} temporário até o fim do combate`:''].filter(Boolean).join(' • ')||undefined} hint={ATTRIBUTE_HINTS[key]} onPlus={()=>g.addAttribute(key as PrimaryAttributeKey)} disabled={!g.attributePoints}/>})}<h3 className="subhead">Derivados</h3><Stat label="Vida" value={`${g.hp}/${champion.vidaMaxima}${permanentLife?` (+${permanentLife} permanente)`:''}`}/><Stat label="Energia" value={`${formatStatNumber(energyNow(g))}/${formatStatNumber(champion.energiaMaxima)} (sobe ao atacar, mais com crítico, e ao descansar na fogueira)`}/><Stat label="Armadura" value={`${formatStatNumber(champion.armadura)} (só de itens; mitiga ${defenseValue(g)} de dano físico)`}/><Stat label="Esquiva" value={percentText(heroDodgeChance(g))}/><Stat label="Resistência a elementos" value={percentText(heroElementalResistance(g))}/><Stat label="Resistência a efeitos" value={percentText(heroEffectResistance(g))}/><Stat label="Poder" value={formatStatNumber(champion.poder)}/>{totalAllocated>0&&<button className="danger-action reset-attr-btn" onClick={g.resetAttributes} title="Redistribuir todos os pontos de atributo investidos"><ArrowUpDown size={14}/> Redefinir Atributos (Gratuito)</button>}<h3 className="subhead">Progressão</h3><Stat label="Nível" value={li.lvl}/><div className="xp-track"><div style={{width:`${Math.min(100,li.progress/li.next*100)}%`}}/></div><Stat label="XP do nível" value={`${li.progress}/${li.next}`}/><Stat label="XP necessária para o próximo nível" value={li.next-li.progress}/><Stat label="Experiência total" value={g.xp}/><Stat label="Ouro" value={g.gold}/><Stat label="Maior dano em um golpe" value={g.highestDamageDealt?`${g.highestDamageDealt} de dano`:'Nenhum golpe registrado'}/></Panel><TalentPanel/></div><Panel title="Provisão Diária do Aventureiro" className="daily-reward-panel"><div className="daily-reward-box"><div className="daily-reward-info"><Sparkles size={20}/><div><strong>{dailyEligible?'Provisão diária disponível para resgate!':'Provisão já resgatada'}</strong><p>{dailyEligible?'Receba +25 moedas de ouro e materiais da região atual para fortalecer sua jornada.':`Os intendentes reabastecerão sua cota em aproximadamente ${nextClaimHours} hora(s).`}</p></div></div><button className={dailyEligible?'primary':''} disabled={!dailyEligible} onClick={()=>g.claimDailyReward()}>{dailyEligible?'Coletar provisão (+25 Ouro + Materiais)':`Aguarde ${nextClaimHours}h`}</button></div></Panel><Panel className="char-mechanics" title="Mecânicas do personagem"><div className="mechanics-grid">{ability.passivo&&<div className="mechanics-card"><small>PASSIVO</small><p>{ability.passivo}</p></div>}<div className="mechanics-card"><small>ATIVO • {heroSkillNames[h.id]??'Habilidade do herói'}</small><p>{ability.ativo}</p><span className="mechanics-hint">Custa {heroSkillEnergyCost(g.heroId)} de Energia e tem recarga de 3 turnos.</span></div></div><h3 className="subhead">Como os atributos funcionam</h3><div className="mechanics-attr-list"><div><Sword size={16}/><div><strong>Força</strong><span>{ATTRIBUTE_HINTS.forca}</span></div></div><div><Wand2 size={16}/><div><strong>Magia</strong><span>{ATTRIBUTE_HINTS.magia}</span></div></div><div><Heart size={16} className="heart"/><div><strong>Vigor</strong><span>{ATTRIBUTE_HINTS.vigor} Cada ponto dá +{ATTRIBUTE_RULES.vigorVidaPorPonto} de Vida Máxima.</span></div></div><div><Footprints size={16}/><div><strong>Destreza</strong><span>{ATTRIBUTE_HINTS.destreza}</span></div></div><div><ShieldHalf size={16}/><div><strong>Armadura</strong><span>Vem só de equipamentos e gemas e reduz o dano físico que você recebe, com retorno decrescente: as primeiras peças pesam mais e nenhuma quantidade deixa você invulnerável.</span></div></div><div><Zap size={16}/><div><strong>Energia</strong><span>Recurso das habilidades e do Fervor de Combate. Não regenera sozinha: ataque normal dá +{ATTRIBUTE_RULES.energia.ganhoAtaque}, crítico dá +{ATTRIBUTE_RULES.energia.ganhoCritico} e descansar na fogueira devolve +{ATTRIBUTE_RULES.energia.ganhoDescansoPorTick} a cada 6s. Sua habilidade custa {heroSkillEnergyCost(g.heroId)} e o Fervor, {fervorEnergyCost()}.</span></div></div></div><h3 className="subhead">Talentos</h3><p className="mechanics-note">Cada talento da Árvore de Talentos ao lado é desbloqueado permanentemente ao atingir o nível exigido e concede um bônus fixo — eles se acumulam e nunca expiram, mesmo trocando de equipamento.</p></Panel></>}
// Item 46 do Quadro de Contratos: cada conquista é recalculada ao vivo (ACHIEVEMENTS/
// unlockedAchievements, em store/game.ts) a partir de dados que só crescem durante a
// campanha -- nenhuma lista de "já vistas" pra persistir. A recompensa é o título
// cosmético, escolhido aqui e exibido ao lado do nome do herói na Ficha.
function AchievementsPanel(){
 const g=useGame(),unlocked=unlockedAchievements(g),unlockedIds=new Set(unlocked.map(a=>a.id))
 const [filter,setFilter]=React.useState<'all'|'unlocked'|'locked'>('all')
 const visibleAchievements=ACHIEVEMENTS.filter(a=>filter==='all'||(filter==='unlocked')===unlockedIds.has(a.id)).sort((a,b)=>Number(unlockedIds.has(b.id))-Number(unlockedIds.has(a.id)))
 return <Panel title="Conquistas" className="achievements-panel">
  <p className="muted">Marcos permanentes desta campanha. Cada um libera um título cosmético para exibir na Ficha.</p>
  <div className="achievements-overview"><div><strong>{unlocked.length}/{ACHIEVEMENTS.length}</strong><span>conquistas alcançadas</span></div><div className="xp-track" role="progressbar" aria-label="Conquistas alcançadas" aria-valuemin={0} aria-valuemax={ACHIEVEMENTS.length} aria-valuenow={unlocked.length}><div style={{width:`${unlocked.length/ACHIEVEMENTS.length*100}%`}}/></div></div>
  {g.selectedTitle&&<p className="achievements-current-title"><Trophy size={14}/>Título atual: <strong>{g.selectedTitle}</strong><button className="ghost-action" onClick={()=>g.setSelectedTitle(undefined)}>Remover</button></p>}
  <div className="achievements-filters" role="group" aria-label="Filtrar conquistas"><button className={filter==='all'?'active':''} aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>Todas <small>{ACHIEVEMENTS.length}</small></button><button className={filter==='unlocked'?'active':''} aria-pressed={filter==='unlocked'} onClick={()=>setFilter('unlocked')}>Alcançadas <small>{unlocked.length}</small></button><button className={filter==='locked'?'active':''} aria-pressed={filter==='locked'} onClick={()=>setFilter('locked')}>Pendentes <small>{ACHIEVEMENTS.length-unlocked.length}</small></button></div>
  <div className="achievements-list">{visibleAchievements.length?visibleAchievements.map(a=>{const done=unlockedIds.has(a.id);return <article key={a.id} className={done?'done':''}><span className="achievement-icon">{done?<Trophy size={16}/>:<Lock size={14}/>}</span><div><strong>{a.nome}</strong><small>{a.descricao}</small></div>{done&&<button className={g.selectedTitle===a.titulo?'selected':''} onClick={()=>g.setSelectedTitle(g.selectedTitle===a.titulo?undefined:a.titulo)}>{g.selectedTitle===a.titulo?'Em uso':`Usar "${a.titulo}"`}</button>}</article>}):<p className="achievements-empty">Nenhuma conquista alcançada ainda. Continue explorando para liberar títulos.</p>}</div>
 </Panel>
}
function BestiaryPanel(){const g=useGame();return <Panel title="Bestiário"><p className="muted">Marcos: 1 vitória revela atributos, 3 revelam afinidade e 5 concedem +1 de dano contra a criatura.</p><div className="bestiary-list">{Object.entries(g.bestiary).length?Object.entries(g.bestiary).map(([name,r])=>{const next=BESTIARY_MILESTONES.find(m=>r.vitorias<m.wins);return <span key={name}><strong>{name}</strong><small>{r.encontros} encontros • {r.vitorias} vitórias • {next?`próximo: ${next.wins} — ${next.label}`:'domínio completo (+1 dano)'}</small></span>}):<p className="muted">Enfrente criaturas para revelar seus registros.</p>}</div></Panel>}
function StoryQuestsJournalPanel() {
  const g = useGame()
  const activeQuests = Object.keys(g.activeStoryQuests ?? {}).map(id => questById(id)).filter((q): q is StoryQuest => Boolean(q))
  const completed = (g.completedStoryQuests ?? []).map(id => questById(id)).filter((q): q is StoryQuest => Boolean(q))

  return (
    <Panel title="Diário de Missões & Entregas" className="story-journal-panel">
      <div className="story-journal-section">
        <div className="story-journal-head">
          <Mail size={16} />
          <strong>MISSÕES ATIVAS ({activeQuests.length})</strong>
        </div>
        {activeQuests.length === 0 ? (
          <p className="muted">Nenhuma missão ativa no momento. Converse com os personagens nas regiões para aceitar novas tarefas de história.</p>
        ) : (
          <div className="story-journal-list">
            {activeQuests.map(q => {
              const targetTerritory = TERRITORIES.find(t => t.id === q.targetRegionId)
              const targetNpc = npcById(q.targetNpcId)
              const sourceNpc = npcById(q.sourceNpcId)
              const hasItem = q.questItem ? (g.questItems?.[q.questItem.id] ?? 0) >= q.questItem.quantity : true
              return (
                <article key={q.id} className={`story-journal-card ${hasItem ? 'ready' : 'in-progress'}`}>
                  <header>
                    <span className="eyebrow">ATO {q.act} • {q.type === 'delivery' ? 'ENTREGA' : 'MISSÃO'}</span>
                    <h4>{q.title}</h4>
                  </header>
                  <p className="story-journal-summary">{q.summary}</p>
                  <div className="story-journal-meta">
                    <div>
                      <small>MANDANTE:</small>
                      <span>{sourceNpc?.nome ?? q.sourceNpcId}</span>
                    </div>
                    <div>
                      <small>DESTINATÁRIO:</small>
                      <strong>{targetNpc?.nome ?? q.targetNpcId} ({targetTerritory?.nome ?? q.targetRegionId})</strong>
                    </div>
                  </div>
                  {q.questItem && (
                    <div className="story-journal-item">
                      <span>{q.questItem.icon ?? '📦'} {q.questItem.name}</span>
                      <b className={hasItem ? 'item-ready' : 'item-missing'}>
                        {hasItem ? '✓ Na mochila para entrega' : '✗ Aguardando obtenção'}
                      </b>
                    </div>
                  )}
                  <footer className="story-journal-footer">
                    <span className="story-journal-rewards">
                      +{q.reward.gold} Ouro • +{q.reward.xp} XP {q.reward.loreTitle ? `• "${q.reward.loreTitle}"` : ''}
                    </span>
                    {targetTerritory && (
                      <button className="primary" onClick={() => g.openRegion(targetTerritory)}>
                        <Footprints size={14} />
                        Viajar para {targetTerritory.nome}
                      </button>
                    )}
                  </footer>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {completed.length > 0 && (
        <div className="story-journal-section completed-section">
          <div className="story-journal-head">
            <CheckCircle2 size={16} />
            <strong>MISSÕES CONCLUÍDAS ({completed.length})</strong>
          </div>
          <div className="story-journal-completed-list">
            {completed.map(q => (
              <div key={q.id} className="story-journal-completed-item">
                <span className="check-icon">✓</span>
                <div>
                  <strong>{q.title} (Ato {q.act})</strong>
                  <small>{q.reward.loreTitle ? `Título: ${q.reward.loreTitle} • ` : ''}Entregue para {npcById(q.targetNpcId)?.nome ?? q.targetNpcId}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}

function ChronicleScreen(){const g=useGame(),modernChronicle=useUiMode()==='modern',identity=CLASS_IDENTITIES[g.heroId as keyof typeof CLASS_IDENTITIES],activeDifficulty=DIFFICULTIES[g.difficultyMode as keyof typeof DIFFICULTIES]??DIFFICULTIES.veterano;return <div className="chronicle-page"><Panel className="chronicle-hero"><span className="eyebrow">CRÔNICAS DA CAMPANHA</span><h1>Crônicas de Havendown</h1><p>{identity?.nome}: {identity?.texto}</p><div className="difficulty-row">{Object.entries(DIFFICULTIES).map(([id,d])=><button className={g.difficultyMode===id?'active':''} title={d.descricao} onClick={()=>g.setDifficulty(id as DifficultyMode)} key={id}><strong>{d.nome}</strong><small>Inimigos ×{d.enemy} • recompensas ×{d.reward}</small></button>)}</div><p className="difficulty-description">{activeDifficulty.descricao}</p></Panel>{g.difficultyMode==='aventura'&&<div className="exploration-note"><Sparkles/>Modo Aventura ativo: combate mais leve pra você aproveitar a história em paz. Troque a qualquer momento aqui mesmo.</div>}{modernChronicle?<ChronicleTabsModern/>:<div className="moved-systems"><StoryQuestsJournalPanel/><StoryCampaignPanel/><AchievementsPanel/><ProgressHistoryPanel/><DungeonPanel/><BestiaryPanel/><EquipmentRulesPanel/></div>}</div>}
// Crônicas no modo Moderno: as sete seções da página longa viram abas (uma por vez), com contadores reais.
function ChronicleTabsModern(){
 const g=useGame(),[tab,setTab]=React.useState('story')
 const questCount=Object.keys(g.activeStoryQuests??{}).length
 const tabs=[{id:'story',label:'História'},{id:'quests',label:'Missões',count:questCount||undefined},{id:'bestiary',label:'Bestiário',count:Object.keys(g.bestiary??{}).length||undefined},{id:'achievements',label:'Conquistas'},{id:'dungeons',label:'Masmorras'},{id:'rules',label:'Regras'}]
 return <div className="chronicle-tabs"><SectionTabs tabs={tabs} active={tab} onChange={setTab} label="Seções das Crônicas" idPrefix="chronicle"/><SectionPanel idPrefix="chronicle" id="story" active={tab}><StoryCampaignPanel/></SectionPanel><SectionPanel idPrefix="chronicle" id="quests" active={tab}><StoryQuestsJournalPanel/></SectionPanel><SectionPanel idPrefix="chronicle" id="bestiary" active={tab}><BestiaryPanel/></SectionPanel><SectionPanel idPrefix="chronicle" id="achievements" active={tab}><AchievementsPanel/><ProgressHistoryPanel/></SectionPanel><SectionPanel idPrefix="chronicle" id="dungeons" active={tab}><DungeonPanel/></SectionPanel><SectionPanel idPrefix="chronicle" id="rules" active={tab}><EquipmentRulesPanel/></SectionPanel></div>
}
function AttrRow({label,value,n,detail,hint,onPlus,disabled}:{label:string;value:any;n:number;detail?:string;hint?:string;onPlus:()=>void;disabled:boolean}){return <div className="attr-row"><div><span>{label}</span><strong>{value}</strong><small>Pontos distribuídos: {n}</small>{detail&&<small className="attr-detail">{detail}</small>}{hint&&<small className="attr-hint">{hint}</small>}</div><button disabled={disabled} title={disabled?'Nenhum ponto de atributo disponível':`Adicionar ponto em ${label}`} aria-label={`Adicionar ponto em ${label}`} onClick={onPlus}><Plus/></button></div>}
function InventoryScreen(){
  const g=useGame()
  const [search,setSearch]=React.useState('')
  const entries=Object.entries(g.inventory).filter(([,n])=>n>0).filter(([id])=>{
    if(!search.trim())return true
    const it=CONSUMABLES.find(x=>x.id===id)
    return it?.nome.toLowerCase().includes(search.toLowerCase())||it?.descricao.toLowerCase().includes(search.toLowerCase())
  })
  const capacity=equipmentBagCapacity(g)
  const backpack=equipmentByRef(g.equipped.bolsa)
  const questItemEntries=Object.entries(g.questItems??{}).filter(([,n])=>n>0)

  return <div className="two-col">
    <Panel title="Consumíveis">
      <div className="inventory-search-bar">
        <Search size={14}/>
        <input type="search" aria-label="Buscar consumíveis" placeholder="Filtrar poções e elixires..." value={search} onChange={e=>setSearch(e.target.value)}/>
        {search&&<button type="button" className="clear-search" aria-label="Limpar busca de consumíveis" onClick={()=>setSearch('')}>×</button>}
      </div>
      {entries.length===0?<Empty text={search?'Nenhum consumível encontrado na busca.':'Nenhum consumível na mochila.'}/>:<div className="item-grid">{entries.map(([id,n])=>{const it=CONSUMABLES.find(x=>x.id===id)!,active=consumableBonusActive(it,g);return <ItemCard key={id} image={cardArt(it)} rarity={cardRarity(it,'Consumível')} name={it.nome} subtitle={`Quantidade: ${n}`} footer={consumableDescription(it,g)}><button disabled={active} title={active?'Esta poção já está ativa. Poções diferentes ainda podem ser combinadas.':undefined} onClick={()=>g.useConsumable(id)}>{active?'Efeito ativo':'Usar'}</button></ItemCard>})}</div>}
    </Panel>
    <div style={{display:'flex',flexDirection:'column',gap:'14px',minHeight:0}}>
      <Panel title="Itens de Missão & Encomendas">
        {questItemEntries.length===0?<Empty text="Nenhum item ou encomenda de missão na bolsa."/>:<div className="quest-items-list">{questItemEntries.map(([itemId,qty])=>{
          const quest=STORY_QUESTS.find(q=>q.questItem?.id===itemId)
          const itemDef=quest?.questItem
          const targetTerritory=quest?TERRITORIES.find(t=>t.id===quest.targetRegionId):undefined
          const targetNpc=quest?npcById(quest.targetNpcId):undefined
          return <div key={itemId} className="quest-item-chip">
            <span className="quest-item-ico">{itemDef?.icon??'📦'}</span>
            <div className="quest-item-text">
              <strong>{itemDef?.name??itemId} (x{qty})</strong>
              <p>{itemDef?.description??'Item chave para entrega de história.'}</p>
              {quest&&<small>Destino: <b>{targetTerritory?.nome??quest.targetRegionId}</b> ({targetNpc?.nome??quest.targetNpcId})</small>}
            </div>
          </div>
        })}</div>}
      </Panel>
      <Panel title="Capacidade">
        <div className="capacity"><Package/><strong>{g.equipmentBag.length}/{capacity} equipamentos guardados</strong></div>
        <p><b>{backpack?.nome??'Mochila Pequena'}:</b> {capacity} espaços. Consumíveis, itens de missão e equipamentos vestidos não ocupam esse limite.</p>
      </Panel>
    </div>
  </div>
}
function EquipmentScreen(){const g=useGame(),modernEquipment=useUiMode()==='modern';const capacity=equipmentBagCapacity(g);const dualWielding=equipmentWeaponClass(equipmentByRef(g.equipped.mao_direita))==='facas'
 const [bagSearch,setBagSearch]=React.useState('')
 const itemBonus=equipmentStatBonus(g)
 const elementalEntries=(Object.values(g.equipped) as (string|undefined)[]).filter((id):id is string=>Boolean(id)).map(id=>{const e=equipmentByRef(id),el=g.equipmentElements[id],res=g.equipmentResistances[id];if(!e||(!el&&!res))return null;const level=attunementItemLevel(g,id);return el?{id,name:e.nome,kind:'Elemento' as const,value:ELEMENT_LABELS[el],detail:`${Math.round(attunementStatusChance(g,id)*100)}% de condição em críticos • nível ${level}`}:{id,name:e.nome,kind:'Resistência' as const,value:ELEMENT_LABELS[res!],detail:`Reduz ${attunementResistanceReduction(g,id)} dano elemental • nível ${level}`}}).filter((x):x is {id:string;name:string;kind:'Elemento'|'Resistência';value:string;detail:string}=>Boolean(x))
 const specialBonusEntries=(Object.keys(CRAFTED_EFFECT_LABELS) as (ForgeBonus|keyof typeof CURATED_EFFECT_LABELS)[]).filter(effect=>hasCraftedEffect(g,effect as any)).map(effect=>({effect,label:CRAFTED_EFFECT_LABELS[effect]}))
 const filteredBag=g.equipmentBag.filter(id=>{
  if(!bagSearch.trim())return true
  const e=equipmentByRef(id)
  if(!e)return false
  return e.nome.toLowerCase().includes(bagSearch.toLowerCase())||e.habilidade.toLowerCase().includes(bagSearch.toLowerCase())||slotNames[e.slot].toLowerCase().includes(bagSearch.toLowerCase())
 })
 return <div className="equipment-layout">{modernEquipment?<PaperdollModern assetUrl={assetUrl} art={item=>cardArt(item)} slotNames={slotNames}/>:<Panel title="Slots equipados"><div className="slot-grid">{SLOT_ORDER.map((slot)=>{const id=g.equipped[slot],e=equipmentByRef(id);if(!e)return <button key={slot} className={'slot '+(slot==='botas'?'boots':'')}><span>{slotNames[slot]}</span><div className="slot-empty">{slot==='mao_esquerda'&&dualWielding?'Ocupada pelas facas':'Vazio'}</div></button>;const p=equipmentStatParts(e,id,g);const affinity=compatibilityLabel(e,g.heroId);const bagSlot=slot==='bolsa';const stats=bagSlot?`Capacidade ${e.capacidade??8} espaços`:`${offenseLabel(activeHeroId())} +${p.atk}${p.atkDetail} • Armadura +${p.def}${p.defDetail} • Vida +${p.life}${p.lifeDetail}`;return <button key={slot} className={'slot '+(slot==='botas'?'boots':'')+(bagSlot?' backpack-slot':'')} onClick={bagSlot?undefined:()=>g.unequip(slot)}><span>{slotNames[slot]}</span><ArtPreview className="slot-art-preview" image={cardArt(e)} name={e.nome} text={`${e.habilidade} • ${affinity}${elementalNote(g,id!)}${gemNote(id,g)}${craftedEffectNote(id,g)}`} stats={stats} instanceRef={id}/><div className="slot-info"><strong>{e.nome}</strong><div className="slot-stats">{bagSlot?`CAPACIDADE ${e.capacidade??8}`:<>{offenseShort(activeHeroId())} +{p.atk}{p.atkDetail} • ARM +{p.def}{p.defDetail} • VIDA +{p.life}{p.lifeDetail}</>}</div><small className="slot-effect">{affinity}{elementalNote(g,id!)}{gemNote(id,g)}{craftedEffectNote(id,g)}</small></div><small className="slot-remove">{bagSlot?'equipe outra bolsa para trocar':'clique para retirar'}</small></button>})}</div></Panel>}<div className="equipment-side-col"><Panel title="Atributos e bônus" className="equipment-attr-panel"><Stat label="Vida máxima" value={`(${maxHp(g)-itemBonus.life}+${itemBonus.life})=${maxHp(g)}`}/><Stat label="Poder de ataque" value={`(${attackValue(g)-itemBonus.atk}+${itemBonus.atk})=${attackValue(g)}`}/><Stat label="Armadura" value={`${armorValue(g)} (mitiga ${defenseValue(g)} de dano físico)`}/><hr/><div className="equipment-elemental-list">{elementalEntries.length?elementalEntries.map(entry=><div key={entry.id} className="equipment-elemental-row"><span>{entry.name}</span><b className={entry.kind==='Elemento'?'elemental-attack':'elemental-resist'}>{entry.kind}: {entry.value}</b><small>{entry.detail}</small></div>):<p className="muted">Nenhum bônus elemental equipado — forje um item com sucesso ou derrote um chefe para conseguir um.</p>}</div><hr/><h3 className="equipment-subtitle">Bônus especiais de equipamento</h3><div className="equipment-elemental-list">{specialBonusEntries.length?specialBonusEntries.map(entry=><div key={entry.effect} className="equipment-elemental-row"><span>{entry.label}</span><b className="elemental-attack">Ativo</b></div>):<p className="muted">Nenhum bônus especial (crítico, esquiva, cura...) equipado — refine uma peça na Forja para conseguir um.</p>}</div><p className="muted">A sintonia cresce com o nível do herói e com o nível efetivo da peça. Resistência soma redução por item equipado; armas elementais aumentam a chance de aplicar a condição no crítico.</p></Panel><Panel title={`Equipamentos guardados ${g.equipmentBag.length}/${capacity}`}><div className="equipment-bag-toolbar"><div className="inventory-search-bar"><Search size={14}/><input type="text" placeholder="Buscar na mochila..." value={bagSearch} onChange={e=>setBagSearch(e.target.value)}/>{bagSearch&&<button className="clear-search" onClick={()=>setBagSearch('')}>×</button>}</div><button className="sort-bag-btn" onClick={()=>g.sortEquipmentBag()} title="Auto-organizar mochila por raridade e nível"><ArrowUpDown size={14}/> Organizar</button></div><div className="item-grid compact">{filteredBag.map((id,idx)=>{const e=equipmentByRef(id);if(!e)return null;const p=equipmentStatParts(e,id,g);const allowed=equipmentClassAllowed(e,g.heroId);const levelAllowed=equipmentLevelAllowed(e,g.xp);const required=equipmentRequiredLevel(e);const fits=e.slot!=='bolsa'||g.equipmentBag.length<=(e.capacidade??8);const dualLocked=e.slot==='mao_esquerda'&&equipmentWeaponClass(equipmentByRef(g.equipped.mao_direita))==='facas';const equipLabel=!allowed?'Impossível equipar':!levelAllowed?`Requer nível ${required}`:!fits?`Reduza para ${e.capacidade} itens`:dualLocked?'Facas ocupam as duas mãos':'Equipar';const stats=e.slot==='bolsa'?`Capacidade ${e.capacidade??8} espaços`:`${offenseLabel(activeHeroId())} +${p.atk}${p.atkDetail} • Armadura +${p.def}${p.defDetail} • Vida +${p.life}${p.lifeDetail}`;const targetSlot=e.slot==='anel_1'&&g.equipped.anel_1?'anel_2':e.slot;const equippedRef=g.equipped[targetSlot];const equippedItem=equippedRef?equipmentByRef(equippedRef):undefined;const pseudoState={heroId:g.heroId,equipmentUpgrades:g.equipmentUpgrades,equipmentGems:g.equipmentGems} as any;const candBreakdown=equipmentInstanceBreakdown(e,id,pseudoState);const eqBreakdown=equippedItem?equipmentInstanceBreakdown(equippedItem,equippedRef,pseudoState):undefined;const deltaAtk=candBreakdown.total.atk-(eqBreakdown?.total.atk??0);const deltaDef=candBreakdown.total.def-(eqBreakdown?.total.def??0);const deltaLife=candBreakdown.total.life-(eqBreakdown?.total.life??0);const isLocked=Boolean(g.lockedEquipment?.[id]);return <ItemCard key={id+idx} image={cardArt(e)} rarity={cardRarity(e,'Equipamento')} name={e.nome} subtitle={e.slot==='bolsa'?`${e.capacidade} espaços`:slotNames[e.slot]} footer={`${e.habilidade} • ${compatibilityLabel(e,g.heroId)}${elementalNote(g,id!)}${gemNote(id,g)}${craftedEffectNote(id,g)}`} previewStats={stats} instanceRef={id} locked={isLocked} onToggleLock={()=>g.toggleLockEquipment(id)} statDiff={e.slot!=='bolsa'?{atk:deltaAtk,def:deltaDef,life:deltaLife}:undefined}><button className={!allowed||!fits||dualLocked?'equip-impossible':!levelAllowed?'equip-level-locked':''} disabled={!allowed||!levelAllowed||!fits||dualLocked} title={!allowed?compatibilityLabel(e,g.heroId):!levelAllowed?`Disponível no nível ${required}`:!fits?'Há equipamentos demais para esta bolsa':dualLocked?'Combate com facas exige as duas mãos livres':undefined} onClick={()=>g.equip(id)}>{equipLabel}</button></ItemCard>})}</div></Panel></div></div>}
function ItemCard({image,name,subtitle,footer,previewStats,previewAllowEquip=false,rarity='comum',instanceRef,badge,children,locked,onToggleLock,statDiff}:{image:string;name:string;subtitle?:string;footer?:string;previewStats?:string;previewAllowEquip?:boolean;rarity?:Rarity;instanceRef?:string;badge?:string;children?:React.ReactNode;locked?:boolean;onToggleLock?:()=>void;statDiff?:{atk?:number;def?:number;life?:number}}){const equipment=EQUIPMENT.find(item=>item.nome===name);const emblem=equipment?cardEmblem(equipment,'Equipamento'):undefined;const owner=equipment?.classeExclusiva??(equipment?equipmentAffinity(equipment):undefined);const emblemLabel=classOwnerLabel(owner)
 const tiltRef=useCardTilt(true)
  return <motion.article {...rarityMotionProps(rarity)} whileHover={rarityHoverLift(rarity)} whileTap={effectsReduced()?undefined:{scale:.992}} className={`item-card item-rarity-${rarity}${equipment?'':' item-card-contain'}`} tabIndex={0} role="button" aria-label={`Abrir detalhes de ${name}`} onClick={event=>{const target=event.target as HTMLElement;if(target.closest('button,a,input,select,textarea,label'))return;const trigger=(event.currentTarget as HTMLElement).querySelector('.art-preview-trigger') as HTMLElement|null;trigger?.click()}} onKeyDown={event=>{if(event.key!=='Enter'&&event.key!==' ')return;const target=event.target as HTMLElement;if(target.closest('button,a,input,select,textarea,label'))return;event.preventDefault();const trigger=(event.currentTarget as HTMLElement).querySelector('.art-preview-trigger') as HTMLElement|null;trigger?.click()}}><div ref={tiltRef as React.RefObject<HTMLDivElement>} data-rarity-tier={rarityMotionTier(rarity)} className={`item-art-wrap tilt-card holo-rainbow holo-textured rarity-${rarity}`}><ArtPreview image={image} name={name} text={footer} stats={previewStats??subtitle} compareEquipment={Boolean(equipment)} allowEquip={previewAllowEquip} instanceRef={instanceRef}/>{emblem&&<img className="item-class-emblem" src={assetUrl(emblem)} alt={emblemLabel} title={`Classe: ${emblemLabel}`}/>}{badge&&<span className="item-new-badge"><Sparkles size={11}/>{badge}</span>}</div><div className="item-copy"><div className="item-title-row"><strong>{name}</strong><div className="item-title-actions">{onToggleLock&&<button type="button" className={`item-lock-btn${locked?' locked':''}`} title={locked?'Item protegido contra venda e desmonte':'Travar item (proteger contra venda/desmonte)'} onClick={e=>{e.stopPropagation();onToggleLock()}}>{locked?<Lock size={12}/>:<Unlock size={12}/>}</button>}<span className={`mini-rarity rarity-${rarity}`}>{rarityLabel[rarity]}</span></div></div>{statDiff&&(statDiff.atk!==0||statDiff.def!==0||statDiff.life!==0)&&<div className="item-stat-diff">{statDiff.atk!==0&&<span className={statDiff.atk!>0?'stat-better':'stat-worse'}>{offenseShort(activeHeroId())} {statDiff.atk!>0?`+${statDiff.atk}`:statDiff.atk}</span>}{statDiff.def!==0&&<span className={statDiff.def!>0?'stat-better':'stat-worse'}>ARM {statDiff.def!>0?`+${statDiff.def}`:statDiff.def}</span>}{statDiff.life!==0&&<span className={statDiff.life!>0?'stat-better':'stat-worse'}>VIDA {statDiff.life!>0?`+${statDiff.life}`:statDiff.life}</span>}</div>}{subtitle&&<span>{subtitle}</span>}{footer&&<small>{footer}</small>}{children}</div></motion.article>}
const MERCHANT={nome:'Mira Bellwether',titulo:'Mercadora de Havendown',retrato:'assets/npcs/mira-bellwether.webp'}
const MERCHANT_WELCOME=[
 'Entre, entre! Toda peça nessa prateleira já viu campo de batalha — ou vai ver, com você.',
 'Se não achar o que precisa hoje, volte amanhã. Minhas rotas de suprimento nunca param.',
 'Aqui ninguém sai de mãos vazias — só de bolsos mais leves.',
 'Cada moeda que você gasta aqui volta pra estrada, de um jeito ou de outro.'
]
const MERCHANT_CART=[
 'Boa escolha aí no carrinho. Confirma antes que eu mude de ideia sobre o preço.',
 'Gosto de ver alguém que sabe o que quer. Vai levar tudo isso mesmo?',
 'Separei o melhor do estoque pra quem chega decidido.',
 'Fechado assim que você confirmar — sem essa de "deixa eu pensar" depois.'
]
const MERCHANT_SELL=[
 'Deixa eu ver o que você trouxe... sempre gosto de uma surpresa.',
 'Vendendo, é? Espero que não seja nada que você vá sentir falta amanhã.',
 'Todo espólio tem um preço justo aqui — o meu, claro.',
 'Menos peso na bolsa, mais moedas no bolso. Parece um bom negócio pra mim.'
]
const MERCHANT_BROKE=[
 'Poucas moedas hoje, hein? Nada que uma boa caçada não resolva.',
 'Sem ouro sobrando eu não posso fazer milagre, mas posso guardar algo pra depois.',
 'Volte quando o bolso estiver mais cheio — ou venda algo pra mim agora mesmo.'
]
function merchantLine(gold:number,cartCount:number,selling:boolean){
 const pool=selling?MERCHANT_SELL:cartCount>0?MERCHANT_CART:gold<20?MERCHANT_BROKE:MERCHANT_WELCOME
 return pool[(gold+cartCount*7)%pool.length]
}
function ShopScreen(){
 const g=useGame()
 // Antes o filtro de Armas sempre abria em "Todos" -- misturando espadas, cajados, arcos e
 // adagas de classes que o herói nem pode usar na mesma lista, logo de cara. Equipamentos não
 // sofre disso (já é pré-filtrado por equipmentClassAllowed), então só Armas precisa de um
 // valor padrão diferente de "Todos".
 const armaDefaultFilter=g.heroId&&weaponFilters.some(([id])=>id===g.heroId)?g.heroId:'Todos'
 const [tab,setTab]=React.useState<ShopTab>('Armas')
 const [filter,setFilter]=React.useState<string>(armaDefaultFilter)
 const [sortBy,setSortBy]=React.useState<typeof sortOptions[number][0]>('padrao')
 const [search,setSearch]=React.useState('')
 const [cart,setCart]=React.useState<Record<string,number>>({})
 const [cartOpen,setCartOpen]=React.useState(false)
 const ownedConsumables=Object.entries(g.inventory).filter(([,n])=>n>0).map(([id])=>CONSUMABLES.find(x=>x.id===id)).filter(Boolean) as typeof CONSUMABLES
 const ownedEquipment=g.equipmentBag.map(id=>{const e=equipmentByRef(id);return e?{...e,id}:undefined}).filter(Boolean) as typeof EQUIPMENT
 const availableConsumables=g.shopMode==='buy'?CONSUMABLES:ownedConsumables
 const availableEquipment=g.shopMode==='buy'?EQUIPMENT:ownedEquipment
 const weapons=availableEquipment.filter(e=>e.slot==='mao_direita')
 const gear=availableEquipment.filter(e=>e.slot!=='mao_direita'&&equipmentClassAllowed(e,g.heroId))
 const tabCount=(target:ShopTab)=>target==='Armas'?weapons.length:target==='Equipamentos'?gear.length:availableConsumables.length
 const filters=tab==='Armas'?weaponFilters:tab==='Equipamentos'?equipmentFilters:consumableFilters
 const matchesWeapon=(e:any,id:string)=>id==='Todos'||(id==='neutra'?!equipmentAffinity(e):equipmentAffinity(e)===id)
 const matchesGear=(e:any,id:string)=>id==='Todos'||(id==='aneis'?(e.slot==='anel_1'||e.slot==='anel_2'):e.slot===id)
 const matchesConsumable=(item:any,id:string)=>id==='Todos'||(id==='cura'?(item.tipo==='cura'||item.tipo==='vida_max'):(item.tipo!=='cura'&&item.tipo!=='vida_max'))
 const searchTerm=searchKey(search.trim())
 const equipmentSearch=(e:any)=>!searchTerm||searchKey([e.nome,e.habilidade,slotNames[e.slot as Slot]??e.slot,classOwnerLabel(e.classeExclusiva??equipmentAffinity(e)),String(e.preco)].join(' ')).includes(searchTerm)
 const consumableSearch=(item:any)=>!searchTerm||searchKey([item.nome,item.descricao,consumableDescription(item,g),item.tipo,String(item.preco)].join(' ')).includes(searchTerm)
 const rarityOrder:Record<Rarity,number>={comum:0,incomum:1,raro:2,epico:3,lendario:4,mitico:5,heroico:6}
 const sortCmp=sortBy==='preco'?(a:any,b:any)=>a.preco-b.preco||a.nome.localeCompare(b.nome,'pt-BR'):sortBy==='raridade'?(a:any,b:any)=>(rarityOrder[(a.raridade??'comum') as Rarity]-rarityOrder[(b.raridade??'comum') as Rarity])||a.preco-b.preco||a.nome.localeCompare(b.nome,'pt-BR'):sortBy==='nome'?(a:any,b:any)=>a.nome.localeCompare(b.nome,'pt-BR'):undefined
 const sortEquipmentList=(list:any[])=>{list.sort(sortCmp??((a,b)=>equipmentRequiredLevel(a)-equipmentRequiredLevel(b)||(rarityOrder[(a.raridade??'comum') as Rarity]-rarityOrder[(b.raridade??'comum') as Rarity])||a.nome.localeCompare(b.nome,'pt-BR')));return list}
 const sortConsumableList=(list:any[])=>{list.sort(sortCmp??((a,b)=>(rarityOrder[(a.raridade??'comum') as Rarity]-rarityOrder[(b.raridade??'comum') as Rarity])||a.preco-b.preco||a.nome.localeCompare(b.nome,'pt-BR')));return list}
 const equipment=tab==='Armas'?sortEquipmentList(weapons.filter(e=>matchesWeapon(e,filter)&&equipmentSearch(e))):tab==='Equipamentos'?sortEquipmentList(gear.filter(e=>matchesGear(e,filter)&&equipmentSearch(e))):[]
 const consumables=tab==='Consumíveis'?sortConsumableList(availableConsumables.filter(item=>matchesConsumable(item,filter)&&consumableSearch(item))):[]
 const filterCount=(id:string)=>tab==='Armas'?weapons.filter(e=>matchesWeapon(e,id)&&equipmentSearch(e)).length:tab==='Equipamentos'?gear.filter(e=>matchesGear(e,id)&&equipmentSearch(e)).length:availableConsumables.filter(item=>matchesConsumable(item,id)&&consumableSearch(item)).length
 // "Todos" empilhava dezenas de itens sem nenhuma separação visual -- difícil de escanear.
 // Com "Todos" selecionado, a lista passa a se dividir em seções (por classe nas Armas, por
 // categoria/slot nos Equipamentos, por tipo nos Consumíveis), reaproveitando os mesmos
 // filtros e a mesma ordenação já calculados acima para cada seção individualmente.
 const showGroups=filter==='Todos'
 const groups=showGroups?filters.filter(([id])=>id!=='Todos').map(([id,label])=>({
  label,
  items:tab==='Consumíveis'?sortConsumableList(availableConsumables.filter(item=>matchesConsumable(item,id)&&consumableSearch(item))):sortEquipmentList((tab==='Armas'?weapons:gear).filter((e:any)=>(tab==='Armas'?matchesWeapon(e,id):matchesGear(e,id))&&equipmentSearch(e)))
 })).filter(group=>group.items.length):[]
 const chooseTab=(next:ShopTab)=>{setTab(next);setFilter(next==='Armas'?armaDefaultFilter:'Todos')}
 const lines=Object.entries(cart).filter(([,q])=>q>0).flatMap(([key,qty])=>{const [kind,id]=key.split(':');const item=kind==='c'?CONSUMABLES.find(x=>x.id===id):EQUIPMENT.find(x=>x.id===id);return item?[{key,kind,id,qty,item}]:[]})
 const count=lines.reduce((sum,line)=>sum+line.qty,0),total=lines.reduce((sum,line)=>sum+line.item.preco*line.qty,0),equipmentCount=lines.filter(line=>line.kind==='e').reduce((sum,line)=>sum+line.qty,0)
 const valid=count>0&&total<=g.gold&&g.equipmentBag.length+equipmentCount<=equipmentBagCapacity(g)&&lines.every(line=>line.kind==='c'||(equipmentClassAllowed(line.item as any,g.heroId)&&equipmentLevelAllowed(line.item as any,g.xp)&&(line.item as any).raridade!=='epico'&&(line.item as any).raridade!=='lendario'))
 const add=(kind:'c'|'e',id:string)=>setCart(current=>({...current,[`${kind}:${id}`]:(current[`${kind}:${id}`]??0)+1}))
 const remove=(key:string)=>setCart(current=>{const next={...current};delete next[key];return next})
 const setQty=(key:string,qty:number)=>setCart(current=>{if(qty<=0){const next={...current};delete next[key];return next}return{...current,[key]:qty}})
 const inc=(key:string)=>setQty(key,(cart[key]??0)+1)
 const dec=(key:string)=>setQty(key,(cart[key]??0)-1)
 const clear=()=>setCart({})
 const confirm=()=>{if(!valid)return;lines.forEach(line=>{for(let i=0;i<line.qty;i++)line.kind==='c'?g.buyConsumable(line.id):g.buyEquipment(line.id)});clear();setCartOpen(false)}
 const setShopMode=(mode:'buy'|'sell')=>{if(g.shopMode===mode)return;g.toggleShopMode();setFilter(tab==='Armas'?armaDefaultFilter:'Todos');clear();setCartOpen(false)}
 const activeFilterLabel=filters.find(([id])=>id===filter)?.[1]??filter
 const visibleCount=showGroups?groups.reduce((sum,group)=>sum+group.items.length,0):equipment.length+consumables.length
 const capacity=equipmentBagCapacity(g)
 const bagAfter=g.equipmentBag.length+equipmentCount
 const cartStatus=!count?'Carrinho vazio':total>g.gold?'Ouro insuficiente':bagAfter>capacity?'Bolsa cheia':'Pronto para confirmar'
 const modeText=g.shopMode==='buy'?'Catálogo com carrinho, comparação visual e validação antes da compra.':'Venda direta dos itens guardados na mochila, com valores calculados no ato.'
 const renderCartSummary=(modal=false)=><section className={`shop-cart-summary${modal?' shop-cart-panel':''}`} role={modal?'dialog':'complementary'} aria-modal={modal||undefined} aria-label="Resumo do carrinho">
  <header className="shop-cart-summary-head">
   <div><small>LOJA DE HAVENDOWN</small><h2><ShoppingCart size={18}/>Carrinho</h2></div>
   {modal&&<button className="shop-icon-button" title="Fechar carrinho" aria-label="Fechar carrinho" onClick={()=>setCartOpen(false)}><X size={17}/></button>}
  </header>
  <div className={`shop-cart-status ${valid?'ready':count?'blocked':'idle'}`}><span>{cartStatus}</span><strong>{count} {count===1?'item':'itens'}</strong></div>
  {lines.length?<><div className="shop-cart-lines">{lines.map(line=><article key={line.key}><img src={assetUrl(cardArt(line.item))} alt=""/><div><strong>{line.item.nome}</strong><span>{line.item.preco} ouro cada</span></div><div className="shop-cart-qty"><button title="Diminuir" aria-label={`Diminuir ${line.item.nome}`} onClick={()=>dec(line.key)}><Minus size={13}/></button><b>{line.qty}</b><button title="Aumentar" aria-label={`Aumentar ${line.item.nome}`} onClick={()=>inc(line.key)}><Plus size={13}/></button></div><b className="shop-cart-line-total">{line.qty*line.item.preco}</b><button className="shop-icon-button danger" title="Remover" aria-label={`Remover ${line.item.nome}`} onClick={()=>remove(line.key)}><Trash2 size={15}/></button></article>)}</div><footer><div><span>Total</span><strong>{total} ouro</strong><small>Saldo após a compra: {g.gold-total} ouro</small><small>Bolsa após compra: {bagAfter}/{capacity}</small>{bagAfter>capacity&&<em>Não há espaço suficiente na bolsa.</em>}{total>g.gold&&<em>Ouro insuficiente.</em>}</div><button className="shop-cart-clear" onClick={clear}><Trash2 size={15}/>Limpar</button><button className="primary shop-cart-confirm" disabled={!valid} onClick={confirm}><CheckCircle2 size={16}/>Confirmar</button></footer></>:<div className="shop-cart-empty"><ShoppingCart/><strong>Seu carrinho está vazio.</strong><span>Adicione itens do catálogo para revisar a compra.</span></div>}
 </section>
 return <div className={`shop-page shop-mode-${g.shopMode}`}>
  <section className="shop-hero">
   <div className="shop-hero-main">
    <span className="shop-eyebrow"><ShoppingBag size={15}/> Mercado central</span>
    <h1>Loja de Havendown</h1>
    <p>{modeText}</p>
    <div className="shop-merchant-card">
     <img src={assetUrl(MERCHANT.retrato)} alt={MERCHANT.nome}/>
     <div><small>{MERCHANT.titulo}</small><strong>{MERCHANT.nome}</strong><p><Quote size={13}/>{merchantLine(g.gold,count,g.shopMode==='sell')}</p></div>
    </div>
   </div>
   <aside className="shop-command-panel" aria-label="Resumo da loja">
    <div className="shop-balance-grid">
     <span><Coins size={17}/><small>OURO</small><strong>{g.gold}</strong></span>
     <span><Package size={17}/><small>BOLSA</small><strong>{g.equipmentBag.length}/{capacity}</strong></span>
     <span><ShoppingCart size={17}/><small>CARRINHO</small><strong>{count}</strong></span>
    </div>
    <div className="shop-mode-switch" role="group" aria-label="Modo da loja">
     <button className={g.shopMode==='buy'?'active':''} aria-pressed={g.shopMode==='buy'} onClick={()=>setShopMode('buy')}><ShoppingCart size={16}/>Comprar</button>
     <button className={g.shopMode==='sell'?'active':''} aria-pressed={g.shopMode==='sell'} onClick={()=>setShopMode('sell')}><ArrowLeftRight size={16}/>Vender</button>
    </div>
    {g.shopMode==='buy'&&<button className="shop-cart-button primary" onClick={()=>setCartOpen(true)}><ShoppingCart size={17}/>Ver carrinho<b>{count}</b></button>}
   </aside>
  </section>
  <div className="shop-tabs" role="tablist" aria-label="Seções da loja">{shopTabs.map(item=>{const Icon=item==='Armas'?Sword:item==='Equipamentos'?ShieldHalf:FlaskConical;return <button key={item} role="tab" aria-selected={tab===item} className={tab===item?'active':''} onClick={()=>chooseTab(item)}><Icon size={18}/><span>{item}</span><small>{tabCount(item)}</small></button>})}</div>
  <div className="shop-workspace">
   <main className="shop-catalog-panel">
    <div className="shop-toolbar">
     <div className="shop-search"><Search size={15}/><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar por nome, slot ou efeito..." aria-label="Buscar itens da loja"/>{search&&<button type="button" className="shop-icon-button" title="Limpar busca" aria-label="Limpar busca" onClick={()=>setSearch('')}><X size={14}/></button>}</div>
     <label className="shop-filter-select">
      <span>{tab==='Armas'?'Classe':tab==='Equipamentos'?'Categoria':'Tipo'}</span>
      <span className="shop-select-wrap"><select value={filter} onChange={event=>setFilter(event.target.value)} aria-label={`Filtrar ${tab} por ${tab==='Armas'?'classe':tab==='Equipamentos'?'categoria':'tipo'}`}>{filters.map(([id,label])=><option key={id} value={id}>{label} ({filterCount(id)})</option>)}</select><ChevronDown size={14} className="shop-select-caret"/></span>
     </label>
     <label className="shop-filter-select shop-sort-select">
      <span>Ordenar</span>
      <span className="shop-select-wrap"><select value={sortBy} onChange={event=>setSortBy(event.target.value as typeof sortOptions[number][0])} aria-label="Ordenar itens">{sortOptions.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><ChevronDown size={14} className="shop-select-caret"/></span>
     </label>
    </div>
    <div className="shop-result-bar"><span>{visibleCount} {visibleCount===1?'item':'itens'} em {activeFilterLabel}</span>{searchTerm&&<button type="button" onClick={()=>setSearch('')}>Limpar busca</button>}</div>
    <div className="shop-list">{showGroups?<>{groups.map(group=><section className="shop-group" key={group.label}><h3 className="shop-group-title"><span>{group.label}</span><small>{group.items.length}</small></h3><div className="shop-group-items">{tab==='Consumíveis'?group.items.map((it:any)=><ShopConsumable key={it.id} id={it.id} sell={g.shopMode==='sell'} onAdd={()=>add('c',it.id)} quantity={cart[`c:${it.id}`]??0}/>):group.items.map((e:any,i:number)=><ShopEquipment key={e.id+i} id={e.id} sell={g.shopMode==='sell'} onAdd={()=>add('e',e.id)} quantity={cart[`e:${e.id}`]??0}/>)}</div></section>)}{!groups.length&&<div className="shop-empty"><Package/><strong>Nenhum item neste filtro.</strong><span>{g.shopMode==='sell'?'Você ainda não possui itens desse tipo.':'Não há mercadorias disponíveis.'}</span></div>}</>:<>{consumables.map(it=><ShopConsumable key={it.id} id={it.id} sell={g.shopMode==='sell'} onAdd={()=>add('c',it.id)} quantity={cart[`c:${it.id}`]??0}/>)}{equipment.map((e,i)=><ShopEquipment key={e.id+i} id={e.id} sell={g.shopMode==='sell'} onAdd={()=>add('e',e.id)} quantity={cart[`e:${e.id}`]??0}/>)}{!consumables.length&&!equipment.length&&<div className="shop-empty"><Package/><strong>Nenhum item neste filtro.</strong><span>{g.shopMode==='sell'?'Você ainda não possui itens desse tipo.':'Não há mercadorias disponíveis.'}</span></div>}</>}</div>
   </main>
   <aside className="shop-side-panel">{g.shopMode==='buy'?renderCartSummary(false):<section className="shop-sell-summary"><header><small>MODO VENDA</small><h2><ArrowLeftRight size={18}/>Venda direta</h2></header><div className="shop-sell-metrics"><span><small>Consumíveis</small><strong>{ownedConsumables.length}</strong></span><span><small>Equipamentos</small><strong>{ownedEquipment.length}</strong></span><span><small>Ouro atual</small><strong>{g.gold}</strong></span></div><p><Quote size={13}/>{merchantLine(g.gold,0,true)}</p></section>}</aside>
  </div>
  {cartOpen&&<div className="shop-cart-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setCartOpen(false)}}>{renderCartSummary(true)}</div>}
 </div>
}
function ShopRow({image,name,rarity='comum',emblem,emblemLabel,meta,description,price,afford=true,actionLabel,actionDisabled=false,actionTitle,onAction,previewStats,compareEquipment=false,quantity=0}:{image:string;name:string;rarity?:Rarity;emblem?:string;emblemLabel?:string;meta:string;description:string;price:number;afford?:boolean;actionLabel:string;actionDisabled?:boolean;actionTitle?:string;onAction:()=>void;previewStats?:string;compareEquipment?:boolean;quantity?:number}){
 return <motion.article {...rarityMotionProps(rarity)} whileHover={rarityHoverLift(rarity)} whileTap={effectsReduced()?undefined:{scale:.992}} className={`shop-row item-rarity-${rarity}${afford?'':' unaffordable'}`} tabIndex={0} role="button" aria-label={`Abrir detalhes de ${name}`} onClick={event=>{const target=event.target as HTMLElement;if(target.closest('button,a,input,select,textarea,label'))return;const trigger=(event.currentTarget as HTMLElement).querySelector('.art-preview-trigger') as HTMLElement|null;trigger?.click()}} onKeyDown={event=>{if(event.key!=='Enter'&&event.key!==' ')return;const target=event.target as HTMLElement;if(target.closest('button,a,input,select,textarea,label'))return;event.preventDefault();const trigger=(event.currentTarget as HTMLElement).querySelector('.art-preview-trigger') as HTMLElement|null;trigger?.click()}}>
  <div className="shop-row-media"><ArtPreview className="shop-row-thumb" image={image} name={name} text={description} stats={previewStats} compareEquipment={compareEquipment}/>{quantity>0&&<span className="shop-row-quantity"><ShoppingCart size={12}/>{quantity}</span>}</div>
  <div className="shop-row-info">
   <div className="shop-row-title"><strong>{name}</strong><span className={`mini-rarity rarity-${rarity}`}>{rarityLabel[rarity]}</span>{emblem&&<img className="shop-row-emblem" src={assetUrl(emblem)} alt={emblemLabel} title={emblemLabel?`Classe: ${emblemLabel}`:undefined}/>}</div>
   <small className="shop-row-meta">{meta}</small>
   <p className="shop-row-desc">{description}</p>
  </div>
  <div className="shop-row-action">
   <span className="shop-row-price"><Coins size={14}/>{price}</span>
   <button className={afford&&!actionDisabled?'primary':''} disabled={actionDisabled} title={actionTitle} onClick={onAction}>{actionLabel}</button>
  </div>
 </motion.article>
}
function ShopConsumable({id,sell=false,onAdd,quantity=0}:{id:string;sell?:boolean;onAdd?:()=>void;quantity?:number}){const g=useGame(),it=CONSUMABLES.find(x=>x.id===id)!;const price=sell?Math.max(1,Math.floor(it.preco/2)):it.preco;const rarity=cardRarity(it,'Consumível');const kind=it.tipo==='cura'||it.tipo==='vida_max'?'Cura':'Bônus';const afford=sell||g.gold>=price;return <ShopRow image={cardArt(it)} rarity={rarity} name={it.nome} meta={kind} description={consumableDescription(it,g)} price={price} afford={afford} actionLabel={sell?'Vender':'Adicionar'} quantity={sell?0:quantity} onAction={()=>sell?g.sellConsumable(id):onAdd?.()}/>}
function ShopEquipment({id,sell=false,onAdd,quantity=0}:{id:string;sell?:boolean;onAdd?:()=>void;quantity?:number}){const g=useGame(),e=equipmentByRef(id)!;const price=sell?Math.max(1,Math.floor(e.preco/2)):e.preco;const affinity=compatibilityLabel(e,g.heroId);const allowed=equipmentClassAllowed(e,g.heroId);const levelAllowed=equipmentLevelAllowed(e,g.xp);const required=equipmentRequiredLevel(e);const forgeOnly=!sell&&(e.raridade==='epico'||e.raridade==='lendario');const afford=sell||(allowed&&levelAllowed&&!forgeOnly&&g.gold>=price);const button=sell?'Vender':!allowed?`Exclusivo: ${classOwnerLabel(e.classeExclusiva)}`:!levelAllowed?`Requer nível ${required}`:forgeOnly?'Disponível na Forja':'Adicionar';
 // No modo "vender", `id` é a peça que o jogador já possui (não o catálogo) -- mostrar as
 // mesmas partes (normal/forja/pedra) usadas na tela de Equipamentos, em vez de só atributo
 // base, pra não esconder aprimoramento/pedra da peça que está prestes a ser vendida.
 const p=sell?equipmentStatParts(e,id,g):undefined
 const stats=e.slot==='bolsa'?`Nível ${required} • Capacidade ${e.capacidade??8} espaços`:p?`Nível ${required} • ${offenseLabel(activeHeroId())} +${p.atk}${p.atkDetail} • Armadura +${p.def}${p.defDetail} • Vida +${p.life}${p.lifeDetail}`:(()=>{const effective=equipmentAttackForHero(e,g.heroId);return `Nível ${required} • ${offenseLabel(g.heroId)} +${effective}${effective!==e.ataque?` (base +${e.ataque})`:''} • Armadura +${e.defesa} • Vida +${e.vida}`})();const owner=e.classeExclusiva??equipmentAffinity(e);const emblem=cardEmblem(e,'Equipamento');return <ShopRow image={cardArt(e)} rarity={cardRarity(e,'Equipamento')} name={e.nome} emblem={emblem} emblemLabel={classOwnerLabel(owner)} meta={`${slotNames[e.slot]} • Nível ${required} • ${affinity}`} description={e.habilidade} price={price} afford={afford} actionLabel={button} actionDisabled={!sell&&(!allowed||!levelAllowed||forgeOnly)} actionTitle={!sell&&!allowed?'Esta classe não pode usar este item':!sell&&!levelAllowed?`Disponível no nível ${required}`:!sell&&forgeOnly?'Itens épicos e lendários só podem ser obtidos através da Forja.':undefined} quantity={sell?0:quantity} onAction={()=>sell?g.sellEquipment(id):onAdd?.()} previewStats={stats} compareEquipment/>}
const searchKey=(text:string)=>text.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()
function GalleryScreen(){const g=useGame();const [category,setCategory]=React.useState('Todos'),[search,setSearch]=React.useState(''),known=new Set(g.discoveredCards??[]),normalized=(name:string)=>enemyDisplayKey(name).replace(/^Elite: /,'');const ownedEquipment=new Set([...Object.values(g.equipped),...g.equipmentBag].map(ref=>equipmentBaseId(ref))),isKnown=(card:any)=>card.kind==='Herói'?card.id===g.heroId:card.kind==='Equipamento'?known.has(`equipment:${card.id}`)||ownedEquipment.has(card.id):card.kind==='Consumível'?known.has(`consumable:${card.id}`)||(g.inventory[card.id]??0)>0:card.kind==='Evento'?known.has(`event:${card.id}`):card.kind==='Chefe'?known.has(`boss:${normalized(card.nome)}`)||Object.keys(g.bestiary).includes(normalized(card.nome)):card.kind==='Elite'?known.has(`elite:${normalized(card.nome)}`)||Object.keys(g.bestiary).includes(normalized(card.nome)):known.has(`monster:${normalized(card.nome)}`)||Object.keys(g.bestiary).includes(normalized(card.nome));const knownCards=allGallery.filter(isKnown),categoryCards=(category==='Todos'?knownCards:knownCards.filter(x=>x.kind===category)),cards=search.trim()?categoryCards.filter(x=>searchKey(x.nome).includes(searchKey(search))):categoryCards,idx=Math.max(0,Math.min(cards.length-1,g.selectedGallery)),c:any=cards[idx];const choose=(next:string)=>{setCategory(next);g.setSelectedGallery(0)}
 // A Coleção nunca herdou a moldura colorida por categoria que o combate usa (CATEGORY_FRAME,
 // ver CombatScreen/Fighter) -- toda carta de Monstro/Elite/Chefe aqui sempre usou a moldura
 // dourada padrão. Mesma tabela de cores, agora aplicada aqui também.
 const frameTheme=c?CATEGORY_FRAME[c.kind==='Chefe'?'CHEFE':c.kind==='Elite'?'ELITE':c.kind==='Monstro'?'INIMIGO':'']:undefined
 return <div className="gallery-page"><div className="gallery-progress"><div><Images/><span><small>CARTAS CONHECIDAS</small><strong>{knownCards.length}/{allGallery.length}</strong></span></div><div className="gallery-progress-track"><i style={{width:`${allGallery.length?knownCards.length/allGallery.length*100:0}%`}}/></div><p>Novas cartas são reveladas ao obter itens, encontrar inimigos e participar de eventos.</p></div><label className="gallery-search"><Search size={15}/><input type="search" placeholder="Buscar por nome..." value={search} onChange={e=>{setSearch(e.target.value);g.setSelectedGallery(0)}} aria-label="Buscar carta por nome"/></label><div className="gallery-filters" role="group" aria-label="Categorias da coleção">{galleryCategories.map(([id,label])=>{const total=id==='Todos'?allGallery.length:allGallery.filter(x=>x.kind===id).length,count=id==='Todos'?knownCards.length:knownCards.filter(x=>x.kind===id).length;return <button key={id} className={category===id?'active':''} onClick={()=>choose(id)}>{label}<small>{count}/{total}</small></button>})}</div>{search.trim()&&<p className="muted gallery-search-count">{cards.length} resultado{cards.length===1?'':'s'} para "{search}"</p>}{c?<div className="gallery"><Panel className="gallery-card"><AnimatePresence mode="wait"><motion.div style={{width:'100%'}} key={`${c.kind}-${c.id??c.nome}`} initial={{opacity:0,x:18,scale:.97}} animate={{opacity:1,x:0,scale:1}} exit={{opacity:0,x:-18,scale:.97}} transition={{duration:.25}}>{c.kind==='Herói'&&c.id===g.heroId&&championCardForActiveHero(g)?<ChampionCard data={championCardForActiveHero(g)!} assetUrl={assetUrl}/>:<CardFrame card={c} kind={c.kind} frameTheme={frameTheme} tilt holoMode="frame"/>}</motion.div></AnimatePresence></Panel><Panel title="Coleção de cartas"><div className={`badge rarity-${cardRarity(c,c.kind)}`}>CONHECIDA • {c.kind} • {rarityLabel[cardRarity(c,c.kind)]}</div><h1>{c.nome}</h1>{c.habilidade&&<p>{c.habilidade}</p>}{c.descricao&&<p>{c.descricao}</p>}<p className="muted">Carta {idx+1} de {cards.length} em {galleryCategories.find(([id])=>id===category)?.[1]}</p><div className="gallery-nav"><button onClick={()=>g.setSelectedGallery((idx-1+cards.length)%cards.length)}><ArrowLeft/>Anterior</button><button onClick={()=>g.setSelectedGallery((idx+1)%cards.length)}>Próxima<ArrowRight/></button></div><p className="hint">Somente descobertas desta campanha aparecem aqui. Clique sobre a arte para ampliá-la.</p></Panel></div>:<Panel className="gallery-undiscovered"><ImageOff/><h2>{search.trim()?'Nenhuma carta encontrada':'Nenhuma carta conhecida nesta categoria'}</h2><p>{search.trim()?'Tente outro termo de busca ou limpe o filtro de texto.':'Explore Havendown, enfrente criaturas, encontre itens ou participe de eventos para revelar novas cartas.'}</p></Panel>}</div>}
function BossIntro(){const g=useGame(),uiMode=useUiMode();return uiMode==='modern'&&g.enemy?<BossIntroModern image={assetUrl(cardArt(g.enemy))} onGo={target=>g.setScreen(target as any)}/>:<BossIntroClassic/>}
function BossIntroClassic(){const g=useGame(),e=g.enemy!,sub=SUBREGIONS.find(x=>x.id===g.subregionId);return <div className="boss-intro"><div className="boss-glow"/><Panel><div className="boss-intro-grid"><ArtPreview className="boss-art-preview" image={cardArt(e)} name={e.nome} text={e.habilidade} stats={artStats(e,'Chefe')}/><div><div className="badge danger">CHEFE DE {sub?.nome??'SUB-REGIÃO'}</div><h1>{e.nome}</h1><p>{e.habilidade}</p><div className="boss-stats"><Stat label="Vida" value={e.vida}/><Stat label="Ataque" value={e.ataque}/><Stat label="Nível" value={e.nivel??e.dificuldade}/><Stat label="Fases" value={e.maxFases??2}/><Stat label="Recompensa base" value={`${e.ouro} ouro + ${e.ouro} XP`}/></div><div className="actions-row"><button className="primary" onClick={g.startBoss}>Enfrentar</button><button onClick={()=>g.setScreen('region')}>Voltar</button></div></div></div></Panel></div>}
type CombatDiceRollData={attacker:'hero'|'enemy';naturalAttackRoll:number;attackRoll:number;attackBonus:number;defenseRoll:number;attackBase:number;defenseBase:number;attackEffect:string;defenseEffect:string;damage:number;selfDamage:number;shieldBlocked?:number}
function signedRollValue(value:number){return value>0?`+${value}`:`${value}`}
function attackDieSummary(roll:CombatDiceRollData){
 if(roll.attackEffect.startsWith('SUPREMO'))return'Dano especial da habilidade'
 if(roll.attackRoll===1)return'Raspão: metade do dano, sem risco para quem ataca'
 if(roll.attackRoll===5)return'Ataque forte: +1 na força'
 if(roll.attackRoll===6)return'Crítico: dano x1,5'
 if(roll.attackRoll===2)return'Ataque desajeitado: alvo ganha +1 depois'
 return'Sem ajuste de dano no ataque'
}
function defenseDieSummary(roll:CombatDiceRollData){
 if(roll.attackEffect.startsWith('SUPREMO'))return'Defesa ignorada'
 if(roll.defenseRoll===1)return'Falha defensiva: dano x1,5'
 if(roll.defenseRoll===2)return'Defesa fraca: +1 dano'
 if(roll.defenseRoll===5)return'Defesa forte: -1 dano'
 if(roll.defenseRoll===6)return'Defesa perfeita: dano pela metade'
 return'Sem ajuste de dano na defesa'
}
function combatDamageMath(roll:CombatDiceRollData){
 const attackStep=roll.attackBase+(roll.attackRoll===5?1:0)
 const initialDamage=Math.max(1,attackStep-roll.defenseBase)
 let diceDamage=initialDamage
 if(roll.attackRoll===1) diceDamage=Math.max(1,Math.floor(diceDamage*.5))
 if(roll.attackRoll===6) diceDamage=Math.max(1,Math.floor(diceDamage*1.5))
 if(roll.defenseRoll===1) diceDamage=Math.max(1,Math.floor(diceDamage*1.5))
 else if(roll.defenseRoll===2) diceDamage+=1
 else if(roll.defenseRoll===5) diceDamage=Math.max(0,diceDamage-1)
 else if(roll.defenseRoll===6) diceDamage=Math.floor(diceDamage*.5)
 const shield=roll.shieldBlocked??0
 const expectedAfterShield=Math.max(0,diceDamage-shield)
 const finalDelta=roll.damage-expectedAfterShield
 return{attackStep,initialDamage,diceDamage,shield,finalDelta}
}
function CombatDiceRoll({roll}:{roll:CombatDiceRollData}){
 const isUltimate=roll.attackEffect.startsWith('SUPREMO'),math=combatDamageMath(roll),rollNote=roll.attackRoll!==roll.naturalAttackRoll?`Rolagem ${roll.naturalAttackRoll} -> ${roll.attackRoll}`:roll.attackBonus!==0?`Modificador ${signedRollValue(roll.attackBonus)}`:undefined
 const finalLabel=roll.selfDamage?'Dano no atacante':roll.attacker==='hero'?'Dano causado':'Dano recebido'
 const attackDie=<div className="combat-roll-side attack-side"><span className="combat-roll-label">{isUltimate?'PODER':'FORÇA DO GOLPE'} <b>{roll.attackBase}</b></span><motion.b className="combat-die attack-die" animate={{rotate:[0,110,250,370,360],scale:[.75,1.18,.88,1]}} transition={{duration:.55}}>{roll.attackRoll}</motion.b><em><strong>{roll.attackEffect}</strong>{rollNote&&<u>{rollNote}</u>}</em></div>
 const defenseDie=<div className="combat-roll-side defense-side"><span className="combat-roll-label">{isUltimate?'DEFESA':'RESISTÊNCIA DO ALVO'} <b>{roll.defenseBase}</b></span><motion.b className="combat-die defense-die" animate={{rotate:[0,-120,-260,-370,-360],scale:[.75,1.18,.88,1]}} transition={{duration:.55}}>{roll.defenseRoll}</motion.b><em><strong>{roll.defenseEffect}</strong></em></div>
 return <motion.aside className={`combat-dice-roll ${roll.attacker}`} initial={{opacity:0,y:-18,scale:.9}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-12}} aria-live="assertive"><small>{roll.attacker==='hero'?'SEU ATAQUE':'ATAQUE DO INIMIGO'}</small><div className="combat-dice-pair">{roll.attacker==='hero'?<>{attackDie}<i>VS</i>{defenseDie}</>:<>{defenseDie}<i>VS</i>{attackDie}</>}</div><div className="damage-result"><span>{finalLabel}</span><strong>{roll.selfDamage||roll.damage}</strong></div>{isUltimate?<ol className="damage-steps"><li><span>1</span><p><b>Golpe Supremo:</b> usa a fórmula própria da habilidade.</p></li><li><span>2</span><p><b>Defesa:</b> o golpe é indefensável nesta ação.</p></li><li><span>3</span><p><b>Resultado:</b> {roll.damage} de dano final.</p></li></ol>:roll.selfDamage?<ol className="damage-steps"><li><span>1</span><p><b>Falha crítica:</b> o alvo não recebe dano.</p></li><li><span>2</span><p><b>Dano próprio:</b> 10% da força do golpe vira {roll.selfDamage} de dano.</p></li></ol>:<ol className="damage-steps"><li><span>1</span><p><b>Conta inicial:</b> {math.attackStep} força - {roll.defenseBase} defesa = {math.initialDamage}.</p></li><li><span>2</span><p><b>Dados:</b> {attackDieSummary(roll)}; {defenseDieSummary(roll)} = {math.diceDamage}.</p></li><li><span>3</span><p><b>Final:</b> {math.shield>0?`escudo bloqueou ${math.shield}. `:''}{math.finalDelta!==0?`ajustes ${signedRollValue(math.finalDelta)}. `:''}{roll.damage} de dano.</p></li></ol>}</motion.aside>
}
function FleeDiceRoll({roll}:{roll:{roll:number;outcome:'failed'|'neutral'|'success'}}){const message=roll.outcome==='success'?'Fuga bem-sucedida!':roll.outcome==='neutral'?'Você mantém sua ação':'Fuga falhou — turno perdido';return <motion.aside className={`flee-dice-roll ${roll.outcome}`} initial={{opacity:0,scale:.88}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.92}} aria-live="assertive"><small>TESTE DE FUGA</small><motion.b className="combat-die flee-die" animate={{rotate:[0,130,280,420,360],scale:[.7,1.22,.88,1]}} transition={{duration:.65}}>{roll.roll}</motion.b><strong>{message}</strong><span>1–3 perde o turno • 4 mantém a ação • 5–6 foge</span></motion.aside>}
type CombatImpactKind='hit'|'critical'|'ultimate'|'blocked'|'glance'|'self'|'heal'|'buff'|'dodged'
function combatImpactFromState(roll:{attacker:'hero'|'enemy';damage:number;selfDamage:number;shieldBlocked?:number;attackRoll:number;attackEffect?:string;dodged?:boolean}|undefined,supportFx?:'fortificacao'|'cura'|'cura-item'):{target?:'hero'|'enemy';kind?:CombatImpactKind}{
 if(supportFx)return{target:'hero' as const,kind:(supportFx==='fortificacao'?'buff':'heal') as CombatImpactKind}
 if(!roll)return{target:undefined,kind:undefined}
 if(roll.selfDamage>0)return{target:roll.attacker,kind:'self' as CombatImpactKind}
 const target=roll.attacker==='hero'?'enemy':'hero'
 // Esquiva (20% Caçadora/Caçador, ou a chance de "esquiva_forjada"): sem isso, um ataque
 // desviado tinha damage=0 e caía em 'glance' -- do lado do herói, resolveFighterAnimationState
 // trata 'glance' como golpe recebido e mostrava a animação de Defesa, nunca a de Esquiva.
 if(roll.dodged)return{target,kind:'dodged' as CombatImpactKind}
 if(roll.attackEffect?.startsWith('SUPREMO'))return{target,kind:'ultimate' as CombatImpactKind}
 if(roll.attackRoll===6&&roll.damage>0)return{target,kind:'critical' as CombatImpactKind}
 if((roll.shieldBlocked??0)>0)return{target,kind:(roll.damage>0?'blocked':'glance') as CombatImpactKind}
 if(roll.damage>0)return{target,kind:'hit' as CombatImpactKind}
 return{target,kind:'glance' as CombatImpactKind}
}
function combatEventHeadline(kind?:CombatImpactKind){
 if(kind==='ultimate')return'⚡ Golpe Supremo Desferido!'
 if(kind==='critical')return'Impacto crítico'
 if(kind==='blocked')return'Golpe parcialmente bloqueado'
 if(kind==='dodged')return'Esquiva completa!'
 if(kind==='glance')return'Golpe sem impacto decisivo'
 if(kind==='self')return'Falha crítica'
 if(kind==='heal')return'Cura canalizada'
 if(kind==='buff')return'Reforço aplicado'
 if(kind==='hit')return'Golpe confirmado'
 return'Próxima ação'
}
function combatEventDescription(kind?:CombatImpactKind,side?:'hero'|'enemy'){
 if(kind==='ultimate')return side==='hero'?'Seu herói desencadeou toda a fúria do seu Golpe Supremo!':'O inimigo foi assolado pelo poder supremo!'
 if(kind==='critical')return side==='hero'?'O inimigo encontrou um ponto fraco no seu herói.':'Você abriu a guarda do inimigo com um golpe pesado.'
 if(kind==='blocked')return side==='hero'?'Seu escudo segurou parte do impacto.':'A resistência do alvo absorveu parte do dano.'
 if(kind==='dodged')return side==='hero'?'Você desviou completamente do golpe.':'O alvo desviou completamente do seu golpe.'
 if(kind==='glance')return side==='hero'?'Você resistiu ao impacto sem perder o controle.':'O alvo segurou o golpe e permaneceu firme.'
 if(kind==='self')return'Uma falha crítica devolveu o golpe contra o próprio atacante.'
 if(kind==='heal')return'Sinais visuais reforçam que a recuperação já foi aplicada.'
 if(kind==='buff')return'Sua preparação defensiva está ativa e influencia os próximos turnos.'
 if(kind==='hit')return side==='hero'?'O inimigo acertou e mudou o ritmo da rodada.':'Você acertou em cheio e ganhou pressão.'
 return'Observe a intenção do inimigo e os bônus ativos antes de agir.'
}
// Combina a cura de druida (druidHealProc) com o proc independente de "cura_forjada" e o
// multiplicador de "cura_bonus" em um único par chance/quantia, já que coopAttack só aceita
// uma rolagem de cura por ataque (ao contrário do solo, que rola as duas separadamente).
function coopHealProc(g:any){
 const druid=druidHealProc(g)
 const forgedChance=hasCraftedEffect(g,'cura_forjada')?.05:0
 const forgedAmount=Math.max(2,Math.round(attackValue(g)*.25))
 const bonusMult=1+(hasCraftedEffect(g,'cura_bonus')?.1:0)
 return{chance:Math.min(1,druid.chance+forgedChance),amount:Math.round(Math.max(druid.amount,forgedAmount)*bonusMult)}
}
function CoopTeammatesRow({coop,battle}:{coop:any,battle:any}){
 const teammates=coop.members.filter((member:any)=>member.user_id!==coop.userId)
 if(!teammates.length)return null
 const memberVitals=(coop.room?.shared_state?.memberVitals??{}) as Record<string,{hp?:number;maxHp?:number}>
 return <div className="coop-teammates-row">{teammates.map((member:any)=>{
  const hero=HEROES.find(x=>x.id===member.hero_id),vitals=memberVitals[member.user_id],hp=vitals?.hp??0,max=Math.max(1,vitals?.maxHp??1),pct=vitals?Math.max(0,Math.min(100,hp/max*100)):0,fallen=Boolean(vitals)&&hp<=0,active=battle?.activeUserId===member.user_id
  return <article key={member.id} className={`coop-teammate-chip${active?' active':''}${fallen?' fallen':''}`} title={`${member.display_name} • ${hero?.nome??'Aventureiro'} • Vida ${hp}/${max}`}>
   {hero&&<img src={assetUrl(cardArt(hero))} alt=""/>}
   <div><strong>{member.display_name}</strong><i><b style={{width:`${pct}%`}}/></i><small>{vitals?`${hp}/${max}`:'—'}</small></div>
  </article>
 })}</div>
}
function CombatScreen(){
 const combatUiMode=useUiMode()
 const g=useGame(),coop=useCoop(),h=HEROES.find(x=>x.id===g.heroId)!;const e=g.enemy,battle=coop.room?.shared_state?.battle as any,isCoop=Boolean(coop.room&&battle?.status==='playing'),myTurn=isCoop?battle.activeUserId===coop.userId:g.playerTurn
 const [battleViewMode,setBattleViewMode]=React.useState<BattleViewMode>('sprites')
 // No coop a rolagem do turno anterior fica na tela; a Previsão só entra depois que ela teve tempo de ser lida.
 const [coopForecastReady,setCoopForecastReady]=React.useState(false)
 const coopTurnKey=`${battle?.turn??''}-${battle?.activeUserId??''}`
 React.useEffect(()=>{if(!isCoop||!myTurn||combatUiMode!=='modern'){setCoopForecastReady(false);return}const timer=window.setTimeout(()=>setCoopForecastReady(true),1800);return()=>window.clearTimeout(timer)},[isCoop,myTurn,combatUiMode,coopTurnKey])
 const toggleBattleViewMode=()=>setBattleViewMode(v=>v==='cards'?'sprites':'cards')
 // AUTO-combate (g.autoCombat/runAutoCombatTurn em game.ts) só entendia o turno solo
 // (s.playerTurn, que startCoopCombat deixa sempre false) e chamava g.attack()/g.heroSkill()
 // direto -- no coop isso nunca disparava nada, igual ao bug antigo de fuga/consumível.
 // autoTurnRunnerRef guarda sempre a versão mais recente da decisão (definida mais abaixo,
 // depois que performAttack/performFervor/etc. já existem, pois dependem do inimigo `e`),
 // e este efeito só agenda a chamada -- precisa ficar antes do "if(!e) return" abaixo pra
 // não violar a ordem dos hooks entre renders.
 const autoTurnRunnerRef=React.useRef<()=>void>(()=>{})
 const myItemUsedRound=battle?.playerBuffs?.[coop.userId]?.itemUsedRound as number|undefined
 // Reagenda sempre que qualquer condição relevante muda -- inclui g.animating de propósito:
 // sem isso, um disparo que caía bem no meio da animação do golpe inimigo (que dura ~1-2s)
 // desistia (guarda dentro do runner) e nada mais reagendava depois, porque só o tamanho do
 // log era observado antes. O próprio runner é seguro de chamar de novo (cada ação coop
 // revalida de quem é a vez no servidor), então não precisa de uma trava de "já tentei essa
 // chave" -- cancelar/reagendar o timeout a cada mudança já evita disparos duplicados.
 React.useEffect(()=>{
  if(!isCoop||!g.autoCombat||!myTurn||g.animating)return
  // 500ms -> 2000ms: com 3-4 jogadores de verdade no auto, cada turno levava só meio segundo --
  // o log crescia rápido demais pra alguém acompanhar quem fez o quê. 2s por ação é o mínimo
  // pedido; o gate de g.animating acima já impede reagendar em cima de uma animação em andamento.
  const timer=window.setTimeout(()=>autoTurnRunnerRef.current(),2000)
  return()=>window.clearTimeout(timer)
 // itemUsedRound entra nas dependências porque o log da batalha para de crescer quando enche (16
 // entradas): sem isso, depois de uma poção (ação rápida, o turno continua) nada reagendava o auto.
 },[isCoop,g.autoCombat,myTurn,g.animating,battle?.log?.length,myItemUsedRound])
 React.useEffect(()=>{window.scrollTo({top:0,left:0,behavior:'auto'});document.documentElement.scrollTop=0;document.body.scrollTop=0},[])
 React.useEffect(()=>{
  if(h?.id)void preloadBattleSpriteImages('heroes',h.id)
  if(e?.nome)void preloadBattleSpriteImages('enemies',normalizeEnemySpriteId(e.nome))
 },[h?.id,e?.nome])
 const summonFxEvent=isCoop?battle?.summonAttackFx:g.summonAttackFx
 React.useEffect(()=>{if(g.heroId!=='conjurador'&&(g.summons?.length||g.summon))useGame.setState({summons:[],summon:undefined} as any)},[g.heroId])
 const [summonFxIndex,setSummonFxIndex]=React.useState(-1)
 React.useEffect(()=>{const types=summonFxEvent?.types as AttackAnimType[]|undefined;if(!types?.length){setSummonFxIndex(-1);return}setSummonFxIndex(0);const timers=types.slice(1).map((_,index)=>window.setTimeout(()=>setSummonFxIndex(index+1),(index+1)*700));timers.push(window.setTimeout(()=>setSummonFxIndex(-1),types.length*700+1400));return()=>timers.forEach(window.clearTimeout)},[summonFxEvent?.nonce])
 // Um único som ('hit') tocava pra todo ataque -- lâmina, garras, martelo e magia soavam
 // idênticos. Agora o tipo de arma/ataque decide o som, igual ao que já decide a animação
 // visual (currentAttackType, mais abaixo): arma equipada do herói, ou a heurística de nome/
 // habilidade do inimigo (enemyWeaponAnimationType). No coop, um golpe de um COLEGA (não do
 // jogador local) usa a arma dele, guardada em memberVitals -- sem isso o som sempre tocaria a
 // arma do jogador local, mesmo quando quem bateu foi um arqueiro do grupo.
 React.useEffect(()=>{
  const roll=g.combatRoll
  if(!roll)return
  if(roll.attacker==='enemy'){if(e)playSfx(ATTACK_SFX[enemyWeaponAnimationType(e)]);return}
  const attackerUserId=isCoop?battle?.lastRoll?.attackerUserId:undefined
  const attackerWeaponAnim=isCoop&&attackerUserId&&attackerUserId!==coop.userId?(coop.room?.shared_state?.memberVitals as Record<string,{weaponAnim?:AttackAnimType}>|undefined)?.[attackerUserId]?.weaponAnim:undefined
  playSfx(g.heroId==='druida'?'atkEspinhos':g.heroId==='monge'?'atkMonge':ATTACK_SFX[attackerWeaponAnim??heroWeaponAnimationType(g.equipped.mao_direita)])
 },[g.combatRoll])
 // Ataques de fera invocada (garras/mágico/martelo conforme o tipo, ver SUMMON_ATTACK_ANIMATION)
 // nunca tocavam som nenhum -- só combatRoll disparava áudio, e ataque de fera nunca seta
 // combatRoll (usa summonAttackFx à parte). O nonce muda a cada golpe, então serve de gatilho.
 React.useEffect(()=>{
  const type=summonFxEvent?.types?.[0] as AttackAnimType|undefined
  if(type)playSfx(g.heroId==='conjurador'?'summonTroll':ATTACK_SFX[type])
 },[summonFxEvent?.nonce])
 // A animação de habilidade de classe (Fighter isUsingSkill -> resolveFighterAnimationState)
 // nunca tinha um sinal pra disparar: heroSkill()/summonMonster() (solo) e useCoopHeroSkill()/
 // performSummon() (coop) incrementam heroSkillUses mas raramente ligam `animating` (a maioria
 // são buffs sem rolagem, ex.: Provocar, Ascensão Arcana), então a habilidade de toda classe
 // caía sempre no fallback (Defesa, se usa 'fortificacao', ou nem isso) -- nunca mostrava a
 // pose própria da habilidade. heroSkillUses sobe tanto no solo quanto no coop (useCoopHeroSkill/
 // performSummon escrevem no mesmo campo), então um único watcher cobre os dois modos.
 const heroSkillUsesRef=React.useRef(g.heroSkillUses??0)
 const [heroSkillFlash,setHeroSkillFlash]=React.useState(false)
 React.useEffect(()=>{
  const uses=g.heroSkillUses??0
  if(uses>heroSkillUsesRef.current){
   setHeroSkillFlash(true)
   const timer=window.setTimeout(()=>setHeroSkillFlash(false),2000)
   heroSkillUsesRef.current=uses
   return()=>window.clearTimeout(timer)
  }
  heroSkillUsesRef.current=uses
 },[g.heroSkillUses])
 if(!e){return <div className="combat-page premium-combat"><Panel title="Finalizando combate"><p className="muted">Preparando o resultado da batalha...</p></Panel></div>}
 // Consumível é ação rápida (1 por turno, sem gastar o ataque): no coop a rodada em que o jogador
 // já usou fica em playerBuffs[userId].itemUsedRound; no solo, itemUsedTurn compara com combatTurn.
 const defeated=g.hp<=0,disabled=!myTurn||g.animating||defeated,itemUsedThisTurn=isCoop?Number(battle?.playerBuffs?.[coop.userId]?.itemUsedRound??-1)===Number(battle?.round??1):g.itemUsedTurn===g.combatTurn,sharedRoll=isCoop?battle.lastRoll:undefined,intent=enemyIntentFor(e,g.combatTurn)
 // Sem limite de quantos tipos aparecem aqui -- a lista já rola (combat-v033 .combat-consumables
 // tem overflow-y:auto), então cortar em 6 (sempre os primeiros comprados, por ordem de chave do
 // objeto inventory) deixava tipos comprados depois inacessíveis em combate, mesmo tendo o item.
 const consumables=(Object.entries(g.inventory) as [string,number][]).filter(([,qty])=>qty>0).map(([id,qty])=>({item:CONSUMABLES.find(x=>x.id===id),qty})).filter(x=>x.item) as {item:(typeof CONSUMABLES)[number],qty:number}[]
 const itemAbilities=(Object.values(g.equipped) as (string|undefined)[]).map(id=>equipmentByRef(id)).filter((item):item is (typeof EQUIPMENT)[number]=>Boolean(item?.habilidade&&item.slot!=='bolsa'))
 // No coop, cada jogador pode usar a habilidade do herói uma vez por integrante da sala
 // (2 jogadores = 2 usos, 3 jogadores = 3 usos), em vez do limite único do modo solo.
 // Habilidades ativas gastam Energia (regenera por rodada). No coop o relógio é a rodada da batalha compartilhada.
 const heroSkillLimit=g.heroId==='conjurador'?2:Number.POSITIVE_INFINITY
 const heroSkillUses=g.heroSkillUses??0
 // Energia é do herói e vale igual no solo e no coop: sobe ao atacar (mais com crítico) e na fogueira, desce ao usar habilidade ou Fervor.
 const energyMaxNow=championStats(g).energiaMaxima
 const energyAvailable=energyNow(g)
 const skillEnergyCost=heroSkillEnergyCost(g.heroId)
 const hasSkillEnergy=energyAvailable>=skillEnergyCost
 const fervorCost=fervorEnergyCost()
 const hasFervorEnergy=energyAvailable>=fervorCost
 const spendCoopEnergy=(cost=skillEnergyCost)=>{useGame.setState({energy:Math.max(0,energyAvailable-cost)})}
 const sharedCoopVitals=(coop.room?.shared_state?.memberVitals??{}) as Record<string,{hp?:number;maxHp?:number}>
 const coopAutoVitals=isCoop?{...sharedCoopVitals,[coop.userId]:{...sharedCoopVitals[coop.userId],hp:g.hp,maxHp:maxHp(g)}}:sharedCoopVitals
 const coopHeroSkillHasValue=()=>shouldUseCoopAutoHeroSkill(g.heroId,coop.userId,battle,coop.members,coopAutoVitals)
 const useCoopHeroSkill=()=>{if(heroSkillUses>=heroSkillLimit||!myTurn||!hasSkillEnergy)return;
  // Golpe Flamejante (Monge) é um ataque de verdade (rola dado, causa dano), então passa por
  // coopAttack — igual ao Fervor de Combate — em vez de coopAbility, que só cobre efeitos sem
  // rolagem (buffs, cura, provocar).
  if(g.heroId==='conjurador')return
  if(g.heroId==='monge'){
   const heal=coopHealProc(g),spec=specializationBonuses(g),inputs=coopAttackInputs(g,e,false)
   spendCoopEnergy()
   useGame.setState({heroSkillUses:heroSkillUses+1})
   void coop.coopAttack(inputs.attackBase+Math.max(1,Math.round(2*heroAbilityPotency(g))),inputs.defenseBase,0,false,heal.chance,heal.amount,'Golpe Flamejante',undefined,false,0,inputs.critDamageBonusPct,'fogo',true,spec.elemental)
   if(g.firstStrikeBonus)useGame.setState({firstStrikeBonus:0})
   return
  }
  // Coop combat math é orientado inteiramente pelo estado compartilhado battle.playerBuffs/
  // groupBuff/extraActions/tauntUserId (lido em coopAttack/resolveEnemyTurn). Só heroSkillUses
  // precisa ficar local (ele só trava o botão); espelhar os campos de batalha do solo aqui
  // (combatAttackPct etc.) duplicaria o bônus em cima do que coopAttack já soma do estado
  // compartilhado.
  const effect=g.heroId==='guardiao'?'GUARDIAN_TAUNT':g.heroId==='guerreiro'?'WARRIOR_BUFF':g.heroId==='cacadora'?'DOUBLE_ATTACK':g.heroId==='arcanista'?'ARCANE_GROUP_BUFF':g.heroId==='druida'?'DRUID_HEAL':g.heroId==='cacador'?'HUNTER_CRITICAL':'PRIEST_REVIVE'
  spendCoopEnergy()
  useGame.setState({heroSkillUses:heroSkillUses+1})
  void coop.coopAbility(`Habilidade de ${h.nome}`,0,effect,false,heroAbilityPotency(g))}
 const performSummon=(tipo:SummonType)=>{if(isCoop){if(heroSkillUses>=heroSkillLimit||!myTurn||!hasSkillEnergy)return;spendCoopEnergy();useGame.setState({heroSkillUses:heroSkillUses+1});void coop.coopSummon(tipo,heroAbilityPotency(g))}else g.summonMonster(tipo)}
 const useCoopItemSkill=(equipmentId?:string)=>{if(g.itemSkillUsed||!myTurn)return;const item=itemAbilities.find(x=>x.id===equipmentId)??itemAbilities[0],effect=item?.activeEffect;if(!item||!effect)return
  if(effect.type==='shield'){useGame.setState({shield:g.shield+effect.value,itemSkillUsed:true});void coop.coopAbility(item.nome,0,`+${effect.value} de escudo`);return}
  if(effect.type==='heal'){const healed=Math.min(effect.value,maxHp(g)-g.hp);useGame.setState({hp:g.hp+healed,itemSkillUsed:true});void coop.coopAbility(item.nome,0,`recuperou ${healed} de vida`);return}
  if(effect.type==='cleanse'){useGame.setState({heroStatus:{},itemSkillUsed:true});void coop.coopAbility(item.nome,0,'ITEM_CLEANSE');return}
  if(effect.type==='reroll'){useGame.setState({heroRollBonus:g.heroRollBonus+effect.value,itemSkillUsed:true});void coop.coopAbility(item.nome,0,`+${effect.value} na próxima rolagem`);return}
  // Ataque de item com dano vai pelo mesmo dado de coopAttack (pode critar ou falhar),
  // igual ao solo (que roda o mesmo playerAttack usado pelo botão Atacar, com +3 de bônus)
  // em vez de um número fixo garantido.
  useGame.setState({itemSkillUsed:true})
  const heal=coopHealProc(g),rollBonus=g.heroRollBonus+(g.classRollBonus??0),critBoost=hasCraftedEffect(g,'critico'),spec=specializationBonuses(g),critChancePct=(hasCraftedEffect(g,'critico_forjado')?.05:0)+spec.crit,critDamageBonusPct=hasCraftedEffect(g,'dano_critico_bonus')?.1:0
  const bossBonus=(g.talents.includes('cacador')&&e.boss?2:0)+(e.boss?spec.bossDamage:0)+g.firstStrikeBonus
  void coop.coopAttack(attackValue(g)+effect.value+bossBonus,Math.max(0,(e.dificuldade??1)-2),rollBonus,critBoost,heal.chance,heal.amount,item.nome,undefined,false,critChancePct,critDamageBonusPct,effect.type==='element'?(effect.element??heroWeaponElement(g)):heroWeaponElement(g),effect.type==='element',spec.elemental)
  if(g.heroRollBonus||g.firstStrikeBonus)useGame.setState({heroRollBonus:0,firstStrikeBonus:0})}
 // Postura de combate, Fervor de Combate e alvo em capangas existiam só no modo solo —
 // aqui espelham o mesmo botão/ação, mas via coopAttack/coopSetStance (estado compartilhado).
 const activeMinions:{id:string;nome:string;hp:number;maxHp:number;ataque:number}[]=isCoop?((battle.combatMinions as any[])??[]):(g.combatMinions??[])
 const currentStance:BattleStance=(isCoop?battle.playerBuffs?.[coop.userId]?.battleStance:g.battleStance)??'neutra'
 // A fera espectral do Conjurador vive no estado compartilhado (battle.playerBuffs[userId].summon)
 // no coop, ou em g.summon no solo — em ambos os casos ela ataca e intercepta sozinha, sem
 // precisar de nenhum bônus lido aqui pela tela de combate.
 const personalSummons=heroSkillUses>0?(isCoop?battle.playerBuffs?.[coop.userId]?.summons:g.summons):[]
 const legacySummon=heroSkillUses>0?(isCoop?battle.playerBuffs?.[coop.userId]?.summon:g.summon):undefined
 const currentSummons:Summon[]=(Array.isArray(personalSummons)?personalSummons:(legacySummon?[legacySummon]:[])).filter((fera:Summon)=>fera.hp>0).slice(0,2)
 // Cada condição carrega quantos turnos de fato restam (bleed/burn/poison guardam isso em
 // .turns; frozen/grabbed/blinded são o próprio número; stunned é uso único, sem contagem) --
 // o badge em combate só mostrava o nome, então virar informado exigia passar o mouse (inútil
 // no toque/celular) sobre um tooltip que, até a correção acima, ainda dizia um valor errado.
 const statusTurnsOf=(status:any,kind:string):number|undefined=>{const value=status?.[kind];if(value==null)return undefined;return typeof value==='object'?value.turns:typeof value==='number'?value:undefined}
 const statusAmountOf=(status:any,kind:string):number|undefined=>{const value=status?.[kind];return value&&typeof value==='object'?value.amount:undefined}
 const statusKindsOf=(status:any)=>(['bleed','burn','poison','frozen','grabbed','blinded','stunned'] as const).filter(k=>status?.[k]).map(k=>({kind:k,turns:statusTurnsOf(status,k),amount:statusAmountOf(status,k)}))
 const heroStatusKinds=isCoop?statusKindsOf(battle.playerBuffs?.[coop.userId]):statusKindsOf(g.heroStatus)
 const enemyStatusKinds=[...(isCoop?statusKindsOf(battle.enemyStatus):statusKindsOf(g.enemyStatus)),...(!isCoop&&g.enemyFearPenalty>0?[{kind:'fear',turns:g.classBuffTurns||undefined,amount:g.enemyFearPenalty}]:[])]
 // Os números do golpe vêm de coopAttackInputs, os mesmos que a Previsão usa.
 const performCoopAttack=(targetMinionId?:string)=>{const heal=coopHealProc(g),spec=specializationBonuses(g),inputs=coopAttackInputs(g,e,Boolean(targetMinionId));void coop.coopAttack(inputs.attackBase,inputs.defenseBase,inputs.rollBonus,inputs.critBoost,heal.chance,heal.amount,targetMinionId?'Ataque direcionado':undefined,targetMinionId,false,inputs.critChancePct,inputs.critDamageBonusPct,heroWeaponElement(g),false,spec.elemental);if(g.heroRollBonus||(!targetMinionId&&g.firstStrikeBonus))useGame.setState({heroRollBonus:0,firstStrikeBonus:0})}
 const performAttack=(targetMinionId?:string)=>{if(isCoop)performCoopAttack(targetMinionId);else g.attack(targetMinionId)}
 const performSetStance=(stance:BattleStance)=>{if(isCoop)void coop.coopSetStance(stance);else g.setBattleStance(stance)}
 // g.flee() (game.ts) só entende o turno solo (s.playerTurn), então no coop nunca fazia
 // nada — igual ao bug que existia com os consumíveis. Uma fuga bem-sucedida encerra a
 // batalha compartilhada para o grupo inteiro (ver coopFlee/completeCoopFlee).
 const performFlee=()=>{if(isCoop)void coop.coopFlee();else g.flee()}
 // useConsumable (game.ts) só entende o turno solo (s.playerTurn) e dispara o turno do
 // inimigo local via enemyAfterDelay — no coop isso nunca avança (playerTurn não é usado)
 // e corromperia o estado compartilhado, então aqui replicamos o efeito localmente e
 // avançamos o turno pelo mesmo canal das outras ações cooperativas (coopAbility).
 const performUseConsumable=(id:string)=>{
  if(!isCoop){g.useConsumable(id);return}
  if(!myTurn||itemUsedThisTurn)return
  const it=CONSUMABLES.find(x=>x.id===id)
  if(!it||(g.inventory[id]??0)<=0)return
  if(consumableBonusActive(it,g))return
  const inv={...g.inventory,[id]:(g.inventory[id]??0)-1};if(inv[id]<=0)delete inv[id]
  const persistent=it.tipo==='ataque'||it.tipo==='escudo',activePotionIds=persistent?[...(g.activePotionIds??[]).filter(activeId=>activeId!==id),id]:(g.activePotionIds??[])
  const value=consumableEffectiveValue(it,g)
  let description:string
  if(it.tipo==='cura'){const healed=Math.min(value,maxHp(g)-g.hp);useGame.setState({inventory:inv,hp:g.hp+healed});description=`recuperou ${healed} de vida`}
  else if(it.tipo==='escudo'){useGame.setState({inventory:inv,shield:g.shield+value,activePotionIds});description=`+${value} de escudo`}
  else if(it.tipo==='vida_max'){const success=Math.random()<(LIFE_CHANCE[id]??.35);if(success){const newMax=maxHp(g)+value,newHp=id==='elixir_fenix'?newMax:Math.min(newMax,g.hp+value);useGame.setState({inventory:inv,permanentLife:(g.permanentLife??0)+value,hp:newHp});description=`vida máxima aumentada permanentemente em ${value}`}else{useGame.setState({inventory:inv});description='a tentativa falhou e a vida máxima não aumentou'}}
  else if(it.tipo==='regen_boost'){useGame.setState({inventory:inv,regenBoostUntil:Date.now()+3600000,lastPassiveHealAt:Date.now()});description='cura acelerada ativada'}
  else{useGame.setState({inventory:inv,pendingAttackBonus:g.pendingAttackBonus+Math.max(1,value),activePotionIds});description=`+${value} de ataque no próximo ataque`}
  void coop.coopAbility(it.nome,0,description,true)
 }
 const performFervor=()=>{if(!hasFervorEnergy||!myTurn)return;if(isCoop){const heal=coopHealProc(g),spec=specializationBonuses(g),inputs=coopAttackInputs(g,e,false);spendCoopEnergy(fervorCost);void coop.coopAttack(inputs.attackBase,inputs.defenseBase,0,false,heal.chance,heal.amount,'Fervor de Combate',undefined,true,0,inputs.critDamageBonusPct,heroWeaponElement(g),false,spec.elemental);if(g.firstStrikeBonus)useGame.setState({firstStrikeBonus:0})}else g.useFervor()}
 // g.ultimateAttack() (game.ts) só entende o turno solo (s.playerTurn/s.enemy) -- por isso o
 // botão manual do Golpe Supremo nunca funcionava direito em coop, e o auto-combate cooperativo
 // era escrito de propósito SEM checar o Supremo (ver comentário em autoTurnRunnerRef abaixo)
 // pra não amplificar esse bug chamando g.ultimateAttack() a cada turno automático. Reaproveita
 // ultimateEffects (mesma fórmula por classe do solo) e aplica cura/escudo/fervor localmente,
 // igual ao padrão de performUseConsumable, mandando só o dano pra coop.coopUltimate.
 const performUltimate=()=>{
  if((g.ultimateGauge??0)<100)return
  if(!isCoop){g.ultimateAttack();return}
  if(!myTurn)return
  const heroClass=g.heroId??'guerreiro',ultInfo=HERO_ULTIMATES[heroClass]??{nome:'Golpe Supremo',descricao:'Ataque avassalador'},heroMaxHp=maxHp(g)
  const{damage,bonusHeal,bonusShield,extraEnergy}=ultimateEffects(heroClass,attackValue(g),heroMaxHp)
  const nextHp=bonusHeal>0?Math.min(heroMaxHp,g.hp+bonusHeal):g.hp,nextShield=bonusShield>0?g.shield+bonusShield:g.shield,nextEnergy=gainEnergy(energyNow(g),championStats(g).energiaMaxima,extraEnergy)
  useGame.setState({ultimateGauge:0,hp:nextHp,shield:nextShield,energy:nextEnergy})
  void coop.coopUltimate(damage,ultInfo.nome,ultInfo.descricao)
 }
 const tryAutoItemSkill=(mode:'urgent'|'tactical')=>{
  if(g.itemSkillUsed)return false
  const equipmentId=selectAutoItemSkill(itemAbilities,{hp:g.hp,maxHp:maxHp(g),shield:g.shield,heroRollBonus:g.heroRollBonus+(g.classRollBonus??0),heroStatus:(isCoop?battle.playerBuffs?.[coop.userId]:g.heroStatus) as Record<string,unknown>|undefined,enemyHp:g.enemyHp,enemyMaxHp:e.vida,enemyIsBoss:Boolean(e.boss),enemyIsElite:Boolean(e.elite),enemyIntentType:intent.type,hasActiveMinions:Boolean(activeMinions.some(minion=>minion.hp>0))},{mode})
  if(!equipmentId)return false
  if(isCoop)useCoopItemSkill(equipmentId);else g.itemSkill(equipmentId)
  return true
 }
 // Mesma prioridade de decisão do auto-combate solo (runAutoCombatTurn em game.ts): Golpe
 // Supremo pronto > recursos defensivos urgentes > habilidade de herói > Fervor > capangas >
 // habilidade ofensiva de item > ataque padrão. O Supremo só entrou aqui depois que
 // performUltimate passou a rotear corretamente pro estado compartilhado (coop.coopUltimate) --
 // antes disso o botão manual e o auto-combate cooperativos chamavam g.ultimateAttack() (só
 // entende s.playerTurn/s.enemy do modo solo), então a barra enchia e o Supremo nunca disparava.
 autoTurnRunnerRef.current=()=>{
  if(!myTurn||g.animating||defeated)return
  if((g.ultimateGauge??0)>=100){performUltimate();return}
  // A poção é ação rápida (não gasta o turno): depois dela o auto ainda age na mesma vez, e o
  // efeito de reagendamento acima é acionado pelo novo registro no log.
  if(g.hp<maxHp(g)*.35&&(g.inventory['pocao_cura']??0)>0&&!itemUsedThisTurn){performUseConsumable('pocao_cura');return}
  if(tryAutoItemSkill('urgent'))return
  // Ataque Duplo (e qualquer outra habilidade "keepsTurn", ver DOUBLE_ATTACK em CoopContext.tsx)
  // libera extraActions[userId] e mantém o turno com o mesmo jogador pra ele de fato golpear de
  // novo -- sem essa checagem primeiro, a linha de baixo (heroSkillUses<heroSkillLimit, que no
  // coop escala com o número de jogadores) via de novo a habilidade em vez do ataque garantido,
  // reativando Ataque Duplo repetidas vezes sem nunca atacar e travando o combate esperando um
  // clique manual do jogador.
  const myExtraActions=isCoop?Number(battle?.extraActions?.[coop.userId]??0):0
  if(myExtraActions>0){performAttack();return}
  if(g.heroId==='conjurador'&&heroSkillUses<heroSkillLimit&&hasSkillEnergy){
   const summonType=selectCoopAutoSummonType(currentSummons,coopAutoVitals[coop.userId],coop.members,coopAutoVitals)
   if(summonType){performSummon(summonType);return}
  }
  if(g.heroId!=='conjurador'&&heroSkillUses<heroSkillLimit&&hasSkillEnergy&&coopHeroSkillHasValue()){useCoopHeroSkill();return}
  // O auto guarda a Energia para a habilidade enquanto ela ainda vale a pena; sem isso o Fervor (mais barato) gastaria tudo antes.
  const coopSkillReady=heroSkillUses<heroSkillLimit&&(g.heroId==='conjurador'?Boolean(selectCoopAutoSummonType(currentSummons,coopAutoVitals[coop.userId],coop.members,coopAutoVitals)):coopHeroSkillHasValue())
  if(hasFervorEnergy&&(!coopSkillReady||energyAvailable>=skillEnergyCost+fervorCost)){performFervor();return}
  const minion=activeMinions.find(m=>m.hp>0)
  if(minion){performAttack(minion.id);return}
  if(tryAutoItemSkill('tactical'))return
  performAttack()
 }
 const attacker=g.combatRoll?.attacker
 // No coop, o dano de "hero" pode ter vindo de qualquer jogador do grupo — sem isso, a
 // animação de ataque sempre usava a arma equipada do jogador local, mesmo quando quem
 // atacou foi um colega com uma arma de outro tipo (ex.: arco em vez de espada).
 const attackerUserId=isCoop?sharedRoll?.attackerUserId:undefined
 const attackerWeaponAnim=isCoop&&attackerUserId&&attackerUserId!==coop.userId?(coop.room?.shared_state?.memberVitals as Record<string,{weaponAnim?:AttackAnimType}>|undefined)?.[attackerUserId]?.weaponAnim:undefined
 const currentAttackType=attacker==='hero'?(attackerWeaponAnim??heroWeaponAnimationType(g.equipped.mao_direita)):attacker==='enemy'?enemyWeaponAnimationType(e):undefined
 const currentSummonAttackType=summonFxIndex>=0?summonFxEvent?.types?.[summonFxIndex] as AttackAnimType|undefined:undefined
 const currentRoll=g.combatRoll
 const isHeroUltimate=Boolean(g.animating&&(currentRoll?.attacker==='hero'||(isCoop&&sharedRoll?.attacker==='hero'))&&(currentRoll?.attackEffect?.includes('SUPREMO')||(currentRoll as any)?.ultimate||sharedRoll?.attackEffect?.includes('SUPREMO')||(sharedRoll as any)?.ultimate))
 const currentAttackCritical=!isHeroUltimate&&(g.combatRoll?.attackRoll===6||(isCoop&&sharedRoll?.attackRoll===6))
 const currentSupportFx=g.supportFx?.type
 const heroActing=Boolean(g.animating&&(currentSupportFx||currentRoll?.attacker==='hero'||currentSummonAttackType||(isCoop&&sharedRoll?.attacker==='hero')))
 const enemyActing=Boolean(g.animating&&currentRoll?.attacker==='enemy'&&!currentRoll?.selfDamage)
 const impactState=combatImpactFromState(currentRoll,currentSupportFx)
 const heroImpact=impactState.target==='hero'?impactState.kind:undefined
 const enemyImpact=impactState.target==='enemy'?impactState.kind:undefined
 const actionBadgeLabel=currentSupportFx?currentSupportFx==='fortificacao'?'Reforço ativo':'Cura ativa':currentSummonAttackType?'Ataque da invocação':currentRoll?.attacker==='hero'?'Seu ataque em execução':currentRoll?.attacker==='enemy'?'Ataque inimigo em execução':'Próxima ação'
 // No coop, o painel de dados usava só um resumo em texto (battle.lastRoll), nunca a animação
 // rica de CombatDiceRoll/FleeDiceRoll que o modo solo tem — mesmo já existindo dados suficientes
 // no estado compartilhado para isso. Aqui a gente prioriza a animação sempre que possível.
 const coopDiceRoll=isCoop&&sharedRoll&&(sharedRoll.attacker==='hero'||sharedRoll.attacker==='enemy')?sharedRoll:undefined
 // Previsão (modo Moderno, solo): só enquanto o jogador decide; o cálculo é o mesmo do combate real (store/combatPreview.ts).
 // No coop, quem o inimigo ataca é sorteado: a prévia diz a chance de ser você (store: online/coopPreview.ts).
 const coopVitalsAll=(coop.room?.shared_state?.memberVitals??{}) as Record<string,any>
 const soloForecast=!isCoop&&combatUiMode==='modern'&&e&&!disabled?{attack:previewHeroAttack(g as any),threat:previewEnemyAttack(g as any)}:undefined
 const coopForecast=isCoop&&combatUiMode==='modern'&&e&&!disabled&&coopForecastReady?{attack:previewCoopHeroAttack(battle,coop.userId,coopAttackInputs(g,e,false)),threat:previewCoopEnemyAttack({battle,userId:coop.userId,heroId:g.heroId,vitals:coopVitalsAll[coop.userId],livingCount:coop.members.filter(m=>Number(coopVitalsAll[m.user_id]?.hp??1)>0).length})}:undefined
 const forecastNode=soloForecast?.attack&&soloForecast.threat?<motion.div key="forecast" initial={{opacity:0}} animate={{opacity:1}}><CombatForecast attack={soloForecast.attack} threat={soloForecast.threat} hp={g.hp} hasSummons={Boolean(g.summon||g.summons?.length)}/></motion.div>
  :coopForecast?.attack&&coopForecast.threat?<motion.div key="forecast" initial={{opacity:0}} animate={{opacity:1}}><CombatForecast attack={coopForecast.attack} threat={coopForecast.threat} hp={Number(coopVitalsAll[coop.userId]?.hp??g.hp)} hasSummons={Boolean(g.summon||g.summons?.length)} coop={{targetChance:coopForecast.threat.targetChance,minionsAlive:coopForecast.threat.minionsAlive,enemyStunned:coopForecast.threat.enemyStunned}}/></motion.div>:undefined
 const idleDice=<motion.div className="combat-dice-idle" initial={{opacity:0}} animate={{opacity:1}}><Dices/><strong>Aguardando a próxima jogada</strong><small>Os resultados de ataque, defesa e fuga aparecerão aqui.</small></motion.div>
 const diceNode=isCoop
  ?(forecastNode??(battle.fleeRoll?<FleeDiceRoll key={`coop-flee-${battle.turn}`} roll={battle.fleeRoll}/>
    :coopDiceRoll?<CombatDiceRoll key={`coop-${battle.turn}-${coopDiceRoll.attacker}`} roll={coopDiceRoll}/>
    :sharedRoll?<motion.div className="combat-dice-idle" initial={{opacity:0}} animate={{opacity:1}}><Dices/><strong>{sharedRoll.actor}: {sharedRoll.label??'ação de equipe'}</strong><small>{sharedRoll.effect??`Dano causado: ${sharedRoll.damage??0}`}</small></motion.div>
    :idleDice))
  :(g.fleeRoll&&g.animating?<FleeDiceRoll key={`flee-${g.combatTurn}-${g.fleeRoll.roll}`} roll={g.fleeRoll}/>
    :g.combatRoll&&g.animating?<CombatDiceRoll key={`${g.combatTurn}-${g.combatRoll.attacker}`} roll={g.combatRoll}/>
    :forecastNode??idleDice)
 return <div className="combat-page premium-combat combat-v033">
  <div className="screen-intro"><small>FOCO DO TURNO</small><p>Olhe primeiro a intenção do inimigo, depois os bônus ativos e os consumíveis. O log continua disponível, mas a ação principal precisa ser lida em um só olhar.</p></div>
  <div className="battle-summary-strip"><span><small>SEU ATAQUE</small><strong>{attackValue(g)}</strong></span><span><small>SUA DEFESA</small><strong>{defenseValue(g)}</strong></span><span><small>INTENÇÃO</small><strong>{intent.label}</strong></span></div>
   <div className="combat-controls-strip">
     <button className={`combat-auto-toggle${g.autoCombat?' active':''}`} onClick={()=>g.toggleAutoCombat()} title="Auto-combate: ações executadas automaticamente no seu turno"><Zap size={14}/><span>AUTO {g.autoCombat?'LIGADO':'DESLIGADO'}</span></button>
   </div>
   <div className="combat-hero-area">
     <Fighter side="hero" classId={h.id} name={h.nome} image={cardArt(h)} hp={g.hp} max={maxHp(g)} attack={attackValue(g)} defense={defenseValue(g)} ability={h.habilidade} kind="HERÓI" rarity="HERÓICO" shaking={g.animating&&g.animationActor==='enemy'} damage={g.animating&&g.animationActor==='enemy'?g.lastDamage:undefined} attackType={currentAttackType} attackCritical={currentAttackCritical} supportFx={g.supportFx?.type} statusKinds={heroStatusKinds} attacking={heroActing} impactKind={heroImpact} turnOwner={myTurn&&!g.animating} battleViewMode={battleViewMode} onToggleBattleViewMode={toggleBattleViewMode} currentStance={currentStance} isUsingUltimate={isHeroUltimate} isUsingSkill={heroSkillFlash}/>
    {isCoop&&<CoopTeammatesRow coop={coop} battle={battle}/>}
    {isCoop&&<CoopEmoteBar className="combat-emote-bar"/>}
    {isCoop&&<CoopEmoteToast/>}
    {currentSummons.length>0&&<div className="summon-row">{currentSummons.map((fera,index)=><article key={`${fera.tipo}-${index}`}><Sparkles/><span><strong>{fera.nome}</strong><small>ATQ {fera.ataque} • DEF {fera.defesa} • VIDA {fera.hp}/{fera.maxHp}</small><i><b style={{width:`${fera.hp/fera.maxHp*100}%`}}/></i></span></article>)}</div>}
    <div className="hero-energy-meter" role="group" aria-label={`Energia: ${Math.floor(energyAvailable)} de ${energyMaxNow}`}>
      <small><Zap size={11}/> Energia</small>
      <strong>{Math.floor(energyAvailable)}/{energyMaxNow}</strong>
      <div className="energy-track"><div className="energy-fill" style={{width:`${energyMaxNow>0?Math.min(100,energyAvailable/energyMaxNow*100):0}%`}}/></div>
    </div>
    <div className={`hero-ultimate-intent${(g.ultimateGauge??0)>=100?' ready':''}`}>
      <small><Zap size={11}/> {g.heroId?HERO_ULTIMATES[g.heroId]?.nome:'Golpe Supremo'}</small>
      <strong>{Math.min(100,g.ultimateGauge??0)}%</strong>
      <div className="ultimate-track"><div className={`ultimate-fill${(g.ultimateGauge??0)>=100?' ready':''}`} style={{width:`${Math.min(100,g.ultimateGauge??0)}%`}}/></div>
    </div>
   </div>
   <div className="combat-enemy-area">
    <Fighter side="enemy" name={e.nome} image={cardArt(e)} hp={g.enemyHp} max={e.vida} attack={e.ataque} defense={enemyDefenseValue(e)} ability={e.habilidade} kind={e.boss?'CHEFE':e.elite?'ELITE':'INIMIGO'} rarity={e.boss?'LENDÁRIO':e.elite?'RARO':'COMUM'} shaking={g.animating&&g.animationActor==='hero'} damage={g.animating&&g.animationActor==='hero'?g.lastDamage:undefined} boss={e.boss} phase={e.fase} frameTheme={CATEGORY_FRAME[e.boss?'CHEFE':e.elite?'ELITE':'INIMIGO']} attackType={currentAttackType} summonAttackType={currentSummonAttackType} attackCritical={currentAttackCritical} statusKinds={enemyStatusKinds} attacking={enemyActing} impactKind={enemyImpact} turnOwner={!myTurn&&!g.animating} staggerCurrent={g.staggerCurrent} staggerMax={g.staggerMax} isStaggered={g.isStaggered} weakness={e.fraqueza??(e.elemento?ELEMENT_ADVANTAGES[e.elemento]?.weakAgainst?.[0]:undefined)} battleViewMode={battleViewMode} onToggleBattleViewMode={toggleBattleViewMode}/>
    {Boolean(activeMinions.some(minion=>minion.hp>0))&&<div className="boss-minion-row">{activeMinions.filter(minion=>minion.hp>0).map(minion=><article key={minion.id} className="targetable" role="button" tabIndex={disabled?-1:0} aria-disabled={disabled} title={`Atacar ${minion.nome} em vez do alvo principal`} onClick={()=>{if(!disabled)performAttack(minion.id)}} onKeyDown={event=>{if(!disabled&&(event.key==='Enter'||event.key===' ')){event.preventDefault();performAttack(minion.id)}}}><Shield/><span><strong>{minion.nome}</strong><i><b style={{width:`${minion.hp/minion.maxHp*100}%`}}/></i><small>ATQ {minion.ataque} • Vida {minion.hp}/{minion.maxHp}</small></span></article>)}</div>}
    <div className={`enemy-intent intent-${intent.type}`}><small>PRÓXIMA AÇÃO</small><strong>{intent.label}</strong><span>{intent.description}</span></div>
   </div>

   <Panel title="Habilidades dos itens" className="effects-panel combat-effects-area">
      {g.shield>0?<div className="active-effect"><Shield/><div><strong>Escudo ativo</strong><small>Absorve até {g.shield} de dano.</small></div></div>:<p className="muted no-effect">Nenhum efeito defensivo ativo.</p>}
      {/* Ativação por item mora aqui (cada peça tem seu próprio botão "Usar"), em vez de um
          único botão ambíguo "Habilidade do item" na caixa de Ações que sempre disparava a
          primeira peça equipada com qualquer texto de habilidade, sem o jogador saber qual. */}
      <div className="combat-item-abilities">{itemAbilities.length?itemAbilities.map(item=><div className="active-effect passive item-ability-row" key={item.id}><Sparkles/><div><strong>{item.nome}</strong><small>{itemSkillEffectText(item)}</small></div><button className="item-ability-use" disabled={disabled||g.itemSkillUsed} title={g.itemSkillUsed?'Já usou uma habilidade de item neste combate':disabled?'Aguarde seu turno':undefined} onClick={()=>isCoop?useCoopItemSkill(item.id):g.itemSkill(item.id)}>Usar</button></div>):<p className="muted no-effect">Nenhum equipamento com habilidade.</p>}</div>
   </Panel>

   <Panel title="Registro de combate" className="combat-log-panel combat-log-area">
    <div className="combat-log-turn" aria-label={`Turno ${g.combatTurn}`}><small>TURNO</small><strong>{g.combatTurn}</strong></div>
    <div className="combat-initiative"><span className={'coin '+(g.coin?'flipped':'')}>{isCoop?(battle.initiativeIndex+1):(g.coin==='cara'?'C':'K')}</span><small>{isCoop?`Rodada ${battle.round} • Ordem: ${(battle.initiativeNames??[]).join(' → ')}`:(g.coin==='cara'?'Cara: herói iniciou':'Coroa: inimigo iniciou')}</small></div>
    <div className="combat-log premium-log">{(isCoop?(battle.log??[]):g.combatLog).map((x:string,i:number)=><motion.p key={i+x} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}><span className="log-dot">◉</span>{x}</motion.p>)}</div>
   </Panel>

   <Panel title="Ações" className="combat-actions-panel combat-actions-area">
      <div className={`combat-turn-banner ui-modern-only${defeated?' is-defeated':g.animating?' is-busy':myTurn?' is-mine':''}`} role="status"><span>Turno {isCoop?battle.round:g.combatTurn}</span><strong>{defeated?'Você caiu':g.animating?'Resolvendo a rodada…':myTurn?'Sua vez':isCoop?'Vez dos outros combatentes':'Vez do inimigo'}</strong></div>
      {defeated&&<p className="coop-defeated-notice">DERROTADO • Você não pode mais realizar ações nesta batalha. As penalidades serão aplicadas ao final.</p>}
      <div className="combat-actions-grid">
       <button className="attack-btn premium-action" disabled={disabled} title={disabled?(defeated?'Você foi derrotado':'Aguarde seu turno'):undefined} onClick={()=>performAttack()}><Sword/>Atacar</button>
       {g.heroId==='conjurador'&&heroSkillUses<2&&currentSummons.length<2
        ?<div className="summon-choice-row">
          <button className="premium-action" disabled={disabled||!hasSkillEnergy} title="Fera ofensiva: mais ataque, ataca a cada turno com dado próprio." onClick={()=>performSummon('atacante')}><Sword/>Fera ofensiva</button>
          <button className="premium-action" disabled={disabled||!hasSkillEnergy} title="Fera defensiva: mais vida e defesa, alta chance de interceptar ataques por você." onClick={()=>performSummon('defensor')}><Shield/>Fera defensiva</button>
          <button className="premium-action" disabled={disabled||!hasSkillEnergy} title="Fera arcana: concede +10% de Poder de ataque e Armadura a você enquanto viva." onClick={()=>performSummon('arcano')}><Sparkles/>Fera arcana</button>
         </div>
        :<button className="premium-action" disabled={disabled||g.heroId==='conjurador'||heroSkillUses>=heroSkillLimit||((g.heroSkillCooldown??0)>0)||!hasSkillEnergy} title={g.heroId==='conjurador'?'Você já mantém duas feras espectrais nesta batalha.':(g.heroSkillCooldown??0)>0?`Recarga: ${g.heroSkillCooldown} turnos`:!hasSkillEnergy?`Energia insuficiente: ${Math.floor(energyAvailable)}/${skillEnergyCost}. Ataque para ganhar Energia (mais com crítico) ou descanse na fogueira.`:`Custa ${skillEnergyCost} de Energia.`} onClick={()=>isCoop?useCoopHeroSkill():g.heroSkill()}><Sparkles/>{g.heroId==='conjurador'?'Limite de feras atingido':heroSkillNames[g.heroId??'']??'Habilidade do herói'}{(g.heroSkillCooldown??0)>0?` (${g.heroSkillCooldown}t)`:g.heroId==='conjurador'?` (${Math.min(heroSkillUses,heroSkillLimit)}/${heroSkillLimit})`:` (${skillEnergyCost} EN)`}</button>}
       <button className="premium-action" disabled={disabled} title={disabled?(defeated?'Você foi derrotado':'Aguarde seu turno'):undefined} onClick={performFlee}><Footprints/>Tentar fugir</button>
       <div className="stance-row" role="group" aria-label="Postura de combate">
        <button className={`premium-action${currentStance==='ofensiva'?' active':''}`} disabled={disabled} title="Postura Ofensiva: +20% de Poder de ataque e -20% de Armadura até trocar de postura." onClick={()=>performSetStance('ofensiva')}><Swords/>Ofensiva</button>
        <button className={`premium-action${currentStance==='neutra'?' active':''}`} disabled={disabled} title="Postura Neutra: sem bônus ou penalidade de Poder de ataque/Armadura." onClick={()=>performSetStance('neutra')}><Scale/>Neutra</button>
        <button className={`premium-action${currentStance==='defensiva'?' active':''}`} disabled={disabled} title="Postura Defensiva: +20% de Armadura e -20% de Poder de ataque até trocar de postura." onClick={()=>performSetStance('defensiva')}><ShieldHalf/>Defensiva</button>
       </div>
       <button className="premium-action fervor-action" disabled={disabled||!hasFervorEnergy} title={hasFervorEnergy?`Custa ${fervorCost} de Energia: acerta uma rolagem de ataque cheia com um crítico garantido.`:`Energia insuficiente: ${Math.floor(energyAvailable)}/${fervorCost}. Ataque para ganhar Energia (mais com crítico) ou descanse na fogueira.`} onClick={performFervor}><Zap/>Fervor de Combate ({fervorCost} EN)</button>
       <button className={`premium-action ultimate-action-btn${(g.ultimateGauge??0)>=100?' ready':''}`} disabled={disabled||(g.ultimateGauge??0)<100} title={(g.ultimateGauge??0)<100?`Carregue a barra de Supremo (${g.ultimateGauge??0}%/100%) causando e sofrendo dano`:g.heroId?HERO_ULTIMATES[g.heroId]?.descricao:'Desperte o Golpe Supremo!'} onClick={performUltimate}><Zap size={16}/>{g.heroId?HERO_ULTIMATES[g.heroId]?.nome:'Golpe Supremo'}</button>
      </div>
   </Panel>

   <Panel title="Rolagem dos dados" className="combat-dice-panel combat-dice-area">
    <div className={`combat-action-callout${impactState.kind?` impact-${impactState.kind}`:''}`}>
      <small>{actionBadgeLabel}</small>
      <strong>{combatEventHeadline(impactState.kind)}</strong>
      <span>{combatEventDescription(impactState.kind,impactState.target)}</span>
    </div>
    <AnimatePresence mode="wait">{diceNode}</AnimatePresence>
   </Panel>

   <Panel className="combat-consumables-panel combat-consumables-area">
      <div className="consumables-head"><span>ITENS CONSUMÍVEIS</span><small>{consumables.length?`${consumables.length} tipos disponíveis`:'Nenhum item disponível'}</small></div>
      <div className="combat-consumables">
       {consumables.length?consumables.map(({item,qty})=>{const desc=consumableDescription(item,g),active=consumableBonusActive(item,g);return <article key={item.id} className={`combat-consumable rarity-${cardRarity(item,'Consumível')}`} title={active?'Esta poção já está ativa. Use outra poção para combinar bônus.':desc}><span className="consumable-qty">{qty}</span><div className="combat-consumable-art"><ArtPreview image={cardArt(item)} name={item.nome} text={desc} stats={`${item.tipo} • Valor ${consumableEffectiveValue(item,g)} • Quantidade ${qty}`}/></div><strong>{item.nome}</strong><small>{active?'Efeito desta poção já está ativo.':desc}</small><button disabled={disabled||active||itemUsedThisTurn} title={active?undefined:disabled?'Aguarde seu turno':itemUsedThisTurn?'Você já usou um consumível neste turno':'Ação rápida: não gasta o seu ataque'} onClick={()=>performUseConsumable(item.id)}>{active?'ATIVA':'USAR'}</button></article>}):<div className="consumables-empty"><FlaskConical/><span>Seus consumíveis aparecerão aqui durante o combate.</span></div>}
      </div>
   </Panel>

   <div className="combat-tip"><Sparkles size={15}/> Dica: use os consumíveis no momento certo — utilizar um item consome seu turno.</div>
 </div>}
function StatusBadge({kind,turns,amount}:{kind:string;turns?:number;amount?:number}){
 const [open,setOpen]=React.useState(false),copy=STATUS_TOOLTIP_COPY[kind],label=statusLabel(kind),turnText=kind==='stunned'?'Uso único':turns!=null&&turns>0?`${turns} turno${turns===1?'':'s'} restante${turns===1?'':'s'}`:'Sem duração fixa'
 return <button type="button" className={`status-badge status-${kind}${open?' open':''}`} onClick={()=>setOpen(v=>!v)} onBlur={()=>setOpen(false)} aria-label={`${label}: ${copy?.effect??STATUS_DURATION_NOTE[kind]??''}`}>{label}{turns!=null&&turns>0?` ×${turns}`:''}<span className="status-tooltip" role="tooltip"><strong>{label}</strong><small>{copy?.element??'Condição'}</small><em>{copy?.effect??STATUS_DURATION_NOTE[kind]??'Efeito temporário em combate.'}</em><b>{turnText}{amount!=null?` • Intensidade ${amount}`:''}</b></span></button>
}
function Fighter({side,classId,name,image,hp,max,attack,defense,ability,kind,rarity:_rarity,shaking,boss,phase,damage,frameTheme,attackType,summonAttackType,attackCritical,supportFx,statusKinds,attacking,impactKind,turnOwner,staggerCurrent,staggerMax,isStaggered,weakness,battleViewMode,onToggleBattleViewMode,currentStance,isUsingUltimate,isUsingSkill}:{side:string;classId?:string;name:string;image:string;hp:number;max:number;attack:number;defense:number;ability:string;kind:string;rarity:string;shaking:boolean;boss?:boolean;phase?:number;damage?:number;frameTheme?:string;attackType?:AttackAnimType;summonAttackType?:AttackAnimType;attackCritical?:boolean;supportFx?:'fortificacao'|'cura'|'cura-item';statusKinds?:readonly{kind:string;turns?:number;amount?:number}[];attacking?:boolean;impactKind?:CombatImpactKind;turnOwner?:boolean;staggerCurrent?:number;staggerMax?:number;isStaggered?:boolean;weakness?:string;battleViewMode?:BattleViewMode;onToggleBattleViewMode?:()=>void;currentStance?:BattleStance;isUsingUltimate?:boolean;isUsingSkill?:boolean}){
 const galleryKind=side==='hero'?'Herói':boss?'Chefe':kind==='ELITE'?'Elite':'Monstro'
 const card={id:classId,nome:name,arte:image,habilidade:ability,ataque:attack,defesa:defense,vida:max,boss,elite:kind==='ELITE',raridade:side==='hero'?'heroico':boss?'lendario':kind==='ELITE'?'raro':'comum'}
 const shakeAnim=!shaking?{x:0,rotate:0}:effectsReduced()?{x:[0,-3,0],rotate:0}:attackCritical?{x:[0,-16,14,-10,6,-3,0],rotate:[0,-2.5,2.5,-1.5,0]}:{x:[0,-9,8,-5,0],rotate:0}
 const previousPhase=React.useRef(phase)
 const [phaseFlash,setPhaseFlash]=React.useState(false)
 React.useEffect(()=>{
  const previous=previousPhase.current
  previousPhase.current=phase
  if(!boss||phase==null||previous==null||phase===previous)return
  setPhaseFlash(true)
  const timer=setTimeout(()=>setPhaseFlash(false),1300)
  return()=>clearTimeout(timer)
 },[phase,boss])
 const strikeAnim=!attacking?{x:0,y:0,scale:1,filter:'brightness(1)'}:effectsReduced()?{x:side==='hero'?[0,8,0]:[0,-8,0],y:0,scale:[1,1.015,1],filter:['brightness(1)','brightness(1.06)','brightness(1)']}:{x:side==='hero'?[0,18,6,0]:[0,-18,-6,0],y:[0,-4,0],scale:isUsingUltimate?[1,1.08,1.02,1]:attackCritical?[1,1.04,1.01,1]:[1,1.025,1],filter:['brightness(1)',isUsingUltimate?'brightness(1.2)':'brightness(1.12)','brightness(1.04)','brightness(1)']}
 const strikeDuration = attacking ? (isUsingUltimate ? 2.4 : 2.0) : 0.24
 const isFlipped = battleViewMode === 'sprites'
 const spriteCategory = side === 'hero' ? 'heroes' : 'enemies'
 const spriteId = side === 'hero' ? (classId || 'guerreiro') : normalizeEnemySpriteId(name)
 const animState = resolveFighterAnimationState({
  side: side as 'hero' | 'enemy',
  hp,
  maxHp: max,
  shaking,
  attacking,
  attackCritical: isUsingUltimate ? false : attackCritical,
  impactKind,
  supportFx,
  currentStance,
  isUsingUltimate,
  isUsingSkill,
 })
 const cardFrameNode = (
  <CardFrame
   card={card}
   kind={galleryKind}
   frameTheme={frameTheme}
   attackFx={summonAttackType ?? (shaking ? attackType : undefined)}
   attackFxCritical={summonAttackType ? false : (shaking ? attackCritical : undefined)}
   supportFx={supportFx}
   tilt={!isFlipped}
   holoMode="frame"
  />
 )
 return <motion.article className={'fighter premium-fighter combat-card-fighter '+side+(boss?' boss':'')+(turnOwner?' turn-owner':'')+(impactKind?` impact-${impactKind}`:'')} animate={shakeAnim} transition={{duration:shaking&&attackCritical?.5:.35}}>
  {turnOwner&&!effectsReduced()&&<motion.div className="fighter-turn-glow" animate={{opacity:[.28,.58,.28],scale:[.985,1.01,.985]}} transition={{duration:2.2,repeat:Infinity,ease:'easeInOut'}}/>}
  {attacking&&!effectsReduced()&&<motion.div className={`fighter-strike-trail ${side}`} initial={{opacity:0,scale:.88,x:side==='hero'?-14:14}} animate={{opacity:[0,.92,.2,0],scale:[.88,1.04,1.12,1.16],x:side==='hero'?[-14,18,36,54]:[14,-18,-36,-54]}} transition={{duration:2.0,times:[0,.45,.8,1],ease:'easeOut'}}/>}
  {impactKind&&!effectsReduced()&&<motion.div className={`fighter-impact-flash ${impactKind}`} initial={{opacity:0,scale:.84}} animate={{opacity:[0,.95,.18,0],scale:impactKind==='critical'?[.84,1.08,1.12,1.18]:[.84,1.02,1.08]}} transition={{duration:impactKind==='critical'?.62:.44,times:[0,.18,.68,1],ease:'easeOut'}}/>}
  <motion.div className="fighter-card-motion" animate={strikeAnim} transition={{duration:strikeDuration,ease:[0.22,1,0.36,1]}}>
   <div
    className={`fighter-flip-container${isFlipped ? ' is-flipped' : ''}`}
    onClick={() => onToggleBattleViewMode?.()}
    role="button"
    tabIndex={0}
    onKeyDown={e => {
     if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggleBattleViewMode?.()
     }
    }}
    aria-label={isFlipped ? 'Carta virada para lutador 2D. Clique para ver carta e atributos.' : 'Carta em exibição. Clique para virar para lutador 2D.'}
    title={isFlipped ? 'Clique para ver a carta e atributos' : 'Clique para virar e ver lutador 2D'}
   >
    <div className={`fighter-flip-inner${isFlipped ? ' is-flipped' : ''}`}>
     <div className="fighter-flip-face fighter-flip-front">
      {cardFrameNode}
     </div>
     <div className="fighter-flip-face fighter-flip-back">
      <BattleSpriteActor
       side={side as 'hero' | 'enemy'}
       category={spriteCategory}
       id={spriteId}
       name={name}
       state={animState}
       fallbackCard={cardFrameNode}
       reducedMotion={effectsReduced()}
       defaultState={currentStance==='ofensiva'?'stance_offensive':currentStance==='defensiva'?'stance_defensive':'idle'}
      />
     </div>
    </div>
   </div>
  </motion.div>
  {boss&&<small className="combat-card-phase">FASE {phase??1}</small>}
  {phaseFlash&&!effectsReduced()&&<motion.div className="phase-transition-banner" initial={{opacity:0,scale:.6,y:-8}} animate={{opacity:[0,1,1,0],scale:[.6,1.08,1,1],y:0}} transition={{duration:1.2,times:[0,.22,.78,1]}}><Zap size={15}/>FASE {phase}!</motion.div>}
  {shaking&&damage!==undefined&&<motion.div className={`floating-damage ${side==='hero'?'hero-damage':'enemy-damage'}${attackCritical?' critical':''}${impactKind==='ultimate'?' ultimate':''}${impactKind==='blocked'?' blocked':''}`} initial={{opacity:0,y:10,scale:.5}} animate={{opacity:1,y:-45,scale:impactKind==='ultimate'?1.45:attackCritical?1.3:1.15}} transition={{duration:.5,delay:attackCritical?.14:.08,ease:'backOut'}}>{impactKind==='ultimate'?<b>⚡ SUPREMO!</b>:attackCritical?<b>CRÍTICO!</b>:impactKind==='blocked'?<b>ESCUDO!</b>:null}-{damage}</motion.div>}
  {supportFx&&<motion.div className={`floating-support-fx floating-${supportFx}`} initial={{opacity:0,y:10,scale:.6}} animate={{opacity:1,y:-35,scale:1.2}} transition={{duration:.6,ease:'backOut'}}>{supportFx==='fortificacao'?'+🛡️ ESCUDO':'+💚 CURA'}</motion.div>}
  <div className="hp-label"><span>Vida</span><strong>{Math.max(0,hp)}/{max}</strong></div><div className="hp-track"><motion.div animate={{width:`${Math.max(0,hp/max*100)}%`}} transition={{duration:.45}}/></div>
  {staggerMax!=null&&staggerMax>0&&side==='enemy'&&<div className="stagger-meter"><div className="stagger-text"><span>{isStaggered?'💥 POSTURA QUEBRADA!':'Postura'}</span><strong>{staggerCurrent??0}/{staggerMax}</strong></div><div className={`stagger-track${isStaggered?' broken':''}`}><motion.div animate={{width:`${Math.min(100,((staggerCurrent??0)/staggerMax)*100)}%`}} transition={{duration:.3}}/></div></div>}
  {weakness&&side==='enemy'&&<div className="enemy-weakness-badge" title={`Inimigo vulnerável a dano de ${weakness} (+35% de dano)`}><span>Fraqueza:</span><strong>{weakness.toUpperCase()}</strong></div>}
  {Boolean(statusKinds?.length)&&<div className="status-badges">{statusKinds!.map(({kind,turns,amount})=><StatusBadge key={kind} kind={kind} turns={turns} amount={amount}/>)}</div>}
 </motion.article>
}
function LootScreen(){const modernLoot=useUiMode()==='modern',g=useGame(),coop=useCoop();const l=g.loot,defeat=l?.title==='EQUIPE DERROTADA',epic=Boolean(l&&!defeat&&l.title!=='VITÓRIA');
 React.useEffect(()=>{if(!l||defeat)return;if(l.leveledUp)playSfx('levelup');else if(l.gold>0)playSfx('coin')},[l]);const e=l?.equipmentId?EQUIPMENT.find(x=>x.id===l.equipmentId):undefined;const i=l?.itemId?CONSUMABLES.find(x=>x.id===l.itemId):undefined;const missed=l?.missedEquipmentId?EQUIPMENT.find(x=>x.id===l.missedEquipmentId):undefined;const lootActions=<div className="loot-actions">{g.dungeonActive?<><button className="primary" onClick={g.startDungeon}>Avançar para a sala {g.dungeonDepth+1}</button><button onClick={g.leaveDungeon}>Encerrar expedição</button></>:<button className="primary" onClick={async()=>{if(coop.room){await coop.completeBattle();g.finishLoot();g.setScreen('coop')}else g.finishLoot()}}>{coop.room?'Voltar à sala Coop':'Voltar ao mapa'}</button>}</div>;if(modernLoot)return <div className="loot-page loot-modern"><VictoryModern loot={l} defeat={defeat} epic={epic} group={coop.room&&(coop.room.shared_state?.battle as any)?.status==='won'?{rows:coopShareTable(coop.room.shared_state.battle as any,coop.members),me:coop.userId,classLabel:id=>id?(classNames[id]??id):'Aventureiro'}:undefined} nextStep={g.dungeonActive?`Sala ${g.dungeonDepth+1}`:'Mapa'} animated={value=><AnimatedNumber value={value}/>} equipmentCard={e?<ItemCard image={cardArt(e)} rarity={cardRarity(e,'Equipamento')} name={e.nome} subtitle="Equipamento obtido" badge={l?.isNewEquipment?'Nova descoberta':undefined}/>:undefined} itemCard={i?<ItemCard image={cardArt(i)} rarity={cardRarity(i,'Consumível')} name={i.nome} subtitle="Consumível obtido" badge={l?.isNewItem?'Nova descoberta':undefined}/>:undefined}/>{g.dungeonActive&&<p className="muted">Profundidade concluída: {g.dungeonDepth}. A próxima sala será mais perigosa e valiosa.</p>}<LootPreparation/><LootEquipmentPanel/>{missed&&<p className="loot-missed"><Package/> Você encontrou <b>{missed.nome}</b>, mas sua bolsa de equipamentos estava cheia e o item foi perdido. Libere espaço na Mochila para não perder o próximo.</p>}<div className="vc-actions">{lootActions}</div></div>;return <div className="loot-page"><Panel><div className="loot-head"><small>RESULTADO DA BATALHA</small><button onClick={()=>g.finishLoot()}>Voltar ao mapa</button></div><div className="screen-intro"><p>O resumo existe para dizer rapidamente o que você ganhou, o que mudou no personagem e o que vale olhar antes da próxima luta.</p></div>{defeat?<Skull className="trophy"/>:<Trophy className={`trophy${epic?' epic':''}`}/>}<h1>{l?.title??'Vitória'}</h1><div className="loot-summary"><span><small>OURO</small><strong>+<AnimatedNumber value={l?.gold??0}/></strong></span><span><small>XP</small><strong>+<AnimatedNumber value={l?.xp??0}/></strong></span><span><small>PRÓXIMO PASSO</small><strong>{g.dungeonActive?`Sala ${g.dungeonDepth+1}`:'Mapa'}</strong></span></div>{l?.leveledUp&&<div className="levelup-banner"><Sparkles size={26}/><span>Você alcançou o nível {l.newLevel}!{(l.levelsGained??0)>1?` (+${l.levelsGained} níveis de uma vez)`:''}<small>Novos pontos de atributo disponíveis na Ficha.</small></span><Sparkles size={26}/></div>}{g.dungeonActive&&<p className="muted">Profundidade concluída: {g.dungeonDepth}. A próxima sala será mais perigosa e valiosa.</p>}<div className="loot-stats"><Stat label="Ouro recebido" value={<>+<AnimatedNumber value={l?.gold??0}/></>}/><Stat label="Experiência recebida" value={<>+<AnimatedNumber value={l?.xp??0}/></>}/>{e&&<motion.div initial={{opacity:0,y:14,scale:.92}} animate={{opacity:1,y:0,scale:1}} transition={{duration:.45,delay:.15,ease:'backOut'}}><ItemCard image={cardArt(e)} rarity={cardRarity(e,'Equipamento')} name={e.nome} subtitle="Equipamento obtido" badge={l?.isNewEquipment?'Nova descoberta':undefined}/></motion.div>}{i&&<motion.div initial={{opacity:0,y:14,scale:.92}} animate={{opacity:1,y:0,scale:1}} transition={{duration:.45,delay:e?.3:.15,ease:'backOut'}}><ItemCard image={cardArt(i)} rarity={cardRarity(i,'Consumível')} name={i.nome} subtitle="Consumível obtido" badge={l?.isNewItem?'Nova descoberta':undefined}/></motion.div>}{!e&&!i&&!missed&&<p className="muted">Nenhum item adicional foi encontrado.</p>}</div><LootPreparation/><LootEquipmentPanel/>{missed&&<p className="loot-missed"><Package/> Você encontrou <b>{missed.nome}</b>, mas sua bolsa de equipamentos estava cheia e o item foi perdido. Libere espaço na Mochila para não perder o próximo.</p>}{lootActions}</Panel></div>}
function LootPreparation(){
 const g=useGame(),[notice,setNotice]=React.useState('')
 const entries=(Object.entries(g.inventory) as [string,number][]).filter(([,qty])=>qty>0).map(([id,qty])=>({item:CONSUMABLES.find(item=>item.id===id),qty})).filter(entry=>entry.item) as {item:(typeof CONSUMABLES)[number];qty:number}[]
 const useItem=(id:string)=>{g.useConsumable(id);setNotice(useGame.getState().explorationNote??'Consumível utilizado.')}
 return <section className="loot-preparation"><header><div><FlaskConical/><span><strong>Preparação para a próxima batalha</strong><small>Use consumíveis agora. Curas são imediatas; escudo e ataque ficam reservados para o próximo combate.</small></span></div><b>{g.hp}/{maxHp(g)} VIDA</b></header>{notice&&<p className="loot-preparation-notice"><Sparkles/>{notice}</p>}{entries.length?<div className="loot-consumables">{entries.map(({item,qty})=>{const active=consumableBonusActive(item,g),fullHealth=item.tipo==='cura'&&g.hp>=maxHp(g),disabled=active||fullHealth;return <article key={item.id}><img src={assetUrl(cardArt(item))} alt=""/><span><strong>{item.nome}</strong><small>{consumableDescription(item,g)}</small><em>{qty} disponível{qty===1?'':'is'}</em></span><button disabled={disabled} title={active?'Uma unidade desta poção já está ativa.':fullHealth?'Sua vida já está completa.':undefined} onClick={()=>useItem(item.id)}>{active?'Ativa':fullHealth?'Vida cheia':'Usar'}</button></article>})}</div>:<p className="muted">Nenhum consumível disponível para preparação.</p>}</section>
}
// Bloco pedido pelos jogadores: antes, trocar de equipamento ou desmontar/vender um item da
// mochila exigia sair do resumo de batalha e navegar até as telas de Equipamentos/Forja/Loja --
// no meio de uma masmorra isso quebrava o ritmo (e cada saída de tela reseta o combate). Reusa
// exatamente as mesmas ações da store (equip/dismantleEquipment/sellEquipment) e o mesmo padrão
// visual do ItemCard/ForgeSalvagePanel, só que direto no resumo da batalha.
function LootEquipmentPanel(){
 const g=useGame(),capacity=equipmentBagCapacity(g)
 if(!g.equipmentBag.length)return <section className="loot-equipment"><header><div><Backpack/><span><strong>Mochila</strong><small>Sua mochila de equipamentos está vazia.</small></span></div></header></section>
 return <section className="loot-equipment">
  <header><div><Backpack/><span><strong>Mochila</strong><small>Troque seu equipamento, desmonte por materiais ou venda por ouro antes de seguir viagem.</small></span></div><b>{g.equipmentBag.length}/{capacity}</b></header>
  <div className="item-grid compact">{g.equipmentBag.map((id,idx)=>{
   const e=equipmentByRef(id); if(!e)return null
   const p=equipmentStatParts(e,id,g)
   const allowed=equipmentClassAllowed(e,g.heroId),levelAllowed=equipmentLevelAllowed(e,g.xp),required=equipmentRequiredLevel(e)
   const fits=e.slot!=='bolsa'||g.equipmentBag.length<=(e.capacidade??8)
   const dualLocked=e.slot==='mao_esquerda'&&equipmentWeaponClass(equipmentByRef(g.equipped.mao_direita))==='facas'
   const equipLabel=!allowed?'Impossível equipar':!levelAllowed?`Requer nível ${required}`:!fits?`Reduza para ${e.capacidade} itens`:dualLocked?'Facas ocupam as duas mãos':'Equipar'
   const stats=e.slot==='bolsa'?`Capacidade ${e.capacidade??8} espaços`:`${offenseLabel(activeHeroId())} +${p.atk}${p.atkDetail} • Armadura +${p.def}${p.defDetail} • Vida +${p.life}${p.lifeDetail}`
   const preview=dismantlePreview(e),sellPrice=Math.max(1,Math.floor(e.preco/2))
   return <ItemCard key={id+idx} image={cardArt(e)} rarity={cardRarity(e,'Equipamento')} name={e.nome} subtitle={e.slot==='bolsa'?`${e.capacidade} espaços`:slotNames[e.slot]} footer={`${e.habilidade} • ${compatibilityLabel(e,g.heroId)}${elementalNote(g,id)}${gemNote(id,g)}`} previewStats={stats} instanceRef={id}>
    <div className="loot-item-actions">
     <button className={!allowed||!fits||dualLocked?'equip-impossible':!levelAllowed?'equip-level-locked':''} disabled={!allowed||!levelAllowed||!fits||dualLocked} title={!allowed?compatibilityLabel(e,g.heroId):!levelAllowed?`Disponível no nível ${required}`:!fits?'Há equipamentos demais para esta bolsa':dualLocked?'Combate com facas exige as duas mãos livres':undefined} onClick={()=>g.equip(id)}>{equipLabel}</button>
     <button className="danger-action" title={`Rende ${preview.physical} físico • ${preview.magical} mágico • ${Math.round(preview.gemChance*100)}% de pedra`} onClick={()=>g.dismantleEquipment(id)}>Desmontar</button>
     <button onClick={()=>g.sellEquipment(id)}>Vender • {sellPrice}<Coins size={12}/></button>
    </div>
   </ItemCard>
  })}</div>
 </section>
}

type DraftKind='Herói'|'Equipamento'|'Consumível'|'Monstro'|'Elite'|'Chefe'|'Evento'
const creatorKinds:DraftKind[]=['Herói','Equipamento','Consumível','Monstro','Elite','Chefe','Evento']
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v))
const maxPan=(zoom:number)=>50*(zoom-1)/zoom
function artTransform(zoom:number,panX:number,panY:number):React.CSSProperties{
 return {objectFit:'cover',objectPosition:'50% 50%',transform:`scale(${zoom}) translate(${panX}%,${panY}%)`,transformOrigin:'center'}
}
function ArtPositionEditor({src,zoom,panX,panY,onPan}:{src:string;zoom:number;panX:number;panY:number;onPan:(x:number,y:number)=>void}){
 const boxRef=React.useRef<HTMLDivElement>(null)
 const drag=React.useRef<{active:boolean;x:number;y:number;panX:number;panY:number}>({active:false,x:0,y:0,panX:0,panY:0})
 const onPointerDown=(e:React.PointerEvent)=>{ drag.current={active:true,x:e.clientX,y:e.clientY,panX,panY}; (e.target as Element).setPointerCapture(e.pointerId) }
 const onPointerMove=(e:React.PointerEvent)=>{
  if(!drag.current.active||!boxRef.current)return
  const rect=boxRef.current.getBoundingClientRect()
  const dx=e.clientX-drag.current.x, dy=e.clientY-drag.current.y
  const limit=maxPan(zoom)
  const nx=clamp(drag.current.panX+(dx/rect.width)*100/zoom,-limit,limit)
  const ny=clamp(drag.current.panY+(dy/rect.height)*100/zoom,-limit,limit)
  onPan(nx,ny)
 }
 const onPointerUp=()=>{ drag.current.active=false }
 return <div ref={boxRef} className="art-editor-box" onPointerDown={src?onPointerDown:undefined} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
  {src?<img src={src} alt="Arte selecionada" draggable={false} style={{...artTransform(zoom,panX,panY),width:'100%',height:'100%',display:'block',pointerEvents:'none',userSelect:'none'}}/>
  :<div className="art-editor-empty"><ImageOff/><span>Nenhuma imagem selecionada</span></div>}
 </div>
}
function CardCreatorScreen(){
 const g=useGame()
 const fileInputRef=React.useRef<HTMLInputElement>(null)
 const [draft,setDraft]=React.useState({nome:'Nova Carta',kind:'Herói' as DraftKind,raridade:'comum' as Rarity,ataque:0,defesa:0,vida:0,habilidade:'',imagem:''})
 const [zoom,setZoomRaw]=React.useState(1.2)
 const [panX,setPanX]=React.useState(0)
 const [panY,setPanY]=React.useState(0)
 const set=(patch:Partial<typeof draft>)=>setDraft(d=>({...d,...patch}))
 const setZoom=(z:number)=>{ const limit=maxPan(z); setZoomRaw(z); setPanX(p=>clamp(p,-limit,limit)); setPanY(p=>clamp(p,-limit,limit)) }
 const resetTransform=()=>{ setZoomRaw(1.2); setPanX(0); setPanY(0) }
 const onPickFile=(e:React.ChangeEvent<HTMLInputElement>)=>{
  const file=e.target.files?.[0]; if(!file)return
  const reader=new FileReader()
  reader.onload=()=>{ set({imagem:reader.result as string}); resetTransform() }
  reader.readAsDataURL(file)
  e.target.value=''
 }
 const [justSaved,setJustSaved]=React.useState(false)
 // Bancada de teste do efeito holográfico arco-íris: "moldura" usa a própria transparência do
 // PNG da moldura como máscara (só tinge a borda ornamentada); "imagem" fica confinado a
 // .ornate-art (atrás da moldura); "carta inteira" é o que já roda na Coleção/combate/itens.
 const [holoMode,setHoloMode]=React.useState<'off'|'full'|'frame'|'art'>('off')
 const artStyle=artTransform(zoom,panX,panY)
 const previewCard={nome:draft.nome||'Nova Carta',ataque:draft.ataque,defesa:draft.defesa,vida:draft.vida,habilidade:draft.habilidade||'Descreva a habilidade ou efeito da carta.',arte:draft.imagem,raridade:draft.raridade,boss:draft.kind==='Chefe',elite:draft.kind==='Elite'}
 const addToCollection=()=>{
  if(!draft.imagem)return
  g.addCustomCard({nome:draft.nome||'Nova Carta',kind:draft.kind,raridade:draft.raridade,ataque:draft.ataque,defesa:draft.defesa,vida:draft.vida,habilidade:draft.habilidade,imagem:draft.imagem,zoom,panX,panY})
  setJustSaved(true)
  setTimeout(()=>setJustSaved(false),2200)
 }
 return <div className="card-creator-page">
  <div className="card-creator-head">
   <button onClick={()=>g.setScreen('menu')}><ArrowLeft/>Menu</button>
   <div><span className="eyebrow">OFICINA DE CARTAS</span><h1>Criador de cartas</h1><p>Preencha os dados, ajuste a arte e confira a prévia. As regras de criação ainda estão em desenvolvimento.</p></div>
  </div>
  <div className="card-creator-layout three-col">
   <Panel title="1. Informações da carta" className="card-creator-form">
    <label className="field">Nome<input value={draft.nome} onChange={e=>set({nome:e.target.value})}/></label>
    <label className="field">Tipo<select value={draft.kind} onChange={e=>set({kind:e.target.value as DraftKind})}>{creatorKinds.map(k=><option key={k} value={k}>{k}</option>)}</select></label>
    <label className="field">Raridade<select value={draft.raridade} onChange={e=>set({raridade:e.target.value as Rarity})}>{Object.entries(rarityLabel).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
    <div className="field-row">
     <label className="field">Ataque<input type="number" value={draft.ataque} onChange={e=>set({ataque:Number(e.target.value)||0})}/></label>
     <label className="field">Defesa<input type="number" value={draft.defesa} onChange={e=>set({defesa:Number(e.target.value)||0})}/></label>
     <label className="field">Vida<input type="number" value={draft.vida} onChange={e=>set({vida:Number(e.target.value)||0})}/></label>
    </div>
    <label className="field">Habilidade / efeito<textarea rows={3} value={draft.habilidade} onChange={e=>set({habilidade:e.target.value})}/></label>
   </Panel>
   <Panel title="2. Arte da carta" className="card-creator-upload">
    <div className="art-upload-row">
     <button type="button" onClick={()=>fileInputRef.current?.click()}><Upload size={16}/>Escolher imagem do computador</button>
     {draft.imagem&&<button type="button" className="ghost-action" onClick={()=>{set({imagem:''});resetTransform()}}>Remover</button>}
    </div>
    <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={onPickFile}/>
    <ArtPositionEditor src={draft.imagem} zoom={zoom} panX={panX} panY={panY} onPan={(x,y)=>{setPanX(x);setPanY(y)}}/>
    {draft.imagem&&<>
     <div className="zoom-row"><ZoomIn size={16}/><input type="range" min={1} max={2.5} step={0.02} value={zoom} onChange={e=>setZoom(Number(e.target.value))}/><button type="button" className="ghost-action" onClick={resetTransform}>Centralizar</button></div>
     <small className="field-hint">Arraste a imagem para posicionar o enquadramento e use o controle de zoom para ajustar.</small>
    </>}
   </Panel>
   <Panel title="3. Prévia da carta" className="card-creator-preview">
    <div className="card-creator-preview-inner">
     <div className="holo-test-bench" role="group" aria-label="Teste do efeito holográfico">
      <small>TESTE: EFEITO ARCO-ÍRIS</small>
      <div className="holo-test-options">
       <button type="button" className={holoMode==='off'?'active':''} onClick={()=>setHoloMode('off')}>Sem holo</button>
       <button type="button" className={holoMode==='full'?'active':''} onClick={()=>setHoloMode('full')}>Carta inteira</button>
       <button type="button" className={holoMode==='frame'?'active':''} onClick={()=>setHoloMode('frame')}>Só moldura</button>
       <button type="button" className={holoMode==='art'?'active':''} onClick={()=>setHoloMode('art')}>Só imagem</button>
      </div>
     </div>
     <CardFrame card={previewCard} kind={draft.kind} artStyle={draft.imagem?artStyle:undefined} tilt holoMode={holoMode}/>
     <ul className="cc-checklist ui-modern-only" aria-label="Situação da carta">{[[Boolean(draft.imagem),'Imagem enviada','obrigatória'],[draft.nome.trim().length>0&&draft.nome.trim()!=='Nova Carta','Nome escolhido','opcional'],[draft.habilidade.trim().length>0,'Habilidade escrita','opcional'],[zoom!==1.2||panX!==0||panY!==0,'Arte enquadrada','opcional']].map(([ok,label,need])=><li key={label as string} className={ok?'done':need==='obrigatória'?'todo':''}><span aria-hidden>{ok?'✓':'○'}</span>{label as string}<small>{ok?'':need as string}</small></li>)}</ul>
     <button type="button" className="primary" disabled={!draft.imagem} title={!draft.imagem?'Adicione uma imagem antes de salvar a carta':undefined} onClick={addToCollection}><Plus size={16}/>Adicionar à coleção</button>
     <small className="field-hint">{justSaved?'✓ Adicionada!':`${g.customCards.length} carta${g.customCards.length===1?'':'s'} na coleção`}</small>
    </div>
   </Panel>
  </div>
 </div>
}
function Empty({text}:{text:string}){return <div className="empty"><Package/><p>{text}</p></div>}

const GUILD_LEADER={nome:'Brenna Ashcombe',titulo:'Mestra da Guilda de Havendown',retrato:'assets/npcs/brenna-ashcombe.webp'}
// Falas contextuais da líder da Guilda -- puramente narrativas (não afetam mecânica), trocam
// conforme o estado do jogador para dar a sensação de uma pessoa de verdade administrando o
// quadro de contratos, e não uma lista estática de tarefas.
const GUILD_LEADER_IDLE=[
 'Havendown não vai se defender sozinha — e esse quadro não vai se esvaziar sozinho. Escolha um contrato.',
 'Sente um instante antes de sair correndo. Dê uma olhada no quadro, tem trabalho pra todo tipo de aventureiro hoje.',
 'Bom te ver de pé e inteiro. Vamos ver o que o quadro tem pra você desta vez.',
 'Todo contrato aqui já foi verificado pela Guilda. Escolha um à sua altura e traga boas notícias.'
]
const GUILD_LEADER_ACTIVE=[
 'Ainda de olho nos contratos que aceitou? Bom. Pressa demais é o que enche meu registro de nomes riscados.',
 'Vi seu nome nos contratos em aberto. Volte com boas histórias — ou pelo menos inteiro.',
 'Enquanto você não volta, eu seguro o quadro por aqui. Vá com cuidado lá fora.',
 'Contrato aceito é promessa feita. Não me faça riscar seu nome do registro de confiança.'
]
const GUILD_LEADER_READY=[
 'Ora, ora. Tem recompensa esperando por você — não deixe o ouro esfriando no meu cofre.',
 'Cumpriu a parte difícil. Agora só falta vir buscar o que é seu.',
 'Contrato cumprido é a melhor notícia que recebo o dia inteiro. Venha receber.',
 'Já anotei sua entrega no registro. Falta só você estender a mão.'
]
const GUILD_LEADER_VETERAN=[
 'Poucos chegam tão longe no meu registro. Havendown tem sorte de ter você do lado dela.',
 'Já perdi a conta de quantos contratos você fechou. Continue assim e vai sobrar pouco pra eu escrever.',
 'Se esse quadro um dia ficar vazio, a culpa vai ser sua — e eu não vou reclamar.',
 'Aventureiros como você são a razão de eu ainda acreditar nesse trabalho.'
]
// Reações a marcos da campanha -- não são só um estado de "quadro de contratos", é a Brenna
// acompanhando o que acontece com você lá fora, mesmo fora da Guilda (derrota seguida, primeiro
// chefe abatido). Têm prioridade sobre as falas de rotina porque são mais específicas ao momento.
const GUILD_LEADER_COMFORT=[
 'Ouvi dizer que as coisas não andaram fáceis lá fora. Poeira, sacode e volta — todo aventureiro que valha a pena já perdeu uma luta.',
 'Perder uma batalha não risca seu nome do meu registro. Só desistir faz isso.',
 'Respira. Nem o maior herói de Havendown venceu tudo na primeira tentativa.',
 'Se precisar de um contrato mais fácil pra recuperar o fôlego, o quadro tem de sobra.'
]
const GUILD_LEADER_FIRST_BOSS=[
 'Um chefe derrotado! Guarde essa sensação — vai querer sentir de novo.',
 'Seu primeiro chefe caiu. Havendown vai ouvir falar de você em breve.',
 'Isso não foi sorte. Foi você mostrando do que é feito.',
 'Anotei no registro: primeiro chefe abatido. É só o começo.'
]
function guildLeaderLine(g:{guildClaimed:string[];consecutiveDefeats:number;bossesDefeated:string[]},active:number,completed:number,reputation:number){
 const pool=g.consecutiveDefeats>=2?GUILD_LEADER_COMFORT:completed>0?GUILD_LEADER_READY:g.bossesDefeated.length===1?GUILD_LEADER_FIRST_BOSS:active>0?GUILD_LEADER_ACTIVE:reputation>=500?GUILD_LEADER_VETERAN:GUILD_LEADER_IDLE
 const seed=g.guildClaimed.length+active*3+completed*7
 return pool[seed%pool.length]
}
const GUILD_MISSION_CATEGORIES=[
 {id:'todos',label:'Todos os contratos',match:()=>true},
 {id:'exterminio',label:'Extermínio',match:(t:string)=>t==='any'||t==='specific'},
 {id:'chefes',label:'Caça a chefes',match:(t:string)=>t==='boss'},
 {id:'coleta',label:'Coleta',match:(t:string)=>t==='material'||t==='delivery'}
] as const
// Compartilhada entre GuildScreen, MapGuildMissions e GuildHerald -- as três telas
// precisam do mesmo cálculo de progresso por tipo de missão (entrega de item, coleta de
// material ou progresso simples de combate), então centralizar evita divergência entre elas.
function guildMissionProgress(g:{equipmentBag:string[];equipped:Partial<Record<Slot,string>>;materials:Record<string,number>;guildProgress:Record<string,number>},mission:(typeof GUILD_MISSIONS)[number]){
 if(mission.tipo==='delivery'&&mission.itemId)return (g.equipmentBag.some(ref=>equipmentBaseId(ref)===mission.itemId)||Object.values(g.equipped).some(ref=>ref&&equipmentBaseId(ref)===mission.itemId))?1:0
 if(mission.tipo==='material'&&mission.materialId)return Math.min(mission.quantidade,g.materials[mission.materialId]??0)
 return Math.min(mission.quantidade,g.guildProgress[mission.id]??0)
}
// Ordena do rank exigido mais baixo (Ferro) para o mais alto (Campeão), e dentro do mesmo
// rank pelas diamantes de dificuldade -- assim o quadro sempre lê como uma progressão, em
// vez da ordem de cadastro por região/tema em que as missões foram escritas.
function sortGuildMissionsByRank<T extends {rank:GuildRankId;dificuldade:number}>(list:T[]){
 const rankOrder=(rank:GuildRankId)=>GUILD_RANKS.findIndex(r=>r.id===rank)
 return [...list].sort((a,b)=>rankOrder(a.rank)-rankOrder(b.rank)||a.dificuldade-b.dificuldade)
}
// Botão de "atenção" no topo do jogo -- clique abre um recado rápido da Brenna com atalhos
// diretos para os contratos que pedem atenção (prontos para resgate ou, na falta destes,
// alguns disponíveis no seu rank), sem precisar entrar na Guilda só para descobrir isso.
function GuildHerald(){
 const g=useGame()
 const [open,setOpen]=React.useState(false)
 const ref=React.useRef<HTMLDivElement>(null)
 React.useEffect(()=>{if(!open)return;const close=(event:MouseEvent)=>{if(ref.current&&!ref.current.contains(event.target as Node))setOpen(false)};const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};document.addEventListener('mousedown',close);document.addEventListener('keydown',closeOnEscape);return()=>{document.removeEventListener('mousedown',close);document.removeEventListener('keydown',closeOnEscape)}},[open])
 const missions=availableGuildMissions(g.guildClaimed)
 const reputation=g.guildClaimed.reduce((sum,id)=>sum+(guildMissionById(id)?.dificuldade??0),0)
 const rank=guildRankFor(reputation),rankIndex=GUILD_RANKS.findIndex(r=>r.id===rank.id)
 const active=g.guildAccepted.filter(id=>!g.guildClaimed.includes(id)).length
 // "Entregável" cobre dois casos: contratos já aceitos e completos (prontos pra resgatar) e
 // contratos de entrega/coleta ainda não aceitos para os quais o jogador já tem o item ou
 // material em mãos -- aceitar e entregar nesse segundo caso é imediato (dois cliques, sem
 // precisar caçar nada), então vale avisar mesmo antes do jogador clicar em "Aceitar".
 const deliverable=sortGuildMissionsByRank(missions.filter(m=>!g.guildClaimed.includes(m.id)&&rankIndex>=GUILD_RANKS.findIndex(r=>r.id===m.rank)&&guildMissionProgress(g,m)>=m.quantidade))
 const suggestions=deliverable.length?deliverable:sortGuildMissionsByRank(missions.filter(m=>!g.guildAccepted.includes(m.id)&&!g.guildClaimed.includes(m.id)&&rankIndex>=GUILD_RANKS.findIndex(r=>r.id===m.rank))).slice(0,3)
 const line=guildLeaderLine(g,active,deliverable.length,reputation)
 const openGuild=()=>{g.setScreen('guild');setOpen(false)}
 return <div className="guild-herald" ref={ref}>
  <button className={`guild-herald-toggle${deliverable.length?' alert':''}`} aria-label="Recado da Guilda" aria-haspopup="true" aria-expanded={open} title="Ver o que a Guilda tem a dizer" onClick={()=>setOpen(o=>!o)}><Bell size={18}/>{(deliverable.length||suggestions.length)>0&&<span className="guild-herald-badge">{deliverable.length||suggestions.length}</span>}</button>
  {open&&<div className="guild-herald-panel" role="dialog" aria-label="Recado da Guilda">
   <div className="guild-herald-head"><span className="npc-banner-portrait">{GUILD_LEADER.retrato?<img src={assetUrl(GUILD_LEADER.retrato)} alt={GUILD_LEADER.nome}/>:<UserRound/>}</span><div><strong>{GUILD_LEADER.nome}</strong><small>{GUILD_LEADER.titulo}</small></div></div>
   <p className="guild-herald-line"><Quote size={12}/>{line}</p>
   {suggestions.length?<div className="guild-herald-list">{suggestions.map(m=><button key={m.id} className="guild-herald-item" onClick={openGuild}><span className="guild-herald-item-head"><strong>{m.nome}</strong><small>{deliverable.includes(m)?(g.guildAccepted.includes(m.id)?'Pronta para resgate':'Você já tem o pedido'):'Disponível para aceitar'}</small></span><p>{m.descricao}</p></button>)}</div>:<p className="guild-herald-empty">Nenhum contrato pedindo atenção agora. Volte quando tiver concluído algo.</p>}
   <button className="guild-herald-cta" onClick={openGuild}>Abrir quadro de contratos<ArrowRight size={14}/></button>
  </div>}
 </div>
}
// Contrato 47 do Quadro de Contratos: desafios diários/semanais leves. Vive na tela da Guilda
// (não uma tela própria) porque é exatamente o mesmo tipo de "contrato com recompensa" que a
// Guilda já mostra -- só que gerado automaticamente pela data em vez de aceito manualmente.
function ChallengesPanel(){
 const g=useGame(),challenges=activeChallenges()
 return <section className="challenges-panel"><h2><Target size={17}/>Desafios</h2><div className="challenges-grid">{challenges.map(c=>{
  const progress=Math.min(c.target,g.challengeProgress?.[c.id]??0),ready=progress>=c.target,claimed=Boolean(g.challengeClaimed?.[c.id])
  return <article className={`challenge-card${claimed?' claimed':ready?' ready':''}`} key={c.id}>
   <span className={`challenge-kind challenge-kind-${c.kind}`}>{c.kind==='daily'?'DIÁRIO':'SEMANAL'}</span>
   <strong>{c.label}</strong>
   <div className="challenge-progress"><div className="xp-track"><div style={{width:`${progress/c.target*100}%`}}/></div><small>{progress}/{c.target}</small></div>
   <div className="challenge-reward"><Coins size={13}/>{c.reward}<span className="challenge-crystals" title={crystalsLabel(c.crystals)}><CrystalIcon size={13}/>{c.crystals}</span>{claimed?<button disabled>Resgatado</button>:ready?<button className="primary" onClick={()=>g.claimChallenge(c.id)}>Resgatar</button>:<button disabled>Em andamento</button>}</div>
  </article>
 })}</div></section>
}
function GuildScreen(){
 const g=useGame(),modernGuild=useUiMode()==='modern',[guildTab,setGuildTab]=React.useState('overview')
 const [category,setCategory]=React.useState<(typeof GUILD_MISSION_CATEGORIES)[number]['id']>('todos')
 const renewedMissions=availableGuildMissions(g.guildClaimed)
 GUILD_MISSIONS.splice(0,GUILD_MISSIONS.length,...renewedMissions)
 const reputation=g.guildClaimed.reduce((sum,id)=>sum+(guildMissionById(id)?.dificuldade??0),0)
 const rank=guildRankFor(reputation),rankIndex=GUILD_RANKS.findIndex(r=>r.id===rank.id),nextRank=GUILD_RANKS[rankIndex+1]
 const active=g.guildAccepted.filter(id=>!g.guildClaimed.includes(id)).length
 // Comparava equipmentBag/equipped (refs de instância, com sufixo '@@...') diretamente com
 // mission.itemId (id genérico do catálogo) -- nunca eram iguais, então toda missão de entrega
 // mostrava progresso 0 e o botão "Entregar item" nunca ficava disponível, mesmo com o item na
 // mochila ou equipado (claimGuildMission, que já usa equipmentRefMatches, sempre funcionou —
 // só a UI que nunca deixava chegar lá).
 const missionProgress=(mission:(typeof GUILD_MISSIONS)[number])=>guildMissionProgress(g,mission)
 const completed=GUILD_MISSIONS.filter(m=>g.guildAccepted.includes(m.id)&&!g.guildClaimed.includes(m.id)&&missionProgress(m)>=m.quantidade).length
 const bagFull=g.equipmentBag.length>=equipmentBagCapacity(g)
 const visibleMissions=sortGuildMissionsByRank(GUILD_MISSIONS.filter(m=>GUILD_MISSION_CATEGORIES.find(c=>c.id===category)!.match(m.tipo)))
 // No modo Moderno os contratos aparecem 12 por vez (são 55): "Mostrar mais" abre o resto.
 const [missionLimit,setMissionLimit]=React.useState(12)
 React.useEffect(()=>setMissionLimit(12),[category])
 const shownMissions=modernGuild?visibleMissions.slice(0,missionLimit):visibleMissions
 const guildOverview=<><section className="guild-rank-panel"><div className="guild-current-rank" style={{'--rank-color':rank.cor} as React.CSSProperties}><Shield/><span><small>RANK DE AVENTUREIRO</small><strong>{rank.nome}</strong></span></div><div className="guild-rank-progress"><div><span>{reputation} pontos de reputação</span><strong>{nextRank?`Próximo: ${nextRank.nome} (${nextRank.minimo})`:'Rank máximo alcançado'}</strong></div><div className="xp-track"><div style={{width:nextRank?`${Math.min(100,(reputation-rank.minimo)/(nextRank.minimo-rank.minimo)*100)}%`:'100%'}}/></div></div><div className="guild-rank-road">{GUILD_RANKS.map(r=><span className={reputation>=r.minimo?'reached':''} style={{'--rank-color':r.cor} as React.CSSProperties} key={r.id} title={`${r.nome}: ${r.minimo} pontos`}><i/>{r.nome}</span>)}</div></section><ChallengesPanel/></>
 const guildBagSummary=<div className="guild-summary"><span><ScrollText/><small>MISSÕES ATIVAS</small><strong>{active}</strong></span><span><Trophy/><small>PRONTAS PARA RESGATE</small><strong>{completed}</strong></span><span><Package/><small>ESPAÇO NA BOLSA</small><strong>{g.equipmentBag.length}/{equipmentBagCapacity(g)}</strong></span></div>
 const guildNoticeNode=<>{g.guildNotice&&<div className="guild-notice"><Sparkles/>{g.guildNotice}</div>}</>
 const guildContracts=<><div className="guild-filter">{GUILD_MISSION_CATEGORIES.map(c=><button key={c.id} className={category===c.id?'active':''} onClick={()=>setCategory(c.id)}>{c.label}<small>{GUILD_MISSIONS.filter(m=>c.match(m.tipo)).length}</small></button>)}</div>
 <div className="guild-mission-grid">{shownMissions.map((m,missionIndex)=>{const showRankDivider=missionIndex===0||m.rank!==shownMissions[missionIndex-1].rank,dividerRank=GUILD_RANKS.find(r=>r.id===m.rank)!,accepted=g.guildAccepted.includes(m.id),claimed=g.guildClaimed.includes(m.id),progress=missionProgress(m),ready=accepted&&progress>=m.quantidade,equipmentReward=m.recompensa.tipo==='equipment',deliveryItem=m.itemId?EQUIPMENT.find(e=>e.id===m.itemId):undefined,materialInfo=m.materialId?Object.values(REGION_MATERIALS).find(mat=>mat.id===m.materialId):undefined,deliveryEquippedOnly=m.tipo==='delivery'&&Boolean(m.itemId)&&!g.equipmentBag.some(ref=>equipmentBaseId(ref)===m.itemId!)&&Object.values(g.equipped).some(ref=>equipmentBaseId(ref)===m.itemId!),requiredRank=GUILD_RANKS.find(r=>r.id===m.rank)!,locked=rankIndex<GUILD_RANKS.findIndex(r=>r.id===m.rank);const claimMission=()=>{if(deliveryEquippedOnly&&!window.confirm(`${deliveryItem?.nome} está equipado em um herói. Ao entregá-lo você perderá este equipamento e seus bônus enquanto ele estiver equipado. Deseja continuar?`))return;g.claimGuildMission(m.id)};return <React.Fragment key={m.id}>{showRankDivider&&<div className="guild-rank-divider" style={{'--rank-color':dividerRank.cor} as React.CSSProperties}><Shield size={14}/><strong>{dividerRank.nome}</strong><small>{dividerRank.minimo}+ reputação</small></div>}<article className={`guild-mission${claimed?' claimed':ready?' ready':accepted?' active':locked?' locked':''}`}><header><span>{locked?<Shield/>:m.tipo==='delivery'?<Package/>:m.tipo==='material'?<Gem/>:m.tipo==='boss'?<Trophy/>:m.tipo==='specific'?<Sword/>:<Shield/>}</span><div><small>{m.tipo==='delivery'?'CONTRATO DE ENTREGA':m.tipo==='material'?'PEDIDO DE COLETA':m.tipo==='boss'?'CONTRATO DE CHEFE':m.tipo==='specific'?'CAÇA ESPECÍFICA':'MISSÃO DE CAÇA'}</small><h2>{m.nome}</h2></div><b>{'◆'.repeat(m.dificuldade)}</b></header><span className="guild-required-rank" style={{'--rank-color':requiredRank.cor} as React.CSSProperties}>Rank mínimo: <strong>{requiredRank.nome}</strong> · +{m.dificuldade} reputação</span><p>{m.descricao}</p>{deliveryItem&&<span className="guild-delivery-item"><Package/>Item solicitado: <strong>{deliveryItem.nome}</strong>{progress>0?(deliveryEquippedOnly?<em>Equipado — será perdido ao entregar</em>:<em>Disponível para entrega</em>):<em>Não está na bolsa</em>}</span>}{materialInfo&&<span className="guild-delivery-item"><Gem/>Material pedido: <strong>{materialInfo.nome}</strong><em>{progress}/{m.quantidade} em estoque</em></span>}{m.local&&<span className="guild-location"><Map/>Região indicada: {m.local}</span>}{m.destinoId&&<button className="guild-fast-travel" disabled={locked} title={locked?`Alcance o rank ${requiredRank.nome} para viajar para esta missão.`:`Viajar para ${m.local}`} onClick={()=>g.openSubregion(m.destinoId!)}><Map/><span><small>VIAGEM RÁPIDA</small><strong>{locked?'Destino bloqueado':m.local}</strong></span><ArrowRight/></button>}<div className="guild-progress"><div><span>{m.tipo==='delivery'?'Item na bolsa':m.tipo==='material'?'Materiais coletados':'Progresso'}</span><strong>{progress}/{m.quantidade}</strong></div><div className="xp-track"><div style={{width:`${progress/m.quantidade*100}%`}}/></div></div><div className="guild-reward"><span>{equipmentReward?<Package/>:<Coins/>}<small>RECOMPENSA</small><strong>{equipmentReward?'Equipamento compatível':`${m.recompensa.valor} moedas de ouro`}</strong></span>{claimed?<button disabled>Concluída</button>:locked?<button className="rank-locked" disabled>Requer rank {requiredRank.nome}</button>:!accepted?<button onClick={()=>g.acceptGuildMission(m.id)}>Aceitar missão</button>:ready?<button className="primary" disabled={equipmentReward&&bagFull} title={equipmentReward&&bagFull?'Libere espaço nos equipamentos guardados.':deliveryEquippedOnly?'Este item está equipado e será perdido ao entregar.':''} onClick={claimMission}>{equipmentReward&&bagFull?'Bolsa cheia':m.tipo==='delivery'?'Entregar item':m.tipo==='material'?'Entregar materiais':'Resgatar recompensa'}</button>:<button disabled>{m.tipo==='delivery'?'Item necessário':m.tipo==='material'?'Materiais insuficientes':'Em andamento'}</button>}</div></article></React.Fragment>})}</div>{modernGuild&&visibleMissions.length>shownMissions.length&&<button className="guild-more" onClick={()=>setMissionLimit(n=>n+12)}>Mostrar mais contratos ({visibleMissions.length-shownMissions.length})</button>}</>
 const guildTabs=[{id:'overview',label:'Visão geral'},{id:'contracts',label:'Contratos',count:GUILD_MISSIONS.length,alert:completed>0},{id:'vault',label:'Bênçãos e depósito'}]
 return <div className="guild-page"><Panel className="guild-head"><button onClick={()=>g.setScreen('map')}><ArrowLeft/>Voltar ao mapa</button><div><span className="eyebrow">SALÃO DOS AVENTUREIROS</span><h1>Guilda de Havendown</h1><p>Aceite contratos, aumente sua reputação e conquiste acesso às missões mais valiosas.</p></div><Shield className="guild-crest"/></Panel><div className="guild-summary"><span><ScrollText/><small>MISSÕES ATIVAS</small><strong>{active}</strong></span><span><Trophy/><small>PRONTAS</small><strong>{completed}</strong></span><span><Shield/><small>RANK</small><strong>{rank.nome}</strong></span></div>
 <NpcBanner name={GUILD_LEADER.nome} title={GUILD_LEADER.titulo} line={guildLeaderLine(g,active,completed,reputation)} image={GUILD_LEADER.retrato}/>
 {modernGuild?<>{guildNoticeNode}<SectionTabs tabs={guildTabs} active={guildTab} onChange={setGuildTab} label="Seções da Guilda" idPrefix="guild"/><SectionPanel idPrefix="guild" id="overview" active={guildTab}>{guildOverview}</SectionPanel><SectionPanel idPrefix="guild" id="contracts" active={guildTab}>{guildBagSummary}{guildContracts}</SectionPanel><SectionPanel idPrefix="guild" id="vault" active={guildTab}>{guildBagSummary}<GuildVaultPanel/></SectionPanel></>:<>{guildOverview}{guildBagSummary}{guildNoticeNode}<GuildVaultPanel/>{guildContracts}</>}</div>
}

// Capela e cofre da Guilda: Bênção de Proteção (ouro para não perder equipamento na derrota) e
// Depósito (slots gratuitos + comprados). Os dois são sumidouros de ouro que escalam com a
// progressão; as regras e os preços ficam em store/guildVault.ts.
function GuildVaultPanel(){
 const g=useGame()
 const [open,setOpen]=React.useState(false)
 const blessings=g.protectionBlessings??0,vault=g.guildVault??[],upgrades=g.guildVaultUpgrades??0
 const capacity=vaultCapacity(upgrades),blessingPrice=currentBlessingPrice(g),nextUpgrade=vaultUpgradePrice(upgrades),bagCapacity=equipmentBagCapacity(g)
 const renderItem=(ref:string,index:number,action:React.ReactNode)=>{
  const e=equipmentByRef(ref);if(!e)return null
  return <ItemCard key={ref+index} image={cardArt(e)} rarity={cardRarity(e,'Equipamento')} name={e.nome} subtitle={e.slot==='bolsa'?`${e.capacidade} espaços`:slotNames[e.slot]} footer={e.habilidade} instanceRef={ref}><div className="loot-item-actions">{action}</div></ItemCard>
 }
 return <section className="guild-vault-panel">
  <div className="guild-vault-head"><span className="eyebrow">CAPELA E COFRE DA GUILDA</span><h2>Bênçãos e depósito</h2></div>
  <div className="guild-vault-grid">
   <article className="guild-vault-card">
    <header><Sparkles/><h3>Bênção de Proteção</h3></header>
    <p>Se você for derrotado, ela impede que um equipamento vestido seja perdido, com melhorias e encaixes. Gasta uma carga por derrota em que havia risco.</p>
    <div className="guild-vault-stats"><span><small>CARGAS</small><strong>{blessings}/{MAX_PROTECTION_BLESSINGS}</strong></span><span><small>PREÇO</small><strong><Coins size={13}/>{blessingPrice}</strong></span></div>
    <button disabled={blessings>=MAX_PROTECTION_BLESSINGS||g.gold<blessingPrice} onClick={()=>g.buyProtectionBlessing()}>{blessings>=MAX_PROTECTION_BLESSINGS?'Máximo de bênçãos':'Comprar bênção'}</button>
    <small className="guild-vault-hint">O preço acompanha o valor médio do equipamento que você veste.</small>
   </article>
   <article className="guild-vault-card">
    <header><Package/><h3>Depósito</h3></header>
    <p>Guarde equipamentos fora da mochila. Itens guardados não contam para missões de entrega: retire-os antes de entregar.</p>
    <div className="guild-vault-stats"><span><small>SLOTS</small><strong>{vault.length}/{capacity}</strong></span><span><small>MOCHILA</small><strong>{g.equipmentBag.length}/{bagCapacity}</strong></span></div>
    {nextUpgrade===null?<button disabled>Depósito no tamanho máximo</button>:<button disabled={g.gold<nextUpgrade} onClick={()=>g.buyVaultUpgrade()}>+{VAULT_SLOTS_PER_UPGRADE} slots • <Coins size={13}/>{nextUpgrade}</button>}
    <button className="guild-vault-toggle" onClick={()=>setOpen(o=>!o)}>{open?'Fechar depósito':'Abrir depósito'}</button>
   </article>
  </div>
  {open&&<div className="guild-vault-lists">
   <h4>Guardados no depósito ({vault.length}/{capacity})</h4>
   {vault.length?<div className="item-grid compact">{vault.map((ref,i)=>renderItem(ref,i,<button disabled={g.equipmentBag.length>=bagCapacity} title={g.equipmentBag.length>=bagCapacity?'Sua bolsa está cheia':undefined} onClick={()=>g.withdrawFromVault(ref)}>Retirar</button>))}</div>:<p className="guild-vault-empty">Nenhum item guardado ainda.</p>}
   <h4>Na mochila ({g.equipmentBag.length}/{bagCapacity})</h4>
   {g.equipmentBag.length?<div className="item-grid compact">{g.equipmentBag.map((ref,i)=>renderItem(ref,i,<button disabled={vault.length>=capacity} title={vault.length>=capacity?'O depósito está cheio':undefined} onClick={()=>g.depositToVault(ref)}>Guardar</button>))}</div>:<p className="guild-vault-empty">Sua mochila está vazia.</p>}
  </div>}
 </section>
}

// Sem isto, qualquer erro não tratado em qualquer tela (incompatibilidade de navegador, bug
// pontual, estado de save corrompido) desmontava a árvore inteira do React sem aviso nenhum --
// o jogador só via a tela inicial "piscar" e depois ficar toda preta (o fundo escuro de
// html/body/#root, sem nenhum conteúdo React por cima). Agora aparece uma tela de recuperação
// em vez de um vazio sem explicação.
class AppErrorBoundary extends React.Component<{children:React.ReactNode},{error?:Error}>{
  state:{error?:Error}={}
  static getDerivedStateFromError(error:Error){return{error}}
  componentDidCatch(error:Error,info:React.ErrorInfo){console.error('Erro não tratado na interface do jogo:',error,info.componentStack)}
  handleReload=()=>{window.location.reload()}
  handleResetSave=()=>{
    if(!window.confirm('Isso vai apagar todo o progresso salvo neste navegador e recarregar o jogo do zero. Tem certeza?'))return
    try{localStorage.removeItem('bangalores-save-v1')}catch{}
    window.location.reload()
  }
  render(){
    if(!this.state.error)return this.props.children
    return <div className="app-crash-fallback"><div className="app-crash-card">
      <div className="brand big">Bangalore's</div>
      <h2>Algo travou nesta tela</h2>
      <p>Pode ser uma falha temporária ou uma incompatibilidade com este navegador. Recarregar a página normalmente resolve.</p>
      <div className="app-crash-actions">
        <button className="primary" onClick={this.handleReload}>Recarregar página</button>
        <button className="ghost-action" onClick={this.handleResetSave}>Apagar dados salvos e recomeçar</button>
      </div>
      <details><summary>Detalhes técnicos</summary><pre>{String(this.state.error?.message??this.state.error)}</pre></details>
    </div></div>
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AppErrorBoundary><AuthProvider><AuthGate><CoopProvider><App/></CoopProvider></AuthGate></AuthProvider></AppErrorBoundary></React.StrictMode>)
