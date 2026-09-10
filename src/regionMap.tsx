// Motor genérico de navegação espacial estilo "Pokémon FireRed" para a tela de região.
// Autocontido de propósito: não importa nada de main.tsx (evita import circular), só sabe
// desenhar um grid de tiles, mover um personagem sobre ele e avisar o chamador quando o
// jogador pisa num marcador de sub-região. Quem decide o que acontece ao entrar num marcador
// (abrir card, checar progresso etc.) é o componente que usa <TileWorldExplorer/>.
import React from 'react'
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'

// Grid "de autoria" -- o que se desenha à mão em build*() usando fill/hline/vline/rect.
// Tipos genéricos: não sabem (nem precisam saber) qual variante de arte existe pra cada caso.
type BaseTile = 'grass' | 'flower' | 'tree' | 'water' | 'path' | 'bridge'

// Grid "de renderização" -- variante exata de arte, resolvida a partir do grid de autoria por
// resolveTerrain() olhando os vizinhos de cada célula. É o que TileWorldExplorer de fato desenha
// e testa colisão; cada valor tem uma classe `.tile-<valor>` correspondente em styles.css.
export type MapTile =
  | 'grass' | 'flower' | 'tree' | 'water'
  | 'bank_v' | 'bank_v_r' | 'bank_h' | 'bank_h_r'
  | 'path_v' | 'path_h' | 'path_corner_br' | 'path_corner_bl' | 'path_corner_tr' | 'path_corner_tl'
  | 'bridge_cap_top' | 'bridge_mid' | 'bridge_cap_bottom'

const WALKABLE = new Set<MapTile>([
  'grass', 'flower',
  'bank_v', 'bank_v_r', 'bank_h', 'bank_h_r',
  'path_v', 'path_h', 'path_corner_br', 'path_corner_bl', 'path_corner_tr', 'path_corner_tl',
  'bridge_cap_top', 'bridge_mid', 'bridge_cap_bottom',
])

export interface RegionMapLocation { subId: string; x: number; y: number; icon?: string }
export interface RegionMapDef {
  id: string
  tileSize: number // tamanho nativo do tile em px (referência da arte-fonte antes do recorte)
  scale: number // fator de ampliação usado na renderização atual
  width: number // largura em tiles
  height: number // altura em tiles
  grid: MapTile[][] // [y][x], já resolvido por resolveTerrain()
  spawn: { x: number; y: number }
  locations: RegionMapLocation[]
}

type Facing = 'up' | 'down' | 'left' | 'right'
const STEP_MS = 170
const VIEWPORT_TILES_X = 13
const VIEWPORT_TILES_Y = 9

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)) }

function fill(w: number, h: number, tile: BaseTile): BaseTile[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => tile))
}
function hline(grid: BaseTile[][], x0: number, x1: number, y: number, tile: BaseTile) {
  const [a, b] = x0 <= x1 ? [x0, x1] : [x1, x0]
  for (let x = a; x <= b; x++) grid[y][x] = tile
}
function vline(grid: BaseTile[][], y0: number, y1: number, x: number, tile: BaseTile) {
  const [a, b] = y0 <= y1 ? [y0, y1] : [y1, y0]
  for (let y = a; y <= b; y++) grid[y][x] = tile
}
function rect(grid: BaseTile[][], x0: number, y0: number, x1: number, y1: number, tile: BaseTile) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (grid[y]?.[x] !== undefined) grid[y][x] = tile
}

// Compila o grid de autoria pro grid de renderização. Só existe 1 tile reto de caminho + 4
// curvas (não uma peça pra cada combinação de vizinhos), então a peça certa é escolhida aqui
// olhando pra cima/baixo/esquerda/direita de cada célula 'path'. Pontas soltas (só 1 vizinho)
// e cruzamentos (3+ vizinhos) não têm arte própria -- caem numa reta razoável como fallback;
// nenhum mapa atual tem esse caso, mas fica registrado caso um mapa futuro precise de mais peças.
// Margens do rio nem existem no grid de autoria: são derivadas automaticamente onde uma célula
// 'grass' encosta em 'water', então o autor só desenha água e grama normalmente.
function resolveTerrain(base: BaseTile[][]): MapTile[][] {
  const h = base.length, w = base[0]?.length ?? 0
  const at = (x: number, y: number): BaseTile | undefined => base[y]?.[x]
  const isPathLike = (t?: BaseTile) => t === 'path' || t === 'bridge'
  const out: MapTile[][] = []
  for (let y = 0; y < h; y++) {
    const row: MapTile[] = []
    for (let x = 0; x < w; x++) {
      const t = base[y][x]
      let resolved: MapTile
      if (t === 'path') {
        const up = isPathLike(at(x, y - 1)), down = isPathLike(at(x, y + 1))
        const left = isPathLike(at(x - 1, y)), right = isPathLike(at(x + 1, y))
        if (down && right) resolved = 'path_corner_br'
        else if (down && left) resolved = 'path_corner_bl'
        else if (up && right) resolved = 'path_corner_tr'
        else if (up && left) resolved = 'path_corner_tl'
        else if (left || right) resolved = 'path_h'
        else resolved = 'path_v'
      } else if (t === 'bridge') {
        const up = at(x, y - 1) === 'bridge', down = at(x, y + 1) === 'bridge'
        resolved = !up ? 'bridge_cap_top' : !down ? 'bridge_cap_bottom' : 'bridge_mid'
      } else if (t === 'grass') {
        if (at(x + 1, y) === 'water') resolved = 'bank_v'
        else if (at(x - 1, y) === 'water') resolved = 'bank_v_r'
        else if (at(x, y + 1) === 'water') resolved = 'bank_h'
        else if (at(x, y - 1) === 'water') resolved = 'bank_h_r'
        else resolved = 'grass'
      } else {
        resolved = t // 'flower' | 'tree' | 'water'
      }
      row.push(resolved)
    }
    out.push(row)
  }
  return out
}

// Planícies de Alvora (campos_dourados) — região de entrada, usada como protótipo.
// Layout: chegada ao sul, trilha sobe até a estrada, segue por fazendas e moinho a noroeste,
// atravessa um rio por uma ponte comprida (a própria sub-região "Ponte de Eldrimar") e termina
// nas ruínas a leste. Toda a borda é mata fechada (não andável); o interior é campo aberto.
function buildCamposDourados(): RegionMapDef {
  const width = 22, height = 16
  const base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree')
  vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  vline(base, 2, 12, 13, 'water') // rio norte-sul
  vline(base, 12, 14, 3, 'path') // chegada -> estrada
  hline(base, 3, 4, 12, 'path')
  vline(base, 6, 12, 4, 'path') // estrada -> fazendas
  hline(base, 4, 8, 6, 'path')
  vline(base, 3, 6, 8, 'path') // fazendas -> moinho
  hline(base, 8, 13, 3, 'path') // moinho -> margem norte do rio
  vline(base, 3, 7, 13, 'bridge') // a ponte, atravessando o rio
  hline(base, 13, 18, 7, 'path') // ponte -> ruínas
  vline(base, 5, 7, 18, 'path')
  // Sem bosquetes decorativos isolados: a arte de árvore é uma parede densa pensada pra
  // borda contínua do mapa, então um blocão 2x2 sozinho no meio do campo aberto ficava com
  // cara de bloco quadrado artificial (sem afunilamento nem borda arredondada). Uma faixa de
  // flores espalhadas cumpre o mesmo papel decorativo sem esse problema, já que é a mesma
  // textura de grama por baixo -- funde com a vizinhança em vez de destoar.
  base[9][10] = 'flower'; base[9][11] = 'flower'; base[10][6] = 'flower'
  base[5][3] = 'flower'; base[6][5] = 'flower'; base[11][16] = 'flower'; base[11][17] = 'flower'
  return {
    id: 'campos_dourados', tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base),
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

// Ciclo de caminhada gerado (ChatGPT/gpt-image-1): 3 quadros por direção (perna esquerda à
// frente / passo neutro / perna direita à frente) em public/assets/maps/sprites/adventurer/
// <direção>_<quadro>.png, recortados e com fundo removido por flood-fill a partir da borda.
// Só existe arte para baixo/cima/direita -- "esquerda" é a mesma arte de "direita" espelhada
// em CSS (scaleX(-1)), técnica padrão pra não precisar gerar/manter uma arte espelhada à parte.
const PLAYER_SPRITE: Record<Facing, { frames: string[]; mirror?: boolean }> = {
  down: { frames: [0, 1, 2].map(i => `/assets/maps/sprites/adventurer/down_${i}.png`) },
  up: { frames: [0, 1, 2].map(i => `/assets/maps/sprites/adventurer/up_${i}.png`) },
  right: { frames: [0, 1, 2].map(i => `/assets/maps/sprites/adventurer/right_${i}.png`) },
  left: { frames: [0, 1, 2].map(i => `/assets/maps/sprites/adventurer/right_${i}.png`), mirror: true },
}
const IDLE_FRAME = 1 // quadro do meio (passo neutro) -- pose de "parado" entre um passo e outro

export function TileWorldExplorer({ map, initialPosition, paused, onEnterLocation, locationStatus }: {
  map: RegionMapDef
  initialPosition?: { x: number; y: number }
  paused?: boolean
  onEnterLocation: (subId: string) => void
  locationStatus?: (subId: string) => 'done' | 'ready' | 'default'
}) {
  const [pos, setPos] = React.useState(initialPosition ?? map.spawn)
  const [facing, setFacing] = React.useState<Facing>('down')
  const [frame, setFrame] = React.useState(IDLE_FRAME)
  const movingRef = React.useRef(false)

  const step = React.useCallback((dx: number, dy: number) => {
    if (movingRef.current || paused) return
    const dir: Facing = dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up'
    setFacing(dir)
    const tx = pos.x + dx, ty = pos.y + dy
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return
    if (!WALKABLE.has(map.grid[ty][tx])) return
    movingRef.current = true
    // Alterna 0->1->2->0... a cada passo aceito -- é o ciclo de caminhada em si (perna
    // esquerda, neutro, perna direita), não uma animação por tempo separada do movimento.
    setFrame(f => (f + 1) % 3)
    setPos({ x: tx, y: ty })
    window.setTimeout(() => {
      movingRef.current = false
      setFrame(IDLE_FRAME)
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
  const sprite = PLAYER_SPRITE[facing]
  const frameSrc = sprite.frames[frame]

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
        <div className="regionmap-player"
          style={{ left: pos.x * tilePx, top: pos.y * tilePx, width: tilePx, height: tilePx }}>
          <span className="regionmap-player-sprite-wrap" style={sprite.mirror ? { transform: 'scaleX(-1)' } : undefined}>
            <img className="regionmap-player-sprite" src={frameSrc} alt="" />
          </span>
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
