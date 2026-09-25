import { describe, expect, it } from 'vitest'
import { partyReadiness, type PartyMember } from './coopBriefing'

const member = (over: Partial<PartyMember> = {}): PartyMember => ({ userId: 'a', name: 'Ana', hp: 30, maxHp: 30, ...over })

describe('prontidão do grupo antes do chefe (coop)', () => {
  it('grupo saudável: tudo certo e vida média em %', () => {
    const r = partyReadiness([member(), member({ userId: 'b', name: 'Beto', hp: 24, maxHp: 30 })])
    expect(r.averagePercent).toBe(90)
    expect(r.down).toBe(0)
    expect(r.advice.level).toBe('ok')
    expect(r.weakest?.name).toBe('Beto')
  })

  it('vida abaixo de 50%: aviso, com o nome de quem está mal', () => {
    const r = partyReadiness([member(), member({ userId: 'b', name: 'Beto', hp: 10, maxHp: 30 })])
    expect(r.advice.level).toBe('warn')
    expect(r.advice.text).toContain('Beto')
    expect(r.advice.text).toContain('33%')
  })

  it('alguém caído: pede recuperar antes de enfrentar', () => {
    const r = partyReadiness([member({ hp: 0 }), member({ userId: 'b' })])
    expect(r.down).toBe(1)
    expect(r.advice.level).toBe('stop')
    expect(r.advice.text).toMatch(/caído/)
    expect(partyReadiness([member({ hp: 0 }), member({ userId: 'b', hp: 0 })]).advice.text).toMatch(/2 membros estão caídos/)
  })

  it('alguém preso em outra atividade: bloqueia (é o que o jogo faz ao iniciar a batalha)', () => {
    const r = partyReadiness([member(), member({ userId: 'b', locked: true })])
    expect(r.locked).toBe(1)
    expect(r.advice.level).toBe('stop')
    expect(r.advice.text).toMatch(/outra atividade/)
  })

  it('vida máxima zero não quebra a conta e sala vazia é avisada', () => {
    expect(partyReadiness([member({ maxHp: 0, hp: 0 })]).bars[0].hpPercent).toBe(0)
    expect(partyReadiness([]).advice.level).toBe('stop')
    expect(partyReadiness([]).weakest).toBeUndefined()
  })

  it('a vida em % nunca passa de 100 nem fica negativa', () => {
    const r = partyReadiness([member({ hp: 99, maxHp: 30 }), member({ userId: 'b', hp: -5, maxHp: 30 })])
    expect(r.bars.map((b) => b.hpPercent)).toEqual([100, 0])
  })
})
