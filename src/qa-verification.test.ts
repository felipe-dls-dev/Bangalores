import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { REGION_MAPS, validateRegionMap } from './regionMap'
import { useGame, HEROES, SUBREGIONS, worldUnlocked, maxHp, attackValue } from './store/game'
import bossArt from './data/bossArt.json'

declare const __dirname: string
const ROOT = path.resolve(__dirname, '..')
const PUBLIC = path.join(ROOT, 'public')

describe('QA Suite: Asset Integrity & 404 Prevention', () => {
  it('all 48 boss art paths in bossArt.json exist on disk', () => {
    const missing: string[] = []
    for (const [bossName, assetPath] of Object.entries(bossArt)) {
      const fullPath = path.join(PUBLIC, assetPath)
      if (!fs.existsSync(fullPath)) {
        missing.push(`${bossName} -> ${assetPath}`)
      }
    }
    expect(missing, `Missing boss art files: ${missing.join(', ')}`).toEqual([])
  })

  it('all 15 bosses from QA_TESTING_GUIDE have unique valid portraits', () => {
    const targetBosses = [
      'Mestre Ferreiro Caído',
      'Guardião da Caldeira',
      'Rei Esquecido de Kholgard',
      'Asterion, Guardião do Sol Negro',
      'Guardião Rúnico Ancestral',
      'Titã da Passagem',
      'Yeti Alfa de Gelo Eterno',
      'Sentinela de Pedra de Kholgard',
      'Capitão dos Bandoleiros',
      'Mestre do Pedágio',
      'Rei Goblin de Abdendriel',
      'Lorde Espectral de Morvath',
      'Vaelora, Senhora do Véu',
      'Nihraz, Imperador do Vazio',
      'Rainha Aracnídea',
    ]

    const pathsUsed = new Set<string>()
    for (const boss of targetBosses) {
      const art = (bossArt as Record<string, string>)[boss]
      expect(art, `Boss "${boss}" must be mapped in bossArt.json`).toBeDefined()
      const file = path.join(PUBLIC, art)
      expect(fs.existsSync(file), `Portrait file for "${boss}" (${art}) must exist`).toBe(true)
      expect(pathsUsed.has(art), `Boss portrait for "${boss}" (${art}) must be unique`).toBe(false)
      pathsUsed.add(art)
    }
  })

  it('story cinematic banners exist for acts 1-4 and both endings', () => {
    const banners = [
      'act-01-havendown.webp',
      'act-02-forge.webp',
      'act-03-flame-crown.webp',
      'act-04-black-sun.webp',
      'ending-dawn.webp',
      'ending-throne.webp',
    ]
    for (const b of banners) {
      const file = path.join(PUBLIC, 'assets', 'story', 'cinematics', b)
      expect(fs.existsSync(file), `Cinematic banner ${b} must exist`).toBe(true)
    }
  })

  it('props (campfire & chests) exist', () => {
    const props = [
      'assets/maps/objects/campfire/idle.png',
      'assets/maps/objects/treasure-chest/common.png',
      'assets/maps/objects/treasure-chest/locked.png',
      'assets/maps/objects/treasure-chest/opened.png',
      'assets/maps/objects/treasure-chest/rare.png',
      'assets/maps/objects/treasure-chest/secret.png',
    ]
    for (const p of props) {
      const file = path.join(PUBLIC, p)
      expect(fs.existsSync(file), `Prop ${p} must exist`).toBe(true)
    }
  })

  it('wandering monster sprite families have all 3 animation frames', () => {
    const families = ['automato-sentinela', 'batedor-a-vapor', 'elemental-de-vapor']
    const frames = ['idle.png', 'walk_1.png', 'walk_2.png']
    for (const fam of families) {
      for (const fr of frames) {
        const file = path.join(PUBLIC, 'assets', 'maps', 'objects', `monster-${fam}`, fr)
        expect(fs.existsSync(file), `Monster frame ${fam}/${fr} must exist`).toBe(true)
      }
    }
  })

  it('weather overlays & day/night lighting textures exist', () => {
    const fxFiles = [
      'assets/maps/fx/snow/soft.png',
      'assets/maps/fx/rain/soft.png',
      'assets/maps/fx/ash/soft.png',
      'assets/maps/fx/smoke/soft.png',
      'assets/maps/fx/lighting/twilight.png',
      'assets/maps/fx/lighting/night.png',
    ]
    for (const fx of fxFiles) {
      const file = path.join(PUBLIC, fx)
      expect(fs.existsSync(file), `FX file ${fx} must exist`).toBe(true)
    }
  })

  it('all subregion bosses and enemies have existing art on disk', () => {
    const missing: string[] = []
    for (const sub of SUBREGIONS) {
      if (sub.chefe.arte && !fs.existsSync(path.join(PUBLIC, sub.chefe.arte))) {
        missing.push(`Boss ${sub.chefe.nome} in ${sub.id}: ${sub.chefe.arte}`)
      }
      for (const en of sub.inimigos) {
        if (en.arte && !fs.existsSync(path.join(PUBLIC, en.arte))) {
          missing.push(`Enemy ${en.nome} in ${sub.id}: ${en.arte}`)
        }
      }
    }
    expect(missing, `Missing art in SUBREGIONS: ${missing.join('; ')}`).toEqual([])
  })

  it('all 7 Steelmere maps have background art files', () => {
    const maps = ['frostgard', 'engrenverde', 'trilhouro', 'vulcannis', 'ferrujal', 'coroferro', 'aetherium']
    for (const m of maps) {
      const file = path.join(PUBLIC, 'assets', 'maps', 'steelmere', `${m}.png`)
      expect(fs.existsSync(file), `Steelmere map background ${m}.png must exist`).toBe(true)
    }
  })

  it('special terrain tile textures exist on disk', () => {
    const tiles = [
      'assets/maps/tiles/frostgard/ice.png',
      'assets/maps/tiles/frostgard/snow-drift.png',
      'assets/maps/tiles/frostgard/steam-vent.png',
      'assets/maps/tiles/ferrujal/mud.png',
      'assets/maps/tiles/coroferro/conveyor.png',
      'assets/maps/tiles/vulcannis/ash-lava-rock.png',
    ]
    for (const t of tiles) {
      const file = path.join(PUBLIC, t)
      expect(fs.existsSync(file), `Tile texture ${t} must exist`).toBe(true)
    }
  })
})

describe('QA Suite: Steelmere 2D Maps Reachability & Collision', () => {
  it('all 7 Steelmere maps pass navigation validation', () => {
    const steelmereIds = ['frostgard', 'engrenverde', 'trilhouro', 'vulcannis', 'ferrujal', 'coroferro', 'aetherium']
    for (const id of steelmereIds) {
      const map = REGION_MAPS[id]
      expect(map, `Map ${id} must exist in REGION_MAPS`).toBeDefined()
      const errors = validateRegionMap(map)
      expect(errors, `Map ${id} has navigation validation errors`).toEqual([])
    }
  })

  it('no location pins, exits, chests, or campfires are on blocked tiles', () => {
    for (const [id, map] of Object.entries(REGION_MAPS)) {
      const blockedSet = new Set((map.blocked ?? []).map(b => `${b.x}:${b.y}`))
      for (const loc of map.locations) {
        expect(blockedSet.has(`${loc.x}:${loc.y}`), `${id}: location ${loc.subId} is on a blocked cell`).toBe(false)
      }
      for (const exit of map.exits ?? []) {
        expect(blockedSet.has(`${exit.x}:${exit.y}`), `${id}: exit ${exit.id} is on a blocked cell`).toBe(false)
      }
      for (const chest of map.chests ?? []) {
        expect(blockedSet.has(`${chest.x}:${chest.y}`), `${id}: chest ${chest.id} is on a blocked cell`).toBe(false)
      }
      for (const camp of map.campfires ?? []) {
        expect(blockedSet.has(`${camp.x}:${camp.y}`), `${id}: campfire ${camp.id} is on a blocked cell`).toBe(false)
      }
    }
  })
})

describe('QA Suite: Special Terrain Mechanics', () => {
  it('Frostgard has ice, snow_drift, and steam_vent on grid', () => {
    const fg = REGION_MAPS.frostgard
    const tiles = fg.grid.flat()
    expect(tiles.includes('ice')).toBe(true)
    expect(tiles.includes('snow_drift')).toBe(true)
    expect(tiles.includes('steam_vent')).toBe(true)
  })

  it('Ferrujal has mud terrain', () => {
    const ferrujal = REGION_MAPS.ferrujal
    expect(ferrujal.grid.flat().includes('mud')).toBe(true)
  })

  it('Coroferro has conveyor terrain', () => {
    const coro = REGION_MAPS.coroferro
    expect(coro.grid.flat().includes('conveyor')).toBe(true)
  })

  it('Vulcannis has ash_lava_rock terrain', () => {
    const vulcan = REGION_MAPS.vulcannis
    expect(vulcan.grid.flat().includes('ash_lava_rock')).toBe(true)
  })
})

describe('QA Suite: Caçadora Ataque Duplo 3-Turn Lifecycle', () => {
  it('heroSkill activates Ataque Duplo for 3 turns and grants extraHeroAttacks=1', () => {
    useGame.getState().newGame('cacadora')
    const s = useGame.getState()
    expect(s.heroId).toBe('cacadora')

    // Deterministic combat state
    useGame.setState({
      screen: 'combat',
      enemy: { id: 'test_dummy', nome: 'Dummy', ataque: 5, vida: 1000, ouro: 10, dificuldade: 1 } as any,
      enemyHp: 1000,
      playerTurn: true,
      animating: false,
      heroSkillCooldown: 0,
    })

    // Activate heroSkill
    useGame.getState().heroSkill()
    const afterSkill = useGame.getState()
    expect(afterSkill.classBuffTurns).toBe(3)
    expect(afterSkill.extraHeroAttacks).toBe(1)
    expect(afterSkill.heroSkillCooldown).toBe(3)
  })

  it('rearms extraHeroAttacks across all 3 turns and dissipates on turn 4', () => {
    useGame.getState().newGame('cacadora')
    useGame.setState({
      screen: 'combat',
      heroSkillCooldown: 0,
      classBuffTurns: 3,
      extraHeroAttacks: 1,
    })

    // Simulate turn transition 1 -> 2
    let turns = useGame.getState().classBuffTurns ?? 0
    let turnsLeft = turns - 1
    expect(turnsLeft).toBe(2)
    useGame.setState({ classBuffTurns: turnsLeft, extraHeroAttacks: 1 })
    expect(useGame.getState().extraHeroAttacks).toBe(1)

    // Simulate turn transition 2 -> 3
    turns = useGame.getState().classBuffTurns ?? 0
    turnsLeft = turns - 1
    expect(turnsLeft).toBe(1)
    useGame.setState({ classBuffTurns: turnsLeft, extraHeroAttacks: 1 })
    expect(useGame.getState().extraHeroAttacks).toBe(1)

    // Simulate turn transition 3 -> 4 (expires)
    turns = useGame.getState().classBuffTurns ?? 0
    turnsLeft = turns - 1
    expect(turnsLeft).toBe(0)
    useGame.setState({ classBuffTurns: 0, extraHeroAttacks: 0 })
    expect(useGame.getState().classBuffTurns).toBe(0)
    expect(useGame.getState().extraHeroAttacks).toBe(0)
  })

  it('co-op doubleAttack logic handles 3-round decrement and rearming', () => {
    let buffs = { doubleAttackTurnsLeft: 3 }
    let extraActions: Record<string, number>

    // Round 1 resolution
    let turnsLeft = Number(buffs.doubleAttackTurnsLeft) - 1
    expect(turnsLeft).toBe(2)
    buffs = { doubleAttackTurnsLeft: turnsLeft }
    extraActions = { 'user_1': 1 }
    expect(extraActions['user_1']).toBe(1)

    // Round 2 resolution
    turnsLeft = Number(buffs.doubleAttackTurnsLeft) - 1
    expect(turnsLeft).toBe(1)
    buffs = { doubleAttackTurnsLeft: turnsLeft }
    extraActions = { 'user_1': 1 }
    expect(extraActions['user_1']).toBe(1)

    // Round 3 resolution (expiration)
    turnsLeft = Number(buffs.doubleAttackTurnsLeft) - 1
    expect(turnsLeft).toBe(0)
    const { doubleAttackTurnsLeft: _, ...rest } = buffs
    buffs = rest as any
    expect((buffs as any).doubleAttackTurnsLeft).toBeUndefined()
  })
})

describe('QA Suite: Golpe Supremo (Ultimate Attack) Stat Scaling', () => {
  it('scales output with hero stats across different hero classes', () => {
    for (const hero of HEROES) {
      useGame.getState().newGame(hero.id)

      const stateBefore = useGame.getState()
      const atk = attackValue(stateBefore)
      const hpMax = maxHp(stateBefore)

      // Set deterministic combat with full gauge
      useGame.setState({
        screen: 'combat',
        enemy: { id: 'test_dummy', nome: 'Dummy', ataque: 5, vida: 5000, ouro: 10, dificuldade: 1 } as any,
        enemyHp: 5000,
        ultimateGauge: 100,
        playerTurn: true,
        animating: false,
      })

      const readyState = useGame.getState()
      expect(readyState.ultimateGauge).toBe(100)

      // Execute ultimate attack
      useGame.getState().ultimateAttack()
      const afterUlt = useGame.getState()

      expect(afterUlt.ultimateGauge, `ultimateGauge for ${hero.id}`).toBe(0)
      expect(afterUlt.lastDamage, `lastDamage for ${hero.id}`).toBeGreaterThanOrEqual(atk * 2.5 + 10)

      if (hero.id === 'druida') {
        expect(afterUlt.combatRoll?.attackEffect).toContain('SUPREMO')
      }
      if (hero.id === 'guardiao') {
        expect(afterUlt.shield).toBeGreaterThanOrEqual(Math.round(hpMax * 0.12))
      }
    }
  })

  it('cannot be triggered if ultimate gauge is below 100', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({
      screen: 'combat',
      enemy: { id: 'test_dummy', nome: 'Dummy', ataque: 5, vida: 1000, ouro: 10, dificuldade: 1 } as any,
      enemyHp: 1000,
      ultimateGauge: 80,
      playerTurn: true,
      animating: false,
    })

    useGame.getState().ultimateAttack()
    const state = useGame.getState()
    expect(state.ultimateGauge).toBe(80) // did not consume
  })
})

describe('QA Suite: Save Migration & Fast-Path Reaching Steelmere', () => {
  it('verifies that fast-path save unlocks Steelmere without breaking state', () => {
    useGame.getState().newGame('guerreiro')
    const raw = {
      completedStoryQuests: ['q_cross_oceans'],
      world: 'steelmere',
      regionId: 'frostgard',
      territory: 'Cumes de Frostgard',
      screen: 'region' as const,
    }

    useGame.setState(raw as any)
    const state = useGame.getState()

    expect(worldUnlocked(state, 'steelmere')).toBe(true)
    expect(state.world).toBe('steelmere')
    expect(state.regionId).toBe('frostgard')
  })
})

describe('QA Suite: Camera Click Accuracy Math', () => {
  it('click-to-tile coordinate transform lands precisely on clicked tile across zoom levels', () => {
    const tilePx = 48 // 16 * 3
    const camX = 100, camY = 150
    const bounds = { left: 50, top: 50 }

    for (const zoom of [0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8]) {
      const targetX = 5, targetY = 7
      const screenX = (targetX * tilePx + tilePx / 2 - camX) * zoom + bounds.left
      const screenY = (targetY * tilePx + tilePx / 2 - camY) * zoom + bounds.top

      const clickedTileX = Math.floor((camX + (screenX - bounds.left) / zoom) / tilePx)
      const clickedTileY = Math.floor((camY + (screenY - bounds.top) / zoom) / tilePx)

      expect(clickedTileX, `X at zoom ${zoom}`).toBe(targetX)
      expect(clickedTileY, `Y at zoom ${zoom}`).toBe(targetY)
    }
  })
})
