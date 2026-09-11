# Facing correction — v9

Implementation evidence for the v9 release. Baseline: production v8,
commit 46a2d9151676f6f2abf64e4f25b746b9d691cf10.

## Behavior

- A confirmed basic shot or directional skill faces its real direction for at
  most300ms, then locomotion takes over. Holding attack alone does not lock facing.
- Newest action wins. A basic wins a same-tick tie (the server fires it after skills).
- Packet silence/repeated acknowledgements cannot renew the pose. Idle keeps its
  last direction; local reconciliation drift is not movement. Wall slides use actual travel.
- Shadow Step uses actual dash displacement; a clone records its own shot heading.
- Hina/Scarlett west rows mirror east sprite art only. Nameplates/statuses stay upright.
- No balance, terrain, input, Usion SDK or native-app changes.

## Verification

- Two regression tests failed against v8 (held no-target attack; cooldown reversal)
  and pass after the fix.13 focused facing tests cover all8 directions/all4 heroes,
  actions, skill/basic ordering, packet silence, reset, utility skills, and clone metadata.
- `npm run check`:268/268 tests,29 local assets, SDK contract, both bundles, and
  signed multiplayer smoke passed (Ready/Start, reconnect, delayed input, result retries).
- Independent critic reran42 facing/motion/hero-kit/fog tests; no actionable
  P0/P1/P2 remained in the reviewed facing scope.
- Browser QA used actual EntityViews and existing sprite sheets: all four directional
  strips inspected; Hina/Scarlett west/east reversal, held no-target attack, a west shot
  while moving east, and west dash with old east aim verified. Temporary QA files removed.
- The v9 bundled client also entered live play with two signed local sessions via
  guest Ready → host Start. Keyboard movement and Hina dash worked. No browser warnings/errors.
- Physical phone testing was not performed; no viewport/input-transform code changed.

## Later release

Keep app.v8.js unchanged. Publish the server's additive castAt/clone heading metadata
before switching Pages to app.v9.js. Old v8 skill events remain readable via their
fixed450ms expiry, but clone heading requires the new server.
