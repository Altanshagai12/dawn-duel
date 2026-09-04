# Lessons

- Never present an optimistic realtime command as server-confirmed. Pre-match UI must expose authoritative connection, player presence, and readiness, and the client must retain a hero choice made before the room join completes.
- Multiplayer smoke assertions must compare against the player's assigned team, not assume concurrent clients always join in the same order.
- Host and team authority must come only from the verified room token; a client-provided roster is cosmetic data and must never rewrite competitive state.
- Reconnect guarantees must be tested with every socket dropped at once, because a single surviving socket can hide room-lifecycle data loss.
- Direct result retries must keep one deterministic idempotency key, and draws must not be encoded as two leaderboard losses.
- A network timeout must cover response-body consumption as well as receipt of HTTP headers, or shutdown and retry queues can still hang forever.
