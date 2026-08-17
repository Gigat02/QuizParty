/**
 * Contratto comune implementato da firestoreTransport (Full Online) e
 * webrtcTransport (Partial Offline). Il codice di gioco (js/games/**) parla
 * SOLO con questa interfaccia, mai direttamente con Firestore o WebRTC.
 *
 * Modello: host-autoritativo. L'host calcola sempre il matchState e lo
 * trasmette a tutti; gli ospiti mandano solo azioni.
 *
 * @typedef {Object} Transport
 * @property {(role: 'host'|'guest', lobbyCode: string, playerId: string) => Promise<void>} connect
 * @property {() => void} disconnect
 * @property {(matchState: object) => void} broadcastState  - solo host
 * @property {(action: object) => void} sendAction           - solo ospite
 * @property {(handler: (matchState: object) => void) => (() => void)} onState
 * @property {(handler: (action: object, fromPlayerId: string) => void) => (() => void)} onAction - solo host
 * @property {(handler: (players: PlayerInfo[]) => void) => (() => void)} onPlayersChanged
 * @property {() => PlayerInfo[]} getPlayers
 */

/**
 * @typedef {Object} PlayerInfo
 * @property {string} playerId
 * @property {string} nickname
 * @property {string} color
 * @property {boolean} isHost
 * @property {'connecting'|'connected'|'failed'} [p2pStatus] - solo modalità offline
 */

export const ACTION_KIND = Object.freeze({
  SUBMIT_RANKING: 'submit_ranking',
  START_ROUND: 'start_round',
  END_MATCH: 'end_match',
});
