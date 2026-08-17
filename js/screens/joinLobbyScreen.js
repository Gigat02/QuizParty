import { h, mount, clear } from '../core/dom.js';
import { navigate } from '../core/router.js';
import { getNickname, setSession } from '../core/state.js';
import { ensureAuth } from '../core/auth.js';
import { joinLobby, getPlayersOnce } from '../transport/firestoreSignaling.js';
import { nextFreeColor } from '../core/colors.js';

export function renderJoinLobbyScreen(root, params) {
  const mode = params.get('mode') === 'offline' ? 'offline' : 'online';
  const nickname = getNickname();

  if (!nickname) {
    navigate('#home');
    return;
  }

  const codeInput = h('input', {
    class: 'input input-code',
    type: 'tel',
    inputmode: 'numeric',
    pattern: '[0-9]*',
    maxlength: '6',
    placeholder: '••••••',
  });

  const errorEl = h('p', { class: 'text-center', style: { color: 'var(--color-danger)', minHeight: '1.2em' } });

  const submitBtn = h(
    'button',
    {
      class: 'btn btn-primary',
      onclick: async () => {
        const code = codeInput.value.trim();
        errorEl.textContent = '';
        if (!/^\d{6}$/.test(code)) {
          errorEl.textContent = 'Inserisci un codice a 6 cifre.';
          return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = 'Ingresso...';
        try {
          const playerId = await ensureAuth();
          const existing = await getPlayersOnce(code);
          const color = nextFreeColor(existing.map((p) => p.color));
          const lobby = await joinLobby({ code, playerId, nickname, color });
          setSession({ lobbyCode: code, playerId, isHost: false, mode: lobby.mode, matchMode: lobby.matchMode });
          navigate('#lobby');
        } catch (err) {
          console.error('Errore ingresso lobby', err);
          errorEl.textContent = err.message || 'Errore durante l\'ingresso nella lobby.';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Entra';
        }
      },
    },
    'Entra'
  );

  const screen = h('div', { class: 'screen' }, [
    h('div', { class: 'stack text-center' }, [
      h('h2', {}, 'Unisciti alla partita'),
      h('p', { class: 'text-muted' }, 'Chiedi il codice a 6 cifre a chi ha creato la partita.'),
    ]),
    h('div', { class: 'field' }, [h('label', {}, 'Codice lobby'), codeInput]),
    errorEl,
    submitBtn,
    h('button', { class: 'btn btn-ghost', onclick: () => navigate('#home') }, '← Indietro'),
  ]);

  mount(root, screen);
  codeInput.focus();
}
