// Resumo do grupo antes de enfrentar um chefe no coop (modo Moderno). Funções puras sobre os vitais que o
// grupo já publica na sala (memberVitals); a tela (CoopBossBriefing.tsx) só desenha o que sai daqui.

export interface PartyMember {
  userId: string
  name: string
  hp: number
  maxHp: number
  level?: number
  /** Outro jogador que está preso numa batalha/masmorra própria e não pode entrar. */
  locked?: boolean
}

export interface PartyReadiness {
  /** Membros com a vida em % (0–100), na ordem recebida. */
  bars: Array<PartyMember & { hpPercent: number }>
  /** Vida média do grupo em %. */
  averagePercent: number
  /** Quem está com a menor vida (vivo ou não). */
  weakest?: PartyMember & { hpPercent: number }
  /** Quantos estão caídos (vida 0). */
  down: number
  /** Quantos estão presos em outra atividade. */
  locked: number
  /** Recomendação em uma frase para o líder. */
  advice: { level: 'ok' | 'warn' | 'stop'; text: string }
}

const percent = (m: PartyMember) => (m.maxHp > 0 ? Math.max(0, Math.min(100, Math.round((m.hp / m.maxHp) * 100))) : 0)

export function partyReadiness(members: readonly PartyMember[]): PartyReadiness {
  const bars = members.map((m) => ({ ...m, hpPercent: percent(m) }))
  const down = bars.filter((m) => m.hp <= 0).length
  const locked = bars.filter((m) => m.locked).length
  const averagePercent = bars.length ? Math.round(bars.reduce((sum, m) => sum + m.hpPercent, 0) / bars.length) : 0
  const weakest = bars.reduce<PartyReadiness['weakest']>((worst, m) => (!worst || m.hpPercent < worst.hpPercent ? m : worst), undefined)
  let advice: PartyReadiness['advice']
  if (!bars.length) advice = { level: 'stop', text: 'Nenhum membro na sala.' }
  else if (locked > 0) advice = { level: 'stop', text: `${locked === 1 ? 'Um membro está' : `${locked} membros estão`} em outra atividade e não pode entrar na batalha.` }
  else if (down > 0) advice = { level: 'stop', text: `${down === 1 ? 'Um membro está caído' : `${down} membros estão caídos`}: recupere a vida antes de enfrentar o chefe.` }
  else if (weakest && weakest.hpPercent < 50) advice = { level: 'warn', text: `${weakest.name} está com ${weakest.hpPercent}% da vida. Vale curar antes.` }
  else advice = { level: 'ok', text: 'Grupo com a vida em dia.' }
  return { bars, averagePercent, weakest, down, locked, advice }
}
