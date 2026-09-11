import { SnapshotOrder } from './SnapshotOrder.js';

const TYPES = new Set(['upgrade', 'relic', 'reroll']);
export const isChoice = type => TYPES.has(type);
const failure = code => Object.assign(new Error(code), { code });

// action() acknowledges SDK handoff, not game application. Only the private
// authoritative receipt resolves a choice, with bounded, offer-bound retries.
export class ChoiceTransport {
  constructor(send, { now = Date.now, retryMs = 350, timeoutMs = 5000 } = {}) {
    this.send = send; this.now = now; this.retryMs = retryMs; this.timeoutMs = timeoutMs;
    this.pending = new Map(); this.order = new SnapshotOrder();
  }
  request(type, data) {
    if (!data.offerId || !data.requestId) return Promise.reject(failure('INVALID_CHOICE'));
    if (this.pending.has(data.requestId)) return this.pending.get(data.requestId).promise;
    if (this.pending.size >= 4) return Promise.reject(failure('BUSY'));
    const item = { type, data: { ...data }, started: this.now() };
    item.promise = new Promise((resolve, reject) => { item.resolve = resolve; item.reject = reject; });
    this.pending.set(data.requestId, item);
    this.attempt(item);
    return item.promise;
  }
  attempt(item) {
    if (!this.pending.has(item.data.requestId)) return;
    clearTimeout(item.timer);
    if (this.now() - item.started >= this.timeoutMs) { this.finish(item, null, 'CHOICE_TIMEOUT'); return; }
    try { Promise.resolve(this.send(item.type, item.data)).catch(() => {}); } catch { /* retry after recovery */ }
    if (this.pending.has(item.data.requestId)) {
      item.timer = setTimeout(() => this.attempt(item), this.retryMs);
      item.timer.unref?.();
    }
  }
  observe(snapshot) {
    const current = this.order.accept(snapshot);
    const player = snapshot?.players?.[snapshot.you];
    if (!player) return;
    for (const item of [...this.pending.values()]) {
      const receipt = player.choiceReceipts?.find(value => value.requestId === item.data.requestId
        && value.offerId === item.data.offerId && value.type === item.type && value.id === (item.data.id || null));
      if (receipt) this.finish(item, receipt, receipt.status === 'applied' ? null : receipt.reason || 'INVALID_CHOICE');
      else if (!current) continue; // An old packet cannot revoke a newer offer.
      else if (snapshot.match?.phase === 'finished') this.finish(item, null, 'NOT_PLAYING');
      else {
        const current = item.type === 'relic' ? player.relicOffer?.id : player.offerId;
        if (current !== item.data.offerId) this.finish(item, null, 'STALE_OFFER');
      }
    }
  }
  finish(item, receipt, code) {
    clearTimeout(item.timer); this.pending.delete(item.data.requestId);
    if (code) item.reject(Object.assign(failure(code), { receipt }));
    else item.resolve(receipt);
  }
  retry() { for (const item of [...this.pending.values()]) this.attempt(item); }
  stop() { for (const item of [...this.pending.values()]) this.finish(item, null, 'CANCELLED'); this.order.reset(); }
}
