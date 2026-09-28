import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_UI_MODE, UI_MODE_KEY, applyUiMode, getUiMode, useUiMode } from './uiMode'
import { MODERN_ONLY_SCREEN_LABELS, NAV_GROUPS, groupOfScreen, visibleNavGroups } from './navGroups'

const realStorage = globalThis.localStorage

beforeEach(() => {
  globalThis.localStorage.clear()
})
afterEach(() => {
  ;(globalThis as any).localStorage = realStorage
})

describe('modo de interface (Clássico desativado na v0.9.9)', () => {
  it('é sempre o Moderno, mesmo para quem tinha escolhido o Clássico', () => {
    expect(DEFAULT_UI_MODE).toBe('modern')
    globalThis.localStorage.setItem(UI_MODE_KEY, 'classic')
    expect(getUiMode()).toBe('modern')
    expect(useUiMode()).toBe('modern')
  })

  it('apaga a preferência antiga e marca o <html> (a tela de login aparece antes do App montar)', () => {
    const fakeDocument = { documentElement: { dataset: {} as Record<string, string> } }
    ;(globalThis as any).document = fakeDocument
    try {
      globalThis.localStorage.setItem(UI_MODE_KEY, 'classic')
      applyUiMode()
      expect(fakeDocument.documentElement.dataset.uiMode).toBe('modern')
      expect(globalThis.localStorage.getItem(UI_MODE_KEY)).toBeNull()
    } finally {
      delete (globalThis as any).document
    }
  })

  it('não quebra com o armazenamento bloqueado', () => {
    ;(globalThis as any).localStorage = {
      getItem() { throw new Error('bloqueado') },
      removeItem() { throw new Error('bloqueado') },
    }
    expect(() => applyUiMode()).not.toThrow()
    expect(getUiMode()).toBe('modern')
  })
})

describe('grupos do topo moderno', () => {
  const classicNavScreens = () => {
    // A lista plana do modo Clássico vive em main.tsx; lê o texto para garantir que nenhuma tela
    // do topo fique de fora dos grupos quando alguém adicionar uma nova.
    const source = fs.readFileSync(path.resolve(__dirname, '..', 'main.tsx'), 'utf8')
    const block = source.match(/const nav=\[(.*?)\] as const/s)?.[1] ?? ''
    return [...block.matchAll(/\['([a-z]+)',/g)].map((m) => m[1])
  }

  it('acha a lista do topo clássico em main.tsx (sanidade do próprio teste)', () => {
    expect(classicNavScreens().length).toBeGreaterThanOrEqual(13)
  })

  it('toda tela do topo clássico está em exatamente um grupo', () => {
    for (const screen of classicNavScreens()) {
      const owners = NAV_GROUPS.filter((g) => g.screens.includes(screen))
      expect(owners.map((g) => g.id), `tela "${screen}"`).toHaveLength(1)
    }
  })

  it('toda tela de todo grupo tem um nome legível (QA-005: o menu chegou a mostrar o id "camp")', () => {
    const classic = new Set(classicNavScreens())
    for (const screen of NAV_GROUPS.flatMap((g) => g.screens)) {
      const named = classic.has(screen) || Boolean(MODERN_ONLY_SCREEN_LABELS[screen])
      expect(named, `tela "${screen}" sem nome`).toBe(true)
    }
    expect(MODERN_ONLY_SCREEN_LABELS.camp).toBe('Acampamento')
  })

  it('não repete tela entre grupos, nem grupo, e o Acampamento é o primeiro', () => {
    const all = NAV_GROUPS.flatMap((g) => g.screens)
    expect(new Set(all).size).toBe(all.length)
    expect(new Set(NAV_GROUPS.map((g) => g.id)).size).toBe(NAV_GROUPS.length)
    expect(NAV_GROUPS[0].id).toBe('camp')
    expect(NAV_GROUPS).toHaveLength(6)
  })

  it('um grupo só aparece se a tela principal existir, e só lista telas que existem', () => {
    const classic = new Set(['map', 'dungeon', 'chronicle', 'character', 'equipment', 'inventory', 'shop', 'forge', 'guild', 'achievements', 'gallery', 'coop', 'tutorial'])
    const withoutHub = visibleNavGroups(classic)
    expect(withoutHub.map((g) => g.id)).toEqual(['expedition', 'hero', 'town', 'achievements', 'coop']) // sem Acampamento
    expect(withoutHub.find((g) => g.id === 'expedition')?.screens).toEqual(['map', 'dungeon', 'chronicle'])
    expect(withoutHub.find((g) => g.id === 'hero')?.screens).toEqual(['character', 'equipment', 'inventory'])
    expect(withoutHub.find((g) => g.id === 'town')?.screens).toEqual(['shop', 'forge', 'guild'])
    expect(withoutHub.find((g) => g.id === 'achievements')?.screens).toEqual(['achievements', 'gallery'])

    const withHub = visibleNavGroups(new Set([...classic, 'camp']))
    expect(withHub[0]).toMatchObject({ id: 'camp', screens: ['camp', 'tutorial'] })
    expect(withHub).toHaveLength(6)
    expect(visibleNavGroups(new Set())).toEqual([])
  })

  it('exploração e combate destacam Expedição; telas desconhecidas não destacam nada', () => {
    expect(groupOfScreen('map')?.id).toBe('expedition')
    expect(groupOfScreen('region')?.id).toBe('expedition')
    expect(groupOfScreen('combat')?.id).toBe('expedition')
    expect(groupOfScreen('forge')?.id).toBe('town')
    expect(groupOfScreen('dungeon')?.id).toBe('expedition')
    expect(groupOfScreen('inventory')?.id).toBe('hero')
    expect(groupOfScreen('achievements')?.id).toBe('achievements')
    expect(groupOfScreen('camp')?.id).toBe('camp')
    expect(groupOfScreen('menu')).toBeUndefined()
  })
})

describe('organização dos menus por assunto (v0.9.7)', () => {
  const main = () => fs.readFileSync(path.resolve(__dirname, '..', 'main.tsx'), 'utf8')
  it('a ordem do topo clássico acompanha os grupos do Moderno', () => {
    const source = main()
    const block = source.match(/const nav=\[(.*?)\] as const/s)?.[1] ?? ''
    const classicOrder = [...block.matchAll(/\['([a-z]+)',/g)].map((m) => m[1]).filter((id) => id !== 'tutorial')
    const groupOrder = NAV_GROUPS.flatMap((g) => g.screens).filter((id) => id !== 'camp' && id !== 'tutorial')
    expect(classicOrder).toEqual(groupOrder)
  })
  it('Crônicas ficam só com História e Missões; Masmorras, Conquistas e o resumo da build têm tela própria', () => {
    const source = main()
    const chronicleTabs = source.match(/function ChronicleTabsModern\(\)\{[\s\S]*?const tabs=\[(.*?)\]\r?\n/)?.[1] ?? ''
    expect([...chronicleTabs.matchAll(/label:'([^']+)'/g)].map((m) => m[1])).toEqual(['História', 'Missões'])
    expect(source).toMatch(/function DungeonScreen\(\)[\s\S]*?<DungeonPanel\/>/)
    expect(source).toMatch(/function AchievementsScreen\(\)[\s\S]*?<AchievementsPanel\/>[\s\S]*?<BestiaryPanel\/>/)
    expect(source).toMatch(/<\/div><EquipmentRulesPanel\/><\/>\}/)
  })
})
