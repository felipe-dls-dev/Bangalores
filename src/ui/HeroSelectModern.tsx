import React from 'react'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Heart, Shield, Sparkles, Sword } from 'lucide-react'
import { HEROES } from '../store/game'
import {
  DIFFICULTY_LABEL,
  HERO_SELECT_ART,
  firstSentence,
  heroProfile,
  splitAbility,
  statBars,
  stepIndex,
  type StatBar,
} from './heroProfiles'

export interface HeroSelectModernProps {
  /** Resolve um caminho de asset (com a revisão de cache do jogo). */
  assetUrl: (path: string) => string
  /** Nome curto da classe ("Guerreiro"). */
  classLabel: (heroId: string) => string
  onBack: () => void
  onConfirm: (heroId: string) => void
}

const STAT_ICON: Record<StatBar['id'], React.ReactNode> = {
  vida: <Heart size={15} aria-hidden />,
  ataque: <Sword size={15} aria-hidden />,
  defesa: <Shield size={15} aria-hidden />,
}

function Diamonds({ level }: { level: number }) {
  return (
    <span className="hs-diamonds" aria-hidden>
      {[1, 2, 3].map((n) => (
        <i key={n} className={n <= level ? 'on' : ''} />
      ))}
    </span>
  )
}

// Seleção de herói do modo Moderno: um herói por vez, em destaque, com a função, a dificuldade, os
// atributos e a habilidade à vista antes de confirmar. Todos os números vêm de herois.json.
export function HeroSelectModern({ assetUrl, classLabel, onBack, onConfirm }: HeroSelectModernProps) {
  const [index, setIndex] = React.useState(0)
  const stripRef = React.useRef<HTMLDivElement>(null)
  const focusStrip = React.useRef(false)
  const hero = HEROES[index]
  const profile = heroProfile(hero.id)
  const ability = splitAbility(hero.habilidade)
  const bars = statBars(hero, HEROES)
  const art = HERO_SELECT_ART(hero.id)
  const label = classLabel(hero.id)

  const go = (next: number, fromKeyboard = false) => {
    focusStrip.current = fromKeyboard
    setIndex(stepIndex(0, next, HEROES.length))
  }

  // Depois de trocar de herói pelo teclado, o foco acompanha a miniatura selecionada.
  React.useEffect(() => {
    if (!focusStrip.current) return
    focusStrip.current = false
    stripRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[index]?.focus()
  }, [index])

  // Mantém a miniatura selecionada visível quando a fileira rola (celular).
  React.useEffect(() => {
    const selected = stripRef.current?.querySelectorAll<HTMLElement>('[role="radio"]')[index]
    if (!selected || !stripRef.current) return
    const box = stripRef.current
    const target = selected.offsetLeft - (box.clientWidth - selected.clientWidth) / 2
    if (typeof box.scrollTo === 'function') box.scrollTo({ left: target, behavior: 'smooth' })
    else box.scrollLeft = target
  }, [index])

  const onKeyDown = (event: React.KeyboardEvent) => {
    const target = event.target as HTMLElement
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') go(index + 1, true)
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') go(index - 1, true)
    else if (event.key === 'Home') go(0, true)
    else if (event.key === 'End') go(HEROES.length - 1, true)
    else return
    event.preventDefault()
  }

  return (
    <div className="hs-page" onKeyDown={onKeyDown}>
      <div className="hs-backdrop" aria-hidden style={{ '--hs-art': `url(${assetUrl(art.thumb)})` } as React.CSSProperties} />

      <div className="hs-stage">
        <figure className="hs-figure" key={hero.id}>
          <img src={assetUrl(art.figure)} alt={`${label}: ${hero.nome}`} />
        </figure>

        <section className="hs-details" aria-live="polite" aria-label={`Detalhes: ${label}`}>
          <header className="hs-head">
            <div>
              <small className="hs-role">{profile.role}</small>
              <h1>{label}</h1>
              <p className="hs-name">{hero.nome}</p>
            </div>
            {profile.beginner && (
              <span className="hs-badge">
                <Sparkles size={14} aria-hidden />
                Boa para começar
              </span>
            )}
          </header>

          <p className="hs-playstyle">{profile.playstyle}</p>
          <ul className="hs-tags">
            {profile.tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>

          <div className="hs-difficulty">
            <span>Dificuldade</span>
            <Diamonds level={profile.difficulty} />
            <strong>{DIFFICULTY_LABEL[profile.difficulty]}</strong>
          </div>

          <div className="hs-body">
            <div className="hs-bars" role="list" aria-label="Atributos iniciais">
              {bars.map((bar) => (
                <div className={`hs-bar hs-bar-${bar.id}`} role="listitem" key={bar.id}>
                  <span className="hs-bar-label">
                    {STAT_ICON[bar.id]}
                    {bar.label}
                  </span>
                  <span className="hs-bar-track" aria-hidden>
                    <i style={{ width: `${bar.percent}%` }} />
                  </span>
                  <strong>{bar.value}</strong>
                </div>
              ))}
            </div>

            <div className="hs-ability">
              {ability.passive && (
                <p>
                  <b>Passivo</b>
                  {firstSentence(ability.passive)}
                </p>
              )}
              {ability.active && (
                <p>
                  <b>Ativo</b>
                  {firstSentence(ability.active)}
                </p>
              )}
              <details key={hero.id} className="hs-more">
                <summary>Ver habilidade completa</summary>
                <p>{hero.habilidade}</p>
              </details>
            </div>
          </div>

          <div className="hs-actions">
            <button className="hs-back" aria-label="Voltar ao menu" onClick={onBack}>
              <ArrowLeft size={17} aria-hidden />
              Menu
            </button>
            <button className="hs-confirm" onClick={() => onConfirm(hero.id)}>
              <span>Iniciar com {label}</span>
              <ArrowRight size={19} aria-hidden />
            </button>
            <small>A classe é permanente nesta campanha. Para jogar com outra, comece uma nova campanha.</small>
          </div>
        </section>
      </div>

      <div className="hs-strip-wrap">
        <button className="hs-arrow" aria-label="Herói anterior" onClick={() => go(index - 1)}>
          <ChevronLeft size={22} aria-hidden />
        </button>
        <div className="hs-strip" role="radiogroup" aria-label="Escolha a classe" ref={stripRef}>
          {HEROES.map((h, i) => (
            <button
              key={h.id}
              role="radio"
              aria-checked={i === index}
              tabIndex={i === index ? 0 : -1}
              className={`hs-thumb${i === index ? ' selected' : ''}`}
              onClick={() => go(i)}
            >
              <img src={assetUrl(HERO_SELECT_ART(h.id).thumb)} alt="" loading="eager" decoding="async" />
              <span>{classLabel(h.id)}</span>
            </button>
          ))}
        </div>
        <button className="hs-arrow" aria-label="Próximo herói" onClick={() => go(index + 1)}>
          <ChevronRight size={22} aria-hidden />
        </button>
      </div>
    </div>
  )
}
