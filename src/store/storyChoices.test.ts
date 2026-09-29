import { beforeEach, describe, expect, it } from 'vitest'
import { FORGE_MATERIALS, REGION_MATERIALS, STORY_CHAPTERS } from '../data/expansion'
import { STORY_EXPANSION_CHAPTERS } from '../data/storyExpansion'
import { STORY_CAPS, fx, parseStoryEffect, storyTotals } from '../data/storyEffects'
import { storyEffectLabel } from '../ui/storyEffectLabels'
import {
  CONSUMABLES, GUILD_MISSIONS, TERRITORIES, applyStoryHostility, consumableEffectiveValue, guildReputation, shopBuyPrice,
  storyModifiers, useGame, worldUnlocked,
} from './game'

const state = () => useGame.getState()
const byId = new Map(STORY_CHAPTERS.map(c => [c.id, c]))
const MATERIAL_IDS = new Set([...Object.values(REGION_MATERIALS).map(m => m.id), ...FORGE_MATERIALS.map(m => m.id)])
const REGION_IDS = new Set(TERRITORIES.map(t => t.id))
const NEW_CHAPTER_IDS = new Set(STORY_EXPANSION_CHAPTERS.filter(c => c.choices.length).map(c => c.id))

/** Todos os caminhos do prólogo até um capítulo sem escolhas. */
function allPaths(): string[][] {
  const paths: string[][] = []
  const walk = (id: string, acc: string[]) => {
    const chapter = byId.get(id)!
    const next = [...new Set(chapter.choices.map(c => c.next))]
    if (!next.length) { paths.push([...acc, id]); return }
    for (const n of next) walk(n, [...acc, id])
  }
  walk('prologo', [])
  return paths
}

describe('Crônicas: dados da expansão', () => {
  it('30 capítulos novos com 3 escolhas cada = 90 escolhas', () => {
    expect(NEW_CHAPTER_IDS.size).toBe(30)
    const choices = STORY_EXPANSION_CHAPTERS.flatMap(c => c.choices)
    expect(choices).toHaveLength(90)
    for (const c of STORY_EXPANSION_CHAPTERS) if (c.choices.length) expect(c.choices, c.id).toHaveLength(3)
  })

  it('ids únicos e todo destino existe', () => {
    const chapterIds = STORY_CHAPTERS.map(c => c.id)
    expect(new Set(chapterIds).size).toBe(chapterIds.length)
    const choiceIds = STORY_CHAPTERS.flatMap(c => c.choices.map(ch => ch.id))
    expect(new Set(choiceIds).size).toBe(choiceIds.length)
    for (const c of STORY_CHAPTERS) for (const ch of c.choices) expect(byId.has(ch.next), `${c.id} › ${ch.id} › ${ch.next}`).toBe(true)
  })

  it('requisitos usam só os tipos que o motor conhece, com alvos que existem', () => {
    for (const c of STORY_CHAPTERS) {
      const req = c.requirement
      if (!req) continue
      expect(['victories', 'bosses', 'material', 'upgrade', 'region'], c.id).toContain(req.type)
      if ((req.type === 'victories' || req.type === 'region') && req.target) expect(REGION_IDS.has(req.target), `${c.id}: ${req.target}`).toBe(true)
      if (req.type === 'material') expect(MATERIAL_IDS.has(req.target!), `${c.id}: ${req.target}`).toBe(true)
    }
  })

  it('efeitos citam materiais, consumíveis e regiões que existem', () => {
    for (const c of STORY_CHAPTERS) for (const ch of c.choices) for (const e of ch.effects ?? []) {
      const where = `${c.id} › ${ch.id}`
      if (e.k === 'mat' || e.k === 'custoMat') expect(MATERIAL_IDS.has(e.id), `${where}: ${e.id}`).toBe(true)
      if (e.k === 'item') expect(CONSUMABLES.some(i => i.id === e.id), `${where}: ${e.id}`).toBe(true)
      if (e.k === 'dano' || e.k === 'matExtra' || e.k === 'hostil') expect(REGION_IDS.has(e.region), `${where}: ${e.region}`).toBe(true)
    }
  })

  it('as 16 rotas da campanha passam por 24 capítulos novos e todo capítulo é alcançável', () => {
    const paths = allPaths()
    expect(paths).toHaveLength(16)
    for (const path of paths) expect(path.filter(id => NEW_CHAPTER_IDS.has(id))).toHaveLength(24)
    const reached = new Set(paths.flat())
    for (const c of STORY_CHAPTERS) expect(reached.has(c.id), c.id).toBe(true)
  })

  it('toda escolha dos capítulos novos tem efeito real', () => {
    for (const c of STORY_EXPANSION_CHAPTERS) for (const ch of c.choices) expect(ch.effects?.length, `${c.id} › ${ch.id}`).toBeGreaterThan(0)
  })
})

describe('Crônicas: efeitos e tetos', () => {
  it('rejeita token malformado', () => {
    expect(() => parseStoryEffect('ataque')).toThrow()
    expect(() => parseStoryEffect('res:plasma:5')).toThrow()
    expect(() => parseStoryEffect('voar:3')).toThrow()
  })

  it('soma e corta no teto, nos dois sentidos', () => {
    const t = storyTotals(fx(...Array(10).fill('ataque:1'), 'loja:-10', 'loja:-10', 'saque:-30', 'res:fogo:40'))
    expect(t.ataque).toBe(STORY_CAPS.ataque)
    expect(t.loja).toBeCloseTo(-STORY_CAPS.loja / 100)
    expect(t.saque).toBeCloseTo(-STORY_CAPS.saque / 100)
    expect(t.res.fogo).toBeCloseTo(STORY_CAPS.res / 100)
  })

  it('escolhas antigas mantêm os bônus de antes, e as que não faziam nada agora fazem', () => {
    expect(storyModifiers({ storyChoices: { prologo: 'pagamento' } }).reward).toBeCloseTo(0.1)
    expect(storyModifiers({ storyChoices: { predador_lunar: 'trofeu' } }).drop).toBeCloseTo(0.08)
    expect(storyModifiers({ storyChoices: { sinais_lua: 'ritual' } }).forge).toBeCloseTo(0.05)
    expect(storyModifiers({ storyChoices: { forja_runas: 'luz' } }).defense).toBe(1)
    expect(storyModifiers({ storyChoices: { chama_escarlate: 'duelo' } }).chefes).toBe(2)
    expect(storyModifiers({ storyChoices: { mortos_falam: 'romper' } }).res.sombra).toBeCloseTo(0.1)
    expect(storyModifiers({ storyChoices: { mercenario: 'vender' } }).hostil.floresta_lunargenta).toBeCloseTo(0.1)
  })

  it('rótulos em português com a preposição certa de cada região', () => {
    expect(storyEffectLabel(parseStoryEffect('hostil:campos_dourados:10'))).toBe('inimigos das Planícies de Alvora com +10% de vida')
    expect(storyEffectLabel(parseStoryEffect('dano:terras_mortas:10'))).toBe('+10% de dano nas Terras de Morvath')
    expect(storyEffectLabel(parseStoryEffect('loja:-5'))).toBe('5% de desconto na Loja')
    expect(storyEffectLabel(parseStoryEffect('custoMat:runa_ana:5'))).toBe('entrega Runa Anã ×5')
  })
})

describe('Crônicas: escolher aplica efeitos e cobra custos', () => {
  beforeEach(() => {
    useGame.getState().newGame('guerreiro')
    useGame.setState({ tourStep: undefined } as any)
  })

  it('recusa quando falta ouro e aplica tudo quando dá para pagar', () => {
    // N05 (diplomacia_goblin): "Contratar os goblins" custa 20 de ouro e dá +2% de esquiva.
    useGame.setState({ storyChapterId: 'diplomacia_goblin', subregionBossesDefeated: ['lunar_bosque'], gold: 5 } as any)
    state().chooseStory('goblins_contratar')
    expect(state().storyChapterId).toBe('diplomacia_goblin')
    useGame.setState({ gold: 50 } as any)
    state().chooseStory('goblins_contratar')
    expect(state().storyChapterId).toBe('reflexo_que_mente')
    expect(state().gold).toBe(30)
    expect(storyModifiers(state()).esquiva).toBeCloseTo(0.02)
  })

  it('entrega material, dá consumível, Bênção e título', () => {
    // N10: resgatar os mineiros entrega 6 Minério Cinzento e dá vida, Bênção.
    useGame.setState({ storyChapterId: 'os_que_nao_voltaram', materials: { minerio_cinzento: 7 }, protectionBlessings: 0 } as any)
    state().chooseStory('mina_resgatar')
    expect(state().materials.minerio_cinzento).toBe(1)
    expect(state().protectionBlessings).toBe(1)
    // N01: filtrar o poço dá 2 Poções de Cura.
    useGame.setState({ storyChapterId: 'agua_que_brilha', subregionVictories: { campos_estrada: 8 }, inventory: {} } as any)
    state().chooseStory('poco_filtrar')
    expect(state().inventory.pocao_cura).toBe(2)
    // N12: selar o cofre dá título.
    useGame.setState({ storyChapterId: 'cofre_dos_reis', materials: { runa_ana: 5 } } as any)
    state().chooseStory('cofre_selar')
    expect(state().storyFlags).toContain('titulo:Guardião do Cofre')
  })
})

describe('Crônicas: ganchos no jogo', () => {
  beforeEach(() => { useGame.getState().newGame('guerreiro') })

  it('Steelmere continua aberto depois que a Crônica segue para lá', () => {
    expect(worldUnlocked(state(), 'steelmere')).toBe(false)
    useGame.setState({ storyChoices: { coracao: 'selar' }, storyChapterId: 'rota_inexistente' } as any)
    expect(worldUnlocked(state(), 'steelmere')).toBe(true)
    useGame.setState({ storyChoices: {}, storyChapterId: 'caldeira_no_vermelho' } as any)
    expect(worldUnlocked(state(), 'steelmere')).toBe(true)
  })

  it('hostilidade regional dá mais vida ao inimigo', () => {
    const enemy = { vida: 100 } as any
    expect(applyStoryHostility(enemy, 0.1).vida).toBe(110)
    expect(applyStoryHostility(enemy, 0)).toBe(enemy)
  })

  it('desconto e acréscimo na Loja mudam o preço de compra', () => {
    expect(shopBuyPrice(100, { storyChoices: { espantalho_de_valedouro: 'barao_devolver' } })).toBe(95)
    expect(shopBuyPrice(100, { storyChoices: { agua_que_brilha: 'poco_engarrafar' } })).toBe(105)
    expect(shopBuyPrice(100, { storyChoices: {} })).toBe(100)
  })

  it('bônus de cura das poções entra no valor efetivo', () => {
    const potion = CONSUMABLES.find(c => c.id === 'pocao_cura')!
    const base = consumableEffectiveValue(potion, state())
    useGame.setState({ storyChoices: { agua_que_brilha: 'poco_filtrar', reflexo_que_mente: 'espelho_colher' } } as any)
    expect(consumableEffectiveValue(potion, state())).toBe(Math.round(base * 1.2))
  })

  it('reputação extra da Guilda vale a partir das próximas entregas', () => {
    const mission = GUILD_MISSIONS.find(m => m.tipo === 'any' && m.recompensa.tipo === 'gold')!
    useGame.setState({ storyChoices: { selos_de_latao: 'latao_relatorio' }, guildAccepted: [mission.id], guildProgress: { [mission.id]: mission.quantidade } } as any)
    const before = guildReputation(state())
    state().claimGuildMission(mission.id)
    expect(state().guildRepBonus).toBeCloseTo(mission.dificuldade * 0.1)
    expect(guildReputation(state())).toBe(Math.floor(before + mission.dificuldade * 1.1))
  })
})
