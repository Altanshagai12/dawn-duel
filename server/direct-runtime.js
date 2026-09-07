import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { config, init, onInput, onJoin, onLeave, tick } from './index.js';
import { createAccessVerifier } from './direct-auth.js';
import { allowMessage, MAX_FRAME_BYTES, MAX_INPUT_BYTES, parseFrame, payloadSize, rejectSocket, sendFrame } from './direct-wire.js';
import { ResultOutbox } from './result-outbox.js';
import { createResultPayload } from './result-submit.js';

const EMPTY_ROOM_TTL_MS = 120_000;
const FINISHED_ROOM_TTL_MS = 30_000;
const SOCKET_IDLE_MS = 70_000;
const MAX_CONNECTIONS = 256;

function playerIds(room) {
  return [...room.members.keys()].sort((left, right) => {
    if (left === room.hostId) return -1;
    if (right === room.hostId) return 1;
    return 0;
  });
}

export function createDirectRuntime(options) {
  const verifyAccess = createAccessVerifier(options);
  const rooms = new Map();
  const identityRates = new Map();
  const authenticated = new Map();
  const outbox = new ResultOutbox(options);
  const http = createServer((request, response) => {
    if (request.url === '/health' || request.url === '/health/') {
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ status: 'ok', service: options.serviceId, rooms: rooms.size }));
      return;
    }
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'Not found' }));
  });
  const sockets = new WebSocketServer({ server: http, path: '/ws', maxPayload: MAX_FRAME_BYTES });

  function broadcast(room, type, payload, except = null) {
    for (const member of room.members.values()) {
      if (member.socket !== except) sendFrame(member.socket, type, payload);
    }
  }

  function createRoom(identity) {
    const hostSigned = Boolean(identity.hostId);
    const room = {
      id: identity.roomId,
      hostId: identity.hostId || identity.id,
      signedHostId: identity.hostId || null,
      members: new Map(),
      state: null,
      ended: false,
      endedAt: 0,
      emptyAt: 0,
      resultSessionId: identity.sessionId,
    };
    if (!hostSigned) {
      console.info(JSON.stringify({
        event: 'host_compatibility_fallback',
        reason: 'verified_token_missing_host_id',
      }));
    }
    const facade = {
      get state() { return room.state; },
      set state(value) { room.state = value; },
      get players() { return playerIds(room); },
      get now() { return Date.now(); },
      send(id, event, data) { sendFrame(room.members.get(id)?.socket, 'state_delta', { event, data }); },
      broadcast(event, data) { broadcast(room, 'state_delta', { event, data }); },
      end(results = {}) {
        if (room.ended) return;
        room.ended = true;
        room.endedAt = Date.now();
        broadcast(room, 'match_end', results);
        const payload = createResultPayload({
          serviceId: options.serviceId,
          roomId: room.id,
          sessionId: room.resultSessionId,
          world: room.state.world,
        });
        outbox.enqueue(payload);
      },
    };
    room.facade = facade;
    init(facade);
    rooms.set(room.id, room);
    return room;
  }

  function leave(session) {
    const room = rooms.get(session.identity?.roomId);
    const member = room?.members.get(session.identity?.id);
    if (!room || !member || member.socket !== session.socket) return;
    member.socket = null;
    member.connected = false;
    onLeave(room.facade, { id: member.id, name: member.name, hostId: room.hostId });
    broadcast(room, 'player_left', {
      room_id: room.id,
      player_id: member.id,
      player_ids: playerIds(room),
    });
    if (![...room.members.values()].some(item => item.connected)) room.emptyAt = Date.now();
  }

  function join(session) {
    const identity = session.identity;
    let room = rooms.get(identity.roomId);
    room ||= createRoom(identity);
    let member = room.members.get(identity.id);
    if (!member && room.members.size >= config.maxPlayers) {
      rejectSocket(session.socket, 'ROOM_FULL', 'Room already has two players');
      return;
    }
    let replaceHost = false;
    if (identity.hostId) {
      if (room.signedHostId && room.signedHostId !== identity.hostId) {
        rejectSocket(session.socket, 'HOST_MISMATCH', 'Signed room host mismatch');
        return;
      }
      if (!room.signedHostId) {
        const hostIsParticipant = identity.id === identity.hostId || room.members.has(identity.hostId);
        if (!hostIsParticipant || (room.state?.world?.phase !== 'select' && !member)) {
          rejectSocket(session.socket, 'HOST_MISMATCH', 'Signed room host mismatch');
          return;
        }
        room.signedHostId = identity.hostId;
        if (room.state?.world?.phase === 'select' && room.hostId !== identity.hostId) {
          room.hostId = identity.hostId;
          replaceHost = true;
        }
      }
    }
    const reconnected = Boolean(member);
    if (member?.socket && member.socket !== session.socket) {
      try { member.socket.close(4001, 'Replaced by reconnect'); } catch { /* stale socket */ }
    }
    member ||= { id: identity.id, rate: session.rate };
    session.rate = member.rate;
    Object.assign(member, {
      name: identity.name,
      sessionId: identity.sessionId,
      socket: session.socket,
      connected: true,
    });
    room.members.set(identity.id, member);
    room.emptyAt = 0;
    session.joined = true;
    sendFrame(session.socket, 'joined', {
      room_id: room.id,
      player_id: identity.id,
      player_ids: playerIds(room),
      host_id: room.hostId,
      reconnected,
    });
    onJoin(room.facade, {
      id: identity.id,
      name: identity.name,
      hostId: room.hostId,
      replaceHost,
    });
    broadcast(room, 'player_joined', {
      room_id: room.id,
      player_id: identity.id,
      player_ids: playerIds(room),
      host_id: room.hostId,
      reconnected,
    }, session.socket);
  }

  function handle(session, raw) {
    const frame = parseFrame(raw);
    if (!frame) { rejectSocket(session.socket, 'INVALID_FRAME', 'Malformed message', 4002); return; }
    session.lastSeen = Date.now();
    session.socket._dawnLastSeen = session.lastSeen;
    if (!allowMessage(session.rate, frame.type, session.lastSeen)) {
      rejectSocket(session.socket, 'RATE_LIMITED', 'Message rate exceeded', 4008);
      return;
    }
    if (frame.roomId !== session.identity.roomId || frame.sessionId !== session.identity.sessionId
      || frame.protocol !== '2') {
      rejectSocket(session.socket, 'IDENTITY_MISMATCH', 'Message identity mismatch', 4003);
      return;
    }
    if (frame.seq <= session.lastSeq) return;
    session.lastSeq = frame.seq;
    if (frame.type === 'join') { if (!session.joined) join(session); return; }
    if (!session.joined) { rejectSocket(session.socket, 'NOT_JOINED', 'Join the room first', 4003); return; }
    if (frame.type === 'heartbeat' || frame.type === 'ping') {
      sendFrame(session.socket, 'pong', { t: frame.payload.t, server_t: Date.now(), seq: frame.seq });
      return;
    }
    if (frame.type !== 'input') return;
    if (payloadSize(frame.payload) > MAX_INPUT_BYTES) {
      rejectSocket(session.socket, 'PAYLOAD_TOO_LARGE', 'Input payload exceeds 8 KiB', 4009);
      return;
    }
    const room = rooms.get(session.identity.roomId);
    if (!room || room.ended) return;
    if (room.members.get(session.identity.id)?.socket !== session.socket) return;
    const type = typeof frame.payload.action_type === 'string' ? frame.payload.action_type : 'input';
    const data = frame.payload.action_data && typeof frame.payload.action_data === 'object'
      ? frame.payload.action_data : {};
    onInput(room.facade, { id: session.identity.id }, { type, data, channel: 'input' });
  }

  function attach(socket, request) {
    if (sockets.clients.size > MAX_CONNECTIONS) {
      rejectSocket(socket, 'SERVER_BUSY', 'Too many concurrent connections', 4013);
      return;
    }
    socket._dawnLastSeen = Date.now();
    const session = { socket, identity: null, joined: false, lastSeq: -1, rate: {} };
    const buffered = [];
    let authorized = false;
    socket.on('message', raw => {
      if (!authorized) {
        if (buffered.length >= 4) rejectSocket(socket, 'AUTH_PENDING', 'Too many messages before authentication', 4008);
        else buffered.push(raw);
        return;
      }
      handle(session, raw);
    });
    socket.on('close', () => {
      if (session.authKey && authenticated.get(session.authKey) === session) authenticated.delete(session.authKey);
      leave(session);
    });
    socket.on('error', () => {});
    const token = new URL(request.url || '/', 'http://localhost').searchParams.get('token');
    if (!token) { rejectSocket(socket, 'NO_TOKEN', 'Missing access token', 4003); return; }
    void verifyAccess(token).then(identity => {
      if (socket.readyState !== 1) return;
      session.identity = identity;
      session.authKey = `${identity.roomId}:${identity.id}`;
      const previous = authenticated.get(session.authKey);
      if (previous?.socket && previous.socket !== socket) {
        try { previous.socket.close(4001, 'Replaced by reconnect'); } catch { /* stale socket */ }
      }
      authenticated.set(session.authKey, session);
      const savedRate = identityRates.get(session.authKey) || { lastUsedAt: Date.now() };
      savedRate.lastUsedAt = Date.now();
      identityRates.set(session.authKey, savedRate);
      session.rate = savedRate;
      authorized = true;
      for (const raw of buffered.splice(0)) handle(session, raw);
    }).catch(error => {
      console.warn(JSON.stringify({
        event: 'auth_rejected',
        code: String(error?.code || error?.name || 'INVALID_TOKEN').slice(0, 80),
        reason: String(error?.message || 'Access token verification failed').slice(0, 180),
      }));
      rejectSocket(socket, 'INVALID_TOKEN', 'Access token verification failed', 4003);
    });
  }

  function update() {
    const now = Date.now();
    for (const room of rooms.values()) {
      try { tick(room.facade, 1 / config.tickHz); }
      catch (error) { console.error('[dawn-duel] room tick failed', room.id, error); }
      const emptyFor = room.emptyAt ? now - room.emptyAt : 0;
      if (room.ended && !outbox.hasRoom(room.id) && emptyFor >= FINISHED_ROOM_TTL_MS) rooms.delete(room.id);
      else if (!room.ended && room.emptyAt && emptyFor >= EMPTY_ROOM_TTL_MS) rooms.delete(room.id);
    }
    outbox.pump(now);
    for (const socket of sockets.clients) {
      if (now - (socket._dawnLastSeen || now) > SOCKET_IDLE_MS) socket.terminate();
    }
    for (const [key, rate] of identityRates) {
      if (!authenticated.has(key) && now - (rate.lastUsedAt || 0) > EMPTY_ROOM_TTL_MS) identityRates.delete(key);
    }
  }

  sockets.on('connection', attach);
  const timer = setInterval(update, 1000 / config.tickHz);
  timer.unref?.();

  return {
    rooms,
    listen(callback) { http.listen(options.port, callback); },
    async close() {
      clearInterval(timer);
      for (const socket of sockets.clients) socket.close(1001, 'Server shutting down');
      await outbox.flush();
      await new Promise(resolve => sockets.close(resolve));
      await new Promise(resolve => http.close(resolve));
    },
  };
}
