import React from 'react'
import {
  type BattleAnimationState,
  INITIAL_SPRITE_PLAYBACK,
  type SpritePlayback,
  getBattleSpriteFrameUrl,
  getDisplayedSpriteState,
  getFrameDurationMs,
  getSpriteFrameStyle,
  getSpriteStateConfig,
  isBattleSpriteSupported,
  isOneShotConfig,
  playbackOnRequest,
  playbackOnTick,
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
  const [playback, setPlayback] = React.useState<SpritePlayback>(INITIAL_SPRITE_PLAYBACK)
  const [loadError, setLoadError] = React.useState(false)

  const isSupported = isBattleSpriteSupported(category, id)

  // Pré-carrega e decodifica 100% dos frames do personagem na memória GPU/RAM (elimina atrasos de rede)
  React.useEffect(() => {
    if (isSupported) {
      preloadBattleSpriteImages(category, id).catch(() => {})
    }
  }, [category, id, isSupported])

  // O jogo mantém o estado pedido (attack, defend...) ligado pelo turno todo, mais tempo que a
  // animação. Uma ação (attack, heavy, defend, ultimate...) toca UMA vez por pedido, do início ao fim,
  // sem ser cortada por oscilações externas; ao terminar o lutador volta ao repouso e só repete se o
  // pedido sair e voltar. Repouso e posturas seguem em loop. Regras em playbackOnRequest/Tick.
  React.useEffect(() => {
    // sem relógio (reduzir efeitos) uma ação travada nunca terminaria: só mostra a pose do estado
    if (reducedMotion) {
      setPlayback(INITIAL_SPRITE_PLAYBACK)
      setLoadError(false)
      return
    }
    const oneShot = isOneShotConfig(getSpriteStateConfig(category, id, state))
    setPlayback(pb => playbackOnRequest(pb, state, oneShot))
    setLoadError(false)
  }, [state, id, category, reducedMotion])

  const activeState = getDisplayedSpriteState(playback, state, defaultState)
  const config = getSpriteStateConfig(category, id, activeState)
  // o quadro do estado anterior pode passar do último quadro do novo por um instante
  const frameIndex = Math.min(playback.frame, config.frames - 1)

  // Temporizador encadeado: garante que CADA frame seja exibido pelo tempo mínimo exato
  React.useEffect(() => {
    if (reducedMotion || loadError) return

    const speedMultiplier = Math.max(0.25, speed ?? 1)
    const baseIntervalMs = getFrameDurationMs(config, frameIndex)
    const intervalMs = Math.max(16, Math.round(baseIntervalMs / speedMultiplier))

    const timer = setTimeout(() => {
      setPlayback(pb => playbackOnTick(pb, state, config))
    }, intervalMs)

    return () => clearTimeout(timer)
  }, [activeState, frameIndex, config, state, speed, reducedMotion, loadError])

  // Se não suportado ou se houve falha ao carregar a imagem, renderiza o fallback gracioso para CardFrame
  if (!isSupported || loadError) {
    return <>{fallbackCard}</>
  }

  const frameUrl = getBattleSpriteFrameUrl(category, id, activeState, frameIndex)
  // lutadores com canvas grande (guerreiro) são encaixados por variáveis CSS em vez de "contain"
  const frameStyle = getSpriteFrameStyle(category, id) as React.CSSProperties | undefined

  return (
    <div
      className={`battle-sprite-stage ${side} state-${activeState}${frameStyle ? ' framed' : ''}`}
      style={frameStyle}
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

