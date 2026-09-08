export class DevSession {
  constructor(access) {
    this.mode = 'network'; this.access = access; this.listeners = new Set(); this.statusListeners = new Set(); this.seq = 0;
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
        this.status('ready'); this.resolveConnection?.();
        this.resolveConnection = null; this.rejectConnection = null;
      }
      if ((frame.type === 'state_delta' || frame.type === 'state_snapshot')
        && frame.payload?.event === 'duel_snapshot') this.emit(frame.payload.data);
    });
  }
  sendFrame(type, payload) {
    if (this.socket.readyState !== WebSocket.OPEN) return;
    this.seq += 1;
    this.socket.send(JSON.stringify({
      type, room_id: this.access.roomId, session_id: this.access.sessionId,
      protocol_version: '2', seq: this.seq, ts: Date.now(), payload,
    }));
  }
  onSnapshot(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  onStatus(listener) { this.statusListeners.add(listener); return () => this.statusListeners.delete(listener); }
  emit(value) { for (const listener of this.listeners) listener(value); }
  status(value) { for (const listener of this.statusListeners) listener(value); }
  command(type, data = {}) { this.sendFrame('input', { action_type: type, action_data: data }); return true; }
  sendInput(data) { return this.command('input', data); }
  stop() { this.socket?.close(1000, 'client stopped'); this.listeners.clear(); }
}
