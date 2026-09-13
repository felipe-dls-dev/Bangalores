#!/usr/bin/env node
// Automatiza o popup de versão (item 41 do Quadro de Contratos): antes disso, cada mudança
// exigia editar a string do body::after em styles.css à mão e lembrar de atualizar o
// package.json separadamente -- os dois já tinham divergido (0.6.8 vs 0.8.32).
// Uso: node scripts/bump-version.mjs <versao> "<descricao>"
//   node scripts/bump-version.mjs 0.8.33 "Corrige X e adiciona Y"
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const version = process.argv[2]
const description = process.argv[3]
if (!version || !description) {
  console.error('Uso: node scripts/bump-version.mjs <versao> "<descricao>"')
  process.exit(1)
}
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Versão inválida: "${version}" (esperado formato x.y.z)`)
  process.exit(1)
}

const today = new Date()
const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`

const pkgPath = path.join(root, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
pkg.version = version
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

const cssPath = path.join(root, 'src', 'styles.css')
const css = readFileSync(cssPath, 'utf8')
const lines = css.split('\n')
let lastEntryIndex = -1
for (let i = lines.length - 1; i >= 0; i--) {
  if (lines[i].startsWith('body::after{content:"VERSÃO')) { lastEntryIndex = i; break }
}
if (lastEntryIndex === -1) {
  console.error('Não encontrei nenhuma entrada "body::after{content:\\"VERSÃO" em src/styles.css.')
  process.exit(1)
}
const escaped = description.replace(/"/g, '\\"')
const newRule = `body::after{content:"VERSÃO ${version} • ${dateStr}\\A ${escaped}";white-space:pre-line}`
lines.splice(lastEntryIndex + 1, 0, newRule)
writeFileSync(cssPath, lines.join('\n'))

console.log(`Versão atualizada: package.json -> ${version}; popup: "VERSÃO ${version} • ${dateStr} • ${description}"`)
