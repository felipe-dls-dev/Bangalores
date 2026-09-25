import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGame } from './game'
import { previewEnemyAttack, previewHeroAttack } from './combatPreview'

const state = () => useGame.getState()
const baseEnemy = { id: 'x', nome: 'Inimigo de Teste', vida: 999, ataque: 16, dificuldade: 2, ouro: 5, habilidade: '', defesa: 5 } as any

function inCombat(heroId = 'guerreiro', over: Record<string, unknown> = {}, enemy: Record<string, unknown> = {}, weaponElement?: string) {
  state().newGame(heroId)
  if (weaponElement) over = { ...over, equipmentElements: { [state().equipped.mao_direita as string]: weaponElement } }
  useGame.setState({
    screen: 'combat', enemy: { ...baseEnemy, ...enemy }, enemyHp: 999, playerTurn: true, animating: false, autoCombat: false,
    combatTurn: 3, heroStatus: {}, enemyStatus: {}, hp: 999, shield: 0, heroRollBonus: 0, enemyRollBonus: 0, enemyFearPenalty: 0,
    attr: { forca: 10, magia: 0, vigor: 4, destreza: 0 }, // números maiores fazem os multiplicadores (x1,35, x0,75, x1,5...) aparecerem no resultado
    ...over,
  } as any)
}

// Faz Math.random devolver os valores da fila (na ordem em que o jogo pede) e, acabada a fila, 0.999
// (nunca dispara chances de bônus). O dado de d6 sai de floor(r*6)+1, então (face-1)/6 + 0.05 cai na face.
const faceToRandom = (face: number) => (face - 1) / 6 + 0.05
function scriptRandom(queue: number[]) {
  return vi.spyOn(Math, 'random').mockImplementation(() => (queue.length ? queue.shift()! : 0.999))
}

const FACES = [1, 2, 3, 4, 5, 6]

/** Dano real do ataque comum do herói para cada combinação (dado de ataque, dado de defesa). */
function realHeroDamages(setup: () => void): number[] {
  const seen: number[] = []
  setup()
  const snapshot = state()
  for (const n of FACES) {
    for (const d of FACES) {
      useGame.setState(snapshot, true) // volta ao estado do cenário sem refazer a campanha inteira
      scriptRandom([0.999, faceToRandom(n), faceToRandom(d)])
      state().attack()
      seen.push(state().lastDamage as number)
      vi.clearAllTimers()
      vi.restoreAllMocks()
    }
  }
  return seen
}

describe('previsão do ataque do herói bate com o combate de verdade', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const scenarios: Array<[string, () => void]> = [
    ['inimigo comum', () => inCombat()],
    ['defesa alta do inimigo', () => inCombat('guerreiro', {}, { defesa: 9 })],
    ['bônus de dado do herói', () => inCombat('guerreiro', { heroRollBonus: 1 })],
    ['herói cego (penalidade nos dados)', () => inCombat('guerreiro', { heroStatus: { blinded: 2 } })],
    ['inimigo assustado e congelado', () => inCombat('guerreiro', { enemyFearPenalty: 1, enemyStatus: { frozen: 2 } })],
    ['inimigo atordoado (defesa vira 1)', () => inCombat('guerreiro', { enemyStatus: { stunned: true } })],
    ['chefe', () => inCombat('guerreiro', {}, { boss: true, maxFases: 2, fase: 1, vida: 999 })],
    ['chefe com o talento de caçador de chefes (+2)', () => inCombat('guerreiro', { talents: ['cacador'] }, { boss: true, maxFases: 2, fase: 1 })],
    ['postura do inimigo quebrada', () => inCombat('guerreiro', { isStaggered: true, staggerCurrent: 30, staggerMax: 30 })],
    ['bônus de primeiro golpe', () => inCombat('guerreiro', { firstStrikeBonus: 3 })],
    ['guarda fechada (turno com +2 de defesa)', () => inCombat('guerreiro', { combatTurn: 1 }, { dificuldade: 0 })],
    ['arcanista (ataque alto)', () => inCombat('arcanista')],
    ['arma elemental contra fraqueza', () => inCombat('guerreiro', {}, { elemento: 'natureza' }, 'fogo')],
    ['arma elemental contra resistência', () => inCombat('guerreiro', {}, { elemento: 'fogo' }, 'fogo')],
  ]

  for (const [name, setup] of scenarios) {
    it(`cenário: ${name}`, () => {
      setup()
      const preview = previewHeroAttack(state())!
      const real = realHeroDamages(setup)
      expect(Math.min(...real), 'menor dano').toBe(preview.min)
      expect(Math.max(...real), 'maior dano').toBe(preview.max)
      const realAverage = real.reduce((a, b) => a + b, 0) / real.length
      expect(Math.abs(realAverage - preview.average), 'média (±1)').toBeLessThanOrEqual(1)
    })
  }

  it('a chance de crítico é 1/6 sem bônus e sobe com dado extra', () => {
    inCombat()
    expect(previewHeroAttack(state())!.critChance).toBeCloseTo(1 / 6, 5)
    inCombat('guerreiro', { heroRollBonus: 1 })
    expect(previewHeroAttack(state())!.critChance).toBeGreaterThan(1 / 6)
  })

  it('plainAttack ignora a intenção do turno (ataque pesado/guarda) e bate com um turno de ataque direto', () => {
    // Descobre um turno "de ataque direto" e um "pesado" para o mesmo inimigo.
    const turns = [1, 2, 3, 4, 5, 6, 7, 8]
    const byIntent = (type: string) => turns.find((turn) => {
      inCombat('guerreiro', { combatTurn: turn })
      return previewEnemyAttack(state())!.intentLabel === type
    })!
    const plainTurn = byIntent('Ataque direto')
    const heavyTurn = byIntent('Ataque pesado')
    inCombat('guerreiro', { combatTurn: plainTurn })
    const reference = previewEnemyAttack(state())!
    inCombat('guerreiro', { combatTurn: heavyTurn })
    const heavy = previewEnemyAttack(state())!
    const plainOnHeavyTurn = previewEnemyAttack(state(), { plainAttack: true })!
    expect(heavy.max).toBeGreaterThan(reference.max)
    expect(plainOnHeavyTurn.max).toBe(reference.max)
    expect(plainOnHeavyTurn.intentLabel).toBe('Ataque direto')
  })

  it('sem inimigo não há previsão', () => {
    inCombat()
    useGame.setState({ enemy: undefined } as any)
    expect(previewHeroAttack(state())).toBeUndefined()
    expect(previewEnemyAttack(state())).toBeUndefined()
  })

  it('marca fraqueza e resistência elementais', () => {
    inCombat('guerreiro', {}, { elemento: 'natureza' }, 'fogo')
    expect(previewHeroAttack(state())!.elemental).toBe('fraqueza')
    inCombat('guerreiro', {}, { elemento: 'fogo' }, 'fogo')
    expect(previewHeroAttack(state())!.elemental).toBe('resistencia')
    inCombat()
    expect(previewHeroAttack(state())!.elemental).toBeUndefined()
  })
})

/** Dano real que o inimigo causa (depois de escudo/resistência) para cada combinação de dados. */
function realEnemyDamages(setup: () => void): number[] {
  const seen: number[] = []
  setup()
  const snapshot = state()
  for (const n of FACES) {
    for (const d of FACES) {
      useGame.setState(snapshot, true)
      const captured: number[] = []
      const unsubscribe = useGame.subscribe((s) => {
        if (s.combatRoll?.attacker === 'enemy') captured.push(s.combatRoll.damage)
      })
      // Uma rodada completa: ataque do herói e, na sequência, o do inimigo. O dado do herói é o 4 (sai
      // 3 mesmo congelado): faces 1, 2, 5 e 6 dão efeitos que mexem nos dados do inimigo.
      scriptRandom([0.999, faceToRandom(4), faceToRandom(4)])
      state().attack()
      vi.advanceTimersByTime(1500)
      vi.restoreAllMocks()
      scriptRandom([faceToRandom(n), faceToRandom(d)])
      vi.advanceTimersByTime(6000)
      unsubscribe()
      seen.push(captured[0])
      vi.clearAllTimers()
      vi.restoreAllMocks()
    }
  }
  return seen
}

describe('previsão do golpe do inimigo bate com o combate de verdade', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const scenarios: Array<[string, () => void]> = [
    ['inimigo comum', () => inCombat('guerreiro', {}, { ataque: 16 })],
    ['ataque pesado (+35%)', () => inCombat('guerreiro', { combatTurn: 2 }, { ataque: 17, dificuldade: 2 })],
    ['com escudo', () => inCombat('guerreiro', { shield: 4 })],
    ['herói com bônus de defesa nos dados', () => inCombat('guerreiro', { classRollBonus: 1 })],
    ['herói congelado', () => inCombat('guerreiro', { heroStatus: { frozen: 2 } })],
    ['inimigo assustado', () => inCombat('guerreiro', { enemyFearPenalty: 1 })],
  ]

  for (const [name, setup] of scenarios) {
    it(`cenário: ${name}`, { timeout: 60_000 }, () => {
      setup()
      const preview = previewEnemyAttack(state())!
      const real = realEnemyDamages(setup)
      expect(real.every((v) => typeof v === 'number'), 'o inimigo chegou a atacar').toBe(true)
      expect(Math.min(...real), 'menor dano').toBe(preview.min)
      expect(Math.max(...real), 'maior dano').toBe(preview.max)
      const realAverage = real.reduce((a, b) => a + b, 0) / real.length
      expect(Math.abs(realAverage - preview.average), 'média (±1)').toBeLessThanOrEqual(1)
    })
  }

  it('esquiva do Ladino entra na chance de dano zero e a Sacerdotisa não esquiva', () => {
    inCombat('cacadora')
    expect(previewEnemyAttack(state())!.dodgeChance).toBeCloseTo(0.2, 5)
    inCombat('guerreiro')
    expect(previewEnemyAttack(state())!.dodgeChance).toBe(0)
  })

  it('avisa quando o pior caso derruba o herói', () => {
    inCombat('guerreiro', { hp: 1 })
    expect(previewEnemyAttack(state())!.lethal).toBe(true)
    inCombat('guerreiro', { hp: 999 })
    expect(previewEnemyAttack(state())!.lethal).toBe(false)
  })

  it('o escudo é descontado do pior caso', () => {
    inCombat('guerreiro')
    const open = previewEnemyAttack(state())!
    inCombat('guerreiro', { shield: 2 })
    const shielded = previewEnemyAttack(state())!
    expect(shielded.max).toBe(Math.max(0, open.max - 2))
    expect(shielded.shield).toBe(2)
  })
})
