import { describe, expect, it } from 'vitest'
import { selectCoopAutoHealTarget, selectCoopAutoSummonType, shouldUseCoopAutoHeroSkill } from './coopAutoCombat'

const members=[{user_id:'priest'},{user_id:'warrior'},{user_id:'mage'}]

describe('selectCoopAutoHealTarget', () => {
 it('skips auto healing when everyone is healthy', () => {
  expect(selectCoopAutoHealTarget(members,{
   priest:{hp:10,maxHp:10},
   warrior:{hp:18,maxHp:20},
   mage:{hp:30,maxHp:30},
  },{reviveDowned:true})).toBeUndefined()
 })

 it('targets the most wounded living member once the missing life matches the heal value', () => {
  expect(selectCoopAutoHealTarget(members,{
   priest:{hp:10,maxHp:10},
   warrior:{hp:14,maxHp:20},
   mage:{hp:22,maxHp:30},
  },{reviveDowned:true})).toBe('warrior')
 })

 it('prioritizes reviving a downed member for the priest skill', () => {
  expect(selectCoopAutoHealTarget(members,{
   priest:{hp:10,maxHp:10},
   warrior:{hp:0,maxHp:20},
   mage:{hp:12,maxHp:30},
  },{reviveDowned:true})).toBe('warrior')
 })

 it('can pick a status-afflicted member when cleansing is valuable', () => {
  expect(selectCoopAutoHealTarget(members,{
   priest:{hp:10,maxHp:10},
   warrior:{hp:20,maxHp:20},
   mage:{hp:30,maxHp:30},
  },{playerBuffs:{mage:{poison:{turns:3}}},cleanseNegativeStatus:true})).toBe('mage')
 })
})

describe('shouldUseCoopAutoHeroSkill', () => {
 it('does not refresh active group buffs or taunt', () => {
  expect(shouldUseCoopAutoHeroSkill('arcanista','mage',{groupBuff:{arcaneTurnsLeft:2}},members,{})).toBe(false)
  expect(shouldUseCoopAutoHeroSkill('cacador','hunter',{groupBuff:{critTurnsLeft:1}},members,{})).toBe(false)
  expect(shouldUseCoopAutoHeroSkill('guardiao','guardian',{tauntUserId:'guardian'},[{user_id:'guardian'}],{guardian:{hp:20,maxHp:20}})).toBe(false)
 })

 it('allows buffs again after they expire', () => {
  expect(shouldUseCoopAutoHeroSkill('guerreiro','warrior',{playerBuffs:{warrior:{}}},members,{})).toBe(true)
  expect(shouldUseCoopAutoHeroSkill('arcanista','mage',{groupBuff:{}},members,{})).toBe(true)
  expect(shouldUseCoopAutoHeroSkill('cacador','hunter',{groupBuff:{}},members,{})).toBe(true)
 })
})

describe('selectCoopAutoSummonType', () => {
 it('opens with an arcane summon when the party is stable', () => {
  expect(selectCoopAutoSummonType([],{hp:20,maxHp:20},members,{
   priest:{hp:10,maxHp:10},
   warrior:{hp:20,maxHp:20},
   mage:{hp:30,maxHp:30},
  })).toBe('arcano')
 })

 it('prioritizes a defender when someone is low', () => {
  expect(selectCoopAutoSummonType([],{hp:20,maxHp:20},members,{
   priest:{hp:10,maxHp:10},
   warrior:{hp:8,maxHp:20},
   mage:{hp:30,maxHp:30},
  })).toBe('defensor')
 })

 it('adds an attacker after arcane support is already active', () => {
  expect(selectCoopAutoSummonType([{tipo:'arcano',hp:10}],{hp:20,maxHp:20},members,{
   priest:{hp:10,maxHp:10},
   warrior:{hp:20,maxHp:20},
   mage:{hp:30,maxHp:30},
  })).toBe('atacante')
 })
})
