// Motor genérico de navegação espacial estilo "Pokémon FireRed" para a tela de região.
// Autocontido de propósito: não importa nada de main.tsx (evita import circular), só sabe
// desenhar um grid de tiles, mover um personagem sobre ele e avisar o chamador quando o
// jogador pisa num marcador de sub-região. Quem decide o que acontece ao entrar num marcador
// (abrir card, checar progresso etc.) é o componente que usa <TileWorldExplorer/>.
import React from 'react'
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, MapPin } from 'lucide-react'
import type { NpcDefinition } from './data/npcs'

// GitHub Pages serve o app num subcaminho (ex.: /Bangalores/), então caminhos absolutos
// como '/assets/...' resolvem para a raiz do domínio e quebram (404) em produção -- só
// funcionam em dev, onde o app já está na raiz. import.meta.env.BASE_URL carrega o prefixo
// correto nos dois casos (replica o mesmo padrão usado por assetUrl() em main.tsx).
function mapAsset(path: string) { return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}` }

// Grid "de autoria" -- o que se desenha à mão em build*() usando fill/hline/vline/rect.
// Tipos genéricos: não sabem (nem precisam saber) qual variante de arte existe pra cada caso.
// 'ice'/'snow_drift'/'steam_vent' (ART-004) e 'mud'/'conveyor'/'ash_lava_rock' (ART-014) são
// terrenos especiais de bioma -- sem auto-tiling de vizinhança como path/bridge/bank, são tile
// únicos (igual flower/tree/water), então passam direto por resolveTerrain().
type BaseTile = 'grass' | 'flower' | 'tree' | 'water' | 'path' | 'bridge' | 'ice' | 'snow_drift' | 'steam_vent' | 'mud' | 'conveyor' | 'ash_lava_rock'

// Grid "de renderização" -- variante exata de arte, resolvida a partir do grid de autoria por
// resolveTerrain() olhando os vizinhos de cada célula. É o que TileWorldExplorer de fato desenha
// e testa colisão; cada valor tem uma classe `.tile-<valor>` correspondente em styles.css.
export type MapTile =
  | 'grass' | 'flower' | 'tree' | 'water'
  | 'bank_v' | 'bank_v_r' | 'bank_h' | 'bank_h_r'
  | 'path_v' | 'path_h' | 'path_corner_br' | 'path_corner_bl' | 'path_corner_tr' | 'path_corner_tl'
  | 'bridge_cap_top' | 'bridge_mid' | 'bridge_cap_bottom'
  | 'ice' | 'snow_drift' | 'steam_vent'
  | 'mud' | 'conveyor' | 'ash_lava_rock'

const WALKABLE = new Set<MapTile>([
  'grass', 'flower',
  'bank_v', 'bank_v_r', 'bank_h', 'bank_h_r',
  'path_v', 'path_h', 'path_corner_br', 'path_corner_bl', 'path_corner_tr', 'path_corner_tl',
  'bridge_cap_top', 'bridge_mid', 'bridge_cap_bottom',
  'ice', 'snow_drift', 'steam_vent',
  'mud', 'conveyor', 'ash_lava_rock',
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
// Alavanca e portão trancado (ART-023): a alavanca é um marcador clicável (igual fogueira/baú);
// o portão é só um tile que fica bloqueado até a alavanca ligada a ele (por gateId) ser ativada --
// não tem alvo de clique próprio, só reage ao estado persistido.
export interface RegionMapLever {
  id: string
  name: string
  x: number
  y: number
  gateId: string
}
export interface RegionMapGate {
  id: string
  x: number
  y: number
}
// Monólito de teletransporte (ART-024): descoberto ao ser visitado (persistido fora daqui, ver
// discoveredMonoliths em game.ts); a lista de todos os monólitos de todos os mapas é derivada logo
// depois de REGION_MAPS, pra viagem rápida poder pular de região sem este arquivo saber nada sobre
// telas/store.
export interface RegionMapMonolith {
  id: string
  name: string
  x: number
  y: number
}
// Doca de barco/carruagem (ART-025): duas docas com o mesmo pairId formam uma rota de atalho no
// mesmo mapa -- embarcar anima o personagem em linha reta até a doca irmã, sem passar por step().
export interface RegionMapDock {
  id: string
  name: string
  x: number
  y: number
  pairId: string
  vehicle: 'boat' | 'carriage'
}
// Objeto de cenário (ART-027): primeira instância é a placa de sinalização -- só mostra um texto
// ao ser clicado, sem estado persistido (pode ser relida quantas vezes quiser, como uma placa real).
export interface RegionMapScenery {
  id: string
  name: string
  x: number
  y: number
  kind: 'signpost'
  text: string
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
  levers?: RegionMapLever[]
  gates?: RegionMapGate[]
  monoliths?: RegionMapMonolith[]
  docks?: RegionMapDock[]
  scenery?: RegionMapScenery[]
  // Tiles que aparentam solidos na arte de fundo (por isso não entram em `blocked`), mas são
  // secretamente andáveis -- ver ART-026. Chave da persistência de "já descoberto" é `${mapId}:x,y`.
  illusoryWalls?: Array<{ x: number; y: number }>
  blocked?: Array<{ x: number; y: number }>
  weather?: 'snow' | 'rain' | 'ash' | 'smoke' // camada atmosférica opcional (ART-012) -- só nas regiões onde faz sentido, não é universal
}

type Facing = 'up' | 'down' | 'left' | 'right'
const STEP_MS = 320 // 75% da velocidade original (240ms/passo -> 320ms/passo)
const VIEWPORT_TILES_X = 18
const VIEWPORT_TILES_Y = 12
const ZOOM_MIN = 0.6
const ZOOM_MAX = 1.8
const ZOOM_STEP = 0.2
const FOOTPRINT_FADE_MS = 2200 // tempo até a pegada sumir de vez (bate com a duração da animação de fade no CSS)
const GAMEPAD_AXIS_DEAD_ZONE = 0.5
const RIDE_DURATION_MS = 1150 // bate com a transition-duration de .regionmap-player.is-riding no CSS
const SECRET_BURST_MS = 900 // duração do efeito de revelação da parede ilusória (ART-026)
const CAMPFIRE_REST_RADIUS = 1 // área 3x3 (raio de Chebyshev 1) ao redor da fogueira
const CAMPFIRE_TICK_MS = 6000 // intervalo de cada +1 de vida enquanto descansa
const HEAL_POPUP_MS = 1300 // duração do "+1" verde estilo 1-up (Mario) -- some tempo maior que o antigo pop sutil, pra caber a subida mais longa
const AMBUSH_CHANCE = 0.05 // chance de emboscada cega por passo (fora de um marcador de local) -- reduzida porque agora convive com monstros visíveis no mapa (ver WANDER_*), que cobrem a maior parte dos encontros e podem ser evitados
const WANDER_RADIUS = 2 // quão longe do ponto de origem cada monstro visível pode se afastar
const WANDER_SPAWN_BUFFER = 3 // raio (em tiles) ao redor do spawn onde nenhum monstro pode nascer ou pisar
const WANDER_STEP_MS = 1000 // cadência do passeio -- mais lento que o passo do jogador (STEP_MS) de propósito, pra dar tempo de desviar
const WANDER_MOVE_CHANCE = 0.5 // chance de o monstro dar um passo a cada tick (o resto do tempo ele fica parado)
const WANDER_STEPS: Array<[number, number]> = [[0, -1], [1, 0], [0, 1], [-1, 0]]
const WANDER_FRAME_MS = 420 // cadência do ciclo idle/walk_1/walk_2 (ver ART-003)
// Famílias de sprite entregues no ART-003 (VISUAL_DEVELOPMENT_HANDOFF.md). A identidade visual
// do monstro no mapa é só estética -- o inimigo real do combate continua vindo do pool da
// sub-região via onAmbush/triggerAmbush, então não precisa (e não dá pra sempre) bater 1:1 com
// o nome exato do inimigo sorteado. Atribuídas em round-robin só pra dar variedade visual.
const WANDER_SPRITE_FAMILIES = ['automato-sentinela', 'batedor-a-vapor', 'elemental-de-vapor']
const WANDER_FRAMES = ['idle', 'walk_1', 'walk_2']
type WanderFacing = 'down' | 'up' | 'right' | 'left'
// ART-028: down usa os arquivos raiz (idle/walk_1/walk_2), up e right têm pastas próprias
// (up_idle.png etc.); left reaproveita os frames de right espelhados via CSS (scaleX(-1) só na
// img, não no tile), então não existe um left_*.png separado -- ver .regionmap-wanderer-sprite.
function wanderAsset(spriteId: string, facing: WanderFacing, frame: string) {
  const prefix = facing === 'up' ? 'up_' : facing === 'right' || facing === 'left' ? 'right_' : ''
  return mapAsset(`assets/maps/objects/monster-${spriteId}/${prefix}${frame}.png`)
}

// Um monstro vagante nunca pode nascer, nem andar, em cima de um marcador (local, saída, baú,
// fogueira, NPC) nem perto demais do spawn -- é o que garante que chegar numa região (ou voltar
// pra ela depois de um combate) nunca larga o jogador dentro do raio de patrulha de um monstro,
// o que travava em desafios encadeados sem chance de sair do lugar antes do próximo encontro.
function wandererForbidden(map: RegionMapDef, npcs: NpcDefinition[], x: number, y: number): boolean {
  if (Math.max(Math.abs(x - map.spawn.x), Math.abs(y - map.spawn.y)) <= WANDER_SPAWN_BUFFER) return true
  const key = tileKey(x, y)
  if (map.locations.some(l => tileKey(l.x, l.y) === key)) return true
  if ((map.exits ?? []).some(e => tileKey(e.x, e.y) === key)) return true
  if ((map.chests ?? []).some(c => tileKey(c.x, c.y) === key)) return true
  if ((map.campfires ?? []).some(c => tileKey(c.x, c.y) === key)) return true
  if (npcs.some(n => tileKey(n.x, n.y) === key)) return true
  return false
}

// Deriva um monstro vagante por marcador de sub-região. Posicionado perto do pin, num tile livre
// que não colida com nenhuma outra entidade, pra funcionar em qualquer mapa sem dado extra por região.
interface Wanderer { id: string; subId: string; spriteId: string; home: { x: number; y: number }; x: number; y: number; facing: WanderFacing }
function deriveWanderers(map: RegionMapDef, npcs: NpcDefinition[], defeated?: Record<string, boolean>): Wanderer[] {
  const occupied = new Set<string>()
  const offsets: Array<[number, number]> = [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, -2], [2, -2], [-2, 2]]
  const out: Wanderer[] = []
  for (const loc of map.locations) {
    // Uma vitória naquele subId (por qualquer via -- esbarrar no monstro ou explorar pelo botão)
    // limpa a ameaça visível ali de vez, igual a um baú que já foi aberto -- não reaparece.
    if (defeated?.[loc.subId]) continue
    for (const [dx, dy] of offsets) {
      const x = loc.x + dx, y = loc.y + dy, key = tileKey(x, y)
      if (occupied.has(key) || wandererForbidden(map, npcs, x, y) || !isMapWalkable(map, { x, y })) continue
      occupied.add(key)
      const spriteId = WANDER_SPRITE_FAMILIES[out.length % WANDER_SPRITE_FAMILIES.length]
      out.push({ id: `wander_${loc.subId}`, subId: loc.subId, spriteId, home: { x, y }, x, y, facing: 'down' })
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
        resolved = t // 'flower' | 'tree' | 'water' | 'ice' | 'snow_drift' | 'steam_vent' | 'mud' | 'conveyor' | 'ash_lava_rock'
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
  // Primeiro uso dos terrenos especiais entregues no ART-004 -- posicionamento inicial numa área
  // aberta que não mexe na colisão já validada acima; ainda não conferido pixel a pixel contra a
  // arte (mesma ressalva do resto da colisão do Frostgard), só ilustra a mecânica funcionando.
  rect(base, 7, 9, 8, 10, 'ice') // trecho de gelo escorregadio, área aberta a oeste do canal
  rect(base, 6, 11, 6, 11, 'snow_drift')
  rect(base, 9, 11, 9, 11, 'snow_drift')
  base[4][4] = 'steam_vent' // respiro perto da caldeira noroeste
  return {
    id: 'frostgard', background: mapAsset('assets/maps/steelmere/frostgard.png'), tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base), weather: 'snow',
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
  // Colisão autorada em cima da arte entregue pelo Codex (ART-005): lagoa a oeste com ponte de
  // madeira cruzando em y=8, vila-treehouse nos cantos noroeste/sudoeste, estufa de vidro e torre
  // de engrenagem gigante a nordeste (com a entrada da estufa em y=8 e a plataforma da torre em
  // y=3-4 deixadas livres pra não bloquear os marcadores que ficam bem ali).
  const base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree')
  vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  rect(base, 2, 5, 5, 11, 'water')
  hline(base, 1, 6, 8, 'bridge')
  return {
    id: 'engrenverde', background: mapAsset('assets/maps/steelmere/engrenverde.png'), tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base),
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
    blocked: blockedRects(
      [0, 0, 3, 4], // vila-treehouse + roda d'água, canto noroeste
      [0, 10, 3, 14], // vila-treehouse, canto sudoeste
      [15, 5, 19, 7], // cúpula de vidro da estufa (entrada em y=8 fica livre)
      [19, 0, 21, 1], // engrenagem gigante, só o canto mais sólido
    ),
  }
}

function buildTrilhouro(): RegionMapDef {
  const width = 22, height = 16
  // Colisão autorada em cima da arte entregue pelo Codex (ART-006): canal atravessando o mapa
  // de norte a sul, ponte de madeira em y=8; trem/trilhos a noroeste, moinho+celeiro a oeste,
  // terminal ferroviário ornamentado e silos de grão a nordeste (plataforma/entrada em y=3-4 e
  // y=8 respectivamente deixadas livres, mesmo padrão usado no Frostgard/Engrenverde).
  const base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree')
  vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  rect(base, 14, 1, 15, 14, 'water')
  hline(base, 12, 17, 8, 'bridge')
  return {
    id: 'trilhouro', background: mapAsset('assets/maps/steelmere/trilhouro.png'), tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base),
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
    blocked: blockedRects(
      [0, 0, 4, 3], // trem + trilhos, canto noroeste
      [0, 4, 3, 7], // moinho + celeiro
      [15, 5, 19, 7], // silos de grão (entrada em y=8 fica livre)
      [19, 0, 21, 2], // parte solida do terminal ferroviario, so o canto
    ),
  }
}

function buildVulcannis(): RegionMapDef {
  const width = 22, height = 16
  // Colisão autorada em cima da arte entregue pelo Codex (ART-007): reservatório de lava no
  // topo-centro com ponte em y=4 (já no placeholder), fábrica/chaminés a noroeste, aqueduto a
  // oeste, fundição a leste e santuário a nordeste. Corredores em y=8 (sob o aqueduto/fundição)
  // e as saídas oeste/sudoeste deixados livres de propósito.
  const base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree')
  vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  rect(base, 9, 2, 12, 5, 'water')
  hline(base, 8, 13, 4, 'bridge')
  // Basalto rachado (ART-014): faixa decorativa no corredor aberto entre aqueduto e fundição --
  // sem regra de movimento própria, só reveste o chão (placement ilustrativo, como o gelo do
  // Frostgard em ART-004).
  rect(base, 8, 9, 10, 10, 'ash_lava_rock')
  return {
    id: 'vulcannis', background: mapAsset('assets/maps/steelmere/vulcannis.png'), tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base), weather: 'ash',
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
    blocked: blockedRects(
      [0, 0, 6, 2], // fábrica/chaminés, canto noroeste
      [2, 5, 7, 7], // aqueduto, parte superior (corredor em y=8 fica livre)
      [2, 9, 7, 10], // aqueduto, parte inferior
      [13, 5, 21, 7], // fundição, parte superior (corredor em y=8 fica livre)
      [13, 9, 21, 11], // fundição, parte inferior
      [17, 0, 21, 2], // santuário, canto nordeste
    ),
  }
}

function buildFerrujal(): RegionMapDef {
  const width = 22, height = 16
  // Colisão autorada em cima da arte entregue pelo Codex (ART-008): poça tóxica a oeste com
  // ponte em y=10 (já no placeholder), cemitério de autômatos a noroeste, fábrica central-leste
  // e núcleo de contenção a nordeste. Corredor em y=8 sob a fábrica e as saídas mantidos livres.
  const base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree')
  vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  rect(base, 2, 7, 4, 13, 'water')
  hline(base, 1, 5, 10, 'bridge')
  // Lama tóxica (ART-014): faixa a leste da poça (ferro_pocas), atolando quem passar por ali --
  // placement ilustrativo, como o gelo do Frostgard em ART-004.
  rect(base, 6, 11, 8, 12, 'mud')
  return {
    id: 'ferrujal', background: mapAsset('assets/maps/steelmere/ferrujal.png'), tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base), weather: 'smoke',
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
    blocked: blockedRects(
      [0, 0, 6, 2], // cemitério de autômatos, canto noroeste
      [12, 4, 20, 7], // fábrica, parte superior (y=3 fica livre pro núcleo/baú/saída nordeste, y=8 livre como corredor)
      [12, 9, 20, 11], // fábrica, parte inferior
      [17, 0, 21, 2], // núcleo de contenção, canto nordeste (y=3 livre)
    ),
  }
}

function buildCoroferro(): RegionMapDef {
  const width = 22, height = 16
  // Colisão autorada em cima da arte entregue pelo Codex (ART-009): canal/lago ornamentado no
  // topo-centro com ponte em y=6 (já no placeholder), entrada de metrô a noroeste, distrito
  // residencial a oeste, torre do relógio + catedral a nordeste. A praça circular central-leste
  // e o pátio inferior ficam totalmente abertos (são praças na arte, não obstáculo).
  const base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree')
  vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  rect(base, 8, 5, 12, 7, 'water')
  hline(base, 7, 13, 6, 'bridge')
  // Esteira industrial (ART-014): faixa vertical junto à praça do relógio (coro_praca) --
  // empurra automaticamente quem pisar (mesma regra de deslize do gelo, ver step() em
  // TileWorldExplorer); placement ilustrativo, como o gelo do Frostgard em ART-004.
  vline(base, 9, 11, 16, 'conveyor')
  return {
    id: 'coroferro', background: mapAsset('assets/maps/steelmere/coroferro.png'), tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base), weather: 'smoke',
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
    blocked: blockedRects(
      [0, 0, 4, 2], // entrada do metrô, canto noroeste
      [2, 6, 4, 10], // distrito residencial a oeste (deixa a coluna da saída oeste livre)
      [15, 0, 21, 2], // torre do relógio + catedral, parte superior
    ),
  }
}

function buildAetherium(): RegionMapDef {
  const width = 22, height = 16
  // Colisão autorada em cima da arte entregue pelo Codex (ART-010): poço de aether no topo-centro
  // com passarela vertical em x=10 (já no placeholder), vórtice a noroeste, reator/anel dourado a
  // nordeste, galeria mecânica a oeste e observatório a leste. O anel cerimonial central-sul e a
  // praça inferior ficam abertos (plataformas, não obstáculo).
  const base = fill(width, height, 'grass')
  hline(base, 0, width - 1, 0, 'tree'); hline(base, 0, width - 1, height - 1, 'tree')
  vline(base, 0, height - 1, 0, 'tree'); vline(base, 0, height - 1, width - 1, 'tree')
  rect(base, 8, 4, 13, 6, 'water')
  vline(base, 3, 7, 10, 'bridge')
  return {
    id: 'aetherium', background: mapAsset('assets/maps/steelmere/aetherium.png'), tileSize: 16, scale: 3, width, height, grid: resolveTerrain(base),
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
    blocked: blockedRects(
      [0, 0, 4, 2], // vórtice roxo, canto noroeste
      [17, 0, 21, 2], // reator/anel dourado, canto nordeste
      [0, 5, 3, 7], // galeria mecânica a oeste, parte superior (corredor y=8 e saída oeste livres)
      [0, 9, 3, 10], // galeria mecânica a oeste, parte inferior
      [14, 6, 18, 7], // observatório a leste, parte superior (corredor y=8 e saída leste livres)
      [14, 9, 18, 10], // observatório a leste, parte inferior
    ),
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
// Lista achatada de todo monólito de todo mapa, com o regionId já anexado -- é o que permite viajar
// de um monólito descoberto pra qualquer outro (mesmo de outra região/mundo) sem este arquivo
// precisar saber nada de tela/store; quem consome (game.ts) só cruza isso com `discoveredMonoliths`.
export interface DiscoverableMonolith extends RegionMapMonolith { regionId: string }
export const ALL_MONOLITHS: DiscoverableMonolith[] = Object.values(REGION_MAPS).flatMap(m => (m.monoliths ?? []).map(mono => ({ ...mono, regionId: m.id })))

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

// Ícone de objeto de mapa (fogueira/baú, ART-011/ART-021) com fallback pro emoji original --
// "asset ausente vira fallback seguro em vez de imagem quebrada" é exigência do próprio contrato
// de handoff (Definition of Done), não só capricho: se o Codex ainda não entregou (ou o nome do
// arquivo mudar), o jogador vê o emoji de sempre em vez de um ícone quebrado.
function MapPropIcon({ src, fallback, className }: { src: string; fallback: string; className?: string }) {
  const [failed, setFailed] = React.useState(false)
  if (failed) return <span className={className}>{fallback}</span>
  return <img className={className} src={src} alt="" onError={() => setFailed(true)} />
}

const FOG_REVEAL_RADIUS = 3
const FOG_EDGE_OFFSETS: Array<[number, number]> = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]

export function TileWorldExplorer({
  map, initialPosition, paused, onEnterLocation, locationStatus, exits = [], onEnterExit, npcs = [], onInteractNpc, npcStatus, onAmbush, onPositionChange,
  openedChests = {}, onOpenChest, onRestCampfire, onCampfireTick, playerSprite = 'adventurer', exploredTiles, onExplore, defeatedWanderers, customPins = [], onTogglePin,
  activatedLevers, onActivateLever, discoveredMonoliths, onActivateMonolith, discoveredSecrets, onDiscoverSecret
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
  onCampfireTick?: (campfire: RegionMapCampfire) => boolean
  playerSprite?: string
  exploredTiles?: Set<string>
  onExplore?: (tiles: Array<{ x: number; y: number }>) => void
  defeatedWanderers?: Record<string, boolean>
  customPins?: Array<{ x: number; y: number }>
  onTogglePin?: (x: number, y: number) => void
  activatedLevers?: Record<string, boolean>
  onActivateLever?: (leverId: string) => void
  discoveredMonoliths?: string[]
  onActivateMonolith?: (monolithId: string) => void
  discoveredSecrets?: Record<string, boolean>
  onDiscoverSecret?: (key: string) => void
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
  // Modo de pin customizado: enquanto ativo, clicar num tile marca/desmarca um pin em vez de
  // andar até lá -- fica em estado local (não precisa persistir) já que é só um jeito de alternar
  // o que o próximo clique faz, não um dado de jogo em si.
  const [pinMode, setPinMode] = React.useState(false)
  const [footprints, setFootprints] = React.useState<Array<{ id: number; x: number; y: number; foot: 'l' | 'r' }>>([])
  const footprintIdRef = React.useRef(0)
  const footToggleRef = React.useRef(false)
  // Barco/carruagem (ART-025): enquanto `riding` está definido, o sprite normal vira o veículo e a
  // transição CSS de left/top usa uma duração maior (ver .is-riding), então o "andar" até a doca
  // irmã é só a mesma transição de sempre, só que mais longa e com outro sprite -- sem interpolar
  // posição manualmente.
  const [riding, setRiding] = React.useState<{ vehicle: 'boat' | 'carriage' } | undefined>()
  const [secretBurst, setSecretBurst] = React.useState<{ id: number; x: number; y: number } | undefined>()
  const secretBurstIdRef = React.useRef(0)
  const [signpostOpen, setSignpostOpen] = React.useState<RegionMapScenery | undefined>()
  // Fogueira agora é uma área de descanso (3x3), não um toque instantâneo: enquanto o herói fica
  // dentro do raio, restingCampfire fica definido (mostra o cronômetro) e um interval chama
  // onCampfireTick a cada CAMPFIRE_TICK_MS. restingIdRef existe só pra saber se já estamos
  // descansando NA MESMA fogueira (não reiniciar o timer a cada passo dentro da própria área).
  const [restingCampfire, setRestingCampfire] = React.useState<RegionMapCampfire | undefined>()
  const restingIdRef = React.useRef<string | undefined>()
  const restTimerRef = React.useRef<number>()
  // "+1" verde que sobe e some a cada cura de verdade (fogueira) -- renderizado como filho de
  // .regionmap-player (acima do cronômetro), então segue o herói sem precisar guardar posição.
  const [healPopups, setHealPopups] = React.useState<Array<{ id: number }>>([])
  const healPopupIdRef = React.useRef(0)
  const movingRef = React.useRef(false)
  const movementTimers = React.useRef<number[]>([])
  const queuedMoves = React.useRef<Array<[number, number]>>([])
  const runQueuedMove = React.useRef<() => void>(() => {})
  const posRef = React.useRef(pos)
  const dragRef = React.useRef<{ x: number; y: number; camX: number; camY: number; dragged: boolean } | null>(null)
  const didDragRef = React.useRef(false)
  // Além dos NPCs, um portão fechado (ART-023) também bloqueia -- fica no mesmo set porque todo
  // lugar que já checava colisão de NPC precisa checar a mesma coisa pra portão, sem duplicar a
  // lista inteira de chamadas de isMapWalkable/routeBetween.
  const extraBlocked = React.useMemo(() => {
    const set = new Set(npcs.map(npc => tileKey(npc.x, npc.y)))
    for (const gate of map.gates ?? []) {
      const lever = (map.levers ?? []).find(l => l.gateId === gate.id)
      if (!lever || !activatedLevers?.[lever.id]) set.add(tileKey(gate.x, gate.y))
    }
    return set
  }, [npcs, map, activatedLevers])
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

  const spawnHealPopup = React.useCallback(() => {
    const id = ++healPopupIdRef.current
    setHealPopups(prev => [...prev, { id }])
    window.setTimeout(() => setHealPopups(prev => prev.filter(p => p.id !== id)), HEAL_POPUP_MS)
  }, [])

  // Área de descanso da fogueira (3x3): entra/sai por distância de Chebyshev, não por tile
  // exato -- assim a cura funciona em qualquer canto da área, não só parado em cima do objeto.
  // Pausado (diálogo aberto etc.) interrompe a cura, igual o resto do mapa fica congelado.
  React.useEffect(() => {
    const clearTimer = () => { if (restTimerRef.current) { window.clearInterval(restTimerRef.current); restTimerRef.current = undefined } }
    if (paused) {
      clearTimer()
      if (restingIdRef.current) { restingIdRef.current = undefined; setRestingCampfire(undefined) }
      return
    }
    const zone = (map.campfires ?? []).find(c => Math.abs(c.x - pos.x) <= CAMPFIRE_REST_RADIUS && Math.abs(c.y - pos.y) <= CAMPFIRE_REST_RADIUS)
    if (zone?.id === restingIdRef.current) return
    clearTimer()
    restingIdRef.current = zone?.id
    setRestingCampfire(zone)
    if (zone) {
      onRestCampfire?.(zone)
      restTimerRef.current = window.setInterval(() => {
        if (onCampfireTick?.(zone)) spawnHealPopup()
      }, CAMPFIRE_TICK_MS)
    }
  }, [pos.x, pos.y, paused, map, onRestCampfire, onCampfireTick, spawnHealPopup])

  React.useEffect(() => () => { if (restTimerRef.current) window.clearInterval(restTimerRef.current) }, [])

  // Ciclo dia/noite (ART-013): puramente estético -- não afeta combate, spawn nem emboscada, só
  // a opacidade dos overlays de luz. Relógio local ao componente (reinicia a cada entrada na
  // região), suficiente pro efeito ambiente pedido; a arte em si é estática, só a opacidade anima.
  const DAY_CYCLE_MS = 5 * 60 * 1000 // 5min por ciclo completo dia->noite->dia
  const [dayT, setDayT] = React.useState(() => (Date.now() % DAY_CYCLE_MS) / DAY_CYCLE_MS)
  React.useEffect(() => {
    const id = window.setInterval(() => setDayT((Date.now() % DAY_CYCLE_MS) / DAY_CYCLE_MS), 1000)
    return () => window.clearInterval(id)
  }, [])
  const nightOpacity = Math.max(0, Math.sin(dayT * Math.PI * 2 - Math.PI / 2)) * 0.82
  const twilightOpacity = Math.max(0, 1 - Math.abs(dayT - 0.25) * 8, 1 - Math.abs(dayT - 0.75) * 8) * 0.55

  // Monstros visíveis: um passeio aleatório limitado (WANDER_RADIUS) em torno de um ponto de
  // origem derivado dos marcadores do mapa (deriveWanderers). Encostar no jogador dispara o
  // mesmo fluxo de emboscada de sempre (onAmbush) -- ver ambush prompt em RegionMapView --, mas
  // como o monstro fica visível e mais lento que o jogador (WANDER_STEP_MS > STEP_MS), dá pra
  // desviar dele andando por outro caminho.
  // npcs é recriado a cada render (vem de uma função não memoizada em quem chama), então fica
  // numa ref -- colocar o array direto na dependência do useMemo abaixo resetaria os monstros a
  // cada render, não só quando o mapa muda de verdade.
  const npcsRef = React.useRef(npcs)
  React.useEffect(() => { npcsRef.current = npcs })
  const wanderTemplate = React.useMemo(() => deriveWanderers(map, npcsRef.current, defeatedWanderers), [map, defeatedWanderers])
  const [wanderers, setWanderers] = React.useState<Wanderer[]>(() => wanderTemplate.map(w => ({ ...w })))
  React.useEffect(() => { setWanderers(wanderTemplate.map(w => ({ ...w }))) }, [wanderTemplate])
  // Ciclo idle/walk_1/walk_2 compartilhado entre todos os monstros visíveis -- não precisa
  // sincronizar com o passo de cada um individualmente, é só textura de "criatura viva".
  const [wanderFrame, setWanderFrame] = React.useState(0)
  React.useEffect(() => {
    if (paused || !wanderers.length) return
    const id = window.setInterval(() => setWanderFrame(f => (f + 1) % WANDER_FRAMES.length), WANDER_FRAME_MS)
    return () => window.clearInterval(id)
  }, [paused, wanderers.length])
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
          if (!isMapWalkable(map, { x: nx, y: ny }) || wandererForbidden(map, npcsRef.current, nx, ny)) return w
          const key = tileKey(nx, ny)
          if (occupied.has(key) && key !== tileKey(w.x, w.y)) return w
          if (nx === posRef.current.x && ny === posRef.current.y) { triggeredSubId = w.subId; return w }
          occupied.delete(tileKey(w.x, w.y)); occupied.add(key)
          const facing: WanderFacing = dy < 0 ? 'up' : dy > 0 ? 'down' : dx > 0 ? 'right' : 'left'
          return { ...w, x: nx, y: ny, facing }
        })
        if (triggeredSubId) { wanderTriggeredRef.current = true; onAmbushRef.current?.(triggeredSubId) }
        return next
      })
    }, WANDER_STEP_MS)
    return () => window.clearInterval(id)
  }, [paused, map])

  // Embarcar (ART-025): só funciona parado exatamente em cima da doca (senão exige um clique pra
  // andar até lá primeiro e outro pra embarcar, evitando misturar o movimento passo-a-passo do
  // moveToTile com o "salto" direto de posição que a viagem faz aqui).
  const boardDock = React.useCallback((dock: RegionMapDock) => {
    if (movingRef.current || paused) return
    if (posRef.current.x !== dock.x || posRef.current.y !== dock.y) return
    const target = (map.docks ?? []).find(d => d.pairId === dock.pairId && d.id !== dock.id)
    if (!target) return
    const dir: Facing = Math.abs(target.x - dock.x) >= Math.abs(target.y - dock.y) ? (target.x > dock.x ? 'right' : 'left') : (target.y > dock.y ? 'down' : 'up')
    movingRef.current = true
    setFacing(dir)
    setRiding({ vehicle: dock.vehicle })
    posRef.current = { x: target.x, y: target.y }
    setPos({ x: target.x, y: target.y })
    window.setTimeout(() => {
      movingRef.current = false
      setRiding(undefined)
    }, RIDE_DURATION_MS)
  }, [map, paused])

  // auto=true identifica um passo continuado pelo deslize do gelo (ver terreno 'ice' logo
  // abaixo), não uma entrada nova do jogador -- serve só pra não rolar emboscada de novo a cada
  // tile deslizado (o jogador não escolheu continuar, seria punitivo empilhar chance em cima).
  const step = React.useCallback((dx: number, dy: number, auto = false) => {
    if (movingRef.current || paused) return
    const dir: Facing = dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'down' : 'up'
    setFacing(dir)
    const currentPos = posRef.current
    const tx = currentPos.x + dx, ty = currentPos.y + dy
    if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return
    if (!isMapWalkable(map, { x: tx, y: ty }, extraBlocked)) return
    movingRef.current = true
    // Pegada (alterna pé esquerdo/direito) no tile que está sendo deixado pra trás -- some
    // sozinha depois de FOOTPRINT_FADE_MS, puramente decorativo.
    const footprintId = ++footprintIdRef.current
    footToggleRef.current = !footToggleRef.current
    setFootprints(prev => [...prev, { id: footprintId, x: currentPos.x, y: currentPos.y, foot: footToggleRef.current ? 'l' : 'r' }])
    window.setTimeout(() => setFootprints(prev => prev.filter(f => f.id !== footprintId)), FOOTPRINT_FADE_MS)
    // Lama (ART-014) atrasa a chegada no tile -- é a "sensação" de atolar, sem inventar um
    // sistema de status novo; some assim que o jogador sai da lama, não é acumulativo.
    const arrivalDelay = map.grid[ty]?.[tx] === 'mud' ? Math.round(STEP_MS * 1.6) : STEP_MS
    // Alterna 0->1->2->0... a cada passo aceito -- é o ciclo de caminhada em si (perna
    // esquerda, neutro, perna direita), não uma animação por tempo separada do movimento.
    setWalking(true)
    setFrame(0)
    posRef.current = { x: tx, y: ty }
    setPos({ x: tx, y: ty })
    movementTimers.current.forEach(window.clearTimeout)
    movementTimers.current = Array.from({ length: WALK_FRAME_COUNT - 1 }, (_, index) =>
      window.setTimeout(() => setFrame(index + 1), Math.round(arrivalDelay * (index + 1) / WALK_FRAME_COUNT)),
    )
    window.setTimeout(() => {
      movingRef.current = false
      setWalking(false)
      setFrame(IDLE_FRAME)
      const loc = map.locations.find(l => l.x === tx && l.y === ty)
      const exit = exits.find(l => l.x === tx && l.y === ty)
      const chest = (map.chests ?? []).find(c => c.x === tx && c.y === ty)
      const landedTile = map.grid[ty]?.[tx]
      // Parede ilusória (ART-026): dispara o efeito uma vez só, na primeira vez que o jogador pisa
      // ali -- independente do que mais acontecer nesse tile (não é um `else if`, é um efeito à parte).
      if ((map.illusoryWalls ?? []).some(w => w.x === tx && w.y === ty)) {
        const secretKey = `${map.id}:${tx},${ty}`
        if (!discoveredSecrets?.[secretKey]) {
          onDiscoverSecret?.(secretKey)
          const burstId = ++secretBurstIdRef.current
          setSecretBurst({ id: burstId, x: tx, y: ty })
          window.setTimeout(() => setSecretBurst(prev => (prev?.id === burstId ? undefined : prev)), SECRET_BURST_MS)
        }
      }
      if (loc) onEnterLocation(loc.subId)
      else if (exit) onEnterExit?.(exit.id)
      else if (chest && !openedChests?.[chest.id]) onOpenChest?.(chest)
      else if ((landedTile === 'ice' || landedTile === 'conveyor') && isMapWalkable(map, { x: tx + dx, y: ty + dy }, extraBlocked)) {
        // Gelo (ART-004) e esteira industrial (ART-014, Coroferro) empurram do mesmo jeito:
        // continua deslizando na mesma direção até sair do terreno especial ou esbarrar em algo --
        // cancela um caminho clicado em andamento, já que o jogador perde o controle da direção
        // enquanto desliza.
        queuedMoves.current = []
        step(dx, dy, true)
        return
      }
      else if (!auto && Math.random() < AMBUSH_CHANCE) { const nearestId = nearestLocationId(map, { x: tx, y: ty }); if (nearestId) onAmbush?.(nearestId) }
      if (queuedMoves.current.length) runQueuedMove.current()
    }, arrivalDelay)
  }, [paused, map, onEnterLocation, exits, onEnterExit, extraBlocked, onAmbush, openedChests, onOpenChest, discoveredSecrets, onDiscoverSecret])

  const moveToTile = React.useCallback((target: { x: number; y: number }) => {
    const route = routeBetween(map, posRef.current, target, extraBlocked)
    if (!route.length) return
    queuedMoves.current = route
    runQueuedMove.current = () => {
      const next = queuedMoves.current.shift()
      if (next) step(next[0], next[1])
    }
    runQueuedMove.current()
  }, [map, step, extraBlocked])

  const moveToExit = React.useCallback((exit: { id: string; x: number; y: number }) => {
    const route = routeBetween(map, posRef.current, exit, extraBlocked)
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
  }, [map, extraBlocked, onEnterExit, step])

  const moveToNpc = React.useCallback((npc: NpcDefinition) => {
    const targets = [[0, 1], [1, 0], [0, -1], [-1, 0]]
      .map(([dx, dy]) => ({ x: npc.x + dx, y: npc.y + dy }))
      .filter(point => point.x >= 0 && point.y >= 0 && point.x < map.width && point.y < map.height && isMapWalkable(map, point, extraBlocked))
      .map(point => ({ point, route: routeBetween(map, posRef.current, point, extraBlocked) }))
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
  }, [map, extraBlocked, onInteractNpc, step])

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

  // Suporte a gamepad/controle: a Gamepad API não dispara evento nenhum enquanto um botão/eixo
  // fica segurado, então sondamos a cada frame via requestAnimationFrame. step() já ignora
  // chamadas repetidas sozinho (não-op enquanto movingRef.current for true), então segurar uma
  // direção repete no mesmo ritmo do teclado, sem precisar de debounce próprio aqui.
  React.useEffect(() => {
    if (paused) return
    let frameId = 0, interactHeld = false
    const poll = () => {
      // navigator.getGamepads?.() já cobre navegadores sem a Gamepad API (retorna undefined),
      // mas faltava o "?." antes do [0] -- em qualquer navegador sem suporte, isso lançava
      // "Cannot read properties of undefined" a cada frame (via requestAnimationFrame),
      // silenciosamente no console, mas sem nunca reagendar o próximo frame corretamente.
      const pad = navigator.getGamepads?.()?.[0]
      if (pad) {
        const [axisX, axisY] = pad.axes
        let dx = 0, dy = 0
        if (pad.buttons[14]?.pressed) dx = -1
        else if (pad.buttons[15]?.pressed) dx = 1
        else if (Math.abs(axisX ?? 0) > GAMEPAD_AXIS_DEAD_ZONE) dx = axisX! > 0 ? 1 : -1
        if (!dx) {
          if (pad.buttons[12]?.pressed) dy = -1
          else if (pad.buttons[13]?.pressed) dy = 1
          else if (Math.abs(axisY ?? 0) > GAMEPAD_AXIS_DEAD_ZONE) dy = axisY! > 0 ? 1 : -1
        }
        if (dx || dy) step(dx, dy)
        const interactPressed = Boolean(pad.buttons[0]?.pressed)
        if (interactPressed && !interactHeld && adjacentNpc) onInteractNpc?.(adjacentNpc)
        interactHeld = interactPressed
      }
      frameId = window.requestAnimationFrame(poll)
    }
    frameId = window.requestAnimationFrame(poll)
    return () => window.cancelAnimationFrame(frameId)
  }, [step, paused, adjacentNpc, onInteractNpc])

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
      if ((event.target as HTMLElement).closest('.regionmap-npc, .regionmap-location, .regionmap-exit, .regionmap-zoom-hud, .regionmap-pin-hud, .regionmap-custom-pin, .regionmap-lever, .regionmap-monolith, .regionmap-dock, .regionmap-scenery, .regionmap-signpost-backdrop')) return
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
      const tile = { x: Math.floor((camX + (event.clientX - bounds.left) / zoom) / tilePx), y: Math.floor((camY + (event.clientY - bounds.top) / zoom) / tilePx) }
      if (pinMode) onTogglePin?.(tile.x, tile.y)
      else moveToTile(tile)
    }}>
      <div className="regionmap-world" style={{ width: worldW, height: worldH, transformOrigin: '0 0', transform: `translate3d(${-camX * zoom}px,${-camY * zoom}px,0) scale(${zoom})` }}>
        {map.background && <div className="regionmap-art" style={{ backgroundImage: `url(${map.background})` }} />}
        <div className={`regionmap-tiles${map.background ? ' art-backed' : ''}`} style={{ gridTemplateColumns: `repeat(${map.width},${tilePx}px)`, gridAutoRows: `${tilePx}px` }}>
          {map.grid.flatMap((row, y) => row.map((t, x) => <div key={`${x}_${y}`} className={`regionmap-tile tile-${t}`} />))}
        </div>
        {twilightOpacity > 0.02 && <div className="regionmap-daynight twilight" style={{ opacity: twilightOpacity }} />}
        {nightOpacity > 0.02 && <div className="regionmap-daynight night" style={{ opacity: nightOpacity }} />}
        {map.weather && <div className={`regionmap-weather regionmap-weather-${map.weather}`} />}
        {footprints.map(f => (
          <div key={f.id} className="regionmap-footprint-tile" style={{ left: f.x * tilePx, top: f.y * tilePx, width: tilePx, height: tilePx }}>
            <span className={`regionmap-footprint foot-${f.foot}`} />
          </div>
        ))}
        {customPins.map((pin, index) => (
          <button key={`${pin.x}_${pin.y}_${index}`} type="button" className="regionmap-custom-pin"
            style={{ left: pin.x * tilePx, top: pin.y * tilePx, width: tilePx, height: tilePx }}
            onClick={event => { event.stopPropagation(); onTogglePin?.(pin.x, pin.y) }}
            aria-label="Remover pin" title="Pin do jogador -- clique pra remover">
            <span className="regionmap-custom-pin-icon">📍</span>
          </button>
        ))}
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
            }}
            aria-label={`Descansar na fogueira ${campfire.name}`} title={`Fogueira: ${campfire.name}`}>
            <span className="regionmap-campfire-aura" />
            <MapPropIcon className="regionmap-campfire-icon" src={mapAsset('assets/maps/objects/campfire/idle.png')} fallback="🔥" />
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
              <MapPropIcon className="regionmap-chest-icon" src={mapAsset(`assets/maps/objects/treasure-chest/${opened ? 'opened' : 'common'}.png`)} fallback={opened ? '📭' : '📦'} />
            </button>
          )
        })}
        {(map.levers ?? []).map(lever => {
          const active = Boolean(activatedLevers?.[lever.id])
          return (
            <button key={lever.id} type="button" className={`regionmap-lever${active ? ' active' : ''}`}
              style={{ left: lever.x * tilePx, top: lever.y * tilePx, width: tilePx, height: tilePx }}
              onClick={event => {
                event.stopPropagation()
                if (didDragRef.current) { didDragRef.current = false; return }
                moveToTile({ x: lever.x, y: lever.y })
                if (!active) onActivateLever?.(lever.id)
              }}
              aria-label={lever.name} title={active ? `${lever.name} (Ativada)` : `${lever.name} (Puxar)`}>
              <MapPropIcon className="regionmap-lever-icon" src={mapAsset(`assets/maps/objects/lever/${active ? 'activated' : 'idle'}.png`)} fallback={active ? '🟢' : '🔒'} />
            </button>
          )
        })}
        {(map.gates ?? []).map(gate => {
          const lever = (map.levers ?? []).find(l => l.gateId === gate.id)
          const open = Boolean(lever && activatedLevers?.[lever.id])
          return (
            <div key={gate.id} className="regionmap-gate" style={{ left: gate.x * tilePx, top: gate.y * tilePx, width: tilePx, height: tilePx }}>
              <MapPropIcon className="regionmap-gate-icon" src={mapAsset(`assets/maps/objects/gate/${open ? 'open' : 'closed'}.png`)} fallback={open ? '' : '🚧'} />
            </div>
          )
        })}
        {(map.monoliths ?? []).map(monolith => {
          const discovered = Boolean(discoveredMonoliths?.includes(monolith.id))
          return (
            <button key={monolith.id} type="button" className={`regionmap-monolith${discovered ? ' discovered' : ''}`}
              style={{ left: monolith.x * tilePx, top: monolith.y * tilePx, width: tilePx, height: tilePx }}
              onClick={event => {
                event.stopPropagation()
                if (didDragRef.current) { didDragRef.current = false; return }
                moveToTile({ x: monolith.x, y: monolith.y })
                onActivateMonolith?.(monolith.id)
              }}
              aria-label={monolith.name} title={discovered ? `${monolith.name} (Viajar)` : monolith.name}>
              <MapPropIcon className="regionmap-monolith-icon" src={mapAsset(`assets/maps/objects/monolith/${discovered ? 'active' : 'dormant'}.png`)} fallback="🗿" />
            </button>
          )
        })}
        {(map.docks ?? []).map(dock => (
          <button key={dock.id} type="button" className="regionmap-dock"
            style={{ left: dock.x * tilePx, top: dock.y * tilePx, width: tilePx, height: tilePx }}
            onClick={event => {
              event.stopPropagation()
              if (didDragRef.current) { didDragRef.current = false; return }
              if (posRef.current.x === dock.x && posRef.current.y === dock.y) boardDock(dock)
              else moveToTile({ x: dock.x, y: dock.y })
            }}
            aria-label={dock.name} title={dock.name}>
            <MapPropIcon className="regionmap-dock-icon" src={mapAsset(`assets/maps/objects/${dock.vehicle}/idle.png`)} fallback={dock.vehicle === 'boat' ? '🛶' : '🐎'} />
          </button>
        ))}
        {(map.scenery ?? []).map(item => (
          <button key={item.id} type="button" className="regionmap-scenery"
            style={{ left: item.x * tilePx, top: item.y * tilePx, width: tilePx, height: tilePx }}
            onClick={event => {
              event.stopPropagation()
              if (didDragRef.current) { didDragRef.current = false; return }
              moveToTile({ x: item.x, y: item.y })
              setSignpostOpen(item)
            }}
            aria-label={item.name} title={item.name}>
            <MapPropIcon className="regionmap-scenery-icon" src={mapAsset(`assets/maps/objects/${item.kind}/idle.png`)} fallback="📜" />
          </button>
        ))}
        {secretBurst && (
          <div className="regionmap-secret-burst" style={{ left: secretBurst.x * tilePx, top: secretBurst.y * tilePx, width: tilePx, height: tilePx }}>
            <img src={mapAsset('assets/maps/fx/secret-reveal/burst.png')} alt="" />
          </div>
        )}
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
            <img className="regionmap-wanderer-sprite" style={w.facing === 'left' ? { transform: 'scaleX(-1)' } : undefined} src={wanderAsset(w.spriteId, w.facing, WANDER_FRAMES[wanderFrame])} alt="" />
          </div>
        ))}
        <div className={`regionmap-player${walking ? ' is-walking' : ''}${riding ? ' is-riding' : ''}`}
          style={{ left: pos.x * tilePx, top: pos.y * tilePx, width: tilePx, height: tilePx }}>
          <span className="regionmap-player-shadow" />
          {restingCampfire && (
            <span className="regionmap-rest-timer" title={`Descansando na fogueira ${restingCampfire.name}: +1 de vida a cada 6s`}>
              <span className="regionmap-rest-timer-hand" />
            </span>
          )}
          {healPopups.map(popup => (
            <span key={popup.id} className="regionmap-heal-popup"><span className="heal-popup-plus1">+1</span></span>
          ))}
          {riding ? (
            <img className="regionmap-player-vehicle" src={mapAsset(`assets/maps/objects/${riding.vehicle}/moving.png`)} alt="" />
          ) : (
            <span className="regionmap-player-sprite-wrap" style={sprite.mirror ? { transform: 'scaleX(-1)' } : undefined}>
              <img className="regionmap-player-sprite" src={frameSrc} alt="" />
            </span>
          )}
        </div>
        {exploredTiles && map.grid.flatMap((row, y) => row.map((_, x) => {
          if (exploredTiles.has(`${x},${y}`)) return null
          // Borda de transição: um tile de névoa colado numa área já explorada fica a 50% de
          // opacidade em vez de preto sólido, então a visão não corta de 100% pra 100% preto de
          // uma vez -- só os tiles realmente "no fundo" da névoa (sem vizinho explorado) ficam opacos.
          const isEdge = FOG_EDGE_OFFSETS.some(([dx, dy]) => exploredTiles.has(`${x + dx},${y + dy}`))
          return <div key={`fog_${x}_${y}`} className={`regionmap-fog-tile${isEdge ? ' is-edge' : ''}`} style={{ left: x * tilePx, top: y * tilePx, width: tilePx, height: tilePx }} />
        }))}
      </div>
      <div className="regionmap-zoom-hud" onClick={event => event.stopPropagation()}>
        <button type="button" onClick={() => setZoom(z => clamp(Math.round((z - ZOOM_STEP) * 100) / 100, ZOOM_MIN, ZOOM_MAX))} aria-label="Afastar o mapa" title="Afastar (ou role o mouse)"><ZoomOut size={14} /></button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom(z => clamp(Math.round((z + ZOOM_STEP) * 100) / 100, ZOOM_MIN, ZOOM_MAX))} aria-label="Aproximar o mapa" title="Aproximar (ou role o mouse)"><ZoomIn size={14} /></button>
      </div>
      {onTogglePin && <div className="regionmap-pin-hud" onClick={event => event.stopPropagation()}>
        <button type="button" className={pinMode ? 'active' : ''} onClick={() => setPinMode(v => !v)} aria-label={pinMode ? 'Sair do modo de marcar pins' : 'Marcar pin no mapa'} title={pinMode ? 'Clique num tile pra marcar/desmarcar um pin -- clique aqui de novo pra sair do modo' : 'Ativar modo de marcar pins pessoais no mapa'}>
          <MapPin size={14} />
        </button>
      </div>}
      {signpostOpen && (
        <div className="regionmap-signpost-backdrop" onClick={() => setSignpostOpen(undefined)}>
          <div className="regionmap-signpost-popup" onClick={event => event.stopPropagation()}>
            <strong>{signpostOpen.name}</strong>
            <p>{signpostOpen.text}</p>
            <button type="button" onClick={() => setSignpostOpen(undefined)}>Fechar</button>
          </div>
        </div>
      )}
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
