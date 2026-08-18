import { h, mount } from '../core/dom.js';
import { navigate } from '../core/router.js';
import { getGame } from '../games/registry.js';

// Testi Standard/Personalizzata specifici per gioco: la dicotomia si
// riapplica a ogni GameModule (vedi CLAUDE.md), ma cosa significhi in
// pratica "Personalizzata" cambia da gioco a gioco.
const MATCH_MODE_COPY = {
  classifico: {
    standard: 'Il sistema estrae automaticamente un aggettivo ad ogni round.',
    custom: 'Ad ogni turno siete voi a scrivere le domande: una a testa, poi si classificano tutte in sequenza.',
  },
  chilhascritto: {
    standard: 'Il sistema propone una domanda con una risposta vera: scrivete una risposta credibile e votate quella che pensate sia giusta.',
    custom: 'Ad ogni turno un giocatore a caso scrive domanda e risposta vera, gli altri bluffano e votano. Serve un minimo di 4 giocatori.',
  },
  trovalaparola: {
    standard: 'Il sistema estrae la parola da far indovinare. Tutti gli altri danno un indizio di una parola sola.',
    custom: 'Ad ogni turno un giocatore a caso scrive lui la parola da far indovinare (e dà comunque il suo indizio).',
  },
  bugiaoverita: {
    standard: 'Il sistema propone 3 affermazioni di cultura generale, due vere e una falsa: scoprite qual è la bugia.',
    custom: 'Ogni turno scrivete 3 affermazioni su di voi (2 vere e 1 falsa), poi si passano in rassegna uno alla volta.',
  },
};

export function renderMatchModeSelectScreen(root, params) {
  const mode = params.get('mode') === 'offline' ? 'offline' : 'online';
  const gameId = params.get('gameId') || 'classifico';
  const game = getGame(gameId);
  const copy = MATCH_MODE_COPY[gameId] || MATCH_MODE_COPY.classifico;

  function choose(matchMode) {
    navigate(`#create?mode=${mode}&matchMode=${matchMode}&gameId=${gameId}`);
  }

  const screen = h('div', { class: 'screen' }, [
    h('div', { class: 'stack' }, [
      h('h2', { class: 'text-center' }, 'Che tipo di partita?'),
      h('p', { class: 'text-center text-muted' }, `Scegli come vengono create le domande di ${game.displayName}.`),
    ]),
    h('div', { class: 'mode-grid' }, [
      h(
        'button',
        { class: 'card card-tap mode-card mode-card-online', onclick: () => choose('standard') },
        [
          h('div', { class: 'icon' }, '🎲'),
          h('div', {}, [h('h3', {}, 'Standard'), h('p', {}, copy.standard)]),
        ]
      ),
      h(
        'button',
        { class: 'card card-tap mode-card mode-card-offline', onclick: () => choose('custom') },
        [
          h('div', { class: 'icon' }, '✍️'),
          h('div', {}, [h('h3', {}, 'Personalizzata'), h('p', {}, copy.custom)]),
        ]
      ),
    ]),
    h('button', { class: 'btn btn-ghost', onclick: () => navigate(`#gametype?mode=${mode}`) }, '← Indietro'),
  ]);

  mount(root, screen);
}
