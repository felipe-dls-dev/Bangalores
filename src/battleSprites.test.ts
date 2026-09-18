import { describe, expect, it } from 'vitest'
import {
  BATTLE_ANIMATION_CONFIG,
  getBattleSpriteFramePath,
  getBattleSpriteFrameUrl,
  isBattleSpriteSupported,
  normalizeEnemySpriteId,
  resolveFighterAnimationState,
  type BattleAnimationState,
} from './battleSprites'

describe('Battle Sprites Configuration (docs/BATTLE_SPRITE_PROMPTS.md)', () => {
  it('defines all 13 official action states with accurate frame counts and looping rules', () => {
    const expectedStates: Record<BattleAnimationState, { frames: number; loop: boolean; holdLastFrame?: boolean }> = {
      idle: { frames: 6, loop: true },
      stance_offensive: { frames: 6, loop: true },
      stance_defensive: { frames: 6, loop: true },
      attack: { frames: 8, loop: false },
      heavy: { frames: 10, loop: false },
      defend: { frames: 5, loop: false },
      hit: { frames: 4, loop: false },
      dodge: { frames: 5, loop: false },
      potion: { frames: 7, loop: false },
      skill: { frames: 10, loop: false },
      ultimate: { frames: 12, loop: false },
      victory: { frames: 8, loop: false, holdLastFrame: true },
      defeat: { frames: 8, loop: false, holdLastFrame: true },
    }

    for (const [state, config] of Object.entries(expectedStates) as [BattleAnimationState, (typeof expectedStates)[BattleAnimationState]][]) {
      expect(BATTLE_ANIMATION_CONFIG[state], `Missing or invalid config for state ${state}`).toBeDefined()
      expect(BATTLE_ANIMATION_CONFIG[state].frames).toBe(config.frames)
      expect(BATTLE_ANIMATION_CONFIG[state].loop).toBe(config.loop)
      if (config.holdLastFrame) {
        expect(BATTLE_ANIMATION_CONFIG[state].holdLastFrame).toBe(true)
      }
    }
  })

  it('normalizes enemy names into standardized sprite slugs', () => {
    expect(normalizeEnemySpriteId('Sentinela Menor das Runas')).toBe('sentinela-runas')
    expect(normalizeEnemySpriteId('Sentinela das Runas')).toBe('sentinela-runas')
    expect(normalizeEnemySpriteId('Grumnak, o Quebrador')).toBe('grumnak')
    expect(normalizeEnemySpriteId('Lobo Alfa das Neves')).toBe('lobo-alfa-das-neves')
    expect(normalizeEnemySpriteId('Esqueleto Guerreiro')).toBe('esqueleto-guerreiro')
    expect(normalizeEnemySpriteId('Morcego da Caverna')).toBe('morcego-da-caverna')
    expect(normalizeEnemySpriteId('')).toBe('desconhecido')
  })

  it('generates deterministic frame file paths and URLs', () => {
    const path = getBattleSpriteFramePath('heroes', 'guerreiro', 'attack', 3)
    expect(path).toBe('assets/battle/sprites/heroes/guerreiro/attack_03.png')

    const url = getBattleSpriteFrameUrl('enemies', 'grumnak', 'hit', 1, '/custom-base')
    expect(url).toBe('/custom-base/assets/battle/sprites/enemies/grumnak/hit_01.png')

    const defaultUrl = getBattleSpriteFrameUrl('fx', 'impact-slash', 'idle', 2)
    expect(defaultUrl).toBe('/assets/battle/sprites/fx/impact-slash/idle_02.png')
  })

  it('identifies supported sprite assets correctly', () => {
    expect(isBattleSpriteSupported('heroes', 'guerreiro')).toBe(true)
    expect(isBattleSpriteSupported('heroes', 'cacadora')).toBe(true)
    expect(isBattleSpriteSupported('heroes', 'monge')).toBe(true)
    expect(isBattleSpriteSupported('enemies', 'sentinela-runas')).toBe(true)
    expect(isBattleSpriteSupported('enemies', 'grumnak')).toBe(true)
    expect(isBattleSpriteSupported('enemies', 'dragao-imaginario-999')).toBe(false)
  })
})

describe('resolveFighterAnimationState', () => {
  it('resolves defeat when hp is zero or below', () => {
    expect(resolveFighterAnimationState({ hp: 0, maxHp: 100 })).toBe('defeat')
    expect(resolveFighterAnimationState({ hp: -5, maxHp: 100, isVictorious: true })).toBe('defeat')
  })

  it('resolves victory when isVictorious flag is true', () => {
    expect(resolveFighterAnimationState({ hp: 50, maxHp: 100, isVictorious: true })).toBe('victory')
  })

  it('resolves hit when fighter is shaking from receiving damage', () => {
    expect(resolveFighterAnimationState({ hp: 40, maxHp: 100, shaking: true })).toBe('hit')
  })

  it('resolves dodge when impact is dodged', () => {
    expect(resolveFighterAnimationState({ hp: 40, maxHp: 100, impactKind: 'dodged' })).toBe('dodge')
  })

  it('resolves defend when impact is blocked or fortification buff is active', () => {
    expect(resolveFighterAnimationState({ hp: 40, maxHp: 100, impactKind: 'blocked' })).toBe('defend')
    expect(resolveFighterAnimationState({ hp: 40, maxHp: 100, supportFx: 'fortificacao' })).toBe('defend')
  })

  it('resolves ultimate when ultimate action is executing', () => {
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, isUsingUltimate: true })).toBe('ultimate')
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, impactKind: 'ultimate' })).toBe('ultimate')
  })

  it('resolves skill when special class skill is active', () => {
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, isUsingSkill: true })).toBe('skill')
  })

  it('resolves potion when healing items or support FX are applied', () => {
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, supportFx: 'cura' })).toBe('potion')
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, supportFx: 'cura-item' })).toBe('potion')
  })

  it('resolves heavy attack when attacking with a critical hit', () => {
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, attacking: true, attackCritical: true })).toBe('heavy')
  })

  it('resolves standard attack when attacking normally', () => {
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, attacking: true, attackCritical: false })).toBe('attack')
  })

  it('resolves stance states when an offensive or defensive stance is maintained', () => {
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, currentStance: 'ofensiva' })).toBe('stance_offensive')
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, stance: 'defensiva' })).toBe('stance_defensive')
  })

  it('resolves default idle when in neutral standing state', () => {
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, currentStance: 'neutra' })).toBe('idle')
    expect(resolveFighterAnimationState({ hp: 100, maxHp: 100 })).toBe('idle')
  })
})
