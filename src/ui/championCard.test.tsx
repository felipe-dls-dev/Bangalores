import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HEROES, RARITY_LABEL, championStats, heroPreviewState, useGame } from '../store/game'
import { ChampionCard } from './ChampionCard'
import { MAX_CARD_TAGS, bonusLabel, bonusSpeech, buildChampionCard, formatNumber, type ChampionCardData } from './championCardData'
import { championCardForActiveHero, championCardForKit } from './championCardSources'

const assetUrl = (path: string) => `/${path}`
const render = (data: ChampionCardData) => renderToStaticMarkup(<ChampionCard data={data} assetUrl={assetUrl} />)

const sample = (): ChampionCardData => championCardForKit('guerreiro')!

describe('dados da Carta de Campeão', () => {
  it('os números da carta são os do cálculo real, para as nove classes', () => {
    for (const hero of HEROES) {
      const card = championCardForKit(hero.id)!
      const stats = championStats(heroPreviewState(hero.id))
      expect(card.atributos.map((a) => a.valor + a.bonus), hero.id).toEqual([stats.forca, stats.magia, stats.vigor, stats.destreza])
      expect(card.vida.max, hero.id).toBe(stats.vidaMaxima)
      expect(card.energia.max, hero.id).toBe(stats.energiaMaxima)
      expect(card.armadura.valor, hero.id).toBe(stats.armadura)
      expect(card.poder, hero.id).toBe(stats.poder)
      expect(card.habilidade.tags.length, hero.id).toBeLessThanOrEqual(MAX_CARD_TAGS)
      expect(card.classe.length, hero.id).toBeGreaterThan(0)
    }
  })

  it('quatro atributos, na ordem Força, Magia, Vigor, Destreza', () => {
    expect(sample().atributos.map((a) => a.label)).toEqual(['Força', 'Magia', 'Vigor', 'Destreza'])
  })

  it('a carta do herói ativo mostra a Vida atual (não a máxima) e Energia cheia fora de combate', () => {
    useGame.getState().newGame('arcanista')
    useGame.setState({ hp: 3 } as never)
    const card = championCardForActiveHero(useGame.getState())!
    expect(card.vida.atual).toBe(3)
    expect(card.energia.atual).toBe(card.energia.max)
  })

  it('Vida e Energia atuais nunca passam do máximo nem ficam negativas', () => {
    const stats = championStats(heroPreviewState('guerreiro'))
    const base = { hero: HEROES[0], classLabel: 'X', stats, level: 1, art: 'a.webp', rarityLabel: (r: keyof typeof RARITY_LABEL) => RARITY_LABEL[r] }
    const over = buildChampionCard({ ...base, hp: 9999, energy: 9999 })
    expect(over.vida.atual).toBe(stats.vidaMaxima)
    expect(over.energia.atual).toBe(stats.energiaMaxima)
    const under = buildChampionCard({ ...base, hp: -5, energy: -1 })
    expect(under.vida.atual).toBe(0)
    expect(under.energia.atual).toBe(0)
  })
})

describe('formatação de números e bônus', () => {
  it('milhares com ponto e valores muito altos sem quebrar', () => {
    expect(formatNumber(1842)).toBe('1.842')
    expect(formatNumber(1234567)).toBe('1.234.567')
    expect(formatNumber(NaN)).toBe('0')
  })

  it('bônus com sinal explícito: positivo, zero e negativo com sinal de menos de verdade', () => {
    expect(bonusLabel(12)).toBe('+12')
    expect(bonusLabel(0)).toBe('+0')
    expect(bonusLabel(-3)).toBe('−3')
    expect(bonusLabel(undefined)).toBe('—')
    expect(bonusLabel(12345)).toBe('+12.345')
  })

  it('leitura falada do bônus não depende de cor nem de símbolo', () => {
    expect(bonusSpeech('Força', 12)).toBe('Força: bônus de mais 12')
    expect(bonusSpeech('Força', -2)).toBe('Força: penalidade de menos 2')
    expect(bonusSpeech('Força', 0)).toBe('Força: nenhum bônus')
    expect(bonusSpeech('Força', undefined)).toBe('Força: sem bônus informado')
  })
})

describe('renderização da Carta de Campeão', () => {
  it('mostra raridade, classe, função, nível, poder, os quatro atributos e os recursos', () => {
    const html = render(sample())
    expect(html).toContain('cc-r-heroico')
    expect(html).toContain('Guerreiro')
    expect(html).toContain('Linha de frente')
    for (const label of ['Força', 'Magia', 'Vigor', 'Destreza', 'Vida', 'Energia', 'Armadura']) expect(html).toContain(label)
    expect(html).toMatch(/aria-label="Carta de Campeão: Guerreiro, nível 1, poder [\d.]+"/)
  })

  it('valores de quatro dígitos ou mais aparecem formatados', () => {
    const data = { ...sample(), poder: 1842, nivel: 1234, atributos: sample().atributos.map((a) => ({ ...a, valor: 9876, bonus: 1234 })), vida: { atual: 12345, max: 23456 } }
    const html = render(data)
    for (const text of ['1.842', '1.234', '9.876', '+1.234', '12.345', '23.456']) expect(html).toContain(text)
  })

  it('bônus ausente vira traço, sem quebrar a carta', () => {
    const data = { ...sample(), atributos: sample().atributos.map((a) => ({ ...a, bonus: undefined as unknown as number })) }
    const html = render(data)
    expect(html).toContain('cc-bonus-none')
    expect(html).toContain('—')
    expect(html).not.toContain('NaN')
    expect(html).not.toContain('undefined')
  })

  it('bônus negativo mostra o sinal e a seta, além da cor', () => {
    const attrs = sample().atributos.map((a, i) => (i === 0 ? { ...a, bonus: -4 } : a))
    const html = render({ ...sample(), atributos: attrs })
    expect(html).toContain('cc-bonus-down')
    expect(html).toContain('−4')
    expect(html).toContain('▼')
    expect(html).toContain('penalidade de menos 4')
  })

  it('nome e habilidade muito longos ficam inteiros no HTML (o CSS corta), com dica do texto completo', () => {
    const longName = 'Legionário do Pico de Ignaris, Senhor das Cinzas Eternas e Guardião dos Portões Cinzentos'
    const longAbility = 'Conjurar Fera Espectral Ancestral das Profundezas do Abismo Estrelado'
    const data = { ...sample(), nome: longName, habilidade: { ...sample().habilidade, nome: longAbility } }
    const html = render(data)
    expect(html).toContain(`title="${longName}"`)
    expect(html).toContain(`title="${longAbility}"`)
    expect(html).toContain(longAbility)
  })

  it('no máximo três etiquetas na assinatura para qualquer classe', () => {
    for (const hero of HEROES) expect(championCardForKit(hero.id)!.habilidade.tags.length, hero.id).toBeLessThanOrEqual(3)
    expect(render(sample())).toContain('cc-tags')
  })

  it('a Armadura indica a origem em itens (e "Sem itens" quando não há nenhuma)', () => {
    expect(render(sample())).toContain('Itens')
    expect(render({ ...sample(), armadura: { valor: 0, origem: 'Sem itens' } })).toContain('Sem itens')
  })

  it('ícones são decorativos (aria-hidden) e cada atributo tem rótulo visível', () => {
    const html = render(sample())
    expect(html).not.toMatch(/<svg(?![^>]*aria-hidden)/)
    expect(html).toContain('cc-attr-label')
  })

  it('não há cristais, losangos, pips nem texto narrativo na carta', () => {
    const html = render(sample())
    expect(html).not.toMatch(/pip|diamond|cristal|hs-diamonds/i)
    expect(html).not.toContain(sample().habilidade.textoCompleto.slice(0, 40)) // o texto completo só aparece no detalhe
  })

  it('a moldura muda com a raridade e não com os valores', () => {
    const a = render({ ...sample(), raridade: 'raro', raridadeRotulo: 'Raro' })
    const b = render({ ...sample(), raridade: 'raro', raridadeRotulo: 'Raro', atributos: sample().atributos.map((x) => ({ ...x, valor: 999999 })) })
    const frame = (html: string) => html.match(/class="cc cc-r-\w+"/)![0]
    expect(frame(a)).toBe(frame(b))
    expect(frame(a)).toContain('cc-r-raro')
    expect(frame(render(sample()))).not.toBe(frame(a))
  })

  it('o botão de detalhes abre um diálogo acessível e pode ser escondido', () => {
    const html = render(sample())
    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).toContain('aria-label="Ver habilidade Ímpeto Marcial')
    expect(renderToStaticMarkup(<ChampionCard data={sample()} assetUrl={assetUrl} hideDetailsButton />)).not.toContain('cc-details-btn')
  })
})
