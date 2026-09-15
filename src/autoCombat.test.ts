import { describe, expect, it } from 'vitest'
import { selectAutoItemSkill, type AutoItemSkillItem } from './autoCombat'

const items:AutoItemSkillItem[]=[
 {id:'cleanse',activeEffect:{type:'cleanse',value:1}},
 {id:'heal',activeEffect:{type:'heal',value:4}},
 {id:'shield',activeEffect:{type:'shield',value:3}},
 {id:'roll',activeEffect:{type:'reroll',value:1}},
 {id:'flame',activeEffect:{type:'element',value:2}},
 {id:'blade',activeEffect:{type:'attack',value:3}},
]

describe('selectAutoItemSkill', () => {
 it('uses healing only when health is low enough', () => {
  expect(selectAutoItemSkill(items,{hp:8,maxHp:20,enemyHp:30,enemyMaxHp:30},{mode:'urgent'})).toBe('heal')
  expect(selectAutoItemSkill(items,{hp:17,maxHp:20,enemyHp:30,enemyMaxHp:30},{mode:'urgent'})).toBeUndefined()
 })

 it('uses cleanse when a negative status is active', () => {
  expect(selectAutoItemSkill(items,{hp:18,maxHp:20,heroStatus:{poison:{turns:3}},enemyHp:30,enemyMaxHp:30},{mode:'urgent'})).toBe('cleanse')
 })

 it('uses shield against dangerous incoming turns', () => {
  expect(selectAutoItemSkill(items.filter(item=>item.id!=='heal'&&item.id!=='cleanse'),{hp:15,maxHp:20,shield:0,enemyHp:30,enemyMaxHp:30,enemyIntentType:'heavy'},{mode:'urgent'})).toBe('shield')
 })

 it('keeps offensive item skills for the tactical phase and avoids them while minions are active', () => {
  expect(selectAutoItemSkill(items,{hp:20,maxHp:20,enemyHp:30,enemyMaxHp:30},{mode:'tactical'})).toBe('flame')
  expect(selectAutoItemSkill(items,{hp:20,maxHp:20,enemyHp:30,enemyMaxHp:30,hasActiveMinions:true},{mode:'tactical'})).toBeUndefined()
 })
})
