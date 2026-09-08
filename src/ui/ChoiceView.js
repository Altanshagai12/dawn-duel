import { UPGRADES } from '../../server/config.js';

const $ = selector => document.querySelector(selector);

export class ChoiceView {
  constructor(command) { this.command = command; }
  update(player, now, labels, language) {
    $('#upgrade').classList.toggle('is-hidden', !player.offer);
    if (player.offer) {
      $('#upgrade-time').textContent = Math.max(0, Math.ceil(player.offerExpiresAt - now));
      this.options('#upgrade-options', player.offer, labels.upgrades, 'upgrade', language, player.ranks);
      const reroll = $('#reroll');
      reroll.classList.toggle('is-hidden', player.hero !== 'shana');
      reroll.disabled = Boolean(player.offerRerolled);
    }
    $('#relic').classList.toggle('is-hidden', !player.relicOffer);
    if (player.relicOffer) {
      $('#relic-time').textContent = Math.max(0, Math.ceil(player.relicOffer.expiresAt - now));
      this.options('#relic-options', player.relicOffer.ids, labels.relics, 'relic', language);
    }
    const ranks = Object.entries(player.ranks || {}).filter(([, rank]) => rank > 0);
    $('#build-summary').textContent = ranks.map(([id, rank]) => `${labels.upgrades[id][0]} ${rank}`).join(' · ');
    $('#build-summary').title = ranks.map(([id, rank]) => `${labels.upgrades[id][0]} ×${rank}: ${labels.upgrades[id][1]}`).join('\n');
    const relicSeconds = Math.max(0, Math.ceil((player.relicUntil || 0) - now));
    $('#relic-status').textContent = player.relic && relicSeconds ? `${labels.relics[player.relic][0]} · ${relicSeconds}s` : '';
  }

  options(selector, ids, labels, command, language, ranks = {}) {
    const root = $(selector);
    const key = `${language}:${ids.join(',')}:${ids.map(id => ranks[id] || 0).join(',')}`;
    if (root.dataset.ids === key) return;
    root.dataset.ids = key;
    root.replaceChildren(...ids.map(id => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'option';
      const rank = UPGRADES[id] ? ` ${(ranks[id] || 0) + 1}/${UPGRADES[id].maxRank}` : '';
      const strong = document.createElement('strong');
      strong.textContent = `${labels[id][0]}${rank}`;
      const small = document.createElement('small'); small.textContent = labels[id][1];
      button.append(strong, small);
      button.addEventListener('click', () => this.command(command, { id }));
      return button;
    }));
  }
}
