// Fórmulas puras dos atributos do Campeão. Sem estado, sem React, sem imports do jogo: tudo é função de
// (perfil da classe, nível, pontos, bônus). game.ts, o coop, a carta e a ficha chamam ESTAS funções, então o
// que a tela mostra é exatamente o que o combate calcula. Os números moram em data/heroStatProfiles.ts.

import {
  ATTRIBUTE_RULES,
  NO_ATTRIBUTES,
  PRIMARY_ATTRIBUTES,
  type BasicAttackType,
  type HeroStatProfile,
  type PrimaryAttributeKey,
  type PrimaryAttributes,
} from '../data/heroStatProfiles'

export type ElementKey = 'fisico' | 'fogo' | 'gelo' | 'natureza' | 'sombra' | 'luz' | 'arcano'
export const ELEMENT_KEYS: readonly ElementKey[] = ['fisico', 'fogo', 'gelo', 'natureza', 'sombra', 'luz', 'arcano']

/** Tudo que soma nos atributos além da classe e dos pontos: equipamento, gemas, talentos, especializações... */
export interface StatBonuses extends Partial<PrimaryAttributes> {
  vidaMaxima?: number
  energia?: number
  /** Só de equipamentos, gemas e efeitos de equipamento. */
  armadura?: number
  /** Resistência extra (0–1) por elemento, vinda de equipamento. */
  resistencias?: Partial<Record<ElementKey, number>>
}

export interface ChampionComputedStats {
  forca: number
  magia: number
  vigor: number
  destreza: number
  vidaMaxima: number
  energiaMaxima: number
  armadura: number
  /** Chance de esquiva (0–1), já com o teto. */
  esquiva: number
  /** Resistência (0–1) por elemento; físico fica em 0 (o físico é coberto pela Armadura). */
  resistencias: Record<string, number>
  poder: number
}

export interface StatLine {
  /** Valor da classe: base + crescimento por nível + pontos distribuídos. */
  valor: number
  /** Bônus de equipamento, talentos, especializações e afins. */
  bonus: number
  total: number
}

export interface ChampionStatBreakdown extends ChampionComputedStats {
  linhas: Record<PrimaryAttributeKey | 'vidaMaxima' | 'energiaMaxima' | 'armadura', StatLine>
  poderFisico: number
  poderMagico: number
  /** Poder do ataque básico da classe (usado no dano do ataque comum). */
  poderBasico: number
  /** Mitigação de dano físico da Armadura, em pontos planos (mesma régua da antiga Defesa). */
  mitigacao: number
  resistenciaElemental: number
  resistenciaEfeitos: number
  iniciativa: number
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const finite = (value: unknown, fallback = 0) => (typeof value === 'number' && Number.isFinite(value) ? value : fallback)
const whole = (value: unknown) => Math.max(0, Math.round(finite(value)))

/** Curva com retorno decrescente: cresce quase linear no começo e nunca passa de `teto`. */
export function saturating(value: number, teto: number, meio: number): number {
  const v = Math.max(0, finite(value))
  return meio <= 0 ? teto : (teto * v) / (v + meio)
}

// ---------------------------------------------------------------------------------------------
// Atributos
// ---------------------------------------------------------------------------------------------

/** Valor da classe no nível dado (sem pontos nem bônus). */
export function classAttributeAtLevel(profile: HeroStatProfile, key: PrimaryAttributeKey, level: number): number {
  const lvl = Math.max(1, Math.floor(finite(level, 1)))
  return profile.base[key] + Math.floor((lvl - 1) * profile.crescimento[key] + 1e-9)
}

export function sanitizeAttributes(source: Partial<PrimaryAttributes> | undefined | null): PrimaryAttributes {
  return {
    forca: whole(source?.forca),
    magia: whole(source?.magia),
    vigor: whole(source?.vigor),
    destreza: whole(source?.destreza),
  }
}

// ---------------------------------------------------------------------------------------------
// Poder de ataque
// ---------------------------------------------------------------------------------------------
export const physicalPower = (forca: number): number => Math.max(0, finite(forca)) * ATTRIBUTE_RULES.poderPorPonto
export const magicPower = (magia: number): number => Math.max(0, finite(magia)) * ATTRIBUTE_RULES.poderPorPonto

/**
 * Poder do ataque básico: Força (físico), Magia (mágico) ou o MAIOR dos dois (híbrido). O maior, e não a média: com a média
 * cada ponto valeria só 0,5 e o híbrido escalaria pela metade das outras classes; com o maior, cada ponto no atributo líder
 * vale 1 como para todos, e o equipamento (que soma nos dois) vale inteiro.
 */
export function basicAttackPower(type: BasicAttackType, forca: number, magia: number): number {
  if (type === 'fisico') return physicalPower(forca)
  if (type === 'magico') return magicPower(magia)
  return Math.max(physicalPower(forca), magicPower(magia))
}

// ---------------------------------------------------------------------------------------------
// Vida, Energia, Armadura, esquiva e resistências
// ---------------------------------------------------------------------------------------------
export function maxLife(profile: HeroStatProfile, vigor: number, flatBonus = 0): number {
  return Math.max(1, Math.round(profile.vidaBase + Math.max(0, finite(vigor)) * ATTRIBUTE_RULES.vigorVidaPorPonto + finite(flatBonus)))
}

export function maxEnergy(profile: HeroStatProfile, level: number, bonus = 0): number {
  const lvl = Math.max(1, Math.floor(finite(level, 1)))
  return Math.max(0, Math.floor(profile.energiaBase + (lvl - 1) * profile.energiaCrescimento + 1e-9) + Math.floor(finite(bonus)))
}

/** Mitigação de dano físico da Armadura, em pontos planos. Crescente, côncava e limitada (nunca invulnerável). */
export function armorMitigation(armor: number): number {
  const a = Math.max(0, finite(armor))
  const { inclinacao, joelho } = ATTRIBUTE_RULES.armadura
  return (inclinacao * a) / (1 + a / joelho)
}

/** Teto da mitigação: nenhuma Armadura passa disso. */
export const ARMOR_MITIGATION_LIMIT = ATTRIBUTE_RULES.armadura.inclinacao * ATTRIBUTE_RULES.armadura.joelho

/** Esquiva vinda só da Destreza (0–tetoDestreza). */
export function dodgeFromDexterity(destreza: number): number {
  const { tetoDestreza, meio } = ATTRIBUTE_RULES.esquiva
  return saturating(destreza, tetoDestreza, meio)
}

/** Esquiva total: Destreza + passiva da classe + esquiva forjada, sempre dentro do teto configurado. */
export function totalDodge(destreza: number, passive = 0, forged = 0): number {
  const sum = dodgeFromDexterity(destreza) + Math.max(0, finite(passive)) + Math.max(0, finite(forged))
  return clamp(sum, 0, ATTRIBUTE_RULES.esquiva.tetoTotal)
}

export function elementalResistance(vigor: number, extra = 0): number {
  const { teto, meio } = ATTRIBUTE_RULES.resistenciaElemental
  return clamp(saturating(vigor, teto, meio) + Math.max(0, finite(extra)), 0, 0.75)
}

export function effectResistance(vigor: number): number {
  const { teto, meio } = ATTRIBUTE_RULES.resistenciaEfeitos
  return saturating(vigor, teto, meio)
}

/** Bônus (0–teto) de chance de agir primeiro no solo. */
export function initiativeBonus(destreza: number): number {
  const { porPonto, teto } = ATTRIBUTE_RULES.iniciativa
  return clamp(Math.max(0, finite(destreza)) * porPonto, 0, teto)
}

// ---------------------------------------------------------------------------------------------
// Potência das habilidades (cura, reforço, dano extra)
// ---------------------------------------------------------------------------------------------
/**
 * 1 no valor inicial da classe; sobe por ponto acima disso, até o teto. Uma classe recém-criada mantém as
 * habilidades exatamente como eram; investir no atributo de escala as fortalece.
 */
export function abilityPotency(profile: HeroStatProfile, attributeTotal: number): number {
  const reference = profile.base[profile.habilidade.atributoEscala]
  const extra = Math.max(0, finite(attributeTotal) - reference)
  const { porPonto, teto } = ATTRIBUTE_RULES.potenciaHabilidade
  return clamp(1 + extra * porPonto, 1, teto)
}

// ---------------------------------------------------------------------------------------------
// Energia (recurso das habilidades ativas)
// ---------------------------------------------------------------------------------------------
export interface EnergyState {
  /** Energia guardada no `turn` indicado. */
  energy: number
  /** Rodada em que `energy` foi guardada. */
  turn: number
}

/** Energia disponível na rodada `turn`: regenera por rodada, sem passar do máximo nem ficar negativa. */
export function energyAt(state: EnergyState, turn: number, max: number, regen: number = ATTRIBUTE_RULES.energia.regeneracaoPorRodada): number {
  const rounds = Math.max(0, finite(turn) - finite(state.turn))
  return clamp(finite(state.energy) + rounds * Math.max(0, regen), 0, Math.max(0, max))
}

export const canSpendEnergy = (available: number, cost: number): boolean => finite(available) >= Math.max(0, finite(cost))

/** Gasta energia; se não houver o bastante, não gasta nada (`ok: false`). */
export function spendEnergy(state: EnergyState, turn: number, max: number, cost: number, regen?: number): { ok: boolean; state: EnergyState; available: number } {
  const available = energyAt(state, turn, max, regen)
  if (!canSpendEnergy(available, cost)) return { ok: false, state: { energy: available, turn }, available }
  return { ok: true, state: { energy: available - Math.max(0, finite(cost)), turn }, available }
}

/** Energia cheia no começo do combate. */
export const fullEnergy = (max: number, turn: number): EnergyState => ({ energy: Math.max(0, finite(max)), turn })

// ---------------------------------------------------------------------------------------------
// Conjunto: valores finais e Poder
// ---------------------------------------------------------------------------------------------
export interface ChampionStatInput {
  profile: HeroStatProfile
  level: number
  /** Pontos distribuídos + bônus permanentes por atributo (o `attr` do save). */
  points: Partial<PrimaryAttributes>
  bonus?: StatBonuses
  /** Vida Máxima permanente que não vem de Vigor (poções de vida, migração de saves antigos). */
  permanentLife?: number
}

/** Poder exibido na carta. Mesma régua do orçamento de inimigos (vida/2 + ataque + defesa), na escala configurada. */
export function powerRating(input: { vidaMaxima: number; poderBasico: number; secundario: number; mitigacao: number; destreza: number; energiaMaxima: number }): number {
  const p = ATTRIBUTE_RULES.poder
  const cost = input.vidaMaxima * p.vidaPeso + input.poderBasico + input.secundario * p.secundarioPeso + input.mitigacao + input.destreza * p.destrezaPeso + input.energiaMaxima * p.energiaPeso
  return Math.max(0, Math.round(cost * p.escala))
}

export function computeChampionStats(input: ChampionStatInput): ChampionStatBreakdown {
  const { profile } = input
  const level = Math.max(1, Math.floor(finite(input.level, 1)))
  const points = sanitizeAttributes(input.points)
  const bonus = input.bonus ?? {}

  const line = (key: PrimaryAttributeKey): StatLine => {
    const valor = classAttributeAtLevel(profile, key, level) + points[key]
    const b = Math.round(finite(bonus[key]))
    return { valor, bonus: b, total: Math.max(0, valor + b) }
  }
  const forca = line('forca')
  const magia = line('magia')
  const vigor = line('vigor')
  const destreza = line('destreza')

  const vidaFlat = Math.round(finite(bonus.vidaMaxima)) + Math.round(finite(input.permanentLife))
  const vidaValor = maxLife(profile, vigor.valor, Math.round(finite(input.permanentLife)))
  const vidaTotal = maxLife(profile, vigor.total, vidaFlat)

  const energiaValor = maxEnergy(profile, level, 0)
  const energiaTotal = maxEnergy(profile, level, finite(bonus.energia))

  const armaduraTotal = Math.max(0, Math.round(finite(bonus.armadura)))
  const mitigacao = armorMitigation(armaduraTotal)

  const poderFisico = physicalPower(forca.total)
  const poderMagico = magicPower(magia.total)
  const poderBasico = basicAttackPower(profile.ataqueBasico, forca.total, magia.total)
  const secundario = profile.ataqueBasico === 'fisico' ? poderMagico : profile.ataqueBasico === 'magico' ? poderFisico : Math.min(poderFisico, poderMagico)

  const resistenciaElemental = elementalResistance(vigor.total)
  const resistencias: Record<string, number> = {}
  for (const element of ELEMENT_KEYS) {
    resistencias[element] = element === 'fisico' ? 0 : clamp(resistenciaElemental + Math.max(0, finite(bonus.resistencias?.[element])), 0, 0.75)
  }

  const poder = powerRating({ vidaMaxima: vidaTotal, poderBasico, secundario, mitigacao, destreza: destreza.total, energiaMaxima: energiaTotal })

  return {
    forca: forca.total,
    magia: magia.total,
    vigor: vigor.total,
    destreza: destreza.total,
    vidaMaxima: vidaTotal,
    energiaMaxima: energiaTotal,
    armadura: armaduraTotal,
    esquiva: totalDodge(destreza.total, profile.esquivaPassiva),
    resistencias,
    poder,
    linhas: {
      forca,
      magia,
      vigor,
      destreza,
      vidaMaxima: { valor: vidaValor, bonus: vidaTotal - vidaValor, total: vidaTotal },
      energiaMaxima: { valor: energiaValor, bonus: energiaTotal - energiaValor, total: energiaTotal },
      armadura: { valor: 0, bonus: armaduraTotal, total: armaduraTotal },
    },
    poderFisico,
    poderMagico,
    poderBasico,
    mitigacao,
    resistenciaElemental,
    resistenciaEfeitos: effectResistance(vigor.total),
    iniciativa: initiativeBonus(destreza.total),
  }
}

/** Soma bônus de várias fontes (equipamento, talentos...) em um só objeto. */
export function mergeBonuses(...parts: Array<StatBonuses | undefined>): StatBonuses {
  const out: StatBonuses & { resistencias: Partial<Record<ElementKey, number>> } = { resistencias: {} }
  for (const part of parts) {
    if (!part) continue
    for (const key of PRIMARY_ATTRIBUTES) out[key] = finite(out[key]) + finite(part[key])
    out.vidaMaxima = finite(out.vidaMaxima) + finite(part.vidaMaxima)
    out.energia = finite(out.energia) + finite(part.energia)
    out.armadura = finite(out.armadura) + finite(part.armadura)
    for (const [element, value] of Object.entries(part.resistencias ?? {})) {
      const key = element as ElementKey
      out.resistencias[key] = finite(out.resistencias[key]) + finite(value)
    }
  }
  return out
}

export { NO_ATTRIBUTES }
