// Contas de dado do combate cooperativo. Funções puras: CoopContext.tsx as usa para resolver os golpes de
// verdade e coopPreview.ts as usa para prever, então o que a tela promete é exatamente o que o combate faz.
// (Só as contas determinísticas moram aqui; quem sorteia os dados continua sendo o CoopContext.)

import { STANCE_ATTACK_PCT, STANCE_DEFENSE_PCT, rollPenaltyFrom, type BattleStance, type StatusEffects } from '../store/game'
import { armorMitigation, totalDodge } from '../store/heroStats'

type Buffs = Record<string, any>

const clampRoll = (value: number) => Math.max(1, Math.min(6, value))

// ---- Golpe de um herói no inimigo (coopAttack) ----

/** Bônus total nos dados de ataque: grupo + pessoal + próximo golpe + bônus do herói − condições negativas. */
export function coopHeroRollBonus(group: Buffs, personal: Buffs, rollBonus: number): number {
  return Number(group.roll ?? 0) + Number(personal.roll ?? 0) + Number(personal.nextRoll ?? 0) + rollBonus - rollPenaltyFrom(personal as StatusEffects)
}

export const coopHeroCritBoost = (group: Buffs, critBoost: boolean): boolean => Boolean(group.critBoost) || critBoost

/** Dado de ataque final (o crítico forçado é decidido por quem sorteia e não passa por aqui). */
export function coopHeroAttackRoll(naturalRoll: number, totalRollBonus: number, totalCritBoost: boolean): number {
  return clampRoll(naturalRoll + totalRollBonus + (totalCritBoost && naturalRoll === 5 ? 1 : 0))
}

/** Dado de defesa do inimigo contra um herói. Atordoado ele nem defende (quem chama trata isso). */
export function coopHeroDefenseRoll(naturalRoll: number, fearPenalty: number, statusPenalty: number): number {
  return Math.max(1, naturalRoll - fearPenalty - statusPenalty)
}

/** Ataque do herói com os bônus percentuais do grupo, os pessoais e a postura. */
export function coopBuffedAttack(attackBase: number, group: Buffs, personal: Buffs): number {
  return Math.ceil(attackBase * (1 + Number(group.attackPct ?? 0) + Number(personal.attackPct ?? 0) + STANCE_ATTACK_PCT[(personal.battleStance as BattleStance) ?? 'neutra']))
}

// ---- Golpe do inimigo num membro do grupo (turno do inimigo) ----

/** Dado de ataque do inimigo. Medo e condições do inimigo (congelado, cego...) REDUZEM o dado; a sorte da Druida também. */
export function coopEnemyAttackRoll(naturalRoll: number, bonus: number, druidaLuck: boolean, enemyPenalty: number): number {
  return clampRoll(naturalRoll + bonus - (druidaLuck ? 1 : 0) - enemyPenalty)
}

/** Dado de defesa de um membro (fora do caso de fera que intercepta ou atordoamento). */
export function coopMemberDefenseRoll(naturalRoll: number, rollBonus: number, critDefenseBoost: boolean, statusPenalty: number): number {
  return clampRoll(naturalRoll + rollBonus + (critDefenseBoost && naturalRoll === 5 ? 1 : 0) - statusPenalty)
}

export function coopMemberDefensePct(group: Buffs, personal: Buffs): number {
  return Number(group.defensePct ?? 0) + Number(personal.defensePct ?? 0) + STANCE_DEFENSE_PCT[(personal.battleStance as BattleStance) ?? 'neutra']
}

/** O que cada membro publica na sala. `armor` e `dodgeChance` são novos; `defense` é o formato antigo (mitigação já pronta). */
export interface CoopMemberStats {
  armor?: number
  defense?: number
  dodgeChance?: number
  dodgeBoost?: boolean
  elementalResist?: number
  effectResist?: number
}

/**
 * Defesa de um membro contra o golpe do inimigo. Com `armor` publicado, os bônus percentuais (postura, grupo) valem
 * sobre a Armadura e a mitigação segue a mesma curva de retorno decrescente do solo. Sem `armor` (sala com cliente
 * antigo), usa a defesa já mitigada como antes.
 */
export function coopMemberDefenseBase(member: CoopMemberStats | number, defensePct: number): number {
  if (typeof member === 'number') return Math.ceil(Number(member ?? 0) * (1 + defensePct))
  if (Number.isFinite(Number(member.armor))) return Math.ceil(armorMitigation(Math.max(0, Number(member.armor)) * (1 + defensePct)))
  return Math.ceil(Number(member.defense ?? 0) * (1 + defensePct))
}

/** Chance de esquiva de um membro: a publicada (Destreza + passiva + forjada, com teto) ou, em cliente antigo, a regra antiga. */
export function coopMemberDodge(member: CoopMemberStats, heroId?: string): number {
  if (Number.isFinite(Number(member.dodgeChance))) return Math.max(0, Math.min(1, Number(member.dodgeChance)))
  const passive = heroId === 'cacadora' || heroId === 'cacador' ? 0.2 : 0
  return totalDodge(0, passive, member.dodgeBoost ? 0.05 : 0)
}

/** Dano que chega ao membro depois de esquiva, resistência elemental (−1) e escudo. */
export function coopEnemyDamage(input: { resolvedDamage: number; dodged: boolean; resisted: boolean; shield: number; intercepting: boolean; elementalEnemy?: boolean; elementalResist?: number }): { damage: number; shieldBlocked: number } {
  let raw = input.dodged ? 0 : input.resolvedDamage
  if (input.resisted && raw > 0) raw = Math.max(0, raw - 1)
  // Vigor: resistência percentual contra ataques elementais (o físico é coberto pela Armadura), igual ao solo.
  if (!input.intercepting && input.elementalEnemy && raw > 0) raw = Math.max(1, Math.round(raw * (1 - Math.max(0, Math.min(0.75, Number(input.elementalResist ?? 0))))))
  const shieldBlocked = input.intercepting ? 0 : Math.min(input.shield, raw)
  return { damage: raw - shieldBlocked, shieldBlocked }
}

// ---- Rateio da recompensa da batalha ----

type Battle = Record<string, any>

/** Contribuição de cada jogador: dano causado + cura feita + dano que ele evitou levar. */
export function coopContributions(battle: Battle): Record<string, number> {
  const damage = battle.damageByPlayer ?? {}
  const healing = battle.healingByPlayer ?? {}
  const resisted = battle.damageResistedByPlayer ?? {}
  const ids = new Set([...Object.keys(damage), ...Object.keys(healing), ...Object.keys(resisted)])
  return Object.fromEntries([...ids].map((id) => [id, Math.max(0, Number(damage[id]) || 0) + Math.max(0, Number(healing[id]) || 0) + Math.max(0, Number(resisted[id]) || 0)]))
}

/** Parte (0–1) da recompensa de um jogador: contribuição dele sobre o total; sem contribuição nenhuma, divide igual. */
export function coopRewardShare(battle: Battle, userId: string, memberCount: number): number {
  const contributions = coopContributions(battle)
  const total = Object.values(contributions).reduce((sum, value) => sum + value, 0)
  return total > 0 ? (contributions[userId] ?? 0) / total : 1 / Math.max(1, memberCount)
}

export interface CoopShareRow {
  userId: string
  name: string
  heroId?: string
  damage: number
  healing: number
  resisted: number
  /** Parte da recompensa (0–1), a mesma que o jogo usa para pagar ouro e XP. */
  share: number
}

/** Tabela do grupo para a tela de Vitória: todos os membros, do que mais contribuiu ao que menos. */
export function coopShareTable(battle: Battle, members: ReadonlyArray<{ user_id: string; display_name?: string; hero_id?: string }>): CoopShareRow[] {
  const damage = battle.damageByPlayer ?? {}
  const healing = battle.healingByPlayer ?? {}
  const resisted = battle.damageResistedByPlayer ?? {}
  return members
    .map((member, index) => ({
      index,
      userId: member.user_id,
      name: member.display_name ?? 'Aventureiro',
      heroId: member.hero_id,
      damage: Math.max(0, Number(damage[member.user_id]) || 0),
      healing: Math.max(0, Number(healing[member.user_id]) || 0),
      resisted: Math.max(0, Number(resisted[member.user_id]) || 0),
      share: coopRewardShare(battle, member.user_id, members.length),
    }))
    .sort((a, b) => b.share - a.share || a.index - b.index)
    .map(({ index: _index, ...row }) => row)
}
