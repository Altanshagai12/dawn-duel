import { copy } from './i18n.js';
import { xpProgress } from '../../server/progression.js';
import { HEROES } from '../../server/heroes.js';
import { ChoiceView } from './ChoiceView.js';
import { drawMinimap } from './Minimap.js';
import { AnnouncementState, phaseVisibility, teamHud } from './presentation.js';

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
    this.choices = new ChoiceView((type, data) => this.callbacks.command?.(type, data));
    this.announcements = new AnnouncementState();
    $('#language').addEventListener('click', () => this.setLanguage(this.language === 'mn' ? 'en' : 'mn'));
    $('#draft-retry').addEventListener('click', () => this.callbacks.retry?.());
    $('#draft-action').addEventListener('click', () => this.handleLobbyAction());
    $('#reroll').addEventListener('click', () => this.callbacks.command?.('reroll'));
    $('#practice-again').addEventListener('click', () => this.callbacks.finish?.(this.mode));
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
    $('#hero-title').textContent = t.choose;
    $('#select-status').textContent = t.waiting;
    $('#blue-label').textContent = t.you;
    $('#red-label').textContent = t.rival;
    $('#upgrade-title').firstChild.textContent = `${t.upgrade} `;
    $('#relic-title').firstChild.textContent = `${t.relic} `;
    $('#reroll').textContent = t.reroll;
    $('#practice-again').textContent = t.again;
    $('#result-hint').textContent = t.hint;
    $('#language').textContent = this.language === 'mn' ? 'EN' : 'MN';
    $('#draft-auto').textContent = t.lobbyRule;
    $('#draft-retry').textContent = t.retry;
    $('#game-guide').textContent = t.guide;
    $('#move-copy').textContent = t.move;
    $('#fire-copy').textContent = t.fire;
    $('#skill-guide').textContent = t.skillGuide;
    if (this.currentHero) this.selectHero(this.currentHero);
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
      button.title = this.t().skillDetails[id].join('\n');
      button.innerHTML = `<img src="./assets/portraits/${id}.webp" alt=""><div><strong>${name}</strong><span>${description}</span><small>${passive}</small></div>`;
      button.addEventListener('click', () => this.callbacks.hero?.(id));
      grid.append(button);
    }
  }

  ready(mode, state = mode === 'network' ? this.networkState : 'solo') {
    $('#boot-screen').classList.remove('screen--active');
    this.setNetwork(mode, state);
    this.setPhase(this.lastDraft?.match?.phase || 'select');
  }

  selectHero(hero) {
    this.currentHero = hero;
    document.querySelectorAll('.hero-card').forEach(card => {
      card.classList.toggle('is-selected', card.dataset.hero === hero);
      card.setAttribute('aria-pressed', String(card.dataset.hero === hero));
    });
    this.updateDraft(this.lastDraft);
    const names = this.t().skills[hero];
    $('#skill-1-name').textContent = names[0];
    $('#skill-2-name').textContent = names[1];
    $('#hero-kit').textContent = this.t().skillDetails[hero].join('  •  ');
    this.t().skillDetails[hero].forEach((detail, index) => {
      const button = $(`#skill-${index + 1}`);
      button.title = detail;
      button.setAttribute('aria-label', detail);
    });
  }

  setPhase(phase) {
    const visible = phaseVisibility(phase);
    $('#hero-screen').classList.toggle('screen--active', visible.draft);
    $('#hud').classList.toggle('is-hidden', !visible.battle);
    $('#controls').classList.toggle('is-hidden', !visible.controls);
    $('#choice-stack').classList.toggle('is-hidden', !visible.choices);
    $('#result-screen').classList.toggle('screen--active', visible.result);
  }

  resetSession() {
    this.lastDraft = null;
    this.announcements.reset();
    this.setPhase('select');
    $('#upgrade').classList.add('is-hidden');
    $('#relic').classList.add('is-hidden');
    this.updateDraft(null);
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
    $('#draft-auto').textContent = this.mode === 'network' ? t.lobbyRule : t.practiceRule;
    $('#draft-roster').textContent = this.mode === 'network'
      ? `${you?.name || t.you}${you?.host ? ` · ${t.host}` : ''} · ${playerState(you)}   VS   ${rival?.name || t.rival}${rival?.host ? ` · ${t.host}` : ''} · ${rivalState}`
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
    const { you, rival, ownCore, rivalCore } = teamHud(snapshot);
    if (!you) return;
    this.updateDraft(snapshot);
    if (you.hero && you.hero !== this.currentHero) this.selectHero(you.hero);
    this.setPhase(snapshot.match.phase);
    const seconds = Math.floor(snapshot.match.matchTime || 0);
    $('#clock').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    $('#wave').textContent = `${this.t().wave} ${snapshot.match.wave}`;
    $('#blue-label').textContent = you.name || this.t().you;
    $('#red-label').textContent = rival?.name || this.t().rival;
    $('#blue-level').textContent = `LV ${you.level}`;
    $('#red-level').textContent = `LV ${rival?.level || 1}`;
    $('#blue-core').style.width = pct(ownCore.hp / ownCore.maxHp);
    $('#red-core').style.width = pct(rivalCore.hp / rivalCore.maxHp);
    $('#objective-status').textContent = `${this.t().nextWave} ${Math.max(0, Math.ceil(snapshot.match.nextWaveAt - snapshot.now))}s · ${this.t().bossPair} ${Math.max(...(you.guardianProgress || [0]))}/2`;
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
    this.choices.update(you, snapshot.now, this.t(), this.language);
    this.updateCooldowns(you, snapshot.now);
    drawMinimap($('#minimap'), snapshot);
    this.updateAnnouncement(snapshot, you);
    if (snapshot.match.phase === 'finished') this.showResult(snapshot, you);
  }

  updateCooldowns(player, now) {
    const hero = HEROES[player.hero];
    if (!hero) return;
    hero.skills.forEach((skill, index) => {
      const button = $(`#skill-${index + 1}`);
      const remaining = Math.max(0, (player.skillReady?.[index] || 0) - now);
      button.querySelector('i').style.transform = `scaleY(${Math.min(1, remaining / skill.cooldown)})`;
      button.querySelector('b').textContent = remaining > 0 ? Math.ceil(remaining) : (index ? 'E' : 'Q');
      button.disabled = remaining > 0 || player.spiritUntil > now || Boolean(this.lastDraft?.match?.paused);
      button.classList.toggle('on-cooldown', remaining > 0);
    });
  }

  updateAnnouncement(snapshot, player) {
    const text = this.announcements.update(snapshot, player, this.t());
    const node = $('#announcement');
    node.textContent = text;
    node.classList.toggle('on', Boolean(text));
  }

  showResult(snapshot, you) {
    const result = snapshot.match.winnerTeam === null ? 'draw' : snapshot.match.winnerTeam === you.team ? 'victory' : 'defeat';
    $('#result-title').textContent = this.t()[result];
    $('#result-stats').textContent = `${you.kills} KILLS · ${you.deaths} DEATHS · LV ${you.level}`;
    $('#practice-again').textContent = this.mode === 'network' ? this.t().exit : this.t().again;
    $('#result-hint').textContent = this.mode === 'network' ? this.t().networkResult : this.t().hint;
    $('#result-reason').textContent = this.t().finishReasons[snapshot.match.finishReason] || '';
    $('#result-screen').classList.add('screen--active');
    $('#controls').classList.add('is-hidden');
  }

  toast(message) {
    const node = $('#toast'); node.textContent = message; node.classList.add('on');
    clearTimeout(this.toastTimer); this.toastTimer = setTimeout(() => node.classList.remove('on'), 2400);
  }
}
