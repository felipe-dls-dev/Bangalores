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
| Chests and campfires | Available | Existing map entities on all 14 regions; expand only when new states are requested. |
| Fog of war | In progress (code only) | Claude Code is shipping a flat-color tile mask for v1, no new art needed. Will file a follow-up request if we want a softer mist/vignette texture. |
| Mini-map / radar HUD | Removed | Product decision 2026-09-13: dropped in favor of fog of war (showing the full layout on a radar defeated the point of hiding it). No art impact — it only used inline SVG shapes. |
| Weather effects | Needs art | Region-specific particles and overlays. |

## Production Queue

| Priority | Request | Owner now | Status | Visual deliverables |
| --- | --- | --- | --- | --- |
| P0 | Steelmere all 7 territory maps | — | DONE | All delivered and integrated, see ART-001 and ART-005 through ART-010. |
| P1 | Fog of war | Claude Code | SHIPPED (v1) | Tile-radius reveal + flat CSS mask, no art dependency. Old saves that already walked a region keep it fully revealed there (no retroactive fog). |
| P1 | Treasure chest variants | Codex | PLANNED | Common, locked, rare, opened and secret states. |
| P1 | Terrain states | Shared | Frostgard ready | Claude Code defines effects; Frostgard `ice`, `snow-drift` and `steam-vent` textures are delivered in ART-004. Mud and conveyor remain pending for later regions. |
| P1 | Overworld visible monsters | — | DONE | Patrol AI + collision-to-combat (existing ambush flow) + real sprites from ART-003, all integrated. Blind step-ambush chance lowered 15%→7% since visible monsters now cover most encounters. |
| P2 | Map camera zoom/pan | Claude Code | SHIPPED | Mouse wheel + on-screen buttons, 60%-180%. Pure CSS scale on the existing world container — no art impact, works with any background at any resolution. |
| P2 | Weather layer | Codex | PLANNED | Snow, rain, ash and smoke particle sets. |
| P2 | Day/night layer | Shared | PLANNED | Claude Code defines time model; Codex supplies color and light overlays. |

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

**All 7 Steelmere territories now have background art + an authored, tested collision pass (ART-001, 005-010).** Remaining Steelmere work is polish, not coverage: a live in-browser look at each map (none of the 7 has been visually double-checked yet, only BFS-verified), the terrain-state textures/mechanics from ART-004 (currently Frostgard-only), and whatever P1/P2 items are still open below (chest variants, weather, day/night).

## Handoff Log

### SPR-001 - Class movement sprites
Status: INTEGRATED
Delivered by: Codex
Final paths: `public/assets/maps/sprites/<class-id>/`
Classes: guerreiro, guardiao, cacadora, arcanista, druida, cacador, monge, sacerdotisa, conjurador.
States: `down`, `up`, `right` x `0`, `mid_01`, `1`, `mid_12`, `2`.
Integration: `TileWorldExplorer` accepts `playerSprite`; `RegionMapView` resolves it from the active hero id.
Validation: all 135 sprite files exist, `npm run typecheck`/`lint`/`test`/`build` all pass with the wiring in place.
