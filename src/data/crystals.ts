// Cristais de Éter: a moeda premium do jogo (decisão do Felipe, 2026-09-25): ganha jogando e, no
// futuro, também comprada com dinheiro real. NÃO chamar de "gemas": a Forja já usa esse nome para
// os encaixes de equipamento.
//
// Regras de projeto (ver a fase de compra, T-011):
// - Nada aqui vende poder. Os cristais devem comprar só itens cosméticos, para não criar
//   pay-to-win (a auditoria v0.8.84 proíbe vender Ataque, Defesa, Vida, Ouro ou sucesso de forja).
// - Hoje o saldo mora no estado da campanha, igual ao ouro, e é fácil de editar no navegador. Isso
//   só é aceitável enquanto os cristais são apenas ganhos em jogo. Antes de existir compra, o saldo
//   precisa migrar para uma carteira autoritativa no servidor, lida pelo cliente e gasta por RPC.
// - Ainda não existe nada para gastar: a primeira versão só acumula e mostra o saldo.

export const CRYSTAL_NAME = 'Cristais de Éter'
export const CRYSTAL_NAME_SINGULAR = 'Cristal de Éter'

/** Quanto cada fonte de ganho paga. Primeira calibragem: revisar quando houver o que gastar. */
export const CRYSTAL_REWARDS = {
  dailyChallenge: 2,
  weeklyChallenge: 15,
  storyChapter: 5,
} as const

export function crystalsLabel(amount: number): string {
  return `${amount} ${amount === 1 ? CRYSTAL_NAME_SINGULAR : CRYSTAL_NAME}`
}
