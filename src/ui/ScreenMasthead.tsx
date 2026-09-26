import React from 'react'
import { ChevronRight } from 'lucide-react'
import type { SceneArt } from './screenIdentity'

export interface MastheadStat {
  label: string
  value: React.ReactNode
  /** Destaque para um número que pede atenção (pontos parados, contratos prontos). */
  hot?: boolean
}

export interface MastheadAction {
  label: string
  /** Linha pequena abaixo do rótulo (o destino ou o motivo). */
  detail?: string
  icon?: React.ReactNode
  onClick: () => void
  disabled?: boolean
  title?: string
}

export interface ScreenMastheadProps {
  eyebrow: string
  title: string
  /** Contexto em uma frase, sempre com dados reais da campanha. */
  lead?: React.ReactNode
  /** Cena panorâmica. Sem ela o cabeçalho fica compacto, só com o céu e a brasa ao fundo. */
  art?: SceneArt
  assetUrl: (path: string) => string
  stats?: MastheadStat[]
  /** A ação principal da tela (o botão em destaque, como "Continuar expedição" no Acampamento). */
  action?: MastheadAction
  secondary?: MastheadAction[]
  /** Cartão ao lado do texto (o NPC do balcão, por exemplo). */
  aside?: React.ReactNode
  /** Controles extras abaixo do cabeçalho, dentro dele (seletor de dificuldade, barra de progresso). */
  children?: React.ReactNode
  id?: string
  className?: string
}

function SceneImage({ art, assetUrl }: { art: SceneArt; assetUrl: (path: string) => string }) {
  const [failed, setFailed] = React.useState(false)
  if (failed) return null
  const style = {
    '--scene-pos': art.position,
    '--scene-pos-mobile': art.mobilePosition,
  } as React.CSSProperties
  return (
    <picture className="masthead-art" aria-hidden="true" style={style}>
      <source media="(max-width: 760px)" srcSet={assetUrl(art.mobileSrc ?? art.src)} />
      <img src={assetUrl(art.src)} alt="" decoding="async" onError={() => setFailed(true)} />
    </picture>
  )
}

// Cabeçalho das telas do modo Moderno, na linguagem do Acampamento de Expedição: cena à direita (ou faixa no
// topo no celular) com área escura livre para o texto, título editorial, contexto real, poucos números e UMA
// ação principal evidente. Quem decide o conteúdo é a tela; aqui só existe a forma.
export function ScreenMasthead({
  eyebrow,
  title,
  lead,
  art,
  assetUrl,
  stats,
  action,
  secondary,
  aside,
  children,
  id,
  className = '',
}: ScreenMastheadProps) {
  const reactId = React.useId()
  const titleId = id ?? `masthead-${reactId.replace(/[^a-zA-Z0-9_-]/g, '')}`
  const hasActions = Boolean(action || secondary?.length)
  const hasStats = Boolean(stats && stats.length > 0)
  return (
    <header
      className={`masthead ${art ? 'masthead-scene' : 'masthead-compact'} ${className}`.trim()}
      data-scene={art?.scene}
      aria-labelledby={titleId}
    >
      {art && <SceneImage art={art} assetUrl={assetUrl} />}
      <div className="masthead-body">
        <div className="masthead-copy">
          <span className="masthead-eyebrow">{eyebrow}</span>
          <h1 id={titleId}>{title}</h1>
          {lead && <p className="masthead-lead">{lead}</p>}
        </div>
        {(hasStats || hasActions) && (
          <div className="masthead-side">
            {stats && hasStats && (
              <dl className="masthead-stats">
                {stats.map((stat) => (
                  <div key={stat.label} className={stat.hot ? 'hot' : undefined}>
                    <dt>{stat.label}</dt>
                    <dd>{stat.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {hasActions && (
              <div className="masthead-actions">
                {action && (
                  <button
                    type="button"
                    className="masthead-cta"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    title={action.title}
                  >
                    {action.icon}
                    <span>
                      <strong>{action.label}</strong>
                      {action.detail && <small>{action.detail}</small>}
                    </span>
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                )}
                {secondary?.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="masthead-link"
                    onClick={item.onClick}
                    disabled={item.disabled}
                    title={item.title}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {aside && <div className="masthead-aside">{aside}</div>}
      </div>
      {children && <div className="masthead-extra">{children}</div>}
    </header>
  )
}
