import { derivedStats } from '../../server/progression.js';
import { HEROES } from '../../server/heroes.js';
import { MINIONS, PLAYER, STRUCTURES } from '../../server/config.js';
import { passiveDetail, skillLiveDetail, skillVerb } from './combat-copy.js';
import { activeBossPowers, bossDetail, bossName } from './boss-copy.js';
import { setClass, setText } from './hudDom.js';
import { predictionSpeed } from '../game/motion.js';

const $ = id => document.getElementById(id);
export class CombatReadability {
  constructor() {
    this.open = false;
    this.buffNodes = ['aegis', 'tempo'].map(power => {
      const node = document.createElement('button'); node.type = 'button'; node.className = `power-chip power-chip--${power}`;
      node.addEventListener('click', () => this.toggle(true)); $('boss-power-status').append(node); return node;
    });
    $('combat-info').addEventListener('click', () => this.toggle(!this.open));
    $('combat-info-close').addEventListener('click', () => this.toggle(false));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') this.toggle(false); });
  }
  toggle(open) {
    this.open = open;
    setClass($('combat-inspect'), 'is-hidden', !open);
    $('combat-info').setAttribute('aria-expanded', String(open));
  }
  reset() { this.toggle(false); }
  update(player, now, language, labels) {
    if (!HEROES[player.hero]) return;
    const mn = language === 'mn';
    $('combat-info').setAttribute('aria-label', mn ? 'Skill, хүч ба үзүүлэлт харах' : 'Inspect skills, powers and stats');
    $('combat-info-close').setAttribute('aria-label', mn ? 'Хаах' : 'Close');
    const powers = activeBossPowers(player, now, language);
    setClass($('boss-power-status'), 'is-hidden', !powers.length);
    this.buffNodes.forEach((node, index) => {
      const power = powers.find(item => item.power === (index ? 'tempo' : 'aegis'));
      setClass(node, 'is-hidden', !power);
      if (power) {
        setText(node, `${power.name} · ${power.remaining}s · ${power.readiness}`);
        node.title = power.detail; node.setAttribute('aria-label', `${node.textContent}. ${power.detail}`);
      }
    });
    if (!this.open) return;
    const stats = derivedStats(player, now), round = value => Math.round(value * 10) / 10;
    setText($('combat-inspect-title'), `${labels.heroes[player.hero][0]} · ${mn ? 'Тоглолт үргэлжилнэ' : 'Match stays live'}`);
    setText($('combat-stats'), `${mn ? 'Цохилт' : 'Attack'} ${round(stats.basicDamage)} · HP ${stats.maxHp} · ${mn ? 'Хөдөлгөөний хурд' : 'Move speed'} ${round(predictionSpeed(player, now))} · Skill ×${stats.skillDamage.toFixed(2)}`);
    setText($('combat-defense'), `${mn ? 'Хуяг / сахиус' : 'Basic / skill reduction'} ${round(stats.basicReduction * 100)}% / ${round(stats.skillReduction * 100)}%`);
    setText($('combat-ranges'), `${mn ? 'Цохилтын зай' : 'Attack ranges'}: ${mn ? 'баатар' : 'hero'} ${PLAYER.attackRange} · tower ${STRUCTURES.tower.range} · core ${STRUCTURES.core.range} · ${mn ? 'цэрэг' : 'minions'} ${MINIONS.melee.range}/${MINIONS.ranged.range}/${MINIONS.siege.range}. ${mn ? 'Цамхагийг зөвхөн хүрээн дотроос нь цохино.' : 'Structures can only be hit from inside their threat ring.'}`);
    for (let index = 0; index < 2; index++) {
      setText($(`combat-skill-${index}`), `${index ? 'E' : 'Q'} · ${skillVerb(HEROES[player.hero].skills[index].id, language)} — ${skillLiveDetail(player, index, stats, language)}`);
    }
    setText($('combat-passive'), passiveDetail(player.hero, language));
    setText($('combat-powers'), ['aegis', 'tempo'].map(power => `${bossName(power, language)}: ${bossDetail(power, language)}`).join('\n'));
    setText($('combat-power-rule'), mn ? '30s үргэлжилнэ. Дахин авбал хугацаа л шинэчлэгдэнэ; үхвэл арилна. Хоёр боссыг унагавал нэмэлт relic сонгоно.'
      : 'Lasts 30s. Repeated kills refresh duration only; death removes powers. Defeat both bosses on one half for an extra relic choice.');
  }
}
