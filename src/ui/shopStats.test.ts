import { beforeEach, describe, expect, it } from 'vitest'
import { EQUIPMENT, equipmentBaseStats, equipmentClassAllowed, equipmentRequiredLevel, useGame, xpForLevel } from '../store/game'
import { shopEquipmentChips, shopTargetSlot } from './shopStats'

const state = () => useGame.getState()
const byId = (id: string) => EQUIPMENT.find((e) => e.id === id)!
const usable = (hero: string, slot: string) =>
  EQUIPMENT.filter((e) => e.slot === slot && equipmentClassAllowed(e, hero)).sort((a, b) => equipmentRequiredLevel(a) - equipmentRequiredLevel(b) || a.ataque + a.defesa - (b.ataque + b.defesa))

beforeEach(() => {
  state().newGame('arcanista')
  useGame.setState({ xp: xpForLevel(60), equipmentUpgrades: {}, equipmentGems: {} } as any)
})

describe('chips de atributos da vitrine da Loja', () => {
  it('mostram cada atributo que a peça dá, no mesmo valor da conversão', () => {
    const staff = usable('arcanista', 'mao_direita').find((e) => e.raridade === 'raro' && equipmentBaseStats(e, 'arcanista').magia > 0)!
    const st = equipmentBaseStats(staff, 'arcanista')
    const { chips } = shopEquipmentChips(staff, state())
    expect(chips.find((c) => c.key === 'magia')?.value).toBe(`+${st.magia}`)
    for (const chip of chips) if (chip.value !== '—') expect(Number(chip.value.replace(/[+%]/g, ''))).toBe(st[chip.key as keyof typeof st])
  })

  it('comparam com a peça equipada no mesmo espaço: diferença com seta e veredito pelo Índice', () => {
    const starter = byId(state().equipped.mao_direita!.split('@@')[0])
    const better = usable('arcanista', 'mao_direita').filter((e) => e.ataque > starter.ataque + 2).at(-1)!
    const { chips, verdict } = shopEquipmentChips(better, state())
    const magia = chips.find((c) => c.key === 'magia')!
    expect(magia.tone).toBe('up')
    expect(magia.delta).toMatch(/^▲\d/)
    expect(verdict?.tone).toBe('better')
    expect(verdict?.text).toMatch(/Melhor • Índice \+/)
    const worse = shopEquipmentChips(better, { ...state(), equipped: { ...state().equipped, mao_direita: `${better.id}@@eq` } } as any)
    expect(worse.verdict?.tone).toBe('same') // mesma peça
    const downgrade = shopEquipmentChips(starter, { ...state(), equipped: { ...state().equipped, mao_direita: `${better.id}@@eq` } } as any)
    expect(downgrade.verdict?.tone).toBe('worse')
    expect(downgrade.chips.find((c) => c.key === 'magia')?.delta).toMatch(/^▼/)
  })

  it('atributo que só a peça equipada tem aparece como "—" com a perda', () => {
    const current = usable('arcanista', 'capacete').find((e) => e.vida > 0 && e.defesa > 0)!
    const bare = { ...current, id: 'zz_sem_vida', vida: 0, statsByClass: undefined }
    const s = { ...state(), equipped: { ...state().equipped, capacete: `${current.id}@@eq` } } as any
    const { chips } = shopEquipmentChips(bare as any, s)
    const life = chips.find((c) => c.key === 'vida' || c.key === 'vigor')!
    expect(life.value === '—' || life.tone === 'down').toBe(true)
  })

  it('espaço vazio: veredito "Espaço vazio" e os chips sem seta (a diferença seria o próprio valor)', () => {
    const helm = usable('arcanista', 'capacete')[0]
    useGame.setState({ equipped: { ...state().equipped, capacete: undefined } } as any)
    const { chips, verdict } = shopEquipmentChips(helm, state())
    expect(verdict?.tone).toBe('empty')
    expect(chips.length).toBeGreaterThan(0)
    for (const chip of chips) expect(chip.delta).toBeUndefined()
  })

  it('anel entra no segundo espaço quando o primeiro está ocupado, e compara com ele', () => {
    const ring = EQUIPMENT.find((e) => e.slot === 'anel_1' && !e.classeExclusiva && e.ataque > 0)!
    useGame.setState({ equipped: { ...state().equipped, anel_1: `${ring.id}@@a`, anel_2: undefined } } as any)
    expect(shopTargetSlot(ring, state())).toBe('anel_2')
    expect(shopEquipmentChips(ring, state()).verdict?.tone).toBe('empty')
  })

  it('Força de uma arma física aparece apagada para quem ataca com Magia', () => {
    const sword = EQUIPMENT.find((e) => e.slot === 'mao_direita' && !e.classeExclusiva && e.nome.startsWith('Espada') && e.ataque >= 3)!
    const force = shopEquipmentChips(sword, state()).chips.find((c) => c.key === 'forca')!
    expect(force.dim).toBe(true)
    expect(force.title).toMatch(/não aumenta o ataque/)
  })

  it('na venda mostra a própria peça com o aprimoramento e não compara', () => {
    const staff = usable('arcanista', 'mao_direita').find((e) => e.ataque > 0)!
    const ref = `${staff.id}@@venda`
    useGame.setState({ equipmentBag: [ref], equipmentUpgrades: { [ref]: 2 } } as any)
    const { chips, verdict } = shopEquipmentChips(staff, state(), ref)
    expect(verdict).toBeUndefined()
    expect(chips.find((c) => c.key === 'magia')?.value).toBe(`+${equipmentBaseStats(staff, 'arcanista').magia + 2}`)
    expect(chips.every((c) => !c.delta)).toBe(true)
  })

  it('bolsa mostra os espaços e a diferença para a bolsa atual', () => {
    const bag = EQUIPMENT.find((e) => e.id === 'mochila_viagem_12')!
    const { chips } = shopEquipmentChips(bag, state())
    expect(chips).toHaveLength(1)
    expect(chips[0].value).toBe('12')
    expect(chips[0].tone).toBe('up')
  })

  it('peça de outra classe (exclusiva) mostra os atributos sem veredito', () => {
    const other = EQUIPMENT.find((e) => e.classeExclusiva === 'guardiao' && e.slot === 'peitoral')!
    const { chips, verdict } = shopEquipmentChips(other, state())
    expect(chips.length).toBeGreaterThan(0)
    expect(verdict).toBeUndefined()
  })
})
