// Confronto fra parole per "Trova la parola". Funzioni pure: nessun accesso a
// Firestore/WebRTC/DOM, così host e ospiti calcolano lo stesso risultato.
//
// Regole volute dal gioco (decise con l'utente):
// - confronto senza distinzione di maiuscole/minuscole e senza accenti;
// - maschile/femminile (e di riflesso singolare/plurale) contano come la
//   stessa parola: "gatto" == "gatta" == "gatti" == "gatte";
// - un indizio che contiene la radice della parola segreta non vale
//   (niente "gattino" per far indovinare "gatto");
// - due indizi uguali fra loro si annullano a vicenda.

const VOWELS = 'aeiou';

// Sotto questa lunghezza non si tronca la vocale finale: su parole
// cortissime ("re", "tè") resterebbe una radice di 1-2 lettere, che poi
// produrrebbe falsi positivi a raffica nel controllo di radice condivisa.
const MIN_STEM_LENGTH = 3;

/**
 * Minuscolo, senza accenti, senza spazi/punteggiatura.
 * NFD scompone le lettere accentate in "lettera + segno diacritico", e il
 * filtro finale [^a-z0-9] butta via il segno: così "perché" -> "perche"
 * senza bisogno di una tabella di conversione.
 */
export function normalizeWord(word) {
  return String(word ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Radice approssimata: la parola normalizzata senza la vocale finale.
 * In italiano una sola regola copre sia il genere (gatto/gatta) sia il
 * numero (gatti/gatte) — non è un vero stemmer linguistico, ma per un party
 * game è il compromesso giusto tra semplicità e risultato atteso dai
 * giocatori. Effetto collaterale accettato: parole diverse che differiscono
 * solo per la vocale finale ("casa"/"caso") vengono considerate uguali.
 */
export function stemWord(word) {
  const normalized = normalizeWord(word);
  if (normalized.length > MIN_STEM_LENGTH && VOWELS.includes(normalized[normalized.length - 1])) {
    return normalized.slice(0, -1);
  }
  return normalized;
}

/** Due parole sono "la stessa" ai fini del gioco (usata anche per validare il tentativo dell'indovino). */
export function sameWord(a, b) {
  const sa = stemWord(a);
  const sb = stemWord(b);
  return sa.length > 0 && sa === sb;
}

/**
 * true se l'indizio condivide la radice con la parola segreta — quindi non
 * vale. Il controllo è simmetrico (indizio dentro segreta o viceversa) per
 * coprire sia "gattino" per "gatto" sia "gatto" per "gattino".
 */
export function shareRoot(clue, secretWord) {
  const a = stemWord(clue);
  const b = stemWord(secretWord);
  if (!a || !b) return false;
  if (a === b) return true;

  const shorter = a.length <= b.length ? a : b;
  const longer = shorter === a ? b : a;
  // Con radici di 1-2 lettere la sola inclusione darebbe troppi falsi
  // positivi ("re" dentro "sereno"): lì serve l'uguaglianza piena, già
  // gestita sopra.
  if (shorter.length < MIN_STEM_LENGTH) return false;
  return longer.includes(shorter);
}

/**
 * Valuta tutti gli indizi di un round: marca come non validi quelli scritti
 * da più giocatori (si annullano) e quelli che contengono la radice della
 * parola segreta. Mantiene il testo originale, così la UI può mostrarlo
 * esattamente come è stato scritto.
 *
 * @param {Record<string,string>} clues playerId -> indizio scritto
 * @param {string} secretWord
 * @param {string[]} clueGiverIds giocatori che devono dare un indizio (indovino escluso)
 * @returns {{playerId: string, text: string, valid: boolean, reason: 'duplicate'|'root'|null}[]}
 *   nell'ordine di clueGiverIds (deterministico su tutti i client)
 */
export function computeClueResults(clues, secretWord, clueGiverIds) {
  const entries = clueGiverIds
    .filter((id) => typeof clues?.[id] === 'string' && clues[id].length > 0)
    .map((id) => ({ playerId: id, text: clues[id], stem: stemWord(clues[id]) }));

  const stemCounts = new Map();
  for (const entry of entries) {
    stemCounts.set(entry.stem, (stemCounts.get(entry.stem) || 0) + 1);
  }

  return entries.map((entry) => {
    let reason = null;
    if (stemCounts.get(entry.stem) > 1) reason = 'duplicate';
    else if (shareRoot(entry.text, secretWord)) reason = 'root';
    return { playerId: entry.playerId, text: entry.text, valid: reason === null, reason };
  });
}
