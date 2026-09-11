// Motor genérico de navegação espacial estilo "Pokémon FireRed" para a tela de região.
// Autocontido de propósito: não importa nada de main.tsx (evita import circular), só sabe
// desenhar um grid de tiles, mover um personagem sobre ele e avisar o chamador quando o
// jogador pisa num marcador de sub-região. Quem decide o que acontece ao entrar num marcador
// (abrir card, checar progresso etc.) é o componente que usa <TileWorldExplorer/>.
import React from 'react'
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'

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
  blocked?: Array<{ x: number; y: number }>
}

type Facing = 'up' | 'down' | 'left' | 'right'
const STEP_MS = 320 // 75% da velocidade original (240ms/passo -> 320ms/passo)
const VIEWPORT_TILES_X = 18
const VIEWPORT_TILES_Y = 12

function clamp(n: number, min: number, max: number) { return Math.min(max, Math.max(min, n)) }

function tileKey(x: number, y: number) { return `${x}:${y}` }
function isMapWalkable(map: RegionMapDef, point: { x: number; y: number }) {
  return WALKABLE.has(map.grid[point.y]?.[point.x]) && !map.blocked?.some(block => block.x === point.x && block.y === point.y)
}
function nearestWalkable(map: RegionMapDef, target: { x: number; y: number }) {
  if (isMapWalkable(map, target)) return target
  for (let distance = 1; distance < Math.max(map.width, map.height); distance++) {
    for (let y = target.y - distance; y <= target.y + distance; y++) for (let x = target.x - distance; x <= target.x + distance; x++) {
      if (Math.abs(x - target.x) + Math.abs(y - target.y) !== distance) continue
      if (x >= 0 && y >= 0 && x < map.width && y < map.height && isMapWalkable(map, { x, y })) return { x, y }
    }
  }
  return undefined
}
function routeBetween(map: RegionMapDef, start: { x: number; y: number }, target: { x: number; y: number }): Array<[number, number]> {
  const goal = nearestWalkable(map, target)
  if (!goal || (goal.x === start.x && goal.y === start.y)) return []
  const queue = [start], previous = new Map<string, { from: { x: number; y: number }; step: [number, number] }>()
  const steps: Array<[number, number]> = [[0, -1], [1, 0], [0, 1], [-1, 0]]
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index]
    if (current.x === goal.x && current.y === goal.y) break
    for (const step of steps) {
      const next = { x: current.x + step[0], y: current.y + step[1] }, key = tileKey(next.x, next.y)
      if (next.x < 0 || next.y < 0 || next.x >= map.width || next.y >= map.height || previous.has(key) || tileKey(next.x, next.y) === tileKey(start.x, start.y) || !isMapWalkable(map, next)) continue
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

// Verificação reutilizável para a autoria de novas regiões. Ela mantém spawn, pins e
// colisão coerentes antes de o mapa chegar à tela de exploração.
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
    locations: [
      { subId: 'campos_estrada', x: 10, y: 13, icon: '🌾' },
      { subId: 'campos_fazendas', x: 18, y: 4, icon: '🐐' },
      { subId: 'campos_moinho', x: 20, y: 1, icon: '🌬️' },
      { subId: 'campos_ponte', x: 16, y: 6, icon: '🌉' },
      { subId: 'campos_ruinas', x: 5, y: 2, icon: '🏛️' },
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
    locations: [
      { subId: 'lunar_bosque', x: 10, y: 11, icon: '🌲' },
      { subId: 'lunar_goblins', x: 4, y: 8, icon: '👺' },
      { subId: 'lunar_monolito', x: 11, y: 5, icon: '🗿' },
      { subId: 'lunar_aranhas', x: 6, y: 9, icon: '🕷️' },
      { subId: 'lunar_lago', x: 7, y: 4, icon: '🌙' },
      { subId: 'lunar_raizes', x: 17, y: 3, icon: '🌳' },
      { subId: 'lunar_pantano', x: 18, y: 10, icon: '🐸' },
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
    locations: [
      { subId: 'montanhas_passagem', x: 11, y: 11, icon: '⛰️' },
      { subId: 'montanhas_mina', x: 9, y: 6, icon: '⛏️' },
      { subId: 'montanhas_gelo', x: 12, y: 5, icon: '🧊' },
      { subId: 'montanhas_forte', x: 5, y: 3, icon: '🏰' },
      { subId: 'montanhas_abismo', x: 15, y: 7, icon: '🕳️' },
      { subId: 'montanhas_cume', x: 19, y: 2, icon: '⚡' },
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
    locations: [
      { subId: 'pico_encosta', x: 11, y: 10, icon: '🌋' },
      { subId: 'pico_ninho_dragao', x: 18, y: 4, icon: '🐉' },
      { subId: 'pico_cinzas', x: 4, y: 3, icon: '🔥' },
      { subId: 'pico_forja', x: 16, y: 2, icon: '⚒️' },
      { subId: 'pico_cratera', x: 16, y: 8, icon: '☀️' },
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
    locations: [
      { subId: 'mortas_campos', x: 10, y: 12, icon: '🪦' },
      { subId: 'mortas_catacumbas', x: 8, y: 8, icon: '⚰️' },
      { subId: 'mortas_vila', x: 5, y: 3, icon: '🏚️' },
      { subId: 'mortas_brejo', x: 17, y: 10, icon: '🕯️' },
      { subId: 'mortas_torre', x: 17, y: 2, icon: '🗼' },
    ],
  }
}

function buildKharDur(): RegionMapDef {
  const width = 22, height = 16, base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree'); vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  rect(base, 2, 7, 8, 14, 'water'); hline(base, 2, 8, 10, 'bridge')
  return { id: 'khar_dur', background: '/assets/maps/khar-dur-overworld.png', tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base), blocked: blockedRects([2, 1, 4, 3], [7, 1, 9, 3], [13, 1, 15, 3], [3, 6, 7, 8], [14, 6, 16, 8]), spawn: { x: 11, y: 13 }, locations: [
    { subId: 'khar_galerias', x: 10, y: 9, icon: '🛤️' }, { subId: 'khar_labirinto', x: 9, y: 11, icon: '🌀' }, { subId: 'khar_templo_minotauro', x: 12, y: 10, icon: '🐂' },
    { subId: 'khar_forjas', x: 5, y: 3, icon: '🔥' }, { subId: 'khar_cofre', x: 17, y: 3, icon: '🔐' }, { subId: 'khar_profundezas', x: 17, y: 10, icon: '⛏️' },
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
    locations: [
      { subId: 'eclipse_portoes', x: 11, y: 12, icon: '🚪' },
      { subId: 'eclipse_torre', x: 4, y: 3, icon: '🗼' },
      { subId: 'eclipse_trono', x: 11, y: 2, icon: '👑' },
      { subId: 'eclipse_jardim', x: 4, y: 8, icon: '✦' },
      { subId: 'eclipse_arquivo', x: 18, y: 3, icon: '📜' },
      { subId: 'eclipse_fenda', x: 18, y: 10, icon: '🜏' },
    ],
  }
}

export const REGION_MAPS: Record<string, RegionMapDef> = {
  campos_dourados: buildCamposDourados(),
  floresta_lunargenta: buildFlorestaLunargenta(),
  montanhas_cinzentas: buildMontanhasCinzentas(),
  pico_escarlate: buildPicoEscarlate(),
  terras_mortas: buildTerrasMortas(),
  khar_dur: buildKharDur(),
  coracao_eclipse: buildCoracaoEclipse(),
}
export function getRegionMap(regionId: string): RegionMapDef | undefined { return REGION_MAPS[regionId] }

// Ciclo de caminhada gerado (ChatGPT/gpt-image-1): 3 quadros por direção (perna esquerda à
// frente / passo neutro / perna direita à frente) em public/assets/maps/sprites/adventurer/
// <direção>_<quadro>.png, recortados e com fundo removido por flood-fill a partir da borda.
// Só existe arte para baixo/cima/direita -- "esquerda" é a mesma arte de "direita" espelhada
// em CSS (scaleX(-1)), técnica padrão pra não precisar gerar/manter uma arte espelhada à parte.
const walkFrames = (direction: 'down' | 'up' | 'right') => [
  mapAsset(`assets/maps/sprites/adventurer/${direction}_0.png`),
  mapAsset(`assets/maps/sprites/adventurer/${direction}_mid_01.png`),
  mapAsset(`assets/maps/sprites/adventurer/${direction}_1.png`),
  mapAsset(`assets/maps/sprites/adventurer/${direction}_mid_12.png`),
  mapAsset(`assets/maps/sprites/adventurer/${direction}_2.png`),
  mapAsset(`assets/maps/sprites/adventurer/${direction}_mid_12.png`),
]
const PLAYER_SPRITE: Record<Facing, { frames: string[]; mirror?: boolean }> = {
  down: { frames: walkFrames('down') },
  up: { frames: walkFrames('up') },
  right: { frames: walkFrames('right') },
  left: { frames: walkFrames('right'), mirror: true },
}
const WALK_FRAME_COUNT = 6
const IDLE_FRAME = 2 // quadro neutro, com pernas alinhadas, usado quando o herói para

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
  const [walking, setWalking] = React.useState(false)
  const [panOffset, setPanOffset] = React.useState({ x: 0, y: 0 })
  const movingRef = React.useRef(false)
  const movementTimers = React.useRef<number[]>([])
  const queuedMoves = React.useRef<Array<[number, number]>>([])
  const runQueuedMove = React.useRef<() => void>(() => {})
  const posRef = React.useRef(pos)
  const dragRef = React.useRef<{ x: number; y: number; camX: number; camY: number; dragged: boolean } | null>(null)
  const didDragRef = React.useRef(false)

  React.useEffect(() => { posRef.current = pos }, [pos])

  const step = React.useCallback((dx: number, dy: number) => {
    if (movingRef.current || paused) return
    const dir: Facing = dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up'
    setFacing(dir)
    const currentPos = posRef.current
    const tx = currentPos.x + dx, ty = currentPos.y + dy
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return
    if (!isMapWalkable(map, { x: tx, y: ty })) return
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
      if (loc) onEnterLocation(loc.subId)
      if (queuedMoves.current.length) runQueuedMove.current()
    }, STEP_MS)
  }, [paused, map, onEnterLocation])

  const moveToTile = React.useCallback((target: { x: number; y: number }) => {
    const route = routeBetween(map, posRef.current, target)
    if (!route.length) return
    queuedMoves.current = route
    runQueuedMove.current = () => {
      const next = queuedMoves.current.shift()
      if (next) step(next[0], next[1])
    }
    runQueuedMove.current()
  }, [map, step])

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

  const tilePx = map.tileSize * map.scale
  const worldW = map.width * tilePx, worldH = map.height * tilePx
  const viewportW = Math.min(worldW, VIEWPORT_TILES_X * tilePx)
  const viewportH = Math.min(worldH, VIEWPORT_TILES_Y * tilePx)
  const followCamX = clamp(pos.x * tilePx + tilePx / 2 - viewportW / 2, 0, Math.max(0, worldW - viewportW))
  const followCamY = clamp(pos.y * tilePx + tilePx / 2 - viewportH / 2, 0, Math.max(0, worldH - viewportH))
  const camX = clamp(followCamX + panOffset.x, 0, Math.max(0, worldW - viewportW))
  const camY = clamp(followCamY + panOffset.y, 0, Math.max(0, worldH - viewportH))
  const sprite = PLAYER_SPRITE[facing]
  const frameSrc = sprite.frames[frame]

  return <div className="regionmap-frame">
    <div className="regionmap-viewport" style={{ width: viewportW, height: viewportH }} onPointerDown={event => {
      event.currentTarget.setPointerCapture(event.pointerId)
      dragRef.current = { x: event.clientX, y: event.clientY, camX, camY, dragged: false }
    }} onPointerMove={event => {
      const drag = dragRef.current
      if (!drag) return
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) drag.dragged = true
      if (!drag.dragged) return
      didDragRef.current = true
      setPanOffset({ x: clamp(drag.camX - dx, 0, Math.max(0, worldW - viewportW)) - followCamX, y: clamp(drag.camY - dy, 0, Math.max(0, worldH - viewportH)) - followCamY })
    }} onPointerUp={event => {
      if (dragRef.current?.dragged) didDragRef.current = true
      dragRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    }} onPointerCancel={() => { dragRef.current = null }} onClick={event => {
      if (didDragRef.current) { didDragRef.current = false; return }
      const bounds = event.currentTarget.getBoundingClientRect()
      moveToTile({ x: Math.floor((event.clientX - bounds.left + camX) / tilePx), y: Math.floor((event.clientY - bounds.top + camY) / tilePx) })
    }}>
      <div className="regionmap-world" style={{ width: worldW, height: worldH, transform: `translate3d(${-camX}px,${-camY}px,0)` }}>
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
        <div className={`regionmap-player${walking ? ' is-walking' : ''}`}
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
