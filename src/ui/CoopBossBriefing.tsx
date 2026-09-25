import { AlertTriangle, CheckCircle2, Skull, Users } from 'lucide-react'
import type { Element } from '../data/expansion'
import type { Enemy } from '../types'
import { ELEMENT_LABELS, bossPhases, bossWeakness, weaponMatchup } from './bossData'
import { partyReadiness, type PartyMember } from './coopBriefing'

export interface CoopBossBriefingProps {
  boss: Enemy
  /** Elemento da arma de quem está lendo (o líder). */
  weapon: Element
  members: readonly PartyMember[]
}

const MATCHUP = {
  fraqueza: 'Sua arma acerta a fraqueza dele (+35%).',
  resistencia: 'Sua arma é resistida por ele (−25%).',
  neutro: 'Sua arma não tem vantagem contra ele.',
} as const

// Resumo do chefe e do grupo no aviso "Enfrentar chefe" do coop (modo Moderno): fases, fraquezas e a vida de
// cada membro, com a recomendação do que fazer antes de começar. O chefe já vem escalado pelo tamanho do grupo.
export function CoopBossBriefing({ boss, weapon, members }: CoopBossBriefingProps) {
  const phases = bossPhases(boss)
  const weakness = bossWeakness(boss)
  const matchup = weaponMatchup(weapon, weakness)
  const party = partyReadiness(members)

  return (
    <div className="cbb">
      <p className="cbb-boss">
        <Skull size={16} aria-hidden />
        <strong>{boss.nome}</strong>
        <span>Vida {boss.vida}</span>
        <span>Ataque {boss.ataque}</span>
        <span>{phases.length} fases</span>
      </p>

      <div className="cbb-grid">
        <section aria-label="Fases">
          <h3>Fases</h3>
          <ol>
            {phases.map((phase) => (
              <li key={phase.n}>
                <b>{phase.n}</b>
                <span>
                  {phase.n === 1 ? 'começa aqui' : `a partir de ${phase.entersAt}% da vida`}
                  <small>{phase.n === 1 ? `Ataque ${phase.attack}` : `Ataque ${phase.attack} · capangas · regenera`}</small>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="Fraquezas">
          <h3>Fraquezas</h3>
          <p className="cbb-line">
            Elemento <b className={`cbb-el el-${weakness.element}`}>{ELEMENT_LABELS[weakness.element]}</b>
          </p>
          <p className="cbb-line">
            Sofre mais com{' '}
            {weakness.weakTo.length ? weakness.weakTo.map((el) => <b key={el} className={`cbb-el el-${el}`}>{ELEMENT_LABELS[el]}</b>) : <em>nada em especial</em>}
          </p>
          <p className={`cbb-matchup m-${matchup}`}>{MATCHUP[matchup]}</p>
        </section>

        <section aria-label="Grupo">
          <h3>
            <Users size={13} aria-hidden />
            Grupo
          </h3>
          <ul className="cbb-party">
            {party.bars.map((m) => (
              <li key={m.userId} className={m.hp <= 0 ? 'down' : m.locked ? 'locked' : ''}>
                <span>{m.name}</span>
                <i role="img" aria-label={`${m.hpPercent}% da vida`}>
                  <b style={{ width: `${m.hpPercent}%` }} />
                </i>
                <em>{m.hp}/{m.maxHp}</em>
              </li>
            ))}
          </ul>
          <p className={`cbb-advice a-${party.advice.level}`}>
            {party.advice.level === 'ok' ? <CheckCircle2 size={15} aria-hidden /> : <AlertTriangle size={15} aria-hidden />}
            {party.advice.text}
          </p>
        </section>
      </div>
    </div>
  )
}
