export type CoopAutoMember={user_id:string}
export type CoopAutoVitals={hp?:number;maxHp?:number}
export type CoopAutoSummonType='atacante'|'defensor'|'arcano'
export type CoopAutoSummon={tipo?:CoopAutoSummonType;hp?:number}
export type CoopAutoBattle={
 tauntUserId?:string
 playerBuffs?:Record<string,Record<string,unknown>>
 groupBuff?:Record<string,unknown>
 extraActions?:Record<string,number>
}

export const COOP_AUTO_HEAL_MIN_MISSING_RATIO=.3
export const COOP_AUTO_DEFENSIVE_SUMMON_HP_RATIO=.45

const NEGATIVE_STATUS_KEYS=['bleed','burn','poison','frozen','grabbed','blinded','stunned'] as const

function normalizedVitals(vitals:CoopAutoVitals|undefined){
 const hp=Number(vitals?.hp),maxHp=Number(vitals?.maxHp)
 if(!Number.isFinite(hp)||!Number.isFinite(maxHp)||maxHp<=0)return undefined
 return{hp,maxHp}
}

function hasNegativeStatus(status:Record<string,unknown>|undefined){
 return NEGATIVE_STATUS_KEYS.some(key=>Boolean(status?.[key]))
}

export function selectCoopAutoHealTarget(members:CoopAutoMember[],memberVitals:Record<string,CoopAutoVitals>,options:{reviveDowned?:boolean;minMissingRatio?:number;playerBuffs?:Record<string,Record<string,unknown>>;cleanseNegativeStatus?:boolean}={}):string|undefined{
 const minMissingRatio=options.minMissingRatio??COOP_AUTO_HEAL_MIN_MISSING_RATIO
 if(options.reviveDowned){
  const downed=members.find(member=>{
   const vitals=normalizedVitals(memberVitals[member.user_id])
   return Boolean(vitals&&vitals.hp<=0)
  })
  if(downed)return downed.user_id
 }
 let target:{userId:string;hpRatio:number;score:number}|undefined
 for(const member of members){
  const vitals=normalizedVitals(memberVitals[member.user_id])
  if(!vitals||vitals.hp<=0)continue
  const missing=Math.max(0,vitals.maxHp-vitals.hp)
  const minMissing=Math.max(1,Math.ceil(vitals.maxHp*minMissingRatio))
  const statusTarget=Boolean(options.cleanseNegativeStatus&&hasNegativeStatus(options.playerBuffs?.[member.user_id]))
  if(missing<minMissing&&!statusTarget)continue
  const hpRatio=vitals.hp/vitals.maxHp
  const score=missing/vitals.maxHp+(statusTarget?COOP_AUTO_HEAL_MIN_MISSING_RATIO:0)
  if(!target||score>target.score||(score===target.score&&hpRatio<target.hpRatio))target={userId:member.user_id,hpRatio,score}
 }
 return target?.userId
}

export function shouldUseCoopAutoHeroSkill(heroId:string|undefined,userId:string,battle:CoopAutoBattle|undefined,members:CoopAutoMember[],memberVitals:Record<string,CoopAutoVitals>){
 const personal=battle?.playerBuffs?.[userId]??{}
 const group=battle?.groupBuff??{}
 if(heroId==='sacerdotisa')return Boolean(selectCoopAutoHealTarget(members,memberVitals,{reviveDowned:true}))
 if(heroId==='druida')return Boolean(selectCoopAutoHealTarget(members,memberVitals,{playerBuffs:battle?.playerBuffs,cleanseNegativeStatus:true}))
 if(heroId==='guardiao'){
  const tauntUserId=battle?.tauntUserId
  if(!tauntUserId)return true
  const tauntVitals=normalizedVitals(memberVitals[tauntUserId])
  return !tauntVitals||tauntVitals.hp<=0
 }
 if(heroId==='guerreiro')return Number(personal.buffTurnsLeft??0)<=0
 if(heroId==='arcanista')return Number(group.arcaneTurnsLeft??0)<=0
 if(heroId==='cacador')return Number(group.critTurnsLeft??0)<=0
 return heroId==='cacadora'||heroId==='monge'
}

export function selectCoopAutoSummonType(existingSummons:CoopAutoSummon[],selfVitals:CoopAutoVitals|undefined,members:CoopAutoMember[],memberVitals:Record<string,CoopAutoVitals>):CoopAutoSummonType|undefined{
 const living=existingSummons.filter(summon=>Number(summon.hp??1)>0).slice(0,2)
 if(living.length>=2)return undefined
 const has=(tipo:CoopAutoSummonType)=>living.some(summon=>summon.tipo===tipo)
 const lowHpParty=members.some(member=>{
  const vitals=normalizedVitals(memberVitals[member.user_id])
  return Boolean(vitals&&vitals.hp>0&&vitals.hp/vitals.maxHp<=COOP_AUTO_DEFENSIVE_SUMMON_HP_RATIO)
 })
 const self=normalizedVitals(selfVitals)
 if((lowHpParty||Boolean(self&&self.hp/self.maxHp<=COOP_AUTO_DEFENSIVE_SUMMON_HP_RATIO))&&!has('defensor'))return'defensor'
 if(!has('arcano'))return'arcano'
 if(!has('atacante'))return'atacante'
 if(!has('defensor'))return'defensor'
 return undefined
}
