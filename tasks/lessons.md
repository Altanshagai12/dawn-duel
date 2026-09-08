# Lessons

- Treat transport coalescing as part of the input contract: a skill edge sent as true then false can disappear. Include monotonic press counters, consume once, and reconcile acknowledgements across reconnect.
- Render playable terrain from authoritative geometry, using generated art only as clipped materials. A beautiful prepainted wall is a gameplay defect when collision disagrees.
- Audit both team perspectives, simultaneous impacts, overlapped bodies, and contested boss timestamps; deterministic iteration order alone is not competitive fairness.
- Fog privacy applies to visible opponents too: expose public combat state, not private cooldowns, future offers, exact XP or input acknowledgements.
- A finished match is a terminal lifecycle: freeze simulation, emit once, disconnect clients intentionally and expire rooms without dropping result retries.

- Never present an optimistic realtime command as server-confirmed. Pre-match UI must expose authoritative connection, player presence, and readiness, and the client must retain a hero choice made before the room join completes.
- Multiplayer smoke assertions must compare against the player's assigned team, not assume concurrent clients always join in the same order.
- Host and team authority must come only from the verified room token; a client-provided roster is cosmetic data and must never rewrite competitive state.
- Reconnect guarantees must be tested with every socket dropped at once, because a single surviving socket can hide room-lifecycle data loss.
- Direct result retries must keep one deterministic idempotency key, and draws must not be encoded as two leaderboard losses.
- A network timeout must cover response-body consumption as well as receipt of HTTP headers, or shutdown and retry queues can still hang forever.
- A direct-mode server must force-refresh JWKS once on a same-`kid` signature/key miss. The platform can rotate RSA key material without changing `kid`, and a normal multi-minute JWKS cache otherwise rejects every newly minted access token until expiry.
- Verify security-contract assumptions against live minted tokens or production rejection logs. If a new signed claim is not deployed yet, validate it strictly when present and keep the fallback bound only to already verified identities.
- Never simulate landscape by rotating only a game iframe inside portrait native chrome. The status bar, host header, safe areas, camera sizing, and controls end up in different coordinate systems. The Usion host must rotate its entire native screen; an older host should keep a readable portrait fallback instead of presenting a sideways game.
- When map art implies walls and entrances, server movement and client prediction must use the same navigation geometry; remove decorative closed rings that contradict a passable entrance.
- Structure threat rings must govern both sides of combat: attackers cannot damage a tower from outside the rendered ring, and a ranged unit that can attack must also be targetable by that tower.
- Terrain collision must cover every displacement and damage path, including projectiles, radial skills, dash/knockback, bots, and client prediction; validating only an endpoint leaves tunneling and wall-shot exploits.
- A farm bot test must prove the guardian actually targets the bot, not merely count a guardian kill, because ranged damage can create a false-positive farming result.
- Player overhead labels must use the registered Usion display name from the server-verified, signed game-access identity. Do not substitute a hero name, accept a client-claimed profile name, or fall back to a user id.
- Production verification must exercise every launch mode with a cache-busted build. A correct multiplayer identity path can still leave embedded solo practice showing a placeholder instead of the registered Usion name.
- A phone MOBA must preserve one world-space field of view while scaling its backing canvas by a bounded device-pixel ratio; CSS size alone can look correct on desktop yet remain blurry on a real landscape phone.
- Generate map art and authoritative navigation as one contract: every visible camp, wall, corridor, and entrance must use a matching reachable or blocked gameplay region, while paired objectives stay rotationally symmetric even when the illustration is ornamental.
- Confirm the product noun before adding objective types: “buff” may describe a boss reward, not permission to add a separate shrine. Model the reward on the existing boss lifecycle unless the user explicitly asks for another capturable objective.
- A game iframe cannot rotate native mobile chrome. Ship an orientation-capable Usion binary plus the service `landscape`/`moba` tag; never compress or fake-rotate a wide battlefield with CSS.
- When the requested experience is automatic landscape, do not replace it with a player-facing rotate gate. Carry the landscape service policy into native navigation before the game mounts; the game may request the browser lock silently, but must not ask the player to repair host orientation.
