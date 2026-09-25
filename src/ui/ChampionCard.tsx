import React from 'react'
import { createPortal } from 'react-dom'
import { BookOpen, Heart, HeartPulse, Info, ShieldHalf, Sparkles, Swords, Wind, X, Zap } from 'lucide-react'
import { ATTRIBUTE_RULES, type PrimaryAttributeKey } from '../data/heroStatProfiles'
import { bonusLabel, bonusSpeech, formatNumber, percentText, type ChampionCardData } from './championCardData'

const ATTRIBUTE_ICON: Record<PrimaryAttributeKey, React.ReactNode> = {
  forca: <Swords aria-hidden focusable="false" />,
  magia: <BookOpen aria-hidden focusable="false" />,
  vigor: <HeartPulse aria-hidden focusable="false" />,
  destreza: <Wind aria-hidden focusable="false" />,
}

export interface ChampionCardProps {
  data: ChampionCardData
  /** Resolve um caminho de asset (com a revisão de cache do jogo). */
  assetUrl: (path: string) => string
  className?: string
  /** Esconde o botão "Ver habilidade" (quando a tela oferece o próprio botão de detalhes). */
  hideDetailsButton?: boolean
  /** Abre o detalhe por fora (a tela controla o diálogo). Se ausente, a carta abre o próprio. */
  onOpenDetails?: () => void
}

function BonusChip({ label, bonus }: { label: string; bonus: number | undefined }) {
  const tone = bonus === undefined ? 'none' : bonus > 0 ? 'up' : bonus < 0 ? 'down' : 'zero'
  return (
    <span className={`cc-bonus cc-bonus-${tone}`} aria-label={bonusSpeech(label, bonus)}>
      <span aria-hidden>{tone === 'up' ? '▲' : tone === 'down' ? '▼' : ''}</span>
      {bonusLabel(bonus)}
    </span>
  )
}

// Carta de Campeão: arte dominante, quatro módulos de atributo (valor + bônus separados), recursos, Armadura com
// a origem indicada e a habilidade-assinatura com até três etiquetas. Nenhum texto narrativo na carta: o texto
// completo da habilidade abre num diálogo acessível. A moldura muda com a RARIDADE, nunca com os valores.
export function ChampionCard({ data, assetUrl, className, hideDetailsButton, onOpenDetails }: ChampionCardProps) {
  const [open, setOpen] = React.useState(false)
  const opener = React.useRef<HTMLButtonElement>(null)
  const [artFailed, setArtFailed] = React.useState(false)
  const openDetails = () => (onOpenDetails ? onOpenDetails() : setOpen(true))
  const closeDetails = () => {
    setOpen(false)
    opener.current?.focus()
  }
  const lifePercent = data.vida.max > 0 ? Math.round((data.vida.atual / data.vida.max) * 100) : 0
  const energyPercent = data.energia.max > 0 ? Math.round((data.energia.atual / data.energia.max) * 100) : 0

  return (
    <article className={`cc cc-r-${data.raridade}${className ? ` ${className}` : ''}`} aria-label={`Carta de Campeão: ${data.classe}, nível ${data.nivel}, poder ${formatNumber(data.poder)}`}>
      <span className="cc-rarity">{data.raridadeRotulo}</span>
      <header className="cc-title">
        <h3 title={data.nome}>{data.classe}</h3>
        <p className="cc-role">{data.funcao}</p>
      </header>
      <div className="cc-meta">
        <span>
          <small>Nível</small>
          <strong>{formatNumber(data.nivel)}</strong>
        </span>
        <span>
          <small>Poder</small>
          <strong>{formatNumber(data.poder)}</strong>
        </span>
      </div>
      <figure className="cc-art">{!artFailed && <img src={assetUrl(data.arte)} alt={`${data.classe}: ${data.nome}`} onError={() => setArtFailed(true)} />}</figure>

      <ul className="cc-attrs" aria-label="Atributos">
        {data.atributos.map((attr) => (
          <li key={attr.key} className={`cc-attr cc-attr-${attr.key}`} title={attr.dica}>
            <span className="cc-attr-head">
              <span className="cc-icon">{ATTRIBUTE_ICON[attr.key]}</span>
              <span className="cc-attr-label">{attr.label}</span>
            </span>
            <span className="cc-attr-body">
              <strong className="cc-attr-value">{formatNumber(attr.valor)}</strong>
              <BonusChip label={attr.label} bonus={attr.bonus} />
            </span>
          </li>
        ))}
      </ul>

      <ul className="cc-resources" aria-label="Recursos">
        <li className="cc-res cc-res-life" title="Vida atual e máxima">
          <span className="cc-icon">
            <Heart aria-hidden focusable="false" />
          </span>
          <span className="cc-res-text">
            <small>Vida</small>
            <strong>
              {formatNumber(data.vida.atual)}
              <span className="cc-res-max"> / {formatNumber(data.vida.max)}</span>
            </strong>
          </span>
          <i className="cc-meter" role="img" aria-label={`Vida em ${lifePercent}%`}>
            <b style={{ width: `${lifePercent}%` }} />
          </i>
        </li>
        <li className="cc-res cc-res-energy" title="Energia atual e máxima: as habilidades ativas gastam Energia">
          <span className="cc-icon">
            <Zap aria-hidden focusable="false" />
          </span>
          <span className="cc-res-text">
            <small>Energia</small>
            <strong>
              {formatNumber(data.energia.atual)}
              <span className="cc-res-max"> / {formatNumber(data.energia.max)}</span>
            </strong>
          </span>
          <i className="cc-meter" role="img" aria-label={`Energia em ${energyPercent}%`}>
            <b style={{ width: `${energyPercent}%` }} />
          </i>
        </li>
        <li className="cc-res cc-res-armor" title="Armadura: vem só de equipamentos e gemas. Reduz o dano físico, com retorno decrescente.">
          <span className="cc-icon">
            <ShieldHalf aria-hidden focusable="false" />
          </span>
          <span className="cc-res-text">
            <small>Armadura</small>
            <strong>{formatNumber(data.armadura.valor)}</strong>
          </span>
          <em className="cc-origin" aria-label={`Origem da Armadura: ${data.armadura.origem}`}>
            {data.armadura.origem}
          </em>
        </li>
      </ul>

      <section className="cc-signature" aria-label={`Habilidade assinatura: ${data.habilidade.nome}`}>
        <span className="cc-sig-icon" aria-hidden>
          <Sparkles aria-hidden focusable="false" />
        </span>
        <div className="cc-sig-body">
          <strong className="cc-sig-name" title={data.habilidade.nome}>
            {data.habilidade.nome}
          </strong>
          <ul className="cc-tags" aria-label="Etiquetas da habilidade">
            {data.habilidade.tags.map((tag) => (
              <li key={tag} title={tag}>
                {tag}
              </li>
            ))}
          </ul>
        </div>
        {!hideDetailsButton && (
          <button ref={opener} type="button" className="cc-details-btn" aria-haspopup="dialog" aria-label={`Ver habilidade ${data.habilidade.nome} e detalhes de ${data.classe}`} onClick={openDetails}>
            <Info aria-hidden focusable="false" />
            <span>Ver</span>
          </button>
        )}
      </section>

      {open && <ChampionDetailsDialog data={data} onClose={closeDetails} />}
    </article>
  )
}

/** Detalhe da carta: texto completo da habilidade, o que cada atributo faz e os números derivados. */
export function ChampionDetailsDialog({ data, onClose }: { data: ChampionCardData; onClose: () => void }) {
  const closeRef = React.useRef<HTMLButtonElement>(null)
  const boxRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !boxRef.current) return
      const items = [...boxRef.current.querySelectorAll<HTMLElement>('button,[href],[tabindex]:not([tabindex="-1"])')].filter((el) => !el.hasAttribute('disabled'))
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const d = data.derivados
  const rules = ATTRIBUTE_RULES
  return createPortal(
    <div className="cc-dialog-backdrop" role="presentation" onClick={onClose}>
      <div className="cc-dialog" role="dialog" aria-modal="true" aria-labelledby="cc-dialog-title" ref={boxRef} onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <small>
              {data.classe} · {data.funcao}
            </small>
            <h2 id="cc-dialog-title">{data.habilidade.nome}</h2>
          </div>
          <button ref={closeRef} type="button" className="cc-dialog-close" aria-label="Fechar detalhes" onClick={onClose}>
            <X aria-hidden focusable="false" />
          </button>
        </header>

        <section>
          <h3>Habilidade</h3>
          <p className="cc-dialog-facts">
            <span>Escala: {data.habilidade.escalaRotulo}</span>
            <span>Custo: {formatNumber(data.habilidade.custoEnergia)} de Energia</span>
            <span>Ataque básico: {data.ataqueBasicoRotulo}</span>
          </p>
          {data.habilidade.passiva && (
            <p>
              <b>Passivo.</b> {data.habilidade.passiva}
            </p>
          )}
          {data.habilidade.ativa && (
            <p>
              <b>Ativo.</b> {data.habilidade.ativa}
            </p>
          )}
          {!data.habilidade.passiva && !data.habilidade.ativa && <p>{data.habilidade.textoCompleto}</p>}
        </section>

        <section>
          <h3>O que cada atributo faz</h3>
          <dl className="cc-dialog-attrs">
            {data.atributos.map((attr) => (
              <div key={attr.key}>
                <dt>
                  {attr.label} <b>{formatNumber(attr.valor)}</b> <span>{bonusLabel(attr.bonus)}</span>
                </dt>
                <dd>{attr.dica}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h3>Fórmulas e valores de agora</h3>
          <ul className="cc-dialog-formulas">
            <li>
              <b>Vida Máxima</b> = base da classe + Vigor × {rules.vigorVidaPorPonto} + bônus de itens e talentos. Agora: {formatNumber(data.vida.max)}.
            </li>
            <li>
              <b>Poder do ataque básico</b>: {formatNumber(d.poderBasico)} ({data.ataqueBasicoRotulo.toLowerCase()}).
            </li>
            <li>
              <b>Armadura</b>: só de equipamentos e gemas. Reduz o dano físico em {formatNumber(d.mitigacao)} pontos, com retorno decrescente (nunca torna o herói invulnerável).
            </li>
            <li>
              <b>Esquiva</b>: {percentText(d.esquiva)} (Destreza e passivas da classe; teto de {percentText(rules.esquiva.tetoTotal)}).
            </li>
            <li>
              <b>Resistência a elementos</b>: {percentText(d.resistenciaElemental)} · <b>a efeitos negativos</b>: {percentText(d.resistenciaEfeitos)} (Vigor, com retorno decrescente).
            </li>
            <li>
              <b>Iniciativa</b>: +{percentText(d.iniciativa)} de chance de agir primeiro.
            </li>
            <li>
              <b>Energia</b>: começa cheia em cada batalha e regenera {rules.energia.regeneracaoPorRodada} por rodada.
            </li>
          </ul>
        </section>
      </div>
    </div>,
    document.body,
  )
}
