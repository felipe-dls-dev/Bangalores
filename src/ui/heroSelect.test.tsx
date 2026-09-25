import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { HEROES, HERO_CLASS_NAMES } from '../store/game'
import { HeroKitSummary } from './HeroKitSummary'
import { HeroSelectModern } from './HeroSelectModern'
import { championCardForKit } from './championCardSources'
import { stepIndex } from './heroProfiles'

const assetUrl = (path: string) => `/${path}`
const classLabel = (id: string) => HERO_CLASS_NAMES[id] ?? id
const renderSelect = () => renderToStaticMarkup(<HeroSelectModern assetUrl={assetUrl} classLabel={classLabel} onBack={() => undefined} onConfirm={() => undefined} />)
const count = (html: string, needle: RegExp) => (html.match(needle) ?? []).length

describe('seleção de herói (Moderno)', () => {
  const html = renderSelect()

  it('mostra uma Carta de Campeão com 4 atributos numéricos e Vida/Energia/Armadura do kit', () => {
    expect(count(html, /class="cc-attr /g)).toBe(4)
    expect(count(html, /class="cc-res /g)).toBe(3)
    for (const label of ['Força', 'Magia', 'Vigor', 'Destreza', 'Vida', 'Energia', 'Armadura']) expect(html).toContain(label)
  })

  it('a decisão cabe na tela: função, dificuldade, ataque básico, habilidade e recomendação para iniciantes', () => {
    expect(html).toContain('Função')
    expect(html).toContain('Dificuldade')
    expect(html).toContain('Ataque básico')
    expect(html).toContain('Boa para começar')
  })

  it('o texto longo da habilidade e o parágrafo narrativo saíram da tela (ficam em "Ver detalhes")', () => {
    for (const hero of HEROES) {
      expect(html).not.toContain(hero.habilidade)
    }
    expect(html).toContain('Ver detalhes')
    expect(html).not.toContain('LEIA ANTES')
  })

  it('a confirmação é clara e a classe permanente é avisada', () => {
    expect(html).toContain('Iniciar com Guerreiro')
    expect(html).toContain('permanente')
  })

  it('miniaturas formam um grupo de rádio com um único item na ordem de tabulação', () => {
    expect(html).toContain('role="radiogroup"')
    expect(count(html, /role="radio"/g)).toBe(HEROES.length)
    expect(count(html, /aria-checked="true"/g)).toBe(1)
    expect(count(html, /tabindex="0"/g)).toBe(1)
    expect(count(html, /tabindex="-1"/g)).toBe(HEROES.length - 1)
  })

  it('a região de detalhes anuncia a troca de herói (aria-live) e as setas têm nome acessível', () => {
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('aria-label="Herói anterior"')
    expect(html).toContain('aria-label="Próximo herói"')
    expect(html).toContain('aria-label="Voltar ao menu"')
  })

  it('a navegação por teclado dá a volta nas pontas (Home/End/setas usam stepIndex)', () => {
    expect(stepIndex(0, 1, HEROES.length)).toBe(1)
    expect(stepIndex(0, -1, HEROES.length)).toBe(HEROES.length - 1)
    expect(stepIndex(0, HEROES.length, HEROES.length)).toBe(0)
  })
})

describe('resumo do kit (seleção clássica)', () => {
  it('cada classe mostra 4 números, Vida/Energia/Armadura, assinatura e no máximo 3 etiquetas', () => {
    for (const hero of HEROES) {
      const data = championCardForKit(hero.id)!
      const html = renderToStaticMarkup(<HeroKitSummary data={data} onOpenDetails={() => undefined} />)
      expect(count(html, /<li title=/g), hero.id).toBe(4)
      expect(html, hero.id).toContain('Vida')
      expect(html, hero.id).toContain('Energia')
      expect(html, hero.id).toContain('Armadura')
      expect(html, hero.id).toContain(data.habilidade.nome)
      expect(count(html.split('Etiquetas da habilidade')[1] ?? '', /<li>/g), hero.id).toBeLessThanOrEqual(3)
      expect(html, hero.id).toContain('Dificuldade:')
      expect(html, hero.id).not.toContain(hero.habilidade)
    }
  })

  it('"Ver detalhes" só aparece quando a tela sabe abrir o diálogo, e tem nome acessível', () => {
    const data = championCardForKit('druida')!
    const withButton = renderToStaticMarkup(<HeroKitSummary data={data} onOpenDetails={vi.fn()} />)
    const without = renderToStaticMarkup(<HeroKitSummary data={data} />)
    expect(withButton).toContain('Ver detalhes')
    expect(withButton).toContain('aria-haspopup="dialog"')
    expect(withButton).toContain('aria-label="Ver detalhes de Druida')
    expect(without).not.toContain('Ver detalhes')
  })

  it('a recomendação para iniciantes aparece só nas classes marcadas', () => {
    expect(renderToStaticMarkup(<HeroKitSummary data={championCardForKit('guerreiro')!} />)).toContain('Boa para começar')
    expect(renderToStaticMarkup(<HeroKitSummary data={championCardForKit('conjurador')!} />)).not.toContain('Boa para começar')
  })
})
