import { copy } from './i18n.js';
import { xpProgress } from '../../server/progression.js';
import { HEROES } from '../../server/heroes.js';

const $ = selector => document.querySelector(selector);
const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const pct = value => `${Math.round(clamp01(value) * 100)}%`;

export class UIController {
  constructor(language = 'mn') {
    this.language = language;
    this.lastWave = 0;
    this.lastDawnfall = false;
    this.toastTimer = 0;
    this.callbacks = {};
    $('#language').addEventListener('click', () => this.setLanguage(this.language === 'mn' ? 'en' : 'mn'));
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

  ready(mode) {
    $('#boot-screen').classList.remove('screen--active');
    $('#hero-screen').classList.add('screen--active');
    this.setNetwork(mode, mode === 'network' ? 'ready' : 'solo');
  }

  selectHero(hero) {
    this.currentHero = hero;
    document.querySelectorAll('.hero-card').forEach(card => card.classList.toggle('is-selected', card.dataset.hero === hero));
    $('#select-status').textContent = this.t().selected;
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
    const node = $('#network');
    node.className = `network ${state === 'ready' ? 'online' : state === 'poor' ? 'poor' : ''}`;
    node.querySelector('span').textContent = mode === 'network'
      ? (state === 'ready' ? this.t().live : this.t().reconnecting) : this.t().solo;
  }

  update(snapshot) {
    if (!snapshot?.players) return;
    const you = snapshot.players[snapshot.you];
    const rival = Object.values(snapshot.players).find(player => player.id !== snapshot.you);
    if (!you) return;
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
    $('#controls').classList.toggle('is-choice-open', Boolean(player.offer || player.relicOffer));
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
      button.innerHTML = `<strong>${labels[id][0]}</strong><span>${labels[id][1]}</span>`;
      button.addEventListener('click', () => callback(id));
      return button;
    }));
  }

  updateAnnouncement(snapshot, player) {
    let text = '';
    if (snapshot.match.paused) text = this.t().paused;
    else if (snapshot.match.phase === 'countdown') text = `${this.t().countdown} ${Math.ceil(snapshot.match.countdown)}`;
    else if (player.spiritUntil > snapshot.now) text = `${this.t().spirit} ${Math.ceil(player.spiritUntil - snapshot.now)}`;
    else if (snapshot.match.dawnfall && !this.lastDawnfall) text = this.t().dawnfall;
    else if (snapshot.match.wave > this.lastWave) text = `${this.t().wave} ${snapshot.match.wave}`;
    this.lastWave = snapshot.match.wave;
    this.lastDawnfall = snapshot.match.dawnfall;
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
    const ctx = canvas.getContext('2d');
    const sx = canvas.width / snapshot.map.width;
    const sy = canvas.height / snapshot.map.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0b1b1b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#19312a'; ctx.fillRect(0, snapshot.map.laneTop * sy, canvas.width, (snapshot.map.laneBottom - snapshot.map.laneTop) * sy);
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
