// Comparação do equipamento que caiu com o que o herói já veste (tela de Vitória do modo Moderno).
// Não recalcula regras de bônus: simula o `equip` da store (mesmo espaço de destino) e pergunta às
// próprias funções do jogo qual seria o Ataque, a Defesa, a Vida e a bolsa depois da troca.

import {
  attackValue,
  defenseValue,
  equipmentBagCapacity,
  equipmentByRef,
  equipmentClassAllowed,
  equipmentLevelAllowed,
  equipmentRequiredLevel,
  equipmentWeaponClass,
  maxHp,
  useGame,
} from '../store/game'
import type { Equipment, Slot } from '../types'

type State = ReturnType<typeof useGame.getState>

export interface CompareRow {
  id: 'ataque' | 'defesa' | 'vida' | 'bolsa'
  label: string
  from: number
  to: number
  delta: number
}

export type EquipBlock = { ok: true } | { ok: false; label: string; reason: string }

export interface DropCompare {
  /** Espaço em que o item entraria (anel usa o segundo se o primeiro estiver ocupado). */
  slot: Slot
  /** Nome do item que sairia do lugar, se houver. */
  replaces?: string
  rows: CompareRow[]
  verdict: 'better' | 'worse' | 'mixed' | 'same'
  block: EquipBlock
}

/** Onde `equip` colocaria o item e como ficaria o conjunto equipado. */
export function equippedAfter(state: Pick<State, 'equipped' | 'equipmentBag'>, ref: string) {
  const item = equipmentByRef(ref)
  if (!item) return undefined
  let slot: Slot = item.slot
  if (slot === 'anel_1' && state.equipped.anel_1) slot = 'anel_2'
  const equipped = { ...state.equipped, [slot]: ref }
  if (slot === 'mao_direita' && equipmentWeaponClass(item) === 'facas') delete equipped.mao_esquerda
  return { slot, equipped }
}

/** Pode equipar agora? Mesmas regras que `equip` e que a mochila da tela de Vitória. */
export function equipBlock(item: Equipment, state: Pick<State, 'heroId' | 'xp' | 'equipped' | 'equipmentBag'>): EquipBlock {
  if (!equipmentClassAllowed(item, state.heroId)) return { ok: false, label: 'Impossível equipar', reason: 'Outra classe usa este equipamento.' }
  if (!equipmentLevelAllowed(item, state.xp)) {
    const level = equipmentRequiredLevel(item)
    return { ok: false, label: `Requer nível ${level}`, reason: `Disponível no nível ${level}.` }
  }
  if (item.slot === 'bolsa' && state.equipmentBag.length > (item.capacidade ?? 8)) {
    return { ok: false, label: `Reduza para ${item.capacidade ?? 8} itens`, reason: 'Há equipamentos demais para esta bolsa.' }
  }
  if (item.slot === 'mao_esquerda' && equipmentWeaponClass(equipmentByRef(state.equipped.mao_direita)) === 'facas') {
    return { ok: false, label: 'Facas ocupam as duas mãos', reason: 'Combate com facas exige as duas mãos livres.' }
  }
  return { ok: true }
}

export function compareDrop(ref: string, state: State): DropCompare | undefined {
  const item = equipmentByRef(ref)
  const after = equippedAfter(state, ref)
  if (!item || !after) return undefined
  const next = { ...state, equipped: after.equipped } as State
  const row = (id: CompareRow['id'], label: string, from: number, to: number): CompareRow => ({ id, label, from, to, delta: to - from })
  const rows =
    item.slot === 'bolsa'
      ? [row('bolsa', 'Bolsa', equipmentBagCapacity(state), equipmentBagCapacity(next))]
      : [row('ataque', 'Ataque', attackValue(state), attackValue(next)), row('defesa', 'Defesa', defenseValue(state), defenseValue(next)), row('vida', 'Vida', maxHp(state), maxHp(next))]
  const gains = rows.filter((r) => r.delta > 0).length
  const losses = rows.filter((r) => r.delta < 0).length
  const verdict: DropCompare['verdict'] = gains && losses ? 'mixed' : gains ? 'better' : losses ? 'worse' : 'same'
  return { slot: after.slot, replaces: equipmentByRef(state.equipped[after.slot])?.nome, rows, verdict, block: equipBlock(item, state) }
}

/** A cópia que acabou de cair: a última na mochila com esse id (o saque entra no fim da lista). */
export function findDroppedRef(bag: readonly string[], equipmentId: string): string | undefined {
  for (let i = bag.length - 1; i >= 0; i--) if (equipmentByRef(bag[i])?.id === equipmentId) return bag[i]
  return undefined
}

export const signed = (value: number) => (value > 0 ? `+${value}` : `${value}`)
