import React from 'react'
import { ArrowLeftRight, Coins, Copy, Crown, Heart, Link2, LogOut, Map, PackageSearch, ShieldHalf, Sword, Users, Wifi, WifiOff } from 'lucide-react'
import { attackValue, buildCoopEnemy, buildCoopRegionBoss, buildCoopSubregionBoss, CONSUMABLES, defenseValue, equipmentBagCapacity, equipmentByRef, HEROES, hasCraftedEffect, heroResistances, heroWeaponAnimationType, isNavigationLocked, levelInfo, maxHp, regionListSort, SUBREGIONS, TERRITORIES, useGame } from '../store/game'
import { SPECIALIZATION_CHOICES } from '../data/expansion'
import type { Enemy, Subregion } from '../types'
import { normalizeRoomCode, onlineConfigured } from './supabase'
import { useCoop, type MarketListing } from './CoopContext'
import { getRegionMap, TileWorldExplorer } from '../regionMap'

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

export default function PersistentCoopScreen(){
 // Link de convite: ?coop=CODIGO na URL pré-preenche o campo de código, então quem recebe
 // o link só precisa digitar o nome e confirmar -- em vez de copiar/digitar 6 caracteres.
 const codeFromLink=React.useMemo(()=>normalizeRoomCode(new URLSearchParams(location.search).get('coop')??''),[])
 const g=useGame(),coop=useCoop(),[name,setName]=React.useState(()=>{try{return localStorage.getItem('bangalores-coop-name')??''}catch{return ''}}),[code,setCode]=React.useState(codeFromLink),[linkCopied,setLinkCopied]=React.useState(false),publishedProgress=React.useRef('')
 const copyInviteLink=(roomCode:string)=>{const url=new URL(location.href);url.search='';url.searchParams.set('coop',roomCode);navigator.clipboard?.writeText(url.toString());setLinkCopied(true);setTimeout(()=>setLinkCopied(false),2000)}
 const {room,members,userId,onlineCount,busy,notice}=coop,me=members.find(member=>member.user_id===userId),isHost=room?.host_id===userId,hostMember=members.find(member=>member.user_id===room?.host_id)
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
 if(!onlineConfigured)return <div className="coop-page"><section className="panel coop-setup"><WifiOff/><h2>Serviço online ainda não conectado</h2></section></div>
 if(!room)return <div className="coop-page"><section className="panel coop-hero"><div><span className="eyebrow">BANGALORE'S ONLINE</span><h1>Cooperativo em tempo real</h1></div><Wifi className="online"/></section><div className="coop-entry"><section className="panel"><h2>Seu aventureiro</h2><label>Nome visível<input maxLength={24} value={name} onChange={e=>setName(e.target.value)}/></label></section><section className="panel"><h2>Criar ou entrar</h2><button className="primary" disabled={busy||!name.trim()} onClick={()=>void coop.create(name,g.heroId)}><Users/>Criar sala cooperativa</button><div className="coop-divider"><span/>OU<span/></div><label>Código da sala<input value={code} onChange={e=>setCode(normalizeRoomCode(e.target.value))} maxLength={6}/></label>{code&&code===codeFromLink&&<p className="coop-notice">Código preenchido pelo link de convite recebido.</p>}<button disabled={busy||!name.trim()||code.length!==6} onClick={()=>void coop.join(code,name,g.heroId)}>Entrar na sala</button>{notice&&<p className="coop-notice">{notice}</p>}</section></div></div>
 const followerGhosts=members.filter(member=>member.user_id!==room.host_id).map(member=>({id:member.user_id,spriteId:mapSpriteFor(member.hero_id)}))
 return <div className="coop-page coop-page-room"><section className="panel coop-hero"><div><span className="eyebrow">BANGALORE'S ONLINE</span><h1>Cooperativo em tempo real</h1><p>A sala permanece conectada enquanto você usa os outros menus.</p><CoopEmoteBar/></div><Wifi className="online"/><CoopEmoteToast/></section><section className="panel coop-room"><header><div><small>CÓDIGO DA SALA</small><strong>{room.code}</strong></div><button onClick={()=>navigator.clipboard?.writeText(room.code)}><Copy/>Copiar código</button><button onClick={()=>copyInviteLink(room.code)}><Link2/>{linkCopied?'Link copiado!':'Copiar link de convite'}</button><span className="coop-live"><Wifi/> {onlineCount||members.length} online</span><button className="danger-action" onClick={()=>void coop.leave()}><LogOut/>Sair</button></header><div className="coop-member-cards">{[...members].sort((a,b)=>Number(b.user_id===room.host_id)-Number(a.user_id===room.host_id)).map(member=>{
  const hero=HEROES.find(item=>item.id===member.hero_id),host=member.user_id===room.host_id,isMe=member.user_id===userId
  const vitals:MemberVitals|undefined=isMe?{hp:g.hp,maxHp:myMaxHp,level:levelInfo(g.xp).lvl,attack:attackValue(g),defense:defenseValue(g),shield:g.shield,locked:isNavigationLocked(g)}:memberVitals[member.user_id]
  const hpPct=vitals?Math.max(0,Math.min(100,vitals.hp/Math.max(1,vitals.maxHp)*100)):100,isDown=Boolean(vitals&&vitals.hp<=0),isLocked=Boolean(!isMe&&vitals?.locked)
  const doTransfer=()=>{if(window.confirm(`Repassar a liderança da sala para ${member.display_name}? Ela(e) passa a conduzir a exploração pelo mapa.`))void coop.transferHost(member.user_id)}
  return <article className={`coop-member-card${host?' coop-host':''}${isDown?' coop-down':''}`} key={member.id}>
   <div className="coop-member-card-portrait">{hero&&<img src={art(hero)} alt=""/>}<span>{host?<><Crown size={11}/>LÍDER</>:'AVENTUREIRO'}</span></div>
   <div className="coop-member-card-body">
    <header><strong>{member.display_name}{isMe?' (você)':''}</strong><b className={member.ready?'ready':''}>{member.ready?'PRONTO':'PREPARANDO'}</b></header>
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
 })}</div><footer><p>Cada jogador atualiza sua campanha; a experiência será proporcional ao dano causado.</p><button className="primary" disabled={!me||busy} onClick={()=>void coop.toggleReady(g.heroId)}>{me?.ready?'Cancelar prontidão':'Marcar como pronto'}</button></footer></section><section className="panel coop-map-panel"><h2><Map size={17}/> Exploração compartilhada</h2><p>{isHost?'Você lidera a expedição: ande pelo mapa com as setas/WASD -- o grupo te segue e entra nas mesmas emboscadas e batalhas.':'Você está seguindo o líder da sala pelo mapa. Emboscadas e chefes acontecem automaticamente para o grupo todo.'}</p>{isHost?<CoopHostMap key={sharedRegionId} regionId={sharedRegionId}/>:(sharedMapPos?<CoopFollowerMap key={sharedMapPos.regionId} mapPos={sharedMapPos} hostHeroId={hostMember?.hero_id} partyGhosts={followerGhosts}/>:<p className="coop-notice">Aguardando o anfitrião iniciar a exploração...</p>)}</section><CoopMarketPanel members={members} userId={userId}/>{notice&&<p className="coop-notice">{notice}</p>}</div>
}
// O Negociador: uma vitrine de itens (consumíveis e equipamentos) só entre quem está na MESMA
// sala agora (ver o tipo MarketListing em CoopContext.tsx pra entender por que não é uma troca
// assíncrona entre contas offline). Consumíveis são só um contador (inventory[id]) -- troca
// simples de qty. Equipamento é uma ref de instância única; a forja/gemas/elemento de uma ref
// vivem em Records separados no save (equipmentUpgrades, equipmentGems etc.), então o anúncio
// carrega um snapshot desses bônus (listing.forge) que a store re-key pra uma ref nova no
// comprador ao completar a compra (ver completeMarketEquipmentPurchase em game.ts) -- sem isso o
// bônus forjado desapareceria ao trocar de dono.
const EQUIPMENT_RARITY_LABEL:Record<string,string>={comum:'Comum',incomum:'Incomum',raro:'Raro',epico:'Épico',lendario:'Lendário',mitico:'Mítico',heroico:'Heróico'}
function CoopMarketPanel({members,userId}:{members:{user_id:string;display_name:string}[];userId:string}){
 const g=useGame(),coop=useCoop(),market=(coop.room?.shared_state?.market as MarketListing[]|undefined)??[]
 const ownedConsumables=Object.entries(g.inventory).filter(([,qty])=>qty>0).map(([id,qty])=>({id,qty,item:CONSUMABLES.find(c=>c.id===id)})).filter(entry=>entry.item)
 const ownedEquipment=g.equipmentBag.map(ref=>({ref,e:equipmentByRef(ref),upgrade:g.equipmentUpgrades[ref]??0,gems:g.equipmentGems[ref]?.length??0})).filter(entry=>entry.e&&!g.lockedEquipment?.[entry.ref])
 const [kind,setKind]=React.useState<'consumable'|'equipment'>('consumable')
 const [itemId,setItemId]=React.useState(''),[qty,setQty]=React.useState(1),[price,setPrice]=React.useState(10)
 const pool=kind==='consumable'?ownedConsumables.map(entry=>entry.id):ownedEquipment.map(entry=>entry.ref)
 React.useEffect(()=>{if(!pool.includes(itemId))setItemId(pool[0]??'')},[kind,pool.join(',')])
 const selectedConsumable=ownedConsumables.find(entry=>entry.id===itemId)
 const selectedEquipment=ownedEquipment.find(entry=>entry.ref===itemId)
 const mine=market.filter(listing=>listing.sellerId===userId)
 const others=market.filter(listing=>listing.sellerId!==userId&&listing.status==='listed')
 const equipmentLabel=(ref:string,forge?:{upgrade?:number;gems?:string[]})=>{
  const e=equipmentByRef(ref);if(!e)return ref
  const bits=[e.nome]
  if(forge?.upgrade)bits.push(`+${forge.upgrade}`)
  if(forge?.gems?.length)bits.push(`💎${forge.gems.length}`)
  return bits.join(' ')
 }
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
 return <section className="panel coop-market-panel">
  <h2><PackageSearch size={17}/> O Negociador</h2>
  <div className="panel npc-banner"><span className="npc-banner-portrait"><PackageSearch/></span><div className="npc-banner-copy"><span className="npc-banner-name">Otávio Marreco<small>Negociador itinerante da sala</small></span><p>"Sozinho eu só tenho tralha. Com um comprador do lado, isso vira comércio."</p></div></div>
  <p className="coop-market-hint">Anuncie consumíveis ou equipamentos da sua bolsa pro resto do grupo comprar com ouro. Só funciona enquanto vocês estiverem juntos nesta sala -- ao anunciar, o item sai da sua bolsa na hora; cancelando, ele volta.</p>
  <div className="coop-market-kind-toggle">
   <button type="button" className={kind==='consumable'?'primary':''} onClick={()=>setKind('consumable')}>Consumíveis</button>
   <button type="button" className={kind==='equipment'?'primary':''} onClick={()=>setKind('equipment')}>Equipamentos</button>
  </div>
  {kind==='consumable'?(ownedConsumables.length>0?<div className="coop-market-form">
   <select value={itemId} onChange={e=>setItemId(e.target.value)}>{ownedConsumables.map(entry=><option key={entry.id} value={entry.id}>{entry.item!.nome} (x{entry.qty})</option>)}</select>
   <input type="number" min={1} max={selectedConsumable?.qty??1} value={qty} onChange={e=>setQty(Math.max(1,Math.min(selectedConsumable?.qty??1,Number(e.target.value)||1)))} title="Quantidade"/>
   <label className="coop-market-price"><Coins size={14}/><input type="number" min={1} value={price} onChange={e=>setPrice(Math.max(1,Number(e.target.value)||1))} title="Preço em ouro"/></label>
   <button className="primary" disabled={coop.busy||!selectedConsumable} onClick={doList}>Anunciar</button>
  </div>:<p className="coop-market-empty">Você não tem consumíveis na bolsa pra anunciar agora.</p>)
  :(ownedEquipment.length>0?<div className="coop-market-form">
   <select value={itemId} onChange={e=>setItemId(e.target.value)}>{ownedEquipment.map(entry=><option key={entry.ref} value={entry.ref}>{equipmentLabel(entry.ref,{upgrade:entry.upgrade,gems:g.equipmentGems[entry.ref]})} — {EQUIPMENT_RARITY_LABEL[entry.e!.raridade??'comum']}</option>)}</select>
   <label className="coop-market-price"><Coins size={14}/><input type="number" min={1} value={price} onChange={e=>setPrice(Math.max(1,Number(e.target.value)||1))} title="Preço em ouro"/></label>
   <button className="primary" disabled={coop.busy||!selectedEquipment} onClick={doList}>Anunciar</button>
  </div>:<p className="coop-market-empty">Você não tem equipamentos livres na mochila pra anunciar agora.</p>)}
  <div className="coop-market-lists">
   <div>
    <small>SEUS ANÚNCIOS</small>
    {mine.length===0&&<p className="coop-market-empty">Nenhum anúncio ativo.</p>}
    {mine.map(listing=>{const label=listing.kind==='equipment'?equipmentLabel(listing.itemId,listing.forge):`${CONSUMABLES.find(c=>c.id===listing.itemId)?.nome??listing.itemId}`;return <article key={listing.id} className="coop-market-row">
     <span><strong>{label}</strong>{listing.kind!=='equipment'&&` x${listing.qty}`}</span>
     <span className="coop-market-row-price"><Coins size={13}/>{listing.price}</span>
     {listing.status==='listed'?<button disabled={coop.busy} onClick={()=>void doCancel(listing)}>Cancelar</button>:<em>Vendido a {listing.buyerName} — repassando ouro...</em>}
    </article>})}
   </div>
   <div>
    <small>VITRINE DO GRUPO</small>
    {others.length===0&&<p className="coop-market-empty">Ninguém anunciou nada ainda.</p>}
    {others.map(listing=>{const label=listing.kind==='equipment'?equipmentLabel(listing.itemId,listing.forge):`${CONSUMABLES.find(c=>c.id===listing.itemId)?.nome??listing.itemId}`,blocked=listing.kind==='equipment'&&equipmentBagFull;return <article key={listing.id} className="coop-market-row">
     <span><strong>{label}</strong>{listing.kind!=='equipment'&&` x${listing.qty}`} <em>de {listing.sellerName}</em></span>
     <span className="coop-market-row-price"><Coins size={13}/>{listing.price}</span>
     <button className="primary" disabled={coop.busy||g.gold<listing.price||blocked} title={blocked?'Sua mochila de equipamentos está cheia.':undefined} onClick={()=>void doBuy(listing)}>Comprar</button>
    </article>})}
   </div>
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
 const [ambushPrompt,setAmbushPrompt]=React.useState<{enemy:Enemy;subregionId:string}|undefined>()
 const [chestNotice,setChestNotice]=React.useState<string|undefined>()
 const memberProgress=(coop.room?.shared_state?.memberProgress??{}) as Record<string,Record<string,number>>
 const allHaveSubProgress=(sub:Subregion)=>coop.members.length>=2&&coop.members.every(member=>(memberProgress[member.user_id]?.[sub.id]??0)>=sub.encontrosNecessarios)
 const regionRequired=subs.reduce((sum,sub)=>sum+sub.encontrosNecessarios,0)
 const allHaveRegionProgress=coop.members.length>=2&&coop.members.every(member=>subs.reduce((sum,sub)=>sum+(memberProgress[member.user_id]?.[sub.id]??0),0)>=regionRequired)
 const subBattlesLeft=(sub:Subregion)=>coop.members.length?Math.max(0,sub.encontrosNecessarios-Math.min(...coop.members.map(member=>memberProgress[member.user_id]?.[sub.id]??0))):sub.encontrosNecessarios
 const level=levelInfo(g.xp).lvl
 React.useEffect(()=>setActiveSub(subs[0]),[regionId])
 const knownTiles=g.exploredMapTiles?.[regionId]
 const exploredSet=React.useMemo(()=>knownTiles?new Set(knownTiles):new Set<string>(),[knownTiles])
 if(!map||!region)return null
 const initialPos=g.regionMapPositions?.[regionId]??map.spawn
 const partyGhosts=coop.members.filter(member=>member.user_id!==coop.userId).map(member=>({id:member.user_id,spriteId:mapSpriteFor(member.hero_id)}))
 const worldProgression=[...TERRITORIES].filter(t=>(t.mundo??'havendown')===(region.mundo??'havendown')).sort(regionListSort)
 const regionIndex=worldProgression.findIndex(t=>t.id===region.id),exitTargets={prev:worldProgression[regionIndex-1],next:worldProgression[regionIndex+1]} as const
 const regionExits=(map.exits??[]).flatMap(exit=>{const target=exit.targetRegionId?TERRITORIES.find(t=>t.id===exit.targetRegionId):exitTargets[exit.id as 'prev'|'next'];return target?[{...exit,label:target.nome,region:target}]:[]})
 const handleEnter=(subId:string)=>{const sub=subs.find(s=>s.id===subId);if(sub){setActiveSub(sub);setEncounterPrompt(sub)}}
 const handleExit=(exitId:string)=>{const exit=regionExits.find(item=>item.id===exitId);if(!exit)return;const nextMap=getRegionMap(exit.region.id);if(!nextMap)return;const nextPos=g.regionMapPositions?.[exit.region.id]??nextMap.spawn;void coop.publishMapPos(exit.region.id,nextPos.x,nextPos.y)}
 const handleAmbush=(nearestSubId:string)=>{if(ambushPrompt)return;const sub=subs.find(s=>s.id===nearestSubId);const enemy=sub&&buildCoopEnemy(sub.id,level,g.difficultyMode,coop.members.length);if(sub&&enemy)setAmbushPrompt({enemy,subregionId:sub.id})}
 const locationStatus=(subId:string):'ready'|'default'=>{const sub=subs.find(s=>s.id===subId);return sub&&allHaveSubProgress(sub)?'ready':'default'}
 const handleOpenChest=(chest:{id:string;name:string;x:number;y:number;icon?:string;contents:{gold:number;materials?:Record<string,number>;consumables?:Record<string,number>}})=>{if(!g.openMapChest(chest.id,chest))return;setChestNotice(useGame.getState().explorationNote)}
 const acceptAmbush=()=>{if(!ambushPrompt)return;const{enemy,subregionId}=ambushPrompt;setAmbushPrompt(undefined);void coop.startMapBattle(subregionId,enemy as unknown as Record<string,unknown>)}
 const fleeAmbush=()=>{if(!ambushPrompt)return;const roll=1+Math.floor(Math.random()*6);if(roll>=5){setAmbushPrompt(undefined);return}acceptAmbush()}
 const explore=()=>{if(!encounterPrompt)return;const sub=encounterPrompt,bossReady=allHaveSubProgress(sub);setEncounterPrompt(undefined);const enemy=bossReady?buildCoopSubregionBoss(sub.id,g.difficultyMode,coop.members.length):buildCoopEnemy(sub.id,level,g.difficultyMode,coop.members.length);if(enemy)void coop.startMapBattle(sub.id,enemy as unknown as Record<string,unknown>)}
 const handleRegionBoss=()=>{const sub=activeSub??subs[0];if(!sub)return;const enemy=buildCoopRegionBoss(regionId,g.difficultyMode,coop.members.length);if(enemy)void coop.startMapBattle(sub.id,enemy as unknown as Record<string,unknown>)}
 const encounterDialog=encounterPrompt&&<div className="regionmap-encounter-backdrop" onClick={()=>setEncounterPrompt(undefined)}><section className="regionmap-encounter-prompt" onClick={event=>event.stopPropagation()}><span className="eyebrow">{allHaveSubProgress(encounterPrompt)?'CHEFE DA SUB-REGIÃO':'PONTO DE EXPLORAÇÃO'}</span><h2>{encounterPrompt.nome}</h2><p>{encounterPrompt.descricao}</p><div><button onClick={()=>setEncounterPrompt(undefined)}>Continuar explorando</button><button className="primary" onClick={explore}>{allHaveSubProgress(encounterPrompt)?'Enfrentar chefe':'Explorar (buscar combate)'}</button></div></section></div>
 const ambushDialog=ambushPrompt&&<div className="regionmap-encounter-backdrop"><section className="regionmap-ambush-prompt"><span className="eyebrow">EMBOSCADA</span><h2>O grupo foi atacado!</h2><div className="regionmap-ambush-enemy"><img src={art(ambushPrompt.enemy)} alt={ambushPrompt.enemy.nome}/><div><strong>{ambushPrompt.enemy.nome}</strong><small>Nível {(ambushPrompt.enemy as any).nivel??ambushPrompt.enemy.dificuldade}</small></div></div><p>Um inimigo surge e bloqueia o caminho do grupo. Fugir usa a mesma chance de uma fuga em combate.</p><div><button onClick={fleeAmbush}>Tentar fugir</button><button className="primary" onClick={acceptAmbush}>Aceitar o desafio</button></div></section></div>
 const chestDialog=chestNotice&&<div className="regionmap-encounter-backdrop" onClick={()=>setChestNotice(undefined)}><section className="regionmap-chest-prompt" onClick={event=>event.stopPropagation()}><span className="eyebrow">BAÚ ABERTO</span><p>{chestNotice}</p><button className="primary" onClick={()=>setChestNotice(undefined)}>Continuar</button></section></div>
 return <div className="regionmap-shell coop-map-shell">
  <div className="regionmap-stage"><div className="regionmap-stage-title"><Map size={18}/><span>Região de {region.nome}</span></div>
   <TileWorldExplorer map={map} playerSprite={mapSpriteFor(g.heroId)} initialPosition={initialPos} paused={Boolean(encounterPrompt||ambushPrompt||chestNotice)}
    onEnterLocation={handleEnter} locationStatus={locationStatus} exits={regionExits} onEnterExit={handleExit} onAmbush={handleAmbush}
    onPositionChange={pos=>{g.setRegionMapPosition(regionId,pos);void coop.publishMapPos(regionId,pos.x,pos.y)}}
    openedChests={g.openedChests} onOpenChest={handleOpenChest} onRestCampfire={campfire=>g.restAtCampfire(regionId,campfire)} onCampfireTick={()=>g.campfireHealTick()}
    exploredTiles={exploredSet} onExplore={tiles=>g.revealMapTiles(regionId,tiles)} defeatedWanderers={g.defeatedWanderers}
    customPins={g.customPins?.[regionId]} onTogglePin={(x,y)=>g.toggleCustomPin(regionId,x,y)}
    activatedLevers={g.activatedLevers} onActivateLever={leverId=>g.activateLever(leverId)}
    discoveredSecrets={g.discoveredSecrets} onDiscoverSecret={key=>g.discoverSecret(key)}
    partyGhosts={partyGhosts}/>
  </div>
  <aside className="regionmap-inspector coop-map-inspector"><span className="eyebrow">GRUPO NA REGIÃO</span><h2>{region.nome}</h2><p>Ande até um marcador para explorar; onde o chefe já foi liberado pelo grupo, o marcador aparece destacado.</p>
   <div className="coop-region-progress">{subs.map(loc=>{const left=subBattlesLeft(loc);return <div key={loc.id}><small>{loc.nome}</small><strong className={left?'':'ready'}>{left?`Faltam ${left}`:'Chefe liberado'}</strong></div>})}</div>
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
 const map=getRegionMap(mapPos.regionId)
 if(!map)return <p className="coop-notice">Aguardando o anfitrião iniciar a exploração...</p>
 return <div className="regionmap-shell coop-map-shell coop-map-follower">
  <div className="regionmap-stage"><div className="regionmap-stage-title"><Map size={18}/><span>Seguindo o líder pela região</span></div>
   <TileWorldExplorer map={map} playerSprite={mapSpriteFor(hostHeroId)} paused externalPosition={{x:mapPos.x,y:mapPos.y}} onEnterLocation={()=>{}} partyGhosts={partyGhosts}/>
  </div>
  <aside className="regionmap-inspector coop-map-inspector"><span className="eyebrow">MODO ACOMPANHAMENTO</span><p>Você segue o anfitrião pelo mapa e recebe os mesmos acessos, emboscadas, chefes e recompensas do grupo -- sem precisar controlar o movimento.</p></aside>
 </div>
}
