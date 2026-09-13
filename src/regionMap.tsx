// Motor genérico de navegação espacial estilo "Pokémon FireRed" para a tela de região.
// Autocontido de propósito: não importa nada de main.tsx (evita import circular), só sabe
// desenhar um grid de tiles, mover um personagem sobre ele e avisar o chamador quando o
// jogador pisa num marcador de sub-região. Quem decide o que acontece ao entrar num marcador
// (abrir card, checar progresso etc.) é o componente que usa <TileWorldExplorer/>.
import React from 'react'
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ZoomIn, ZoomOut } from 'lucide-react'
import type { NpcDefinition } from './data/npcs'

// GitHub Pages serve o app num subcaminho (ex.: /Bangalores/), então caminhos absolutos
// como '/assets/...' resolvem para a raiz do domínio e quebram (404) em produção -- só
// funcionam em dev, onde o app já está na raiz. import.meta.env.BASE_URL carrega o prefixo
// correto nos dois casos (replica o mesmo padrão usado por assetUrl() em main.tsx).
function mapAsset(path: string) { return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}` }

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
export interface RegionMapExit { id: 'prev' | 'next' | string; x: number; y: number; icon?: string; targetRegionId?: string }
export interface RegionMapChest {
  id: string
  name: string
  x: number
  y: number
  icon?: string
  contents: {
    gold: number
    materials?: Record<string, number>
    consumables?: Record<string, number>
  }
}
export interface RegionMapCampfire {
  id: string
  name: string
  x: number
  y: number
  icon?: string
}
export interface RegionMapDef {
  id: string
  background?: string
  tileSize: number // tamanho nativo do tile em px (referência da arte-fonte antes do recorte)
  scale: number // fator de ampliação usado na renderização atual
  width: number // largura em tiles
  height: number // altura em tiles
  grid: MapTile[][] // [y][x], já resolvido por resolveTerrain()
  spawn: { x: number; y: number }
  locations: RegionMapLocation[]
  exits?: RegionMapExit[]
  chests?: RegionMapChest[]
  campfires?: RegionMapCampfire[]
  blocked?: Array<{ x: number; y: number }>
}

type Facing = 'up' | 'down' | 'left' | 'right'
const STEP_MS = 320 // 75% da velocidade original (240ms/passo -> 320ms/passo)
const VIEWPORT_TILES_X = 18
const VIEWPORT_TILES_Y = 12
const ZOOM_MIN = 0.6
const ZOOM_MAX = 1.8
const ZOOM_STEP = 0.2
const AMBUSH_CHANCE = 0.07 // chance de emboscada cega por passo (fora de um marcador de local) -- reduzida porque agora convive com monstros visíveis no mapa (ver WANDER_*), que cobrem a maior parte dos encontros e podem ser evitados
const WANDER_RADIUS = 2 // quão longe do ponto de origem cada monstro visível pode se afastar
const WANDER_STEP_MS = 1000 // cadência do passeio -- mais lento que o passo do jogador (STEP_MS) de propósito, pra dar tempo de desviar
const WANDER_MOVE_CHANCE = 0.5 // chance de o monstro dar um passo a cada tick (o resto do tempo ele fica parado)
const WANDER_STEPS: Array<[number, number]> = [[0, -1], [1, 0], [0, 1], [-1, 0]]

// Deriva um monstro vagante por marcador de sub-região (nenhuma arte/posição própria ainda --
// ver ART-003 no VISUAL_DEVELOPMENT_HANDOFF.md). Posicionado perto do pin, num tile livre que
// não colida com nenhuma outra entidade, pra funcionar em qualquer mapa sem dado extra por região.
interface Wanderer { id: string; subId: string; home: { x: number; y: number }; x: number; y: number }
function deriveWanderers(map: RegionMapDef): Wanderer[] {
  const occupied = new Set<string>([tileKey(map.spawn.x, map.spawn.y)])
  map.locations.forEach(l => occupied.add(tileKey(l.x, l.y)))
  ;(map.exits ?? []).forEach(e => occupied.add(tileKey(e.x, e.y)))
  ;(map.chests ?? []).forEach(c => occupied.add(tileKey(c.x, c.y)))
  ;(map.campfires ?? []).forEach(c => occupied.add(tileKey(c.x, c.y)))
  const offsets: Array<[number, number]> = [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, -2], [2, -2], [-2, 2]]
  const out: Wanderer[] = []
  for (const loc of map.locations) {
    for (const [dx, dy] of offsets) {
      const x = loc.x + dx, y = loc.y + dy, key = tileKey(x, y)
      if (occupied.has(key) || !isMapWalkable(map, { x, y })) continue
      occupied.add(key)
      out.push({ id: `wander_${loc.subId}`, subId: loc.subId, home: { x, y }, x, y })
      break
    }
  }
  return out
}

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)) }
// Local (marcador de sub-região) mais próximo do ponto dado -- usado pra decidir o nível/tema
// do inimigo de uma emboscada aleatória, já que ela não nasce de um marcador específico.
function nearestLocationId(map: RegionMapDef, point: { x: number; y: number }) {
  let bestId: string | undefined, bestDist = Infinity
  for (const loc of map.locations) {
    const dist = Math.abs(loc.x - point.x) + Math.abs(loc.y - point.y)
    if (dist < bestDist) { bestDist = dist; bestId = loc.subId }
  }
  return bestId
}

function tileKey(x: number, y: number) { return `${x}:${y}` }
function isMapWalkable(map: RegionMapDef, point: { x: number; y: number }, extraBlocked = new Set<string>()) {
  return WALKABLE.has(map.grid[point.y]?.[point.x]) && !map.blocked?.some(block => block.x === point.x && block.y === point.y) && !extraBlocked.has(tileKey(point.x, point.y))
}
function nearestWalkable(map: RegionMapDef, target: { x: number; y: number }, extraBlocked = new Set<string>()) {
  if (isMapWalkable(map, target, extraBlocked)) return target
  for (let distance = 1; distance < Math.max(map.width, map.height); distance++) {
    for (let y = target.y - distance; y <= target.y + distance; y++) for (let x = target.x - distance; x <= target.x + distance; x++) {
      if (Math.abs(x - target.x) + Math.abs(y - target.y) !== distance) continue
      if (x >= 0 && y >= 0 && x < map.width && y < map.height && isMapWalkable(map, { x, y }, extraBlocked)) return { x, y }
    }
  }
  return undefined
}
function routeBetween(map: RegionMapDef, start: { x: number; y: number }, target: { x: number; y: number }, extraBlocked = new Set<string>()): Array<[number, number]> {
  const goal = nearestWalkable(map, target, extraBlocked)
  if (!goal || (goal.x === start.x && goal.y === start.y)) return []
  const queue = [start], previous = new Map<string, { from: { x: number; y: number }; step: [number, number] }>()
  const steps: Array<[number, number]> = [[0, -1], [1, 0], [0, 1], [-1, 0]]
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index]
    if (current.x === goal.x && current.y === goal.y) break
    for (const step of steps) {
      const next = { x: current.x + step[0], y: current.y + step[1] }, key = tileKey(next.x, next.y)
      if (next.x < 0 || next.y < 0 || next.x >= map.width || next.y >= map.height || previous.has(key) || tileKey(next.x, next.y) === tileKey(start.x, start.y) || !isMapWalkable(map, next, extraBlocked)) continue
      previous.set(key, { from: current, step })
      queue.push(next)
    }
  }
  const route: Array<[number, number]> = []
  let current = goal
  while (current.x !== start.x || current.y !== start.y) {
    const entry = previous.get(tileKey(current.x, current.y))
    if (!entry) return []
    route.unshift(entry.step)
    current = entry.from
  }
  return route
}

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
function blockedRects(...rectangles: Array<[number, number, number, number]>) {
  return rectangles.flatMap(([x0, y0, x1, y1]) => {
    const cells: Array<{ x: number; y: number }> = []
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) cells.push({ x, y })
    return cells
  })
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

export function validateRegionMap(map: RegionMapDef): string[] {
  const errors: string[] = []
  const isWalkable = (point: { x: number; y: number }) => isMapWalkable(map, point)
  if (!isWalkable(map.spawn)) errors.push(`${map.id}: spawn fora de uma área transitável`)
  const usedLocations = new Set<string>()
  for (const location of map.locations) {
    const key = tileKey(location.x, location.y)
    if (usedLocations.has(key)) errors.push(`${map.id}: pins sobrepostos em ${key}`)
    usedLocations.add(key)
    if (!isWalkable(location)) errors.push(`${map.id}: pin ${location.subId} fora de uma área transitável`)
    else if (location.x !== map.spawn.x || location.y !== map.spawn.y) {
      if (!routeBetween(map, map.spawn, location).length) errors.push(`${map.id}: pin ${location.subId} não pode ser alcançado a partir do spawn`)
    }
  }
  for (const exit of map.exits ?? []) {
    const key = tileKey(exit.x, exit.y)
    if (usedLocations.has(key)) errors.push(`${map.id}: saída sobreposta em ${key}`)
    usedLocations.add(key)
    if (!isWalkable(exit)) errors.push(`${map.id}: saída ${exit.id} fora de uma área transitável`)
    else if (!routeBetween(map, map.spawn, exit).length) errors.push(`${map.id}: saída ${exit.id} não pode ser alcançada a partir do spawn`)
  }
  for (const chest of map.chests ?? []) {
    const key = tileKey(chest.x, chest.y)
    if (usedLocations.has(key)) errors.push(`${map.id}: baú sobreposto em ${key}`)
    usedLocations.add(key)
    if (!isWalkable(chest)) errors.push(`${map.id}: baú ${chest.id} fora de uma área transitável`)
    else if (!routeBetween(map, map.spawn, chest).length) errors.push(`${map.id}: baú ${chest.id} não pode ser alcançado a partir do spawn`)
  }
  for (const campfire of map.campfires ?? []) {
    const key = tileKey(campfire.x, campfire.y)
    if (usedLocations.has(key)) errors.push(`${map.id}: fogueira sobreposta em ${key}`)
    usedLocations.add(key)
    if (!isWalkable(campfire)) errors.push(`${map.id}: fogueira ${campfire.id} fora de uma área transitável`)
    else if (!routeBetween(map, map.spawn, campfire).length) errors.push(`${map.id}: fogueira ${campfire.id} não pode ser alcançada a partir do spawn`)
  }
  return errors
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
  // A trilha de colisão acompanha os marcos da nova arte: estrada ao sul,
  // ruínas no noroeste, ponte no rio central e fazenda/moinho no nordeste.
  vline(base, 1, 6, 15, 'water')
  vline(base, 8, 14, 15, 'water')
  vline(base, 8, 14, 10, 'path')
  hline(base, 5, 15, 8, 'path')
  hline(base, 14, 16, 7, 'bridge')
  hline(base, 16, 18, 8, 'path')
  vline(base, 4, 8, 18, 'path')
  vline(base, 1, 4, 20, 'path')
  hline(base, 18, 20, 4, 'path')
  vline(base, 2, 8, 5, 'path')
  base[9][10] = 'flower'; base[9][11] = 'flower'; base[10][6] = 'flower'
  base[5][3] = 'flower'; base[6][5] = 'flower'; base[11][16] = 'flower'; base[11][17] = 'flower'
  // A arte agora é a camada visual; esta malha é exclusivamente a colisão. Reiniciamos
  // os caminhos do protótipo para que o rio bloqueie a travessia em toda a extensão,
  // deixando aberta somente a ponte horizontal desenhada no cenário.
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) base[y][x] = 'grass'
  const riverRows: Array<[number, number, number]> = [
    [0, 11, 14], [1, 11, 14], [2, 12, 15], [3, 13, 15], [4, 13, 16], [5, 14, 16],
    [6, 15, 17], [7, 16, 17], [8, 16, 18], [9, 16, 18], [10, 17, 20], [11, 17, 21],
    [12, 17, 21], [13, 17, 21], [14, 17, 21], [15, 17, 21],
  ]
  riverRows.forEach(([y, from, to]) => hline(base, from, to, y, 'water'))
  // Uma linha extra no topo transforma a entrada da escada em uma plataforma de
  // aproximação, em vez de exigir que o personagem encontre a borda exata da ponte.
  hline(base, 14, 17, 5, 'bridge')
  hline(base, 14, 17, 6, 'bridge')
  return {
    id: 'campos_dourados', background: mapAsset('assets/maps/campos-dourados-overworld.png'), tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base), blocked: blockedRects([3, 1, 4, 1], [18, 2, 21, 3], [2, 8, 5, 10]),
    // Ponto de chegada na estrada principal. Evita iniciar colado à borda inferior,
    // onde a câmera precisava acompanhar o primeiro passo para revelar o personagem.
    spawn: { x: 10, y: 9 },
    exits: [
      { id: 'west_serra', x: 1, y: 4, icon: '←', targetRegionId: 'montanhas_cinzentas' },
      { id: 'east_abdendriel', x: 20, y: 7, icon: '➜', targetRegionId: 'floresta_lunargenta' },
      { id: 'south_kholgard', x: 10, y: 14, icon: '↓', targetRegionId: 'khar_dur' },
    ],
    locations: [
      { subId: 'campos_estrada', x: 10, y: 13, icon: '🌾' },
      { subId: 'campos_fazendas', x: 18, y: 4, icon: '🐐' },
      { subId: 'campos_moinho', x: 20, y: 1, icon: '🌬️' },
      { subId: 'campos_ponte', x: 16, y: 6, icon: '🌉' },
      { subId: 'campos_ruinas', x: 5, y: 2, icon: '🏛️' },
    ],
    chests: [
      { id: 'campos_bau_1', name: 'Baú dos Viajantes', x: 3, y: 5, icon: '📦', contents: { gold: 50, materials: { minerio_ferro: 2 }, consumables: { pocao_cura: 1 } } },
    ],
    campfires: [
      { id: 'campos_fogueira', name: 'Fogueira das Planícies', x: 10, y: 8, icon: '🔥' },
    ],
  }
}

// Floresta Lunargenta: a rota central nasce ao sul e bifurca para o lago, a árvore anciã
// e os passadiços do pântano. A arte é visual; os trechos de água abaixo são a colisão.
function buildFlorestaLunargenta(): RegionMapDef {
  const width = 22, height = 16
  const base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree')
  vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  // Lago do Espelho Lunar e seu córrego de saída; a margem a leste continua acessível.
  rect(base, 1, 1, 6, 5, 'water')
  vline(base, 5, 9, 7, 'water')
  hline(base, 6, 8, 6, 'bridge')
  // Pântano: as tábuas são o único caminho transitável sobre a água.
  rect(base, 15, 8, 20, 14, 'water')
  hline(base, 15, 20, 10, 'bridge')
  vline(base, 8, 13, 18, 'bridge')
  return {
    id: 'floresta_lunargenta', background: mapAsset('assets/maps/floresta-lunargenta-overworld.png'), tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base), blocked: blockedRects([15, 1, 16, 2], [19, 2, 20, 5], [2, 10, 5, 13]),
    spawn: { x: 11, y: 13 },
    exits: [
      { id: 'west_planicies', x: 1, y: 7, icon: '←', targetRegionId: 'campos_dourados' },
      { id: 'south_morvath', x: 11, y: 14, icon: '↓', targetRegionId: 'terras_mortas' },
      { id: 'north_serra', x: 11, y: 1, icon: '↑', targetRegionId: 'montanhas_cinzentas' },
    ],
    locations: [
      { subId: 'lunar_bosque', x: 10, y: 11, icon: '🌲' },
      { subId: 'lunar_goblins', x: 4, y: 8, icon: '👺' },
      { subId: 'lunar_monolito', x: 11, y: 5, icon: '🗿' },
      { subId: 'lunar_aranhas', x: 6, y: 9, icon: '🕷️' },
      { subId: 'lunar_lago', x: 7, y: 4, icon: '🌙' },
      { subId: 'lunar_raizes', x: 17, y: 3, icon: '🌳' },
      { subId: 'lunar_pantano', x: 18, y: 10, icon: '🐸' },
    ],
    chests: [
      { id: 'lunar_bau_1', name: 'Arca Escondida dos Druidas', x: 13, y: 8, icon: '📦', contents: { gold: 75, materials: { seiva_pura: 3 }, consumables: { pocao_cura: 2 } } },
    ],
    campfires: [
      { id: 'lunar_fogueira', name: 'Fogueira do Bosque Prateado', x: 9, y: 13, icon: '🔥' },
    ],
  }
}

// Montanhas Cinzentas: o abismo divide a subida em dois platôs. A ponte no centro-leste
// é deliberadamente a única passagem para o cume, reproduzindo a leitura da arte.
function buildMontanhasCinzentas(): RegionMapDef {
  const width = 22, height = 16
  const base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree')
  vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  // O vão acompanha o abismo visual e preserva uma entrada ampla na ponte suspensa.
  rect(base, 14, 3, 17, 11, 'water')
  hline(base, 13, 18, 7, 'bridge')
  return {
    id: 'montanhas_cinzentas', background: mapAsset('assets/maps/montanhas-cinzentas-overworld.png'), tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base), blocked: blockedRects([1, 1, 3, 2], [7, 1, 9, 3], [11, 1, 13, 3], [3, 8, 6, 10], [8, 8, 10, 10]),
    spawn: { x: 11, y: 13 },
    exits: [
      { id: 'west_planicies', x: 1, y: 7, icon: '←', targetRegionId: 'campos_dourados' },
      { id: 'next', x: 20, y: 2, icon: '➜' },
    ],
    locations: [
      { subId: 'montanhas_passagem', x: 11, y: 11, icon: '⛰️' },
      { subId: 'montanhas_mina', x: 9, y: 6, icon: '⛏️' },
      { subId: 'montanhas_gelo', x: 12, y: 5, icon: '🧊' },
      { subId: 'montanhas_forte', x: 5, y: 3, icon: '🏰' },
      { subId: 'montanhas_abismo', x: 15, y: 7, icon: '🕳️' },
      { subId: 'montanhas_cume', x: 19, y: 2, icon: '⚡' },
    ],
    chests: [
      { id: 'montanhas_bau_1', name: 'Cofre dos Mineradores', x: 5, y: 6, icon: '📦', contents: { gold: 90, materials: { ferro_cinzento: 3 }, consumables: { tonico_regeneracao: 1 } } },
    ],
    campfires: [
      { id: 'montanhas_fogueira', name: 'Fogueira do Pico Cinzento', x: 10, y: 13, icon: '🔥' },
    ],
  }
}

// Pico Escarlate: rios de lava cortam a rota de ascensão. As plataformas de ferro dão
// passagens amplas, sem obrigar o jogador a encontrar o pixel exato de cada ponte.
function buildPicoEscarlate(): RegionMapDef {
  const width = 22, height = 16
  const base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree')
  vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  // Fenda de lava antes da forja; a ponte central sustenta o acesso ao platô norte.
  rect(base, 10, 1, 12, 5, 'water')
  hline(base, 9, 13, 5, 'bridge')
  // A cratera é perigosa, mas a borda oeste e a plataforma inferior permitem investigá-la.
  rect(base, 17, 7, 20, 10, 'water')
  hline(base, 16, 20, 10, 'bridge')
  return {
    id: 'pico_escarlate', background: mapAsset('assets/maps/pico-escarlate-overworld.png'), tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base), blocked: blockedRects([1, 7, 4, 9], [6, 6, 8, 8], [12, 8, 14, 10], [5, 11, 8, 13]),
    spawn: { x: 11, y: 13 },
    exits: [
      { id: 'west_serra', x: 1, y: 5, icon: '←', targetRegionId: 'montanhas_cinzentas' },
      { id: 'east_sol_negro', x: 20, y: 5, icon: '➜', targetRegionId: 'coracao_eclipse' },
      { id: 'south_abdendriel', x: 11, y: 14, icon: '↓', targetRegionId: 'floresta_lunargenta' },
    ],
    locations: [
      { subId: 'pico_encosta', x: 11, y: 10, icon: '🌋' },
      { subId: 'pico_ninho_dragao', x: 18, y: 4, icon: '🐉' },
      { subId: 'pico_cinzas', x: 4, y: 3, icon: '🔥' },
      { subId: 'pico_forja', x: 16, y: 2, icon: '⚒️' },
      { subId: 'pico_cratera', x: 16, y: 8, icon: '☀️' },
    ],
    chests: [
      { id: 'pico_bau_1', name: 'Urna da Montanha Flamejante', x: 6, y: 4, icon: '📦', contents: { gold: 110, materials: { pedra_brasa: 3 }, consumables: { tonico_forca: 1 } } },
    ],
    campfires: [
      { id: 'pico_fogueira', name: 'Brasa das Forjas de Ignaris', x: 12, y: 13, icon: '🔥' },
    ],
  }
}

// Terras Mortas: a estrada seca conecta vila e torre. O brejo espectral só aceita passagem
// pelos tabuleiros e plataformas de pedra, mantendo o risco visual coerente com a colisão.
function buildTerrasMortas(): RegionMapDef {
  const width = 22, height = 16
  const base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree')
  vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  rect(base, 13, 7, 20, 14, 'water')
  hline(base, 13, 20, 10, 'bridge')
  vline(base, 7, 14, 17, 'bridge')
  return {
    id: 'terras_mortas', background: mapAsset('assets/maps/terras-mortas-overworld.png'), tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base), blocked: blockedRects([1, 1, 3, 3], [7, 1, 9, 3], [11, 1, 13, 4], [3, 9, 5, 11]),
    spawn: { x: 11, y: 13 },
    exits: [
      { id: 'west_kholgard', x: 1, y: 10, icon: '←', targetRegionId: 'khar_dur' },
      { id: 'east_sol_negro', x: 20, y: 10, icon: '➜', targetRegionId: 'coracao_eclipse' },
      { id: 'north_abdendriel', x: 10, y: 1, icon: '↑', targetRegionId: 'floresta_lunargenta' },
    ],
    locations: [
      { subId: 'mortas_campos', x: 10, y: 12, icon: '🪦' },
      { subId: 'mortas_catacumbas', x: 8, y: 8, icon: '⚰️' },
      { subId: 'mortas_vila', x: 5, y: 3, icon: '🏚️' },
      { subId: 'mortas_brejo', x: 17, y: 10, icon: '🕯️' },
      { subId: 'mortas_torre', x: 17, y: 2, icon: '🗼' },
    ],
    chests: [
      { id: 'mortas_bau_1', name: 'Relicário dos Esquecidos', x: 4, y: 6, icon: '📦', contents: { gold: 125, materials: { osso_espectral: 3 }, consumables: { pocao_escudo: 1 } } },
    ],
    campfires: [
      { id: 'mortas_fogueira', name: 'Vela Protetora do Ermo', x: 12, y: 13, icon: '🔥' },
    ],
  }
}

function buildKharDur(): RegionMapDef {
  const width = 22, height = 16, base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree'); vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  rect(base, 2, 7, 8, 14, 'water'); hline(base, 2, 8, 10, 'bridge')
  return { id: 'khar_dur', background: mapAsset('assets/maps/khar-dur-overworld.png'), tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base), blocked: blockedRects([2, 1, 4, 3], [7, 1, 9, 3], [13, 1, 15, 3], [3, 6, 7, 8], [14, 6, 16, 8]), spawn: { x: 11, y: 13 }, exits: [
    { id: 'west_planicies', x: 1, y: 6, icon: '←', targetRegionId: 'campos_dourados' },
    { id: 'north_abdendriel', x: 10, y: 1, icon: '↑', targetRegionId: 'floresta_lunargenta' },
    { id: 'east_morvath', x: 20, y: 13, icon: '➜', targetRegionId: 'terras_mortas' },
  ], locations: [
    { subId: 'khar_galerias', x: 10, y: 9, icon: '🛤️' }, { subId: 'khar_labirinto', x: 9, y: 11, icon: '🌀' }, { subId: 'khar_templo_minotauro', x: 12, y: 10, icon: '🐂' },
    { subId: 'khar_forjas', x: 5, y: 3, icon: '🔥' }, { subId: 'khar_cofre', x: 17, y: 3, icon: '🔐' }, { subId: 'khar_profundezas', x: 17, y: 10, icon: '⛏️' },
  ],
  chests: [
    { id: 'khar_bau_1', name: 'Cofre da Fortaleza Subterrânea', x: 18, y: 5, icon: '📦', contents: { gold: 150, materials: { aco_runico: 3 }, consumables: { pocao_cura_superior: 1 } } },
  ],
  campfires: [
    { id: 'khar_fogueira', name: 'Tocha Rúnica das Galerias', x: 12, y: 13, icon: '🔥' },
  ] }
}

// Reino do Sol Negro: a estrada ritual conecta os seis marcos, enquanto o vazio arcano
// só pode ser cruzado pelas pontes de pedra visíveis na arte.
function buildCoracaoEclipse(): RegionMapDef {
  const width = 22, height = 16
  const base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree')
  vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  rect(base, 14, 7, 20, 14, 'water')
  hline(base, 13, 20, 10, 'bridge')
  vline(base, 7, 14, 18, 'bridge')
  return {
    id: 'coracao_eclipse', background: mapAsset('assets/maps/coracao-eclipse-overworld.png'), tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base),
    blocked: blockedRects([1, 1, 2, 3], [6, 1, 8, 3], [13, 1, 15, 3], [2, 11, 5, 13], [9, 7, 11, 9]),
    spawn: { x: 11, y: 13 },
    exits: [
      { id: 'prev', x: 11, y: 14, icon: '←' },
    ],
    locations: [
      { subId: 'eclipse_portoes', x: 11, y: 12, icon: '🚪' },
      { subId: 'eclipse_torre', x: 4, y: 3, icon: '🗼' },
      { subId: 'eclipse_trono', x: 11, y: 2, icon: '👑' },
      { subId: 'eclipse_jardim', x: 4, y: 8, icon: '✦' },
      { subId: 'eclipse_arquivo', x: 18, y: 3, icon: '📜' },
      { subId: 'eclipse_fenda', x: 18, y: 10, icon: '🜏' },
    ],
    chests: [
      { id: 'eclipse_bau_1', name: 'Arca do Vazio Estelar', x: 16, y: 5, icon: '📦', contents: { gold: 200, materials: { fragmento_eclipse: 4 }, consumables: { tonico_forca: 2 } } },
    ],
    campfires: [
      { id: 'eclipse_fogueira', name: 'Fogueira do Altar Negro', x: 12, y: 13, icon: '🔥' },
    ],
  }
}

// ============================================================================
// STEELMERE: MAPAS NAVEGÁVEIS 2D
// ============================================================================

function buildFrostgard(): RegionMapDef {
  const width = 22, height = 16
  // Colisão autorada em cima da arte entregue pelo Codex (ART-001 em
  // VISUAL_DEVELOPMENT_HANDOFF.md): canal congelado central (com ponte de metal cruzando em
  // y=7, visível na arte) e os quatro complexos de caldeira/torre nos cantos como obstáculo.
  // O grid em si é invisível (.regionmap-tiles.art-backed{opacity:0}) -- só define colisão.
  const base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree')
  vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  rect(base, 13, 1, 15, 10, 'water') // canal, do topo até a ponte e um pouco além
  rect(base, 13, 11, 19, 14, 'water') // poça/cachoeira congelada mais larga ao sul
  hline(base, 12, 16, 7, 'bridge') // ponte de metal visível na arte, cruzando o canal
  return {
    id: 'frostgard', background: mapAsset('assets/maps/steelmere/frostgard.png'), tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base),
    spawn: { x: 11, y: 13 },
    exits: [
      { id: 'south_engrenverde', x: 11, y: 14, icon: '↓', targetRegionId: 'engrenverde' },
      { id: 'east_vulcannis', x: 20, y: 7, icon: '➜', targetRegionId: 'vulcannis' },
      { id: 'airship_havendown', x: 1, y: 7, icon: '←', targetRegionId: 'campos_dourados' },
    ],
    locations: [
      { subId: 'frost_rota', x: 10, y: 12, icon: '⚙️' },
      { subId: 'frost_refinaria', x: 5, y: 8, icon: '🧊' },
      { subId: 'frost_fenda', x: 17, y: 8, icon: '💨' },
      { subId: 'frost_estaleiro', x: 5, y: 3, icon: '🎈' },
      { subId: 'frost_geleira', x: 16, y: 3, icon: '❄️' },
    ],
    chests: [
      { id: 'frost_bau_1', name: 'Baú do Criovapor', x: 19, y: 3, icon: '📦', contents: { gold: 120, materials: { engrenagem_reforcada: 3, latao: 2 }, consumables: { tonico_regeneracao: 1 } } },
    ],
    campfires: [
      { id: 'frost_fogueira', name: 'Caldeira de Aquecimento de Frostgard', x: 12, y: 11, icon: '🔥' },
    ],
    blocked: blockedRects(
      [0, 1, 4, 3], // caldeira/torre noroeste
      [17, 0, 21, 2], // caldeira/torre nordeste + trilhos de mineração
      [0, 10, 2, 13], // torre sudoeste
      [17, 13, 21, 15], // área cercada/industrial sudeste, junto à poça congelada
    ),
  }
}

function buildEngrenverde(): RegionMapDef {
  const width = 22, height = 16
  const base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree')
  vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  rect(base, 2, 5, 4, 11, 'water')
  hline(base, 1, 5, 8, 'bridge')
  return {
    id: 'engrenverde', tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base),
    spawn: { x: 11, y: 13 },
    exits: [
      { id: 'north_frostgard', x: 11, y: 1, icon: '↑', targetRegionId: 'frostgard' },
      { id: 'east_aetherium', x: 20, y: 8, icon: '➜', targetRegionId: 'aetherium' },
      { id: 'south_ferrujal', x: 11, y: 14, icon: '↓', targetRegionId: 'ferrujal' },
    ],
    locations: [
      { subId: 'engren_trilha', x: 11, y: 12, icon: '⚙️' },
      { subId: 'engren_vila', x: 6, y: 8, icon: '🌲' },
      { subId: 'engren_estufa', x: 16, y: 8, icon: '🌿' },
      { subId: 'engren_torre', x: 5, y: 3, icon: '🎐' },
      { subId: 'engren_cerne', x: 16, y: 3, icon: '🌳' },
    ],
    chests: [
      { id: 'engren_bau_1', name: 'Cofre Botânico de Engrenverde', x: 18, y: 3, icon: '📦', contents: { gold: 140, materials: { madeira_viva: 3, cobre: 4 }, consumables: { pocao_cura_superior: 1 } } },
    ],
    campfires: [
      { id: 'engren_fogueira', name: 'Acampamento da Vila Suspensa', x: 12, y: 11, icon: '🔥' },
    ],
  }
}

function buildTrilhouro(): RegionMapDef {
  const width = 22, height = 16
  const base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree')
  vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  rect(base, 14, 5, 15, 11, 'water')
  hline(base, 13, 16, 8, 'bridge')
  return {
    id: 'trilhouro', tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base),
    spawn: { x: 11, y: 13 },
    exits: [
      { id: 'north_vulcannis', x: 11, y: 1, icon: '↑', targetRegionId: 'vulcannis' },
      { id: 'west_aetherium', x: 1, y: 8, icon: '←', targetRegionId: 'aetherium' },
      { id: 'south_coroferro', x: 11, y: 14, icon: '↓', targetRegionId: 'coroferro' },
    ],
    locations: [
      { subId: 'trilho_trilhos', x: 11, y: 12, icon: '🚂' },
      { subId: 'trilho_fazenda', x: 5, y: 8, icon: '🌾' },
      { subId: 'trilho_silo', x: 17, y: 8, icon: '🛢️' },
      { subId: 'trilho_comboio', x: 5, y: 3, icon: '👻' },
      { subId: 'trilho_terminal', x: 16, y: 3, icon: '🏛️' },
    ],
    chests: [
      { id: 'trilho_bau_1', name: 'Vagão Lacrado de Trilhouro', x: 18, y: 3, icon: '📦', contents: { gold: 160, materials: { latao: 4, engrenagem_reforcada: 2 }, consumables: { pocao_escudo: 1 } } },
    ],
    campfires: [
      { id: 'trilho_fogueira', name: 'Fogueira dos Ferroviários', x: 10, y: 11, icon: '🔥' },
    ],
  }
}

function buildVulcannis(): RegionMapDef {
  const width = 22, height = 16
  const base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree')
  vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  rect(base, 9, 2, 12, 5, 'water')
  hline(base, 8, 13, 4, 'bridge')
  return {
    id: 'vulcannis', tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base),
    spawn: { x: 11, y: 13 },
    exits: [
      { id: 'west_frostgard', x: 1, y: 7, icon: '←', targetRegionId: 'frostgard' },
      { id: 'south_trilhouro', x: 11, y: 14, icon: '↓', targetRegionId: 'trilhouro' },
      { id: 'southwest_aetherium', x: 1, y: 12, icon: '↙', targetRegionId: 'aetherium' },
    ],
    locations: [
      { subId: 'vulcan_encosta', x: 11, y: 12, icon: '🔥' },
      { subId: 'vulcan_aqueduto', x: 5, y: 8, icon: '🌋' },
      { subId: 'vulcan_fundicao', x: 16, y: 8, icon: '⚒️' },
      { subId: 'vulcan_chamines', x: 6, y: 3, icon: '🏭' },
      { subId: 'vulcan_camara', x: 16, y: 3, icon: '🌋' },
    ],
    chests: [
      { id: 'vulcan_bau_1', name: 'Urna da Forja Vulcânica', x: 18, y: 3, icon: '📦', contents: { gold: 180, materials: { aco_temperado: 3, nucleo_brasa: 2 }, consumables: { tonico_forca: 1 } } },
    ],
    campfires: [
      { id: 'vulcan_fogueira', name: 'Fogueira da Fundição Central', x: 12, y: 11, icon: '🔥' },
    ],
  }
}

function buildFerrujal(): RegionMapDef {
  const width = 22, height = 16
  const base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree')
  vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  rect(base, 2, 7, 4, 13, 'water')
  hline(base, 1, 5, 10, 'bridge')
  return {
    id: 'ferrujal', tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base),
    spawn: { x: 11, y: 13 },
    exits: [
      { id: 'north_engrenverde', x: 10, y: 1, icon: '↑', targetRegionId: 'engrenverde' },
      { id: 'east_coroferro', x: 20, y: 8, icon: '➜', targetRegionId: 'coroferro' },
      { id: 'northeast_aetherium', x: 20, y: 3, icon: '↗', targetRegionId: 'aetherium' },
    ],
    locations: [
      { subId: 'ferro_trilha', x: 10, y: 12, icon: '🔩' },
      { subId: 'ferro_pocas', x: 5, y: 8, icon: '☣️' },
      { subId: 'ferro_fabrica', x: 16, y: 8, icon: '🏚️' },
      { subId: 'ferro_cemiterio', x: 5, y: 3, icon: '💀' },
      { subId: 'ferro_nucleo', x: 16, y: 3, icon: '☢️' },
    ],
    chests: [
      { id: 'ferro_bau_1', name: 'Depósito de Autômatos Desativados', x: 18, y: 3, icon: '📦', contents: { gold: 200, materials: { sucata_blindada: 4, nucleo_residual: 2 }, consumables: { pocao_cura_superior: 2 } } },
    ],
    campfires: [
      { id: 'ferro_fogueira', name: 'Refúgio de Sucata da Unidade 73', x: 9, y: 11, icon: '🔥' },
    ],
  }
}

function buildCoroferro(): RegionMapDef {
  const width = 22, height = 16
  const base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree')
  vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  rect(base, 8, 5, 12, 7, 'water')
  hline(base, 7, 13, 6, 'bridge')
  return {
    id: 'coroferro', tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base),
    spawn: { x: 11, y: 13 },
    exits: [
      { id: 'west_ferrujal', x: 1, y: 8, icon: '←', targetRegionId: 'ferrujal' },
      { id: 'north_trilhouro', x: 11, y: 1, icon: '↑', targetRegionId: 'trilhouro' },
      { id: 'northwest_aetherium', x: 1, y: 3, icon: '↖', targetRegionId: 'aetherium' },
    ],
    locations: [
      { subId: 'coro_viaduto', x: 11, y: 12, icon: '🚇' },
      { subId: 'coro_distrito', x: 5, y: 8, icon: '🏙️' },
      { subId: 'coro_praca', x: 16, y: 8, icon: '🕰️' },
      { subId: 'coro_subterraneo', x: 5, y: 3, icon: '🚿' },
      { subId: 'coro_torre', x: 16, y: 3, icon: '👑' },
    ],
    chests: [
      { id: 'coro_bau_1', name: 'Cofre do Sindicato de Coroferro', x: 18, y: 3, icon: '📦', contents: { gold: 250, materials: { engrenagem_ouro: 3, reliquia_vapor: 2 }, consumables: { tonico_regeneracao: 2 } } },
    ],
    campfires: [
      { id: 'coro_fogueira', name: 'Lareira Nobre da Praça do Relógio', x: 12, y: 11, icon: '🔥' },
    ],
  }
}

function buildAetherium(): RegionMapDef {
  const width = 22, height = 16
  const base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree')
  vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  rect(base, 8, 4, 13, 6, 'water')
  vline(base, 3, 7, 10, 'bridge')
  return {
    id: 'aetherium', tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base),
    spawn: { x: 11, y: 13 },
    exits: [
      { id: 'west_engrenverde', x: 1, y: 8, icon: '←', targetRegionId: 'engrenverde' },
      { id: 'east_trilhouro', x: 20, y: 8, icon: '➜', targetRegionId: 'trilhouro' },
      { id: 'south_coroferro', x: 11, y: 14, icon: '↓', targetRegionId: 'coroferro' },
      { id: 'fenda_havendown', x: 11, y: 1, icon: '↑', targetRegionId: 'coracao_eclipse' },
    ],
    locations: [
      { subId: 'aether_anel', x: 11, y: 12, icon: '⭕' },
      { subId: 'aether_galeria', x: 5, y: 8, icon: '🔧' },
      { subId: 'aether_ressonancia', x: 16, y: 8, icon: '🔮' },
      { subId: 'aether_vortice', x: 5, y: 3, icon: '🌀' },
      { subId: 'aether_coracao', x: 16, y: 3, icon: '⚡' },
    ],
    chests: [
      { id: 'aether_bau_1', name: 'Arca do Reator Primordial', x: 18, y: 3, icon: '📦', contents: { gold: 300, materials: { cristal_aether: 4, nucleo_supremo: 2 }, consumables: { tonico_forca: 2, pocao_escudo: 2 } } },
    ],
    campfires: [
      { id: 'aether_fogueira', name: 'Fogueira Estabilizadora de Aether', x: 12, y: 11, icon: '🔥' },
    ],
  }
}

export const REGION_MAPS: Record<string, RegionMapDef> = {
  // Havendown
  campos_dourados: buildCamposDourados(),
  floresta_lunargenta: buildFlorestaLunargenta(),
  montanhas_cinzentas: buildMontanhasCinzentas(),
  pico_escarlate: buildPicoEscarlate(),
  terras_mortas: buildTerrasMortas(),
  khar_dur: buildKharDur(),
  coracao_eclipse: buildCoracaoEclipse(),
  // Steelmere
  frostgard: buildFrostgard(),
  engrenverde: buildEngrenverde(),
  trilhouro: buildTrilhouro(),
  vulcannis: buildVulcannis(),
  ferrujal: buildFerrujal(),
  coroferro: buildCoroferro(),
  aetherium: buildAetherium(),
}
export function getRegionMap(regionId: string): RegionMapDef | undefined { return REGION_MAPS[regionId] }

// Ciclo de caminhada gerado (ChatGPT/gpt-image-1): 3 quadros por direção (perna esquerda à
// frente / passo neutro / perna direita à frente) em public/assets/maps/sprites/adventurer/
// <direção>_<quadro>.png, recortados e com fundo removido por flood-fill a partir da borda.
// Só existe arte para baixo/cima/direita -- "esquerda" é a mesma arte de "direita" espelhada
// em CSS (scaleX(-1)), técnica padrão pra não precisar gerar/manter uma arte espelhada à parte.
const walkFrames = (spriteId: string, direction: 'down' | 'up' | 'right') => [
  mapAsset(`assets/maps/sprites/${spriteId}/${direction}_0.png`),
  mapAsset(`assets/maps/sprites/${spriteId}/${direction}_mid_01.png`),
  mapAsset(`assets/maps/sprites/${spriteId}/${direction}_1.png`),
  mapAsset(`assets/maps/sprites/${spriteId}/${direction}_mid_12.png`),
  mapAsset(`assets/maps/sprites/${spriteId}/${direction}_2.png`),
  mapAsset(`assets/maps/sprites/${spriteId}/${direction}_mid_12.png`),
]
const playerSpriteFrames = (spriteId: string): Record<Facing, { frames: string[]; mirror?: boolean }> => ({
  down: { frames: walkFrames(spriteId, 'down') },
  up: { frames: walkFrames(spriteId, 'up') },
  right: { frames: walkFrames(spriteId, 'right') },
  left: { frames: walkFrames(spriteId, 'right'), mirror: true },
})
const WALK_FRAME_COUNT = 6
const IDLE_FRAME = 2 // quadro neutro, com pernas alinhadas, usado quando o herói para

const FOG_REVEAL_RADIUS = 3

export function TileWorldExplorer({
  map, initialPosition, paused, onEnterLocation, locationStatus, exits = [], onEnterExit, npcs = [], onInteractNpc, npcStatus, onAmbush, onPositionChange,
  openedChests = {}, onOpenChest, onRestCampfire, playerSprite = 'adventurer', exploredTiles, onExplore
}: {
  map: RegionMapDef
  initialPosition?: { x: number; y: number }
  paused?: boolean
  onEnterLocation: (subId: string) => void
  locationStatus?: (subId: string) => 'done' | 'ready' | 'default'
  exits?: Array<{ id: string; x: number; y: number; label: string; icon?: string }>
  onEnterExit?: (id: string) => void
  npcs?: NpcDefinition[]
  onInteractNpc?: (npc: NpcDefinition) => void
  npcStatus?: (npc: NpcDefinition) => 'ready' | 'available' | 'default'
  onAmbush?: (nearestSubId: string) => void
  onPositionChange?: (pos: { x: number; y: number }) => void
  openedChests?: Record<string, boolean>
  onOpenChest?: (chest: RegionMapChest) => void
  onRestCampfire?: (campfire: RegionMapCampfire) => void
  playerSprite?: string
  exploredTiles?: Set<string>
  onExplore?: (tiles: Array<{ x: number; y: number }>) => void
}) {
  const [pos, setPos] = React.useState(initialPosition ?? map.spawn)
  // Reporta a posição pra quem chamou (ex.: guardar no store) sempre que ela muda -- é o que
  // permite voltar exatamente aqui depois de uma tela que desmonta este componente (combate,
  // emboscada), em vez de sempre recomeçar do spawn/marcador.
  React.useEffect(() => { onPositionChange?.(pos) }, [pos])
  const [facing, setFacing] = React.useState<Facing>('down')
  const [frame, setFrame] = React.useState(IDLE_FRAME)
  const [walking, setWalking] = React.useState(false)
  const [panOffset, setPanOffset] = React.useState({ x: 0, y: 0 })
  const [zoom, setZoom] = React.useState(1)
  const movingRef = React.useRef(false)
  const movementTimers = React.useRef<number[]>([])
  const queuedMoves = React.useRef<Array<[number, number]>>([])
  const runQueuedMove = React.useRef<() => void>(() => {})
  const posRef = React.useRef(pos)
  const dragRef = React.useRef<{ x: number; y: number; camX: number; camY: number; dragged: boolean } | null>(null)
  const didDragRef = React.useRef(false)
  const npcBlocked = React.useMemo(() => new Set(npcs.map(npc => tileKey(npc.x, npc.y))), [npcs])
  const adjacentNpc = React.useMemo(() => npcs.find(npc => Math.abs(npc.x - pos.x) + Math.abs(npc.y - pos.y) === 1), [npcs, pos])

  React.useEffect(() => { posRef.current = pos }, [pos])

  // Névoa de guerra: a cada posição nova, revela um raio circular ao redor do herói. Só avisa o
  // chamador dos tiles que AINDA não estavam no set recebido -- quem persiste (RegionMapView)
  // decide como mesclar, este componente não sabe nada sobre save/store.
  React.useEffect(() => {
    if (!onExplore) return
    const newly: Array<{ x: number; y: number }> = []
    for (let dy = -FOG_REVEAL_RADIUS; dy <= FOG_REVEAL_RADIUS; dy++) for (let dx = -FOG_REVEAL_RADIUS; dx <= FOG_REVEAL_RADIUS; dx++) {
      if (Math.hypot(dx, dy) > FOG_REVEAL_RADIUS) continue
      const x = pos.x + dx, y = pos.y + dy
      if (x < 0 || y < 0 || x >= map.width || y >= map.height) continue
      if (!exploredTiles?.has(`${x},${y}`)) newly.push({ x, y })
    }
    if (newly.length) onExplore(newly)
  }, [pos.x, pos.y])

  // Monstros visíveis: um passeio aleatório limitado (WANDER_RADIUS) em torno de um ponto de
  // origem derivado dos marcadores do mapa (deriveWanderers). Encostar no jogador dispara o
  // mesmo fluxo de emboscada de sempre (onAmbush) -- ver ambush prompt em RegionMapView --, mas
  // como o monstro fica visível e mais lento que o jogador (WANDER_STEP_MS > STEP_MS), dá pra
  // desviar dele andando por outro caminho.
  const wanderTemplate = React.useMemo(() => deriveWanderers(map), [map])
  const [wanderers, setWanderers] = React.useState<Wanderer[]>(() => wanderTemplate.map(w => ({ ...w })))
  React.useEffect(() => { setWanderers(wanderTemplate.map(w => ({ ...w }))) }, [wanderTemplate])
  const onAmbushRef = React.useRef(onAmbush)
  React.useEffect(() => { onAmbushRef.current = onAmbush })
  const wanderTriggeredRef = React.useRef(false)
  React.useEffect(() => { if (!paused) wanderTriggeredRef.current = false }, [paused])
  React.useEffect(() => {
    if (paused) return
    const id = window.setInterval(() => {
      setWanderers(prev => {
        if (wanderTriggeredRef.current || !prev.length) return prev
        const occupied = new Set(prev.map(w => tileKey(w.x, w.y)))
        let triggeredSubId: string | undefined
        const next = prev.map(w => {
          if (triggeredSubId) return w
          if (w.x === posRef.current.x && w.y === posRef.current.y) { triggeredSubId = w.subId; return { ...w, x: w.home.x, y: w.home.y } }
          if (Math.random() > WANDER_MOVE_CHANCE) return w
          const [dx, dy] = WANDER_STEPS[Math.floor(Math.random() * WANDER_STEPS.length)]
          const nx = w.x + dx, ny = w.y + dy
          if (Math.abs(nx - w.home.x) > WANDER_RADIUS || Math.abs(ny - w.home.y) > WANDER_RADIUS) return w
          if (!isMapWalkable(map, { x: nx, y: ny })) return w
          const key = tileKey(nx, ny)
          if (occupied.has(key) && key !== tileKey(w.x, w.y)) return w
          if (nx === posRef.current.x && ny === posRef.current.y) { triggeredSubId = w.subId; return w }
          occupied.delete(tileKey(w.x, w.y)); occupied.add(key)
          return { ...w, x: nx, y: ny }
        })
        if (triggeredSubId) { wanderTriggeredRef.current = true; onAmbushRef.current?.(triggeredSubId) }
        return next
      })
    }, WANDER_STEP_MS)
    return () => window.clearInterval(id)
  }, [paused, map])

  const step = React.useCallback((dx: number, dy: number) => {
    if (movingRef.current || paused) return
    const dir: Facing = dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up'
    setFacing(dir)
    const currentPos = posRef.current
    const tx = currentPos.x + dx, ty = currentPos.y + dy
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return
    if (!isMapWalkable(map, { x: tx, y: ty }, npcBlocked)) return
    movingRef.current = true
    // Alterna 0->1->2->0... a cada passo aceito -- é o ciclo de caminhada em si (perna
    // esquerda, neutro, perna direita), não uma animação por tempo separada do movimento.
    setWalking(true)
    setFrame(0)
    posRef.current = { x: tx, y: ty }
    setPos({ x: tx, y: ty })
    movementTimers.current.forEach(window.clearTimeout)
    movementTimers.current = Array.from({ length: WALK_FRAME_COUNT - 1 }, (_, index) =>
      window.setTimeout(() => setFrame(index + 1), Math.round(STEP_MS * (index + 1) / WALK_FRAME_COUNT)),
    )
    window.setTimeout(() => {
      movingRef.current = false
      setWalking(false)
      setFrame(IDLE_FRAME)
      const loc = map.locations.find(l => l.x === tx && l.y === ty)
      const exit = exits.find(l => l.x === tx && l.y === ty)
      const chest = (map.chests ?? []).find(c => c.x === tx && c.y === ty)
      const campfire = (map.campfires ?? []).find(c => c.x === tx && c.y === ty)
      if (loc) onEnterLocation(loc.subId)
      else if (exit) onEnterExit?.(exit.id)
      else if (chest && !openedChests?.[chest.id]) onOpenChest?.(chest)
      else if (campfire) onRestCampfire?.(campfire)
      else if (Math.random() < AMBUSH_CHANCE) { const nearestId = nearestLocationId(map, { x: tx, y: ty }); if (nearestId) onAmbush?.(nearestId) }
      if (queuedMoves.current.length) runQueuedMove.current()
    }, STEP_MS)
  }, [paused, map, onEnterLocation, exits, onEnterExit, npcBlocked, onAmbush, openedChests, onOpenChest, onRestCampfire])

  const moveToTile = React.useCallback((target: { x: number; y: number }) => {
    const route = routeBetween(map, posRef.current, target, npcBlocked)
    if (!route.length) return
    queuedMoves.current = route
    runQueuedMove.current = () => {
      const next = queuedMoves.current.shift()
      if (next) step(next[0], next[1])
    }
    runQueuedMove.current()
  }, [map, step, npcBlocked])

  const moveToExit = React.useCallback((exit: { id: string; x: number; y: number }) => {
    const route = routeBetween(map, posRef.current, exit, npcBlocked)
    if (!route.length) {
      if (exit.x === posRef.current.x && exit.y === posRef.current.y) onEnterExit?.(exit.id)
      return
    }
    queuedMoves.current = route
    runQueuedMove.current = () => {
      const next = queuedMoves.current.shift()
      if (next) step(next[0], next[1])
    }
    runQueuedMove.current()
  }, [map, npcBlocked, onEnterExit, step])

  const moveToNpc = React.useCallback((npc: NpcDefinition) => {
    const targets = [[0, 1], [1, 0], [0, -1], [-1, 0]]
      .map(([dx, dy]) => ({ x: npc.x + dx, y: npc.y + dy }))
      .filter(point => point.x >= 0 && point.y >= 0 && point.x < map.width && point.y < map.height && isMapWalkable(map, point, npcBlocked))
      .map(point => ({ point, route: routeBetween(map, posRef.current, point, npcBlocked) }))
      .filter(entry => entry.route.length || (entry.point.x === posRef.current.x && entry.point.y === posRef.current.y))
      .sort((a, b) => a.route.length - b.route.length)
    const best = targets[0]
    if (!best) return
    if (!best.route.length) onInteractNpc?.(npc)
    else {
      queuedMoves.current = best.route
      runQueuedMove.current = () => {
        const next = queuedMoves.current.shift()
        if (next) step(next[0], next[1])
      }
      runQueuedMove.current()
      window.setTimeout(() => onInteractNpc?.(npc), best.route.length * STEP_MS + 20)
    }
  }, [map, npcBlocked, onInteractNpc, step])

  React.useEffect(() => () => {
    movementTimers.current.forEach(window.clearTimeout)
  }, [])

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

  React.useEffect(() => {
    if (paused || !onInteractNpc) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'e' && e.key !== 'E' && e.key !== 'Enter') return
      if (!adjacentNpc) return
      e.preventDefault()
      onInteractNpc(adjacentNpc)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [adjacentNpc, onInteractNpc, paused])

  // tilePx/worldW/worldH/viewportW/viewportH são a referência "sem zoom" -- é o que posiciona
  // cada tile/marcador dentro de .regionmap-world e define a caixa fixa em tela (.regionmap-
  // viewport nunca cresce/encolhe com o zoom). O zoom só muda quanto do mundo cabe dentro dessa
  // caixa (visibleW/visibleH) e escala a translação da câmera na hora de desenhar (ver o
  // transform de .regionmap-world logo abaixo).
  const tilePx = map.tileSize * map.scale
  const worldW = map.width * tilePx, worldH = map.height * tilePx
  const viewportW = Math.min(worldW, VIEWPORT_TILES_X * tilePx)
  const viewportH = Math.min(worldH, VIEWPORT_TILES_Y * tilePx)
  const visibleW = viewportW / zoom, visibleH = viewportH / zoom
  const followCamX = clamp(pos.x * tilePx + tilePx / 2 - visibleW / 2, 0, Math.max(0, worldW - visibleW))
  const followCamY = clamp(pos.y * tilePx + tilePx / 2 - visibleH / 2, 0, Math.max(0, worldH - visibleH))
  const camX = clamp(followCamX + panOffset.x, 0, Math.max(0, worldW - visibleW))
  const camY = clamp(followCamY + panOffset.y, 0, Math.max(0, worldH - visibleH))
  const sprite = playerSpriteFrames(playerSprite)[facing]
  const frameSrc = sprite.frames[frame]

  return <div className="regionmap-frame">
    <div className="regionmap-viewport" style={{ width: viewportW, height: viewportH }} onWheel={event => {
      event.preventDefault()
      setZoom(z => clamp(Math.round((z + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)) * 100) / 100, ZOOM_MIN, ZOOM_MAX))
    }} onPointerDown={event => {
      // setPointerCapture no viewport retarget o "click" resultante pra ELE MESMO (não pro
      // elemento de fato tocado), mesmo com stopPropagation no filho -- então um toque em cima
      // de um NPC/local nunca disparava o onClick deles, só o fallback de clique-no-tile daqui.
      // Não capturar quando o toque começa num desses botões deixa o clique nativo bubblear normal.
      if ((event.target as HTMLElement).closest('.regionmap-npc, .regionmap-location, .regionmap-exit, .regionmap-zoom-hud')) return
      event.currentTarget.setPointerCapture(event.pointerId)
      dragRef.current = { x: event.clientX, y: event.clientY, camX, camY, dragged: false }
    }} onPointerMove={event => {
      const drag = dragRef.current
      if (!drag) return
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) drag.dragged = true
      if (!drag.dragged) return
      didDragRef.current = true
      // dx/dy são pixels de TELA; convertidos pra unidades de mundo (/zoom) antes de mexer na
      // câmera, senão arrastar com zoom aplicado moveria o mundo rápido/devagar demais.
      setPanOffset({ x: clamp(drag.camX - dx / zoom, 0, Math.max(0, worldW - visibleW)) - followCamX, y: clamp(drag.camY - dy / zoom, 0, Math.max(0, worldH - visibleH)) - followCamY })
    }} onPointerUp={event => {
      if (dragRef.current?.dragged) didDragRef.current = true
      dragRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    }} onPointerCancel={() => { dragRef.current = null }} onClick={event => {
      if (didDragRef.current) { didDragRef.current = false; return }
      const bounds = event.currentTarget.getBoundingClientRect()
      // (clientX - bounds.left) é distância em pixels de TELA a partir do canto do viewport;
      // /zoom converte pra distância em unidades de mundo antes de somar à câmera (também em
      // unidades de mundo) -- sem isso o clique erraria o tile assim que o zoom saísse de 1.
      moveToTile({ x: Math.floor((camX + (event.clientX - bounds.left) / zoom) / tilePx), y: Math.floor((camY + (event.clientY - bounds.top) / zoom) / tilePx) })
    }}>
      <div className="regionmap-world" style={{ width: worldW, height: worldH, transformOrigin: '0 0', transform: `translate3d(${-camX * zoom}px,${-camY * zoom}px,0) scale(${zoom})` }}>
        {map.background && <div className="regionmap-art" style={{ backgroundImage: `url(${map.background})` }} />}
        <div className={`regionmap-tiles${map.background ? ' art-backed' : ''}`} style={{ gridTemplateColumns: `repeat(${map.width},${tilePx}px)`, gridAutoRows: `${tilePx}px` }}>
          {map.grid.flatMap((row, y) => row.map((t, x) => <div key={`${x}_${y}`} className={`regionmap-tile tile-${t}`} />))}
        </div>
        {map.locations.map(loc => {
          const status = locationStatus?.(loc.subId) ?? 'default'
          return <button key={loc.subId} type="button" className={`regionmap-location status-${status}`}
            style={{ left: loc.x * tilePx, top: loc.y * tilePx, width: tilePx, height: tilePx }}
            onClick={event => { event.stopPropagation(); if (didDragRef.current) { didDragRef.current = false; return }; moveToTile({ x: loc.x, y: loc.y }) }} aria-label={`Ir até ${loc.subId}`}>
            <span className="regionmap-location-pulse" />
            <span className="regionmap-location-icon">{loc.icon ?? '◆'}</span>
          </button>
        })}
        {exits.map(exit => (
          <button key={exit.id} type="button" className="regionmap-exit"
            style={{ left: exit.x * tilePx, top: exit.y * tilePx, width: tilePx, height: tilePx }}
            onClick={event => { event.stopPropagation(); if (didDragRef.current) { didDragRef.current = false; return }; moveToExit(exit) }}
            aria-label={`Viajar para ${exit.label}`} title={exit.label}>
            <span className="regionmap-exit-ring" />
            <span className="regionmap-exit-icon">{exit.icon ?? '➜'}</span>
            <span className="regionmap-exit-label">{exit.label}</span>
          </button>
        ))}
        {(map.campfires ?? []).map(campfire => (
          <button key={campfire.id} type="button" className="regionmap-campfire"
            style={{ left: campfire.x * tilePx, top: campfire.y * tilePx, width: tilePx, height: tilePx }}
            onClick={event => {
              event.stopPropagation()
              if (didDragRef.current) { didDragRef.current = false; return }
              moveToTile({ x: campfire.x, y: campfire.y })
              onRestCampfire?.(campfire)
            }}
            aria-label={`Descansar na fogueira ${campfire.name}`} title={`Fogueira: ${campfire.name}`}>
            <span className="regionmap-campfire-aura" />
            <span className="regionmap-campfire-icon">🔥</span>
          </button>
        ))}
        {(map.chests ?? []).map(chest => {
          const opened = Boolean(openedChests?.[chest.id])
          return (
            <button key={chest.id} type="button" className={`regionmap-chest${opened ? ' opened' : ' closed'}`}
              style={{ left: chest.x * tilePx, top: chest.y * tilePx, width: tilePx, height: tilePx }}
              onClick={event => {
                event.stopPropagation()
                if (didDragRef.current) { didDragRef.current = false; return }
                moveToTile({ x: chest.x, y: chest.y })
                if (!opened) onOpenChest?.(chest)
              }}
              aria-label={chest.name} title={opened ? `${chest.name} (Aberto)` : `${chest.name} (Fechado)`}>
              <span className="regionmap-chest-icon">{opened ? '📭' : '📦'}</span>
            </button>
          )
        })}
        {npcs.map(npc => {
          const status = npcStatus?.(npc) ?? 'default'
          return <button key={npc.id} type="button" className={`regionmap-npc npc-${npc.facing ?? 'down'} status-${status}`}
            style={{ left: npc.x * tilePx, top: npc.y * tilePx, width: tilePx, height: tilePx }}
            onClick={event => { event.stopPropagation(); if (didDragRef.current) { didDragRef.current = false; return }; moveToNpc(npc) }} aria-label={`Conversar com ${npc.nome}`}>
            {status !== 'default' && <span className="regionmap-npc-alert">{status === 'ready' ? '?' : '!'}</span>}
            <span className="regionmap-npc-sprite-wrap">
              <img className="regionmap-npc-sprite" src={mapAsset(npc.sprite)} alt="" />
            </span>
          </button>
        })}
        {wanderers.map(w => (
          <div key={w.id} className="regionmap-wanderer" style={{ left: w.x * tilePx, top: w.y * tilePx, width: tilePx, height: tilePx }} title="Criatura à espreita -- desvie ou lute">
            <span className="regionmap-wanderer-aura" />
            <span className="regionmap-wanderer-icon">👹</span>
          </div>
        ))}
        <div className={`regionmap-player${walking ? ' is-walking' : ''}`}
          style={{ left: pos.x * tilePx, top: pos.y * tilePx, width: tilePx, height: tilePx }}>
          <span className="regionmap-player-sprite-wrap" style={sprite.mirror ? { transform: 'scaleX(-1)' } : undefined}>
            <img className="regionmap-player-sprite" src={frameSrc} alt="" />
          </span>
        </div>
        {exploredTiles && map.grid.flatMap((row, y) => row.map((_, x) => exploredTiles.has(`${x},${y}`) ? null : (
          <div key={`fog_${x}_${y}`} className="regionmap-fog-tile" style={{ left: x * tilePx, top: y * tilePx, width: tilePx, height: tilePx }} />
        )))}
      </div>
      <div className="regionmap-zoom-hud" onClick={event => event.stopPropagation()}>
        <button type="button" onClick={() => setZoom(z => clamp(Math.round((z - ZOOM_STEP) * 100) / 100, ZOOM_MIN, ZOOM_MAX))} aria-label="Afastar o mapa" title="Afastar (ou role o mouse)"><ZoomOut size={14} /></button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom(z => clamp(Math.round((z + ZOOM_STEP) * 100) / 100, ZOOM_MIN, ZOOM_MAX))} aria-label="Aproximar o mapa" title="Aproximar (ou role o mouse)"><ZoomIn size={14} /></button>
      </div>
    </div>
    <div className="regionmap-controls">
      <p className="regionmap-hint">{adjacentNpc ? `Pressione E ou Enter para falar com ${adjacentNpc.nome}.` : 'Use as setas (ou WASD) e ande ate um marcador ou personagem.'}</p>
      <div className="regionmap-dpad" role="group" aria-label="Controles de movimento">
        <button type="button" className="dpad-up" onClick={() => step(0, -1)} aria-label="Mover para cima"><ArrowUp size={16} /></button>
        <button type="button" className="dpad-left" onClick={() => step(-1, 0)} aria-label="Mover para esquerda"><ArrowLeft size={16} /></button>
        <button type="button" className="dpad-down" onClick={() => step(0, 1)} aria-label="Mover para baixo"><ArrowDown size={16} /></button>
        <button type="button" className="dpad-right" onClick={() => step(1, 0)} aria-label="Mover para direita"><ArrowRight size={16} /></button>
      </div>
    </div>
  </div>
}
