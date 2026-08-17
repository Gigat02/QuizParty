import { h, mount } from '../core/dom.js';
import { getNickname, setNickname } from '../core/state.js';
import { navigate } from '../core/router.js';
import { openInviteModal } from '../ui/qrInvite.js';

export function renderHomeScreen(root) {
  let nickname = getNickname();

  function goTo(intent) {
    const trimmed = nickname.trim();
    if (!trimmed) {
      nicknameInput.focus();
      nicknameInput.classList.add('input-error');
      return;
    }
    setNickname(trimmed);
    navigate(`#mode?intent=${intent}`);
  }

  const nicknameInput = h('input', {
    class: 'input',
    type: 'text',
    placeholder: 'Il tuo nickname',
    maxlength: '18',
    value: nickname,
    oninput: (e) => {
      nickname = e.target.value;
    },
  });

  const screen = h('div', { class: 'screen' }, [
    h('div', { class: 'home-hero' }, [
      h('div', {
        class: 'logo',
        html: `<svg viewBox="0 0 88 88" width="88" height="88" xmlns="http://www.w3.org/2000/svg">
          <circle cx="44" cy="44" r="42" fill="#3b5bfd"/>
          <circle cx="30" cy="40" r="7" fill="#ffd93d"/>
          <circle cx="58" cy="40" r="7" fill="#ff6bd6"/>
          <path d="M26 58 Q44 74 62 58" stroke="#ffffff" stroke-width="6" fill="none" stroke-linecap="round"/>
        </svg>`,
      }),
      h('h1', {}, 'QuizParty'),
      h('p', {}, 'Il party game da giocare insieme, online o offline.'),
    ]),
    h('div', { class: 'stack' }, [
      h('div', { class: 'field' }, [h('label', {}, 'Nickname'), nicknameInput]),
      h('button', { class: 'btn btn-primary', onclick: () => goTo('create') }, 'Crea partita'),
      h('button', { class: 'btn btn-secondary', onclick: () => goTo('join') }, 'Unisciti a una partita'),
      h(
        'button',
        {
          class: 'btn btn-ghost',
          onclick: () => {
            const trimmed = nickname.trim();
            if (trimmed) setNickname(trimmed);
            openInviteModal();
          },
        },
        '📱 Invita amici'
      ),
    ]),
  ]);

  mount(root, screen);
}
