// Motor genérico de navegação espacial estilo "Pokémon FireRed" para a tela de região.
// Autocontido de propósito: não importa nada de main.tsx (evita import circular), só sabe
// desenhar um grid de tiles, mover um personagem sobre ele e avisar o chamador quando o
// jogador pisa num marcador de sub-região. Quem decide o que acontece ao entrar num marcador
// (abrir card, checar progresso etc.) é o componente que usa <TileWorldExplorer/>.
//
// Sem ferramenta de geração de imagem disponível neste projeto, os tiles e o personagem são
// desenhados em CSS puro (greybox) — ver .regionmap-* em styles.css. O grid abaixo (tipo de
// tile por célula) é a fonte da verdade de colisão; se um tileset pixel-art de verdade for
// produzido depois, ele só precisa respeitar este mesmo grid para encaixar sem retrabalho.
import React from 'react'
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'

export type MapTile = 'grass' | 'flower' | 'path' | 'bridge' | 'water' | 'tree'
const WALKABLE = new Set<MapTile>(['grass', 'flower', 'path', 'bridge'])

export interface RegionMapLocation { subId: string; x: number; y: number; icon?: string }
export interface RegionMapDef {
  id: string
  tileSize: number // tamanho nativo do tile em px (referência para uma futura arte pixel-art real)
  scale: number // fator de ampliação usado na renderização atual
  width: number // largura em tiles
  height: number // altura em tiles
  grid: MapTile[][] // [y][x]
  spawn: { x: number; y: number }
  locations: RegionMapLocation[]
}

type Facing = 'up' | 'down' | 'left' | 'right'
const STEP_MS = 170
const VIEWPORT_TILES_X = 13
const VIEWPORT_TILES_Y = 9

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)) }

function fill(w: number, h: number, tile: MapTile): MapTile[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => tile))
}
function hline(grid: MapTile[][], x0: number, x1: number, y: number, tile: MapTile) {
  const [a, b] = x0 <= x1 ? [x0, x1] : [x1, x0]
  for (let x = a; x <= b; x++) grid[y][x] = tile
}
function vline(grid: MapTile[][], y0: number, y1: number, x: number, tile: MapTile) {
  const [a, b] = y0 <= y1 ? [y0, y1] : [y1, y0]
  for (let y = a; y <= b; y++) grid[y][x] = tile
}
function rect(grid: MapTile[][], x0: number, y0: number, x1: number, y1: number, tile: MapTile) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (grid[y]?.[x] !== undefined) grid[y][x] = tile
}

// Planícies de Alvora (campos_dourados) — região de entrada, usada como protótipo.
// Layout: chegada ao sul, trilha sobe até a estrada, segue por fazendas e moinho a noroeste,
// atravessa um rio por uma ponte comprida (a própria sub-região "Ponte de Eldrimar") e termina
// nas ruínas a leste. Toda a borda é mata fechada (não andável); o interior é campo aberto.
function buildCamposDourados(): RegionMapDef {
  const width = 22, height = 16
  const grid = fill(width, height, 'grass')
  hline(grid, 0, width - 1, 0, 'tree'); hline(grid, 0, width - 1, height - 1, 'tree')
  vline(grid, 0, height - 1, 0, 'tree'); vline(grid, 0, height - 1, width - 1, 'tree')
  vline(grid, 2, 12, 13, 'water') // rio norte-sul
  vline(grid, 12, 14, 3, 'path') // chegada -> estrada
  hline(grid, 3, 4, 12, 'path')
  vline(grid, 6, 12, 4, 'path') // estrada -> fazendas
  hline(grid, 4, 8, 6, 'path')
  vline(grid, 3, 6, 8, 'path') // fazendas -> moinho
  hline(grid, 8, 13, 3, 'path') // moinho -> margem norte do rio
  vline(grid, 3, 7, 13, 'bridge') // a ponte, atravessando o rio
  hline(grid, 13, 18, 7, 'path') // ponte -> ruínas
  vline(grid, 5, 7, 18, 'path')
  rect(grid, 5, 2, 6, 3, 'tree') // bosquetes decorativos (não bloqueiam a trilha)
  rect(grid, 16, 10, 17, 11, 'tree')
  grid[9][10] = 'flower'; grid[9][11] = 'flower'; grid[10][6] = 'flower'
  return {
    id: 'campos_dourados', tileSize: 16, scale: 3, width, height, grid,
    spawn: { x: 3, y: 14 },
    locations: [
      { subId: 'campos_estrada', x: 3, y: 12, icon: '🌾' },
      { subId: 'campos_fazendas', x: 4, y: 6, icon: '🐐' },
      { subId: 'campos_moinho', x: 8, y: 3, icon: '🌬️' },
      { subId: 'campos_ponte', x: 13, y: 7, icon: '🌉' },
      { subId: 'campos_ruinas', x: 18, y: 5, icon: '🏛️' },
    ],
  }
}

export const REGION_MAPS: Record<string, RegionMapDef> = {
  campos_dourados: buildCamposDourados(),
}
export function getRegionMap(regionId: string): RegionMapDef | undefined { return REGION_MAPS[regionId] }

const DIR_ICON: Record<Facing, React.ComponentType<{ size?: number | string }>> = { up: ArrowUp, down: ArrowDown, left: ArrowLeft, right: ArrowRight }

export function TileWorldExplorer({ map, initialPosition, paused, onEnterLocation, locationStatus }: {
  map: RegionMapDef
  initialPosition?: { x: number; y: number }
  paused?: boolean
  onEnterLocation: (subId: string) => void
  locationStatus?: (subId: string) => 'done' | 'ready' | 'default'
}) {
  const [pos, setPos] = React.useState(initialPosition ?? map.spawn)
  const [facing, setFacing] = React.useState<Facing>('down')
  const [walking, setWalking] = React.useState(false)
  const movingRef = React.useRef(false)

  const step = React.useCallback((dx: number, dy: number) => {
    if (movingRef.current || paused) return
    const dir: Facing = dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up'
    setFacing(dir)
    const tx = pos.x + dx, ty = pos.y + dy
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return
    if (!WALKABLE.has(map.grid[ty][tx])) return
    movingRef.current = true; setWalking(true)
    setPos({ x: tx, y: ty })
    window.setTimeout(() => {
      movingRef.current = false; setWalking(false)
      const loc = map.locations.find(l => l.x === tx && l.y === ty)
      if (loc) onEnterLocation(loc.subId)
    }, STEP_MS)
  }, [pos, paused, map, onEnterLocation])

  React.useEffect(() => {
    if (paused) return
    const keyMap: Record<string, [number, number]> = {
      ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0],
    }
    const onKey = (e: KeyboardEvent) => {
      const d = keyMap[e.key]
      if (!d) return
      e.preventDefault()
      step(d[0], d[1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, paused])

  const tilePx = map.tileSize * map.scale
  const worldW = map.width * tilePx, worldH = map.height * tilePx
  const viewportW = Math.min(worldW, VIEWPORT_TILES_X * tilePx)
  const viewportH = Math.min(worldH, VIEWPORT_TILES_Y * tilePx)
  const camX = clamp(pos.x * tilePx + tilePx / 2 - viewportW / 2, 0, Math.max(0, worldW - viewportW))
  const camY = clamp(pos.y * tilePx + tilePx / 2 - viewportH / 2, 0, Math.max(0, worldH - viewportH))
  const DirIcon = DIR_ICON[facing]

  return <div className="regionmap-frame">
    <div className="regionmap-viewport" style={{ width: viewportW, height: viewportH }}>
      <div className="regionmap-world" style={{ width: worldW, height: worldH, transform: `translate3d(${-camX}px,${-camY}px,0)` }}>
        <div className="regionmap-tiles" style={{ gridTemplateColumns: `repeat(${map.width},${tilePx}px)`, gridAutoRows: `${tilePx}px` }}>
          {map.grid.flatMap((row, y) => row.map((t, x) => <div key={`${x}_${y}`} className={`regionmap-tile tile-${t}`} />))}
        </div>
        {map.locations.map(loc => {
          const status = locationStatus?.(loc.subId) ?? 'default'
          return <button key={loc.subId} type="button" className={`regionmap-location status-${status}`}
            style={{ left: loc.x * tilePx, top: loc.y * tilePx, width: tilePx, height: tilePx }}
            onClick={() => onEnterLocation(loc.subId)} aria-label={`Explorar ${loc.subId}`}>
            <span className="regionmap-location-pulse" />
            <span className="regionmap-location-icon">{loc.icon ?? '◆'}</span>
          </button>
        })}
        <div className={`regionmap-player facing-${facing}${walking ? ' walking' : ''}`}
          style={{ left: pos.x * tilePx, top: pos.y * tilePx, width: tilePx, height: tilePx }}>
          <span className="regionmap-player-token"><DirIcon size={14} /></span>
        </div>
      </div>
    </div>
    <div className="regionmap-controls">
      <p className="regionmap-hint">Use as setas (ou WASD) e ande até um marcador para explorar o local.</p>
      <div className="regionmap-dpad" role="group" aria-label="Controles de movimento">
        <button type="button" className="dpad-up" onClick={() => step(0, -1)} aria-label="Mover para cima"><ArrowUp size={16} /></button>
        <button type="button" className="dpad-left" onClick={() => step(-1, 0)} aria-label="Mover para esquerda"><ArrowLeft size={16} /></button>
        <button type="button" className="dpad-down" onClick={() => step(0, 1)} aria-label="Mover para baixo"><ArrowDown size={16} /></button>
        <button type="button" className="dpad-right" onClick={() => step(1, 0)} aria-label="Mover para direita"><ArrowRight size={16} /></button>
      </div>
    </div>
  </div>
}
