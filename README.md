# Dawn Duel

Dawn Duel is a six-to-ten minute, 1v1, top-down midlane action game built for
Usion. Both heroes begin with exactly 1,500 HP and the same movement/basic
attack baseline. Hero identity comes from two bounded skills, while match-only
upgrades are deliberately capped to prevent runaway builds.

The authoritative simulation runs as a Usion hosted-room bundle. Clients send
normalized input only; movement, hits, damage, XP, cooldowns, fog visibility,
structures, camps, deaths, and the winner are decided by the hosted authority.
Each player receives a different fog-filtered snapshot, so hidden enemy
coordinates never enter the opponent's iframe.

## Game loop

- One lane, one attacking tower and one attacking core per side.
- Five minions per side every 24 seconds; late waves replace a melee unit with
  a siege unit.
- Two neutral guardians on each half. Defeating both guardians from one half in
  the same spawn cycle unlocks one temporary relic choice.
- Level 1–8 upgrade draft with equal seeded offers, strict stat caps, catch-up
  XP, repeat-kill decay, and no permanent gameplay progression.
- At eight minutes Dawnfall starts: both outer defenses decay, while the side
  that earned a meaningful objective/kill/XP pressure lead breaks the rival
  core faster. A 100-point deadband preserves genuine draws.
- Defeated heroes instantly reappear in their fountain as a slow, harmless,
  untargetable Wounded Spirit for 5–10 seconds.
- Allied heroes, minions, tower, and core provide shared vision. Hidden enemy
  units, projectiles, camp state, and combat effects are removed server-side.

## Local development

```powershell
npm install
npm start
```

Open `http://127.0.0.1:4175` for bot practice. For a real two-client hosted-room
test, keep the `usionthemobile` repository next to this repository and run:

```powershell
npm run dev:multiplayer
```

Then open `http://127.0.0.1:4176/?player=blue` and
`http://127.0.0.1:4176/?player=red` in separate windows.

## Verification

```powershell
npm run check
```

The suite rebuilds the single-file hosted bundle, validates every shipped
asset and SDK call, then checks deterministic simulation, combat caps, waves,
structures, XP/upgrades, camps/relics, Wounded Spirit behavior, fog payload
security, input validation, and hero symmetry.
The balance matrix covers all 16 bot matchups plus team-swapped stationary
duels, with a maximum allowed survivor margin of 15% base HP.

## Usion contract

This is a standalone Path B static game. It loads only the official Usion SDK
and platform-hosted Phaser 4 runtime. Multiplayer handlers are registered
before connecting. A multiplayer launch uses `Usion.game.connectDirect()`;
solo play remains bot practice and can be promoted by the host's own Share
button through `Usion.game.onRoomAssigned`. The game does not implement room
codes, matchmaking, invite, wager, or payment UI.

Production registration uses `connection_mode: hosted`, two players, and the
deployed `server.bundle.js`; no Railway service is required.

## Assets

The four hero atlases, portraits, minion atlases, guardian atlases, and ground
texture are reused from the owner's Dawn Survivor repository. Gameplay code,
map layout, balance, network model, UI, structures, effects, and rules in this
repository are new for Dawn Duel.
