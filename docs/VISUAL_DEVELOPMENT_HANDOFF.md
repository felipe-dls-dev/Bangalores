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
| Steelmere regional maps | Base data exists, needs art | All 7 territories already have grid/exits/chests/campfires (placeholder generic tiles, no `background`). ART-001 fills the visual gap. |
| Player movement sprites | Available | Nine class sets, 15 frames each. |
| Chests and campfires | Available | Existing map entities on all 14 regions; expand only when new states are requested. |
| Fog of war | In progress (code only) | Claude Code is shipping a flat-color tile mask for v1, no new art needed. Will file a follow-up request if we want a softer mist/vignette texture. |
| Mini-map / radar HUD | Removed | Product decision 2026-09-13: dropped in favor of fog of war (showing the full layout on a radar defeated the point of hiding it). No art impact — it only used inline SVG shapes. |
| Weather effects | Needs art | Region-specific particles and overlays. |

## Production Queue

| Priority | Request | Owner now | Status | Visual deliverables |
| --- | --- | --- | --- | --- |
| P0 | Steelmere Frostgard pilot map | Codex | READY TO START | Background, snow terrain variants, props, exits, campfire and monolith. Contract defined in ART-002 below. |
| P0 | Steelmere map data and collision | Claude Code | BASE DATA EXISTS | Grid/exits/chests/campfires already authored for all 7 territories; remaining work is per-territory `background` + collision alignment once each art piece lands (ART-001 style, one request per territory). |
| P1 | Fog of war | Claude Code | SHIPPED (v1) | Tile-radius reveal + flat CSS mask, no art dependency. Old saves that already walked a region keep it fully revealed there (no retroactive fog). |
| P1 | Treasure chest variants | Codex | PLANNED | Common, locked, rare, opened and secret states. |
| P1 | Terrain states | Shared | PLANNED | Claude Code defines effects; Codex delivers mud, ice and conveyor visuals. |
| P1 | Overworld visible monsters | Shared | Mechanic SHIPPED with a placeholder icon (patrol AI, collision-to-combat via the existing ambush flow). Waiting on ART-003 for real sprites. Also lowered blind step-ambush chance 15%→7% since visible monsters now cover most encounters. |
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
Status: PLANNED
Owner: Codex
Gameplay purpose: establish the reusable Steelmere visual language and provide the first map for mechanic integration.
Proposed deliverables: Frostgard background, frozen metal paths, snow banks, steam vents, ice patches, frost campfire, monolith, chest and region exit markers.
Dependency: Claude Code confirms the final map tile dimensions, collision export format and entity anchor coordinates before asset production begins.

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
Status: REQUESTED
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

## Handoff Log

### SPR-001 - Class movement sprites
Status: INTEGRATED
Delivered by: Codex
Final paths: `public/assets/maps/sprites/<class-id>/`
Classes: guerreiro, guardiao, cacadora, arcanista, druida, cacador, monge, sacerdotisa, conjurador.
States: `down`, `up`, `right` x `0`, `mid_01`, `1`, `mid_12`, `2`.
Integration: `TileWorldExplorer` accepts `playerSprite`; `RegionMapView` resolves it from the active hero id.
Validation: all 135 sprite files exist, `npm run typecheck`/`lint`/`test`/`build` all pass with the wiring in place.
