import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { HEROES } from '../store/game'
import { DIFFICULTY_LABEL, HERO_PROFILES, HERO_SELECT_ART, firstSentence, heroProfile, splitAbility, statBars, stepIndex } from './heroProfiles'

describe('perfis de herói (seleção Moderna)', () => {
  it('todo herói do jogo tem perfil, e o perfil não sobra sem herói', () => {
    expect(Object.keys(HERO_PROFILES).sort()).toEqual(HEROES.map((h) => h.id).sort())
  })

  it('cada perfil tem 3 marcas, uma frase de estilo e dificuldade válida', () => {
    for (const hero of HEROES) {
      const profile = heroProfile(hero.id)
      expect(profile.tags, hero.id).toHaveLength(3)
      expect(new Set(profile.tags).size, hero.id).toBe(3)
      expect(profile.playstyle.length, hero.id).toBeGreaterThan(20)
      expect(DIFFICULTY_LABEL[profile.difficulty], hero.id).toBeTruthy()
    }
  })

  it('há pelo menos um herói simples marcado para iniciantes, e nenhum exigente marcado assim', () => {
    const beginners = HEROES.filter((h) => heroProfile(h.id).beginner)
    expect(beginners.length).toBeGreaterThan(0)
    expect(beginners.every((h) => heroProfile(h.id).difficulty === 1)).toBe(true)
  })

  it('herói desconhecido cai num perfil neutro em vez de quebrar a tela', () => {
    expect(heroProfile('herói-que-não-existe').tags).toHaveLength(3)
  })

  it('as artes leves existem no disco para todos os heróis', () => {
    for (const hero of HEROES) {
      const art = HERO_SELECT_ART(hero.id)
      expect(fs.existsSync(path.resolve(__dirname, '../../public', art.figure)), art.figure).toBe(true)
      expect(fs.existsSync(path.resolve(__dirname, '../../public', art.thumb)), art.thumb).toBe(true)
    }
  })
})

describe('splitAbility', () => {
  it('separa passivo e ativo', () => {
    expect(splitAbility('Passivo: 20% de chance de desviar. Ativo: pode atacar duas vezes.')).toEqual({
      passive: '20% de chance de desviar.',
      active: 'Pode atacar duas vezes.',
    })
  })

  it('aceita só ativo, com travessão no lugar dos dois-pontos', () => {
    expect(splitAbility('Ativo — Provocar: inimigos atacam o Guardião.')).toEqual({ passive: undefined, active: 'Provocar: inimigos atacam o Guardião.' })
  })

  it('texto sem rótulo vira ativo', () => {
    expect(splitAbility('Faz algo útil.')).toEqual({ active: 'Faz algo útil.' })
  })

  it('não confunde a palavra "ativo" no meio do texto com o rótulo', () => {
    const parts = splitAbility('Passivo: renova o sangramento ativo do inimigo. Ativo: bate forte.')
    expect(parts.passive).toBe('Renova o sangramento ativo do inimigo.')
    expect(parts.active).toBe('Bate forte.')
  })

  it('funciona com o texto real de todos os heróis (ao menos uma das partes, sem rótulo sobrando)', () => {
    for (const hero of HEROES) {
      const { passive, active } = splitAbility(hero.habilidade)
      expect(passive || active, hero.id).toBeTruthy()
      for (const part of [passive, active]) {
        if (part) expect(part, hero.id).not.toMatch(/^(Passivo|Ativo)/)
      }
    }
  })
})

describe('firstSentence', () => {
  it('devolve só a primeira frase', () => {
    expect(firstSentence('Primeira frase. Segunda frase.')).toBe('Primeira frase.')
  })

  it('corta frases longas com reticências, sem passar do limite', () => {
    const cut = firstSentence('a'.repeat(300) + '.', 100)
    expect(cut.length).toBeLessThanOrEqual(100)
    expect(cut.endsWith('…')).toBe(true)
  })

  it('não quebra em "%" nem em números', () => {
    expect(firstSentence('+10% de Ataque e Defesa base. Depois.')).toBe('+10% de Ataque e Defesa base.')
  })
})

describe('statBars', () => {
  it('compara cada atributo com o maior entre todos os heróis', () => {
    const all = [
      { vida: 20, ataque: 2, defesa: 6 },
      { vida: 10, ataque: 6, defesa: 3 },
    ]
    const bars = statBars(all[1], all)
    expect(bars.map((b) => [b.id, b.value, b.percent])).toEqual([
      ['vida', 10, 50],
      ['ataque', 6, 100],
      ['defesa', 3, 50],
    ])
  })

  it('tolera defesa ausente e nunca devolve barra invisível', () => {
    const bars = statBars({ vida: 1, ataque: 1 }, [{ vida: 100, ataque: 100, defesa: 100 }])
    expect(bars.find((b) => b.id === 'defesa')?.value).toBe(0)
    expect(bars.every((b) => b.percent >= 6 && b.percent <= 100)).toBe(true)
  })

  it('usa os números reais: o Guardião tem a maior defesa, o Mago o maior ataque', () => {
    const percent = (id: string, stat: 'defesa' | 'ataque') => statBars(HEROES.find((h) => h.id === id)!, HEROES).find((b) => b.id === stat)!.percent
    expect(percent('guardiao', 'defesa')).toBe(100)
    expect(percent('arcanista', 'ataque')).toBe(100)
  })
})

describe('stepIndex', () => {
  it('avança e volta dando a volta nas pontas', () => {
    expect(stepIndex(0, 1, 9)).toBe(1)
    expect(stepIndex(8, 1, 9)).toBe(0)
    expect(stepIndex(0, -1, 9)).toBe(8)
    expect(stepIndex(3, 0, 9)).toBe(3)
    expect(stepIndex(0, 5, 0)).toBe(0)
  })
})
