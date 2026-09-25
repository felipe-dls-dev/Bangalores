import { AGENTS } from './agents.mjs'

const noAccents = (s) => s.normalize('NFD').replace(/\p{M}/gu, '')

/**
 * Prompt completo de uma tarefa. `mode`:
 * - 'dispatch': execução headless; o agente só precisa terminar no formato de relatório.
 * - 'paste': para colar num agente já aberto (ex.: app do Codex); se ele tiver este MCP,
 *   pode reportar por task_update.
 */
export function buildBrief(task, board, { mode = 'dispatch' } = {}) {
  const agent = AGENTS[task.assignee]
  const lines = []
  lines.push(`# Tarefa ${task.id} — ${task.title}`, '')
  lines.push(
    `Você é ${agent.label} no projeto **Bangalores Web** (RPG em React + TypeScript + Vite + Zustand). ` +
      'Esta tarefa foi delegada pelo Claude Code, que orquestra o trabalho entre os agentes e revisa o que você entregar.',
    ''
  )
  lines.push(`**Seu papel aqui:** ${agent.role}`, '')

  if (task.refs.length) lines.push(`**Referências:** ${task.refs.join(', ')}`, '')

  lines.push('## Objetivo', '', task.description || '(sem descrição além do título)', '')

  if (task.acceptance.length) {
    lines.push('## Critérios de aceite', '', ...task.acceptance.map((c) => `- ${c}`), '')
  }
  if (task.paths.length) {
    lines.push('## Áreas em que você pode mexer', '', ...task.paths.map((p) => `- \`${p}\``), '')
  }

  const deps = task.dependsOn.map((id) => board.tasks.find((t) => t.id === id)).filter(Boolean)
  if (deps.length) {
    lines.push('## Contexto de tarefas anteriores', '')
    for (const dep of deps) lines.push(`- ${dep.id} (${dep.title}): ${dep.result?.summary?.split('\n')[0] || dep.status}`)
    lines.push('')
  }
  if (task.feedback.length) {
    lines.push('## Feedback da revisão anterior (corrija isto)', '', ...task.feedback.map((f) => `- ${f.text}`), '')
  }

  lines.push('## Regras', '')
  if (agent.docs.length) lines.push(`- Antes de começar, leia ${agent.docs.map((d) => `\`${d}\``).join(' e ')} e siga o contrato descrito lá.`)
  lines.push(
    '- Outros agentes editam esta mesma árvore de trabalho agora. Não reverta nem reformate o que não for seu e não use `git add .`.',
    '- **Não faça commit nem push.** Deixe as mudanças no working tree; o Claude Code revisa e commita.',
    '- Não altere o número de versão (regra `body::after` em `src/styles.css`); o Claude Code faz o bump ao integrar.',
    '- Se mexer em código (`src/`), rode `npm run typecheck && npm run lint && npm test` e só reporte como concluído com tudo verde.',
    '- Se algo bloquear (decisão de design, arquivo ausente, ferramenta indisponível), pare e reporte BLOQUEADO explicando; não invente.',
    ''
  )

  lines.push('## Como reportar', '')
  if (mode === 'paste') {
    lines.push(
      `Se o MCP \`bangalores-orchestrator\` estiver disponível, ao terminar chame \`task_update\` com id \`${task.id}\`, ` +
        '`status: "review"`, `summary` e `deliverables`. Independente disso, encerre com o bloco abaixo.',
      ''
    )
  }
  lines.push(
    'Sua **última mensagem** deve terminar exatamente neste formato:',
    '',
    '```',
    'RESULTADO: CONCLUIDO | PARCIAL | BLOQUEADO',
    'RESUMO: <2 a 5 linhas: o que foi feito e como verificou>',
    'ENTREGAVEIS:',
    '- <caminho/de/arquivo alterado ou criado>',
    'BLOQUEIOS: <o que impediu, ou "nenhum">',
    '```'
  )
  return lines.join('\n')
}

/**
 * O agy sai com código 0 mesmo quando o modo headless negou uma permissão e não produziu
 * trabalho nenhum (a mensagem de erro vem no stdout). Sem o bloco RESULTADO, isso é falha,
 * não uma entrega "sem formato".
 */
export function detectHeadlessFailure(text) {
  return /headless mode cannot prompt|auto-denied/i.test(text)
    ? 'permissão negada: o modo headless não consegue pedir confirmação. Re-despache com unattended: true (Antigravity) ou libere o comando nas regras de permissão do agente.'
    : ''
}

/**
 * Lê o bloco de relatório no fim da resposta do agente. Tolerante a markdown (`**RESULTADO:**`),
 * acentos (ENTREGÁVEIS) e a texto antes do bloco; usa a ÚLTIMA ocorrência de RESULTADO.
 */
export function parseReport(text) {
  const rawLines = String(text ?? '').split(/\r?\n/)
  const header = /^[\W_]*(RESULTADO|RESUMO|ENTREGAVEIS|BLOQUEIOS(?:\s*\/\s*DUVIDAS)?|DUVIDAS)[\W_]*?:[\W_]*(.*)$/i

  let start = -1
  rawLines.forEach((line, i) => {
    if (/^[\W_]*RESULTADO\b/i.test(noAccents(line))) start = i
  })
  const empty = { verdict: null, summary: '', deliverables: [], blockers: '' }
  if (start < 0) return empty

  const sections = { RESULTADO: [], RESUMO: [], ENTREGAVEIS: [], BLOQUEIOS: [] }
  let current = null
  for (const raw of rawLines.slice(start)) {
    const norm = noAccents(raw)
    const m = norm.match(header)
    if (m) {
      const upper = m[1].toUpperCase()
      const key = upper.startsWith('BLOQUEIOS') || upper === 'DUVIDAS' ? 'BLOQUEIOS' : upper
      current = key
      // valor na mesma linha: pega do original, depois do primeiro ":"
      const inline = raw.slice(raw.indexOf(':') + 1).replace(/^[\s*_`]+/, '').trim()
      if (inline) sections[key].push(inline)
    } else if (current && raw.trim() && !/^```/.test(raw.trim())) {
      sections[current].push(raw.trim())
    }
  }

  const verdictWord = noAccents(sections.RESULTADO[0] ?? '').toUpperCase()
  const verdict = verdictWord.startsWith('CONCLU') ? 'CONCLUIDO' : verdictWord.startsWith('PARCIAL') ? 'PARCIAL' : verdictWord.startsWith('BLOQUE') ? 'BLOQUEADO' : null

  const deliverables = sections.ENTREGAVEIS.map((l) => l.replace(/^[-*•]\s+|^\d+[.)]\s+/, '').replace(/`/g, '').trim()).filter((l) => l && !/^nenhum/i.test(noAccents(l)))
  const blockers = sections.BLOQUEIOS.join(' ').trim()
  return {
    verdict,
    summary: sections.RESUMO.join('\n').trim(),
    deliverables,
    blockers: /^nenhum/i.test(noAccents(blockers)) ? '' : blockers,
  }
}
