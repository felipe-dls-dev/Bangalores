import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EQUIPMENT, FORGE_RECIPES, useGame } from '../store/game'
import { categoryCounts, filterRecipes, recipeEntries, recipeReadiness } from './forgeData'

const state = () => useGame.getState()
const allMaterialIds = [...new Set(FORGE_RECIPES.flatMap((r) => Object.keys(r.materials)))]
const richMaterials = Object.fromEntries(allMaterialIds.map((id) => [id, 999]))
const pieceOf = (rarity: string) => EQUIPMENT.find((e) => (e.raridade ?? 'comum') === rarity)?.id
const existingPieces = (rarities: string[]) => rarities.flatMap((r) => { const id = pieceOf(r); return id ? [id, id, id] : [] })

beforeEach(() => {
  state().newGame('guerreiro')
})
afterEach(() => vi.restoreAllMocks())

/** Para cada receita: a etiqueta "pode criar" bate com o que a ação de verdade faz? */
function readinessMatchesCraft(setup: Record<string, unknown>) {
  useGame.setState(setup as any)
  const snapshot = state()
  const summary = { ready: 0, blocked: 0, statuses: new Set<string>() }
  for (const entry of recipeEntries(snapshot.heroId)) {
    useGame.setState(snapshot, true)
    const readiness = recipeReadiness(entry, state())
    const before = state().forgeAttempts ?? 0
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    state().craftEquipment(entry.recipe.id)
    vi.restoreAllMocks()
    const attempted = (state().forgeAttempts ?? 0) > before
    expect(attempted, `${entry.recipe.nome} (${readiness.status})`).toBe(readiness.canCraft)
    readiness.canCraft ? summary.ready++ : summary.blocked++
    summary.statuses.add(readiness.status)
  }
  return summary
}

describe('a etiqueta "Pronta" bate com a ação de fabricar de verdade', () => {
  it('sem materiais e sem nível: nada está pronto (a maioria bloqueada por nível ou material)', () => {
    const s = readinessMatchesCraft({})
    expect(s.blocked).toBeGreaterThan(100)
    expect(s.statuses.has('ready')).toBe(false)
  })

  it('materiais de sobra, nível e maestria altos, mochila vazia: comuns prontas, o resto pede peças para sacrificar', () => {
    const s = readinessMatchesCraft({ xp: 5_000_000, forgeXp: 5_000_000, materials: richMaterials, equipmentBag: [] })
    expect(s.ready).toBeGreaterThan(5)
    expect(s.statuses.has('sacrifice')).toBe(true)
  })

  it('com as peças de sacrifício na mochila (cheia): as que sacrificam ficam prontas e as comuns acusam mochila cheia', () => {
    const pieces = existingPieces(['comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico'])
    const s = readinessMatchesCraft({ xp: 5_000_000, forgeXp: 5_000_000, materials: richMaterials, equipmentBag: pieces })
    expect(s.ready).toBeGreaterThan(20)
    expect(s.statuses.has('bag')).toBe(true)
  })

  it('materiais e peças de sobra mas jogador de nível 1: as de nível alto ficam trancadas', () => {
    const pieces = existingPieces(['comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico'])
    const s = readinessMatchesCraft({ xp: 0, forgeXp: 5_000_000, materials: richMaterials, equipmentBag: pieces })
    expect(s.statuses.has('locked')).toBe(true)
  })

  it('materiais e peças de sobra mas maestria de forja 1: as de forjador alto ficam trancadas', () => {
    const pieces = existingPieces(['comum', 'incomum', 'raro', 'epico', 'lendario', 'mitico'])
    const s = readinessMatchesCraft({ xp: 5_000_000, forgeXp: 0, materials: richMaterials, equipmentBag: pieces })
    expect(s.statuses.has('locked')).toBe(true)
  })

  it('só falta um material: acusa "Faltam 1" e a fabricação de verdade recusa', () => {
    const entry = recipeEntries('guerreiro').find((e) => Object.keys(e.recipe.materials).length && !(['incomum', 'raro', 'epico', 'lendario', 'mitico', 'heroico'] as string[]).includes(e.item.raridade ?? 'comum'))!
    const [id, qty] = Object.entries(entry.recipe.materials)[0]
    useGame.setState({ xp: 5_000_000, forgeXp: 5_000_000, materials: { ...richMaterials, [id]: qty - 1 }, equipmentBag: [] } as any)
    const readiness = recipeReadiness(entry, state())
    expect(readiness.status).toBe('missing')
    expect(readiness.label).toBe('Faltam 1')
  })
})

describe('filtro da lista de receitas', () => {
  const rich = () => useGame.setState({ xp: 5_000_000, forgeXp: 5_000_000, materials: richMaterials, equipmentBag: [] } as any)

  it('só lista receitas que a classe pode usar', () => {
    const entries = recipeEntries('guerreiro')
    expect(entries.length).toBeGreaterThan(50)
    expect(entries.length).toBeLessThanOrEqual(FORGE_RECIPES.length)
    for (const e of entries) expect([e.item.classeExclusiva].flat().filter(Boolean).length === 0 || [e.item.classeExclusiva].flat().includes('guerreiro')).toBe(true)
  })

  it('contagem por categoria soma o total', () => {
    const entries = recipeEntries('guerreiro')
    expect(Object.values(categoryCounts(entries)).reduce((a, b) => a + b, 0)).toBe(entries.length)
  })

  it('categoria e busca reduzem a lista; busca ignora maiúsculas', () => {
    rich()
    const entries = recipeEntries('guerreiro')
    const all = filterRecipes(entries, { category: 'all', query: '', readyOnly: false }, state())
    expect(all).toHaveLength(entries.length)
    const weapons = filterRecipes(entries, { category: 'mao_direita', query: '', readyOnly: false }, state())
    expect(weapons.length).toBeGreaterThan(0)
    expect(weapons.length).toBeLessThan(all.length)
    const name = entries[0].recipe.nome
    const found = filterRecipes(entries, { category: 'all', query: name.toUpperCase(), readyOnly: false }, state())
    expect(found.map((e) => e.recipe.id)).toContain(entries[0].recipe.id)
    expect(filterRecipes(entries, { category: 'all', query: 'zzzz-nada-assim', readyOnly: false }, state())).toEqual([])
  })

  it('"só as que posso criar" devolve apenas as prontas', () => {
    rich()
    const entries = recipeEntries('guerreiro')
    const ready = filterRecipes(entries, { category: 'all', query: '', readyOnly: true }, state())
    expect(ready.length).toBeGreaterThan(0)
    expect(ready.every((e) => e.readiness.canCraft)).toBe(true)
  })

  it('ordena: prontas primeiro, bloqueadas por nível por último', () => {
    useGame.setState({ xp: 5_000_000, forgeXp: 0, materials: richMaterials, equipmentBag: [] } as any)
    const list = filterRecipes(recipeEntries('guerreiro'), { category: 'all', query: '', readyOnly: false }, state())
    const ranks = list.map((e) => ['ready', 'bag', 'sacrifice', 'missing', 'locked'].indexOf(e.readiness.status))
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    expect(list[0].readiness.status).toBe('ready')
  })
})
