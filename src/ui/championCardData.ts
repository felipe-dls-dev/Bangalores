// Dados da Carta de Campeão. Tudo sai de cálculos reais (store/heroStats.ts via championStats do jogo): a carta
// nunca guarda números próprios. Funções puras (o que precisa do estado do jogo entra por parâmetro), então a
// carta serve ao herói ativo, à seleção de heróis, à galeria e à prévia sem cópias de fórmulas.

import { ATTRIBUTE_HINTS, ATTRIBUTE_LABELS, PRIMARY_ATTRIBUTES, heroStatProfile, type AbilityScale, type BasicAttackType, type PrimaryAttributeKey } from '../data/heroStatProfiles'
import type { ChampionStatBreakdown } from '../store/heroStats'
import type { Rarity } from '../types'
import { heroProfile, splitAbility } from './heroProfiles'

export interface ChampionCardAttribute {
  key: PrimaryAttributeKey
  label: string
  /** Valor da classe: base + nível + pontos distribuídos. */
  valor: number
  /** Bônus de equipamento, talentos e afins; pode ser negativo no futuro (penalidades). */
  bonus: number
  dica: string
}

export interface ChampionCardData {
  heroId: string
  /** Nome curto da classe ("Guerreiro", "Ladino"). */
  classe: string
  /** Nome completo do herói ("Legionário do Pico de Ignaris"). */
  nome: string
  funcao: string
  raridade: Rarity
  raridadeRotulo: string
  nivel: number
  poder: number
  arte: string
  atributos: ChampionCardAttribute[]
  vida: { atual: number; max: number }
  energia: { atual: number; max: number }
  armadura: { valor: number; origem: string }
  habilidade: {
    nome: string
    tags: string[]
    escala: AbilityScale
    escalaRotulo: string
    custoEnergia: number
    passiva?: string
    ativa?: string
    textoCompleto: string
  }
  ataqueBasico: BasicAttackType
  ataqueBasicoRotulo: string
  /** Números derivados que a carta resume e o detalhe explica. */
  derivados: {
    esquiva: number
    resistenciaElemental: number
    resistenciaEfeitos: number
    iniciativa: number
    mitigacao: number
    poderBasico: number
  }
}

export const ABILITY_SCALE_LABEL: Record<AbilityScale, string> = { fisica: 'Física (Força)', magica: 'Mágica (Magia)', hibrida: 'Híbrida', utilidade: 'Utilidade' }
export const BASIC_ATTACK_LABEL: Record<BasicAttackType, string> = { fisico: 'Físico (usa Força)', magico: 'Mágico (usa Magia)', hibrido: 'Híbrido (usa o maior entre Força e Magia)' }

export interface ChampionCardInput {
  hero: { id: string; nome: string; habilidade: string; raridade?: Rarity }
  classLabel: string
  stats: ChampionStatBreakdown
  level: number
  /** Vida atual (default: cheia). */
  hp?: number
  /** Energia atual (default: cheia). */
  energy?: number
  art: string
  rarityLabel: (rarity: Rarity) => string
}

/** Máximo de etiquetas na carta. */
export const MAX_CARD_TAGS = 3

const clampInt = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(Number.isFinite(value) ? value : min)))

export function buildChampionCard(input: ChampionCardInput): ChampionCardData {
  const { hero, stats } = input
  const profile = heroStatProfile(hero.id)
  const editorial = heroProfile(hero.id)
  const ability = splitAbility(hero.habilidade)
  const raridade: Rarity = hero.raridade ?? 'heroico'
  const armorValue = stats.armadura
  return {
    heroId: hero.id,
    classe: input.classLabel,
    nome: hero.nome,
    funcao: editorial.role,
    raridade,
    raridadeRotulo: input.rarityLabel(raridade),
    nivel: Math.max(1, Math.floor(input.level)),
    poder: stats.poder,
    arte: input.art,
    atributos: PRIMARY_ATTRIBUTES.map((key) => ({ key, label: ATTRIBUTE_LABELS[key], valor: stats.linhas[key].valor, bonus: stats.linhas[key].bonus, dica: ATTRIBUTE_HINTS[key] })),
    vida: { atual: clampInt(input.hp ?? stats.vidaMaxima, 0, stats.vidaMaxima), max: stats.vidaMaxima },
    energia: { atual: clampInt(input.energy ?? stats.energiaMaxima, 0, stats.energiaMaxima), max: stats.energiaMaxima },
    armadura: { valor: armorValue, origem: armorValue > 0 ? 'Itens' : 'Sem itens' },
    habilidade: {
      nome: profile.habilidade.nome,
      tags: profile.habilidade.tags.slice(0, MAX_CARD_TAGS),
      escala: profile.habilidade.escala,
      escalaRotulo: ABILITY_SCALE_LABEL[profile.habilidade.escala],
      custoEnergia: profile.habilidade.custoEnergia,
      passiva: ability.passive,
      ativa: ability.active,
      textoCompleto: hero.habilidade,
    },
    ataqueBasico: profile.ataqueBasico,
    ataqueBasicoRotulo: BASIC_ATTACK_LABEL[profile.ataqueBasico],
    derivados: {
      esquiva: stats.esquiva,
      resistenciaElemental: stats.resistenciaElemental,
      resistenciaEfeitos: stats.resistenciaEfeitos,
      iniciativa: stats.iniciativa,
      mitigacao: stats.mitigacao,
      poderBasico: stats.poderBasico,
    },
  }
}

// ---------------------------------------------------------------------------------------------
// Formatação (números altos e bônus com sinal explícito)
// ---------------------------------------------------------------------------------------------
const numberFormat = new Intl.NumberFormat('pt-BR')
export const formatNumber = (value: number): string => numberFormat.format(Math.round(Number.isFinite(value) ? value : 0))

/** "+12", "−2" (sinal de menos de verdade), "+0". Sem depender de cor. */
export function bonusLabel(bonus: number | undefined): string {
  if (bonus === undefined || !Number.isFinite(bonus)) return '—'
  const value = Math.round(bonus)
  return value < 0 ? `−${formatNumber(-value)}` : `+${formatNumber(value)}`
}

/** Leitura falada do bônus, para leitores de tela. */
export function bonusSpeech(label: string, bonus: number | undefined): string {
  if (bonus === undefined || !Number.isFinite(bonus)) return `${label}: sem bônus informado`
  const value = Math.round(bonus)
  return value === 0 ? `${label}: nenhum bônus` : value > 0 ? `${label}: bônus de mais ${formatNumber(value)}` : `${label}: penalidade de menos ${formatNumber(-value)}`
}

export const percentText = (fraction: number): string => `${(Math.max(0, fraction) * 100).toFixed(fraction >= 0.1 ? 0 : 1).replace('.', ',')}%`
