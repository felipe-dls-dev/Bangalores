import React from 'react'
import { ChevronRight, Coins, Hammer, ListChecks, Swords, Users } from 'lucide-react'
import { HEROES, SLOT_ORDER, attackValue, defenseValue, equipmentBagCapacity, maxHp, useGame } from '../store/game'
import { activeChallenges, msUntilChallengeReset } from '../data/expansion'
import { crystalsLabel } from '../data/crystals'
import { onlineConfigured } from '../online/supabase'
import { CAMP_BANNER, CAMP_BANNER_MOBILE, CAMP_CARD_ART, campChapter, campQuote, continueTarget, dailyRewardState, formatCountdown, xpProgress } from './campData'

export interface CampScreenProps {
  /** Resolve um caminho de asset (com a revisão de cache do jogo). */
  assetUrl: (path: string) => string
  /** Imagem do retrato do herói. */
  heroArt: (hero: (typeof HEROES)[number]) => string
  /** Nome curto da classe ("Guerreiro"). */
  classLabel: (heroId: string) => string
  /** Nome do arquivo da cinemática do capítulo (sem pasta/extensão). */
  chapterArt: (chapter: ReturnType<typeof campChapter>['chapter']) => string | undefined
  /** Ícone dos Cristais de Éter (o mesmo do HUD). */
  crystalIcon: (size: number) => React.ReactNode
  onGo: (screen: string) => void
}

const numberFormat = new Intl.NumberFormat('pt-BR')

function ArtImage({ src, className, eager = false }: { src: string; className?: string; eager?: boolean }) {
  const [failed, setFailed] = React.useState(false)
  if (failed) return null
  return <img className={className} src={src} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />
}

// Hub do modo Moderno ("Acampamento de Expedição"): reúne o que o jogador quer ao abrir o jogo --
// continuar a história, ver o herói, resgatar desafios e atalhos. Todos os dados são reais.
export function CampScreen({ assetUrl, heroArt, classLabel, chapterArt, crystalIcon, onGo }: CampScreenProps) {
  const g = useGame()
  const hero = HEROES.find((h) => h.id === g.heroId)
  const [now, setNow] = React.useState(() => Date.now())
  const [notice, setNotice] = React.useState<string | undefined>()

  // Atualiza a contagem regressiva e a provisão diária sem exigir interação.
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [])

  if (!hero) return null
  const story = campChapter(g)
  const xp = xpProgress(g.xp)
  const challenges = activeChallenges(now)
  const resetIn = formatCountdown(msUntilChallengeReset(now))
  const daily = dailyRewardState(g.dailyRewardClaimedAt, now)
  const worldName = g.world === 'steelmere' ? 'STEELMERE' : 'HAVENDOWN'
  const chapterImage = chapterArt(story.chapter)
  const dayKey = Math.floor((now - new Date(now).getTimezoneOffset() * 60_000) / 86_400_000)
  const continueLabel = g.subregionId ? 'Voltar à exploração' : 'Continuar expedição'

  const claim = (id: string) => {
    const result = g.claimChallenge(id)
    if (result) setNotice(result.message)
  }

  return (
    <div className="camp-page">
      <header className="camp-banner">
        <picture>
          <source media="(max-width: 760px)" srcSet={assetUrl(CAMP_BANNER_MOBILE)} />
          <img className="camp-banner-art" src={assetUrl(CAMP_BANNER)} alt="" decoding="async" />
        </picture>
        <div className="camp-banner-text">
          <span className="camp-eyebrow">AS CRÔNICAS DE {worldName}</span>
          <h1>Acampamento de Expedição</h1>
          <p>Novos horizontes. Maiores desafios. Juntos, mais longe.</p>
        </div>
        <blockquote className="camp-banner-quote">“{campQuote(dayKey)}”</blockquote>
      </header>

      {notice && (
        <div className="camp-notice" role="status" onClick={() => setNotice(undefined)}>
          {notice}
        </div>
      )}

      <div className="camp-grid">
        <section className="camp-card camp-chapter" aria-labelledby="camp-chapter-title">
          <div className="camp-chapter-art">{chapterImage && <ArtImage src={assetUrl(`assets/story/cinematics/${chapterImage}.webp`)} />}</div>
          <div className="camp-chapter-body">
            <span className="camp-eyebrow">ATO {story.act} • {story.region.toUpperCase()}</span>
            <h2 id="camp-chapter-title">{story.title}</h2>
            <p className="camp-chapter-text">{story.dialogue}</p>
            <div className="camp-objective">
              <span className="camp-objective-label">Objetivo atual</span>
              <div className="camp-objective-row">
                <strong>{story.objective}</strong>
                <span className={story.complete ? 'camp-objective-done' : ''}>
                  {numberFormat.format(story.current)}/{numberFormat.format(story.required)}
                </span>
              </div>
            </div>
            <button className="camp-link" onClick={() => onGo('chronicle')}>
              <ListChecks size={15} />
              <span>Ver todos os objetivos</span>
              <ChevronRight size={15} />
            </button>
          </div>
          <button className="camp-cta" onClick={() => onGo(continueTarget(g))}>
            <Swords size={22} />
            <span>
              <strong>{continueLabel}</strong>
              <small>{g.territory}</small>
            </span>
            <ChevronRight size={20} />
          </button>
        </section>

        <section className="camp-card camp-hero" aria-labelledby="camp-hero-title">
          <span className="camp-eyebrow">SEU HERÓI</span>
          <div className="camp-hero-head">
            <div className="camp-level" aria-label={`Nível ${xp.level}`}>
              <small>NV.</small>
              <strong>{xp.level}</strong>
            </div>
            <div className="camp-hero-name">
              <h2 id="camp-hero-title">{hero.nome}</h2>
              <span>{classLabel(hero.id)}</span>
            </div>
            <ArtImage className="camp-hero-portrait" src={assetUrl(heroArt(hero))} />
          </div>
          <div className="camp-xp">
            <div className="camp-xp-text">
              <span>{numberFormat.format(xp.progress)} / {numberFormat.format(xp.next)} EXP</span>
              <span>{Math.floor(xp.pct)}%</span>
            </div>
            <div className="camp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={xp.next} aria-valuenow={xp.progress} aria-label="Experiência do nível">
              <div style={{ width: `${xp.pct}%` }} />
            </div>
          </div>
          <dl className="camp-stats">
            <div><dt>Vida</dt><dd>{numberFormat.format(g.hp)}/{numberFormat.format(maxHp(g))}</dd></div>
            <div><dt>Ataque</dt><dd>{numberFormat.format(attackValue(g))}</dd></div>
            <div><dt>Defesa</dt><dd>{numberFormat.format(defenseValue(g))}</dd></div>
          </dl>
          <dl className="camp-stats camp-stats-extra">
            <div><dt>Ouro</dt><dd>{numberFormat.format(g.gold)}</dd></div>
            <div><dt>Mochila</dt><dd>{g.equipmentBag.length}/{equipmentBagCapacity(g)}</dd></div>
            <div><dt>Peças vestidas</dt><dd>{Object.values(g.equipped).filter(Boolean).length}/{SLOT_ORDER.length}</dd></div>
          </dl>
          {g.attributePoints > 0 && (
            <p className="camp-points">{g.attributePoints} {g.attributePoints === 1 ? 'ponto' : 'pontos'} de atributo para distribuir</p>
          )}
          <button className="camp-link camp-link-solid" onClick={() => onGo('character')}>
            <span>Ver progressão</span>
            <ChevronRight size={15} />
          </button>
        </section>

        <section className="camp-card camp-objectives" aria-labelledby="camp-objectives-title">
          <div className="camp-objectives-head">
            <span className="camp-eyebrow" id="camp-objectives-title">OBJETIVOS</span>
            <span className="camp-reset">Diários reiniciam em {resetIn}</span>
          </div>
          <ul className="camp-challenges">
            {challenges.map((c) => {
              const progress = Math.min(c.target, g.challengeProgress?.[c.id] ?? 0)
              const ready = progress >= c.target
              const claimed = Boolean(g.challengeClaimed?.[c.id])
              return (
                <li key={c.id} className={claimed ? 'claimed' : ready ? 'ready' : ''}>
                  <div className="camp-challenge-top">
                    <span className={`camp-kind camp-kind-${c.kind}`}>{c.kind === 'daily' ? 'DIÁRIO' : 'SEMANAL'}</span>
                    <strong>{c.label}</strong>
                  </div>
                  <div className="camp-challenge-bottom">
                    <div className="camp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={c.target} aria-valuenow={progress} aria-label={c.label}>
                      <div style={{ width: `${(progress / c.target) * 100}%` }} />
                    </div>
                    <span className="camp-progress-count">{progress}/{c.target}</span>
                    <span className="camp-reward" title={`${c.reward} de ouro e ${crystalsLabel(c.crystals)}`}>
                      <Coins size={14} />{c.reward}
                      <span className="camp-reward-crystals">{crystalIcon(14)}{c.crystals}</span>
                    </span>
                    {claimed ? (
                      <button disabled>Resgatado</button>
                    ) : ready ? (
                      <button className="primary" onClick={() => claim(c.id)}>Resgatar</button>
                    ) : (
                      <button disabled>Em andamento</button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="camp-daily">
            <div>
              <strong>Provisão diária</strong>
              <small>{daily.eligible ? 'Pronta para coletar: ouro e materiais.' : `Próxima em cerca de ${daily.hoursLeft}h.`}</small>
            </div>
            <button
              className={daily.eligible ? 'primary' : ''}
              disabled={!daily.eligible}
              onClick={() => {
                const result = g.claimDailyReward()
                if (result) setNotice(result.message)
              }}
            >
              {daily.eligible ? 'Coletar' : 'Aguarde'}
            </button>
          </div>
        </section>
      </div>

      <div className="camp-shortcuts">
        <article className="camp-shortcut">
          <ArtImage className="camp-shortcut-art" src={assetUrl(CAMP_CARD_ART.forge)} />
          <div className="camp-shortcut-body">
            <span className="camp-eyebrow">EQUIPAMENTO</span>
            <p>Seus equipamentos podem ser melhorados. Aprimore armas e armaduras para enfrentar desafios maiores.</p>
            <button className="camp-link camp-link-solid" onClick={() => onGo('forge')}>
              <Hammer size={15} />
              <span>Ir para o ferreiro</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </article>
        <article className="camp-shortcut">
          <ArtImage className="camp-shortcut-art" src={assetUrl(CAMP_CARD_ART.allies)} />
          <div className="camp-shortcut-body">
            <span className="camp-eyebrow">JOGUE COM ALIADOS</span>
            <p>Expedições são mais seguras em boa companhia. Convide seus amigos para lutar em equipe.</p>
            <button
              className="camp-link camp-link-solid"
              disabled={!onlineConfigured}
              title={onlineConfigured ? undefined : 'Disponível com uma conta online'}
              onClick={() => onGo('coop')}
            >
              <Users size={15} />
              <span>Convidar jogadores</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </article>
        <article className="camp-shortcut camp-shortcut-quote">
          <ArtImage className="camp-shortcut-art" src={assetUrl(CAMP_CARD_ART.quote)} />
          <blockquote>“{campQuote(dayKey + 1)}”</blockquote>
        </article>
      </div>

      <p className="camp-strip" aria-hidden="true">
        <span>EXPLORAR</span><i>•</i><span>LUTAR</span><i>•</i><span>EVOLUIR</span><i>•</i><span>JUNTOS</span>
      </p>
    </div>
  )
}
