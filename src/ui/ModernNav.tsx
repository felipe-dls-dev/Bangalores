import React from 'react'
import { ChevronDown, Compass, Store, Tent, Trophy, UserRound, Users } from 'lucide-react'
import { groupOfScreen, visibleNavGroups } from './navGroups'

const GROUP_ICONS = {
  camp: Tent,
  expedition: Compass,
  hero: UserRound,
  town: Store,
  achievements: Trophy,
  coop: Users,
} as const

export interface ModernNavProps {
  /** Tela atual (para destacar o grupo certo). */
  screen: string
  /** Navegação bloqueada (combate, evento em andamento). */
  locked: boolean
  lockTitle: string
  /** Telas que existem de verdade; grupos sem a tela principal disponível somem. */
  available: ReadonlySet<string>
  labelOf: (screen: string) => string
  onGo: (screen: string) => void
}

// O topo Moderno troca ~11 botões por 6 grupos. Grupos com uma tela só viram botão direto; os
// demais abrem um dropdown (role=menu) com teclado: Enter/Espaço/Seta para baixo abrem, setas e
// Home/End navegam, Esc fecha e devolve o foco ao botão.
export function ModernNav({ screen, locked, lockTitle, available, labelOf, onGo }: ModernNavProps) {
  const groups = visibleNavGroups(available)
  const activeGroupId = groupOfScreen(screen)?.id
  const [openId, setOpenId] = React.useState<string | null>(null)
  const rootRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (locked) setOpenId(null)
  }, [locked])

  React.useEffect(() => {
    if (!openId) return
    const closeOnOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpenId(null)
    }
    document.addEventListener('mousedown', closeOnOutside)
    return () => document.removeEventListener('mousedown', closeOnOutside)
  }, [openId])

  // Ao abrir pelo teclado, o foco vai para o primeiro/último item do menu. Um efeito (e não
  // requestAnimationFrame) garante que roda logo depois de o menu ser desenhado, mesmo em telas
  // pesadas onde o próximo frame demora.
  const pendingFocus = React.useRef<'first' | 'last' | null>(null)
  const focusMenuItem = (groupId: string, which: 'first' | 'last') => {
    const items = rootRef.current?.querySelectorAll<HTMLButtonElement>(`[data-group-menu="${groupId}"] [role="menuitem"]`)
    if (items?.length) items[which === 'first' ? 0 : items.length - 1].focus()
  }
  React.useEffect(() => {
    if (!openId || !pendingFocus.current) return
    focusMenuItem(openId, pendingFocus.current)
    pendingFocus.current = null
  }, [openId])
  const openWithKeyboard = (groupId: string, which: 'first' | 'last') => {
    if (openId === groupId) {
      focusMenuItem(groupId, which) // já aberto: o efeito não roda de novo, foca direto
      return
    }
    pendingFocus.current = which
    setOpenId(groupId)
  }

  const go = (target: string) => {
    if (locked) return
    setOpenId(null)
    onGo(target)
  }

  return (
    <div className="nav-groups" ref={rootRef} role="group" aria-label="Navegação principal">
      {groups.map((group) => {
        const Icon = GROUP_ICONS[group.id as keyof typeof GROUP_ICONS]
        const isActive = activeGroupId === group.id
        const common = {
          disabled: locked,
          title: locked ? lockTitle : group.label, // dica ao passar o mouse: em larguras médias só o ícone aparece
          className: `nav-group-btn${isActive ? ' active' : ''}`,
        }
        if (group.screens.length === 1) {
          return (
            <button key={group.id} {...common} aria-label={group.label} aria-current={isActive ? 'page' : undefined} onClick={() => go(group.screens[0])}>
              <Icon size={18} />
              <span className="nav-group-label">{group.label}</span>
            </button>
          )
        }
        const open = openId === group.id
        const menuId = `nav-menu-${group.id}`
        return (
          <div className="nav-group" key={group.id}>
            <button
              {...common}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-controls={open ? menuId : undefined}
              onClick={() => setOpenId(open ? null : group.id)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  openWithKeyboard(group.id, 'first')
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  openWithKeyboard(group.id, 'last')
                } else if (event.key === 'Escape') {
                  setOpenId(null)
                }
              }}
            >
              <Icon size={18} />
              <span className="nav-group-label">{group.label}</span>
              <ChevronDown size={12} className="nav-group-caret" aria-hidden="true" />
            </button>
            {open && (
              <div
                className="nav-group-menu"
                id={menuId}
                role="menu"
                aria-label={group.label}
                data-group-menu={group.id}
                onKeyDown={(event) => {
                  const items = Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>(`[data-group-menu="${group.id}"] [role="menuitem"]`) ?? [])
                  const at = items.indexOf(document.activeElement as HTMLButtonElement)
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    setOpenId(null)
                    rootRef.current?.querySelector<HTMLButtonElement>(`[aria-controls="${menuId}"]`)?.focus()
                  } else if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    items[(at + 1) % items.length]?.focus()
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    items[(at - 1 + items.length) % items.length]?.focus()
                  } else if (event.key === 'Home') {
                    event.preventDefault()
                    items[0]?.focus()
                  } else if (event.key === 'End') {
                    event.preventDefault()
                    items[items.length - 1]?.focus()
                  }
                }}
              >
                {group.screens.map((target) => {
                  const current = screen === target || (target === 'map' && screen === 'region')
                  return (
                    <button key={target} role="menuitem" className={current ? 'active' : ''} aria-current={current ? 'page' : undefined} onClick={() => go(target)}>
                      {labelOf(target)}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
