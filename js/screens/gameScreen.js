import { h, mount, clear } from '../core/dom.js';
import { navigate } from '../core/router.js';
import { getSession, clearSession } from '../core/state.js';
import { setLobbyStatus } from '../transport/firestoreSignaling.js';
import { getOrCreateTransport, resetTransport } from '../transport/activeTransport.js';
import { renderScoreboard } from '../ui/scoreboardPanel.js';
import { getGame } from '../games/registry.js';

function renderEnded(container, matchState, players, onExit) {
  clear(container);
  const sorted = [...players].sort((a, b) => (matchState.scores?.[b.playerId] || 0) - (matchState.scores?.[a.playerId] || 0));
  container.appendChild(
    h('div', { class: 'stack text-center' }, [
      h('h2', {}, '🏆 Partita finita!'),
      h(
        'ul',
        { class: 'stack' },
        sorted.map((p, idx) =>
          h('li', { class: 'scoreboard-row' }, [
            h('span', { class: 'rank' }, String(idx + 1)),
            h('span', { class: 'player-dot', style: { '--dot-color': p.color } }),
            h('span', { class: 'nickname grow' }, p.nickname),
            h('span', { class: 'score' }, String(matchState.scores?.[p.playerId] || 0)),
          ])
        )
      ),
      h('button', { class: 'btn btn-primary', onclick: onExit }, 'Torna alla home'),
    ])
  );
}

export function renderGameScreen(root) {
  const session = getSession();
  if (!session) {
    navigate('#home');
    return () => {};
  }

  let players = [];
  let currentState = null;
  let transport = null;
  let activeTab = 'game';
  const cleanupFns = [];

  const contentEl = h('div', {});
  const scoreboardEl = h('div', {});
  const tabGameBtn = h('button', { class: 'is-active', onclick: () => setTab('game') }, 'Gioco');
  const tabScoresBtn = h('button', { onclick: () => setTab('scores') }, 'Punteggi');

  function setTab(tab) {
    activeTab = tab;
    tabGameBtn.classList.toggle('is-active', tab === 'game');
    tabScoresBtn.classList.toggle('is-active', tab === 'scores');
    contentEl.style.display = tab === 'game' ? '' : 'none';
    scoreboardEl.style.display = tab === 'scores' ? '' : 'none';
  }

  const screen = h('div', { class: 'screen' }, [
    h('div', { class: 'tabbar' }, [tabGameBtn, tabScoresBtn]),
    contentEl,
    scoreboardEl,
  ]);
  mount(root, screen);
  setTab('game');

  function meInfo() {
    const p = players.find((pl) => pl.playerId === session.playerId) || {};
    return { playerId: session.playerId, nickname: p.nickname, color: p.color, isHost: session.isHost };
  }

  function submitAction(action) {
    if (session.isHost) {
      const module = getGame(currentState.gameId);
      currentState = module.reduce({ ...action, voterId: session.playerId }, currentState, players);
      transport.broadcastState(currentState);
    } else {
      transport.sendAction(action);
    }
  }

  function requestNewRound() {
    if (!session.isHost) return;
    const module = getGame(currentState.gameId);
    currentState = module.initRoundState(players, currentState);
    transport.broadcastState(currentState);
  }

  function requestEndMatch() {
    if (!session.isHost) return;
    currentState = { ...currentState, phase: 'ended' };
    transport.broadcastState(currentState);
    setLobbyStatus(session.lobbyCode, 'finished').catch(() => {});
  }

  function renderRound() {
    if (!currentState) {
      clear(contentEl);
      contentEl.appendChild(h('p', { class: 'text-muted text-center' }, 'In attesa che la partita cominci...'));
      return;
    }
    if (currentState.phase === 'ended') {
      renderEnded(contentEl, currentState, players, () => {
        resetTransport();
        clearSession();
        navigate('#home');
      });
      return;
    }
    clear(contentEl);
    const module = getGame(currentState.gameId);
    module.render(contentEl, currentState, {
      transport,
      submitAction,
      me: meInfo(),
      players,
      requestNewRound,
      requestEndMatch,
    });
  }

  getOrCreateTransport(session.mode, session.isHost ? 'host' : 'guest', session.lobbyCode, session.playerId).then(
    (t) => {
      transport = t;
      players = t.getPlayers();

      cleanupFns.push(
        t.onPlayersChanged((list) => {
          players = list;
          renderScoreboard(scoreboardEl, players, currentState?.scores || {});
        })
      );

      cleanupFns.push(
        t.onState((state) => {
          currentState = state;
          renderRound();
          renderScoreboard(scoreboardEl, players, state.scores || {});
        })
      );

      if (session.isHost) {
        cleanupFns.push(
          t.onAction((action, fromPlayerId) => {
            const module = getGame(currentState.gameId);
            currentState = module.reduce({ ...action, voterId: fromPlayerId }, currentState, players);
            transport.broadcastState(currentState);
          })
        );

        const module = getGame('classifico');
        currentState = module.initRoundState(players, null);
        transport.broadcastState(currentState);
      }
    }
  );

  return () => {
    cleanupFns.forEach((u) => u());
  };
}
