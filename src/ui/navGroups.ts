// Agrupamento das telas do topo para o modo Moderno. Só dados: o modo Clássico continua usando a
// lista plana `nav` de main.tsx, e as telas em si são as mesmas nos dois modos.
// (Item GAME-006 da auditoria: 11 botões espremidos viram 6 grupos.)

export interface NavGroup {
  id: string
  label: string
  /** Telas do grupo, na ordem do dropdown; a primeira é a "principal" do grupo. */
  screens: readonly string[]
}

export const NAV_GROUPS: readonly NavGroup[] = [
  { id: 'camp', label: 'Acampamento', screens: ['camp', 'tutorial'] },
  { id: 'expedition', label: 'Expedição', screens: ['map', 'chronicle'] },
  { id: 'hero', label: 'Herói', screens: ['character', 'equipment'] },
  { id: 'inventory', label: 'Inventário', screens: ['inventory', 'shop', 'forge'] },
  { id: 'social', label: 'Social', screens: ['guild', 'coop'] },
  { id: 'achievements', label: 'Conquistas', screens: ['gallery'] },
]

/** Nome das telas que só existem no modo Moderno (as demais têm nome na lista plana `nav` de main.tsx). */
export const MODERN_ONLY_SCREEN_LABELS: Readonly<Record<string, string>> = { camp: 'Acampamento' }

// Telas que não aparecem no topo mas pertencem a uma "área" para destacar o grupo certo.
// Exploração e combate acontecem dentro de Expedição.
const SCREEN_AREA: Record<string, string> = {
  region: 'map',
  combat: 'map',
  bossIntro: 'map',
  loot: 'map',
  event: 'map',
}

/**
 * Grupos e telas que já existem de verdade. Um grupo só aparece se a sua tela PRINCIPAL (a primeira)
 * estiver disponível: assim o Acampamento some do topo até a tela `camp` ser roteada, e o Tutorial
 * continua alcançável pelo dropdown "Menu", que lista todas as telas.
 */
export function visibleNavGroups(available: ReadonlySet<string>): NavGroup[] {
  return NAV_GROUPS.filter((group) => available.has(group.screens[0])).map((group) => ({
    ...group,
    screens: group.screens.filter((screen) => available.has(screen)),
  }))
}

/** Grupo que deve aparecer destacado quando a tela atual é `screen` (undefined se nenhum). */
export function groupOfScreen(screen: string): NavGroup | undefined {
  const target = SCREEN_AREA[screen] ?? screen
  return NAV_GROUPS.find((group) => group.screens.includes(target))
}
