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
