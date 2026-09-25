// Dados da seleção de herói do modo Moderno. Funções puras: a tela (HeroSelectModern.tsx) só desenha
// o que sai daqui, o que deixa tudo testável sem navegador.
//
// Os atributos vêm de src/data/heroStatProfiles.ts (e a função e as etiquetas de estilo também) e o texto da
// habilidade de src/data/herois.json. Aqui fica só o que é editorial: dificuldade, "boa para começar" e a frase
// de estilo de jogo. A dificuldade descreve o quanto o kit exige decisões do jogador, não é um número medido.
import { HERO_STAT_PROFILES, type HeroFunction } from '../data/heroStatProfiles'

export type HeroRole = HeroFunction

export interface HeroEditorial {
  /** 1 = simples, 2 = moderada, 3 = exigente (quantas decisões o kit pede). */
  difficulty: 1 | 2 | 3
  /** Boa primeira escolha para quem nunca jogou. */
  beginner?: boolean
  /** Uma frase sobre como a classe joga. */
  playstyle: string
}

export interface HeroProfile extends HeroEditorial {
  /** Função na equipe (vem do perfil de atributos). */
  role: HeroRole
  /** Três palavras que resumem o estilo de jogo (vêm do perfil de atributos). */
  tags: [string, string, string]
}

/** Só a parte editorial; função e etiquetas são derivadas de HERO_STAT_PROFILES em heroProfile(). */
export const HERO_EDITORIAL: Record<string, HeroEditorial> = {
  guerreiro: {
    difficulty: 1,
    beginner: true,
    playstyle: 'Aguenta bem e bate forte. Um bom ponto de partida: quase não exige decisões.',
  },
  guardiao: {
    difficulty: 1,
    beginner: true,
    playstyle: 'Tem o maior Vigor entre os heróis e puxa os ataques inimigos para si.',
  },
  cacadora: {
    difficulty: 2,
    playstyle: 'Frágil, mas desvia de golpes e ataca duas vezes no mesmo turno.',
  },
  arcanista: {
    difficulty: 2,
    playstyle: 'O maior poder mágico. Fortalece os dados e o poder de fogo, mas aguenta pouco.',
  },
  monge: {
    difficulty: 2,
    playstyle: 'Golpes fortes acumulam Fervor e o Golpe Flamejante deixa o inimigo queimando.',
  },
  druida: {
    difficulty: 2,
    playstyle: 'Recupera vida, remove efeitos ruins e ainda reduz os dados do inimigo.',
  },
  sacerdotisa: {
    difficulty: 2,
    playstyle: 'Sobrevive a uma derrota por batalha e recupera vida ao se defender.',
  },
  cacador: {
    difficulty: 3,
    playstyle: 'Vive de acertos críticos: pede que você escolha bem o momento de usar a habilidade.',
  },
  conjurador: {
    difficulty: 3,
    playstyle: 'Luta ao lado de uma fera que você escolhe a cada batalha. Mais opções, mais decisões.',
  },
}

const FALLBACK_EDITORIAL: HeroEditorial = { difficulty: 2, playstyle: 'Um herói equilibrado.' }

export function heroProfile(heroId: string): HeroProfile {
  const stat = HERO_STAT_PROFILES[heroId]
  return {
    ...(HERO_EDITORIAL[heroId] ?? FALLBACK_EDITORIAL),
    role: stat?.funcao ?? 'Dano',
    tags: stat?.estilo ?? ['Versátil', 'Equilibrado', 'Adaptável'],
  }
}

export const DIFFICULTY_LABEL: Record<HeroProfile['difficulty'], string> = { 1: 'Simples', 2: 'Moderada', 3: 'Exigente' }

/** Separa o texto "Passivo: ... Ativo: ..." da habilidade em duas partes (qualquer uma pode faltar). */
export function splitAbility(text: string): { passive?: string; active?: string } {
  const clean = text.trim()
  const activeAt = clean.search(/Ativo\b/)
  const passiveAt = clean.search(/Passivo\b/)
  const strip = (part: string, label: RegExp) => {
    const body = part.replace(label, '').replace(/^[\s:—-]+/, '').trim()
    return body.charAt(0).toUpperCase() + body.slice(1)
  }
  if (passiveAt === -1 && activeAt === -1) return { active: clean }
  const passive = passiveAt === -1 ? undefined : strip(clean.slice(passiveAt, activeAt > passiveAt ? activeAt : undefined), /^Passivo/)
  const active = activeAt === -1 ? undefined : strip(clean.slice(activeAt, passiveAt > activeAt ? passiveAt : undefined), /^Ativo/)
  return { passive: passive || undefined, active: active || undefined }
}

/** Primeira frase do texto, para o resumo curto (o texto completo fica atrás de "ver detalhes"). */
export function firstSentence(text: string, max = 160): string {
  const sentence = text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text
  return sentence.length > max ? `${sentence.slice(0, max - 1).trimEnd()}…` : sentence
}

export const HERO_SELECT_ART = (heroId: string) => ({
  figure: `assets/ui/select/${heroId}-figure.webp`,
  thumb: `assets/ui/select/${heroId}-thumb.webp`,
})

/** Índice do herói vizinho na fileira, dando a volta nas pontas. */
export function stepIndex(current: number, delta: number, length: number): number {
  if (length <= 0) return 0
  return (((current + delta) % length) + length) % length
}
