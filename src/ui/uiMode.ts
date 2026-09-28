// Interface do jogo. Até a v0.9.8 havia dois modos: 'classic' (a interface original) e 'modern' (topo agrupado,
// Acampamento, telas redesenhadas), trocados por um botão e guardados no localStorage. Na v0.9.9 o Clássico foi
// desativado (decisão do Felipe, 2026-09-28): todo mundo joga no Moderno e não há mais como trocar.
//
// O tipo mantém os dois valores e as telas continuam lendo useUiMode(): os ramos clássicos que sobraram no código
// ficam inalcançáveis e podem ser removidos aos poucos sem quebrar nada.

export type UiMode = 'classic' | 'modern'
/** Chave da antiga preferência de modo; só é lida para ser apagada. */
export const UI_MODE_KEY = 'bangalores-ui-mode'
export const DEFAULT_UI_MODE: UiMode = 'modern'

export function getUiMode(): UiMode {
  return DEFAULT_UI_MODE
}

export function useUiMode(): UiMode {
  return DEFAULT_UI_MODE
}

/**
 * Marca o <html> com o modo (o CSS usa [data-ui-mode="modern"]) e apaga a preferência de quem tinha escolhido o
 * Clássico. Roda ao carregar o módulo, e não num efeito do App, porque a tela de login aparece antes de o App montar.
 */
export function applyUiMode() {
  if (typeof document !== 'undefined') document.documentElement.dataset.uiMode = DEFAULT_UI_MODE
  try {
    globalThis.localStorage?.removeItem(UI_MODE_KEY)
  } catch {
    // Armazenamento bloqueado (modo privado, dados de site bloqueados): não há o que limpar.
  }
}

applyUiMode()
