import { describe, expect, it } from 'vitest'
import herois from '../data/herois.json'
import { ATTRIBUTE_RULES, HERO_STAT_PROFILES, PRIMARY_ATTRIBUTES, heroStatProfile, offensiveTargets, primaryOffense, type PrimaryAttributeKey } from '../data/heroStatProfiles'
import {
  ARMOR_MITIGATION_LIMIT,
  abilityPotency,
  armorMitigation,
  basicAttackPower,
  attackEnergyGain,
  canSpendEnergy,
  clampEnergy,
  gainEnergy,
  classAttributeAtLevel,
  computeChampionStats,
  dodgeFromDexterity,
  effectResistance,
  elementalResistance,
  initiativeBonus,
  magicPower,
  maxEnergy,
  maxLife,
  mergeBonuses,
  physicalPower,
  sanitizeAttributes,
  spendEnergy,
  totalDodge,
} from './heroStats'

const HERO_IDS = Object.keys(HERO_STAT_PROFILES)
const compute = (heroId: string, extra: Partial<Parameters<typeof computeChampionStats>[0]> = {}) => computeChampionStats({ profile: heroStatProfile(heroId), level: 1, points: {}, ...extra })

describe('Vida Máxima e Vigor', () => {
  it('Vida Máxima = base da classe + Vigor × coeficiente + bônus planos', () => {
    const profile = heroStatProfile('guerreiro')
    expect(maxLife(profile, 0)).toBe(profile.vidaBase)
    expect(maxLife(profile, 6)).toBe(profile.vidaBase + 6 * ATTRIBUTE_RULES.vigorVidaPorPonto)
    expect(maxLife(profile, 6, 10)).toBe(profile.vidaBase + 6 * ATTRIBUTE_RULES.vigorVidaPorPonto + 10)
  })

  it('Vigor não é só "Vida renomeada": também dá resistência a elementos e a efeitos', () => {
    expect(elementalResistance(0)).toBe(0)
    expect(effectResistance(0)).toBe(0)
    expect(elementalResistance(20)).toBeGreaterThan(elementalResistance(10))
    expect(effectResistance(20)).toBeGreaterThan(effectResistance(10))
    const low = compute('guerreiro', { points: { vigor: 0 } })
    const high = compute('guerreiro', { points: { vigor: 30 } })
    expect(high.vidaMaxima).toBeGreaterThan(low.vidaMaxima)
    expect(high.resistenciaElemental).toBeGreaterThan(low.resistenciaElemental)
    expect(high.resistenciaEfeitos).toBeGreaterThan(low.resistenciaEfeitos)
  })

  it('resistências têm retorno decrescente e teto', () => {
    const gainLow = elementalResistance(10) - elementalResistance(0)
    const gainHigh = elementalResistance(110) - elementalResistance(100)
    expect(gainHigh).toBeLessThan(gainLow)
    expect(elementalResistance(1_000_000)).toBeLessThanOrEqual(0.75)
    expect(effectResistance(1_000_000)).toBeLessThan(ATTRIBUTE_RULES.resistenciaEfeitos.teto + 1e-9)
  })

  it('a Vida Máxima nunca é menor que 1', () => {
    expect(maxLife({ ...heroStatProfile('guerreiro'), vidaBase: 0 }, 0, -50)).toBe(1)
  })
})

describe('Poder físico e mágico', () => {
  it('Força alimenta o ataque físico e Magia o mágico', () => {
    expect(basicAttackPower('fisico', 7, 100)).toBe(physicalPower(7))
    expect(basicAttackPower('magico', 100, 7)).toBe(magicPower(7))
  })

  it('classe física ignora Magia e classe mágica ignora Força no ataque básico', () => {
    const warriorBase = compute('guerreiro').poderBasico
    expect(compute('guerreiro', { points: { magia: 40 } }).poderBasico).toBe(warriorBase)
    expect(compute('guerreiro', { points: { forca: 5 } }).poderBasico).toBe(warriorBase + 5)
    const mageBase = compute('arcanista').poderBasico
    expect(compute('arcanista', { points: { forca: 40 } }).poderBasico).toBe(mageBase)
    expect(compute('arcanista', { points: { magia: 5 } }).poderBasico).toBe(mageBase + 5)
  })

  it('híbrido usa o maior entre Força e Magia, então cada ponto no atributo líder vale 1 como nas outras classes', () => {
    expect(basicAttackPower('hibrido', 5, 3)).toBe(5)
    expect(basicAttackPower('hibrido', 3, 6)).toBe(6)
    expect(basicAttackPower('hibrido', 0, 0)).toBe(0)
    expect(basicAttackPower('hibrido', 6, 3) - basicAttackPower('hibrido', 5, 3)).toBe(1)
    // o equipamento soma nos dois atributos: o ganho é integral, não dobrado nem pela metade
    expect(basicAttackPower('hibrido', 5 + 2, 3 + 2) - basicAttackPower('hibrido', 5, 3)).toBe(2)
  })

  it('valores inválidos não geram NaN', () => {
    expect(basicAttackPower('fisico', Number.NaN, 0)).toBe(0)
    expect(basicAttackPower('magico', 0, Number.POSITIVE_INFINITY)).toBe(0)
    expect(basicAttackPower('hibrido', Number.NaN, Number.NaN)).toBe(0)
  })
})

describe('Armadura', () => {
  it('sem Armadura não há mitigação', () => {
    expect(armorMitigation(0)).toBe(0)
    expect(armorMitigation(-5)).toBe(0)
  })

  it('cresce sempre, mas com retorno decrescente', () => {
    let previous = 0
    let previousGain = Number.POSITIVE_INFINITY
    for (const armor of [1, 2, 4, 8, 16, 32, 64, 128]) {
      const value = armorMitigation(armor)
      expect(value).toBeGreaterThan(previous)
      const gain = (value - previous) / (armor - (armor === 1 ? 0 : armor / 2))
      expect(gain).toBeLessThan(previousGain + 1e-9)
      previous = value
      previousGain = gain
    }
    // cada ponto adicional vale menos que o anterior
    expect(armorMitigation(11) - armorMitigation(10)).toBeLessThan(armorMitigation(2) - armorMitigation(1))
  })

  it('nunca torna o herói invulnerável: a mitigação fica abaixo de um teto finito', () => {
    expect(armorMitigation(1_000_000)).toBeLessThan(ARMOR_MITIGATION_LIMIT + 1e-6)
    expect(ARMOR_MITIGATION_LIMIT).toBe(ATTRIBUTE_RULES.armadura.inclinacao * ATTRIBUTE_RULES.armadura.joelho)
  })

  it('vem exclusivamente de bônus de equipamento: atributos não dão Armadura', () => {
    const naked = compute('guardiao', { points: { vigor: 50, forca: 50, magia: 50, destreza: 50 } })
    expect(naked.armadura).toBe(0)
    expect(naked.mitigacao).toBe(0)
    const geared = compute('guardiao', { bonus: { armadura: 12 } })
    expect(geared.armadura).toBe(12)
    expect(geared.mitigacao).toBeCloseTo(armorMitigation(12))
  })

  it('a Armadura fica separada do escudo: escudo não entra nos valores de Campeão', () => {
    const stats = compute('guerreiro', { bonus: { armadura: 5 } })
    expect(Object.keys(stats)).not.toContain('escudo')
    expect(stats.linhas.armadura).toEqual({ valor: 0, bonus: 5, total: 5 })
  })
})

describe('Esquiva, iniciativa e Destreza', () => {
  it('a esquiva total respeita o teto configurável', () => {
    const cap = ATTRIBUTE_RULES.esquiva.tetoTotal
    expect(totalDodge(1_000_000, 0.2, 0.05)).toBeCloseTo(cap)
    expect(totalDodge(1_000_000, 5, 5)).toBeLessThanOrEqual(cap)
    expect(totalDodge(0, 0, 0)).toBe(0)
  })

  it('a esquiva vinda da Destreza tem retorno decrescente e teto próprio', () => {
    expect(dodgeFromDexterity(20) - dodgeFromDexterity(10)).toBeLessThan(dodgeFromDexterity(10) - dodgeFromDexterity(0))
    expect(dodgeFromDexterity(1_000_000)).toBeLessThanOrEqual(ATTRIBUTE_RULES.esquiva.tetoDestreza)
  })

  it('Caçadora e Caçador têm esquiva passiva, mas também respeitam o teto com Destreza alta', () => {
    for (const id of ['cacadora', 'cacador']) {
      const low = compute(id)
      const high = compute(id, { points: { destreza: 500 } })
      expect(low.esquiva).toBeGreaterThanOrEqual(heroStatProfile(id).esquivaPassiva)
      expect(high.esquiva).toBeLessThanOrEqual(ATTRIBUTE_RULES.esquiva.tetoTotal)
    }
  })

  it('a iniciativa cresce com Destreza e tem teto', () => {
    expect(initiativeBonus(10)).toBeGreaterThan(initiativeBonus(0))
    expect(initiativeBonus(1_000_000)).toBe(ATTRIBUTE_RULES.iniciativa.teto)
  })
})

describe('Energia', () => {
  const max = 10

  it('não regenera sozinha: só as fontes configuradas somam', () => {
    // não existe mais regeneração por rodada; o que sobe a Energia é atacar, crítico e descansar
    expect(Object.keys(ATTRIBUTE_RULES.energia).sort()).toEqual(['custoFervor', 'ganhoAtaque', 'ganhoCritico', 'ganhoDescansoPorTick'])
  })

  it('o ataque normal dá Energia e o crítico dá mais', () => {
    expect(attackEnergyGain(false)).toBe(ATTRIBUTE_RULES.energia.ganhoAtaque)
    expect(attackEnergyGain(true)).toBe(ATTRIBUTE_RULES.energia.ganhoCritico)
    expect(attackEnergyGain(true)).toBeGreaterThan(attackEnergyGain(false))
    expect(attackEnergyGain(false)).toBeGreaterThan(0)
  })

  it('ganhar soma sem passar do máximo, e valores negativos ou inválidos não tiram nada', () => {
    expect(gainEnergy(4, max, 2)).toBe(6)
    expect(gainEnergy(9, max, 5)).toBe(max)
    expect(gainEnergy(4, max, -3)).toBe(4)
    expect(gainEnergy(4, max, Number.NaN)).toBe(4)
    expect(gainEnergy(Number.NaN, max, 2)).toBe(2)
  })

  it('gastar reduz a Energia e nada é gasto quando falta', () => {
    const spent = spendEnergy(10, max, 5)
    expect(spent).toEqual({ ok: true, energy: 5 })
    const blocked = spendEnergy(3, max, 5)
    expect(blocked).toEqual({ ok: false, energy: 3 })
    expect(spendEnergy(5, max, 5)).toEqual({ ok: true, energy: 0 }) // custo exato é possível
  })

  it('nunca fica negativa nem passa do máximo', () => {
    expect(clampEnergy(-20, max)).toBe(0)
    expect(clampEnergy(99, max)).toBe(max)
    expect(clampEnergy(Number.NaN, max)).toBe(0)
    expect(spendEnergy(-4, max, 1).ok).toBe(false)
    expect(spendEnergy(999, max, 1).energy).toBe(max - 1)
  })

  it('a habilidade fica bloqueada sem Energia suficiente', () => {
    expect(canSpendEnergy(3, 5)).toBe(false)
    expect(canSpendEnergy(5, 5)).toBe(true)
  })

  it('o custo do Fervor e das habilidades cabe na Energia máxima da classe', () => {
    expect(ATTRIBUTE_RULES.energia.custoFervor).toBeGreaterThan(0)
    for (const id of HERO_IDS) {
      const profile = heroStatProfile(id)
      expect(profile.energiaBase, id).toBeGreaterThanOrEqual(profile.habilidade.custoEnergia * 2) // dá para juntar duas habilidades
      expect(profile.energiaBase, id).toBeGreaterThanOrEqual(ATTRIBUTE_RULES.energia.custoFervor)
    }
  })

  it('a Energia máxima cresce com o nível e com bônus, e nunca é negativa', () => {
    const profile = heroStatProfile('arcanista')
    expect(maxEnergy(profile, 1)).toBe(profile.energiaBase)
    expect(maxEnergy(profile, 60)).toBeGreaterThan(maxEnergy(profile, 1))
    expect(maxEnergy(profile, 1, 5)).toBe(profile.energiaBase + 5)
    expect(maxEnergy(profile, 1, -1000)).toBe(0)
  })

})

describe('Potência da habilidade', () => {
  it('vale 1 no valor inicial e cresce só com o atributo de escala, com teto', () => {
    const profile = heroStatProfile('druida')
    const base = profile.base[profile.habilidade.atributoEscala]
    expect(abilityPotency(profile, base)).toBe(1)
    expect(abilityPotency(profile, base - 3)).toBe(1)
    expect(abilityPotency(profile, base + 10)).toBeGreaterThan(1)
    expect(abilityPotency(profile, base + 1_000_000)).toBe(ATTRIBUTE_RULES.potenciaHabilidade.teto)
  })
})

describe('as nove classes', () => {
  it('todas têm perfil completo e coerente', () => {
    expect(HERO_IDS).toHaveLength(9)
    for (const id of HERO_IDS) {
      const p = HERO_STAT_PROFILES[id]
      expect(p.id).toBe(id)
      for (const key of PRIMARY_ATTRIBUTES) {
        expect(Number.isFinite(p.base[key])).toBe(true)
        expect(p.base[key]).toBeGreaterThanOrEqual(0)
        expect(p.crescimento[key]).toBeGreaterThanOrEqual(0)
      }
      expect(p.vidaBase).toBeGreaterThan(0)
      expect(['fisico', 'magico', 'hibrido']).toContain(p.ataqueBasico)
      expect(['fisica', 'magica', 'hibrida', 'utilidade']).toContain(p.habilidade.escala)
      expect(p.habilidade.tags).toHaveLength(3)
      expect(['Linha de frente', 'Dano', 'Suporte', 'Invocador']).toContain(p.funcao)
    }
  })

  it('a Vida inicial de cada classe é a mesma de antes da mudança (poder no início parecido com o atual)', () => {
    for (const hero of herois as Array<{ id: string; vida: number; ataque: number }>) {
      const stats = compute(hero.id)
      expect(stats.vidaMaxima, `${hero.id}: Vida`).toBe(hero.vida)
      expect(stats.poderBasico, `${hero.id}: poder do ataque básico`).toBe(hero.ataque)
    }
  })

  it('o ataque básico de cada classe usa o atributo ofensivo esperado', () => {
    const physical = ['guerreiro', 'guardiao', 'cacadora', 'cacador']
    const magical = ['arcanista', 'druida', 'sacerdotisa', 'conjurador']
    for (const id of physical) {
      expect(heroStatProfile(id).ataqueBasico).toBe('fisico')
      expect(primaryOffense(heroStatProfile(id))).toBe('forca')
    }
    for (const id of magical) {
      expect(heroStatProfile(id).ataqueBasico).toBe('magico')
      expect(primaryOffense(heroStatProfile(id))).toBe('magia')
    }
    expect(heroStatProfile('monge').ataqueBasico).toBe('hibrido')
    expect(offensiveTargets('hibrido')).toEqual(['forca', 'magia'])
  })

  const attr = (id: string, key: PrimaryAttributeKey) => HERO_STAT_PROFILES[id].base[key]
  const best = (key: PrimaryAttributeKey) => Math.max(...HERO_IDS.map((id) => attr(id, key)))

  it('a distribuição segue o papel de cada classe', () => {
    // Guerreiro: Força + Vigor altos
    expect(attr('guerreiro', 'vigor')).toBeGreaterThanOrEqual(attr('guerreiro', 'destreza') + 2)
    expect(attr('guerreiro', 'forca')).toBeGreaterThan(attr('guerreiro', 'magia'))
    // Guardião: maior Vigor, Força média, Destreza baixa
    expect(attr('guardiao', 'vigor')).toBe(best('vigor'))
    expect(attr('guardiao', 'forca')).toBeGreaterThan(attr('guardiao', 'magia'))
    expect(attr('guardiao', 'destreza')).toBeLessThanOrEqual(attr('guerreiro', 'destreza'))
    // Caçadora e Caçador: Destreza + Força
    for (const id of ['cacadora', 'cacador']) {
      expect(attr(id, 'destreza')).toBe(best('destreza'))
      expect(attr(id, 'forca')).toBe(best('forca'))
    }
    // Arcanista: Magia alta, Vigor baixo
    expect(attr('arcanista', 'magia')).toBe(best('magia'))
    expect(attr('arcanista', 'vigor')).toBeLessThanOrEqual(3)
    // Druida: Magia e Vigor equilibrados
    expect(Math.abs(attr('druida', 'magia') - attr('druida', 'vigor'))).toBeLessThanOrEqual(1)
    // Monge: Força, Vigor e Destreza equilibrados
    const monk = [attr('monge', 'forca'), attr('monge', 'vigor'), attr('monge', 'destreza')]
    expect(Math.max(...monk) - Math.min(...monk)).toBeLessThanOrEqual(1)
    // Sacerdotisa: Magia + Vigor
    expect(attr('sacerdotisa', 'magia') + attr('sacerdotisa', 'vigor')).toBeGreaterThan(attr('sacerdotisa', 'forca') + attr('sacerdotisa', 'destreza'))
    // Conjurador: Magia alta, Vigor médio
    expect(attr('conjurador', 'magia')).toBeGreaterThan(attr('conjurador', 'forca'))
    expect(attr('conjurador', 'vigor')).toBeGreaterThanOrEqual(3)
  })

  it('cada classe cresce coerente com seu papel ao subir de nível', () => {
    for (const id of HERO_IDS) {
      const p = heroStatProfile(id)
      const main = primaryOffense(p)
      expect(classAttributeAtLevel(p, main, 60)).toBeGreaterThanOrEqual(classAttributeAtLevel(p, main, 1))
      expect(compute(id, { level: 60 }).vidaMaxima).toBeGreaterThanOrEqual(compute(id, { level: 1 }).vidaMaxima)
      expect(compute(id, { level: 60 }).poder).toBeGreaterThanOrEqual(compute(id, { level: 1 }).poder)
    }
  })

  it('valores do nível 1 sem bônus: sem NaN em nenhum campo', () => {
    for (const id of HERO_IDS) {
      const stats = compute(id)
      for (const [key, value] of Object.entries(stats)) {
        if (typeof value === 'number') expect(Number.isFinite(value), `${id}.${key}`).toBe(true)
      }
      expect(stats.armadura).toBe(0)
      expect(stats.poder).toBeGreaterThan(0)
    }
  })

  it('perfil desconhecido cai no perfil padrão em vez de quebrar', () => {
    expect(heroStatProfile('inexistente').id).toBe('guerreiro')
    expect(heroStatProfile(undefined).id).toBe('guerreiro')
  })
})

describe('bônus de fontes externas (equipamento, gemas, talentos, especializações)', () => {
  it('somam separados do valor da classe: valor + bônus = total', () => {
    const stats = compute('guerreiro', { points: { forca: 2 }, bonus: { forca: 3, vigor: 1, destreza: 2, vidaMaxima: 7, armadura: 4, energia: 2 } })
    expect(stats.linhas.forca).toEqual({ valor: 5, bonus: 3, total: 8 })
    expect(stats.linhas.vigor.bonus).toBe(1)
    expect(stats.linhas.destreza.bonus).toBe(2)
    expect(stats.vidaMaxima).toBe(maxLife(heroStatProfile('guerreiro'), 7, 7))
    expect(stats.linhas.vidaMaxima.bonus).toBe(stats.vidaMaxima - stats.linhas.vidaMaxima.valor)
    expect(stats.energiaMaxima).toBe(heroStatProfile('guerreiro').energiaBase + 2)
    expect(stats.armadura).toBe(4)
  })

  it('mergeBonuses soma várias fontes e ignora as ausentes', () => {
    const merged = mergeBonuses({ forca: 1, armadura: 2 }, undefined, { forca: 2, vidaMaxima: 5, resistencias: { fogo: 0.1 } }, { resistencias: { fogo: 0.05, gelo: 0.2 } })
    expect(merged.forca).toBe(3)
    expect(merged.armadura).toBe(2)
    expect(merged.vidaMaxima).toBe(5)
    expect(merged.resistencias?.fogo).toBeCloseTo(0.15)
    expect(merged.resistencias?.gelo).toBeCloseTo(0.2)
  })

  it('resistência elemental de equipamento soma ao Vigor, mas o total nunca passa de 75%', () => {
    const stats = compute('guerreiro', { bonus: { resistencias: { fogo: 0.9 } } })
    expect(stats.resistencias.fogo).toBe(0.75)
    expect(stats.resistencias.fisico).toBe(0)
  })

  it('valores absurdos ou inválidos nos bônus não geram NaN', () => {
    const stats = compute('guerreiro', { bonus: { forca: Number.NaN, armadura: Number.POSITIVE_INFINITY, vidaMaxima: undefined } as any, permanentLife: Number.NaN })
    for (const value of Object.values(stats)) if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true)
  })

  it('Vida permanente (poções, migração) soma sem depender de Vigor', () => {
    const base = compute('guerreiro')
    expect(compute('guerreiro', { permanentLife: 12 }).vidaMaxima).toBe(base.vidaMaxima + 12)
  })

  it('sanitizeAttributes descarta negativos, decimais e lixo', () => {
    expect(sanitizeAttributes({ forca: -3, magia: 2.6, vigor: Number.NaN, destreza: undefined })).toEqual({ forca: 0, magia: 3, vigor: 0, destreza: 0 })
    expect(sanitizeAttributes(null)).toEqual({ forca: 0, magia: 0, vigor: 0, destreza: 0 })
  })
})

describe('Poder total', () => {
  it('sobe quando qualquer componente melhora', () => {
    const base = compute('guerreiro').poder
    expect(compute('guerreiro', { points: { forca: 3 } }).poder).toBeGreaterThan(base)
    expect(compute('guerreiro', { points: { vigor: 3 } }).poder).toBeGreaterThan(base)
    expect(compute('guerreiro', { points: { destreza: 3 } }).poder).toBeGreaterThan(base)
    expect(compute('guerreiro', { bonus: { armadura: 6 } }).poder).toBeGreaterThan(base)
  })
})
