// Agrupamento das telas do topo para o modo Moderno. Só dados: o modo Clássico continua usando a
// lista plana `nav` de main.tsx (na mesma ordem destes grupos), e as telas em si são as mesmas nos dois modos.
// (Item GAME-006 da auditoria: 11 botões espremidos viram 6 grupos.)
//
// Reorganização por assunto (v0.9.7): cada grupo responde a uma pergunta do jogador.
//   Acampamento  onde estou e o que faço agora (painel inicial + tutorial)
//   Expedição    para onde vou lutar (mapa, masmorras, crônicas da história)
//   Herói        quem é meu personagem e o que ele carrega (ficha, equipamento, mochila)
//   Vila         serviços da cidade (loja, forja, guilda): antes Mochila, Loja e Forja eram "Inventário" e a Guilda era "Social"
//   Conquistas   o que já conquistei (títulos, histórico, bestiário, coleção de cartas): antes só abria a Coleção
//   Coop         jogar com amigos

export interface NavGroup {
  id: string
  label: string
  /** Telas do grupo, na ordem do dropdown; a primeira é a "principal" do grupo. */
  screens: readonly string[]
}

export const NAV_GROUPS: readonly NavGroup[] = [
  { id: 'camp', label: 'Acampamento', screens: ['camp', 'tutorial'] },
  { id: 'expedition', label: 'Expedição', screens: ['map', 'dungeon', 'chronicle'] },
  { id: 'hero', label: 'Herói', screens: ['character', 'equipment', 'inventory'] },
  { id: 'town', label: 'Vila', screens: ['shop', 'forge', 'guild'] },
  { id: 'achievements', label: 'Conquistas', screens: ['achievements', 'gallery'] },
  { id: 'coop', label: 'Coop', screens: ['coop'] },
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
