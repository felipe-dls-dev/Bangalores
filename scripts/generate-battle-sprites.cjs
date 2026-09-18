/**
 * scripts/generate-battle-sprites.cjs
 *
 * Gerador de sprites de batalha para o modo "Carta Virada + Lutadores Animados"
 * conforme especificado em docs/BATTLE_SPRITE_PROMPTS.md.
 *
 * Gera frames 512x512 PNG com alpha, pixel art com bordas duras,
 * pés ancorados na linha do chão (y=440), personagem voltado para a direita.
 */

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

function crc32(buf) {
  let table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1))
    table[i] = c
  }
  let crc = -1
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF]
  return (crc ^ -1) >>> 0
}

function makeChunk(type, data) {
  const len = data.length
  const buf = Buffer.alloc(4 + 4 + len + 4)
  buf.writeUInt32BE(len, 0)
  buf.write(type, 4, 4, 'ascii')
  data.copy(buf, 8)
  const crcVal = crc32(buf.slice(4, 8 + len))
  buf.writeUInt32BE(crcVal, 8 + len)
  return buf
}

function encodePNG(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdrData = Buffer.alloc(13)
  ihdrData.writeUInt32BE(width, 0)
  ihdrData.writeUInt32BE(height, 4)
  ihdrData[8] = 8
  ihdrData[9] = 6
  ihdrData[10] = 0
  ihdrData[11] = 0
  ihdrData[12] = 0
  const ihdrChunk = makeChunk('IHDR', ihdrData)

  const rowSize = 1 + width * 4
  const rawScanlines = Buffer.alloc(height * rowSize)
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize
    rawScanlines[rowOffset] = 0
    rgbaBuffer.copy(rawScanlines, rowOffset + 1, y * width * 4, (y + 1) * width * 4)
  }

  const compressedData = zlib.deflateSync(rawScanlines, { level: 6 })
  const idatChunk = makeChunk('IDAT', compressedData)
  const iendChunk = makeChunk('IEND', Buffer.alloc(0))
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk])
}

class PixelGrid {
  constructor(w = 64, h = 64, scale = 8) {
    this.w = w
    this.h = h
    this.scale = scale
    this.canvasW = w * scale // 512
    this.canvasH = h * scale // 512
    this.buffer = Buffer.alloc(this.canvasW * this.canvasH * 4)
  }

  setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return
    const s = this.scale
    for (let sy = 0; sy < s; sy++) {
      const py = y * s + sy
      for (let sx = 0; sx < s; sx++) {
        const px = x * s + sx
        const idx = (py * this.canvasW + px) * 4
        this.buffer[idx] = r
        this.buffer[idx + 1] = g
        this.buffer[idx + 2] = b
        this.buffer[idx + 3] = a
      }
    }
  }

  drawRect(x, y, w, h, [r, g, b, a = 255]) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.setPixel(x + dx, y + dy, r, g, b, a)
      }
    }
  }

  drawCircle(cx, cy, radius, color) {
    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        if (x * x + y * y <= radius * radius) {
          this.setPixel(cx + x, cy + y, ...color)
        }
      }
    }
  }

  toPNG() {
    return encodePNG(this.canvasW, this.canvasH, this.buffer)
  }
}

// Paletas retrô arcade 90s
const PAL_GUERREIRO = {
  skin: [230, 180, 140],
  steel: [140, 155, 175],
  steelDark: [70, 80, 95],
  steelLight: [210, 225, 240],
  ember: [235, 80, 30],
  gold: [230, 170, 40],
  leather: [100, 65, 45],
  shadow: [40, 30, 45, 140]
}

const PAL_SENTINELA = {
  stone: [110, 115, 125],
  stoneDark: [60, 62, 70],
  stoneLight: [165, 170, 185],
  runeGlow: [64, 210, 245],
  runeCore: [200, 248, 255],
  bronze: [160, 110, 50],
  shadow: [30, 35, 45, 150]
}

const PAL_GRUMNAK = {
  skin: [95, 130, 85],
  skinDark: [60, 85, 55],
  leather: [90, 60, 40],
  iron: [100, 105, 115],
  goldCoin: [240, 190, 40],
  cloth: [130, 50, 40],
  shadow: [30, 35, 30, 140]
}

const PAL_FX = {
  fire: [[255, 230, 80], [255, 140, 30], [220, 50, 20]],
  spark: [[255, 255, 255], [120, 220, 255], [40, 140, 240]],
  heal: [[220, 255, 200], [90, 240, 120], [240, 220, 90]]
}

/**
 * Renderiza um frame do Guerreiro
 */
function renderGuerreiroFrame(state, frame, maxFrames) {
  const g = new PixelGrid(64, 64, 8)
  const baseY = 55 // chão nos pés (55 * 8 = 440px)
  let ox = 24, oy = baseY

  // Sombra nos pés
  g.drawRect(ox - 8, oy - 2, 22, 3, PAL_GUERREIRO.shadow)

  // Deslocamento por estado de animação
  let breathY = 0
  let attackSwing = 0
  let swordX = 0, swordY = 0
  let shieldX = 0, shieldY = 0
  let recoilX = 0

  if (state === 'idle') {
    breathY = Math.round(Math.sin((frame / maxFrames) * Math.PI * 2) * 1.5)
  } else if (state === 'stance_offensive') {
    ox += 3
    breathY = Math.round(Math.sin((frame / maxFrames) * Math.PI * 2) * 1)
  } else if (state === 'stance_defensive') {
    oy += 1
    shieldX += 2
  } else if (state === 'attack') {
    if (frame < 2) { ox -= 2; swordX = -4 } // antecipação
    else if (frame < 5) { ox += 6; attackSwing = 1; swordX = 14 } // golpe
    else { ox += 2; swordX = 6 } // recuperação
  } else if (state === 'heavy' || state === 'ultimate') {
    if (frame < 4) { ox -= 4; swordY = -8; swordX = -2 }
    else if (frame < 7) { ox += 10; attackSwing = 2; swordX = 18; swordY = 4 }
    else { ox += 4; swordX = 8 }
  } else if (state === 'defend') {
    shieldX = 4
    ox -= 1
  } else if (state === 'hit') {
    recoilX = - (4 - frame) * 2
    ox += recoilX
  } else if (state === 'dodge') {
    ox += frame < 3 ? -6 : -2
  } else if (state === 'potion') {
    if (frame >= 2 && frame <= 4) swordY = -6
  } else if (state === 'skill') {
    swordY = -10
    swordX = 2
  } else if (state === 'victory') {
    swordY = -6
    shieldX = -4
  } else if (state === 'defeat') {
    const fall = Math.min(6, frame)
    oy += fall
    ox -= 2
  }

  const bodyY = oy - 26 + breathY

  // Pernas / Botas
  g.drawRect(ox - 4, oy - 10, 5, 10, PAL_GUERREIRO.steelDark)
  g.drawRect(ox + 3, oy - 10, 5, 10, PAL_GUERREIRO.steelDark)
  g.drawRect(ox - 5, oy - 3, 7, 3, PAL_GUERREIRO.leather)
  g.drawRect(ox + 2, oy - 3, 7, 3, PAL_GUERREIRO.leather)

  // Torso / Armadura
  g.drawRect(ox - 5, bodyY + 6, 14, 11, PAL_GUERREIRO.steel)
  g.drawRect(ox - 3, bodyY + 7, 10, 9, PAL_GUERREIRO.steelLight)
  g.drawRect(ox - 5, bodyY + 16, 14, 2, PAL_GUERREIRO.gold) // cinto

  // Capa / Detalhe de brasa
  g.drawRect(ox - 8, bodyY + 8, 4, 12 + breathY, PAL_GUERREIRO.ember)

  // Cabeça / Elmo
  g.drawRect(ox - 2, bodyY - 6, 10, 11, PAL_GUERREIRO.steelDark)
  g.drawRect(ox - 1, bodyY - 5, 8, 8, PAL_GUERREIRO.steel)
  g.drawRect(ox + 3, bodyY - 2, 4, 2, PAL_GUERREIRO.ember) // fenda visor incandescente
  g.drawRect(ox, bodyY - 9, 5, 3, PAL_GUERREIRO.gold) // crista

  // Escudo (braço esquerdo/traseiro)
  const shX = ox - 7 + shieldX
  const shY = bodyY + 5 + shieldY
  g.drawRect(shX, shY, 6, 14, PAL_GUERREIRO.steelDark)
  g.drawRect(shX + 1, shY + 1, 4, 12, PAL_GUERREIRO.ember)
  g.drawRect(shX + 2, shY + 4, 2, 6, PAL_GUERREIRO.gold)

  // Espada (braço direito/frontal)
  const swX = ox + 8 + swordX
  const swY = bodyY + 8 + swordY
  g.drawRect(swX - 1, swY - 2, 4, 4, PAL_GUERREIRO.gold) // guarda
  g.drawRect(swX + 1, swY - 14, 2, 12, PAL_GUERREIRO.steelLight) // lâmina
  g.drawRect(swX + 2, swY - 12, 1, 10, PAL_GUERREIRO.ember) // fio de brasa

  // Rastro de ataque (smear)
  if (attackSwing === 1) {
    g.drawRect(swX + 4, swY - 16, 8, 3, PAL_GUERREIRO.steelLight)
    g.drawRect(swX + 8, swY - 14, 6, 4, PAL_GUERREIRO.ember)
  } else if (attackSwing === 2) {
    g.drawRect(swX + 4, swY - 20, 14, 4, [255, 240, 180])
    g.drawRect(swX + 8, swY - 16, 12, 6, PAL_GUERREIRO.ember)
  }

  // Aura de habilidade
  if (state === 'skill' || state === 'ultimate') {
    g.drawCircle(ox + 5, bodyY - 10, 6 + (frame % 3), [240, 180, 50, 180])
  }

  return g.toPNG()
}

/**
 * Renderiza um frame do Sentinela das Runas
 */
function renderSentinelaFrame(state, frame, maxFrames) {
  const g = new PixelGrid(64, 64, 8)
  const baseY = 55
  let ox = 26, oy = baseY

  g.drawRect(ox - 9, oy - 2, 24, 3, PAL_SENTINELA.shadow)

  let breathY = 0
  let attackSwing = 0
  let fistX = 0, fistY = 0

  if (state === 'idle') {
    breathY = Math.round(Math.sin((frame / maxFrames) * Math.PI * 2) * 1.5)
  } else if (state === 'attack') {
    if (frame < 3) { ox -= 2; fistX = -4; fistY = -6 }
    else if (frame < 6) { ox += 7; attackSwing = 1; fistX = 14; fistY = 4 }
    else { ox += 2; fistX = 4 }
  } else if (state === 'defend') {
    fistX = 2; fistY = -2
  } else if (state === 'hit') {
    ox -= (4 - frame) * 2
  } else if (state === 'skill') {
    fistY = frame < 4 ? -8 : 6
    if (frame >= 4) attackSwing = 2
  } else if (state === 'victory') {
    fistY = -8
  } else if (state === 'defeat') {
    oy += Math.min(8, frame * 2)
  }

  const bodyY = oy - 28 + breathY

  // Pernas de pedra maciça
  g.drawRect(ox - 6, oy - 12, 7, 12, PAL_SENTINELA.stoneDark)
  g.drawRect(ox + 3, oy - 12, 7, 12, PAL_SENTINELA.stoneDark)
  g.drawRect(ox - 4, oy - 8, 2, 6, PAL_SENTINELA.runeGlow)

  // Torso de monolito
  g.drawRect(ox - 8, bodyY + 4, 18, 15, PAL_SENTINELA.stone)
  g.drawRect(ox - 6, bodyY + 6, 14, 11, PAL_SENTINELA.stoneDark)
  // Runas brilhantes esculpidas
  g.drawRect(ox - 3, bodyY + 7, 8, 2, PAL_SENTINELA.runeGlow)
  g.drawRect(ox + 1, bodyY + 9, 2, 6, PAL_SENTINELA.runeCore)
  g.drawRect(ox - 2, bodyY + 13, 6, 2, PAL_SENTINELA.runeGlow)

  // Cabeça monolítica com olho rúnico
  g.drawRect(ox - 4, bodyY - 7, 11, 10, PAL_SENTINELA.stoneDark)
  g.drawRect(ox - 3, bodyY - 6, 9, 8, PAL_SENTINELA.stone)
  g.drawRect(ox + 1, bodyY - 3, 4, 3, PAL_SENTINELA.runeCore) // olho luminoso

  // Braços e Punho de Pedra
  const fX = ox + 9 + fistX
  const fY = bodyY + 8 + fistY
  g.drawRect(fX - 2, fY - 2, 8, 8, PAL_SENTINELA.bronze)
  g.drawRect(fX, fY, 8, 8, PAL_SENTINELA.stoneDark)
  g.drawRect(fX + 2, fY + 2, 4, 4, PAL_SENTINELA.runeGlow)

  if (attackSwing === 1) {
    g.drawRect(fX + 8, fY - 4, 10, 8, PAL_SENTINELA.runeGlow)
  } else if (attackSwing === 2) {
    // Fissura no chão
    g.drawRect(ox + 12, oy - 4, 16, 4, PAL_SENTINELA.runeCore)
    g.drawRect(ox + 10, oy - 6, 20, 2, PAL_SENTINELA.runeGlow)
  }

  return g.toPNG()
}

const PAL_CACADORA = {
  skin: [235, 195, 175],
  leather: [45, 40, 55],
  leatherLight: [80, 70, 100],
  dagger: [225, 235, 250],
  shadowGlow: [150, 60, 220],
  hair: [140, 65, 35],
  shadow: [30, 25, 40, 140]
}

const PAL_MONGE = {
  skin: [210, 155, 105],
  robe: [235, 115, 25],
  robeDark: [55, 45, 55],
  wrap: [230, 220, 205],
  ember: [255, 180, 40],
  shadow: [35, 30, 40, 140]
}

function renderCacadoraFrame(state, frame, maxFrames) {
  const g = new PixelGrid(64, 64, 8)
  const baseY = 55
  let ox = 25, oy = baseY
  g.drawRect(ox - 7, oy - 2, 20, 3, PAL_CACADORA.shadow)

  let breathY = 0
  let dagger1X = 0, dagger1Y = 0
  let dagger2X = 0, dagger2Y = 0
  let slashTrail = false

  if (state === 'idle') {
    breathY = Math.round(Math.sin((frame / maxFrames) * Math.PI * 2) * 1.5)
  } else if (state === 'attack' || state === 'heavy') {
    if (frame < 2) { ox -= 3; dagger1X = -4 }
    else if (frame < 5) { ox += 8; dagger1X = 14; dagger2X = 10; slashTrail = true }
    else { ox += 2; dagger1X = 4 }
  } else if (state === 'hit') {
    ox -= (4 - frame) * 2
  } else if (state === 'defeat') {
    oy += Math.min(7, frame)
  }

  const bodyY = oy - 26 + breathY

  // Pernas
  g.drawRect(ox - 3, oy - 11, 4, 11, PAL_CACADORA.leather)
  g.drawRect(ox + 3, oy - 11, 4, 11, PAL_CACADORA.leather)

  // Torso / Traje leve
  g.drawRect(ox - 4, bodyY + 6, 12, 10, PAL_CACADORA.leather)
  g.drawRect(ox - 2, bodyY + 8, 8, 7, PAL_CACADORA.leatherLight)

  // Cabeça e capuz / cabelo
  g.drawRect(ox - 2, bodyY - 6, 8, 10, PAL_CACADORA.hair)
  g.drawRect(ox, bodyY - 4, 6, 6, PAL_CACADORA.skin)
  g.drawRect(ox + 3, bodyY - 2, 2, 2, [50, 40, 60]) // olhos

  // Adagas gêmeas
  const d1X = ox + 8 + dagger1X, d1Y = bodyY + 6 + dagger1Y
  const d2X = ox - 6 + dagger2X, d2Y = bodyY + 8 + dagger2Y

  g.drawRect(d1X, d1Y - 8, 2, 8, PAL_CACADORA.dagger)
  g.drawRect(d1X + 1, d1Y - 6, 1, 6, PAL_CACADORA.shadowGlow)
  g.drawRect(d2X, d2Y - 6, 2, 7, PAL_CACADORA.dagger)

  if (slashTrail) {
    g.drawRect(d1X + 2, d1Y - 12, 10, 2, PAL_CACADORA.shadowGlow)
    g.drawRect(d1X + 4, d1Y - 8, 8, 2, PAL_CACADORA.dagger)
  }

  return g.toPNG()
}

function renderMongeFrame(state, frame, maxFrames) {
  const g = new PixelGrid(64, 64, 8)
  const baseY = 55
  let ox = 25, oy = baseY
  g.drawRect(ox - 8, oy - 2, 22, 3, PAL_MONGE.shadow)

  let breathY = 0
  let punchX = 0, punchY = 0
  let flamePunch = false

  if (state === 'idle') {
    breathY = Math.round(Math.sin((frame / maxFrames) * Math.PI * 2) * 1.5)
  } else if (state === 'attack' || state === 'heavy' || state === 'skill') {
    if (frame < 2) { ox -= 2; punchX = -4 }
    else if (frame < 6) { ox += 9; punchX = 14; flamePunch = true }
    else { ox += 2; punchX = 4 }
  } else if (state === 'hit') {
    ox -= (4 - frame) * 2
  } else if (state === 'defeat') {
    oy += Math.min(7, frame)
  }

  const bodyY = oy - 26 + breathY

  // Pernas
  g.drawRect(ox - 4, oy - 11, 5, 11, PAL_MONGE.robeDark)
  g.drawRect(ox + 3, oy - 11, 5, 11, PAL_MONGE.robeDark)

  // Túnica do Monge de Fogo
  g.drawRect(ox - 5, bodyY + 6, 13, 11, PAL_MONGE.robe)
  g.drawRect(ox - 3, bodyY + 8, 9, 8, PAL_MONGE.robeDark)
  g.drawRect(ox - 5, bodyY + 16, 13, 2, PAL_MONGE.wrap)

  // Cabeça
  g.drawRect(ox - 1, bodyY - 6, 8, 9, PAL_MONGE.skin)
  g.drawRect(ox + 3, bodyY - 3, 2, 2, [30, 25, 35]) // olhar focado

  // Punho / Faixas com chamas
  const pX = ox + 8 + punchX, pY = bodyY + 7 + punchY
  g.drawRect(pX, pY, 5, 5, PAL_MONGE.wrap)

  if (flamePunch) {
    g.drawCircle(pX + 5, pY + 2, 5, PAL_MONGE.ember)
    g.drawRect(pX + 3, pY - 2, 8, 6, [255, 240, 100])
  }

  return g.toPNG()
}

/**
 * Renderiza um frame de Grumnak
 */
function renderGrumnakFrame(state, frame, maxFrames) {
  const g = new PixelGrid(64, 64, 8)
  const baseY = 55
  let ox = 26, oy = baseY

  g.drawRect(ox - 8, oy - 2, 22, 3, PAL_GRUMNAK.shadow)

  let breathY = 0
  let cudgelX = 0, cudgelY = 0

  if (state === 'idle') {
    breathY = Math.round(Math.sin((frame / maxFrames) * Math.PI * 2) * 1.5)
  } else if (state === 'attack') {
    if (frame < 3) { ox -= 2; cudgelX = -6; cudgelY = -8 }
    else if (frame < 6) { ox += 8; cudgelX = 14; cudgelY = 4 }
    else { ox += 2; cudgelX = 4 }
  } else if (state === 'hit') {
    ox -= (4 - frame) * 2
  } else if (state === 'defeat') {
    oy += Math.min(8, frame * 2)
  }

  const bodyY = oy - 25 + breathY

  // Pernas
  g.drawRect(ox - 5, oy - 10, 6, 10, PAL_GRUMNAK.leather)
  g.drawRect(ox + 2, oy - 10, 6, 10, PAL_GRUMNAK.leather)

  // Torso e gibão de couro
  g.drawRect(ox - 6, bodyY + 6, 16, 12, PAL_GRUMNAK.leather)
  g.drawRect(ox - 4, bodyY + 8, 11, 8, PAL_GRUMNAK.iron)
  g.drawRect(ox + 4, bodyY + 12, 4, 5, PAL_GRUMNAK.goldCoin) // saco de moedas

  // Cabeça e queixo bruto
  g.drawRect(ox - 3, bodyY - 5, 10, 10, PAL_GRUMNAK.skin)
  g.drawRect(ox + 3, bodyY - 2, 2, 2, [250, 60, 40]) // olho agressivo
  g.drawRect(ox - 4, bodyY - 6, 11, 3, PAL_GRUMNAK.iron) // elmo simples

  // Tacape com cravos de ferro
  const cX = ox + 8 + cudgelX
  const cY = bodyY + 4 + cudgelY
  g.drawRect(cX, cY - 8, 4, 14, PAL_GRUMNAK.leather)
  g.drawRect(cX - 1, cY - 14, 6, 8, PAL_GRUMNAK.iron)
  g.drawRect(cX - 2, cY - 12, 8, 2, [220, 220, 220]) // cravos

  return g.toPNG()
}

/**
 * Renderiza um frame de FX
 */
function renderFxFrame(type, frame, maxFrames) {
  const g = new PixelGrid(32, 32, 16) // 32x32 com escala 16 = 512x512
  const progress = frame / maxFrames

  if (type === 'impact-slash') {
    const x = 8 + Math.round(progress * 16)
    const y = 8 + Math.round(progress * 14)
    g.drawRect(x - 4, y - 2, 8, 4, PAL_FX.fire[0])
    g.drawRect(x - 2, y - 4, 12, 3, PAL_FX.fire[1])
    g.drawCircle(x, y, 3, PAL_FX.fire[2])
  } else if (type === 'block-spark') {
    const rad = Math.round((1 - Math.abs(progress - 0.5) * 2) * 6)
    g.drawCircle(16, 16, Math.max(1, rad), PAL_FX.spark[1])
    g.drawRect(15, 15, 3, 3, PAL_FX.spark[0])
  } else if (type === 'heal-glow') {
    const y = 26 - Math.round(progress * 18)
    g.drawCircle(16, y, 4, PAL_FX.heal[1])
    g.drawCircle(12, y + 4, 3, PAL_FX.heal[0])
    g.drawCircle(20, y + 2, 3, PAL_FX.heal[2])
  } else if (type === 'status-fire') {
    const h = 6 + Math.round(Math.sin(progress * Math.PI * 2) * 3)
    g.drawRect(14, 20 - h, 5, h, PAL_FX.fire[1])
    g.drawRect(15, 18 - h, 3, 4, PAL_FX.fire[0])
  }

  return g.toPNG()
}

// Execução principal da geração de assets
async function main() {
  const root = path.resolve(__dirname, '..')
  const baseDir = path.join(root, 'public', 'assets', 'battle')
  console.log('[SpriteGen] Gerando catálogo de sprites piloto em:', baseDir)

  // 1. Guerreiro
  const guerreiroStates = {
    idle: 6,
    stance_offensive: 6,
    stance_defensive: 6,
    attack: 8,
    heavy: 10,
    defend: 5,
    hit: 4,
    dodge: 5,
    potion: 7,
    skill: 10,
    ultimate: 12,
    victory: 8,
    defeat: 8
  }

  const guerreiroDir = path.join(baseDir, 'sprites', 'heroes', 'guerreiro')
  fs.mkdirSync(guerreiroDir, { recursive: true })
  let count = 0
  for (const [state, frames] of Object.entries(guerreiroStates)) {
    for (let f = 0; f < frames; f++) {
      const p = String(f).padStart(2, '0')
      const file = path.join(guerreiroDir, `${state}_${p}.png`)
      fs.writeFileSync(file, renderGuerreiroFrame(state, f, frames))
      count++
    }
  }
  console.log(`[SpriteGen] Guerreiro: ${count} frames gerados.`)

  // 1.2 Cacadora
  const cacadoraDir = path.join(baseDir, 'sprites', 'heroes', 'cacadora')
  fs.mkdirSync(cacadoraDir, { recursive: true })
  count = 0
  for (const [state, frames] of Object.entries(guerreiroStates)) {
    for (let f = 0; f < frames; f++) {
      const p = String(f).padStart(2, '0')
      const file = path.join(cacadoraDir, `${state}_${p}.png`)
      fs.writeFileSync(file, renderCacadoraFrame(state, f, frames))
      count++
    }
  }
  console.log(`[SpriteGen] Cacadora: ${count} frames gerados.`)

  // 1.3 Monge
  const mongeDir = path.join(baseDir, 'sprites', 'heroes', 'monge')
  fs.mkdirSync(mongeDir, { recursive: true })
  count = 0
  for (const [state, frames] of Object.entries(guerreiroStates)) {
    for (let f = 0; f < frames; f++) {
      const p = String(f).padStart(2, '0')
      const file = path.join(mongeDir, `${state}_${p}.png`)
      fs.writeFileSync(file, renderMongeFrame(state, f, frames))
      count++
    }
  }
  console.log(`[SpriteGen] Monge: ${count} frames gerados.`)

  // 2. Sentinela das Runas
  const sentinelaStates = {
    idle: 6,
    attack: 8,
    defend: 5,
    hit: 4,
    skill: 10,
    victory: 8,
    defeat: 8
  }
  const sentinelaDir = path.join(baseDir, 'sprites', 'enemies', 'sentinela-runas')
  fs.mkdirSync(sentinelaDir, { recursive: true })
  count = 0
  for (const [state, frames] of Object.entries(sentinelaStates)) {
    for (let f = 0; f < frames; f++) {
      const p = String(f).padStart(2, '0')
      const file = path.join(sentinelaDir, `${state}_${p}.png`)
      fs.writeFileSync(file, renderSentinelaFrame(state, f, frames))
      count++
    }
  }
  console.log(`[SpriteGen] Sentinela-runas: ${count} frames gerados.`)

  // 3. Grumnak
  const grumnakStates = {
    idle: 6,
    attack: 8,
    defend: 5,
    hit: 4,
    skill: 10,
    victory: 8,
    defeat: 8
  }
  const grumnakDir = path.join(baseDir, 'sprites', 'enemies', 'grumnak')
  fs.mkdirSync(grumnakDir, { recursive: true })
  count = 0
  for (const [state, frames] of Object.entries(grumnakStates)) {
    for (let f = 0; f < frames; f++) {
      const p = String(f).padStart(2, '0')
      const file = path.join(grumnakDir, `${state}_${p}.png`)
      fs.writeFileSync(file, renderGrumnakFrame(state, f, frames))
      count++
    }
  }
  console.log(`[SpriteGen] Grumnak: ${count} frames gerados.`)

  // 4. FX
  const fxTypes = {
    'impact-slash': 6,
    'block-spark': 5,
    'heal-glow': 7,
    'status-fire': 7
  }
  count = 0
  for (const [fx, frames] of Object.entries(fxTypes)) {
    const fxDir = path.join(baseDir, 'fx', fx)
    fs.mkdirSync(fxDir, { recursive: true })
    for (let f = 0; f < frames; f++) {
      const p = String(f).padStart(2, '0')
      const file = path.join(fxDir, `fx_${p}.png`)
      fs.writeFileSync(file, renderFxFrame(fx, f, frames))
      count++
    }
  }
  console.log(`[SpriteGen] FX: ${count} frames gerados.`)
  console.log('[SpriteGen] Geração concluída com sucesso!')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
