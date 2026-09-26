// Vitrine da Loja: um chip por atributo que a peça dá (ou que a peça vestida no mesmo espaço dá), com a diferença para ela,
// e um veredito pelo Índice. Antes o card da vitrine só mostrava espaço, nível e o texto da habilidade: os atributos ficavam
// escondidos na arte ampliada. Na venda (`ownRef`) mostra a própria peça, com forja e pedras, sem comparar.

import {
  equipmentBagCapacity,
  equipmentBaseStats,
  equipmentByRef,
  equipmentClassAllowed,
  equipmentInstanceBreakdown,
  useGame,
} from '../store/game'
import { ITEM_STAT_KEYS, ITEM_STAT_LABELS, ITEM_STAT_SHORT, equipmentStatScore, offenseWeights } from '../data/equipmentAttributes'
import type { Equipment, Slot } from '../types'

type State = ReturnType<typeof useGame.getState>

export interface ShopStatChip {
  key: string
  /** Sigla curta (FOR, MAG, VIG, DES, ARM, VIDA, EN, ESQ, ESPAÇOS). */
  label: string
  /** "+5", "+3%", ou "—" quando a peça não dá o atributo (mas a equipada dá). */
  value: string
  /** Diferença para a peça equipada no mesmo espaço: "▲2", "▼1". */
  delta?: string
  tone?: 'up' | 'down'
  /** Força ou Magia que não aumenta o ataque da classe. */
  dim?: boolean
  /** Texto completo (dica e leitor de tela). */
  title: string
}

export interface ShopVerdict {
  tone: 'better' | 'worse' | 'same' | 'empty'
  text: string
  title: string
}

const SLOT_LABELS: Record<Slot, string> = {
  amuleto: 'amuleto', capacete: 'capacete', bolsa: 'bolsa', anel_1: 'anel 1', peitoral: 'peitoral', anel_2: 'anel 2',
  calcas: 'calças', mao_esquerda: 'mão esquerda', mao_direita: 'mão direita', botas: 'botas',
}

const fmt = (n: number) => Math.abs(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
export const signedPt = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(n)}`
const arrowPt = (n: number) => `${n > 0 ? '▲' : '▼'}${fmt(n)}`

/** Espaço em que `equip` colocaria a peça (anel vai para o segundo se o primeiro estiver ocupado). */
export function shopTargetSlot(e: Equipment, state: Pick<State, 'equipped'>): Slot {
  return e.slot === 'anel_1' && state.equipped.anel_1 ? 'anel_2' : e.slot
}

export function shopEquipmentChips(e: Equipment, state: State, ownRef?: string): { chips: ShopStatChip[]; verdict?: ShopVerdict } {
  if (e.slot === 'bolsa') {
    const capacity = e.capacidade ?? 8
    const delta = ownRef ? 0 : capacity - equipmentBagCapacity(state)
    return {
      chips: [{
        key: 'bolsa', label: 'ESPAÇOS', value: String(capacity), delta: delta ? arrowPt(delta) : undefined, tone: delta > 0 ? 'up' : delta < 0 ? 'down' : undefined,
        title: `Bolsa com ${capacity} espaços${delta ? ` (${signedPt(delta)} em relação à sua)` : ''}`,
      }],
    }
  }
  const stats = ownRef ? equipmentInstanceBreakdown(e, ownRef, state).total : equipmentBaseStats(e, state.heroId)
  const canCompare = !ownRef && equipmentClassAllowed(e, state.heroId)
  const slot = shopTargetSlot(e, state)
  const currentRef = canCompare ? state.equipped[slot] : undefined
  const currentItem = currentRef ? equipmentByRef(currentRef) : undefined
  const current = currentItem && currentRef ? equipmentInstanceBreakdown(currentItem, currentRef, state).total : undefined
  const weights = offenseWeights(state.heroId)
  const chips: ShopStatChip[] = ITEM_STAT_KEYS.filter((key) => stats[key] || current?.[key]).map((key) => {
    const value = stats[key]
    // Sem peça no espaço a diferença seria o próprio valor: o selo "Espaço vazio" já diz que tudo é ganho.
    const delta = current ? value - current[key] : 0
    const pct = key === 'esquiva' ? '%' : ''
    const dim = (key === 'forca' || key === 'magia') && value > 0 && weights[key] < 0.5
    return {
      key,
      label: ITEM_STAT_SHORT[key],
      value: value ? `${value > 0 ? '+' : '−'}${Math.abs(value)}${pct}` : '—',
      delta: delta ? `${arrowPt(delta)}${pct}` : undefined,
      tone: delta > 0 ? 'up' : delta < 0 ? 'down' : undefined,
      dim,
      title: `${ITEM_STAT_LABELS[key]}: ${value ? `${value > 0 ? '+' : ''}${value}${pct}` : 'não dá'}${delta ? ` (${signedPt(delta)}${pct} em relação ao equipado)` : ''}${dim ? ' — não aumenta o ataque da sua classe' : ''}`,
    }
  })
  if (!canCompare) return { chips }
  if (!currentItem) return { chips, verdict: { tone: 'empty', text: 'Espaço vazio', title: `Nada equipado em ${SLOT_LABELS[slot]}: todos os atributos são ganho.` } }
  if (currentItem.id === e.id) return { chips, verdict: { tone: 'same', text: 'Já equipada', title: `Você já usa ${currentItem.nome}.` } }
  const diff = Math.round((equipmentStatScore(stats, state.heroId) - equipmentStatScore(current!, state.heroId)) * 10) / 10
  const title = `Índice ${signedPt(diff)} em relação a ${currentItem.nome} (a peça equipada em ${SLOT_LABELS[slot]}). O Índice resume quanto a peça vale para a sua classe.`
  const verdict: ShopVerdict = diff > 0 ? { tone: 'better', text: `▲ Melhor • Índice ${signedPt(diff)}`, title } : diff < 0 ? { tone: 'worse', text: `▼ Pior • Índice ${signedPt(diff)}`, title } : { tone: 'same', text: '= Equivalente', title }
  return { chips, verdict }
}
