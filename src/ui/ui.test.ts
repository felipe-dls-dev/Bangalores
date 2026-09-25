import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_UI_MODE, UI_MODE_KEY, getUiMode, resetUiModeCache, setUiMode, subscribeUiMode, toggleUiMode } from './uiMode'
import { NAV_GROUPS, groupOfScreen, visibleNavGroups } from './navGroups'

const realStorage = globalThis.localStorage

beforeEach(() => {
  globalThis.localStorage.clear()
  resetUiModeCache()
})
afterEach(() => {
  ;(globalThis as any).localStorage = realStorage
  resetUiModeCache()
})

describe('modo de interface (preferência global)', () => {
  it('começa Clássico por padrão (decisão do Felipe) e ignora valores inválidos', () => {
    expect(DEFAULT_UI_MODE).toBe('classic')
    expect(getUiMode()).toBe('classic')
    globalThis.localStorage.setItem(UI_MODE_KEY, 'algo-estranho')
    resetUiModeCache()
    expect(getUiMode()).toBe('classic')
  })

  it('persiste a escolha e lê de novo depois de "recarregar"', () => {
    setUiMode('modern')
    expect(globalThis.localStorage.getItem(UI_MODE_KEY)).toBe('modern')
    resetUiModeCache() // simula recarregar a página
    expect(getUiMode()).toBe('modern')
    toggleUiMode()
    expect(getUiMode()).toBe('classic')
    expect(globalThis.localStorage.getItem(UI_MODE_KEY)).toBe('classic')
  })

  it('avisa quem está inscrito e para de avisar depois de cancelar', () => {
    let calls = 0
    const unsubscribe = subscribeUiMode(() => calls++)
    toggleUiMode()
    toggleUiMode()
    expect(calls).toBe(2)
    unsubscribe()
    toggleUiMode()
    expect(calls).toBe(2)
  })

  it('mantém o atributo data-ui-mode do <html> em dia (a tela de login aparece antes do App montar)', () => {
    const fakeDocument = { documentElement: { dataset: {} as Record<string, string> } }
    ;(globalThis as any).document = fakeDocument
    try {
      resetUiModeCache()
      expect(getUiMode()).toBe('classic')
      expect(fakeDocument.documentElement.dataset.uiMode).toBe('classic') // aplicado já na primeira leitura
      setUiMode('modern')
      expect(fakeDocument.documentElement.dataset.uiMode).toBe('modern')
      toggleUiMode()
      expect(fakeDocument.documentElement.dataset.uiMode).toBe('classic')
    } finally {
      delete (globalThis as any).document
    }
  })

  it('sem localStorage utilizável o botão continua funcionando na sessão', () => {
    const throwing = {
      getItem() { throw new Error('bloqueado') },
      setItem() { throw new Error('bloqueado') },
    }
    ;(globalThis as any).localStorage = throwing
    resetUiModeCache()
    expect(getUiMode()).toBe('classic')
    expect(() => setUiMode('modern')).not.toThrow()
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
    expect(classicNavScreens().length).toBeGreaterThanOrEqual(11)
  })

  it('toda tela do topo clássico está em exatamente um grupo', () => {
    for (const screen of classicNavScreens()) {
      const owners = NAV_GROUPS.filter((g) => g.screens.includes(screen))
      expect(owners.map((g) => g.id), `tela "${screen}"`).toHaveLength(1)
    }
  })

  it('não repete tela entre grupos, nem grupo, e o Acampamento é o primeiro', () => {
    const all = NAV_GROUPS.flatMap((g) => g.screens)
    expect(new Set(all).size).toBe(all.length)
    expect(new Set(NAV_GROUPS.map((g) => g.id)).size).toBe(NAV_GROUPS.length)
    expect(NAV_GROUPS[0].id).toBe('camp')
    expect(NAV_GROUPS).toHaveLength(6)
  })

  it('um grupo só aparece se a tela principal existir, e só lista telas que existem', () => {
    const classic = new Set(['map', 'character', 'inventory', 'equipment', 'shop', 'forge', 'guild', 'chronicle', 'gallery', 'coop', 'tutorial'])
    const withoutHub = visibleNavGroups(classic)
    expect(withoutHub.map((g) => g.id)).toEqual(['expedition', 'hero', 'inventory', 'social', 'achievements']) // sem Acampamento
    expect(withoutHub.find((g) => g.id === 'inventory')?.screens).toEqual(['inventory', 'shop', 'forge'])

    const withHub = visibleNavGroups(new Set([...classic, 'camp']))
    expect(withHub[0]).toMatchObject({ id: 'camp', screens: ['camp', 'tutorial'] })
    expect(withHub).toHaveLength(6)
    expect(visibleNavGroups(new Set())).toEqual([])
  })

  it('exploração e combate destacam Expedição; telas desconhecidas não destacam nada', () => {
    expect(groupOfScreen('map')?.id).toBe('expedition')
    expect(groupOfScreen('region')?.id).toBe('expedition')
    expect(groupOfScreen('combat')?.id).toBe('expedition')
    expect(groupOfScreen('forge')?.id).toBe('inventory')
    expect(groupOfScreen('camp')?.id).toBe('camp')
    expect(groupOfScreen('menu')).toBeUndefined()
  })
})
