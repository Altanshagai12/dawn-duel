import { copy } from './i18n.js';
import { xpProgress } from '../../server/progression.js';
import { HEROES } from '../../server/heroes.js';
import { prepareCanvas } from '../game/display.js';

const $ = selector => document.querySelector(selector);
const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const pct = value => `${Math.round(clamp01(value) * 100)}%`;

export class UIController {
  constructor(language = 'mn') {
    this.language = language;
    this.mode = 'solo';
    this.networkState = 'ready';
    this.lastDraft = null;
    this.lastWave = 0;
    this.lastDawnfall = false;
    this.lastBossPowerUntil = 0;
    this.toastTimer = 0;
    this.callbacks = {};
    $('#language').addEventListener('click', () => this.setLanguage(this.language === 'mn' ? 'en' : 'mn'));
    $('#draft-retry').addEventListener('click', () => this.callbacks.retry?.());
    $('#draft-action').addEventListener('click', () => this.handleLobbyAction());
    $('#reroll').addEventListener('click', () => this.callbacks.command?.('reroll'));
    $('#practice-again').addEventListener('click', () => location.reload());
    this.renderHeroes();
    this.applyLanguage();
  }

  on(name, callback) { this.callbacks[name] = callback; }
  t() { return copy[this.language]; }

  setLanguage(language) {
    this.language = language;
    document.documentElement.lang = language;
    this.renderHeroes();
    this.applyLanguage();
    this.callbacks.language?.(language);
  }

  applyLanguage() {
    const t = this.t();
    $('#boot-copy').textContent = t.boot;
    $('#orientation-screen strong').textContent = t.rotateTitle;
    $('#orientation-screen span').textContent = t.rotateCopy;
    $('#hero-title').textContent = t.choose;
    $('#select-status').textContent = t.waiting;
    $('#blue-label').textContent = t.you;
    $('#red-label').textContent = t.rival;
    $('#upgrade-title').firstChild.textContent = `${t.upgrade} `;
    $('#relic-title').textContent = t.relic;
    $('#reroll').textContent = t.reroll;
    $('#practice-again').textContent = t.again;
    $('#result-hint').textContent = t.hint;
    $('#language').textContent = this.language === 'mn' ? 'EN' : 'MN';
    $('#draft-auto').textContent = t.lobbyRule;
    $('#draft-retry').textContent = t.retry;
    this.updateDraft(this.lastDraft);
  }

  renderHeroes() {
    const grid = $('#hero-grid');
    grid.replaceChildren();
    for (const id of ['shana', 'diamond', 'scarlett', 'hina']) {
      const [name, description, passive] = this.t().heroes[id];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'hero-card';
      button.dataset.hero = id;
      button.innerHTML = `<img src="./assets/portraits/${id}.webp" alt=""><div><strong>${name}</strong><span>${description}</span><small>${passive}</small></div>`;
      button.addEventListener('click', () => this.callbacks.hero?.(id));
      grid.append(button);
    }
  }

  ready(mode, state = mode === 'network' ? this.networkState : 'solo') {
    $('#boot-screen').classList.remove('screen--active');
    $('#hero-screen').classList.add('screen--active');
    this.setNetwork(mode, state);
  }

  selectHero(hero) {
    this.currentHero = hero;
    document.querySelectorAll('.hero-card').forEach(card => card.classList.toggle('is-selected', card.dataset.hero === hero));
    this.updateDraft(this.lastDraft);
    const names = this.t().skills[hero];
    $('#skill-1-name').textContent = names[0];
    $('#skill-2-name').textContent = names[1];
  }

  showBattle() {
    $('#hero-screen').classList.remove('screen--active');
    $('#hud').classList.remove('is-hidden');
    $('#controls').classList.remove('is-hidden');
  }

  setNetwork(mode, state = 'ready') {
    this.mode = mode;
    this.networkState = state;
    const node = $('#network');
    node.className = `network ${state === 'ready' ? 'online' : state === 'poor' ? 'poor' : ''}`;
    node.querySelector('span').textContent = mode === 'network'
      ? (state === 'ready' ? this.t().live : this.t().reconnecting) : this.t().solo;
    $('#draft-retry').classList.toggle('is-hidden', mode !== 'network' || state !== 'poor');
    this.updateDraft(this.lastDraft);
  }

  handleLobbyAction() {
    const you = this.lastDraft?.players?.[this.lastDraft?.you];
    if (!you || this.mode !== 'network') return;
    if (you.host) this.callbacks.lobby?.('start_match', {});
    else this.callbacks.lobby?.('ready', { ready: !you.ready });
  }

  updateDraft(snapshot) {
    if (snapshot) this.lastDraft = snapshot;
    const t = this.t();
    const players = Object.values(this.lastDraft?.players || {});
    const you = this.lastDraft?.players?.[this.lastDraft?.you];
    const rival = players.find(player => player.id !== this.lastDraft?.you);
    const rivalPresent = Boolean(rival && rival.connected !== false);
    const selected = Boolean(you?.selected || you?.hero);
    const connection = $('#draft-connection');
    const connected = this.mode !== 'network' || this.networkState === 'ready';
    connection.className = `draft-connection ${connected ? 'online' : 'poor'}`;
    connection.querySelector('b').textContent = this.mode === 'network'
      ? (connected ? t.roomConnected : t.roomConnecting) : t.solo;
    const playerState = player => player?.ready ? t.ready : player?.selected || player?.hero ? t.picked : t.pick;
    const rivalState = rivalPresent ? playerState(rival) : t.notJoined;
    $('#draft-roster').textContent = this.mode === 'network'
      ? `${t.you}${you?.host ? ` · ${t.host}` : ''} · ${playerState(you)}   VS   ${t.rival}${rival?.host ? ` · ${t.host}` : ''} · ${rivalState}`
      : `${t.you} · ${selected ? t.ready : t.pick}   VS   BOT · ${t.ready}`;
    let status = t.waiting;
    if (this.mode !== 'network') status = selected ? t.practiceStart : t.practicePick;
    else if (!connected) status = t.roomConnecting;
    else if (!rival) status = selected ? t.inviteWait : (this.currentHero ? t.locking : t.waiting);
    else if (!rivalPresent) status = t.rivalReconnect;
    else if (!selected) status = this.currentHero ? t.locking : t.rivalJoined;
    else if (you?.host) status = rival.ready ? t.hostStartPrompt : t.hostWait;
    else status = you?.ready ? t.guestWait : t.guestReadyPrompt;
    $('#select-status').textContent = status;

    const action = $('#draft-action');
    const networkLobby = this.mode === 'network';
    action.classList.toggle('is-hidden', !networkLobby);
    action.classList.toggle('is-ready', Boolean(!you?.host && you?.ready));
    if (you?.host) {
      action.textContent = t.hostStart;
      action.disabled = !connected || !selected || !rivalPresent || !rival?.ready;
    } else {
      action.textContent = you?.ready ? t.cancelReady : t.readyUp;
      action.disabled = !connected || !selected || !rivalPresent;
    }
  }

  update(snapshot) {
    if (!snapshot?.players) return;
    const you = snapshot.players[snapshot.you];
    const rival = Object.values(snapshot.players).find(player => player.id !== snapshot.you);
    if (!you) return;
    this.updateDraft(snapshot);
    if (you.hero && you.hero !== this.currentHero) this.selectHero(you.hero);
    if (snapshot.match.phase !== 'select') this.showBattle();
    const seconds = Math.floor(snapshot.match.matchTime || 0);
    $('#clock').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    $('#wave').textContent = `${this.t().wave} ${snapshot.match.wave}`;
    $('#blue-level').textContent = `LV ${snapshot.team === 0 ? you.level : rival?.level || 1}`;
    $('#red-level').textContent = `LV ${snapshot.team === 1 ? you.level : rival?.level || 1}`;
    const blueCore = snapshot.structures.blueCore;
    const redCore = snapshot.structures.redCore;
    $('#blue-core').style.width = pct(blueCore.hp / blueCore.maxHp);
    $('#red-core').style.width = pct(redCore.hp / redCore.maxHp);
    $('#hero-name').textContent = this.t().heroes[you.hero]?.[0]?.toUpperCase() || 'HERO';
    $('#hp-copy').textContent = `${Math.ceil(you.hp)} / ${Math.ceil(you.maxHp)}`;
    $('#hp-bar').style.width = pct(you.hp / you.maxHp);
    $('#shield-bar').style.width = pct((you.shield || 0) / you.maxHp);
    $('#shield-bar').style.left = '0';
    $('#xp-bar').style.width = pct(xpProgress(you).ratio);
    const bossPowerRemaining = Math.max(0, Math.ceil((you.bossPowerUntil || 0) - snapshot.now));
    const bossPowerStatus = $('#boss-power-status');
    bossPowerStatus.textContent = `${this.t().bossPower} · ${bossPowerRemaining}s`;
    bossPowerStatus.classList.toggle('is-hidden', bossPowerRemaining <= 0);
    this.updateChoices(you, snapshot.now);
    this.updateCooldowns(you, snapshot.now);
    this.drawMinimap(snapshot);
    this.updateAnnouncement(snapshot, you);
    if (snapshot.match.phase === 'finished') this.showResult(snapshot, you);
  }

  updateChoices(player, now) {
    const upgrade = $('#upgrade');
    upgrade.classList.toggle('is-hidden', !player.offer);
    if (player.offer) {
      $('#upgrade-time').textContent = Math.max(0, Math.ceil(player.offerExpiresAt - now));
      this.renderOptions('#upgrade-options', player.offer, this.t().upgrades, id => this.callbacks.command?.('upgrade', { id }));
      $('#reroll').classList.toggle('is-hidden', player.hero !== 'shana');
    }
    const relic = $('#relic');
    relic.classList.toggle('is-hidden', !player.relicOffer);
    if (player.relicOffer) this.renderOptions('#relic-options', player.relicOffer.ids, this.t().relics, id => this.callbacks.command?.('relic', { id }));
  }

  updateCooldowns(player, now) {
    const hero = HEROES[player.hero];
    if (!hero) return;
    hero.skills.forEach((skill, index) => {
      const button = $(`#skill-${index + 1}`);
      const remaining = Math.max(0, (player.skillReady?.[index] || 0) - now);
      button.querySelector('i').style.transform = `scaleY(${Math.min(1, remaining / skill.cooldown)})`;
      button.querySelector('b').textContent = remaining > 0 ? Math.ceil(remaining) : (index ? 'E' : 'Q');
    });
  }

  renderOptions(selector, ids, labels, callback) {
    const root = $(selector);
    if (root.dataset.ids === ids.join(',')) return;
    root.dataset.ids = ids.join(',');
    root.replaceChildren(...ids.map(id => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'option';
      button.innerHTML = `<i aria-hidden="true">${labels[id][0].slice(0, 1)}</i><span><strong>${labels[id][0]}</strong><small>${labels[id][1]}</small></span>`;
      button.addEventListener('click', () => callback(id));
      return button;
    }));
  }

  updateAnnouncement(snapshot, player) {
    let text = '';
    if (snapshot.match.paused) text = this.t().paused;
    else if (snapshot.match.phase === 'countdown') text = `${this.t().countdown} ${Math.ceil(snapshot.match.countdown)}`;
    else if (player.spiritUntil > snapshot.now) text = `${this.t().spirit} ${Math.ceil(player.spiritUntil - snapshot.now)}`;
    else if ((player.bossPowerUntil || 0) > snapshot.now && player.bossPowerUntil > this.lastBossPowerUntil) text = `${this.t().bossPower} · 30s`;
    else if (snapshot.match.dawnfall && !this.lastDawnfall) text = this.t().dawnfall;
    else if (snapshot.match.wave > this.lastWave) text = `${this.t().wave} ${snapshot.match.wave}`;
    this.lastWave = snapshot.match.wave;
    this.lastDawnfall = snapshot.match.dawnfall;
    this.lastBossPowerUntil = Math.max(this.lastBossPowerUntil, player.bossPowerUntil || 0);
    const node = $('#announcement');
    node.textContent = text;
    node.classList.toggle('on', Boolean(text));
    clearTimeout(this.announcementTimer);
    if (text && !snapshot.match.paused && snapshot.match.phase === 'playing' && player.spiritUntil <= snapshot.now) {
      this.announcementTimer = setTimeout(() => node.classList.remove('on'), 1400);
    }
  }

  drawMinimap(snapshot) {
    const canvas = $('#minimap');
    const { ctx, width, height } = prepareCanvas(canvas);
    const sx = width / snapshot.map.width;
    const sy = height / snapshot.map.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0b1b1b'; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#425c52';
    ctx.lineWidth = snapshot.map.laneWidth * Math.min(sx, sy);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(snapshot.map.blueCoreX * sx, snapshot.map.blueCoreY * sy);
    ctx.lineTo(snapshot.map.redCoreX * sx, snapshot.map.redCoreY * sy);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(245,198,106,.32)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(78,230,224,.16)';
    for (const source of snapshot.vision) ctx.beginPath(), ctx.arc(source.x * sx, source.y * sy, Math.max(2, source.radius * sx), 0, Math.PI * 2), ctx.fill();
    for (const structure of Object.values(snapshot.structures)) this.dot(ctx, structure, sx, sy, structure.team ? '#ff6b72' : '#4ee6e0', structure.kind === 'core' ? 5 : 3);
    for (const minion of snapshot.minions) this.dot(ctx, minion, sx, sy, minion.team ? '#ff858b' : '#75f3ed', 1.5);
    for (const player of Object.values(snapshot.players)) if (Number.isFinite(player.x)) this.dot(ctx, player, sx, sy, player.id === snapshot.you ? '#f5c66a' : '#ff6b72', 3);
  }

  dot(ctx, entity, sx, sy, color, radius) {
    ctx.beginPath(); ctx.arc(entity.x * sx, entity.y * sy, radius, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
  }

  showResult(snapshot, you) {
    const result = snapshot.match.winnerTeam === null ? 'draw' : snapshot.match.winnerTeam === you.team ? 'victory' : 'defeat';
    $('#result-title').textContent = this.t()[result];
    $('#result-stats').textContent = `${you.kills} KILLS · ${you.deaths} DEATHS · LV ${you.level}`;
    $('#result-screen').classList.add('screen--active');
    $('#controls').classList.add('is-hidden');
  }

  toast(message) {
    const node = $('#toast'); node.textContent = message; node.classList.add('on');
    clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => node.classList.remove('on'), 2400);
  }
}
