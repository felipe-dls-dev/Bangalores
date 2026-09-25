import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGame, runAutoCombatTurn } from './game'

const fakeEnemy = { id: 'x', nome: 'Inimigo de Teste', vida: 999, ataque: 3, dificuldade: 2, ouro: 5, habilidade: '' } as any
const state = () => useGame.getState()

function inCombat(over: Record<string, unknown> = {}) {
  useGame.getState().newGame('guerreiro')
  useGame.setState({
    screen: 'combat', enemy: fakeEnemy, enemyHp: 999, playerTurn: true, animating: false, autoCombat: false,
    combatTurn: 3, itemUsedTurn: undefined, heroStatus: {}, enemyStatus: {}, hp: 1, inventory: { pocao_cura: 3 }, activePotionIds: [],
    ...over,
  } as any)
}

describe('poção como ação rápida (1 por turno, sem gastar o ataque)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('beber uma poção em combate cura e NÃO passa a vez para o inimigo', () => {
    inCombat()
    state().useConsumable('pocao_cura')
    vi.advanceTimersByTime(6000) // tempo de sobra para qualquer fase do inimigo que tivesse sido agendada

    const s = state()
    expect(s.hp).toBeGreaterThan(1)
    expect(s.inventory.pocao_cura).toBe(2)
    expect(s.playerTurn).toBe(true) // continua a vez do herói
    expect(s.combatTurn).toBe(3) // nenhuma rodada inimiga passou
    expect(s.enemyHp).toBe(999)
    expect(s.itemUsedTurn).toBe(3)
  })

  it('o herói ainda pode atacar depois de usar a poção, no mesmo turno', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    inCombat()
    state().useConsumable('pocao_cura')
    state().attack()
    vi.advanceTimersByTime(2600)
    expect(state().enemyHp).toBeLessThan(999)
  })

  it('só um consumível por turno: o segundo é recusado e nada é gasto', () => {
    inCombat()
    state().useConsumable('pocao_cura')
    const hpAfterFirst = state().hp
    state().useConsumable('pocao_cura')
    expect(state().inventory.pocao_cura).toBe(2)
    expect(state().hp).toBe(hpAfterFirst)
    expect(state().combatLog.at(-1)).toMatch(/já usou um consumível neste turno/)
  })

  it('no turno seguinte a trava libera', () => {
    inCombat()
    state().useConsumable('pocao_cura')
    useGame.setState({ combatTurn: 4 } as any) // novo turno do herói
    state().useConsumable('pocao_cura')
    expect(state().inventory.pocao_cura).toBe(1)
    expect(state().itemUsedTurn).toBe(4)
  })

  it('fora de combate a trava não existe (usar poção na mochila continua livre)', () => {
    inCombat({ screen: 'inventory', enemy: undefined, itemUsedTurn: 3 })
    state().useConsumable('pocao_cura')
    state().useConsumable('pocao_cura')
    expect(state().inventory.pocao_cura).toBe(1)
  })

  it('só age no turno do herói (o inimigo agindo bloqueia, como antes)', () => {
    inCombat({ playerTurn: false })
    state().useConsumable('pocao_cura')
    expect(state().inventory.pocao_cura).toBe(3)
  })

  it('auto-combate: bebe a poção quando a vida está baixa E ainda age no mesmo turno', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    inCombat({ autoCombat: true })
    runAutoCombatTurn(useGame.setState, useGame.getState)
    expect(state().inventory.pocao_cura).toBe(2) // bebeu
    expect(state().playerTurn).toBe(true) // e o turno continua para o auto decidir o resto

    vi.advanceTimersByTime(800) // o auto reagenda a decisão logo depois da poção
    const after = state()
    expect(after.inventory.pocao_cura).toBe(2) // não bebe a 2ª no mesmo turno
    expect(after.playerTurn === false || after.enemyHp < 999 || after.animating).toBe(true) // agiu (atacou/habilidade)
  })
})
