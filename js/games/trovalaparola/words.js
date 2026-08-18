// Parole da indovinare per la modalità Standard. Criteri di scelta: nomi
// comuni e concreti, abbastanza noti da lasciare molti indizi possibili (se
// la parola è troppo specifica tutti scrivono lo stesso indizio e si annulla
// tutto), e senza radici troppo generiche.
export const WORDS = [
  'gatto',
  'pizza',
  'spiaggia',
  'chitarra',
  'inverno',
  'castello',
  'medico',
  'bicicletta',
  'luna',
  'formaggio',
  'treno',
  'giardino',
  'pirata',
  'cioccolato',
  'ombrello',
  'montagna',
  'scuola',
  'orologio',
  'zaino',
  'circo',
  'deserto',
  'vulcano',
  'biblioteca',
  'aeroplano',
  'fantasma',
  'sciarpa',
  'mercato',
  'tempesta',
  'giraffa',
  'candela',
  'specchio',
  'cavaliere',
  'nonna',
  'semaforo',
  'piscina',
  'valigia',
  'dinosauro',
  'farfalla',
  'cuscino',
  'telescopio',
  'panetteria',
  'astronauta',
  'scarpone',
  'tesoro',
  'nuvola',
  'cameriere',
  'trombone',
  'girasole',
  'labirinto',
  'pinguino',
];

/** Estrae una parola non ancora usata in questa partita, se possibile. */
export function pickWord(usedIds = []) {
  const allIds = WORDS.map((_, i) => i);
  const unused = allIds.filter((i) => !usedIds.includes(i));
  const pool = unused.length > 0 ? unused : allIds;
  const id = pool[Math.floor(Math.random() * pool.length)];
  return { id, word: WORDS[id] };
}
