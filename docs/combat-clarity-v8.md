# Combat clarity v8

## Research → decisions (2026-09-10)

- [MLBB design-team control guidance, Apple interview](https://apps.apple.com/sg/iphone/story/id1677291177): category selection and assisted aiming reduce targeting burden. Dawn Duel keeps hero-priority attack, farm-only and structure-only controls with selectable within-category HP/nearest priority. No forced chasing.
- [MOONTON's official Zetian ability introduction](https://en.moonton.com/news/209.html): projectile chains, placed persistent areas, and defensive reactions each have a specific trigger and outcome. Inference for this game: show a functional verb, actual cast, and lasting status separately. We do not copy Zetian's kit or current MLBB numeric balance.
- [Riot: Clarity in League](https://www.leagueoflegends.com/en-us/news/dev/clarity-in-league/): match visible boundaries to hitboxes, give important effects priority, and avoid visual overload. Dawn Duel uses restrained basic shots, exact fire-field boundaries, brief confirmed-cast labels, and status/boss glyphs rather than making every shot brighter.

## Delivery and visibility rules

Upgrade clicks get immediate pending feedback, then an authoritative receipt and concrete stat change. Transport handoff is not proof of applying an upgrade. A retry must be bound to the same offer, never consume a later queued choice.

Combat inspection is available during play without pausing. It exposes current upgraded stats and skill descriptions, not just mouse-only tooltips. Functional button labels explain actions on phones. Server-filtered status and boss powers are shown on visible rivals only; hidden enemies never gain UI markers through this feature.

Two existing boss types grant separate temporary powers, not additional objectives or permanent stat inflation. Exact values come from shared server configuration. Repeated kills refresh duration, not charges or proc cooldowns. No new mana economy is introduced.

## Verification

Evidence and limits are recorded after implementation below. Synthetic latency tests cannot certify every phone GPU or carrier connection; real-device feel remains a separate validation step.

### Gameplay budgets

| Existing guardian | 30-second power | Proc recovery |
| --- | --- | --- |
| Aegis / blue | New skill cooldowns −4%; combined reduction capped at 12%. Block up to 35 damage from a direct enemy hero projectile, after armor. | 8s |
| Tempo / red | Successful basic impact adds 18 damage to non-structures; an enemy hero also receives 12% slow for 0.6s. Popup reports actual marginal HP loss after mitigation/shield/overkill. | 3s |

Both powers expire independently, clear on death, refresh duration only, and have shape/glyph redundancy in addition to color. These replace the old indistinct 3% damage/speed reward; no extra shrine or mana system exists.

Base attack ranges remain hero 430, melee 42, ranged 220, siege 245, tower 280, core 310 world units. Skill ranges preserve kit identity: Shana 520/430, Diamond self/340, Scarlett 420/self, Hina 140 dash/410. Every structure-damage path additionally requires the attack origin inside that structure's retaliation ring. 24 hero/minion/team/structure cases exercise actual retaliation. The same 1500 starting HP and upgrade caps remain.

32 full seeded matches (42 and 20260904), paired-side state comparisons and bounded duels guard against objective, hero-order and burst regressions. The strongest tested max-upgrade/two-power combo deals 494.25 HP, under the existing 550 HP gate. This is a regression budget, not proof of balanced human win rates.

### Implementation evidence

- Full `npm run check`: 255/255 tests, 29 local assets, SDK contract verification and signed-token multiplayer smoke passed. The smoke covers guest-first admission, host-only start, simultaneous reconnect, 140–450ms stale/dropped inputs, result idempotency and oversized frames.
- Actual click tests cover moving while choosing, immediate pending, confirmed before→after stats, duplicate clicks, queued identical offers, timeout/retry identity and late acknowledgements. Snapshot sequence protects same-tick receipts and prevents stale UI/input/offer regressions.
- Independent review found and fixed capacity-triggered VFX/audio replay and incorrect slowed/wounded speed readouts. Live effect history now evicts oldest IDs without clearing still-active events.
- Browser: fresh signed host/guest selected Diamond/Hina, guest readied, host started, live Q casts showed shield/afterimage and authoritative cooldowns. Local QA fixture at 667×320 exercised held motion plus an actual upgrade click: HP 1260→1335 and max HP 1500→1575, with the next queued offer still usable and no paused combat.
- Browser: two boss powers displayed separate rings, glyphs, duration/proc chips and paired relic choices. A 390×844 portrait frame produced a logical 844×390 game/canvas; the existing game-owned default landscape remained intact. The local-only fixture is removed before handoff.
- A local browser frame probe during held-motion/choice QA observed median 16.7ms and p95 ≈16.9ms. It is not a phone benchmark, a carrier test, or evidence that network ping fell.

### Network motion evidence

The regression fixture compares the frozen v7 correction path with acknowledged input replay under deterministic variable upstream/downstream delay, lost snapshots and a direction reversal. These are simulation measurements, not WAN or physical-device benchmarks.

| Metric | v7 baseline | v8 |
| --- | --- | --- |
| Local p95 position error | 25.51 world units | 13.03 world units |
| Local maximum frame step, 60 FPS | 4.33 world units | 3.75 world units |
| Local wrong-direction correction frames | 1 | 0 |
| Remote maximum presentation catch-up | 103.16ms | 20.83ms |
| Remote frozen frames in the 5s fixture | 15 | 7 |
| Remote p95 presentation lag | 180ms | 216.67ms |

The explicit tradeoff is approximately 37ms more remote presentation delay under adverse jitter in exchange for bounded catch-up; network ping is unchanged. The presentation clock never extrapolates hidden or unsampled opponents. Local prediction stops advancing after 300ms of snapshot silence and retains server collision and authoritative death/dash snaps.

Additional tests cover 30/120 FPS, stopping, an 800ms snapshot outage, stale acknowledgements, reset/reconnect, wall and structure collision, and prediction metadata never entering network packets. Independent final review found no remaining actionable P0/P1/P2 issues in the reviewed scope; that is not an absence-of-defects or AAA certification.

## Release boundary

Deployment is a separately authorized operation. Publish the matching direct server first, verify health, then publish the versioned `app.v8.js` frontend. A server-only deployment does not deliver the new interface or reliable client retries. No Usion source, registry, identity contract or native release is required.

The release audit on 2026-09-11 found that old, already-open v7 clients send choices without offer/request IDs. A narrow adapter at the authenticated direct-input boundary preserves these legacy choices during rollout: a server-owned connection epoch plus the accepted frame sequence supplies their request identity, and the current authoritative offer is captured at first processing. Existing identity, membership, sequence, expiry, option and rank validation remains in force. Partial v8 IDs and unbound `action` messages never use the adapter. Replayed frame sequences on the same connection cannot consume a later offer; fresh reconnect requests cannot collide with old receipts when their frame numbers restart.

A legacy packet cannot identify the offer originally displayed before it was sent; only v8 supplies that end-to-end guarantee and reliable retries. Close and reopen cached v7 tabs for all new visuals and behavior. Verify live frontend contents and provider deployment state, distinguish local signed-token tests from a real Usion invitation flow, and do not claim physical-device or two-account production testing unless actually performed.
