import WebSocket from 'ws';

const baseUrl = process.env.DAWN_DUEL_URL || 'http://127.0.0.1:4176';

function deadline(message, ms = 8_000) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
}

async function getAccess(player) {
  const response = await fetch(`${baseUrl}/__dev_access?player=${player}`);
  if (!response.ok) throw new Error(`Access request failed: ${response.status}`);
  return response.json();
}

class SmokeClient {
  constructor(player) {
    this.player = player;
    this.seq = 0;
    this.snapshots = [];
    this.waiters = [];
  }

  async connect() {
    this.access = await getAccess(this.player);
    const url = `${this.access.wsUrl}?token=${encodeURIComponent(this.access.token)}`;
    this.socket = new WebSocket(url);
    await Promise.race([
      new Promise((resolve, reject) => {
        this.socket.once('open', () => this.send('join', {}));
        this.socket.once('error', reject);
        const onMessage = raw => {
          const frame = JSON.parse(raw.toString());
          if (frame.type === 'joined') {
            this.socket.off('message', onMessage);
            resolve();
          }
        };
        this.socket.on('message', onMessage);
      }),
      deadline(`${this.player} did not join`),
    ]);
    this.socket.on('message', raw => this.consume(JSON.parse(raw.toString())));
  }

  consume(frame) {
    if ((frame.type !== 'state_delta' && frame.type !== 'state_snapshot')
      || frame.payload?.event !== 'duel_snapshot') return;
    const snapshot = frame.payload.data;
    this.snapshots.push(snapshot);
    if (this.snapshots.length > 120) this.snapshots.shift();
    for (const waiter of [...this.waiters]) {
      if (!waiter.predicate(snapshot)) continue;
      this.waiters.splice(this.waiters.indexOf(waiter), 1);
      waiter.resolve(snapshot);
    }
  }

  send(type, payload) {
    this.seq += 1;
    this.socket.send(JSON.stringify({
      type,
      room_id: this.access.roomId,
      session_id: this.access.sessionId,
      protocol_version: '2',
      seq: this.seq,
      ts: Date.now(),
      payload,
    }));
  }

  command(type, data = {}) {
    this.send('input', { action_type: type, action_data: data });
  }

  waitFor(predicate, message, ms = 8_000) {
    const existing = [...this.snapshots].reverse().find(predicate);
    if (existing) return Promise.resolve(existing);
    return Promise.race([
      new Promise(resolve => this.waiters.push({ predicate, resolve })),
      deadline(message, ms),
    ]);
  }

  drop() {
    this.socket.terminate();
  }

  close() {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.close(1000, 'smoke complete');
  }
}

const blue = new SmokeClient('blue');
let red = new SmokeClient('red');

try {
  await Promise.all([blue.connect(), red.connect()]);
  blue.command('select_hero', { hero: 'hina' });
  red.command('select_hero', { hero: 'diamond' });

  const live = await blue.waitFor(
    snapshot => snapshot.match.phase === 'playing',
    'Match did not enter playing state',
  );
  const rival = Object.values(live.players).find(player => player.id !== live.you);
  if (!rival || rival.visible !== false || 'x' in rival || 'hp' in rival) {
    throw new Error('Fog-of-war leaked the remote rival state');
  }
  console.log('[smoke] two clients joined, drafted, and reached live play');
  console.log('[smoke] per-player fog snapshot hides rival position and health');

  red.drop();
  await blue.waitFor(snapshot => snapshot.match.paused, 'Disconnect did not pause the match', 4_000);
  console.log('[smoke] disconnect paused the authoritative simulation');

  blue.snapshots.length = 0;
  red = new SmokeClient('red');
  await red.connect();
  await blue.waitFor(
    snapshot => snapshot.match.phase === 'playing' && !snapshot.match.paused,
    'Reconnect did not resume the match',
    7_000,
  );
  console.log('[smoke] same-player reconnect resumed after the safety countdown');

  blue.snapshots.length = 0;
  red.drop();
  const finished = await blue.waitFor(
    snapshot => snapshot.match.phase === 'finished',
    'Reconnect timeout did not resolve as a forfeit',
    22_000,
  );
  if (finished.match.finishReason !== 'forfeit' || finished.match.winnerTeam !== 0) {
    throw new Error('Forfeit resolved with the wrong result');
  }
  console.log('[smoke] 15-second reconnect timeout awarded the correct forfeit');
  console.log('[smoke] multiplayer runtime smoke passed');
} finally {
  blue.close();
  red.close();
}
