import React from 'react'
import { attackEffect, applyElementalStatus, buildSummon, consumeStun, defenseEffect, resolveCombatRoll, rollPenaltyFrom, summonBossMinions, tickStatus, SUMMON_INTERCEPT_CHANCE, STATUS_LABELS, type AttackAnimType, type StatusEffects, type Summon, type SummonType } from '../store/game'
import type { Element } from '../data/expansion'
import { createOnlineRoom, ensureOnlineUser, joinOnlineRoom, leaveOnlineRoom, loadOnlineRoom, publishRoomState, setMemberReady, subscribeToOnlineRoom, unsubscribeFromOnlineRoom, type OnlineMember, type OnlineRoom } from './supabase'
type CoopDestinationKind='encounter'|'subregionBoss'|'regionBoss'
type CoopVitals={hp:number;maxHp:number;level:number;defense:number;shield:number;rollBonus:number;critDefenseBoost:boolean;dodgeBoost?:boolean;weaponAnim?:AttackAnimType;resistances?:Element[]}
type CoopContextValue={room:OnlineRoom|null;members:OnlineMember[];userId:string;onlineCount:number;busy:boolean;notice:string;create:(name:string,heroId?:string)=>Promise<void>;join:(code:string,name:string,heroId?:string)=>Promise<void>;leave:()=>Promise<void>;toggleReady:(heroId?:string)=>Promise<void>;publishProgress:(progress:Record<string,number>,vitals:CoopVitals)=>Promise<void>;selectDestination:(regionId:string,subregionId:string,kind?:CoopDestinationKind)=>Promise<void>;confirmTravel:(enemy?:Record<string,unknown>)=>Promise<void>;coopAttack:(attackBase:number,defenseBase:number,rollBonus?:number,critBoost?:boolean,healChance?:number,healAmount?:number,label?:string,targetMinionId?:string,forceCrit?:boolean,critChancePct?:number,critDamageBonusPct?:number,weaponElement?:Element,forceStatus?:boolean)=>Promise<void>;coopAbility:(label:string,damage:number,effect:string)=>Promise<void>;coopSummon:(tipo:SummonType)=>Promise<void>;coopDefend:()=>Promise<void>;coopFlee:()=>Promise<void>;resolveEnemyTurn:()=>Promise<void>;completeBattle:()=>Promise<void>}
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
 const confirmTravel=async(enemy?:Record<string,unknown>)=>{setBusy(true);try{await updateState(current=>{const accepted=[...new Set([...(Array.isArray(current.shared_state.travelAcceptedBy)?current.shared_state.travelAcceptedBy as string[]:[]),userId])],allAccepted=membersRef.current.length>=2&&membersRef.current.every(member=>accepted.includes(member.user_id)),enemyHp=Number((enemy as any)?.vida??0),initiativeOrder=shuffled([...membersRef.current.map(member=>member.user_id),'enemy']),activeUserId=initiativeOrder[0],initiativeNames=initiativeOrder.map(id=>id==='enemy'?String((enemy as any)?.nome??'Inimigo'):membersRef.current.find(member=>member.user_id===id)?.display_name??'Aventureiro');return{...current.shared_state,travelAcceptedBy:accepted,...(allAccepted?{battle:{id:`coop_${Date.now()}`,status:'playing',subregionId:(current.shared_state.destination as any)?.subregionId,startedAt:new Date().toISOString(),enemy,enemyHp,combatMinions:[],damageByPlayer:{},enemyFearPenalty:0,fearTurnsLeft:0,groupBuff:{},playerBuffs:{},enemyStatus:{},initiativeOrder,initiativeNames,initiativeIndex:0,activeUserId,turn:1,round:1,log:[`Iniciativa sorteada: ${initiativeNames.join(' → ')}.`]}}:{})}})}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível confirmar a viagem.')}finally{setBusy(false)}}
 const coopAttack=async(attackBase:number,defenseBase:number,rollBonus=0,critBoost=false,healChance=0,healAmount=0,label?:string,targetMinionId?:string,forceCrit=false,critChancePct=0,critDamageBonusPct=0,weaponElement:Element='fisico',forceStatus=false)=>{try{await updateState(current=>{
  const battle=current.shared_state.battle as any
  if(!battle||battle.status!=='playing'||battle.activeUserId!==userId)return current.shared_state
  const group=battle.groupBuff??{}
  const personal=battle.playerBuffs?.[userId]??{}
  if(personal.stunned){
   const actorName=membersRef.current.find(m=>m.user_id===userId)?.display_name??'Aventureiro',next=nextInitiative(battle)
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
  // Cura recebida conta como contribuição para a recompensa (rateio de ouro/XP), do mesmo
  // jeito que dano causado — quem manteve o grupo de pé também ajudou a vencer a batalha.
  const healingByPlayer=healTargetUserId?{...(battle.healingByPlayer??{}),[userId]:Number(battle.healingByPlayer?.[userId]??0)+healAmount}:battle.healingByPlayer
  const tag=label&&label!=='Ataque'?label:undefined
  const statusResult=!target&&actual>0&&!selfDamage&&(forceStatus||naturalAttackRoll===6)?applyElementalStatus(enemyStun.status,weaponElement,buffedAttack,forceStatus):{status:enemyStun.status,appliedKind:undefined as string|undefined}
  const message=selfDamage
   ?`${actor}${tag?` usa ${tag} e`:' ataca, mas'} falha catastroficamente (dado ${attackRoll}) e sofre ${selfDamage} de dano do próprio golpe.`
   :`${actor}${tag?` usa ${tag}:`:':'} ataque ${attackRoll} contra defesa ${defenseRoll}; causou ${actual} de dano${target?` a ${foeName}${felled?' (derrotado)':''}`:''}.${phased?` ${enemy.nome} entra em nova fase e convoca reforços!`:''}${keepsTurn?' Ataque Duplo permite atacar novamente.':''}${attackRoll===2?' O inimigo recebe +1 na próxima rolagem.':''}${healTargetUserId?` A energia natural do equipamento cura ${healAmount}${healTargetName?` de ${healTargetName}`:''}.`:''}${enemyStun.wasStunned?` ${foeName} estava atordoado e não conseguiu se defender.`:''}${statusResult.appliedKind?` ${foeName} fica ${STATUS_LABELS[statusResult.appliedKind]}.`:''}`
  return{...current.shared_state,battle:{...battle,...next,extraActions,playerBuffs,enemyRollBonus,enemy,enemyHp,enemyStatus:statusResult.status,combatMinions,damageByPlayer,healingByPlayer,fleeRoll:undefined,status:enemyHp<=0?'won':'playing',activeUserId:enemyHp<=0?null:next.activeUserId,turn:Number(battle.turn??1)+(keepsTurn?0:1),lastRoll:{attacker:'hero',attackerUserId:userId,naturalAttackRoll,attackRoll,attackBonus:totalRollBonus,attackBase:buffedAttack,defenseBase:target?0:defenseBase,attackEffect:attackEffect(attackRoll),defenseEffect:defenseEffect(defenseRoll),defenseRoll,damage:actual,actor,selfDamage,selfDamageUserId:selfDamage>0?userId:undefined,...(healTargetUserId?{healTargetUserId,healAmount}:{})},log:[...(battle.log??[]).slice(-15),message]}}
 })}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível executar a ação cooperativa.')}}
 // Postura defensiva agora é uma escolha persistente (dura até o fim da batalha ou até o
 // jogador desativá-la), não uma ação de um único turno. Ativá-la pela primeira vez na batalha
 // não consome o turno (activeUserId permanece o mesmo); desativar ou reativar depois consome
 // normalmente, igual a qualquer outra ação.
 const coopDefend=async()=>{try{await updateState(current=>{
  const battle=current.shared_state.battle as any
  if(!battle||battle.status!=='playing'||battle.activeUserId!==userId)return current.shared_state
  const personal=battle.playerBuffs?.[userId]??{}
  const actor=membersRef.current.find(m=>m.user_id===userId)?.display_name??'Aventureiro'
  if(personal.stunned){
   const next=nextInitiative(battle)
   return{...current.shared_state,battle:{...battle,...next,playerBuffs:{...(battle.playerBuffs??{}),[userId]:{...personal,stunned:false}},turn:Number(battle.turn??1)+1,log:[...(battle.log??[]).slice(-15),`${actor} está atordoado e perde a ação neste turno.`]}}
  }
  if(personal.braced){
   const playerBuffs={...(battle.playerBuffs??{}),[userId]:{...personal,braced:false}}
   const next=nextInitiative(battle)
   return{...current.shared_state,battle:{...battle,...next,playerBuffs,fleeRoll:undefined,turn:Number(battle.turn??1)+1,log:[...(battle.log??[]).slice(-15),`${actor} desativou a postura defensiva.`]}}
  }
  if(!personal.braceBonusUsed){
   const playerBuffs={...(battle.playerBuffs??{}),[userId]:{...personal,braced:true,braceBonusUsed:true}}
   return{...current.shared_state,battle:{...battle,activeUserId:userId,playerBuffs,fleeRoll:undefined,log:[...(battle.log??[]).slice(-15),`${actor} assume postura defensiva: +2 de Defesa até o fim da batalha ou até desativar. Pode agir novamente neste turno.`]}}
  }
  const playerBuffs={...(battle.playerBuffs??{}),[userId]:{...personal,braced:true}}
  const next=nextInitiative(battle)
  return{...current.shared_state,battle:{...battle,...next,playerBuffs,fleeRoll:undefined,turn:Number(battle.turn??1)+1,log:[...(battle.log??[]).slice(-15),`${actor} reativou a postura defensiva: +2 de Defesa até o fim da batalha ou até desativar.`]}}
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
  const next=nextInitiative(battle)
  return{...current.shared_state,battle:{...battle,...next,turn:Number(battle.turn??1)+1,fleeRoll:{roll,outcome},log}}
 })}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível executar a ação cooperativa.')}}
 const coopAbility=async(label:string,damage:number,effect:string)=>{try{await updateState(current=>{const battle=current.shared_state.battle as any;if(!battle||battle.status!=='playing'||battle.activeUserId!==userId)return current.shared_state
  if(battle.playerBuffs?.[userId]?.stunned){const actorName=membersRef.current.find(m=>m.user_id===userId)?.display_name??'Aventureiro',next=nextInitiative(battle);return{...current.shared_state,battle:{...battle,...next,playerBuffs:{...(battle.playerBuffs??{}),[userId]:{...battle.playerBuffs[userId],stunned:false}},turn:Number(battle.turn??1)+1,log:[...(battle.log??[]).slice(-15),`${actorName} está atordoado e perde a ação neste turno.`]}}}
  const actual=Math.min(Number(battle.enemyHp??0),Math.max(0,damage)),enemyHp=Math.max(0,Number(battle.enemyHp??0)-actual),damageByPlayer={...(battle.damageByPlayer??{}),[userId]:Number(battle.damageByPlayer?.[userId]??0)+actual},actor=membersRef.current.find(m=>m.user_id===userId)?.display_name??'Aventureiro',keepsTurn=effect==='DOUBLE_ATTACK',next=keepsTurn?{activeUserId:userId,initiativeIndex:battle.initiativeIndex,round:battle.round}:nextInitiative(battle),vitals=(current.shared_state.memberVitals??{}) as Record<string,{hp:number;maxHp:number}>,
  // Bênção da Vida (PRIEST_REVIVE) prioriza reanimar um aliado caído (hp<=0); se ninguém
  // estiver caído, cai para o mesmo comportamento de cura da Druida (aliado vivo mais ferido).
  downedMember=effect==='PRIEST_REVIVE'?membersRef.current.find(member=>(vitals[member.user_id]?.hp??1)<=0):undefined,
  healTarget=(effect==='DRUID_HEAL'||(effect==='PRIEST_REVIVE'&&!downedMember))?membersRef.current.reduce((worst:{member:OnlineMember;vitals:{hp:number;maxHp:number};ratio:number}|null,member)=>{const v=vitals[member.user_id];if(!v||v.hp<=0)return worst;const ratio=v.hp/Math.max(1,v.maxHp);return!worst||ratio<worst.ratio?{member,vitals:v,ratio}:worst},null):(downedMember?{member:downedMember,vitals:vitals[downedMember.user_id]??{hp:0,maxHp:1},ratio:0}:null),
  healAmount=healTarget?(downedMember?Math.max(1,Math.ceil(healTarget.vitals.maxHp*.3)):Math.max(0,Math.min(Math.max(1,Math.ceil(healTarget.vitals.maxHp*.3)),healTarget.vitals.maxHp-healTarget.vitals.hp))):0,
  // Ímpeto Marcial (WARRIOR_BUFF), Ascensão Arcana (ARCANE_GROUP_BUFF), Marca do Predador
  // (HUNTER_CRITICAL) e Conjurar Fera Espectral (SUMMON_BOND) têm duração máxima em turnos
  // consecutivos (buffTurnsLeft/fearTurnsLeft/arcaneTurnsLeft/critTurnsLeft), decrementada uma
  // vez por rodada em resolveEnemyTurn. Reativar a habilidade RENOVA a duração em vez de somar
  // o bônus de novo (evita empilhar percentuais quando o mesmo herói usa a habilidade mais de
  // uma vez na mesma batalha).
  playerBuffs=effect==='WARRIOR_BUFF'?{...(battle.playerBuffs??{}),[userId]:{...(battle.playerBuffs?.[userId]??{}),attackPct:.1,defensePct:.1,buffTurnsLeft:3}}:(effect==='DRUID_HEAL'||effect==='PRIEST_REVIVE')&&healTarget?{...(battle.playerBuffs??{}),[healTarget.member.user_id]:(({bleed,burn,poison,frozen,grabbed,blinded,stunned,...rest})=>rest)(battle.playerBuffs?.[healTarget.member.user_id]??{})}:battle.playerBuffs,
  enemyFearPenalty=effect==='WARRIOR_BUFF'?1:battle.enemyFearPenalty,fearTurnsLeft=effect==='WARRIOR_BUFF'?3:battle.fearTurnsLeft,
  enemyStatus=effect==='WARRIOR_BUFF'&&battle.enemyStatus?.bleed?{...battle.enemyStatus,bleed:{...battle.enemyStatus.bleed,turns:3}}:battle.enemyStatus,
  groupBuff=effect==='ARCANE_GROUP_BUFF'?{...(battle.groupBuff??{}),roll:1,attackPct:.1,defensePct:.1,arcaneTurnsLeft:3}:effect==='HUNTER_CRITICAL'?{...(battle.groupBuff??{}),critBoost:true,critTurnsLeft:2}:battle.groupBuff,
  extraActions=effect==='DOUBLE_ATTACK'?{...(battle.extraActions??{}),[userId]:1}:battle.extraActions,tauntUserId=effect==='GUARDIAN_TAUNT'?userId:battle.tauntUserId,
  // Brisa Revigorante (DRUID_HEAL) também conta para o rateio de recompensa, igual ao dano.
  healingByPlayer=healAmount>0?{...(battle.healingByPlayer??{}),[userId]:Number(battle.healingByPlayer?.[userId]??0)+healAmount}:battle.healingByPlayer,
  description=effect==='GUARDIAN_TAUNT'?'inimigos priorizarão o Guardião':effect==='WARRIOR_BUFF'?`+10% de Ataque e Defesa base e Medo no inimigo (-1 em todas as rolagens dele), por até 3 turnos${battle.enemyStatus?.bleed?' — sangramento do inimigo renovado':''}`:effect==='DOUBLE_ATTACK'?'dois ataques liberados neste turno':effect==='ARCANE_GROUP_BUFF'?'+1 nos dados e +10% de Ataque e Defesa para todos, por até 3 turnos':effect==='DRUID_HEAL'?(healTarget&&healAmount>0?`curou ${healAmount} de vida de ${healTarget.member.display_name} e purificou seus efeitos negativos`:'não havia vida para recuperar'):effect==='HUNTER_CRITICAL'?'resultados 5 e 6 passam a causar ataques críticos para o grupo, por 2 turnos':effect==='PRIEST_REVIVE'?(downedMember&&healTarget?`reanimou ${healTarget.member.display_name} com ${healAmount} de vida`:healTarget&&healAmount>0?`curou ${healAmount} de vida de ${healTarget.member.display_name} (ninguém estava caído)`:'não havia ninguém para reanimar ou curar'):effect,message=`${actor} usou ${label}: ${description}${actual?` e causou ${actual} de dano`:''}.`;return{...current.shared_state,battle:{...battle,...next,playerBuffs,groupBuff,extraActions,tauntUserId,enemyFearPenalty,fearTurnsLeft,enemyStatus,enemyHp,damageByPlayer,healingByPlayer,fleeRoll:undefined,status:enemyHp<=0?'won':'playing',activeUserId:enemyHp<=0?null:next.activeUserId,turn:Number(battle.turn??1)+(keepsTurn?0:1),lastRoll:{attacker:'ability',damage:actual,actor,label,effect:description,effectType:effect,healTargetUserId:healTarget?.member.user_id,healAmount},log:[...(battle.log??[]).slice(-15),message]}}})}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível usar a habilidade cooperativa.')}}
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
   const next=nextInitiative(battle)
   return{...current.shared_state,battle:{...battle,...next,playerBuffs:{...(battle.playerBuffs??{}),[userId]:{...personal,stunned:false}},turn:Number(battle.turn??1)+1,log:[...(battle.log??[]).slice(-15),`${actor} está atordoado e perde a ação neste turno.`]}}
  }
  const vitals=(current.shared_state.memberVitals??{}) as Record<string,{level?:number}>
  const level=Number(vitals[userId]?.level??1)
  const summon=buildSummon(tipo,level)
  const typeLabel=tipo==='atacante'?'ofensiva':tipo==='defensor'?'defensiva':'arcana'
  const playerBuffs={...(battle.playerBuffs??{}),[userId]:{...personal,summon,...(tipo==='arcano'?{attackPct:.1,defensePct:.1}:{})}}
  const next=nextInitiative(battle)
  const message=`${actor} usou Conjurar Fera Espectral (${typeLabel}): ${summon.nome} surge com ${summon.maxHp} de vida, ${summon.ataque} de ataque e ${summon.defesa} de defesa.`
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
   workingBuffs[member.user_id]=nextBuffs
   if(tick.damage>0){
    const hp=Math.max(0,Number(vitals.hp)-tick.damage)
    workingVitals[member.user_id]={...vitals,hp}
    for(const m of tick.messages)statusLogs.push(`${member.display_name}: ${m}`)
   }
  }
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
  if(enemyHpNow>0){
   const summonDefenseBase=Math.max(0,Number(battle.enemy?.dificuldade??1)-2)
   for(const member of membersRef.current){
    const buffs=workingBuffs[member.user_id],summon=buffs?.summon as Summon|undefined
    if(!summon||summon.hp<=0||enemyHpNow<=0)continue
    const attackRoll=1+Math.floor(Math.random()*6),defenseRoll=1+Math.floor(Math.random()*6)
    const resolved=resolveCombatRoll(summon.ataque,summonDefenseBase,attackRoll,defenseRoll)
    if(resolved.selfDamage>0){
     const hp=Math.max(0,summon.hp-resolved.selfDamage),died=hp<=0
     workingBuffs[member.user_id]={...buffs,summon:died?undefined:{...summon,hp},...(died&&summon.tipo==='arcano'?{attackPct:0,defensePct:0}:{})}
     statusLogs.push(`${summon.nome} (${member.display_name}) erra completamente e sofre ${resolved.selfDamage} de dano com o próprio golpe.${died?' Caiu em combate.':''}`)
    }else if(resolved.damage>0){
     enemyHpNow=Math.max(0,enemyHpNow-resolved.damage)
     const memberVitals=workingVitals[member.user_id],healAmount=memberVitals?Math.max(0,Math.min(1,Number(memberVitals.maxHp??memberVitals.hp)-Number(memberVitals.hp))):0
     if(healAmount>0)workingVitals[member.user_id]={...memberVitals,hp:Number(memberVitals.hp)+healAmount}
     statusLogs.push(`${summon.nome} (${member.display_name}) ataca: dado ${attackRoll} contra defesa ${defenseRoll}. Causou ${resolved.damage} de dano a ${battle.enemy?.nome}.${healAmount>0?' O vínculo com a fera recupera 1 de vida.':''}`)
    }
   }
  }
  if(enemyHpNow<=0)return{...current.shared_state,memberVitals:workingVitals,battle:{...battle,enemyHp:0,enemyStatus:enemyStatusTick.status,playerBuffs:workingBuffs,groupBuff:workingGroupBuff,enemyFearPenalty:workingEnemyFearPenalty,fearTurnsLeft,status:'won',activeUserId:null,log:[...(battle.log??[]).slice(-15),...statusLogs]}}
  const wipedByStatus=membersRef.current.length>0&&membersRef.current.every(member=>(workingVitals[member.user_id]?.hp??1)<=0)
  if(wipedByStatus)return{...current.shared_state,memberVitals:workingVitals,battle:{...battle,playerBuffs:workingBuffs,groupBuff:workingGroupBuff,enemyFearPenalty:workingEnemyFearPenalty,fearTurnsLeft,enemyStatus:enemyStatusTick.status,status:'lost',activeUserId:null,log:[...(battle.log??[]).slice(-15),...statusLogs,'A equipe foi derrotada.']}}
  const enemyStun=consumeStun(enemyStatusTick.status)
  if(enemyStun.wasStunned){
   const next=nextInitiative(battle)
   return{...current.shared_state,memberVitals:workingVitals,battle:{...battle,...next,playerBuffs:workingBuffs,groupBuff:workingGroupBuff,enemyFearPenalty:workingEnemyFearPenalty,fearTurnsLeft,enemyStatus:enemyStun.status,turn:Number(battle.turn??1)+1,log:[...(battle.log??[]).slice(-15),...statusLogs,`${battle.enemy?.nome} está atordoado e perde a ação neste turno.`]}}
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
  const strike=(attackBase:number,bonus:number,canApplyStatus:boolean)=>{
   const target=pickTarget()
   if(!target?.user_id)return null
   const targetVitals=workingVitals[target.user_id]??{}
   const targetBuffs=workingBuffs[target.user_id]??{}
   const targetStun=consumeStun(targetBuffs)
   const targetSummon=targetBuffs.summon as Summon|undefined
   const intercepting=Boolean(targetSummon)&&targetSummon!.hp>0&&Math.random()<SUMMON_INTERCEPT_CHANCE[targetSummon!.tipo]
   const naturalAttackRoll=1+Math.floor(Math.random()*6)
   const druidaLuck=!intercepting&&target.hero_id==='druida'&&Math.random()<.25
   const attackRoll=Math.max(1,Math.min(6,naturalAttackRoll+bonus-(druidaLuck?1:0)-enemyFear))
   const naturalDefenseRoll=1+Math.floor(Math.random()*6)
   const critDefenseBoost=!intercepting&&Boolean(targetVitals.critDefenseBoost)&&naturalDefenseRoll===5
   const defenseRoll=intercepting?Math.max(1,naturalDefenseRoll):targetStun.wasStunned?1:Math.max(1,Math.min(6,naturalDefenseRoll+Number(workingGroupBuff.roll??0)+Number(targetVitals.rollBonus??0)+(critDefenseBoost?1:0)-rollPenaltyFrom(targetStun.status)))
   const defensePct=Number(workingGroupBuff.defensePct??0)+Number(targetBuffs.defensePct??0)
   const defenseBase=intercepting?targetSummon!.defesa:Math.ceil(Number(targetVitals.defense??0)*(1+defensePct))+(targetBuffs.braced?2:0)
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
   const fervorGain=!intercepting&&defenseRoll===6?Math.min(3,Number(targetBuffs.fervor??0)+1):Number(targetBuffs.fervor??0)
   const statusApplied=!intercepting&&canApplyStatus&&!rogueDodge&&!resolved.selfDamage&&damage>0&&!resisted&&naturalAttackRoll===6?applyElementalStatus(targetStun.status,enemyElement,attackBase):{status:targetStun.status}
   if(statusApplied.appliedKind){appliedStatusKind=statusApplied.appliedKind;appliedStatusTargetName=target.display_name}
   const summonAfter=intercepting?(summonDied?undefined:{...targetSummon!,hp:Math.max(0,targetSummon!.hp-damage)}):targetSummon
   workingBuffs[target.user_id]={...statusApplied.status,nextRoll:attackRoll===2?1:Number(targetBuffs.nextRoll??0),fervor:fervorGain,summon:summonAfter,...(summonDied&&targetSummon!.tipo==='arcano'?{attackPct:0,defensePct:0}:{})}
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
  const next=nextInitiative(battle)
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
  return{...current.shared_state,memberVitals:workingVitals,battle:{...battle,...next,enemyHp:enemyHpNow,enemyStatus:enemyStun.status,enemyRollBonus:0,playerBuffs:workingBuffs,groupBuff:workingGroupBuff,enemyFearPenalty:workingEnemyFearPenalty,fearTurnsLeft,fleeRoll:undefined,turn:Number(battle.turn??1)+1,status:wiped?'lost':'playing',activeUserId:wiped?null:next.activeUserId,lastRoll:{attacker:'enemy',naturalAttackRoll:mainStrike.naturalAttackRoll,attackBonus:mainStrike.attackBonus,attackBase:mainStrike.attackBase,defenseBase:mainStrike.defenseBase,attackEffect:attackEffect(mainStrike.attackRoll),defenseEffect:defenseEffect(mainStrike.defenseRoll),attackRoll:mainStrike.attackRoll,defenseRoll:mainStrike.defenseRoll,damage:mainStrike.damage,selfDamage:mainStrike.selfDamage,shieldBlocked:mainStrike.shieldBlocked||undefined,targetUserId:mainStrike.target.user_id,actor:battle.enemy?.nome},minionRolls,log:[...(battle.log??[]).slice(-15),...statusLogs,mainLog,...minionLogs,...(wiped?['A equipe foi derrotada.']:[])]}}
 })}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível executar o turno inimigo.')}}
 const completeBattle=async()=>{try{await updateState(current=>({...current.shared_state,travelAcceptedBy:[],battle:{...(current.shared_state.battle as any),status:'completed',completedAt:new Date().toISOString()}}))}catch(error){setNotice(error instanceof Error?error.message:'Não foi possível encerrar a batalha cooperativa.')}}
 const safeConfirmTravel=async(enemy?:Record<string,unknown>)=>{const accepted=(roomRef.current?.shared_state?.travelAcceptedBy??[]) as string[];if(accepted.includes(userId)){await updateState(current=>({...current.shared_state,travelAcceptedBy:((current.shared_state.travelAcceptedBy??[]) as string[]).filter(id=>id!==userId)}));return}const vitals=(roomRef.current?.shared_state?.memberVitals??{}) as Record<string,{hp:number;maxHp:number}>,zero=membersRef.current.find(member=>(vitals[member.user_id]?.hp??1)<=0),mine=vitals[userId];if(zero){setNotice(`${zero.display_name} está sem vida e precisa se recuperar antes da caçada.`);return}if(mine&&mine.hp<mine.maxHp*.5){const proceed=await new Promise<boolean>(resolve=>{const overlay=document.createElement('div');overlay.className='coop-risk-overlay';overlay.innerHTML=`<section role="dialog"><small>PREPARAÇÃO DA CAÇADA</small><h2>Caçada arriscada</h2><p>Seu herói possui <b>${mine.hp}/${mine.maxHp}</b> de vida, menos de 50% do total. Deseja continuar?</p><div><button data-action="cancel">Preparar-se primeiro</button><button class="primary" data-action="continue">Continuar mesmo assim</button></div></section>`;overlay.onclick=event=>{const action=(event.target as HTMLElement).closest('button')?.dataset.action;if(!action)return;overlay.remove();resolve(action==='continue')};document.body.appendChild(overlay)});if(!proceed)return}await confirmTravel(enemy)}
 return <CoopContext.Provider value={{room,members,userId,onlineCount,busy,notice,create,join,leave,toggleReady,publishProgress,selectDestination,confirmTravel:safeConfirmTravel,coopAttack,coopAbility,coopSummon,coopDefend,coopFlee,resolveEnemyTurn,completeBattle}}>{children}</CoopContext.Provider>
}
export function useCoop(){const value=React.useContext(CoopContext);if(!value)throw new Error('CoopProvider não encontrado.');return value}
