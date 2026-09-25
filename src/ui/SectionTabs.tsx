import React from 'react'

export interface SectionTab {
  id: string
  label: string
  /** Número opcional ao lado do nome ("Bestiário 12"). */
  count?: number | string
  /** Chama atenção (bolinha) quando há algo novo ou pronto. */
  alert?: boolean
}

/** Aba vizinha (dando a volta) ou extremo, para a navegação por setas/Home/End; devolve o id atual se a tecla não navega. */
export function nextTabId(ids: readonly string[], current: string, key: string): string {
  if (!ids.length) return current
  const index = Math.max(0, ids.indexOf(current))
  if (key === 'ArrowRight' || key === 'ArrowDown') return ids[(index + 1) % ids.length]
  if (key === 'ArrowLeft' || key === 'ArrowUp') return ids[(index - 1 + ids.length) % ids.length]
  if (key === 'Home') return ids[0]
  if (key === 'End') return ids[ids.length - 1]
  return current
}

export interface SectionTabsProps {
  tabs: readonly SectionTab[]
  active: string
  onChange: (id: string) => void
  /** Rótulo da lista de abas para leitores de tela. */
  label: string
  /** Prefixo dos ids (evita colisão se houver mais de um grupo na página). */
  idPrefix: string
}

// Barra de abas do modo Moderno (Crônicas, Guilda): divide páginas longas em seções, com teclado (setas, Home, End).
export function SectionTabs({ tabs, active, onChange, label, idPrefix }: SectionTabsProps) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const focusAfter = React.useRef(false)
  const ids = tabs.map((t) => t.id)

  React.useEffect(() => {
    if (!focusAfter.current) return
    focusAfter.current = false
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus()
  }, [active])

  const onKeyDown = (event: React.KeyboardEvent) => {
    const next = nextTabId(ids, active, event.key)
    if (next === active) return
    event.preventDefault()
    focusAfter.current = true
    onChange(next)
  }

  return (
    <div className="st-tabs" role="tablist" aria-label={label} ref={listRef} onKeyDown={onKeyDown}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          id={`${idPrefix}-tab-${tab.id}`}
          aria-selected={tab.id === active}
          aria-controls={`${idPrefix}-panel-${tab.id}`}
          tabIndex={tab.id === active ? 0 : -1}
          className={tab.id === active ? 'active' : ''}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
          {tab.count !== undefined && <b>{tab.count}</b>}
          {tab.alert && <i className="st-alert" aria-label="novidade" />}
        </button>
      ))}
    </div>
  )
}

/** Painel da aba: só a aba ativa é desenhada. */
export function SectionPanel({ idPrefix, id, active, children }: { idPrefix: string; id: string; active: string; children: React.ReactNode }) {
  if (id !== active) return null
  return (
    <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-tab-${id}`} className="st-panel">
      {children}
    </div>
  )
}
