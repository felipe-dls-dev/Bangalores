// Lê as filas que já existem nos docs (ART-XXX no handoff visual, QA-XXX no guia de QA) para
// o orquestrador ver o que está aberto sem depender de alguém ter copiado para o quadro.

import fs from 'node:fs'
import path from 'node:path'
import { repoRoot } from './paths.mjs'

const HEADING = /^###\s+([A-Z]+-\d+)\s*[-–—]\s*(.+?)\s*$/
const isDoneStatus = (s) => /^(integrated|done|shipped|resolved|fixed)\b/i.test(s)

/** Pedidos do doc de handoff visual: `### ART-011 - Título` seguido de `Status: ...`. */
export function parseHandoff(text) {
  const lines = text.split(/\r?\n/)
  const items = []
  lines.forEach((line, i) => {
    const m = line.match(HEADING)
    if (!m) return
    let status = ''
    let owner = ''
    for (const next of lines.slice(i + 1, i + 8)) {
      if (HEADING.test(next)) break
      status ||= next.match(/^Status:\s*(.+)$/)?.[1].trim() ?? ''
      owner ||= next.match(/^(?:Owner|Requested by|Delivered by):\s*(.+)$/)?.[1].trim() ?? ''
    }
    items.push({ id: m[1], title: m[2], status: status || '(sem Status)', owner, open: !isDoneStatus(status) })
  })
  return items
}

/** Achados do guia de QA: `### QA-003 - Título`; resolvido se o Status ou o Fix applied disserem. */
export function parseQa(text) {
  const lines = text.split(/\r?\n/)
  const items = []
  lines.forEach((line, i) => {
    const m = line.match(HEADING)
    if (!m || !m[1].startsWith('QA-') || /XXX/.test(m[1])) return
    const block = []
    for (const next of lines.slice(i + 1)) {
      if (HEADING.test(next) || /^##\s/.test(next)) break
      block.push(next)
    }
    const field = (name) => block.find((l) => l.startsWith(`${name}:`))?.slice(name.length + 1).trim() ?? ''
    const status = field('Status')
    const fix = field('Fix applied')
    const resolved = isDoneStatus(status) || (fix !== '' && !/^none\b/i.test(fix))
    items.push({
      id: m[1],
      title: m[2],
      status: status || (resolved ? 'resolved' : 'open'),
      severity: field('Severity'),
      foundBy: field('Found by'),
      open: !resolved,
    })
  })
  return items
}

export function readHandoffStatus(source = 'all') {
  const root = repoRoot()
  const read = (rel) => {
    try {
      return fs.readFileSync(path.join(root, rel), 'utf8')
    } catch {
      return null
    }
  }
  const out = { art: [], qa: [], missing: [] }
  if (source !== 'qa') {
    const text = read('docs/VISUAL_DEVELOPMENT_HANDOFF.md')
    text === null ? out.missing.push('docs/VISUAL_DEVELOPMENT_HANDOFF.md') : (out.art = parseHandoff(text))
  }
  if (source !== 'art') {
    const text = read('docs/QA_TESTING_GUIDE.md')
    text === null ? out.missing.push('docs/QA_TESTING_GUIDE.md') : (out.qa = parseQa(text))
  }
  return out
}
