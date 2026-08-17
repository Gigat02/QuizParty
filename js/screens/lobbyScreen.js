import { h, mount, clear } from '../core/dom.js';
import { navigate } from '../core/router.js';
import { getSession, clearSession } from '../core/state.js';
import { subscribeLobby, setLobbyStatus } from '../transport/firestoreSignaling.js';
import { getOrCreateTransport, resetTransport } from '../transport/activeTransport.js';
import { renderPlayerChip } from '../ui/playerChip.js';
import { renderScoreboard } from '../ui/scoreboardPanel.js';

export function renderLobbyScreen(root) {
  const session = getSession();
  if (!session) {
    navigate('#home');
    return () => {};
  }

  let activeTab = 'players';
  let players = [];
  let started = false;

  const playersListEl = h('ul', { class: 'lobby-players' });
  const scoreboardEl = h('div', {});
  const tabPlayersBtn = h('button', { class: 'is-active', onclick: () => setTab('players') }, 'Giocatori');
  const tabScoresBtn = h('button', { onclick: () => setTab('scores') }, 'Punteggi');
  const panels = h('div', {}, [playersListEl, scoreboardEl]);

  const startBtn = h(
    'button',
    {
      class: 'btn btn-primary',
      onclick: async () => {
        if (started) return;
        started = true;
        startBtn.disabled = true;
        startBtn.textContent = 'Avvio...';
        await setLobbyStatus(session.lobbyCode, 'playing');
        // L'host naviga subito: il redirect automatico su subscribeLobby
        // qui sotto è guardato da `!started` (serve solo agli ospiti) e
        // quindi non scatterebbe mai per l'host stesso.
        navigate('#game');
      },
    },
    'Avvia partita'
  );

  function setTab(tab) {
    activeTab = tab;
    tabPlayersBtn.classList.toggle('is-active', tab === 'players');
    tabScoresBtn.classList.toggle('is-active', tab === 'scores');
    playersListEl.style.display = tab === 'players' ? '' : 'none';
    scoreboardEl.style.display = tab === 'scores' ? '' : 'none';
  }

  function renderPlayers() {
    clear(playersListEl);
    if (players.length === 0) {
      playersListEl.appendChild(h('p', { class: 'text-muted text-center' }, 'In attesa di giocatori...'));
    } else {
      players.forEach((p) => playersListEl.appendChild(renderPlayerChip(p, { showP2p: session.mode === 'offline' })));
    }
    renderScoreboard(scoreboardEl, players, {});

    if (session.isHost) {
      const enoughPlayers = players.length >= 2;
      const p2pReady = session.mode !== 'offline' || transport?.allGuestsReady?.();
      startBtn.disabled = started || !enoughPlayers || !p2pReady;
      startBtn.textContent = started
        ? 'Avvio...'
        : !enoughPlayers
        ? 'Servono almeno 2 giocatori'
        : !p2pReady
        ? 'In attesa di connessione P2P...'
        : 'Avvia partita';
    }
  }

  const screen = h('div', { class: 'screen' }, [
    h('div', { class: 'lobby-header' }, [
      h('p', { class: 'text-muted' }, 'Codice lobby'),
      h('div', { class: 'lobby-code' }, session.lobbyCode),
      h(
        'p',
        { class: `pill ${session.mode === 'offline' ? 'pill-secondary' : 'pill-accent'}` },
        session.mode === 'offline' ? '🚌 Partial Offline' : '🌐 Full Online'
      ),
    ]),
    h('div', { class: 'tabbar' }, [tabPlayersBtn, tabScoresBtn]),
    panels,
    session.isHost ? startBtn : h('p', { class: 'text-muted text-center' }, "In attesa che l'host avvii la partita..."),
    h(
      'button',
      {
        class: 'btn btn-ghost',
        onclick: () => {
          resetTransport();
          clearSession();
          navigate('#home');
        },
      },
      'Esci dalla lobby'
    ),
  ]);
  mount(root, screen);
  setTab('players');

  let transport = null;
  let unsubPlayers = () => {};
  const unsubLobby = subscribeLobby(session.lobbyCode, (lobby) => {
    if (lobby.status === 'playing' && !started) {
      started = true;
      navigate('#game');
    }
  });

  getOrCreateTransport(session.mode, session.isHost ? 'host' : 'guest', session.lobbyCode, session.playerId).then(
    (t) => {
      transport = t;
      players = t.getPlayers();
      renderPlayers();
      unsubPlayers = t.onPlayersChanged((list) => {
        players = list;
        renderPlayers();
      });
    }
  );

  return () => {
    unsubLobby();
    unsubPlayers();
  };
}
