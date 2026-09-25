import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

/** Raiz do repositório do jogo (tools/agent-orchestrator/lib -> ../../..). */
export function repoRoot() {
  return process.env.ORCH_ROOT ? path.resolve(process.env.ORCH_ROOT) : path.resolve(here, '..', '..', '..')
}

/** Estado em disco (fora do git): quadro de tarefas, execuções e logs. */
export function stateDir() {
  return process.env.ORCH_STATE_DIR
    ? path.resolve(process.env.ORCH_STATE_DIR)
    : path.join(repoRoot(), '.orchestrator')
}

export const runsDir = () => path.join(stateDir(), 'runs')
