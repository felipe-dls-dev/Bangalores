import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  BATTLE_ANIMATION_CONFIG,
  DRUID_ANIMATION_OVERRIDES,
  EIGHT_FRAME_TIMING,
  GUARDIAN_ANIMATION_OVERRIDES,
  HERO_SPRITE_CANVAS,
  HERO_SPRITE_IDS,
  INITIAL_SPRITE_PLAYBACK,
  ROGUE_ANIMATION_OVERRIDES,
  SPRITE_FRAME_SEQUENCES,
  SPRITE_STAGE_VIEW,
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

/** Heróis do segundo lote do Codex: 13 folhas de 8 quadros cada, sem nenhum quadro emprestado. */
const EIGHT_FRAME_HEROES = [
  'guerreiro',
  'arcanista',
  'sacerdotisa',
  'cacador',
  'monge',
  'conjurador',
] as const

describe('Battle Sprites Configuration (docs/BATTLE_SPRITE_PROMPTS.md)', () => {
  it('defines all 13 official action states with accurate frame counts and looping rules', () => {
    const expectedStates: Record<
      BattleAnimationState,
      { frames: number; loop: boolean; holdLastFrame?: boolean }
    > = {
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

    for (const [state, config] of Object.entries(expectedStates) as [
      BattleAnimationState,
      (typeof expectedStates)[BattleAnimationState],
    ][]) {
      expect(
        BATTLE_ANIMATION_CONFIG[state],
        `Missing or invalid config for state ${state}`
      ).toBeDefined()
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
    expect(resolveFighterAnimationState({ side: 'enemy', hp: 40, maxHp: 100, shaking: true })).toBe(
      'hit'
    )
  })

  it('resolves defend whenever hero receives an enemy attack (side: hero and shaking)', () => {
    expect(resolveFighterAnimationState({ side: 'hero', hp: 40, maxHp: 100, shaking: true })).toBe(
      'defend'
    )
    expect(
      resolveFighterAnimationState({
        side: 'hero',
        hp: 40,
        maxHp: 100,
        shaking: true,
        impactKind: 'critical',
      })
    ).toBe('defend')
  })

  it('resolves dodge when impact is dodged', () => {
    expect(resolveFighterAnimationState({ hp: 40, maxHp: 100, impactKind: 'dodged' })).toBe('dodge')
    expect(
      resolveFighterAnimationState({ side: 'hero', hp: 40, maxHp: 100, impactKind: 'dodged' })
    ).toBe('dodge')
  })

  it('resolves defend when impact is blocked or fortification buff is active', () => {
    expect(resolveFighterAnimationState({ hp: 40, maxHp: 100, impactKind: 'blocked' })).toBe(
      'defend'
    )
    expect(resolveFighterAnimationState({ hp: 40, maxHp: 100, supportFx: 'fortificacao' })).toBe(
      'defend'
    )
  })

  it('resolves ultimate when ultimate action is executing', () => {
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, isUsingUltimate: true })).toBe(
      'ultimate'
    )
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, impactKind: 'ultimate' })).toBe(
      'ultimate'
    )
    expect(
      resolveFighterAnimationState({
        side: 'hero',
        hp: 80,
        maxHp: 100,
        attacking: true,
        attackCritical: true,
        isUsingUltimate: true,
      })
    ).toBe('ultimate')
  })

  it('resolves ultimate even when the ultimate itself grants a fortificacao shield buff', () => {
    // Bug real achado ao integrar as sprites do Guardião: o Golpe Supremo dele concede escudo
    // (ultimateEffects -> triggerSupportFx(set,get,'fortificacao')), e por ~1.6s (até o supportFx
    // expirar) essa regra vencia a do ultimate, trocando a animação por Defesa. A Sacerdotisa também
    // concede escudo no supremo, mas como concede cura também, cai em 'potion' (regra depois da #7),
    // então só o Guardião expunha o bug.
    expect(
      resolveFighterAnimationState({
        side: 'hero',
        hp: 80,
        maxHp: 100,
        isUsingUltimate: true,
        supportFx: 'fortificacao',
      })
    ).toBe('ultimate')
  })

  it('resolves hit when enemy is struck by an ultimate', () => {
    expect(
      resolveFighterAnimationState({
        side: 'enemy',
        hp: 80,
        maxHp: 100,
        shaking: true,
        impactKind: 'ultimate',
      })
    ).toBe('hit')
  })

  it('resolves skill when special class skill is active', () => {
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, isUsingSkill: true })).toBe('skill')
  })

  it('resolves skill even when the skill itself grants a fortificacao buff', () => {
    // Bug real, mesma classe do achado no Golpe Supremo do Guardião mas afetando 5 das 9
    // classes: Guardião (Provocar), Guerreiro (Ímpeto Marcial), Arcanista (Ascensão Arcana),
    // Caçador (Marca do Predador) e Sacerdotisa (Bênção da Vida) chamam
    // triggerSupportFx(set,get,'fortificacao') no heroSkill() -- sem a exclusão, a animação de
    // habilidade nunca aparecia, sempre virava Defesa. Achado ao auditar main.tsx: isUsingSkill
    // nem chegava a ser passado pra resolveFighterAnimationState em lugar nenhum do app real.
    expect(
      resolveFighterAnimationState({
        side: 'hero',
        hp: 80,
        maxHp: 100,
        isUsingSkill: true,
        supportFx: 'fortificacao',
      })
    ).toBe('skill')
  })

  it('resolves skill even when attacking (Golpe Flamejante do Monge é um ataque de verdade)', () => {
    expect(
      resolveFighterAnimationState({
        side: 'hero',
        hp: 80,
        maxHp: 100,
        isUsingSkill: true,
        attacking: true,
        attackCritical: true,
      })
    ).toBe('skill')
  })

  it('resolves potion when healing items or support FX are applied', () => {
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, supportFx: 'cura' })).toBe('potion')
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, supportFx: 'cura-item' })).toBe(
      'potion'
    )
  })

  it('resolves heavy attack when attacking with a critical hit', () => {
    expect(
      resolveFighterAnimationState({ hp: 80, maxHp: 100, attacking: true, attackCritical: true })
    ).toBe('heavy')
  })

  it('resolves standard attack when attacking normally', () => {
    expect(
      resolveFighterAnimationState({ hp: 80, maxHp: 100, attacking: true, attackCritical: false })
    ).toBe('attack')
  })

  it('resolves stance states when an offensive or defensive stance is maintained', () => {
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, currentStance: 'ofensiva' })).toBe(
      'stance_offensive'
    )
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, stance: 'defensiva' })).toBe(
      'stance_defensive'
    )
  })

  it('resolves default idle when in neutral standing state', () => {
    expect(resolveFighterAnimationState({ hp: 80, maxHp: 100, currentStance: 'neutra' })).toBe(
      'idle'
    )
    expect(resolveFighterAnimationState({ hp: 100, maxHp: 100 })).toBe('idle')
  })
})

describe('getSpriteStateConfig', () => {
  it.each(EIGHT_FRAME_HEROES)('%s has eight frames in every one of the 13 states', (hero) => {
    for (const state of Object.keys(BATTLE_ANIMATION_CONFIG) as BattleAnimationState[]) {
      expect(getSpriteStateConfig('heroes', hero, state).frames, `${hero}/${state}`).toBe(8)
    }
    expect(getSpriteStateConfig('heroes', hero, 'attack').durationMs).toBe(1400)
    expect(getSpriteStateConfig('heroes', hero, 'heavy').durationMs).toBe(1600)
    expect(getSpriteStateConfig('heroes', hero, 'defend').durationMs).toBe(1100)
    expect(getSpriteStateConfig('heroes', hero, 'ultimate').durationMs).toBe(2000)
  })

  it('eight-frame heroes loop rest and stances, play actions once and hold victory/defeat', () => {
    for (const hero of EIGHT_FRAME_HEROES) {
      for (const state of ['idle', 'stance_offensive', 'stance_defensive'] as const) {
        expect(getSpriteStateConfig('heroes', hero, state).loop, `${hero}/${state}`).toBe(true)
      }
      for (const state of ['attack', 'heavy', 'defend', 'dodge', 'skill', 'ultimate'] as const) {
        expect(isOneShotConfig(getSpriteStateConfig('heroes', hero, state)), state).toBe(true)
      }
      for (const state of ['victory', 'defeat'] as const) {
        expect(getSpriteStateConfig('heroes', hero, state).holdLastFrame, state).toBe(true)
      }
    }
  })

  it('the defensive stance is entered once (frames 0-3) and then loops the settled pose (4-7)', () => {
    const cfg = getSpriteStateConfig('heroes', 'arcanista', 'stance_defensive')
    expect(cfg.loopFrom).toBe(4)
    expect(playbackOnTick({ locked: null, spent: null, frame: 6 }, 'stance_defensive', cfg).frame).toBe(7)
    expect(playbackOnTick({ locked: null, spent: null, frame: 7 }, 'stance_defensive', cfg).frame).toBe(4)
    // a postura ofensiva fecha o ciclo inteiro: volta ao quadro 0
    const off = getSpriteStateConfig('heroes', 'arcanista', 'stance_offensive')
    expect(off.loopFrom).toBeUndefined()
    expect(playbackOnTick({ locked: null, spent: null, frame: 7 }, 'stance_offensive', off).frame).toBe(0)
  })

  it('returns the druid frame counts of the sheets in Bases/', () => {
    // sete estados têm folha nova de 8 quadros; a Defesa segue a folha antiga, também de 8
    for (const state of [
      'idle',
      'stance_offensive',
      'stance_defensive',
      'attack',
      'heavy',
      'skill',
      'ultimate',
      'defend',
    ] as const) {
      expect(getSpriteStateConfig('heroes', 'druida', state).frames, state).toBe(8)
    }
    // levar dano reaproveita a Defesa, então tem o mesmo número de quadros
    expect(getSpriteStateConfig('heroes', 'druida', 'hit').frames).toBe(
      getSpriteStateConfig('heroes', 'druida', 'defend').frames
    )
    // sem folha: cai no padrão do estado e é montado por SPRITE_FRAME_SEQUENCES
    expect(getSpriteStateConfig('heroes', 'druida', 'dodge')).toBe(BATTLE_ANIMATION_CONFIG.dodge)
    expect(getSpriteStateConfig('heroes', 'druida', 'potion')).toBe(BATTLE_ANIMATION_CONFIG.potion)
  })

  it('returns the rogue (cacadora) frame counts of the sheets in Bases/', () => {
    expect(getSpriteStateConfig('heroes', 'cacadora', 'idle').frames).toBe(6)
    expect(getSpriteStateConfig('heroes', 'cacadora', 'attack').frames).toBe(8)
    expect(getSpriteStateConfig('heroes', 'cacadora', 'heavy').frames).toBe(10)
    expect(getSpriteStateConfig('heroes', 'cacadora', 'ultimate').frames).toBe(12)
    expect(getSpriteStateConfig('heroes', 'cacadora', 'defend').frames).toBe(6)
    // levar dano reaproveita a Defesa, então tem o mesmo número de quadros
    expect(getSpriteStateConfig('heroes', 'cacadora', 'hit').frames).toBe(
      getSpriteStateConfig('heroes', 'cacadora', 'defend').frames
    )
    // sem override: cai no padrão do estado
    expect(getSpriteStateConfig('heroes', 'cacadora', 'dodge')).toBe(BATTLE_ANIMATION_CONFIG.dodge)
  })

  it('returns the guardian (guardiao) frame counts of the 13 complete sheets in Bases/', () => {
    expect(getSpriteStateConfig('heroes', 'guardiao', 'idle').frames).toBe(6)
    expect(getSpriteStateConfig('heroes', 'guardiao', 'attack').frames).toBe(8)
    expect(getSpriteStateConfig('heroes', 'guardiao', 'heavy').frames).toBe(10)
    expect(getSpriteStateConfig('heroes', 'guardiao', 'defend').frames).toBe(6)
    expect(getSpriteStateConfig('heroes', 'guardiao', 'dodge').frames).toBe(6)
    expect(getSpriteStateConfig('heroes', 'guardiao', 'potion').frames).toBe(8)
    expect(getSpriteStateConfig('heroes', 'guardiao', 'skill').frames).toBe(8)
    expect(getSpriteStateConfig('heroes', 'guardiao', 'stance_offensive').frames).toBe(6)
    expect(getSpriteStateConfig('heroes', 'guardiao', 'stance_defensive').frames).toBe(6)
    expect(getSpriteStateConfig('heroes', 'guardiao', 'ultimate').frames).toBe(12)
    expect(getSpriteStateConfig('heroes', 'guardiao', 'defeat').frames).toBe(8)
    expect(getSpriteStateConfig('heroes', 'guardiao', 'victory').frames).toBe(8)
    // ao contrário dos outros heróis, o guardião tem folha própria de Dano_Recebido: não reaproveita a Defesa
    expect(getSpriteStateConfig('heroes', 'guardiao', 'hit').frames).toBe(4)
    expect(getSpriteStateConfig('heroes', 'guardiao', 'hit').frames).not.toBe(
      getSpriteStateConfig('heroes', 'guardiao', 'defend').frames
    )
  })

  it('guardian postures play once and hold the settled pose instead of looping the transition', () => {
    expect(GUARDIAN_ANIMATION_OVERRIDES.stance_offensive).toMatchObject({
      loop: false,
      holdLastFrame: true,
    })
    expect(GUARDIAN_ANIMATION_OVERRIDES.stance_defensive).toMatchObject({
      loop: false,
      holdLastFrame: true,
    })
  })

  it('falls back to standard BATTLE_ANIMATION_CONFIG for enemies', () => {
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
      const total = Array.from({ length: cfg.frames }, (_, i) => getFrameDurationMs(cfg, i)).reduce(
        (a, b) => a + b,
        0
      )
      expect(total).toBeCloseTo(cfg.durationMs!)
    }
  })

  it('eight-frame weighted states have one weight per frame, keep the total and strike fast', () => {
    for (const state of ['attack', 'heavy', 'ultimate'] as const) {
      const cfg = EIGHT_FRAME_TIMING[state]
      expect(cfg.frameWeights, state).toHaveLength(cfg.frames)
      const total = Array.from({ length: cfg.frames }, (_, i) => getFrameDurationMs(cfg, i)).reduce(
        (a, b) => a + b,
        0
      )
      expect(total).toBeCloseTo(cfg.durationMs!)
    }
    // preparação lenta, golpe rápido: os quadros do meio de ataque/crítico duram menos que o primeiro
    for (const state of ['attack', 'heavy'] as const) {
      const cfg = EIGHT_FRAME_TIMING[state]
      expect(getFrameDurationMs(cfg, 4), state).toBeLessThan(getFrameDurationMs(cfg, 0))
    }
  })

  it('rogue (cacadora) weighted states have one weight per frame and keep the total duration', () => {
    for (const state of ['attack', 'heavy', 'defend', 'hit', 'ultimate'] as const) {
      const cfg = ROGUE_ANIMATION_OVERRIDES[state]!
      expect(cfg.frameWeights, state).toHaveLength(cfg.frames)
      const total = Array.from({ length: cfg.frames }, (_, i) => getFrameDurationMs(cfg, i)).reduce(
        (a, b) => a + b,
        0
      )
      expect(total).toBeCloseTo(cfg.durationMs!)
    }
  })

  it('guardian (guardiao) weighted states have one weight per frame and keep the total duration', () => {
    for (const state of [
      'attack',
      'heavy',
      'defend',
      'hit',
      'dodge',
      'potion',
      'skill',
      'stance_offensive',
      'stance_defensive',
      'ultimate',
      'defeat',
      'victory',
    ] as const) {
      const cfg = GUARDIAN_ANIMATION_OVERRIDES[state]!
      expect(cfg.frameWeights, state).toHaveLength(cfg.frames)
      const total = Array.from({ length: cfg.frames }, (_, i) => getFrameDurationMs(cfg, i)).reduce(
        (a, b) => a + b,
        0
      )
      expect(total).toBeCloseTo(cfg.durationMs!)
    }
  })
})

describe('getSpriteFrameStyle', () => {
  it('frames every hero by its canvas and leaves enemies on the default contain fit', () => {
    for (const hero of HERO_SPRITE_IDS) {
      expect(getSpriteFrameStyle('heroes', hero), hero).toBeDefined()
    }
    expect(getSpriteFrameStyle('enemies', 'grumnak')).toBeUndefined()
  })

  it('puts the feet on the ground line and the body at the configured stage fraction', () => {
    const meta = HERO_SPRITE_CANVAS.guerreiro!
    const style = getSpriteFrameStyle('heroes', 'guerreiro')!
    const heightPct = parseFloat(style['--sprite-height'])
    const bottomPct = parseFloat(style['--sprite-bottom'])
    // corpo ocupa bodyFraction da altura do palco
    expect(heightPct * (meta.bodyHeight / meta.height)).toBeCloseTo(
      SPRITE_STAGE_VIEW.bodyFraction * 100,
      1
    )
    // distância do chão à base do palco = bottom da imagem + parte da imagem abaixo do chão
    const groundFromBottom = bottomPct + ((meta.height - meta.groundY) / meta.height) * heightPct
    expect(groundFromBottom).toBeCloseTo(SPRITE_STAGE_VIEW.groundBottom * 100, 1)
    // âncora dos pés cai em anchorLeft da largura
    expect(parseFloat(style['--sprite-shift'])).toBeCloseTo(-(meta.anchorX / meta.width) * 100, 1)
    expect(style['--sprite-left']).toBe(`${SPRITE_STAGE_VIEW.anchorLeft * 100}%`)
  })
})

describe('hero frame files on disk', () => {
  it('hit reuses the defend frames only for the heroes that have no Hit sheet', () => {
    // o guerreiro ganhou folha própria de Hit: não reaproveita a Defesa
    expect(getBattleSpriteFramePath('heroes', 'guerreiro', 'hit', 4)).toBe(
      'assets/battle/sprites/heroes/guerreiro/hit_04.png'
    )
    expect(getBattleSpriteFramePath('heroes', 'druida', 'hit', 3)).toBe(
      'assets/battle/sprites/heroes/druida/defend_03.png'
    )
    expect(getBattleSpriteFramePath('heroes', 'cacadora', 'hit', 2)).toBe(
      'assets/battle/sprites/heroes/cacadora/defend_02.png'
    )
    expect(getBattleSpriteFramePath('heroes', 'monge', 'hit', 4)).toBe(
      'assets/battle/sprites/heroes/monge/hit_04.png'
    )
    // o guardião tem folha própria de Dano_Recebido: hit NÃO reaproveita a defesa
    expect(getBattleSpriteFramePath('heroes', 'guardiao', 'hit', 2)).toBe(
      'assets/battle/sprites/heroes/guardiao/hit_02.png'
    )
  })

  const states = [
    'idle',
    'stance_offensive',
    'stance_defensive',
    'attack',
    'heavy',
    'defend',
    'hit',
    'dodge',
    'potion',
    'skill',
    'ultimate',
    'victory',
    'defeat',
  ] as const

  // Lê largura/altura do cabeçalho IHDR do PNG (bytes 16..23), sem depender de biblioteca de imagem.
  const pngSize = (file: string) => {
    const buf = readFileSync(file)
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
  }

  it.each(HERO_SPRITE_IDS)(
    'every frame of every state of %s has the canvas declared in HERO_SPRITE_CANVAS',
    (hero) => {
      const meta = HERO_SPRITE_CANVAS[hero]!
      for (const state of states) {
        const { frames } = getSpriteStateConfig('heroes', hero, state)
        for (let i = 0; i < frames; i++) {
          const file = `public/${getBattleSpriteFramePath('heroes', hero, state, i)}`
          expect(pngSize(file), file).toEqual({ width: meta.width, height: meta.height })
        }
      }
    }
  )
})

describe('druid frame sequences (states without their own sheet)', () => {
  const sequences = SPRITE_FRAME_SEQUENCES['heroes/druida']!
  // estados do druida com folha própria (Bases/): Defesa antiga + sete folhas novas de 8 quadros
  const ownStates = [
    'idle',
    'stance_offensive',
    'stance_defensive',
    'attack',
    'heavy',
    'skill',
    'ultimate',
    'defend',
    'hit',
  ]

  it('has one entry per frame of the state it stands in for', () => {
    for (const [state, seq] of Object.entries(sequences) as [
      BattleAnimationState,
      NonNullable<(typeof sequences)[BattleAnimationState]>,
    ][]) {
      expect(seq, state).toHaveLength(getSpriteStateConfig('heroes', 'druida', state).frames)
    }
  })

  it('only stands in for the states that still have no sheet (dodge, potion, victory, defeat)', () => {
    expect(Object.keys(sequences).sort()).toEqual(['defeat', 'dodge', 'potion', 'victory'])
  })

  it('only points at frames that exist in the states the druid has sheets for', () => {
    const own = ['idle', 'attack', 'heavy', 'skill', 'ultimate', 'stance_defensive'] as const
    for (const [state, seq] of Object.entries(sequences)) {
      for (const [src, index] of seq!) {
        expect(own, `${state} -> ${src}`).toContain(src)
        expect(index, `${state} -> ${src}_${index}`).toBeLessThan(
          getSpriteStateConfig('heroes', 'druida', src).frames
        )
      }
    }
  })

  it('covers every state the game can ask for', () => {
    for (const state of Object.keys(BATTLE_ANIMATION_CONFIG) as BattleAnimationState[]) {
      expect(Boolean(sequences[state]) || ownStates.includes(state), state).toBe(true)
    }
  })

  it('resolves stand-in frames to the file of the pose they borrow and clamps out-of-range indexes', () => {
    expect(getBattleSpriteFramePath('heroes', 'druida', 'dodge', 1)).toBe(
      'assets/battle/sprites/heroes/druida/attack_01.png'
    )
    expect(getBattleSpriteFramePath('heroes', 'druida', 'dodge', 99)).toBe(
      'assets/battle/sprites/heroes/druida/idle_00.png'
    )
    expect(getBattleSpriteFramePath('heroes', 'druida', 'attack', 3)).toBe(
      'assets/battle/sprites/heroes/druida/attack_03.png'
    )
    expect(getBattleSpriteFramePath('heroes', 'monge', 'defend', 1)).toBe(
      'assets/battle/sprites/heroes/monge/defend_01.png'
    )
    // vitória: segura o orbe no último quadro mesmo com índice além do fim
    expect(getBattleSpriteFramePath('heroes', 'druida', 'victory', 99)).toBe(
      'assets/battle/sprites/heroes/druida/ultimate_03.png'
    )
  })
})

describe('cacadora frame sequences (states without their own sheet)', () => {
  const sequences = SPRITE_FRAME_SEQUENCES['heroes/cacadora']!

  it('has one entry per frame of the state it stands in for', () => {
    for (const [state, seq] of Object.entries(sequences) as [
      BattleAnimationState,
      NonNullable<(typeof sequences)[BattleAnimationState]>,
    ][]) {
      expect(seq, state).toHaveLength(getSpriteStateConfig('heroes', 'cacadora', state).frames)
    }
  })

  it('only points at frames that exist in the states the rogue has sheets for', () => {
    const own = ['idle', 'attack', 'heavy', 'defend', 'ultimate'] as const
    for (const [state, seq] of Object.entries(sequences)) {
      for (const [src, index] of seq!) {
        expect(own, `${state} -> ${src}`).toContain(src)
        expect(index, `${state} -> ${src}_${index}`).toBeLessThan(
          getSpriteStateConfig('heroes', 'cacadora', src).frames
        )
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
    expect(getBattleSpriteFramePath('heroes', 'cacadora', 'dodge', 1)).toBe(
      'assets/battle/sprites/heroes/cacadora/defend_01.png'
    )
    expect(getBattleSpriteFramePath('heroes', 'cacadora', 'skill', 9)).toBe(
      'assets/battle/sprites/heroes/cacadora/heavy_09.png'
    )
    expect(getBattleSpriteFramePath('heroes', 'cacadora', 'dodge', 99)).toBe(
      'assets/battle/sprites/heroes/cacadora/idle_00.png'
    )
    expect(getBattleSpriteFramePath('heroes', 'cacadora', 'attack', 3)).toBe(
      'assets/battle/sprites/heroes/cacadora/attack_03.png'
    )
  })
})

describe('guardian (guardiao) has no stand-in frames: all 13 states have their own sheet', () => {
  it('does not appear in SPRITE_FRAME_SEQUENCES or SPRITE_STATE_FRAME_ALIAS', () => {
    expect(SPRITE_FRAME_SEQUENCES['heroes/guardiao']).toBeUndefined()
  })

  it('resolves every state to a file named after that same state', () => {
    for (const state of Object.keys(BATTLE_ANIMATION_CONFIG) as BattleAnimationState[]) {
      const { frames } = getSpriteStateConfig('heroes', 'guardiao', state)
      for (let i = 0; i < frames; i++) {
        const padded = String(i).padStart(2, '0')
        expect(getBattleSpriteFramePath('heroes', 'guardiao', state, i)).toBe(
          `assets/battle/sprites/heroes/guardiao/${state}_${padded}.png`
        )
      }
    }
  })
})

/**
 * Segundo lote do Codex: guerreiro, arcanista, sacerdotisa, caçador, monge e conjurador têm uma
 * folha de 8 quadros para cada um dos 13 estados (scripts/extract_eight_frame_sheets.py). Nenhum
 * precisa de quadro emprestado: SPRITE_FRAME_SEQUENCES e SPRITE_STATE_FRAME_ALIAS não os citam.
 */
describe('eight-frame sheet heroes (guerreiro, arcanista, sacerdotisa, cacador, monge, conjurador)', () => {
  const allStates = Object.keys(BATTLE_ANIMATION_CONFIG) as BattleAnimationState[]

  it.each(EIGHT_FRAME_HEROES)('%s has its own canvas in HERO_SPRITE_CANVAS', (hero) => {
    const meta = HERO_SPRITE_CANVAS[hero]!
    expect(meta).toBeDefined()
    // o chão e o centro dos pés cabem dentro do canvas
    expect(meta.groundY).toBeLessThan(meta.height)
    expect(meta.anchorX).toBeLessThan(meta.width)
  })

  it.each(EIGHT_FRAME_HEROES)('%s has no stand-in frames', (hero) => {
    expect(SPRITE_FRAME_SEQUENCES[`heroes/${hero}`]).toBeUndefined()
  })

  it.each(EIGHT_FRAME_HEROES)('%s resolves every state to a file named after that state', (hero) => {
    for (const state of allStates) {
      for (let i = 0; i < 8; i++) {
        expect(getBattleSpriteFramePath('heroes', hero, state, i)).toBe(
          `assets/battle/sprites/heroes/${hero}/${state}_${String(i).padStart(2, '0')}.png`
        )
      }
    }
  })

  // Regressão do estado intermediário deste lote: sobras dos placeholders antigos (heavy_08/09,
  // defend_08..15, ultimate_08..11) ficavam ao lado dos 8 quadros novos e, num estado cujo `frames`
  // ainda fosse o antigo, o herói tocava quadros novos seguidos de quadros velhos.
  it.each(EIGHT_FRAME_HEROES)('%s has exactly 8 frame files per state, no stale leftovers', (hero) => {
    const dir = `public/assets/battle/sprites/heroes/${hero}`
    for (const state of allStates) {
      const files = readdirSync(dir).filter((f) => new RegExp(`^${state}_\\d+\\.png$`).test(f))
      expect(files.sort(), `${hero}/${state}`).toEqual(
        Array.from({ length: 8 }, (_, i) => `${state}_${String(i).padStart(2, '0')}.png`)
      )
    }
  })

  it('the druid has exactly 8 frame files in each state that has a sheet', () => {
    const dir = 'public/assets/battle/sprites/heroes/druida'
    for (const state of [
      'idle',
      'stance_offensive',
      'stance_defensive',
      'attack',
      'heavy',
      'skill',
      'ultimate',
      'defend',
    ]) {
      const files = readdirSync(dir).filter((f) => new RegExp(`^${state}_\\d+\\.png$`).test(f))
      expect(files, `druida/${state}`).toHaveLength(8)
    }
  })
})

/**
 * Regressão real achada ao validar este lote: a Sacerdotisa não tinha sequência própria pra
 * `defend`/`hit`, então caía nos arquivos legados antigos -- que estavam corrompidos (ilegíveis).
 * Este teste cobre TODOS os heróis (não só os dois lotes recentes) contra qualquer state que resolva
 * pra um arquivo inexistente ou corrompido, pra pegar esse tipo de lacuna antes de ir pro navegador.
 */
describe('every hero: every referenced frame file exists and is readable', () => {
  const pngSignatureOk = (file: string) => {
    const buf = readFileSync(file)
    return (
      buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    )
  }

  it.each(HERO_SPRITE_IDS)('%s', (hero) => {
    const missing: string[] = []
    for (const state of Object.keys(BATTLE_ANIMATION_CONFIG) as BattleAnimationState[]) {
      const { frames } = getSpriteStateConfig('heroes', hero, state)
      for (let i = 0; i < frames; i++) {
        const file = `public/${getBattleSpriteFramePath('heroes', hero, state, i)}`
        if (!existsSync(file) || !pngSignatureOk(file)) missing.push(`${state}[${i}] -> ${file}`)
      }
    }
    expect(missing, missing.join('\n')).toHaveLength(0)
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
      for (let i = 0; i < n; i++) {
        tick()
        seen.push(shown())
      }
      return seen
    }
    return { request, shown, tick, run }
  }

  it.each(['attack', 'heavy', 'defend', 'ultimate'] as const)(
    '%s plays its frames once and then rests while the request stays on',
    (action) => {
      const sim = makeSim()
      sim.request(action)
      const frames = cfgOf(action).frames
      // pedido continua ligado por muito mais tempo do que a animação dura
      const seen = sim.run(frames * 4)
      const playedFrames = seen.filter((s) => s.state === action).map((s) => s.frame)
      expect(playedFrames).toEqual(Array.from({ length: frames }, (_, i) => i))
      // depois da ação só repouso, sem voltar a mostrar a ação
      expect(seen.slice(frames).every((s) => s.state === 'idle')).toBe(true)
    }
  )

  it('applies to the warrior too (hit reuses the defend frames)', () => {
    const cfgFor = (state: BattleAnimationState) =>
      getSpriteStateConfig('heroes', 'guerreiro', state)
    let pb: SpritePlayback = playbackOnRequest(INITIAL_SPRITE_PLAYBACK, 'hit', true)
    const frames = cfgFor('hit').frames
    const shown: BattleAnimationState[] = []
    for (let i = 0; i < frames * 3; i++) {
      const state = getDisplayedSpriteState(pb, 'hit', 'idle')
      shown.push(state)
      pb = playbackOnTick(pb, 'hit', cfgFor(state))
    }
    expect(shown.filter((s) => s === 'hit')).toHaveLength(frames)
    expect(shown.slice(frames).every((s) => s === 'idle')).toBe(true)
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
    expect(seen.filter((s) => s.state === 'attack')).toHaveLength(cfgOf('attack').frames)
  })

  it('lets a running action finish when the request drops back to rest, without repeating', () => {
    const sim = makeSim()
    sim.request('attack')
    sim.run(3)
    sim.request('idle')
    expect(sim.shown().state).toBe('attack')
    const frames = cfgOf('attack').frames
    const seen = sim.run(frames * 2)
    const attackFrames = seen.filter((s) => s.state === 'attack').map((s) => s.frame)
    expect(attackFrames[attackFrames.length - 1]).toBe(frames - 1)
    expect(seen.slice(-frames).every((s) => s.state === 'idle')).toBe(true)
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
    expect(seen.every((s) => s.state === 'idle')).toBe(true)
    expect(seen.map((s) => s.frame)).toEqual(
      Array.from({ length: frames * 5 + 1 }, (_, i) => i % frames)
    )
  })

  it('rests on the active stance after an action instead of plain idle', () => {
    const sim = makeSim('stance_defensive')
    sim.request('defend')
    const seen = sim.run(cfgOf('defend').frames * 3)
    expect(seen[seen.length - 1].state).toBe('stance_defensive')
    expect(seen.filter((s) => s.state === 'defend')).toHaveLength(cfgOf('defend').frames)
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
    const pb = playbackOnRequest(
      INITIAL_SPRITE_PLAYBACK,
      'stance_offensive',
      isOneShotConfig(cfgOf('stance_offensive'))
    )
    expect(pb).toEqual(INITIAL_SPRITE_PLAYBACK)
  })
})
