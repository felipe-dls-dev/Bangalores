import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  BATTLE_ANIMATION_CONFIG,
  DRUID_ANIMATION_OVERRIDES,
  HERO_SPRITE_CANVAS,
  INITIAL_SPRITE_PLAYBACK,
  SPRITE_FRAME_SEQUENCES,
  SPRITE_STAGE_VIEW,
  WARRIOR_ANIMATION_OVERRIDES,
  getBattleSpriteFramePath,
  getBattleSpriteFrameUrl,
  getDisplayedSpriteState,
  getFrameDurationMs,
  getSpriteFrameStyle,
  getSpriteStateConfig,
  isBattleSpriteSupported,
  isOneShotConfig,
  normalizeEnemySpriteId,
  playbackOnRequest,
  playbackOnTick,
  resolveFighterAnimationState,
  type BattleAnimationState,
  type SpritePlayback,
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

  it('resolves hit when fighter is shaking from receiving damage (default or enemy)', () => {
    expect(resolveFighterAnimationState({ hp: 40, maxHp: 100, shaking: true })).toBe('hit')
    expect(resolveFighterAnimationState({ side: 'enemy', hp: 40, maxHp: 100, shaking: true })).toBe('hit')
  })

  it('resolves defend whenever hero receives an enemy attack (side: hero and shaking)', () => {
    expect(resolveFighterAnimationState({ side: 'hero', hp: 40, maxHp: 100, shaking: true })).toBe('defend')
    expect(resolveFighterAnimationState({ side: 'hero', hp: 40, maxHp: 100, shaking: true, impactKind: 'critical' })).toBe('defend')
  })

  it('resolves dodge when impact is dodged', () => {
    expect(resolveFighterAnimationState({ hp: 40, maxHp: 100, impactKind: 'dodged' })).toBe('dodge')
    expect(resolveFighterAnimationState({ side: 'hero', hp: 40, maxHp: 100, impactKind: 'dodged' })).toBe('dodge')
  })

  it('resolves defend when impact is blocked or fortification buff is active', () => {
    expect(resolveFighterAnimationState({ hp: 40, maxHp: 100, impactKind: 'blocked' })).toBe('defend')
    expect(resolveFighterAnimationState({ hp: 40, maxHp: 100, supportFx: 'fortificacao' })).toBe('defend')
  })

  it('resolves ultimate when ultimate action is executing', () => {
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, isUsingUltimate: true })).toBe('ultimate')
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, impactKind: 'ultimate' })).toBe('ultimate')
    expect(resolveFighterAnimationState({ side: 'hero', hp: 80, maxHp: 100, attacking: true, attackCritical: true, isUsingUltimate: true })).toBe('ultimate')
  })

  it('resolves hit when enemy is struck by an ultimate', () => {
    expect(resolveFighterAnimationState({ side: 'enemy', hp: 80, maxHp: 100, shaking: true, impactKind: 'ultimate' })).toBe('hit')
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

describe('getSpriteStateConfig', () => {
  it('returns specialized high-frame configurations for warrior', () => {
    const attackCfg = getSpriteStateConfig('heroes', 'guerreiro', 'attack')
    expect(attackCfg.frames).toBe(12)
    expect(attackCfg.durationMs).toBe(1800)

    const heavyCfg = getSpriteStateConfig('heroes', 'guerreiro', 'heavy')
    expect(heavyCfg.frames).toBe(17)
    expect(heavyCfg.durationMs).toBe(2200)

    const defendCfg = getSpriteStateConfig('heroes', 'guerreiro', 'defend')
    expect(defendCfg.frames).toBe(12)
    expect(defendCfg.durationMs).toBe(1400)

    const ultimateCfg = getSpriteStateConfig('heroes', 'guerreiro', 'ultimate')
    expect(ultimateCfg.frames).toBe(17)
    expect(ultimateCfg.durationMs).toBe(2400)

    const idleCfg = getSpriteStateConfig('heroes', 'guerreiro', 'idle')
    expect(idleCfg.frames).toBe(12)
  })

  it('returns the druid frame counts of the sheets in Bases/', () => {
    expect(getSpriteStateConfig('heroes', 'druida', 'idle').frames).toBe(6)
    expect(getSpriteStateConfig('heroes', 'druida', 'attack').frames).toBe(8)
    expect(getSpriteStateConfig('heroes', 'druida', 'heavy').frames).toBe(9)
    expect(getSpriteStateConfig('heroes', 'druida', 'ultimate').frames).toBe(12)
    expect(getSpriteStateConfig('heroes', 'druida', 'defend').frames).toBe(8)
    // levar dano reaproveita a Defesa, então tem o mesmo número de quadros
    expect(getSpriteStateConfig('heroes', 'druida', 'hit').frames).toBe(getSpriteStateConfig('heroes', 'druida', 'defend').frames)
    // sem override: cai no padrão do estado
    expect(getSpriteStateConfig('heroes', 'druida', 'dodge')).toBe(BATTLE_ANIMATION_CONFIG.dodge)
  })

  it('falls back to standard BATTLE_ANIMATION_CONFIG for other heroes or enemies', () => {
    const mageAttack = getSpriteStateConfig('heroes', 'arcanista', 'attack')
    expect(mageAttack.frames).toBe(8)

    const enemyHit = getSpriteStateConfig('enemies', 'grumnak', 'hit')
    expect(enemyHit.frames).toBe(4)
  })
})

describe('getFrameDurationMs', () => {
  it('splits durationMs evenly when there are no weights', () => {
    expect(getFrameDurationMs({ frames: 10, loop: false, fps: 8, durationMs: 2000 }, 3)).toBe(200)
  })

  it('falls back to fps when there is no durationMs', () => {
    expect(getFrameDurationMs({ frames: 6, loop: true, fps: 8 }, 0)).toBe(125)
  })

  it('splits durationMs proportionally to frameWeights and keeps the total', () => {
    const cfg = { frames: 4, loop: false, fps: 8, durationMs: 1000, frameWeights: [2, 1, 1, 4] }
    expect(getFrameDurationMs(cfg, 0)).toBe(250)
    expect(getFrameDurationMs(cfg, 3)).toBe(500)
    const total = [0, 1, 2, 3].reduce((sum, i) => sum + getFrameDurationMs(cfg, i), 0)
    expect(total).toBeCloseTo(1000)
  })

  it('ignores frameWeights whose length does not match the frame count', () => {
    const cfg = { frames: 4, loop: false, fps: 8, durationMs: 1000, frameWeights: [1, 1] }
    expect(getFrameDurationMs(cfg, 0)).toBe(250)
  })

  it('druid weighted states have one weight per frame and keep the total duration', () => {
    for (const state of ['attack', 'heavy', 'defend', 'hit', 'ultimate'] as const) {
      const cfg = DRUID_ANIMATION_OVERRIDES[state]!
      expect(cfg.frameWeights, state).toHaveLength(cfg.frames)
      const total = Array.from({ length: cfg.frames }, (_, i) => getFrameDurationMs(cfg, i)).reduce((a, b) => a + b, 0)
      expect(total).toBeCloseTo(cfg.durationMs!)
    }
  })

  it('warrior weighted states have one weight per frame and a fast slash', () => {
    for (const state of ['attack', 'heavy', 'ultimate'] as const) {
      const cfg = WARRIOR_ANIMATION_OVERRIDES[state]!
      expect(cfg.frameWeights, state).toHaveLength(cfg.frames)
      const total = Array.from({ length: cfg.frames }, (_, i) => getFrameDurationMs(cfg, i)).reduce((a, b) => a + b, 0)
      expect(total).toBeCloseTo(cfg.durationMs!)
    }
    const attack = WARRIOR_ANIMATION_OVERRIDES.attack!
    expect(getFrameDurationMs(attack, 6)).toBeLessThan(getFrameDurationMs(attack, 0))
  })
})

describe('getSpriteFrameStyle', () => {
  it('only frames fighters with a large-canvas entry', () => {
    expect(getSpriteFrameStyle('heroes', 'guerreiro')).toBeDefined()
    expect(getSpriteFrameStyle('heroes', 'druida')).toBeDefined()
    expect(getSpriteFrameStyle('heroes', 'monge')).toBeUndefined()
    expect(getSpriteFrameStyle('enemies', 'grumnak')).toBeUndefined()
  })

  it('puts the feet on the ground line and the body at the configured stage fraction', () => {
    const meta = HERO_SPRITE_CANVAS.guerreiro!
    const style = getSpriteFrameStyle('heroes', 'guerreiro')!
    const heightPct = parseFloat(style['--sprite-height'])
    const bottomPct = parseFloat(style['--sprite-bottom'])
    // corpo ocupa bodyFraction da altura do palco
    expect(heightPct * (meta.bodyHeight / meta.height)).toBeCloseTo(SPRITE_STAGE_VIEW.bodyFraction * 100, 1)
    // distância do chão à base do palco = bottom da imagem + parte da imagem abaixo do chão
    const groundFromBottom = bottomPct + ((meta.height - meta.groundY) / meta.height) * heightPct
    expect(groundFromBottom).toBeCloseTo(SPRITE_STAGE_VIEW.groundBottom * 100, 1)
    // âncora dos pés cai em anchorLeft da largura
    expect(parseFloat(style['--sprite-shift'])).toBeCloseTo(-(meta.anchorX / meta.width) * 100, 1)
    expect(style['--sprite-left']).toBe(`${SPRITE_STAGE_VIEW.anchorLeft * 100}%`)
  })
})

describe('warrior frame files on disk', () => {
  it('hit reuses the defend frames instead of duplicating files', () => {
    expect(getBattleSpriteFramePath('heroes', 'guerreiro', 'hit', 4)).toBe(getBattleSpriteFramePath('heroes', 'guerreiro', 'defend', 4))
    expect(getBattleSpriteFramePath('heroes', 'druida', 'hit', 3)).toBe('assets/battle/sprites/heroes/druida/defend_03.png')
    expect(getBattleSpriteFramePath('heroes', 'monge', 'hit', 4)).toBe('assets/battle/sprites/heroes/monge/hit_04.png')
  })

  const states = ['idle', 'stance_offensive', 'stance_defensive', 'attack', 'heavy', 'defend', 'hit', 'dodge', 'potion', 'skill', 'ultimate', 'victory', 'defeat'] as const

  // Lê largura/altura do cabeçalho IHDR do PNG (bytes 16..23), sem depender de biblioteca de imagem.
  const pngSize = (file: string) => {
    const buf = readFileSync(file)
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
  }

  it.each(['guerreiro', 'druida'])('every frame of every state of %s has the canvas declared in HERO_SPRITE_CANVAS', hero => {
    const meta = HERO_SPRITE_CANVAS[hero]!
    for (const state of states) {
      const { frames } = getSpriteStateConfig('heroes', hero, state)
      for (let i = 0; i < frames; i++) {
        const file = `public/${getBattleSpriteFramePath('heroes', hero, state, i)}`
        expect(pngSize(file), file).toEqual({ width: meta.width, height: meta.height })
      }
    }
  })
})

describe('druid frame sequences (states without their own sheet)', () => {
  const sequences = SPRITE_FRAME_SEQUENCES['heroes/druida']!

  it('has one entry per frame of the state it stands in for', () => {
    for (const [state, seq] of Object.entries(sequences) as [BattleAnimationState, NonNullable<(typeof sequences)[BattleAnimationState]>][]) {
      expect(seq, state).toHaveLength(getSpriteStateConfig('heroes', 'druida', state).frames)
    }
  })

  it('only points at frames that exist in the states the druid has sheets for', () => {
    const own = ['idle', 'attack', 'heavy', 'defend', 'ultimate'] as const
    for (const [state, seq] of Object.entries(sequences)) {
      for (const [src, index] of seq!) {
        expect(own, `${state} -> ${src}`).toContain(src)
        expect(index, `${state} -> ${src}_${index}`).toBeLessThan(getSpriteStateConfig('heroes', 'druida', src).frames)
      }
    }
  })

  it('covers every state the game can ask for', () => {
    for (const state of Object.keys(BATTLE_ANIMATION_CONFIG) as BattleAnimationState[]) {
      const owned = ['idle', 'attack', 'heavy', 'defend', 'hit', 'ultimate'].includes(state)
      expect(Boolean(sequences[state]) || owned, state).toBe(true)
    }
  })

  it('resolves stand-in frames to the file of the pose they borrow and clamps out-of-range indexes', () => {
    expect(getBattleSpriteFramePath('heroes', 'druida', 'dodge', 1)).toBe('assets/battle/sprites/heroes/druida/attack_06.png')
    expect(getBattleSpriteFramePath('heroes', 'druida', 'dodge', 99)).toBe('assets/battle/sprites/heroes/druida/idle_00.png')
    expect(getBattleSpriteFramePath('heroes', 'druida', 'attack', 3)).toBe('assets/battle/sprites/heroes/druida/attack_03.png')
    expect(getBattleSpriteFramePath('heroes', 'monge', 'defend', 1)).toBe('assets/battle/sprites/heroes/monge/defend_01.png')
  })
})

describe('sprite playback: one execution per act', () => {
  const hero = 'druida'
  const cfgOf = (state: BattleAnimationState) => getSpriteStateConfig('heroes', hero, state)

  /** Simula o BattleSpriteActor: pedido novo -> playbackOnRequest; cada tick -> playbackOnTick. */
  const makeSim = (resting: BattleAnimationState = 'idle') => {
    let pb: SpritePlayback = INITIAL_SPRITE_PLAYBACK
    let requested: BattleAnimationState = 'idle'
    const request = (state: BattleAnimationState) => {
      requested = state
      pb = playbackOnRequest(pb, state, isOneShotConfig(cfgOf(state)))
    }
    const shown = () => {
      const state = getDisplayedSpriteState(pb, requested, resting)
      return { state, frame: Math.min(pb.frame, cfgOf(state).frames - 1) }
    }
    const tick = () => {
      const state = getDisplayedSpriteState(pb, requested, resting)
      pb = playbackOnTick(pb, requested, cfgOf(state))
    }
    /** Estados exibidos ao longo de n ticks (o primeiro é o do início). */
    const run = (n: number) => {
      const seen = [shown()]
      for (let i = 0; i < n; i++) { tick(); seen.push(shown()) }
      return seen
    }
    return { request, shown, tick, run }
  }

  it.each(['attack', 'heavy', 'defend', 'ultimate'] as const)('%s plays its frames once and then rests while the request stays on', action => {
    const sim = makeSim()
    sim.request(action)
    const frames = cfgOf(action).frames
    // pedido continua ligado por muito mais tempo do que a animação dura
    const seen = sim.run(frames * 4)
    const playedFrames = seen.filter(s => s.state === action).map(s => s.frame)
    expect(playedFrames).toEqual(Array.from({ length: frames }, (_, i) => i))
    // depois da ação só repouso, sem voltar a mostrar a ação
    expect(seen.slice(frames).every(s => s.state === 'idle')).toBe(true)
  })

  it('applies to the warrior too (hit reuses the defend frames)', () => {
    const cfgFor = (state: BattleAnimationState) => getSpriteStateConfig('heroes', 'guerreiro', state)
    let pb: SpritePlayback = playbackOnRequest(INITIAL_SPRITE_PLAYBACK, 'hit', true)
    const frames = cfgFor('hit').frames
    const shown: BattleAnimationState[] = []
    for (let i = 0; i < frames * 3; i++) {
      const state = getDisplayedSpriteState(pb, 'hit', 'idle')
      shown.push(state)
      pb = playbackOnTick(pb, 'hit', cfgFor(state))
    }
    expect(shown.filter(s => s === 'hit')).toHaveLength(frames)
    expect(shown.slice(frames).every(s => s === 'idle')).toBe(true)
  })

  it('plays the action again when the request leaves and comes back', () => {
    const sim = makeSim()
    sim.request('attack')
    sim.run(cfgOf('attack').frames * 2)
    expect(sim.shown().state).toBe('idle')
    sim.request('idle')
    sim.request('attack')
    expect(sim.shown()).toEqual({ state: 'attack', frame: 0 })
    const seen = sim.run(cfgOf('attack').frames)
    expect(seen.filter(s => s.state === 'attack')).toHaveLength(cfgOf('attack').frames)
  })

  it('lets a running action finish when the request drops back to rest, without repeating', () => {
    const sim = makeSim()
    sim.request('attack')
    sim.run(3)
    sim.request('idle')
    expect(sim.shown().state).toBe('attack')
    const frames = cfgOf('attack').frames
    const seen = sim.run(frames * 2)
    const attackFrames = seen.filter(s => s.state === 'attack').map(s => s.frame)
    expect(attackFrames[attackFrames.length - 1]).toBe(frames - 1)
    expect(seen.slice(-frames).every(s => s.state === 'idle')).toBe(true)
  })

  it('restarts from frame 0 when a different action is requested mid-way', () => {
    const sim = makeSim()
    sim.request('attack')
    sim.run(4)
    sim.request('defend')
    expect(sim.shown()).toEqual({ state: 'defend', frame: 0 })
  })

  it('keeps looping the resting animation forever', () => {
    const sim = makeSim()
    sim.request('idle')
    const frames = cfgOf('idle').frames
    const seen = sim.run(frames * 5)
    expect(seen.every(s => s.state === 'idle')).toBe(true)
    expect(seen.map(s => s.frame)).toEqual(Array.from({ length: frames * 5 + 1 }, (_, i) => i % frames))
  })

  it('rests on the active stance after an action instead of plain idle', () => {
    const sim = makeSim('stance_defensive')
    sim.request('defend')
    const seen = sim.run(cfgOf('defend').frames * 3)
    expect(seen[seen.length - 1].state).toBe('stance_defensive')
    expect(seen.filter(s => s.state === 'defend')).toHaveLength(cfgOf('defend').frames)
  })

  it('holds the last frame of victory and defeat', () => {
    for (const end of ['victory', 'defeat'] as const) {
      const sim = makeSim()
      sim.request(end)
      const seen = sim.run(cfgOf(end).frames * 3)
      expect(seen[seen.length - 1]).toEqual({ state: end, frame: cfgOf(end).frames - 1 })
    }
  })

  it('defeat cuts a running action immediately', () => {
    const sim = makeSim()
    sim.request('ultimate')
    sim.run(2)
    sim.request('defeat')
    expect(sim.shown()).toEqual({ state: 'defeat', frame: 0 })
  })

  it('a request that is not an action never locks', () => {
    const pb = playbackOnRequest(INITIAL_SPRITE_PLAYBACK, 'stance_offensive', isOneShotConfig(cfgOf('stance_offensive')))
    expect(pb).toEqual(INITIAL_SPRITE_PLAYBACK)
  })
})
