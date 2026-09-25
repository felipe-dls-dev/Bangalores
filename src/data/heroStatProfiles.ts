// Perfis de atributos das nove classes e TODAS as constantes de balanceamento dos atributos.
//
// Nada aqui depende do estado do jogo: é dado puro, lido por src/store/heroStats.ts (fórmulas), pelo
// store (game.ts), pelo coop e pela interface. Trocar um número aqui muda o jogo inteiro de uma vez e a
// carta/ficha mostram o resultado, porque as duas leem as mesmas fórmulas.
//
// Modelo (decisões de produto aprovadas):
//   forca    ataques físicos                                   magia   ataques mágicos, cura, escudos e reforços
//   vigor    Vida Máxima + resistência a elementos e a efeitos  destreza esquiva derivada e iniciativa
//   vidaMaxima e energiaMaxima são derivados; armadura vem SÓ de equipamentos, gemas e efeitos de equipamento.

export type PrimaryAttributeKey = 'forca' | 'magia' | 'vigor' | 'destreza'
export const PRIMARY_ATTRIBUTES: readonly PrimaryAttributeKey[] = ['forca', 'magia', 'vigor', 'destreza']

export interface PrimaryAttributes {
  forca: number
  magia: number
  vigor: number
  destreza: number
}

export const NO_ATTRIBUTES: Readonly<PrimaryAttributes> = Object.freeze({ forca: 0, magia: 0, vigor: 0, destreza: 0 })

export const ATTRIBUTE_LABELS: Record<PrimaryAttributeKey, string> = { forca: 'Força', magia: 'Magia', vigor: 'Vigor', destreza: 'Destreza' }

/** O que cada atributo faz, em uma frase (ficha, dica e tela de detalhes). */
export const ATTRIBUTE_HINTS: Record<PrimaryAttributeKey, string> = {
  forca: 'Aumenta o dano dos ataques físicos.',
  magia: 'Aumenta o dano dos ataques mágicos e a força de curas, escudos e reforços.',
  vigor: 'Aumenta a Vida Máxima e a resistência a elementos e a efeitos negativos.',
  destreza: 'Aumenta a chance de esquiva e a iniciativa.',
}

export type BasicAttackType = 'fisico' | 'magico' | 'hibrido'
export type AbilityScale = 'fisica' | 'magica' | 'hibrida' | 'utilidade'
export type HeroFunction = 'Linha de frente' | 'Dano' | 'Suporte' | 'Invocador'

export interface HeroAbilityProfile {
  nome: string
  /** Como a habilidade escala. */
  escala: AbilityScale
  /** Atributo que aumenta a potência da habilidade (cura, reforço, dano extra). */
  atributoEscala: PrimaryAttributeKey
  /** Energia gasta a cada uso (o Conjurador paga por fera invocada). */
  custoEnergia: number
  /** Até três etiquetas curtas para a carta. */
  tags: [string, string, string]
}

export interface HeroStatProfile {
  id: string
  funcao: HeroFunction
  /** Atributos no nível 1, antes de pontos, equipamento e bônus. */
  base: PrimaryAttributes
  /** Crescimento automático por nível (fracionário: o valor usado é o piso). Os pontos por nível continuam à parte. */
  crescimento: PrimaryAttributes
  /** Vida Máxima = vidaBase + vigor × VIGOR_VIDA_POR_PONTO + bônus de equipamento e afins. */
  vidaBase: number
  energiaBase: number
  energiaCrescimento: number
  ataqueBasico: BasicAttackType
  habilidade: HeroAbilityProfile
  /** Esquiva passiva da classe (Caçadora e Caçador), somada à derivada da Destreza, dentro do teto. */
  esquivaPassiva: number
  /** Etiquetas curtas de estilo de jogo. */
  estilo: [string, string, string]
}

// ---------------------------------------------------------------------------------------------
// Constantes de balanceamento (todas as fórmulas leem daqui)
// ---------------------------------------------------------------------------------------------
export const ATTRIBUTE_RULES = {
  /** Pontos de atributo ganhos por nível (regra do jogo, não muda com a classe). */
  pontosPorNivel: 1,
  /** 1 ponto de Força/Magia soma 1 no poder do ataque básico (mesma régua do antigo "Ataque"). */
  poderPorPonto: 1,
  /** Vida Máxima ganha por ponto de Vigor. */
  vigorVidaPorPonto: 2,
  /**
   * Resistência a elemento e a efeitos por Vigor: resist = teto × v / (v + meio).
   * Retorno decrescente: dobrar o Vigor NÃO dobra a resistência, e nunca passa do teto.
   */
  resistenciaElemental: { teto: 0.5, meio: 40 },
  resistenciaEfeitos: { teto: 0.5, meio: 40 },
  /**
   * Esquiva por Destreza: esquiva = teto × d / (d + meio). O teto vale para a esquiva TOTAL
   * (Destreza + passiva da classe + esquiva forjada): não existe esquiva infinita.
   */
  esquiva: { tetoDestreza: 0.35, meio: 30, tetoTotal: 0.45 },
  /**
   * Armadura → mitigação de dano físico (em pontos "planos", a mesma régua da antiga Defesa):
   *   mitigacao = inclinacao × a / (1 + a / joelho)
   * Sobe rápido no começo (as primeiras peças importam) e achata depois; nunca passa de
   * inclinacao × joelho, então nenhuma Armadura torna o herói invulnerável (e todo golpe ainda causa
   * pelo menos 1 de dano antes dos dados).
   */
  armadura: { inclinacao: 2, joelho: 40 },
  /** Iniciativa: chance extra (em pontos percentuais por Destreza) de agir primeiro no solo. */
  iniciativa: { porPonto: 0.004, teto: 0.2 },
  /** Cada ponto do atributo de escala acima do valor inicial da classe aumenta a habilidade em tanto. */
  potenciaHabilidade: { porPonto: 0.04, teto: 2 },
  /** Energia: começa cheia e regenera por rodada (nunca fica negativa nem passa do máximo). */
  energia: { regeneracaoPorRodada: 2 },
  /** Fatores do Poder exibido na carta (mesma régua que o orçamento de inimigos: vida/2 + ataque + defesa). */
  poder: { escala: 10, vidaPeso: 0.5, secundarioPeso: 0.5, destrezaPeso: 0.25, energiaPeso: 0.25 },
} as const

// ---------------------------------------------------------------------------------------------
// Perfis das nove classes
// ---------------------------------------------------------------------------------------------
// Como os números foram escolhidos (documentação do balanceamento):
//  • forca/magia principal = o antigo "Ataque" da classe (3, 5, 6, 2, 4, 5, 4, 3, 4): o dano dos primeiros
//    níveis fica igual ao de antes;
//  • vigor = o antigo "Defesa" da classe, ajustado: agora ele dá Vida e resistências, não abate dano;
//  • vidaBase = Vida antiga − vigor × 2, então a Vida inicial de cada classe não mudou;
//  • destreza é nova: pequena no começo (esquiva ≈ 2–6%), cresce com pontos e equipamento;
//  • a mitigação de dano que antes vinha da Defesa da classe agora vem da Armadura dos equipamentos
//    (curva em ATTRIBUTE_RULES.armadura), calibrada para o kit inicial ficar perto do valor antigo.
const attrs = (forca: number, magia: number, vigor: number, destreza: number): PrimaryAttributes => ({ forca, magia, vigor, destreza })

export const HERO_STAT_PROFILES: Record<string, HeroStatProfile> = {
  guerreiro: {
    id: 'guerreiro',
    funcao: 'Linha de frente',
    base: attrs(3, 1, 6, 3),
    crescimento: attrs(0.12, 0, 0.1, 0.04),
    vidaBase: 6,
    energiaBase: 10,
    energiaCrescimento: 0.05,
    ataqueBasico: 'fisico',
    habilidade: { nome: 'Ímpeto Marcial', escala: 'fisica', atributoEscala: 'forca', custoEnergia: 10, tags: ['Reforço', 'Medo', 'Sangramento'] },
    esquivaPassiva: 0,
    estilo: ['Equilibrado', 'Intimida', 'Sangramento'],
  },
  guardiao: {
    id: 'guardiao',
    funcao: 'Linha de frente',
    base: attrs(2, 1, 7, 2),
    crescimento: attrs(0.08, 0, 0.14, 0.02),
    vidaBase: 6,
    energiaBase: 10,
    energiaCrescimento: 0.05,
    ataqueBasico: 'fisico',
    habilidade: { nome: 'Provocar', escala: 'utilidade', atributoEscala: 'vigor', custoEnergia: 10, tags: ['Provoca', 'Proteção', 'Muralha'] },
    esquivaPassiva: 0,
    estilo: ['Provoca', 'Muralha', 'Resistente'],
  },
  cacadora: {
    id: 'cacadora',
    funcao: 'Dano',
    base: attrs(5, 1, 3, 5),
    crescimento: attrs(0.12, 0, 0.06, 0.12),
    vidaBase: 14,
    energiaBase: 10,
    energiaCrescimento: 0.05,
    ataqueBasico: 'fisico',
    habilidade: { nome: 'Ataque Duplo', escala: 'fisica', atributoEscala: 'destreza', custoEnergia: 10, tags: ['Golpe duplo', 'Esquiva', 'Ágil'] },
    esquivaPassiva: 0.2,
    estilo: ['Esquiva', 'Ataque duplo', 'Ágil'],
  },
  arcanista: {
    id: 'arcanista',
    funcao: 'Dano',
    base: attrs(1, 6, 3, 3),
    crescimento: attrs(0, 0.14, 0.05, 0.04),
    vidaBase: 12,
    energiaBase: 12,
    energiaCrescimento: 0.08,
    ataqueBasico: 'magico',
    habilidade: { nome: 'Ascensão Arcana', escala: 'magica', atributoEscala: 'magia', custoEnergia: 10, tags: ['Dados +1', 'Reforço', 'Grupo'] },
    esquivaPassiva: 0,
    estilo: ['Dados +1', 'Poder de ataque', 'Ofensivo'],
  },
  druida: {
    id: 'druida',
    funcao: 'Suporte',
    base: attrs(1, 4, 4, 3),
    crescimento: attrs(0, 0.12, 0.1, 0.04),
    vidaBase: 12,
    energiaBase: 12,
    energiaCrescimento: 0.08,
    ataqueBasico: 'magico',
    habilidade: { nome: 'Brisa Revigorante', escala: 'magica', atributoEscala: 'magia', custoEnergia: 8, tags: ['Cura', 'Purifica', 'Enfraquece'] },
    esquivaPassiva: 0,
    estilo: ['Cura', 'Purifica', 'Enfraquece'],
  },
  cacador: {
    id: 'cacador',
    funcao: 'Dano',
    base: attrs(5, 1, 4, 5),
    crescimento: attrs(0.12, 0, 0.08, 0.1),
    vidaBase: 10,
    energiaBase: 10,
    energiaCrescimento: 0.05,
    ataqueBasico: 'fisico',
    habilidade: { nome: 'Marca do Predador', escala: 'fisica', atributoEscala: 'destreza', custoEnergia: 8, tags: ['Crítico', 'Grupo', 'Esquiva'] },
    esquivaPassiva: 0.2,
    estilo: ['Crítico', 'Esquiva', 'Grupo'],
  },
  monge: {
    id: 'monge',
    funcao: 'Dano',
    base: attrs(4, 3, 5, 4),
    crescimento: attrs(0.1, 0.06, 0.1, 0.08),
    vidaBase: 8,
    energiaBase: 10,
    energiaCrescimento: 0.05,
    ataqueBasico: 'hibrido',
    habilidade: { nome: 'Golpe Flamejante', escala: 'hibrida', atributoEscala: 'forca', custoEnergia: 10, tags: ['Fervor', 'Fogo', 'Golpe'] },
    esquivaPassiva: 0,
    estilo: ['Fervor', 'Fogo', 'Golpe flamejante'],
  },
  sacerdotisa: {
    id: 'sacerdotisa',
    funcao: 'Suporte',
    base: attrs(1, 3, 5, 2),
    crescimento: attrs(0, 0.1, 0.12, 0.02),
    vidaBase: 10,
    energiaBase: 12,
    energiaCrescimento: 0.08,
    ataqueBasico: 'magico',
    habilidade: { nome: 'Bênção da Vida', escala: 'magica', atributoEscala: 'magia', custoEnergia: 10, tags: ['Protege', 'Reanima', 'Cura'] },
    esquivaPassiva: 0,
    estilo: ['Reanima', 'Protege', 'Recupera vida'],
  },
  conjurador: {
    id: 'conjurador',
    funcao: 'Invocador',
    base: attrs(1, 4, 3, 3),
    crescimento: attrs(0, 0.14, 0.08, 0.04),
    vidaBase: 16,
    energiaBase: 12,
    energiaCrescimento: 0.08,
    ataqueBasico: 'magico',
    habilidade: { nome: 'Conjurar Fera Espectral', escala: 'hibrida', atributoEscala: 'magia', custoEnergia: 6, tags: ['Fera', 'Intercepta', 'Invoca'] },
    esquivaPassiva: 0,
    estilo: ['Fera espectral', 'Escolhas', 'Cura por fera'],
  },
}

export const FALLBACK_HERO_PROFILE: HeroStatProfile = HERO_STAT_PROFILES.guerreiro

export function heroStatProfile(heroId?: string): HeroStatProfile {
  return (heroId && HERO_STAT_PROFILES[heroId]) || FALLBACK_HERO_PROFILE
}

/** Para onde vai o antigo "Ataque" (equipamento, gema, talento) de cada classe. */
export function offensiveTargets(type: BasicAttackType): PrimaryAttributeKey[] {
  return type === 'fisico' ? ['forca'] : type === 'magico' ? ['magia'] : ['forca', 'magia']
}

/** Atributo principal de ataque da classe (destino da migração do antigo Ataque). */
export function primaryOffense(profile: HeroStatProfile): 'forca' | 'magia' {
  return profile.ataqueBasico === 'magico' ? 'magia' : 'forca'
}

/** Como o antigo "Ataque" de um item aparece para a classe: Força, Magia ou os dois (híbrido). */
export function offenseLabel(heroId?: string): string {
  const type = heroStatProfile(heroId).ataqueBasico
  return type === 'fisico' ? 'Força' : type === 'magico' ? 'Magia' : 'Força/Magia'
}

/** Versão curta para chips e diferenças de comparação. */
export function offenseShort(heroId?: string): string {
  const type = heroStatProfile(heroId).ataqueBasico
  return type === 'fisico' ? 'FOR' : type === 'magico' ? 'MAG' : 'F/M'
}
