import React from 'react'
import { attackEffect, applyElementalStatus, buildSummon, consumeStun, defenseEffect, enemyDefenseValue, resolveCombatRoll, rollPenaltyFrom, summonBossMinions, tickStatus, SUMMON_ATTACK_ANIMATION, SUMMON_INTERCEPT_CHANCE, STATUS_LABELS, STANCE_ATTACK_PCT, STANCE_DEFENSE_PCT, STANCE_LABELS, type AttackAnimType, type BattleStance, type EquipmentForgeSnapshot, type StatusEffects, type Summon, type SummonType } from '../store/game'
import type { Element } from '../data/expansion'
import { selectCoopAutoHealTarget } from './coopAutoCombat'
import { createOnlineRoom, ensureOnlineUser, joinOnlineRoom, leaveOnlineRoom, loadOnlineRoom, publishRoomState, subscribeToOnlineRoom, transferCoopHost, unsubscribeFromOnlineRoom, type OnlineMember, type OnlineRoom } from './supabase'
type CoopVitals={hp:number;maxHp:number;level:number;attack?:number;defense:number;shield:number;rollBonus:number;critDefenseBoost:boolean;dodgeBoost?:boolean;weaponAnim?:AttackAnimType;resistances?:Element[];locked?:boolean}
// Anúncio da vitrine do Negociador (sala coop). O item já saiu da bolsa do vendedor no momento
// do anúncio (escrowMarketItem/escrowMarketEquipment em game.ts) -- 'listed' é o item "em
// depósito" na sala; 'sold' registra quem comprou mas só é removido depois que o CLIENTE DO
// VENDEDOR credita o ouro localmente (settleMarketSale) e confirma a remoção. Como a troca só
// existe enquanto os dois estiverem na mesma sala (nunca assíncrona entre contas offline), não há
// tabela nova no Supabase nem risco de sincronização cross-sessão: tudo vive dentro do
// shared_state da própria sala. kind/forge só existem em anúncios de equipamento -- itemId nesse
// caso é a REF da instância (catalogId@@sufixo) e qty é sempre 1; forge carrega o snapshot dos
// Records por-instância (upgrade/gemas/elemento) pra não sumir ao trocar de dono.
export type MarketListing={id:string;sellerId:string;sellerName:string;itemId:string;qty:number;price:number;status:'listed'|'sold';buyerId?:string;buyerName?:string;createdAt:number;kind?:'consumable'|'equipment';forge?:EquipmentForgeSnapshot}
type CoopContextValue={room:OnlineRoom|null;members:OnlineMember[];userId:string;onlineCount:number;busy:boolean;notice:string;create:(name:string,heroId?:string)=>Promise<void>;join:(code:string,name:string,heroId?:string)=>Promise<void>;leave:()=>Promise<void>;transferHost:(newHostUserId:string)=>Promise<void>;publishProgress:(progress:Record<string,number>,vitals:CoopVitals)=>Promise<void>;publishMapPos:(regionId:string,x:number,y:number)=>Promise<void>;startMapBattle:(subregionId:string,enemy?:Record<string,unknown>)=>Promise<void>;listMarketItem:(itemId:string,qty:number,price:number,kind?:'consumable'|'equipment',forge?:EquipmentForgeSnapshot)=>Promise<void>;cancelMarketListing:(listingId:string)=>Promise<void>;buyMarketListing:(listingId:string)=>Promise<void>;settleMarketSale:(listingId:string)=>Promise<void>;coopAttack:(attackBase:number,defenseBase:number,rollBonus?:number,critBoost?:boolean,healChance?:number,healAmount?:number,label?:string,targetMinionId?:string,forceCrit?:boolean,critChancePct?:number,critDamageBonusPct?:number,weaponElement?:Element,forceStatus?:boolean,extraStatusTurn?:boolean)=>Promise<void>;coopAbility:(label:string,damage:number,effect:string,freeAction?:boolean)=>Promise<void>;coopUltimate:(damage:number,label:string,description:string)=>Promise<void>;coopSummon:(tipo:SummonType)=>Promise<void>;coopSetStance:(stance:BattleStance)=>Promise<void>;coopFlee:()=>Promise<void>;resolveEnemyTurn:()=>Promise<void>;completeBattle:()=>Promise<void>;sendEmote:(emote:string)=>Promise<void>}
const CoopContext=React.createContext<CoopContextValue|null>(null),ROOM_KEY='bangalores-coop-room-id'
// localStorage pode lançar (não só faltar) em navegadores/webviews com armazenamento bloqueado
// por política de privacidade. A leitura de readRoomId roda num useEffect que dispara em TODO
// carregamento do app (CoopProvider envolve toda a árvore em main.tsx) -- sem o try/catch, um
// navegador desses derrubava o app inteiro assim que montava, sem aviso nenhum ao jogador.
function readRoomId():string|null{try{return localStorage.getItem(ROOM_KEY)}catch{return null}}
function writeRoomId(id:string){try{localStorage.setItem(ROOM_KEY,id)}catch{}}
function clearRoomId(){try{localStorage.removeItem(ROOM_KEY)}catch{}}
function writeCoopName(name:string){try{localStorage.setItem('bangalores-coop-name',name)}catch{}}
const shuffled=(values:string[])=>{const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result}
const NEGATIVE_COOP_BUFF_KEYS=['bleed','burn','poison','frozen','grabbed','blinded','stunned'] as const
const cleanseNegativeCoopBuffs=(buffs?:Record<string,unknown>)=>{const result={...(buffs??{})};for(const key of NEGATIVE_COOP_BUFF_KEYS)delete result[key];return result}
const usableCoopVitals=(vitals:any)=>Number.isFinite(Number(vitals?.hp))&&Number.isFinite(Number(vitals?.maxHp))&&Number(vitals.maxHp)>0
const battleReadyMembers=(members:OnlineMember[],vitals:Record<string,any>)=>members.filter(member=>{const v=vitals[member.user_id];return usableCoopVitals(v)&&Number(v.hp)>0&&!v.locked})
const aliveCoopUserIds=(members:OnlineMember[],vitals:Record<string,any>)=>new Set(members.filter(member=>usableCoopVitals(vitals[member.user_id])&&Number(vitals[member.user_id].hp)>0).map(member=>member.user_id))
const nextInitiative=(battle:any,aliveUserIds?:Set<string>)=>{const order=Array.isArray(battle.initiativeOrder)?battle.initiativeOrder:[],start=Number(battle.initiativeIndex??0);for(let step=1;step<=Math.max(1,order.length);step++){const nextIndex=(start+step)%Math.max(1,order.length),id=order[nextIndex],round=nextIndex<=start?Number(battle.round??1)+1:Number(battle.round??1);if(id==='enemy'||!aliveUserIds||aliveUserIds.has(id))return{activeUserId:id,initiativeIndex:nextIndex,round}}return{activeUserId:'enemy',initiativeIndex:Math.max(0,order.indexOf('enemy')),round:Number(battle.round??1)+1}}
export function CoopProvider({children}:{children:React.ReactNode}){
 const [room,setRoom]=React.useState<OnlineRoom|null>(null),[members,setMembers]=React.useState<OnlineMember[]>([]),[userId,setUserId]=React.useState(''),[onlineCount,setOnlineCount]=React.useState(0),[busy,setBusy]=React.useState(false),[notice,setNotice]=React.useState('')
 const channel=React.useRef<ReturnType<typeof subscribeToOnlineRoom>>(null),roomRef=React.useRef<OnlineRoom|null>(null),membersRef=React.useRef<OnlineMember[]>([])
 const mapPosPending=React.useRef<{regionId:string;x:number;y:number}|null>(null),mapPosBusy=React.useRef(false)
 // Geração da conexão atual: connect() roda de novo tanto no reconnect automático (localStorage,
 // ao montar) quanto ao criar/entrar numa sala explicitamente -- se as duas chamadas se
 // sobrepuserem (ex.: a sala antiga salva localmente já não existe mais e o refresh dela demora
 // pra falhar), sem essa checagem a resposta da chamada MAIS VELHA podia chegar depois e apagar
 // o estado da sala nova recém conectada com sucesso (setRoom(null) por cima de um room válido).
 const connectionGen=React.useRef(0)
 const refresh=React.useCallback(async(roomId:string,expectedGen?:number)=>{try{const data=await loadOnlineRoom(roomId);if(expectedGen!==undefined&&connectionGen.current!==expectedGen)return;roomRef.current=data.room;membersRef.current=data.members;setRoom(data.room);setMembers(data.members)}catch(error){if(expectedGen!==undefined&&connectionGen.current!==expectedGen)return;clearRoomId();roomRef.current=null;setRoom(null);setMembers([]);setNotice(error instanceof Error?error.message:'A sala não está mais disponível.')}},[])
 const connect=React.useCallback(async(roomId:string,id?:string)=>{const myGen=++connectionGen.current;await unsubscribeFromOnlineRoom(channel.current);const user=id?{id}:await ensureOnlineUser();if(connectionGen.current!==myGen)return;setUserId(user.id);writeRoomId(roomId);await refresh(roomId,myGen);if(connectionGen.current!==myGen)return;channel.current=subscribeToOnlineRoom(roomId,()=>void refresh(roomId),presence=>setOnlineCount(Object.keys(presence).length));setNotice('Sala conectada em tempo real.')},[refresh])
 React.useEffect(()=>{const id=readRoomId();if(id)void connect(id);return()=>{void unsubscribeFromOnlineRoom(channel.current)}},[connect])
 const create=async(name:string,heroId?:string)=>{setBusy(true);try{writeCoopName(name.trim());const result=await createOnlineRoom(name,heroId);await connect(result.room_id,result.user_id)}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível criar a sala.')}finally{setBusy(false)}}
 const join=async(code:string,name:string,heroId?:string)=>{setBusy(true);try{writeCoopName(name.trim());const result=await joinOnlineRoom(code,name,heroId);await connect(result.room_id,result.user_id)}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível entrar na sala.')}finally{setBusy(false)}}
 const leave=async()=>{if(!roomRef.current)return;setBusy(true);try{await leaveOnlineRoom(roomRef.current.id);await unsubscribeFromOnlineRoom(channel.current);channel.current=null;clearRoomId();roomRef.current=null;setRoom(null);setMembers([]);setOnlineCount(0);setNotice('Você saiu da sala.')}finally{setBusy(false)}}
 // Antes a única forma de trocar de líder era o líder sair da sala (leave_coop_room promove
 // o membro mais antigo automaticamente). Isso deixa a troca deliberada, sem precisar sair.
 const transferHost=async(newHostUserId:string)=>{const current=roomRef.current;if(!current||current.host_id!==userId||newHostUserId===userId)return;setBusy(true);try{await transferCoopHost(current.id,newHostUserId);await refresh(current.id)}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível repassar a liderança.')}finally{setBusy(false)}}
 // O mapa navegável passou a publicar a posição do líder a cada passo (a cada ~320ms andando),
 // então agora é comum ter dois escritores concorrentes de verdade na sala (posição do líder +
 // progresso/vitals de outro membro) -- sem um atraso entre tentativas, as duas colidiam de novo
 // na tentativa seguinte com boa chance (mesmo após o refresh, se o outro escritor também
 // estiver retentando no mesmo instante). Um atraso curto e levemente aleatório reduz a chance
 // de duas tentativas caírem sempre juntas.
 const updateState=async(makeState:(current:OnlineRoom)=>Record<string,unknown>)=>{for(let attempt=0;attempt<5;attempt++){const current=roomRef.current;if(!current)return;try{await publishRoomState(current.id,makeState(current),current.state_version);await refresh(current.id);return}catch(error){await refresh(current.id);if(attempt===4)throw error;await new Promise(resolve=>setTimeout(resolve,80+Math.random()*120))}}}
 const publishProgress=async(progress:Record<string,number>,vitals:CoopVitals)=>{if(!roomRef.current)return;try{await updateState(current=>({...current.shared_state,memberProgress:{...((current.shared_state.memberProgress as Record<string,unknown>)??{}),[userId]:progress},memberVitals:{...((current.shared_state.memberVitals as Record<string,unknown>)??{}),[userId]:vitals}}))}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível sincronizar o progresso da campanha.')}}
 // Contrato 17 do Quadro de Contratos: emotes rápidos em vez de chat livre (sem risco de
 // moderação, mais leve de construir) -- um único slot em shared_state.lastEmote, sobrescrito a
 // cada envio, com timestamp; a UI decide sozinha quando o balão expira (ver EMOTE_DISPLAY_MS em
 // CoopScreen.tsx/CombatScreen), sem precisar de uma lista crescente nem de limpeza no servidor.
 const sendEmote=async(emote:string)=>{if(!roomRef.current)return;const me=membersRef.current.find(member=>member.user_id===userId);try{await updateState(current=>({...current.shared_state,lastEmote:{userId,displayName:me?.display_name??'Jogador',emote,ts:Date.now()}}))}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível enviar o emote.')}}
 // Publica a posição do líder no mapa navegável pros demais integrantes acompanharem. Anda
 // dispara um onPositionChange por passo (a cada ~320ms), bem mais rápido que uma viagem
 // completa de updateState (RPC + refetch, com retries em caso de conflito de versão) --
 // sem essa fila, cada passo novo abria uma escrita concorrente contra a anterior e as duas
 // ficavam se conflitando entre si pra sempre (STATE_VERSION_CONFLICT em toda tentativa,
 // mesmo sem nenhum outro jogador escrevendo). Só um publish roda por vez; passos que chegam
 // enquanto ele está em voo apenas atualizam qual é a posição "mais nova" a mandar a seguir.
 const publishMapPos=async(regionId:string,x:number,y:number)=>{
  if(roomRef.current?.host_id!==userId)return
  mapPosPending.current={regionId,x,y}
  if(mapPosBusy.current)return
  mapPosBusy.current=true
  // Pequeno atraso antes do primeiro envio: dá tempo de vários passos seguidos (segurando a
  // seta) se acumularem em UM só publish da posição mais recente, em vez de um round-trip
  // completo por tile -- reduz bastante o volume de escritas concorrentes durante uma
  // caminhada contínua, que é o cenário que mais gerava conflito de versão.
  await new Promise(resolve=>setTimeout(resolve,220))
  try{
   while(mapPosPending.current){
    const next=mapPosPending.current
    mapPosPending.current=null
    try{await updateState(current=>({...current.shared_state,mapPos:next}))}catch{}
   }
  }finally{mapPosBusy.current=false}
 }
 // Substitui o antigo fluxo de seleção de destino em dropdown + confirmação de todos: agora o
 // anfitrião caminha pelo mapa e qualquer emboscada/chefe encontrado já inicia a batalha
 // compartilhada direto (o grupo "segue o líder" e entra na luta com ele, sem etapa de aceite).
 const startMapBattle=async(subregionId:string,enemy?:Record<string,unknown>)=>{
  if(roomRef.current?.host_id!==userId||!enemy)return
  setBusy(true)
  try{await updateState(current=>{
   const vitals=(current.shared_state.memberVitals??{}) as Record<string,any>,readyMembers=battleReadyMembers(membersRef.current,vitals)
   if(!readyMembers.length)throw new Error('Nenhum aventureiro está pronto para entrar em batalha.')
   const enemyHp=Number((enemy as any)?.vida??0),initiativeOrder=shuffled([...readyMembers.map(member=>member.user_id),'enemy']),activeUserId=initiativeOrder[0],initiativeNames=initiativeOrder.map(id=>id==='enemy'?String((enemy as any)?.nome??'Inimigo'):readyMembers.find(member=>member.user_id===id)?.display_name??'Aventureiro')
   return{...current.shared_state,battle:{id:`coop_${Date.now()}`,status:'playing',subregionId,startedAt:new Date().toISOString(),enemy,enemyHp,combatMinions:[],damageByPlayer:{},enemyFearPenalty:0,fearTurnsLeft:0,groupBuff:{},playerBuffs:{},enemyStatus:{},initiativeOrder,initiativeNames,initiativeIndex:0,activeUserId,turn:1,round:1,log:[`Iniciativa sorteada: ${initiativeNames.join(' → ')}.`]}}
  })}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível iniciar a batalha.')}finally{setBusy(false)}
 }
 // Negociador: vitrine só entre quem está na mesma sala agora. listMarketItem/cancelMarketListing
 // só mexem no shared_state (o item já saiu/volta pra bolsa localmente em quem chama, via
 // escrowMarketItem/refundMarketItem em game.ts -- CoopContext não importa useGame de propósito,
 // essa separação já existe pro resto do arquivo). buyMarketListing marca o anúncio como vendido
 // (trava otimista pelo state_version evita duas pessoas comprarem o mesmo item); quem PAGOU credita
 // o próprio ouro/item na hora (via completeMarketPurchase, chamado por quem clicou Comprar).
 // Quem VENDEU só recebe o ouro quando o efeito em CoopBattleSync (main.tsx) detecta status:'sold'
 // com sellerId===userId -- roda mesmo se o vendedor estiver em outra tela, igual ao gancho de
 // entrar numa batalha compartilhada a partir de qualquer lugar do app.
 const listMarketItem=async(itemId:string,qty:number,price:number,kind:'consumable'|'equipment'='consumable',forge?:EquipmentForgeSnapshot)=>{
  const me=membersRef.current.find(m=>m.user_id===userId)
  if(!roomRef.current||!me||qty<=0||price<=0)return
  setBusy(true)
  try{
   await updateState(current=>{
    const market:MarketListing[]=Array.isArray(current.shared_state.market)?current.shared_state.market as MarketListing[]:[]
    const listing:MarketListing={id:`mkt_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,sellerId:userId,sellerName:me.display_name,itemId,qty,price:Math.max(1,Math.floor(price)),status:'listed',createdAt:Date.now(),kind,...(forge?{forge}:{})}
    return{...current.shared_state,market:[...market,listing]}
   })
  }catch(error){setNotice(error instanceof Error?error.message:'Não foi possível publicar o anúncio.');throw error}
  finally{setBusy(false)}
 }
 const cancelMarketListing=async(listingId:string)=>{
  if(!roomRef.current)return
  setBusy(true)
  try{
   await updateState(current=>{
    const market:MarketListing[]=Array.isArray(current.shared_state.market)?current.shared_state.market as MarketListing[]:[]
    const listing=market.find(item=>item.id===listingId)
    if(!listing||listing.sellerId!==userId||listing.status!=='listed')throw new Error('Este anúncio não está mais disponível para cancelar.')
    return{...current.shared_state,market:market.filter(item=>item.id!==listingId)}
   })
  }catch(error){setNotice(error instanceof Error?error.message:'Não foi possível cancelar o anúncio.');throw error}
  finally{setBusy(false)}
 }
 const buyMarketListing=async(listingId:string)=>{
  const me=membersRef.current.find(m=>m.user_id===userId)
  if(!roomRef.current||!me)return
  setBusy(true)
  try{
   await updateState(current=>{
    const market:MarketListing[]=Array.isArray(current.shared_state.market)?current.shared_state.market as MarketListing[]:[]
    const listing=market.find(item=>item.id===listingId)
    if(!listing||listing.status!=='listed')throw new Error('Este item já foi vendido ou removido.')
    if(listing.sellerId===userId)throw new Error('Você não pode comprar o próprio anúncio.')
    return{...current.shared_state,market:market.map(item=>item.id===listingId?{...item,status:'sold',buyerId:userId,buyerName:me.display_name}:item)}
   })
  }catch(error){setNotice(error instanceof Error?error.message:'Não foi possível comprar este item.');throw error}
  finally{setBusy(false)}
 }
 const settleMarketSale=async(listingId:string)=>{
  if(!roomRef.current)return
  try{await updateState(current=>{
   const market:MarketListing[]=Array.isArray(current.shared_state.market)?current.shared_state.market as MarketListing[]:[]
   return{...current.shared_state,market:market.filter(item=>item.id!==listingId)}
  })}catch{}
 }
 const coopAttack=async(attackBase:number,defenseBase:number,rollBonus=0,critBoost=false,healChance=0,healAmount=0,label?:string,targetMinionId?:string,forceCrit=false,critChancePct=0,critDamageBonusPct=0,weaponElement:Element='fisico',forceStatus=false,extraStatusTurn=false)=>{try{await updateState(current=>{
  const battle=current.shared_state.battle as any
  if(!battle||battle.status!=='playing'||battle.activeUserId!==userId)return current.shared_state
  const group=battle.groupBuff??{}
  const personal=battle.playerBuffs?.[userId]??{}
  if(personal.stunned){
   const actorName=membersRef.current.find(m=>m.user_id===userId)?.display_name??'Aventureiro',next=nextInitiative(battle,aliveCoopUserIds(membersRef.current,(current.shared_state.memberVitals??{}) as Record<string,any>))
   return{...current.shared_state,battle:{...battle,...next,playerBuffs:{...(battle.playerBuffs??{}),[userId]:{...personal,stunned:false}},turn:Number(battle.turn??1)+1,log:[...(battle.log??[]).slice(-15),`${actorName} está atordoado e perde a ação neste turno.`]}}
  }
  if(forceCrit&&Number(personal.fervor??0)<3)return current.shared_state
  const minions:any[]=Array.isArray(battle.combatMinions)?battle.combatMinions:[]
  const target=targetMinionId?minions.find(m=>m.id===targetMinionId&&m.hp>0):undefined
  const enemyStun=target?{status:(battle.enemyStatus??{}) as StatusEffects,wasStunned:false}:consumeStun(battle.enemyStatus)
  const totalRollBonus=Number(group.roll??0)+Number(personal.roll??0)+Number(personal.nextRoll??0)+rollBonus-rollPenaltyFrom(personal)
  const totalCritBoost=Boolean(group.critBoost)||critBoost
  // Crítico forjado é um proc independente da forja (não consome Fervor, ao contrário de forceCrit).
  const forgedCrit=!forceCrit&&critChancePct>0&&Math.random()<critChancePct
  const naturalAttackRoll=forceCrit||forgedCrit?6:1+Math.floor(Math.random()*6)
  const attackRoll=forceCrit||forgedCrit?6:Math.max(1,Math.min(6,naturalAttackRoll+totalRollBonus+(totalCritBoost&&naturalAttackRoll===5?1:0)))
  const defenseRoll=enemyStun.wasStunned?1:Math.max(1,1+Math.floor(Math.random()*6)-Number(battle.enemyFearPenalty??0)-(target?0:rollPenaltyFrom(battle.enemyStatus)))
  const buffedAttack=Math.ceil(attackBase*(1+Number(group.attackPct??0)+Number(personal.attackPct??0)+STANCE_ATTACK_PCT[(personal.battleStance as BattleStance)??'neutra']))
  // Reaproveita a mesma resolução de dado do modo solo (game.ts) em vez de uma fórmula
  // paralela: antes o crítico e a defesa perfeita do coop tinham magnitude bem diferente
  // do solo, e a falha crítica não causava autodano nenhum no herói.
  const{damage,selfDamage}=resolveCombatRoll(buffedAttack,target?0:defenseBase,attackRoll,defenseRoll,critDamageBonusPct)
  const foeName=target?String(target.nome):String(battle.enemy?.nome??'o inimigo')
  let enemyHp=Number(battle.enemyHp??0),combatMinions=minions,enemy=battle.enemy,actual=0,felled=false,phased=false
  if(target){
   actual=Math.min(Number(target.hp),damage)
   combatMinions=minions.map(m=>m.id===target.id?{...m,hp:Math.max(0,m.hp-actual)}:m)
   felled=combatMinions.find(m=>m.id===target.id)!.hp<=0
  }else{
   actual=Math.min(enemyHp,damage)
   enemyHp=Math.max(0,enemyHp-actual)
   // Fases de chefe com invocação de capangas (playerAttack em game.ts) não existiam no coop.
   if(enemy?.boss&&enemy?.maxFases&&enemyHp>0){
    const currentFase=Number(enemy.fase??1),maxFases=Number(enemy.maxFases)
    const threshold=Number(enemy.vida??0)*(1-currentFase/maxFases)
    if(currentFase<maxFases&&enemyHp<=threshold){
     const nf=currentFase+1
     combatMinions=summonBossMinions(enemy,nf)
     enemy={...enemy,fase:nf,ataque:Number(enemy.ataque)+1}
     enemyHp=Math.max(enemyHp,1)
     phased=true
    }
   }
  }
  const damageByPlayer={...(battle.damageByPlayer??{}),[userId]:Number(battle.damageByPlayer?.[userId]??0)+actual}
  const actor=membersRef.current.find(m=>m.user_id===userId)?.display_name??'Aventureiro'
  const extra=Number(battle.extraActions?.[userId]??0)
  const keepsTurn=!selfDamage&&extra>0
  const next=keepsTurn?{activeUserId:userId,initiativeIndex:battle.initiativeIndex,round:battle.round}:nextInitiative(battle,aliveCoopUserIds(membersRef.current,(current.shared_state.memberVitals??{}) as Record<string,any>))
  const extraActions=selfDamage?battle.extraActions:{...(battle.extraActions??{}),[userId]:Math.max(0,extra-1)}
  const fervorGain=forceCrit?0:attackRoll===6?Math.min(3,Number(personal.fervor??0)+1):Number(personal.fervor??0)
  const playerBuffs={...(battle.playerBuffs??{}),[userId]:{...personal,nextRoll:0,fervor:fervorGain}}
  const enemyRollBonus=attackRoll===2?1:Number(battle.enemyRollBonus??0)
  const vitals=(current.shared_state.memberVitals??{}) as Record<string,{hp:number;maxHp:number}>
  const myVitals=vitals[userId]
  const selfFull=Boolean(myVitals&&myVitals.hp>=myVitals.maxHp)
  const healRoll=healChance>0&&healAmount>0&&Math.random()<healChance
  const overflowTarget=healRoll&&selfFull?membersRef.current.reduce((worst:{member:OnlineMember;ratio:number}|null,member)=>{const v=vitals[member.user_id];if(!v||v.hp<=0)return worst;const ratio=v.hp/Math.max(1,v.maxHp);return!worst||ratio<worst.ratio?{member,ratio}:worst},null):null
  const healTargetUserId=healRoll?(selfFull?(overflowTarget&&overflowTarget.ratio<1?overflowTarget.member.user_id:undefined):userId):undefined
  const healTargetName=healTargetUserId&&healTargetUserId!==userId?overflowTarget?.member.display_name:undefined
  // Cura recebida conta como contribuição para a recompensa (rateio de ouro/XP), do mesmo
  // jeito que dano causado — quem manteve o grupo de pé também ajudou a vencer a batalha.
  const healingByPlayer=healTargetUserId?{...(battle.healingByPlayer??{}),[userId]:Number(battle.healingByPlayer?.[userId]??0)+healAmount}:battle.healingByPlayer
  const tag=label&&label!=='Ataque'?label:undefined
  const statusResult=!target&&actual>0&&!selfDamage&&(forceStatus||naturalAttackRoll===6)?applyElementalStatus(enemyStun.status,weaponElement,buffedAttack,forceStatus,extraStatusTurn):{status:enemyStun.status,appliedKind:undefined as string|undefined}
  const message=selfDamage
   ?`${actor}${tag?` usa ${tag} e`:' ataca, mas'} falha catastroficamente (dado ${attackRoll}) e sofre ${selfDamage} de dano do próprio golpe.`
   :`${actor}${tag?` usa ${tag}:`:':'} ataque ${attackRoll} contra defesa ${defenseRoll}; causou ${actual} de dano${target?` a ${foeName}${felled?' (derrotado)':''}`:''}.${phased?` ${enemy.nome} entra em nova fase e convoca reforços!`:''}${keepsTurn?' Ataque Duplo permite atacar novamente.':''}${attackRoll===2?' O inimigo recebe +1 na próxima rolagem.':''}${healTargetUserId?` A energia natural do equipamento cura ${healAmount}${healTargetName?` de ${healTargetName}`:''}.`:''}${enemyStun.wasStunned?` ${foeName} estava atordoado e não conseguiu se defender.`:''}${statusResult.appliedKind?` ${foeName} fica ${STATUS_LABELS[statusResult.appliedKind]}.`:''}`
  return{...current.shared_state,battle:{...battle,...next,extraActions,playerBuffs,enemyRollBonus,enemy,enemyHp,enemyStatus:statusResult.status,combatMinions,damageByPlayer,healingByPlayer,fleeRoll:undefined,status:enemyHp<=0?'won':'playing',activeUserId:enemyHp<=0?null:next.activeUserId,turn:Number(battle.turn??1)+(keepsTurn?0:1),lastRoll:{attacker:'hero',attackerUserId:userId,naturalAttackRoll,attackRoll,attackBonus:totalRollBonus,attackBase:buffedAttack,defenseBase:target?0:defenseBase,attackEffect:attackEffect(attackRoll),defenseEffect:defenseEffect(defenseRoll),defenseRoll,damage:actual,actor,selfDamage,selfDamageUserId:selfDamage>0?userId:undefined,...(healTargetUserId?{healTargetUserId,healAmount}:{})},log:[...(battle.log??[]).slice(-15),message]}}
 })}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível executar a ação cooperativa.')}}
 // Postura de combate é uma escolha persistente (dura até o jogador trocar de novo), não uma
 // ação de um único turno. Trocá-la pela primeira vez na batalha não consome o turno
 // (activeUserId permanece o mesmo); trocar de novo depois consome normalmente, igual a
 // qualquer outra ação. battleStance/stanceChangeUsed vivem em playerBuffs[userId] (por
 // jogador), separados de attackPct/defensePct (que já pertencem aos bônus de classe
 // temporários e são zerados quando eles expiram).
 const coopSetStance=async(stance:BattleStance)=>{try{await updateState(current=>{
  const battle=current.shared_state.battle as any
  if(!battle||battle.status!=='playing'||battle.activeUserId!==userId)return current.shared_state
  const personal=battle.playerBuffs?.[userId]??{}
  const actor=membersRef.current.find(m=>m.user_id===userId)?.display_name??'Aventureiro'
  if(personal.stunned){
   const next=nextInitiative(battle,aliveCoopUserIds(membersRef.current,(current.shared_state.memberVitals??{}) as Record<string,any>))
   return{...current.shared_state,battle:{...battle,...next,playerBuffs:{...(battle.playerBuffs??{}),[userId]:{...personal,stunned:false}},turn:Number(battle.turn??1)+1,log:[...(battle.log??[]).slice(-15),`${actor} está atordoado e perde a ação neste turno.`]}}
  }
  if(stance===(personal.battleStance??'neutra'))return current.shared_state
  const desc=stance==='ofensiva'?`+${STANCE_ATTACK_PCT.ofensiva*100}% de Ataque e ${STANCE_DEFENSE_PCT.ofensiva*100}% de Defesa`:stance==='defensiva'?`+${STANCE_DEFENSE_PCT.defensiva*100}% de Defesa e ${STANCE_ATTACK_PCT.defensiva*100}% de Ataque`:'sem bônus ou penalidade de Ataque/Defesa'
  if(!personal.stanceChangeUsed){
   const playerBuffs={...(battle.playerBuffs??{}),[userId]:{...personal,battleStance:stance,stanceChangeUsed:true}}
   return{...current.shared_state,battle:{...battle,activeUserId:userId,playerBuffs,fleeRoll:undefined,log:[...(battle.log??[]).slice(-15),`${actor} adota Postura ${STANCE_LABELS[stance]}: ${desc}. Pode agir novamente neste turno.`]}}
  }
  const playerBuffs={...(battle.playerBuffs??{}),[userId]:{...personal,battleStance:stance}}
  const next=nextInitiative(battle,aliveCoopUserIds(membersRef.current,(current.shared_state.memberVitals??{}) as Record<string,any>))
  return{...current.shared_state,battle:{...battle,...next,playerBuffs,fleeRoll:undefined,turn:Number(battle.turn??1)+1,log:[...(battle.log??[]).slice(-15),`${actor} adota Postura ${STANCE_LABELS[stance]}: ${desc}.`]}}
 })}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível executar a ação cooperativa.')}}
 // Como a batalha é compartilhada por todo o grupo, uma fuga bem-sucedida encerra o combate
 // para todos de uma vez (em vez de só quem tentou fugir sumir do meio da luta).
 const coopFlee=async()=>{try{await updateState(current=>{
  const battle=current.shared_state.battle as any
  if(!battle||battle.status!=='playing'||battle.activeUserId!==userId)return current.shared_state
  const roll=1+Math.floor(Math.random()*6),outcome:'success'|'neutral'|'failed'=roll>=5?'success':roll===4?'neutral':'failed'
  const actor=membersRef.current.find(m=>m.user_id===userId)?.display_name??'Aventureiro'
  const message=outcome==='success'?`${actor} tentou fugir: dado ${roll}. O grupo escapou da batalha!`:outcome==='neutral'?`${actor} tentou fugir: dado ${roll}. Não conseguiu escapar, mas manteve a ação.`:`${actor} tentou fugir: dado ${roll}. A tentativa falhou e o turno passou.`
  const log=[...(battle.log??[]).slice(-15),message]
  if(outcome==='success')return{...current.shared_state,battle:{...battle,status:'fled',activeUserId:null,fleeRoll:{roll,outcome},log}}
  if(outcome==='neutral')return{...current.shared_state,battle:{...battle,fleeRoll:{roll,outcome},log}}
  const next=nextInitiative(battle,aliveCoopUserIds(membersRef.current,(current.shared_state.memberVitals??{}) as Record<string,any>))
  return{...current.shared_state,battle:{...battle,...next,turn:Number(battle.turn??1)+1,fleeRoll:{roll,outcome},log}}
 })}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível executar a ação cooperativa.')}}
 // freeAction: ação rápida (consumível, auditoria v0.8.84 GAME-004) -- aplica o efeito, registra no log
  // e mantém o turno com o MESMO jogador; itemUsedRound marca a rodada para limitar a 1 por turno.
  const coopAbility=async(label:string,damage:number,effect:string,freeAction=false)=>{try{await updateState(current=>{const battle=current.shared_state.battle as any;if(!battle||battle.status!=='playing'||battle.activeUserId!==userId)return current.shared_state
  if(battle.playerBuffs?.[userId]?.stunned){const actorName=membersRef.current.find(m=>m.user_id===userId)?.display_name??'Aventureiro',next=nextInitiative(battle,aliveCoopUserIds(membersRef.current,(current.shared_state.memberVitals??{}) as Record<string,any>));return{...current.shared_state,battle:{...battle,...next,playerBuffs:{...(battle.playerBuffs??{}),[userId]:{...battle.playerBuffs[userId],stunned:false}},turn:Number(battle.turn??1)+1,log:[...(battle.log??[]).slice(-15),`${actorName} está atordoado e perde a ação neste turno.`]}}}
  const actual=Math.min(Number(battle.enemyHp??0),Math.max(0,damage)),enemyHp=Math.max(0,Number(battle.enemyHp??0)-actual),damageByPlayer={...(battle.damageByPlayer??{}),[userId]:Number(battle.damageByPlayer?.[userId]??0)+actual},actor=membersRef.current.find(m=>m.user_id===userId)?.display_name??'Aventureiro',keepsTurn=effect==='DOUBLE_ATTACK'||freeAction,next=keepsTurn?{activeUserId:userId,initiativeIndex:battle.initiativeIndex,round:battle.round}:nextInitiative(battle,aliveCoopUserIds(membersRef.current,(current.shared_state.memberVitals??{}) as Record<string,any>)),vitals=(current.shared_state.memberVitals??{}) as Record<string,{hp:number;maxHp:number}>,
  // Bênção da Vida (PRIEST_REVIVE) prioriza reanimar um aliado caído (hp<=0); se ninguém
  // estiver caído, cai para o mesmo comportamento de cura da Druida (aliado vivo mais ferido).
  downedMember=effect==='PRIEST_REVIVE'?membersRef.current.find(member=>(vitals[member.user_id]?.hp??1)<=0):undefined,
  playerBuffMap=(battle.playerBuffs??{}) as Record<string,Record<string,unknown>>,
  healTargetUserId=(effect==='DRUID_HEAL'||(effect==='PRIEST_REVIVE'&&!downedMember))?selectCoopAutoHealTarget(membersRef.current,vitals,{minMissingRatio:0,playerBuffs:playerBuffMap,cleanseNegativeStatus:effect==='DRUID_HEAL'}):downedMember?.user_id,
  healTarget=healTargetUserId?(()=>{const member=membersRef.current.find(item=>item.user_id===healTargetUserId);if(!member)return null;const raw=vitals[healTargetUserId]??{hp:0,maxHp:1},hp=Number(raw.hp),maxHp=Number(raw.maxHp),v={hp:Number.isFinite(hp)?hp:0,maxHp:Number.isFinite(maxHp)&&maxHp>0?maxHp:1};return{member,vitals:v,ratio:v.hp/Math.max(1,v.maxHp)}})():null,
  healAmount=healTarget?(downedMember?Math.max(1,Math.ceil(healTarget.vitals.maxHp*.3)):Math.max(0,Math.min(Math.max(1,Math.ceil(healTarget.vitals.maxHp*.3)),healTarget.vitals.maxHp-healTarget.vitals.hp))):0,
  // Ímpeto Marcial (WARRIOR_BUFF), Ascensão Arcana (ARCANE_GROUP_BUFF), Marca do Predador
  // (HUNTER_CRITICAL), Ataque Duplo (DOUBLE_ATTACK) e Conjurar Fera Espectral (SUMMON_BOND) têm
  // duração máxima em turnos consecutivos (buffTurnsLeft/fearTurnsLeft/arcaneTurnsLeft/
  // critTurnsLeft/doubleAttackTurnsLeft), decrementada uma vez por rodada em resolveEnemyTurn.
  // Reativar a habilidade RENOVA a duração em vez de somar o bônus de novo (evita empilhar
  // percentuais quando o mesmo herói usa a habilidade mais de uma vez na mesma batalha).
  playerBuffs=effect==='WARRIOR_BUFF'?{...(battle.playerBuffs??{}),[userId]:{...(battle.playerBuffs?.[userId]??{}),attackPct:.1,defensePct:.1,buffTurnsLeft:3}}:effect==='DOUBLE_ATTACK'?{...(battle.playerBuffs??{}),[userId]:{...(battle.playerBuffs?.[userId]??{}),doubleAttackTurnsLeft:3}}:effect==='ITEM_CLEANSE'?{...(battle.playerBuffs??{}),[userId]:cleanseNegativeCoopBuffs(battle.playerBuffs?.[userId])}:(effect==='DRUID_HEAL'||effect==='PRIEST_REVIVE')&&healTarget?{...(battle.playerBuffs??{}),[healTarget.member.user_id]:cleanseNegativeCoopBuffs(battle.playerBuffs?.[healTarget.member.user_id])}:battle.playerBuffs,
  playerBuffsFinal=freeAction?{...(playerBuffs??{}),[userId]:{...((playerBuffs as Record<string,Record<string,unknown>>|undefined)?.[userId]??{}),itemUsedRound:Number(battle.round??1)}}:playerBuffs,
  enemyFearPenalty=effect==='WARRIOR_BUFF'?1:battle.enemyFearPenalty,fearTurnsLeft=effect==='WARRIOR_BUFF'?3:battle.fearTurnsLeft,
  enemyStatus=effect==='WARRIOR_BUFF'&&battle.enemyStatus?.bleed?{...battle.enemyStatus,bleed:{...battle.enemyStatus.bleed,turns:3}}:battle.enemyStatus,
  groupBuff=effect==='ARCANE_GROUP_BUFF'?{...(battle.groupBuff??{}),roll:1,attackPct:.1,defensePct:.1,arcaneTurnsLeft:3}:effect==='HUNTER_CRITICAL'?{...(battle.groupBuff??{}),critBoost:true,critTurnsLeft:2}:battle.groupBuff,
  extraActions=effect==='DOUBLE_ATTACK'?{...(battle.extraActions??{}),[userId]:1}:battle.extraActions,tauntUserId=effect==='GUARDIAN_TAUNT'?userId:battle.tauntUserId,
  // Brisa Revigorante (DRUID_HEAL) também conta para o rateio de recompensa, igual ao dano.
  healingByPlayer=healAmount>0?{...(battle.healingByPlayer??{}),[userId]:Number(battle.healingByPlayer?.[userId]??0)+healAmount}:battle.healingByPlayer,
  description=effect==='GUARDIAN_TAUNT'?'inimigos priorizarão o Guardião':effect==='WARRIOR_BUFF'?`+10% de Ataque e Defesa base e Medo no inimigo (-1 em todas as rolagens dele), por até 3 turnos${battle.enemyStatus?.bleed?' — sangramento do inimigo renovado':''}`:effect==='DOUBLE_ATTACK'?'dois ataques liberados neste turno':effect==='ARCANE_GROUP_BUFF'?'+1 nos dados e +10% de Ataque e Defesa para todos, por até 3 turnos':effect==='DRUID_HEAL'?(healTarget&&healAmount>0?`curou ${healAmount} de vida de ${healTarget.member.display_name} e purificou seus efeitos negativos`:'não havia vida para recuperar'):effect==='HUNTER_CRITICAL'?'resultados 5 e 6 passam a causar ataques críticos para o grupo, por 2 turnos':effect==='ITEM_CLEANSE'?'removeu todas as condições negativas':effect==='PRIEST_REVIVE'?(downedMember&&healTarget?`reanimou ${healTarget.member.display_name} com ${healAmount} de vida`:healTarget&&healAmount>0?`curou ${healAmount} de vida de ${healTarget.member.display_name} (ninguém estava caído)`:'não havia ninguém para reanimar ou curar'):effect,message=`${actor} usou ${label}: ${description}${actual?` e causou ${actual} de dano`:''}.`;return{...current.shared_state,battle:{...battle,...next,playerBuffs:playerBuffsFinal,groupBuff,extraActions,tauntUserId,enemyFearPenalty,fearTurnsLeft,enemyStatus,enemyHp,damageByPlayer,healingByPlayer,fleeRoll:undefined,status:enemyHp<=0?'won':'playing',activeUserId:enemyHp<=0?null:next.activeUserId,turn:Number(battle.turn??1)+(keepsTurn?0:1),lastRoll:{attacker:'ability',damage:actual,actor,label,effect:description,effectType:effect,healTargetUserId:healTarget?.member.user_id,healAmount},log:[...(battle.log??[]).slice(-15),message]}}})}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível usar a habilidade cooperativa.')}}
 // Golpe Supremo cooperativo: dano já vem pré-calculado (ultimateEffects em game.ts, mesma
 // fórmula por classe do modo solo) em vez de rolar dados como coopAttack -- no solo o Supremo
 // também ignora rolagem (attackRoll:6/defenseRoll:1 fixos, "Indefensável"). O bônus de
 // cura/escudo/fervor do herói é aplicado localmente por performUltimate (main.tsx) antes de
 // chamar isto, igual ao padrão já usado por performUseConsumable -- aqui só aplicamos o dano
 // ao inimigo compartilhado e avançamos o turno.
 const coopUltimate=async(damage:number,label:string,description:string)=>{try{await updateState(current=>{
  const battle=current.shared_state.battle as any
  if(!battle||battle.status!=='playing'||battle.activeUserId!==userId)return current.shared_state
  const personal=battle.playerBuffs?.[userId]??{}
  const actor=membersRef.current.find(m=>m.user_id===userId)?.display_name??'Aventureiro'
  if(personal.stunned){
   const next=nextInitiative(battle,aliveCoopUserIds(membersRef.current,(current.shared_state.memberVitals??{}) as Record<string,any>))
   return{...current.shared_state,battle:{...battle,...next,playerBuffs:{...(battle.playerBuffs??{}),[userId]:{...personal,stunned:false}},turn:Number(battle.turn??1)+1,log:[...(battle.log??[]).slice(-15),`${actor} está atordoado e perde a ação neste turno.`]}}
  }
  const actual=Math.min(Number(battle.enemyHp??0),Math.max(0,damage))
  const enemyHp=Math.max(0,Number(battle.enemyHp??0)-actual)
  const damageByPlayer={...(battle.damageByPlayer??{}),[userId]:Number(battle.damageByPlayer?.[userId]??0)+actual}
  const next=nextInitiative(battle,aliveCoopUserIds(membersRef.current,(current.shared_state.memberVitals??{}) as Record<string,any>))
  const message=`⚡ GOLPE SUPREMO! ${actor} desencadeou ${label} causando ${actual} de dano devastador!${enemyHp<=0?` ${description} (derrotado)`:''}`
  return{...current.shared_state,battle:{...battle,...next,enemyHp,damageByPlayer,fleeRoll:undefined,status:enemyHp<=0?'won':'playing',activeUserId:enemyHp<=0?null:next.activeUserId,turn:Number(battle.turn??1)+1,lastRoll:{attacker:'hero',attackerUserId:userId,naturalAttackRoll:6,attackRoll:6,attackBonus:0,attackBase:damage,defenseBase:0,attackEffect:`SUPREMO: ${label}`,defenseEffect:'Indefensável',defenseRoll:1,damage:actual,actor,selfDamage:0},log:[...(battle.log??[]).slice(-15),message]}}
 })}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível usar o Golpe Supremo.')}}
 // A fera espectral do Conjurador vive dentro de battle.playerBuffs[userId].summon (o mesmo
 // objeto flat reaproveitado por tickStatus/consumeStun/applyElementalStatus em toda a batalha,
 // que já preserva chaves desconhecidas) em vez de um dicionário separado — assim ela atravessa
 // o tick de status/buffs de resolveEnemyTurn de graça, sem precisar de plumbing novo.
 const coopSummon=async(tipo:SummonType)=>{try{await updateState(current=>{
  const battle=current.shared_state.battle as any
  if(!battle||battle.status!=='playing'||battle.activeUserId!==userId)return current.shared_state
  const personal=battle.playerBuffs?.[userId]??{}
  const actor=membersRef.current.find(m=>m.user_id===userId)?.display_name??'Aventureiro'
  if(personal.stunned){
   const next=nextInitiative(battle,aliveCoopUserIds(membersRef.current,(current.shared_state.memberVitals??{}) as Record<string,any>))
   return{...current.shared_state,battle:{...battle,...next,playerBuffs:{...(battle.playerBuffs??{}),[userId]:{...personal,stunned:false}},turn:Number(battle.turn??1)+1,log:[...(battle.log??[]).slice(-15),`${actor} está atordoado e perde a ação neste turno.`]}}
  }
  const vitals=(current.shared_state.memberVitals??{}) as Record<string,{level?:number}>
  const level=Number(vitals[userId]?.level??1)
  const summon=buildSummon(tipo,level)
  const existing:Summon[]=Array.isArray(personal.summons)?personal.summons.filter((fera:Summon)=>fera.hp>0).slice(0,2):(personal.summon?[personal.summon]:[])
  if(existing.length>=2)return current.shared_state
  const summons=[...existing,summon]
  const typeLabel=tipo==='atacante'?'ofensiva':tipo==='defensor'?'defensiva':'arcana'
  const playerBuffs={...(battle.playerBuffs??{}),[userId]:{...personal,summons,summon:summons[0],...(summons.some(fera=>fera.tipo==='arcano')?{attackPct:.1,defensePct:.1}:{})}}
  const next=nextInitiative(battle,aliveCoopUserIds(membersRef.current,(current.shared_state.memberVitals??{}) as Record<string,any>))
  const message=`${actor} usou Conjurar Fera Espectral (${typeLabel}) • ${summons.length}/2: ${summon.nome} surge com ${summon.maxHp} de vida, ${summon.ataque} de ataque e ${summon.defesa} de defesa.`
  return{...current.shared_state,battle:{...battle,...next,playerBuffs,fleeRoll:undefined,turn:Number(battle.turn??1)+1,log:[...(battle.log??[]).slice(-15),message]}}
 })}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível conjurar a fera espectral.')}}
 const resolveEnemyTurn=async()=>{if(roomRef.current?.host_id!==userId)return;try{await updateState(current=>{
  const battle=current.shared_state.battle as any
  if(!battle||battle.status!=='playing'||battle.activeUserId!=='enemy')return current.shared_state
  // O turno do inimigo também é o único ponto host-autoritativo com permissão de escrever
  // memberVitals de qualquer jogador — por isso as condições (sangramento/queimadura/veneno
  // etc.) de todos os jogadores tickam aqui, uma vez por rodada, em vez de cada ação individual
  // tentar mexer na vida de outra pessoa (o que exigiria um roundtrip via cada cliente).
  const startVitals=(current.shared_state.memberVitals??{}) as Record<string,{hp:number;defense?:number;shield?:number;rollBonus?:number;critDefenseBoost?:boolean;resistances?:Element[]}>
  const workingVitals:Record<string,any>={...startVitals}
  const workingBuffs:Record<string,any>={...(battle.playerBuffs??{})}
  const statusLogs:string[]=[]
  // Ataque Duplo (DOUBLE_ATTACK) não é um bônus "sticky" como os outros -- extraActions[user] é
  // consumido a cada ataque (coopAttack), então precisa ser rearmado no início de cada turno
  // restante do buff, não só na ativação. undefined = nada mudou, herda battle.extraActions.
  let nextExtraActions:Record<string,number>|undefined
  for(const member of membersRef.current){
   const vitals=workingVitals[member.user_id]
   if(!vitals||vitals.hp<=0)continue
   const tick=tickStatus(workingBuffs[member.user_id])
   let nextBuffs:any=tick.status
   // Ímpeto Marcial (WARRIOR_BUFF) tem duração máxima de turnos consecutivos, controlada por
   // buffTurnsLeft — reaproveita o mesmo relógio por-rodada do tickStatus acima.
   if(Number(nextBuffs.buffTurnsLeft??0)>0){
    const turnsLeft=Number(nextBuffs.buffTurnsLeft)-1
    if(turnsLeft<=0){const{attackPct,defensePct,buffTurnsLeft,...rest}=nextBuffs;nextBuffs=rest;statusLogs.push(`${member.display_name}: Ímpeto Marcial se dissipou.`)}
    else nextBuffs={...nextBuffs,buffTurnsLeft:turnsLeft}
   }
   if(Number(nextBuffs.doubleAttackTurnsLeft??0)>0){
    const turnsLeft=Number(nextBuffs.doubleAttackTurnsLeft)-1
    if(turnsLeft<=0){const{doubleAttackTurnsLeft,...rest}=nextBuffs;nextBuffs=rest;statusLogs.push(`${member.display_name}: Ataque Duplo se dissipou.`)}
    else{nextBuffs={...nextBuffs,doubleAttackTurnsLeft:turnsLeft};nextExtraActions={...(nextExtraActions??battle.extraActions??{}),[member.user_id]:1}}
   }
   workingBuffs[member.user_id]=nextBuffs
   if(tick.damage>0){
    const hp=Math.max(0,Number(vitals.hp)-tick.damage)
    workingVitals[member.user_id]={...vitals,hp}
    for(const m of tick.messages)statusLogs.push(`${member.display_name}: ${m}`)
   }
  }
  const resolvedExtraActions=nextExtraActions??battle.extraActions
  // Medo (parte de WARRIOR_BUFF) e os bufos de grupo do Arcanista/Caçador também têm
  // duração máxima de turnos consecutivos, controlada por relógios compartilhados na batalha.
  let workingEnemyFearPenalty=Number(battle.enemyFearPenalty??0),fearTurnsLeft=Number(battle.fearTurnsLeft??0)
  if(fearTurnsLeft>0){fearTurnsLeft-=1;if(fearTurnsLeft<=0){workingEnemyFearPenalty=0;statusLogs.push('Medo se dissipou.')}}
  let workingGroupBuff:any={...(battle.groupBuff??{})}
  if(Number(workingGroupBuff.arcaneTurnsLeft??0)>0){
   const turnsLeft=Number(workingGroupBuff.arcaneTurnsLeft)-1
   if(turnsLeft<=0){const{roll,attackPct,defensePct,arcaneTurnsLeft,...rest}=workingGroupBuff;workingGroupBuff=rest;statusLogs.push('Ascensão Arcana se dissipou.')}
   else workingGroupBuff={...workingGroupBuff,arcaneTurnsLeft:turnsLeft}
  }
  if(Number(workingGroupBuff.critTurnsLeft??0)>0){
   const turnsLeft=Number(workingGroupBuff.critTurnsLeft)-1
   if(turnsLeft<=0){const{critBoost,critTurnsLeft,...rest}=workingGroupBuff;workingGroupBuff=rest;statusLogs.push('Marca do Predador se dissipou.')}
   else workingGroupBuff={...workingGroupBuff,critTurnsLeft:turnsLeft}
  }
  const enemyStatusTick=tickStatus(battle.enemyStatus)
  let enemyHpNow=Math.max(0,Number(battle.enemyHp??0)-enemyStatusTick.damage)
  for(const m of enemyStatusTick.messages)statusLogs.push(`${battle.enemy?.nome}: ${m}`)
  // Cada fera espectral viva de um Conjurador ataca o inimigo principal uma vez por rodada, com
  // sua própria rolagem — espelha o gancho de resolveSummonAttack do solo (game.ts), mas aqui
  // roda uma vez por membro dentro do turno host-autoritativo do inimigo.
  // summonRolls alimenta um efeito em CoopBattleSync (main.tsx) que, em todo cliente conectado
  // (não só em quem invocou a fera), toca a mesma animação de tremor/dano/ícone de arma que já
  // existe no solo -- antes disso, o dano das feras chegava ao inimigo (enemyHp sincronizado
  // normalmente), mas nenhum cliente via o card do inimigo reagir ao ataque da fera.
  const summonRolls:{summonName:string;memberName:string;damage:number;attackType:AttackAnimType}[]=[]
  if(enemyHpNow>0){
   // Antes usava battle.enemy?.dificuldade (índice de progressão da sub-região, ex.: 1-5 nos
   // primeiros chefes) como se fosse a defesa do inimigo -- bem abaixo da defesa real já
   // escalada (enemyDefenseValue), então as feras do Conjurador acertavam quase sempre e por
   // dano inflado contra inimigos de nível alto, só no modo coop (o solo já usava a defesa real).
   const summonDefenseBase=enemyDefenseValue(battle.enemy??{})
   for(const member of membersRef.current){
    const buffs=workingBuffs[member.user_id],summons:Summon[]=(Array.isArray(buffs?.summons)?buffs.summons:(buffs?.summon?[buffs.summon]:[])).filter((fera:Summon)=>fera.hp>0).slice(0,2),after=[...summons]
    for(let index=0;index<after.length&&enemyHpNow>0;index++){const summon=after[index],attackRoll=1+Math.floor(Math.random()*6),defenseRoll=1+Math.floor(Math.random()*6),resolved=resolveCombatRoll(summon.ataque,summonDefenseBase,attackRoll,defenseRoll)
     if(resolved.selfDamage>0){const hp=Math.max(0,summon.hp-resolved.selfDamage),died=hp<=0;after[index]={...summon,hp};statusLogs.push(`${summon.nome} (${member.display_name}) erra completamente e sofre ${resolved.selfDamage} de dano com o próprio golpe.${died?' Caiu em combate.':''}`)}
     else if(resolved.damage>0){enemyHpNow=Math.max(0,enemyHpNow-resolved.damage);summonRolls.push({summonName:summon.nome,memberName:member.display_name,damage:resolved.damage,attackType:SUMMON_ATTACK_ANIMATION[summon.tipo]});statusLogs.push(`${summon.nome} (${member.display_name}) ataca: dado ${attackRoll} contra defesa ${defenseRoll}. Causou ${resolved.damage} de dano a ${battle.enemy?.nome}.`)}
    }
    const survivors=after.filter(fera=>fera.hp>0);workingBuffs[member.user_id]={...buffs,summons:survivors,summon:survivors[0],...(!survivors.some(fera=>fera.tipo==='arcano')?{attackPct:0,defensePct:0}:{})}
   }
  }
  if(enemyHpNow<=0)return{...current.shared_state,memberVitals:workingVitals,battle:{...battle,enemyHp:0,enemyStatus:enemyStatusTick.status,playerBuffs:workingBuffs,groupBuff:workingGroupBuff,enemyFearPenalty:workingEnemyFearPenalty,fearTurnsLeft,extraActions:resolvedExtraActions,status:'won',activeUserId:null,log:[...(battle.log??[]).slice(-15),...statusLogs]}}
  const wipedByStatus=membersRef.current.length>0&&membersRef.current.every(member=>(workingVitals[member.user_id]?.hp??1)<=0)
  if(wipedByStatus)return{...current.shared_state,memberVitals:workingVitals,battle:{...battle,playerBuffs:workingBuffs,groupBuff:workingGroupBuff,enemyFearPenalty:workingEnemyFearPenalty,fearTurnsLeft,extraActions:resolvedExtraActions,enemyStatus:enemyStatusTick.status,status:'lost',activeUserId:null,log:[...(battle.log??[]).slice(-15),...statusLogs,'A equipe foi derrotada.']}}
  const enemyStun=consumeStun(enemyStatusTick.status)
  if(enemyStun.wasStunned){
   const next=nextInitiative(battle,aliveCoopUserIds(membersRef.current,workingVitals))
   return{...current.shared_state,memberVitals:workingVitals,battle:{...battle,...next,playerBuffs:workingBuffs,groupBuff:workingGroupBuff,enemyFearPenalty:workingEnemyFearPenalty,fearTurnsLeft,extraActions:resolvedExtraActions,enemyStatus:enemyStun.status,summonRolls,turn:Number(battle.turn??1)+1,log:[...(battle.log??[]).slice(-15),...statusLogs,`${battle.enemy?.nome} está atordoado e perde a ação neste turno.`]}}
  }
  const enemyRollBonusStart=Number(battle.enemyRollBonus??0)
  const enemyFear=workingEnemyFearPenalty-rollPenaltyFrom(enemyStun.status)
  const pickTarget=()=>{
   const living=membersRef.current.filter(member=>(workingVitals[member.user_id]?.hp??1)>0)
   const taunt=living.find(member=>member.user_id===battle.tauntUserId)
   return taunt??living[Math.floor(Math.random()*Math.max(1,living.length))]??membersRef.current[0]
  }
  // Passiva da Druida (25% de chance de -1 no dado de ataque inimigo), postura defensiva,
  // Fervor de Combate e escudo agora se aplicam da mesma forma a qualquer atacante inimigo
  // (chefe principal ou capanga), não só ao chefe.
  let appliedStatusKind:string|undefined,appliedStatusTargetName:string|undefined
  // Quanto dano cada jogador evitou levar (defesa, rolagem de defesa, resistência elemental,
  // escudo, esquiva ou interceptação de fera) -- entra no rateio de ouro/XP em CoopBattleSync
  // (main.tsx) junto com dano causado e cura feita, pra um tank que segura os golpes do grupo
  // (mas não cura nem bate tão forte quanto um mago, por exemplo) também ser recompensado.
  const workingResisted:Record<string,number>={...(battle.damageResistedByPlayer??{})}
  const strike=(attackBase:number,bonus:number,canApplyStatus:boolean)=>{
   const target=pickTarget()
   if(!target?.user_id)return null
   const targetVitals=workingVitals[target.user_id]??{}
   const targetBuffs=workingBuffs[target.user_id]??{}
   const targetStun=consumeStun(targetBuffs)
   const targetSummons:Summon[]=(Array.isArray(targetBuffs.summons)?targetBuffs.summons:(targetBuffs.summon?[targetBuffs.summon]:[])).filter((fera:Summon)=>fera.hp>0).slice(0,2)
   const targetSummon=[...targetSummons].sort((a,b)=>SUMMON_INTERCEPT_CHANCE[b.tipo]-SUMMON_INTERCEPT_CHANCE[a.tipo]).find(fera=>Math.random()<SUMMON_INTERCEPT_CHANCE[fera.tipo])
   const intercepting=Boolean(targetSummon)
   const naturalAttackRoll=1+Math.floor(Math.random()*6)
   const druidaLuck=!intercepting&&target.hero_id==='druida'&&Math.random()<.25
   const attackRoll=Math.max(1,Math.min(6,naturalAttackRoll+bonus-(druidaLuck?1:0)-enemyFear))
   const naturalDefenseRoll=1+Math.floor(Math.random()*6)
   const critDefenseBoost=!intercepting&&Boolean(targetVitals.critDefenseBoost)&&naturalDefenseRoll===5
   const defenseRoll=intercepting?Math.max(1,naturalDefenseRoll):targetStun.wasStunned?1:Math.max(1,Math.min(6,naturalDefenseRoll+Number(workingGroupBuff.roll??0)+Number(targetVitals.rollBonus??0)+(critDefenseBoost?1:0)-rollPenaltyFrom(targetStun.status)))
   const defensePct=Number(workingGroupBuff.defensePct??0)+Number(targetBuffs.defensePct??0)+STANCE_DEFENSE_PCT[(targetBuffs.battleStance as BattleStance)??'neutra']
   const defenseBase=intercepting?targetSummon!.defesa:Math.ceil(Number(targetVitals.defense??0)*(1+defensePct))
   const rogueDodge=!intercepting&&(((target.hero_id==='cacadora'||target.hero_id==='cacador')&&Math.random()<.2)||(Boolean(targetVitals.dodgeBoost)&&Math.random()<.05))
   const resolved=resolveCombatRoll(attackBase,defenseBase,attackRoll,defenseRoll)
   const enemyElement=(battle.enemy?.elemento??'fisico') as Element,resisted=!intercepting&&(targetVitals.resistances??[]).includes(enemyElement)
   let rawDamage=rogueDodge?0:resolved.damage
   if(resisted&&rawDamage>0)rawDamage=Math.max(0,rawDamage-1)
   const shieldBlocked=intercepting?0:Math.min(Number(targetVitals.shield??0),rawDamage)
   const damage=rawDamage-shieldBlocked
   enemyHpNow=Math.max(0,enemyHpNow-resolved.selfDamage)
   let summonDied=false
   if(intercepting){
    const summonHpAfter=Math.max(0,targetSummon!.hp-damage)
    summonDied=summonHpAfter<=0
   }else{
    workingVitals[target.user_id]={...targetVitals,hp:Math.max(0,Number(targetVitals.hp??1)-damage),shield:Math.max(0,Number(targetVitals.shield??0)-shieldBlocked)}
   }
   const resistedDamage=Math.max(0,Number(resolved.effectiveAttack??0)-damage)
   if(resistedDamage>0)workingResisted[target.user_id]=Number(workingResisted[target.user_id]??0)+resistedDamage
   const fervorGain=!intercepting&&defenseRoll===6?Math.min(3,Number(targetBuffs.fervor??0)+1):Number(targetBuffs.fervor??0)
   const statusApplied=!intercepting&&canApplyStatus&&!rogueDodge&&!resolved.selfDamage&&damage>0&&!resisted&&naturalAttackRoll===6?applyElementalStatus(targetStun.status,enemyElement,attackBase):{status:targetStun.status}
   if(statusApplied.appliedKind){appliedStatusKind=statusApplied.appliedKind;appliedStatusTargetName=target.display_name}
   const summonsAfter=intercepting?targetSummons.map(fera=>fera===targetSummon?{...fera,hp:Math.max(0,fera.hp-damage)}:fera).filter(fera=>fera.hp>0):targetSummons
   workingBuffs[target.user_id]={...statusApplied.status,nextRoll:attackRoll===2?1:Number(targetBuffs.nextRoll??0),fervor:fervorGain,summons:summonsAfter,summon:summonsAfter[0],...(!summonsAfter.some(fera=>fera.tipo==='arcano')?{attackPct:0,defensePct:0}:{})}
   return{target,naturalAttackRoll,attackBonus:bonus,attackBase,defenseBase,attackRoll,defenseRoll,damage,shieldBlocked,selfDamage:resolved.selfDamage,rogueDodge,druidaLuck,resisted,wasStunned:targetStun.wasStunned,intercepting,summonName:targetSummon?.nome,summonDied}
  }
  const mainStrike=strike(Number(battle.enemy?.ataque??1),enemyRollBonusStart,true)
  if(!mainStrike)return current.shared_state
  // Capangas de chefe agora atacam no mesmo turno do inimigo, igual ao resolveMinionAttacks
  // do solo (game.ts) — antes o coop nem tinha capangas, então isso nunca disparava.
  const minions:any[]=Array.isArray(battle.combatMinions)?battle.combatMinions:[]
  const minionRolls:any[]=[]
  for(const minion of minions){
   if(minion.hp<=0)continue
   const result=strike(Number(minion.ataque),0,false)
   if(!result)continue
   minionRolls.push({minionName:minion.nome,targetUserId:result.target.user_id,damage:result.damage,shieldBlocked:result.shieldBlocked,rogueDodge:result.rogueDodge,intercepting:result.intercepting,summonName:result.summonName,summonDied:result.summonDied})
  }
  const wiped=membersRef.current.length>0&&membersRef.current.every(member=>(workingVitals[member.user_id]?.hp??1)<=0)
  const next=nextInitiative(battle,aliveCoopUserIds(membersRef.current,workingVitals))
  const blockedText=mainStrike.shieldBlocked?` (${mainStrike.shieldBlocked} bloqueado pelo escudo)`:''
  const mainLog=mainStrike.intercepting
   ?`${battle.enemy?.nome}: ataque ${mainStrike.attackRoll} contra defesa ${mainStrike.defenseRoll}, mas ${mainStrike.summonName} intercepta o golpe destinado a ${mainStrike.target.display_name}! A fera sofre ${mainStrike.damage} de dano${mainStrike.summonDied?' e cai em combate!':'.'}`
   :mainStrike.rogueDodge
   ?`${mainStrike.target.display_name} desviou completamente do ataque inimigo.`
   :mainStrike.selfDamage
    ?`${battle.enemy?.nome} errou catastroficamente e sofreu ${mainStrike.selfDamage} de dano com o próprio ataque.`
    :`${battle.enemy?.nome}: ataque ${mainStrike.attackRoll} contra defesa ${mainStrike.defenseRoll} de ${mainStrike.target.display_name}${mainStrike.druidaLuck?' (instinto da natureza reduziu a rolagem inimiga)':''}; causou ${mainStrike.damage} de dano${blockedText}${mainStrike.resisted?' (resistência elemental reduziu o dano)':''}${mainStrike.wasStunned?` (${mainStrike.target.display_name} estava atordoado e não conseguiu se defender)`:''}.${appliedStatusKind?` ${appliedStatusTargetName} fica ${STATUS_LABELS[appliedStatusKind]}.`:''}`
  const minionLogs=minionRolls.map(r=>{
   const targetMember=membersRef.current.find(m=>m.user_id===r.targetUserId)
   const blocked=r.shieldBlocked?` (${r.shieldBlocked} bloqueado pelo escudo)`:''
   if(r.intercepting)return`${r.summonName} intercepta o golpe de ${r.minionName} destinado a ${targetMember?.display_name}! A fera sofre ${r.damage} de dano${r.summonDied?' e cai em combate!':'.'}`
   return r.rogueDodge?`${targetMember?.display_name} desviou do golpe de ${r.minionName}.`:`${r.minionName} atacou ${targetMember?.display_name} e causou ${r.damage} de dano${blocked}.`
  })
  return{...current.shared_state,memberVitals:workingVitals,battle:{...battle,...next,enemyHp:enemyHpNow,enemyStatus:enemyStun.status,enemyRollBonus:0,playerBuffs:workingBuffs,groupBuff:workingGroupBuff,enemyFearPenalty:workingEnemyFearPenalty,fearTurnsLeft,extraActions:resolvedExtraActions,fleeRoll:undefined,turn:Number(battle.turn??1)+1,status:wiped?'lost':'playing',activeUserId:wiped?null:next.activeUserId,damageResistedByPlayer:workingResisted,lastRoll:{attacker:'enemy',naturalAttackRoll:mainStrike.naturalAttackRoll,attackBonus:mainStrike.attackBonus,attackBase:mainStrike.attackBase,defenseBase:mainStrike.defenseBase,attackEffect:attackEffect(mainStrike.attackRoll),defenseEffect:defenseEffect(mainStrike.defenseRoll),attackRoll:mainStrike.attackRoll,defenseRoll:mainStrike.defenseRoll,damage:mainStrike.damage,selfDamage:mainStrike.selfDamage,shieldBlocked:mainStrike.shieldBlocked||undefined,targetUserId:mainStrike.target.user_id,actor:battle.enemy?.nome},minionRolls,summonRolls,log:[...(battle.log??[]).slice(-15),...statusLogs,mainLog,...minionLogs,...(wiped?['A equipe foi derrotada.']:[])]}}
 })}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível executar o turno inimigo.')}}
 const completeBattle=async()=>{try{await updateState(current=>({...current.shared_state,battle:{...(current.shared_state.battle as any),status:'completed',completedAt:new Date().toISOString()}}))}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível encerrar a batalha cooperativa.')}}
 // Antes gatilhada ao confirmar a viagem no dropdown; agora gatilhada pelo anfitrião ao aceitar
 // uma emboscada ou marcar "enfrentar" num local do mapa -- mesma checagem de risco de sempre
 // (algum integrante sem vida bloqueia, e vida do próprio líder abaixo de 50% pede confirmação).
 const safeStartMapBattle=async(subregionId:string,enemy?:Record<string,unknown>)=>{
  // Presença na sala já conta como prontidão. A caçada só continua bloqueada quando alguém ainda
  // não sincronizou atributos, está sem vida ou preso em outra tela.
  const vitals=(roomRef.current?.shared_state?.memberVitals??{}) as Record<string,{hp:number;maxHp:number;locked?:boolean}>,missing=membersRef.current.find(member=>!usableCoopVitals(vitals[member.user_id])),zero=membersRef.current.find(member=>(vitals[member.user_id]?.hp??1)<=0),mine=vitals[userId]
  if(missing){setNotice(`${missing.display_name} ainda está sincronizando vida e atributos. Aguarde um instante e tente de novo.`);return}
  if(zero){setNotice(`${zero.display_name} está sem vida e precisa se recuperar antes da caçada.`);return}
  // Sem essa checagem, uma batalha compartilhada podia começar com alguém preso na própria tela
  // de combate solo ou no saque de uma masmorra (isNavigationLocked) -- essa pessoa nunca é
  // puxada pra luta de grupo (trocar a tela dela à força corromperia o combate solo em
  // andamento), e a iniciativa compartilhada ficava travada esperando pela vez de quem nunca
  // vai jogar. Bloqueia a caçada até que todos estejam livres pra entrar.
  const stuck=membersRef.current.find(member=>member.user_id!==userId&&vitals[member.user_id]?.locked)
  if(stuck){setNotice(`${stuck.display_name} está ocupado(a) em outra tela e não pode entrar na batalha agora. Aguarde um instante e tente de novo.`);return}
  if(mine&&mine.hp<mine.maxHp*.5){
   const proceed=await new Promise<boolean>(resolve=>{
    const overlay=document.createElement('div');overlay.className='coop-risk-overlay'
    overlay.innerHTML=`<section role="dialog"><small>PREPARAÇÃO DA CAÇADA</small><h2>Caçada arriscada</h2><p>Seu herói possui <b>${mine.hp}/${mine.maxHp}</b> de vida, menos de 50% do total. Deseja continuar?</p><div><button data-action="cancel">Preparar-se primeiro</button><button class="primary" data-action="continue">Continuar mesmo assim</button></div></section>`
    overlay.onclick=event=>{const action=(event.target as HTMLElement).closest('button')?.dataset.action;if(!action)return;overlay.remove();resolve(action==='continue')}
    document.body.appendChild(overlay)
   })
   if(!proceed)return
  }
  await startMapBattle(subregionId,enemy)
 }
 return <CoopContext.Provider value={{room,members,userId,onlineCount,busy,notice,create,join,leave,transferHost,publishProgress,publishMapPos,startMapBattle:safeStartMapBattle,listMarketItem,cancelMarketListing,buyMarketListing,settleMarketSale,coopAttack,coopAbility,coopUltimate,coopSummon,coopSetStance,coopFlee,resolveEnemyTurn,completeBattle,sendEmote}}>{children}</CoopContext.Provider>
}
export function useCoop(){const value=React.useContext(CoopContext);if(!value)throw new Error('CoopProvider não encontrado.');return value}
