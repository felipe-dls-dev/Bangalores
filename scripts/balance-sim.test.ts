import { describe, it, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  useGame, HEROES, SUBREGIONS, TERRITORIES, EQUIPMENT, CONSUMABLES,
  deriveLevel, equipmentClassAllowed, equipmentLevelAllowed, equipmentAttackForHero,
  equipmentWeaponClass, equipmentByRef, equipmentBaseId, equipmentBagCapacity, maxHp
} from '../src/store/game'
import { SPECIALIZATION_CHOICES } from '../src/data/expansion'

// Collapses every combat-animation setTimeout to run synchronously, so a full
// campaign (hundreds of battles) resolves instantly instead of waiting on real
// UI pacing delays (COMBAT_ROLL_DISPLAY_MS etc).
let realSetTimeout: typeof setTimeout
beforeAll(() => {
  realSetTimeout = global.setTimeout
  ;(global as any).setTimeout = (fn: any) => { fn(); return 0 }
})
afterAll(() => { global.setTimeout = realSetTimeout })

const MILESTONES = [10, 20, 40, 50]
const GEAR_SLOTS = ['mao_direita', 'mao_esquerda', 'peitoral', 'calcas', 'capacete', 'botas', 'amuleto', 'anel_1'] as const

function scoreFor(e: any, heroId: string) {
  return equipmentAttackForHero(e, heroId) * 2 + e.defesa * 2 + e.vida * 0.5
}

function equipFromBag(heroId: string) {
  let changed = true, guard = 0
  while (changed && guard++ < 200) {
    changed = false
    const s = useGame.getState()
    for (const ref of s.equipmentBag) {
      const e = equipmentByRef(ref)
      if (!e || e.slot === 'bolsa') continue
      if (!equipmentClassAllowed(e, heroId) || !equipmentLevelAllowed(e, s.xp)) continue
      let slot: string = e.slot
      if (slot === 'anel_1' && s.equipped.anel_1) slot = 'anel_2'
      if (slot === 'mao_esquerda') {
        const mainHand = equipmentByRef(s.equipped.mao_direita)
        if (mainHand && equipmentWeaponClass(mainHand) === 'facas') continue
      }
      const curRef = (s.equipped as any)[slot]
      const curE = curRef ? equipmentByRef(curRef) : undefined
      const newScore = scoreFor(e, heroId)
      const curScore = curE ? scoreFor(curE, heroId) : -1
      if (newScore > curScore) {
        useGame.getState().equip(ref)
        changed = true
        break
      }
    }
  }
}

function shopUpgrade(heroId: string) {
  let guard = 0
  while (guard++ < 400) {
    const s = useGame.getState()
    if (s.equipmentBag.length >= equipmentBagCapacity(s)) break
    let best: { id: string; delta: number } | undefined
    for (const slot of GEAR_SLOTS) {
      const compareSlot = slot === 'anel_1' && s.equipped.anel_1 ? 'anel_2' : slot
      const curRef = (s.equipped as any)[compareSlot]
      const curE = curRef ? equipmentByRef(curRef) : undefined
      const curScore = curE ? scoreFor(curE, heroId) : -1
      for (const e of EQUIPMENT) {
        if (e.slot !== slot) continue
        if (e.raridade === 'epico' || e.raridade === 'lendario') continue
        if (!equipmentClassAllowed(e, heroId) || !equipmentLevelAllowed(e, s.xp)) continue
        if (e.preco > s.gold) continue
        const delta = scoreFor(e, heroId) - curScore
        if (delta > 0 && (!best || delta > best.delta)) best = { id: e.id, delta }
      }
    }
    if (!best) break
    const before = useGame.getState().gold
    useGame.getState().buyEquipment(best.id)
    const afterState = useGame.getState()
    if (afterState.gold === before) break
    const ref = [...afterState.equipmentBag].reverse().find(r => equipmentBaseId(r) === best!.id)
    if (ref) useGame.getState().equip(ref)
  }
}

function restockPotions() {
  const healPotions = CONSUMABLES.filter(c => c.tipo === 'cura').sort((a, b) => a.preco - b.preco)
  if (!healPotions.length) return
  const cheapest = healPotions[0]
  let guard = 0
  while ((useGame.getState().inventory[cheapest.id] ?? 0) < 3 && useGame.getState().gold >= cheapest.preco && guard++ < 20) {
    useGame.getState().buyConsumable(cheapest.id)
  }
}

const ATTR_PATTERN = ['ataque', 'ataque', 'vida', 'defesa'] as const
function spendAttributes() {
  let guard = 0
  while (useGame.getState().attributePoints > 0 && guard < 2000) {
    useGame.getState().addAttribute(ATTR_PATTERN[guard % ATTR_PATTERN.length] as any)
    guard++
  }
}

const SPECIALIZATION_PICK: Record<number, string> = { 10: 'ofensiva', 25: 'vital', 50: 'carrasco', 75: 'lenda' }
function spendSpecializations() {
  const s = useGame.getState()
  const lvl = deriveLevel(s.xp).lvl
  for (const tier of SPECIALIZATION_CHOICES) {
    if (lvl >= tier.level && !(s.specializations ?? {})[String(tier.level)]) {
      useGame.getState().chooseSpecialization(tier.level, SPECIALIZATION_PICK[tier.level] ?? tier.options[0].id)
    }
  }
}

function maintenance(heroId: string) {
  spendAttributes()
  spendSpecializations()
  restockPotions()
  equipFromBag(heroId)
  shopUpgrade(heroId)
  equipFromBag(heroId)
}

interface Counters {
  battles: number; heroActions: number; hits: number; totalDamage: number; deaths: number
  bossesSkipped: string[]; retriesUsedForCurrentSub: number
  milestones: Record<number, { battles: number; heroActions: number; hits: number; totalDamage: number } | undefined>
}

function healingPotionId() {
  const owned = CONSUMABLES.filter(c => c.tipo === 'cura' && (useGame.getState().inventory[c.id] ?? 0) > 0)
  return owned[0]?.id
}

function combatStep(heroId: string, counters: Counters) {
  const s = useGame.getState()
  const mh = maxHp(s)
  if (mh > 0 && s.hp / mh < 0.4) {
    const potionId = healingPotionId()
    if (potionId) { useGame.getState().useConsumable(potionId); counters.heroActions++; return }
  }
  if ((s.heroSkillUses ?? 0) < 1 && s.heroId !== 'conjurador') { useGame.getState().heroSkill(); counters.heroActions++; return }
  if (s.heroId === 'conjurador' && (s.summons?.length ?? 0) < 2 && (s.heroSkillUses ?? 0) < 2) { useGame.getState().summonMonster('atacante'); counters.heroActions++; return }
  useGame.getState().attack(); counters.heroActions++
}

function runCombat(heroId: string, counters: Counters) {
  let guard = 0
  while (useGame.getState().screen === 'combat' && guard++ < 2000) combatStep(heroId, counters)
}

function recordMilestones(counters: Counters) {
  const lvl = deriveLevel(useGame.getState().xp).lvl
  for (const m of MILESTONES) {
    if (lvl >= m && !counters.milestones[m]) {
      counters.milestones[m] = { battles: counters.battles, heroActions: counters.heroActions, hits: counters.hits, totalDamage: counters.totalDamage }
    }
  }
}

function resolveOutcome(heroId: string, counters: Counters): 'victory' | 'defeat' | 'other' {
  let guard = 0
  while (guard++ < 100) {
    const screen = useGame.getState().screen
    if (screen === 'event') { useGame.getState().resolveEvent(true); useGame.getState().finishEvent(); return 'other' }
    if (screen === 'bossIntro') { useGame.getState().startBoss(); continue }
    if (screen === 'combat') { runCombat(heroId, counters); continue }
    if (screen === 'loot') {
      counters.battles++
      useGame.getState().finishLoot()
      maintenance(heroId)
      recordMilestones(counters)
      return 'victory'
    }
    if (screen === 'region' || screen === 'map') { counters.deaths++; return 'defeat' }
    return 'other'
  }
  return 'other'
}

// A real stuck player grinds easier ground (or the ever-scaling dungeon) for more levels/gear
// before retrying a boss that's currently out of reach, instead of slamming the same fight
// forever. This mirrors that: every 5 failed boss attempts, spend a few dungeon floors (based
// off the easiest known subregion, so the floors stay gentle) before trying again.
function grind(heroId: string, floors: number, counters: Counters, easySubId: string) {
  useGame.getState().selectDungeon(easySubId)
  for (let i = 0; i < floors; i++) {
    useGame.getState().startDungeon()
    const outcome = resolveOutcome(heroId, counters)
    if (outcome === 'defeat') break
  }
  useGame.getState().leaveDungeon()
}

function clearSubregion(sub: any, heroId: string, counters: Counters, easySubId: string) {
  counters.retriesUsedForCurrentSub = 0
  let guard = 0
  while (guard++ < 800) {
    useGame.getState().openSubregion(sub.id)
    const s = useGame.getState()
    if (s.subregionBossesDefeated.includes(sub.id)) return
    const progressMet = (s.subregionVictories[sub.id] ?? 0) >= sub.encontrosNecessarios
    if (progressMet && counters.retriesUsedForCurrentSub > 0 && counters.retriesUsedForCurrentSub % 5 === 0) {
      grind(heroId, 8, counters, easySubId)
      continue
    }
    if (progressMet) useGame.getState().startBoss()
    else useGame.getState().startEncounter(sub.id)
    const outcome = resolveOutcome(heroId, counters)
    if (outcome === 'defeat') {
      counters.retriesUsedForCurrentSub++
      if (counters.retriesUsedForCurrentSub > 70) { counters.bossesSkipped.push(sub.id); return }
      continue
    }
    counters.retriesUsedForCurrentSub = 0
  }
  counters.bossesSkipped.push(sub.id)
}

function runHero(heroId: string) {
  useGame.getState().newGame(heroId)
  const counters: Counters = { battles: 0, heroActions: 0, hits: 0, totalDamage: 0, deaths: 0, bossesSkipped: [], retriesUsedForCurrentSub: 0, milestones: {} }
  const unsub = useGame.subscribe((state, prev) => {
    const cr = (state as any).combatRoll
    if (cr && cr !== (prev as any).combatRoll && cr.attacker === 'hero') { counters.totalDamage += cr.damage; counters.hits++ }
  })
  const havendownRegionIds = new Set(TERRITORIES.filter(t => (t.mundo ?? 'havendown') === 'havendown').map(t => t.id))
  const subs = SUBREGIONS.filter(s => havendownRegionIds.has(s.regionId)).sort((a, b) => a.nivelMin - b.nivelMin)
  const easySubId = subs[0].id
  for (const sub of subs) clearSubregion(sub, heroId, counters, easySubId)
  unsub()
  const finalState = useGame.getState()
  const finalLevel = deriveLevel(finalState.xp).lvl
  const bracket = (lo: number | undefined, hi: number | undefined) => {
    const base = lo ? counters.milestones[lo] : { battles: 0, heroActions: 0, hits: 0, totalDamage: 0 }
    const top = hi ? counters.milestones[hi] : undefined
    if (!top || !base) return null
    const hits = top.hits - base.hits
    const dmg = top.totalDamage - base.totalDamage
    return { battles: top.battles - base.battles, heroActions: top.heroActions - base.heroActions, avgDamage: hits > 0 ? dmg / hits : 0 }
  }
  return {
    heroId,
    finalLevel,
    totalBattles: counters.battles,
    totalHeroActions: counters.heroActions,
    deaths: counters.deaths,
    bossesDefeated: subs.length - counters.bossesSkipped.length,
    totalBosses: subs.length,
    bossesSkipped: counters.bossesSkipped,
    avgDamageOverall: counters.hits > 0 ? counters.totalDamage / counters.hits : 0,
    milestones: Object.fromEntries(MILESTONES.map(m => [m, counters.milestones[m] ?? null])),
    brackets: {
      '1-10': bracket(undefined, 10),
      '10-20': bracket(10, 20),
      '20-40': bracket(20, 40),
      '40-50': bracket(40, 50)
    }
  }
}

const RUNS_PER_HERO = 3

function mean(xs: number[]) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0 }

function aggregateMilestones(runs: ReturnType<typeof runHero>[]) {
  const out: Record<number, any> = {}
  for (const m of MILESTONES) {
    const reached = runs.map(r => (r.milestones as any)[m]).filter((v): v is NonNullable<typeof v> => v != null)
    out[m] = reached.length ? {
      reachedRuns: reached.length,
      totalRuns: runs.length,
      avgBattles: Math.round(mean(reached.map(v => v.battles))),
      avgHeroActions: Math.round(mean(reached.map(v => v.heroActions)))
    } : { reachedRuns: 0, totalRuns: runs.length }
  }
  return out
}

function aggregateBrackets(runs: ReturnType<typeof runHero>[]) {
  const keys = ['1-10', '10-20', '20-40', '40-50'] as const
  const out: Record<string, any> = {}
  for (const k of keys) {
    const vals = runs.map(r => (r.brackets as any)[k]).filter((v): v is NonNullable<typeof v> => v != null)
    out[k] = vals.length ? { avgDamage: mean(vals.map(v => v.avgDamage)), sampleRuns: vals.length } : null
  }
  return out
}

describe('balance simulation', () => {
  it(`plays every hero class through ${RUNS_PER_HERO} full campaigns each, to the last Havendown boss`, () => {
    const results = HEROES.map(h => {
      const runs = []
      for (let i = 0; i < RUNS_PER_HERO; i++) {
        const r = runHero(h.id)
        console.log(`[${h.id} #${i + 1}] level ${r.finalLevel} | battles ${r.totalBattles} | actions ${r.totalHeroActions} | deaths ${r.deaths} | bosses ${r.bossesDefeated}/${r.totalBosses} | avgDmg ${r.avgDamageOverall.toFixed(2)} | skipped: ${r.bossesSkipped.join(', ') || 'none'}`)
        runs.push(r)
      }
      const aggregate = {
        finalLevel: mean(runs.map(r => r.finalLevel)),
        totalBattles: mean(runs.map(r => r.totalBattles)),
        totalHeroActions: mean(runs.map(r => r.totalHeroActions)),
        deaths: mean(runs.map(r => r.deaths)),
        bossesDefeated: mean(runs.map(r => r.bossesDefeated)),
        totalBosses: runs[0].totalBosses,
        allBossesDefeatedRuns: runs.filter(r => r.bossesDefeated === r.totalBosses).length,
        avgDamageOverall: mean(runs.map(r => r.avgDamageOverall)),
        milestones: aggregateMilestones(runs),
        brackets: aggregateBrackets(runs)
      }
      return { heroId: h.id, aggregate, runs }
    })
    const outPath = path.resolve(__dirname, 'balance-sim-results.json')
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2))
    console.log('RESULTS_WRITTEN:' + outPath)
  }, 1800000)
})
