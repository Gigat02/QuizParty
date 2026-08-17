import { initRouter, route } from './core/router.js';
import { renderHomeScreen } from './screens/homeScreen.js';
import { renderModeSelectScreen } from './screens/modeSelectScreen.js';
import { renderCreateLobbyScreen } from './screens/createLobbyScreen.js';
import { renderJoinLobbyScreen } from './screens/joinLobbyScreen.js';
import { renderLobbyScreen } from './screens/lobbyScreen.js';
import { renderGameScreen } from './screens/gameScreen.js';
import './games/classifico/index.js'; // auto-registrazione nel registry minigiochi

route('#home', renderHomeScreen);
route('#mode', renderModeSelectScreen);
route('#create', renderCreateLobbyScreen);
route('#join', renderJoinLobbyScreen);
route('#lobby', renderLobbyScreen);
route('#game', renderGameScreen);

initRouter(document.getElementById('app'));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((err) => {
      console.warn('Registrazione service worker fallita', err);
    });
  });
}
