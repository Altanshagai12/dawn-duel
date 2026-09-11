export const INPUT_TIMELINE = Symbol('dawnDuelInputTimeline');

const MAX_AGE_MS = 1000;
const MAX_ENTRIES = 64;
const MAX_REPLAY_MS = 300;

function validSequence(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export class InputTimeline {
  constructor(clock = () => performance.now()) {
    this.clock = clock;
    this.reset();
  }

  reset() {
    this.entries = [];
    this.acknowledged = null;
  }

  record(input, sentAt = this.clock()) {
    if (!validSequence(input?.seq) || !Number.isFinite(sentAt)) return false;
    const last = this.entries.at(-1);
    if (last && input.seq <= last.seq) return false;
    this.entries.push({ seq: input.seq, at: sentAt, moveX: input.moveX || 0, moveY: input.moveY || 0 });
    const oldest = sentAt - MAX_AGE_MS;
    while (this.entries.length > MAX_ENTRIES || (this.entries.length > 1 && this.entries[1].at < oldest)) {
      this.entries.shift();
    }
    return true;
  }

  acknowledge(sequence) {
    if (!Number.isSafeInteger(sequence) || sequence < -1) return false;
    // An out-of-order snapshot can arrive after a newer acknowledgement.
    // A real session replacement calls reset(); never infer an epoch from a
    // regressing packet and discard the still-live prediction history.
    if (this.acknowledged !== null && sequence < this.acknowledged) return false;
    this.acknowledged = sequence;
    if (sequence < 0) return true;
    let keep = 0;
    for (let index = 0; index < this.entries.length; index += 1) {
      if (this.entries[index].seq <= sequence) keep = index;
      else break;
    }
    if (keep > 0) this.entries.splice(0, keep);
    return true;
  }

  // The server reports how long the acknowledged held input was already
  // simulated. Replay begins after that consumed portion, remains bounded,
  // and visits only movement states that the client actually sent.
  forEachReplaySegment(sequence, simulatedMs, clientMs, visit) {
    if (!validSequence(sequence) || !Number.isFinite(clientMs)) return false;
    const ackIndex = this.entries.findIndex(entry => entry.seq === sequence);
    if (ackIndex < 0) return false;
    const ack = this.entries[ackIndex];
    const consumed = Number.isFinite(simulatedMs) ? Math.max(0, Math.min(MAX_REPLAY_MS, simulatedMs)) : 0;
    const start = Math.max(clientMs - MAX_REPLAY_MS, Math.min(clientMs, ack.at + consumed));
    let activeIndex = ackIndex;
    while (activeIndex + 1 < this.entries.length && this.entries[activeIndex + 1].at <= start) activeIndex += 1;
    let active = this.entries[activeIndex];
    let cursor = start;
    for (let index = activeIndex + 1; index < this.entries.length; index += 1) {
      const next = this.entries[index];
      if (next.at >= clientMs) break;
      if (next.at > cursor) visit(active, next.at - cursor, next.at - start);
      active = next;
      cursor = Math.max(cursor, next.at);
    }
    if (clientMs > cursor) visit(active, clientMs - cursor, clientMs - start);
    return true;
  }
}
