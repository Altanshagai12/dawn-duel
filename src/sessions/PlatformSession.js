export class PlatformSession {
  constructor() {
    this.mode = 'network';
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.roomListeners = new Set();
    this.connected = false;
    this.connectPromise = null;
    this.unsubscribers = [];
    this.registerHandlers();
  }

  static embedded() {
    return window.parent !== window || Boolean(window.ReactNativeWebView);
  }

  registerHandlers() {
    const game = window.Usion?.game;
    if (!game) return;
    this.unsubscribers.push(game.onRealtime(payload => {
      if (payload?.event === 'duel_snapshot' && payload.data) this.emit(payload.data);
      if (payload?.event === 'duel_error') this.setStatus('error', payload.data);
    }));
    this.unsubscribers.push(game.onRoomAssigned(data => {
      for (const listener of this.roomListeners) listener(data);
      void this.connect(data?.roomId).catch(error => this.setStatus('error', error));
    }));
    this.unsubscribers.push(game.onJoined(() => { this.connected = true; this.setStatus('ready'); }));
    this.unsubscribers.push(game.onPlayerJoined(() => this.setStatus(this.connected ? 'ready' : 'connecting')));
    this.unsubscribers.push(game.onPlayerLeft(() => this.setStatus('poor')));
    this.unsubscribers.push(game.onConnectionState(state => this.setStatus(state === 'connected' || state === 'reconnected' ? 'ready' : state)));
    this.unsubscribers.push(game.onDisconnect(() => { this.connected = false; this.setStatus('poor'); }));
    this.unsubscribers.push(game.onReconnected(() => { this.connected = true; this.setStatus('ready'); }));
    this.unsubscribers.push(game.onConnectionError(error => this.setStatus('error', error)));
    this.unsubscribers.push(game.onNetworkQuality(data => { if (data?.quality === 'poor' || data?.quality === 'dead') this.setStatus('poor'); }));
  }

  async initialize() {
    if (!PlatformSession.embedded()) return { multiplayer: false, config: {}, connection: Promise.resolve() };
    const config = await window.Usion.init({ capabilities: ['game'], timeout: 15000 });
    const launch = window.Usion.getLaunchParams();
    const multiplayer = launch.mode === 'multiplayer';
    const connection = multiplayer ? this.connect(launch.roomId) : Promise.resolve();
    return { multiplayer, config, connection };
  }

  async connect(roomId) {
    if (this.connected) return;
    if (this.connectPromise) return this.connectPromise;
    this.setStatus('connecting');
    this.connectPromise = window.Usion.game.connectDirect({ roomId, protocolVersion: '2', autoReconnect: true })
      .finally(() => { this.connectPromise = null; });
    return this.connectPromise;
  }

  onSnapshot(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  onStatus(listener) { this.statusListeners.add(listener); return () => this.statusListeners.delete(listener); }
  onRoomAssigned(listener) { this.roomListeners.add(listener); return () => this.roomListeners.delete(listener); }
  emit(snapshot) { for (const listener of this.listeners) listener(snapshot); }
  setStatus(status, detail) { for (const listener of this.statusListeners) listener(status, detail); }
  command(type, data = {}) { window.Usion.game.realtime(type, data); return true; }
  sendInput(data) { return this.command('input', data); }
  stop() {
    this.unsubscribers.splice(0).forEach(unsubscribe => unsubscribe?.());
    if (this.connected) window.Usion.game.disconnect();
    this.connected = false;
  }
}
