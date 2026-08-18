// Helper condivisi dai minigiochi che assegnano un ruolo speciale a un
// giocatore diverso ad ogni turno (l'autore della domanda in "Chi l'ha
// scritto?", l'indovino in "Trova la parola"). Funzioni pure, nessun
// accesso a Firestore/WebRTC/DOM.

/** Fisher-Yates su una copia: non muta l'array passato. */
export function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Rotazione equa di un ruolo: pescando dalla stessa coda rimescolata, ogni
 * giocatore ricopre il ruolo esattamente una volta per ciclo completo — così
 * il ruolo resta "a caso" nell'ordine ma nessuno viene saltato o ripetuto
 * finché non hanno fatto tutti. La coda si rimescola da capo alla prima
 * chiamata (nessuno stato precedente), a ciclo esaurito, o se l'elenco
 * giocatori è cambiato rispetto al turno precedente.
 *
 * @param {string[]|undefined} previousQueue coda del matchState precedente
 * @param {number|undefined} previousIndex indice usato nel turno precedente
 * @param {string[]} playerOrder giocatori attuali
 * @returns {{queue: string[], index: number, playerId: string}}
 */
export function nextInRotation(previousQueue, previousIndex, playerOrder) {
  const sameSet =
    Array.isArray(previousQueue) &&
    previousQueue.length === playerOrder.length &&
    previousQueue.every((id) => playerOrder.includes(id));

  let queue = previousQueue;
  let index = previousIndex ?? -1;

  if (!sameSet || index + 1 >= queue.length) {
    queue = shuffle(playerOrder);
    index = 0;
  } else {
    index += 1;
  }
  return { queue, index, playerId: queue[index] };
}
