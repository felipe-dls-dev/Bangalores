import { describe, it, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { HEROES } from '../src/store/game'
import { runHero, MILESTONES, installFastTimeouts, restoreTimeouts } from './balance-sim-lib'

// Collapses every combat-animation setTimeout to run synchronously, so a full
// campaign (hundreds of battles) resolves instantly instead of waiting on real
// UI pacing delays (COMBAT_ROLL_DISPLAY_MS etc).
beforeAll(installFastTimeouts)
afterAll(restoreTimeouts)

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
  it(`plays every hero class through ${RUNS_PER_HERO} full campaigns each, through Havendown and Steelmere`, () => {
    const results = HEROES.map(h => {
      const runs = []
      for (let i = 0; i < RUNS_PER_HERO; i++) {
        const r = runHero(h.id, true)
        const steelmereLog = r.steelmere ? ` | steelmere ${r.steelmere.bossesDefeated}/${r.steelmere.totalBosses} (skipped: ${r.steelmere.bossesSkipped.join(', ') || 'none'})` : ''
        console.log(`[${h.id} #${i + 1}] level ${r.finalLevel} | battles ${r.totalBattles} | actions ${r.totalHeroActions} | deaths ${r.deaths} | bosses ${r.bossesDefeated}/${r.totalBosses} | avgDmg ${r.avgDamageOverall.toFixed(2)} | skipped: ${r.bossesSkipped.join(', ') || 'none'}${steelmereLog}`)
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
        steelmereBossesDefeated: mean(runs.map(r => r.steelmere?.bossesDefeated ?? 0)),
        steelmereTotalBosses: runs[0].steelmere?.totalBosses ?? 0,
        steelmereAllBossesDefeatedRuns: runs.filter(r => r.steelmere && r.steelmere.bossesDefeated === r.steelmere.totalBosses).length,
        avgDamageOverall: mean(runs.map(r => r.avgDamageOverall)),
        milestones: aggregateMilestones(runs),
        brackets: aggregateBrackets(runs)
      }
      return { heroId: h.id, aggregate, runs }
    })
    const outPath = path.resolve(__dirname, 'balance-sim-results.json')
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2))
    console.log('RESULTS_WRITTEN:' + outPath)
  // Uma rodada só de Havendown já bateu os 1.8M ms (30min) no limite; com Steelmere
  // dobrando o conteúdo por herói, 30min deixou de ser suficiente -- resultados eram
  // gravados a tempo, mas o teste falhava por timeout bem no agregado final.
  }, 5400000)
})
