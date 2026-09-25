// Bênção de Proteção + Depósito da Guilda.
//
// Dois sumidouros de ouro que escalam com a progressão (decisão do Felipe, 2026-09-25, a partir
// da auditoria v0.8.84): a perda de equipamento na derrota continua existindo, mas o jogador
// pode pagar para se proteger dela, e o depósito da Guilda (slots comprados) dá mais espaço sem
// inflar a economia. Este módulo só tem regras e preços; o estado e as ações ficam em game.ts.

/** Quantas bênçãos o jogador pode carregar ao mesmo tempo (evita ficar imune para sempre). */
export const MAX_PROTECTION_BLESSINGS = 3
const BLESSING_MIN_PRICE = 25
// Seguro proporcional ao que está em jogo: uma fração do valor médio do equipamento vestido.
// O risco real por derrota é ~20% de perder UM item, então 25% é um seguro levemente "caro" (é
// isso que faz dele um sumidouro de ouro) sem virar obrigação.
const BLESSING_PRICE_RATE = 0.25

export const VAULT_BASE_SLOTS = 10
export const VAULT_SLOTS_PER_UPGRADE = 5
export const VAULT_MAX_UPGRADES = 10
const VAULT_FIRST_UPGRADE_PRICE = 150
const VAULT_UPGRADE_PRICE_GROWTH = 1.9

const roundToFive = (n: number) => Math.round(n / 5) * 5
const wholeUpgrades = (upgrades: number | undefined) =>
  Math.min(VAULT_MAX_UPGRADES, Math.max(0, Math.floor(Number(upgrades) || 0)))

/** Preço de uma bênção: 25% do preço médio dos itens vestidos (sem a bolsa), no mínimo 25. */
export function protectionBlessingPrice(equippedItemPrices: number[]): number {
  const prices = equippedItemPrices.filter((p) => Number.isFinite(p) && p > 0)
  if (!prices.length) return BLESSING_MIN_PRICE
  const average = prices.reduce((sum, p) => sum + p, 0) / prices.length
  return Math.max(BLESSING_MIN_PRICE, roundToFive(average * BLESSING_PRICE_RATE))
}

/** Total de slots do depósito: os gratuitos mais os comprados. */
export function vaultCapacity(upgrades: number | undefined): number {
  return VAULT_BASE_SLOTS + wholeUpgrades(upgrades) * VAULT_SLOTS_PER_UPGRADE
}

/** Preço do próximo pacote de slots (cresce ~1,9x a cada compra); null quando já está no máximo. */
export function vaultUpgradePrice(upgrades: number | undefined): number | null {
  const owned = Math.max(0, Math.floor(Number(upgrades) || 0))
  if (owned >= VAULT_MAX_UPGRADES) return null
  return roundToFive(VAULT_FIRST_UPGRADE_PRICE * VAULT_UPGRADE_PRICE_GROWTH ** owned)
}
