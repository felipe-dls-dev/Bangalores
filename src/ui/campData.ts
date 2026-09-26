// Dados do Acampamento (hub do modo Moderno). Só funções puras sobre o estado do jogo: a tela
// (CampScreen.tsx) apenas desenha o que sai daqui, o que deixa tudo testável sem navegador.

import { STORY_CHAPTERS } from '../data/expansion'
import { deriveLevel, storyRequirementProgress } from '../store/game'

type StoryState = Parameters<typeof storyRequirementProgress>[0]

export const CAMP_BANNER = 'assets/ui/camp/camp-banner-reframed.webp'
export const CAMP_BANNER_MOBILE = 'assets/ui/camp/camp-banner-mobile.webp'
export const CAMP_CARD_ART = {
  forge: 'assets/ui/camp/card-forge.webp',
  allies: 'assets/ui/camp/card-allies.webp',
  quote: 'assets/ui/camp/card-quote.webp',
} as const

/** Capítulo atual da história e o progresso do objetivo dele. */
export function campChapter(state: StoryState) {
  const chapter = STORY_CHAPTERS.find((c) => c.id === state.storyChapterId) ?? STORY_CHAPTERS[0]
  const progress = storyRequirementProgress(state)
  return {
    chapter,
    act: chapter.act,
    title: chapter.title,
    region: chapter.region,
    dialogue: chapter.dialogue,
    objective: chapter.requirement?.label ?? 'Escolha o seu caminho',
    current: Math.min(progress.current, progress.required),
    required: progress.required,
    complete: progress.complete,
  }
}

/** Nível e barra de experiência do herói. */
export function xpProgress(xp: number) {
  const info = deriveLevel(xp)
  return {
    level: info.lvl,
    progress: info.progress,
    next: info.next,
    pct: Math.min(100, Math.max(0, (info.progress / info.next) * 100)),
  }
}

/** "14h 32m", "32m" ou "menos de 1 min". */
export function formatCountdown(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 60_000) return 'menos de 1 min'
  const totalMinutes = Math.floor(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours > 0 ? `${hours}h ${String(minutes).padStart(2, '0')}m` : `${minutes}m`
}

const DAILY_REWARD_COOLDOWN_MS = 20 * 60 * 60 * 1000 // igual a claimDailyReward em game.ts

/** Provisão diária: disponível a cada 20 horas depois da última coleta. */
export function dailyRewardState(claimedAt: number | undefined, now: number) {
  const elapsed = now - (claimedAt ?? 0)
  const eligible = elapsed >= DAILY_REWARD_COOLDOWN_MS
  return { eligible, hoursLeft: eligible ? 0 : Math.max(1, Math.ceil((DAILY_REWARD_COOLDOWN_MS - elapsed) / 3_600_000)) }
}

/** Para onde "Continuar expedição" leva: exploração em andamento volta para ela; senão, o mapa. */
export function continueTarget(state: { subregionId?: string }): 'region' | 'map' {
  return state.subregionId ? 'region' : 'map'
}

export const CAMP_QUOTES = [
  'Toda grande conquista começa em um acampamento.',
  'Grandes histórias são escritas por aqueles que não viajam sozinhos.',
  'A estrada é longa, mas o fogo do acampamento aquece até o mais cansado herói.',
  'Ninguém vence Havendown sozinho: chame seus aliados.',
  'Descanse hoje. Amanhã o reino volta a precisar de você.',
] as const

/** Frase do dia (muda a cada dia local; `dayKey` é o índice do dia). */
export function campQuote(dayKey: number): string {
  const n = CAMP_QUOTES.length
  return CAMP_QUOTES[((Math.floor(dayKey) % n) + n) % n]
}
