import { AlertTriangle, Shield, Sword } from 'lucide-react'
import type { EnemyThreatPreview, HeroAttackPreview } from '../store/combatPreview'
import { enemyForecast, heroForecast, type CoopThreatInfo } from './forecastText'

export interface CombatForecastProps {
  attack: Omit<HeroAttackPreview, 'staggered'> & { staggered?: boolean; finisher?: boolean }
  threat: EnemyThreatPreview
  /** Vida atual do herói (para avisar quando o golpe do inimigo chega perto dela). */
  hp: number
  hasSummons?: boolean
  /** Só no coop: quem o inimigo ataca é sorteado, então a prévia diz a chance de ser você. */
  coop?: CoopThreatInfo
}

// "Previsão" do turno (modo Moderno, combate solo): o que o próximo ataque causa e o que o inimigo
// pode devolver. Aparece no painel de dados enquanto o jogador decide; durante a jogada, o painel volta
// a mostrar os dados.
export function CombatForecast({ attack, threat, hp, hasSummons, coop }: CombatForecastProps) {
  const mine = heroForecast(attack)
  const theirs = enemyForecast(threat, hp, { summons: hasSummons, coop })
  return (
    <section className="combat-forecast" aria-label="Previsão do turno">
      <h3>Previsão</h3>
      <div className="cf-row cf-hero">
        <Sword size={20} aria-hidden />
        <div>
          <strong>Seu ataque</strong>
          <p>
            Causa <b>{mine.range}</b> de dano
          </p>
          <small>{mine.notes.join(' · ')}</small>
        </div>
      </div>
      <div className={`cf-row cf-enemy cf-${theirs.level}`}>
        {theirs.level === 'lethal' ? <AlertTriangle size={20} aria-hidden /> : <Shield size={20} aria-hidden />}
        <div>
          <strong>{coop?.enemyStunned ? 'Inimigo atordoado' : `Resposta do inimigo: ${threat.intentLabel}`}</strong>
          <p>
            {coop ? 'Se ele escolher você, sofre' : 'Você sofre'} <b>{theirs.range}</b> de dano
          </p>
          <small>{theirs.notes.join(' · ')}</small>
        </div>
      </div>
      <p className="cf-foot">Valores calculados com seus bônus atuais. Os dados ainda decidem o resultado.</p>
    </section>
  )
}
