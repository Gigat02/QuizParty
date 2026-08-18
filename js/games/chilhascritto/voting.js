// Funzioni pure condivise dalle due matchMode di "Chi l'ha scritto?": nessun
// accesso a Firestore/WebRTC/DOM, chiamabili indipendentemente da ogni client.

/**
 * Costruisce il pool di risposte da votare: le risposte scritte dai
 * guesser + la risposta vera, mescolate. Ogni entry porta comunque
 * l'authorId (null per la risposta vera) — serve a reduce() per assegnare
 * i punti quando arrivano i voti. render() non mostra mai authorId prima
 * della fase 'results': un giocatore che ispezionasse manualmente lo stato
 * (devtools/Firestore) potrebbe comunque vederlo, ma è lo stesso compromesso
 * già accettato per il codice lobby (vedi firestore.rules) — party game tra
 * amici basato sulla fiducia, non un vero segreto crittografico.
 * @param {Record<string,string>} guesses playerId -> testo della risposta scritta
 * @param {string} correctAnswer
 * @returns {{key:string, text:string, authorId:string|null}[]}
 */
export function buildAnswerPool(guesses, correctAnswer) {
  const entries = Object.entries(guesses).map(([authorId, text], i) => ({
    key: `g${i}`,
    text,
    authorId,
  }));
  entries.push({ key: 'truth', text: correctAnswer, authorId: null });
  return shuffle(entries);
}

function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** @returns {boolean} true se ogni giocatore atteso ha scritto una risposta. */
export function allGuessed(guesses, expectedIds) {
  return expectedIds.every((id) => typeof guesses?.[id] === 'string' && guesses[id].length > 0);
}

/** @returns {boolean} true se ogni giocatore atteso ha votato. */
export function allVoted(votes, expectedIds) {
  return expectedIds.every((id) => typeof votes?.[id] === 'string');
}

/**
 * Aggrega i voti finali: quanti voti ha preso ogni risposta e quanti punti
 * ha guadagnato ogni giocatore (autore votato + chi ha indovinato la vera).
 * @returns {{voteCounts: Record<string,number>, scoreDeltas: Record<string,number>}|null}
 */
export function computeVoteResults(matchState) {
  const { answerPool, votes, authorId } = matchState || {};
  if (!Array.isArray(answerPool) || !votes) return null;

  const voteCounts = {};
  for (const entry of answerPool) voteCounts[entry.key] = 0;

  const scoreDeltas = {};
  for (const [voterId, answerKey] of Object.entries(votes)) {
    voteCounts[answerKey] = (voteCounts[answerKey] || 0) + 1;
    const entry = answerPool.find((e) => e.key === answerKey);
    if (!entry) continue;
    if (entry.authorId) {
      scoreDeltas[entry.authorId] = (scoreDeltas[entry.authorId] || 0) + 1;
    } else if (entry.key === 'truth' && authorId) {
      // Personalizzata: chi ha scritto la domanda guadagna un punto anche
      // per ogni voto sulla risposta vera, esattamente come un guesser
      // guadagna per i voti sulla propria risposta (simmetria voluta,
      // decisa esplicitamente in fase di progettazione). In Standard
      // `authorId` non esiste (nessun giocatore ha scritto la verità),
      // quindi qui non scatta nulla.
      scoreDeltas[authorId] = (scoreDeltas[authorId] || 0) + 1;
    }
    if (entry.key === 'truth') {
      scoreDeltas[voterId] = (scoreDeltas[voterId] || 0) + 1;
    }
  }
  return { voteCounts, scoreDeltas };
}
