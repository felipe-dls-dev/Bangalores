// Dados da seleção de herói do modo Moderno. Funções puras: a tela (HeroSelectModern.tsx) só desenha
// o que sai daqui, o que deixa tudo testável sem navegador.
//
// Os atributos (vida, ataque, defesa) e o texto da habilidade vêm de src/data/herois.json. O que o JSON
// não tem (papel, marcas de estilo e dificuldade) é texto editorial nosso, escrito a partir da habilidade
// de cada classe: descreve o quanto o kit exige decisões do jogador, não é um número medido.

export type HeroRole = 'Linha de frente' | 'Dano' | 'Suporte' | 'Invocador'

export interface HeroProfile {
  role: HeroRole
  /** Três palavras que resumem o estilo de jogo. */
  tags: [string, string, string]
  /** 1 = simples, 2 = moderada, 3 = exigente (quantas decisões o kit pede). */
  difficulty: 1 | 2 | 3
  /** Boa primeira escolha para quem nunca jogou. */
  beginner?: boolean
  /** Uma frase sobre como a classe joga. */
  playstyle: string
}

export const HERO_PROFILES: Record<string, HeroProfile> = {
  guerreiro: {
    role: 'Linha de frente',
    tags: ['Equilibrado', 'Intimida', 'Sangramento'],
    difficulty: 1,
    beginner: true,
    playstyle: 'Aguenta bem e bate forte. Um bom ponto de partida: quase não exige decisões.',
  },
  guardiao: {
    role: 'Linha de frente',
    tags: ['Provoca', 'Muralha', 'Resistente'],
    difficulty: 1,
    beginner: true,
    playstyle: 'Tem a maior defesa entre os heróis e puxa os ataques inimigos para si.',
  },
  cacadora: {
    role: 'Dano',
    tags: ['Esquiva', 'Ataque duplo', 'Ágil'],
    difficulty: 2,
    playstyle: 'Frágil, mas desvia de golpes e ataca duas vezes no mesmo turno.',
  },
  arcanista: {
    role: 'Dano',
    tags: ['Dados +1', 'Poder de ataque', 'Ofensivo'],
    difficulty: 2,
    playstyle: 'O maior ataque base. Fortalece os dados e o poder de fogo, mas aguenta pouco.',
  },
  monge: {
    role: 'Dano',
    tags: ['Fervor', 'Fogo', 'Golpe flamejante'],
    difficulty: 2,
    playstyle: 'Golpes fortes acumulam Fervor e o Golpe Flamejante deixa o inimigo queimando.',
  },
  druida: {
    role: 'Suporte',
    tags: ['Cura', 'Purifica', 'Enfraquece'],
    difficulty: 2,
    playstyle: 'Recupera vida, remove efeitos ruins e ainda reduz os dados do inimigo.',
  },
  sacerdotisa: {
    role: 'Suporte',
    tags: ['Reanima', 'Protege', 'Recupera vida'],
    difficulty: 2,
    playstyle: 'Sobrevive a uma derrota por batalha e recupera vida ao se defender.',
  },
  cacador: {
    role: 'Dano',
    tags: ['Crítico', 'Esquiva', 'Grupo'],
    difficulty: 3,
    playstyle: 'Vive de acertos críticos: pede que você escolha bem o momento de usar a habilidade.',
  },
  conjurador: {
    role: 'Invocador',
    tags: ['Fera espectral', 'Escolhas', 'Cura por fera'],
    difficulty: 3,
    playstyle: 'Luta ao lado de uma fera que você escolhe a cada batalha. Mais opções, mais decisões.',
  },
}

const FALLBACK_PROFILE: HeroProfile = {
  role: 'Dano',
  tags: ['Versátil', 'Equilibrado', 'Adaptável'],
  difficulty: 2,
  playstyle: 'Um herói equilibrado.',
}

export function heroProfile(heroId: string): HeroProfile {
  return HERO_PROFILES[heroId] ?? FALLBACK_PROFILE
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

export interface StatBar {
  id: 'vida' | 'ataque' | 'defesa'
  label: string
  value: number
  /** 0–100, relativo ao maior valor entre todos os heróis (a barra compara os heróis entre si). */
  percent: number
}

type StatSource = { vida: number; ataque: number; defesa?: number }

/** Barras de Vida, Ataque e Defesa, cada uma normalizada pelo maior valor entre todos os heróis. */
export function statBars(hero: StatSource, all: readonly StatSource[]): StatBar[] {
  const max = (pick: (h: StatSource) => number) => Math.max(1, ...all.map(pick))
  const bar = (id: StatBar['id'], label: string, value: number, top: number): StatBar => ({
    id,
    label,
    value,
    percent: Math.max(6, Math.round((value / top) * 100)),
  })
  return [
    bar('vida', 'Vida', hero.vida, max((h) => h.vida)),
    bar('ataque', 'Ataque', hero.ataque, max((h) => h.ataque)),
    bar('defesa', 'Defesa', hero.defesa ?? 0, max((h) => h.defesa ?? 0)),
  ]
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
