import { AlertTriangle, Shield, Sword } from 'lucide-react'
import type { EnemyThreatPreview, HeroAttackPreview } from '../store/combatPreview'
import { enemyForecast, heroForecast } from './forecastText'

export interface CombatForecastProps {
  attack: HeroAttackPreview
  threat: EnemyThreatPreview
  /** Vida atual do herói (para avisar quando o golpe do inimigo chega perto dela). */
  hp: number
  hasSummons?: boolean
}

// "Previsão" do turno (modo Moderno, combate solo): o que o próximo ataque causa e o que o inimigo
// pode devolver. Aparece no painel de dados enquanto o jogador decide; durante a jogada, o painel volta
// a mostrar os dados.
export function CombatForecast({ attack, threat, hp, hasSummons }: CombatForecastProps) {
  const mine = heroForecast(attack)
  const theirs = enemyForecast(threat, hp, { summons: hasSummons })
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
          <strong>Resposta do inimigo: {threat.intentLabel}</strong>
          <p>
            Você sofre <b>{theirs.range}</b> de dano
          </p>
          <small>{theirs.notes.join(' · ')}</small>
        </div>
      </div>
      <p className="cf-foot">Valores calculados com seus bônus atuais. Os dados ainda decidem o resultado.</p>
    </section>
  )
}
