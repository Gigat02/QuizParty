/**
 * Contratto comune a tutti i minigiochi. gameScreen.js orchestra un
 * GameModule sopra un Transport, senza che il modulo di gioco sappia mai
 * se sta girando online (Firestore) o offline (WebRTC).
 *
 * @typedef {Object} GameModule
 * @property {string} id
 * @property {string} displayName
 * @property {(players: import('../transport/transport.js').PlayerInfo[], previousMatchState: object|null) => object} initRoundState
 *   Solo host. Crea il matchState per un nuovo round, portando avanti punteggi/round precedenti.
 * @property {(container: HTMLElement, matchState: object, ctx: GameRenderCtx) => void} render
 *   Identico per host e ospite: legge solo matchState e ctx.
 * @property {(action: object, matchState: object, players: import('../transport/transport.js').PlayerInfo[]) => object} reduce
 *   Solo host, funzione pura: applica un'azione allo stato corrente e restituisce il nuovo stato.
 * @property {(matchState: object, players: import('../transport/transport.js').PlayerInfo[]) => {ranking: string[], scoreDeltas: Record<string, number>}|null} computeResults
 *   Funzione pura, chiamabile da chiunque (host e ospiti calcolano lo stesso risultato indipendentemente).
 * @property {(matchState: object, players: import('../transport/transport.js').PlayerInfo[]) => boolean} isRoundComplete
 * @property {(matchState: object, players: import('../transport/transport.js').PlayerInfo[]) => object} [advanceRound]
 *   Opzionale. Passo intermedio più leggero di initRoundState — per minigiochi con più "sotto-round" dentro
 *   uno stesso round (es. una coda di domande da scorrere). gameScreen.js lo chiama solo se il modulo lo definisce.
 */

/**
 * @typedef {Object} GameRenderCtx
 * @property {import('../transport/transport.js').Transport} transport
 * @property {(action: object) => void} submitAction - instrada l'azione in modo trasparente (locale se host, transport se ospite)
 * @property {{playerId: string, nickname: string, color: string, isHost: boolean}} me
 * @property {import('../transport/transport.js').PlayerInfo[]} players
 * @property {() => void} requestNewRound - solo host, disponibile in UI di fine round
 * @property {() => void} requestNextQuestion - solo host; no-op se il modulo non definisce advanceRound
 * @property {() => void} requestEndMatch - solo host
 */

export {};
