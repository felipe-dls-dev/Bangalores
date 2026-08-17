import React from 'react'
import { resolveCombatRoll, summonBossMinions } from '../store/game'
import { createOnlineRoom, ensureOnlineUser, joinOnlineRoom, leaveOnlineRoom, loadOnlineRoom, publishRoomState, setMemberReady, subscribeToOnlineRoom, unsubscribeFromOnlineRoom, type OnlineMember, type OnlineRoom } from './supabase'
type CoopDestinationKind='encounter'|'subregionBoss'|'regionBoss'
type CoopVitals={hp:number;maxHp:number;level:number;defense:number;shield:number;rollBonus:number;critDefenseBoost:boolean;dodgeBoost?:boolean}
type CoopContextValue={room:OnlineRoom|null;members:OnlineMember[];userId:string;onlineCount:number;busy:boolean;notice:string;create:(name:string,heroId?:string)=>Promise<void>;join:(code:string,name:string,heroId?:string)=>Promise<void>;leave:()=>Promise<void>;toggleReady:(heroId?:string)=>Promise<void>;publishProgress:(progress:Record<string,number>,vitals:CoopVitals)=>Promise<void>;selectDestination:(regionId:string,subregionId:string,kind?:CoopDestinationKind)=>Promise<void>;confirmTravel:(enemy?:Record<string,unknown>)=>Promise<void>;coopAttack:(attackBase:number,defenseBase:number,rollBonus?:number,critBoost?:boolean,healChance?:number,healAmount?:number,label?:string,targetMinionId?:string,forceCrit?:boolean,critChancePct?:number,critDamageBonusPct?:number)=>Promise<void>;coopAbility:(label:string,damage:number,effect:string)=>Promise<void>;coopDefend:()=>Promise<void>;resolveEnemyTurn:()=>Promise<void>;completeBattle:()=>Promise<void>}
const CoopContext=React.createContext<CoopContextValue|null>(null),ROOM_KEY='bangalores-coop-room-id'
const shuffled=(values:string[])=>{const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}return result}
const nextInitiative=(battle:any)=>{const order=Array.isArray(battle.initiativeOrder)?battle.initiativeOrder:[],nextIndex=(Number(battle.initiativeIndex??0)+1)%Math.max(1,order.length),round=nextIndex===0?Number(battle.round??1)+1:Number(battle.round??1);return{activeUserId:order[nextIndex],initiativeIndex:nextIndex,round}}
export function CoopProvider({children}:{children:React.ReactNode}){
 const [room,setRoom]=React.useState<OnlineRoom|null>(null),[members,setMembers]=React.useState<OnlineMember[]>([]),[userId,setUserId]=React.useState(''),[onlineCount,setOnlineCount]=React.useState(0),[busy,setBusy]=React.useState(false),[notice,setNotice]=React.useState('')
 const channel=React.useRef<ReturnType<typeof subscribeToOnlineRoom>>(null),roomRef=React.useRef<OnlineRoom|null>(null),membersRef=React.useRef<OnlineMember[]>([])
 const refresh=React.useCallback(async(roomId:string)=>{try{const data=await loadOnlineRoom(roomId);roomRef.current=data.room;membersRef.current=data.members;setRoom(data.room);setMembers(data.members)}catch(error){localStorage.removeItem(ROOM_KEY);roomRef.current=null;setRoom(null);setMembers([]);setNotice(error instanceof Error?error.message:'A sala não está mais disponível.')}},[])
 const connect=React.useCallback(async(roomId:string,id?:string)=>{await unsubscribeFromOnlineRoom(channel.current);const user=id?{id}:await ensureOnlineUser();setUserId(user.id);localStorage.setItem(ROOM_KEY,roomId);await refresh(roomId);channel.current=subscribeToOnlineRoom(roomId,()=>void refresh(roomId),presence=>setOnlineCount(Object.keys(presence).length));setNotice('Sala conectada em tempo real.')},[refresh])
 React.useEffect(()=>{const id=localStorage.getItem(ROOM_KEY);if(id)void connect(id);return()=>{void unsubscribeFromOnlineRoom(channel.current)}},[connect])
 const create=async(name:string,heroId?:string)=>{setBusy(true);try{localStorage.setItem('bangalores-coop-name',name.trim());const result=await createOnlineRoom(name,heroId);await connect(result.room_id,result.user_id)}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível criar a sala.')}finally{setBusy(false)}}
 const join=async(code:string,name:string,heroId?:string)=>{setBusy(true);try{localStorage.setItem('bangalores-coop-name',name.trim());const result=await joinOnlineRoom(code,name,heroId);await connect(result.room_id,result.user_id)}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível entrar na sala.')}finally{setBusy(false)}}
 const leave=async()=>{if(!roomRef.current)return;setBusy(true);try{await leaveOnlineRoom(roomRef.current.id);await unsubscribeFromOnlineRoom(channel.current);channel.current=null;localStorage.removeItem(ROOM_KEY);roomRef.current=null;setRoom(null);setMembers([]);setOnlineCount(0);setNotice('Você saiu da sala.')}finally{setBusy(false)}}
 const toggleReady=async(heroId?:string)=>{const current=roomRef.current,me=membersRef.current.find(member=>member.user_id===userId);if(!current||!me)return;setBusy(true);try{await setMemberReady(current.id,!me.ready,heroId);await refresh(current.id)}finally{setBusy(false)}}
 const updateState=async(makeState:(current:OnlineRoom)=>Record<string,unknown>)=>{for(let attempt=0;attempt<3;attempt++){const current=roomRef.current;if(!current)return;try{await publishRoomState(current.id,makeState(current),current.state_version);await refresh(current.id);return}catch(error){await refresh(current.id);if(attempt===2)throw error}}}
 const publishProgress=async(progress:Record<string,number>,vitals:CoopVitals)=>{if(!roomRef.current)return;try{await updateState(current=>({...current.shared_state,memberProgress:{...((current.shared_state.memberProgress as Record<string,unknown>)??{}),[userId]:progress},memberVitals:{...((current.shared_state.memberVitals as Record<string,unknown>)??{}),[userId]:vitals}}))}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível sincronizar o progresso da campanha.')}}
 const selectDestination=async(regionId:string,subregionId:string,kind:CoopDestinationKind='encounter')=>{if(roomRef.current?.host_id!==userId)return;setBusy(true);try{await updateState(current=>({...current.shared_state,destination:{regionId,subregionId,kind,selectedBy:userId,selectedAt:new Date().toISOString()},travelAcceptedBy:[],battle:undefined,rewardRule:{type:'damage_proportional',formula:'player_damage / group_damage'}}))}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível selecionar o destino.')}finally{setBusy(false)}}
 const confirmTravel=async(enemy?:Record<string,unknown>)=>{setBusy(true);try{await updateState(current=>{const accepted=[...new Set([...(Array.isArray(current.shared_state.travelAcceptedBy)?current.shared_state.travelAcceptedBy as string[]:[]),userId])],allAccepted=membersRef.current.length>=2&&membersRef.current.every(member=>accepted.includes(member.user_id)),enemyHp=Number((enemy as any)?.vida??0),initiativeOrder=shuffled([...membersRef.current.map(member=>member.user_id),'enemy']),activeUserId=initiativeOrder[0],initiativeNames=initiativeOrder.map(id=>id==='enemy'?String((enemy as any)?.nome??'Inimigo'):membersRef.current.find(member=>member.user_id===id)?.display_name??'Aventureiro');return{...current.shared_state,travelAcceptedBy:accepted,...(allAccepted?{battle:{id:`coop_${Date.now()}`,status:'playing',subregionId:(current.shared_state.destination as any)?.subregionId,startedAt:new Date().toISOString(),enemy,enemyHp,combatMinions:[],damageByPlayer:{},initiativeOrder,initiativeNames,initiativeIndex:0,activeUserId,turn:1,round:1,log:[`Iniciativa sorteada: ${initiativeNames.join(' → ')}.`]}}:{})}})}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível confirmar a viagem.')}finally{setBusy(false)}}
 const coopAttack=async(attackBase:number,defenseBase:number,rollBonus=0,critBoost=false,healChance=0,healAmount=0,label?:string,targetMinionId?:string,forceCrit=false,critChancePct=0,critDamageBonusPct=0)=>{try{await updateState(current=>{
  const battle=current.shared_state.battle as any
  if(!battle||battle.status!=='playing'||battle.activeUserId!==userId)return current.shared_state
  const group=battle.groupBuff??{},personal=battle.playerBuffs?.[userId]??{}
  if(forceCrit&&Number(personal.fervor??0)<3)return current.shared_state
  const minions:any[]=Array.isArray(battle.combatMinions)?battle.combatMinions:[]
  const target=targetMinionId?minions.find(m=>m.id===targetMinionId&&m.hp>0):undefined
  const totalRollBonus=Number(group.roll??0)+Number(personal.roll??0)+Number(personal.nextRoll??0)+rollBonus
  const totalCritBoost=Boolean(group.critBoost)||critBoost
  // Crítico forjado é um proc independente da forja (não consome Fervor, ao contrário de forceCrit).
  const forgedCrit=!forceCrit&&critChancePct>0&&Math.random()<critChancePct
  const naturalAttackRoll=forceCrit||forgedCrit?6:1+Math.floor(Math.random()*6)
  const attackRoll=forceCrit||forgedCrit?6:Math.min(6,naturalAttackRoll+totalRollBonus+(totalCritBoost&&naturalAttackRoll===5?1:0))
  const defenseRoll=1+Math.floor(Math.random()*6)
  const buffedAttack=Math.ceil(attackBase*(1+Number(group.attackPct??0)+Number(personal.attackPct??0)))
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
  const next=keepsTurn?{activeUserId:userId,initiativeIndex:battle.initiativeIndex,round:battle.round}:nextInitiative(battle)
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
  const tag=label&&label!=='Ataque'?label:undefined
  const message=selfDamage
   ?`${actor}${tag?` usa ${tag} e`:' ataca, mas'} falha catastroficamente (dado ${attackRoll}) e sofre ${selfDamage} de dano do próprio golpe.`
   :`${actor}${tag?` usa ${tag}:`:':'} ataque ${attackRoll} contra defesa ${defenseRoll}; causou ${actual} de dano${target?` a ${foeName}${felled?' (derrotado)':''}`:''}.${phased?` ${enemy.nome} entra em nova fase e convoca reforços!`:''}${keepsTurn?' Ataque Duplo permite atacar novamente.':''}${attackRoll===2?' O inimigo recebe +1 na próxima rolagem.':''}${healTargetUserId?` A energia natural do equipamento cura ${healAmount}${healTargetName?` de ${healTargetName}`:''}.`:''}`
  return{...current.shared_state,battle:{...battle,...next,extraActions,playerBuffs,enemyRollBonus,enemy,enemyHp,combatMinions,damageByPlayer,status:enemyHp<=0?'won':'playing',activeUserId:enemyHp<=0?null:next.activeUserId,turn:Number(battle.turn??1)+(keepsTurn?0:1),lastRoll:{attacker:'hero',attackRoll,defenseRoll,damage:actual,actor,selfDamage,selfDamageUserId:selfDamage>0?userId:undefined,...(healTargetUserId?{healTargetUserId,healAmount}:{})},log:[...(battle.log??[]).slice(-15),message]}}
 })}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível executar a ação cooperativa.')}}
 const coopDefend=async()=>{try{await updateState(current=>{
  const battle=current.shared_state.battle as any
  if(!battle||battle.status!=='playing'||battle.activeUserId!==userId)return current.shared_state
  const personal=battle.playerBuffs?.[userId]??{}
  const playerBuffs={...(battle.playerBuffs??{}),[userId]:{...personal,braced:true}}
  const actor=membersRef.current.find(m=>m.user_id===userId)?.display_name??'Aventureiro'
  const next=nextInitiative(battle)
  return{...current.shared_state,battle:{...battle,...next,playerBuffs,turn:Number(battle.turn??1)+1,log:[...(battle.log??[]).slice(-15),`${actor} assume postura defensiva, preparando-se para amortecer o próximo golpe do inimigo.`]}}
 })}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível executar a ação cooperativa.')}}
 const coopAbility=async(label:string,damage:number,effect:string)=>{try{await updateState(current=>{const battle=current.shared_state.battle as any;if(!battle||battle.status!=='playing'||battle.activeUserId!==userId)return current.shared_state;const actual=Math.min(Number(battle.enemyHp??0),Math.max(0,damage)),enemyHp=Math.max(0,Number(battle.enemyHp??0)-actual),damageByPlayer={...(battle.damageByPlayer??{}),[userId]:Number(battle.damageByPlayer?.[userId]??0)+actual},actor=membersRef.current.find(m=>m.user_id===userId)?.display_name??'Aventureiro',keepsTurn=effect==='DOUBLE_ATTACK',next=keepsTurn?{activeUserId:userId,initiativeIndex:battle.initiativeIndex,round:battle.round}:nextInitiative(battle),playerBuffs=effect==='WARRIOR_BUFF'?{...(battle.playerBuffs??{}),[userId]:{...(battle.playerBuffs?.[userId]??{}),attackPct:.1,defensePct:.1}}:battle.playerBuffs,groupBuff=effect==='ARCANE_GROUP_BUFF'?{...(battle.groupBuff??{}),roll:2,attackPct:.1,defensePct:.1}:effect==='HUNTER_CRITICAL'?{...(battle.groupBuff??{}),critBoost:true}:battle.groupBuff,extraActions=effect==='DOUBLE_ATTACK'?{...(battle.extraActions??{}),[userId]:1}:battle.extraActions,tauntUserId=effect==='GUARDIAN_TAUNT'?userId:battle.tauntUserId,vitals=(current.shared_state.memberVitals??{}) as Record<string,{hp:number;maxHp:number}>,healTarget=effect==='DRUID_HEAL'?membersRef.current.reduce((worst:{member:OnlineMember;vitals:{hp:number;maxHp:number};ratio:number}|null,member)=>{const v=vitals[member.user_id];if(!v||v.hp<=0)return worst;const ratio=v.hp/Math.max(1,v.maxHp);return!worst||ratio<worst.ratio?{member,vitals:v,ratio}:worst},null):null,healAmount=healTarget?Math.max(0,Math.min(Math.max(1,Math.ceil(healTarget.vitals.maxHp*.3)),healTarget.vitals.maxHp-healTarget.vitals.hp)):0,description=effect==='GUARDIAN_TAUNT'?'inimigos priorizarão o Guardião':effect==='WARRIOR_BUFF'?'+10% de Ataque e Defesa base':effect==='DOUBLE_ATTACK'?'dois ataques liberados neste turno':effect==='ARCANE_GROUP_BUFF'?'+2 nos dados e +10% de Ataque e Defesa para todos':effect==='DRUID_HEAL'?(healTarget&&healAmount>0?`curou ${healAmount} de vida de ${healTarget.member.display_name}`:'não havia vida para recuperar'):effect==='HUNTER_CRITICAL'?'resultados 5 e 6 passam a causar ataques críticos para o grupo':effect,message=`${actor} usou ${label}: ${description}${actual?` e causou ${actual} de dano`:''}.`;return{...current.shared_state,battle:{...battle,...next,playerBuffs,groupBuff,extraActions,tauntUserId,enemyHp,damageByPlayer,status:enemyHp<=0?'won':'playing',activeUserId:enemyHp<=0?null:next.activeUserId,turn:Number(battle.turn??1)+(keepsTurn?0:1),lastRoll:{attacker:'ability',damage:actual,actor,label,effect:description,effectType:effect,healTargetUserId:healTarget?.member.user_id,healAmount},log:[...(battle.log??[]).slice(-15),message]}}})}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível usar a habilidade cooperativa.')}}
 const resolveEnemyTurn=async()=>{if(roomRef.current?.host_id!==userId)return;try{await updateState(current=>{
  const battle=current.shared_state.battle as any
  if(!battle||battle.status!=='playing'||battle.activeUserId!=='enemy')return current.shared_state
  const startVitals=(current.shared_state.memberVitals??{}) as Record<string,{hp:number;defense?:number;shield?:number;rollBonus?:number;critDefenseBoost?:boolean}>
  const workingVitals:Record<string,any>={...startVitals}
  const workingBuffs:Record<string,any>={...(battle.playerBuffs??{})}
  let enemyHpNow=Number(battle.enemyHp??0)
  const enemyRollBonusStart=Number(battle.enemyRollBonus??0)
  const pickTarget=()=>{
   const living=membersRef.current.filter(member=>(workingVitals[member.user_id]?.hp??1)>0)
   const taunt=living.find(member=>member.user_id===battle.tauntUserId)
   return taunt??living[Math.floor(Math.random()*Math.max(1,living.length))]??membersRef.current[0]
  }
  // Passiva da Druida (25% de chance de -1 no dado de ataque inimigo), postura defensiva,
  // Fervor de Combate e escudo agora se aplicam da mesma forma a qualquer atacante inimigo
  // (chefe principal ou capanga), não só ao chefe.
  const strike=(attackBase:number,bonus:number)=>{
   const target=pickTarget()
   if(!target?.user_id)return null
   const targetVitals=workingVitals[target.user_id]??{}
   const targetBuffs=workingBuffs[target.user_id]??{}
   const naturalAttackRoll=1+Math.floor(Math.random()*6)
   const druidaLuck=target.hero_id==='druida'&&Math.random()<.25
   const attackRoll=Math.max(1,Math.min(6,naturalAttackRoll+bonus-(druidaLuck?1:0)))
   const naturalDefenseRoll=1+Math.floor(Math.random()*6)
   const critDefenseBoost=Boolean(targetVitals.critDefenseBoost)&&naturalDefenseRoll===5
   const defenseRoll=Math.min(6,naturalDefenseRoll+Number(battle.groupBuff?.roll??0)+Number(targetVitals.rollBonus??0)+(critDefenseBoost?1:0))
   const defensePct=Number(battle.groupBuff?.defensePct??0)+Number(targetBuffs.defensePct??0)
   const defenseBase=Math.ceil(Number(targetVitals.defense??0)*(1+defensePct))+(targetBuffs.braced?2:0)
   const rogueDodge=((target.hero_id==='cacadora'||target.hero_id==='cacador')&&Math.random()<.2)||(Boolean(targetVitals.dodgeBoost)&&Math.random()<.05)
   const resolved=resolveCombatRoll(attackBase,defenseBase,attackRoll,defenseRoll)
   const rawDamage=rogueDodge?0:resolved.damage
   const shieldBlocked=Math.min(Number(targetVitals.shield??0),rawDamage)
   const damage=rawDamage-shieldBlocked
   enemyHpNow=Math.max(0,enemyHpNow-resolved.selfDamage)
   workingVitals[target.user_id]={...targetVitals,hp:Math.max(0,Number(targetVitals.hp??1)-damage),shield:Math.max(0,Number(targetVitals.shield??0)-shieldBlocked)}
   const fervorGain=defenseRoll===6?Math.min(3,Number(targetBuffs.fervor??0)+1):Number(targetBuffs.fervor??0)
   workingBuffs[target.user_id]={...targetBuffs,nextRoll:attackRoll===2?1:Number(targetBuffs.nextRoll??0),braced:false,fervor:fervorGain}
   return{target,attackRoll,defenseRoll,damage,shieldBlocked,selfDamage:resolved.selfDamage,rogueDodge,druidaLuck}
  }
  const mainStrike=strike(Number(battle.enemy?.ataque??1),enemyRollBonusStart)
  if(!mainStrike)return current.shared_state
  // Capangas de chefe agora atacam no mesmo turno do inimigo, igual ao resolveMinionAttacks
  // do solo (game.ts) — antes o coop nem tinha capangas, então isso nunca disparava.
  const minions:any[]=Array.isArray(battle.combatMinions)?battle.combatMinions:[]
  const minionRolls:any[]=[]
  for(const minion of minions){
   if(minion.hp<=0)continue
   const result=strike(Number(minion.ataque),0)
   if(!result)continue
   minionRolls.push({minionName:minion.nome,targetUserId:result.target.user_id,damage:result.damage,shieldBlocked:result.shieldBlocked,rogueDodge:result.rogueDodge})
  }
  const wiped=membersRef.current.length>0&&membersRef.current.every(member=>(workingVitals[member.user_id]?.hp??1)<=0)
  const next=nextInitiative(battle)
  const blockedText=mainStrike.shieldBlocked?` (${mainStrike.shieldBlocked} bloqueado pelo escudo)`:''
  const mainLog=mainStrike.rogueDodge
   ?`${mainStrike.target.display_name} desviou completamente do ataque inimigo.`
   :mainStrike.selfDamage
    ?`${battle.enemy?.nome} errou catastroficamente e sofreu ${mainStrike.selfDamage} de dano com o próprio ataque.`
    :`${battle.enemy?.nome}: ataque ${mainStrike.attackRoll} contra defesa ${mainStrike.defenseRoll} de ${mainStrike.target.display_name}${mainStrike.druidaLuck?' (instinto da natureza reduziu a rolagem inimiga)':''}; causou ${mainStrike.damage} de dano${blockedText}.`
  const minionLogs=minionRolls.map(r=>{
   const targetMember=membersRef.current.find(m=>m.user_id===r.targetUserId)
   const blocked=r.shieldBlocked?` (${r.shieldBlocked} bloqueado pelo escudo)`:''
   return r.rogueDodge?`${targetMember?.display_name} desviou do golpe de ${r.minionName}.`:`${r.minionName} atacou ${targetMember?.display_name} e causou ${r.damage} de dano${blocked}.`
  })
  return{...current.shared_state,memberVitals:workingVitals,battle:{...battle,...next,enemyHp:enemyHpNow,enemyRollBonus:0,playerBuffs:workingBuffs,turn:Number(battle.turn??1)+1,status:wiped?'lost':'playing',activeUserId:wiped?null:next.activeUserId,lastRoll:{attacker:'enemy',attackRoll:mainStrike.attackRoll,defenseRoll:mainStrike.defenseRoll,damage:mainStrike.damage,shieldBlocked:mainStrike.shieldBlocked||undefined,targetUserId:mainStrike.target.user_id,actor:battle.enemy?.nome},minionRolls,log:[...(battle.log??[]).slice(-15),mainLog,...minionLogs,...(wiped?['A equipe foi derrotada.']:[])]}}
 })}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível executar o turno inimigo.')}}
 const completeBattle=async()=>{try{await updateState(current=>({...current.shared_state,travelAcceptedBy:[],battle:{...(current.shared_state.battle as any),status:'completed',completedAt:new Date().toISOString()}}))}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível encerrar a batalha cooperativa.')}}
 const safeConfirmTravel=async(enemy?:Record<string,unknown>)=>{const accepted=(roomRef.current?.shared_state?.travelAcceptedBy??[]) as string[];if(accepted.includes(userId)){await updateState(current=>({...current.shared_state,travelAcceptedBy:((current.shared_state.travelAcceptedBy??[]) as string[]).filter(id=>id!==userId)}));return}const vitals=(roomRef.current?.shared_state?.memberVitals??{}) as Record<string,{hp:number;maxHp:number}>,zero=membersRef.current.find(member=>(vitals[member.user_id]?.hp??1)<=0),mine=vitals[userId];if(zero){setNotice(`${zero.display_name} está sem vida e precisa se recuperar antes da caçada.`);return}if(mine&&mine.hp<mine.maxHp*.5){const proceed=await new Promise<boolean>(resolve=>{const overlay=document.createElement('div');overlay.className='coop-risk-overlay';overlay.innerHTML=`<section role="dialog"><small>PREPARAÇÃO DA CAÇADA</small><h2>Caçada arriscada</h2><p>Seu herói possui <b>${mine.hp}/${mine.maxHp}</b> de vida, menos de 50% do total. Deseja continuar?</p><div><button data-action="cancel">Preparar-se primeiro</button><button class="primary" data-action="continue">Continuar mesmo assim</button></div></section>`;overlay.onclick=event=>{const action=(event.target as HTMLElement).closest('button')?.dataset.action;if(!action)return;overlay.remove();resolve(action==='continue')};document.body.appendChild(overlay)});if(!proceed)return}await confirmTravel(enemy)}
 return <CoopContext.Provider value={{room,members,userId,onlineCount,busy,notice,create,join,leave,toggleReady,publishProgress,selectDestination,confirmTravel:safeConfirmTravel,coopAttack,coopAbility,coopDefend,resolveEnemyTurn,completeBattle}}>{children}</CoopContext.Provider>
}
export function useCoop(){const value=React.useContext(CoopContext);if(!value)throw new Error('CoopProvider não encontrado.');return value}
