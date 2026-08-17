import { h, clear } from '../../core/dom.js';

/**
 * Lista riordinabile con due bottoni (▲/▼) per riga — più semplice e
 * intuitiva dello swipe/drag su schermi piccoli.
 * @param {HTMLElement} container
 * @param {{playerId:string, nickname:string, color:string}[]} players ordine iniziale
 * @param {{ onChange?: (order: string[]) => void }} [opts]
 * @returns {{ getOrder: () => string[], destroy: () => void }}
 */
export function createRankList(container, players, opts = {}) {
  const { onChange } = opts;
  const byId = new Map(players.map((p) => [p.playerId, p]));
  let order = players.map((p) => p.playerId);

  const listEl = h('ul', { class: 'rank-list' });
  container.appendChild(listEl);

  function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    render();
    if (onChange) onChange(order);
  }

  function render() {
    clear(listEl);
    order.forEach((id, idx) => {
      const player = byId.get(id);
      listEl.appendChild(
        h('li', { class: 'rank-item' }, [
          h('span', { class: 'rank-index' }, String(idx + 1)),
          h('span', { class: 'player-dot', style: { '--dot-color': player.color } }),
          h('span', { class: 'nickname' }, player.nickname),
          h('div', { class: 'rank-move-btns' }, [
            h(
              'button',
              {
                class: 'rank-move-btn',
                type: 'button',
                disabled: idx === 0,
                'aria-label': `Sposta ${player.nickname} più in alto`,
                onclick: () => move(idx, -1),
              },
              '▲'
            ),
            h(
              'button',
              {
                class: 'rank-move-btn',
                type: 'button',
                disabled: idx === order.length - 1,
                'aria-label': `Sposta ${player.nickname} più in basso`,
                onclick: () => move(idx, 1),
              },
              '▼'
            ),
          ]),
        ])
      );
    });
  }

  render();

  return {
    getOrder: () => order,
    destroy() {},
  };
}
