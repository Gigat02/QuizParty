import { h, mount } from '../core/dom.js';
import { navigate } from '../core/router.js';
import { listGames } from '../games/registry.js';

// Solo copywriting (icona + sottotitolo): generico se un gioco futuro non è
// presente in questa mappa, così registrare un nuovo GameModule non richiede
// per forza di toccare questo file.
const GAME_META = {
  classifico: { icon: '📊', tagline: 'Estratta una domanda, ognuno ordina i giocatori: chi indovina di più la classifica del gruppo vince.' },
  chilhascritto: { icon: '🕵️', tagline: 'Scrivete risposte plausibili per farvi votare, o indovinate quella vera: bluff e trivia insieme.' },
  trovalaparola: { icon: '🔍', tagline: 'Uno non conosce la parola, gli altri danno un indizio a testa — ma gli indizi uguali si annullano. Si vince insieme.' },
};

export function renderGameSelectScreen(root, params) {
  const mode = params.get('mode') === 'offline' ? 'offline' : 'online';

  function choose(gameId) {
    navigate(`#matchmode?mode=${mode}&gameId=${gameId}`);
  }

  const games = listGames();

  const screen = h('div', { class: 'screen' }, [
    h('div', { class: 'stack' }, [
      h('h2', { class: 'text-center' }, 'Che gioco volete fare?'),
      h('p', { class: 'text-center text-muted' }, 'Scegli il minigioco per questa partita.'),
    ]),
    h(
      'div',
      { class: 'mode-grid' },
      games.map((game, idx) => {
        const meta = GAME_META[game.id] || { icon: '🎮', tagline: '' };
        return h(
          'button',
          {
            class: `card card-tap mode-card ${idx % 2 === 0 ? 'mode-card-online' : 'mode-card-offline'}`,
            onclick: () => choose(game.id),
          },
          [
            h('div', { class: 'icon' }, meta.icon),
            h('div', {}, [h('h3', {}, game.displayName), h('p', {}, meta.tagline)]),
          ]
        );
      })
    ),
    h('button', { class: 'btn btn-ghost', onclick: () => navigate('#mode?intent=create') }, '← Indietro'),
  ]);

  mount(root, screen);
}
