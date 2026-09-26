import { describe, expect, it } from 'vitest'
import {
  EQUIPMENT,
  EQUIPMENT_LEVELS,
  championStats,
  equipmentAffinity,
  equipmentAttackForHero,
  equipmentClassAllowed,
  equipmentRequiredLevel,
  equipmentBaseStats,
  equipmentInstanceBreakdown,
  equipmentScoreForHero,
  heroDodgeChance,
  maxHp,
  useGame,
  xpForLevel,
} from '../store/game'
import { ATTRIBUTE_RULES, HERO_STAT_PROFILES, heroStatProfile, primaryOffense } from './heroStatProfiles'
import {
  EQUIPMENT_ATTRIBUTE_RULES,
  ITEM_STAT_KEYS,
  affixAmount,
  convertLegacyEquipmentStats,
  formatItemStats,
  type EquipmentAttributeProfile,
} from './equipmentAttributes'
import type { Equipment } from '../types'

const state = () => useGame.getState()
const GEAR = EQUIPMENT.filter((e) => e.slot !== 'bolsa')
const ownersOf = (e: Equipment): string[] => (e.classeExclusiva ? [e.classeExclusiva].flat() : e.slot === 'mao_direita' && equipmentAffinity(e) ? [equipmentAffinity(e)!] : [])
const profile = (patch: Partial<EquipmentAttributeProfile> = {}): EquipmentAttributeProfile => ({ estilo: 'medio', escola: 'forca', afixos: [], nivel: 1, ...patch })

function fresh(heroId: string, patch: Record<string, unknown> = {}) {
  state().newGame(heroId as any)
  useGame.setState({ xp: xpForLevel(100), equipped: {}, equipmentBag: [], talents: [], specializations: {}, equipmentUpgrades: {}, equipmentGems: {}, craftedEffects: {}, pendingAttackBonus: 0, ...patch } as any)
}

describe('conversão do orçamento antigo nos atributos novos', () => {
  it('o ataque vai inteiro para a escola da peça e a Armadura fica inteira', () => {
    expect(convertLegacyEquipmentStats(profile({ escola: 'forca' }), { ataque: 7, defesa: 5 })).toMatchObject({ forca: 7, magia: 0, armadura: 5 })
    expect(convertLegacyEquipmentStats(profile({ escola: 'magia' }), { ataque: 7, defesa: 5 })).toMatchObject({ forca: 0, magia: 7, armadura: 5 })
  })

  it('a Vida total da peça nunca muda: parte vira Vigor (2 de Vida por ponto)', () => {
    for (const estilo of Object.keys(EQUIPMENT_ATTRIBUTE_RULES.estilos) as EquipmentAttributeProfile['estilo'][]) {
      for (let vida = 0; vida <= 12; vida++) {
        const out = convertLegacyEquipmentStats(profile({ estilo }), { vida })
        expect(out.vida + out.vigor * ATTRIBUTE_RULES.vigorVidaPorPonto, `${estilo} vida ${vida}`).toBe(vida)
        expect(out.vida).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('os afixos somam por cima e crescem com o nível, sempre pelo menos 1', () => {
    const low = convertLegacyEquipmentStats(profile({ afixos: ['destreza'], nivel: 17 }), { defesa: 4 })
    const high = convertLegacyEquipmentStats(profile({ afixos: ['destreza'], nivel: 100 }), { defesa: 4 })
    expect(low.armadura).toBe(4)
    expect(low.destreza).toBeGreaterThanOrEqual(1)
    expect(high.destreza).toBeGreaterThan(low.destreza)
    for (const stat of ['vigor', 'destreza', 'energia', 'esquiva'] as const) expect(affixAmount(stat, 1)).toBeGreaterThanOrEqual(1)
  })

  it('valores inválidos viram zero, nunca NaN nem negativos', () => {
    const out = convertLegacyEquipmentStats(profile(), { ataque: Number.NaN, defesa: -3, vida: undefined })
    for (const key of ITEM_STAT_KEYS) expect(Number.isFinite(out[key]) && out[key] >= 0, key).toBe(true)
  })
})

describe('catálogo convertido', () => {
  it('toda peça (menos bolsas) tem perfil; peça de classe tem a escola da classe e peça universal é adaptável', () => {
    for (const e of GEAR) {
      expect(e.perfilAtributos, e.id).toBeTruthy()
      const owners = ownersOf(e).filter((id) => HERO_STAT_PROFILES[id])
      const schools = new Set(owners.map((id) => primaryOffense(heroStatProfile(id))))
      expect(e.perfilAtributos!.escola, e.id).toBe(schools.size === 1 ? [...schools][0] : 'adaptavel')
    }
  })

  it('nenhuma classe perde ataque de equipamento: o melhor ataque útil por espaço e nível é o mesmo do modelo antigo', () => {
    // Guarda contra a regressão encontrada na simulação: com escola fixa nas peças universais, as classes mágicas perdiam
    // até 45% do ataque de equipamento no começo do jogo.
    const slots = ['mao_direita', 'mao_esquerda', 'peitoral', 'calcas', 'capacete', 'botas', 'amuleto', 'anel_1', 'anel_2'] as const
    for (const hero of Object.keys(HERO_STAT_PROFILES)) {
      const type = heroStatProfile(hero).ataqueBasico
      for (const level of EQUIPMENT_LEVELS) {
        for (const slot of slots) {
          const items = GEAR.filter((e) => e.slot === slot && equipmentClassAllowed(e, hero) && equipmentRequiredLevel(e) <= level)
          const legacy = Math.max(0, ...items.map((e) => equipmentAttackForHero(e, hero) + (e.statsByClass?.[hero]?.ataque ?? 0)))
          const useful = Math.max(0, ...items.map((e) => {
            const st = equipmentBaseStats(e, hero)
            return type === 'fisico' ? st.forca : type === 'magico' ? st.magia : Math.max(st.forca, st.magia)
          }))
          expect(useful, `${hero} ${slot} nível ${level}`).toBe(legacy)
        }
      }
    }
  })

  it('comum e incomum não ganham afixos; raro 1, épico 2, lendário 3', () => {
    for (const e of GEAR) expect(e.perfilAtributos!.afixos.length, e.id).toBe(EQUIPMENT_ATTRIBUTE_RULES.afixosPorRaridade[e.raridade ?? 'comum'])
  })

  it('nenhuma peça perde Armadura nem ataque na conversão, e a Vida total é a mesma', () => {
    for (const e of GEAR) {
      const hero = ownersOf(e)[0]
      const delta = e.statsByClass?.[hero ?? ''] ?? {}
      const st = equipmentBaseStats(e, hero)
      expect(st.armadura, e.id).toBe(e.defesa + (delta.defesa ?? 0))
      expect(st.forca + st.magia, e.id).toBe(e.ataque + (delta.ataque ?? 0))
      const vigorAffix = e.perfilAtributos!.afixos.filter((a) => a === 'vigor').reduce((sum) => sum + affixAmount('vigor', e.perfilAtributos!.nivel), 0)
      expect(st.vida + (st.vigor - vigorAffix) * ATTRIBUTE_RULES.vigorVidaPorPonto, e.id).toBe(e.vida + (delta.vida ?? 0))
    }
  })

  it('os afixos ficam pequenos: no máximo +3 de Energia, +4% de Esquiva e +6 de Vigor por peça', () => {
    for (const e of GEAR) {
      const st = equipmentBaseStats(e, ownersOf(e)[0])
      expect(st.energia, e.id).toBeLessThanOrEqual(3)
      expect(st.esquiva, e.id).toBeLessThanOrEqual(4)
      expect(st.vigor, e.id).toBeLessThanOrEqual(8)
    }
  })

  it('peça universal adaptável: o mesmo anel dá Força ao Guerreiro, Magia à Arcanista e os dois ao Monge', () => {
    const ring = GEAR.find((e) => e.slot === 'anel_1' && !e.classeExclusiva && e.ataque >= 2)!
    expect(ring.perfilAtributos!.escola).toBe('adaptavel')
    expect(equipmentBaseStats(ring, 'guerreiro')).toMatchObject({ forca: ring.ataque, magia: 0 })
    expect(equipmentBaseStats(ring, 'arcanista')).toMatchObject({ forca: 0, magia: ring.ataque })
    expect(equipmentBaseStats(ring, 'monge')).toMatchObject({ forca: ring.ataque, magia: ring.ataque })
  })

  it('o estilo da peça dá afixos coerentes: facas e arcos trazem Destreza/Esquiva, peças pesadas trazem Vigor', () => {
    const agile = GEAR.filter((e) => (e.perfilAtributos!.estilo === 'furtivo' || e.perfilAtributos!.estilo === 'cacador') && e.perfilAtributos!.afixos.length >= 2)
    expect(agile.length).toBeGreaterThan(5)
    for (const e of agile) expect(e.perfilAtributos!.afixos.some((a) => a === 'destreza' || a === 'esquiva'), e.id).toBe(true)
    const heavy = GEAR.filter((e) => e.perfilAtributos!.estilo === 'pesado' && e.perfilAtributos!.afixos.length >= 1)
    for (const e of heavy) expect(e.perfilAtributos!.afixos, e.id).toContain('vigor')
  })

  it('a conversão é estável: o mesmo item dá sempre os mesmos atributos', () => {
    for (const e of GEAR.slice(0, 80)) expect(equipmentBaseStats(e, 'guerreiro')).toEqual(equipmentBaseStats(e, 'guerreiro'))
  })
})

describe('equipamento no Campeão', () => {
  it('uma espada de Guerreiro num Mago dá Força (não vira Magia) e não aumenta o ataque dele', () => {
    const sword = GEAR.find((e) => e.slot === 'mao_direita' && !e.classeExclusiva && equipmentAffinity(e) === 'guerreiro' && e.ataque >= 2)!
    fresh('arcanista')
    const before = championStats(state())
    useGame.setState({ equipped: { mao_direita: `${sword.id}@@t` } } as any)
    const after = championStats(state())
    expect(after.linhas.forca.bonus - before.linhas.forca.bonus).toBe(sword.ataque - 1) // −1 da afinidade de outra classe
    expect(after.linhas.magia.bonus).toBe(before.linhas.magia.bonus)
    expect(after.poderBasico).toBe(before.poderBasico)
  })

  it('Vigor, Destreza, Energia e Esquiva dos itens chegam na ficha (Vida, esquiva e Energia máxima)', () => {
    const boots = GEAR.find((e) => e.slot === 'botas' && ownersOf(e).includes('cacadora') && equipmentBaseStats(e, 'cacadora').esquiva > 0) ?? GEAR.find((e) => equipmentBaseStats(e, 'cacadora').esquiva > 0 && (!e.classeExclusiva || ownersOf(e).includes('cacadora')))!
    fresh('cacadora')
    const dodgeBefore = heroDodgeChance(state())
    const lifeBefore = maxHp(state())
    const energyBefore = championStats(state()).energiaMaxima
    useGame.setState({ equipped: { [boots.slot]: `${boots.id}@@t` } } as any)
    const st = equipmentBaseStats(boots, 'cacadora')
    expect(heroDodgeChance(state())).toBeGreaterThan(dodgeBefore)
    expect(heroDodgeChance(state())).toBeLessThanOrEqual(ATTRIBUTE_RULES.esquiva.tetoTotal)
    expect(maxHp(state()) - lifeBefore).toBe(st.vida + st.vigor * ATTRIBUTE_RULES.vigorVidaPorPonto)
    expect(championStats(state()).energiaMaxima - energyBefore).toBe(st.energia)
  })

  it('a esquiva dos itens respeita o teto total, somada à passiva e à Destreza', () => {
    fresh('cacadora', { attr: { forca: 0, magia: 0, vigor: 0, destreza: 10_000 } })
    const dodgy = GEAR.filter((e) => equipmentBaseStats(e, 'cacadora').esquiva > 0 && (!e.classeExclusiva || ownersOf(e).includes('cacadora')))
    const equipped: Record<string, string> = {}
    for (const e of dodgy) if (!equipped[e.slot]) equipped[e.slot] = `${e.id}@@t`
    useGame.setState({ equipped } as any)
    expect(heroDodgeChance(state())).toBeCloseTo(ATTRIBUTE_RULES.esquiva.tetoTotal)
  })

  it('aprimoramento soma na escola da peça e a pedra de ataque vale para o ataque de quem veste', () => {
    const staff = GEAR.find((e) => e.slot === 'mao_direita' && e.perfilAtributos!.escola === 'magia' && e.ataque > 0 && !e.classeExclusiva && equipmentAffinity(e) === 'arcanista')!
    const ref = `${staff.id}@@t`
    fresh('guerreiro', { equipped: { mao_direita: ref }, equipmentUpgrades: { [ref]: 2 }, equipmentGems: { [ref]: ['rubi_forja'] } })
    const b = equipmentInstanceBreakdown(staff, ref, state())
    expect(b.upgrade.magia).toBe(2) // o cajado continua sendo de Magia
    expect(b.gems.forca).toBe(2) // a pedra vira Força num Guerreiro
    expect(b.total.forca).toBe(b.base.forca + 2)
  })

  it('o Índice de comparação valoriza a escola certa para cada classe e conta a peça adaptável uma vez só no Monge', () => {
    const sword = GEAR.find((e) => e.slot === 'mao_direita' && !e.classeExclusiva && equipmentAffinity(e) === 'guerreiro' && e.ataque >= 3)!
    const staff = GEAR.find((e) => e.slot === 'mao_direita' && !e.classeExclusiva && equipmentAffinity(e) === 'arcanista' && e.ataque >= 3)!
    expect(equipmentScoreForHero(sword, 'guerreiro')).toBeGreaterThan(equipmentScoreForHero(sword, 'arcanista'))
    expect(equipmentScoreForHero(staff, 'arcanista')).toBeGreaterThan(equipmentScoreForHero(staff, 'guerreiro'))
    const ring = GEAR.find((e) => e.slot === 'anel_1' && !e.classeExclusiva && e.ataque >= 2 && !e.defesa && !e.vida)
    if (ring) expect(equipmentScoreForHero(ring, 'monge')).toBeCloseTo(equipmentScoreForHero(ring, 'guerreiro'))
  })

  it('texto dos atributos: só o que não é zero, com sinal e % na Esquiva', () => {
    expect(formatItemStats({ forca: 5, magia: 0, vigor: 0, destreza: 3, armadura: 0, vida: 0, energia: 0, esquiva: 2 })).toBe('Força +5 • Destreza +3 • Esquiva +2%')
    expect(formatItemStats({ forca: 0, magia: 0, vigor: 0, destreza: 0, armadura: 0, vida: 0, energia: 0, esquiva: 0 })).toBe('Sem atributos')
  })
})
