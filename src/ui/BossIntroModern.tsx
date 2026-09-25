import React from 'react'
import { ArrowLeft, Backpack, FlaskConical, HelpCircle, Shield, ShoppingBag, Skull, Sword, Swords } from 'lucide-react'
import { SUBREGIONS, attackValue, defenseValue, heroWeaponElement, levelInfo, maxHp, useGame } from '../store/game'
import { previewEnemyAttack, previewHeroAttack } from '../store/combatPreview'
import { BOSS_TURN_RULES, ELEMENT_LABELS, bossPhases, bossPreparation, bossWeakness, levelAdvice, weaponMatchup } from './bossData'
import { rangeLabel } from './forecastText'

export interface BossIntroModernProps {
  /** Endereço da arte do chefe, já resolvido (com a revisão de cache do jogo). */
  image: string
  onGo: (screen: string) => void
}

const MATCHUP_TEXT = {
  fraqueza: 'Sua arma acerta a fraqueza dele: +35% de dano.',
  resistencia: 'Sua arma é resistida por ele: −25% de dano.',
  neutro: 'Sua arma não tem vantagem nem desvantagem contra ele.',
} as const

// Tela de apresentação do chefe no modo Moderno: separa o que já se sabe (fases, fraquezas, seus números)
// do que ainda é incerto, e mostra o preparo antes de o jogador confirmar. Tudo vem das regras reais do combate.
export function BossIntroModern({ image, onGo }: BossIntroModernProps) {
  const g = useGame()
  const boss = g.enemy
  const [artFailed, setArtFailed] = React.useState(false)
  // A tela é longa: ao abrir, começa no topo mesmo que a tela anterior estivesse rolada.
  React.useEffect(() => {
    if (typeof window.scrollTo === 'function') window.scrollTo(0, 0)
  }, [])
  if (!boss) return null
  const sub = SUBREGIONS.find((s) => s.id === g.subregionId)
  const phases = bossPhases(boss)
  const weakness = bossWeakness(boss)
  const weapon = heroWeaponElement(g)
  const matchup = weaponMatchup(weapon, weakness)
  const heroLevel = levelInfo(g.xp).lvl
  const advice = levelAdvice(heroLevel, sub)
  const prep = bossPreparation(g, maxHp(g))
  const mine = previewHeroAttack(g, { plainAttack: true })
  const theirs = previewEnemyAttack(g, { plainAttack: true })
  const bossLevel = boss.nivel ?? boss.dificuldade
  const swing = mine && theirs ? `${rangeLabel(mine.min, mine.max)} seu ataque · ${rangeLabel(theirs.min, theirs.max)} o golpe dele` : undefined

  return (
    <div className="bi-page">
      <section className="bi-hero" aria-label={`Chefe: ${boss.nome}`}>
        {!artFailed && <img className="bi-art" src={image} alt="" onError={() => setArtFailed(true)} />}
        <div className="bi-hero-text">
          <span className="bi-badge">
            <Skull size={14} aria-hidden />
            Chefe de {sub?.nome ?? 'sub-região'}
          </span>
          <h1>{boss.nome}</h1>
          {boss.habilidade && <p className="bi-quote">“{boss.habilidade}”</p>}
          <dl className="bi-stats">
            <div>
              <dt>Vida</dt>
              <dd>{boss.vida}</dd>
            </div>
            <div>
              <dt>Ataque</dt>
              <dd>{boss.ataque}</dd>
            </div>
            <div>
              <dt>Nível</dt>
              <dd>{bossLevel}</dd>
            </div>
            <div>
              <dt>Fases</dt>
              <dd>{phases.length}</dd>
            </div>
          </dl>
        </div>
      </section>

      <aside className="bi-panel">
        <section aria-labelledby="bi-phases">
          <h2 id="bi-phases">Fases da batalha</h2>
          <ol className="bi-phases">
            {phases.map((phase) => (
              <li key={phase.n}>
                <span className="bi-phase-n" aria-hidden>
                  {phase.n}
                </span>
                <div>
                  <strong>
                    {phase.title}
                    <small>{phase.n === 1 ? 'começa aqui' : `a partir de ${phase.entersAt}% da vida`}</small>
                  </strong>
                  {phase.notes.map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <p className="bi-rule">{BOSS_TURN_RULES[0]}</p>
        </section>

        <section aria-labelledby="bi-weak">
          <h2 id="bi-weak">Fraquezas conhecidas</h2>
          <p className="bi-line">
            <span>Elemento</span>
            <b className={`bi-element el-${weakness.element}`}>{ELEMENT_LABELS[weakness.element]}</b>
          </p>
          <p className="bi-line">
            <span>Sofre mais com</span>
            {weakness.weakTo.length ? weakness.weakTo.map((el) => <b key={el} className={`bi-element el-${el}`}>{ELEMENT_LABELS[el]}</b>) : <em>nada em especial</em>}
          </p>
          <p className="bi-line">
            <span>Resiste a</span>
            {weakness.resists.length ? weakness.resists.map((el) => <b key={el} className={`bi-element muted el-${el}`}>{ELEMENT_LABELS[el]}</b>) : <em>nada em especial</em>}
          </p>
          <p className={`bi-matchup m-${matchup}`}>
            <b>Sua arma: {ELEMENT_LABELS[weapon]}.</b> {MATCHUP_TEXT[matchup]}
          </p>
        </section>

        <section aria-labelledby="bi-unknown">
          <h2 id="bi-unknown">O que ainda é incerto</h2>
          <ul className="bi-unknown">
            <li>
              <HelpCircle size={15} aria-hidden />
              Os dados: o mesmo golpe varia entre o mínimo e o máximo previstos abaixo.
            </li>
            <li>
              <HelpCircle size={15} aria-hidden />
              Quanto tempo a luta dura, e em qual turno cada fase começa.
            </li>
          </ul>
        </section>

        <section aria-labelledby="bi-prep">
          <h2 id="bi-prep">Preparar-se</h2>
          {advice && (
            <p className={`bi-level fit-${advice.fit}`}>
              <b>{advice.label}</b>
              <span>
                Você é nível {heroLevel} · faixa da região {advice.range} · chefe nível {bossLevel}
              </span>
            </p>
          )}
          <div className="bi-hp" role="img" aria-label={`Sua vida: ${g.hp} de ${maxHp(g)}`}>
            <span>
              Vida {g.hp}/{maxHp(g)}
            </span>
            <i>
              <b style={{ width: `${Math.max(0, Math.min(100, prep.hpPercent))}%` }} />
            </i>
          </div>
          <ul className="bi-kit">
            <li className={prep.healingPotions ? '' : 'empty'}>
              <FlaskConical size={16} aria-hidden />
              <span>Poções de cura</span>
              <b>{prep.healingPotions}</b>
            </li>
            <li className={prep.otherConsumables ? '' : 'empty'}>
              <Backpack size={16} aria-hidden />
              <span>Outros consumíveis</span>
              <b>{prep.otherConsumables}</b>
            </li>
            <li className={prep.blessings ? '' : 'empty'}>
              <Shield size={16} aria-hidden />
              <span>Bênção da Proteção</span>
              <b>{prep.blessings}</b>
            </li>
            <li>
              <Sword size={16} aria-hidden />
              <span>Ataque / Defesa</span>
              <b>
                {attackValue(g)} / {defenseValue(g)}
              </b>
            </li>
          </ul>
          {swing && (
            <p className="bi-swing">
              <Swords size={15} aria-hidden />
              {swing}
              <small>Cálculo com os seus bônus de agora. Se você cair, a punição de derrota vale como sempre.</small>
            </p>
          )}
          <div className="bi-shortcuts">
            <button onClick={() => onGo('equipment')}>
              <Backpack size={15} aria-hidden />
              Equipamento
            </button>
            <button onClick={() => onGo('shop')}>
              <ShoppingBag size={15} aria-hidden />
              Loja
            </button>
          </div>
        </section>

        <div className="bi-actions">
          <button onClick={() => g.setScreen('region')}>
            <ArrowLeft size={17} aria-hidden />
            Voltar
          </button>
          <button className="bi-go" onClick={() => g.startBoss()}>
            <Swords size={18} aria-hidden />
            Enfrentar
          </button>
        </div>
      </aside>
    </div>
  )
}
