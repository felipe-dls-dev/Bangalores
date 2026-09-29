import { FORGE_MATERIALS, REGION_MATERIALS } from '../data/expansion'
import type { StoryEffect } from '../data/storyEffects'
import { CONSUMABLES, TERRITORIES } from '../store/game'

// Textos em português dos efeitos das escolhas das Crônicas (mesmas frases do docs/STORY_CHOICES_EXPANSION.md).

// Preposição + artigo de cada região: [em, de]. Região sem entrada cai em "em"/"de" + nome.
const PREP: Record<string, [string, string]> = {
  campos_dourados: ['nas', 'das'], floresta_lunargenta: ['na', 'da'], montanhas_cinzentas: ['na', 'da'], khar_dur: ['em', 'de'],
  pico_escarlate: ['no', 'do'], terras_mortas: ['nas', 'das'], coracao_eclipse: ['no', 'do'], frostgard: ['nos', 'dos'],
  engrenverde: ['no', 'do'], trilhouro: ['nos', 'dos'], vulcannis: ['na', 'da'], ferrujal: ['no', 'do'], coroferro: ['na', 'da'], aetherium: ['no', 'do'],
}
const ELEMENT_NAMES: Record<string, string> = { fisico: 'físico', fogo: 'fogo', gelo: 'gelo', natureza: 'natureza', sombra: 'sombra', luz: 'luz', arcano: 'arcano' }

const regionName = (id: string) => TERRITORIES.find(t => t.id === id)?.nome ?? id
const inRegion = (id: string) => `${PREP[id]?.[0] ?? 'em'} ${regionName(id)}`
const ofRegion = (id: string) => `${PREP[id]?.[1] ?? 'de'} ${regionName(id)}`

export function storyMaterialName(id: string): string {
  return Object.values(REGION_MATERIALS).find(m => m.id === id)?.nome ?? FORGE_MATERIALS.find(m => m.id === id)?.nome ?? id
}

const signed = (v: number) => (v > 0 ? `+${v}` : `−${Math.abs(v)}`)

export function storyEffectLabel(e: StoryEffect): string {
  switch (e.k) {
    case 'ouro': return `${signed(e.v)} de ouro`
    case 'custoOuro': return `−${e.v} de ouro`
    case 'mat': return `${storyMaterialName(e.id)} ×${e.v}`
    case 'custoMat': return `entrega ${storyMaterialName(e.id)} ×${e.v}`
    case 'item': return `${CONSUMABLES.find(c => c.id === e.id)?.nome ?? e.id} ×${e.v}`
    case 'bencao': return e.v === 1 ? '+1 Bênção de Proteção' : `+${e.v} Bênçãos de Proteção`
    case 'titulo': return `título "${e.nome}"`
    case 'ataque': return `${signed(e.v)} de ataque`
    case 'vigor': return `${signed(e.v)} Vigor`
    case 'destreza': return `${signed(e.v)} Destreza`
    case 'vida': return `${signed(e.v)} de vida máxima`
    case 'energia': return `${signed(e.v)} de Energia máxima`
    case 'crit': return `${signed(e.v)}% de crítico`
    case 'esquiva': return `${signed(e.v)}% de esquiva`
    case 'chefes': return `${signed(e.v)} de dano contra chefes`
    case 'ouroPct': return `${signed(e.v)}% de ouro por vitória`
    case 'saque': return `${signed(e.v)}% de chance de espólio`
    case 'forja': return `${signed(e.v)}% de sucesso na Forja`
    case 'xp': return `${signed(e.v)}% de XP`
    case 'pocao': return `${signed(e.v)}% de cura das poções`
    case 'loja': return e.v < 0 ? `${Math.abs(e.v)}% de desconto na Loja` : `+${e.v}% nos preços da Loja`
    case 'guilda': return `${signed(e.v)}% de reputação na Guilda`
    case 'masmorra': return `${signed(e.v)}% de ouro e XP nas Masmorras`
    case 'supremo': return `${signed(e.v)}% de carga do Golpe Supremo`
    case 'res': return `${signed(e.v)}% de resistência a ${ELEMENT_NAMES[e.el] ?? e.el}`
    case 'dano': return `${signed(e.v)}% de dano ${inRegion(e.region)}`
    case 'matExtra': return `${signed(e.v)}% de chance de material extra ${inRegion(e.region)}`
    case 'hostil': return `inimigos ${ofRegion(e.region)} com +${e.v}% de vida`
  }
}
