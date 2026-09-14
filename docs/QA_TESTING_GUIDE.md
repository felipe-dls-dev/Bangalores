# QA / Playtesting Guide

This file is for whoever (or whatever agent, e.g. Antigravity) actually plays the game in a
browser and checks that recent work looks and behaves right. It complements
`VISUAL_DEVELOPMENT_HANDOFF.md` (the Codex/Claude Code content contract) — that one is about
producing art and mechanics; this one is about verifying the result by playing it.

## Ground rules

1. Play it like a player would. Do not read or edit source code to verify something — if a
   bug can only be confirmed by reading code, that's not a playtest finding, describe what you
   observed on screen instead.
2. Do not fix bugs directly in code. Report them (see "How to report findings" below) so Claude
   Code can fix them with full context and re-verify with the automated test suite.
3. Keep the browser DevTools console open (F12) while playing. A 404 on an image request is
   exactly how a missing/renamed asset path shows up — report it even if the feature visually
   degraded gracefully (a fallback emoji, a missing background, etc.), since the fallback working
   isn't the same as the asset being wired correctly.
4. Test at both a wide window size and a narrow one (~400-500px). The layout should never force
   horizontal scrolling on the page itself (a map or a wide table scrolling inside its own box is
   fine).
5. In Configurações, toggle "Reduzir efeitos visuais" once and re-check the animated items below
   in both states — animations should stop, static art should not disappear.
6. Where a feature is persistence-sensitive (marked below), test it once on a brand-new campaign
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

Add one entry per bug under the log below, using this template. Keep it factual (what you saw),
not a diagnosis (why you think it happens) — Claude Code will investigate the cause.

```md
### QA-XXX - Short title
Found by: Antigravity (or whoever)
Where: region/screen/class involved
Steps: exact steps to reproduce
Expected: what should have happened
Actual: what happened instead
Severity: cosmetic / confusing / blocking
```

## Findings Log

(empty so far)
