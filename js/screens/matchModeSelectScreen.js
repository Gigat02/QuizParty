import { h, mount } from '../core/dom.js';
import { navigate } from '../core/router.js';

export function renderMatchModeSelectScreen(root, params) {
  const mode = params.get('mode') === 'offline' ? 'offline' : 'online';

  function choose(matchMode) {
    navigate(`#create?mode=${mode}&matchMode=${matchMode}`);
  }

  const screen = h('div', { class: 'screen' }, [
    h('div', { class: 'stack' }, [
      h('h2', { class: 'text-center' }, 'Che tipo di partita?'),
      h('p', { class: 'text-center text-muted' }, 'Scegli come vengono create le domande di Classifico.'),
    ]),
    h('div', { class: 'mode-grid' }, [
      h(
        'button',
        { class: 'card card-tap mode-card mode-card-online', onclick: () => choose('standard') },
        [
          h('div', { class: 'icon' }, '🎲'),
          h('div', {}, [
            h('h3', {}, 'Standard'),
            h('p', {}, 'Il sistema estrae automaticamente un aggettivo ad ogni round.'),
          ]),
        ]
      ),
      h(
        'button',
        { class: 'card card-tap mode-card mode-card-offline', onclick: () => choose('custom') },
        [
          h('div', { class: 'icon' }, '✍️'),
          h('div', {}, [
            h('h3', {}, 'Personalizzata'),
            h(
              'p',
              {},
              'Ad ogni turno siete voi a scrivere le domande: una a testa, poi si classificano tutte in sequenza.'
            ),
          ]),
        ]
      ),
    ]),
    h('button', { class: 'btn btn-ghost', onclick: () => navigate(`#mode?intent=create`) }, '← Indietro'),
  ]);

  mount(root, screen);
}
