import React from 'react'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Info, Sparkles } from 'lucide-react'
import { HEROES } from '../store/game'
import { ChampionCard, ChampionDetailsDialog } from './ChampionCard'
import { championCardForKit } from './championCardSources'
import { formatNumber } from './championCardData'
import { DIFFICULTY_LABEL, HERO_SELECT_ART, heroProfile, stepIndex } from './heroProfiles'

export interface HeroSelectModernProps {
  /** Resolve um caminho de asset (com a revisão de cache do jogo). */
  assetUrl: (path: string) => string
  /** Nome curto da classe ("Guerreiro"). */
  classLabel: (heroId: string) => string
  onBack: () => void
  onConfirm: (heroId: string) => void
}

// Seleção de herói do modo Moderno: uma Carta de Campeão por vez (números reais do kit inicial), com função,
// dificuldade e a recomendação para iniciantes ao lado. A decisão cabe em poucos segundos: o texto completo,
// as fórmulas e o texto da habilidade ficam atrás de "Ver detalhes".
export function HeroSelectModern({ assetUrl, classLabel, onBack, onConfirm }: HeroSelectModernProps) {
  const [index, setIndex] = React.useState(0)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const stripRef = React.useRef<HTMLDivElement>(null)
  const detailsButton = React.useRef<HTMLButtonElement>(null)
  const focusStrip = React.useRef(false)
  const hero = HEROES[index]
  const profile = heroProfile(hero.id)
  const card = React.useMemo(() => championCardForKit(hero.id)!, [hero.id])
  const art = HERO_SELECT_ART(hero.id)
  const label = classLabel(hero.id)

  const go = (next: number, fromKeyboard = false) => {
    focusStrip.current = fromKeyboard
    setDetailsOpen(false)
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
    if (detailsOpen) return // o diálogo cuida das próprias teclas
    const target = event.target as HTMLElement
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') go(index + 1, true)
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') go(index - 1, true)
    else if (event.key === 'Home') go(0, true)
    else if (event.key === 'End') go(HEROES.length - 1, true)
    else return
    event.preventDefault()
  }

  const closeDetails = () => {
    setDetailsOpen(false)
    detailsButton.current?.focus()
  }

  return (
    <div className="hs-page hs-page-card" onKeyDown={onKeyDown}>
      <div className="hs-backdrop" aria-hidden style={{ '--hs-art': `url(${assetUrl(art.thumb)})` } as React.CSSProperties} />

      <div className="hs-stage">
        <div className="hs-card-col" key={hero.id}>
          <ChampionCard data={card} assetUrl={assetUrl} hideDetailsButton />
        </div>

        <section className="hs-details" aria-live="polite" aria-label={`Detalhes: ${label}`}>
          <header className="hs-head">
            <div>
              <small className="hs-role">Escolha sua classe</small>
              <h1>{label}</h1>
              <p className="hs-name">{hero.nome}</p>
            </div>
          </header>

          <ul className="hs-facts" aria-label="Resumo da classe">
            <li className="hs-fact">
              <small>Função</small>
              <strong>{profile.role}</strong>
            </li>
            <li className="hs-fact">
              <small>Dificuldade</small>
              <strong>{DIFFICULTY_LABEL[profile.difficulty]}</strong>
            </li>
            <li className="hs-fact">
              <small>Ataque básico</small>
              <strong>{card.ataqueBasicoRotulo}</strong>
            </li>
            <li className="hs-fact">
              <small>Habilidade</small>
              <strong>
                {card.habilidade.nome} · {formatNumber(card.habilidade.custoEnergia)} de Energia
              </strong>
            </li>
          </ul>

          {profile.beginner && (
            <p className="hs-badge">
              <Sparkles size={14} aria-hidden />
              Boa para começar
            </p>
          )}
          <p className="hs-playstyle">{profile.playstyle}</p>

          <div className="hs-actions">
            <button className="hs-back" aria-label="Voltar ao menu" onClick={onBack}>
              <ArrowLeft size={17} aria-hidden />
              Menu
            </button>
            <button ref={detailsButton} className="hs-more-btn" type="button" aria-haspopup="dialog" onClick={() => setDetailsOpen(true)}>
              <Info size={17} aria-hidden />
              Ver detalhes
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
            <button key={h.id} role="radio" aria-checked={i === index} tabIndex={i === index ? 0 : -1} className={`hs-thumb${i === index ? ' selected' : ''}`} onClick={() => go(i)}>
              <img src={assetUrl(HERO_SELECT_ART(h.id).thumb)} alt="" loading="eager" decoding="async" />
              <span>{classLabel(h.id)}</span>
            </button>
          ))}
        </div>
        <button className="hs-arrow" aria-label="Próximo herói" onClick={() => go(index + 1)}>
          <ChevronRight size={22} aria-hidden />
        </button>
      </div>

      {detailsOpen && <ChampionDetailsDialog data={card} onClose={closeDetails} />}
    </div>
  )
}
