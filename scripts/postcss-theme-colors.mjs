// Plugin do PostCSS: faz TODO objeto acompanhar o tema da região.
//
// O jogo tem um tema por região (`data-region-theme`), mas boa parte do CSS foi escrita com cores "ouro/marrom" fixas
// (bordas, fundos escuros, textos suaves, brilhos). Em vez de trocar milhares de cores à mão, este plugin reescreve cada
// cor quente (matiz de ouro/marrom) em cor relativa que gira de matiz e ajusta o croma com o tema:
//
//   border: 1px solid #5d4020;
//   border: 1px solid #5d4020;                                                           <- reserva para navegador antigo
//   border: 1px solid oklch(from #5d4020 l calc(c * var(--theme-chroma, 1)) calc(h + var(--theme-hue, 0)));
//
// No tema padrão (`--theme-hue: 0` e `--theme-chroma: 1`) a cor final é a mesma de antes. Nos outros temas, `--theme-hue` e
// `--theme-chroma` (definidos em styles.css por região) levam a cor para a família do tema.
//
// O que NÃO gira, de propósito: cores com significado (raridade, status, elemento, dano, perigo, terreno do mapa), as
// definições do próprio tema (variáveis `--x` e regras `[data-region-theme]`), o que está dentro de `url(...)` e qualquer
// regra ou declaração precedida do comentário `/* theme:skip */`.

const MATCH_LITERAL = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])|rgba?\(\s*\d+(?:\.\d+)?[\s,]+\d+(?:\.\d+)?[\s,]+\d+(?:\.\d+)?(?:\s*[,/]\s*[\d.]+%?)?\s*\)/g

/** Seletores cuja cor quente é um significado do jogo (raridade, status, elemento, dano, perigo, terreno). */
const SEMANTIC_SELECTOR = /rarity|\.raro\b|epico|lendario|mitico|\.heroico|\.comum\b|incomum|status-|status-chip|status-badge|floating-damage|danger-|\.danger|tile-|terrain|element-|elemento|\.burn|\.poison|\.frozen|cc-r-|item-rarity/

const THEME_DEFINITION = /\[data-region-theme|:root/

function toRgb(literal) {
  if (literal[0] === '#') {
    let hex = literal.slice(1)
    if (hex.length <= 4) hex = [...hex].map((c) => c + c).join('')
    const n = (i) => parseInt(hex.slice(i, i + 2), 16)
    return { r: n(0), g: n(2), b: n(4) }
  }
  const [r, g, b] = literal.match(/[\d.]+/g).map(Number)
  return { r, g, b }
}

/** Ouro/marrom: matiz entre 15° e 65° com um mínimo de saturação (cinzas quase puros e as demais famílias ficam como estão). */
export function isWarm(literal) {
  const { r, g, b } = toRgb(literal)
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  if (!delta) return false
  const lightness = (max + min) / 2
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  if (saturation < 0.1) return false
  const hue = 60 * (max === rn ? ((gn - bn) / delta + (gn < bn ? 6 : 0)) : max === gn ? (bn - rn) / delta + 2 : (rn - gn) / delta + 4)
  return hue >= 15 && hue <= 65
}

export const themed = (literal) => `oklch(from ${literal} l calc(c * var(--theme-chroma, 1)) calc(h + var(--theme-hue, 0)))`

/** Reescreve as cores quentes de um valor, sem mexer no que está dentro de url(...). */
export function themeValue(value) {
  let changed = false
  const parts = value.split(/(url\([^)]*\))/g)
  const out = parts.map((part) => {
    if (part.startsWith('url(')) return part
    return part.replace(MATCH_LITERAL, (literal) => {
      if (!isWarm(literal)) return literal
      changed = true
      return themed(literal)
    })
  })
  return changed ? out.join('') : undefined
}

const skipped = (node) => {
  const previous = node.prev()
  return previous?.type === 'comment' && /theme:skip/.test(previous.text)
}

export default function themeColors() {
  return {
    postcssPlugin: 'bangalores-theme-colors',
    Once(root) {
      root.walkRules((rule) => {
        // Os temas por região também valem para o que fica fora do .app-shell (diálogos em portal): o <html> recebe o mesmo atributo.
        if (/^\.app-shell\[data-region-theme="[a-z]+"\]$/.test(rule.selector)) {
          rule.selector = `${rule.selector}, ${rule.selector.replace('.app-shell', 'html')}`
        }
      })
      root.walkDecls((decl) => {
        // A declaração girada que o próprio plugin acabou de inserir também passa por aqui: não gira duas vezes.
        if (decl.prop.startsWith('--') || !decl.value || decl.value.includes('--theme-hue')) return
        const rule = decl.parent
        if (rule?.type !== 'rule' && rule?.type !== 'atrule') return
        const selector = rule.type === 'rule' ? rule.selector : ''
        if (THEME_DEFINITION.test(selector) || SEMANTIC_SELECTOR.test(selector)) return
        if (rule.type === 'rule' && skipped(rule)) return
        if (skipped(decl)) return
        const value = themeValue(decl.value)
        if (value === undefined) return
        // A declaração original fica antes (navegador sem cor relativa usa ela); a girada vem depois e vence onde há suporte.
        decl.cloneAfter({ value })
      })
    },
  }
}
themeColors.postcss = true
