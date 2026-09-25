import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mutateBoard, readBoard } from '../lib/store.mjs'
import { createTask } from '../lib/board.mjs'

const storeUrl = new URL('../lib/store.mjs', import.meta.url).href
const boardUrl = new URL('../lib/board.mjs', import.meta.url).href

let dir
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-test-'))
  process.env.ORCH_STATE_DIR = dir
})
afterEach(() => {
  delete process.env.ORCH_STATE_DIR
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('store', () => {
  it('persiste entre chamadas e começa vazio', () => {
    expect(readBoard().tasks).toEqual([])
    mutateBoard((b) => createTask(b, { title: 'A' }, 'agora'))
    expect(readBoard().tasks.map((t) => t.id)).toEqual(['T-001'])
  })

  it('não grava nada se a mutação lançar erro (tarefa inválida não deixa lixo)', () => {
    mutateBoard((b) => createTask(b, { title: 'A' }, 'agora'))
    expect(() => mutateBoard((b) => createTask(b, { title: 'B', dependsOn: ['T-099'] }, 'agora'))).toThrow()
    const board = readBoard()
    expect(board.tasks).toHaveLength(1)
    expect(board.nextId).toBe(2)
  })

  it('libera o lock ao terminar (mesmo com erro) e não deixa arquivo temporário', () => {
    expect(() => mutateBoard(() => { throw new Error('boom') })).toThrow('boom')
    mutateBoard((b) => createTask(b, { title: 'A' }, 'agora'))
    expect(fs.readdirSync(dir).sort()).toEqual(['board.json'])
  })

  it('derruba um lock velho deixado por um processo morto', () => {
    const lock = path.join(dir, 'board.lock')
    fs.writeFileSync(lock, '99999')
    const old = new Date(Date.now() - 60_000)
    fs.utimesSync(lock, old, old)
    mutateBoard((b) => createTask(b, { title: 'A' }, 'agora'))
    expect(readBoard().tasks).toHaveLength(1)
  })

  it('vários processos criando tarefas ao mesmo tempo nunca repetem id nem perdem tarefa', () => {
    // Cada agente (Claude Code, Codex, Antigravity) roda o seu servidor: são processos
    // distintos disputando o mesmo board.json. 6 processos x 5 criações.
    const script = path.join(dir, 'worker.mjs')
    fs.writeFileSync(
      script,
      `import { mutateBoard } from ${JSON.stringify(storeUrl)}
       import { createTask } from ${JSON.stringify(boardUrl)}
       for (let i = 0; i < 5; i++) mutateBoard((b) => createTask(b, { title: 'p' + process.pid + '-' + i }, 'agora'))`
    )
    const results = runWorkersConcurrently(script)
    expect(results.every((r) => r.status === 0), results.map((r) => r.stderr).join('\n')).toBe(true)

    const tasks = readBoard().tasks
    expect(tasks).toHaveLength(30)
    expect(new Set(tasks.map((t) => t.id)).size).toBe(30)
    expect(readBoard().nextId).toBe(31)
  })
})

// spawnSync roda um processo por vez; para disputar o lock de verdade, um launcher lança os 6 juntos.
function runWorkersConcurrently(script) {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const launcher = path.join(dir, 'launch.mjs')
  fs.writeFileSync(
    launcher,
    `import { spawn } from 'node:child_process'
     const env = { ...process.env }
     const codes = await Promise.all(Array.from({ length: 6 }, () => new Promise((resolve) => {
       const p = spawn(process.execPath, [${JSON.stringify(script)}], { env, stdio: ['ignore', 'ignore', 'pipe'] })
       let err = ''
       p.stderr.on('data', (d) => (err += d))
       p.on('close', (status) => resolve({ status, stderr: err }))
     })))
     console.log(JSON.stringify(codes))`
  )
  const res = spawnSync(process.execPath, [launcher], { cwd: here, encoding: 'utf8', env: process.env })
  return JSON.parse(res.stdout || '[]')
}
