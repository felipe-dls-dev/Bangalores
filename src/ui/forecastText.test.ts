import { describe, expect, it } from 'vitest'
import type { EnemyThreatPreview, HeroAttackPreview } from '../store/combatPreview'
import { enemyForecast, heroForecast, percentLabel, rangeLabel } from './forecastText'

const hero = (over: Partial<HeroAttackPreview> = {}): HeroAttackPreview => ({ min: 2, max: 8, average: 5, critChance: 1 / 6, zeroChance: 0, staggered: false, ...over })
const enemy = (over: Partial<EnemyThreatPreview> = {}): EnemyThreatPreview => ({
  min: 0, max: 6, average: 3, critChance: 0.1, zeroChance: 0.1, dodgeChance: 0, shield: 0, lethal: false, intentLabel: 'Ataque direto', ...over,
})

describe('texto da previsão de combate', () => {
  it('faixa de dano: número único quando mínimo e máximo coincidem', () => {
    expect(rangeLabel(2, 8)).toBe('2–8')
    expect(rangeLabel(4, 4)).toBe('4')
    expect(rangeLabel(0, 0)).toBe('0')
  })

  it('porcentagem arredondada, sem esconder chance pequena porém real', () => {
    expect(percentLabel(1 / 6)).toBe('17%')
    expect(percentLabel(0)).toBe('0%')
    expect(percentLabel(0.004)).toBe('<1%')
    expect(percentLabel(1)).toBe('100%')
  })

  it('ataque do herói: média e crítico sempre, avisos só quando existem', () => {
    expect(heroForecast(hero())).toEqual({ range: '2–8', notes: ['média 5', 'crítico 17%'] })
    const rich = heroForecast(hero({ zeroChance: 0.25, elemental: 'fraqueza', staggered: true })).notes
    expect(rich).toContain('25% de não causar dano')
    expect(rich).toContain('fraqueza elemental +35%')
    expect(rich).toContain('postura quebrada +50%')
    expect(heroForecast(hero({ elemental: 'resistencia' })).notes).toContain('inimigo resiste −25%')
  })

  it('golpe do inimigo: nível de perigo conforme a vida do herói', () => {
    expect(enemyForecast(enemy({ max: 6 }), 40).level).toBe('safe')
    expect(enemyForecast(enemy({ max: 20 }), 40).level).toBe('warn')
    const lethal = enemyForecast(enemy({ max: 50, lethal: true }), 40)
    expect(lethal.level).toBe('lethal')
    expect(lethal.notes).toContain('pode derrubar você')
  })

  it('golpe do inimigo: esquiva, escudo e feras aparecem só quando valem', () => {
    expect(enemyForecast(enemy(), 40).notes).toEqual(['média 3'])
    const notes = enemyForecast(enemy({ dodgeChance: 0.2, shield: 4 }), 40, { summons: true }).notes
    expect(notes).toEqual(['média 3', 'esquiva 20%', 'escudo absorve até 4', 'feras podem interceptar'])
  })
})
