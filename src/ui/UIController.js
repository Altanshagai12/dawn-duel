import { copy } from './i18n.js';
import { xpProgress } from '../../server/progression.js';
import { HEROES } from '../../server/heroes.js';
import { ChoiceView } from './ChoiceView.js';
import { drawMinimap } from './Minimap.js';
import { AnnouncementState, phaseVisibility, teamHud } from './presentation.js';
import { setClass, setStyle, setText } from './hudDom.js';

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
    $('#farm-copy').textContent = t.farm;
    $('#structure-copy').textContent = t.structure;
    $('#priority-copy').textContent = t.target;
    for (const [id, hint] of [['aim-stick', t.attackHint], ['attack-farm', t.farmHint], ['attack-structure', t.structureHint], ['target-priority', t.priorityHint]]) {
      $(`#${id}`).title = hint; $(`#${id}`).setAttribute('aria-label', hint);
    }
    for (const option of $('#target-priority').options) option.textContent = t.priorities[option.value];
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
      button.title = `${detail}\n${this.t().skillGuide}`;
      button.setAttribute('aria-label', `${names[index]}. ${detail}. ${this.t().skillGuide}`);
      const cell = ['shana', 'diamond', 'scarlett', 'hina'].indexOf(hero) * 2 + index;
      button.style.setProperty('--skill-x', `${(cell % 4) * 100 / 3}%`);
      button.style.setProperty('--skill-y', cell >= 4 ? '100%' : '0%');
    });
  }

  setPhase(phase) {
    if (this.currentPhase === phase) return;
    this.currentPhase = phase;
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
    if (snapshot.match.phase === 'select') this.updateDraft(snapshot);
    else this.lastDraft = snapshot;
    if (you.hero && you.hero !== this.currentHero) this.selectHero(you.hero);
    this.setPhase(snapshot.match.phase);
    const seconds = Math.floor(snapshot.match.matchTime || 0);
    setText($('#clock'), `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`);
    setText($('#wave'), `${this.t().wave} ${snapshot.match.wave}`);
    setText($('#blue-label'), you.name || this.t().you);
    setText($('#red-label'), rival?.name || this.t().rival);
    setText($('#blue-level'), `LV ${you.level}`);
    setText($('#red-level'), `LV ${rival?.level || 1}`);
    setStyle($('#blue-core'), 'width', pct(ownCore.hp / ownCore.maxHp));
    setStyle($('#red-core'), 'width', pct(rivalCore.hp / rivalCore.maxHp));
    setText($('#objective-status'), `${this.t().nextWave} ${Math.max(0, Math.ceil(snapshot.match.nextWaveAt - snapshot.now))}s · ${this.t().bossPair} ${Math.max(...(you.guardianProgress || [0]))}/2`);
    setText($('#hero-name'), this.t().heroes[you.hero]?.[0]?.toUpperCase() || 'HERO');
    setText($('#hp-copy'), `${Math.ceil(you.hp)} / ${Math.ceil(you.maxHp)}`);
    setStyle($('#hp-bar'), 'width', pct(you.hp / you.maxHp));
    setStyle($('#shield-bar'), 'width', pct((you.shield || 0) / you.maxHp));
    setStyle($('#shield-bar'), 'left', '0px');
    setStyle($('#xp-bar'), 'width', pct(xpProgress(you).ratio));
    const bossPowerRemaining = Math.max(0, Math.ceil((you.bossPowerUntil || 0) - snapshot.now));
    const bossPowerStatus = $('#boss-power-status');
    setText(bossPowerStatus, `${this.t().bossPower} · ${bossPowerRemaining}s`);
    setClass(bossPowerStatus, 'is-hidden', bossPowerRemaining <= 0);
    this.choices.update(you, snapshot.now, this.t(), this.language);
    this.updateCooldowns(you, snapshot.now);
    drawMinimap($('#minimap'), snapshot);
    this.updateAnnouncement(snapshot, you);
    if (snapshot.match.phase === 'finished') this.showResult(snapshot, you);
  }

  updateCooldowns(player, now) {
    const hero = HEROES[player.hero];
    if (!hero) return;
    const combatDisabled = player.spiritUntil > now || Boolean(this.lastDraft?.match?.paused);
    for (const id of ['aim-stick', 'attack-farm', 'attack-structure']) {
      const button = $(`#${id}`); if (button.disabled !== combatDisabled) button.disabled = combatDisabled;
    }
    hero.skills.forEach((skill, index) => {
      const button = $(`#skill-${index + 1}`);
      const remaining = Math.max(0, (player.skillReady?.[index] || 0) - now);
      setStyle(button.querySelector('i'), 'transform', `scaleY(${Math.min(1, remaining / skill.cooldown)})`);
      setText(button.querySelector('b'), remaining > 0 ? String(Math.ceil(remaining)) : (index ? 'E' : 'Q'));
      const disabled = remaining > 0 || combatDisabled;
      if (button.disabled !== disabled) button.disabled = disabled;
      setClass(button, 'on-cooldown', remaining > 0);
    });
  }

  updateAnnouncement(snapshot, player) {
    const text = this.announcements.update(snapshot, player, this.t());
    const node = $('#announcement');
    setText(node, text);
    setClass(node, 'on', Boolean(text));
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
