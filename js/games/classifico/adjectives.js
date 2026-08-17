export const ADJECTIVES = [
  'simpatico',
  'pigro',
  'disordinato',
  'puntuale',
  'chiacchierone',
  'testardo',
  'goloso',
  'romantico',
  'competitivo',
  'distratto',
  'generoso',
  'permaloso',
  'avventuroso',
  'timido',
  'esibizionista',
  'precisino',
  'sognatore',
  'curioso',
  'impulsivo',
  'paziente',
  'imprevedibile',
  'ottimista',
  'brontolone',
  'elegante',
  'sportivo',
  'nostalgico',
  'coccolone',
  'stratega',
  'chiassoso',
  'dormiglione',
  'fortunato',
  'indeciso',
];

export function questionTextFor(adjective) {
  return `Chi è il più ${adjective}? Metti in ordine i giocatori dal più al meno ${adjective}.`;
}

/** Estrae un aggettivo non ancora usato in questa partita, se possibile. */
export function pickAdjective(usedAdjectives = []) {
  const unused = ADJECTIVES.filter((a) => !usedAdjectives.includes(a));
  const pool = unused.length > 0 ? unused : ADJECTIVES;
  return pool[Math.floor(Math.random() * pool.length)];
}
