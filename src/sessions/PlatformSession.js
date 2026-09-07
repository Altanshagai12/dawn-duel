export function selectLaunchSession(launch, platform, current, createLocal) {
  if (launch.session) return launch.session;
  if (launch.multiplayer || platform.roomAssigned || current === platform) return platform;
  return createLocal(launch.config);
}

export class PlatformSession {
  constructor() {
    this.mode = 'network';
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.roomListeners = new Set();
    this.connected = false;
    this.roomAssigned = false;
    this.roomId = null;
    this.status = 'idle';
    this.pendingHero = null;
    this.pendingReady = null;
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
      if (payload?.event === 'duel_snapshot' && payload.data) {
        const you = payload.data.players?.[payload.data.you];
        if (you?.hero === this.pendingHero) this.pendingHero = null;
        if (you?.ready === this.pendingReady) this.pendingReady = null;
        this.emit(payload.data);
      }
      if (payload?.event === 'duel_error') this.setStatus('error', payload.data);
    }));
    this.unsubscribers.push(game.onRoomAssigned(data => {
      this.roomAssigned = true;
      this.roomId = data?.roomId || this.roomId;
      for (const listener of this.roomListeners) listener(data);
    }));
    this.unsubscribers.push(game.onJoined(data => this.markReady(data)));
    this.unsubscribers.push(game.onPlayerJoined(() => this.setStatus(this.connected ? 'ready' : 'connecting')));
    this.unsubscribers.push(game.onPlayerLeft(() => this.setStatus(this.connected ? 'ready' : 'poor')));
    this.unsubscribers.push(game.onConnectionState(state => {
      const status = state === 'reconnected' || (state === 'connected' && this.connected) ? 'ready' : state;
      this.setStatus(status);
    }));
    this.unsubscribers.push(game.onDisconnect(() => { this.connected = false; this.setStatus('poor'); }));
    this.unsubscribers.push(game.onReconnected(() => this.markReady()));
    this.unsubscribers.push(game.onConnectionError(error => this.setStatus('error', error)));
    this.unsubscribers.push(game.onError(error => this.setStatus('error', error)));
    this.unsubscribers.push(game.onNetworkQuality(data => {
      if (data?.quality === 'poor' || data?.quality === 'dead') this.setStatus('poor');
      if ((data?.quality === 'fair' || data?.quality === 'good') && this.connected) this.setStatus('ready');
    }));
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
    if (!roomId) throw new Error('No multiplayer room assigned');
    this.roomId = roomId;
    if (this.connected) { this.setStatus('ready'); return; }
    if (this.connectPromise) return this.connectPromise;
    this.setStatus('connecting');
    this.connectPromise = window.Usion.game.connectDirect({ roomId, protocolVersion: '2', autoReconnect: true })
      .finally(() => { this.connectPromise = null; });
    return this.connectPromise;
  }

  retry() { return this.connect(this.roomId); }

  onSnapshot(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  onStatus(listener) { this.statusListeners.add(listener); return () => this.statusListeners.delete(listener); }
  onRoomAssigned(listener) { this.roomListeners.add(listener); return () => this.roomListeners.delete(listener); }
  emit(snapshot) { for (const listener of this.listeners) listener(snapshot); }
  setStatus(status, detail) {
    this.status = status;
    for (const listener of this.statusListeners) listener(status, detail);
  }
  markReady(data) {
    this.connected = true;
    this.setStatus('ready');
    if (this.pendingHero) window.Usion.game.realtime('select_hero', { hero: this.pendingHero });
    if (this.pendingReady !== null) window.Usion.game.realtime('ready', { ready: this.pendingReady });
  }
  command(type, data = {}) {
    if (type === 'select_hero') this.pendingHero = data.hero || null;
    if (type === 'ready') this.pendingReady = data.ready !== false;
    if (!this.connected) return false;
    window.Usion.game.realtime(type, data);
    return true;
  }
  sendInput(data) { return this.command('input', data); }
  stop() {
    this.unsubscribers.splice(0).forEach(unsubscribe => unsubscribe?.());
    if (this.connected) window.Usion.game.disconnect();
    this.connected = false;
    this.pendingHero = null;
    this.pendingReady = null;
  }
}
