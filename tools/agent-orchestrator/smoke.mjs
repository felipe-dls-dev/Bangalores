// Teste de ponta a ponta: sobe o servidor MCP de verdade via stdio, fala com ele como um
// cliente MCP e percorre o ciclo todo (criar -> dependência -> revisar -> handoff).
// Usa um estado temporário; NÃO despacha agentes reais. Uso: npm run smoke

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-smoke-'))

const client = new Client({ name: 'smoke', version: '0.0.0' })
await client.connect(
  new StdioClientTransport({
    command: process.execPath,
    args: [path.join(here, 'server.mjs')],
    env: { ...process.env, ORCH_STATE_DIR: stateDir },
  })
)

let failures = 0
const check = (label, ok, extra = '') => {
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? `  ${extra}` : ''}`)
}
const call = async (name, args = {}) => {
  const res = await client.callTool({ name, arguments: args })
  return { isError: Boolean(res.isError), text: res.content.map((c) => c.text).join('\n') }
}

const { tools } = await client.listTools()
const names = tools.map((t) => t.name).sort()
check('expõe as 11 ferramentas', names.length === 11, names.join(', '))

const agents = JSON.parse((await call('agents_list')).text)
check('agents_list traz os 4 agentes', agents.length === 4)
check('encontra o executável do Codex', agents.find((a) => a.agent === 'codex').headless?.available === true)
check('encontra o executável do Antigravity', agents.find((a) => a.agent === 'antigravity').headless?.available === true)

const a = await call('task_create', { title: 'Sprite do boss', assignee: 'codex', kind: 'art', priority: 'P1', paths: ['public/assets/battle/**'], refs: ['ART-099'] })
check('cria T-001', a.text.includes('T-001'), a.text)
const b = await call('task_create', { title: 'Integrar sprite', assignee: 'claude', kind: 'code', depends_on: ['T-001'] })
check('cria T-002 dependente', b.text.includes('T-002') && b.text.includes('bloqueada por T-001'), b.text)

const bad = await call('task_update', { id: 'T-002', status: 'in_progress' })
check('bloqueia iniciar tarefa com dependência pendente', bad.isError && bad.text.includes('T-001'))

const c = await call('task_create', { title: 'Mexe na mesma pasta', assignee: 'antigravity', kind: 'qa', paths: ['public/assets/battle/sprites'] })
await call('task_update', { id: 'T-001', status: 'in_progress', by: 'codex' })
const clash = await call('task_update', { id: 'T-003', status: 'in_progress', by: 'antigravity' })
check('bloqueia colisão de paths', clash.isError && clash.text.includes('T-001'), c.text.slice(0, 40))

await call('task_update', { id: 'T-001', status: 'review', by: 'codex', summary: 'Feito.', deliverables: ['public/assets/battle/boss.png'] })
const bounced = await call('task_review', { id: 'T-001', verdict: 'changes_requested', feedback: 'Fundo não está transparente.' })
check('review devolve com feedback', bounced.text.includes('todo'), bounced.text)
const brief = await call('task_brief', { id: 'T-001' })
check('brief inclui o feedback anterior', brief.text.includes('Fundo não está transparente'))
check('brief inclui formato de relatório', brief.text.includes('RESULTADO:'))

await call('task_update', { id: 'T-001', status: 'in_progress', by: 'codex' })
await call('task_update', { id: 'T-001', status: 'review', by: 'codex', summary: 'Corrigido.' })
await call('task_review', { id: 'T-001', verdict: 'accept' })
const next = await call('task_next', { agent: 'claude' })
check('task_next entrega T-002 após T-001 concluída', next.text.includes('T-002'), next.text.split('\n')[0])

const open = await call('task_list', {})
check('task_list esconde tarefas concluídas', !open.text.includes('T-001'))

const handoff = await call('handoff_status', { state: 'all' })
check('handoff_status lê ART e QA dos docs reais', /## ART[^\n]*: \d+ de [1-9]/.test(handoff.text) && /## QA[^\n]*: \d+ de [1-9]/.test(handoff.text), handoff.text.split('\n').filter((l) => l.startsWith('##')).join(' | '))

await client.close()
fs.rmSync(stateDir, { recursive: true, force: true })
console.log(failures ? `\n${failures} verificação(ões) falharam` : '\nTudo certo.')
process.exit(failures ? 1 : 0)
