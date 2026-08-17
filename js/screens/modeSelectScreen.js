import { h, mount } from '../core/dom.js';
import { navigate } from '../core/router.js';

export function renderModeSelectScreen(root, params) {
  const intent = params.get('intent') === 'join' ? 'join' : 'create';

  function choose(mode) {
    // Solo chi crea la partita sceglie anche la modalità di gioco
    // (Standard/Personalizzata) — chi si unisce eredita quella dell'host.
    if (intent === 'create') {
      navigate(`#matchmode?mode=${mode}`);
    } else {
      navigate(`#${intent}?mode=${mode}`);
    }
  }

  const screen = h('div', { class: 'screen' }, [
    h('div', { class: 'stack' }, [
      h('h2', { class: 'text-center' }, intent === 'create' ? 'Crea partita' : 'Unisciti a una partita'),
      h('p', { class: 'text-center text-muted' }, 'Come volete giocare?'),
    ]),
    h('div', { class: 'mode-grid' }, [
      h(
        'button',
        { class: 'card card-tap mode-card mode-card-online', onclick: () => choose('online') },
        [
          h('div', { class: 'icon' }, '🌐'),
          h('div', {}, [
            h('h3', {}, 'Full Online'),
            h('p', {}, 'Tutti connessi a internet per tutta la partita. Il modo più semplice.'),
          ]),
        ]
      ),
      h(
        'button',
        { class: 'card card-tap mode-card mode-card-offline', onclick: () => choose('offline') },
        [
          h('div', { class: 'icon' }, '🚌'),
          h('div', {}, [
            h('h3', {}, 'Partial Offline'),
            h('p', {}, "Ci si connette una volta con internet, poi si può giocare senza (es. in viaggio)."),
          ]),
        ]
      ),
    ]),
    h(
      'p',
      { class: 'mode-note' },
      '📶 Partial Offline: dopo l\'aggancio la partita gira da telefono a telefono senza server. Funziona in modo affidabile solo se restate sulla stessa rete Wi‑Fi/hotspot durante l\'aggancio iniziale — con reti dati diverse la connessione diretta potrebbe non riuscire.'
    ),
    h('button', { class: 'btn btn-ghost', onclick: () => navigate('#home') }, '← Indietro'),
  ]);

  mount(root, screen);
}
