import React from 'react'
import { ArrowLeft, ArrowLeftRight, ArrowRight, Coins, Copy, Crown, Heart, Link2, LogOut, Map, PackageSearch, ScrollText, ShieldHalf, ShoppingBag, Sword, Tag, Trophy, Users, Wifi, WifiOff, XCircle } from 'lucide-react'
import { attackValue, buildCoopEnemy, buildCoopRegionBoss, buildCoopSubregionBoss, CONSUMABLES, defenseValue, equipmentBagCapacity, equipmentByRef, HEROES, hasCraftedEffect, heroResistances, heroWeaponAnimationType, heroWeaponElement, isNavigationLocked, levelInfo, maxHp, regionListSort, SUBREGIONS, TERRITORIES, useGame } from '../store/game'
import { SPECIALIZATION_CHOICES } from '../data/expansion'
import type { Enemy, Subregion, Slot } from '../types'
import { normalizeRoomCode, onlineConfigured } from './supabase'
import { useCoop, type MarketListing } from './CoopContext'
import { getRegionMap, REGION_UI_THEME, TileWorldExplorer } from '../regionMap'
import { useUiMode } from '../ui/uiMode'
import { CoopBossBriefing } from '../ui/CoopBossBriefing'
import { ScreenMasthead } from '../ui/ScreenMasthead'
import { SCENE_ART } from '../ui/screenIdentity'

const art=(hero:any)=>'./'+(hero?.arte??hero?.imagem??'')
// Contrato 17 do Quadro de Contratos: emotes rápidos (não chat livre, sem risco de moderação) --
// exportados daqui pra CombatScreen (main.tsx) também poder usar os mesmos dois componentes
// durante uma batalha cooperativa, sem duplicar a lista nem a lógica de exibição/expiração.
export const COOP_EMOTES=['👋','⚔️','❤️','🏃','🎉','😅','👍','⏳']
export function CoopEmoteBar({className}:{className?:string}){
 const coop=useCoop()
 return <div className={`coop-emote-bar${className?' '+className:''}`}>{COOP_EMOTES.map(emote=><button key={emote} type="button" disabled={coop.busy} onClick={()=>void coop.sendEmote(emote)} title="Enviar emote pro grupo">{emote}</button>)}</div>
}
const EMOTE_DISPLAY_MS=3000
export function CoopEmoteToast(){
 const coop=useCoop()
 const lastEmote=coop.room?.shared_state?.lastEmote as {userId:string;displayName:string;emote:string;ts:number}|undefined
 const [visible,setVisible]=React.useState(false)
 const seenTs=React.useRef(0)
 React.useEffect(()=>{
  if(!lastEmote||lastEmote.ts===seenTs.current)return
  seenTs.current=lastEmote.ts
  setVisible(true)
  const timer=setTimeout(()=>setVisible(false),EMOTE_DISPLAY_MS)
  return()=>clearTimeout(timer)
 },[lastEmote?.ts])
 if(!visible||!lastEmote)return null
 return <div className="coop-emote-toast" key={lastEmote.ts}><span className="coop-emote-toast-icon">{lastEmote.emote}</span><small>{lastEmote.userId===coop.userId?'Você':lastEmote.displayName}</small></div>
}
// Só existe arte de sprite de mapa (pixel art nas 4 direções) pra estes heróis -- os demais (e
// NPCs) caem no fallback 'adventurer' do próprio TileWorldExplorer, igual ao mapa solo.
const MAP_SPRITE_HEROES=['guerreiro','guardiao','cacadora','arcanista','druida','cacador','monge','sacerdotisa','conjurador']
const mapSpriteFor=(heroId?:string):string=>MAP_SPRITE_HEROES.includes(heroId??'')?heroId!:'adventurer'
type MemberVitals={hp:number;maxHp:number;level?:number;attack?:number;defense?:number;shield?:number;locked?:boolean}
type MapPos={regionId:string;x:number;y:number}
type CoopMemberProgress=Record<string,Record<string,number>>
const COOP_WORLD_LABELS:Record<string,string>={havendown:'Havendown',steelmere:'Steelmere'}
function coopDangerFor(level:number,min:number,max:number){if(level<min-2)return{label:'PERIGO EXTREMO',stars:5,cls:'deadly'};if(level<min)return{label:'Difícil',stars:4,cls:'hard'};if(level<=max)return{label:'Adequado',stars:3,cls:'fair'};if(level<=max+3)return{label:'Fácil',stars:2,cls:'easy'};return{label:'Muito fácil',stars:1,cls:'easy'}}
function coopSubProgress(sub:Subregion,members:{user_id:string}[],memberProgress:CoopMemberProgress){const required=sub.encontrosNecessarios,values=members.map(member=>Math.min(required,memberProgress[member.user_id]?.[sub.id]??0)),minimum=values.length?Math.min(...values):0,ready=values.length>0&&values.every(value=>value>=required);return{required,values,minimum,ready,left:Math.max(0,required-minimum)}}

// O resolvedor de assets do jogo (com a revisão de cache) vem do main.tsx; sem ele, cai no caminho simples.
const plainAssetUrl=(path:string)=>`${import.meta.env.BASE_URL}${path.replace(/^(\.\/|\/)+/,'')}`
export default function PersistentCoopScreen({assetUrl=plainAssetUrl}:{assetUrl?:(path:string)=>string}={}){
 // Link de convite: ?coop=CODIGO na URL pré-preenche o campo de código, então quem recebe
 // o link só precisa digitar o nome e confirmar -- em vez de copiar/digitar 6 caracteres.
 const codeFromLink=React.useMemo(()=>normalizeRoomCode(new URLSearchParams(location.search).get('coop')??''),[])
 const g=useGame(),coop=useCoop(),[name,setName]=React.useState(()=>{try{return localStorage.getItem('bangalores-coop-name')??''}catch{return ''}}),[code,setCode]=React.useState(codeFromLink),[linkCopied,setLinkCopied]=React.useState(false),publishedProgress=React.useRef('')
 const copyInviteLink=(roomCode:string)=>{const url=new URL(location.href);url.search='';url.searchParams.set('coop',roomCode);navigator.clipboard?.writeText(url.toString());setLinkCopied(true);setTimeout(()=>setLinkCopied(false),2000)}
 const {room,members,userId,onlineCount,busy,notice}=coop,isHost=room?.host_id===userId,hostMember=members.find(member=>member.user_id===room?.host_id)
 const battle=room?.shared_state?.battle as {id?:string;status?:string;subregionId?:string;enemy?:Enemy}|undefined
 const memberVitals=(room?.shared_state?.memberVitals??{}) as Record<string,MemberVitals>,myMaxHp=maxHp(g)
 const sharedMapPos=room?.shared_state?.mapPos as MapPos|undefined,sharedRegionId=sharedMapPos?.regionId??g.regionId
 // O bônus de especialização já entra no cálculo de ataque/defesa/vida publicado pro grupo; o
 // que faltava era mostrar isso na tela -- os números pareciam "de onde vieram esses pontos a
 // mais" sem essa lista.
 const mySpecializations=Object.entries(g.specializations??{}).map(([level,id])=>SPECIALIZATION_CHOICES.find(tier=>String(tier.level)===level)?.options.find(option=>option.id===id)?.nome).filter(Boolean)
 // "locked" viaja junto com os outros vitals publicados pro grupo -- é o mesmo isNavigationLocked
 // que trava os botões da TopBar (combate solo em andamento, ou masmorra em pleno saque). Serve
 // pro líder saber, ANTES de tentar caçar, que alguém não pode ser puxado pra batalha agora (ver
 // safeStartMapBattle em CoopContext.tsx).
 React.useEffect(()=>{const level=levelInfo(g.xp).lvl,myAttack=attackValue(g),myDefense=defenseValue(g),rollBonus=g.classRollBonus??0,critDefenseBoost=hasCraftedEffect(g,'defesa_perfeita'),dodgeBoost=hasCraftedEffect(g,'esquiva_forjada'),weaponAnim=heroWeaponAnimationType(g.equipped.mao_direita),resistances=heroResistances(g),locked=isNavigationLocked(g),key=`${room?.id}:${userId}:${JSON.stringify(g.subregionVictories)}:${g.hp}:${myMaxHp}:${myAttack}:${myDefense}:${level}:${g.shield}:${rollBonus}:${critDefenseBoost}:${dodgeBoost}:${weaponAnim}:${resistances.join(',')}:${locked}`;if(!room||!userId||publishedProgress.current===key)return;publishedProgress.current=key;void coop.publishProgress(g.subregionVictories,{hp:g.hp,maxHp:myMaxHp,level,attack:myAttack,defense:myDefense,shield:g.shield,rollBonus,critDefenseBoost,dodgeBoost,weaponAnim,resistances,locked})},[room?.id,userId,g.subregionVictories,g.hp,g.xp,g.shield,myMaxHp,g.screen,g.dungeonActive,coop.publishProgress])
 // Modo Moderno: o cabeçalho do grupo (cena dos heróis juntos) substitui o painel de título; o Clássico fica como era.
 const modern=useUiMode()==='modern',myLevel=levelInfo(g.xp).lvl
 if(!onlineConfigured)return modern?<div className="coop-page"><ScreenMasthead className="coop-masthead" assetUrl={assetUrl} art={SCENE_ART.party} eyebrow="Social • Cooperativo" title="Cooperativo em tempo real" lead={<>O serviço online não está conectado nesta versão, então ainda não dá para criar ou entrar em salas. Sua campanha solo continua normalmente.</>} action={{label:'Voltar ao acampamento',detail:'Continue a campanha solo',icon:<ArrowLeft size={20}/>,onClick:()=>g.setScreen('camp')}} secondary={[{label:'Guilda',icon:<ScrollText size={16}/>,onClick:()=>g.setScreen('guild')}]}/></div>:<div className="coop-page"><section className="panel coop-setup"><WifiOff/><h2>Serviço online ainda não conectado</h2></section></div>
 const currentHero=HEROES.find(item=>item.id===g.heroId)
 if(!room)return <div className="coop-page">{modern?<ScreenMasthead className="coop-masthead" assetUrl={assetUrl} art={SCENE_ART.party} eyebrow="Social • Cooperativo" title="Cooperativo em tempo real" lead={<>Crie uma sala para convidar amigos ou entre com o código recebido. A sala continua conectada enquanto você usa os outros menus.</>} stats={currentHero?[{label:'Seu herói',value:currentHero.nome},{label:'Nível',value:myLevel}]:undefined}/>:<section className="panel coop-hero"><div><span className="eyebrow">BANGALORE'S ONLINE</span><h1>Cooperativo em tempo real</h1><p>Crie uma sala para convidar amigos ou entre com o código recebido.</p></div><Wifi className="online"/></section>}<div className="coop-entry"><section className="panel"><h2>1. Seu aventureiro</h2><label>Nome visível<input maxLength={24} value={name} onChange={e=>setName(e.target.value)} placeholder="Como o grupo verá você"/></label><p className="coop-entry-hint">Este nome aparece para os outros jogadores da sala.</p>{currentHero&&<div className="coop-entry-hero"><img src={art(currentHero)} alt=""/><span><small>HERÓI DA CAMPANHA ATUAL</small><strong>{currentHero.nome}</strong></span></div>}</section><section className="panel"><h2>2. Criar ou entrar</h2><button className="primary" disabled={busy||!name.trim()} onClick={()=>void coop.create(name,g.heroId)}><Users/>Criar sala cooperativa</button><div className="coop-divider"><span/>OU<span/></div><label>Código da sala<input value={code} onChange={e=>setCode(normalizeRoomCode(e.target.value))} maxLength={6} placeholder="6 caracteres"/></label>{code&&code===codeFromLink&&<p className="coop-notice">Código preenchido pelo link de convite recebido.</p>}<button disabled={busy||!name.trim()||code.length!==6} onClick={()=>void coop.join(code,name,g.heroId)}>Entrar na sala</button>{notice&&<p className="coop-notice">{notice}</p>}</section></div></div>
 const followerGhosts=members.filter(member=>member.user_id!==room.host_id).map(member=>({id:member.user_id,spriteId:mapSpriteFor(member.hero_id)}))
 return <div className="coop-page coop-page-room">{modern?<><ScreenMasthead className="coop-masthead" assetUrl={assetUrl} art={SCENE_ART.party} eyebrow={`Social • Sala ${room.code}`} title="Cooperativo em tempo real" lead={<>A sala permanece conectada enquanto você usa os outros menus. {isHost?'Você lidera o grupo: escolha o destino e comece as batalhas quando todos estiverem prontos.':`${hostMember?.display_name??'O líder'} escolhe o destino e começa as batalhas.`}</>} stats={[{label:'Código da sala',value:room.code},{label:'Online',value:onlineCount||members.length},{label:'Integrantes',value:members.length}]}><CoopEmoteBar/></ScreenMasthead><CoopEmoteToast/></>:<section className="panel coop-hero"><div><span className="eyebrow">BANGALORE'S ONLINE</span><h1>Cooperativo em tempo real</h1><p>A sala permanece conectada enquanto você usa os outros menus.</p><CoopEmoteBar/></div><Wifi className="online"/><CoopEmoteToast/></section>}<section className="panel coop-room"><header><div><small>CÓDIGO DA SALA</small><strong>{room.code}</strong></div><button onClick={()=>navigator.clipboard?.writeText(room.code)}><Copy/>Copiar código</button><button onClick={()=>copyInviteLink(room.code)}><Link2/>{linkCopied?'Link copiado!':'Copiar link de convite'}</button><span className="coop-live"><Wifi/> {onlineCount||members.length} online</span><button className="danger-action" onClick={()=>void coop.leave()}><LogOut/>Sair</button></header><div className="coop-member-cards">{[...members].sort((a,b)=>Number(b.user_id===room.host_id)-Number(a.user_id===room.host_id)).map(member=>{
  const hero=HEROES.find(item=>item.id===member.hero_id),host=member.user_id===room.host_id,isMe=member.user_id===userId
  const vitals:MemberVitals|undefined=isMe?{hp:g.hp,maxHp:myMaxHp,level:levelInfo(g.xp).lvl,attack:attackValue(g),defense:defenseValue(g),shield:g.shield,locked:isNavigationLocked(g)}:memberVitals[member.user_id]
  const hpPct=vitals?Math.max(0,Math.min(100,vitals.hp/Math.max(1,vitals.maxHp)*100)):100,isDown=Boolean(vitals&&vitals.hp<=0),isLocked=Boolean(!isMe&&vitals?.locked)
  const doTransfer=()=>{if(window.confirm(`Repassar a liderança da sala para ${member.display_name}? Ela(e) passa a conduzir a exploração pelo mapa.`))void coop.transferHost(member.user_id)}
  return <article className={`coop-member-card${host?' coop-host':''}${isDown?' coop-down':''}`} key={member.id}>
   <div className="coop-member-card-portrait">{hero&&<img src={art(hero)} alt=""/>}<span>{host?<><Crown size={11}/>LÍDER</>:'AVENTUREIRO'}</span></div>
   <div className="coop-member-card-body">
    <header><strong>{member.display_name}{isMe?' (você)':''}</strong><b className="ready">PRONTO</b></header>
    <em>{hero?.nome??'—'}{vitals?.level?` • Nível ${vitals.level}`:''}</em>
    <div className="coop-hp-track"><div style={{width:`${hpPct}%`}}/></div>
    <div className="coop-member-stats">
     <span title="Vida"><Heart size={13}/>{vitals?`${vitals.hp}/${vitals.maxHp}`:'—'}</span>
     <span title="Ataque"><Sword size={13}/>{vitals?.attack??'—'}</span>
     <span title="Defesa"><ShieldHalf size={13}/>{vitals?.defense??'—'}{vitals?.shield?` +${vitals.shield}`:''}</span>
    </div>
    {isMe&&mySpecializations.length>0&&<span className="coop-specializations" title="Esses bônus já contam no seu ataque, defesa e vida durante o combate cooperativo">{mySpecializations.join(' • ')}</span>}
    {isDown&&<span className="coop-defeated-notice">Sem vida — precisa se recuperar</span>}
    {!isDown&&isLocked&&<span className="coop-locked-notice">Ocupado(a) em outra tela — não pode entrar em batalha agora</span>}
    {isHost&&!host&&<button className="coop-transfer-host-btn" disabled={busy} onClick={doTransfer}><ArrowLeftRight size={12}/>Repassar liderança</button>}
   </div>
  </article>
 })}</div><footer><p>Cada jogador na sala participa automaticamente; a experiência será proporcional ao dano causado.</p></footer></section><CoopExplorationPanel isHost={isHost} sharedRegionId={sharedRegionId} sharedMapPos={sharedMapPos} hostHeroId={hostMember?.hero_id} partyGhosts={followerGhosts}/><CoopMarketPanel members={members} userId={userId}/>{notice&&<p className="coop-notice">{notice}</p>}</div>
}
function CoopExplorationPanel({isHost,sharedRegionId,sharedMapPos,hostHeroId,partyGhosts}:{isHost:boolean;sharedRegionId:string;sharedMapPos?:MapPos;hostHeroId?:string;partyGhosts:Array<{id:string;spriteId:string}>}){
 const g=useGame(),coop=useCoop(),region=TERRITORIES.find(t=>t.id===sharedRegionId)??TERRITORIES[0],world=region.mundo??'havendown',worldLabel=COOP_WORLD_LABELS[world]??world
 const progression=[...TERRITORIES].sort(regionListSort),worldProgression=progression.filter(t=>(t.mundo??'havendown')===world),regionIndex=worldProgression.findIndex(t=>t.id===region.id),weaker=worldProgression[regionIndex-1],stronger=worldProgression[regionIndex+1]
 const subs=SUBREGIONS.filter(sub=>sub.regionId===region.id),memberProgress=(coop.room?.shared_state?.memberProgress??{}) as CoopMemberProgress,readySubs=subs.filter(sub=>coopSubProgress(sub,coop.members,memberProgress).ready).length
 const level=levelInfo(g.xp).lvl,moveToRegion=(target?:typeof TERRITORIES[number])=>{if(!isHost||!target)return;const map=getRegionMap(target.id);if(!map)return;const pos=g.regionMapPositions?.[target.id]??map.spawn;void coop.publishMapPos(target.id,pos.x,pos.y)}
 const mapNode=isHost?<CoopHostMap key={sharedRegionId} regionId={sharedRegionId}/>:(sharedMapPos?<CoopFollowerMap key={sharedMapPos.regionId} mapPos={sharedMapPos} hostHeroId={hostHeroId} partyGhosts={partyGhosts}/>:<p className="coop-notice">Aguardando o anfitrião iniciar a exploração...</p>)
 return <section className="coop-region-page">
  <section className="panel region-head coop-region-head"><div className="coop-region-mode"><Map size={16}/>{isHost?'Liderando':'Acompanhando'}</div><div><span className="eyebrow">COOP • {worldLabel.toUpperCase()} • DIFICULDADE {region.dificuldade}</span><h1>{region.nome}</h1><p>{region.descricao}</p></div><div className="region-side-actions"><div className="region-level"><small>Nível recomendado</small><strong>{region.nivelMin}–{region.nivelMax}</strong><span>Seu nível: {level}</span></div></div></section>
  <nav className="region-step-nav coop-region-step-nav" aria-label="Navegação cooperativa entre regiões"><button disabled={!isHost||!weaker} title={!isHost?'Somente o líder move a expedição.':undefined} onClick={()=>moveToRegion(weaker)}><ArrowLeft/><span><small>REGIÃO ANTERIOR</small><strong>{weaker?.nome??'Primeira região'}</strong>{weaker&&<em>Nível {weaker.nivelMin}–{weaker.nivelMax}</em>}</span></button><button disabled={!isHost||!stronger} title={!isHost?'Somente o líder move a expedição.':undefined} onClick={()=>moveToRegion(stronger)}><span><small>PRÓXIMA REGIÃO</small><strong>{stronger?.nome??'Última região'}</strong>{stronger&&<em>Nível {stronger.nivelMin}–{stronger.nivelMax}</em>}</span><ArrowRight/></button></nav>
  <div className="map-index-totals coop-region-totals"><span><Map/><small>REGIÃO</small><strong>{regionIndex+1}/{worldProgression.length}</strong></span><span><ScrollText/><small>SUB-REGIÕES</small><strong>{readySubs}/{subs.length}</strong></span><span><Trophy/><small>GRUPO</small><strong>{coop.members.length}</strong></span></div>
  <section className="panel coop-map-panel coop-map-panel-solo-layout"><div className="screen-intro"><small>EXPLORAÇÃO COMPARTILHADA</small><p>{isHost?'Ande pelo mapa com WASD ou setas. O grupo segue sua posição e entra nas mesmas emboscadas e batalhas.':'Você está vendo o mesmo mapa do líder. Passe o mouse pelos pins para ver o progresso e os detalhes de cada sub-região.'}</p></div>{mapNode}</section>
 </section>
}
// O Negociador: uma vitrine de itens (consumíveis e equipamentos) só entre quem está na MESMA
// sala agora (ver o tipo MarketListing em CoopContext.tsx pra entender por que não é uma troca
// assíncrona entre contas offline). Consumíveis são só um contador (inventory[id]) -- troca
// simples de qty. Equipamento é uma ref de instância única; a forja/gemas/elemento de uma ref
// vivem em Records separados no save (equipmentUpgrades, equipmentGems etc.), então o anúncio
// carrega um snapshot desses bônus (listing.forge) que a store re-key pra uma ref nova no
// comprador ao completar a compra (ver completeMarketEquipmentPurchase em game.ts) -- sem isso o
// bônus forjado desapareceria ao trocar de dono.
const MARKET_RARITY_LABEL:Record<string,string>={comum:'Comum',incomum:'Incomum',raro:'Raro',epico:'Épico',lendario:'Lendário',mitico:'Mítico',heroico:'Heróico'}
const MARKET_SLOT_LABEL:Record<Slot,string>={amuleto:'Amuleto',capacete:'Capacete',bolsa:'Bolsa',anel_1:'Anel 1',peitoral:'Peitoral',anel_2:'Anel 2',calcas:'Calças',mao_esquerda:'Mão esquerda',mao_direita:'Mão direita',botas:'Botas'}
const marketArt=(item?:{arte?:string;imagem?:string})=>item?.arte||item?.imagem?'./'+(item.arte??item.imagem):''
function CoopMarketPanel({members,userId}:{members:{user_id:string;display_name:string}[];userId:string}){
 const g=useGame(),coop=useCoop(),market=(coop.room?.shared_state?.market as MarketListing[]|undefined)??[]
 const ownedConsumables=Object.entries(g.inventory).filter(([,qty])=>qty>0).map(([id,qty])=>({id,qty,item:CONSUMABLES.find(c=>c.id===id)})).filter((entry):entry is {id:string;qty:number;item:(typeof CONSUMABLES)[number]}=>Boolean(entry.item))
 const ownedEquipment=g.equipmentBag.map(ref=>({ref,e:equipmentByRef(ref),upgrade:g.equipmentUpgrades[ref]??0,gems:g.equipmentGems[ref]?.length??0})).filter((entry):entry is {ref:string;e:NonNullable<ReturnType<typeof equipmentByRef>>;upgrade:number;gems:number}=>Boolean(entry.e)&&!g.lockedEquipment?.[entry.ref])
 const [kind,setKind]=React.useState<'consumable'|'equipment'>('consumable')
 const [itemId,setItemId]=React.useState(''),[qty,setQty]=React.useState(1),[price,setPrice]=React.useState(10)
 const pool=kind==='consumable'?ownedConsumables.map(entry=>entry.id):ownedEquipment.map(entry=>entry.ref)
 React.useEffect(()=>{if(!pool.includes(itemId))setItemId(pool[0]??'')},[kind,pool.join(',')])
 const selectedConsumable=ownedConsumables.find(entry=>entry.id===itemId)
 const selectedEquipment=ownedEquipment.find(entry=>entry.ref===itemId)
 const mine=market.filter(listing=>listing.sellerId===userId)
 const others=market.filter(listing=>listing.sellerId!==userId&&listing.status==='listed')
 const availableCount=kind==='consumable'?ownedConsumables.length:ownedEquipment.length
 const listedCount=market.filter(listing=>listing.status==='listed').length
 const equipmentLabel=(ref:string,forge?:{upgrade?:number;gems?:string[]})=>{
  const e=equipmentByRef(ref);if(!e)return ref
  const bits=[e.nome]
  if(forge?.upgrade)bits.push(`+${forge.upgrade}`)
  if(forge?.gems?.length)bits.push(`💎${forge.gems.length}`)
  return bits.join(' ')
 }
 const listingItem=(listing:MarketListing)=>listing.kind==='equipment'?equipmentByRef(listing.itemId):CONSUMABLES.find(c=>c.id===listing.itemId)
 const listingLabel=(listing:MarketListing)=>listing.kind==='equipment'?equipmentLabel(listing.itemId,listing.forge):CONSUMABLES.find(c=>c.id===listing.itemId)?.nome??listing.itemId
 const listingMeta=(listing:MarketListing)=>{
  if(listing.kind==='equipment'){const item=equipmentByRef(listing.itemId);return item?`${MARKET_SLOT_LABEL[item.slot]} • ${MARKET_RARITY_LABEL[item.raridade??'comum']}`:'Equipamento'}
  const item=CONSUMABLES.find(c=>c.id===listing.itemId)
  return `${item?.tipo??'Consumível'} • x${listing.qty}`
 }
 const selectedName=kind==='consumable'?selectedConsumable?.item.nome:selectedEquipment?equipmentLabel(selectedEquipment.ref,{upgrade:selectedEquipment.upgrade,gems:g.equipmentGems[selectedEquipment.ref]}):undefined
 const selectedImage=kind==='consumable'?marketArt(selectedConsumable?.item):marketArt(selectedEquipment?.e)
 const selectedMeta=kind==='consumable'?`${selectedConsumable?.qty??0} disponível${(selectedConsumable?.qty??0)===1?'':'is'}`:selectedEquipment?`${MARKET_SLOT_LABEL[selectedEquipment.e.slot]} • ${MARKET_RARITY_LABEL[selectedEquipment.e.raridade??'comum']}`:''
 const doList=async()=>{
  if(price<1)return
  if(kind==='consumable'){
   if(!selectedConsumable||qty<1||qty>selectedConsumable.qty)return
   if(!g.escrowMarketItem(itemId,qty))return
   try{await coop.listMarketItem(itemId,qty,price,'consumable');setQty(1);setPrice(10)}catch{g.refundMarketItem(itemId,qty)}
  }else{
   if(!selectedEquipment)return
   const snapshot=g.escrowMarketEquipment(itemId)
   if(snapshot===false)return
   try{await coop.listMarketItem(itemId,1,price,'equipment',snapshot);setPrice(10)}catch{g.refundMarketEquipment(itemId,snapshot)}
  }
 }
 const doCancel=async(listing:MarketListing)=>{
  try{
   await coop.cancelMarketListing(listing.id)
   if(listing.kind==='equipment')g.refundMarketEquipment(listing.itemId,listing.forge??{})
   else g.refundMarketItem(listing.itemId,listing.qty)
  }catch{}
 }
 const equipmentBagFull=g.equipmentBag.length>=equipmentBagCapacity(g)
 const doBuy=async(listing:MarketListing)=>{
  if(g.gold<listing.price)return
  if(listing.kind==='equipment'&&equipmentBagFull)return
  try{
   await coop.buyMarketListing(listing.id)
   if(listing.kind==='equipment')g.completeMarketEquipmentPurchase(listing.itemId,listing.price,listing.forge??{})
   else g.completeMarketPurchase(listing.itemId,listing.qty,listing.price)
  }catch{}
 }
 const renderListing=(listing:MarketListing,scope:'mine'|'group')=>{
  const item=listingItem(listing),image=marketArt(item),blocked=listing.kind==='equipment'&&equipmentBagFull,sold=listing.status!=='listed'
  return <article key={listing.id} className={`coop-market-listing-card${sold?' sold':''}`}>
   <span className="coop-market-card-art">{image?<img src={image} alt=""/>:<PackageSearch/>}</span>
   <span className="coop-market-card-copy">
    <small>{listingMeta(listing)}</small>
    <strong>{listingLabel(listing)}</strong>
    <em>{scope==='mine'?sold?`Vendido a ${listing.buyerName??'aventureiro'}`:'Seu anúncio':`de ${listing.sellerName}`}</em>
   </span>
   <span className="coop-market-listing-side">
    <b className="coop-market-row-price"><Coins size={13}/>{listing.price}</b>
    {scope==='mine'?(sold?<em>Repassando ouro...</em>:<button disabled={coop.busy} onClick={()=>void doCancel(listing)}><XCircle size={14}/>Cancelar</button>):<button className="primary" disabled={coop.busy||g.gold<listing.price||blocked} title={blocked?'Sua mochila de equipamentos está cheia.':g.gold<listing.price?'Ouro insuficiente.':undefined} onClick={()=>void doBuy(listing)}><ShoppingBag size={14}/>Comprar</button>}
   </span>
  </article>
 }
 return <section className="panel coop-market-panel">
  <header className="coop-market-head"><div><h2><PackageSearch size={18}/> O Negociador</h2><p>Itens da sala ficam em depósito até alguém comprar ou até o anúncio ser cancelado.</p></div><div className="coop-market-summary"><span><Coins/><small>SEU OURO</small><strong>{g.gold}</strong></span><span><ShoppingBag/><small>ANÚNCIOS</small><strong>{listedCount}</strong></span></div></header>
  <div className="coop-market-merchant npc-banner"><span className="npc-banner-portrait"><PackageSearch/></span><div className="npc-banner-copy"><span className="npc-banner-name">Otávio Marreco<small>Negociador itinerante da sala</small></span><p>"Sozinho eu só tenho tralha. Com um comprador do lado, isso vira comércio."</p></div></div>
  <div className="coop-market-grid">
   <section className="coop-market-block">
    <header className="coop-market-block-head"><div><small>SUA BOLSA</small><h3>Itens disponíveis</h3></div><b>{availableCount}</b></header>
    <div className="coop-market-kind-toggle">
     <button type="button" className={kind==='consumable'?'primary':''} onClick={()=>setKind('consumable')}>Consumíveis</button>
     <button type="button" className={kind==='equipment'?'primary':''} onClick={()=>setKind('equipment')}>Equipamentos</button>
    </div>
    <div className="coop-market-available-grid">
     {kind==='consumable'?ownedConsumables.map(entry=>{const image=marketArt(entry.item),selected=itemId===entry.id;return <button key={entry.id} type="button" className={`coop-market-item-card${selected?' selected':''}`} onClick={()=>{setItemId(entry.id);setQty(value=>Math.min(value,entry.qty))}}>
      <span className="coop-market-card-art">{image?<img src={image} alt=""/>:<PackageSearch/>}</span>
      <span className="coop-market-card-copy"><small>{MARKET_RARITY_LABEL[entry.item.raridade??'comum']} • Consumível</small><strong>{entry.item.nome}</strong><em>{entry.item.descricao}</em></span>
      <span className="coop-market-card-meta"><b>x{entry.qty}</b><small>{selected?'Selecionado':'Disponível'}</small></span>
     </button>}):ownedEquipment.map(entry=>{const image=marketArt(entry.e),selected=itemId===entry.ref;return <button key={entry.ref} type="button" className={`coop-market-item-card${selected?' selected':''}`} onClick={()=>setItemId(entry.ref)}>
      <span className="coop-market-card-art">{image?<img src={image} alt=""/>:<PackageSearch/>}</span>
      <span className="coop-market-card-copy"><small>{MARKET_SLOT_LABEL[entry.e.slot]} • {MARKET_RARITY_LABEL[entry.e.raridade??'comum']}</small><strong>{equipmentLabel(entry.ref,{upgrade:entry.upgrade,gems:g.equipmentGems[entry.ref]})}</strong><em>{entry.e.habilidade}</em></span>
      <span className="coop-market-card-meta"><b>{entry.upgrade?`+${entry.upgrade}`:'Base'}</b><small>{entry.gems?`${entry.gems} gemas`:'sem gemas'}</small></span>
     </button>})}
     {availableCount===0&&<p className="coop-market-empty">{kind==='consumable'?'Você não tem consumíveis na bolsa pra anunciar agora.':'Você não tem equipamentos livres na mochila pra anunciar agora.'}</p>}
    </div>
    <div className="coop-market-listing-form">
     <span className="coop-market-selected-preview">{selectedImage?<img src={selectedImage} alt=""/>:<PackageSearch/>}<span><small>{selectedMeta||'Selecione um item'}</small><strong>{selectedName??'Nada selecionado'}</strong></span></span>
     {kind==='consumable'&&<label>Qtd.<input type="number" min={1} max={selectedConsumable?.qty??1} value={qty} onChange={e=>setQty(Math.max(1,Math.min(selectedConsumable?.qty??1,Number(e.target.value)||1)))}/></label>}
     <label><Coins size={14}/>Preço<input type="number" min={1} value={price} onChange={e=>setPrice(Math.max(1,Number(e.target.value)||1))}/></label>
     <button className="primary" disabled={coop.busy||(kind==='consumable'?!selectedConsumable:!selectedEquipment)} onClick={doList}><Tag size={14}/>Anunciar</button>
    </div>
   </section>
   <section className="coop-market-block">
    <header className="coop-market-block-head"><div><small>VITRINE</small><h3>Anúncios da sala</h3></div><b>{market.length}</b></header>
    <div className="coop-market-list-sections">
     <div><small>SEUS ANÚNCIOS</small>{mine.length===0?<p className="coop-market-empty">Nenhum anúncio ativo.</p>:mine.map(listing=>renderListing(listing,'mine'))}</div>
     <div><small>VITRINE DO GRUPO</small>{others.length===0?<p className="coop-market-empty">Ninguém anunciou nada ainda.</p>:others.map(listing=>renderListing(listing,'group'))}</div>
    </div>
   </section>
  </div>
 </section>
}

// Mapa navegável do anfitrião: reaproveita o mesmo motor (TileWorldExplorer) e o save local do
// próprio anfitrião pra fogueiras/baús/alavancas/névoa (persistem na campanha dele, como no
// solo) -- só o que precisa ser compartilhado (posição e batalhas) é publicado na sala.
function CoopHostMap({regionId}:{regionId:string}){
 const g=useGame(),coop=useCoop(),map=getRegionMap(regionId)
 const subs=SUBREGIONS.filter(sub=>sub.regionId===regionId),region=TERRITORIES.find(t=>t.id===regionId)
 const [activeSub,setActiveSub]=React.useState<Subregion|undefined>(subs[0])
 const [encounterPrompt,setEncounterPrompt]=React.useState<Subregion|undefined>()
 const briefingModern=useUiMode()==='modern'
 const [ambushPrompt,setAmbushPrompt]=React.useState<{enemy:Enemy;subregionId:string}|undefined>()
 const [chestNotice,setChestNotice]=React.useState<string|undefined>()
 const memberProgress=(coop.room?.shared_state?.memberProgress??{}) as CoopMemberProgress
 const subProgress=(sub:Subregion)=>coopSubProgress(sub,coop.members,memberProgress)
 const allHaveSubProgress=(sub:Subregion)=>subProgress(sub).ready
 const regionRequired=subs.reduce((sum,sub)=>sum+sub.encontrosNecessarios,0)
 const allHaveRegionProgress=coop.members.length>0&&coop.members.every(member=>subs.reduce((sum,sub)=>sum+(memberProgress[member.user_id]?.[sub.id]??0),0)>=regionRequired)
 const subBattlesLeft=(sub:Subregion)=>subProgress(sub).left
 const level=levelInfo(g.xp).lvl
 React.useEffect(()=>setActiveSub(subs[0]),[regionId])
 const knownTiles=g.exploredMapTiles?.[regionId]
 const exploredSet=React.useMemo(()=>knownTiles?new Set(knownTiles):new Set<string>(),[knownTiles])
 if(!map||!region)return null
 const initialPos=g.regionMapPositions?.[regionId]??map.spawn
 const partyGhosts=coop.members.filter(member=>member.user_id!==coop.userId).map(member=>({id:member.user_id,spriteId:mapSpriteFor(member.hero_id)}))
 const worldProgression=[...TERRITORIES].filter(t=>(t.mundo??'havendown')===(region.mundo??'havendown')).sort(regionListSort)
 const regionIndex=worldProgression.findIndex(t=>t.id===region.id),exitTargets={prev:worldProgression[regionIndex-1],next:worldProgression[regionIndex+1]} as const
 const regionExits=(map.exits??[]).flatMap(exit=>{const target=exit.targetRegionId?TERRITORIES.find(t=>t.id===exit.targetRegionId):exitTargets[exit.id as 'prev'|'next'];return target?[{...exit,label:target.nome,region:target,theme:REGION_UI_THEME[target.id]}]:[]})
 const handleEnter=(subId:string)=>{const sub=subs.find(s=>s.id===subId);if(sub){setActiveSub(sub);setEncounterPrompt(sub)}}
 const handleExit=(exitId:string)=>{const exit=regionExits.find(item=>item.id===exitId);if(!exit)return;const nextMap=getRegionMap(exit.region.id);if(!nextMap)return;const nextPos=g.regionMapPositions?.[exit.region.id]??nextMap.spawn;void coop.publishMapPos(exit.region.id,nextPos.x,nextPos.y)}
 const handleAmbush=(nearestSubId:string)=>{if(ambushPrompt)return;const sub=subs.find(s=>s.id===nearestSubId);const enemy=sub&&buildCoopEnemy(sub.id,level,g.difficultyMode,coop.members.length);if(sub&&enemy)setAmbushPrompt({enemy,subregionId:sub.id})}
 const locationStatus=(subId:string):'done'|'ready'|'default'=>{const sub=subs.find(s=>s.id===subId);if(!sub)return'default';if(g.subregionBossesDefeated.includes(sub.id))return'done';return allHaveSubProgress(sub)?'ready':'default'}
 const locationDetails=(subId:string)=>{const sub=subs.find(s=>s.id===subId);if(!sub)return undefined;const progress=subProgress(sub),danger=coopDangerFor(level,sub.nivelMin,sub.nivelMax);return{name:sub.nome,description:sub.descricao,loot:sub.temaLoot,challenges:sub.desafios,levelLabel:`Nível ${sub.nivelMin}-${sub.nivelMax}`,difficultyLabel:danger.label,wins:progress.minimum,required:progress.required,bossName:sub.chefe.nome,bossDefeated:g.subregionBossesDefeated.includes(sub.id)}}
 const handleOpenChest=(chest:{id:string;name:string;x:number;y:number;icon?:string;contents:{gold:number;materials?:Record<string,number>;consumables?:Record<string,number>}})=>{if(!g.openMapChest(chest.id,chest))return;setChestNotice(useGame.getState().explorationNote)}
 const acceptAmbush=()=>{if(!ambushPrompt)return;const{enemy,subregionId}=ambushPrompt;setAmbushPrompt(undefined);void coop.startMapBattle(subregionId,enemy as unknown as Record<string,unknown>)}
 const fleeAmbush=()=>{if(!ambushPrompt)return;const roll=1+Math.floor(Math.random()*6);if(roll>=5){setAmbushPrompt(undefined);return}acceptAmbush()}
 const explore=()=>{if(!encounterPrompt)return;const sub=encounterPrompt,bossReady=allHaveSubProgress(sub);setEncounterPrompt(undefined);const enemy=bossReady?buildCoopSubregionBoss(sub.id,g.difficultyMode,coop.members.length):buildCoopEnemy(sub.id,level,g.difficultyMode,coop.members.length);if(enemy)void coop.startMapBattle(sub.id,enemy as unknown as Record<string,unknown>)}
 const handleRegionBoss=()=>{const sub=activeSub??subs[0];if(!sub)return;const enemy=buildCoopRegionBoss(regionId,g.difficultyMode,coop.members.length);if(enemy)void coop.startMapBattle(sub.id,enemy as unknown as Record<string,unknown>)}
 const selectedSub=activeSub??subs[0],selectedProgress=selectedSub?subProgress(selectedSub):undefined,selectedDanger=selectedSub?coopDangerFor(level,selectedSub.nivelMin,selectedSub.nivelMax):undefined
 // Resumo do chefe e do grupo (modo Moderno): o chefe é o mesmo que "Enfrentar chefe" vai criar, já escalado pelo grupo.
 const bossBriefing=(sub:Subregion)=>{const boss=buildCoopSubregionBoss(sub.id,g.difficultyMode,coop.members.length);if(!boss)return null;const vitals=(coop.room?.shared_state?.memberVitals??{}) as Record<string,{hp:number;maxHp:number;level?:number;locked?:boolean}>;return <CoopBossBriefing boss={boss} weapon={heroWeaponElement(g)} members={coop.members.map(member=>{const isMe=member.user_id===coop.userId,v=vitals[member.user_id];return{userId:member.user_id,name:member.display_name??'Aventureiro',hp:isMe?g.hp:(v?.hp??0),maxHp:isMe?maxHp(g):(v?.maxHp??1),level:isMe?levelInfo(g.xp).lvl:v?.level,locked:isMe?false:Boolean(v?.locked)}})}/>}
 const encounterDialog=encounterPrompt&&<div className="regionmap-encounter-backdrop" onClick={()=>setEncounterPrompt(undefined)}><section className="regionmap-encounter-prompt" onClick={event=>event.stopPropagation()}><span className="eyebrow">{allHaveSubProgress(encounterPrompt)?'CHEFE DA SUB-REGIÃO':'PONTO DE EXPLORAÇÃO'}</span><h2>{encounterPrompt.nome}</h2><p>{encounterPrompt.descricao}</p>{briefingModern&&allHaveSubProgress(encounterPrompt)&&bossBriefing(encounterPrompt)}<div><button onClick={()=>setEncounterPrompt(undefined)}>Continuar explorando</button><button className="primary" onClick={explore}>{allHaveSubProgress(encounterPrompt)?'Enfrentar chefe':'Explorar (buscar combate)'}</button></div></section></div>
 const ambushDialog=ambushPrompt&&<div className="regionmap-encounter-backdrop"><section className="regionmap-ambush-prompt"><span className="eyebrow">EMBOSCADA</span><h2>O grupo foi atacado!</h2><div className="regionmap-ambush-enemy"><img src={art(ambushPrompt.enemy)} alt={ambushPrompt.enemy.nome}/><div><strong>{ambushPrompt.enemy.nome}</strong><small>Nível {(ambushPrompt.enemy as any).nivel??ambushPrompt.enemy.dificuldade}</small></div></div><p>Um inimigo surge e bloqueia o caminho do grupo. Fugir usa a mesma chance de uma fuga em combate.</p><div><button onClick={fleeAmbush}>Tentar fugir</button><button className="primary" onClick={acceptAmbush}>Aceitar o desafio</button></div></section></div>
 const chestDialog=chestNotice&&<div className="regionmap-encounter-backdrop" onClick={()=>setChestNotice(undefined)}><section className="regionmap-chest-prompt" onClick={event=>event.stopPropagation()}><span className="eyebrow">BAÚ ABERTO</span><p>{chestNotice}</p><button className="primary" onClick={()=>setChestNotice(undefined)}>Continuar</button></section></div>
 return <div className="regionmap-shell coop-map-shell">
  <div className="regionmap-stage"><div className="regionmap-stage-title"><Map size={18}/><span>Região de {region.nome}</span></div>
   <TileWorldExplorer map={map} playerSprite={mapSpriteFor(g.heroId)} initialPosition={initialPos} paused={Boolean(encounterPrompt||ambushPrompt||chestNotice)}
    onEnterLocation={handleEnter} locationStatus={locationStatus} locationDetails={locationDetails} exits={regionExits} onEnterExit={handleExit} onAmbush={handleAmbush}
    onPositionChange={pos=>{g.setRegionMapPosition(regionId,pos);void coop.publishMapPos(regionId,pos.x,pos.y)}}
    openedChests={g.openedChests} onOpenChest={handleOpenChest} onRestCampfire={campfire=>g.restAtCampfire(regionId,campfire)} onCampfireTick={()=>g.campfireHealTick()}
    exploredTiles={exploredSet} onExplore={tiles=>g.revealMapTiles(regionId,tiles)} defeatedWanderers={g.defeatedWanderers}
    customPins={g.customPins?.[regionId]} onTogglePin={(x,y)=>g.toggleCustomPin(regionId,x,y)}
    activatedLevers={g.activatedLevers} onActivateLever={leverId=>g.activateLever(leverId)}
    discoveredSecrets={g.discoveredSecrets} onDiscoverSecret={key=>g.discoverSecret(key)}
    partyGhosts={partyGhosts}/>
  </div>
  <aside className="regionmap-inspector coop-map-inspector"><span className="eyebrow">LOCAL DO GRUPO</span><h2>{selectedSub?.nome??region.nome}</h2>
   {selectedSub&&<div className="regionmap-inspector-preview" style={{backgroundImage:`url(${map.background})`}}><span>{selectedSub.icone}</span></div>}
   <p>{selectedSub?.descricao??'Ande até um marcador para iniciar a exploração compartilhada.'}</p>
   {selectedSub&&selectedProgress&&selectedDanger&&<div className="regionmap-details"><div><small>GRUPO</small><strong>{selectedProgress.minimum}/{selectedProgress.required}</strong></div><div><small>PERIGO</small><strong className={`danger-${selectedDanger.cls}`}>{selectedDanger.label}</strong></div><div><small>CHEFE</small><strong>{selectedProgress.ready?'Liberado':'Oculto'}</strong></div></div>}
   {selectedSub&&<div className="regionmap-loot"><small>RECOMPENSAS</small><span>{selectedSub.temaLoot}</span></div>}
   <div className="coop-region-progress">{subs.map(loc=>{const left=subBattlesLeft(loc);return <div key={loc.id} className={loc.id===selectedSub?.id?'active':''}><small>{loc.nome}</small><strong className={left?'':'ready'}>{left?`Faltam ${left}`:'Chefe liberado'}</strong></div>})}</div>
   <button className={allHaveRegionProgress?'primary boss-button':'primary'} disabled={!allHaveRegionProgress} onClick={handleRegionBoss}>{allHaveRegionProgress?'ENFRENTAR CHEFE DA REGIÃO':'Chefe da região bloqueado'}</button>
  </aside>
  {encounterDialog}
  {ambushDialog}
  {chestDialog}
 </div>
}

// Visão dos demais integrantes: o mesmo mapa/arte do anfitrião, mas sem nenhuma entrada
// (paused) -- a posição é só espelhada de shared_state.mapPos, então o próprio "sprite
// principal" do TileWorldExplorer aqui representa o líder, e os fantasmas do grupo (inclusive
// o próprio jogador) aparecem ao lado dele.
function CoopFollowerMap({mapPos,hostHeroId,partyGhosts}:{mapPos:MapPos;hostHeroId?:string;partyGhosts:Array<{id:string;spriteId:string}>}){
 const g=useGame(),coop=useCoop(),map=getRegionMap(mapPos.regionId),subs=SUBREGIONS.filter(sub=>sub.regionId===mapPos.regionId),memberProgress=(coop.room?.shared_state?.memberProgress??{}) as CoopMemberProgress
 if(!map)return <p className="coop-notice">Aguardando o anfitrião iniciar a exploração...</p>
 const subProgress=(sub:Subregion)=>coopSubProgress(sub,coop.members,memberProgress)
 const locationStatus=(subId:string):'done'|'ready'|'default'=>{const sub=subs.find(s=>s.id===subId);if(!sub)return'default';if(g.subregionBossesDefeated.includes(sub.id))return'done';return subProgress(sub).ready?'ready':'default'}
 const locationDetails=(subId:string)=>{const sub=subs.find(s=>s.id===subId);if(!sub)return undefined;const progress=subProgress(sub),level=levelInfo(g.xp).lvl,danger=coopDangerFor(level,sub.nivelMin,sub.nivelMax);return{name:sub.nome,description:sub.descricao,loot:sub.temaLoot,challenges:sub.desafios,levelLabel:`Nível ${sub.nivelMin}-${sub.nivelMax}`,difficultyLabel:danger.label,wins:progress.minimum,required:progress.required,bossName:sub.chefe.nome,bossDefeated:g.subregionBossesDefeated.includes(sub.id)}}
 return <div className="regionmap-shell coop-map-shell coop-map-follower">
  <div className="regionmap-stage"><div className="regionmap-stage-title"><Map size={18}/><span>Seguindo o líder pela região</span></div>
   <TileWorldExplorer map={map} playerSprite={mapSpriteFor(hostHeroId)} paused externalPosition={{x:mapPos.x,y:mapPos.y}} onEnterLocation={()=>{}} locationStatus={locationStatus} locationDetails={locationDetails} partyGhosts={partyGhosts}/>
  </div>
  <aside className="regionmap-inspector coop-map-inspector"><span className="eyebrow">MODO ACOMPANHAMENTO</span><p>Você segue o anfitrião pelo mapa e recebe os mesmos acessos, emboscadas, chefes e recompensas do grupo -- sem precisar controlar o movimento.</p></aside>
 </div>
}
