import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CONSUMABLES, useGame } from '../store/game'
import { BOSS_TURN_RULES, bossPhases, bossPreparation, bossWeakness, levelAdvice, weaponMatchup } from './bossData'

const state = () => useGame.getState()
const boss = { id: 'b', nome: 'Chefe de Teste', vida: 100, ataque: 10, defesa: 8, dificuldade: 3, nivel: 4, ouro: 10, habilidade: '', boss: true, maxFases: 3, fase: 1 } as any

describe('fases do chefe', () => {
  it('lista uma fase por maxFases, com o limiar de vida de cada uma', () => {
    const phases = bossPhases(boss)
    expect(phases.map((p) => p.n)).toEqual([1, 2, 3])
    expect(phases.map((p) => p.entersAt)).toEqual([100, 67, 33])
    expect(phases.map((p) => p.attack)).toEqual([10, 11, 12])
  })

  it('chefe de 2 fases e chefe sem maxFases (o combate assume 2)', () => {
    expect(bossPhases({ ...boss, maxFases: 2 }).map((p) => p.entersAt)).toEqual([100, 50])
    expect(bossPhases({ ...boss, maxFases: undefined })).toHaveLength(2)
  })

  it('a primeira fase não tem capangas; as seguintes descrevem capangas e regeneração', () => {
    const [first, second] = bossPhases(boss)
    expect(first.notes.join(' ')).not.toMatch(/capanga/)
    expect(second.notes.join(' ')).toMatch(/2 capangas/)
    expect(second.notes.join(' ')).toMatch(/5 turnos/)
    expect(BOSS_TURN_RULES[0]).toMatch(/4 turnos/)
  })
})

describe('as fases descritas batem com o que o combate faz de verdade', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  function hitBoss(over: Record<string, unknown>, enemyOver: Record<string, unknown>) {
    state().newGame('guerreiro')
    useGame.setState({
      screen: 'combat', enemy: { ...boss, ...enemyOver }, playerTurn: true, animating: false, autoCombat: false, combatTurn: 3,
      heroStatus: {}, enemyStatus: {}, hp: 999, attr: { vida: 0, ataque: 10, defesa: 4 }, ...over,
    } as any)
    const queue = [0.999, 0.55, 0.4] // sem crítico bônus, dado de ataque 4, dado de defesa 3
    vi.spyOn(Math, 'random').mockImplementation(() => (queue.length ? queue.shift()! : 0.999))
    state().attack()
    vi.advanceTimersByTime(3000)
  }

  it('cruzar 67% da vida leva à fase 2: +1 de Ataque e capangas como a tela anuncia', () => {
    hitBoss({ enemyHp: 68 }, { fase: 1 })
    const [, second] = bossPhases(boss)
    expect(state().enemy?.fase).toBe(2)
    expect(state().enemy?.ataque).toBe(second.attack)
    const minions = state().combatMinions ?? []
    expect(minions).toHaveLength(2)
    expect(second.notes[1]).toContain(`${minions[0].hp} de vida, ataque ${minions[0].ataque}`)
  })

  it('cruzar 33% leva à fase 3 com o ataque e os capangas descritos', () => {
    hitBoss({ enemyHp: 36 }, { fase: 2, ataque: 11 })
    const third = bossPhases(boss)[2]
    expect(state().enemy?.fase).toBe(3)
    expect(state().enemy?.ataque).toBe(third.attack)
    const minions = state().combatMinions ?? []
    expect(third.notes[1]).toContain(`${minions[0].hp} de vida, ataque ${minions[0].ataque}`)
  })
})

describe('fraquezas do chefe', () => {
  it('chefe sem elemento definido é de Sombra (como no combate) e sofre com Luz', () => {
    const w = bossWeakness({ boss: true } as any)
    expect(w.element).toBe('sombra')
    expect(w.weakTo).toEqual(['luz'])
    expect(w.resists).toContain('arcano')
    expect(w.resists).toContain('sombra')
  })

  it('elemento explícito manda: Fogo sofre com Gelo e resiste a Natureza e ao próprio Fogo', () => {
    const w = bossWeakness({ boss: true, elemento: 'fogo' } as any)
    expect(w.weakTo).toEqual(['gelo'])
    expect(new Set(w.resists)).toEqual(new Set(['natureza', 'fogo']))
  })

  it('físico não tem fraqueza nem resistência', () => {
    const w = bossWeakness({ boss: false, elemento: 'fisico' } as any)
    expect(w.weakTo).toEqual([])
    expect(w.resists).toEqual([])
  })

  it('a arma do herói: fraqueza, resistência ou neutro (e físico é sempre neutro)', () => {
    const w = bossWeakness({ boss: true } as any) // Sombra
    expect(weaponMatchup('luz', w)).toBe('fraqueza')
    expect(weaponMatchup('arcano', w)).toBe('resistencia')
    expect(weaponMatchup('fogo', w)).toBe('neutro')
    expect(weaponMatchup('fisico', w)).toBe('neutro')
  })
})

describe('adequação de nível', () => {
  const sub = { nivelMin: 4, nivelMax: 6 }
  it('abaixo, dentro e acima da faixa da sub-região', () => {
    expect(levelAdvice(3, sub)?.fit).toBe('below')
    expect(levelAdvice(4, sub)?.fit).toBe('within')
    expect(levelAdvice(6, sub)?.fit).toBe('within')
    expect(levelAdvice(7, sub)?.fit).toBe('above')
    expect(levelAdvice(3, sub)?.range).toBe('4–6')
    expect(levelAdvice(2, { nivelMin: 5, nivelMax: 5 })?.range).toBe('5')
  })

  it('sem sub-região não inventa recomendação', () => {
    expect(levelAdvice(10, undefined)).toBeUndefined()
  })
})

describe('preparo', () => {
  it('separa poções de cura dos outros consumíveis e ignora ids desconhecidos ou zerados', () => {
    const heal = CONSUMABLES.find((c) => c.tipo === 'cura')!.id
    const other = CONSUMABLES.find((c) => c.tipo !== 'cura')!.id
    const prep = bossPreparation({ inventory: { [heal]: 3, [other]: 2, id_que_nao_existe: 9, [`${heal}_x`]: 0 }, protectionBlessings: 2, hp: 15 }, 20)
    expect(prep).toEqual({ healingPotions: 3, otherConsumables: 2, blessings: 2, hpPercent: 75 })
  })

  it('sem inventário nem bênçãos', () => {
    expect(bossPreparation({ inventory: {}, hp: 0 }, 0)).toEqual({ healingPotions: 0, otherConsumables: 0, blessings: 0, hpPercent: 0 })
  })
})
