import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_PROTECTION_BLESSINGS, VAULT_BASE_SLOTS, VAULT_MAX_UPGRADES, VAULT_SLOTS_PER_UPGRADE,
  protectionBlessingPrice, vaultCapacity, vaultUpgradePrice,
} from './guildVault'
import { useGame, applyDefeatPenalty, currentBlessingPrice } from './game'

const state = () => useGame.getState()
const defeat = () => applyDefeatPenalty(useGame.setState, useGame.getState, 'Teste.')

describe('preço da Bênção de Proteção', () => {
  it('é 25% do preço médio dos itens vestidos, com piso de 25', () => {
    expect(protectionBlessingPrice([])).toBe(25)
    expect(protectionBlessingPrice([23, 23])).toBe(25) // 25% de 23 = 5,75: cai no piso
    expect(protectionBlessingPrice([1000, 3000])).toBe(500)
    expect(protectionBlessingPrice(Array(9).fill(2400))).toBe(600)
  })

  it('ignora preços inválidos e cresce junto com o equipamento', () => {
    expect(protectionBlessingPrice([NaN, 0, -5, 800])).toBe(200)
    expect(protectionBlessingPrice(Array(9).fill(4900))).toBeGreaterThan(protectionBlessingPrice(Array(9).fill(1100)))
  })
})

describe('slots do depósito da Guilda', () => {
  it('começa com slots gratuitos e cada compra soma um pacote, até o teto', () => {
    expect(vaultCapacity(0)).toBe(VAULT_BASE_SLOTS)
    expect(vaultCapacity(1)).toBe(VAULT_BASE_SLOTS + VAULT_SLOTS_PER_UPGRADE)
    expect(vaultCapacity(VAULT_MAX_UPGRADES)).toBe(VAULT_BASE_SLOTS + VAULT_MAX_UPGRADES * VAULT_SLOTS_PER_UPGRADE)
    expect(vaultCapacity(999)).toBe(vaultCapacity(VAULT_MAX_UPGRADES))
    expect(vaultCapacity(-3)).toBe(VAULT_BASE_SLOTS)
    expect(vaultCapacity(undefined)).toBe(VAULT_BASE_SLOTS)
  })

  it('o preço do próximo pacote só sobe e some no teto (sumidouro de ouro escalável)', () => {
    expect(vaultUpgradePrice(0)).toBe(150)
    let previous = 0
    let total = 0
    for (let n = 0; n < VAULT_MAX_UPGRADES; n++) {
      const price = vaultUpgradePrice(n)!
      expect(price).toBeGreaterThan(previous)
      previous = price
      total += price
    }
    expect(vaultUpgradePrice(VAULT_MAX_UPGRADES)).toBeNull()
    // ordem de grandeza do investimento total: dezenas de milhares até ~100k de ouro
    expect(total).toBeGreaterThan(80_000)
    expect(total).toBeLessThan(130_000)
  })
})

describe('Bênção de Proteção no jogo', () => {
  beforeEach(() => vi.restoreAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it('compra debita o preço atual, soma uma carga e respeita o máximo', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ gold: 100_000, protectionBlessings: 0 } as any)
    const price = currentBlessingPrice(state())
    state().buyProtectionBlessing()
    expect(state().protectionBlessings).toBe(1)
    expect(state().gold).toBe(100_000 - price)

    for (let i = 0; i < 10; i++) state().buyProtectionBlessing()
    expect(state().protectionBlessings).toBe(MAX_PROTECTION_BLESSINGS)
    expect(state().gold).toBe(100_000 - price * MAX_PROTECTION_BLESSINGS)
    expect(state().guildNotice).toMatch(/máximo/)
  })

  it('sem ouro suficiente não compra nada', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ gold: 0, protectionBlessings: 0 } as any)
    state().buyProtectionBlessing()
    expect(state().protectionBlessings).toBe(0)
    expect(state().gold).toBe(0)
    expect(state().guildNotice).toMatch(/insuficiente/)
  })

  it('numa derrota com a perda sorteada, a bênção evita perder o item e gasta uma carga', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ gold: 1000, protectionBlessings: 2, consecutiveDefeats: 0, lastDefeatKey: undefined, enemy: undefined } as any)
    const equippedBefore = state().equipped
    vi.spyOn(Math, 'random').mockReturnValue(0) // com bênção o sorteio nem deve ser consultado
    defeat()
    expect(state().equipped).toEqual(equippedBefore)
    expect(state().protectionBlessings).toBe(1)
    expect(state().explorationNote).toMatch(/Bênção de Proteção foi consumida/)
  })

  it('sem bênção o mesmo sorteio ainda custa um equipamento (a punição continua existindo)', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ gold: 1000, protectionBlessings: 0, consecutiveDefeats: 0, lastDefeatKey: undefined, enemy: undefined } as any)
    const before = Object.keys(state().equipped).length
    vi.spyOn(Math, 'random').mockReturnValue(0)
    defeat()
    expect(Object.keys(state().equipped).length).toBe(before - 1)
  })

  it('não gasta carga quando a misericórdia por derrotas seguidas já zerou o risco', () => {
    useGame.getState().newGame('guerreiro')
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const fakeEnemy = { nome: 'Lobo dos Campos', ataque: 1, vida: 1 } as any
    // 4 derrotas seguidas para o MESMO inimigo: a chance de perder item cai 20% -> 13% -> 6% -> 0%
    for (let i = 0; i < 4; i++) {
      useGame.setState({ gold: 1000, protectionBlessings: 0, enemy: fakeEnemy } as any)
      if (i === 3) useGame.setState({ protectionBlessings: 1 } as any)
      defeat()
    }
    expect(state().protectionBlessings).toBe(1)
  })
})

describe('Depósito da Guilda no jogo', () => {
  it('guarda e devolve itens da mochila, sem perder nem duplicar', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ equipmentBag: ['a@@1', 'b@@2'], guildVault: [], guildVaultUpgrades: 0 } as any)
    state().depositToVault('a@@1')
    expect(state().equipmentBag).toEqual(['b@@2'])
    expect(state().guildVault).toEqual(['a@@1'])

    state().withdrawFromVault('a@@1')
    expect(state().guildVault).toEqual([])
    expect(state().equipmentBag).toEqual(['b@@2', 'a@@1'])

    state().depositToVault('nao-existe')
    state().withdrawFromVault('nao-existe')
    expect(state().equipmentBag).toEqual(['b@@2', 'a@@1'])
  })

  it('não guarda além da capacidade e libera mais espaço ao comprar slots', () => {
    useGame.getState().newGame('guerreiro')
    const full = Array.from({ length: VAULT_BASE_SLOTS }, (_, i) => `v@@${i}`)
    useGame.setState({ equipmentBag: ['extra@@1'], guildVault: full, guildVaultUpgrades: 0, gold: 10_000 } as any)
    state().depositToVault('extra@@1')
    expect(state().guildVault).toEqual(full)
    expect(state().equipmentBag).toEqual(['extra@@1'])
    expect(state().guildNotice).toMatch(/cheio/)

    const price = vaultUpgradePrice(0)!
    state().buyVaultUpgrade()
    expect(state().guildVaultUpgrades).toBe(1)
    expect(state().gold).toBe(10_000 - price)
    state().depositToVault('extra@@1')
    expect(state().guildVault).toHaveLength(VAULT_BASE_SLOTS + 1)
  })

  it('não retira para uma mochila cheia', () => {
    useGame.getState().newGame('guerreiro')
    const overfull = Array.from({ length: 50 }, (_, i) => `x@@${i}`)
    useGame.setState({ equipmentBag: overfull, guildVault: ['guardado@@1'] } as any)
    state().withdrawFromVault('guardado@@1')
    expect(state().guildVault).toEqual(['guardado@@1'])
    expect(state().equipmentBag).toEqual(overfull)
    expect(state().guildNotice).toMatch(/bolsa está cheia/)
  })

  it('compra de slots falha sem ouro e para no teto', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ gold: 0, guildVaultUpgrades: 0 } as any)
    state().buyVaultUpgrade()
    expect(state().guildVaultUpgrades).toBe(0)

    useGame.setState({ gold: 1_000_000, guildVaultUpgrades: VAULT_MAX_UPGRADES } as any)
    state().buyVaultUpgrade()
    expect(state().guildVaultUpgrades).toBe(VAULT_MAX_UPGRADES)
    expect(state().gold).toBe(1_000_000)
  })
})

describe('depósito e bênçãos entre campanhas', () => {
  it('novo jogo começa sem depósito nem bênçãos, mesmo depois de um personagem que tinha', () => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ guildVault: ['antigo@@1'], guildVaultUpgrades: 4, protectionBlessings: 3 } as any)
    useGame.getState().newGame('arcanista')
    expect(state().guildVault).toEqual([])
    expect(state().guildVaultUpgrades).toBe(0)
    expect(state().protectionBlessings).toBe(0)
  })

  it('carregar uma campanha ANTIGA (snapshot sem os campos novos) não herda o depósito de outra', () => {
    useGame.getState().newGame('guerreiro')
    const legacyId = state().activeCampaignId!
    useGame.getState().newGame('arcanista')

    // snapshot como era antes do depósito existir: sem nenhum dos 3 campos
    const legacy: any = { ...state().campaigns[legacyId] }
    delete legacy.guildVault
    delete legacy.guildVaultUpgrades
    delete legacy.protectionBlessings
    useGame.setState({ campaigns: { ...state().campaigns, [legacyId]: legacy } } as any)

    // estado em memória de OUTRA campanha, com depósito preenchido
    useGame.setState({ guildVault: ['vazou@@1'], guildVaultUpgrades: 3, protectionBlessings: 3 } as any)
    useGame.getState().loadCampaign(legacyId)

    expect(state().guildVault).toEqual([])
    expect(state().guildVaultUpgrades).toBe(0)
    expect(state().protectionBlessings).toBe(0)
  })

  it('o depósito e as bênçãos entram no snapshot da campanha (salvo local e na nuvem)', () => {
    useGame.getState().newGame('guerreiro')
    const campaignId = state().activeCampaignId!
    useGame.setState({ guildVault: ['no-snapshot@@1'], guildVaultUpgrades: 2, protectionBlessings: 1 } as any)
    useGame.getState().newGame('arcanista') // grava a campanha anterior via saveActiveCampaign
    const saved: any = state().campaigns[campaignId]
    expect(saved.guildVault).toEqual(['no-snapshot@@1'])
    expect(saved.guildVaultUpgrades).toBe(2)
    expect(saved.protectionBlessings).toBe(1)
  })
})
