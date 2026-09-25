import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGame, applyDefeatPenalty, EQUIPMENT } from './game'

// Fixa o sorteio: o 1º Math.random() decide SE perde equipamento (perde se < chance) e o 2º
// escolhe QUAL dos itens equipados elegíveis.
function stubRolls(lossRoll: number, pickRoll: number) {
  vi.spyOn(Math, 'random').mockReturnValueOnce(lossRoll).mockReturnValueOnce(pickRoll)
}

function defeat() {
  applyDefeatPenalty(useGame.setState, useGame.getState, 'Teste.')
  return useGame.getState()
}

function freshHero() {
  useGame.getState().newGame('guerreiro')
  const bagItems = EQUIPMENT.filter((e) => e.slot !== 'bolsa').slice(0, 3).map((e, i) => `${e.id}@@bag${i}`)
  useGame.setState({ gold: 1000, equipmentBag: bagItems, consecutiveDefeats: 0, lastDefeatKey: undefined, enemy: undefined } as any)
  return bagItems
}

describe('penalidade de derrota: a bolsa e o que está guardado nela', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it('nunca perde a bolsa nem os equipamentos guardados, seja qual for o item sorteado', () => {
    const bagItems = freshHero()
    const equippedBefore = useGame.getState().equipped
    const eligible = Object.keys(equippedBefore).filter((slot) => slot !== 'bolsa')
    expect(eligible.length).toBeGreaterThan(0)

    // Percorre TODOS os índices possíveis do sorteio (o bug original só acontecia quando o slot
    // 'bolsa' era o sorteado, e a ordem dos slots não é o que queremos testar aqui).
    for (let i = 0; i <= eligible.length; i++) {
      useGame.setState({ equipped: equippedBefore, equipmentBag: bagItems, consecutiveDefeats: 0, lastDefeatKey: undefined } as any)
      stubRolls(0, Math.min(0.999, i / (eligible.length + 1)))
      const after = defeat()
      expect(after.equipped.bolsa).toBe(equippedBefore.bolsa)
      expect(after.equipmentBag).toEqual(bagItems)
      vi.restoreAllMocks()
    }
  })

  it('ainda pode perder UM equipamento vestido (a punição de itens continua existindo)', () => {
    freshHero()
    const before = Object.keys(useGame.getState().equipped).length
    stubRolls(0, 0)
    const after = defeat()
    expect(Object.keys(after.equipped).length).toBe(before - 1)
    expect(after.explorationNote).toMatch(/foi perdido/)
  })

  it('só com a bolsa vestida não há o que perder', () => {
    const bagItems = freshHero()
    const bolsa = useGame.getState().equipped.bolsa
    useGame.setState({ equipped: { bolsa } } as any)
    stubRolls(0, 0)
    const after = defeat()
    expect(after.equipped).toEqual({ bolsa })
    expect(after.equipmentBag).toEqual(bagItems)
    expect(after.explorationNote).toMatch(/Nenhum equipamento foi perdido/)
  })
})
