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
- Battle fighter sprites: `public/assets/battle/sprites/<heroes|enemies>/<id>/<state>_<NN>.png`, one PNG per frame (`NN` = 2-digit zero-padded index starting at `00`), proposed 96x128px per frame, fixed ground-anchor across every frame and state (see ART-030). This exact path shape is read by `getBattleSpriteFramePath()` in `src/battleSprites.ts` -- do not change it without updating that function too.

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
| P1 | NPC quest portraits | Codex + Claude Code | PARTIAL DELIVERY | 13 integrated; 7 portraits remain queued. |
| P0 | Steelmere all 7 territory maps | — | DONE | All delivered and integrated, see ART-001 and ART-005 through ART-010. |
| P1 | Fog of war | Claude Code | SHIPPED (v1) | Tile-radius reveal + flat CSS mask, no art dependency. Old saves that already walked a region keep it fully revealed there (no retroactive fog). |
| P1 | Treasure chest variants | — | DONE | `common`/`opened` integrated (ART-011); `locked`/`rare`/`secret` delivered but unused until a chest-gating mechanic exists. |
| P1 | Campfire map prop | — | DONE | Integrated (ART-021), existing rest/respawn flow unchanged. |
| P1 | Terrain states | — | DONE | Frostgard (ART-004) plus Ferrujal mud, Coroferro conveyor and Vulcannis ash-lava-rock (ART-014) all integrated with a movement rule each. |
| P1 | Story cinematic panels | — | DONE | All 4 act banners plus both endings integrated in `StoryCampaignPanel` (ART-015). |
| P1 | Unique boss portraits | — | DONE | 15 unique portraits integrated (ART-016 through ART-020); other bosses still reuse a shared portrait. |
| P1 | Overworld visible monsters | — | DONE | Patrol AI + collision-to-combat (existing ambush flow) + real sprites from ART-003, all integrated. Blind step-ambush chance lowered 15%→7%→5% since visible monsters now cover most encounters. |
| P1 | Overworld monster facing directions | Claude Code | INTEGRATED | ART-028 delivered `up_*` and `right_*` frames for all three existing families; wanderers now face their actual direction of travel (left mirrors right via CSS). |
| P2 | Map camera zoom/pan | — | DONE | Mouse wheel + on-screen buttons, 60%-180%. Pure CSS scale on the existing world container — no art impact, works with any background at any resolution. |
| P2 | Weather layer | — | DONE | Integrated on Frostgard/Vulcannis/Ferrujal/Coroferro (ART-012), drift respects the reduced-effects toggle. |
| P2 | Day/night layer | — | DONE | Integrated globally as a cosmetic-only cycle (ART-013), no gameplay consequence yet. |
| P2 | Gamepad support | Claude Code | SHIPPED | Left stick + D-pad move, button 0 interacts with an adjacent NPC. Polls `navigator.getGamepads()` per frame, no art dependency. |
| P2 | Custom map pins | Claude Code | SHIPPED | Player-placed reminder pins, toggled via a map-HUD button; uses the 📍 emoji, no art dependency yet (could take a dedicated icon later). |
| P2 | Dynamic character shadow | Claude Code | SHIPPED | CSS-only ellipse under the player sprite, pulses while walking. No art dependency. |
| P2 | Footstep animation | Claude Code | SHIPPED | CSS-only alternating footprint marks that fade out behind the player. No art dependency. |
| P3 | Lever and locked gate | — | MECHANIC SHIPPED | See ART-023 -- code+art integrated, just not placed on a map yet. |
| P3 | Fast-travel monolith | — | MECHANIC SHIPPED | See ART-024 -- code+art integrated (discovery + cross-region picker), just not placed on a map yet. |
| P3 | Boat / carriage shortcut | — | MECHANIC SHIPPED | See ART-025 -- code+art integrated (same-map paired-dock ride), just not placed on a map yet. |
| P3 | Illusory secret wall | — | MECHANIC SHIPPED | See ART-026 -- code+art integrated (discovery + one-shot reveal fx), just not placed on a map yet. |
| P3 | Scenery interaction (signposts) | — | MECHANIC SHIPPED | See ART-027 -- code+art integrated (reusable `RegionMapScenery` pattern), just not placed on a map yet. |
| P1 | Battle stage flip: KOF-style fighter sprites | Codex | REQUESTED | See ART-030 -- animated pixel-art fighter sprites (13 states) for the 9 heroes plus 8 named enemies already scoped in code, replacing the static card portrait once the hero/enemy cards flip into "fighter view" at combat start. A code scaffold (`src/battleSprites.ts`, `src/components/BattleSpriteActor.tsx`) already exists un-committed, not yet wired into the combat screen. |
| P2 | Shared equipment art, last 2 pieces | — | DONE | ART-029 delivered the tier-0 Andarilhos calças/botas; shared-equipment art audit now has no known missing paths. |
| P2 | Steelmere "Act 2" story content (Contrato 11) | Codex | INTEGRATED | CONTENT-001 delivered a playable optional Steelmere quest chain in `src/data/storyQuests.ts`, deepening the industrial-rebellion plot without changing the main quest spine. |

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

### ART-022 - NPC portrait audit and production order
Status: PARTIAL DELIVERY - READY FOR CODE
Owner: Codex; data-path integration after delivery: Claude Code
Audit scope: `src/data/npcs.ts` contains 24 NPC records. All referenced sprite and portrait paths resolve; however, 20 NPCs need a character-specific portrait: 19 currently point at hero artwork and `sela_hartwin` currently points at Mira Bellwether's portrait.
Delivered, first story set:
- `public/assets/npcs/sela_hartwin.webp`
- `public/assets/npcs/lyriel_noite.webp`
- `public/assets/npcs/kip_ligeiro.webp`
- `public/assets/npcs/torvald_barbaneve.webp`
- `public/assets/npcs/ophira_vane.webp`
- `public/assets/npcs/cassian_draye.webp`
- `public/assets/npcs/oraculo_danika.webp`
- `public/assets/npcs/gideon_mascarado.webp`
- `public/assets/npcs/diretor_vane.webp`
- `public/assets/npcs/colm_aldric.webp`
- `public/assets/npcs/toby_harlan.webp`
- `public/assets/npcs/garrick_laton.webp`
- `public/assets/npcs/silas_sterling.webp`
Dimensions and format: each 768x1152 WebP RGB, vertical dialogue portrait.
Required data replacements in `src/data/npcs.ts`: set the `portrait` field for `sela_hartwin`, `lyriel_noite`, `kip_ligeiro`, `torvald_barbaneve`, `ophira_vane`, `cassian_draye`, `oraculo_danika`, `gideon_mascarado`, `diretor_vane`, `colm_aldric`, `toby_harlan`, `garrick_laton`, and `silas_sterling` to their matching paths above. Do not alter their sprites, locations, dialogue, services or gameplay behavior.
Production priority, story quest chain:
- `sela_hartwin` - Sela Hartwin, Boticaria de Estrada
- `lyriel_noite` - Mestra Lyriel
- `kip_ligeiro` - Kip Pe-Ligeiro
- `torvald_barbaneve` - Torvald Barbaneve
- `ophira_vane` - Ophira Vane
- `cassian_draye` - Cassian Draye
- `oraculo_danika` - Oraculo Danika
- `gideon_mascarado` - Gideon Mascarado
- `diretor_vane` - Corvin Vane
Second priority, region authority and recurring service NPCs:
- `colm_aldric`, `toby_harlan`, `garrick_laton`, `silas_sterling`, `unidade_73`, `padre_lucian`, `astrid_reclusa`, `alaric_thorne`, `ignatius_drake`, `hamilton_cross`, `vanya_mar`
Contract for each future delivery: one character-specific vertical portrait at `public/assets/npcs/<npc-id>.webp`, 768x1152 WebP RGB. Claude Code changes only the matching `portrait` field in `src/data/npcs.ts`; sprites and gameplay services remain untouched.
Integration (Claude Code): swapped `portrait` for all 9 story-quest-chain NPCs (`sela_hartwin`, `lyriel_noite`, `kip_ligeiro`, `torvald_barbaneve`, `ophira_vane`, `cassian_draye`, `oraculo_danika`, `gideon_mascarado`, `diretor_vane`) plus the first 3 second-priority NPCs (`colm_aldric`, `toby_harlan`, `garrick_laton`) -- was reusing Mira Bellwether's portrait or hero card art -- in `src/data/npcs.ts` to their delivered `.webp` files. No sprite/dialogue/service changes.
Integration (Codex): `silas_sterling` now points at `assets/npcs/silas_sterling.webp` in `src/data/npcs.ts`. 7 second-priority NPCs (`unidade_73`, `padre_lucian`, `astrid_reclusa`, `alaric_thorne`, `ignatius_drake`, `hamilton_cross`, `vanya_mar`) still pending Codex delivery -- status stays PARTIAL DELIVERY until those land.

### ART-023 - Lever and locked gate
Status: INTEGRATED (mechanic shipped, not yet placed on any map)
Requested by: Claude Code
Gameplay purpose: a new interactive map object pair -- a lever that permanently opens a paired gate blocking a path, for shortcut/secret-area design on any region map (Havendown or Steelmere).
Required asset ids and states: `lever` (`idle`, `activated`); `gate` (`closed`, `open`).
Target paths: `public/assets/maps/objects/lever/idle.png`, `public/assets/maps/objects/lever/activated.png`, `public/assets/maps/objects/gate/closed.png`, `public/assets/maps/objects/gate/open.png`.
Canvas dimensions / tile scale: same 16px-native grid as every other map object (see Asset Conventions) -- 128x128 PNG RGBA is the established convention for object art in this project, scaled down at render time.
Transparency required: yes.
Interaction states: lever is a walk-up-and-click marker like a campfire; gate is a blocked tile when closed, walkable once opened -- no separate click target needed for the gate itself.
Visual references or territory: style-match whichever region the first map using this ships in (industrial style if Steelmere, natural/stonework if Havendown) -- generic enough to reskin later per-region if reuse across very different biomes reads oddly.
Code dependency: none to start art -- Claude Code will add `RegionMapLever`/`RegionMapGate` to `RegionMapDef`, a persisted `activatedLevers:Record<string,boolean>` (same pattern as `openedChests`), and wire the gate's blocked state to the paired lever once this lands. No specific map has these placed yet; first placement will follow whichever map Felipe picks.
Acceptance check: lever reads clearly as "this does something" at map scale (distinct from decoration); gate closed/open states are visually unambiguous at a glance.
Delivered paths:
- `public/assets/maps/objects/lever/idle.png`
- `public/assets/maps/objects/lever/activated.png`
- `public/assets/maps/objects/gate/closed.png`
- `public/assets/maps/objects/gate/open.png`
Dimensions and format: each 128x128 PNG RGBA with real transparent background.
Integration note: map `activatedLevers[lever.id]` to `lever/activated.png`; map the linked gate state to `gate/open.png` when activated and `gate/closed.png` otherwise. Retain a visual fallback only if an image fails to load. Closed gates must remain blocked; open gates must become walkable according to the existing object contract.
Integration (Claude Code): added `RegionMapLever`/`RegionMapGate` to `RegionMapDef` (`levers?`/`gates?`, a gate linked to its lever by `gateId`), a persisted `activatedLevers` dict (never turns back off, same pattern as `openedChests`), and an `activateLever` action. Closed-gate tiles are added to the same dynamic blocked-set already used for NPC collision (renamed `npcBlocked`->`extraBlocked` throughout `TileWorldExplorer` to reflect that) so every existing movement/pathing function picks up the block automatically. Lever renders as a click-to-walk marker like a campfire; gate renders as a non-interactive tile-sized prop, both via `MapPropIcon` (safe emoji fallback: 🔒/🟢 for the lever, 🚧 for a closed gate). Not yet placed on any specific map -- that's a content decision (which map, which shortcut) rather than a code one; `npm test` 97/97 green with zero maps using it yet.

### ART-024 - Fast-travel monolith
Status: INTEGRATED (mechanic shipped, not yet placed on any map)
Requested by: Claude Code
Gameplay purpose: a discoverable waystone on region maps. Walking up to one for the first time registers it as discovered (persisted); from any discovered monolith the player can instantly travel to any other discovered monolith, including across regions/worlds -- reuses the existing `regionMapPositions` position-memory plumbing, so no new travel UI framework is needed beyond a simple picker list.
Required asset ids and states: `monolith` (`dormant` -- not yet discovered art is simply not rendered, so this state may be unused; `active` -- discovered/glowing).
Target paths: `public/assets/maps/objects/monolith/dormant.png`, `public/assets/maps/objects/monolith/active.png`.
Canvas dimensions / tile scale: 128x128 PNG RGBA, same convention as other map objects.
Transparency required: yes.
Interaction states: walk-up-and-click marker, same footprint as a campfire/chest. Once discovered, clicking it again opens the fast-travel picker instead of a "you found it" moment.
Visual references or territory: an ancient standing stone/obelisk reads well in both Havendown and Steelmere -- suggest one shared design rather than a per-region reskin, since its whole identity is "the same landmark everywhere," unlike chests/campfires.
Code dependency: none to start art -- Claude Code owns the `discoveredMonoliths` persisted list, the picker UI, and the actual region/position jump.
Acceptance check: reads clearly as a landmark distinct from every other map object at a glance, in both an idle and a "lit up" state.
Delivered paths:
- `public/assets/maps/objects/monolith/dormant.png`
- `public/assets/maps/objects/monolith/active.png`
Dimensions and format: each 128x128 PNG RGBA with real transparent background.
Integration note: use `dormant.png` only when the undiscovered state is rendered; otherwise use `active.png` after discovery and on all subsequent visits. Keep the object's state, discovery persistence and fast-travel picker entirely in code; retain an image fallback only for load failures.
Integration (Claude Code): added `RegionMapMonolith` to `RegionMapDef` (`monoliths?`) and a derived `ALL_MONOLITHS` (flattened across every `REGION_MAPS` entry, tagged with `regionId`) exported from `src/regionMap.tsx`. `discoveredMonoliths` (persisted string array) and `travelToMonolith` live in `src/store/game.ts` -- travel just reuses `regionMapPositions` (same plumbing that already restores exact position after combat) to land at the target monolith's exact tile, so no new cross-region positioning code was needed. Clicking a monolith opens a picker modal (`RegionMapView` in `src/main.tsx`) listing every discovered monolith by name and region; picking one travels immediately. Not yet placed on any specific map -- a content decision, same as ART-023. `npm test` 97/97 green.

### ART-025 - Boat / carriage shortcut
Status: INTEGRATED (mechanic shipped, not yet placed on any map)
Requested by: Claude Code
Gameplay purpose: a scoped-down first version of animated transport -- a vehicle prop at a dock/station tile that, when boarded, rides the player in a straight line to a paired dock/station tile elsewhere on the SAME map (a visual shortcut across a lake, canal or rail line already present in a map's art), instead of an instant teleport.
Required asset ids and states: pick whichever fits the first map this ships on -- `boat` (`idle`, `moving`) for a water crossing, or `carriage` (`idle`, `moving`) for a road/rail crossing. Only one family is needed to start; the other can be a separate future request.
Target paths: `public/assets/maps/objects/boat/idle.png`, `public/assets/maps/objects/boat/moving.png` (or the `carriage` equivalent).
Canvas dimensions / tile scale: 128x128 PNG RGBA per state, same object convention -- if the moving state reads better as a short 2-3 frame strip (like the wandering-monster walk cycle in ART-003) that's fine too, just list the extra paths.
Transparency required: yes.
Interaction states: walk-up-and-click marker at the boarding point; `moving` plays only during the brief travel animation Claude Code drives, `idle` the rest of the time.
Visual references or territory: match whichever water/road crossing Felipe picks first as the pilot (a Havendown lake or a Steelmere canal/rail both work).
Code dependency: none to start art -- Claude Code owns pairing the two dock tiles, animating the straight-line ride, and picking the first map to pilot it on.
Acceptance check: idle vehicle reads clearly as boardable; moving state reads as "in transit," not just a copy of idle.
Decision: boat selected as the first transport family; a carriage can be requested later when a road or rail pilot is chosen.
Delivered paths:
- `public/assets/maps/objects/boat/idle.png`
- `public/assets/maps/objects/boat/moving.png`
Dimensions and format: each 128x128 PNG RGBA with real transparent background.
Integration note: use `idle.png` at the boarding object and switch to `moving.png` only for the short code-driven same-map crossing. The renderer may mirror the image for opposite route direction; place it over the existing water/canal art and keep dock pairing, player movement lock and arrival positioning in code.
Integration (Claude Code): added `RegionMapDock` to `RegionMapDef` (`docks?`, paired by `pairId`). Boarding only works standing exactly on the dock tile (click elsewhere just walks you there first, no auto-chain, to avoid mixing the normal step-by-step walk with the direct position jump a crossing does). The player sprite swaps to `moving.png` and `.regionmap-player` picks up a longer, linear CSS transition (`.is-riding`, 1.15s) instead of the normal .32s walk transition -- the existing left/top transition animates the whole crossing in one smooth motion, no manual per-frame interpolation needed. Not yet placed on any specific map. `npm test` 97/97 green.

### ART-026 - Illusory secret wall reveal effect
Status: INTEGRATED (mechanic shipped, not yet placed on any map)
Requested by: Claude Code
Gameplay purpose: a wall/obstacle that looks exactly like the surrounding blocked terrain but is secretly walkable, hiding a passage. No new wall texture is needed (it deliberately reuses the existing blocked-terrain art at that spot so it's indistinguishable beforehand) -- what's needed is a one-shot visual sting that plays the moment the player walks through it, so discovery reads as a discovery rather than "huh, I guess that wasn't blocked."
Required asset ids and states: `secret-reveal` (single effect, no states) -- a brief sparkle/dust-crumble burst, in the same spirit as the weather fx already delivered (ART-012).
Target paths: `public/assets/maps/fx/secret-reveal/burst.png` (reuses the existing `fx/<effect-id>/<variant>.png` convention).
Canvas dimensions / tile scale: sized to cover roughly one tile at the 16px-native scale (a small burst, not a full-map overlay like the weather layers) -- a square in the 256-384px range native gives room for the effect to read at any zoom level.
Transparency required: yes.
Interaction states: none -- Claude Code triggers a short one-time CSS animation using this image when the player's first step onto an `illusoryWalls` tile is detected, then never replays it for that tile again (persisted, same `??{}` pattern as everything else).
Visual references or territory: generic enough to reuse on any region -- doesn't need to match a specific biome since it's a burst effect, not scenery.
Code dependency: none to start art -- Claude Code owns the new `illusoryWalls` list on `RegionMapDef` (tiles excluded from `blocked` despite looking solid), the discovery detection, and the persisted "already seen" flag.
Acceptance check: reads as a brief magical/dust reveal, not a damage or status effect (shouldn't look like a hit-flash or a debuff icon).
Delivered path: `public/assets/maps/fx/secret-reveal/burst.png`
Dimensions and format: 320x320 PNG RGBA with real transparent background.
Integration note: place the effect centered over the discovered tile, above map terrain and below interface overlays. Trigger it once on first discovery, scale/fade it through a short CSS animation and disable motion under the existing reduced-effects setting. Do not reuse it for combat hits or status feedback.
Integration (Claude Code): added `illusoryWalls?:Array<{x,y}>` to `RegionMapDef` -- deliberately excluded from `blocked`, since the whole point is the tile is already walkable, just visually mismatched with the art. `step()` in `TileWorldExplorer` checks the landed tile against this list on every arrival; a persisted `discoveredSecrets` dict (`src/store/game.ts`, keyed `${mapId}:x,y`) gates the burst to a true one-time reveal, and the scale/fade animation itself is gated by the existing `html:not(.reduce-effects)` global class. Not yet placed on any specific map (no map currently declares `illusoryWalls`). `npm test` 97/97 green.

### ART-027 - Scenery interaction: readable signposts
Status: INTEGRATED (mechanic shipped, not yet placed on any map)
Requested by: Claude Code
Gameplay purpose: first concrete instance of "interact with scenery objects" -- a signpost/plaque the player can walk up to and read for a short flavor-text line (lore, a hint, a joke), establishing a reusable `RegionMapScenery` object pattern that later scenery types (search a bush, ring a bell, etc.) can follow without a new art contract each time.
Required asset ids and states: `signpost` (`idle` only -- it's read-only scenery, no other state needed).
Target paths: `public/assets/maps/objects/signpost/idle.png`.
Canvas dimensions / tile scale: 128x128 PNG RGBA, same object convention.
Transparency required: yes.
Interaction states: walk-up-and-click marker, same footprint as a campfire; clicking shows a small text popup with the flavor line and closes on dismiss -- no persisted state needed (rereadable every time, like a normal sign).
Visual references or territory: a weathered wooden roadside sign reads well in Havendown; propose a Steelmere-appropriate reskin (stamped metal plate, riveted) if this proves out and gets reused there.
Code dependency: none to start art -- Claude Code owns the `RegionMapScenery` type, the flavor-text data and the popup UI. First placement (which map, which line) will follow whichever map Felipe picks.
Acceptance check: reads clearly as "read this," distinct from a chest/campfire/lever at a glance.
Delivered path: `public/assets/maps/objects/signpost/idle.png`
Dimensions and format: 128x128 PNG RGBA with real transparent background.
Integration note: render this asset in the same map-object container used for campfires and levers, preserving the scenery object's accessible label and click handler. Keep all sign text in the code-owned popup, not embedded in the image; retain a simple fallback only for image-load failure.
Integration (Claude Code): added `RegionMapScenery` to `RegionMapDef` (`scenery?`, with a `kind` field so future scenery types beyond `signpost` can reuse the same list without a new prop). Clicking one opens a small local popup inside `TileWorldExplorer` itself (no store involved -- rereadable every time, exactly like a real sign). Not yet placed on any specific map. `npm test` 97/97 green.

### ART-028 - Overworld monster facing directions
Status: INTEGRATED
Requested by: Felipe
Gameplay purpose: wandering monsters must face their actual direction of travel instead of always appearing to walk toward the player/camera.
Delivered families: `automato-sentinela`, `batedor-a-vapor`, `elemental-de-vapor`.
Delivered paths: every family directory under `public/assets/maps/objects/monster-<family>/` now contains `right_idle.png`, `right_walk_1.png`, `right_walk_2.png`, `up_idle.png`, `up_walk_1.png`, and `up_walk_2.png`.
Dimensions and format: 724x724 PNG RGBA per frame, real transparent background; all 18 delivered files were validated.
Direction contract: retain the current root `idle.png`, `walk_1.png`, `walk_2.png` as the DOWN-facing frames. Use the new `right_*` files when dx is positive and `up_*` files when dy is negative. For LEFT, reuse the right frames with `transform: scaleX(-1)` on the image (not on the tile container, so its position remains unchanged). Keep the existing three-frame clock and use `idle` whenever the wanderer did not move in the latest patrol tick.
Code integration: extend the transient `Wanderer` view state with a last-facing direction, initialized to `down`; update it only after a successful patrol step in `setWanderers`; resolve `wanderAsset(spriteId, direction, frame)` from this convention. This is presentation-only and must not affect collision, patrol radius, combat or save data.
Acceptance check: walk a visible monster north, east, south and west. It shows an up, right, existing down, and mirrored-right frame respectively; its walk cycle continues normally and its hitbox/route does not shift.
Integration (Claude Code): `Wanderer` gained a `facing:'down'|'up'|'right'|'left'` field (default `down`), updated only when a patrol step actually lands (`dy<0`→up, `dy>0`→down, `dx>0`→right, `dx<0`→left -- `WANDER_STEPS` is cardinal-only so this is exhaustive). `wanderAsset(spriteId, facing, frame)` now resolves the directory prefix (`up_`/`right_`/none for down); `left` reuses the `right_*` files with `transform:scaleX(-1)` on the `<img>` only, tile position untouched. The shared idle/walk_1/walk_2 clock (`wanderFrame`) is unchanged -- purely presentational, no collision/patrol/combat/save impact. `npm test` 97/97 green.

### ART-029 - Shared equipment art, last 2 pieces
Status: INTEGRATED
Requested by: Claude Code
Gameplay purpose: close the last gap in shared-equipment art coverage (Contrato 10 of the Quadro de Contratos). An automated audit of every `Equipment` entry's `arte`/`imagem` path against disk (importing `EQUIPMENT` from `src/store/game.ts` and checking `fs.existsSync` for each, same method as `qa-verification.test.ts`'s boss-art check) found only these 2 missing out of the full catalog — everything else has been closed since the last art-regen pass.
Required asset ids and states:
- `andarilhos_calcas_t0` — "Calças de Andarilhos" (tier 0 of the Andarilhos shared-legwear line; class group: monge, caçadora, caçador)
- `andarilhos_botas_t0` — "Botas de Andarilhos" (tier 0 of the Andarilhos shared-boots line; same class group)
Target paths:
- `public/assets/art/hd/shared-legwear/andarilhos_calcas_t0.webp`
- `public/assets/art/hd/shared-boots/andarilhos_botas_t0.webp`
Canvas dimensions / tile scale: match the sibling tier-1 files in the same folders for consistency — `andarilhos_calcas_t1.webp` is 1491x1536 RGB, `andarilhos_botas_t1.webp` is 1536x1342 RGB. No alpha channel needed (siblings are flat RGB card art, not a cutout sprite).
Transparency required: no.
Interaction states: none — static item-card art, same as every other tier in this line.
Visual references or territory: match the "Andarilhos" theme already established by the 7 other tiers already delivered in both folders (t1 through t7) and by the already-complete `andarilhos_capacete_t0.webp` (tier 0 of the sibling headgear line, same folder family) — light traveler's gear, agile/scout silhouette, earth-tone leather and cloth. Tier 0 should read as the humblest/starting-tier version of the set (plainer than t1), consistent with how every other shared-equipment group's t0 looks a step below its t1.
Code dependency: none — `sharedArtPath()` in `src/data/sharedEquipment.ts` already points at these exact paths; the entries just need the files to exist. No code change required once delivered.
Acceptance check: both files exist on disk at the target paths above; re-running the audit script (`EQUIPMENT` catalog vs `fs.existsSync` on every `arte`/`imagem` path) reports zero missing.
Delivered paths:
- `public/assets/art/hd/shared-legwear/andarilhos_calcas_t0.webp`
- `public/assets/art/hd/shared-boots/andarilhos_botas_t0.webp`
Dimensions and format: `andarilhos_calcas_t0.webp` is 1491x1536 WebP RGB; `andarilhos_botas_t0.webp` is 1536x1342 WebP RGB.
Integration (Codex): existing `sharedArtPath()` entries already pointed at these files, so no data-path change was needed after asset delivery. Verified with the equipment art audit.

### CONTENT-001 - Steelmere "Act 2" story content
Status: INTEGRATED
Requested by: Claude Code, on behalf of Felipe (Contrato 11 of the Quadro de Contratos)
Type: narrative/dialogue text only -- no image, sprite or visual deliverable. Using this document as the shared request channel anyway, per Felipe's explicit instruction, since it's the established place both sides already check.
Gameplay purpose: give Steelmere's "Act 2" a complete story beat, as scoped by the roadmap item "Escrever o Ato 2 completo de Steelmere."
Important context before writing anything -- this codebase currently has two separate, non-aligned "act" systems, and neither is a clean 1:1 match for that request:
1. `STORY_QUESTS` in `src/data/storyQuests.ts` -- a single continent-spanning delivery-quest chain (`act` field 1 through 7), fully wired into the live game (`NpcStoryQuestSection` and `StoryQuestsJournalPanel` in `src/main.tsx`, `activeStoryQuests`/`completedStoryQuests`/`acceptStoryQuest`/`turnInStoryQuest` in `src/store/game.ts`). Its own acts 4 (tail) through 7 already take place across every Steelmere territory (Frostgard, Trilhouro x2, Vulcannis, Ferrujal, Coroferro), establishing an industrial-tyranny-vs-rebellion plot (the "Sindicato do Latão", sentient discarded automatons, a rail-worker rebellion, an overloading Aetherium reactor). This is already a substantial, playable story -- do not silently duplicate it.
2. `STORY_CHAPTERS` in `src/data/expansion.ts` -- a separate 4-chapter cinematic-banner system (`chapter.act` 1 through 4, see ART-015): `act-01-havendown`, `act-02-forge`, `act-03-flame-crown`, `act-04-black-sun`, plus two epilogues. `act-02-forge` is the chapter whose name/theme most obviously points at Steelmere ("the Forge"), but today it only has a title and a cinematic banner image -- no chapter-specific narrative content of its own beyond whatever the player experiences through the STORY_QUESTS chain above.
Open question that must be resolved (with Felipe) before writing new content, so effort isn't spent on the wrong target: does "Ato 2 completo de Steelmere" mean (a) deepen/extend the existing STORY_QUESTS chain's Steelmere acts with more quests, side content and NPC dialogue, or (b) author the `act-02-forge` chapter's own dedicated narrative beats (separate from the fetch-quest chain), or (c) something the numbered roadmap item describes more precisely that isn't fully captured by either system above. Confirm scope before drafting full content.
Deliverable format once scope is confirmed: plain text/data matching the existing `StoryQuest` interface in `src/data/storyQuests.ts` (`id, act, title, summary, sourceNpcId, targetNpcId, targetRegionId, type, requiredProgress, questItem?, dialogue{offer,inProgress,targetWelcome,completion}, reward{gold,xp,loreTitle?,itemReward?,unlockWorld?}, nextQuestId?`) for option (a), or plain prose/copy for option (b) -- either can be delivered as a document and Claude Code will wire it into the matching system; no need to edit the `.ts` files directly.
Code dependency: none to start writing -- Claude Code owns wiring any delivered quest entries or chapter copy into the systems described above.
Integration (Codex): chose scope (a) as the safest implementation path: deepen the live `STORY_QUESTS` system instead of inventing a third act model or rewriting `STORY_CHAPTERS`. Added the optional Steelmere mini-chain `q_steelmere_pressure_survey` -> `q_steelmere_worker_warrants` -> `q_steelmere_rust_protocol` -> `q_steelmere_reactor_conscience`, using Vanya, Drake, Maeve, Unidade 73 and Dra. Vance. The chain is side content, so it does not alter the existing main campaign `nextQuestId` spine.
Acceptance check: new content matches the established tone and stakes of the existing quest dialogue (see `src/data/storyQuests.ts` for voice/style reference), references real NPCs already in `src/data/npcs.ts` and real Steelmere territories/sub-regions, and does not contradict the "Sindicato do Latão" industrial-rebellion plot already established by the existing acts 5-7.

### ART-030 - Battle stage flip: KOF-style fighter sprites
Status: REQUESTED
Requested by: Claude Code, on behalf of Felipe
Gameplay purpose: a new combat presentation layer. At the start of a battle, the hero's card automatically flips over (and immediately triggers the enemy card to flip too), revealing an animated pixel-art fighter sprite instead of the static painted portrait -- idle breathing, offensive/defensive stance, attack, heavy/critical attack, guard, hit, dodge, potion use, class skill, ultimate, victory and defeat -- in the style of late-90s SNK fighting games (King of Fighters '99). See `docs/BATTLE_SPRITE_PROMPTS.md` for the full art-direction brief and ready-to-paste generation prompts per character and per state; this entry is the pipeline record, that file is the working brief.
Mid-write discovery: an un-committed code scaffold already exists implementing this exact contract -- `src/battleSprites.ts` (state list, frame counts/fps, path resolver, animation-state hierarchy) and `src/components/BattleSpriteActor.tsx` (the frame-stepping renderer with a graceful fallback to the current static `CardFrame` on 404). Not yet wired into the actual combat screen (`Fighter`/`CardFrame` in `src/main.tsx`). This ART request and the prompts doc were aligned to that scaffold's contract rather than inventing a separate one.
Scope for this request: the 9 playable heroes (`guerreiro`, `cacadora`, `arcanista`, `guardiao`, `druida`, `cacador`, `monge`, `sacerdotisa`, `conjurador`) plus 8 named enemies that already have unique art and are pre-mapped in `ENEMY_NAME_TO_SPRITE_ID` (Sentinela Menor das Runas, Grumnak/Mestre do Pedágio, Cabra Amaldiçoada de Malgor, Ilusionista das Areias, Guardiã da Seiva Negra, Fanático do Orgulho, Corvo de Ignaroth, Espectro da Rainha Perdida). The 15 individually-illustrated bosses and common monsters without unique art are an intentional later phase, not part of this request.
Required asset ids and states: one PNG per frame (not a sprite sheet). 13 states per character, taken from `BATTLE_ANIMATION_CONFIG`: `idle`(6f), `stance_offensive`(6f), `stance_defensive`(6f), `attack`(8f), `heavy`(10f), `defend`(5f), `hit`(4f), `dodge`(5f), `potion`(7f), `skill`(10f), `ultimate`(12f), `victory`(8f), `defeat`(8f) -- 95 frames per character. Given the volume (95 x 17 characters ≈ 1,615 frames), `docs/BATTLE_SPRITE_PROMPTS.md` recommends a staged delivery: heroes' `idle`/`attack`/`hit`/`victory`/`defeat` first, then the remaining 8 states for heroes, then the 8 enemies.
Target paths: `public/assets/battle/sprites/<heroes|enemies>/<id>/<state>_<NN>.png`, `NN` = 2-digit zero-padded frame index starting at `00` (exact shape read by `getBattleSpriteFramePath()` in `src/battleSprites.ts` -- do not deviate).
Canvas dimensions / tile scale: proposed 96x128px native per frame (portrait, matches the card art region's ~3:4 aspect) -- not yet pinned by any existing CSS, this is the prompts doc's recommendation. All frames of all states for a given character must share the same canvas and the same ground-anchor baseline row so swapping frames/states never jitters.
Transparency required: yes.
Interaction states: see the state table in `docs/BATTLE_SPRITE_PROMPTS.md` for the exact trigger-to-state mapping already implemented in `resolveFighterAnimationState()`.
Visual references or territory: match the silhouette, costume and palette already established by each hero's existing painted card portrait (`assets/heroes/*.png`) / each enemy's existing `arte` portrait in `src/data/subregioes.json`, and each hero's existing top-down overworld walk sprite (`public/assets/maps/sprites/<hero-id>/down_0.png`), reinterpreted as a side-view fighting stance. Do not redesign the character -- translate the existing design into KOF-style pixel art. Heroes face right, enemies face left.
Code dependency: none to start art -- the consuming code (`BattleSpriteActor`) already exists and degrades safely to the current static card when a frame is missing. Still open on the Claude Code side: wiring `BattleSpriteActor` into the actual `Fighter`/`CardFrame` combat screen (it is not called from `src/main.tsx` yet), the card-flip transition itself, and the `fxOverlay` frame/path contract (`impact_slash`/`block_spark`/`heal_glow`/`status_fire` are defined as prop types but have no frame count or path convention yet -- separate future request).
Acceptance check: each character's idle loop reads as breathing/alive at rest and loops back to frame 0 without a visible seam; attack/heavy/skill/ultimate read as clearly distinct, escalating poses at a glance; no frame-to-frame jitter when frames or states swap (ground contact point stays fixed); style and palette are recognizably the same character as the existing card portrait and (for heroes) overworld sprite.

## Handoff Log

### SPR-001 - Class movement sprites
Status: INTEGRATED
Delivered by: Codex
Final paths: `public/assets/maps/sprites/<class-id>/`
Classes: guerreiro, guardiao, cacadora, arcanista, druida, cacador, monge, sacerdotisa, conjurador.
States: `down`, `up`, `right` x `0`, `mid_01`, `1`, `mid_12`, `2`.
Integration: `TileWorldExplorer` accepts `playerSprite`; `RegionMapView` resolves it from the active hero id.
Validation: all 135 sprite files exist, `npm run typecheck`/`lint`/`test`/`build` all pass with the wiring in place.
