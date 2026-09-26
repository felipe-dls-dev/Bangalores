// Atributos dos equipamentos no modelo Força / Magia / Vigor / Destreza (v0.9.4).
//
// O catálogo continua escrito no formato antigo (`ataque`, `defesa`, `vida`): esses três números são o ORÇAMENTO da peça,
// e é por eles que o balanceamento por raridade (nível mínimo, raridade e preço, em store/game.ts) ordena cada grupo. Este
// módulo transforma esse orçamento nos atributos novos conforme o ESTILO da peça:
//
//   ataque  -> Força ou Magia. Peça de classe tem ESCOLA fixa (espada dá Força, cajado dá Magia, até em outra classe);
//              peça universal (sem classe dona) é ADAPTÁVEL: vale para o atributo de ataque de quem veste
//   vida    -> Vigor + Vida, sem mudar a Vida total (1 Vigor = 2 de Vida, e ainda dá resistência a elementos e efeitos)
//   defesa  -> Armadura, inteira
//   raridade-> afixos somados à peça: Vigor, Destreza, Energia ou Esquiva, conforme o estilo (raro 1, épico 2, lendário 3)
//
// Por que a Armadura não é trocada por nada: na simulação de campanhas a mitigação dos heróis fica bem abaixo do ataque dos
// inimigos (nível 40: mitigação 8–21 contra ataque 26–42), a parte da curva em que cada ponto de Armadura evita 1,2–1,5 de
// dano POR GOLPE. Nessa faixa um ponto de Armadura vale muito mais do que 2 de Vida ou meio ponto de esquiva, e qualquer troca
// "pelo mesmo valor" deixaria o jogo mais difícil. Os atributos novos entram como afixos pequenos, por cima.
//
// Tudo aqui é dado puro + contas: sem estado do jogo. Os números moram em EQUIPMENT_ATTRIBUTE_RULES.

import type { Equipment, Rarity, Slot } from '../types'
import { HERO_STAT_PROFILES, heroStatProfile, primaryOffense } from './heroStatProfiles'

/** Atributos que um equipamento pode dar. `esquiva` em pontos percentuais (3 = +3% de chance de esquiva). */
export interface ItemStats {
  forca: number
  magia: number
  vigor: number
  destreza: number
  armadura: number
  vida: number
  energia: number
  esquiva: number
}
export type ItemStatKey = keyof ItemStats
export const ITEM_STAT_KEYS: readonly ItemStatKey[] = ['forca', 'magia', 'vigor', 'destreza', 'armadura', 'vida', 'energia', 'esquiva']
export const ITEM_STAT_LABELS: Record<ItemStatKey, string> = { forca: 'Força', magia: 'Magia', vigor: 'Vigor', destreza: 'Destreza', armadura: 'Armadura', vida: 'Vida', energia: 'Energia', esquiva: 'Esquiva' }
export const ITEM_STAT_SHORT: Record<ItemStatKey, string> = { forca: 'FOR', magia: 'MAG', vigor: 'VIG', destreza: 'DES', armadura: 'ARM', vida: 'VIDA', energia: 'EN', esquiva: 'ESQ' }

export const emptyItemStats = (): ItemStats => ({ forca: 0, magia: 0, vigor: 0, destreza: 0, armadura: 0, vida: 0, energia: 0, esquiva: 0 })
export function addItemStats(...parts: Array<Partial<ItemStats> | undefined>): ItemStats {
  const out = emptyItemStats()
  for (const part of parts) if (part) for (const key of ITEM_STAT_KEYS) out[key] += Number(part[key] ?? 0) || 0
  return out
}

/**
 * forca/magia: escola fixa da peça (armas e peças de classe). adaptavel: peça universal, o ataque vai para o atributo de
 * ataque de quem veste (Força, Magia, ou os dois no Monge), como sempre foi.
 *
 * Por que as universais não têm escola fixa: na simulação, com escola por tema, Druida, Sacerdotisa e Conjurador perderam
 * até 45% do ataque de equipamento nos níveis 1–17 (as armas universais de começo de jogo são todas físicas e eram a melhor
 * opção deles), e a Arcanista foi de 47 para 71 mortes por campanha.
 */
export type OffenseSchool = 'forca' | 'magia' | 'adaptavel'
/**
 * O estilo decide quanto da Vida vira Vigor e quais afixos a raridade traz:
 * pesado  placas, escudos pesados, machados e martelos (Guardião): Vigor
 * medio   malha, escudos leves e espadas (Guerreiro): Vigor, Destreza e Energia
 * furtivo couro, capuzes, broquéis, facas e adagas (Ladino): Destreza e Esquiva
 * cacador trajes de caça, aljavas, arcos e balestras (Caçador): Destreza e Esquiva
 * leve    trajes de monge e manoplas: Destreza e Energia
 * arcano  vestes e diademas arcanos, grimórios, orbes, totens (Mago, Conjurador): Energia
 * natural vestimentas, pergaminhos e cajados druídicos: Vigor e Energia
 * sagrado vestes vitais e cetros (Sacerdotisa): Vigor e Energia
 * joia    anéis e amuletos: pelo tema (vida -> Vigor, agilidade -> Destreza, mente -> Energia, névoa -> Esquiva)
 */
export type EquipmentStyle = 'pesado' | 'medio' | 'furtivo' | 'cacador' | 'leve' | 'arcano' | 'natural' | 'sagrado' | 'joia'
export type AffixStat = 'vigor' | 'destreza' | 'energia' | 'esquiva'

export const STYLE_LABELS: Record<EquipmentStyle, string> = {
  pesado: 'Pesado', medio: 'Médio', furtivo: 'Furtivo', cacador: 'De caça', leve: 'Leve', arcano: 'Arcano', natural: 'Natural', sagrado: 'Sagrado', joia: 'Joia',
}

interface StyleRule {
  /** Fração da Vida que vira Vigor (a Vida total não muda: 2 de Vida por ponto de Vigor). */
  vidaEmVigor: number
  /** Afixos de raridade, em ordem de preferência (o item escolhe a partir de um deslocamento fixo pelo id). */
  afixos: AffixStat[]
}

export const EQUIPMENT_ATTRIBUTE_RULES = {
  /**
   * Quanto vale um ponto de cada atributo no Índice de comparação (`equipmentStatScore`), na régua do orçamento de inimigos:
   * 1 de ataque = 1 de Armadura = 2 de Vida; Vigor = 2 de Vida. Também dá o tamanho de cada afixo (valor ÷ peso).
   */
  valor: { forca: 1, magia: 1, armadura: 1, vida: 0.5, vigor: 1, destreza: 0.4, energia: 1, esquiva: 0.5 } as Record<ItemStatKey, number>,
  /** Quantos afixos a peça ganha pela raridade. Comum e incomum ficam como eram (o começo do jogo não muda). */
  afixosPorRaridade: { comum: 0, incomum: 0, raro: 1, epico: 2, lendario: 3, mitico: 3, heroico: 3 } as Record<Rarity, number>,
  /** Valor de cada afixo pelo nível mínimo da peça: base + nível × porNivel (nível 17 ≈ 0,6; 58 ≈ 1,3; 100 ≈ 2). */
  valorDoAfixo: { base: 0.3, porNivel: 1 / 60 },
  estilos: {
    pesado: { vidaEmVigor: 1, afixos: ['vigor', 'energia', 'vigor'] },
    medio: { vidaEmVigor: 1, afixos: ['vigor', 'destreza', 'energia'] },
    furtivo: { vidaEmVigor: 0.5, afixos: ['destreza', 'esquiva', 'energia'] },
    cacador: { vidaEmVigor: 0.5, afixos: ['destreza', 'esquiva', 'vigor'] },
    leve: { vidaEmVigor: 0.5, afixos: ['destreza', 'energia', 'vigor'] },
    arcano: { vidaEmVigor: 0.5, afixos: ['energia', 'vigor', 'esquiva'] },
    natural: { vidaEmVigor: 1, afixos: ['vigor', 'energia', 'destreza'] },
    sagrado: { vidaEmVigor: 1, afixos: ['vigor', 'energia', 'vigor'] },
    joia: { vidaEmVigor: 0.5, afixos: ['vigor', 'destreza', 'energia'] },
  } as Record<EquipmentStyle, StyleRule>,
}

/** Perfil fixo de uma peça (calculado uma vez ao montar o catálogo). */
export interface EquipmentAttributeProfile {
  estilo: EquipmentStyle
  escola: OffenseSchool
  /** Afixos de raridade, na ordem em que são aplicados (pode repetir: o mesmo afixo duas vezes soma). */
  afixos: AffixStat[]
  /** Nível mínimo usado para o tamanho dos afixos. */
  nivel: number
}

// ---------------------------------------------------------------------------------------------
// Classificação: estilo e escola
// ---------------------------------------------------------------------------------------------
const norm = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const STYLE_BY_TYPE: Record<string, EquipmentStyle> = {
  armadura_pesada: 'pesado', elmo_pesado: 'pesado', grevas_pesadas: 'pesado', botas_pesadas: 'pesado', escudo_pesado: 'pesado',
  armadura_media: 'medio', elmo_guerreiro: 'medio', grevas_medias: 'medio', botas_medias: 'medio', escudo_leve: 'medio',
  traje_furtivo: 'furtivo', capuz_mascara: 'furtivo', perneiras_furtivas: 'furtivo', botas_furtivas: 'furtivo', broquel: 'furtivo', facas: 'furtivo', adaga: 'furtivo',
  traje_cacador: 'cacador', aljava: 'cacador', arco: 'cacador', balestra: 'cacador',
  traje_leve: 'leve', manopla: 'leve',
  veste_arcana: 'arcano', diadema_arcano: 'arcano', perneiras_arcanas: 'arcano', botas_arcanas: 'arcano', grimorio: 'arcano', totem_invocacao: 'arcano',
  vestimenta_natural: 'natural', pergaminho: 'natural', cajado_natureza: 'natural',
  veste_vital: 'sagrado', cetro_sagrado: 'sagrado',
}

const STYLE_BY_CLASS: Record<string, EquipmentStyle> = {
  guerreiro: 'medio', guardiao: 'pesado', cacadora: 'furtivo', cacador: 'cacador', monge: 'leve',
  arcanista: 'arcano', conjurador: 'arcano', druida: 'natural', sacerdotisa: 'sagrado',
}

// Peças sem tipo e sem classe (o acervo universal): o nome decide.
const NAME_STYLES: Array<[RegExp, EquipmentStyle]> = [
  [/\b(arco|balestra|aljava)\b/, 'cacador'],
  [/\b(facas?|adaga|katana|garras|folha da sombra|capuz|couro|batedor|nevoa|sombras?|broquel)\b/, 'furtivo'],
  [/\b(manoplas?|punho)\b/, 'leve'],
  [/\b(orbe|bastao|grimorio|tomo|livro|mosquete|esfera|ampulheta|jaula|lanterna|relicario)\b/, 'arcano'],
  [/\b(folhas? da vida|alma da floresta|selo da natureza|idolo|totem)\b/, 'natural'],
  [/\b(sagrad\w*|justo)\b/, 'sagrado'],
  [/\b(machado|martelo|espadona|glaive|foice|tridente|exterminador|baluarte|muro|cota|escamas|grevas|avalanche|coroa dos espinhos)\b/, 'pesado'],
]

const OFFENSE_OWNERS = (e: Equipment, owner?: string): string[] => {
  if (e.classeExclusiva) return Array.isArray(e.classeExclusiva) ? e.classeExclusiva : [e.classeExclusiva]
  return owner ? [owner] : []
}

export function equipmentStyle(e: Equipment, owner?: string): EquipmentStyle {
  if (e.tipoEquipamento && STYLE_BY_TYPE[e.tipoEquipamento]) return STYLE_BY_TYPE[e.tipoEquipamento]
  const owners = OFFENSE_OWNERS(e, owner)
  if (e.slot === 'amuleto' || e.slot === 'anel_1' || e.slot === 'anel_2') return 'joia'
  const name = norm(e.nome)
  // Armas e peças de classe: o nome ainda pode refinar (ex.: o Guerreiro usa espada, o Guardião machado e martelo).
  if (e.slot === 'mao_direita') {
    for (const [pattern, style] of NAME_STYLES) if (pattern.test(name)) return style
    if (owners.length) return STYLE_BY_CLASS[owners[0]] ?? 'medio'
    return 'medio'
  }
  if (owners.length) return STYLE_BY_CLASS[owners[0]] ?? 'medio'
  for (const [pattern, style] of NAME_STYLES) if (pattern.test(name)) return style
  return 'medio'
}

/** Escola da peça: a da classe dona (todas as donas com a mesma escola); sem dona, ou donas de escolas diferentes, adaptável. */
export function equipmentSchool(e: Equipment, owner?: string): OffenseSchool {
  const owners = OFFENSE_OWNERS(e, owner).filter((id) => HERO_STAT_PROFILES[id])
  if (!owners.length) return 'adaptavel'
  const schools = new Set(owners.map((id) => primaryOffense(heroStatProfile(id))))
  return schools.size === 1 ? [...schools][0] : 'adaptavel'
}

// Afixos das joias pelo tema; as demais peças usam a lista do estilo.
const JEWEL_AFFIX_THEMES: Array<[RegExp, AffixStat[]]> = [
  [/\b(agilidade|ladino|precisao|passo|predador|garra|corvo|fauna|viajante|raposa)\b/, ['destreza', 'esquiva', 'vigor']],
  [/\b(nevoa|sombra|sussurro|vazio|mundos|noite)\b/, ['esquiva', 'destreza', 'energia']],
  [/\b(mente|sabedoria|arcanista|conhecimento|tempo|memoria|clareza|estel\w*|cosmic\w*|ascensao|eter\w*|transcendencia|criador|devocao|destino|signo|luz)\b/, ['energia', 'vigor', 'destreza']],
  [/\b(vida|vitalidade|coracao|seiva|orvalho|imortalidade|resiliencia|troll|druida|perene|fortaleza|guardiao|protecao|ancoragem|escudo|divina|indomavel|essencia|alma)\b/, ['vigor', 'energia', 'destreza']],
]

/** Número estável (0..n) a partir do id, para variar os afixos entre peças do mesmo estilo sem sorteio. */
function stableIndex(id: string, n: number): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return n > 0 ? hash % n : 0
}

export function equipmentAffixes(e: Equipment, style: EquipmentStyle): AffixStat[] {
  const count = EQUIPMENT_ATTRIBUTE_RULES.afixosPorRaridade[e.raridade ?? 'comum'] ?? 0
  if (count <= 0) return []
  const pool = EQUIPMENT_ATTRIBUTE_RULES.estilos[style].afixos
  if (style === 'joia') {
    // Joia com tema segue o tema; sem tema, varia pelo id (o estilo "joia" não tem assinatura própria).
    const themed = JEWEL_AFFIX_THEMES.find(([pattern]) => pattern.test(norm(e.nome)))
    const list = themed?.[1] ?? pool
    const start = themed ? 0 : stableIndex(e.id, list.length)
    return Array.from({ length: count }, (_, i) => list[(start + i) % list.length])
  }
  // O primeiro afixo é sempre a assinatura do estilo (Vigor no pesado, Destreza no furtivo, Energia no arcano...); os
  // seguintes variam entre as outras opções pelo id, para peças do mesmo estilo não saírem todas iguais.
  const rest = pool.slice(1)
  const start = stableIndex(e.id, rest.length)
  return Array.from({ length: count }, (_, i) => (i === 0 ? pool[0] : rest[(start + i - 1) % rest.length]))
}

export function buildEquipmentAttributeProfile(e: Equipment, owner?: string): EquipmentAttributeProfile {
  const estilo = equipmentStyle(e, owner)
  return { estilo, escola: equipmentSchool(e, owner), afixos: equipmentAffixes(e, estilo), nivel: Math.max(1, e.nivelMinimo ?? 1) }
}

// ---------------------------------------------------------------------------------------------
// Conversão do orçamento antigo nos atributos novos
// ---------------------------------------------------------------------------------------------
export function affixValue(level: number): number {
  const { base, porNivel } = EQUIPMENT_ATTRIBUTE_RULES.valorDoAfixo
  return base + Math.max(1, level) * porNivel
}

/** Quantos pontos de um afixo a peça dá no nível dado (sempre pelo menos 1). */
export function affixAmount(stat: AffixStat, level: number): number {
  return Math.max(1, Math.round(affixValue(level) / EQUIPMENT_ATTRIBUTE_RULES.valor[stat]))
}

/**
 * Converte o orçamento antigo (já com a variação da classe e a penalidade de afinidade) nos atributos novos. O ataque vai
 * inteiro para a escola da peça, a Armadura fica inteira, a Vida total nunca muda (parte vira Vigor) e os afixos da raridade
 * somam por cima.
 */
export function convertLegacyEquipmentStats(profile: EquipmentAttributeProfile, legacy: { ataque?: number; defesa?: number; vida?: number }, wearerId?: string): ItemStats {
  const style = EQUIPMENT_ATTRIBUTE_RULES.estilos[profile.estilo]
  const A = Math.max(0, Math.round(Number(legacy.ataque) || 0))
  const D = Math.max(0, Math.round(Number(legacy.defesa) || 0))
  const V = Math.max(0, Math.round(Number(legacy.vida) || 0))
  const out = emptyItemStats()
  for (const key of schoolTargets(profile.escola, wearerId)) out[key] += A
  out.armadura += D
  const vigorFromLife = Math.floor((V * style.vidaEmVigor) / 2)
  out.vigor += vigorFromLife
  out.vida += V - vigorFromLife * 2
  for (const stat of profile.afixos) out[stat] += affixAmount(stat, profile.nivel)
  return out
}

/** Para onde vai o ataque da peça: a escola fixa, ou (adaptável) o atributo de ataque de quem veste. */
export function schoolTargets(school: OffenseSchool, wearerId?: string): Array<'forca' | 'magia'> {
  if (school !== 'adaptavel') return [school]
  const type = heroStatProfile(wearerId).ataqueBasico
  return type === 'fisico' ? ['forca'] : type === 'magico' ? ['magia'] : ['forca', 'magia']
}

/** Os atributos explícitos escritos no próprio item (itens novos podem dispensar o formato antigo). */
export function explicitEquipmentStats(e: Equipment): ItemStats {
  return {
    forca: e.forca ?? 0,
    magia: e.magia ?? 0,
    vigor: e.vigor ?? 0,
    destreza: e.destreza ?? 0,
    armadura: e.armadura ?? 0,
    vida: e.vidaMaxima ?? 0,
    energia: e.energia ?? 0,
    esquiva: e.esquiva ?? 0,
  }
}

// ---------------------------------------------------------------------------------------------
// Índice de comparação (quanto a peça vale PARA uma classe)
// ---------------------------------------------------------------------------------------------
/** Peso de Força e Magia para a classe: a que alimenta o ataque vale inteira; a outra quase nada. */
export function offenseWeights(heroId?: string): { forca: number; magia: number } {
  const type = heroStatProfile(heroId).ataqueBasico
  if (type === 'fisico') return { forca: 1, magia: 0.1 }
  if (type === 'magico') return { forca: 0.1, magia: 1 }
  return { forca: 1, magia: 0.6 }
}

/**
 * Quanto do ataque da peça vale para a classe. No híbrido (Monge) o ataque usa o MAIOR entre Força e Magia, então uma peça
 * adaptável (que dá os dois) conta uma vez só.
 */
export function offenseScore(stats: ItemStats, heroId?: string): number {
  const w = offenseWeights(heroId)
  if (heroStatProfile(heroId).ataqueBasico === 'hibrido') return Math.max(stats.forca * w.forca, stats.magia * w.magia)
  return stats.forca * w.forca + stats.magia * w.magia
}

/** Valor da peça para a classe, na régua do orçamento (1 de ataque = 1 de Armadura = 2 de Vida). */
export function equipmentStatScore(stats: ItemStats, heroId?: string): number {
  const value = EQUIPMENT_ATTRIBUTE_RULES.valor
  const profile = heroStatProfile(heroId)
  // A Destreza escala a habilidade da Caçadora e do Caçador: vale mais para eles.
  const dex = value.destreza * (profile.habilidade.atributoEscala === 'destreza' ? 1.6 : 1)
  return (
    offenseScore(stats, heroId) + stats.armadura * value.armadura + stats.vida * value.vida +
    stats.vigor * value.vigor + stats.destreza * dex + stats.energia * value.energia + stats.esquiva * value.esquiva
  )
}

/** "Força +5 • Destreza +3 • Esquiva +2%": só o que não é zero, na ordem fixa dos atributos. */
export function formatItemStats(stats: ItemStats, detail?: Partial<Record<ItemStatKey, string>>): string {
  const parts = ITEM_STAT_KEYS.filter((key) => stats[key]).map((key) => `${ITEM_STAT_LABELS[key]} ${stats[key] > 0 ? '+' : '−'}${Math.abs(stats[key])}${key === 'esquiva' ? '%' : ''}${detail?.[key] ?? ''}`)
  return parts.length ? parts.join(' • ') : 'Sem atributos'
}

/** Versão compacta para os slots: "FOR +5 • DES +3 • ARM +4". */
export function formatItemStatsShort(stats: ItemStats): string {
  const parts = ITEM_STAT_KEYS.filter((key) => stats[key]).map((key) => `${ITEM_STAT_SHORT[key]} ${stats[key] > 0 ? '+' : '−'}${Math.abs(stats[key])}${key === 'esquiva' ? '%' : ''}`)
  return parts.length ? parts.join(' • ') : '—'
}

/** Slots de joia (sem estilo de armadura). */
export const JEWEL_SLOTS: readonly Slot[] = ['amuleto', 'anel_1', 'anel_2']
