const PHASE = { select: 0, countdown: 1, playing: 2, finished: 3 };
const finite = value => Number.isFinite(value) ? value : null;

// Sequence is private to one recipient/room and includes same-tick commands.
// Older runtimes remain usable through the simulation clock fallback.
export class SnapshotOrder {
  reset() { this.latest = null; }
  accept(snapshot) {
    const next = { sequence: finite(snapshot?.sequence), now: finite(snapshot?.now),
      tick: finite(snapshot?.tick), phase: PHASE[snapshot?.match?.phase] ?? null };
    const last = this.latest;
    if (last) {
      if (last.sequence !== null && next.sequence === null) return false;
      if (next.sequence !== null && last.sequence !== null) {
        if (next.sequence <= last.sequence) return false;
      } else {
        for (const key of ['now', 'tick', 'phase']) {
          if (next[key] !== null && last[key] !== null && next[key] < last[key]) return false;
        }
      }
    }
    this.latest = next;
    return true;
  }
}
