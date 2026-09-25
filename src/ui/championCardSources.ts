// Onde a Carta de Campeão busca os números: o herói ativo da campanha, o kit inicial de cada classe (seleção e
// galeria) ou um estado qualquer. Sempre pelas mesmas fórmulas do combate (championStats).

import { HEROES, RARITY_LABEL, HERO_CLASS_NAMES, championStats, deriveLevel, energyNow, heroPreviewState, useGame } from '../store/game'
import { buildChampionCard, type ChampionCardData } from './championCardData'
import { HERO_SELECT_ART } from './heroProfiles'

type GameSnapshot = ReturnType<typeof useGame.getState>

export const championArt = (heroId: string) => HERO_SELECT_ART(heroId).figure

const rarityLabel = (rarity: keyof typeof RARITY_LABEL) => RARITY_LABEL[rarity] ?? String(rarity)

/** Carta de um herói do catálogo para um estado (ativo, ou o estado sintético do kit inicial). */
export function championCardForState(state: GameSnapshot, heroId: string, options: { energy?: number; hp?: number } = {}): ChampionCardData | undefined {
  const hero = HEROES.find((h) => h.id === heroId)
  if (!hero) return undefined
  const stats = championStats({ ...state, heroId } as GameSnapshot)
  return buildChampionCard({
    hero,
    classLabel: HERO_CLASS_NAMES[heroId] ?? hero.nome,
    stats,
    level: deriveLevel(state.xp).lvl,
    hp: options.hp,
    energy: options.energy,
    art: championArt(heroId),
    rarityLabel,
  })
}

/** Carta do herói da campanha atual: vida atual e Energia atual reais. */
export function championCardForActiveHero(state: GameSnapshot, options: { energy?: number } = {}): ChampionCardData | undefined {
  if (!state.heroId) return undefined
  const inCombat = state.screen === 'combat'
  return championCardForState(state, state.heroId, { hp: state.hp, energy: options.energy ?? (inCombat ? energyNow(state) : undefined) })
}

/** Carta de uma classe com o kit inicial no nível dado (seleção de heróis e galeria). */
export function championCardForKit(heroId: string, level = 1): ChampionCardData | undefined {
  return championCardForState(heroPreviewState(heroId, level), heroId)
}
