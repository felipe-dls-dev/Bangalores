import { describe, expect, it } from 'vitest'
import { CRYSTAL_NAME, CRYSTAL_NAME_SINGULAR, CRYSTAL_REWARDS, crystalsLabel } from '../data/crystals'
import { activeChallenges, msUntilChallengeReset } from '../data/expansion'
import { useGame } from './game'

const state = () => useGame.getState()
const BRT = 180 // Date#getTimezoneOffset de Brasília (UTC-3): 180 minutos a oeste de UTC

describe('Cristais de Éter: nome e valores', () => {
  it('não usa "gemas" (a Forja já usa esse nome) e concorda no singular/plural', () => {
    expect(CRYSTAL_NAME.toLowerCase()).not.toContain('gema')
    expect(crystalsLabel(1)).toBe(`1 ${CRYSTAL_NAME_SINGULAR}`)
    expect(crystalsLabel(5)).toBe(`5 ${CRYSTAL_NAME}`)
  })

  it('cada desafio paga cristais: semanal mais que diário', () => {
    const [a, b, weekly] = activeChallenges(Date.UTC(2026, 8, 24, 15), BRT)
    expect(a.crystals).toBe(CRYSTAL_REWARDS.dailyChallenge)
    expect(b.crystals).toBe(CRYSTAL_REWARDS.dailyChallenge)
    expect(weekly.crystals).toBe(CRYSTAL_REWARDS.weeklyChallenge)
    expect(weekly.crystals).toBeGreaterThan(a.crystals)
  })
})

describe('desafios no dia LOCAL (antes viravam à meia-noite UTC = 21h em Brasília)', () => {
  const idOf = (utcMs: number, tz: number) => activeChallenges(utcMs, tz)[0].id

  it('às 22h de Brasília ainda é o mesmo dia; só vira à meia-noite local', () => {
    const noon = Date.UTC(2026, 8, 24, 15, 0) // 12:00 em Brasília, 24/09
    const at22h = Date.UTC(2026, 8, 25, 1, 0) // 22:00 em Brasília, 24/09 (já é 25/09 em UTC)
    const at2359 = Date.UTC(2026, 8, 25, 2, 59) // 23:59 em Brasília
    const midnight = Date.UTC(2026, 8, 25, 3, 0) // 00:00 em Brasília, 25/09
    expect(idOf(at22h, BRT)).toBe(idOf(noon, BRT))
    expect(idOf(at2359, BRT)).toBe(idOf(noon, BRT))
    expect(idOf(midnight, BRT)).not.toBe(idOf(noon, BRT))
    // o comportamento antigo (UTC) teria trocado às 21h locais, que é o que este teste barra:
    expect(idOf(at22h, 0)).not.toBe(idOf(noon, 0))
  })

  it('a contagem até o reinício bate com a meia-noite local', () => {
    const at2330 = Date.UTC(2026, 8, 25, 2, 30) // 23:30 em Brasília
    expect(msUntilChallengeReset(at2330, BRT)).toBe(30 * 60 * 1000)
    const midnight = Date.UTC(2026, 8, 25, 3, 0)
    expect(msUntilChallengeReset(midnight, BRT)).toBe(24 * 60 * 60 * 1000)
    // sempre entre 1 ms e 24 h, em qualquer fuso
    for (const tz of [-540, -60, 0, 180, 300, 720]) {
      const ms = msUntilChallengeReset(Date.UTC(2026, 8, 25, 13, 37), tz)
      expect(ms).toBeGreaterThan(0)
      expect(ms).toBeLessThanOrEqual(24 * 60 * 60 * 1000)
    }
  })

  it('o desafio semanal vira na segunda-feira (antes virava na quinta)', () => {
    const weeklyId = (utcMs: number) => activeChallenges(utcMs, 0)[2].id
    const sunday = Date.UTC(2026, 8, 27, 23, 59)
    const monday = Date.UTC(2026, 8, 28, 0, 1)
    const nextSunday = Date.UTC(2026, 9, 4, 23, 59)
    expect(new Date(monday).getUTCDay()).toBe(1) // sanidade: 28/09/2026 é segunda
    expect(weeklyId(monday)).not.toBe(weeklyId(sunday))
    expect(weeklyId(nextSunday)).toBe(weeklyId(monday)) // segunda a domingo é a mesma semana
    expect(weeklyId(Date.UTC(2026, 8, 24, 12))).toBe(weeklyId(sunday)) // quinta e domingo: mesma semana
  })
})

describe('Cristais de Éter no jogo', () => {
  it('claimChallenge paga ouro E cristais, uma vez só', () => {
    useGame.getState().newGame('guerreiro')
    const challenge = activeChallenges().find((c) => c.kind === 'weekly')!
    useGame.setState({ gold: 0, crystals: 0, challengeProgress: { [challenge.id]: challenge.target }, challengeClaimed: {} } as any)
    const result = state().claimChallenge(challenge.id)
    expect(result).toMatchObject({ gold: challenge.reward, crystals: CRYSTAL_REWARDS.weeklyChallenge })
    expect(result!.message).toContain('Cristais de Éter')
    expect(state().crystals).toBe(CRYSTAL_REWARDS.weeklyChallenge)
    expect(state().gold).toBe(challenge.reward)
    expect(state().claimChallenge(challenge.id)).toBeNull() // não paga de novo
    expect(state().crystals).toBe(CRYSTAL_REWARDS.weeklyChallenge)
  })

  it('não paga sem terminar o desafio', () => {
    useGame.getState().newGame('guerreiro')
    const challenge = activeChallenges()[0]
    useGame.setState({ crystals: 0, challengeProgress: { [challenge.id]: challenge.target - 1 }, challengeClaimed: {} } as any)
    expect(state().claimChallenge(challenge.id)).toBeNull()
    expect(state().crystals).toBe(0)
  })

  it('concluir um capítulo da história rende cristais', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ crystals: 0, victories: { campos_dourados: 5 } } as any) // requisito do prólogo: 3 vitórias
    state().chooseStory('juramento')
    expect(state().crystals).toBe(CRYSTAL_REWARDS.storyChapter)
    expect(state().storyNotice).toContain('Cristais de Éter')
  })

  it('grantCrystals soma números válidos e ignora lixo', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ crystals: 10 } as any)
    state().grantCrystals(5)
    expect(state().crystals).toBe(15)
    state().grantCrystals(2.9)
    expect(state().crystals).toBe(17) // fração é descartada
    for (const bad of [0, -5, NaN, Infinity]) state().grantCrystals(bad)
    expect(state().crystals).toBe(17)
  })
})

describe('Cristais de Éter entre campanhas', () => {
  it('novo jogo começa zerado, mesmo depois de um personagem que tinha cristais', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ crystals: 250 } as any)
    useGame.getState().newGame('arcanista')
    expect(state().crystals).toBe(0)
  })

  it('carregar uma campanha ANTIGA (sem o campo) não herda os cristais de outra', () => {
    useGame.getState().newGame('guerreiro')
    const legacyId = state().activeCampaignId!
    useGame.getState().newGame('arcanista')
    const legacy: any = { ...state().campaigns[legacyId] }
    delete legacy.crystals
    useGame.setState({ campaigns: { ...state().campaigns, [legacyId]: legacy } } as any)
    useGame.setState({ crystals: 999 } as any) // saldo de OUTRA campanha em memória
    useGame.getState().loadCampaign(legacyId)
    expect(state().crystals).toBe(0)
  })

  it('o saldo entra no snapshot da campanha (salvo local e na nuvem)', () => {
    useGame.getState().newGame('guerreiro')
    const campaignId = state().activeCampaignId!
    useGame.setState({ crystals: 42 } as any)
    useGame.getState().newGame('arcanista')
    expect((state().campaigns[campaignId] as any).crystals).toBe(42)
  })
})
