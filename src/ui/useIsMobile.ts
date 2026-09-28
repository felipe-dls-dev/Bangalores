// Celular = a mesma faixa das regras mobile de styles.css (max-width: 760px). Serve para o que CSS
// sozinho não resolve, como mostrar listas longas aos poucos no celular sem mudar o desktop.

import { useSyncExternalStore } from 'react'

export const MOBILE_QUERY = '(max-width: 760px)'

function mediaList(): MediaQueryList | undefined {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_QUERY) : undefined
}

function subscribe(onChange: () => void) {
  const list = mediaList()
  list?.addEventListener('change', onChange)
  return () => list?.removeEventListener('change', onChange)
}

export function isMobileViewport(): boolean {
  return mediaList()?.matches ?? false
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, isMobileViewport, () => false)
}
