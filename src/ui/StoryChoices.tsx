import { isStoryCost, storyEffectCapped, storyRawTotals, storyTotalsAsEffects } from '../data/storyEffects'
import type { StoryChapter } from '../data/expansion'
import { storyChoiceShortfall, storyChosenEffects, storyModifiers, useGame } from '../store/game'
import { storyEffectLabel, storyMaterialName } from './storyEffectLabels'

// Escolhas das Crônicas com o efeito de cada uma à vista (verde: ganho; vermelho: custo). Antes o botão só mostrava a
// frase de consequência, e o jogador não tinha como saber o que cada escolha fazia de fato.
export function StoryChoiceList({ chapter, requirementMet, requirementLabel }: { chapter: StoryChapter; requirementMet: boolean; requirementLabel?: string }) {
  const g = useGame()
  const current = storyRawTotals(storyChosenEffects(g))
  return (
    <div className="story-choices">
      {chapter.choices.map(choice => {
        const effects = choice.effects ?? []
        const gains = effects.filter(e => !isStoryCost(e)), costs = effects.filter(isStoryCost)
        const shortfall = storyChoiceShortfall(g, choice)
        const shortfallText = shortfall ? (shortfall.kind === 'ouro' ? `Faltam ${shortfall.missing} de ouro.` : `Faltam ${storyMaterialName(shortfall.id)} ×${shortfall.missing}.`) : undefined
        const blocked = !requirementMet || Boolean(shortfall)
        const title = !requirementMet ? `Cumpra o objetivo do capítulo (${requirementLabel}) para decidir.` : shortfallText
        return (
          <button key={choice.id} disabled={blocked} title={title} onClick={() => g.chooseStory(choice.id)}>
            <strong>{choice.text}</strong>
            <small>{choice.consequence}</small>
            {effects.length > 0 && (
              <span className="story-effects">
                {gains.map((e, i) => {
                  const capped = storyEffectCapped(e, current)
                  return <em key={`g${i}`} className={`story-effect${capped ? ' is-capped' : ''}`} title={capped ? 'Esse bônus da história já está no teto: esta escolha não soma mais nada nele.' : undefined}>{storyEffectLabel(e)}{capped ? ' · no teto' : ''}</em>
                })}
                {costs.map((e, i) => <em key={`c${i}`} className="story-effect is-cost">{storyEffectLabel(e)}</em>)}
              </span>
            )}
            {requirementMet && shortfallText && <span className="story-shortfall">{shortfallText}</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Soma do que as escolhas já feitas deram (bônus permanentes, já com teto). Some quando ainda não há nenhum. */
export function StoryLegacySummary() {
  const g = useGame()
  const effects = storyTotalsAsEffects(storyModifiers(g))
  if (!effects.length) return null
  return (
    <section className="story-legacy" aria-label="O que sua história te deu">
      <h3>O que sua história te deu</h3>
      <ul>
        {effects.map((e, i) => <li key={i} className={isStoryCost(e) ? 'is-cost' : undefined}>{storyEffectLabel(e)}</li>)}
      </ul>
    </section>
  )
}
