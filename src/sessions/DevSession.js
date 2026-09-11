import { ChoiceTransport, isChoice } from './ChoiceTransport.js';
import { SnapshotOrder } from './SnapshotOrder.js';

export class DevSession {
  constructor(access) {
    this.mode = 'network'; this.access = access; this.listeners = new Set(); this.statusListeners = new Set(); this.seq = 0;
    this.snapshotOrder = new SnapshotOrder();
    this.choices = new ChoiceTransport((type, data) => this.sendFrame('action', { action_type: type, action_data: data }));
    this.connection = new Promise((resolve, reject) => { this.resolveConnection = resolve; this.rejectConnection = reject; });
    this.connect();
  }
  connect() {
    this.socket = new WebSocket(`${this.access.wsUrl}?token=${encodeURIComponent(this.access.token)}`);
    this.socket.addEventListener('open', () => this.sendFrame('join', {}));
    this.socket.addEventListener('close', () => {
      this.connected = false;
      this.status('poor');
      if (this.rejectConnection) this.rejectConnection(new Error('Local multiplayer connection closed'));
      this.rejectConnection = null;
    });
    this.socket.addEventListener('message', event => {
      const frame = JSON.parse(event.data);
      if (frame.type === 'joined') {
        this.connected = true;
        this.choices.retry();
        this.status('ready'); this.resolveConnection?.();
        this.resolveConnection = null; this.rejectConnection = null;
      }
      if ((frame.type === 'state_delta' || frame.type === 'state_snapshot')
        && frame.payload?.event === 'duel_snapshot') this.emit(frame.payload.data);
    });
  }
  sendFrame(type, payload) {
    if (this.socket.readyState !== WebSocket.OPEN) return false;
    this.seq += 1;
    this.socket.send(JSON.stringify({
      type, room_id: this.access.roomId, session_id: this.access.sessionId,
      protocol_version: '2', seq: this.seq, ts: Date.now(), payload,
    }));
    return true;
  }
  onSnapshot(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  onStatus(listener) { this.statusListeners.add(listener); return () => this.statusListeners.delete(listener); }
  emit(value) {
    this.choices.observe(value);
    if (!this.snapshotOrder.accept(value)) return false;
    for (const listener of this.listeners) listener(value);
    return true;
  }
  status(value) { for (const listener of this.statusListeners) listener(value); }
  command(type, data = {}) {
    if (isChoice(type)) return this.choices.request(type, data);
    return this.sendFrame('input', { action_type: type, action_data: data });
  }
  sendInput(data) { return this.command('input', data); }
  stop() { this.choices.stop(); this.snapshotOrder.reset(); this.socket?.close(1000, 'client stopped'); this.listeners.clear(); }
}
