import { UPGRADES } from '../../server/config.js';
import { choiceCopy, receiptText } from './choiceFeedback.js';
import { setClass, setText } from './hudDom.js';

const $ = selector => document.querySelector(selector);
let requestNumber = 0;
const newRequestId = () => globalThis.crypto?.randomUUID?.() || `choice:${Date.now()}:${++requestNumber}`;

export class ChoiceView {
  constructor(command) {
    this.command = command; this.pending = new Map(); this.requests = new Map(); this.confirmed = new Set(); this.generation = 0;
    this.feedback = document.createElement('p'); this.feedback.id = 'choice-feedback';
    this.feedback.className = 'choice-feedback is-hidden'; this.feedback.setAttribute('role', 'status');
    this.feedback.setAttribute('aria-live', 'polite'); $('#hud').append(this.feedback);
  }
  reset() {
    this.generation += 1; this.pending.clear(); this.requests.clear(); this.confirmed.clear(); this.player = null;
    clearTimeout(this.feedbackTimer); this.feedback.classList.add('is-hidden');
  }
  update(player, now, labels, language) {
    this.player = player; this.labels = labels; this.language = language;
    const issued = new Set(this.requests.values());
    for (const receipt of player.choiceReceipts || []) {
      if (issued.has(receipt.requestId) && receipt.status === 'applied') this.confirm(receipt);
    }
    setClass($('#upgrade'), 'is-hidden', !player.offer);
    if (player.offer) {
      setText($('#upgrade-time'), String(Math.max(0, Math.ceil(player.offerExpiresAt - now))));
      this.options('#upgrade-options', player.offer, labels.upgrades, 'upgrade', player.offerId, player.ranks);
      setClass($('#reroll'), 'is-hidden', player.hero !== 'shana');
    }
    setClass($('#relic'), 'is-hidden', !player.relicOffer);
    if (player.relicOffer) {
      setText($('#relic-time'), String(Math.max(0, Math.ceil(player.relicOffer.expiresAt - now))));
      this.options('#relic-options', player.relicOffer.ids, labels.relics, 'relic', player.relicOffer.id);
    }
    this.renderPending();
    const ranks = Object.entries(player.ranks || {}).filter(([, rank]) => rank > 0);
    setText($('#build-summary'), ranks.map(([id, rank]) => `${labels.upgrades[id][0]} ${rank}`).join(' · '));
    $('#build-summary').title = ranks.map(([id, rank]) => `${labels.upgrades[id][0]} ×${rank}: ${labels.upgrades[id][1]}`).join('\n');
    const seconds = Math.max(0, Math.ceil((player.relicUntil || 0) - now));
    setText($('#relic-status'), player.relic && seconds ? `${labels.relics[player.relic][0]} · ${seconds}s` : '');
  }
  reroll() { return this.choose('reroll', null, this.player?.offerId); }
  choose(type, id, offerId) {
    const current = type === 'relic' ? this.player?.relicOffer?.id : this.player?.offerId;
    if (!offerId || current !== offerId || this.pending.has(offerId)) return;
    const key = `${type}:${offerId}:${id || ''}`;
    if (!this.requests.has(key)) this.requests.set(key, newRequestId());
    const data = { id, offerId, requestId: this.requests.get(key) };
    this.pending.set(offerId, { type, id }); this.renderPending();
    this.show(choiceCopy(this.language).pending, 'pending', 0);
    const generation = this.generation;
    let result;
    try { result = this.command(type, data); } catch (error) { result = Promise.reject(error); }
    return Promise.resolve(result).then(receipt => {
      if (generation !== this.generation) return;
      if (!receipt || receipt.status !== 'applied') throw Object.assign(new Error('Not confirmed'), { code: 'CHOICE_TIMEOUT' });
      this.confirm(receipt);
    }).catch(error => {
      if (generation !== this.generation || error?.code === 'CANCELLED') return;
      const copy = choiceCopy(this.language);
      this.show(copy.errors[error?.code] || copy.errors.INVALID_CHOICE, 'error');
    }).finally(() => {
      if (generation !== this.generation) return;
      this.pending.delete(offerId); this.renderPending();
    });
  }
  confirm(receipt) {
    if (this.confirmed.has(receipt.requestId)) return;
    this.confirmed.add(receipt.requestId);
    this.show(receiptText(receipt, this.labels, this.language), 'success');
  }
  show(text, state, duration = 4500) {
    clearTimeout(this.feedbackTimer); setText(this.feedback, text);
    this.feedback.dataset.state = state; this.feedback.classList.remove('is-hidden');
    if (duration) this.feedbackTimer = setTimeout(() => this.feedback.classList.add('is-hidden'), duration);
  }
  renderPending() {
    if (!this.player) return;
    for (const [type, offerId] of [['upgrade', this.player.offerId], ['relic', this.player.relicOffer?.id]]) {
      const pending = this.pending.get(offerId);
      $(`#${type}`).setAttribute('aria-busy', String(Boolean(pending)));
      for (const button of $(`#${type}-options`).children) {
        button.disabled = Boolean(pending);
        setClass(button, 'is-pending', Boolean(pending && pending.id === button.dataset.choiceId));
        const label = pending?.id === button.dataset.choiceId ? choiceCopy(this.language).pending : button.dataset.description;
        setText(button.querySelector('small'), label);
      }
    }
    $('#reroll').disabled = Boolean(this.player.offerRerolled || this.pending.has(this.player.offerId));
  }
  options(selector, ids, labels, type, offerId, ranks = {}) {
    const root = $(selector);
    const key = `${this.language}:${offerId}:${ids.join(',')}:${ids.map(id => ranks[id] || 0).join(',')}`;
    if (root.dataset.ids === key) return;
    root.dataset.ids = key;
    root.replaceChildren(...ids.map(id => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'option'; button.dataset.choiceId = id;
      button.dataset.description = labels[id][1];
      const rank = UPGRADES[id] ? ` ${(ranks[id] || 0) + 1}/${UPGRADES[id].maxRank}` : '';
      const strong = document.createElement('strong'); strong.textContent = `${labels[id][0]}${rank}`;
      const small = document.createElement('small'); small.textContent = labels[id][1];
      button.append(strong, small);
      button.addEventListener('click', () => { if (!button.disabled) void this.choose(type, id, offerId); });
      return button;
    }));
  }
}
