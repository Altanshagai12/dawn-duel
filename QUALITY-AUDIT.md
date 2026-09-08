# Gameplay quality audit — 2026-09-08

## Resolved defects

- Piercing collision now sweeps every body and wall along the full shot path;
  muzzle offsets consume range. Same-tick impacts resolve by contact time,
  with symmetric contested boss outcomes and simultaneous core draws.
- Every structure damage path checks the visible attack ring. Minions route
  around live towers, remain in lane, and cannot chase or shoot through walls.
- All four boss clearings are connected through real entrances. The renderer,
  minimap, server movement, dash, knockback, and bot routes share geometry.
  Generated floor/forest materials replace misleading prepainted terrain.
- Boss respawn resets only that guardian's kill progress. Guardian strikes
  respect walls, and their windup remains dodgeable. No extra buff shrines.
- Shana's volley has a small slow; Scarlett has a bounded three-target piercing
  wave and three empowered shots; Diamond retains shield/knockback; Hina retains
  a short dash and a vulnerable firing afterimage. Dead clones cannot fire,
  weak burns cannot extend strong burns, and broken shields cannot instantly refill.
- Queued upgrades get distinct, symmetric offers and one reroll per offer.
  Rank caps, nonstacking boss power, catch-up XP and repeat-kill decay remain.
  Finished games reject upgrades. Death clears transient attacks/aggro/reveals
  without resetting cooldowns; Warden replacement clears its shield.
- Touch skills aim on drag, cast on release, and cancel with a distant drag.
  Multiple fingers cannot steal a joystick. Disconnect/blur releases input.
  Monotonic press counters survive latest-packet-only SDK backpressure/reload.
- UI follows authoritative lobby/countdown/playing/finished phases. Red players
  see their own registered name, level and core on the own-player side.
  Upgrade descriptions, next rank, build summary and relic timers stay readable.
  Offers never pause combat; announcements survive individual snapshot ticks.
- Embedded connection failure no longer silently launches a bot game.
  Finished rooms emit one final result, freeze simulation, expire after 30s,
  and retain independent idempotent result retries. Clients intentionally stop
  reconnecting after receiving the final result and offer an exit action.
- Fog sits above every world entity/effect and preserves one's own death burst.
  Even visible opponents receive no private cooldowns, future choices or exact
  XP/build. Hidden units, projectiles and guardian state remain server-filtered.

## Objective layout and balance rationale

The map is 2000×1125. Blue core (210,980) / tower (540,805) are mirrored by
red core (1790,145) / tower (1460,320). Tower-to-core spacing is about 374 units;
opposing tower threat circles leave about 480 units of contested midlane.
Both halves rotate exactly 180°, including all four camp routes. The longer
Aegis approach (~470 units) has a 950-HP guardian; the shorter Tempo approach
(~320 units) has a 1200-HP guardian. Approximate base-speed, uncontested travel
plus damage cost is similar (~11s); this is not a claim of equal human win rate.

All heroes start at 1500 HP, speed180, basic damage65. Maximum upgrade-only
bonuses are HP+225, basic+15%, skill+18%, speed+9%, incoming basic/skill damage
reduction8%, cooldown reduction8%. Hero identity comes from two skills, not
unbounded stat growth. Five minions spawn per side every24s; relics last45s.

## Verification and honest limits

- `npm run check`: 162 unit/regression tests, client/server builds, 24 asset
  checks, SDK contract check and real signed-token direct-WebSocket smoke.
- Balance simulations: all16 bot matchups complete by10minutes; team-swapped
  stationary duels stay within225HP survivor margin. Complete contested
  Diamond/Hina games preserve state at every tick after swapping sides.
- Two browser clients: host/guest selection, disabled host start before guest
  readiness, countdown, live play, both hero skill cooldowns and guest reload.
- Browser visual QA: desktop and844×390,667×320 landscape. Separate deterministic
  visual fixture exercised simultaneous upgrade/relic cards, real choice commands,
  continued combat/clock, and the network result screen. Fixture is not shipped.
- Independent critic re-reviewed combat, navigation, progression, input,
  fog/security and lifecycle/UI findings. No remaining P0/P1/P2 in that reviewed
  scope; this does not prove absence of all defects.
- Game-owned landscape follow-up: first-paint CSS rotates boot, lobby and gameplay
  together in a portrait frame, like Dawn Survivor. Native Usion chrome is not
  rotated or modified. Logical client dimensions drive camera and sharp canvas
  backing pixels; minimap, pointer aiming, joystick and skill vectors agree.
  No browser lock, native release, SDK or registry change is required.
- Follow-up browser QA: 390×700 portrait becomes logical700×390; switching to
  700×390 landscape preserves the same aspect and controls. Rotated move/skill
  drag casts successfully. 320×568 portrait has four compact hero cards, a visible
  Ready/Start footer and non-overlapping HP/skill controls. Two signed-token
  browser clients completed guest Ready → host Start → live play from this lobby.
  A suspended local harness guest required a reload; the production transport
  was not changed. Full direct smoke separately verifies simultaneous reconnect.
- Physical iOS/Android device and human competitive playtesting remain necessary.
  Automated tests and critic review are not an “AAA” certification.

## Smooth combat presentation follow-up

- Basic fire no longer draws a persistent world aiming ray. The attack joystick
  lights immediately on hold and flashes only when a new authoritative basic
  attack is acknowledged. Q/E previews and actual shots/impacts are unchanged.
  Wounded, disabled, disconnected and reset states clear feedback; reduced-motion
  users retain steady feedback without the flash animation.
- Local prediction advances its correction anchor between snapshots instead of
  chasing a stationary stale point every frame. Camera damping is frame-rate
  independent and subpixel; sprite direction has a small hysteresis and holds
  while idle. Remote units interpolate buffered, fog-filtered positions rather
  than exponentially chasing each newest packet. Projectiles use a shorter
  presentation delay and never extrapolate beyond visible server samples.
- Prediction remains collision-checked and bounded to 300ms of packet silence.
  Death/dash snaps stay latched across queued snapshots; old/duplicate timestamps
  cannot rewind prediction or extend freshness. Reset clears the presentation
  clock so a new session can start at an earlier simulation time.
- Start/release edges send immediately; held joystick movement keeps the normal
  20Hz input cadence. Mouse, keyboard and touch firing holds are independent.
  Hidden draft rendering is skipped during play; repeated phase/label mutations
  are avoided. Balance, authoritative simulation and transport are unchanged.
- Regression tests cover 30/60/120 FPS motion response, interpolation, stale
  packets, fog removal, collision, lifecycle interleavings, input source overlap
  and feedback acknowledgement. Browser play checked both 844x390 landscape and
  rotated 390x700 portrait frames with hold/release feedback. A local-only control
  fixture is excluded from the release. This is not a physical-device FPS benchmark.
