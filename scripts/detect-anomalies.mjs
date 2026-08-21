// Varre player_campaigns em busca de personagens com progressao impossivel
// (atributos alem do que o numero de niveis permitiria, xp acima do teto do
// nivel 100, etc). Roda fora do app, direto contra o Supabase.
//
// Uso:
//   SUPABASE_SERVICE_ROLE_KEY=xxxx node scripts/detect-anomalies.mjs
//
// A service role key fica em Project Settings > API > service_role (secret)
// no dashboard do Supabase. NUNCA commite essa chave nem coloque no .env do
// front-end (VITE_*) — ela ignora RLS e le/escreve tudo. Use-a só localmente
// para esta analise e descarte-a do shell depois (nao fica salva em disco).

import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL ?? 'https://sxydkggelrnotrvpvhqe.supabase.co'
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceKey) {
  console.error('Defina SUPABASE_SERVICE_ROLE_KEY antes de rodar (veja o comentario no topo do script).')
  process.exit(1)
}

// Copia fiel da curva de custo por nivel em src/store/game.ts (costForLevel/deriveLevel).
// Reimplementada aqui, standalone, porque o store real depende de localStorage (persist
// middleware do zustand) e nao roda fora do Vite/browser.
const xpCosts = [10,14,19,25,33,43,56,72,92,116,145,180,220,265,315,370,430,495]
function costForLevel(level) {
  while (xpCosts.length < level) {
    const lvl = xpCosts.length + 1
    xpCosts.push(Math.max(1, Math.round(495 + 20 * Math.pow(lvl - 18, 1.55))))
  }
  return xpCosts[level - 1] ?? 10
}
function deriveLevel(totalXp) {
  let lvl = 1, spent = 0
  while (totalXp >= spent + costForLevel(lvl)) { spent += costForLevel(lvl); lvl++ }
  return { lvl, progress: totalXp - spent, next: costForLevel(lvl) }
}
const MAX_LEVEL = 100
const MAX_XP = (() => { let total = 0; for (let l = 1; l < MAX_LEVEL; l++) total += costForLevel(l); return total })()

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

const { data: rows, error } = await supabase.from('player_campaigns').select('*')
if (error) { console.error('Erro ao consultar player_campaigns:', error.message); process.exit(1) }

const findings = []

for (const row of rows) {
  const snap = row.snapshot ?? {}
  const xp = Number(snap.xp ?? 0)
  const attr = snap.attr ?? { vida: 0, ataque: 0, defesa: 0 }
  const allocated = snap.allocatedAttr ?? attr
  const gold = Number(snap.gold ?? 0)
  const hp = Number(snap.hp ?? 0)

  const flags = []

  // Regra 1 (dura): xp acima do teto matematico do nivel 100 e impossivel.
  if (xp > MAX_XP) flags.push(`xp ${xp} > teto do nivel 100 (${MAX_XP})`)

  // Regra 2 (dura): 1 ponto de atributo é concedido por nivel (nivel-1 pontos
  // totais ao longo da vida do personagem). Se a soma de vida+ataque+defesa
  // alocados excede isso, e matematicamente impossivel via jogo legitimo
  // (equipamentos dao bonus separado, nao entram em attr/allocatedAttr).
  const { lvl } = deriveLevel(xp)
  const maxPoints = Math.max(0, lvl - 1)
  const spentPoints = (allocated.vida ?? 0) + (allocated.ataque ?? 0) + (allocated.defesa ?? 0)
  if (spentPoints > maxPoints) {
    flags.push(`atributos alocados (${spentPoints}) > pontos possiveis no nivel ${lvl} (${maxPoints})`)
  }

  findings.push({ id: row.id, user_id: row.user_id, hero_id: row.hero_id, xp, lvl, gold, hp, flags })
}

// Regra 3 (estatistica, independente do nivel calculado — o nivel derivado do
// xp ja pode estar corrompido nos casos acima). Ouro bruto nao serve de base
// (uma conta que jogou muito naturalmente acumula mais ouro), entao usamos a
// razao ouro-GANHO/xp: todo personagem comeca com STARTER_GOLD=100 (game.ts:101),
// entao descontamos isso pra nao confundir personagens recem-criados com outliers.
// xp e ouro-ganho vem das mesmas batalhas, entao essa razao deve ficar num range
// razoavelmente estavel entre contas legitimas, mesmo em niveis diferentes.
// So avaliamos contas com xp>=50 (abaixo disso o ruido do estipendio inicial domina).
const STARTER_GOLD = 100
const ratios = rows
  .map(r => ({ row: r, xp: Number(r.snapshot?.xp ?? 0), gold: Number(r.snapshot?.gold ?? 0) }))
  .filter(r => r.xp >= 50)
  .map(r => ({ ...r, ratio: Math.max(0, r.gold - STARTER_GOLD) / r.xp }))
const sortedRatios = ratios.map(r => r.ratio).sort((a, b) => a - b)
function quantile(sorted, q) {
  const pos = (sorted.length - 1) * q, base = Math.floor(pos), rest = pos - base
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base]
}
const q1 = quantile(sortedRatios, 0.25), q3 = quantile(sortedRatios, 0.75), iqr = q3 - q1
const ratioCeiling = q3 + 3 * iqr

const byId = new Map(findings.map(f => [f.id, f]))
for (const { row, xp, gold, ratio } of ratios) {
  if (ratio <= ratioCeiling) continue
  const label = `razao gold/xp (${ratio.toFixed(2)}) destoa da populacao (Q1=${q1.toFixed(2)}, Q3=${q3.toFixed(2)}, teto=${ratioCeiling.toFixed(2)})`
  const existing = byId.get(row.id)
  if (existing) existing.flags.push(label)
  else {
    const f = { id: row.id, user_id: row.user_id, hero_id: row.hero_id, xp, lvl: deriveLevel(xp).lvl, gold, hp: Number(row.snapshot?.hp ?? 0), flags: [label] }
    findings.push(f)
    byId.set(row.id, f)
  }
}

const flagged = findings.filter(f => f.flags.length)
flagged.sort((a, b) => b.flags.length - a.flags.length)

console.log(`Analisadas ${rows.length} campanhas, ${flagged.length} com anomalias.`)
console.log(`Distribuicao gold/xp: Q1=${q1.toFixed(2)} Q3=${q3.toFixed(2)} IQR=${iqr.toFixed(2)} | teto outlier=${ratioCeiling.toFixed(2)}\n`)
for (const f of flagged) {
  console.log(`campaign ${f.id} | user ${f.user_id} | hero ${f.hero_id} | lvl ${f.lvl} | xp ${f.xp} | gold ${f.gold} | hp ${f.hp}`)
  for (const flag of f.flags) console.log(`  - ${flag}`)
}
