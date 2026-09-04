import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { resultIdempotencyKey, submitResult } from './result-submit.js';

export class ResultOutbox {
  constructor(options) {
    this.options = options;
    this.path = options.outboxPath || null;
    this.jobs = new Map();
    this.running = new Map();
    this.load();
    if (this.path) this.persist();
  }

  load() {
    if (!this.path || !existsSync(this.path)) return;
    const stored = JSON.parse(readFileSync(this.path, 'utf8'));
    for (const job of Array.isArray(stored) ? stored : []) {
      if (job?.idempotencyKey && job?.payload?.room_id) this.jobs.set(job.idempotencyKey, job);
    }
  }

  persist() {
    if (!this.path) return;
    mkdirSync(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.tmp`;
    writeFileSync(temporary, JSON.stringify([...this.jobs.values()]), { encoding: 'utf8', mode: 0o600 });
    renameSync(temporary, this.path);
  }

  safePersist() {
    try { this.persist(); }
    catch (error) { console.error('[dawn-duel] result outbox persistence failed', error?.message); }
  }

  enqueue(payload) {
    const idempotencyKey = resultIdempotencyKey(
      payload.service_id,
      payload.room_id,
      payload.session_id,
    );
    if (!this.jobs.has(idempotencyKey)) {
      this.jobs.set(idempotencyKey, { idempotencyKey, payload, attempts: 0, nextAt: 0 });
      this.safePersist();
    }
    return idempotencyKey;
  }

  hasRoom(roomId) {
    return [...this.jobs.values()].some(job => job.payload.room_id === roomId);
  }

  pump(now = Date.now()) {
    for (const job of this.jobs.values()) {
      if (this.running.has(job.idempotencyKey) || now < job.nextAt) continue;
      const promise = this.submit(job).finally(() => this.running.delete(job.idempotencyKey));
      this.running.set(job.idempotencyKey, promise);
    }
  }

  async submit(job) {
    try {
      await submitResult({
        ...this.options,
        idempotencyKey: job.idempotencyKey,
        payload: job.payload,
      });
      this.jobs.delete(job.idempotencyKey);
      this.safePersist();
    } catch (error) {
      job.attempts += 1;
      job.nextAt = Date.now() + Math.min(60_000, 1000 * (2 ** Math.min(job.attempts - 1, 6)));
      this.safePersist();
      console.error('[dawn-duel] result retry scheduled', job.payload.room_id, error?.message);
    }
  }

  async flush() {
    for (const job of this.jobs.values()) job.nextAt = 0;
    this.pump();
    await Promise.allSettled([...this.running.values()]);
  }
}
