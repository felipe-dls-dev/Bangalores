// Registro dos agentes e como invocá-los sem interface (headless).
//
// Papéis vêm dos docs que já regem a colaboração (VISUAL_DEVELOPMENT_HANDOFF.md e
// QA_TESTING_GUIDE.md); aqui só resumimos, não duplicamos as regras.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const AGENTS = {
  claude: {
    label: 'Claude Code',
    role: 'Orquestrador. Dono de dados, estado, mecânicas, combate, comportamento de UI, testes e integração final.',
    docs: [],
    dispatchable: false,
  },
  codex: {
    label: 'Codex',
    role: 'Arte e imagens: sprites, tiles, fundos de mapa, retratos, efeitos visuais. Entrega em public/assets e registra no contrato ART-XXX.',
    docs: ['docs/VISUAL_DEVELOPMENT_HANDOFF.md'],
    dispatchable: true,
  },
  antigravity: {
    label: 'Antigravity',
    role: 'QA e playtest no navegador. Joga o jogo, confirma bugs e registra achados no Findings Log (QA-XXX).',
    docs: ['docs/QA_TESTING_GUIDE.md'],
    dispatchable: true,
  },
  felipe: {
    label: 'Felipe',
    role: 'Dono do produto: escopo, prioridades e aceite. Tarefas atribuídas a ele são decisões ou aprovações pendentes.',
    docs: [],
    dispatchable: false,
  },
}

const isWindows = process.platform === 'win32'

/** Procura um executável no PATH (respeitando PATHEXT no Windows). */
export function whichSync(name) {
  const dirs = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean)
  const exts = isWindows ? (process.env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';') : ['']
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, name + ext.toLowerCase())
      if (fs.existsSync(candidate)) return candidate
    }
  }
  return null
}

function newestMatch(root, exeName) {
  // O app desktop do Codex guarda o binário em bin/<hash da versão>/codex.exe; o hash muda a
  // cada atualização, então pega o mais recente em vez de fixar um caminho.
  try {
    const found = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(root, d.name, exeName))
      .filter((p) => fs.existsSync(p))
      .map((p) => ({ p, t: fs.statSync(p).mtimeMs }))
      .sort((a, b) => b.t - a.t)
    return found[0]?.p ?? null
  } catch {
    return null
  }
}

/** Resolve o caminho do executável de cada agente (env > PATH > local de instalação padrão). */
export function resolveBinary(agent) {
  const home = os.homedir()
  if (agent === 'codex') {
    if (process.env.ORCH_CODEX_BIN) return process.env.ORCH_CODEX_BIN
    return (
      whichSync('codex') ??
      (process.env.LOCALAPPDATA && newestMatch(path.join(process.env.LOCALAPPDATA, 'OpenAI', 'Codex', 'bin'), 'codex.exe')) ??
      [path.join(home, '.codex', '.sandbox-bin', isWindows ? 'codex.exe' : 'codex')].find((p) => fs.existsSync(p)) ??
      null
    )
  }
  if (agent === 'antigravity') {
    if (process.env.ORCH_AGY_BIN) return process.env.ORCH_AGY_BIN
    return whichSync('agy') ?? [path.join(home, '.gemini', 'bin', isWindows ? 'agy.exe' : 'agy')].find((p) => fs.existsSync(p)) ?? null
  }
  return null
}

/**
 * Monta a linha de comando de uma execução headless.
 * - codex: prompt via stdin (arquivo), resposta final gravada por `-o`.
 * - antigravity: prompt como argumento de `--print`, resposta final no stdout.
 * Nenhum dos dois roda com bypass de sandbox por padrão.
 */
export function buildInvocation(agent, { bin, cwd, briefFile, lastMessageFile, sandbox, model, unattended, timeoutMinutes }) {
  if (agent === 'codex') {
    const args = ['exec', '--sandbox', sandbox ?? 'workspace-write', '--color', 'never', '-C', cwd, '-o', lastMessageFile]
    if (model) args.push('-m', model)
    args.push('-')
    return { bin, args, stdinFile: briefFile, resultFrom: 'lastMessage' }
  }
  if (agent === 'antigravity') {
    const prompt = fs.readFileSync(briefFile, 'utf8')
    // O prompt vai como argumento; o Windows limita a linha de comando a ~32k caracteres.
    if (prompt.length > 24000) throw new Error('O brief passou de 24k caracteres e não cabe na linha de comando do agy. Encurte a descrição ou quebre a tarefa.')
    const args = ['--print', prompt, '--mode', 'accept-edits', '--print-timeout', `${timeoutMinutes ?? 30}m`]
    if (model) args.push('--model', model)
    if (unattended) args.push('--dangerously-skip-permissions')
    return { bin, args, stdinFile: null, resultFrom: 'stdout' }
  }
  throw new Error(`O agente "${agent}" não tem execução headless.`)
}
