// Identidade visual das telas do modo Moderno (mesma linguagem do Acampamento de Expedição): qual cena cada
// área usa no cabeçalho e as decisões de "próximo passo" que dependem do estado do jogo. Só dados e funções
// puras: ScreenMasthead.tsx desenha, main.tsx liga ao store, e os testes conferem sem navegador.

import { recipeEntries, recipeReadiness } from './forgeData'
import { compareDrop } from './dropCompare'
import type { useGame } from '../store/game'
import type { Slot } from '../types'

type State = ReturnType<typeof useGame.getState>

export type SceneId = 'journey' | 'forge' | 'allies' | 'party' | 'chapter'

/** Arte panorâmica do cabeçalho. Os caminhos são relativos a public/ e passam por `assetUrl`. */
export interface SceneArt {
  scene: SceneId
  src: string
  /** Versão vertical para celular (quando a composição da horizontal perde os rostos). */
  mobileSrc?: string
  /** `object-position` no desktop, onde a arte ocupa o lado direito do cabeçalho. */
  position: string
  /** `object-position` no celular, onde a arte vira uma faixa acima do texto. */
  mobilePosition: string
}

// Enquadramentos conferidos nas artes: as três cartas do Acampamento têm o lado esquerdo escuro (área de texto)
// e o assunto à direita; no wallpaper dos heróis os rostos ficam entre 12% e 45% da altura da versão vertical.
// A camp-banner.webp antiga NÃO entra aqui: ela corta o rosto do guerreiro (a nova é a camp-banner-reframed).
export const SCENE_ART: Record<Exclude<SceneId, 'chapter'>, SceneArt> = {
  journey: { scene: 'journey', src: 'assets/ui/camp/card-quote.webp', position: 'center 58%', mobilePosition: '72% 60%' },
  forge: { scene: 'forge', src: 'assets/ui/camp/card-forge.webp', position: 'right 45%', mobilePosition: '78% 45%' },
  allies: { scene: 'allies', src: 'assets/ui/camp/card-allies.webp', position: 'center 70%', mobilePosition: '70% 72%' },
  party: {
    scene: 'party',
    src: 'assets/ui/menu/heroes-wallpaper.webp',
    mobileSrc: 'assets/ui/menu/heroes-wallpaper-mobile.webp',
    position: 'center 28%',
    mobilePosition: 'center 16%',
  },
}

/** Cena do capítulo atual (as cinemáticas da história, 16:9, com o assunto no centro). */
export function chapterScene(cinematic: string | undefined): SceneArt | undefined {
  if (!cinematic) return undefined
  return { scene: 'chapter', src: `assets/story/cinematics/${cinematic}.webp`, position: 'center 45%', mobilePosition: 'center 50%' }
}

/** Talentos gerais já liberados pelo nível e ainda não escolhidos. */
export function availableTalentCount(level: number, chosen: readonly string[], talents: readonly { id: string; level: number }[]): number {
  return talents.filter((t) => level >= t.level && !chosen.includes(t.id)).length
}

export type CharacterStep = 'attributes' | 'talents' | 'equipment'

/** O que a Ficha sugere primeiro: pontos de atributo parados, depois talentos liberados, senão rever o equipamento. */
export function characterNextStep(attributePoints: number, talentsAvailable: number): { step: CharacterStep; label: string; detail: string } {
  if (attributePoints > 0) {
    return { step: 'attributes', label: 'Distribuir atributos', detail: `${attributePoints} ${attributePoints === 1 ? 'ponto disponível' : 'pontos disponíveis'}` }
  }
  if (talentsAvailable > 0) {
    return { step: 'talents', label: 'Escolher talento', detail: `${talentsAvailable} ${talentsAvailable === 1 ? 'talento liberado' : 'talentos liberados'}` }
  }
  return { step: 'equipment', label: 'Rever equipamento', detail: 'Peças vestidas e mochila' }
}

/** Ação principal da Guilda: entregar o que está pronto; sem contratos, escolher um; senão acompanhar. */
export function guildNextStep(active: number, ready: number): { label: string; detail: string } {
  if (ready > 0) return { label: 'Entregar contratos', detail: `${ready} ${ready === 1 ? 'pronto' : 'prontos'} para a recompensa` }
  if (active === 0) return { label: 'Escolher um contrato', detail: 'Nenhum contrato em andamento' }
  return { label: 'Acompanhar contratos', detail: `${active} em andamento` }
}

/** Quantas receitas da Forja o herói consegue fabricar agora (mesma regra do filtro "Só as que posso criar"). */
export function forgeReadyCount(state: State): number {
  return recipeEntries(state.heroId).filter((entry) => recipeReadiness(entry, state).canCraft).length
}

/** Peças da mochila que o herói pode vestir e que são melhores do que as vestidas (mesma comparação do saque). */
export function bagUpgrades(state: State): { ref: string; slot: Slot }[] {
  return state.equipmentBag.flatMap((ref) => {
    const cmp = compareDrop(ref, state)
    return cmp && cmp.verdict === 'better' && cmp.block.ok ? [{ ref, slot: cmp.slot }] : []
  })
}

/** Total de consumíveis na mochila (soma das quantidades) e quantos tipos diferentes. */
export function consumableTotals(inventory: Record<string, number>): { total: number; kinds: number } {
  const counts = Object.values(inventory).filter((n) => n > 0)
  return { total: counts.reduce((sum, n) => sum + n, 0), kinds: counts.length }
}
