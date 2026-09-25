// Modo de interface: 'classic' (a interface de sempre) ou 'modern' (topo agrupado + tela
// Acampamento). É uma preferência do JOGADOR neste navegador, não da campanha: por isso mora no
// localStorage, igual a "reduzir efeitos" e "alto contraste", e NÃO no store do jogo -- o
// snapshot de campanha copia todos os campos do store e faria a interface trocar sozinha ao
// carregar outra campanha (e sincronizar com a nuvem).

import { useSyncExternalStore } from 'react'

export type UiMode = 'classic' | 'modern'
export const UI_MODE_KEY = 'bangalores-ui-mode'
// Decisão do Felipe (2026-09-25): Clássica por padrão nas primeiras versões; vira Moderna depois do QA.
export const DEFAULT_UI_MODE: UiMode = 'classic'

let current: UiMode | undefined
const listeners = new Set<() => void>()

function readStored(): UiMode {
  try {
    return localStorage.getItem(UI_MODE_KEY) === 'modern' ? 'modern' : DEFAULT_UI_MODE
  } catch {
    return DEFAULT_UI_MODE // localStorage pode lançar (modo privado, dados de site bloqueados)
  }
}

function notify() {
  listeners.forEach((listener) => listener())
}

// Atributo no <html> para o CSS diferenciar os modos. Fica aqui (e não num efeito do App) porque a
// tela de login aparece ANTES de o App montar e também precisa do visual certo.
function applyToDocument(mode: UiMode) {
  if (typeof document !== 'undefined') document.documentElement.dataset.uiMode = mode
}

export function getUiMode(): UiMode {
  if (current === undefined) {
    current = readStored()
    applyToDocument(current)
  }
  return current
}

export function setUiMode(mode: UiMode) {
  current = mode
  applyToDocument(mode)
  try {
    localStorage.setItem(UI_MODE_KEY, mode)
  } catch {
    // Sem armazenamento: a escolha vale só até recarregar, mas o botão continua funcionando.
  }
  notify()
}

export function toggleUiMode() {
  setUiMode(getUiMode() === 'modern' ? 'classic' : 'modern')
}

export function subscribeUiMode(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Só para testes: descarta o valor em cache para reler do localStorage. */
export function resetUiModeCache() {
  current = undefined
}

// Outra aba do mesmo jogo trocou o modo: acompanha.
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (event) => {
    if (event.key !== UI_MODE_KEY) return
    current = readStored()
    applyToDocument(current)
    notify()
  })
  getUiMode() // aplica o atributo já ao carregar o módulo, antes de qualquer tela desenhar
}

export function useUiMode(): UiMode {
  return useSyncExternalStore(subscribeUiMode, getUiMode, () => DEFAULT_UI_MODE)
}
