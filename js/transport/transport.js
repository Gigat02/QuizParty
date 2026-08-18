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
  SUBMIT_QUESTION: 'submit_question',
  // Usate dal minigioco "Chi l'ha scritto?" (js/games/chilhascritto/):
  SUBMIT_QUESTION_ANSWER: 'submit_question_answer', // autore di un turno Personalizzata: { questionText, correctAnswer }
  SUBMIT_GUESS: 'submit_guess', // { guessText }
  SUBMIT_VOTE: 'submit_vote', // { answerKey }
  // Usate dal minigioco "Trova la parola" (js/games/trovalaparola/):
  SUBMIT_SECRET_WORD: 'submit_secret_word', // chi sceglie la parola in Personalizzata: { word }
  SUBMIT_CLUE: 'submit_clue', // { clue } — una parola sola
  SUBMIT_WORD_GUESS: 'submit_word_guess', // tentativo dell'indovino: { word }
  START_ROUND: 'start_round',
  END_MATCH: 'end_match',
});
