import React from 'react'
import ReactDOM from 'react-dom/client'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, Map, ScrollText, Backpack, Shield, ShieldHalf, ShoppingBag, ShoppingCart, Trash2, Images, BookOpen, History, ChevronDown, Users, Wifi, WifiOff, Copy, LogOut, Menu, Sword, Sparkles, Zap, Coins, Trophy, Skull, Package, Plus, Minus, ArrowLeft, ArrowRight, ArrowLeftRight, FlaskConical, Footprints, Dices, Wand2, Upload, ImageOff, ZoomIn, Mail, Lock, KeyRound, Plane, CheckCircle2, XCircle, Gem, UserRound, Quote, Bell, Volume2, VolumeX } from 'lucide-react'
import { useGame, isNavigationLocked, equipmentByRef, equipmentBaseId, HEROES, EQUIPMENT, CONSUMABLES, MONSTERS, TERRITORIES, SUBREGIONS, BOSSES, EVENTS, GUILD_MISSIONS, GUILD_RANKS, guildRankFor, availableGuildMissions, guildMissionById, SLOT_ORDER, maxHp, attackValue, defenseValue, levelInfo, equipmentAffinity, equipmentAttackForHero, equipmentCompatibility, equipmentClassAllowed, equipmentRequiredLevel, equipmentLevelAllowed, equipmentBagCapacity, equipmentWeaponClass, storyRequirementProgress, equipmentSocketCount, dismantlePreview, forgeLevelInfo, forgeRecipeLevel, forgeSuccessChance, worldUnlocked, heroWeaponAnimationType, enemyWeaponAnimationType, enemyIntentFor, enemyDefenseValue, druidHealProc, hasCraftedEffect, equipmentSetCounts, FORGE_RECIPES, LIFE_CHANCE, heroWeaponElement, heroResistances, attunementItemLevel, attunementResistanceReduction, attunementStatusChance, equipmentStatBonus, STATUS_LABELS, consumableEffectiveValue, consumableDescription, equipmentGemBonus, equipmentUpgradeCost, itemSkillEffectText, TOUR_STEPS, FORGE_SACRIFICE, RARITY_LABEL, forgeSacrificeOwned, SUMMON_ATTACK_ANIMATION, enemyDisplayKey, storyModifiers, specializationBonuses, equipmentInstanceBreakdown, equipmentUpgradeMaterialCost, UPGRADE_SUCCESS_CHANCE, type AttackAnimType, type Summon, type SummonType, type GuildRankId } from './store/game'
import type { Slot, Rarity, Subregion, GameEvent, Equipment } from './types'
import { BESTIARY_MILESTONES, CLASS_IDENTITIES, DIFFICULTIES, ELEMENTS, FORGE_BONUS_LABELS, FORGE_BONUS_MATERIAL, FORGE_GEMS, FORGE_MATERIALS, REGION_MATERIALS, SET_BONUSES, SPECIALIZATION_CHOICES, STATUS_INFO, STORY_CHAPTERS, TALENTS, type DifficultyMode, type Element as GameElement, type ForgeAttribute, type ForgeBonus, type ForgeChoice } from './data/expansion'
import { FORGE_CATEGORY_LABELS, FORGE_CATEGORY_ORDER, forgeCategory } from './data/forgeRecipes'
import { onlineConfigured } from './online/supabase'
import { CoopProvider, useCoop } from './online/CoopContext'
import { playSfx, isAudioMuted, setAudioMuted, type SfxId } from './audio'
import { AuthProvider, useAuth } from './online/AuthContext'
import PersistentCoopScreen from './online/CoopScreen'
import './styles.css'

const ATTACK_SFX:Record<AttackAnimType,SfxId>={corte:'atkCorte',facas:'atkFacas',martelo:'atkMartelo',magico:'atkMagico',furo:'atkDisparo',garras:'atkGarras',espinhos:'atkEspinhos'}

const nav=[['map','Mapa',Map],['character','Ficha',ScrollText],['inventory','Mochila',Backpack],['equipment','Equipamentos',Shield],['shop','Loja',ShoppingBag],['forge','Forja',Wand2],['guild','Guilda',Trophy],['chronicle','Crônicas',History],['gallery','Coleção',Images],['coop','Coop',Users],['tutorial','Tutorial',BookOpen]] as const
const slotNames:Record<Slot,string>={amuleto:'Amuleto',capacete:'Capacete',bolsa:'Bolsa',anel_1:'Anel 1',peitoral:'Peitoral',anel_2:'Anel 2',calcas:'Calças',mao_esquerda:'Mão esquerda',mao_direita:'Mão direita',botas:'Botas'}
const classNames:Record<string,string>={guerreiro:'Guerreiro',guardiao:'Guardião',cacadora:'Ladino',arcanista:'Mago',druida:'Druida',cacador:'Caçador',monge:'Monge',sacerdotisa:'Sacerdotisa',conjurador:'Conjurador'}
// classeExclusiva pode ser uma classe só ou uma lista (conjuntos compartilhados) — normaliza
// pra um rótulo único de exibição, unindo os nomes quando o item é compartilhado.
function classOwnerLabel(owner?:string|string[]):string{if(!owner)return'Universal';const list=Array.isArray(owner)?owner:[owner];return list.map(id=>classNames[id]??id).join(' / ')}
const heroSkillNames:Record<string,string>={guerreiro:'Ímpeto Marcial',guardiao:'Provocar',cacadora:'Ataque Duplo',arcanista:'Ascensão Arcana',druida:'Brisa Revigorante',cacador:'Marca do Predador',monge:'Golpe Flamejante',sacerdotisa:'Bênção da Vida',conjurador:'Conjurar Fera Espectral'}
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
const REGION_UI_THEME:Record<string,string>={
 campos_dourados:'gold',floresta_lunargenta:'forest',montanhas_cinzentas:'frost',pico_escarlate:'volcanic',
 terras_mortas:'shadow',khar_dur:'forge',coracao_eclipse:'eclipse',frostgard:'frost',engrenverde:'forest',
 trilhouro:'harvest',vulcannis:'volcanic',ferrujal:'rust',coroferro:'coroferro',aetherium:'aetherium'
}
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
const SUBREGION_MAP_POINTS:Record<string,[number,number]>={
 campos_estrada:[.12,.31],campos_ponte:[.30,.52],campos_fazendas:[.19,.45],campos_moinho:[.28,.35],campos_ruinas:[.13,.53],
 lunar_bosque:[.75,.35],lunar_goblins:[.86,.47],lunar_monolito:[.72,.59],lunar_aranhas:[.88,.65],lunar_lago:[.82,.36],lunar_raizes:[.78,.53],lunar_pantano:[.91,.55],
 montanhas_passagem:[.34,.12],montanhas_mina:[.42,.23],montanhas_gelo:[.31,.31],montanhas_forte:[.46,.11],montanhas_abismo:[.39,.30],montanhas_cume:[.40,.07],
 pico_encosta:[.61,.11],pico_ninho_dragao:[.86,.20],pico_cinzas:[.62,.27],pico_forja:[.76,.31],pico_cratera:[.87,.10],
 mortas_campos:[.60,.72],mortas_catacumbas:[.78,.77],mortas_vila:[.68,.65],mortas_brejo:[.88,.79],mortas_torre:[.73,.88],
 khar_galerias:[.18,.69],khar_labirinto:[.34,.79],khar_templo_minotauro:[.22,.89],khar_forjas:[.30,.67],khar_cofre:[.39,.87],khar_profundezas:[.13,.82],
 eclipse_portoes:[.43,.55],eclipse_torre:[.51,.37],eclipse_trono:[.55,.50],eclipse_jardim:[.45,.42],eclipse_arquivo:[.58,.43],eclipse_fenda:[.48,.61],
 frost_rota:[.16,.18],frost_refinaria:[.27,.26],frost_fenda:[.20,.42],frost_estaleiro:[.33,.36],frost_geleira:[.40,.20],
 engren_trilha:[.48,.62],engren_vila:[.58,.52],engren_estufa:[.69,.58],engren_torre:[.79,.46],engren_cerne:[.86,.60],
 trilho_trilhos:[.48,.82],trilho_fazenda:[.58,.72],trilho_silo:[.67,.80],trilho_comboio:[.79,.72],trilho_terminal:[.88,.83],
 vulcan_encosta:[.18,.82],vulcan_aqueduto:[.31,.74],vulcan_fundicao:[.46,.83],vulcan_chamines:[.60,.72],vulcan_camara:[.76,.82],
 ferro_trilha:[.12,.58],ferro_pocas:[.23,.49],ferro_fabrica:[.36,.57],ferro_cemiterio:[.48,.47],ferro_nucleo:[.60,.55],
 coro_viaduto:[.66,.28],coro_distrito:[.76,.40],coro_praca:[.84,.31],coro_subterraneo:[.74,.55],coro_torre:[.86,.18],
 aether_anel:[.54,.28],aether_galeria:[.64,.22],aether_ressonancia:[.73,.33],aether_vortice:[.83,.27],aether_coracao:[.91,.36]
}
// No mapa estreito do celular o rótulo de um pino perto da borda (ex: x=.91) estourava
// o container arredondado e ficava cortado, já que .map-wrap/.panel usam overflow:hidden
// para as bordas arredondadas. Pinos perto da borda ganham uma classe que reancoram o
// rótulo pela lateral/topo em vez de centralizar, mantendo tudo dentro do mapa.
function pinEdgeClass(x:number,y:number){let cls='';if(x<.16)cls+=' edge-left';else if(x>.84)cls+=' edge-right';if(y<.14)cls+=' edge-top';return cls}

const rarityLabel:Record<Rarity,string>={comum:'Comum',incomum:'Incomum',raro:'Raro',epico:'Épico',lendario:'Lendário',mitico:'Mítico',heroico:'Heróico'}
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
 if(kind==='Equipamento')return card.slot==='bolsa'?`Nível ${equipmentRequiredLevel(card)} • Capacidade ${card.capacidade??8} espaços`:`Nível ${equipmentRequiredLevel(card)} • Ataque +${card.ataque??0} • Defesa +${card.defesa??0} • Vida +${card.vida??0}`
 if(kind==='Consumível')return `${card.tipo??'Efeito'} • Valor ${card.valor??0}`
 if(kind==='Herói')return `Ataque ${card.ataque??0} • Defesa ${card.defesa??0} • Vida ${card.vida??0}`
 return `Ataque ${card.ataque??0} • Vida ${card.vida??0}${card.ouro!==undefined?` • Recompensa ${card.ouro} ouro`:''}`
}
const ASSET_REVISION='20260820-hd'
function assetUrl(path:string){
 if(/^(data:|blob:|https?:)/.test(path))return path
 const normalized=path.replace(/^(\.\/|\/)+/,'')
 const url=`${import.meta.env.BASE_URL}${normalized}`
 return `${url}${url.includes('?')?'&':'?'}v=${ASSET_REVISION}`
}
function EquipmentComparison({item,current,currentTotal,candidateTotal,heroId}:{item:(typeof EQUIPMENT)[number];current?:typeof item;currentTotal?:{attack:number;defense:number;life:number};candidateTotal?:{attack:number;defense:number;life:number};heroId?:string}){const values=(equipment:typeof item,total?:{attack:number;defense:number;life:number})=>({attack:total?.attack??equipmentAttackForHero(equipment,heroId),defense:total?.defense??equipment.defesa,life:total?.life??equipment.vida,capacity:equipment.capacidade});const candidate=values(item,candidateTotal),equipped=current?values(current,currentTotal):undefined;const metric=(label:string,value:number,currentValue?:number)=>{const delta=currentValue===undefined?0:value-currentValue;return <span><small>{label}</small><b>{value>=0?'+':''}{value}</b>{currentValue!==undefined&&delta!==0&&<em className={delta>0?'better':'worse'}>{delta>0?'+':''}{delta}</em>}</span>};return <section className="equipment-compare"><h3>Comparação de equipamentos</h3><div><article className="compare-candidate"><small>ITEM SELECIONADO</small><strong>{item.nome}</strong><div className="compare-stats">{item.slot==='bolsa'?metric('Espaços',candidate.capacity??8,equipped?.capacity):<>{metric('Ataque',candidate.attack,equipped?.attack)}{metric('Defesa',candidate.defense,equipped?.defense)}{metric('Vida',candidate.life,equipped?.life)}</>}</div><p><b>Habilidade</b>{item.habilidade}</p></article>{current?<article className="compare-equipped"><small>EQUIPADO AGORA</small><strong>{current.nome}</strong><div className="compare-stats">{current.slot==='bolsa'?metric('Espaços',equipped?.capacity??8):<>{metric('Ataque',equipped?.attack??0)}{metric('Defesa',equipped?.defense??0)}{metric('Vida',equipped?.life??0)}</>}</div><p><b>Habilidade</b>{current.habilidade}</p></article>:<article className="compare-empty"><small>EQUIPADO AGORA</small><strong>Slot vazio</strong><p>Nenhum item será substituído.</p></article>}</div></section>}
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
 return <span className={`art-preview-trigger ${className??''}`} onClick={event=>{event.stopPropagation();setOpen(true)}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();setOpen(true)}}} role="button" tabIndex={0} aria-haspopup="dialog" aria-label={`Ampliar arte de ${name}`}>
  <img src={src} alt={name} style={imgStyle}/>
  {emblem&&<img className="slot-class-emblem" src={assetUrl(emblem)} alt={classOwnerLabel(owner)} aria-hidden="true"/>}
  {open&&createPortal(<span className="art-preview-overlay" role="dialog" aria-modal="true" aria-label={`Arte completa de ${name}`} onClick={()=>setOpen(false)}><span className={`art-preview-card${equipment&&!ownSlot?' equipment-comparison-preview':''}`} onClick={event=>event.stopPropagation()}><img src={src} alt={name}/><span className="art-preview-copy"><button className="art-preview-close" onClick={()=>setOpen(false)} aria-label="Fechar visualização">×</button><small>ARTE COMPLETA</small><strong>{name}</strong>{text&&<span>{text}</span>}{stats&&<b>{stats}</b>}{equipment&&resolvedRef&&<div className="art-preview-forge-bonuses"><small className="forge-bonus-title">Bônus aplicados nesta peça</small>{appliedBonusEntries.length?<ul>{appliedBonusEntries.map((label,i)=><li key={i}>{label}</li>)}</ul>:<p>Nenhum bônus da Forja aplicado ainda.</p>}</div>}{equipment&&!ownSlot&&<EquipmentComparison item={equipment} current={currentEquipment} currentTotal={currentTotal} candidateTotal={candidateTotal} heroId={heroId}/>} {equipment&&bagRef&&<button className="primary preview-equip-action" disabled={!classAllowed||!levelAllowed||!bagFits} title={!classAllowed?'Este item não pode ser usado por esta classe.':!levelAllowed?`Disponível no nível ${equipmentRequiredLevel(equipment)}`:!bagFits?'Há equipamentos demais para esta bolsa.':undefined} onClick={()=>{equip(bagRef);setOpen(false)}}>{equipLabel}</button>}<em>Clique fora da janela ou pressione Esc para fechar</em></span></span></span>,document.body)}
 </span>
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
 return <img className="fx-overlay-img fx-attack" src={'./'+fxRoot+type+(critical?'-critico':'')+'.webp'} alt="" aria-hidden="true"/>
}
function SupportFX({type}:{type:'fortificacao'|'cura'|'cura-item'}){
 return <img className="fx-overlay-img fx-support" src={'./'+fxRoot+type+'.webp'} alt="" aria-hidden="true"/>
}
function CardFrame({card,kind,artStyle,frameTheme,attackFx,attackFxCritical,supportFx}:{card:any;kind:string;artStyle?:React.CSSProperties;frameTheme?:string;attackFx?:AttackAnimType;attackFxCritical?:boolean;supportFx?:'fortificacao'|'cura'|'cura-item'}){
 const rarity=cardRarity(card,kind),baseEffect=card.habilidade??card.descricao??'Sem efeito especial.',effect=kind==='Equipamento'?`Nível ${equipmentRequiredLevel(card)} • ${baseEffect}`:baseEffect
 const enemy=kind==='Monstro'||kind==='Elite'||kind==='Chefe'||card.boss||card.elite
 const attack=card.ataque??0,defense=card.defesa??(enemy?Math.max(0,(card.dificuldade??1)-2):0),life=card.vida??(kind==='Consumível'?card.valor??0:0)
 const nameLength=String(card.nome??'').length,nameSize=nameLength>32?'name-xlong':nameLength>23?'name-long':nameLength>16?'name-medium':'name-short',effectLength=String(effect).length,effectSize=effectLength>92?'effect-xlong':effectLength>66?'effect-long':effectLength>42?'effect-medium':'effect-short'
 return <article className={`game-card ornate-card rarity-${rarity} ${enemy?'ornate-enemy':''} ${nameSize} ${effectSize} ${frameTheme?`frame-theme-${frameTheme}`:''}`}>
  <div className="ornate-art"><ArtPreview image={cardArt(card)} name={card.nome} text={artText(card)} stats={artStats(card,kind)} imgStyle={artStyle}/></div>
  <img className="ornate-frame" src={assetUrl(cardSystemRoot+(frameTheme?`frame-${frameTheme}.png`:'frame-overlay.png'))} alt="" aria-hidden="true"/>
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

function App(){
 React.useEffect(()=>{const heal=()=>{const s=useGame.getState() as any;if(!s.heroId||s.hp<=0)return;const now=Date.now();if(s.lastPassiveHealAt==null||s.screen==='combat'){useGame.setState({lastPassiveHealAt:now} as any);return}const interval=s.regenBoostUntil>now?30000:60000,points=Math.floor((now-s.lastPassiveHealAt)/interval);if(points>0)useGame.setState({hp:Math.min(maxHp(s),s.hp+points),lastPassiveHealAt:s.lastPassiveHealAt+points*interval} as any)};heal();const timer=setInterval(heal,10000),unsubscribe=useGame.subscribe((state:any,previous:any)=>{if((state.inventory.tonico_regeneracao??0)<(previous.inventory.tonico_regeneracao??0))useGame.setState({regenBoostUntil:Date.now()+3600000,lastPassiveHealAt:Date.now(),explorationNote:'Tônico da Regeneração Acelerada: cura acelerada ativa por 1 hora.'} as any)});return()=>{clearInterval(timer);unsubscribe()}},[])
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
 return <div className="app-shell" data-region-theme={regionTheme}><CoopBattleSync/>
   {g.screen!=='menu'&&g.screen!=='select'&&g.screen!=='event'&&g.screen!=='cardCreator'&&<TopBar/>}
   <AnimatePresence mode="wait">
    <motion.main key={g.screen} className="screen" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.22}}>
      {g.screen==='menu'&&<MainMenu/>}{g.screen==='select'&&<HeroSelect/>}{g.screen==='map'&&<MapScreen/>}{g.screen==='guild'&&<GuildScreen/>}{g.screen==='chronicle'&&<ChronicleScreen/>}{g.screen==='forge'&&<ForgeScreen/>}{g.screen==='region'&&<><RegionScreen/><RegionRevengePanel/></>}{g.screen==='event'&&<EventScreen/>}{g.screen==='character'&&<CharacterScreen/>}{g.screen==='inventory'&&<InventoryScreen/>}{g.screen==='equipment'&&<EquipmentScreen/>}{g.screen==='shop'&&<ShopScreen/>}{g.screen==='gallery'&&<GalleryScreen/>}{g.screen==='tutorial'&&<TutorialScreen/>}{g.screen==='coop'&&<PersistentCoopScreen/>}{g.screen==='combat'&&<CombatScreen/>}{g.screen==='bossIntro'&&<BossIntro/>}{g.screen==='loot'&&<LootScreen/>}{g.screen==='cardCreator'&&<CardCreatorScreen/>}
      {g.screen==='inventory'&&g.explorationNote&&/(sucesso|tentativa falhou)/i.test(g.explorationNote)&&<div className="consumable-result"><Sparkles/>{g.explorationNote}</div>}
    </motion.main>
   </AnimatePresence>
   {fleeConfirm&&<div className="escape-confirm-overlay" role="presentation" onClick={()=>setFleeConfirm(false)}><section className="escape-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="escape-flee-title" onClick={event=>event.stopPropagation()}><Footprints/><small>ATALHO ESC DURANTE O COMBATE</small><h2 id="escape-flee-title">Tentar fugir?</h2><p>Um dado amarelo será rolado: <b>5–6</b> permite escapar, <b>4</b> mantém sua ação e <b>1–3</b> encerra seu turno.</p>{(!g.playerTurn||g.animating)&&<span>Aguarde o seu turno para tentar fugir.</span>}<div><button onClick={()=>setFleeConfirm(false)}>Continuar combate</button><button className="primary" disabled={!g.playerTurn||g.animating} onClick={()=>{setFleeConfirm(false);g.flee()}}><Footprints/>Rolar dado de fuga</button></div></section></div>}
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
    <button className="primary" onClick={isLast?g.endTour:g.nextTourStep}>{isLast?'Concluir tour':'Próximo'}</button>
   </div>
  </div>
 </div>
}

function CoopBattleSync(){
 const coop=useCoop(),screen=useGame(state=>state.screen),hp=useGame(state=>state.hp),xp=useGame(state=>state.xp),shield=useGame(state=>state.shield),subregionVictories=useGame(state=>state.subregionVictories),enemyHp=useGame(state=>state.enemyHp),sync=useGame(state=>state.syncCoopEnemyHp),completeVictory=useGame(state=>state.completeCoopVictory),completeDefeat=useGame(state=>state.completeCoopDefeat),completeFlee=useGame(state=>state.completeCoopFlee),receiveEnemy=useGame(state=>state.receiveCoopEnemyAttack),receiveHeroAction=useGame(state=>state.receiveCoopHeroAction),receiveSupportFx=useGame(state=>state.receiveCoopSupportFx),receiveHeal=useGame(state=>state.receiveCoopHeal),battle=coop.room?.shared_state?.battle as {id?:string;status?:string;subregionId?:string;enemy?:any;enemyHp?:number;damageByPlayer?:Record<string,number>;healingByPlayer?:Record<string,number>;activeUserId?:string;lastRoll?:any;fleeRoll?:{roll:number;outcome:'success'|'neutral'|'failed'};minionRolls?:any[];summonRolls?:any[];turn?:number}|undefined,handledEnemyTurn=React.useRef(''),receivedRoll=React.useRef(''),receivedHeroRoll=React.useRef(''),receivedAbility=React.useRef(''),receivedHeal=React.useRef(''),receivedSelf=React.useRef(''),receivedMinions=React.useRef(''),receivedSummons=React.useRef(''),handledDefeat=React.useRef(''),handledFlee=React.useRef(''),enemyExecutor=React.useRef(coop.resolveEnemyTurn),publishedVitals=React.useRef('')
 enemyExecutor.current=coop.resolveEnemyTurn
 React.useEffect(()=>{const roomId=coop.room?.id,userId=coop.userId,g=useGame.getState(),myMaxHp=maxHp(g),myDefense=defenseValue(g),level=levelInfo(xp).lvl,rollBonus=g.classRollBonus??0,critDefenseBoost=hasCraftedEffect(g,'defesa_perfeita'),dodgeBoost=hasCraftedEffect(g,'esquiva_forjada'),weaponAnim=heroWeaponAnimationType(g.equipped.mao_direita),resistances=heroResistances(g),key=`${roomId}:${userId}:${hp}:${myMaxHp}:${myDefense}:${level}:${shield}:${rollBonus}:${critDefenseBoost}:${dodgeBoost}:${weaponAnim}:${resistances.join(',')}`;if(!roomId||!userId||publishedVitals.current===key)return;publishedVitals.current=key;void coop.publishProgress(subregionVictories,{hp,maxHp:myMaxHp,level,defense:myDefense,shield,rollBonus,critDefenseBoost,dodgeBoost,weaponAnim,resistances})},[coop.room?.id,coop.userId,hp,xp,shield,subregionVictories,screen,coop.publishProgress])
 React.useEffect(()=>{if(!battle?.id||typeof battle.enemyHp!=='number'||screen!=='combat'||enemyHp===battle.enemyHp)return;sync(battle.enemyHp)},[battle?.id,battle?.enemyHp,screen,enemyHp,sync])
 // A cura prestada ao grupo (proc passivo em ataques + Brisa Revigorante da Druida) conta
 // junto com o dano causado no rateio de ouro/XP — quem manteve o time de pé também ajudou
 // a vencer a batalha, não só quem bateu no inimigo.
 React.useEffect(()=>{if(battle?.status!=='won'||!battle.id||!battle.subregionId||!battle.enemy)return;const damage=battle.damageByPlayer??{},healing=battle.healingByPlayer??{},contributors=new Set([...Object.keys(damage),...Object.keys(healing)]),contributions=Object.fromEntries([...contributors].map(id=>[id,Math.max(0,Number(damage[id])||0)+Math.max(0,Number(healing[id])||0)])),total=Object.values(contributions).reduce((sum,value)=>sum+value,0),mine=contributions[coop.userId]??0,share=total>0?mine/total:1/Math.max(1,coop.members.length);completeVictory(battle.id,battle.subregionId,battle.enemy,share)},[battle?.id,battle?.status,battle?.subregionId,battle?.enemy,battle?.damageByPlayer,battle?.healingByPlayer,coop.userId,coop.members.length,completeVictory])
 React.useEffect(()=>{if(battle?.status!=='lost'||!battle.id||handledDefeat.current===battle.id)return;handledDefeat.current=battle.id;completeDefeat(battle.id)},[battle?.id,battle?.status,completeDefeat])
 React.useEffect(()=>{if(battle?.status!=='fled'||!battle.id||handledFlee.current===battle.id)return;handledFlee.current=battle.id;completeFlee(battle.id)},[battle?.id,battle?.status,completeFlee])
 React.useEffect(()=>{const key=`${battle?.id}:${battle?.turn}:${battle?.activeUserId}`;if(screen!=='combat'||battle?.activeUserId!=='enemy'||coop.room?.host_id!==coop.userId||handledEnemyTurn.current===key)return;const timer=setTimeout(()=>{handledEnemyTurn.current=key;void enemyExecutor.current()},900);return()=>clearTimeout(timer)},[battle?.id,battle?.turn,battle?.activeUserId,screen,coop.room?.host_id,coop.userId])
 React.useEffect(()=>{const roll=battle?.lastRoll,key=`${battle?.id}:${battle?.turn}`;if(screen!=='combat'||roll?.attacker!=='enemy'||roll.targetUserId!==coop.userId||receivedRoll.current===key)return;receivedRoll.current=key;receiveEnemy(Number(roll.damage??0),roll)},[battle?.id,battle?.turn,battle?.lastRoll,screen,coop.userId,receiveEnemy])
 React.useEffect(()=>{const roll=battle?.lastRoll,key=`hero:${battle?.id}:${battle?.turn}`;if(screen!=='combat'||roll?.attacker!=='hero'||receivedHeroRoll.current===key)return;receivedHeroRoll.current=key;receiveHeroAction(Number(roll.damage??0),roll)},[battle?.id,battle?.turn,battle?.lastRoll,screen,receiveHeroAction])
 React.useEffect(()=>{
  const roll=battle?.lastRoll,key=`ability:${battle?.id}:${battle?.turn}`
  if(screen!=='combat'||roll?.attacker!=='ability'||receivedAbility.current===key)return
  receivedAbility.current=key
  const type=String(roll.effectType??'')
  if(type==='WARRIOR_BUFF'||type==='ARCANE_GROUP_BUFF'||type==='HUNTER_CRITICAL'||type==='SUMMON_BOND'||/escudo/i.test(type))receiveSupportFx('fortificacao')
  else if(type==='DRUID_HEAL'||type==='PRIEST_REVIVE')receiveSupportFx('cura')
  else if(/recupere/i.test(type))receiveSupportFx('cura-item')
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

function TopBar(){
 const g=useGame();const auth=useAuth();const h=HEROES.find(x=>x.id===g.heroId);const level=levelInfo(g.xp).lvl,capacity=equipmentBagCapacity(g)
 const [menuOpen,setMenuOpen]=React.useState(false)
 const [muted,setMutedState]=React.useState(isAudioMuted())
 const toggleMute=()=>{const next=!muted;setAudioMuted(next);setMutedState(next)}
 const [bonusClock,setBonusClock]=React.useState(Date.now())
 const menuRef=React.useRef<HTMLDivElement>(null)
 const regenUntil=Number((g as any).regenBoostUntil??0),regenRemaining=Math.max(0,regenUntil-bonusClock)
 React.useEffect(()=>{if(regenUntil<=Date.now())return;setBonusClock(Date.now());const timer=setInterval(()=>setBonusClock(Date.now()),30000);return()=>clearInterval(timer)},[regenUntil])
 const regenMinutes=Math.max(1,Math.ceil(regenRemaining/60000))
 React.useEffect(()=>{if(!menuOpen)return;const close=(event:MouseEvent)=>{if(menuRef.current&&!menuRef.current.contains(event.target as Node))setMenuOpen(false)};const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')setMenuOpen(false)};document.addEventListener('mousedown',close);document.addEventListener('keydown',closeOnEscape);return()=>{document.removeEventListener('mousedown',close);document.removeEventListener('keydown',closeOnEscape)}},[menuOpen])
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
 return <header className="topbar"><nav>{nav.map(([id,label,Icon])=><button key={id} aria-label={label} disabled={navigationLocked} title={navigationLocked?navigationLockTitle:undefined} className={(g.screen===id||(id==='map'&&g.screen==='region'))?'active':''} onClick={()=>{if(navigationLocked)return;g.setScreen(id)}}><Icon size={18}/><span className="nav-tooltip">{label}</span></button>)}<GuildHerald/></nav><div className="hud"><span className="hud-vital" title="Vida atual e vida máxima"><Heart className="heart" fill="currentColor"/><strong>{g.hp}/{maxHp(g)}</strong></span>{Boolean(g.pendingAttackBonus||g.shield||regenRemaining)&&<div className="hud-bonuses" aria-label="Bônus temporários ativos">{g.pendingAttackBonus>0&&<span className="hud-bonus bonus-attack" tabIndex={0} role="status" aria-label={`Bônus de ataque: mais ${g.pendingAttackBonus} no próximo combate`}><Sword size={16}/><b>+{g.pendingAttackBonus}</b><span className="bonus-tooltip"><strong>Força aumentada</strong><small>+{g.pendingAttackBonus} de Ataque durante o próximo combate. O bônus será removido ao terminar a batalha.</small></span></span>}{g.shield>0&&<span className="hud-bonus bonus-shield" tabIndex={0} role="status" aria-label={`Escudo ativo: ${g.shield} pontos`}><ShieldHalf size={16}/><b>+{g.shield}</b><span className="bonus-tooltip"><strong>Proteção ativa</strong><small>{g.shield} pontos de Escudo disponíveis. Eles absorvem dano antes da Vida e permanecem para o próximo combate.</small></span></span>}{regenRemaining>0&&<span className="hud-bonus bonus-regen" tabIndex={0} role="status" aria-label={`Regeneração acelerada ativa por mais ${regenMinutes} minutos`}><FlaskConical size={16}/><b>{regenMinutes}m</b><span className="bonus-tooltip"><strong>Regeneração acelerada</strong><small>Recupera 1 ponto de Vida a cada 30 segundos fora de combate. Tempo restante aproximado: {regenMinutes} minuto{regenMinutes===1?'':'s'}.</small></span></span>}</div>}<span className="hud-resource hud-bag" title={`${g.equipmentBag.length} equipamentos guardados em ${capacity} espaços`}><Backpack size={17}/><strong>{g.equipmentBag.length}/{capacity}</strong></span><span className="hud-resource hud-gold" title={`${g.gold} moedas de ouro`}><Coins size={17}/><strong>{g.gold}</strong></span><span className="hud-level" title={`${g.xp} de experiência total`}><Sparkles size={16}/><small>NÍVEL</small><strong>{level}</strong></span><div className="brand">Bangalore's</div><div className="menu-dropdown-wrap" ref={menuRef}><button className="menu-mini" disabled={navigationLocked} title={navigationLocked?navigationLockTitle:undefined} aria-haspopup="true" aria-expanded={menuOpen} onClick={()=>setMenuOpen(o=>!o)}><Menu size={18}/>Menu<ChevronDown size={14} className={'menu-caret'+(menuOpen?' open':'')}/></button>{menuOpen&&<div className="menu-dropdown" role="menu">
   {auth.user?.email&&<div className="menu-dropdown-account" title={auth.user.email}><Mail size={13}/><span>{auth.user.email}</span></div>}
   {navigationLocked&&<p className="menu-dropdown-notice">{navigationLockTitle}</p>}
   <div className="menu-dropdown-screens">{nav.map(([id,label,Icon])=><button key={id} role="menuitem" disabled={navigationLocked} title={navigationLocked?navigationLockTitle:undefined} className={g.screen===id?'active':''} onClick={()=>goTo(id)}><Icon size={16}/><span>{label}</span></button>)}</div>
   <div className="menu-dropdown-divider"/>
   <button role="menuitem" onClick={toggleMute}>{muted?<VolumeX size={16}/>:<Volume2 size={16}/>}<span>{muted?'Ativar sons':'Desativar sons'}</span></button>
   <div className="menu-dropdown-divider"/>
   <button role="menuitem" className="menu-dropdown-exit" onClick={()=>goTo('menu')}><ArrowLeftRight size={16}/><span>Trocar de campanha</span></button>
   <button role="menuitem" className="menu-dropdown-exit" onClick={()=>goTo('menu')}><LogOut size={16}/><span>Sair do jogo</span></button>
   {onlineConfigured&&<button role="menuitem" className="menu-dropdown-exit" onClick={()=>{setMenuOpen(false);void auth.signOut()}}><KeyRound size={16}/><span>Sair da conta</span></button>}
 </div>}</div></div></header>}

const TUTORIAL_CHAPTERS=[
 ['História de Havendown','Havendown é um reino dividido por guerras, monstros e antigas forças arcanas. Como aventureiro, você atravessa regiões cada vez mais perigosas, ajuda a Guilda e reúne poder para enfrentar os soberanos do Reino do Sol Negro.'],
 ['Primeiros passos e acessos','Use o menu superior para abrir Mapa, Ficha, Mochila, Equipamentos, Loja, Forja, Guilda, Crônicas, Coleção, Coop e este Tutorial. Passe o mouse sobre cada ícone para ver o nome da tela (no celular, o nome já aparece embaixo do ícone). A tecla Esc retorna ao mapa; durante uma batalha, ela abre a confirmação da tentativa de fuga. O menu (botão "Menu", no canto superior direito) também tem um interruptor de sons — o jogo tem efeitos sonoros de clique, combate, forja e espólio, e podem ser desativados a qualquer momento sem perder progresso.'],
 ['Heróis, classes e atributos','Nove heróis estão disponíveis — Guerreiro, Guardião, Caçadora, Arcanista, Druida, Caçador, Monge, Sacerdotisa e Conjurador —, cada um com identidade, passiva e equipamentos preferidos. Vida determina sua resistência, Ataque influencia o dano e Defesa reduz os golpes recebidos. Subir de nível concede pontos para distribuir na Ficha.'],
 ['Mapa, regiões e sub-regiões','As regiões estão ordenadas por dificuldade. O marcador grande abre a região; os marcadores menores acessam sub-regiões. Complete encontros para revelar o chefe local. Marcadores verdes indicam chefes já derrotados.'],
 ['Exploração e eventos','Durante a viagem surgem encontros com história, objetivo, recompensa e risco. Leia os efeitos antes de aceitar. Algumas abordagens especiais dependem da classe ou de características do herói.'],
 ['Combate e turnos','Em seu turno, ataque, use a habilidade do herói, ative uma habilidade de equipamento, consuma um item, assuma a postura defensiva ou tente fugir. A postura defensiva concede +2 de Defesa contra qualquer golpe (incluindo capangas) e dura até o fim da batalha ou até ser desativada; a primeira ativação de cada batalha não consome o turno, então você ainda pode agir depois — reativá-la mais tarde já custa o turno normalmente. Rolagens 6 de ataque ou defesa acumulam Fervor; ao chegar a 3, o Fervor de Combate gasta o medidor em um ataque crítico garantido. Buffs e debuffs de habilidades de herói (como Ímpeto Marcial, Ascensão Arcana e Marca do Predador) duram no máximo 3 turnos consecutivos — Marca do Predador dura 2 — e se dissipam sozinhos ao final desse período. Chefes podem mudar de fase, convocar capangas e fazer cada capanga atacar em seu próprio turno.'],
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
 ['Modo cooperativo','Na tela Coop, crie uma sala ou entre com um código, escolha seu herói e fique pronto. O anfitrião define o destino e todos precisam aceitar a viagem para a batalha começar. A ordem de ataque é sorteada entre o grupo e o inimigo; cada jogador age só no seu turno, mas todos acompanham o combate em tempo real, com miniaturas mostrando a vida atual dos colegas. Fugir com sucesso encerra a batalha para o grupo inteiro, não apenas para quem tentou. Ao vencer, ouro e experiência são divididos proporcionalmente à contribuição de cada jogador — dano causado somado à cura realizada —, não em partes iguais.'],
 ['Campanhas e salvamento','O progresso é salvo automaticamente no navegador. É possível criar campanhas com heróis diferentes, carregar uma campanha anterior ou excluí-la no menu inicial. O salvamento é local ao navegador e dispositivo utilizados.'],
 ['Coleção e leitura das cartas','A Coleção reúne as cartas descobertas de heróis, equipamentos, consumíveis, monstros, elites, chefes e eventos. Clique na arte para ampliar e consultar detalhes. Os ícones identificam classe, afinidade ou categoria do inimigo.']
] as const
const TUTORIAL_ADVANCED=[
 {title:'Especializações e identidade da build',text:'Além dos atributos e 12 talentos, cada herói toma decisões de especialização nos níveis 10, 25, 50 e 75. Cada escolha favorece um estilo diferente e pode ser redefinida mediante custo.',bullets:['Confira passiva, habilidade ativa e afinidades da classe.','Use o resumo de build nas Crônicas para conferir conjuntos, elemento, resistências e bônus ativos.']},
 {title:'Intenções, chefes e capangas',text:'O inimigo anuncia a intenção da próxima ação: ataque, golpe pesado, guarda, condição, convocação ou recuperação. Use essa informação para decidir entre atacar, defender ou consumir um recurso.',bullets:['Chefes mudam de fase e podem recuperar vida ou convocar capangas.','Capangas têm alvo próprio; eliminar a ameaça certa pode ser melhor que atacar o chefe.']},
 {title:'Bestiário e domínio da coleção',text:'Vencer a mesma criatura desbloqueia marcos no bestiário: primeiro suas estatísticas, depois afinidades e, por fim, bônus de dano. Descobertas na Coleção também concedem recompensas permanentes.',bullets:['Bestiário: 1 vitória revela atributos, 3 revelam afinidade e 5 concedem +1 de dano.','Coleção: 25 descobertas dão +5 de Vida, 100 dão +1 de Ataque e 250 dão +1 de Defesa.']},
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
 const [open,setOpen]=React.useState<number[]>([0,1,5])
 const toggle=(index:number)=>setOpen(current=>current.includes(index)?current.filter(i=>i!==index):[...current,index])
 return <div className="tutorial-page">
  <header className="tutorial-hero"><BookOpen/><div><span className="eyebrow">MANUAL DO AVENTUREIRO</span><h1>Aprenda Bangalore's</h1><p>Dos primeiros passos às builds avançadas: consulte uma regra ou refaça o passeio guiado pelas telas.</p></div></header>
  <section className="tutorial-start"><div className="tutorial-start-head"><div><span className="eyebrow">ROTA RECOMENDADA</span><h2>Seu início em 5 passos</h2></div><button className="primary" onClick={g.startTour}><Sparkles size={15}/>Iniciar tour guiado</button></div><div className="tutorial-start-grid">{QUICK_START.map(([number,title,text])=><article key={number}><b>{number}</b><div><strong>{title}</strong><p>{text}</p></div></article>)}</div></section>
  <div className="tutorial-tools"><button onClick={()=>setOpen(chapters.map((_,i)=>i))}>Abrir todos</button><button onClick={()=>setOpen([])}>Recolher todos</button><span>{chapters.length} capítulos · progresso salvo automaticamente</span></div>
  <section className="tutorial-chapters">{chapters.map(({title,text,bullets},index)=>{const expanded=open.includes(index);return <article className={expanded?'open':''} key={title}><button aria-expanded={expanded} onClick={()=>toggle(index)}><span>{String(index+1).padStart(2,'0')}</span><strong>{title}</strong><ChevronDown/></button>{expanded&&<motion.div className="tutorial-chapter-body" initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}}><p>{text}</p>{bullets.length>0&&<ul>{bullets.map(item=><li key={item}>{item}</li>)}</ul>}</motion.div>}</article>})}</section>
 </div>
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
 return <div className="hero-bg menu-hero"><div className="menu-atmosphere"/><section className="menu-card auth-card">
  <p className="menu-eyebrow">AS CRÔNICAS DE HAVENDOWN</p>
  <div className="brand big">Bangalore's</div>
  <div className="menu-divider"><span/></div>
  <p className="tagline">{mode==='signup'?'Crie sua conta':mode==='reset'?'Recuperar senha':'Entre para continuar'}</p>
  <p className="menu-intro">Sua conta guarda o progresso das suas campanhas com segurança, mesmo que você troque de navegador ou apague os dados deste dispositivo.</p>
  <form className="auth-form" onSubmit={submit}>
   <label className="field"><span className="field-label"><Mail size={15}/>E-mail</span><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@exemplo.com"/></label>
   {mode!=='reset'&&<label className="field"><span className="field-label"><Lock size={15}/>Senha</span><input type="password" required minLength={6} autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"/></label>}
   {auth.error&&<p className="auth-error">{auth.error}</p>}
   {notice&&<p className="auth-notice">{notice}</p>}
   <button className="primary" type="submit" disabled={auth.busy}>{auth.busy?'Aguarde...':mode==='signup'?'Criar conta':mode==='reset'?'Enviar link de recuperação':'Entrar'}</button>
  </form>
  <div className="auth-links">
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
function MainMenu(){const g=useGame();const campaigns=Object.entries(g.campaigns).sort(([,a],[,b])=>(b.savedAt??0)-(a.savedAt??0));return <div className="hero-bg menu-hero"><div className="menu-atmosphere"/><section className={`menu-card${campaigns.length?' menu-with-campaigns':''}`}><p className="menu-eyebrow">AS CRÔNICAS DE HAVENDOWN</p><div className="brand big">Bangalore's</div><div className="menu-divider"><span/></div><p className="tagline">Um RPG de cartas, escolhas e conquistas</p><div className="screen-intro"><small>COMECE PELO ESSENCIAL</small><p>Escolha um herói, leia a identidade da classe e siga por uma campanha que combine com seu estilo de jogo.</p><div className="screen-actions">{g.heroId&&g.activeCampaignId&&<button className="primary" onClick={g.continueGame}>Continuar campanha atual</button>}<button onClick={()=>g.setScreen('select')}>Nova campanha</button><button className="ghost-action" onClick={()=>g.setScreen('cardCreator')}><Wand2 size={17}/>Criador de cartas</button></div></div>{campaigns.length>0&&<section className="campaign-library"><div className="campaign-library-title"><span>Campanhas salvas</span><small>{campaigns.length} {campaigns.length===1?'campanha':'campanhas'}</small></div><div className="campaign-list">{campaigns.map(([id,save])=>{const campaignHero=HEROES.find(hero=>hero.id===save.heroId),level=levelInfo(save.xp??0).lvl,active=id===g.activeCampaignId;return <article className={active?'active':''} key={id}><img src={campaignHero?assetUrl(cardArt(campaignHero)):''} alt=""/><div><strong>{campaignHero?.nome??'Herói desconhecido'}</strong><span>Nível {level} • {save.territory??'Planícies de Alvora'}</span><small>{active?'Campanha atual':`Salva em ${new Date(save.savedAt).toLocaleString('pt-BR')}`}</small></div><button className="campaign-load" onClick={()=>g.loadCampaign(id)}>{active?'Continuar':'Carregar'}</button><button className="campaign-delete" title="Excluir campanha" aria-label={`Excluir campanha de ${campaignHero?.nome??'herói'}`} onClick={()=>window.confirm('Excluir permanentemente esta campanha?')&&g.deleteCampaign(id)}>×</button></article>})}</div></section>}{campaigns.length>0&&<button className="danger-link clear-campaigns" onClick={()=>window.confirm('Apagar todas as campanhas salvas?')&&g.clearSave()}>Apagar todas as campanhas</button>}<p className="save-note"><span>◆</span> {onlineConfigured?'Cada campanha é salva automaticamente e sincronizada com a sua conta.':'Cada campanha é salva automaticamente neste navegador.'}</p></section><aside className="menu-scene-caption"><small>A GUERRA POR HAVENDOWN</small><strong>O reino precisa de um novo campeão.</strong></aside></div>}
function HeroSelect(){const g=useGame();const [selected,setSelected]=React.useState<(typeof HEROES)[number]>();React.useEffect(()=>{if(!selected)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setSelected(undefined)};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close)},[selected]);return <div className="select-page"><button className="hero-select-back" onClick={()=>g.setScreen('menu')}><ArrowLeft/>Voltar ao menu</button><div className="section-title"><h1>Escolha seu herói</h1><p>Conheça os atributos e a habilidade de cada classe. Clique na imagem para selecionar.</p></div><div className="hero-select-summary"><span><small>HERÓIS</small><strong>{HEROES.length}</strong></span><span><small>ESTILO</small><strong>Classe + habilidade</strong></span><span><small>DECISÃO</small><strong>Permanente nesta campanha</strong></span></div><div className="screen-intro"><small>LEIA ANTES DE CONFIRMAR</small><p>Escolha a classe que melhor combina com a forma como você quer jogar a campanha inteira. A decisão afeta habilidades, afinidades e a leitura de build desde o início.</p></div><div className="hero-grid">{HEROES.map(h=><motion.article whileHover={{y:-6}} className="hero-card hero-choice-card" key={h.id}><button className="hero-select-image" onClick={()=>setSelected(h)} aria-label={`Selecionar ${h.nome}`}><img src={assetUrl(cardArt(h))} alt={h.nome}/><span>Selecionar herói</span></button><div className="hero-choice-copy"><h2>{h.nome}</h2><div className="hero-choice-stats"><span><Sword/><small>Ataque</small><strong>{h.ataque}</strong></span><span><Shield/><small>Defesa</small><strong>{h.defesa??0}</strong></span><span><Heart/><small>Vida</small><strong>{h.vida}</strong></span></div><section className="hero-choice-ability"><small>HABILIDADE</small><p>{h.habilidade}</p></section></div></motion.article>)}</div>{selected&&<div className="hero-confirm-overlay" role="presentation" onClick={()=>setSelected(undefined)}><section className="hero-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="hero-confirm-title" onClick={event=>event.stopPropagation()}><img src={assetUrl(cardArt(selected))} alt=""/><div><small>CONFIRMAR PERSONAGEM</small><h2 id="hero-confirm-title">Escolher {selected.nome}?</h2><p>{selected.habilidade}</p><div><button onClick={()=>setSelected(undefined)}>Voltar</button><button className="primary" onClick={()=>g.newGame(selected.id)}>Iniciar aventura</button></div></div></section></div>}</div>}
function StoryCampaignPanel(){const g=useGame(),chapter=STORY_CHAPTERS.find(c=>c.id===g.storyChapterId)??STORY_CHAPTERS[0],progress=storyRequirementProgress(g);return <section className="panel story-campaign"><h2 className="panel-title">Ato {chapter.act} • {chapter.title}</h2><span className="story-region">{chapter.region}</span><blockquote><strong>{chapter.speaker}</strong><p>“{chapter.dialogue}”</p></blockquote>{chapter.requirement&&<div className={`story-objective ${progress.complete?'complete':''}`}><span>{progress.complete?'✓':'◆'}</span><div><strong>{chapter.requirement.label}</strong><small>{progress.current}/{progress.required} concluído</small><i style={{width:`${progress.current/progress.required*100}%`}}/></div></div>}{g.storyNotice&&<p className="story-notice">Consequência: {g.storyNotice}</p>}<div className="story-choices">{chapter.choices.length?chapter.choices.map(choice=><button key={choice.id} disabled={!progress.complete} onClick={()=>g.chooseStory(choice.id)}><strong>{choice.text}</strong><small>{choice.consequence}</small></button>):<div className="story-ending"><Trophy/><strong>Campanha narrativa concluída</strong><small>Suas decisões permanecem registradas nesta campanha.</small></div>}</div></section>}
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
   <span className="forge-base-stats">{item.slot==='bolsa'?`Capacidade: ${item.capacidade} espaços`:`Ataque +${item.ataque} • Defesa +${item.defesa} • Vida +${item.vida}`} • {equipmentSocketCount(item)} encaixe{equipmentSocketCount(item)===1?'':'s'}</span>
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
function RecipeCatalog(){
 const g=useGame(),mastery=forgeLevelInfo(g.forgeXp??0)
 const [category,setCategory]=React.useState<ReturnType<typeof forgeCategory>|undefined>(undefined)
 const entries=FORGE_RECIPES.map(recipe=>({recipe,item:EQUIPMENT.find(e=>e.id===recipe.equipmentId)})).filter(entry=>entry.item&&equipmentClassAllowed(entry.item,g.heroId)) as {recipe:typeof FORGE_RECIPES[number],item:Equipment}[]
 const counts=FORGE_CATEGORY_ORDER.reduce((acc,cat)=>({...acc,[cat]:entries.filter(e=>forgeCategory(e.item.slot)===cat).length}),{} as Record<string,number>)
 const shown=category?entries.filter(e=>forgeCategory(e.item.slot)===category):[]
 return <section className="panel recipe-panel">
  <h2 className="panel-title">Catálogo de receitas</h2>
  <div className="forge-category-tabs">
   {FORGE_CATEGORY_ORDER.map(cat=><button key={cat} className={category===cat?'active':''} onClick={()=>setCategory(c=>c===cat?undefined:cat)}>{FORGE_CATEGORY_LABELS[cat]}<b>{counts[cat]??0}</b></button>)}
  </div>
  {category?<div className="recipe-grid">{shown.map(({recipe,item})=><RecipeCard key={recipe.id} recipe={recipe} item={item} g={g} mastery={mastery}/>)}</div>:<p className="muted forge-category-hint">Selecione uma classe de item acima para ver as receitas disponíveis.</p>}
 </section>
}
function TalentPanel(){const g=useGame(),level=levelInfo(g.xp).lvl,specializations=g.specializations??{};return <Panel title="Talentos e especializações"><div className="system-list">{TALENTS.map(t=><button key={t.id} disabled={level<t.level||g.talents.includes(t.id)} onClick={()=>g.unlockTalent(t.id)}><strong>{g.talents.includes(t.id)?'✓ ':''}{t.nome}</strong><small>Nível {t.level} • {t.texto}</small></button>)}</div><h3 className="subhead">Caminhos da build</h3>{SPECIALIZATION_CHOICES.map(tier=><section className="specialization-tier" key={tier.level}><strong>Nível {tier.level}</strong><div>{tier.options.map(option=><button className={specializations[String(tier.level)]===option.id?'selected':''} disabled={level<tier.level||Boolean(specializations[String(tier.level)])} onClick={()=>g.chooseSpecialization(tier.level,option.id)} key={option.id}><b>{option.nome}</b><small>{option.texto}</small></button>)}</div></section>)}<button className="danger-action" disabled={!Object.keys(specializations).length||g.gold<100+Object.keys(specializations).length*75} onClick={g.resetSpecializations}>Redefinir caminhos ({100+Object.keys(specializations).length*75} ouro)</button></Panel>}
function DungeonPanel(){
 const g=useGame(),lvl=levelInfo(g.xp).lvl
 const world=g.world??'havendown'
 const regions=[...TERRITORIES].filter(t=>(t.mundo??'havendown')===world).sort((a,b)=>a.dificuldade-b.dificuldade)
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
  <button className="primary" disabled={!active} onClick={g.startDungeon}>Entrar na masmorra{active?` • ${active.nome}`:''} • Profundidade {g.dungeonDepth+1}</button>
 </Panel>
}
function EquipmentRulesPanel(){const g=useGame(),sets=equipmentSetCounts(g),weapon=equipmentByRef(g.equipped.mao_direita),equipped=(Object.values(g.equipped) as string[]).map(id=>equipmentByRef(id)).filter(Boolean);return <Panel className="build-summary" title="Resumo completo da build"><div className="build-summary-grid"><span><small>ATAQUE FINAL</small><strong>{attackValue(g)}</strong></span><span><small>DEFESA FINAL</small><strong>{defenseValue(g)}</strong></span><span><small>VIDA MÁXIMA</small><strong>{maxHp(g)}</strong></span><span><small>ELEMENTO</small><strong>{heroWeaponElement(g)}</strong></span></div><h3>Conjuntos</h3><div className="build-tags">{SET_BONUSES.map((set,index)=>{const count=[sets.lua,sets.cinzas,sets.khar,sets.eclipse][index];return <span className={count>=2?'active':''} key={set.nome}><b>{set.nome}</b> {count}/4 • {count>=4?set.four:count>=2?set.two:'bônus inativo'}</span>})}</div><h3>Efeitos equipados</h3><div className="build-tags"><span>Arma: {weapon?.nome??'nenhuma'} ({heroWeaponElement(g)})</span>{heroResistances(g).map(r=><span key={r}>Resistência: {r}</span>)}{equipped.filter(e=>e?.activeEffect).map(e=><span key={e!.id}>{e!.nome}: {e!.activeEffect!.description}</span>)}</div><details><summary>Regras elementais</summary><p><b>Elementos:</b> {ELEMENTS.join(' • ')}</p><p><b>Condições:</b> {STATUS_INFO.map(s=>`${s[0]}: ${s[1]}`).join(' • ')}</p></details></Panel>}
function RegionRevengePanel(){const g=useGame(),subs=SUBREGIONS.filter(s=>s.regionId===g.regionId&&g.subregionBossesDefeated.includes(s.id));if(!subs.length)return null;return <div className="moved-systems"><Panel title="Salão da Vingança"><p>Chefes já derrotados nesta região podem ser enfrentados novamente, mais fortes e valiosos.</p><div className="system-list">{subs.map(sub=><button key={sub.id} onClick={()=>g.startRevenge(sub.id)}><strong>{sub.chefe.nome}</strong><small>{sub.nome} • Vinganças vencidas: {g.revengeWins[sub.id]??0}</small></button>)}</div></Panel></div>}
// Janela modal (não um banner perdido no topo da página) -- garante que o jogador veja o
// resultado da forja/aprimoramento não importa em que ponto da tela ele clicou o botão.
function ForgeResultDialog(){
 const g=useGame(),result=g.forgeResult
 const attunementResult=result&&result.message.toLowerCase().includes('sintonia')
 const title=attunementResult?(result.success?'Sintonia bem-sucedida!':'Sintonia falhou'):result?.kind==='upgrade'?(result.success?'Aprimoramento bem-sucedido!':'Aprimoramento falhou'):(result?.success?'Forja bem-sucedida!':'Fabricação falhou')
 const close=()=>useGame.setState({forgeResult:undefined})
 React.useEffect(()=>{if(result)playSfx(result.success?'forgeSuccess':'forgeFail')},[result?.id])
 return <AnimatePresence>{result&&<motion.div key={result.id} className="forge-result-overlay" role="presentation" onClick={close} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.18}}>
  <motion.div className={`forge-result-dialog ${result.success?'success':'failure'}`} role="status" aria-live="assertive" aria-modal="true" onClick={e=>e.stopPropagation()} initial={{opacity:0,y:-12,scale:.94}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-12,scale:.94}} transition={{duration:.25}}>
   {result.success?<CheckCircle2/>:<XCircle/>}
   <h2>{title}</h2>
   <p>{result.message}</p>
   <button className="primary" onClick={close}>Entendi</button>
  </motion.div>
 </motion.div>}</AnimatePresence>
}
type ForgeMaterialEntry={id:string;nome:string;kind:'region';elemento:GameElement;regionId:string}|{id:string;nome:string;kind:'dismantle'}|{id:string;nome:string;kind:'gem';texto:string}
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
  {subs.length>0&&<div className="material-info-subs"><small>SUB-REGIÕES</small><ul>{subs.map(s=><li key={s.id}>{s.nome}</li>)}</ul></div>}
  <button className="primary" onClick={onClose}>Fechar</button>
 </section></div>
}
// Tutorial dedicado da Forja: os cards resumem o header (nível de Forjador, chance de
// sucesso) mas o jogador só descobria a maioria destas regras (sacrifício por raridade,
// bônus como refino em vez de criação) tentando forjar e sendo bloqueado. Recolhido por
// padrão pra não empurrar o catálogo de receitas pra baixo em quem já sabe as regras.
function ForgeTutorialPanel(){
 const [open,setOpen]=React.useState(false),[attunementPrompt,setAttunementPrompt]=React.useState<null|{id:string;element:GameElement;name:string;effect:string;material:string;type:'weapon'|'armor'}>(null),g=useGame(),weapon=equipmentByRef(g.equipped.mao_direita)
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
   <div className="mechanics-card"><small>2. JUNTE OS MATERIAIS</small><p>Desmonte equipamentos na Oficina de desmontagem (mais abaixo) para render fragmentos, essências e pedras, ou derrote inimigos nas regiões que produzem os materiais exclusivos de cada receita.</p></div>
   <div className="mechanics-card"><small>3. SACRIFÍCIO POR RARIDADE</small><p>Peças Comuns fabricam só com materiais. A partir de Incomum, fabricar sem bônus também consome peças prontas de uma raridade abaixo: Incomum pede 1 Comum, Raro pede 2 Incomuns, Épico pede 3 Raros e Lendário pede 3 Épicos. Qualquer peça sobrando na mochila com a raridade certa serve — não precisa ser do mesmo tipo.</p></div>
   <div className="mechanics-card"><small>4. BÔNUS É REFINO, NÃO CRIAÇÃO</small><p>A partir de Incomum, dá pra escolher um atributo ou efeito especial. Isso não fabrica uma peça nova: exige que você já tenha a MESMA peça sem bônus (na mochila ou equipada) e a refina no lugar, sem duplicar. O bônus fica permanente, preso a essa peça.</p></div>
   <div className="mechanics-card"><small>5. SUCESSO E FALHA</small><p>Toda tentativa concede XP de Forja e conta pro seu nível de Forjador, ganhe ou perca. Em sucesso, a peça (ou o bônus) sai pronta. Em falha, metade dos materiais e das peças sacrificadas se perde e nada é produzido.</p></div>
   <div className="mechanics-card"><small>6. DEPOIS DE FORJAR</small><p>Na Oficina de desmontagem você recicla itens indesejados em materiais e instala pedras extras nos encaixes livres dos equipamentos ativos — pedras removidas são destruídas, não devolvidas. Aprimoramentos (+1 a +3) custam ouro e materiais, concedem XP de Forja como qualquer tentativa, e reforçam os atributos base do item — mas não são garantidos: +1 tem boa chance de sucesso, +2 é raro e +3 é uma aposta; falhar em +2 ou +3 arrisca regredir o nível da peça, e a falha ainda consome metade dos materiais.</p></div>
  </div>}
  {(weapon||armorEntries.length>0)&&<div className="attunement-service">
   <strong>Serviço de sintonia elemental</strong>
   <small>Sintonize o dano da sua arma ou conceda resistência elemental às demais peças equipadas: 80 ouro e 3 materiais da afinidade, por peça.</small>
   {/* attuneEquipment exige a referência de instância equipada (com sufixo '@@...'), não o id
       genérico do catálogo -- weapon.id (vindo de equipmentByRef) é o id base, então os botões
       de sintonia da arma nunca faziam nada (Object.values(s.equipped).includes(id) sempre
       falhava). g.equipped.mao_direita é a referência de instância de verdade. */}
   {weapon&&<div className="attunement-item"><span>{weapon.nome}<em>Dano da arma — atual: {heroWeaponElement(g)}</em></span><div>{ELEMENTS.map(element=>{const material=Object.values(REGION_MATERIALS).find(m=>m.elemento===element);const unavailable=g.gold<80||!material||(g.materials[material.id]??0)<3;return <button key={element} className={`${heroWeaponElement(g)===element?'selected':''}${unavailable?' unavailable':''}`} onClick={()=>material&&setAttunementPrompt({id:g.equipped.mao_direita!,element,name:weapon.nome,effect:`os ataques desta arma passarão a causar dano de ${ELEMENT_LABELS[element]}.`,material:material.nome,type:'weapon'})}>{element}</button>})}</div></div>}
   {armorEntries.map(({id,item})=><div className="attunement-item" key={id}><span>{item.nome}<em>Resistência — atual: {g.equipmentResistances[id]??'nenhuma'}</em></span><div>{ELEMENTS.map(element=>{const material=Object.values(REGION_MATERIALS).find(m=>m.elemento===element);const unavailable=g.gold<80||!material||(g.materials[material.id]??0)<3;return <button key={element} className={`${g.equipmentResistances[id]===element?'selected':''}${unavailable?' unavailable':''}`} onClick={()=>material&&setAttunementPrompt({id,element,name:item.nome,effect:`esta peça reduzirá dano de ${ELEMENT_LABELS[element]} e bloqueará sua condição elemental.`,material:material.nome,type:'armor'})}>{element}</button>})}</div></div>)}
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
function ForgeScreen(){const g=useGame()
 // Mostra TODOS os materiais possíveis da Forja num só grid (com contagem atual do jogador),
 // não só os de região -- antes fragmentos/essências (Oficina) e pedras (FORGE_GEMS) só
 // apareciam na carteira da Oficina, sem indicação nenhuma de onde vêm, e ficavam fora deste
 // painel de "materiais e fabricação" mesmo sendo usados pelas receitas e pelo aprimoramento.
 const materials:ForgeMaterialEntry[]=[...Object.entries(REGION_MATERIALS).map(([regionId,m]):ForgeMaterialEntry=>({id:m.id,nome:m.nome,kind:'region',elemento:m.elemento,regionId})),...FORGE_MATERIALS.map((m):ForgeMaterialEntry=>({id:m.id,nome:m.nome,kind:'dismantle'})),...FORGE_GEMS.map((m):ForgeMaterialEntry=>({id:m.id,nome:m.nome,kind:'gem',texto:m.texto}))]
 const mastery=forgeLevelInfo(g.forgeXp??0),rate=(g.forgeAttempts??0)?Math.round((g.forgeSuccesses??0)/(g.forgeAttempts??1)*100):0;const totalMaterials=Object.values(g.materials).reduce((sum,n)=>sum+n,0);const [materialInfo,setMaterialInfo]=React.useState<ForgeMaterialEntry|undefined>(undefined);return <div className="forge-page"><Panel className="forge-header"><span className="eyebrow">OFICINA DE HAVENDOWN</span><h1>Forja</h1><p>Transforme espólios em materiais, produza itens por receita e instale pedras de melhoria.</p><div className="forge-summary-strip"><span><small>NÍVEL DE FORJADOR</small><strong>{mastery.level}</strong></span><span><small>SUCESSO</small><strong>{rate}%</strong></span><span><small>MATERIAIS</small><strong>{totalMaterials}</strong></span></div><div className="screen-intro"><small>ANTES DE FORJAR</small><p>Use o painel de materiais para entender de onde vêm os insumos, depois compare custo, risco e nível exigido em cada receita.</p></div><div className="forge-mastery"><div><small>NÍVEL DE FORJADOR</small><strong>{mastery.level}</strong></div><div className="forge-xp"><span>{mastery.max?'Maestria máxima':`${mastery.progress}/${mastery.next} XP`}</span><div className="xp-track"><div style={{width:`${mastery.max?100:Math.min(100,mastery.progress/mastery.next*100)}%`}}/></div></div><div><small>SUCESSOS</small><strong>{g.forgeSuccesses??0}/{g.forgeAttempts??0}</strong><span>{rate}% de êxito</span></div></div><p className="forge-warning">Toda tentativa concede XP de Forja. Falhas consomem metade dos materiais; níveis maiores liberam receitas poderosas e aumentam a chance de sucesso.</p></Panel><NpcBanner name={BLACKSMITH.nome} title={BLACKSMITH.titulo} line={blacksmithLine(mastery.level,g.forgeAttempts??0,totalMaterials)} image={BLACKSMITH.retrato}/><ForgeResultDialog/><ForgeTutorialPanel/><Panel title="Materiais e fabricação"><div className="material-grid">{materials.map(m=><button key={m.id} type="button" onClick={()=>setMaterialInfo(m)} title="Ver onde conseguir este material"><b>{g.materials[m.id]??0}</b><small>{m.nome}</small></button>)}</div><div className="forge-items">{g.equipmentBag.slice(0,12).map((id,index)=>{const item=equipmentByRef(id);if(!item)return null;const upLevel=g.equipmentUpgrades[id]??0
   if(upLevel>=3)return <article key={`${id}-${index}`}><span><strong>{item.nome} +{upLevel}</strong><small>Nível máximo de aprimoramento</small></span><button disabled>Aprimorar</button></article>
   // Aprimorar agora também gasta materiais e tem chance de falha (que pode regredir o nível
   // em +2/+3) -- mostra o custo completo e a chance real antes do jogador arriscar a peça.
   const targetLevel=(upLevel+1) as 1|2|3,goldCost=equipmentUpgradeCost(item,upLevel),matCost=equipmentUpgradeMaterialCost(item,targetLevel)
   const chance=Math.round(UPGRADE_SUCCESS_CHANCE[targetLevel]*100)
   const matText=Object.entries(matCost).map(([mid,qty])=>`${qty} ${FORGE_MATERIALS.find(m=>m.id===mid)?.nome??mid}`).join(', ')
   const canAfford=g.gold>=goldCost&&Object.entries(matCost).every(([mid,qty])=>(g.materials[mid]??0)>=qty)
   return <article key={`${id}-${index}`}><span><strong>{item.nome} +{upLevel}</strong><small>Aprimorar para +{targetLevel}: {goldCost} ouro, {matText} • {chance}% de sucesso{targetLevel>1?' (falha pode regredir o nível)':''}</small></span><button disabled={!canAfford} onClick={()=>g.upgradeEquipment(id)}>Aprimorar</button></article>})}</div></Panel><RecipeCatalog/><ForgeSalvagePanel/>{materialInfo&&<MaterialSourceDialog material={materialInfo} onClose={()=>setMaterialInfo(undefined)}/>}</div>}
function Panel({title,children,className=''}:{title?:string;children:React.ReactNode;className?:string}){const content=className.split(' ').includes('summary'),guildHead=className.split(' ').includes('guild-head');const nodes=React.Children.toArray(children);return <section className={'panel '+className}>{title&&<h2 className="panel-title">{title}</h2>}{content?<>{nodes.slice(0,-4)}<hr/><MapGuildMissions/></>:children}{guildHead&&<button className="guild-reset-rank" onClick={()=>window.confirm('Zerar ranking, contratos aceitos e progresso da Guilda? Seus demais itens e avanços serão preservados.')&&useGame.setState({guildAccepted:[],guildProgress:{},guildClaimed:[],guildNotice:'Ranking da Guilda reiniciado para teste.'})}>Reiniciar ranking</button>}</section>}
// Painel reutilizável de "NPC falando com o jogador" -- mesmo visual da Brenna na Guilda,
// agora também usado pela mercadora da Loja e pelo ferreiro da Forja, para que essas telas
// deixem de ser puros formulários e ganhem uma voz por trás do balcão.
function NpcBanner({name,title,line,image,icon}:{name:string;title:string;line:string;image?:string;icon?:React.ReactNode}){
 return <Panel className="npc-banner"><span className="npc-banner-portrait">{image?<img src={assetUrl(image)} alt={name}/>:icon??<UserRound/>}</span><div className="npc-banner-copy"><span className="npc-banner-name">{name}<small>{title}</small></span><p><Quote size={13}/>{line}</p></div></Panel>
}
const WORLD_MAPS:Record<string,{base:string;hd:string;label:string}>={havendown:{base:'./assets/maps/eldravar.png',hd:'./assets/maps/eldravar-v2.png',label:'Havendown'},steelmere:{base:'./assets/maps/steelmere.png',hd:'./assets/maps/steelmere.png',label:'Steelmere'}}
// Reúne, num só lugar no mapa, as duas fontes de "missão ativa" da campanha: os contratos da
// Guilda (já existia) e o objetivo do capítulo atual das Crônicas (StoryCampaignPanel) --
// antes só aparecia visitando a tela de Crônicas, então não dava pra acompanhar sem sair do mapa.
function MapGuildMissions(){const g=useGame();const missions=GUILD_MISSIONS.filter(m=>g.guildAccepted.includes(m.id)&&!g.guildClaimed.includes(m.id));const chapter=STORY_CHAPTERS.find(c=>c.id===g.storyChapterId)??STORY_CHAPTERS[0];const storyProgress=chapter.requirement?storyRequirementProgress(g):undefined;const total=missions.length+(storyProgress?1:0);if(!total)return <section className="map-mission-empty"><strong>Missão ativa</strong><Trophy/><p>Nenhum contrato ativo.</p><button onClick={()=>g.setScreen('guild')}>Visitar a Guilda</button></section>;return <section className="map-active-missions"><div className="map-mission-title"><strong>Missões ativas</strong><span>{total}</span></div>{storyProgress&&<article className={storyProgress.complete?'ready':''}><header><History/><div><small>{storyProgress.complete?'OBJETIVO CONCLUÍDO':`CRÔNICAS • ATO ${chapter.act}`}</small><strong>{chapter.requirement!.label}</strong></div></header><p>{chapter.title} — {chapter.region}</p><div className="map-mission-progress"><span>Progresso <b>{storyProgress.current}/{storyProgress.required}</b></span><div className="xp-track"><div style={{width:`${Math.min(100,storyProgress.current/storyProgress.required*100)}%`}}/></div></div><footer><span>{storyProgress.complete?'Pronto para decidir o rumo':'Campanha narrativa'}</span><button onClick={()=>g.setScreen('chronicle')}>{storyProgress.complete?'Escolher rumo':'Ver em Crônicas'}</button></footer></article>}{missions.map(m=>{const progress=guildMissionProgress(g,m),ready=progress>=m.quantidade;return <article className={ready?'ready':''} key={m.id}><header><Trophy/><div><small>{ready?'OBJETIVO CONCLUÍDO':'CONTRATO DA GUILDA'}</small><strong>{m.nome}</strong></div></header><p>{m.descricao}</p><div className="map-mission-progress"><span>{m.tipo==='delivery'?'Entrega':m.tipo==='material'?'Coleta':'Progresso'} <b>{progress}/{m.quantidade}</b></span><div className="xp-track"><div style={{width:`${Math.min(100,progress/m.quantidade*100)}%`}}/></div></div><footer><span>{m.recompensa.tipo==='gold'?`${m.recompensa.valor} ouro`:'Equipamento compatível'}</span>{ready&&<button onClick={()=>g.setScreen('guild')}>Resgatar na Guilda</button>}</footer></article>})}<button className="map-mission-guild-link" onClick={()=>g.setScreen('guild')}>Abrir Guilda</button></section>}

function MapScreen(){
 const g=useGame()
 const world=g.world??'havendown',worldInfo=WORLD_MAPS[world]
 React.useEffect(()=>{const image=document.querySelector<HTMLImageElement>('.map-wrap>img');if(image)image.src=worldInfo.hd},[world])
 const li=levelInfo(g.xp),regions=[...TERRITORIES].filter(t=>(t.mundo??'havendown')===world).sort((a,b)=>a.dificuldade-b.dificuldade)
 const worldSubregions=SUBREGIONS.filter(sub=>regions.some(r=>r.id===sub.regionId))
 const completedSubregions=worldSubregions.filter(sub=>g.subregionBossesDefeated.includes(sub.id)).length
 const completedRegions=regions.filter(region=>{const subs=worldSubregions.filter(sub=>sub.regionId===region.id);return subs.length>0&&subs.every(sub=>g.subregionBossesDefeated.includes(sub.id))}).length
 const otherWorld=world==='havendown'?'steelmere':'havendown',otherUnlocked=worldUnlocked(g,otherWorld)
 return <div className="map-layout map-layout-with-index"><Panel className="map-region-index"><div className="map-index-head"><span className="eyebrow">EXPLORAÇÃO</span><h2>Regiões de {worldInfo.label}</h2><p>Destinos organizados por nível de dificuldade.</p></div><div className="screen-intro"><small>COMO LER O MAPA</small><p>Cada região e sub-região tem um nível recomendado. O painel lateral resume sua build atual e ajuda a decidir se vale avançar ou revisar o equipamento.</p></div>{world==='havendown'&&otherUnlocked&&<div className="world-travel-card"><small>ROTAS ENTRE MUNDOS</small><p>Quando quiser mudar de cenário, siga para Steelmere e use o outro mapa como base da viagem.</p><button className="map-travel-button" onClick={()=>g.travelWorld(otherWorld)}><Plane size={16}/>Viajar para Steelmere</button></div>}{otherUnlocked&&world!=='havendown'&&<button className="map-travel-button" onClick={()=>g.travelWorld(otherWorld)}><Plane size={16}/>Voltar para {WORLD_MAPS[otherWorld].label}</button>}<div className="map-index-totals"><span><Map/><small>REGIÕES</small><strong>{completedRegions}/{regions.length}</strong></span><span><ScrollText/><small>SUB-REGIÕES</small><strong>{completedSubregions}/{worldSubregions.length}</strong></span></div><div className="map-region-list">{regions.map(region=>{const subs=worldSubregions.filter(sub=>sub.regionId===region.id).sort((a,b)=>a.nivelMin-b.nivelMin),done=subs.filter(sub=>g.subregionBossesDefeated.includes(sub.id)).length,completed=subs.length>0&&done===subs.length;return <section className={`map-index-region${completed?' completed':''}`} key={region.id}><button className="map-index-region-button" onClick={()=>g.openRegion(region)}><span className="map-index-difficulty">{region.dificuldade}</span><span><strong>{region.nome}</strong><small>Nível {region.nivelMin}–{region.nivelMax}</small></span><b>{done}/{subs.length}</b></button>{subs.length>0?<div className="map-index-subs">{subs.map(sub=>{const subDone=g.subregionBossesDefeated.includes(sub.id);return <button className={subDone?'completed':''} key={sub.id} onClick={()=>g.openSubregion(sub.id)}><i>{subDone?'✓':'◆'}</i><span>{sub.nome}<small>Nível {sub.nivelMin}–{sub.nivelMax}</small></span></button>})}</div>:<p className="map-index-soon">Sub-regiões em construção.</p>}</section>})}</div></Panel><Panel className="map-panel"><div className="screen-intro"><small>DESTINO ATUAL</small><p>Toque nos marcadores do mapa para entrar diretamente em uma região ou sub-região. Os destinos já vencidos ficam destacados em verde.</p></div><div className="map-wrap"><img src={worldInfo.base} alt={`Mapa de ${worldInfo.label}`}/>{regions.map(t=>{const subs=worldSubregions.filter(s=>s.regionId===t.id);const completed=subs.length>0&&subs.every(s=>g.subregionBossesDefeated.includes(s.id));return <button key={t.id} className={`map-sub-pin map-territory-pin${completed?' completed':''}${pinEdgeClass(t.x,t.y)}`} style={{left:`${t.x*100}%`,top:`${t.y*100}%`}} onClick={()=>g.openRegion(t)} title={`Explorar ${t.nome}`} aria-label={`Explorar território ${t.nome}`}><span>{completed?'✓':'◆'}</span><b>{t.nome}</b></button>})}{worldSubregions.map(sub=>{const point=SUBREGION_MAP_POINTS[sub.id];if(!point)return null;const completed=g.subregionBossesDefeated.includes(sub.id);return <button key={`sub_${sub.id}`} className={`map-sub-pin${completed?' completed':''}${pinEdgeClass(point[0],point[1])}`} style={{left:`${point[0]*100}%`,top:`${point[1]*100}%`}} onClick={()=>g.openSubregion(sub.id)} title={`Acessar diretamente: ${sub.nome}`} aria-label={`Acessar ${sub.nome}`}><span>{completed?'✓':'◆'}</span><b>{sub.nome}</b></button>})}</div></Panel><Panel title="Resumo do herói" className="summary"><Stat label="Vida" value={`${g.hp}/${maxHp(g)}`}/><Stat label="Ataque" value={attackValue(g)}/><Stat label="Defesa" value={defenseValue(g)}/><Stat label="Ouro" value={g.gold}/><Stat label="Equip. guardados" value={`${g.equipmentBag.length}/${equipmentBagCapacity(g)}`}/><hr/><div className="level-row"><strong>Nível {li.lvl}</strong><span>{li.progress}/{li.next} XP</span></div><div className="xp-track"><div style={{width:`${Math.min(100,li.progress/li.next*100)}%`}}/></div><p className="muted">Experiência total: {g.xp}</p><p className={g.attributePoints?'points hot':'points'}>Pontos de atributo: {g.attributePoints}</p><hr/><strong>Exploração de {worldInfo.label}</strong><p className="muted">Todos os losangos e nomes da lista dão acesso direto aos destinos.</p><p className="hint">Marcadores verdes indicam locais cujos chefes já foram derrotados.</p></Panel></div>
}

function dangerFor(level:number,min:number,max:number){if(level<min-2)return {label:'PERIGO EXTREMO',stars:5,cls:'deadly'};if(level<min)return {label:'Difícil',stars:4,cls:'hard'};if(level<=max)return {label:'Adequado',stars:3,cls:'fair'};if(level<=max+3)return {label:'Fácil',stars:2,cls:'easy'};return {label:'Muito fácil',stars:1,cls:'easy'}}
function RegionScreen(){const g=useGame();const progression=[...TERRITORIES].sort((a,b)=>a.dificuldade-b.dificuldade);const region=progression.find(t=>t.id===g.regionId)??progression[0];const regionIndex=progression.findIndex(t=>t.id===region.id),weaker=progression[regionIndex-1],stronger=progression[regionIndex+1];const lvl=levelInfo(g.xp).lvl;const subs=SUBREGIONS.filter(s=>s.regionId===region.id);const selectedSub=g.subregionId?subs.find(s=>s.id===g.subregionId):undefined;const visibleSubs=selectedSub?[selectedSub]:subs;return <div className="region-page"><Panel className="region-head"><button className="region-back" onClick={()=>g.setScreen('map')}><ArrowLeft/>Mapa</button><div><span className="eyebrow">REGIÃO • DIFICULDADE {region.dificuldade}</span><h1>{region.nome}</h1><p>{region.descricao}</p></div><div className="region-level"><small>Nível recomendado</small><strong>{region.nivelMin}–{region.nivelMax}</strong><span>Seu nível: {lvl}</span></div></Panel><nav className="region-step-nav" aria-label="Navegação entre regiões por dificuldade"><button disabled={!weaker} onClick={()=>weaker&&g.openRegion(weaker)}><ArrowLeft/><span><small>REGIÃO MAIS FRACA</small><strong>{weaker?.nome??'Início da jornada'}</strong>{weaker&&<em>Nível {weaker.nivelMin}–{weaker.nivelMax}</em>}</span></button><button disabled={!stronger} onClick={()=>stronger&&g.openRegion(stronger)}><span><small>REGIÃO MAIS FORTE</small><strong>{stronger?.nome??'Fim da jornada'}</strong>{stronger&&<em>Nível {stronger.nivelMin}–{stronger.nivelMax}</em>}</span><ArrowRight/></button></nav>{selectedSub&&<button className="subregion-list-back" onClick={()=>g.openRegion(region)}><ArrowLeft/>Ver todas as sub-regiões de {region.nome}</button>}{g.explorationNote&&<div className="exploration-note"><Sparkles/>{g.explorationNote}</div>}<div className={`subregion-grid${selectedSub?' selected':''}`}>{visibleSubs.map(sub=><SubregionCard key={sub.id} sub={sub} level={lvl}/>)}</div></div>}
function EventScreen(){const g=useGame();const event=g.currentEvent??EVENTS[0];const result=g.eventResult;const mission=eventMission(event);const hero=HEROES.find(h=>h.id===g.heroId);return <div className="event-page"><div className="event-backdrop"/><Panel className="event-card-panel"><span className="eyebrow">ENCONTRO DE EXPLORAÇÃO</span><div className="event-layout"><div className="event-art"><img src={'./'+(event.arte??event.imagem)} alt={event.nome}/><span>MISSÃO</span></div><div className="event-copy"><ScrollText className="event-icon"/><h1>{event.nome}</h1><p className="event-description">{event.descricao}</p>{!result?<><section className="event-briefing"><div><small>HISTÓRIA</small><p>{mission.setting}</p></div><div><small>SUA MISSÃO</small><p>{mission.objective}</p></div><div className="event-stakes"><span><Coins/><em>RECOMPENSA</em><strong>{mission.reward}</strong></span><span className={mission.risky?'risk':''}><Dices/><em>RISCO</em><strong>{mission.risk}</strong></span></div></section><div className={`event-warning${mission.risky?' risk':''}`}><Dices/><div><strong>{mission.risky?'Esta missão exige uma rolagem':'Decisão sem rolagem de sucesso'}</strong><small>{mission.risky?'Resultados de 4 a 6 representam sucesso. Confira o risco acima antes de aceitar.':'Ao aceitar, o efeito descrito será aplicado diretamente.'}</small></div></div><div className="event-actions"><button className="primary" onClick={()=>g.resolveEvent(true)}>ACEITAR MISSÃO</button><button onClick={()=>g.resolveEvent(true,'class')}>ABORDAGEM: {hero?.nome.toLocaleUpperCase('pt-BR')??'HERÓI'} (+1)</button><button onClick={()=>g.resolveEvent(false)}>SEGUIR VIAGEM</button></div></>:<div className={`event-result ${result.tone}`}>{result.roll&&<div className="event-die"><Dices/><span>{result.roll}</span></div>}<div><small>RESULTADO</small><strong>{result.message}</strong></div><button className="primary" onClick={g.finishEvent}>CONTINUAR EXPLORAÇÃO</button></div>}</div></div></Panel></div>}
function SubregionCard({sub,level}:{sub:Subregion;level:number}){const g=useGame();const wins=g.subregionVictories[sub.id]??0;const bossDown=g.subregionBossesDefeated.includes(sub.id);const danger=dangerFor(level,sub.nivelMin,sub.nivelMax);const ready=wins>=sub.encontrosNecessarios&&!bossDown;return <motion.article whileHover={{y:-4}} className={`subregion-card danger-${danger.cls}`}><div className="subregion-top"><span className="subregion-icon">{sub.icone}</span><div><h2>{sub.nome}</h2><p>Nível {sub.nivelMin}–{sub.nivelMax}</p></div><span className={`danger-badge ${danger.cls}`}>{danger.label}</span></div><p className="subregion-desc">{sub.descricao}</p><div className="subregion-progress"><div><span>Exploração</span><strong>{Math.min(wins,sub.encontrosNecessarios)}/{sub.encontrosNecessarios}</strong></div><div className="xp-track"><div style={{width:`${Math.min(100,wins/sub.encontrosNecessarios*100)}%`}}/></div></div><div className="subregion-meta"><span>★{'★'.repeat(Math.max(0,danger.stars-1))}{'☆'.repeat(Math.max(0,5-danger.stars))}</span><span>{bossDown?'✓ Chefe derrotado':ready?'CHEFE DISPONÍVEL':'Chefe oculto'}</span></div><div className="subregion-details"><small><b>Loot:</b> {sub.temaLoot}</small><small><b>Desafios:</b> {sub.desafios.slice(0,3).join(' • ')}</small></div><button className={ready?'primary boss-button':'primary'} onClick={()=>g.startEncounter(sub.id)}>{bossDown?'Explorar novamente':ready?'ENFRENTAR CHEFE':'EXPLORAR'}</button>{bossDown&&<button className="revenge-button" onClick={()=>g.startRevenge(sub.id)}>VINGANÇA • NÍVEL {(g.revengeWins[sub.id]??0)+1}</button>}</motion.article>}

function Stat({label,value}:{label:string;value:React.ReactNode}){return <div className="stat"><span>{label}</span><strong>{value}</strong></div>}
function consumableBonusActive(item:{id:string;tipo:string},state:any){return item.tipo==='regen_boost'?Number(state.regenBoostUntil??0)>Date.now():(state.activePotionIds??[]).includes(item.id)&&((item.tipo==='ataque'&&state.pendingAttackBonus>0)||(item.tipo==='escudo'&&state.shield>0))}
function CharacterScreen(){const g=useGame();const h=HEROES.find(x=>x.id===g.heroId)!;const li=levelInfo(g.xp),permanentLife=Math.max(0,g.attr.vida-g.allocatedAttr.vida);const ability=heroAbilityParts(h.habilidade);return <><div className="char-grid"><Panel className="portrait-panel"><ArtPreview className="portrait" image={cardArt(h)} name={h.nome} text={h.habilidade} stats={`Ataque ${attackValue(g)} • Defesa ${defenseValue(g)} • Vida ${maxHp(g)}`}/><h1>{h.nome}</h1><p>{h.habilidade}</p><div className="points-box">Pontos disponíveis <strong>{g.attributePoints}</strong></div></Panel><Panel title="Atributos"><p className={`attr-points-callout${g.attributePoints?' hot':''}`}><Plus size={15}/>{g.attributePoints?<>Você tem <strong>{g.attributePoints}</strong> {g.attributePoints===1?'ponto':'pontos'} de atributo para distribuir abaixo.</>:'Nenhum ponto de atributo disponível agora — suba de nível para ganhar mais.'}</p><AttrRow label="Vida" value={`${g.hp}/${maxHp(g)}`} n={g.allocatedAttr.vida} detail={permanentLife?`+${permanentLife} de bônus permanente`:undefined} onPlus={()=>g.addAttribute('vida')} disabled={!g.attributePoints}/><AttrRow label="Ataque" value={attackValue(g)} n={g.allocatedAttr.ataque} detail={g.pendingAttackBonus?`+${g.pendingAttackBonus} temporário até o fim do combate`:undefined} onPlus={()=>g.addAttribute('ataque')} disabled={!g.attributePoints}/><AttrRow label="Defesa" value={defenseValue(g)} n={g.allocatedAttr.defesa} onPlus={()=>g.addAttribute('defesa')} disabled={!g.attributePoints}/><h3 className="subhead">Progressão</h3><Stat label="Nível" value={li.lvl}/><div className="xp-track"><div style={{width:`${Math.min(100,li.progress/li.next*100)}%`}}/></div><Stat label="XP do nível" value={`${li.progress}/${li.next}`}/><Stat label="XP necessária para o próximo nível" value={li.next-li.progress}/><Stat label="Experiência total" value={g.xp}/><Stat label="Ouro" value={g.gold}/></Panel><TalentPanel/></div><Panel className="char-mechanics" title="Mecânicas do personagem"><div className="mechanics-grid">{ability.passivo&&<div className="mechanics-card"><small>PASSIVO</small><p>{ability.passivo}</p></div>}<div className="mechanics-card"><small>ATIVO • {heroSkillNames[h.id]??'Habilidade do herói'}</small><p>{ability.ativo}</p><span className="mechanics-hint">Uso único por batalha no modo solo.</span></div></div><h3 className="subhead">Como os atributos funcionam</h3><div className="mechanics-attr-list"><div><Heart size={16} className="heart"/><div><strong>Vida</strong><span>Total de pontos de vida do herói. Chegar a 0 encerra a batalha em derrota.</span></div></div><div><Sword size={16}/><div><strong>Ataque</strong><span>Base usada nas suas rolagens de dano ao acertar um golpe no combate.</span></div></div><div><ShieldHalf size={16}/><div><strong>Defesa</strong><span>Reduz o dano das rolagens de ataque que você recebe do inimigo.</span></div></div></div><h3 className="subhead">Talentos</h3><p className="mechanics-note">Cada talento da Árvore de Talentos ao lado é desbloqueado permanentemente ao atingir o nível exigido e concede um bônus fixo — eles se acumulam e nunca expiram, mesmo trocando de equipamento.</p></Panel></>}
function BestiaryPanel(){const g=useGame();return <Panel title="Bestiário"><p className="muted">Marcos: 1 vitória revela atributos, 3 revelam afinidade e 5 concedem +1 de dano contra a criatura.</p><div className="bestiary-list">{Object.entries(g.bestiary).length?Object.entries(g.bestiary).map(([name,r])=>{const next=BESTIARY_MILESTONES.find(m=>r.vitorias<m.wins);return <span key={name}><strong>{name}</strong><small>{r.encontros} encontros • {r.vitorias} vitórias • {next?`próximo: ${next.wins} — ${next.label}`:'domínio completo (+1 dano)'}</small></span>}):<p className="muted">Enfrente criaturas para revelar seus registros.</p>}</div></Panel>}
function ChronicleScreen(){const g=useGame(),identity=CLASS_IDENTITIES[g.heroId as keyof typeof CLASS_IDENTITIES];return <div className="chronicle-page"><Panel className="chronicle-hero"><span className="eyebrow">CRÔNICAS DA CAMPANHA</span><h1>Crônicas de Havendown</h1><p>{identity?.nome}: {identity?.texto}</p><div className="difficulty-row">{Object.entries(DIFFICULTIES).map(([id,d])=><button className={g.difficultyMode===id?'active':''} onClick={()=>g.setDifficulty(id as DifficultyMode)} key={id}><strong>{d.nome}</strong><small>Inimigos ×{d.enemy} • recompensas ×{d.reward}</small></button>)}</div></Panel><div className="moved-systems"><StoryCampaignPanel/><DungeonPanel/><BestiaryPanel/><EquipmentRulesPanel/></div></div>}
function AttrRow({label,value,n,detail,onPlus,disabled}:{label:string;value:any;n:number;detail?:string;onPlus:()=>void;disabled:boolean}){return <div className="attr-row"><div><span>{label}</span><strong>{value}</strong><small>Pontos distribuídos: {n}</small>{detail&&<small className="attr-detail">{detail}</small>}</div><button disabled={disabled} onClick={onPlus}><Plus/></button></div>}
function InventoryScreen(){const g=useGame();const entries=Object.entries(g.inventory).filter(([,n])=>n>0);const capacity=equipmentBagCapacity(g);const backpack=equipmentByRef(g.equipped.bolsa);return <div className="two-col"><Panel title="Consumíveis">{entries.length===0?<Empty text="Nenhum consumível na mochila."/>:<div className="item-grid">{entries.map(([id,n])=>{const it=CONSUMABLES.find(x=>x.id===id)!,active=consumableBonusActive(it,g);return <ItemCard key={id} image={cardArt(it)} rarity={cardRarity(it,'Consumível')} name={it.nome} subtitle={`Quantidade: ${n}`} footer={consumableDescription(it,g)}><button disabled={active} title={active?'Esta poção já está ativa. Poções diferentes ainda podem ser combinadas.':undefined} onClick={()=>g.useConsumable(id)}>{active?'Efeito ativo':'Usar'}</button></ItemCard>})}</div>}</Panel><Panel title="Capacidade"><div className="capacity"><Package/><strong>{g.equipmentBag.length}/{capacity} equipamentos guardados</strong></div><p><b>{backpack?.nome??'Mochila Pequena'}:</b> {capacity} espaços. Consumíveis e equipamentos vestidos não ocupam esse limite.</p></Panel></div>}
function EquipmentScreen(){const g=useGame();const capacity=equipmentBagCapacity(g);const dualWielding=equipmentWeaponClass(equipmentByRef(g.equipped.mao_direita))==='facas'
 const itemBonus=equipmentStatBonus(g)
 const elementalEntries=(Object.values(g.equipped) as (string|undefined)[]).filter((id):id is string=>Boolean(id)).map(id=>{const e=equipmentByRef(id),el=g.equipmentElements[id],res=g.equipmentResistances[id];if(!e||(!el&&!res))return null;const level=attunementItemLevel(g,id);return el?{id,name:e.nome,kind:'Elemento' as const,value:ELEMENT_LABELS[el],detail:`${Math.round(attunementStatusChance(g,id)*100)}% de condição em críticos • nível ${level}`}:{id,name:e.nome,kind:'Resistência' as const,value:ELEMENT_LABELS[res!],detail:`Reduz ${attunementResistanceReduction(g,id)} dano elemental • nível ${level}`}}).filter((x):x is {id:string;name:string;kind:'Elemento'|'Resistência';value:string;detail:string}=>Boolean(x))
 // Efeitos forjados (crítico, esquiva, cura...) somem/valem por presença (hasCraftedEffect),
 // não por contagem -- não davam nenhum sinal na Ficha/Equipamentos fora da Forja, então o
 // jogador não tinha como conferir de relance quais bônus especiais já estavam ativos.
 const specialBonusEntries=(Object.keys(CRAFTED_EFFECT_LABELS) as (ForgeBonus|keyof typeof CURATED_EFFECT_LABELS)[]).filter(effect=>hasCraftedEffect(g,effect as any)).map(effect=>({effect,label:CRAFTED_EFFECT_LABELS[effect]}))
 return <div className="equipment-layout"><Panel title="Slots equipados"><div className="slot-grid">{SLOT_ORDER.map((slot)=>{const id=g.equipped[slot],e=equipmentByRef(id);if(!e)return <button key={slot} className={'slot '+(slot==='botas'?'boots':'')}><span>{slotNames[slot]}</span><div className="slot-empty">{slot==='mao_esquerda'&&dualWielding?'Ocupada pelas facas':'Vazio'}</div></button>;const p=equipmentStatParts(e,id,g);const affinity=compatibilityLabel(e,g.heroId);const bagSlot=slot==='bolsa';const stats=bagSlot?`Capacidade ${e.capacidade??8} espaços`:`Ataque +${p.atk}${p.atkDetail} • Defesa +${p.def}${p.defDetail} • Vida +${p.life}${p.lifeDetail}`;return <button key={slot} className={'slot '+(slot==='botas'?'boots':'')+(bagSlot?' backpack-slot':'')} onClick={bagSlot?undefined:()=>g.unequip(slot)}><span>{slotNames[slot]}</span><ArtPreview className="slot-art-preview" image={cardArt(e)} name={e.nome} text={`${e.habilidade} • ${affinity}${elementalNote(g,id!)}${gemNote(id,g)}${craftedEffectNote(id,g)}`} stats={stats} instanceRef={id}/><div className="slot-info"><strong>{e.nome}</strong><div className="slot-stats">{bagSlot?`CAPACIDADE ${e.capacidade??8}`:<>ATQ +{p.atk}{p.atkDetail} • DEF +{p.def}{p.defDetail} • VIDA +{p.life}{p.lifeDetail}</>}</div><small className="slot-effect">{affinity}{elementalNote(g,id!)}{gemNote(id,g)}{craftedEffectNote(id,g)}</small></div><small className="slot-remove">{bagSlot?'equipe outra bolsa para trocar':'clique para retirar'}</small></button>})}</div></Panel><div className="equipment-side-col"><Panel title="Atributos e bônus" className="equipment-attr-panel"><Stat label="Vida máxima" value={`(${maxHp(g)-itemBonus.life}+${itemBonus.life})=${maxHp(g)}`}/><Stat label="Ataque" value={`(${attackValue(g)-itemBonus.atk}+${itemBonus.atk})=${attackValue(g)}`}/><Stat label="Defesa" value={`(${defenseValue(g)-itemBonus.def}+${itemBonus.def})=${defenseValue(g)}`}/><hr/><div className="equipment-elemental-list">{elementalEntries.length?elementalEntries.map(entry=><div key={entry.id} className="equipment-elemental-row"><span>{entry.name}</span><b className={entry.kind==='Elemento'?'elemental-attack':'elemental-resist'}>{entry.kind}: {entry.value}</b><small>{entry.detail}</small></div>):<p className="muted">Nenhum bônus elemental equipado — forje um item com sucesso ou derrote um chefe para conseguir um.</p>}</div><hr/><h3 className="equipment-subtitle">Bônus especiais de equipamento</h3><div className="equipment-elemental-list">{specialBonusEntries.length?specialBonusEntries.map(entry=><div key={entry.effect} className="equipment-elemental-row"><span>{entry.label}</span><b className="elemental-attack">Ativo</b></div>):<p className="muted">Nenhum bônus especial (crítico, esquiva, cura...) equipado — refine uma peça na Forja para conseguir um.</p>}</div><p className="muted">A sintonia cresce com o nível do herói e com o nível efetivo da peça. Resistência soma redução por item equipado; armas elementais aumentam a chance de aplicar a condição no crítico.</p></Panel><Panel title={`Equipamentos guardados ${g.equipmentBag.length}/${capacity}`}><div className="item-grid compact">{g.equipmentBag.map((id,idx)=>{const e=equipmentByRef(id);if(!e)return null;const p=equipmentStatParts(e,id,g);const allowed=equipmentClassAllowed(e,g.heroId);const levelAllowed=equipmentLevelAllowed(e,g.xp);const required=equipmentRequiredLevel(e);const fits=e.slot!=='bolsa'||g.equipmentBag.length<=(e.capacidade??8);const dualLocked=e.slot==='mao_esquerda'&&equipmentWeaponClass(equipmentByRef(g.equipped.mao_direita))==='facas';const equipLabel=!allowed?'Impossível equipar':!levelAllowed?`Requer nível ${required}`:!fits?`Reduza para ${e.capacidade} itens`:dualLocked?'Facas ocupam as duas mãos':'Equipar';const stats=e.slot==='bolsa'?`Capacidade ${e.capacidade??8} espaços`:`Ataque +${p.atk}${p.atkDetail} • Defesa +${p.def}${p.defDetail} • Vida +${p.life}${p.lifeDetail}`;return <ItemCard key={id+idx} image={cardArt(e)} rarity={cardRarity(e,'Equipamento')} name={e.nome} subtitle={e.slot==='bolsa'?`${e.capacidade} espaços`:slotNames[e.slot]} footer={`${e.habilidade} • ${compatibilityLabel(e,g.heroId)}${elementalNote(g,id!)}${gemNote(id,g)}${craftedEffectNote(id,g)}`} previewStats={stats} instanceRef={id}><button className={!allowed||!fits||dualLocked?'equip-impossible':!levelAllowed?'equip-level-locked':''} disabled={!allowed||!levelAllowed||!fits||dualLocked} title={!allowed?compatibilityLabel(e,g.heroId):!levelAllowed?`Disponível no nível ${required}`:!fits?'Há equipamentos demais para esta bolsa':dualLocked?'Combate com facas exige as duas mãos livres':undefined} onClick={()=>g.equip(id)}>{equipLabel}</button></ItemCard>})}</div></Panel></div></div>}
function ItemCard({image,name,subtitle,footer,previewStats,previewAllowEquip=false,rarity='comum',instanceRef,badge,children}:{image:string;name:string;subtitle?:string;footer?:string;previewStats?:string;previewAllowEquip?:boolean;rarity?:Rarity;instanceRef?:string;badge?:string;children?:React.ReactNode}){const equipment=EQUIPMENT.find(item=>item.nome===name);const emblem=equipment?cardEmblem(equipment,'Equipamento'):undefined;const owner=equipment?.classeExclusiva??(equipment?equipmentAffinity(equipment):undefined);const emblemLabel=classOwnerLabel(owner)
 // Equipamentos usam arte em "cover" (preenche o cartão de propósito), mas consumíveis são
 // ícones de frasco/poção com bastante espaço vazio ao redor -- "cover" cortava a parte de
 // baixo do ícone pra preencher o retângulo do cartão. Sem correspondência em EQUIPMENT, o
 // item é um consumível (ou outra carta não-equipamento) e usa "contain" em vez disso.
 return <article className={`item-card item-rarity-${rarity}${equipment?'':' item-card-contain'}`} tabIndex={0} role="button" aria-label={`Abrir detalhes de ${name}`} onClick={event=>{const target=event.target as HTMLElement;if(target.closest('button,a,input,select,textarea,label'))return;const trigger=(event.currentTarget as HTMLElement).querySelector('.art-preview-trigger') as HTMLElement|null;trigger?.click()}} onKeyDown={event=>{if(event.key!=='Enter'&&event.key!==' ')return;const target=event.target as HTMLElement;if(target.closest('button,a,input,select,textarea,label'))return;event.preventDefault();const trigger=(event.currentTarget as HTMLElement).querySelector('.art-preview-trigger') as HTMLElement|null;trigger?.click()}}><div className="item-art-wrap"><ArtPreview image={image} name={name} text={footer} stats={previewStats??subtitle} compareEquipment={Boolean(equipment)} allowEquip={previewAllowEquip} instanceRef={instanceRef}/>{emblem&&<img className="item-class-emblem" src={'./'+emblem} alt={emblemLabel} title={`Classe: ${emblemLabel}`}/>}{badge&&<span className="item-new-badge"><Sparkles size={11}/>{badge}</span>}</div><div className="item-copy"><div className="item-title-row"><strong>{name}</strong><span className={`mini-rarity rarity-${rarity}`}>{rarityLabel[rarity]}</span></div>{subtitle&&<span>{subtitle}</span>}{footer&&<small>{footer}</small>}{children}</div></article>}
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
 const [tab,setTab]=React.useState<ShopTab>('Armas')
 const [filter,setFilter]=React.useState('Todos')
 const [sortBy,setSortBy]=React.useState<typeof sortOptions[number][0]>('padrao')
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
 const equipment=tab==='Armas'?weapons.filter(e=>matchesWeapon(e,filter)):tab==='Equipamentos'?gear.filter(e=>matchesGear(e,filter)):[]
 const consumables=tab==='Consumíveis'?availableConsumables.filter(item=>matchesConsumable(item,filter)):[]
 const rarityOrder:Record<Rarity,number>={comum:0,incomum:1,raro:2,epico:3,lendario:4,mitico:5,heroico:6}
 equipment.sort((a,b)=>equipmentRequiredLevel(a)-equipmentRequiredLevel(b)||(rarityOrder[a.raridade??'comum']-rarityOrder[b.raridade??'comum'])||a.nome.localeCompare(b.nome,'pt-BR'))
 consumables.sort((a,b)=>(rarityOrder[a.raridade??'comum']-rarityOrder[b.raridade??'comum'])||a.preco-b.preco||a.nome.localeCompare(b.nome,'pt-BR'))
 const sortCmp=sortBy==='preco'?(a:any,b:any)=>a.preco-b.preco||a.nome.localeCompare(b.nome,'pt-BR'):sortBy==='raridade'?(a:any,b:any)=>(rarityOrder[(a.raridade??'comum') as Rarity]-rarityOrder[(b.raridade??'comum') as Rarity])||a.preco-b.preco||a.nome.localeCompare(b.nome,'pt-BR'):sortBy==='nome'?(a:any,b:any)=>a.nome.localeCompare(b.nome,'pt-BR'):undefined
 if(sortCmp){equipment.sort(sortCmp);consumables.sort(sortCmp)}
 const filterCount=(id:string)=>tab==='Armas'?weapons.filter(e=>matchesWeapon(e,id)).length:tab==='Equipamentos'?gear.filter(e=>matchesGear(e,id)).length:availableConsumables.filter(item=>matchesConsumable(item,id)).length
 const chooseTab=(next:ShopTab)=>{setTab(next);setFilter('Todos')}
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
 const changeMode=()=>{g.toggleShopMode();setFilter('Todos');clear();setCartOpen(false)}
 return <div><div className="shop-head"><div><h1>Loja de Havendown</h1><p>{g.shopMode==='buy'?'Adicione produtos ao carrinho e confirme antes de recebê-los.':'Venda de itens não concede experiência.'}</p></div><div><span className="gold"><Coins/> {g.gold}</span>{g.shopMode==='buy'&&<button className="shop-cart-button" onClick={()=>setCartOpen(true)}><ShoppingCart/> Carrinho <b>{count}</b></button>}<button onClick={changeMode}>{g.shopMode==='buy'?'Mudar para vender':'Mudar para comprar'}</button></div></div>
  <NpcBanner name={MERCHANT.nome} title={MERCHANT.titulo} line={merchantLine(g.gold,count,g.shopMode==='sell')} image={MERCHANT.retrato}/>
  <div className="shop-tabs" role="tablist" aria-label="Seções da loja">{shopTabs.map(item=><button key={item} role="tab" aria-selected={tab===item} className={tab===item?'active':''} onClick={()=>chooseTab(item)}>{item}<small>{tabCount(item)}</small></button>)}</div>
  <div className="shop-filter-row">
   <div className="gallery-filters shop-category-filters shop-subfilters" role="group" aria-label={`Filtros de ${tab}`}>{filters.map(([id,label])=><button key={id} className={filter===id?'active':''} onClick={()=>setFilter(id)}>{label}<small>{filterCount(id)}</small></button>)}</div>
   <div className="shop-sort" role="group" aria-label="Ordenar itens"><small>Ordenar</small>{sortOptions.map(([id,label])=><button key={id} className={sortBy===id?'active':''} onClick={()=>setSortBy(id)}>{label}</button>)}</div>
  </div>
  <div className="shop-list">{consumables.map(it=><ShopConsumable key={it.id} id={it.id} sell={g.shopMode==='sell'} onAdd={()=>add('c',it.id)} quantity={cart[`c:${it.id}`]??0}/>)}{equipment.map((e,i)=><ShopEquipment key={e.id+i} id={e.id} sell={g.shopMode==='sell'} onAdd={()=>add('e',e.id)} quantity={cart[`e:${e.id}`]??0}/>)}{!consumables.length&&!equipment.length&&<div className="shop-empty"><Package/><strong>Nenhum item neste filtro.</strong><span>{g.shopMode==='sell'?'Você ainda não possui itens desse tipo.':'Não há mercadorias disponíveis.'}</span></div>}</div>
  {cartOpen&&<div className="shop-cart-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setCartOpen(false)}}><section className="shop-cart-panel" role="dialog" aria-modal="true"><header><div><small>LOJA DE HAVENDOWN</small><h2><ShoppingCart/> Carrinho de compras</h2></div><button onClick={()=>setCartOpen(false)}>Fechar</button></header>{lines.length?<><div className="shop-cart-lines">{lines.map(line=><article key={line.key}><img src={'./'+cardArt(line.item)} alt=""/><div><strong>{line.item.nome}</strong><span>{line.item.preco} ouro cada</span></div><div className="shop-cart-qty"><button title="Diminuir" onClick={()=>dec(line.key)}><Minus size={14}/></button><b>{line.qty}</b><button title="Aumentar" onClick={()=>inc(line.key)}><Plus size={14}/></button></div><b className="shop-cart-line-total">{line.qty*line.item.preco}</b><button title="Remover" onClick={()=>remove(line.key)}><Trash2/></button></article>)}</div><footer><div><span>Total</span><strong>{total} ouro</strong><small>Saldo após a compra: {g.gold-total} ouro</small>{g.equipmentBag.length+equipmentCount>equipmentBagCapacity(g)&&<em>Não há espaço suficiente na bolsa.</em>}{total>g.gold&&<em>Ouro insuficiente.</em>}</div><button onClick={clear}>Esvaziar</button><button className="primary" disabled={!valid} onClick={confirm}>Confirmar compra</button></footer></>:<div className="shop-cart-empty"><ShoppingCart/><strong>Seu carrinho está vazio.</strong><span>Adicione os itens que deseja revisar antes da compra.</span></div>}</section></div>}
 </div>
}
function ShopRow({image,name,rarity='comum',emblem,emblemLabel,meta,description,price,afford=true,actionLabel,actionDisabled=false,actionTitle,onAction,previewStats,compareEquipment=false}:{image:string;name:string;rarity?:Rarity;emblem?:string;emblemLabel?:string;meta:string;description:string;price:number;afford?:boolean;actionLabel:string;actionDisabled?:boolean;actionTitle?:string;onAction:()=>void;previewStats?:string;compareEquipment?:boolean}){
 return <article className={`shop-row item-rarity-${rarity}${afford?'':' unaffordable'}`} tabIndex={0} role="button" aria-label={`Abrir detalhes de ${name}`} onClick={event=>{const target=event.target as HTMLElement;if(target.closest('button,a,input,select,textarea,label'))return;const trigger=(event.currentTarget as HTMLElement).querySelector('.art-preview-trigger') as HTMLElement|null;trigger?.click()}} onKeyDown={event=>{if(event.key!=='Enter'&&event.key!==' ')return;const target=event.target as HTMLElement;if(target.closest('button,a,input,select,textarea,label'))return;event.preventDefault();const trigger=(event.currentTarget as HTMLElement).querySelector('.art-preview-trigger') as HTMLElement|null;trigger?.click()}}>
  <ArtPreview className="shop-row-thumb" image={image} name={name} text={description} stats={previewStats} compareEquipment={compareEquipment}/>
  <div className="shop-row-info">
   <div className="shop-row-title"><strong>{name}</strong><span className={`mini-rarity rarity-${rarity}`}>{rarityLabel[rarity]}</span>{emblem&&<img className="shop-row-emblem" src={'./'+emblem} alt={emblemLabel} title={emblemLabel?`Classe: ${emblemLabel}`:undefined}/>}</div>
   <small className="shop-row-meta">{meta}</small>
   <p className="shop-row-desc">{description}</p>
  </div>
  <div className="shop-row-action">
   <span className="shop-row-price"><Coins size={14}/>{price}</span>
   <button disabled={actionDisabled} title={actionTitle} onClick={onAction}>{actionLabel}</button>
  </div>
 </article>
}
function ShopConsumable({id,sell=false,onAdd,quantity=0}:{id:string;sell?:boolean;onAdd?:()=>void;quantity?:number}){const g=useGame(),it=CONSUMABLES.find(x=>x.id===id)!;const price=sell?Math.max(1,Math.floor(it.preco/2)):it.preco;const rarity=cardRarity(it,'Consumível');const kind=it.tipo==='cura'||it.tipo==='vida_max'?'Cura':'Bônus';const afford=sell||g.gold>=price;return <ShopRow image={cardArt(it)} rarity={rarity} name={it.nome} meta={kind} description={consumableDescription(it,g)} price={price} afford={afford} actionLabel={sell?'Vender':quantity?`Adicionar (${quantity})`:'Adicionar'} onAction={()=>sell?g.sellConsumable(id):onAdd?.()}/>}
function ShopEquipment({id,sell=false,onAdd,quantity=0}:{id:string;sell?:boolean;onAdd?:()=>void;quantity?:number}){const g=useGame(),e=equipmentByRef(id)!;const price=sell?Math.max(1,Math.floor(e.preco/2)):e.preco;const affinity=compatibilityLabel(e,g.heroId);const allowed=equipmentClassAllowed(e,g.heroId);const levelAllowed=equipmentLevelAllowed(e,g.xp);const required=equipmentRequiredLevel(e);const forgeOnly=!sell&&(e.raridade==='epico'||e.raridade==='lendario');const afford=sell||(allowed&&levelAllowed&&!forgeOnly&&g.gold>=price);const button=sell?'Vender':!allowed?`Exclusivo: ${classOwnerLabel(e.classeExclusiva)}`:!levelAllowed?`Requer nível ${required}`:forgeOnly?'Disponível na Forja':quantity?`Adicionar (${quantity})`:'Adicionar';
 // No modo "vender", `id` é a peça que o jogador já possui (não o catálogo) -- mostrar as
 // mesmas partes (normal/forja/pedra) usadas na tela de Equipamentos, em vez de só atributo
 // base, pra não esconder aprimoramento/pedra da peça que está prestes a ser vendida.
 const p=sell?equipmentStatParts(e,id,g):undefined
 const stats=e.slot==='bolsa'?`Nível ${required} • Capacidade ${e.capacidade??8} espaços`:p?`Nível ${required} • Ataque +${p.atk}${p.atkDetail} • Defesa +${p.def}${p.defDetail} • Vida +${p.life}${p.lifeDetail}`:(()=>{const effective=equipmentAttackForHero(e,g.heroId);return `Nível ${required} • Ataque +${effective}${effective!==e.ataque?` (base +${e.ataque})`:''} • Defesa +${e.defesa} • Vida +${e.vida}`})();const owner=e.classeExclusiva??equipmentAffinity(e);const emblem=cardEmblem(e,'Equipamento');return <ShopRow image={cardArt(e)} rarity={cardRarity(e,'Equipamento')} name={e.nome} emblem={emblem} emblemLabel={classOwnerLabel(owner)} meta={`${slotNames[e.slot]} • Nível ${required} • ${affinity}`} description={e.habilidade} price={price} afford={afford} actionLabel={button} actionDisabled={!sell&&(!allowed||!levelAllowed||forgeOnly)} actionTitle={!sell&&!allowed?'Esta classe não pode usar este item':!sell&&!levelAllowed?`Disponível no nível ${required}`:!sell&&forgeOnly?'Itens épicos e lendários só podem ser obtidos através da Forja.':undefined} onAction={()=>sell?g.sellEquipment(id):onAdd?.()} previewStats={stats} compareEquipment/>}
function GalleryScreen(){const g=useGame();const [category,setCategory]=React.useState('Todos'),known=new Set(g.discoveredCards??[]),normalized=(name:string)=>enemyDisplayKey(name).replace(/^Elite: /,'');const ownedEquipment=new Set([...Object.values(g.equipped),...g.equipmentBag].map(ref=>equipmentBaseId(ref))),isKnown=(card:any)=>card.kind==='Herói'?card.id===g.heroId:card.kind==='Equipamento'?known.has(`equipment:${card.id}`)||ownedEquipment.has(card.id):card.kind==='Consumível'?known.has(`consumable:${card.id}`)||(g.inventory[card.id]??0)>0:card.kind==='Evento'?known.has(`event:${card.id}`):card.kind==='Chefe'?known.has(`boss:${normalized(card.nome)}`)||Object.keys(g.bestiary).includes(normalized(card.nome)):card.kind==='Elite'?known.has(`elite:${normalized(card.nome)}`)||Object.keys(g.bestiary).includes(normalized(card.nome)):known.has(`monster:${normalized(card.nome)}`)||Object.keys(g.bestiary).includes(normalized(card.nome));const knownCards=allGallery.filter(isKnown),cards=(category==='Todos'?knownCards:knownCards.filter(x=>x.kind===category)),idx=Math.max(0,Math.min(cards.length-1,g.selectedGallery)),c:any=cards[idx];const choose=(next:string)=>{setCategory(next);g.setSelectedGallery(0)};return <div className="gallery-page"><div className="gallery-progress"><div><Images/><span><small>CARTAS CONHECIDAS</small><strong>{knownCards.length}/{allGallery.length}</strong></span></div><div className="gallery-progress-track"><i style={{width:`${allGallery.length?knownCards.length/allGallery.length*100:0}%`}}/></div><p>Novas cartas são reveladas ao obter itens, encontrar inimigos e participar de eventos.</p></div><div className="gallery-filters" role="group" aria-label="Categorias da coleção">{galleryCategories.map(([id,label])=>{const total=id==='Todos'?allGallery.length:allGallery.filter(x=>x.kind===id).length,count=id==='Todos'?knownCards.length:knownCards.filter(x=>x.kind===id).length;return <button key={id} className={category===id?'active':''} onClick={()=>choose(id)}>{label}<small>{count}/{total}</small></button>})}</div>{c?<div className="gallery"><Panel className="gallery-card"><CardFrame card={c} kind={c.kind}/></Panel><Panel title="Coleção de cartas"><div className={`badge rarity-${cardRarity(c,c.kind)}`}>CONHECIDA • {c.kind} • {rarityLabel[cardRarity(c,c.kind)]}</div><h1>{c.nome}</h1>{c.habilidade&&<p>{c.habilidade}</p>}{c.descricao&&<p>{c.descricao}</p>}<p className="muted">Carta {idx+1} de {cards.length} em {galleryCategories.find(([id])=>id===category)?.[1]}</p><div className="gallery-nav"><button onClick={()=>g.setSelectedGallery((idx-1+cards.length)%cards.length)}><ArrowLeft/>Anterior</button><button onClick={()=>g.setSelectedGallery((idx+1)%cards.length)}>Próxima<ArrowRight/></button></div><p className="hint">Somente descobertas desta campanha aparecem aqui. Clique sobre a arte para ampliá-la.</p></Panel></div>:<Panel className="gallery-undiscovered"><ImageOff/><h2>Nenhuma carta conhecida nesta categoria</h2><p>Explore Havendown, enfrente criaturas, encontre itens ou participe de eventos para revelar novas cartas.</p></Panel>}</div>}
function BossIntro(){const g=useGame(),e=g.enemy!,sub=SUBREGIONS.find(x=>x.id===g.subregionId);return <div className="boss-intro"><div className="boss-glow"/><Panel><div className="boss-intro-grid"><ArtPreview className="boss-art-preview" image={cardArt(e)} name={e.nome} text={e.habilidade} stats={artStats(e,'Chefe')}/><div><div className="badge danger">CHEFE DE {sub?.nome??'SUB-REGIÃO'}</div><h1>{e.nome}</h1><p>{e.habilidade}</p><div className="boss-stats"><Stat label="Vida" value={e.vida}/><Stat label="Ataque" value={e.ataque}/><Stat label="Nível" value={e.nivel??e.dificuldade}/><Stat label="Fases" value={e.maxFases??2}/><Stat label="Recompensa base" value={`${e.ouro} ouro + ${e.ouro} XP`}/></div><div className="actions-row"><button className="primary" onClick={g.startBoss}>Enfrentar</button><button onClick={()=>g.setScreen('region')}>Voltar</button></div></div></div></Panel></div>}
function CombatDiceRoll({roll}:{roll:{attacker:'hero'|'enemy';naturalAttackRoll:number;attackRoll:number;attackBonus:number;defenseRoll:number;attackBase:number;defenseBase:number;attackEffect:string;defenseEffect:string;damage:number;selfDamage:number;shieldBlocked?:number}}){
 const attackDie=<div className="combat-roll-side attack-side"><span>ATAQUE • BASE {roll.attackBase}</span><motion.b className="combat-die attack-die" animate={{rotate:[0,110,250,370,360],scale:[.75,1.18,.88,1]}} transition={{duration:.55}}>{roll.attackRoll}</motion.b><em><strong>{roll.attackEffect}</strong>{roll.attackBonus>0&&<u>Rolagem {roll.naturalAttackRoll} + {roll.attackBonus}</u>}</em></div>
 const defenseDie=<div className="combat-roll-side defense-side"><span>DEFESA • BASE {roll.defenseBase}</span><motion.b className="combat-die defense-die" animate={{rotate:[0,-120,-260,-370,-360],scale:[.75,1.18,.88,1]}} transition={{duration:.55}}>{roll.defenseRoll}</motion.b><em><strong>{roll.attackRoll===1?'Não se aplica':roll.defenseEffect}</strong></em></div>
 return <motion.aside className={`combat-dice-roll ${roll.attacker}`} initial={{opacity:0,y:-18,scale:.9}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:-12}} aria-live="assertive"><small>{roll.attacker==='hero'?'SEU TESTE DE ATAQUE':'ATAQUE DO INIMIGO'}</small><div className="combat-dice-pair">{roll.attacker==='hero'?<>{attackDie}<i>VS</i>{defenseDie}</>:<>{defenseDie}<i>VS</i>{attackDie}</>}</div><p>{roll.selfDamage?'FALHA CRÍTICA — DANO NO ATACANTE':'DANO'} <strong>{roll.selfDamage||roll.damage}</strong>{roll.shieldBlocked?` • ESCUDO BLOQUEOU ${roll.shieldBlocked}`:''}</p></motion.aside>
}
function FleeDiceRoll({roll}:{roll:{roll:number;outcome:'failed'|'neutral'|'success'}}){const message=roll.outcome==='success'?'Fuga bem-sucedida!':roll.outcome==='neutral'?'Você mantém sua ação':'Fuga falhou — turno perdido';return <motion.aside className={`flee-dice-roll ${roll.outcome}`} initial={{opacity:0,scale:.88}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.92}} aria-live="assertive"><small>TESTE DE FUGA</small><motion.b className="combat-die flee-die" animate={{rotate:[0,130,280,420,360],scale:[.7,1.22,.88,1]}} transition={{duration:.65}}>{roll.roll}</motion.b><strong>{message}</strong><span>1–3 perde o turno • 4 mantém a ação • 5–6 foge</span></motion.aside>}
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
 const g=useGame(),coop=useCoop(),h=HEROES.find(x=>x.id===g.heroId)!;const e=g.enemy,battle=coop.room?.shared_state?.battle as any,isCoop=Boolean(coop.room&&battle?.status==='playing'),myTurn=isCoop?battle.activeUserId===coop.userId:g.playerTurn
 React.useEffect(()=>{window.scrollTo({top:0,left:0,behavior:'auto'});document.documentElement.scrollTop=0;document.body.scrollTop=0},[])
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
 if(!e){return <div className="combat-page premium-combat"><Panel title="Finalizando combate"><p className="muted">Preparando o resultado da batalha...</p></Panel></div>}
 const defeated=g.hp<=0,disabled=!myTurn||g.animating||defeated,sharedRoll=isCoop?battle.lastRoll:undefined,intent=enemyIntentFor(e,g.combatTurn)
 // Sem limite de quantos tipos aparecem aqui -- a lista já rola (combat-v033 .combat-consumables
 // tem overflow-y:auto), então cortar em 6 (sempre os primeiros comprados, por ordem de chave do
 // objeto inventory) deixava tipos comprados depois inacessíveis em combate, mesmo tendo o item.
 const consumables=(Object.entries(g.inventory) as [string,number][]).filter(([,qty])=>qty>0).map(([id,qty])=>({item:CONSUMABLES.find(x=>x.id===id),qty})).filter(x=>x.item) as {item:(typeof CONSUMABLES)[number],qty:number}[]
 const itemAbilities=(Object.values(g.equipped) as (string|undefined)[]).map(id=>equipmentByRef(id)).filter((item):item is (typeof EQUIPMENT)[number]=>Boolean(item?.habilidade&&item.slot!=='bolsa'))
 // No coop, cada jogador pode usar a habilidade do herói uma vez por integrante da sala
 // (2 jogadores = 2 usos, 3 jogadores = 3 usos), em vez do limite único do modo solo.
 const heroSkillLimit=g.heroId==='conjurador'?2:(isCoop?Math.max(1,coop.members.length):1)
 const heroSkillUses=g.heroSkillUses??0
 const useCoopHeroSkill=()=>{if(heroSkillUses>=heroSkillLimit||!myTurn)return;
  // Golpe Flamejante (Monge) é um ataque de verdade (rola dado, causa dano), então passa por
  // coopAttack — igual ao Fervor de Combate — em vez de coopAbility, que só cobre efeitos sem
  // rolagem (buffs, cura, provocar).
  if(g.heroId==='conjurador')return
  if(g.heroId==='monge'){
   const heal=coopHealProc(g),critDamageBonusPct=hasCraftedEffect(g,'dano_critico_bonus')?.1:0,spec=specializationBonuses(g),bossBonus=(g.talents.includes('cacador')&&e.boss?2:0)+(e.boss?spec.bossDamage:0)+g.firstStrikeBonus
   useGame.setState({heroSkillUses:heroSkillUses+1})
   void coop.coopAttack(attackValue(g)+2+bossBonus,Math.max(0,(e.dificuldade??1)-2),0,false,heal.chance,heal.amount,'Golpe Flamejante',undefined,false,0,critDamageBonusPct,'fogo',true,spec.elemental)
   if(g.firstStrikeBonus)useGame.setState({firstStrikeBonus:0})
   return
  }
  // Coop combat math é orientado inteiramente pelo estado compartilhado battle.playerBuffs/
  // groupBuff/extraActions/tauntUserId (lido em coopAttack/resolveEnemyTurn). Só heroSkillUses
  // precisa ficar local (ele só trava o botão); espelhar os campos de batalha do solo aqui
  // (combatAttackPct etc.) duplicaria o bônus em cima do que coopAttack já soma do estado
  // compartilhado.
  const effect=g.heroId==='guardiao'?'GUARDIAN_TAUNT':g.heroId==='guerreiro'?'WARRIOR_BUFF':g.heroId==='cacadora'?'DOUBLE_ATTACK':g.heroId==='arcanista'?'ARCANE_GROUP_BUFF':g.heroId==='druida'?'DRUID_HEAL':g.heroId==='cacador'?'HUNTER_CRITICAL':'PRIEST_REVIVE'
  useGame.setState({heroSkillUses:heroSkillUses+1})
  void coop.coopAbility(`Habilidade de ${h.nome}`,0,effect)}
 const performSummon=(tipo:SummonType)=>{if(isCoop){if(heroSkillUses>=heroSkillLimit||!myTurn)return;useGame.setState({heroSkillUses:heroSkillUses+1});void coop.coopSummon(tipo)}else g.summonMonster(tipo)}
 const useCoopItemSkill=(equipmentId?:string)=>{if(g.itemSkillUsed||!myTurn)return;const item=itemAbilities.find(x=>x.id===equipmentId)??itemAbilities[0],effect=item?.activeEffect;if(!item||!effect)return
  if(effect.type==='shield'){useGame.setState({shield:g.shield+effect.value,itemSkillUsed:true});void coop.coopAbility(item.nome,0,`+${effect.value} de escudo`);return}
  if(effect.type==='heal'){const healed=Math.min(effect.value,maxHp(g)-g.hp);useGame.setState({hp:g.hp+healed,itemSkillUsed:true});void coop.coopAbility(item.nome,0,`recuperou ${healed} de vida`);return}
  if(effect.type==='cleanse'){useGame.setState({heroStatus:{},itemSkillUsed:true});void coop.coopAbility(item.nome,0,'removeu todas as condições negativas');return}
  if(effect.type==='reroll'){useGame.setState({heroRollBonus:g.heroRollBonus+effect.value,itemSkillUsed:true});void coop.coopAbility(item.nome,0,`+${effect.value} na próxima rolagem`);return}
  // Ataque de item com dano vai pelo mesmo dado de coopAttack (pode critar ou falhar),
  // igual ao solo (que roda o mesmo playerAttack usado pelo botão Atacar, com +3 de bônus)
  // em vez de um número fixo garantido.
  useGame.setState({itemSkillUsed:true})
  const heal=coopHealProc(g),rollBonus=g.heroRollBonus+(g.classRollBonus??0),critBoost=hasCraftedEffect(g,'critico'),spec=specializationBonuses(g),critChancePct=(hasCraftedEffect(g,'critico_forjado')?.05:0)+spec.crit,critDamageBonusPct=hasCraftedEffect(g,'dano_critico_bonus')?.1:0
  const bossBonus=(g.talents.includes('cacador')&&e.boss?2:0)+(e.boss?spec.bossDamage:0)+g.firstStrikeBonus
  void coop.coopAttack(attackValue(g)+effect.value+bossBonus,Math.max(0,(e.dificuldade??1)-2),rollBonus,critBoost,heal.chance,heal.amount,item.nome,undefined,false,critChancePct,critDamageBonusPct,effect.type==='element'?(effect.element??heroWeaponElement(g)):heroWeaponElement(g),effect.type==='element',spec.elemental)
  if(g.heroRollBonus||g.firstStrikeBonus)useGame.setState({heroRollBonus:0,firstStrikeBonus:0})}
 // Postura defensiva, Fervor de Combate e alvo em capangas existiam só no modo solo —
 // aqui espelham o mesmo botão/ação, mas via coopAttack/coopDefend (estado compartilhado).
 const activeMinions:{id:string;nome:string;hp:number;maxHp:number;ataque:number}[]=isCoop?((battle.combatMinions as any[])??[]):(g.combatMinions??[])
 const coopFervor=isCoop?Number(battle.playerBuffs?.[coop.userId]?.fervor??0):0
 const fervorLevel=isCoop?coopFervor:(g.fervor??0)
 const isBraced=isCoop?Boolean(battle.playerBuffs?.[coop.userId]?.braced):g.braced
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
 const statusKindsOf=(status:any)=>(['bleed','burn','poison','frozen','grabbed','blinded','stunned'] as const).filter(k=>status?.[k]).map(k=>({kind:k,turns:statusTurnsOf(status,k)}))
 const heroStatusKinds=isCoop?statusKindsOf(battle.playerBuffs?.[coop.userId]):statusKindsOf(g.heroStatus)
 const enemyStatusKinds=isCoop?statusKindsOf(battle.enemyStatus):statusKindsOf(g.enemyStatus)
 const performCoopAttack=(targetMinionId?:string)=>{const heal=coopHealProc(g),rollBonus=g.heroRollBonus+(g.classRollBonus??0),critBoost=hasCraftedEffect(g,'critico'),spec=specializationBonuses(g),critChancePct=(hasCraftedEffect(g,'critico_forjado')?.05:0)+spec.crit,critDamageBonusPct=hasCraftedEffect(g,'dano_critico_bonus')?.1:0,bossBonus=targetMinionId?0:(g.talents.includes('cacador')&&e.boss?2:0)+(e.boss?spec.bossDamage:0)+g.firstStrikeBonus;void coop.coopAttack(attackValue(g)+bossBonus,Math.max(0,(e.dificuldade??1)-2),rollBonus,critBoost,heal.chance,heal.amount,targetMinionId?'Ataque direcionado':undefined,targetMinionId,false,critChancePct,critDamageBonusPct,heroWeaponElement(g),false,spec.elemental);if(g.heroRollBonus||(!targetMinionId&&g.firstStrikeBonus))useGame.setState({heroRollBonus:0,firstStrikeBonus:0})}
 const performAttack=(targetMinionId?:string)=>{if(isCoop)performCoopAttack(targetMinionId);else g.attack(targetMinionId)}
 const performDefend=()=>{if(isCoop)void coop.coopDefend();else g.defend()}
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
  if(!myTurn)return
  const it=CONSUMABLES.find(x=>x.id===id)
  if(!it||(g.inventory[id]??0)<=0)return
  if(consumableBonusActive(it,g))return
  const inv={...g.inventory,[id]:(g.inventory[id]??0)-1};if(inv[id]<=0)delete inv[id]
  const persistent=it.tipo==='ataque'||it.tipo==='escudo',activePotionIds=persistent?[...(g.activePotionIds??[]).filter(activeId=>activeId!==id),id]:(g.activePotionIds??[])
  const value=consumableEffectiveValue(it,g)
  let description=`${it.nome} utilizado`
  if(it.tipo==='cura'){const healed=Math.min(value,maxHp(g)-g.hp);useGame.setState({inventory:inv,hp:g.hp+healed});description=`recuperou ${healed} de vida`}
  else if(it.tipo==='escudo'){useGame.setState({inventory:inv,shield:g.shield+value,activePotionIds});description=`+${value} de escudo`}
  else if(it.tipo==='vida_max'){const success=Math.random()<(LIFE_CHANCE[id]??.35);if(success){const newMax=maxHp(g)+value,newHp=id==='elixir_fenix'?newMax:Math.min(newMax,g.hp+value);useGame.setState({inventory:inv,attr:{...g.attr,vida:g.attr.vida+value},hp:newHp});description=`vida máxima aumentada permanentemente em ${value}`}else{useGame.setState({inventory:inv});description='a tentativa falhou e a vida máxima não aumentou'}}
  else if(it.tipo==='regen_boost'){useGame.setState({inventory:inv,regenBoostUntil:Date.now()+3600000,lastPassiveHealAt:Date.now()});description='cura acelerada ativada'}
  else{useGame.setState({inventory:inv,pendingAttackBonus:g.pendingAttackBonus+Math.max(1,value),activePotionIds});description=`+${value} de ataque no próximo ataque`}
  void coop.coopAbility(it.nome,0,description)
 }
 const performFervor=()=>{if(fervorLevel<3)return;if(isCoop){const heal=coopHealProc(g),critDamageBonusPct=hasCraftedEffect(g,'dano_critico_bonus')?.1:0,spec=specializationBonuses(g),bossBonus=(g.talents.includes('cacador')&&e.boss?2:0)+(e.boss?spec.bossDamage:0)+g.firstStrikeBonus;void coop.coopAttack(attackValue(g)+bossBonus,Math.max(0,(e.dificuldade??1)-2),0,false,heal.chance,heal.amount,'Fervor de Combate',undefined,true,0,critDamageBonusPct,heroWeaponElement(g),false,spec.elemental);if(g.firstStrikeBonus)useGame.setState({firstStrikeBonus:0})}else g.useFervor()}
 const attacker=g.combatRoll?.attacker
 // No coop, o dano de "hero" pode ter vindo de qualquer jogador do grupo — sem isso, a
 // animação de ataque sempre usava a arma equipada do jogador local, mesmo quando quem
 // atacou foi um colega com uma arma de outro tipo (ex.: arco em vez de espada).
 const attackerUserId=isCoop?sharedRoll?.attackerUserId:undefined
 const attackerWeaponAnim=isCoop&&attackerUserId&&attackerUserId!==coop.userId?(coop.room?.shared_state?.memberVitals as Record<string,{weaponAnim?:AttackAnimType}>|undefined)?.[attackerUserId]?.weaponAnim:undefined
 const currentAttackType=attacker==='hero'?(attackerWeaponAnim??heroWeaponAnimationType(g.equipped.mao_direita)):attacker==='enemy'?enemyWeaponAnimationType(e):undefined
 const currentSummonAttackType=summonFxIndex>=0?summonFxEvent?.types?.[summonFxIndex] as AttackAnimType|undefined:undefined
 const currentAttackCritical=g.combatRoll?.attackRoll===6
 // No coop, o painel de dados usava só um resumo em texto (battle.lastRoll), nunca a animação
 // rica de CombatDiceRoll/FleeDiceRoll que o modo solo tem — mesmo já existindo dados suficientes
 // no estado compartilhado para isso. Aqui a gente prioriza a animação sempre que possível.
 const coopDiceRoll=isCoop&&sharedRoll&&(sharedRoll.attacker==='hero'||sharedRoll.attacker==='enemy')?sharedRoll:undefined
 const idleDice=<motion.div className="combat-dice-idle" initial={{opacity:0}} animate={{opacity:1}}><Dices/><strong>Aguardando a próxima jogada</strong><small>Os resultados de ataque, defesa e fuga aparecerão aqui.</small></motion.div>
 const diceNode=isCoop
  ?(battle.fleeRoll?<FleeDiceRoll key={`coop-flee-${battle.turn}`} roll={battle.fleeRoll}/>
    :coopDiceRoll?<CombatDiceRoll key={`coop-${battle.turn}-${coopDiceRoll.attacker}`} roll={coopDiceRoll}/>
    :sharedRoll?<motion.div className="combat-dice-idle" initial={{opacity:0}} animate={{opacity:1}}><Dices/><strong>{sharedRoll.actor}: {sharedRoll.label??'ação de equipe'}</strong><small>{sharedRoll.effect??`Dano causado: ${sharedRoll.damage??0}`}</small></motion.div>
    :idleDice)
  :(g.fleeRoll&&g.animating?<FleeDiceRoll key={`flee-${g.combatTurn}-${g.fleeRoll.roll}`} roll={g.fleeRoll}/>
    :g.combatRoll&&g.animating?<CombatDiceRoll key={`${g.combatTurn}-${g.combatRoll.attacker}`} roll={g.combatRoll}/>
    :idleDice)
 return <div className="combat-page premium-combat combat-v033">
  <div className="screen-intro"><small>FOCO DO TURNO</small><p>Olhe primeiro a intenção do inimigo, depois os bônus ativos e os consumíveis. O log continua disponível, mas a ação principal precisa ser lida em um só olhar.</p></div>
  <div className="battle-summary-strip"><span><small>SEU ATAQUE</small><strong>{attackValue(g)}</strong></span><span><small>SUA DEFESA</small><strong>{defenseValue(g)}</strong></span><span><small>INTENÇÃO</small><strong>{intent.label}</strong></span></div>
  <div className="combat-hero-area">
    <Fighter side="hero" classId={h.id} name={h.nome} image={cardArt(h)} hp={g.hp} max={maxHp(g)} attack={attackValue(g)} defense={defenseValue(g)} ability={h.habilidade} kind="HERÓI" rarity="HERÓICO" shaking={g.animating&&g.animationActor==='enemy'} damage={g.animating&&g.animationActor==='enemy'?g.lastDamage:undefined} attackType={currentAttackType} attackCritical={currentAttackCritical} supportFx={g.supportFx?.type} statusKinds={heroStatusKinds}/>
    {isCoop&&<CoopTeammatesRow coop={coop} battle={battle}/>}
    {currentSummons.length>0&&<div className="summon-row">{currentSummons.map((fera,index)=><article key={`${fera.tipo}-${index}`}><Sparkles/><span><strong>{fera.nome}</strong><small>ATQ {fera.ataque} • DEF {fera.defesa} • VIDA {fera.hp}/{fera.maxHp}</small><i><b style={{width:`${fera.hp/fera.maxHp*100}%`}}/></i></span></article>)}</div>}
   </div>
   <div className="combat-enemy-area">
    <Fighter side="enemy" name={e.nome} image={cardArt(e)} hp={g.enemyHp} max={e.vida} attack={e.ataque} defense={enemyDefenseValue(e)} ability={e.habilidade} kind={e.boss?'CHEFE':e.elite?'ELITE':'INIMIGO'} rarity={e.boss?'LENDÁRIO':e.elite?'RARO':'COMUM'} shaking={g.animating&&g.animationActor==='hero'} damage={g.animating&&g.animationActor==='hero'?g.lastDamage:undefined} boss={e.boss} phase={e.fase} frameTheme={CATEGORY_FRAME[e.boss?'CHEFE':e.elite?'ELITE':'INIMIGO']} attackType={currentAttackType} summonAttackType={currentSummonAttackType} attackCritical={currentAttackCritical} statusKinds={enemyStatusKinds}/>
    {Boolean(activeMinions.some(minion=>minion.hp>0))&&<div className="boss-minion-row">{activeMinions.filter(minion=>minion.hp>0).map(minion=><article key={minion.id} className="targetable" role="button" tabIndex={disabled?-1:0} aria-disabled={disabled} title={`Atacar ${minion.nome} em vez do alvo principal`} onClick={()=>{if(!disabled)performAttack(minion.id)}} onKeyDown={event=>{if(!disabled&&(event.key==='Enter'||event.key===' ')){event.preventDefault();performAttack(minion.id)}}}><Shield/><span><strong>{minion.nome}</strong><i><b style={{width:`${minion.hp/minion.maxHp*100}%`}}/></i><small>ATQ {minion.ataque} • Vida {minion.hp}/{minion.maxHp}</small></span></article>)}</div>}
    <div className={`enemy-intent intent-${intent.type}`}><small>PRÓXIMA AÇÃO</small><strong>{intent.label}</strong><span>{intent.description}</span></div>
   </div>

   <Panel title="Habilidades dos itens" className="effects-panel combat-effects-area">
      {g.shield>0?<div className="active-effect"><Shield/><div><strong>Escudo ativo</strong><small>Absorve até {g.shield} de dano.</small></div></div>:<p className="muted no-effect">Nenhum efeito defensivo ativo.</p>}
      {/* Ativação por item mora aqui (cada peça tem seu próprio botão "Usar"), em vez de um
          único botão ambíguo "Habilidade do item" na caixa de Ações que sempre disparava a
          primeira peça equipada com qualquer texto de habilidade, sem o jogador saber qual. */}
      <div className="combat-item-abilities">{itemAbilities.length?itemAbilities.map(item=><div className="active-effect passive item-ability-row" key={item.id}><Sparkles/><div><strong>{item.nome}</strong><small>{itemSkillEffectText(item)}</small></div><button className="item-ability-use" disabled={disabled||g.itemSkillUsed} onClick={()=>isCoop?useCoopItemSkill(item.id):g.itemSkill(item.id)}>Usar</button></div>):<p className="muted no-effect">Nenhum equipamento com habilidade.</p>}</div>
   </Panel>

   <Panel title="Registro de combate" className="combat-log-panel combat-log-area">
    <div className="combat-log-turn" aria-label={`Turno ${g.combatTurn}`}><small>TURNO</small><strong>{g.combatTurn}</strong></div>
    <div className="combat-initiative"><span className={'coin '+(g.coin?'flipped':'')}>{isCoop?(battle.initiativeIndex+1):(g.coin==='cara'?'C':'K')}</span><small>{isCoop?`Rodada ${battle.round} • Ordem: ${(battle.initiativeNames??[]).join(' → ')}`:(g.coin==='cara'?'Cara: herói iniciou':'Coroa: inimigo iniciou')}</small></div>
    <div className="combat-log premium-log">{(isCoop?(battle.log??[]):g.combatLog).map((x:string,i:number)=><motion.p key={i+x} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}}><span className="log-dot">◉</span>{x}</motion.p>)}</div>
   </Panel>

   <Panel title="Ações" className="combat-actions-panel combat-actions-area">
      {defeated&&<p className="coop-defeated-notice">DERROTADO • Você não pode mais realizar ações nesta batalha. As penalidades serão aplicadas ao final.</p>}
      <div className="combat-actions-grid">
       <button className="attack-btn premium-action" disabled={disabled} onClick={()=>performAttack()}><Sword/>Atacar</button>
       {g.heroId==='conjurador'&&heroSkillUses<2&&currentSummons.length<2
        ?<div className="summon-choice-row">
          <button className="premium-action" disabled={disabled} title="Fera ofensiva: mais ataque, ataca a cada turno com dado próprio." onClick={()=>performSummon('atacante')}><Sword/>Fera ofensiva</button>
          <button className="premium-action" disabled={disabled} title="Fera defensiva: mais vida e defesa, alta chance de interceptar ataques por você." onClick={()=>performSummon('defensor')}><Shield/>Fera defensiva</button>
          <button className="premium-action" disabled={disabled} title="Fera arcana: concede +10% de Ataque e Defesa a você enquanto viva." onClick={()=>performSummon('arcano')}><Sparkles/>Fera arcana</button>
         </div>
        :<button className="premium-action" disabled={disabled||g.heroId==='conjurador'||heroSkillUses>=heroSkillLimit} title={g.heroId==='conjurador'?'Você já mantém duas feras espectrais nesta batalha.':undefined} onClick={()=>isCoop?useCoopHeroSkill():g.heroSkill()}><Sparkles/>{g.heroId==='conjurador'?'Limite de feras atingido':heroSkillNames[g.heroId??'']??'Habilidade do herói'}{heroSkillLimit>1?` (${Math.min(heroSkillUses,heroSkillLimit)}/${heroSkillLimit})`:''}</button>}
       <button className="premium-action" disabled={disabled} onClick={performFlee}><Footprints/>Tentar fugir</button>
       <button className={`premium-action${isBraced?' active-toggle':''}`} disabled={disabled} title={isBraced?'Desativa a postura defensiva (+2 de Defesa).':'Ativa +2 de Defesa até o fim da batalha ou até você desativar. Na primeira vez, não consome o turno.'} onClick={performDefend}><ShieldHalf/>{isBraced?'Desativar postura defensiva':'Postura defensiva'}</button>
       <button className="premium-action fervor-action" disabled={disabled||fervorLevel<3} title="Acerta uma rolagem de ataque cheia com um crítico garantido." onClick={performFervor}><Zap/>Fervor de Combate ({Math.min(3,fervorLevel)}/3)</button>
      </div>
   </Panel>

   <Panel title="Rolagem dos dados" className="combat-dice-panel combat-dice-area">
    <AnimatePresence mode="wait">{diceNode}</AnimatePresence>
   </Panel>

   <Panel className="combat-consumables-panel combat-consumables-area">
      <div className="consumables-head"><span>ITENS CONSUMÍVEIS</span><small>{consumables.length?`${consumables.length} tipos disponíveis`:'Nenhum item disponível'}</small></div>
      <div className="combat-consumables">
       {consumables.length?consumables.map(({item,qty})=>{const desc=consumableDescription(item,g),active=consumableBonusActive(item,g);return <article key={item.id} className={`combat-consumable rarity-${cardRarity(item,'Consumível')}`} title={active?'Esta poção já está ativa. Use outra poção para combinar bônus.':desc}><span className="consumable-qty">{qty}</span><div className="combat-consumable-art"><ArtPreview image={cardArt(item)} name={item.nome} text={desc} stats={`${item.tipo} • Valor ${consumableEffectiveValue(item,g)} • Quantidade ${qty}`}/></div><strong>{item.nome}</strong><small>{active?'Efeito desta poção já está ativo.':desc}</small><button disabled={disabled||active} onClick={()=>performUseConsumable(item.id)}>{active?'ATIVA':'USAR'}</button></article>}):<div className="consumables-empty"><FlaskConical/><span>Seus consumíveis aparecerão aqui durante o combate.</span></div>}
      </div>
   </Panel>

   <div className="combat-tip"><Sparkles size={15}/> Dica: use os consumíveis no momento certo — utilizar um item consome seu turno.</div>
 </div>}
function Fighter({side,classId,name,image,hp,max,attack,defense,ability,kind,rarity,shaking,boss,phase,damage,frameTheme,attackType,summonAttackType,attackCritical,supportFx,statusKinds}:{side:string;classId?:string;name:string;image:string;hp:number;max:number;attack:number;defense:number;ability:string;kind:string;rarity:string;shaking:boolean;boss?:boolean;phase?:number;damage?:number;frameTheme?:string;attackType?:AttackAnimType;summonAttackType?:AttackAnimType;attackCritical?:boolean;supportFx?:'fortificacao'|'cura'|'cura-item';statusKinds?:readonly{kind:string;turns?:number}[]}){
 const galleryKind=side==='hero'?'Herói':boss?'Chefe':kind==='ELITE'?'Elite':'Monstro'
 const card={id:classId,nome:name,arte:image,habilidade:ability,ataque:attack,defesa:defense,vida:max,boss,elite:kind==='ELITE',raridade:side==='hero'?'heroico':boss?'lendario':kind==='ELITE'?'raro':'comum'}
 return <motion.article className={'fighter premium-fighter combat-card-fighter '+side+(boss?' boss':'')} animate={shaking?{x:[0,-9,8,-5,0]}:{x:0}} transition={{duration:.35}}>
  <CardFrame card={card} kind={galleryKind} frameTheme={frameTheme} attackFx={summonAttackType??(shaking?attackType:undefined)} attackFxCritical={summonAttackType?false:(shaking?attackCritical:undefined)} supportFx={supportFx}/>
  {boss&&<small className="combat-card-phase">FASE {phase??1}</small>}
  {shaking&&damage!==undefined&&<motion.div className="floating-damage" initial={{opacity:0,y:10,scale:.7}} animate={{opacity:1,y:-45,scale:1.2}} transition={{duration:.5}}>-{damage}</motion.div>}
  <div className="hp-label"><span>Vida</span><strong>{Math.max(0,hp)}/{max}</strong></div><div className="hp-track"><motion.div animate={{width:`${Math.max(0,hp/max*100)}%`}} transition={{duration:.45}}/></div>
  {Boolean(statusKinds?.length)&&<div className="status-badges">{statusKinds!.map(({kind,turns})=><span key={kind} className={`status-badge status-${kind}`} title={STATUS_DURATION_NOTE[kind]??''}>{STATUS_LABELS[kind]}{turns!=null&&turns>0?` ×${turns}`:''}</span>)}</div>}
 </motion.article>
}
function LootScreen(){const g=useGame(),coop=useCoop();const l=g.loot,defeat=l?.title==='EQUIPE DERROTADA',epic=Boolean(l&&!defeat&&l.title!=='VITÓRIA');
 React.useEffect(()=>{if(!l||defeat)return;if(l.leveledUp)playSfx('levelup');else if(l.gold>0)playSfx('coin')},[l]);const e=l?.equipmentId?EQUIPMENT.find(x=>x.id===l.equipmentId):undefined;const i=l?.itemId?CONSUMABLES.find(x=>x.id===l.itemId):undefined;const missed=l?.missedEquipmentId?EQUIPMENT.find(x=>x.id===l.missedEquipmentId):undefined;return <div className="loot-page"><Panel><div className="loot-head"><small>RESULTADO DA BATALHA</small><button onClick={()=>g.finishLoot()}>Voltar ao mapa</button></div><div className="screen-intro"><p>O resumo existe para dizer rapidamente o que você ganhou, o que mudou no personagem e o que vale olhar antes da próxima luta.</p></div>{defeat?<Skull className="trophy"/>:<Trophy className={`trophy${epic?' epic':''}`}/>}<h1>{l?.title??'Vitória'}</h1><div className="loot-summary"><span><small>OURO</small><strong>+{l?.gold??0}</strong></span><span><small>XP</small><strong>+{l?.xp??0}</strong></span><span><small>PRÓXIMO PASSO</small><strong>{g.dungeonActive?`Sala ${g.dungeonDepth+1}`:'Mapa'}</strong></span></div>{l?.leveledUp&&<div className="levelup-banner"><Sparkles size={26}/><span>Você alcançou o nível {l.newLevel}!{(l.levelsGained??0)>1?` (+${l.levelsGained} níveis de uma vez)`:''}<small>Novos pontos de atributo disponíveis na Ficha.</small></span><Sparkles size={26}/></div>}{g.dungeonActive&&<p className="muted">Profundidade concluída: {g.dungeonDepth}. A próxima sala será mais perigosa e valiosa.</p>}<div className="loot-stats"><Stat label="Ouro recebido" value={`+${l?.gold??0}`}/><Stat label="Experiência recebida" value={`+${l?.xp??0}`}/>{e&&<ItemCard image={cardArt(e)} rarity={cardRarity(e,'Equipamento')} name={e.nome} subtitle="Equipamento obtido" badge={l?.isNewEquipment?'Nova descoberta':undefined}/>}{i&&<ItemCard image={cardArt(i)} rarity={cardRarity(i,'Consumível')} name={i.nome} subtitle="Consumível obtido" badge={l?.isNewItem?'Nova descoberta':undefined}/>}{!e&&!i&&!missed&&<p className="muted">Nenhum item adicional foi encontrado.</p>}</div><LootPreparation/><LootEquipmentPanel/>{missed&&<p className="loot-missed"><Package/> Você encontrou <b>{missed.nome}</b>, mas sua bolsa de equipamentos estava cheia e o item foi perdido. Libere espaço na Mochila para não perder o próximo.</p>}<div className="loot-actions">{g.dungeonActive?<><button className="primary" onClick={g.startDungeon}>Avançar para a sala {g.dungeonDepth+1}</button><button onClick={g.leaveDungeon}>Encerrar expedição</button></>:<button className="primary" onClick={async()=>{if(coop.room){await coop.completeBattle();g.finishLoot();g.setScreen('coop')}else g.finishLoot()}}>{coop.room?'Voltar à sala Coop':'Voltar ao mapa'}</button>}</div></Panel></div>}
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
   const stats=e.slot==='bolsa'?`Capacidade ${e.capacidade??8} espaços`:`Ataque +${p.atk}${p.atkDetail} • Defesa +${p.def}${p.defDetail} • Vida +${p.life}${p.lifeDetail}`
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
   <div><span className="eyebrow">EM CONSTRUÇÃO</span><h1>Criador de cartas</h1><p>Primeira versão da ferramenta. As regras completas de criação ainda serão definidas — por enquanto, use os campos abaixo para montar e visualizar uma carta com a moldura oficial do jogo.</p></div>
  </div>
  <div className="card-creator-layout three-col">
   <Panel title="Informações da carta" className="card-creator-form">
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
   <Panel title="Upload da imagem" className="card-creator-upload">
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
   <Panel title="Pré-visualização" className="card-creator-preview">
    <div className="card-creator-preview-inner">
     <CardFrame card={previewCard} kind={draft.kind} artStyle={draft.imagem?artStyle:undefined}/>
     <button type="button" className="primary" disabled={!draft.imagem} onClick={addToCollection}><Plus size={16}/>Adicionar à coleção</button>
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
function GuildScreen(){
 const g=useGame()
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
 return <div className="guild-page"><Panel className="guild-head"><button onClick={()=>g.setScreen('map')}><ArrowLeft/>Voltar ao mapa</button><div><span className="eyebrow">SALÃO DOS AVENTUREIROS</span><h1>Guilda de Havendown</h1><p>Aceite contratos, aumente sua reputação e conquiste acesso às missões mais valiosas.</p></div><Shield className="guild-crest"/></Panel><div className="guild-summary"><span><ScrollText/><small>MISSÕES ATIVAS</small><strong>{active}</strong></span><span><Trophy/><small>PRONTAS</small><strong>{completed}</strong></span><span><Shield/><small>RANK</small><strong>{rank.nome}</strong></span></div><div className="screen-intro"><small>ORDEM SUGERIDA</small><p>Primeiro veja seu rank, depois o que já está pronto para resgate e por fim os contratos bloqueados. Isso reduz a chance de se perder na lista.</p></div>
 <NpcBanner name={GUILD_LEADER.nome} title={GUILD_LEADER.titulo} line={guildLeaderLine(g,active,completed,reputation)} image={GUILD_LEADER.retrato}/>
 <section className="guild-rank-panel"><div className="guild-current-rank" style={{'--rank-color':rank.cor} as React.CSSProperties}><Shield/><span><small>RANK DE AVENTUREIRO</small><strong>{rank.nome}</strong></span></div><div className="guild-rank-progress"><div><span>{reputation} pontos de reputação</span><strong>{nextRank?`Próximo: ${nextRank.nome} (${nextRank.minimo})`:'Rank máximo alcançado'}</strong></div><div className="xp-track"><div style={{width:nextRank?`${Math.min(100,(reputation-rank.minimo)/(nextRank.minimo-rank.minimo)*100)}%`:'100%'}}/></div></div><div className="guild-rank-road">{GUILD_RANKS.map(r=><span className={reputation>=r.minimo?'reached':''} style={{'--rank-color':r.cor} as React.CSSProperties} key={r.id} title={`${r.nome}: ${r.minimo} pontos`}><i/>{r.nome}</span>)}</div></section>
 <div className="guild-summary"><span><ScrollText/><small>MISSÕES ATIVAS</small><strong>{active}</strong></span><span><Trophy/><small>PRONTAS PARA RESGATE</small><strong>{completed}</strong></span><span><Package/><small>ESPAÇO NA BOLSA</small><strong>{g.equipmentBag.length}/{equipmentBagCapacity(g)}</strong></span></div>{g.guildNotice&&<div className="guild-notice"><Sparkles/>{g.guildNotice}</div>}
 <div className="guild-filter">{GUILD_MISSION_CATEGORIES.map(c=><button key={c.id} className={category===c.id?'active':''} onClick={()=>setCategory(c.id)}>{c.label}<small>{GUILD_MISSIONS.filter(m=>c.match(m.tipo)).length}</small></button>)}</div>
 <div className="guild-mission-grid">{visibleMissions.map((m,missionIndex)=>{const showRankDivider=missionIndex===0||m.rank!==visibleMissions[missionIndex-1].rank,dividerRank=GUILD_RANKS.find(r=>r.id===m.rank)!,accepted=g.guildAccepted.includes(m.id),claimed=g.guildClaimed.includes(m.id),progress=missionProgress(m),ready=accepted&&progress>=m.quantidade,equipmentReward=m.recompensa.tipo==='equipment',deliveryItem=m.itemId?EQUIPMENT.find(e=>e.id===m.itemId):undefined,materialInfo=m.materialId?Object.values(REGION_MATERIALS).find(mat=>mat.id===m.materialId):undefined,deliveryEquippedOnly=m.tipo==='delivery'&&Boolean(m.itemId)&&!g.equipmentBag.some(ref=>equipmentBaseId(ref)===m.itemId!)&&Object.values(g.equipped).some(ref=>equipmentBaseId(ref)===m.itemId!),requiredRank=GUILD_RANKS.find(r=>r.id===m.rank)!,locked=rankIndex<GUILD_RANKS.findIndex(r=>r.id===m.rank);const claimMission=()=>{if(deliveryEquippedOnly&&!window.confirm(`${deliveryItem?.nome} está equipado em um herói. Ao entregá-lo você perderá este equipamento e seus bônus enquanto ele estiver equipado. Deseja continuar?`))return;g.claimGuildMission(m.id)};return <React.Fragment key={m.id}>{showRankDivider&&<div className="guild-rank-divider" style={{'--rank-color':dividerRank.cor} as React.CSSProperties}><Shield size={14}/><strong>{dividerRank.nome}</strong><small>{dividerRank.minimo}+ reputação</small></div>}<article className={`guild-mission${claimed?' claimed':ready?' ready':accepted?' active':locked?' locked':''}`}><header><span>{locked?<Shield/>:m.tipo==='delivery'?<Package/>:m.tipo==='material'?<Gem/>:m.tipo==='boss'?<Trophy/>:m.tipo==='specific'?<Sword/>:<Shield/>}</span><div><small>{m.tipo==='delivery'?'CONTRATO DE ENTREGA':m.tipo==='material'?'PEDIDO DE COLETA':m.tipo==='boss'?'CONTRATO DE CHEFE':m.tipo==='specific'?'CAÇA ESPECÍFICA':'MISSÃO DE CAÇA'}</small><h2>{m.nome}</h2></div><b>{'◆'.repeat(m.dificuldade)}</b></header><span className="guild-required-rank" style={{'--rank-color':requiredRank.cor} as React.CSSProperties}>Rank mínimo: <strong>{requiredRank.nome}</strong> · +{m.dificuldade} reputação</span><p>{m.descricao}</p>{deliveryItem&&<span className="guild-delivery-item"><Package/>Item solicitado: <strong>{deliveryItem.nome}</strong>{progress>0?(deliveryEquippedOnly?<em>Equipado — será perdido ao entregar</em>:<em>Disponível para entrega</em>):<em>Não está na bolsa</em>}</span>}{materialInfo&&<span className="guild-delivery-item"><Gem/>Material pedido: <strong>{materialInfo.nome}</strong><em>{progress}/{m.quantidade} em estoque</em></span>}{m.local&&<span className="guild-location"><Map/>Região indicada: {m.local}</span>}{m.destinoId&&<button className="guild-fast-travel" disabled={locked} title={locked?`Alcance o rank ${requiredRank.nome} para viajar para esta missão.`:`Viajar para ${m.local}`} onClick={()=>g.openSubregion(m.destinoId!)}><Map/><span><small>VIAGEM RÁPIDA</small><strong>{locked?'Destino bloqueado':m.local}</strong></span><ArrowRight/></button>}<div className="guild-progress"><div><span>{m.tipo==='delivery'?'Item na bolsa':m.tipo==='material'?'Materiais coletados':'Progresso'}</span><strong>{progress}/{m.quantidade}</strong></div><div className="xp-track"><div style={{width:`${progress/m.quantidade*100}%`}}/></div></div><div className="guild-reward"><span>{equipmentReward?<Package/>:<Coins/>}<small>RECOMPENSA</small><strong>{equipmentReward?'Equipamento compatível':`${m.recompensa.valor} moedas de ouro`}</strong></span>{claimed?<button disabled>Concluída</button>:locked?<button className="rank-locked" disabled>Requer rank {requiredRank.nome}</button>:!accepted?<button onClick={()=>g.acceptGuildMission(m.id)}>Aceitar missão</button>:ready?<button className="primary" disabled={equipmentReward&&bagFull} title={equipmentReward&&bagFull?'Libere espaço nos equipamentos guardados.':deliveryEquippedOnly?'Este item está equipado e será perdido ao entregar.':''} onClick={claimMission}>{equipmentReward&&bagFull?'Bolsa cheia':m.tipo==='delivery'?'Entregar item':m.tipo==='material'?'Entregar materiais':'Resgatar recompensa'}</button>:<button disabled>{m.tipo==='delivery'?'Item necessário':m.tipo==='material'?'Materiais insuficientes':'Em andamento'}</button>}</div></article></React.Fragment>})}</div></div>
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><AuthProvider><AuthGate><CoopProvider><App/></CoopProvider></AuthGate></AuthProvider></React.StrictMode>)
