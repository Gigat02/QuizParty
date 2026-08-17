// Deve restare sincronizzato con le variabili --player-color-* in css/tokens.css
export const PLAYER_COLORS = [
  '#ff6b6b',
  '#ffb648',
  '#ffd93d',
  '#6bcb77',
  '#35c2c1',
  '#7c5cfc',
  '#ff8fd6',
  '#4d8cff',
];

/**
 * Assegna un colore a un giocatore in base all'ordine di ingresso, evitando
 * duplicati finché possibile (ciclo se i giocatori superano la palette).
 * @param {number} index posizione di ingresso del giocatore (0-based)
 */
export function colorForIndex(index) {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

/**
 * Trova il prossimo colore libero rispetto ai colori già assegnati.
 * @param {string[]} usedColors
 */
export function nextFreeColor(usedColors) {
  const used = new Set(usedColors);
  const free = PLAYER_COLORS.find((c) => !used.has(c));
  return free || PLAYER_COLORS[usedColors.length % PLAYER_COLORS.length];
}
