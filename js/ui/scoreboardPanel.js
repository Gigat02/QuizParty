import { h, clear } from '../core/dom.js';

/**
 * Pannello "Punteggi": lista giocatori ordinata per punteggio decrescente.
 * @param {HTMLElement} container
 * @param {{playerId:string, nickname:string, color:string}[]} players
 * @param {Record<string, number>} scores
 */
export function renderScoreboard(container, players, scores = {}) {
  clear(container);
  const sorted = [...players].sort((a, b) => (scores[b.playerId] || 0) - (scores[a.playerId] || 0));

  if (sorted.length === 0) {
    container.appendChild(h('p', { class: 'text-muted text-center' }, 'Nessun giocatore ancora.'));
    return;
  }

  container.appendChild(
    h(
      'ul',
      { class: 'stack' },
      sorted.map((p, idx) =>
        h('li', { class: 'scoreboard-row' }, [
          h('span', { class: 'rank' }, String(idx + 1)),
          h('span', { class: 'player-dot', style: { '--dot-color': p.color } }),
          h('span', { class: 'nickname grow' }, p.nickname),
          h('span', { class: 'score' }, String(scores[p.playerId] || 0)),
        ])
      )
    )
  );
}
