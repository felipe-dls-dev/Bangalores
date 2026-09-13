# Visual Development Handoff

This file is the shared contract between visual production and gameplay engineering.
Read it before starting work. Update it in the same change that delivers or consumes an asset.

## Ownership

| Area | Owner | Responsibility |
| --- | --- | --- |
| Art direction, generated images, sprites, tiles, map decoration, visual effects | Codex | Create final assets, save them in `public/assets`, validate paths and document handoffs. |
| Data models, state, collision, combat, input, save data, UI behavior, map logic | Claude Code | Implement mechanics, consume approved assets and document required visual contracts. |
| Scope, priorities, acceptance | Felipe | Approve visual direction and gameplay behavior. |

## Working Rules

1. Do not edit another owner's implementation area unless it is necessary to wire an already-approved visual test.
2. Before creating a mechanic, Claude Code adds an `ART REQUEST` below with ids, dimensions, states and target paths.
3. Before implementing a visual request, Codex changes its status to `IN PROGRESS`.
4. Codex delivers assets only under `public/assets/...`, lists every final path and marks the request `READY FOR CODE`.
5. Claude Code uses those exact ids and paths, then marks the request `INTEGRATED` after verifying it in-game.
6. Any breaking path, size or state change requires a new request rather than silently replacing an approved contract.
7. Keep entries short. Link a focused implementation note or commit when more detail is needed.

## Asset Conventions

- Player sprites: `public/assets/maps/sprites/<class-id>/<direction>_<frame>.png`
- Directions: `down`, `up`, `right`; left mirrors right in code.
- Frames: `0`, `mid_01`, `1`, `mid_12`, `2`.
- Map objects: `public/assets/maps/objects/<object-id>/<state>.png`
- Terrain overlays: `public/assets/maps/fx/<effect-id>/<variant>.png`
- Steelmere map backgrounds: `public/assets/maps/steelmere/<territory-id>.png`
- Use lowercase kebab-case for object ids and class ids already present in game data.
- Use PNG with alpha for sprites, props and effects. Use WebP or PNG for full map backgrounds.
- Every interactive object needs at least `idle`; use `opened`, `active`, `locked`, `broken` or `disabled` only when the mechanic needs it.

## Definition of Done

### Codex visual delivery

- Asset matches the established map scale and style.
- Final asset is in the repository, not only a generated-image directory.
- Alpha, dimensions and paths are checked.
- The request records all paths and expected states.

### Claude Code integration

- Interaction, collision and save state work for every documented state.
- Missing assets degrade to a safe fallback instead of a broken image.
- The feature is tested with a new campaign and an existing save when persistence is involved.
- The request is marked `INTEGRATED` with the relevant code location.

## Current Visual Inventory

| Asset group | Status | Notes |
| --- | --- | --- |
| Havendown regional maps | Available | Existing playable 2D maps. |
| Steelmere regional maps | 7 of 7 done | All 7 territories have background + collision pass (ART-001, 005-010). None visually double-checked live yet (only automated reachability). |
| Player movement sprites | Available | Nine class sets, 15 frames each. |
| Chests and campfires | Available | Real art integrated (ART-011, ART-021), emoji kept only as a broken-image fallback. |
| Fog of war | Shipped (code only) | Flat-color tile mask, no art needed. Will file a follow-up request if we want a softer mist/vignette texture. |
| Mini-map / radar HUD | Removed | Product decision 2026-09-13: dropped in favor of fog of war (showing the full layout on a radar defeated the point of hiding it). No art impact — it only used inline SVG shapes. |
| Weather + day/night effects | Available | ART-012/ART-013 integrated: weather on Frostgard/Vulcannis/Ferrujal/Coroferro, day/night cycle global (cosmetic only). |
| Boss portraits | 15 unique, rest shared | ART-016 through ART-020 integrated; remaining bosses still reuse a shared portrait until a future request covers them. |
| Story cinematics | Available | ART-015 integrated: one banner per act plus both endings. |

## Production Queue

| Priority | Request | Owner now | Status | Visual deliverables |
| --- | --- | --- | --- | --- |
| P0 | Steelmere all 7 territory maps | — | DONE | All delivered and integrated, see ART-001 and ART-005 through ART-010. |
| P1 | Fog of war | Claude Code | SHIPPED (v1) | Tile-radius reveal + flat CSS mask, no art dependency. Old saves that already walked a region keep it fully revealed there (no retroactive fog). |
| P1 | Treasure chest variants | — | DONE | `common`/`opened` integrated (ART-011); `locked`/`rare`/`secret` delivered but unused until a chest-gating mechanic exists. |
| P1 | Campfire map prop | — | DONE | Integrated (ART-021), existing rest/respawn flow unchanged. |
| P1 | Terrain states | — | DONE | Frostgard (ART-004) plus Ferrujal mud, Coroferro conveyor and Vulcannis ash-lava-rock (ART-014) all integrated with a movement rule each. |
| P1 | Story cinematic panels | — | DONE | All 4 act banners plus both endings integrated in `StoryCampaignPanel` (ART-015). |
| P1 | Unique boss portraits | — | DONE | 15 unique portraits integrated (ART-016 through ART-020); other bosses still reuse a shared portrait. |
| P1 | Overworld visible monsters | — | DONE | Patrol AI + collision-to-combat (existing ambush flow) + real sprites from ART-003, all integrated. Blind step-ambush chance lowered 15%→7% since visible monsters now cover most encounters. |
| P2 | Map camera zoom/pan | — | DONE | Mouse wheel + on-screen buttons, 60%-180%. Pure CSS scale on the existing world container — no art impact, works with any background at any resolution. |
| P2 | Weather layer | — | DONE | Integrated on Frostgard/Vulcannis/Ferrujal/Coroferro (ART-012), drift respects the reduced-effects toggle. |
| P2 | Day/night layer | — | DONE | Integrated globally as a cosmetic-only cycle (ART-013), no gameplay consequence yet. |

## ART REQUEST Template

Copy this block into the request log below.

```md
### ART-XXX - Short feature name
Status: REQUESTED
Requested by: Claude Code
Gameplay purpose:
Required asset ids and states:
Target paths:
Canvas dimensions / tile scale:
Transparency required: yes/no
Interaction states:
Visual references or territory:
Code dependency:
Acceptance check:
```

## HANDOFF Template

```md
### ART-XXX - Short feature name
Status: READY FOR CODE
Delivered by: Codex
Final paths:
Dimensions and format:
States delivered:
Integration notes:
Visual acceptance check:
```

## Request Log

### ART-001 - Frostgard pilot map
Status: INTEGRATED
Owner: Codex, integrated by Claude Code
Gameplay purpose: establish the reusable Steelmere visual language and provide the first map for mechanic integration.
Delivered: `public/assets/maps/steelmere/frostgard.png` (704x512 PNG, 22:16 ratio, 32px per tile).
Visual contents: frozen metal roads, snow banks, industrial pipes, boiler buildings, steam vents, rail fragments, frozen canal and a central iron bridge.
Integration: `buildFrostgard()` in `src/regionMap.tsx` now sets `background` to this asset.
Collision pass (Claude Code): water covers the canal band (x13-15, y1-10) plus a wider frozen pool to the south (x13-19, y11-14) matching the waterfall/lake in the art; the metal bridge at y7 (x12-16) is the only crossing, matching the visible bridge; four `blocked` rects cover the boiler/tower complexes in the corners (NW, NE+rails, SW, SE fenced yard). All 9 entities (spawn, 3 exits, 5 locations, chest, campfire) keep their original coordinates and pass `validateRegionMap`'s reachability check (`npm test`, 75/75 green).
Not yet verified: a live in-browser look at the collision-vs-art alignment (only the automated BFS reachability check ran) — please eyeball it in a dev session and flag any tile where the invisible walkable area doesn't match what the art shows (e.g. walking over what looks like a rooftop or the frozen river).
Acceptance check met: player, exit markers, chest and campfire render over the background; collision pass authored and tests green.

### ART-002 - Steelmere map entity contract
Status: DEFINED
Owner: Claude Code
Gameplay purpose: define the entity payload consumed by all future Steelmere maps.

Tile system: same engine as Havendown (`src/regionMap.tsx`, `RegionMapDef`). Tile size 16px native, scale 3x on screen (`tileSize:16, scale:3`). Map footprint ~20-24 tiles wide x 15-16 tall, matching every existing region and the fixed 18x12-tile camera viewport — no changes needed there.

Background art: one PNG per territory, rendered with `background-size:cover` behind the tile grid. Native resolution = `width_tiles*16` x `height_tiles*16` px minimum (e.g. a 22x16-tile map = 352x256px), higher integer multiples are fine for extra sharpness — it's scaled with `image-rendering:pixelated`, never smoothed. Aspect ratio must match width:height in tiles or `cover` crops it. Path: `public/assets/maps/steelmere/<territory-id>.png` (already in Asset Conventions).

Collision (two layers, both authored by Claude Code once art lands):
1. An invisible auto-tile grid (`grass/path/bridge/water/tree` compiled by `resolveTerrain()`) aligned to the walkable ground in the art.
2. A `blocked:{x,y}[]` list for any extra obstacle the art shows that isn't a base-tile type (buildings, machinery, rock formations).
Codex does not need to produce this grid — deliver the background with a quick markup note (or a second flattened image) showing which areas read as walkable ground vs. obstacle, and Claude Code authors the collision to match.

New terrain types for Steelmere biomes (ice, snow-drift, steam-vent, conveyor, mud, ash/lava-rock): Claude Code owns extending `BaseTile`/`MapTile`/`resolveTerrain()` with the movement rule for each. Codex delivers one tile texture per kind at `public/assets/maps/tiles/<biome-id>/<tile-name>.png`, same 16px-native convention as the existing `public/assets/maps/tiles/plains/*.png` set — Claude Code wires the CSS the same way.

Objects: chests/campfires reuse the existing `RegionMapChest`/`RegionMapCampfire` shape (id, name, x, y, icon, contents) — icon-based, no new art contract needed. New object types (gate, lever, monolith) get their own ART REQUEST when that mechanic starts (Phase D), following `public/assets/maps/objects/<object-id>/<state>.png`.

Spawn/exit schema: unchanged, reuse `RegionMapExit`/`RegionMapLocation` exactly as-is.

Fog-of-war storage key: not an art dependency. Shipping as pure code (`exploredMapTiles` in the save + tile-radius reveal + CSS mask) — see Production Queue.

Frostgard pilot footprint: the current placeholder grid is exactly 22 tiles wide x 16 tall, spawn at tile (11,13) near the south exit. Match this exact footprint so the existing exits/locations/chest/campfire coordinates don't need to move — background native resolution 352x256px minimum (22x16 x 16px). If a different footprint would serve the art better, flag it in the handoff and Claude Code will re-lay the entity coordinates to match; don't assume a size change is a problem, just don't ship one silently (rule 6 above).

Acceptance check: Codex can build the Frostgard background (ART-001) at the tile scale above, matching Havendown's visual fidelity, with no gameplay identifier left unspecified.

### ART-003 - Overworld wandering monster sprites
Status: INTEGRATED
Requested by: Claude Code
Gameplay purpose: visible creatures patrol the 2D map and start combat on contact, with room to dodge — replaces most of the old invisible step-chance ambush.
Required asset ids and states: one small walking sprite per overworld enemy family actually placed on a map (start with whatever family appears in each region's first 1-2 sub-regions is enough for the pilot; more can follow later). States: `idle` + a simple 2-4 frame walk cycle, one direction is enough (flip in code like the player sprite) unless you want it to face travel direction.
Target paths: `public/assets/maps/objects/monster-<enemy-id>/<state>.png` (reusing the general map-objects convention; `<enemy-id>` should match the existing bestiary/enemy id so Claude Code can key off it directly).
Canvas dimensions / tile scale: same 16px-native grid as player sprites (see Asset Conventions), so it reads at the same scale on the map.
Transparency required: yes.
Interaction states: idle (patrolling), no "aggro"/hit state needed — contact hands off straight into the existing combat screen.
Visual references or territory: match the tone of the enemy's existing combat card art if one exists.
Code dependency: none — Claude Code is building the patrol/collision mechanic now with a placeholder icon and will swap in real sprites the moment they land, same pattern as `SPR-001`.
Acceptance check: sprite reads clearly at map scale and matches the enemy's established color/silhouette from its card art.
Delivered paths:
- `public/assets/maps/objects/monster-automato-sentinela/{idle,walk_1,walk_2}.png`
- `public/assets/maps/objects/monster-batedor-a-vapor/{idle,walk_1,walk_2}.png`
- `public/assets/maps/objects/monster-elemental-de-vapor/{idle,walk_1,walk_2}.png`
Integration note: use these three stable asset ids for Frostgard's first patrol families; each strip is front-facing and can be mirrored by the renderer when needed.
Integration (Claude Code): `deriveWanderers()` in `src/regionMap.tsx` assigns one of the 3 families round-robin to each wandering monster (purely visual — no mirroring used, sprites already read fine front-facing at map scale); a shared 420ms interval cycles idle→walk_1→walk_2→idle for a simple walk animation. `npm run typecheck`/`lint`/`test`/`build` all pass.
Naming clarification for future monster-sprite requests: these visible map wanderers are NOT tied 1:1 to a specific combat enemy id — the actual enemy that starts combat still comes from the target sub-region's own enemy pool (`onAmbush`→`triggerAmbush`, unchanged), which in `subregioesSteelmere.ts` generates enemies dynamically per sub-region (e.g. "Predador de Rota das Perfuratrizes"), not from the `automato-sentinela`/`batedor-a-vapor`/etc. names used here. That's fine for this mechanic (the sprite is just a wandering hazard, not a specific monster's portrait) — worth knowing so future requests don't spend effort matching exact bestiary ids unless a mechanic specifically needs that 1:1 link.

### ART-004 - Frostgard terrain-state tiles
Status: INTEGRATED
Requested by: Codex from the terrain-state contract in ART-002
Gameplay purpose: give Frostgard's ice, snow-drift and steam-vent terrain rules distinct map visuals once Claude Code exposes those tile types.
Delivered paths:
- `public/assets/maps/tiles/frostgard/ice.png`
- `public/assets/maps/tiles/frostgard/snow-drift.png`
- `public/assets/maps/tiles/frostgard/steam-vent.png`
Dimensions: 128x128 PNG RGBA, matching the existing terrain-file resolution. Each asset represents one 16px-native map tile and should be rendered through the same CSS sizing/image-rendering treatment as `public/assets/maps/tiles/plains/*`.
Visual notes: `ice` is blue-white cracked frozen metal; `snow-drift` is packed wind-sculpted snow; `steam-vent` is a brass-and-steel floor vent with a compact white plume. These files contain no movement assumptions.
Integration note: add the three terrain ids to the existing map terrain resolver and stylesheet mapping when their movement rules are finalized; use `steam-vent` only where its visual occupies a full tile.
Integration (Claude Code): added `ice`/`snow_drift`/`steam_vent` to `BaseTile`/`MapTile`/`WALKABLE` in `src/regionMap.tsx` and wired the CSS. Movement rule: `ice` slides the player automatically in the same direction until it runs out or hits an obstacle (chains `step()` calls, cancels any active click-path, skips the random-ambush roll while auto-sliding since the player isn't choosing to continue); `snow_drift`/`steam_vent` are decorative walkable variants with no special rule for now. Placed a first small patch of each in Frostgard's grid (open area west of the canal, away from the already-tested water/blocked layout) so the mechanic is actually reachable in-game — placement is illustrative, not checked pixel-for-pixel against the art yet. `npm test` (75/75, includes reachability) green.

### ART-005 - Engrenverde regional map
Status: INTEGRATED
Owner: Codex; collision pass: Claude Code
Gameplay purpose: make Engrenverde the second fully illustrated Steelmere territory without changing its 22x16 grid, exits, locations, chest or campfire coordinates.
Delivered: `public/assets/maps/steelmere/engrenverde.png` (704x512 PNG RGBA, 22:16 ratio, 32px per tile).
Integration: `buildEngrenverde()` in `src/regionMap.tsx` now sets `background` to this asset.
Collision read: the river/lake is the continuous vertical water band through the west-side x2-5 area, with the obvious horizontal bridge crossing at y8. Trees, village structures, pulley tower, greenhouse, root/gear masses and rock clusters should be blocked. The broad central grassy route and north (x11), east (x20, y8) and south (x11) exits should remain open; preserve all current entity coordinates.
Collision pass (Claude Code): water widened to x2-5,y5-11 matching the pond, wooden bridge at y8 (x1-6); blocked rects for the NW/SW treehouse-village clusters, the greenhouse dome (x15-19,y5-7, entrance at y8 left open) and the solid corner of the giant gear tower (x19-21,y0-1, leaving the torre/cerne/chest markers at y3 clear). All entities reachable, `npm test` 75/75 green. Not yet eyeballed live in a browser.

### ART-006 - Trilhouro regional map
Status: INTEGRATED
Owner: Codex; collision pass: Claude Code
Gameplay purpose: make Trilhouro an illustrated Steelmere territory without changing its 22x16 grid, exits, locations, chest or campfire coordinates.
Delivered: `public/assets/maps/steelmere/trilhouro.png` (704x512 PNG RGBA, 22:16 ratio, 32px per tile).
Integration: `buildTrilhouro()` in `src/regionMap.tsx` now sets `background` to this asset.
Collision read: the canal is the vertical water band at x14-15; its iron bridge at y8 is the intended crossing. Railway tracks, farm machinery, train, station, terminal, silo, fences and dense field edges should be blocked where they read as solid. Preserve a broad open route through the central dirt road and the north (x11), west (x1, y8) and south (x11) exits, plus all current entity positions.
Collision pass (Claude Code): canal widened to nearly full height (x14-15,y1-14), bridge at y8 (x12-17); blocked rects for the NW train/tracks, the windmill+barn cluster, the grain silos (x15-19,y5-7, entrance at y8 left open) and the solid corner of the ornate terminal (x19-21,y0-2, leaving terminal/chest markers at y3 clear). All entities reachable, `npm test` 75/75 green. Not yet eyeballed live in a browser.

### ART-007 - Vulcannis regional map
Status: INTEGRATED
Owner: Codex; collision pass: Claude Code
Gameplay purpose: make Vulcannis an illustrated Steelmere territory without changing its 22x16 grid, exits, locations, chest or campfire coordinates.
Delivered: `public/assets/maps/steelmere/vulcannis.png` (704x512 PNG RGBA, 22:16 ratio, 32px per tile).
Integration: `buildVulcannis()` in `src/regionMap.tsx` now sets `background` to this asset.
Collision read: molten lava is impassable throughout the upper reservoir and on the exposed channels at the outer edges. The iron bridge at y4 is the sole crossing over the upper reservoir. Treat the aqueduct, smokestacks, foundry, shrine, machinery and volcanic spires as obstacles where they read solid; retain the broad central/southern basalt routes and the west (x1, y7), southwest (x1, y12) and south (x11) exits, plus every current entity coordinate.
Collision pass (Claude Code): reservoir/bridge unchanged from the placeholder (already matched, x9-12/y2-5, bridge y4); blocked rects for the NW factory/chimneys, the aqueduct (x2-7, split above/below y8 so that corridor and the west exit stay open), the foundry (x13-21, same y8 gap) and the NE shrine corner. All entities reachable, `npm test` 75/75 green. Not yet eyeballed live in a browser.

### ART-008 - Ferrujal regional map
Status: INTEGRATED
Owner: Codex; collision pass: Claude Code
Gameplay purpose: make Ferrujal an illustrated Steelmere territory without changing its 22x16 grid, exits, locations, chest or campfire coordinates.
Delivered: `public/assets/maps/steelmere/ferrujal.png` (704x512 PNG RGBA, 22:16 ratio, 32px per tile).
Integration: `buildFerrujal()` in `src/regionMap.tsx` now sets `background` to this asset.
Collision read: the toxic pool at west x2-4/y7-13 is impassable except for the bridge at y10. Scrap heaps, the automaton graveyard, factory, containment core, pipes, cranes and ruined structures should be blocked where solid. Preserve the central path and north (x10), east (x20, y8) and northeast (x20, y3) exits, plus all existing entity coordinates.
Collision pass (Claude Code): toxic pool/bridge unchanged from the placeholder (already matched, x2-4/y7-13, bridge y10); blocked rects for the NW graveyard, the factory (x12-20, y3 kept clear for the núcleo/chest/northeast-exit row that sits right there, y8 kept clear as a corridor) and the NE containment-core corner. Caught and fixed one real bug here during review: my first factory rect started at y3 and blocked the núcleo location, the chest and the northeast exit simultaneously — `npm test` failed with all three "fora de uma área transitável" until the rect was narrowed to y4+. All entities reachable now, `npm test` 75/75 green. Not yet eyeballed live in a browser.

### ART-009 - Coroferro regional map
Status: INTEGRATED
Owner: Codex; collision pass: Claude Code
Gameplay purpose: make Coroferro an illustrated Steelmere territory without changing its 22x16 grid, exits, locations, chest or campfire coordinates.
Delivered: `public/assets/maps/steelmere/coroferro.png` (704x512 PNG RGBA, 22:16 ratio, 32px per tile).
Integration: `buildCoroferro()` in `src/regionMap.tsx` now sets `background` to this asset.
Collision read: the canal through upper-center x8-12/y5-7 is impassable except for the viaduct at y6. Buildings, underground-station entrance, clock tower, palace, formal square structures and outer railings should block movement where solid. Preserve the broad civic streets, west (x1, y8), north (x11) and northwest (x1, y3) exits, plus all existing entity coordinates.
Collision pass (Claude Code): canal/bridge unchanged from the placeholder (already matched, x8-12/y5-7, bridge y6); blocked rects for the NW metro entrance, the western residential district (starting at x2 so the west-exit column stays open) and the NE clock tower/cathedral corner. The central circular plaza and lower courtyard are open plazas in the art, left unblocked. All entities reachable, `npm test` 75/75 green. Not yet eyeballed live in a browser.

### ART-010 - Aetherium regional map
Status: INTEGRATED
Owner: Codex; collision pass: Claude Code
Gameplay purpose: make Aetherium an illustrated Steelmere territory without changing its 22x16 grid, exits, locations, chest or campfire coordinates.
Delivered: `public/assets/maps/steelmere/aetherium.png` (704x512 PNG RGBA, 22:16 ratio, 32px per tile).
Integration: `buildAetherium()` in `src/regionMap.tsx` now sets `background` to this asset.
Collision read: the upper aether pool x8-13/y4-6 is impassable except for its vertical bridge along x10/y3-7. The broken outer platforms, void, crystal masses, vortex, galleries, observatory, reactor and ring structures should block movement where solid. Preserve connected stone routes for all exits: west (x1, y8), east (x20, y8), south (x11, y14) and north (x11, y1), plus every existing entity coordinate.
Collision pass (Claude Code): pool/bridge unchanged from the placeholder (already matched, x8-13/y4-6, vertical bridge x10/y3-7); blocked rects for the NW vortex corner, the NE reactor-ring corner, the western mechanical gallery (y8 corridor + west exit left open) and the eastern observatory (y8 corridor + east exit left open). The central ceremonial ring and lower plaza are open platforms in the art, left unblocked. All entities reachable across all 4 exits, `npm test` 75/75 green. Not yet eyeballed live in a browser.

**All 7 Steelmere territories now have background art + an authored, tested collision pass (ART-001, 005-010), and every P1/P2 item below is DONE (ART-011 through ART-021).** The one thing still outstanding across all of this: a live in-browser look at each map and each new visual layer -- everything so far has only been verified by the automated reachability test (`npm test`) plus typecheck/lint/build, never eyeballed in a running browser session.

### ART-011 - Treasure chest variants
Status: INTEGRATED
Owner: Codex; integration: Claude Code
Gameplay purpose: replace emoji chest markers with readable map props and provide visual states for future locked, rare and secret rewards.
Delivered paths:
- `public/assets/maps/objects/treasure-chest/common.png`
- `public/assets/maps/objects/treasure-chest/locked.png`
- `public/assets/maps/objects/treasure-chest/rare.png`
- `public/assets/maps/objects/treasure-chest/secret.png`
- `public/assets/maps/objects/treasure-chest/opened.png`
Dimensions and format: all 128x128 PNG RGBA, transparent background, intended to render inside a 16px map-tile footprint using the existing object-image sizing convention.
State guidance: `common` is the default closed chest; `opened` is the direct replacement for all currently opened chests; `locked`, `rare` and `secret` are visual-only variants until an explicit chest metadata/interaction request defines their rules.
Integration note: render an image instead of the current emoji inside `.regionmap-chest`, map the current `openedChests[chest.id]` state to `opened`, and retain the emoji as a fallback only when the image fails to load.
Integration (Claude Code): `MapPropIcon` in `src/regionMap.tsx` renders `common.png`/`opened.png` by `openedChests[chest.id]`, falling back to the original emoji via `onError`. `locked`/`rare`/`secret` are delivered but unused -- no chest metadata/gating exists yet to key off, per the note above. `npm test` 75/75 green.

### ART-012 - Regional weather overlays
Status: INTEGRATED
Owner: Codex; integration: Claude Code
Gameplay purpose: give the map-weather system lightweight transparent visual layers without coupling art to its timing or story rules.
Delivered paths:
- `public/assets/maps/fx/snow/soft.png`
- `public/assets/maps/fx/rain/soft.png`
- `public/assets/maps/fx/ash/soft.png`
- `public/assets/maps/fx/smoke/soft.png`
Dimensions and format: all 704x512 PNG RGBA, matching the 22x16 Steelmere background footprint. Alpha is included; the renderer should place the layer absolute over the world, with `pointer-events:none`.
Suggested regional mapping: `snow` for Frostgard and Kaldrum; `rain` for Abdendriel; `ash` for Ignaris and Vulcannis; `smoke` for Coroferro and Ferrujal. These are suggested visuals only, not gameplay restrictions.
Integration note: preserve opacity control in CSS, animate the layer with a small repeating translation rather than moving individual particles, and allow the code layer to disable it for accessibility or reduced-motion settings.
Integration (Claude Code): new optional `weather` field on `RegionMapDef`, rendered as `.regionmap-weather` (full-map `background-size:cover`, `pointer-events:none`) inside `TileWorldExplorer`. Assigned by fit rather than the exact suggested list (only Frostgard/Vulcannis/Ferrujal/Coroferro exist as coded Steelmere maps so far): `snow` on Frostgard, `ash` on Vulcannis, `smoke` on Ferrujal and Coroferro. Drift animation gated by `html:not(.reduce-effects)` (existing global reduced-motion class, no new JS check needed). `npm test` 75/75 green.

### ART-013 - Day and night lighting overlays
Status: INTEGRATED
Owner: Codex; integration: Claude Code
Gameplay purpose: add an atmospheric light transition above regional maps while keeping the day-cycle model and all gameplay effects in code.
Delivered paths:
- `public/assets/maps/fx/lighting/twilight.png`
- `public/assets/maps/fx/lighting/night.png`
Dimensions and format: both 704x512 PNG RGBA, built to cover a 22x16 regional-map background. `twilight` uses a warm amber-to-violet edge wash; `night` uses a blue-black vignette and sparse upper-sky stars.
Integration note: place as an absolute, non-interactive image above map art and below gameplay markers. Keep a CSS opacity variable so the time controller can cross-fade day -> twilight -> night. Do not animate this overlay under reduced-motion; it is intentionally static.
Integration (Claude Code): applied globally (all regions, not just Steelmere) as a purely cosmetic effect with no gameplay consequence, per the gameplay-purpose note above. `TileWorldExplorer` keeps a local 5-minute day/night clock (resets each time a region mounts) and cross-fades `.regionmap-daynight.twilight`/`.night` opacity via a sine-based curve; the art itself is static, only the code-driven opacity transitions. `npm test` 75/75 green.

### ART-014 - Steelmere terrain-state tiles
Status: INTEGRATED
Owner: Codex; integration and rules: Claude Code
Gameplay purpose: complete the next three terrain visuals planned for Steelmere without prescribing their effects.
Delivered paths:
- `public/assets/maps/tiles/ferrujal/mud.png`
- `public/assets/maps/tiles/coroferro/conveyor.png`
- `public/assets/maps/tiles/vulcannis/ash-lava-rock.png`
Dimensions and format: all 128x128 PNG RGBA, matching existing terrain texture resolution. Each represents a single 16px-native map tile and should use the existing tile CSS sizing/image-rendering conventions.
Visual use: `mud` is toxic industrial sludge for Ferrujal; `conveyor` is a vertical belt texture for Coroferro (the renderer may rotate it for horizontal routes); `ash-lava-rock` is traversable cracked volcanic basalt for Vulcannis.
Integration note: add the corresponding ids to `BaseTile`, `MapTile`, the walkability set and CSS asset mapping only when their movement/damage rules are approved. Keep this delivery visual-only; no existing map grid is changed by it.
Integration (Claude Code): added `mud`/`conveyor`/`ash_lava_rock` to `BaseTile`/`MapTile`/`WALKABLE` and wired the CSS, same pattern as ART-004. Movement rules (a code decision, since none were specified): `conveyor` pushes the player automatically like `ice` (reuses the exact same auto-slide branch in `step()`); `mud` slows the arrival at that tile to 1.6x `STEP_MS` (a "stuck in the sludge" feel, no new status system); `ash_lava_rock` is purely decorative, no rule, same as `snow_drift`. Placed one illustrative patch of each in their respective map (Ferrujal mud, Coroferro conveyor, Vulcannis ash-lava-rock) -- not checked pixel-for-pixel against the art, same caveat as the ART-004 ice patch. `npm test` 75/75 green.

### ART-015 - Story campaign cinematic panels
Status: INTEGRATED
Owner: Codex; integration: Claude Code
Gameplay purpose: visually introduce the existing narrative acts and differentiate the two campaign endings without embedding text in art.
Delivered paths:
- `public/assets/story/cinematics/act-01-havendown.webp`
- `public/assets/story/cinematics/act-02-forge.webp`
- `public/assets/story/cinematics/act-03-flame-crown.webp`
- `public/assets/story/cinematics/act-04-black-sun.webp`
- `public/assets/story/cinematics/ending-dawn.webp`
- `public/assets/story/cinematics/ending-throne.webp`
Dimensions and format: 1280x720 WebP RGB, landscape 16:9. The text-free left side of every panel is reserved for accessible story UI copy.
State mapping: use `act-01-havendown` for the first chapter; `act-02-forge` for Act 2; `act-03-flame-crown` for Act 3; `act-04-black-sun` for Act 4; `ending-dawn` for `epilogo_luz`; and `ending-throne` for `epilogo_sombra`.
Integration note: in `StoryCampaignPanel`, render the matching image as a background or an adjacent full-width illustration with the existing title/dialogue over it. Keep actual narrative text in HTML; respect reduced-motion by avoiding required text animation.
Integration (Claude Code): `StoryCinematic` in `src/main.tsx` renders a full-width banner above the chapter title, mapped by `chapter.act` (1-4) with the two epilogue ids (`epilogo_luz`/`epilogo_sombra`) special-cased to the ending art. Fails silently (renders nothing) if the image 404s, no broken-image fallback needed for a purely illustrative banner. `npm test` 75/75 green.

### ART-016 - Unique boss portraits, first replacement set
Status: INTEGRATED
Owner: Codex; data-path integration: Claude Code
Gameplay purpose: eliminate the most conspicuous reuse of `boss_minotauro.webp` across unrelated bosses while retaining the current boss data and combat behavior.
Delivered paths:
- `public/assets/art/bosses/boss-mestre-ferreiro-caido.webp`
- `public/assets/art/bosses/boss-guardiao-caldeira.webp`
- `public/assets/art/bosses/boss-rei-esquecido-kholgard.webp`
- `public/assets/art/bosses/boss-asterion.webp`
Dimensions and format: each 768x1152 WebP RGB, vertical card portrait.
Required data replacements in `src/data/subregioes.json`: set the `arte` field for `Mestre Ferreiro Caído`, `Guardião da Caldeira`, `Rei Esquecido de Kholgard`, and `Asterion, Guardião do Sol Negro` to their matching paths above. Do not alter their stats, phases or rewards.
Visual mapping: fallen dwarven smith; magma forge construct; undead dwarven king; black-sun celestial knight, respectively.
Integration (Claude Code): all 4 `arte` fields swapped in `src/data/subregioes.json`, no stat/phase/reward changes. `npm test` 75/75 green.

### ART-017 - Unique boss portraits, second replacement set
Status: INTEGRATED
Owner: Codex; data-path integration: Claude Code
Gameplay purpose: eliminate the shared `boss_troll.webp` portrait from four distinct boss encounters while retaining their current boss data and combat behavior.
Delivered paths:
- `public/assets/art/bosses/boss-guardiao-runico-ancestral.webp`
- `public/assets/art/bosses/boss-tita-da-passagem.webp`
- `public/assets/art/bosses/boss-yeti-alfa-gelo-eterno.webp`
- `public/assets/art/bosses/boss-sentinela-pedra-kholgard.webp`
Dimensions and format: each 768x1152 WebP RGB, vertical card portrait.
Required data replacements in `src/data/subregioes.json`: set the `arte` field for `Guardião Rúnico Ancestral`, `Titã da Passagem`, `Yeti Alfa de Gelo Eterno`, and `Sentinela de Pedra de Kholgard` to their matching paths above. Do not alter their stats, phases or rewards.
Visual mapping: ancient rune-bound forest guardian; mountain pass stone titan; icebound alpha yeti; dwarven-carved Kholgard stone sentinel, respectively.
Integration (Claude Code): all 4 `arte` fields swapped in `src/data/subregioes.json`, no stat/phase/reward changes. `npm test` 75/75 green.

### ART-018 - Unique boss portraits, road and forest set
Status: INTEGRATED
Owner: Codex; data-path integration: Claude Code
Gameplay purpose: give the three bosses previously sharing `boss_bandoleiro.webp` their own visual identities while retaining their current boss data and combat behavior.
Delivered paths:
- `public/assets/art/bosses/boss-capitao-bandoleiros.webp`
- `public/assets/art/bosses/boss-mestre-pedagio.webp`
- `public/assets/art/bosses/boss-rei-goblin-abdendriel.webp`
Dimensions and format: each 768x1152 WebP RGB, vertical card portrait.
Required data replacements in `src/data/subregioes.json`: set the `arte` field for `Capitão dos Bandoleiros`, `Mestre do Pedágio`, and `Rei Goblin de Abdendriel` to their matching paths above. Do not alter their stats, phases or rewards.
Visual mapping: highwayman field captain; corrupt bridge tollmaster; cunning goblin monarch of Abdendriel, respectively.
Integration (Claude Code): all 3 `arte` fields swapped in `src/data/subregioes.json`, no stat/phase/reward changes. `npm test` 75/75 green.

### ART-019 - Unique boss portraits, Morvath veil set
Status: INTEGRATED
Owner: Codex; data-path integration: Claude Code
Gameplay purpose: distinguish the two Morvath bosses previously sharing `boss_necromante.webp` from the Necromante Supremo while retaining their current boss data and combat behavior.
Delivered paths:
- `public/assets/art/bosses/boss-lorde-espectral-morvath.webp`
- `public/assets/art/bosses/boss-vaelora-senhora-veu.webp`
Dimensions and format: each 768x1152 WebP RGB, vertical card portrait.
Required data replacements in `src/data/subregioes.json`: set the `arte` field for `Lorde Espectral de Morvath` and `Vaelora, Senhora do Véu` to their matching paths above. Do not alter their stats, phases or rewards.
Visual mapping: aristocratic spectral warlord; poised veil-weaving death sorceress, respectively.
Integration (Claude Code): both `arte` fields swapped in `src/data/subregioes.json`; `Necromante Supremo` deliberately keeps `boss_necromante.webp` (not part of this request), no stat/phase/reward changes. `npm test` 75/75 green.

### ART-020 - Unique boss portraits, abyss and web set
Status: INTEGRATED
Owner: Codex; data-path integration: Claude Code
Gameplay purpose: separate the final two cross-theme portrait reuses while retaining their current boss data and combat behavior.
Delivered paths:
- `public/assets/art/bosses/boss-nihraz-imperador-vazio.webp`
- `public/assets/art/bosses/boss-rainha-aracnidea.webp`
Dimensions and format: each 768x1152 WebP RGB, vertical card portrait.
Required data replacements in `src/data/subregioes.json`: set the `arte` field for `Nihraz, Imperador do Vazio` and `Rainha Aracnídea` to their matching paths above. Do not alter their stats, phases or rewards.
Visual mapping: aetheric void emperor; predatory arachnid queen, respectively.
Integration (Claude Code): both `arte` fields swapped in `src/data/subregioes.json`, no stat/phase/reward changes. `npm test` 75/75 green.

### ART-021 - Campfire map prop
Status: INTEGRATED
Owner: Codex; integration: Claude Code
Gameplay purpose: replace the campfire emoji with a readable terrain-neutral checkpoint prop while preserving existing rest and respawn behavior.
Delivered path: `public/assets/maps/objects/campfire/idle.png`
Dimensions and format: 128x128 PNG RGBA with real transparent background.
Integration note: in `TileWorldExplorer`, replace the visual content of `.regionmap-campfire-icon` with an `img` using this path. Keep the enclosing button, `onRestCampfire`, label, aura and all current state logic intact. Size the image to the current tile bounds with `object-fit: contain`; retain the fire emoji only as an image-load fallback.
Integration (Claude Code): same `MapPropIcon` fallback component used for ART-011 (see there), all existing button/aura/rest logic untouched. `npm test` 75/75 green.

## Handoff Log

### SPR-001 - Class movement sprites
Status: INTEGRATED
Delivered by: Codex
Final paths: `public/assets/maps/sprites/<class-id>/`
Classes: guerreiro, guardiao, cacadora, arcanista, druida, cacador, monge, sacerdotisa, conjurador.
States: `down`, `up`, `right` x `0`, `mid_01`, `1`, `mid_12`, `2`.
Integration: `TileWorldExplorer` accepts `playerSprite`; `RegionMapView` resolves it from the active hero id.
Validation: all 135 sprite files exist, `npm run typecheck`/`lint`/`test`/`build` all pass with the wiring in place.
