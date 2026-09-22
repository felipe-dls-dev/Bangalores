/**
 * battleSprites.ts
 *
 * Motor de dados e regras visuais para o modo "Carta Virada + Lutadores Animados"
 * conforme especificado em docs/BATTLE_SPRITE_PROMPTS.md.
 */

export type BattleAnimationState =
  | 'idle'
  | 'stance_offensive'
  | 'stance_defensive'
  | 'attack'
  | 'heavy'
  | 'defend'
  | 'hit'
  | 'dodge'
  | 'potion'
  | 'skill'
  | 'ultimate'
  | 'victory'
  | 'defeat'

export type BattleViewMode = 'cards' | 'sprites'

export interface SpriteStateConfig {
  frames: number
  loop: boolean
  holdLastFrame?: boolean
  fps: number
  durationMs?: number
  /**
   * Peso relativo de cada quadro dentro de durationMs (um valor por quadro). Sem isso todos os
   * quadros duram o mesmo; com isso a preparação pode ser lenta e o corte rápido.
   */
  frameWeights?: number[]
}

/**
 * Tabela oficial de configurações de estados de animação
 * extraída diretamente da tabela de BATTLE_SPRITE_PROMPTS.md.
 */
export const BATTLE_ANIMATION_CONFIG: Record<BattleAnimationState, SpriteStateConfig> = {
  idle: { frames: 6, loop: true, fps: 8 },
  stance_offensive: { frames: 6, loop: true, fps: 8 },
  stance_defensive: { frames: 6, loop: true, fps: 8 },
  attack: { frames: 8, loop: false, fps: 4, durationMs: 2000 },
  heavy: { frames: 10, loop: false, fps: 5, durationMs: 2000 },
  defend: { frames: 5, loop: false, fps: 10 },
  hit: { frames: 4, loop: false, fps: 10 },
  dodge: { frames: 5, loop: false, fps: 12 },
  potion: { frames: 7, loop: false, fps: 10 },
  skill: { frames: 10, loop: false, fps: 12 },
  ultimate: { frames: 12, loop: false, fps: 12 },
  victory: { frames: 8, loop: false, holdLastFrame: true, fps: 8 },
  defeat: { frames: 8, loop: false, holdLastFrame: true, fps: 8 },
}

/**
 * Sobrescritas especializadas para guerreiro com base nos pacotes de alta fidelidade de Bases/
 */
export const WARRIOR_ANIMATION_OVERRIDES: Partial<Record<BattleAnimationState, SpriteStateConfig>> = {
  idle: { frames: 12, loop: true, fps: 8 },
  // preparação (5) -> corte (4) -> recuperação (3)
  attack: {
    frames: 12, loop: false, fps: 8, durationMs: 1800,
    frameWeights: [1.3, 1.1, 1, 1, 1, 0.55, 0.45, 0.45, 0.6, 1, 1.2, 1.4],
  },
  // preparação (4) -> golpe (4) -> impacto/poeira (4) -> recuperação (5)
  heavy: {
    frames: 17, loop: false, fps: 8, durationMs: 2200,
    frameWeights: [1.3, 1, 1, 1, 0.55, 0.5, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1, 1, 1, 1.1, 1.3],
  },
  defend: { frames: 12, loop: false, fps: 9, durationMs: 1400 },
  hit: { frames: 12, loop: false, fps: 9, durationMs: 1400 },
  // salto (5) -> giro (4) -> impacto (4) -> pilar de luz (4, segura o último)
  ultimate: {
    frames: 17, loop: false, fps: 7, durationMs: 2400,
    frameWeights: [1.2, 1, 1, 1, 1, 0.6, 0.5, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.3, 1.5, 1.7, 2.2],
  },
}

/**
 * Sobrescritas do druida (folhas de Bases/ em scripts/extract_druid_bases.py). Contagens de quadros
 * vêm das folhas: Descanso 6, Ataque 8, Ataque_Critico 9, Ultimate 12, Defesa 8.
 */
export const DRUID_ANIMATION_OVERRIDES: Partial<Record<BattleAnimationState, SpriteStateConfig>> = {
  idle: { frames: 6, loop: true, fps: 6 },
  // preparação (3) -> golpe + crescente (2) -> recuperação (3)
  attack: {
    frames: 8, loop: false, fps: 8, durationMs: 1800,
    frameWeights: [1.3, 1, 1, 0.6, 0.55, 0.8, 1, 1.3],
  },
  // preparação (3) -> orbe carregando (1) -> golpe + crescente (1) -> recuperação (4)
  heavy: {
    frames: 9, loop: false, fps: 8, durationMs: 2000,
    frameWeights: [1.2, 1, 1.2, 1, 1.4, 0.55, 0.8, 1, 1.2],
  },
  // guarda (2) -> faíscas (1) -> escudo crescendo 35% e 65% (2) -> escudo cheio, segura mais (1)
  // -> dissipa (1) -> retorno (1)
  defend: {
    frames: 8, loop: false, fps: 10, durationMs: 1100,
    frameWeights: [0.7, 0.7, 0.7, 0.7, 0.8, 1.6, 0.9, 1],
  },
  hit: {
    frames: 8, loop: false, fps: 10, durationMs: 1100,
    frameWeights: [0.7, 0.7, 0.7, 0.7, 0.8, 1.6, 0.9, 1],
  },
  // raízes (3) -> aura de galhos (3) -> liberação + crescente (3) -> recuperação (3)
  ultimate: {
    frames: 12, loop: false, fps: 8, durationMs: 2600,
    frameWeights: [1.2, 1, 1.1, 1, 1, 1.3, 1, 0.55, 0.55, 0.8, 0.9, 1.3],
  },
}

/**
 * Sobrescritas da Caçadora (Ladino, no estilo dos prompts) com base nas folhas de Bases/
 * (scripts/extract_rogue_bases.py). Contagens de quadros vêm das folhas: Descanso 6, Ataque 8,
 * Critico 10, Ultimate 12, Defesa 6 (a única que não bate com o padrão de `defend`/`hit`, 5/4).
 */
export const ROGUE_ANIMATION_OVERRIDES: Partial<Record<BattleAnimationState, SpriteStateConfig>> = {
  idle: { frames: 6, loop: true, fps: 7 },
  // guarda (2) -> avanço + dois cortes (3) -> extensão total (1) -> recuperação (2)
  attack: {
    frames: 8, loop: false, fps: 8, durationMs: 1600,
    frameWeights: [1.2, 1.1, 0.9, 0.6, 0.55, 0.7, 1, 1.2],
  },
  // guarda + agachamento (3) -> dash + corte + giro (3) -> impacto crítico (1) -> recuperação (3)
  heavy: {
    frames: 10, loop: false, fps: 8, durationMs: 1900,
    frameWeights: [1.1, 1, 0.9, 0.55, 0.5, 0.5, 0.6, 0.8, 1, 1.2],
  },
  // guarda (1) -> recuo (1) -> adagas sobem (1) -> contato do parry, brilho (1) -> absorção (1) -> retorno (1)
  defend: {
    frames: 6, loop: false, fps: 10, durationMs: 1000,
    frameWeights: [0.8, 0.8, 0.9, 1.3, 1, 0.9],
  },
  hit: {
    frames: 6, loop: false, fps: 10, durationMs: 1000,
    frameWeights: [0.8, 0.8, 0.9, 1.3, 1, 0.9],
  },
  // carga sombria (3) -> shadow-step + dois cortes (3) -> multi-strike + impacto crítico (2) -> recuperação (4)
  ultimate: {
    frames: 12, loop: false, fps: 7, durationMs: 2400,
    frameWeights: [1.2, 1, 1.1, 1, 1, 1.3, 1, 0.55, 0.6, 0.9, 1, 1.3],
  },
}

const HERO_ANIMATION_OVERRIDES: Record<string, Partial<Record<BattleAnimationState, SpriteStateConfig>>> = {
  guerreiro: WARRIOR_ANIMATION_OVERRIDES,
  druida: DRUID_ANIMATION_OVERRIDES,
  cacadora: ROGUE_ANIMATION_OVERRIDES,
}

/**
 * Duração de um quadro em ms. Com frameWeights, reparte durationMs proporcionalmente; sem, divide
 * igualmente; sem durationMs, usa o fps.
 */
export function getFrameDurationMs(cfg: SpriteStateConfig, frameIndex: number): number {
  if (!cfg.durationMs) return 1000 / Math.max(1, cfg.fps)
  const weights = cfg.frameWeights
  if (weights && weights.length === cfg.frames) {
    const total = weights.reduce((sum, w) => sum + w, 0)
    return (cfg.durationMs * (weights[frameIndex] ?? 1)) / total
  }
  return cfg.durationMs / Math.max(1, cfg.frames)
}

/**
 * Reprodução de um lutador (usada por BattleSpriteActor). O jogo PEDE um estado (`requested`) e o
 * mantém ligado enquanto durar o turno, que costuma ser mais longo que a animação. Ações de uma
 * execução só (ataque, defesa, golpe supremo...) tocam UMA vez por pedido: ao terminar, o lutador
 * volta ao repouso e só repete se o pedido sair e voltar. Repouso, posturas e vitória/derrota
 * mantêm o comportamento próprio (loop / segurar o último quadro).
 */
export interface SpritePlayback {
  /** Ação de uma execução em andamento: segue até o fim mesmo que o pedido do jogo mude. */
  locked: BattleAnimationState | null
  /** Ação já executada para o pedido atual: o pedido continua ativo, mas não repete. */
  spent: BattleAnimationState | null
  frame: number
}

export const INITIAL_SPRITE_PLAYBACK: SpritePlayback = { locked: null, spent: null, frame: 0 }

/** Ação que toca uma vez e acaba (não é loop nem segura o último quadro). */
export function isOneShotConfig(cfg: SpriteStateConfig): boolean {
  return !cfg.loop && !cfg.holdLastFrame
}

/** O pedido do jogo mudou (ou o componente montou). Um pedido novo de ação começa do quadro 0. */
export function playbackOnRequest(pb: SpritePlayback, requested: BattleAnimationState, oneShot: boolean): SpritePlayback {
  // derrota tem prioridade absoluta: corta qualquer ação em andamento
  if (requested === 'defeat') return { locked: null, spent: null, frame: 0 }
  if (oneShot) return { locked: requested, spent: null, frame: 0 }
  // repouso/postura/vitória: deixa uma ação em andamento terminar; sem ação, recomeça do quadro 0
  return pb.locked ? { ...pb, spent: null } : { locked: null, spent: null, frame: 0 }
}

/** Estado que aparece na tela: a ação em andamento; ação já gasta com o pedido ainda ativo vira repouso. */
export function getDisplayedSpriteState(
  pb: SpritePlayback,
  requested: BattleAnimationState,
  resting: BattleAnimationState
): BattleAnimationState {
  if (pb.locked) return pb.locked
  return pb.spent === requested ? resting : requested
}

/** O relógio dos quadros avançou. `cfg` é a configuração do estado exibido (getDisplayedSpriteState). */
export function playbackOnTick(pb: SpritePlayback, requested: BattleAnimationState, cfg: SpriteStateConfig): SpritePlayback {
  const next = pb.frame + 1
  if (next < cfg.frames) return { ...pb, frame: next }
  if (cfg.loop) return { ...pb, frame: 0 }
  if (cfg.holdLastFrame) return { ...pb, frame: cfg.frames - 1 }
  // ação de uma execução terminou: não repete enquanto o mesmo pedido continuar ligado
  return { locked: null, spent: pb.locked ?? requested, frame: 0 }
}

/**
 * Canvas dos quadros de um lutador cujos PNGs foram recortados de folhas grandes
 * (scripts/extract_warrior_bases.py). Todos os quadros do lutador compartilham o mesmo canvas, com
 * o centro dos pés em anchorX e a sola das botas em groundY, para que trocar de animação nunca
 * mude o tamanho nem a posição do personagem. Precisa bater com as constantes do script.
 */
export interface SpriteCanvasMeta {
  width: number
  height: number
  anchorX: number
  groundY: number
  bodyHeight: number
}

// bodyHeight é só a referência de escala (px do canvas que ocupam bodyFraction do palco): guerreiro,
// druida e caçadora usam ~198-200, então 1 px de canvas vale quase o mesmo na carta e os três têm
// porte parecido. Druida e caçadora têm canvas próprio: o druida é mais alto por causa do cajado
// erguido e do halo do orbe (scripts/extract_druid_bases.py); a caçadora é mais baixa e estreita,
// sem arma de alcance nem efeito erguido acima da cabeça (scripts/extract_rogue_bases.py).
export const HERO_SPRITE_CANVAS: Partial<Record<string, SpriteCanvasMeta>> = {
  guerreiro: { width: 448, height: 332, anchorX: 196, groundY: 301, bodyHeight: 198 },
  druida: { width: 400, height: 410, anchorX: 170, groundY: 380, bodyHeight: 198 },
  cacadora: { width: 425, height: 265, anchorX: 185, groundY: 245, bodyHeight: 200 },
}

/**
 * Como o canvas é encaixado no palco (uma carta em pé, com overflow escondido): o corpo ocupa
 * bodyFraction da altura do palco, os pés ficam groundBottom acima da base e o centro dos pés em
 * anchorLeft da largura. Efeitos largos passam da carta e são cortados pela borda dela.
 */
export const SPRITE_STAGE_VIEW = { bodyFraction: 0.52, groundBottom: 0.07, anchorLeft: 0.53 }

/** Variáveis CSS que posicionam o quadro no palco; undefined = usa o encaixe padrão (contain). */
export function getSpriteFrameStyle(
  category: 'heroes' | 'enemies' | 'fx',
  id: string
): Record<string, string> | undefined {
  const meta = category === 'heroes' ? HERO_SPRITE_CANVAS[id] : undefined
  if (!meta) return undefined
  const { bodyFraction, groundBottom, anchorLeft } = SPRITE_STAGE_VIEW
  const heightPct = bodyFraction * (meta.height / meta.bodyHeight) * 100
  const belowGroundPct = ((meta.height - meta.groundY) / meta.height) * heightPct
  const round = (n: number) => String(Math.round(n * 100) / 100)
  return {
    '--sprite-height': `${round(heightPct)}%`,
    '--sprite-bottom': `${round(groundBottom * 100 - belowGroundPct)}%`,
    '--sprite-left': `${round(anchorLeft * 100)}%`,
    '--sprite-shift': `${round(-(meta.anchorX / meta.width) * 100)}%`,
  }
}

/**
 * Retorna a configuração de animação correta para uma categoria, ID e estado específico
 */
export function getSpriteStateConfig(
  category: 'heroes' | 'enemies' | 'fx',
  id: string,
  state: BattleAnimationState
): SpriteStateConfig {
  const base = BATTLE_ANIMATION_CONFIG[state] || BATTLE_ANIMATION_CONFIG.idle
  const override = category === 'heroes' ? HERO_ANIMATION_OVERRIDES[id]?.[state] : undefined
  return override ?? base
}

/**
 * Mapeamento dos 9 heróis do jogo para seus IDs de sprite
 */
export const HERO_SPRITE_IDS = [
  'guerreiro',
  'cacadora',
  'arcanista',
  'guardiao',
  'druida',
  'cacador',
  'monge',
  'sacerdotisa',
  'conjurador',
] as const

export type HeroSpriteId = (typeof HERO_SPRITE_IDS)[number]

/**
 * Mapeamento de nomes e IDs de inimigos conhecidos para kebab-case do diretório de sprites
 */
export const ENEMY_NAME_TO_SPRITE_ID: Record<string, string> = {
  'Sentinela Menor das Runas': 'sentinela-runas',
  'sentinela_runas': 'sentinela-runas',
  'Grumnak, o Cobrador do Pedágio': 'grumnak',
  'Mestre do Pedágio': 'grumnak',
  'grumnak': 'grumnak',
  'Cabra Amaldiçoada de Malgor': 'cabra-malgor',
  'cabra_malgor': 'cabra-malgor',
  'Ilusionista das Areias': 'ilusionista-areias',
  'ilusionista_areias': 'ilusionista-areias',
  'Guardiã da Seiva Negra': 'guardia-seiva',
  'guardia_seiva': 'guardia-seiva',
  'Fanático do Orgulho': 'fanatico-orgulho',
  'fanatico_orgulho': 'fanatico-orgulho',
  'Corvo de Ignaroth': 'corvo-ignaroth',
  'corvo_ignaroth': 'corvo-ignaroth',
  'Espectro da Rainha Perdida': 'espectro-rainha',
  'espectro_rainha': 'espectro-rainha',
  // Inimigos e chefes comuns mapeados para os arquétipos visuais gerados
  'Bandido da Estrada': 'grumnak',
  'Lobo dos Campos': 'cabra-malgor',
  'Cobrador Goblin': 'grumnak',
  'Capitão dos Bandoleiros': 'grumnak',
  'Salteador de Eldrimar': 'grumnak',
  'Guarda Corrompido': 'fanatico-orgulho',
  'Ilusionista da Travessia': 'ilusionista-areias',
  'Lobo de Abdendriel': 'cabra-malgor',
  'Corvo da Lua': 'corvo-ignaroth',
  'Guardiã da Seiva': 'guardia-seiva',
  'Matriarca da Seiva Negra': 'guardia-seiva',
  'Goblin Caçador': 'grumnak',
  'Goblin Xamã': 'ilusionista-areias',
  'Goblin Bombeiro': 'corvo-ignaroth',
  'Rei Goblin de Abdendriel': 'grumnak',
  'Espírito Rúnico': 'espectro-rainha',
  'Sentinela Monolítica': 'sentinela-runas',
  'Fanático das Runas': 'fanatico-orgulho',
  'Guardião Rúnico Ancestral': 'sentinela-runas',
  'Tecelã Gigante': 'guardia-seiva',
  'Viúva de Abdendriel': 'cabra-malgor',
  'Aranha Guardiã': 'sentinela-runas',
  'Rainha Aracnídea': 'guardia-seiva',
}

/**
 * Normaliza o ID do inimigo para a pasta em public/assets/battle/sprites/enemies/
 */
export function normalizeEnemySpriteId(rawIdOrName?: string): string {
  if (!rawIdOrName) return 'desconhecido'
  if (ENEMY_NAME_TO_SPRITE_ID[rawIdOrName]) {
    return ENEMY_NAME_TO_SPRITE_ID[rawIdOrName]
  }
  const clean = rawIdOrName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (clean.includes('sentinela') && clean.includes('runas')) {
    return 'sentinela-runas'
  }
  if (clean.startsWith('grumnak')) {
    return 'grumnak'
  }

  return clean
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Catálogo de lutadores com conjunto completo de sprites de batalha integrados
 */
export const SUPPORTED_HERO_SPRITES = new Set<string>([
  'guerreiro',
  'cacadora',
  'arcanista',
  'guardiao',
  'druida',
  'cacador',
  'monge',
  'sacerdotisa',
  'conjurador',
])
export const SUPPORTED_ENEMY_SPRITES = new Set<string>([
  'sentinela-runas',
  'grumnak',
  'cabra-malgor',
  'ilusionista-areias',
  'guardia-seiva',
  'fanatico-orgulho',
  'corvo-ignaroth',
  'espectro-rainha',
])

export function isBattleSpriteSupported(category: 'heroes' | 'enemies', id: string): boolean {
  if (category === 'heroes') {
    return SUPPORTED_HERO_SPRITES.has(id)
  }
  return SUPPORTED_ENEMY_SPRITES.has(id)
}

/**
 * Estados que reaproveitam os quadros de outro estado do mesmo lutador (sem arquivos próprios).
 * Guerreiro e druida levam dano com a mesma folha da Defesa.
 */
const SPRITE_STATE_FRAME_ALIAS: Partial<Record<string, Partial<Record<BattleAnimationState, BattleAnimationState>>>> = {
  'heroes/guerreiro': { hit: 'defend' },
  'heroes/druida': { hit: 'defend' },
  'heroes/cacadora': { hit: 'defend' },
}

/** Um quadro de outro estado: [estado, índice do quadro]. */
export type SpriteFrameRef = readonly [BattleAnimationState, number]

const idleLoop: SpriteFrameRef[] = [0, 1, 2, 3, 4, 5].map(i => ['idle', i] as const)

/**
 * Estados montados a partir de quadros de OUTROS estados (um por quadro da animação). O druida só
 * tem folhas de idle/attack/heavy/ultimate/defend; os demais estados são montados com poses dessas
 * folhas até existirem folhas próprias (ver docs/BATTLE_SPRITE_PROMPTS.md). O tamanho de cada lista
 * precisa bater com o `frames` do estado.
 */
export const SPRITE_FRAME_SEQUENCES: Partial<Record<string, Partial<Record<BattleAnimationState, readonly SpriteFrameRef[]>>>> = {
  'heroes/druida': {
    stance_offensive: idleLoop,
    stance_defensive: idleLoop,
    // recua o corpo (cajado para cima) e volta
    dodge: [['idle', 0], ['attack', 6], ['attack', 6], ['attack', 6], ['idle', 0]],
    // cajado erguido com o orbe brilhando
    potion: [['idle', 0], ['heavy', 1], ['heavy', 3], ['heavy', 4], ['heavy', 4], ['heavy', 7], ['idle', 0]],
    skill: [['idle', 0], ['heavy', 1], ['heavy', 3], ['heavy', 3], ['heavy', 4], ['heavy', 4], ['heavy', 4], ['heavy', 7], ['heavy', 8], ['idle', 0]],
    victory: [['idle', 0], ['heavy', 1], ['heavy', 3], ['heavy', 3], ['heavy', 4], ['heavy', 4], ['heavy', 4], ['heavy', 4]],
    defeat: [['idle', 0], ['attack', 1], ['heavy', 2], ['heavy', 2], ['heavy', 2], ['heavy', 2], ['heavy', 2], ['heavy', 2]],
  },
  // A caçadora só tem folhas de idle/attack/heavy/defend/ultimate (scripts/extract_rogue_bases.py);
  // os demais estados são montados com poses dessas folhas até existirem folhas próprias.
  'heroes/cacadora': {
    stance_offensive: idleLoop,
    stance_defensive: idleLoop,
    // recuo defensivo (Defesa quadro 1) e volta pra guarda
    dodge: [['idle', 0], ['defend', 1], ['defend', 1], ['defend', 0], ['idle', 0]],
    // sem gesto de mão livre em nenhuma folha (as duas seguram adaga sempre): usa o ciclo de respiro
    potion: [['idle', 0], ['idle', 1], ['idle', 2], ['idle', 3], ['idle', 4], ['idle', 5], ['idle', 0]],
    // Ataque Duplo: reaproveita o floreio inteiro do Crítico (10 quadros, 1 pra 1)
    skill: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => ['heavy', i] as const),
    // guarda -> pose de contato crítico (adagas estendidas), segura no final
    victory: [['idle', 0], ['heavy', 2], ['heavy', 4], ['heavy', 5], ['heavy', 5], ['heavy', 5], ['heavy', 5], ['heavy', 5]],
    // guarda -> absorção do impacto (Defesa quadro 4), segura no final
    defeat: [['idle', 0], ['defend', 1], ['defend', 2], ['defend', 4], ['defend', 4], ['defend', 4], ['defend', 4], ['defend', 4]],
  },
}

/**
 * Gera o caminho canônico do arquivo de frame
 * Exemplo: assets/battle/sprites/heroes/monge/idle_00.png
 */
export function getBattleSpriteFramePath(
  category: 'heroes' | 'enemies' | 'fx',
  id: string,
  state: BattleAnimationState,
  frameIndex: number
): string {
  const key = `${category}/${id}`
  const sequence = SPRITE_FRAME_SEQUENCES[key]?.[state]
  const [frameState, index] = sequence
    ? sequence[Math.min(Math.max(frameIndex, 0), sequence.length - 1)]
    : [SPRITE_STATE_FRAME_ALIAS[key]?.[state] ?? state, frameIndex]
  const paddedIndex = String(index).padStart(2, '0')
  return `assets/battle/sprites/${category}/${id}/${frameState}_${paddedIndex}.png`
}

/**
 * Resolve a URL completa levando em conta BASE_URL do Vite
 */
export function getBattleSpriteFrameUrl(
  category: 'heroes' | 'enemies' | 'fx',
  id: string,
  state: BattleAnimationState,
  frameIndex: number,
  baseUrl: string = import.meta.env.BASE_URL || '/'
): string {
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  return `${cleanBase}${getBattleSpriteFramePath(category, id, state, frameIndex)}`
}

const PRELOADED_SPRITE_CACHE = new Set<string>()

/**
 * Pré-carrega e decodifica na memória da GPU/navegador todos os frames de
 * animação de um lutador, garantindo 0ms de latência e eliminando qualquer
 * salto ou perda de frame durante a execução dos ataques e defesas.
 */
export function preloadBattleSpriteImages(category: 'heroes' | 'enemies', id: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()

  const states: BattleAnimationState[] = [
    'idle',
    'attack',
    'heavy',
    'hit',
    'defend',
    'dodge',
    'potion',
    'skill',
    'ultimate',
    'victory',
    'defeat',
    'stance_offensive',
    'stance_defensive',
  ]

  const promises: Promise<void>[] = []

  for (const state of states) {
    const cfg = getSpriteStateConfig(category, id, state)
    if (!cfg) continue
    for (let i = 0; i < cfg.frames; i++) {
      const url = getBattleSpriteFrameUrl(category, id, state, i)
      if (PRELOADED_SPRITE_CACHE.has(url)) continue
      PRELOADED_SPRITE_CACHE.add(url)

      const promise = new Promise<void>((resolve) => {
        const img = new Image()
        img.src = url
        if (img.complete) {
          if ('decode' in img) {
            img.decode().then(resolve).catch(resolve)
          } else {
            resolve()
          }
        } else {
          img.onload = () => {
            if ('decode' in img) {
              img.decode().then(resolve).catch(resolve)
            } else {
              resolve()
            }
          }
          img.onerror = () => resolve()
        }
      })
      promises.push(promise)
    }
  }

  return Promise.all(promises).then(() => {})
}

export interface FighterAnimationContext {
  side?: 'hero' | 'enemy' | string
  hp: number
  maxHp: number
  attacking?: boolean
  attackCritical?: boolean
  shaking?: boolean // recebendo dano
  impactKind?: 'critical' | 'ultimate' | 'blocked' | 'dodged' | string
  supportFx?: 'fortificacao' | 'cura' | 'cura-item'
  stance?: 'ofensiva' | 'defensiva' | 'neutra'
  currentStance?: 'ofensiva' | 'defensiva' | 'neutra'
  isVictorious?: boolean
  isDefeated?: boolean
  isUsingSkill?: boolean
  isUsingUltimate?: boolean
}

/**
 * Determina com precisão qual estado de animação o lutador deve exibir no momento,
 * respeitando a hierarquia de combate (morte > dano sofrido > ataque/crítico > defesa > pose).
 */
export function resolveFighterAnimationState(ctx: FighterAnimationContext): BattleAnimationState {
  // 1. Derrota / Vida zerada
  if (ctx.isDefeated || ctx.hp <= 0) {
    return 'defeat'
  }

  // 2. Vitória (quando o combate encerra a favor deste lutador)
  if (ctx.isVictorious) {
    return 'victory'
  }

  // 3. Esquiva
  if (ctx.impactKind === 'dodged') {
    return 'dodge'
  }

  // 4. Recebendo ataque do inimigo
  // Toda vez que o herói recebe um ataque do inimigo (shaking ativo, dano ou bloqueio), utiliza a animação Defesa (Defesa.png)
  if (ctx.side === 'hero' && (ctx.shaking || ctx.impactKind === 'blocked' || ctx.impactKind === 'hit' || ctx.impactKind === 'critical' || ctx.impactKind === 'glance')) {
    return 'defend'
  }

  // 5. Recebendo dano (shaking ativo para inimigos ou contexto genérico)
  if (ctx.shaking) {
    return 'hit'
  }

  // 6. Bloqueio / Defesa
  if (ctx.impactKind === 'blocked' || ctx.supportFx === 'fortificacao') {
    return 'defend'
  }

  // 7. Golpe Supremo
  if (ctx.isUsingUltimate || (ctx.side !== 'enemy' && ctx.impactKind === 'ultimate')) {
    return 'ultimate'
  }

  // 7. Habilidade especial de classe
  if (ctx.isUsingSkill) {
    return 'skill'
  }

  // 8. Uso de consumível / poção
  if (ctx.supportFx === 'cura-item' || ctx.supportFx === 'cura') {
    return 'potion'
  }

  // 9. Ataque ativo
  if (ctx.attacking) {
    if (ctx.attackCritical) {
      return 'heavy'
    }
    return 'attack'
  }

  // 10. Posturas estáticas
  const activeStance = ctx.currentStance ?? ctx.stance
  if (activeStance === 'ofensiva') {
    return 'stance_offensive'
  }
  if (activeStance === 'defensiva') {
    return 'stance_defensive'
  }

  // 11. Repouso padrão
  return 'idle'
}
