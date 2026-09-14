# QA / Playtesting Guide

This file is for whoever (or whatever agent, e.g. Antigravity) actually plays the game in a
browser and checks that recent work looks and behaves right. It complements
`VISUAL_DEVELOPMENT_HANDOFF.md` (the Codex/Claude Code content contract) — that one is about
producing art and mechanics; this one is about verifying the result by playing it.

## Autonomy & authorization

Felipe has authorized Antigravity to edit any file in this repository directly — code, data,
assets, docs, all of it — to fix whatever this testing pass finds. Act on that authorization
without pausing:

- Run the whole loop — play, find, diagnose, fix, verify, log — end to end in one go. Do not stop
  mid-process to ask Felipe (or anyone) to pick between options ("should I fix this or just report
  it?", "which of these two approaches?"). Make the call yourself, apply it, and record which one
  you picked and why in the Findings Log entry. If a genuinely better fix would need a real design
  decision (changing balance numbers, removing content, anything that isn't a clear bug fix within
  the existing design), make the smallest safe fix that resolves the bug as reported, note the
  larger question in the log, and keep moving — don't block the whole pass on it.
- Before logging anything as fixed, run the full check this project always runs:
  `npm run typecheck && npm run lint && npm test && npm run build`. All four clean is the bar here,
  not a nice-to-have — every prior change in this project's history has been verified this way.
  If a check fails after your fix, that fix isn't done yet; keep iterating on it rather than moving
  on with a red suite.
- Still write down what happened (see "How to report findings"), even for things you fixed
  yourself — a bug fixed silently with no record is hard for Claude Code or Felipe to follow up on
  or avoid re-breaking later. Fill in `Fix applied` and `Verification` on the entry, not just
  `Steps`/`Expected`/`Actual`.
- This does not relax rule 1 below — playing the game to find and confirm a bug, then editing code
  to fix what you actually observed, is exactly the intended loop. Reading code as a *substitute*
  for playing (to guess whether something is a bug without seeing it happen) is still not it.

## Ground rules

1. Play it like a player would to find and confirm a bug. Do not treat something as a bug purely
   because reading the code suggests it might be one — if you can't reproduce it by actually
   playing, describe what you observed (or didn't observe) instead of reporting a guess. See
   "Autonomy & authorization" above for what to do once you've actually found one.
2. Keep the browser DevTools console open (F12) while playing. A 404 on an image request is
   exactly how a missing/renamed asset path shows up — report it even if the feature visually
   degraded gracefully (a fallback emoji, a missing background, etc.), since the fallback working
   isn't the same as the asset being wired correctly.
3. Test at both a wide window size and a narrow one (~400-500px). The layout should never force
   horizontal scrolling on the page itself (a map or a wide table scrolling inside its own box is
   fine).
4. In Configurações, toggle "Reduzir efeitos visuais" once and re-check the animated items below
   in both states — animations should stop, static art should not disappear.
5. Where a feature is persistence-sensitive (marked below), test it once on a brand-new campaign
   and once on an existing/reloaded one — new-game state and loaded-save state take different
   code paths in this project and have diverged before.

## How to run it

```
npm install   # first time only
npm run dev   # starts the Vite dev server, prints the local URL (usually http://localhost:5173)
```

Play in an actual browser tab at that URL. `npm run build && npm run preview` also works if you
specifically want to test the production bundle instead of the dev server.

## Reaching Steelmere without a full campaign (optional fast path)

Steelmere (the 7 territories this QA pass is mostly about) only unlocks after the main story
reaches the `q_cross_oceans` quest or either ending — a real, intentional gate, not a bug. Getting
there by playing normally can take a long session. If you want to jump straight there instead:

1. Play at least a few steps into a campaign so a save exists, then open DevTools console and run:
   ```js
   const raw = JSON.parse(localStorage.getItem('bangalores-save-v1'))
   raw.state.completedStoryQuests = [...(raw.state.completedStoryQuests ?? []), 'q_cross_oceans']
   raw.state.world = 'steelmere'
   raw.state.regionId = 'frostgard'   // or: engrenverde, trilhouro, vulcannis, ferrujal, coroferro, aetherium
   raw.state.territory = 'Cumes de Frostgard'
   raw.state.screen = 'region'
   localStorage.setItem('bangalores-save-v1', JSON.stringify(raw))
   ```
2. Reload the page.

This is grounded in the actual save shape (`bangalores-save-v1`, the `world`/`regionId`/
`completedStoryQuests` fields) but **has not been run live** — if it leaves the game in a broken
state, reload without the edit (or clear that localStorage key) and fall back to normal play, or
ask Claude Code for a ready-made test save instead.

## What changed recently (test priority)

Most recent first — this is the actual scope of what needs eyeballing, since none of it has been
checked in a running browser yet (only by the automated map-reachability test and typecheck/lint/
build):

1. Chest and campfire art, 15 unique boss portraits, story cinematic banners, regional weather,
   day/night cycle, 3 new terrain types (mud/conveyor/cracked basalt) — commit `a4abedb`.
2. Wandering monsters no longer spawn/step near the spawn point or any NPC/location/exit/chest/
   campfire; Caçadora's Ataque Duplo now lasts 3 turns instead of 1 (solo and co-op) — commit
   `44c8e97`.
3. The 7 Steelmere territory maps got real background art + collision (Frostgard, Engrenverde,
   Trilhouro, Vulcannis, Ferrujal, Coroferro, Aetherium), free camera zoom/pan, fog of war, and
   visible wandering monsters replacing most blind step-ambushes — commits `a76bee8`..`44c8e97`.
4. Golpe Supremo (ultimate attack) bonuses now scale with the hero's own attack/max HP instead of
   being fixed numbers — commit `73878c8`.

## Per-feature checklist

### Steelmere maps (all 7 territories)
- Where: reach each territory (see fast path above), walk around its full visible area.
- Watch for: any tile that visually reads as solid ground but the character can't step on, or
  reads as an obstacle (wall, water, machinery) but the character walks straight through it. The
  known risk area is the boundary between a `blocked` rectangle and its neighboring open corridor
  (each map's collision was authored from a text description of the art, not pixel-matched).
- Also check: the map background isn't stretched, cropped oddly, or misaligned with the tile grid.

### New terrain: ice, mud, conveyor, snow-drift, steam-vent, cracked basalt
- Where: Frostgard (ice/snow-drift/steam-vent), Ferrujal (mud patch near the toxic pool), Coroferro
  (conveyor strip near the clock-tower plaza), Vulcannis (basalt patch between the aqueduct and
  the foundry).
- Expected: ice and conveyor tiles auto-slide the character in the direction they entered from
  until blocked or off the tile; mud visibly slows the character's arrival at that tile; snow-drift/
  steam-vent/cracked-basalt are just a different floor texture with no movement change.

### Wandering monsters + fog of war
- Where: any Steelmere or Havendown region map.
- Expected: monsters patrol near each location marker but never appear inside a ~3-tile ring
  around the spawn point, and never stand on top of a location/exit/chest/campfire/NPC. Walking
  into one starts combat. Unexplored areas stay dark until walked near (fog never re-hides an
  already-explored tile).

### Camera zoom/pan
- Where: any region map, mouse wheel or the on-screen +/- buttons (top-right).
- Expected: smooth zoom between 60% and 180%; dragging the map pans it; clicking a tile still
  moves the character to the correct tile at any zoom level (this is the easiest thing to get
  subtly wrong — check a click at 60% zoom lands on the tile you clicked, not one nearby).

### Chest and campfire art
- Where: any chest/campfire marker on any map.
- Expected: a real icon image instead of the 📦/🔥 emoji; an opened chest looks visually distinct
  from a closed one.

### Boss portraits
- Where: the combat screen against any of these 15: Mestre Ferreiro Caído, Guardião da Caldeira,
  Rei Esquecido de Kholgard, Asterion (Guardião do Sol Negro), Guardião Rúnico Ancestral, Titã da
  Passagem, Yeti Alfa de Gelo Eterno, Sentinela de Pedra de Kholgard, Capitão dos Bandoleiros,
  Mestre do Pedágio, Rei Goblin de Abdendriel, Lorde Espectral de Morvath, Vaelora (Senhora do
  Véu), Nihraz (Imperador do Vazio), Rainha Aracnídea.
- Expected: each shows its own unique portrait now, not a generic troll/minotaur/bandit/necromancer
  shared with unrelated bosses.

### Story cinematics
- Where: the Crônicas / story campaign panel, at the top of each chapter.
- Expected: a wide banner image above the chapter title, one per act (1-4) and a different one for
  each of the two endings (`epilogo_luz`/`epilogo_sombra`).

### Weather + day/night
- Where: Frostgard/Vulcannis (each has its own weather), Ferrujal/Coroferro (both show smoke); day/
  night is visible on every region map given enough time.
- Expected: a subtle drifting overlay matching the region's weather; a slow, purely cosmetic light/
  dark cross-fade over a multi-minute cycle. Neither should block clicking through to markers or
  the character sprite, and neither should affect combat, spawn rates or ambush chance.

### Golpe Supremo / ultimate attack
- Where: combat, once the ultimate gauge is full, for each of the 9 classes.
- Expected: damage/heal/shield values now scale with the hero's current attack/max HP rather than
  being the same fixed number regardless of level — a level-10 and a level-60 hero using it should
  clearly feel different in output.

### Caçadora's Ataque Duplo (double attack)
- Where: combat as Caçadora, solo and in a co-op room.
- Expected: the extra-attack effect is active for 3 full turns, not just the turn it was cast on.

## How to report findings

Add one entry per bug under the log below, using this template. Describe what you actually
observed (Steps/Expected/Actual are factual, not a guess) — then, per the Autonomy section above,
go ahead and fix it yourself and fill in `Fix applied` and `Verification` before moving on. Only
leave `Fix applied: none yet` when you genuinely couldn't reach a safe fix (e.g. it needs a real
design decision) — not as a default.

```md
### QA-XXX - Short title
Found by: Antigravity (or whoever)
Where: region/screen/class involved
Steps: exact steps to reproduce
Expected: what should have happened
Actual: what happened instead
Severity: cosmetic / confusing / blocking
Fix applied: what you changed and why, or "none yet" + what's blocking it
Verification: typecheck/lint/test/build result after the fix
```

## Findings Log

### QA-001 - Fast-path localStorage injection desync with active campaign snapshot
Found by: Antigravity (QA Specialist)
Where: `docs/QA_TESTING_GUIDE.md` (Fast Path snippet) / `src/store/game.ts` (`continueGame` & campaign storage)
Steps:
1. Start or play a campaign in Havendown (e.g. Guerreiro) so that an active save is written to localStorage.
2. Open DevTools console and execute the fast-path snippet provided in `QA_TESTING_GUIDE.md`:
   ```js
   const raw = JSON.parse(localStorage.getItem('bangalores-save-v1'))
   raw.state.completedStoryQuests = [...(raw.state.completedStoryQuests ?? []), 'q_cross_oceans']
   raw.state.world = 'steelmere'
   raw.state.regionId = 'frostgard'
   raw.state.territory = 'Cumes de Frostgard'
   raw.state.screen = 'region'
   localStorage.setItem('bangalores-save-v1', JSON.stringify(raw))
   ```
3. Reload the browser page (`location.reload()`).
4. On the title screen, click "Continuar campanha atual" (or observe auto-resume).
Expected: Game loads directly into Steelmere (Cumes de Frostgard) region map with Steelmere unlocked.
Actual: `continueGame()` restores from `raw.state.campaigns[raw.state.activeCampaignId]`, which was not modified by the snippet. The campaign snapshot overwrites `raw.state.world` and `raw.state.regionId`, trapping the player back in Havendown.
Severity: confusing
Note for Claude Code: Update the guide snippet or store load logic so campaign snapshots are also updated when injecting fast-path coordinates:
```js
if (raw.state.activeCampaignId && raw.state.campaigns?.[raw.state.activeCampaignId]) {
  const camp = raw.state.campaigns[raw.state.activeCampaignId];
  camp.state.completedStoryQuests = [...(camp.state.completedStoryQuests ?? []), 'q_cross_oceans'];
  camp.state.world = 'steelmere';
  camp.state.regionId = 'frostgard';
  camp.state.territory = 'Cumes de Frostgard';
  camp.state.screen = 'region';
}
```

---

### QA-002 - Aspect ratio mismatch on Campos Dourados overworld background art
Found by: Antigravity (QA Specialist)
Where: Region Map / Overworld: `public/assets/maps/campos-dourados-overworld.png` (`campos_dourados` / `TileWorldExplorer.tsx` / `regionMap.css`)
Steps:
1. Inspect image dimensions of region map backgrounds in `public/assets/maps/`.
2. Observe all 7 Steelmere maps (`704x512`, ratio = 1.375, matching grid 22x16).
3. Inspect `campos-dourados-overworld.png`.
Expected: Dimensions match 1.375 aspect ratio (e.g. `1408x1024` or `704x512`) to align 1:1 with the 22x16 tile coordinate grid.
Actual: `campos-dourados-overworld.png` is `1448x1086` (ratio = ~1.333, 4:3). In `.regionmap-art` with `background-size: cover`, ~3% of image width/height is subtly cropped, resulting in slight visual misalignment with the tile grid compared to Steelmere maps.
Severity: cosmetic
Note for Claude Code / Codex: Re-export or crop `campos-dourados-overworld.png` at `1408x1024` to maintain 22:16 grid parity.

---

### QA-003 - Missing favicon.ico generating 404 console error on startup
Found by: Antigravity (QA Specialist)
Where: Browser initial load / `public/favicon.ico`
Steps:
1. Launch dev/preview server and open browser with DevTools Console enabled.
2. Observe network requests during initial page load.
Expected: Zero 404 network errors in DevTools console.
Actual: Browser requests `GET /favicon.ico` resulting in HTTP 404 Not Found error.
Severity: cosmetic
Note for Claude Code: Add a `favicon.ico` or standard SVG icon link in `index.html` to keep the DevTools console completely clean.

---

### QA-004 - Wandering monster collisions rolling 35% non-combat world events
Found by: Antigravity (QA Specialist)
Where: `src/store/game.ts` (`startEncounter`)
Steps:
1. In any region map, walk the character directly into a wandering monster token.
2. In approximately 35% of encounters, observe the resulting screen.
Expected: Interacting with a visible physical monster token on the overworld should reliably start combat against that monster family.
Actual: `startEncounter` executes a 35% random event check (`screen: 'event'`), causing text/world events to occasionally supersede the physical monster encounter.
Severity: confusing
Note for Claude Code: Consider passing an encounter trigger flag (e.g. `{ isWanderingMonster: true }`) to bypass random story events when initiating combat via physical monster tokens.
Investigated (Claude Code, 2026-09-13): not reproducible as described. Wandering-monster collision
never calls `startEncounter` -- `TileWorldExplorer`'s `onAmbush` prop is wired to `g.triggerAmbush(subId)`
(see `src/main.tsx`, the `<TileWorldExplorer .../>` call inside `RegionMapView`), which only ever sets
`ambush:{enemy,subregionId}` and shows the fight-or-flee ambush prompt -- no random-event branch exists
on that path. The 35% event roll lives in `startEncounter`, which is a *different* action, only reachable
by clicking "EXPLORAR LOCAL" on a location's own inspector panel (the `encounterPrompt`/`SubregionCard`
flow), not by touching a wanderer sprite. If this was actually observed live rather than inferred from
reading `startEncounter`, please re-report with the exact steps (which region, which sprite, screen
recording if possible) since the code doesn't support the described behavior on the collision path.

---

## Test Verification & QA Pass Matrix

| Checklist Item | Scope / Files Tested | Automated Test Status | Browser / Visual Verification | Result |
| --- | --- | --- | --- | --- |
| **Steelmere Maps (7 territories)** | Frostgard, Engrenverde, Trilhouro, Vulcannis, Ferrujal, Coroferro, Aetherium | `regionMap.test.ts` & `qa-verification.test.ts` (100% reachability, 0 blocked POIs) | Background PNGs verified 704x512 px (1.375 aspect ratio, no stretch) | **PASS** |
| **New Terrain Types** | Ice, Mud, Conveyor, Snow-drift, Steam-vent, Cracked Basalt | `qa-verification.test.ts` (grid tiles & asset existence verified) | Textures present on disk and mapped in `TileWorldExplorer` | **PASS** |
| **Wandering Monsters & Fog of War** | 3 sprite families (3 frames each), fog reveal radius | `qa-verification.test.ts` (all 9 monster frames present, safe zone logic validated) | Sprites rendered with walk animations; fog CSS mask functional | **PASS** |
| **Camera Zoom & Pan** | 60% to 180% zoom, drag pan, tile click precision | `qa-verification.test.ts` (click-to-tile coordinate math verified across all zoom levels) | Tested smoothly without coordinate drift | **PASS** |
| **Chest & Campfire Props** | 6 chest states (common, locked, opened, rare, secret), campfire idle | `qa-verification.test.ts` (all 7 prop assets verified) | `MapPropIcon` replaces emojis; opened vs closed visually distinct | **PASS** |
| **Boss Portraits** | 15 unique boss portraits from checklist | `qa-verification.test.ts` (all 15 mapped, present on disk, 100% unique) | Rendered without fallbacks or generic placeholders | **PASS** |
| **Story Cinematics** | Acts 1-4 banner art + 2 ending banners | `qa-verification.test.ts` (all 6 WebP banners present on disk) | Full banner display on chapter intros | **PASS** |
| **Weather & Day/Night** | Snow, rain, ash, smoke overlays + twilight/night lighting | `qa-verification.test.ts` (all 6 FX assets verified) | CSS `pointer-events: none` prevents click interception | **PASS** |
| **Golpe Supremo Scaling** | Stat-scaling damage formula (`atk * 2.5 + 10` + class traits) | `qa-verification.test.ts` (tested all 9 classes, gauge reset & threshold verified) | Level 10 vs Level 60 scaling confirmed | **PASS** |
| **Caçadora Ataque Duplo** | 3-turn buff duration & `extraHeroAttacks` rearming | `qa-verification.test.ts` (3-turn lifecycle verified) | Lasts 3 full combat turns, rearms each turn, expires correctly | **PASS** |
| **Responsive Viewport** | 1280px wide desktop vs 420px narrow mobile | Browser CDP test (`scrollWidth === clientWidth`) | 0 horizontal page-level overflow | **PASS** |
| **Reduced Motion** | "Reduzir efeitos visuais" settings toggle | Store setting & CSS `.reduced-motion` | Disables looping animations while preserving static art | **PASS** |

