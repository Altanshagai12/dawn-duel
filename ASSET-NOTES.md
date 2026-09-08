# Asset provenance

The raster files under `assets/` were copied from the same owner's
`Altanshagai12/dawn-survivor` repository on 2026-09-04. Filenames were shortened
for this standalone game; pixels were not modified.

- `assets/heroes/*`: original four Dawn Survivor directional hero atlases.
- `assets/portraits/*`: matching original hero portraits.
- `assets/minions/*`: existing Wingling, Spitter, Brute, and Bomber atlases.
- `assets/guardians/*`: existing Eclipse Mother and Hollow Stag atlases.
- `assets/map/night-soil.webp`: existing compact night-soil ground texture.

These art assets remain subject to the source owner's rights. No third-party
CDN assets are used.

## Original Dawn Duel environment set

The following original raster assets were generated for this game with the
built-in OpenAI image-generation workflow on 2026-09-04, then resized and
encoded as WebP for mobile delivery:

- `assets/map/dawnfall-lane.webp`: rotationally symmetric moonlit battlefield
  with a bottom-left to top-right lane and river crossing.
- `assets/map/farm-site.webp`: transparent guardian-farm arena decal.
- `assets/structures/tower.webp`: transparent neutral defensive tower sprite.
- `assets/structures/core.webp`: transparent neutral main-base shrine sprite.
- `assets/effects/arc-bolt.webp`: transparent high-contrast projectile VFX.

The structure and effect sprites use neutral highlights so the renderer can
tint them per team. They contain no logos, text, or third-party game artwork.

## Clear battlefield v2

`assets/map/dawnfall-lane-v2.webp` was created with the built-in OpenAI image
generation workflow in create mode on 2026-09-07, then resized to 2000×1125 and
encoded as WebP for mobile delivery. Generation prompt summary: top-down 16:9
competitive fantasy MOBA battlefield; one clear diagonal stone midlane from a
blue lower-left base to a red upper-right base; four jungle guardian clearings
with visible entrances and enclosing rock/root walls; exactly two neutral
river-side buff shrine clearings, cyan and violet; no characters, towers, UI,
text, or logos; polished high-detail environment with readable traversal.

## Boss battlefield v3

`assets/map/dawnfall-lane-v3.png` was produced with the built-in OpenAI image
generation workflow in precise-object-edit mode on 2026-09-07. The two small
cyan/violet shrine platforms from v2 were replaced by clearly blocked river,
rock, root, and vegetation terrain. The four guardian/boss clearings, two bases,
diagonal lane, top-down camera, palette, and composition were preserved. The
asset contains no characters, monsters, towers, labels, UI, logos, or
watermarks. Runtime collision and its visible contour overlay use one shared
geometry contract.

## Geometry-clipped materials — 2026-09-08

The runtime no longer uses a prepainted map for collision-bearing terrain.
These original generated raster materials are clipped to shared analytic
walkable regions by `TerrainView`. Boundaries and entrances are code-native.

Saved game assets: `assets/map/flagstone-material.png` and
`assets/map/forest-material.png`. Generated with built-in image generation,
create mode, without reference images. Prompts requested 1024×1024; original
tool-returned raster resolution is preserved.

Flagstone prompt:

> Use case: stylized-concept. Asset type: seamless square ground material for a top-down 2D competitive fantasy MOBA map, not a whole map. Primary request: a high-quality hand-painted tileable flagstone floor seen from exact orthographic overhead, no perspective. Large irregular ancient limestone and green-grey sandstone slabs, elegant angular bevels, hairline cracks, sparse muted moss only in joints, very subtle weathered geometric carvings on a few slabs. Warm grey-gold stone lit evenly, medium-light value, low contrast so small heroes and projectiles read clearly. Consistent scale about 8 by 8 stones across the square. Entire image edge to edge is flat walkable pavement. No walls, stairs, cliffs, trees, buildings, towers, units, symbols, circles, text, shadows cast by objects, water, layout boundaries, UI, logos, vignette or gradients. Seamless texture edges and restrained painterly premium game material detail. Output 1024x1024.

Forest prompt:

> Use case: stylized-concept. Asset type: seamless overhead non-walkable forest/cliff terrain material for a polished fantasy MOBA game. Entire square is an evenly dense hand-painted texture of richly detailed dark emerald foliage, clustered fern and small broadleaf treetop canopies with sharp readable leaves, and occasional rugged charcoal slate boulders among roots. Exact orthographic top-down, no perspective or horizon. Cool deep teal shadows and muted jade highlights, darker than pale stone gameplay floor so it clearly reads as blocked terrain. Uniformly distributed detail with no centerpiece. Tileable left-right top-bottom. No open clearings, walkable paths, buildings, towers, water, circles, objectives, characters, text or interface. Painterly premium game material, natural shapes, absolutely no sphere/bubble-looking trees. 1024x1024.
