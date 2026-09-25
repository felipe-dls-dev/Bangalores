import { describe, expect, it } from 'vitest'
import { useGame } from '../store/game'
import { CAMP_QUOTES, campChapter, campQuote, continueTarget, dailyRewardState, formatCountdown, xpProgress } from './campData'

const HOUR = 3_600_000

describe('capítulo e objetivo do Acampamento', () => {
  it('lê o capítulo atual da história e o progresso do objetivo', () => {
    useGame.getState().newGame('guerreiro')
    const fresh = campChapter(useGame.getState())
    expect(fresh.title).toBe('Cinzas sobre Havendown') // prólogo
    expect(fresh.objective).toBe('Derrote 3 inimigos')
    expect(fresh).toMatchObject({ current: 0, required: 3, complete: false, act: 1 })
    expect(fresh.dialogue.length).toBeGreaterThan(20)

    useGame.setState({ victories: { campos_dourados: 5 } } as any)
    const done = campChapter(useGame.getState())
    expect(done.complete).toBe(true)
    expect(done.current).toBe(3) // não passa do necessário ("5/3" seria feio na tela)
  })

  it('cai no primeiro capítulo se o id salvo não existir mais', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ storyChapterId: 'capitulo-que-nao-existe' } as any)
    expect(campChapter(useGame.getState()).title).toBe('Cinzas sobre Havendown')
  })
})

describe('barra de experiência', () => {
  it('nível 1 começa em 0% e a porcentagem fica sempre entre 0 e 100', () => {
    expect(xpProgress(0)).toMatchObject({ level: 1, progress: 0, pct: 0 })
    for (const xp of [0, 5, 100, 5_000, 250_000, 10_000_000]) {
      const p = xpProgress(xp)
      expect(p.pct).toBeGreaterThanOrEqual(0)
      expect(p.pct).toBeLessThanOrEqual(100)
      expect(p.progress).toBeLessThan(p.next)
    }
    expect(xpProgress(250_000).level).toBeGreaterThan(xpProgress(5_000).level)
  })
})

describe('contagem regressiva', () => {
  it('formata horas e minutos, só minutos e o "quase agora"', () => {
    expect(formatCountdown(14 * HOUR + 32 * 60_000)).toBe('14h 32m')
    expect(formatCountdown(HOUR + 60_000)).toBe('1h 01m')
    expect(formatCountdown(30 * 60_000)).toBe('30m')
    expect(formatCountdown(30_000)).toBe('menos de 1 min')
    expect(formatCountdown(0)).toBe('menos de 1 min')
    expect(formatCountdown(NaN)).toBe('menos de 1 min')
  })
})

describe('provisão diária (20h de espera, igual a claimDailyReward)', () => {
  const now = Date.UTC(2026, 8, 25, 12)

  it('nunca coletada: disponível', () => {
    expect(dailyRewardState(undefined, now)).toEqual({ eligible: true, hoursLeft: 0 })
  })

  it('conta as horas que faltam, sempre arredondando para cima e nunca mostrando 0h', () => {
    expect(dailyRewardState(now - 1 * HOUR, now)).toEqual({ eligible: false, hoursLeft: 19 })
    expect(dailyRewardState(now - 19.5 * HOUR, now)).toEqual({ eligible: false, hoursLeft: 1 })
    expect(dailyRewardState(now - (20 * HOUR - 1), now).hoursLeft).toBe(1)
  })

  it('libera exatamente em 20h', () => {
    expect(dailyRewardState(now - 20 * HOUR, now).eligible).toBe(true)
  })

  it('concorda com a regra real do store', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ dailyRewardClaimedAt: undefined } as any)
    expect(dailyRewardState(useGame.getState().dailyRewardClaimedAt, Date.now()).eligible).toBe(true)
    expect(useGame.getState().claimDailyReward()).not.toBeNull()
    expect(dailyRewardState(useGame.getState().dailyRewardClaimedAt, Date.now()).eligible).toBe(false)
    expect(useGame.getState().claimDailyReward()).toBeNull() // o store também recusa
  })
})

describe('para onde "Continuar expedição" leva', () => {
  it('exploração em andamento volta para ela; senão, o mapa', () => {
    expect(continueTarget({ subregionId: 'campos_estrada' })).toBe('region')
    expect(continueTarget({})).toBe('map')
    expect(continueTarget({ subregionId: undefined })).toBe('map')
  })
})

describe('frase do dia', () => {
  it('é estável no dia, muda no dia seguinte e aguenta índices negativos ou fracionários', () => {
    expect(campQuote(20_000)).toBe(campQuote(20_000))
    expect(campQuote(20_000)).not.toBe(campQuote(20_001))
    for (const day of [-7, -1, 0, 3.9, 1e9]) expect(CAMP_QUOTES).toContain(campQuote(day) as any)
  })
})
