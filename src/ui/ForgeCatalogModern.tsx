import React from 'react'
import { Search, X } from 'lucide-react'
import { FORGE_CATEGORY_LABELS, FORGE_CATEGORY_ORDER } from '../data/forgeRecipes'
import { equipmentRequiredLevel, useGame } from '../store/game'
import type { Equipment } from '../types'
import { categoryCounts, filterRecipes, recipeEntries, type ForgeCategoryFilter, type RecipeEntry } from './forgeData'

export interface ForgeCatalogModernProps {
  /** Desenha a receita completa (a mesma carta do modo Clássico, com bônus, materiais e o botão de forjar). */
  renderRecipe: (entry: RecipeEntry) => React.ReactNode
  /** Endereço da arte do item, já resolvido. */
  art: (item: Equipment) => string
}

// Catálogo de receitas do modo Moderno: lista compacta à esquerda (com "Pronta" / "Faltam N" em cada linha) e a
// receita escolhida em detalhe à direita. O Clássico mostra as 200+ cartas de uma vez; aqui só uma é desenhada.
export function ForgeCatalogModern({ renderRecipe, art }: ForgeCatalogModernProps) {
  const g = useGame()
  const [category, setCategory] = React.useState<ForgeCategoryFilter>('all')
  const [query, setQuery] = React.useState('')
  const [readyOnly, setReadyOnly] = React.useState(false)
  const [selectedId, setSelectedId] = React.useState<string | undefined>()
  const listRef = React.useRef<HTMLUListElement>(null)
  const focusList = React.useRef(false)
  const detailRef = React.useRef<HTMLDivElement>(null)

  const entries = React.useMemo(() => recipeEntries(g.heroId), [g.heroId])
  const counts = React.useMemo(() => categoryCounts(entries), [entries])
  const shown = filterRecipes(entries, { category, query, readyOnly }, g)
  const readyTotal = filterRecipes(entries, { category: 'all', query: '', readyOnly: true }, g).length
  const selected = shown.find((e) => e.recipe.id === selectedId) ?? shown[0]
  const selectedIndex = selected ? shown.indexOf(selected) : -1

  // No celular a receita fica abaixo da lista: ao escolher, leva o olhar até ela.
  const choose = (id: string) => {
    setSelectedId(id)
    if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 1000px)').matches) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView?.({ block: 'start', behavior: 'smooth' }))
    }
  }

  const pick = (index: number, fromKeyboard = false) => {
    const next = shown[Math.max(0, Math.min(shown.length - 1, index))]
    if (!next) return
    focusList.current = fromKeyboard
    setSelectedId(next.recipe.id)
  }

  // Depois de mover pelo teclado, o foco acompanha a linha escolhida.
  React.useEffect(() => {
    if (!focusList.current) return
    focusList.current = false
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus()
  }, [selected?.recipe.id])

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') pick(selectedIndex + 1, true)
    else if (event.key === 'ArrowUp') pick(selectedIndex - 1, true)
    else if (event.key === 'Home') pick(0, true)
    else if (event.key === 'End') pick(shown.length - 1, true)
    else return
    event.preventDefault()
  }

  return (
    <section className="panel recipe-panel forge-workbench-card fc-page">
      <div className="forge-panel-head">
        <div>
          <small>CATÁLOGO</small>
          <h2>Receitas de fabricação</h2>
        </div>
        <span>
          {shown.length}/{entries.length}
        </span>
      </div>

      <div className="forge-catalog-toolbar">
        <label className="forge-search">
          <Search size={15} aria-hidden />
          <input type="search" placeholder="Buscar receita..." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar receita" />
        </label>
        {query && (
          <button className="forge-clear-search" type="button" onClick={() => setQuery('')}>
            <X size={14} aria-hidden />
            Limpar
          </button>
        )}
        <label className={`fc-ready-toggle${readyOnly ? ' on' : ''}`}>
          <input type="checkbox" checked={readyOnly} onChange={(e) => setReadyOnly(e.target.checked)} />
          <span>Só as que posso criar agora</span>
          <b>{readyTotal}</b>
        </label>
      </div>

      <div className="forge-category-tabs">
        <button className={category === 'all' ? 'active' : ''} onClick={() => setCategory('all')}>
          Todas<b>{entries.length}</b>
        </button>
        {FORGE_CATEGORY_ORDER.map((cat) => (
          <button key={cat} className={category === cat ? 'active' : ''} onClick={() => setCategory(cat)}>
            {FORGE_CATEGORY_LABELS[cat]}
            <b>{counts[cat] ?? 0}</b>
          </button>
        ))}
      </div>

      {shown.length ? (
        <div className="fc-layout">
          <ul className="fc-list" role="listbox" aria-label="Receitas" ref={listRef} onKeyDown={onKeyDown}>
            {shown.map((entry) => {
              const isSelected = entry === selected
              return (
                <li key={entry.recipe.id} role="presentation">
                  <button
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    className={`fc-row s-${entry.readiness.status}${isSelected ? ' selected' : ''}`}
                    onClick={() => choose(entry.recipe.id)}
                  >
                    <img src={art(entry.item)} alt="" loading="lazy" decoding="async" />
                    <span className="fc-name">
                      <strong>{entry.recipe.nome}</strong>
                      <small>
                        {entry.recipe.raridade} · nível {equipmentRequiredLevel(entry.item)}
                      </small>
                    </span>
                    <em>{entry.readiness.label}</em>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="fc-detail" ref={detailRef}>{selected && <div className="recipe-grid fc-single" key={selected.recipe.id}>{renderRecipe(selected)}</div>}</div>
        </div>
      ) : (
        <div className="forge-empty">
          <Search aria-hidden />
          <strong>Nenhuma receita encontrada</strong>
          <span>{readyOnly ? 'Nenhuma receita está pronta com os materiais e o nível de agora. Desligue o filtro para ver o que falta.' : 'Ajuste a busca ou troque o filtro de categoria.'}</span>
        </div>
      )}
    </section>
  )
}
