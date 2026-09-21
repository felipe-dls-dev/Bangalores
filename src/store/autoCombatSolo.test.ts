import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGame, EQUIPMENT, maxHp, runAutoCombatTurn } from './game'

// Regressões do AUTO-combate solo. Cada teste cobre um jeito de o auto ficar parado (nenhuma ação
// nem timer pendente) ou de agir duas vezes no mesmo turno -- ver comentários em game.ts.
const enemy = { id: 'x', nome: 'Inimigo de Teste', vida: 999, ataque: 3, dificuldade: 2, ouro: 5, habilidade: '' } as any

function startSoloCombat(heroId: string, patch: Record<string, unknown> = {}) {
  useGame.getState().newGame(heroId as any)
  useGame.setState({
    screen: 'combat', enemy, enemyHp: 999, hp: maxHp(useGame.getState()), playerTurn: true, animating: false,
    autoCombat: true, combatSpeed: 3, heroSkillCooldown: 0, itemSkillUsed: false, fervor: 0, combatMinions: [],
    ultimateGauge: 0, combatTurn: 1, heroSkillUses: 0, extraHeroAttacks: 0, classBuffTurns: 0, combatLog: [],
    inventory: {}, equipped: {}, ...patch,
  } as any)
}
const auto = () => runAutoCombatTurn(useGame.setState, useGame.getState)
const state = () => useGame.getState()

describe('auto-combate solo', () => {
  let randomSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    vi.useFakeTimers()
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5)
  })
  afterEach(() => {
    randomSpy.mockRestore()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('não tenta reusar a cura de item já gasta neste combate -- ataca em vez de travar', () => {
    const heal = EQUIPMENT.find(e => e.activeEffect?.type === 'heal' && e.slot !== 'bolsa')!
    startSoloCombat('guerreiro', { hp: 4, itemSkillUsed: true, heroSkillCooldown: 2, equipped: { [heal.slot]: heal.id } })
    auto()
    expect(state().animating).toBe(true)
  })

  it('não tenta reusar a habilidade ofensiva de item já gasta -- ataca em vez de travar', () => {
    const blade = EQUIPMENT.find(e => e.activeEffect?.type === 'attack' && e.slot !== 'bolsa')!
    startSoloCombat('guerreiro', { itemSkillUsed: true, heroSkillCooldown: 2, equipped: { [blade.slot]: blade.id } })
    auto()
    expect(state().animating).toBe(true)
  })

  it('Caçadora: Ataque Duplo não gasta o turno, então o auto precisa continuar e atacar', () => {
    startSoloCombat('cacadora')
    auto()
    expect(state().extraHeroAttacks).toBe(1)
    expect(state().animating).toBe(false) // habilidade lançada, turno ainda é dela
    vi.advanceTimersByTime(300)
    expect(state().animating).toBe(true) // e o auto reagendou o ataque sozinho
  })

  it('Sacerdotisa: depois que a Bênção da Vida salva de uma derrota, o auto volta a agir', () => {
    startSoloCombat('sacerdotisa', {
      hp: 1, lifeWardActive: true, heroSkillCooldown: 2, heroStatus: { poison: { amount: 5, turns: 3 } },
    })
    auto() // ataca; ao fim do turno o veneno derruba a vida a 0 e a Bênção da Vida revive
    vi.advanceTimersByTime(1600)
    expect(state().combatLog.some(l => l.includes('Bênção da Vida protege'))).toBe(true)
    expect(state().screen).toBe('combat')
    expect(state().animating).toBe(false)
    vi.advanceTimersByTime(400)
    expect(state().animating).toBe(true) // o auto retomou e atacou
  })

  it('o watchdog de um turno antigo não interrompe o golpe do herói no turno seguinte', () => {
    startSoloCombat('guerreiro', { combatSpeed: 1 })
    auto()
    // 8 turnos completos em velocidade normal: antes, o timer de "recuperação" do turno N disparava
    // no meio do ataque do turno N+1 e o auto agendava uma segunda ação por cima da primeira.
    for (let elapsed = 0; elapsed < 40_000; elapsed += 100) {
      vi.advanceTimersByTime(100)
      expect(state().combatLog.some(l => l.includes('Fluxo do combate recuperado'))).toBe(false)
    }
    expect(state().screen).toBe('combat')
    expect(state().combatTurn).toBeGreaterThanOrEqual(6) // e o combate continuou avançando
  })

  describe('Conjurador', () => {
    it('conjura as duas feras (arcana e atacante) e depois passa a atacar', () => {
      startSoloCombat('conjurador')
      auto()
      expect(state().summons?.map(fera => fera.tipo)).toEqual(['arcano'])
      useGame.setState({ playerTurn: true, animating: false } as any)
      auto()
      expect(state().summons?.map(fera => fera.tipo)).toEqual(['arcano', 'atacante'])
      useGame.setState({ playerTurn: true, animating: false } as any)
      auto()
      expect(state().heroSkillUses).toBe(2) // limite de conjurações atingido
      expect(state().animating).toBe(true) // agora só ataca
    })

    it('com a vida baixa começa pela fera defensora', () => {
      startSoloCombat('conjurador', { hp: 5 })
      auto()
      expect(state().summons?.[0]?.tipo).toBe('defensor')
    })
  })
})
