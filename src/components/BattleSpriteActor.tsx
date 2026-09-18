import React from 'react'
import {
  type BattleAnimationState,
  BATTLE_ANIMATION_CONFIG,
  getBattleSpriteFrameUrl,
  isBattleSpriteSupported,
  preloadBattleSpriteImages,
} from '../battleSprites'

export interface BattleSpriteActorProps {
  side: 'hero' | 'enemy'
  category: 'heroes' | 'enemies'
  id: string
  name: string
  state: BattleAnimationState
  fallbackCard: React.ReactNode
  reducedMotion?: boolean
  speed?: number
  defaultState?: BattleAnimationState
  fxOverlay?: {
    type: 'impact_slash' | 'block_spark' | 'heal_glow' | 'status_fire'
    frame?: number
  }
}

export const BattleSpriteActor: React.FC<BattleSpriteActorProps> = ({
  side,
  category,
  id,
  name,
  state,
  fallbackCard,
  reducedMotion = false,
  speed = 1,
  defaultState = 'idle',
  fxOverlay,
}) => {
  const [frameIndex, setFrameIndex] = React.useState(0)
  const [loadError, setLoadError] = React.useState(false)
  const [lockedAction, setLockedAction] = React.useState<BattleAnimationState | null>(null)

  const isSupported = isBattleSpriteSupported(category, id)

  // Pré-carrega e decodifica 100% dos frames do personagem na memória GPU/RAM (elimina atrasos de rede)
  React.useEffect(() => {
    if (isSupported) {
      preloadBattleSpriteImages(category, id).catch(() => {})
    }
  }, [category, id, isSupported])

  // Gerenciamento de ação: quando entra um golpe one-shot (attack, heavy, etc.), trava a reprodução
  // completa de todos os passos para que nenhuma oscilação externa corte os frames pela metade.
  React.useEffect(() => {
    // Derrota tem prioridade absoluta imediata
    if (state === 'defeat') {
      setLockedAction(null)
      setFrameIndex(0)
      setLoadError(false)
      return
    }

    const targetConfig = BATTLE_ANIMATION_CONFIG[state]
    if (targetConfig && !targetConfig.loop && !targetConfig.holdLastFrame) {
      // Inicia a execução garantida da ação one-shot do início ao fim
      setLockedAction(state)
      setFrameIndex(0)
      setLoadError(false)
    } else if (!lockedAction) {
      // Estado de repouso ou permanente (idle, posturas, vitória)
      setFrameIndex(0)
      setLoadError(false)
    }
  }, [state, id, category])

  const activeState = lockedAction || state
  const config = BATTLE_ANIMATION_CONFIG[activeState] || BATTLE_ANIMATION_CONFIG.idle

  // Temporizador encadeado: garante que CADA frame seja exibido pelo tempo mínimo exato
  React.useEffect(() => {
    if (reducedMotion || loadError) return

    const speedMultiplier = Math.max(0.25, speed ?? 1)
    const baseIntervalMs = config.durationMs
      ? config.durationMs / Math.max(1, config.frames)
      : 1000 / Math.max(1, config.fps)
    const intervalMs = Math.max(16, Math.round(baseIntervalMs / speedMultiplier))

    const timer = setTimeout(() => {
      setFrameIndex(prev => {
        const next = prev + 1
        if (next >= config.frames) {
          if (config.loop) {
            return 0
          }
          if (config.holdLastFrame) {
            return config.frames - 1
          }
          // Todos os passos da ação foram executados integralmente!
          setLockedAction(null)
          return 0
        }
        return next
      })
    }, intervalMs)

    return () => clearTimeout(timer)
  }, [activeState, frameIndex, config, speed, reducedMotion, loadError])

  // Se não suportado ou se houve falha ao carregar a imagem, renderiza o fallback gracioso para CardFrame
  if (!isSupported || loadError) {
    return <>{fallbackCard}</>
  }

  const frameUrl = getBattleSpriteFrameUrl(category, id, activeState, frameIndex)

  return (
    <div
      className={`battle-sprite-stage ${side} state-${activeState}`}
      data-side={side}
      data-state={activeState}
      aria-label={`${name} (${activeState})`}
    >
      <div className="battle-sprite-shadow" />
      <img
        src={frameUrl}
        alt={`${name} - ${activeState} frame ${frameIndex}`}
        className="battle-sprite-image"
        draggable={false}
        onError={() => {
          setLoadError(true)
        }}
      />
      {fxOverlay && (
        <div className={`battle-sprite-fx fx-${fxOverlay.type}`} aria-hidden="true" />
      )}
    </div>
  )
}

