import { describe, it, beforeAll, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  HEROES, SUBREGIONS, TERRITORIES, resolveCombatRoll,
  buildCoopEnemy, buildCoopSubregionBoss
} from '../src/store/game'
import { runHero, MILESTONES, installFastTimeouts, restoreTimeouts } from './balance-sim-lib'

// Item 8 do Quadro de Contratos, metade Coop: o balance-sim original só joga campanhas SOLO
// (ver balance-sim.test.ts). Simular uma sala Coop de verdade exigiria mockar sincronização de
// sala em tempo real via Supabase -- uma segunda infraestrutura de teste que este projeto não
// tenta reproduzir (ver comentário em runHero). Em vez disso, este arquivo reaproveita a MESMA
// progressão solo (equipamento, atributos, nível) já validada pelo balance-sim original -- que já
// captura ataque/defesa/vida efetivos em cada marco de nível (MILESTONES) -- para montar um "pool"
// de integrantes de grupo realistas, e resolve batalhas Coop com a mesma matemática de dado
// (resolveCombatRoll) e o mesmo escalonamento de inimigo por tamanho de grupo (buildCoopEnemy/
// buildCoopSubregionBoss) usados pelo jogo de verdade. O que isso testa: dado o progresso que um
// jogador solo realista alcança até cada marco, o escalonamento de HP/ataque por integrante deixa
// a batalha em grupo justa (sem grupo trivializando o inimigo nem inimigo estourando alguém sozinho)?

beforeAll(installFastTimeouts)
afterAll(restoreTimeouts)

const PARTY_SIZES = [2, 3, 4]
const TRIALS_PER_COMBO = 30
const MAX_ROUNDS = 500

interface MemberStats { heroId: string; atk: number; def: number; hp: number }
type StatPool = Record<number, MemberStats[]>

// BALANCE_POOL_FILE: reaproveita os marcos de um balance-sim-results.json já gerado em vez de jogar de novo todas as
// campanhas solo (horas). Sem a variável, o comportamento é o de sempre.
function poolFromFile(file: string): StatPool {
  const pool: StatPool = {}
  for (const m of MILESTONES) pool[m] = []
  const data = JSON.parse(fs.readFileSync(file, 'utf8')) as Array<{ heroId: string; runs: Array<{ milestones: Record<string, MemberStats & { atk: number; def: number; hp: number } | null> }> }>
  for (const hero of data) {
    for (const run of hero.runs) {
      for (const m of MILESTONES) {
        const snapshot = run.milestones?.[m]
        if (snapshot) pool[m].push({ heroId: hero.heroId, atk: snapshot.atk, def: snapshot.def, hp: snapshot.hp })
      }
    }
  }
  return pool
}

function buildStatPool(): StatPool {
  if (process.env.BALANCE_POOL_FILE) return poolFromFile(path.resolve(process.env.BALANCE_POOL_FILE))
  const pool: StatPool = {}
  for (const m of MILESTONES) pool[m] = []
  for (const hero of HEROES) {
    const result = runHero(hero.id, false)
    for (const m of MILESTONES) {
      const snapshot = (result.milestones as any)[m]
      if (snapshot) pool[m].push({ heroId: hero.id, atk: snapshot.atk, def: snapshot.def, hp: snapshot.hp })
    }
  }
  return pool
}

function pickParty(pool: MemberStats[], size: number): MemberStats[] {
  const party: MemberStats[] = []
  for (let i = 0; i < size; i++) party.push(pool[Math.floor(Math.random() * pool.length)])
  return party
}

function roll() { return 1 + Math.floor(Math.random() * 6) }

function simulateBattle(party: MemberStats[], enemy: { ataque: number; defesa: number; vida: number }) {
  let enemyHp = enemy.vida
  const hp = party.map(p => p.hp)
  let rounds = 0
  while (enemyHp > 0 && hp.some(h => h > 0) && rounds < MAX_ROUNDS) {
    rounds++
    for (let i = 0; i < party.length; i++) {
      if (hp[i] <= 0 || enemyHp <= 0) continue
      const { damage } = resolveCombatRoll(party[i].atk, enemy.defesa, roll(), roll())
      enemyHp -= damage
    }
    if (enemyHp <= 0) break
    const alive = party.map((_, i) => i).filter(i => hp[i] > 0)
    if (!alive.length) break
    const target = alive[Math.floor(Math.random() * alive.length)]
    const { damage } = resolveCombatRoll(enemy.ataque, party[target].def, roll(), roll())
    hp[target] = Math.max(0, hp[target] - damage)
  }
  return { rounds, enemyDefeated: enemyHp <= 0, wiped: hp.every(h => h <= 0), survivors: hp.filter(h => h > 0).length }
}

function nearestHavendownSubregion(level: number) {
  const havendownRegionIds = new Set(TERRITORIES.filter(t => (t.mundo ?? 'havendown') === 'havendown').map(t => t.id))
  const subs = SUBREGIONS.filter(s => havendownRegionIds.has(s.regionId))
  return subs.reduce((best, s) => Math.abs(s.nivelMin - level) < Math.abs(best.nivelMin - level) ? s : best, subs[0])
}

function mean(xs: number[]) { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0 }

describe('coop balance simulation', () => {
  it('resolves grouped battles at each level milestone/party size, for regular enemies and bosses', () => {
    const pool = buildStatPool()
    const results: any[] = []
    for (const milestone of MILESTONES) {
      const members = pool[milestone]
      if (!members.length) continue
      const sub = nearestHavendownSubregion(milestone)
      for (const partySize of PARTY_SIZES) {
        for (const kind of ['monster', 'boss'] as const) {
          const trials = []
          for (let t = 0; t < TRIALS_PER_COMBO; t++) {
            const party = pickParty(members, partySize)
            const enemy = kind === 'monster' ? buildCoopEnemy(sub.id, milestone, 'veterano', partySize) : buildCoopSubregionBoss(sub.id, 'veterano', partySize)
            if (!enemy) continue
            trials.push(simulateBattle(party, enemy))
          }
          const wipes = trials.filter(t => t.wiped && !t.enemyDefeated).length
          const cleared = trials.filter(t => t.enemyDefeated)
          const summary = {
            milestone, partySize, kind, subregionId: sub.id,
            trials: trials.length, wipeRate: trials.length ? wipes / trials.length : 0,
            avgRoundsToClear: Math.round(mean(cleared.map(t => t.rounds))),
            avgSurvivorsOnClear: Number(mean(cleared.map(t => t.survivors)).toFixed(2))
          }
          console.log(`[lvl ${milestone} | x${partySize} | ${kind} @ ${sub.id}] wipeRate ${(summary.wipeRate * 100).toFixed(0)}% | avgRounds ${summary.avgRoundsToClear} | avgSurvivors ${summary.avgSurvivorsOnClear}/${partySize}`)
          results.push(summary)
        }
      }
    }
    const outPath = process.env.BALANCE_OUT ? path.resolve(process.env.BALANCE_OUT) : path.resolve(__dirname, 'balance-sim-coop-results.json')
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2))
    console.log('RESULTS_WRITTEN:' + outPath)
  }, 5400000)
})
