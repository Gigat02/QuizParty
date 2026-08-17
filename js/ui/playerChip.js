import { h } from '../core/dom.js';

const STATUS_LABEL = {
  connecting: 'Connessione...',
  connected: 'Connesso',
  failed: 'Non raggiungibile',
};

const STATUS_CLASS = {
  connecting: 'pending',
  connected: 'ok',
  failed: 'fail',
};

/**
 * @param {{playerId:string, nickname:string, color:string, isHost?:boolean, p2pStatus?:string}} player
 * @param {{ showP2p?: boolean }} [opts]
 */
export function renderPlayerChip(player, opts = {}) {
  const badges = [];
  if (player.isHost) badges.push(h('span', { class: 'badge' }, 'Host'));
  if (opts.showP2p && player.p2pStatus) {
    badges.push(h('span', { class: `badge ${STATUS_CLASS[player.p2pStatus] || ''}` }, STATUS_LABEL[player.p2pStatus] || player.p2pStatus));
  }

  return h('li', { class: 'player-chip' }, [
    h('span', { class: 'player-dot', style: { '--dot-color': player.color } }),
    h('span', { class: 'nickname' }, player.nickname),
    ...badges,
  ]);
}
