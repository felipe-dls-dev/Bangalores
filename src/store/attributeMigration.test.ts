import { beforeEach, describe, expect, it } from 'vitest'
import { HEROES, maxHp, normalizeAttributes, useGame, xpForLevel } from './game'

// Migração de saves para balanceVersion 3 (Força/Magia/Vigor/Destreza). O que não é atributo NÃO pode mudar.
const legacyHeroLife = (id: string) => HEROES.find((h) => h.id === id)!.vida
const finiteEverywhere = (value: unknown): boolean => {
  if (typeof value === 'number') return Number.isFinite(value)
  if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).every(finiteEverywhere)
  return true
}

/** Um save v2 (Vida/Ataque/Defesa) como o jogo antigo gravava. */
const v2Save = (heroId: string, over: Record<string, unknown> = {}) => ({
  heroId,
  balanceVersion: 2,
  xp: xpForLevel(10),
  hp: 999,
  attributePoints: 0,
  attr: { vida: 4, ataque: 3, defesa: 2 },
  allocatedAttr: { vida: 4, ataque: 3, defesa: 2 },
  equipped: {},
  talents: [],
  ...over,
})

describe('migração v2 -> v3', () => {
  it('Ataque alocado vira Força nas classes físicas e Magia nas mágicas', () => {
    for (const id of ['guerreiro', 'guardiao', 'cacadora', 'cacador']) {
      const migrated = normalizeAttributes(v2Save(id))
      expect(migrated.allocatedAttr.forca, id).toBe(3)
      expect(migrated.allocatedAttr.magia, id).toBe(0)
    }
    for (const id of ['arcanista', 'druida', 'sacerdotisa', 'conjurador']) {
      const migrated = normalizeAttributes(v2Save(id))
      expect(migrated.allocatedAttr.magia, id).toBe(3)
      expect(migrated.allocatedAttr.forca, id).toBe(0)
    }
  })

  it('o Monge (híbrido) recebe o antigo Ataque em Força, seu atributo principal', () => {
    expect(normalizeAttributes(v2Save('monge')).allocatedAttr).toMatchObject({ forca: 3, magia: 0 })
  })

  it('Vida e Defesa alocadas viram Vigor; Destreza começa em zero', () => {
    const migrated = normalizeAttributes(v2Save('guerreiro'))
    expect(migrated.allocatedAttr).toEqual({ forca: 3, magia: 0, vigor: 6, destreza: 0 })
    expect(migrated.attr).toEqual({ forca: 3, magia: 0, vigor: 6, destreza: 0 })
    expect(migrated.balanceVersion).toBe(3)
  })

  it('bônus permanentes acima dos pontos alocados (attr > allocatedAttr) seguem o mesmo destino', () => {
    const migrated = normalizeAttributes(v2Save('arcanista', { attr: { vida: 4, ataque: 5, defesa: 3 }, allocatedAttr: { vida: 4, ataque: 3, defesa: 2 } }))
    expect(migrated.allocatedAttr).toEqual({ forca: 0, magia: 3, vigor: 6, destreza: 0 })
    expect(migrated.attr.magia).toBe(5) // +2 de bônus de recompensa
    expect(migrated.attr.vigor).toBe(7) // +1 de bônus de recompensa
  })

  it('a Vida permanente das poções (attr.vida acima dos pontos gastos) é preservada exata em permanentLife', () => {
    const migrated = normalizeAttributes(v2Save('guerreiro', { attr: { vida: 9, ataque: 3, defesa: 2 }, allocatedAttr: { vida: 4, ataque: 3, defesa: 2 } }))
    expect(migrated.permanentLife).toBe(5)
    expect(migrated.allocatedAttr.vigor).toBe(6) // só os pontos gastos viram Vigor
  })

  it('a proporção da Vida atual é mantida (cheia continua cheia, metade continua metade)', () => {
    const legacyMax = legacyHeroLife('guerreiro') + 4 // Vida base + pontos de Vida gastos
    const full = normalizeAttributes(v2Save('guerreiro', { hp: legacyMax }))
    const full3 = { ...v2Save('guerreiro'), ...full }
    expect(full.hp).toBe(maxHp(full3 as any))

    const half = normalizeAttributes(v2Save('guerreiro', { hp: Math.round(legacyMax / 2) }))
    const newMax = maxHp({ ...v2Save('guerreiro'), ...half } as any)
    expect(half.hp).toBeGreaterThan(0)
    expect(Math.abs(half.hp / newMax - 0.5)).toBeLessThan(0.06)
  })

  it('Vida atual zerada continua zerada e nenhuma Vida passa a ser maior que o máximo', () => {
    expect(normalizeAttributes(v2Save('guerreiro', { hp: 0 })).hp).toBe(0)
    const overflowing = normalizeAttributes(v2Save('guerreiro', { hp: 10_000 }))
    expect(overflowing.hp).toBe(maxHp({ ...v2Save('guerreiro'), ...overflowing } as any))
  })

  it('save que já é v3 é devolvido como está (idempotente)', () => {
    const once = normalizeAttributes(v2Save('arcanista'))
    const twice = normalizeAttributes({ ...v2Save('arcanista'), ...once })
    expect(twice.attr).toEqual(once.attr)
    expect(twice.allocatedAttr).toEqual(once.allocatedAttr)
    expect(twice.permanentLife).toBe(once.permanentLife)
    expect(twice.balanceVersion).toBe(3)
    expect(twice.hp).toBeUndefined() // a Vida não é mexida de novo
  })
})

describe('migração v1 -> v3', () => {
  it('reconstrói os pontos gastos pela regra antiga e depois migra', () => {
    // nível 10 = 9 pontos ganhos; 0 disponíveis = 9 gastos: Defesa primeiro, depois Ataque, depois Vida
    const migrated = normalizeAttributes({ heroId: 'guerreiro', xp: xpForLevel(10), hp: 20, attributePoints: 0, attr: { vida: 5, ataque: 4, defesa: 3 } })
    expect(migrated.balanceVersion).toBe(3)
    const total = Object.values(migrated.allocatedAttr as Record<string, number>).reduce((a, b) => a + b, 0)
    expect(total).toBeLessThanOrEqual(9)
    expect(finiteEverywhere(migrated)).toBe(true)
  })
})

describe('saves incompletos ou corrompidos', () => {
  const corrupt: Array<[string, unknown]> = [
    ['undefined', undefined],
    ['null', null],
    ['objeto vazio', {}],
    ['sem heroId', { attr: { vida: 2, ataque: 1, defesa: 1 } }],
    ['heroId desconhecido', { heroId: 'nao_existe', attr: { vida: 2, ataque: 1, defesa: 1 }, hp: 5 }],
    ['attr com texto e NaN', { heroId: 'guerreiro', balanceVersion: 2, attr: { vida: 'abc', ataque: Number.NaN, defesa: null }, allocatedAttr: { vida: {}, ataque: [], defesa: -3 }, hp: 'x' }],
    ['valores negativos e infinitos', { heroId: 'druida', balanceVersion: 2, attr: { vida: -5, ataque: Number.POSITIVE_INFINITY, defesa: -1 }, allocatedAttr: { vida: -5, ataque: 2, defesa: 1 }, hp: Number.NaN }],
    ['v3 sem allocatedAttr', { heroId: 'guerreiro', balanceVersion: 3, attr: { forca: 2 } }],
    ['v3 com lixo', { heroId: 'monge', balanceVersion: 3, attr: { forca: 'x', magia: -4, vigor: Number.NaN, destreza: 2.7 }, allocatedAttr: { forca: null, magia: 1, vigor: 1, destreza: 1 }, permanentLife: 'nada' }],
    ['xp inválido', { heroId: 'guerreiro', xp: Number.NaN, attributePoints: 'muitos', attr: { vida: 1, ataque: 1, defesa: 1 } }],
  ]

  for (const [name, source] of corrupt) {
    it(`não produz NaN nem valores negativos: ${name}`, () => {
      const migrated = normalizeAttributes(source)
      expect(finiteEverywhere(migrated)).toBe(true)
      for (const key of ['forca', 'magia', 'vigor', 'destreza'] as const) {
        expect(migrated.attr[key]).toBeGreaterThanOrEqual(0)
        expect(migrated.allocatedAttr[key]).toBeGreaterThanOrEqual(0)
      }
      expect(migrated.permanentLife).toBeGreaterThanOrEqual(0)
      expect(migrated.balanceVersion).toBe(3)
      if (migrated.hp !== undefined) expect(migrated.hp).toBeGreaterThanOrEqual(0)
    })
  }
})

describe('carregar campanha antiga pela store', () => {
  beforeEach(() => {
    useGame.getState().newGame('guerreiro')
  })

  it('preserva tudo que não é atributo (ouro, inventário, equipamentos, progresso)', () => {
    const state = useGame.getState()
    const snapshot = {
      ...state,
      heroId: 'guerreiro',
      balanceVersion: 2,
      gold: 4321,
      xp: xpForLevel(12),
      inventory: { pocao_cura: 3 },
      talents: ['precisao'],
      subregionVictories: { alvora_a: 4 },
      attributePoints: 1,
      hp: 30,
      attr: { vida: 6, ataque: 5, defesa: 3 },
      allocatedAttr: { vida: 6, ataque: 5, defesa: 3 },
    } as any
    delete snapshot.permanentLife
    useGame.setState({ campaigns: { legado: snapshot }, activeCampaignId: undefined } as any)
    useGame.getState().loadCampaign('legado')
    const loaded = useGame.getState()
    expect(loaded.balanceVersion).toBe(3)
    expect(loaded.gold).toBe(4321)
    expect(loaded.inventory).toEqual({ pocao_cura: 3 })
    expect(loaded.talents).toEqual(['precisao'])
    expect(loaded.subregionVictories).toEqual({ alvora_a: 4 })
    expect(loaded.attributePoints).toBe(1)
    expect(loaded.allocatedAttr).toEqual({ forca: 5, magia: 0, vigor: 9, destreza: 0 })
    expect(loaded.hp).toBeGreaterThan(0)
    expect(loaded.hp).toBeLessThanOrEqual(maxHp(loaded))
    expect(finiteEverywhere({ hp: loaded.hp, attr: loaded.attr })).toBe(true)
  })

  it('o persist (merge) migra o save gravado antes da mudança', () => {
    const options = (useGame as any).persist.getOptions()
    const persisted = v2Save('arcanista', { gold: 77, inventory: { pocao_cura: 1 } })
    const merged = options.merge(persisted, useGame.getState())
    expect(merged.balanceVersion).toBe(3)
    expect(merged.allocatedAttr.magia).toBe(3)
    expect(merged.gold).toBe(77)
    expect(merged.inventory).toEqual({ pocao_cura: 1 })
    expect(Number.isFinite(merged.hp)).toBe(true)
  })
})
