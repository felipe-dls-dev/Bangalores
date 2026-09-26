import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { TALENTS } from '../data/expansion'
import { EQUIPMENT, FORGE_RECIPES, deriveLevel, equipmentClassAllowed, equipmentRequiredLevel, useGame } from '../store/game'
import { SCENE_ART, availableTalentCount, bagUpgrades, chapterScene, characterNextStep, consumableTotals, forgeReadyCount, guildNextStep } from './screenIdentity'

const publicFile = (asset: string) => path.join(process.cwd(), 'public', asset)

describe('cenas dos cabeçalhos do modo Moderno', () => {
  it('toda cena aponta para uma arte que existe em public/', () => {
    for (const art of Object.values(SCENE_ART)) {
      expect(fs.existsSync(publicFile(art.src)), art.src).toBe(true)
      if (art.mobileSrc) expect(fs.existsSync(publicFile(art.mobileSrc)), art.mobileSrc).toBe(true)
    }
  })

  it('nunca usa o banner antigo do Acampamento (rosto do guerreiro cortado)', () => {
    for (const art of Object.values(SCENE_ART)) {
      expect(art.src).not.toMatch(/camp-banner\.webp$/)
      expect(art.mobileSrc ?? '').not.toMatch(/camp-banner\.webp$/)
    }
  })

  it('a cena do capítulo usa a cinemática da história e some sem cinemática', () => {
    expect(chapterScene(undefined)).toBeUndefined()
    const scene = chapterScene('act-01-havendown')!
    expect(scene.src).toBe('assets/story/cinematics/act-01-havendown.webp')
    expect(fs.existsSync(publicFile(scene.src))).toBe(true)
  })
})

describe('próximo passo de cada tela', () => {
  it('Ficha: pontos parados primeiro, depois talento liberado, senão o equipamento', () => {
    expect(characterNextStep(3, 2)).toMatchObject({ step: 'attributes', detail: '3 pontos disponíveis' })
    expect(characterNextStep(1, 0).detail).toBe('1 ponto disponível')
    expect(characterNextStep(0, 1)).toMatchObject({ step: 'talents', detail: '1 talento liberado' })
    expect(characterNextStep(0, 0).step).toBe('equipment')
  })

  it('talentos liberados contam só os do nível alcançado que ainda não foram escolhidos', () => {
    const level = 10
    const unlockable = TALENTS.filter((t) => t.level <= level)
    expect(availableTalentCount(level, [], TALENTS)).toBe(unlockable.length)
    expect(availableTalentCount(level, [unlockable[0].id], TALENTS)).toBe(unlockable.length - 1)
    expect(availableTalentCount(0, [], TALENTS)).toBe(0)
  })

  it('Guilda: entregar o que está pronto, escolher quando não há contrato, senão acompanhar', () => {
    expect(guildNextStep(2, 1)).toEqual({ label: 'Entregar contratos', detail: '1 pronto para a recompensa' })
    expect(guildNextStep(0, 0).label).toBe('Escolher um contrato')
    expect(guildNextStep(3, 0)).toEqual({ label: 'Acompanhar contratos', detail: '3 em andamento' })
  })

  it('consumíveis somam as quantidades e ignoram os zerados', () => {
    expect(consumableTotals({ pocao_cura: 3, antidoto: 0, elixir_forca: 1 })).toEqual({ total: 4, kinds: 2 })
    expect(consumableTotals({})).toEqual({ total: 0, kinds: 0 })
  })
})

describe('números reais que os cabeçalhos mostram', () => {
  it('receitas prontas: nenhuma sem materiais, e aparece quando os materiais chegam', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ materials: {} } as any)
    expect(forgeReadyCount(useGame.getState())).toBe(0)
    const s = useGame.getState()
    const recipe = FORGE_RECIPES.find((r) => {
      const item = EQUIPMENT.find((e) => e.id === r.equipmentId)
      return item && equipmentClassAllowed(item, s.heroId) && (item.raridade ?? 'comum') === 'comum'
    })!
    useGame.setState({ materials: Object.fromEntries(Object.entries(recipe.materials).map(([id, qty]) => [id, qty])) } as any)
    expect(forgeReadyCount(useGame.getState())).toBeGreaterThanOrEqual(1)
  })

  it('melhorias na mochila: peça melhor e vestível entra, mochila vazia não tem nenhuma', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ xp: 15000 } as any)
    expect(bagUpgrades(useGame.getState())).toEqual([])
    const s = useGame.getState()
    const level = deriveLevel(s.xp).lvl
    // Um capacete que o guerreiro pode vestir: o espaço começa vazio, então qualquer um é ganho.
    const helmet = EQUIPMENT.find((e) => e.slot === 'capacete' && equipmentClassAllowed(e, s.heroId) && equipmentRequiredLevel(e) <= level && !s.equipped.capacete)!
    useGame.setState({ equipmentBag: [helmet.id] } as any)
    expect(bagUpgrades(useGame.getState())).toEqual([{ ref: helmet.id, slot: 'capacete' }])
  })
})
