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
  /** Em estados com `loop`, o quadro para onde o laço volta (padrão 0): transição + pose sustentada. */
  loopFrom?: number
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
 * Ritmo das folhas de 8 quadros do segundo lote do Codex (scripts/extract_eight_frame_sheets.py).
 * Todo estado dessas folhas tem 8 quadros. Preparação lenta, golpe rápido e recuperação lenta
 * (frameWeights) em ataque, crítico e supremo; o resto divide a duração por igual.
 */
export const EIGHT_FRAME_TIMING: Record<BattleAnimationState, SpriteStateConfig> = {
  idle: { frames: 8, loop: true, fps: 8 },
  // ofensiva: ciclo de guarda que fecha onde começou; defensiva: assume a postura (0-3) e fica no
  // escudo/guarda firme (4-7), então o laço volta para o quadro 4, não para o 0
  stance_offensive: { frames: 8, loop: true, fps: 8 },
  stance_defensive: { frames: 8, loop: true, loopFrom: 4, fps: 8 },
  attack: {
    frames: 8,
    loop: false,
    fps: 8,
    durationMs: 1400,
    frameWeights: [1.2, 1.1, 1, 0.7, 0.7, 0.9, 1.1, 1.3],
  },
  heavy: {
    frames: 8,
    loop: false,
    fps: 8,
    durationMs: 1600,
    frameWeights: [1.3, 1.2, 1.1, 0.75, 0.7, 0.8, 1, 1.15],
  },
  defend: { frames: 8, loop: false, fps: 9, durationMs: 1100 },
  hit: { frames: 8, loop: false, fps: 10, durationMs: 800 },
  dodge: { frames: 8, loop: false, fps: 10, durationMs: 900 },
  potion: { frames: 8, loop: false, fps: 8, durationMs: 1500 },
  skill: { frames: 8, loop: false, fps: 8, durationMs: 1600 },
  ultimate: {
    frames: 8,
    loop: false,
    fps: 8,
    durationMs: 2000,
    frameWeights: [0.9, 1, 1, 1.1, 1.2, 1.4, 1.5, 1.1],
  },
  victory: { frames: 8, loop: false, holdLastFrame: true, fps: 8, durationMs: 1600 },
  defeat: { frames: 8, loop: false, holdLastFrame: true, fps: 8, durationMs: 1800 },
}

/**
 * Sobrescritas do Guardião com base nas folhas de Bases/ (scripts/extract_guardian_bases.py e, para
 * o segundo lote, scripts/extract_eight_frame_sheets.py). O Codex entregou as 13 folhas COMPLETAS:
 * nenhum estado precisa de quadro legado nem de alias/sequência montada com poses de outro estado
 * (até o `hit` tem folha própria, `Dano Recebido.png`; a habilidade comum é `Provocar.png` -- o nome
 * real da habilidade do Guardião em src/data/herois.json, não "Habilidade" como no prompt). Um
 * segundo lote reentregou Idle, Defesa, Esquiva, Dano_Recebido e as duas Posturas na grade padrão de
 * 8 quadros (extract_eight_frame_sheets.py); Ataque, Critico (heavy), Pocao, Provocar (skill),
 * Ultimate, Derrota e Vitoria seguem as folhas do primeiro lote, que já eram 8 (ou 10/12 para
 * heavy/ultimate) e não mudaram. Contagens de quadros: Descanso 8, Ataque 8, Critico 10, Defesa 8,
 * Esquiva 8, Dano_Recebido 8, Pocao 8, Provocar 8, Posturas 8, Ultimate 12, Derrota 8, Vitoria 8.
 */
export const GUARDIAN_ANIMATION_OVERRIDES: Partial<
  Record<BattleAnimationState, SpriteStateConfig>
> = {
  idle: { frames: 8, loop: true, fps: 7 },
  // guarda + preparação (4) -> golpe curto de martelo (2) -> recuperação (2)
  attack: {
    frames: 8,
    loop: false,
    fps: 8,
    durationMs: 1700,
    frameWeights: [1.2, 1.1, 1, 1, 0.5, 0.6, 1, 1.2],
  },
  // guarda + preparação (5) -> golpe diagonal forte (2) -> recuperação (3)
  heavy: {
    frames: 10,
    loop: false,
    fps: 8,
    durationMs: 2000,
    frameWeights: [1.2, 1.1, 1, 1, 0.9, 0.5, 0.55, 0.8, 1, 1.2],
  },
  // guarda (3) -> faísca de impacto (1) -> pico do bloqueio, segura mais (1) -> absorção (2) -> retorno (1)
  defend: {
    frames: 8,
    loop: false,
    fps: 9,
    durationMs: 1100,
    frameWeights: [0.8, 0.8, 0.8, 0.6, 1.5, 1.1, 1, 0.9],
  },
  // guarda (2) -> impacto com estilhaços (1) -> pico do recuo (1) -> estabilização + retorno (4)
  hit: {
    frames: 8,
    loop: false,
    fps: 10,
    durationMs: 800,
    frameWeights: [0.7, 0.7, 0.5, 1.5, 1.1, 1, 1, 1],
  },
  // guarda + recuo (3) -> esquiva baixa, segura mais (2) -> recuperação (3)
  dodge: {
    frames: 8,
    loop: false,
    fps: 10,
    durationMs: 900,
    frameWeights: [1, 0.9, 0.8, 1.3, 1.2, 1, 1, 1],
  },
  // guarda + saca o frasco (4) -> bebe, segura mais (1) -> guarda o frasco + retorno (3)
  potion: {
    frames: 8,
    loop: false,
    fps: 8,
    durationMs: 1900,
    frameWeights: [1, 1, 1, 1, 1.5, 1, 1, 1.1],
  },
  // investida de escudo (Provocar): mesmo ritmo do ataque normal
  skill: {
    frames: 8,
    loop: false,
    fps: 8,
    durationMs: 1700,
    frameWeights: [1.2, 1.1, 1, 0.9, 0.5, 0.6, 1, 1.2],
  },
  // transição de guarda pra postura (não é loop de respiro como nos outros heróis: a folha própria
  // do Guardião vai de guarda neutra até a postura assumida e PARA lá, então toca uma vez e segura
  // o último quadro em vez de repetir a transição inteira). Ofensiva: ergue o martelo (4) -> golpe
  // descendo (2) -> avanço/thrust final, segura (2).
  stance_offensive: {
    frames: 8,
    loop: false,
    holdLastFrame: true,
    fps: 8,
    durationMs: 1000,
    frameWeights: [1, 1, 1, 0.9, 0.7, 0.6, 1, 1.4],
  },
  // defensiva: a folha entregue já mostra a postura assumida em todos os 8 quadros (sem transição
  // visível), então só segura o escudo erguido -- ritmo parelho.
  stance_defensive: {
    frames: 8,
    loop: false,
    holdLastFrame: true,
    fps: 8,
    durationMs: 900,
    frameWeights: [1, 1, 1, 1, 1, 1, 1, 1],
  },
  // base + carga das runas (6) -> carga total, segura mais (1) -> impacto seco (1) -> pós-impacto (3)
  ultimate: {
    frames: 12,
    loop: false,
    fps: 8,
    durationMs: 2600,
    frameWeights: [1.1, 1, 1, 1, 1, 1.2, 1.6, 0.4, 0.6, 0.9, 1.1, 1.4],
  },
  // recuo + desequilíbrio (4) -> queda (2, rápida) -> pousa e segura o final (2)
  defeat: {
    frames: 8,
    loop: false,
    holdLastFrame: true,
    fps: 8,
    durationMs: 2200,
    frameWeights: [1, 1, 1, 0.9, 0.6, 0.8, 1, 1.4],
  },
  // guarda + planta o escudo (4) -> saudação com o martelo (2) -> pose orgulhosa, segura o final (2)
  victory: {
    frames: 8,
    loop: false,
    holdLastFrame: true,
    fps: 8,
    durationMs: 2200,
    frameWeights: [1, 1, 1, 1, 1, 1.1, 1.2, 1.4],
  },
}

const HERO_ANIMATION_OVERRIDES: Record<
  string,
  Partial<Record<BattleAnimationState, SpriteStateConfig>>
> = {
  guerreiro: EIGHT_FRAME_TIMING,
  druida: EIGHT_FRAME_TIMING,
  cacadora: EIGHT_FRAME_TIMING,
  guardiao: GUARDIAN_ANIMATION_OVERRIDES,
  arcanista: EIGHT_FRAME_TIMING,
  cacador: EIGHT_FRAME_TIMING,
  monge: EIGHT_FRAME_TIMING,
  sacerdotisa: EIGHT_FRAME_TIMING,
  conjurador: EIGHT_FRAME_TIMING,
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
export function playbackOnRequest(
  pb: SpritePlayback,
  requested: BattleAnimationState,
  oneShot: boolean
): SpritePlayback {
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
export function playbackOnTick(
  pb: SpritePlayback,
  requested: BattleAnimationState,
  cfg: SpriteStateConfig
): SpritePlayback {
  const next = pb.frame + 1
  if (next < cfg.frames) return { ...pb, frame: next }
  if (cfg.loop) return { ...pb, frame: cfg.loopFrom ?? 0 }
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

// bodyHeight é só a referência de escala (px do canvas que ocupam bodyFraction do palco): todos os
// heróis usam ~198-200, então 1 px de canvas vale quase o mesmo na carta e os nove têm porte parecido
// (a silhueta do repouso mede ~210-240 px em todos). Cada um com canvas próprio: o druida é mais alto
// por causa do cajado erguido e do halo do orbe (scripts/extract_druid_bases.py); a caçadora é mais
// baixa e estreita, sem arma de alcance nem efeito erguido acima da cabeça
// (scripts/extract_rogue_bases.py); o guardião precisa de bem mais espaço acima da cabeça por causa do
// escudo-torre erguido e do martelo no ápice do golpe supremo (scripts/extract_guardian_bases.py).
// Guerreiro, druida (sete estados) e os cinco heróis do segundo lote do Codex vêm de
// scripts/extract_eight_frame_sheets.py; o canvas do guerreiro ganhou 49 px de altura (o pilar de luz
// do golpe supremo batia no teto) sem mudar a escala; os cinco do lote compartilham um canvas único.
export const HERO_SPRITE_CANVAS: Partial<Record<string, SpriteCanvasMeta>> = {
  guerreiro: { width: 448, height: 381, anchorX: 196, groundY: 350, bodyHeight: 198 },
  druida: { width: 400, height: 410, anchorX: 170, groundY: 380, bodyHeight: 198 },
  cacadora: { width: 425, height: 265, anchorX: 185, groundY: 245, bodyHeight: 200 },
  guardiao: { width: 395, height: 345, anchorX: 215, groundY: 325, bodyHeight: 200 },
  arcanista: { width: 440, height: 375, anchorX: 205, groundY: 350, bodyHeight: 198 },
  sacerdotisa: { width: 440, height: 375, anchorX: 205, groundY: 350, bodyHeight: 198 },
  cacador: { width: 440, height: 375, anchorX: 205, groundY: 350, bodyHeight: 198 },
  monge: { width: 440, height: 375, anchorX: 205, groundY: 350, bodyHeight: 198 },
  conjurador: { width: 440, height: 375, anchorX: 205, groundY: 350, bodyHeight: 198 },
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
  sentinela_runas: 'sentinela-runas',
  'Grumnak, o Cobrador do Pedágio': 'grumnak',
  'Mestre do Pedágio': 'grumnak',
  grumnak: 'grumnak',
  'Cabra Amaldiçoada de Malgor': 'cabra-malgor',
  cabra_malgor: 'cabra-malgor',
  'Ilusionista das Areias': 'ilusionista-areias',
  ilusionista_areias: 'ilusionista-areias',
  'Guardiã da Seiva Negra': 'guardia-seiva',
  guardia_seiva: 'guardia-seiva',
  'Fanático do Orgulho': 'fanatico-orgulho',
  fanatico_orgulho: 'fanatico-orgulho',
  'Corvo de Ignaroth': 'corvo-ignaroth',
  corvo_ignaroth: 'corvo-ignaroth',
  'Espectro da Rainha Perdida': 'espectro-rainha',
  espectro_rainha: 'espectro-rainha',
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

  return clean.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
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
 * Vazio desde que o segundo lote do Codex deu a druida e à caçadora folha própria de cada estado
 * (o guerreiro já tinha ganhado folha própria de Hit antes disso).
 */
const SPRITE_STATE_FRAME_ALIAS: Partial<
  Record<string, Partial<Record<BattleAnimationState, BattleAnimationState>>>
> = {}

/** Um quadro de outro estado: [estado, índice do quadro]. */
export type SpriteFrameRef = readonly [BattleAnimationState, number]

/**
 * Estados montados a partir de quadros de OUTROS estados (um por quadro da animação), para heróis
 * cujas folhas de Bases/ ainda não cobrem os 13 estados. Vazio desde que o segundo lote do Codex
 * completou druida e caçadora (ver docs/BATTLE_SPRITE_PROMPTS.md para o histórico). O tamanho de
 * cada lista precisa bater com o `frames` do estado que ainda vier a usar isso.
 */
export const SPRITE_FRAME_SEQUENCES: Partial<
  Record<string, Partial<Record<BattleAnimationState, readonly SpriteFrameRef[]>>>
> = {}

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
export function preloadBattleSpriteImages(
  category: 'heroes' | 'enemies',
  id: string
): Promise<void> {
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
  if (
    ctx.side === 'hero' &&
    (ctx.shaking ||
      ctx.impactKind === 'blocked' ||
      ctx.impactKind === 'hit' ||
      ctx.impactKind === 'critical' ||
      ctx.impactKind === 'glance')
  ) {
    return 'defend'
  }

  // 5. Recebendo dano (shaking ativo para inimigos ou contexto genérico)
  if (ctx.shaking) {
    return 'hit'
  }

  // 6. Bloqueio / Defesa
  // supportFx 'fortificacao' também dispara quando o Golpe Supremo concede escudo (ex.: Guardião,
  // Sacerdotisa) OU quando a habilidade de classe é um buff defensivo (Provocar, Ímpeto Marcial,
  // Ascensão Arcana, Marca do Predador, Bênção da Vida -- 5 das 9 classes): sem as duas exclusões
  // abaixo, essa regra vencia as #7/#8 e a animação de ultimate/habilidade era substituída por
  // ~1.6s de Defesa (bug real, achado ao integrar as sprites do Guardião e depois generalizado
  // ao auditar todas as classes: `isUsingSkill` nunca era nem passado pra este contexto antes).
  if (
    ctx.impactKind === 'blocked' ||
    (ctx.supportFx === 'fortificacao' && !ctx.isUsingUltimate && !ctx.isUsingSkill)
  ) {
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
