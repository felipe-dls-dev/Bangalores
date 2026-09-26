import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ScreenMasthead } from './ScreenMasthead'
import { SCENE_ART } from './screenIdentity'

const assetUrl = (path: string) => `/base/${path}?v=1`
const noop = () => {}

describe('cabeçalho das telas do modo Moderno', () => {
  it('título é o h1 que nomeia o cabeçalho, com contexto, números e a ação principal', () => {
    const html = renderToStaticMarkup(
      <ScreenMasthead
        id="teste-titulo"
        assetUrl={assetUrl}
        eyebrow="Oficina de Havendown"
        title="Forja"
        lead="Receitas prontas aparecem primeiro."
        stats={[{ label: 'Prontas agora', value: 2, hot: true }, { label: 'Materiais', value: 7 }]}
        action={{ label: 'Forjar receita pronta', detail: '2 receitas prontas agora', onClick: noop }}
        secondary={[{ label: 'Voltar ao mapa', onClick: noop }]}
      />,
    )
    expect(html).toContain('aria-labelledby="teste-titulo"')
    expect(html).toContain('<h1 id="teste-titulo">Forja</h1>')
    expect(html).toContain('Receitas prontas aparecem primeiro.')
    expect(html).toContain('<dt>Prontas agora</dt><dd>2</dd>')
    expect(html).toMatch(/<div class="hot"><dt>Prontas agora/)
    expect(html).toMatch(/<button type="button" class="masthead-cta">.*Forjar receita pronta.*2 receitas prontas agora/)
    expect(html).toContain('class="masthead-link"')
  })

  it('com cena: arte decorativa (sem texto alternativo), versão de celular e enquadramento por variável', () => {
    const html = renderToStaticMarkup(<ScreenMasthead assetUrl={assetUrl} art={SCENE_ART.party} eyebrow="Social" title="Cooperativo" />)
    expect(html).toContain('masthead-scene')
    expect(html).toContain('data-scene="party"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('srcSet="/base/assets/ui/menu/heroes-wallpaper-mobile.webp?v=1"')
    expect(html).toContain('src="/base/assets/ui/menu/heroes-wallpaper.webp?v=1"')
    expect(html).toContain('alt=""')
    expect(html).toContain('--scene-pos-mobile:center 16%')
  })

  it('sem cena fica compacto e sem coluna vazia quando não há números nem ações', () => {
    const html = renderToStaticMarkup(<ScreenMasthead assetUrl={assetUrl} eyebrow="Manual" title="Aprenda" />)
    expect(html).toContain('masthead-compact')
    expect(html).not.toContain('<picture')
    expect(html).not.toContain('masthead-side')
    expect(html).not.toContain('masthead-extra')
  })

  it('cartão lateral e controles extras ficam dentro do cabeçalho', () => {
    const html = renderToStaticMarkup(
      <ScreenMasthead assetUrl={assetUrl} eyebrow="Salão" title="Guilda" aside={<span>Brenna</span>}>
        <button type="button">Aventura</button>
      </ScreenMasthead>,
    )
    expect(html).toContain('<div class="masthead-aside"><span>Brenna</span></div>')
    expect(html).toContain('<div class="masthead-extra"><button type="button">Aventura</button></div>')
  })
})
