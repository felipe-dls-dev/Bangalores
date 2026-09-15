export type AutoItemEffectType='attack'|'shield'|'heal'|'cleanse'|'reroll'|'execute'|'element'
export type AutoItemSkillItem={
 id:string
 slot?:string
 activeEffect?:{type:AutoItemEffectType;value:number}
}
export type AutoItemSkillState={
 hp:number
 maxHp:number
 shield?:number
 heroRollBonus?:number
 heroStatus?:Record<string,unknown>
 enemyHp?:number
 enemyMaxHp?:number
 enemyIsBoss?:boolean
 enemyIsElite?:boolean
 enemyIntentType?:string
 hasActiveMinions?:boolean
}

const NEGATIVE_STATUS_KEYS=['bleed','burn','poison','frozen','grabbed','blinded','stunned'] as const
const hasNegativeStatus=(status:Record<string,unknown>|undefined)=>NEGATIVE_STATUS_KEYS.some(key=>Boolean(status?.[key]))
const hpRatio=(state:AutoItemSkillState)=>state.hp/Math.max(1,state.maxHp)
const enemyHpRatio=(state:AutoItemSkillState)=>Number(state.enemyHp??0)/Math.max(1,Number(state.enemyMaxHp??1))
const incomingDanger=(state:AutoItemSkillState)=>state.enemyIsBoss||state.enemyIsElite||state.enemyIntentType==='heavy'||state.enemyIntentType==='status'||state.enemyIntentType==='summon'
const urgentIncomingDanger=(state:AutoItemSkillState)=>state.enemyIntentType==='heavy'||state.enemyIntentType==='status'||state.enemyIntentType==='summon'

function scoreAutoItemSkill(item:AutoItemSkillItem,state:AutoItemSkillState,mode:'urgent'|'tactical'){
 const effect=item.activeEffect
 if(!effect||item.slot==='bolsa')return 0
 const ratio=hpRatio(state),missing=Math.max(0,state.maxHp-state.hp),danger=incomingDanger(state),status=hasNegativeStatus(state.heroStatus)
 if(effect.type==='heal')return ratio<=.45&&missing>0?120+Math.min(missing,effect.value):0
 if(effect.type==='cleanse')return status?110:0
 if(effect.type==='shield'){
  const shield=Number(state.shield??0)
  if(shield>=effect.value)return 0
  if(mode==='urgent')return ratio<=.55||urgentIncomingDanger(state)?100+effect.value-shield:0
  return danger?35+effect.value-shield:0
 }
 if(mode==='urgent')return 0
 if(effect.type==='reroll')return !state.hasActiveMinions&&Number(state.heroRollBonus??0)<=0&&(danger||enemyHpRatio(state)>.5)?45+effect.value:0
 if(effect.type==='execute')return !state.hasActiveMinions&&enemyHpRatio(state)<=.35?90+effect.value:0
 if(effect.type==='element')return !state.hasActiveMinions?70+effect.value:0
 if(effect.type==='attack')return !state.hasActiveMinions?60+effect.value:0
 return 0
}

export function selectAutoItemSkill(items:AutoItemSkillItem[],state:AutoItemSkillState,options:{mode:'urgent'|'tactical'}):string|undefined{
 let selected:{id:string;score:number}|undefined
 for(const item of items){
  const score=scoreAutoItemSkill(item,state,options.mode)
  if(score>0&&(!selected||score>selected.score))selected={id:item.id,score}
 }
 return selected?.id
}
