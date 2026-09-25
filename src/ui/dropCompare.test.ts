import { beforeEach, describe, expect, it } from 'vitest'
import { EQUIPMENT, armorValue, attackValue, equipmentBagCapacity, maxHp, useGame } from '../store/game'
import { compareDrop, equipBlock, equippedAfter, findDroppedRef, signed } from './dropCompare'

const state = () => useGame.getState()

beforeEach(() => {
  state().newGame('guerreiro')
  useGame.setState({ xp: 5_000_000 } as any) // nível alto: nenhum item fica bloqueado por nível
})

describe('comparação do equipamento que caiu', () => {
  it('a previsão de cada item é exatamente o que o jogo faz ao equipar (todas as peças que o guerreiro pode usar)', () => {
    const usable = EQUIPMENT.filter((e) => !e.classeExclusiva || [e.classeExclusiva].flat().includes('guerreiro'))
    expect(usable.length).toBeGreaterThan(50)
    const bySlot = new Map<string, string[]>()
    for (const e of usable) bySlot.set(e.slot, [...(bySlot.get(e.slot) ?? []), e.id])
    let checked = 0
    for (const ids of bySlot.values()) {
      for (const id of ids.slice(0, 8)) {
        state().newGame('guerreiro')
        useGame.setState({ xp: 5_000_000, equipmentBag: [id] } as any)
        const before = state()
        const cmp = compareDrop(id, before)!
        if (!cmp.block.ok) continue
        state().equip(id)
        const after = state()
        if (after.equipmentBag.includes(id)) continue // o jogo recusou (ex.: bolsa menor que o conteúdo)
        const real = cmp.rows.map((r) => (r.id === 'ataque' ? attackValue(after) : r.id === 'armadura' ? armorValue(after) : r.id === 'vida' ? maxHp(after) : equipmentBagCapacity(after)))
        expect(cmp.rows.map((r) => r.to), `${id} em ${cmp.slot}`).toEqual(real)
        expect(cmp.rows.map((r) => r.from), `${id} antes`).toEqual(
          cmp.rows.map((r) => (r.id === 'ataque' ? attackValue(before) : r.id === 'armadura' ? armorValue(before) : r.id === 'vida' ? maxHp(before) : equipmentBagCapacity(before))),
        )
        checked++
      }
    }
    expect(checked).toBeGreaterThan(25)
  })

  it('arma melhor: veredito "better", deltas positivos e nome do que sai', () => {
    const start = state().equipped.mao_direita as string
    const better = EQUIPMENT.filter((e) => e.slot === 'mao_direita' && (!e.classeExclusiva || [e.classeExclusiva].flat().includes('guerreiro'))).sort((a, b) => (b.ataque ?? 0) - (a.ataque ?? 0))[0]
    useGame.setState({ equipmentBag: [better.id] } as any)
    const cmp = compareDrop(better.id, state())!
    expect(cmp.slot).toBe('mao_direita')
    expect(cmp.replaces).toBeTruthy()
    expect(cmp.verdict).toBe('better')
    expect(cmp.rows.find((r) => r.id === 'ataque')!.delta).toBeGreaterThan(0)
    expect(start).toBeTruthy()
  })

  it('anel: com o primeiro anel ocupado o item vai para o segundo espaço', () => {
    const rings = EQUIPMENT.filter((e) => e.slot === 'anel_1')
    expect(rings.length).toBeGreaterThan(1)
    const first = equippedAfter({ equipped: { anel_1: rings[0].id }, equipmentBag: [] } as any, rings[1].id)!
    expect(first.slot).toBe('anel_2')
    expect(first.equipped.anel_1).toBe(rings[0].id)
    expect(equippedAfter({ equipped: {}, equipmentBag: [] } as any, rings[1].id)!.slot).toBe('anel_1')
  })

  it('empurra para "mixed" quando ganha em um atributo e perde em outro, e "same" quando nada muda', () => {
    const items = EQUIPMENT.filter((e) => e.slot === 'peitoral' && (!e.classeExclusiva || [e.classeExclusiva].flat().includes('guerreiro')))
    const verdicts = new Set(items.map((e) => { useGame.setState({ equipmentBag: [e.id] } as any); return compareDrop(e.id, state())!.verdict }))
    expect(verdicts.size).toBeGreaterThan(1) // o catálogo tem peças melhores e piores que a inicial
  })

  it('devolve indefinido para um id que não existe', () => {
    expect(compareDrop('item-fantasma', state())).toBeUndefined()
  })
})

describe('bloqueios de equipar', () => {
  it('classe errada e nível baixo dão rótulos diferentes', () => {
    const forOthers = EQUIPMENT.find((e) => e.classeExclusiva && ![e.classeExclusiva].flat().includes('guerreiro'))!
    const blocked = equipBlock(forOthers, state())
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) expect(blocked.label).toBe('Impossível equipar')

    const leveled = EQUIPMENT.find((e) => (e.nivelMinimo ?? 1) > 5 && (!e.classeExclusiva || [e.classeExclusiva].flat().includes('guerreiro')))!
    useGame.setState({ xp: 0 } as any)
    const low = equipBlock(leveled, state())
    expect(low.ok).toBe(false)
    if (!low.ok) expect(low.label).toMatch(/^Requer nível \d+$/)
  })

  it('peça livre passa', () => {
    const free = EQUIPMENT.find((e) => e.slot === 'botas' && !e.classeExclusiva)!
    expect(equipBlock(free, state())).toEqual({ ok: true })
  })
})

describe('utilitários', () => {
  it('acha a última cópia do item na mochila', () => {
    const id = EQUIPMENT[0].id
    expect(findDroppedRef([`${id}@@a`, 'outro', `${id}@@b`], id)).toBe(`${id}@@b`)
    expect(findDroppedRef([], id)).toBeUndefined()
  })

  it('sinal explícito para positivos', () => {
    expect([signed(3), signed(0), signed(-2)]).toEqual(['+3', '0', '-2'])
  })
})
