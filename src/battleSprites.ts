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
  attack: { frames: 12, loop: false, fps: 8, durationMs: 1800 },
  heavy: { frames: 17, loop: false, fps: 8, durationMs: 2200 },
  defend: { frames: 12, loop: false, fps: 9, durationMs: 1400 },
  hit: { frames: 12, loop: false, fps: 9, durationMs: 1400 },
  ultimate: { frames: 17, loop: false, fps: 7, durationMs: 2400 },
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
  if (category === 'heroes' && id === 'guerreiro' && WARRIOR_ANIMATION_OVERRIDES[state]) {
    return WARRIOR_ANIMATION_OVERRIDES[state]!
  }
  return base
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
 * Gera o caminho canônico do arquivo de frame
 * Exemplo: assets/battle/sprites/heroes/monge/idle_00.png
 */
export function getBattleSpriteFramePath(
  category: 'heroes' | 'enemies' | 'fx',
  id: string,
  state: BattleAnimationState,
  frameIndex: number
): string {
  const paddedIndex = String(frameIndex).padStart(2, '0')
  return `assets/battle/sprites/${category}/${id}/${state}_${paddedIndex}.png`
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
