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
      h('img', { class: 'logo', src: 'assets/logo.png', alt: 'QuizParty' }),
      h('h1', {}, 'QuizParty'),
      h('p', {}, 'Il party game da giocare insieme, online o offline.'),
    ]),
    h('div', { class: 'stack' }, [
      h('div', { class: 'field' }, [h('label', {}, 'Nickname'), nicknameInput]),
      h('button', { class: 'btn btn-primary', onclick: () => goTo('create') }, 'Crea partita'),
      h('button', { class: 'btn btn-accent', onclick: () => goTo('join') }, 'Unisciti a una partita'),
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
        '📱 Fai scaricare l\'app agli altri'
      ),
    ]),
  ]);

  mount(root, screen);
}
