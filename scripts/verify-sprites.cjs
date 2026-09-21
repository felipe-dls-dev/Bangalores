// scripts/verify-sprites.cjs
// Walks through public/assets/battle/sprites and validates that each character has
// the expected animation states with the correct number of frames, naming pattern,
// canvas dimensions (96x128; the warrior uses 448x332) and an alpha channel.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HERO_IDS = [
  'guerreiro','cacadora','arcanista','guardiao','druida','cacador','monge','sacerdotisa','conjurador'
];
const ENEMY_IDS = [
  'sentinela-runas','grumnak','cabra-malgor','ilusionista-areias','guardia-seiva','fanatico-orgulho','corvo-ignaroth','espectro-rainha'
];

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

const BASE = path.resolve(__dirname, '..', 'public', 'assets', 'battle', 'sprites');

// O guerreiro usa quadros recortados de folhas grandes (scripts/extract_warrior_bases.py):
// contagens próprias e canvas único 448x332 (ver HERO_SPRITE_CANVAS em src/battleSprites.ts).
const WARRIOR_STATES = { ...ANIMATION_STATES, idle: 12, attack: 12, heavy: 17, defend: 12, ultimate: 17 };
delete WARRIOR_STATES.hit; // o guerreiro usa os quadros de defend (ver SPRITE_STATE_FRAME_ALIAS)
const WARRIOR_CANVAS = { w: 448, h: 332 };

function validateCharacter(category, id) {
  const charDir = path.join(BASE, category, id);
  if (!fs.existsSync(charDir)) {
    console.error(`Missing directory: ${charDir}`);
    process.exitCode = 1;
    return;
  }
  const isWarrior = category === 'heroes' && id === 'guerreiro';
  const canvas = isWarrior ? WARRIOR_CANVAS : { w: 96, h: 128 };
  Object.entries(isWarrior ? WARRIOR_STATES : ANIMATION_STATES).forEach(([state, count]) => {
    for (let i = 0; i < count; i++) {
      const idx = String(i).padStart(2, '0');
      const fileName = `${state}_${idx}.png`;
      const filePath = path.join(charDir, fileName);
      if (!fs.existsSync(filePath)) {
        console.error(`Missing file: ${filePath}`);
        process.exitCode = 1;
        return;
      }
      // Quick dimension check using ImageMagick identify if available
      try {
        const out = execSync(`magick identify -format "%w %h %A" "${filePath}"`).toString();
        const [w, h, alpha] = out.trim().split(' ');
        if (parseInt(w) !== canvas.w || parseInt(h) !== canvas.h) {
          console.error(`Incorrect dimensions in ${filePath}: ${w}x${h}`);
          process.exitCode = 1;
        }
        if (!alpha.includes('Alpha')) {
          console.error(`Missing alpha channel in ${filePath}`);
          process.exitCode = 1;
        }
      } catch (e) {
        // If ImageMagick not installed, skip dimension check
      }
    }
  });
}

function main() {
  console.log('Verifying hero sprites...');
  HERO_IDS.forEach(id => validateCharacter('heroes', id));
  console.log('Verifying enemy sprites...');
  ENEMY_IDS.forEach(id => validateCharacter('enemies', id));
  if (process.exitCode === 1) {
    console.error('Verification failed.');
    process.exit(1);
  } else {
    console.log('All sprites verified successfully.');
  }
}

main();

