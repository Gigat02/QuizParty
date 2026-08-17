import { h } from '../../core/dom.js';

/**
 * Lista riordinabile touch-friendly (Pointer Events, nessuna libreria
 * esterna). Usata per la schermata di voto di Classifico.
 * @param {HTMLElement} container
 * @param {{playerId:string, nickname:string, color:string}[]} players ordine iniziale
 * @param {{ onChange?: (order: string[]) => void }} [opts]
 * @returns {{ getOrder: () => string[], destroy: () => void }}
 */
export function createRankList(container, players, opts = {}) {
  const { onChange } = opts;
  const listEl = h('ul', { class: 'rank-list' });
  const itemEls = new Map();
  let draggingId = null;

  function indexLabel(el, idx) {
    el.querySelector('.rank-index').textContent = String(idx + 1);
  }

  function buildItem(player, idx) {
    const el = h('li', { class: 'rank-item', 'data-id': player.playerId }, [
      h('span', { class: 'rank-index' }, String(idx + 1)),
      h('span', { class: 'player-dot', style: { '--dot-color': player.color } }),
      h('span', { class: 'nickname' }, player.nickname),
      h('span', { class: 'grip' }, '⠿'),
    ]);
    itemEls.set(player.playerId, el);
    return el;
  }

  players.forEach((player, idx) => listEl.appendChild(buildItem(player, idx)));
  container.appendChild(listEl);

  function onPointerMove(event) {
    if (!draggingId) return;
    const draggedEl = itemEls.get(draggingId);
    const y = event.clientY;
    const siblings = [...listEl.children].filter((el) => el !== draggedEl);
    let inserted = false;
    for (const sib of siblings) {
      const rect = sib.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (y < mid) {
        listEl.insertBefore(draggedEl, sib);
        inserted = true;
        break;
      }
    }
    if (!inserted) listEl.appendChild(draggedEl);
    [...listEl.children].forEach(indexLabel);
  }

  function onPointerUp() {
    const draggedEl = itemEls.get(draggingId);
    if (draggedEl) {
      draggedEl.classList.remove('is-dragging');
      draggedEl.removeEventListener('pointermove', onPointerMove);
      draggedEl.removeEventListener('pointerup', onPointerUp);
      draggedEl.removeEventListener('pointercancel', onPointerUp);
    }
    draggingId = null;
    if (onChange) onChange([...listEl.children].map((el) => el.dataset.id));
  }

  function onPointerDown(event) {
    const item = event.target.closest('.rank-item');
    if (!item) return;
    draggingId = item.dataset.id;
    item.setPointerCapture(event.pointerId);
    item.classList.add('is-dragging');
    item.addEventListener('pointermove', onPointerMove);
    item.addEventListener('pointerup', onPointerUp);
    item.addEventListener('pointercancel', onPointerUp);
  }

  listEl.addEventListener('pointerdown', onPointerDown);

  return {
    getOrder: () => [...listEl.children].map((el) => el.dataset.id),
    destroy() {
      listEl.removeEventListener('pointerdown', onPointerDown);
    },
  };
}
