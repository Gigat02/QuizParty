// Funzioni pure: nessun accesso a Firestore/WebRTC/DOM. Chiamabili
// indipendentemente da ogni client (host e ospiti devono ottenere
// esattamente lo stesso risultato dagli stessi dati).

/**
 * Aggrega le classifiche di tutti i votanti in un'unica classifica finale,
 * stile Borda: media della posizione (0=più, N-1=meno) su tutte le
 * classifiche inviate, ordine crescente. Il confronto usa moltiplicazione
 * incrociata (interi) invece della divisione, per evitare che client
 * diversi ottengano risultati diversi per arrotondamento floating-point.
 * Parità: spareggio stabile in base all'ordine di ingresso in lobby.
 *
 * @param {Record<string, string[]>} submissions playerId votante -> classifica inviata (playerId dal più al meno)
 * @param {string[]} playerIds tutti i giocatori, in ordine di ingresso
 * @returns {string[]} classifica finale (playerId dal più al meno)
 */
export function aggregateRanking(submissions, playerIds) {
  const sumPos = new Map(playerIds.map((id) => [id, 0]));
  const count = new Map(playerIds.map((id) => [id, 0]));

  for (const order of Object.values(submissions)) {
    if (!Array.isArray(order)) continue;
    order.forEach((playerId, idx) => {
      if (!sumPos.has(playerId)) return;
      sumPos.set(playerId, sumPos.get(playerId) + idx);
      count.set(playerId, count.get(playerId) + 1);
    });
  }

  const indexOf = new Map(playerIds.map((id, i) => [id, i]));

  return [...playerIds].sort((a, b) => {
    const sa = sumPos.get(a);
    const ca = count.get(a) || 1;
    const sb = sumPos.get(b);
    const cb = count.get(b) || 1;
    const cross = sa * cb - sb * ca; // sa/ca vs sb/cb senza floating point
    if (cross !== 0) return cross;
    return indexOf.get(a) - indexOf.get(b);
  });
}

/**
 * +1 punto per ogni posizione della propria classifica che coincide
 * esattamente con la classifica finale aggregata.
 * @param {string[]} finalRanking
 * @param {Record<string, string[]>} submissions
 * @returns {Record<string, number>} playerId votante -> punti guadagnati in questo round
 */
export function scoreRoundDeltas(finalRanking, submissions) {
  const deltas = {};
  for (const [voterId, order] of Object.entries(submissions)) {
    if (!Array.isArray(order)) {
      deltas[voterId] = 0;
      continue;
    }
    let score = 0;
    for (let i = 0; i < finalRanking.length; i++) {
      if (order[i] === finalRanking[i]) score++;
    }
    deltas[voterId] = score;
  }
  return deltas;
}

/** @returns {boolean} true se ogni giocatore ha inviato la propria classifica. */
export function allSubmitted(submissions, playerIds) {
  return playerIds.every((id) => Array.isArray(submissions?.[id]));
}
