# Combat v7 — 2026-09-10

## Reference and design decisions

Apple's [MLBB developer interview](https://apps.apple.com/mm/iphone/story/id1677291177)
describes advanced target selection and lowest-health preferences. Dawn Duel
uses that interaction pattern, not MLBB characters, art or exact kit numbers.
The large attack button prioritizes visible enemy heroes; smaller Farm and
Tower buttons are exclusive filters. A preference chooses nearest, lowest HP
or lowest HP percentage within the eligible category. There is no forced chase.
An empty/out-of-range/blocked category spends no basic-attack cooldown.

Riot's historical [Champion Balance Framework](https://www.leagueoflegends.com/en-gb/news/dev/dev-champion-balance-framework/)
describes evaluating performance across player skill groups using several
signals. It is not a formula that guarantees fair heroes. Here, explicit power
caps, mirrored deterministic simulations, side-swap invariants and counterplay
checks are the initial gates. Human match telemetry is still needed before
claiming competitive balance; bot win rates are not human win-rate estimates.

## Distinct, bounded kits

All four heroes retain the same 1500 base HP, 65 basic damage and 180 speed.
Numbers below are base values before the existing capped upgrades/relics.

| Hero | Q | E | Counterplay |
| --- | --- | --- | --- |
| Shana | Precision: 130 damage, marks for 4s; next basic/volley consumes mark for +45. 8s cooldown. | Volley: three 40-damage bolts, 25% slow for 1s, 70-unit recoil. 12s cooldown. | Dodge the skillshot, use cover, pressure during cooldown/recoil. |
| Diamond | Aegis: 160 shield for 3s; 40% of absorbed damage becomes one riposte, capped at 60. 12s cooldown. | Crystal Line: 120 piercing shockwave damage, 60 knockback and 20% slow for 1s. 10s cooldown. | Wait out shield, dodge line; no unlimited shield refill/riposte stacking. |
| Scarlett | Ember Field: 0.4s warning then four 35-damage pulses, radius 105; 15% slow. 10s cooldown. | Cinder Rush: next three basics gain +20, with +12% movement for 4s. 12s cooldown. | Leave the telegraphed field; empowered shots and movement expire. |
| Hina | Shadow Step: 140-unit dash leaves a 180-HP afterimage for 3s, at most three 40-damage shots. 10s cooldown. | Moon Snare: 120 plus 12% missing HP, bonus capped at 60; 20% slow for 1s. 10s cooldown. | Kill the vulnerable clone, use walls, avoid the finite-range execute projectile. |

Skills tap-to-auto-aim; deliberate drag retains directional aim and cancellation.
The server validates vision, walls, range, immunity, structure threat rings and
the target category. It does not trust a client-selected target ID. Basic target
acquisition is planned for both players before either fires, so same-tick loss
of spawn protection cannot grant a side-order advantage.

## Input and privacy contract

- `attackMode`: `auto`, `farm`, `structure`; legacy omitted mode remains manual.
- `targetPriority`: `nearest`, `lowestHp`, `lowestRatio`.
- `attackPress` / `attackPressMode` preserve a quick tap when transport retains
  only the latest release packet, including while another attack is held.
- Skill press counters carry auto/manual context; reconnect acknowledges counters
  without replaying old attacks. Blur/disconnect/reset releases held input.
- Public `attackAt`/direction and guardian windup/impact timestamps drive visuals.
  Own target/cooldown acknowledgements are not exposed to the rival.
- Ground skill zones remain available in fog-filtered snapshots for their real
  lifetime, including when a player later walks into vision. Hidden effects and
  target IDs stay hidden.

## Verification scope

Automated coverage includes all 16 complete bot matchups, 48 range/archetype
engagement cases plus reversed sides, two full-match side-swap state invariants,
actual upgraded combo damage, shields/marks/clone limits, target filtering,
projectile terrain checks, death/reconnect and dropped/delayed inputs.
Every hero has a strength and counter in the fixed practice-bot matrix.
This is a regression gate, not proof of a 50% human win rate or AAA certification.

The map keeps the shared authoritative navigation shapes. New generated floor
and forest materials are clipped to those shapes; there are no painted walls
that invent collision, and no additional buff shrine objectives. Each half still
has the two guardian types. See [art prompts and files](art-v7.md).

Rendering improvements reduce fog backing pixels from 2,250,000 to 563,000,
cache the minimap's static terrain, reuse motion samples, skip unchanged DOM and
depth writes, and pool combat VFX. These are measured work/allocation reductions,
not a claimed physical-phone FPS result. The local performance microbenchmark
was noisy; physical iOS/Android and real-network human playtests remain necessary.
