# Lessons

- Never present an optimistic realtime command as server-confirmed. Pre-match UI must expose authoritative connection, player presence, and readiness, and the client must retain a hero choice made before the room join completes.
- Multiplayer smoke assertions must compare against the player's assigned team, not assume concurrent clients always join in the same order.
- Host and team authority must come only from the verified room token; a client-provided roster is cosmetic data and must never rewrite competitive state.
- Reconnect guarantees must be tested with every socket dropped at once, because a single surviving socket can hide room-lifecycle data loss.
- Direct result retries must keep one deterministic idempotency key, and draws must not be encoded as two leaderboard losses.
- A network timeout must cover response-body consumption as well as receipt of HTTP headers, or shutdown and retry queues can still hang forever.
- A direct-mode server must force-refresh JWKS once on a same-`kid` signature/key miss. The platform can rotate RSA key material without changing `kid`, and a normal multi-minute JWKS cache otherwise rejects every newly minted access token until expiry.
- Verify security-contract assumptions against live minted tokens or production rejection logs. If a new signed claim is not deployed yet, validate it strictly when present and keep the fallback bound only to already verified identities.
- A landscape-only mobile game should rotate its own app shell on portrait screens when the host offers no native orientation-lock API; a rotate suggestion leaves the game unusable inside a fixed-orientation WebView.
