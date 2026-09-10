# Generated combat art v7

Generated with the built-in image tool (not the CLI/API fallback). Existing
Dawn Survivor guardian images were identity references, not animation frames
to be redrawn in code. All selected source PNGs are saved here alongside the
runtime WebP encodings. Encoding changes format only: no resizing, cropping,
alpha extraction, pose synthesis or recoloring scripts.

| Asset | Source / runtime files | Dimensions and layout |
| --- | --- | --- |
| Eclipse / Aegis guardian | `assets/guardians/eclipse-attack-v7.png` / `.webp` | 2172×724, four horizontal RGBA frames |
| Stag / Tempo guardian | `assets/guardians/stag-attack-v7.png` / `.webp` | 2172×724, four horizontal RGBA frames |
| Walkable arena material | `assets/map/arena-floor-v7.png` / `.webp` | 1672×941 |
| Blocked forest material | `assets/map/arena-forest-v7.png` / `.webp` | 1254×1254 |
| Skill VFX and icons | `assets/effects/skill-atlas-v7.png` / `.webp` | 1774×887, 4 columns × 2 rows, RGBA |

The five runtime WebPs total 1,927,944 bytes. Original PNGs are preserved for
future art iteration. `scripts/optimize-art.mjs` performs reproducible WebP
encoding when Sharp is available (`SHARP_MODULE` can point to an existing install).
`combatArt.js` partitions actual atlas dimensions with rounded shared boundaries,
so non-divisible generation sizes do not drop edge pixels.

## Final prompt set / art briefs

### Eclipse attack strip

Use case: stylized-concept. Asset type: original mobile top-down action-game
guardian animation strip. Input: existing Eclipse guardian as identity reference.
Four evenly spaced horizontal frames, identical scale, feet anchors and facing:
neutral stance; raised-arms windup; forward two-arm slash/impact; recovery.
Horned black wraith with violet core and spectral purple energy, three-quarter
top-down camera facing southeast. Keep full limbs and effects inside each cell.
Actual transparent background, no labels, frame dividers, UI or text.

One targeted follow-up used background-extraction: remove the fake checkerboard
from the first result, preserving the four poses, identity and all edge detail;
output real alpha transparency. Only the corrected RGBA result is shipped.

### Stag attack strip

Use case: stylized-concept. Asset type: original mobile top-down guardian attack
animation. Input: existing Stag guardian as identity reference. Four horizontal,
equal-sized frames with consistent center/scale and southeast three-quarter
top-down facing: idle; rear/windup; front-antler slam; recover. Dark armored deer,
cyan runes and readable antler silhouette. Genuine transparency, generous cell
padding, no labels, borders, UI or background checkerboard.

### Arena floor

Use case: stylized-concept. Asset type: continuous walkable terrain material.
Ancient garden arena, jade-grey flagstones, subtle gold engraved joins, moss and
small grass accents, bright readable top-down fantasy treatment. Flat continuous
ground: no walls, boulders, water, lanes, towers, characters, bases or text. The
game clips this material to its exact playable lane/corridor/clearing geometry.

### Arena forest

Use case: stylized-concept. Asset type: blocked terrain material. Dense emerald
and jade overhead canopy, slate boulders, ferns and restrained blue flowers.
Seamless-looking original top-down fantasy forest, no open paths or clearings,
characters, buildings, labels or UI. Match the floor's palette and readability.

### Skill atlas

Use case: stylized-concept. Asset type: transparent game VFX / skill icon atlas.
Exactly eight isolated effects in four columns and two rows, equal padded cells,
readable silhouettes, luminous painterly fantasy effects on real transparency.
Row one: cyan precision lance; three-cyan-bolt volley fan; golden crystal shield;
golden forward shockwave. Row two: orange ground-fire field; three cinder orbs;
purple spectral dash; violet snare crescent. No characters, text, UI buttons,
borders, background or checkerboard. Preserve empty alpha around every effect.

## Runtime mapping

The atlas is row-major: Precision, Volley, Aegis, Crystal Line, Ember Field,
Cinder Rush, Shadow Step, Moon Snare. The volley projectile uses the single-bolt
cell so three authoritative projectiles do not look like nine. Ember Field's
ring follows the server's exact radius and warning/damage timestamps. Guardians
select idle/windup/impact/recovery frames from authoritative attack timestamps,
not a looping walking animation. Browser QA inspected both guardian strikes,
the active fire field and compact landscape controls.
