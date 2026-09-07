import { createGameBridge } from './game/GameScene.js';
import { InputController } from './game/InputController.js';
import { Feedback } from './game/Feedback.js';
import { DevSession } from './sessions/DevSession.js';
import { LocalSession } from './sessions/LocalSession.js';
import { PlatformSession, selectLaunchSession } from './sessions/PlatformSession.js';
import { UIController } from './ui/UIController.js';
import { languageFromPlatform } from './ui/i18n.js';

let session;
let unsubscribe;
let selectedHero = null;
let latestSnapshot = null;
let bridge = null;
const platform = new PlatformSession();
const ui = new UIController('mn');
const input = new InputController(data => session?.sendInput(data));
const feedback = new Feedback();

function attach(next) {
  unsubscribe?.();
  if (session && session !== next) session.stop();
  session = next;
  unsubscribe = session.onSnapshot(snapshot => {
    latestSnapshot = snapshot;
    bridge?.apply(snapshot);
    ui.update(snapshot);
    feedback.update(snapshot);
    input.setEnabled(snapshot.match.phase === 'playing' && !snapshot.match.paused);
  });
  if (selectedHero) session.command('select_hero', { hero: selectedHero });
}

function promoteToNetwork() {
  if (session === platform) return;
  attach(platform);
  ui.setNetwork('network', 'connecting');
}

function waitForSurface() {
  const mount = document.querySelector('#game');
  if (mount.clientWidth > 1 && mount.clientHeight > 1) return Promise.resolve();
  return new Promise(resolve => {
    const observer = new ResizeObserver(entries => {
      const box = entries[0]?.contentRect;
      if (box?.width > 1 && box?.height > 1) { observer.disconnect(); resolve(); }
    });
    observer.observe(mount);
  });
}

async function devLaunch(player) {
  const response = await fetch(`./__dev_access?player=${encodeURIComponent(player)}`);
  if (!response.ok) throw new Error('Local multiplayer runtime is unavailable');
  const dev = new DevSession(await response.json());
  dev.onStatus(status => ui.setNetwork('network', status));
  return { session: dev, multiplayer: true, config: {}, connection: dev.connection };
}

ui.on('hero', hero => {
  selectedHero = hero;
  ui.selectHero(hero);
  session?.command('select_hero', { hero });
});
ui.on('command', (type, data) => session?.command(type, data));
ui.on('lobby', (type, data) => session?.command(type, data));
ui.on('retry', () => {
  ui.setNetwork('network', 'connecting');
  void platform.retry().catch(error => {
    ui.setNetwork('network', 'poor');
    ui.toast(error?.message || 'Connection failed');
  });
});
platform.onStatus((status, error) => {
  ui.setNetwork('network', status === 'ready' ? 'ready' : status === 'error' || status === 'poor' ? 'poor' : 'connecting');
  if (status === 'error') ui.toast(error?.message || 'Multiplayer connection failed');
});
platform.onRoomAssigned(promoteToNetwork);

async function boot() {
  const devPlayer = new URLSearchParams(location.search).get('player');
  let launch;
  try {
    launch = devPlayer === 'blue' || devPlayer === 'red'
      ? await devLaunch(devPlayer)
      : await platform.initialize();
  } catch (error) {
    if (PlatformSession.embedded()) ui.toast(error?.message || 'Usion connection unavailable');
    launch = { multiplayer: false, config: {}, connection: Promise.resolve() };
  }

  ui.setLanguage(languageFromPlatform(launch.config));
  attach(selectLaunchSession(launch, platform, session, config => new LocalSession(config?.userName)));
  await waitForSurface();
  const gameBridge = createGameBridge();
  bridge = gameBridge.bridge;
  bridge.aim = (x, y) => input.pointAim(x, y, latestSnapshot?.players?.[latestSnapshot.you]);
  bridge.attack = active => { input.state.attack = active; };
  bridge.input = () => input.state;
  await Promise.all([gameBridge.ready, launch.connection.catch(error => {
    ui.setNetwork('network', 'poor');
    ui.toast(error?.message || 'Connection failed');
  })]);
  if (latestSnapshot) bridge.apply(latestSnapshot);
  const mode = session?.mode === 'network' ? 'network' : 'solo';
  ui.ready(mode, mode === 'network' ? ui.networkState : 'solo');
  window.__DAWN_DUEL__ = { get session() { return session; }, ui, bridge, input };
}

boot().catch(error => {
  console.error('[dawn-duel]', { event: 'boot_failed', message: error?.message });
  document.querySelector('#boot-copy').textContent = 'Unable to start Dawn Duel';
});
