// Efeitos das escolhas das Crônicas (docs/STORY_CHOICES_EXPANSION.md).
//
// Cada escolha lista seus efeitos como tokens curtos ("ataque:1", "hostil:khar_dur:10", "custoOuro:20"),
// o mesmo vocabulário do documento de design, lidos uma vez ao carregar os dados. Percentuais são escritos
// em pontos inteiros (10 = 10%) e viram fração em `storyTotals`.
//
// Três famílias:
//  - imediatos: aplicados uma vez por chooseStory (ouro, material, consumível, Bênção, título);
//  - custos: cobrados por chooseStory, que recusa a escolha se não der para pagar (custoOuro, custoMat);
//  - permanentes: somados de todas as escolhas feitas e cortados em STORY_CAPS (storyTotals).

export type StoryElement = 'fisico' | 'fogo' | 'gelo' | 'natureza' | 'sombra' | 'luz' | 'arcano'
const ELEMENTS: readonly StoryElement[] = ['fisico', 'fogo', 'gelo', 'natureza', 'sombra', 'luz', 'arcano']

/** Bônus permanentes de valor único (sem alvo). */
export type StoryStat =
  | 'ataque' | 'vigor' | 'destreza' | 'vida' | 'energia' | 'crit' | 'esquiva' | 'chefes'
  | 'ouroPct' | 'saque' | 'forja' | 'xp' | 'pocao' | 'loja' | 'guilda' | 'masmorra' | 'supremo'
const STATS: readonly StoryStat[] = ['ataque', 'vigor', 'destreza', 'vida', 'energia', 'crit', 'esquiva', 'chefes', 'ouroPct', 'saque', 'forja', 'xp', 'pocao', 'loja', 'guilda', 'masmorra', 'supremo']
/** Estes são percentuais (o token traz pontos inteiros); os demais são valores absolutos. */
const PERCENT_STATS: ReadonlySet<StoryStat> = new Set(['crit', 'esquiva', 'ouroPct', 'saque', 'forja', 'xp', 'pocao', 'loja', 'guilda', 'masmorra', 'supremo'])

export type StoryEffect =
  | { k: 'ouro' | 'bencao' | 'custoOuro'; v: number }
  | { k: 'mat' | 'item' | 'custoMat'; id: string; v: number }
  | { k: 'titulo'; nome: string }
  | { k: StoryStat; v: number }
  | { k: 'res'; el: StoryElement; v: number }
  | { k: 'dano' | 'matExtra' | 'hostil'; region: string; v: number }

/**
 * Teto de cada bônus permanente (em pontos; percentuais em pontos inteiros). A soma de todas as escolhas é cortada aqui,
 * nos dois sentidos: um caminho especializado não passa do teto, e custos acumulados não passam do teto negativo.
 */
export const STORY_CAPS: Record<StoryStat | 'res' | 'dano' | 'matExtra' | 'hostil', number> = {
  ataque: 6, vigor: 6, destreza: 2, vida: 40, energia: 2, crit: 10, esquiva: 6, chefes: 6,
  ouroPct: 35, saque: 20, forja: 20, xp: 15, pocao: 30, loja: 15, guilda: 25, masmorra: 20, supremo: 25,
  res: 25, dano: 20, matExtra: 30, hostil: 30,
}

function num(raw: string | undefined, token: string): number {
  const v = Number(raw)
  if (raw === undefined || raw === '' || !Number.isFinite(v)) throw new Error(`Efeito de história inválido: "${token}"`)
  return v
}

/** Lê um token de efeito. Lança erro em token malformado: os dados das Crônicas são validados na carga e nos testes. */
export function parseStoryEffect(token: string): StoryEffect {
  const [k, a, b] = token.split(':')
  switch (k) {
    case 'ouro': case 'bencao': case 'custoOuro':
      return { k, v: num(a, token) }
    case 'mat': case 'item': case 'custoMat':
      if (!a) throw new Error(`Efeito de história inválido: "${token}"`)
      return { k, id: a, v: num(b, token) }
    case 'titulo':
      if (!a) throw new Error(`Efeito de história inválido: "${token}"`)
      return { k, nome: token.slice('titulo:'.length) }
    case 'res':
      if (!ELEMENTS.includes(a as StoryElement)) throw new Error(`Elemento inválido em "${token}"`)
      return { k, el: a as StoryElement, v: num(b, token) }
    case 'dano': case 'matExtra': case 'hostil':
      if (!a) throw new Error(`Efeito de história inválido: "${token}"`)
      return { k, region: a, v: num(b, token) }
    default:
      if (STATS.includes(k as StoryStat)) return { k: k as StoryStat, v: num(a, token) }
      throw new Error(`Efeito de história desconhecido: "${token}"`)
  }
}

/** Atalho dos dados: fx('ataque:1', 'custoOuro:20'). */
export const fx = (...tokens: string[]): StoryEffect[] => tokens.map(parseStoryEffect)

/** Efeitos que são custo: pagamentos, entregas, bônus negativos, preço maior na Loja e hostilidade regional. */
export function isStoryCost(effect: StoryEffect): boolean {
  if (effect.k === 'custoOuro' || effect.k === 'custoMat' || effect.k === 'hostil') return true
  if (effect.k === 'loja') return effect.v > 0
  return 'v' in effect && effect.v < 0
}

export interface StoryTotals {
  /** Valores absolutos. */
  ataque: number; vigor: number; destreza: number; vida: number; energia: number; chefes: number
  /** Frações (0,1 = 10%). `loja` negativo é desconto. */
  crit: number; esquiva: number; ouroPct: number; saque: number; forja: number; xp: number; pocao: number
  loja: number; guilda: number; masmorra: number; supremo: number
  res: Partial<Record<StoryElement, number>>
  dano: Record<string, number>
  matExtra: Record<string, number>
  hostil: Record<string, number>
}

const clampTo = (value: number, cap: number) => Math.max(-cap, Math.min(cap, value))

/** Soma bruta (em pontos, sem teto) dos efeitos permanentes. */
export function storyRawTotals(effects: readonly StoryEffect[]) {
  const stats = Object.fromEntries(STATS.map(stat => [stat, 0])) as Record<StoryStat, number>
  const res: Partial<Record<StoryElement, number>> = {}
  const dano: Record<string, number> = {}, matExtra: Record<string, number> = {}, hostil: Record<string, number> = {}
  for (const e of effects) {
    if (e.k === 'res') res[e.el] = (res[e.el] ?? 0) + e.v
    else if (e.k === 'dano') dano[e.region] = (dano[e.region] ?? 0) + e.v
    else if (e.k === 'matExtra') matExtra[e.region] = (matExtra[e.region] ?? 0) + e.v
    else if (e.k === 'hostil') hostil[e.region] = (hostil[e.region] ?? 0) + e.v
    else if (STATS.includes(e.k as StoryStat)) stats[e.k as StoryStat] += (e as { v: number }).v
  }
  return { stats, res, dano, matExtra, hostil }
}

/** Bônus permanentes da história já com teto, em valores prontos para o jogo (percentuais como fração). */
export function storyTotals(effects: readonly StoryEffect[]): StoryTotals {
  const raw = storyRawTotals(effects)
  const out = {} as StoryTotals
  for (const stat of STATS) {
    const capped = clampTo(raw.stats[stat], STORY_CAPS[stat])
    ;(out as unknown as Record<string, number>)[stat] = PERCENT_STATS.has(stat) ? capped / 100 : capped
  }
  const pct = (map: Record<string, number>, cap: number) => Object.fromEntries(Object.entries(map).map(([key, v]) => [key, clampTo(v, cap) / 100]))
  out.res = pct(raw.res, STORY_CAPS.res) as Partial<Record<StoryElement, number>>
  out.dano = pct(raw.dano, STORY_CAPS.dano)
  out.matExtra = pct(raw.matExtra, STORY_CAPS.matExtra)
  out.hostil = pct(raw.hostil, STORY_CAPS.hostil)
  return out
}

/** Totais já com teto de volta ao formato de efeito (percentuais em pontos), para listar "o que a história te deu". */
export function storyTotalsAsEffects(t: StoryTotals): StoryEffect[] {
  const out: StoryEffect[] = []
  const points = (v: number, percent: boolean) => (percent ? Math.round(v * 100) : v)
  for (const stat of STATS) {
    const v = points((t as unknown as Record<string, number>)[stat], PERCENT_STATS.has(stat))
    if (v) out.push({ k: stat, v })
  }
  for (const [el, v] of Object.entries(t.res)) if (v) out.push({ k: 'res', el: el as StoryElement, v: points(v, true) })
  for (const k of ['dano', 'matExtra', 'hostil'] as const) for (const [region, v] of Object.entries(t[k])) if (v) out.push({ k, region, v: points(v, true) })
  return out
}

/**
 * O bônus já não soma nada porque o total bruto está no teto? Usado para avisar "teto atingido" no botão da escolha.
 * Custos nunca "batem no teto" aqui.
 */
export function storyEffectCapped(effect: StoryEffect, current: ReturnType<typeof storyRawTotals>): boolean {
  if (isStoryCost(effect) || !('v' in effect)) return false
  if (effect.k === 'res') return (current.res[effect.el] ?? 0) >= STORY_CAPS.res
  if (effect.k === 'dano' || effect.k === 'matExtra') return (current[effect.k][effect.region] ?? 0) >= STORY_CAPS[effect.k]
  if (!STATS.includes(effect.k as StoryStat)) return false
  const stat = effect.k as StoryStat
  // O desconto na Loja é escrito como loja negativo: o teto dele é o lado negativo.
  return stat === 'loja' ? current.stats.loja <= -STORY_CAPS.loja : current.stats[stat] >= STORY_CAPS[stat]
}
