// Persistência do quadro em .orchestrator/board.json.
//
// Cada agente (Claude Code, Codex, Antigravity) sobe a sua própria instância do servidor MCP,
// e o runner das execuções headless é outro processo: vários processos escrevem no mesmo
// arquivo. Por isso toda leitura/escrita passa por um lock de arquivo (`wx` é atômico) e a
// gravação é "escreve temp + rename", nunca um write parcial por cima do JSON.

import fs from 'node:fs'
import path from 'node:path'
import { stateDir, runsDir } from './paths.mjs'
import { emptyBoard } from './board.mjs'

const LOCK_TIMEOUT_MS = 8000
const LOCK_STALE_MS = 15000

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

// No Windows, criar o lock no instante em que outro processo o está apagando ("delete
// pending") falha com EPERM/EACCES/EBUSY em vez de EEXIST: é o mesmo "está ocupado".
const LOCK_BUSY_CODES = ['EEXIST', 'EPERM', 'EACCES', 'EBUSY']

function lockIsStale(lockPath) {
  try {
    return Date.now() - fs.statSync(lockPath).mtimeMs > LOCK_STALE_MS
  } catch {
    return false // sumiu entre o erro e o stat: o próximo laço cria normalmente
  }
}

function acquireLock(lockPath) {
  const deadline = Date.now() + LOCK_TIMEOUT_MS
  for (;;) {
    try {
      const fd = fs.openSync(lockPath, 'wx')
      fs.writeSync(fd, String(process.pid))
      fs.closeSync(fd)
      return
    } catch (err) {
      if (!LOCK_BUSY_CODES.includes(err.code)) throw err
      if (lockIsStale(lockPath)) {
        // Lock de um processo que morreu no meio da escrita.
        try {
          fs.unlinkSync(lockPath)
        } catch {
          // outro processo derrubou primeiro
        }
        continue
      }
      if (Date.now() > deadline) throw new Error('Timeout esperando o lock do quadro (.orchestrator/board.lock).')
      sleep(10)
    }
  }
}

function renameWithRetry(from, to) {
  for (let attempt = 0; ; attempt++) {
    try {
      fs.renameSync(from, to)
      return
    } catch (err) {
      // Windows devolve EPERM/EBUSY se antivírus/indexador estiver com o arquivo aberto.
      if (attempt >= 20 || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) throw err
      sleep(25)
    }
  }
}

function writeJson(file, data) {
  const tmp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`)
  renameWithRetry(tmp, file)
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (err) {
    if (err.code === 'ENOENT') return fallback
    throw new Error(`Não consegui ler ${file}: ${err.message}`)
  }
}

/**
 * Roda `fn(board)` com o lock do quadro. Se `fn` retornar sem lançar, o quadro é gravado;
 * se lançar, nada é gravado (as validações do board.mjs rodam antes de mutar o estado
 * persistente, então uma tarefa inválida não deixa lixo).
 */
export function mutateBoard(fn) {
  const dir = stateDir()
  fs.mkdirSync(dir, { recursive: true })
  const lockPath = path.join(dir, 'board.lock')
  acquireLock(lockPath)
  try {
    const file = path.join(dir, 'board.json')
    const board = readJson(file, null) ?? emptyBoard()
    const result = fn(board)
    writeJson(file, board)
    return result
  } finally {
    try {
      fs.unlinkSync(lockPath)
    } catch {
      // já removido por outro processo após stale: sem problema
    }
  }
}

/** Leitura consistente (respeita o lock, não grava). */
export function readBoard() {
  const dir = stateDir()
  fs.mkdirSync(dir, { recursive: true })
  const lockPath = path.join(dir, 'board.lock')
  acquireLock(lockPath)
  try {
    return readJson(path.join(dir, 'board.json'), null) ?? emptyBoard()
  } finally {
    try {
      fs.unlinkSync(lockPath)
    } catch {
      // idem
    }
  }
}

// ---- Execuções (runs) ------------------------------------------------------------------

export const runFile = (runId) => path.join(runsDir(), `${runId}.json`)
export const runPaths = (runId) => ({
  brief: path.join(runsDir(), `${runId}.brief.md`),
  out: path.join(runsDir(), `${runId}.out.log`),
  err: path.join(runsDir(), `${runId}.err.log`),
  lastMessage: path.join(runsDir(), `${runId}.last.txt`),
})

export function saveRun(run) {
  fs.mkdirSync(runsDir(), { recursive: true })
  writeJson(runFile(run.id), run)
}

export function loadRun(runId) {
  return readJson(runFile(runId), null)
}

/** Merge parcial no registro de execução (o runner e o servidor escrevem o mesmo arquivo). */
export function patchRun(runId, patch) {
  return mutateBoard(() => {
    const run = loadRun(runId)
    if (!run) throw new Error(`Execução ${runId} não existe.`)
    Object.assign(run, patch)
    saveRun(run)
    return run
  })
}

export function readTail(file, maxChars) {
  try {
    const text = fs.readFileSync(file, 'utf8')
    return text.length > maxChars ? text.slice(-maxChars) : text
  } catch {
    return ''
  }
}
