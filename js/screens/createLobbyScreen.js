import { h, mount } from '../core/dom.js';
import { navigate } from '../core/router.js';
import { getNickname, setSession } from '../core/state.js';
import { ensureAuth } from '../core/auth.js';
import { createLobby } from '../transport/firestoreSignaling.js';
import { colorForIndex } from '../core/colors.js';

export function renderCreateLobbyScreen(root, params) {
  const mode = params.get('mode') === 'offline' ? 'offline' : 'online';
  const nickname = getNickname();

  if (!nickname) {
    navigate('#home');
    return;
  }

  const statusEl = h('p', { class: 'text-muted text-center' }, 'Creazione della lobby in corso...');
  const screen = h('div', { class: 'screen' }, [
    h('div', { class: 'stack text-center' }, [h('h2', {}, 'Un attimo...'), statusEl]),
  ]);
  mount(root, screen);

  (async () => {
    try {
      const playerId = await ensureAuth();
      const color = colorForIndex(0);
      const code = await createLobby({ hostId: playerId, nickname, color, mode });
      setSession({ lobbyCode: code, playerId, isHost: true, mode });
      navigate('#lobby');
    } catch (err) {
      console.error('Errore creazione lobby', err);
      statusEl.textContent = `Non è stato possibile creare la lobby: ${err.message || err}`;
      screen.appendChild(
        h('button', { class: 'btn btn-secondary', onclick: () => navigate('#home') }, 'Torna alla home')
      );
    }
  })();
}
