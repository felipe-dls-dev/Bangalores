import { describe, expect, it } from 'vitest'
import {
  REGION_MAPS, validateRegionMap, resolveTerrain, blockedRects, fill, isMapWalkable, nearestWalkable,
  routeBetween, wanderAsset, tileKey, type RegionMapDef, type BaseTile,
} from './regionMap'

describe('mapas de região', () => {
  it('mantém spawn, pins e rotas de todos os mapas navegáveis', () => {
    for (const map of Object.values(REGION_MAPS)) {
      expect(validateRegionMap(map), map.id).toEqual([])
    }
  })
})

// Grid mínimo pra testar o motor sem depender dos mapas reais de produção -- 5x5, tudo grama
// exceto uma borda de árvores, pra isolar o comportamento de cada peça do sistema.
function baseGrid(overrides: Array<[number, number, BaseTile]> = []): BaseTile[][] {
  const grid = fill(5, 5, 'grass')
  for (let x = 0; x < 5; x++) { grid[0][x] = 'tree'; grid[4][x] = 'tree' }
  for (let y = 0; y < 5; y++) { grid[y][0] = 'tree'; grid[y][4] = 'tree' }
  for (const [x, y, tile] of overrides) grid[y][x] = tile
  return grid
}
function testMap(overrides: Omit<Partial<RegionMapDef>, 'grid'> & { grid?: BaseTile[][] } = {}): RegionMapDef {
  const grid = resolveTerrain(overrides.grid ?? baseGrid())
  return {
    id: 'test_map', tileSize: 16, scale: 3, width: 5, height: 5, spawn: { x: 2, y: 2 }, locations: [],
    ...overrides, grid,
  } as RegionMapDef
}

describe('resolveTerrain (auto-tiling)', () => {
  it('resolve um segmento reto de caminho horizontal como path_h', () => {
    const grid = resolveTerrain(baseGrid([[1, 2, 'path'], [2, 2, 'path'], [3, 2, 'path']]))
    expect(grid[2][2]).toBe('path_h')
  })
  it('resolve um segmento reto de caminho vertical como path_v', () => {
    const grid = resolveTerrain(baseGrid([[2, 1, 'path'], [2, 2, 'path'], [2, 3, 'path']]))
    expect(grid[2][2]).toBe('path_v')
  })
  it('resolve uma ponta solta de caminho (1 vizinho) como path_v (fallback)', () => {
    const grid = resolveTerrain(baseGrid([[2, 2, 'path'], [2, 3, 'path']]))
    expect(grid[2][2]).toBe('path_v')
  })
  it.each([
    [[[2, 1, 'path'], [2, 2, 'path'], [3, 2, 'path']], 'path_corner_tr'],
    [[[2, 1, 'path'], [2, 2, 'path'], [1, 2, 'path']], 'path_corner_tl'],
    [[[2, 3, 'path'], [2, 2, 'path'], [3, 2, 'path']], 'path_corner_br'],
    [[[2, 3, 'path'], [2, 2, 'path'], [1, 2, 'path']], 'path_corner_bl'],
  ] as Array<[Array<[number, number, BaseTile]>, string]>)('resolve as 4 curvas de caminho corretamente: %#', (overrides, expected) => {
    const grid = resolveTerrain(baseGrid(overrides))
    expect(grid[2][2]).toBe(expected)
  })
  it('down+right ganha prioridade sobre outras combinações num cruzamento em T', () => {
    // vizinho em baixo, direita E esquerda -- checa que a ordem de prioridade do resolver
    // (down&&right primeiro) é determinística, não que o resultado é "certo" (não há peça de
    // cruzamento própria, ver comentário no código-fonte).
    const grid = resolveTerrain(baseGrid([[2, 2, 'path'], [2, 3, 'path'], [3, 2, 'path'], [1, 2, 'path']]))
    expect(grid[2][2]).toBe('path_corner_br')
  })
  it('resolve uma ponte vertical em cap_top / mid / cap_bottom', () => {
    const grid = resolveTerrain(baseGrid([[2, 1, 'bridge'], [2, 2, 'bridge'], [2, 3, 'bridge']]))
    expect(grid[1][2]).toBe('bridge_cap_top')
    expect(grid[2][2]).toBe('bridge_mid')
    expect(grid[3][2]).toBe('bridge_cap_bottom')
  })
  it('uma única célula de ponte vira cap_top (sem vizinho embaixo)', () => {
    const grid = resolveTerrain(baseGrid([[2, 2, 'bridge']]))
    expect(grid[2][2]).toBe('bridge_cap_top')
  })
  it.each([
    [[3, 2] as [number, number], 'water', 'bank_v'],
    [[1, 2] as [number, number], 'water', 'bank_v_r'],
    [[2, 3] as [number, number], 'water', 'bank_h'],
    [[2, 1] as [number, number], 'water', 'bank_h_r'],
  ] as Array<[[number, number], BaseTile, string]>)('gera a margem de rio correta quando grama encosta em água: %#', ([wx, wy], waterTile, expected) => {
    const grid = resolveTerrain(baseGrid([[wx, wy, waterTile]]))
    expect(grid[2][2]).toBe(expected)
  })
  it('não altera tiles sem auto-tiling (flower/tree/water/ice/mud/etc. passam direto)', () => {
    const passthrough: BaseTile[] = ['flower', 'tree', 'water', 'ice', 'snow_drift', 'steam_vent', 'mud', 'conveyor', 'ash_lava_rock']
    for (const tile of passthrough) {
      const grid = resolveTerrain(baseGrid([[2, 2, tile]]))
      expect(grid[2][2], tile).toBe(tile)
    }
  })
})

describe('blockedRects', () => {
  it('expande um único retângulo em todas as células internas', () => {
    expect(blockedRects([1, 1, 2, 2])).toEqual([
      { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 },
    ])
  })
  it('um retângulo de 1x1 gera uma única célula', () => {
    expect(blockedRects([3, 3, 3, 3])).toEqual([{ x: 3, y: 3 }])
  })
  it('concatena várias regiões em uma lista só (flatMap)', () => {
    const cells = blockedRects([0, 0, 0, 0], [5, 5, 6, 5])
    expect(cells).toEqual([{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 6, y: 5 }])
  })
})

describe('isMapWalkable / nearestWalkable / routeBetween (pathfinding)', () => {
  it('considera grama andável e árvore/borda não andável', () => {
    const map = testMap()
    expect(isMapWalkable(map, { x: 2, y: 2 })).toBe(true)
    expect(isMapWalkable(map, { x: 0, y: 0 })).toBe(false)
  })
  it('respeita map.blocked mesmo sobre um tile de base andável', () => {
    const map = testMap({ blocked: [{ x: 2, y: 2 }] })
    expect(isMapWalkable(map, { x: 2, y: 2 })).toBe(false)
  })
  it('respeita o extraBlocked dinâmico (ex.: NPC ou portão fechado) sem tocar em map.blocked', () => {
    const map = testMap()
    const extra = new Set([tileKey(2, 2)])
    expect(isMapWalkable(map, { x: 2, y: 2 }, extra)).toBe(false)
    expect(isMapWalkable(map, { x: 2, y: 2 })).toBe(true)
  })
  it('nearestWalkable devolve o próprio alvo quando ele já é andável', () => {
    const map = testMap()
    expect(nearestWalkable(map, { x: 2, y: 2 })).toEqual({ x: 2, y: 2 })
  })
  it('nearestWalkable busca o vizinho andável mais próximo quando o alvo está bloqueado', () => {
    const map = testMap({ blocked: [{ x: 2, y: 2 }] })
    const found = nearestWalkable(map, { x: 2, y: 2 })
    expect(found).toBeDefined()
    expect(isMapWalkable(map, found!)).toBe(true)
    // distância de Chebyshev 1 (o próprio algoritmo varre em anéis crescentes)
    expect(Math.max(Math.abs(found!.x - 2), Math.abs(found!.y - 2))).toBe(1)
  })
  it('nearestWalkable devolve undefined quando não existe nenhum tile andável no mapa', () => {
    const allTrees = fill(3, 3, 'tree')
    const map = testMap({ width: 3, height: 3, grid: allTrees })
    expect(nearestWalkable(map, { x: 1, y: 1 })).toBeUndefined()
  })
  it('routeBetween encontra um caminho reto num campo aberto', () => {
    const map = testMap()
    const route = routeBetween(map, { x: 1, y: 1 }, { x: 3, y: 3 })
    expect(route.length).toBeGreaterThan(0)
    // soma os passos e confere que realmente chega no destino
    let x = 1, y = 1
    for (const [dx, dy] of route) { x += dx; y += dy }
    expect({ x, y }).toEqual({ x: 3, y: 3 })
  })
  it('routeBetween desvia de um obstáculo no meio do caminho', () => {
    // bloqueia (2,1) e (2,2) mas deixa (2,3) livre como desvio -- se o bloqueio cobrisse as 3
    // linhas interiores da grade 5x5 não haveria nenhuma rota possível (ver teste de ilha abaixo).
    const map = testMap({ blocked: [{ x: 2, y: 1 }, { x: 2, y: 2 }] })
    const route = routeBetween(map, { x: 1, y: 1 }, { x: 3, y: 1 })
    expect(route.length).toBeGreaterThan(0)
    let x = 1, y = 1
    for (const [dx, dy] of route) {
      x += dx; y += dy
      expect(isMapWalkable(map, { x, y }), `passo (${x},${y}) deveria ser andável`).toBe(true)
    }
    expect({ x, y }).toEqual({ x: 3, y: 1 })
  })
  it('routeBetween devolve [] quando início e alvo já são o mesmo tile', () => {
    const map = testMap()
    expect(routeBetween(map, { x: 2, y: 2 }, { x: 2, y: 2 })).toEqual([])
  })
  it('routeBetween devolve [] quando o alvo está isolado por bloqueios', () => {
    // ilha de 1x1 cercada por bloqueio -- nenhuma rota possível de fora pra dentro
    const map = testMap({
      blocked: [{ x: 1, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 3 }],
    })
    expect(routeBetween(map, { x: 1, y: 1 }, { x: 2, y: 2 })).toEqual([])
  })
  it('routeBetween respeita extraBlocked (ex.: portão fechado) sem exigir mudança em map.blocked', () => {
    const map = testMap()
    // fecha (2,1) e (2,2) dinamicamente, deixando (2,3) como desvio -- confirma que extraBlocked
    // participa do mesmo pathfinding que map.blocked, sem precisar tocar no mapa estático.
    const gateClosed = new Set([tileKey(2, 1), tileKey(2, 2)])
    const route = routeBetween(map, { x: 1, y: 1 }, { x: 3, y: 1 }, gateClosed)
    expect(route.length).toBeGreaterThan(0)
    for (const [dx, dy] of route) expect([dx, dy]).toBeDefined()
    expect(isMapWalkable(map, { x: 2, y: 1 })).toBe(true) // sem extraBlocked, o mesmo tile continua andável
  })
})

describe('wanderAsset (direção de monstros visíveis, ART-028)', () => {
  it('down usa os arquivos-raiz (sem prefixo de pasta)', () => {
    expect(wanderAsset('automato-sentinela', 'down', 'idle')).toMatch(/monster-automato-sentinela\/idle\.png$/)
  })
  it('up e right usam a pasta prefixada correspondente', () => {
    expect(wanderAsset('automato-sentinela', 'up', 'walk_1')).toMatch(/monster-automato-sentinela\/up_walk_1\.png$/)
    expect(wanderAsset('automato-sentinela', 'right', 'walk_2')).toMatch(/monster-automato-sentinela\/right_walk_2\.png$/)
  })
  it('left reaproveita os frames de right (espelhados via CSS, não tem arquivo left_ próprio)', () => {
    expect(wanderAsset('automato-sentinela', 'left', 'idle')).toBe(wanderAsset('automato-sentinela', 'right', 'idle'))
  })
})

describe('validateRegionMap detecta problemas em mapas sintéticos quebrados', () => {
  it('acusa spawn fora de área transitável', () => {
    const map = testMap({ spawn: { x: 0, y: 0 } })
    expect(validateRegionMap(map)).toContain('test_map: spawn fora de uma área transitável')
  })
  it('acusa dois pins sobrepostos na mesma célula', () => {
    const map = testMap({ locations: [{ subId: 'a', x: 1, y: 1 }, { subId: 'b', x: 1, y: 1 }] })
    expect(validateRegionMap(map)).toContain('test_map: pins sobrepostos em 1:1')
  })
  it('acusa um pin inalcançável a partir do spawn', () => {
    // spawn padrão é (2,2); isola esse mesmo tile com bloqueios nos 4 lados e move o pin pra lá --
    // ele existe e é andável, mas nenhuma rota de fora alcança essa ilha de 1x1.
    const map = testMap({
      spawn: { x: 1, y: 1 },
      blocked: [{ x: 1, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 1 }, { x: 2, y: 3 }],
      locations: [{ subId: 'ilha', x: 2, y: 2 }],
    })
    expect(validateRegionMap(map)).toContain('test_map: pin ilha não pode ser alcançado a partir do spawn')
  })
  it('acusa uma saída fora de área transitável', () => {
    const map = testMap({ exits: [{ id: 'next', x: 0, y: 0 }] })
    expect(validateRegionMap(map)).toContain('test_map: saída next fora de uma área transitável')
  })
  it('não acusa nada em um mapa sintético válido (sem falso positivo)', () => {
    const map = testMap({ locations: [{ subId: 'a', x: 3, y: 3 }], exits: [{ id: 'next', x: 1, y: 3 }] })
    expect(validateRegionMap(map)).toEqual([])
  })

  describe('mecânicas de mapa (alavanca/portão, monólito, doca, cenário, parede ilusória)', () => {
    it('acusa uma alavanca apontando para um portão inexistente', () => {
      const map = testMap({ levers: [{ id: 'l1', name: 'Alavanca', x: 3, y: 3, gateId: 'nao_existe' }] })
      expect(validateRegionMap(map)).toContain('test_map: alavanca l1 aponta para o portão inexistente nao_existe')
    })
    it('acusa um portão sem nenhuma alavanca associada', () => {
      const map = testMap({ gates: [{ id: 'g1', x: 3, y: 3 }] })
      expect(validateRegionMap(map)).toContain('test_map: portão g1 não tem nenhuma alavanca associada')
    })
    it('não acusa nada quando a alavanca e o portão se referenciam corretamente', () => {
      const map = testMap({
        levers: [{ id: 'l1', name: 'Alavanca', x: 3, y: 3, gateId: 'g1' }],
        gates: [{ id: 'g1', x: 1, y: 3 }],
      })
      expect(validateRegionMap(map)).toEqual([])
    })
    it('acusa uma doca cujo par (pairId) não tem exatamente 2 docas', () => {
      const map = testMap({ docks: [{ id: 'd1', name: 'Doca', x: 3, y: 3, pairId: 'rota_a', vehicle: 'boat' }] })
      expect(validateRegionMap(map)).toContain('test_map: par de doca rota_a tem 1 doca(s), esperado 2')
    })
    it('não acusa nada quando a doca tem exatamente 2 pares', () => {
      const map = testMap({
        docks: [
          { id: 'd1', name: 'Doca A', x: 3, y: 3, pairId: 'rota_a', vehicle: 'boat' },
          { id: 'd2', name: 'Doca B', x: 1, y: 3, pairId: 'rota_a', vehicle: 'boat' },
        ],
      })
      expect(validateRegionMap(map)).toEqual([])
    })
    it('acusa um monólito ou objeto de cenário inalcançável', () => {
      const map = testMap({ monoliths: [{ id: 'm1', name: 'Monólito', x: 0, y: 0 }] })
      expect(validateRegionMap(map)).toContain('test_map: monólito m1 fora de uma área transitável')
      const map2 = testMap({ scenery: [{ id: 's1', name: 'Placa', x: 0, y: 0, kind: 'signpost', text: 'oi' }] })
      expect(validateRegionMap(map2)).toContain('test_map: objeto de cenário s1 fora de uma área transitável')
    })
    it('acusa parede ilusória fora dos limites do mapa', () => {
      const map = testMap({ illusoryWalls: [{ x: 99, y: 99 }] })
      expect(validateRegionMap(map)).toContain('test_map: parede ilusória em 99:99 fora dos limites do mapa')
    })
    it('acusa parede ilusória incorretamente listada em blocked (ela deveria ser andável por design)', () => {
      const map = testMap({ illusoryWalls: [{ x: 1, y: 1 }], blocked: [{ x: 1, y: 1 }] })
      expect(validateRegionMap(map)).toContain('test_map: parede ilusória em 1:1 não deveria estar em blocked (ela já é andável por design, só a arte parece sólida)')
    })
  })
})
