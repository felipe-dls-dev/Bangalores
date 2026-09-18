// scripts/generate-all-battle-sprites.cjs
// Refactored to generate battle sprite PNG placeholders according to BATTLE_SPRITE_PROMPTS.md
// This script creates empty PNG files with the correct naming convention and directory structure.
// It does NOT perform actual image generation; replace the placeholder creation with calls to your
// preferred image generation service (e.g., Antigravity, Stable Diffusion) using the anchor+reference workflow.

const fs = require('fs');
const path = require('path');

// Configuration extracted from BATTLE_SPRITE_PROMPTS.md
const HERO_IDS = [
  'guerreiro',
  'cacadora',
  'arcanista',
  'guardiao',
  'druida',
  'cacador',
  'monge',
  'sacerdotisa',
  'conjurador',
];

const ENEMY_IDS = [
  'sentinela-runas',
  'grumnak',
  'cabra-malgor',
  'ilusionista-areias',
  'guardia-seiva',
  'fanatico-orgulho',
  'corvo-ignaroth',
  'espectro-rainha',
];

// Animation states table (state -> frame count). Values taken from the document.
const ANIMATION_STATES = {
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
  defeat: 8,
};

// Output base directory (public assets folder)
const OUTPUT_BASE = path.resolve(__dirname, '..', 'public', 'assets', 'battle', 'sprites');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createPlaceholderPNG(filePath) {
  // Write a minimal PNG header (1x1 transparent pixel) to make the file a valid PNG.
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // signature
    0x00, 0x00, 0x00, 0x0d, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, // bit depth
    0x06, // color type RGBA
    0x00, // compression
    0x00, // filter
    0x00, // interlace
    0x1f, 0x15, 0xc4, 0x89, // CRC for IHDR
    0x00, 0x00, 0x00, 0x0a, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9c, 0x63, 0x60, 0x60, 0x60, 0x00, 0x00, 0x00, 0x05, 0x00, 0x01, // data (transparent)
    0x5d, 0xc2, 0x02, 0x5b, // CRC for IDAT
    0x00, 0x00, 0x00, 0x00, // IEND length
    0x49, 0x45, 0x4e, 0x44, // IEND
    0xae, 0x42, 0x60, 0x82, // CRC for IEND
  ]);
  fs.writeFileSync(filePath, pngHeader);
}

function generateForCategory(category, ids) {
  ids.forEach((id) => {
    const characterDir = path.join(OUTPUT_BASE, category, id);
    ensureDir(characterDir);
    Object.entries(ANIMATION_STATES).forEach(([state, frameCount]) => {
      for (let i = 0; i < frameCount; i++) {
        const frameIdx = String(i).padStart(2, '0');
        const fileName = `${state}_${frameIdx}.png`;
        const filePath = path.join(characterDir, fileName);
        if (!fs.existsSync(filePath)) {
          createPlaceholderPNG(filePath);
        }
      }
    });
  });
}

function main() {
  console.log('Generating placeholder battle sprite PNGs...');
  generateForCategory('heroes', HERO_IDS);
  generateForCategory('enemies', ENEMY_IDS);
  console.log('Generation complete.');
}

main();
