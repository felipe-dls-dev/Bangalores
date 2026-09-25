// Despacha uma tarefa trivial, SOMENTE de leitura, para agentes de verdade e confere que o
// ciclo fecha (brief seguido -> relatório parseado -> tarefa em review). Gasta uma chamada de
// modelo por agente. Uso: npm run smoke:live -- [codex|antigravity|both] [--unattended]
//
// O Antigravity em modo headless não consegue pedir permissão de comando e nega sozinho; sem
// --unattended a tarefa dele deve terminar BLOQUEADA explicando isso (é o comportamento
// esperado e seguro). --unattended passa --dangerously-skip-permissions ao agy: só use se
// você quer esse bypass de propósito.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const args = process.argv.slice(2)
const unattended = args.includes('--unattended')
const which = args.find((a) => !a.startsWith('--')) ?? 'both'
const targets = which === 'both' ? ['codex', 'antigravity'] : [which]
const here = path.dirname(fileURLToPath(import.meta.url))
const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-live-'))

const client = new Client({ name: 'smoke-live', version: '0.0.0' })
await client.connect(
  new StdioClientTransport({ command: process.execPath, args: [path.join(here, 'server.mjs')], env: { ...process.env, ORCH_STATE_DIR: stateDir } })
)
const call = async (name, args = {}) => {
  const res = await client.callTool({ name, arguments: args })
  const out = res.content.map((c) => c.text).join('\n')
  if (res.isError) throw new Error(out)
  return out
}

let failures = 0
for (const agent of targets) {
  const created = await call('task_create', {
    title: `Smoke ${agent}: ler a versão do jogo`,
    assignee: agent,
    kind: 'research',
    priority: 'P3',
    description:
      'Tarefa de verificação, SOMENTE LEITURA. Leia o campo "version" do package.json na raiz do repositório e informe no RESUMO. ' +
      'Não altere, crie nem apague nenhum arquivo, não rode comandos além de ler o arquivo, não faça commit.',
    acceptance: ['O RESUMO cita a versão exata do package.json.'],
  })
  const id = created.match(/T-\d+/)[0]
  console.log(`\n[${agent}] ${await call('task_dispatch', { id, sandbox: 'read-only', timeout_minutes: 6, unattended: unattended && agent === 'antigravity' })}`)

  const started = Date.now()
  let task
  do {
    await new Promise((r) => setTimeout(r, 3000))
    task = JSON.parse(await call('task_get', { id, log_chars: 800 }))
  } while (task.status === 'in_progress' && Date.now() - started < 7 * 60 * 1000)

  const expected = JSON.parse(fs.readFileSync(path.join(here, '..', '..', 'package.json'), 'utf8')).version
  const delivered = task.status === 'review' && task.result?.verdict === 'CONCLUIDO' && task.result.summary.includes(expected)
  // Sem --unattended o Antigravity deve parar bloqueado, dizendo o motivo: é o resultado certo.
  const expectedBlock = agent === 'antigravity' && !unattended && task.status === 'blocked' && /permissão negada/.test(task.result?.summary ?? '')
  const ok = delivered || expectedBlock
  if (!ok) failures++
  console.log(`[${agent}] ${delivered ? 'OK' : expectedBlock ? 'BLOQUEADO (esperado sem --unattended)' : 'FALHOU'} em ${Math.round((Date.now() - started) / 1000)}s  status=${task.status} veredito=${task.result?.verdict} exit=${task.lastRun?.exitCode}`)
  console.log(`[${agent}] resumo: ${task.result?.summary}`)
  if (!ok) console.log(`[${agent}] log:\n${task.lastRun?.logTail}\n${task.lastRun?.errTail ?? ''}`)
}

await client.close()
fs.rmSync(stateDir, { recursive: true, force: true })
process.exit(failures ? 1 : 0)
