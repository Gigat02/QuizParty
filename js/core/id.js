/** Genera un codice lobby numerico a 6 cifre (stringa, con zero iniziali possibili). */
export function generateLobbyCode() {
  const n = Math.floor(Math.random() * 1_000_000);
  return String(n).padStart(6, '0');
}

/** Id casuale corto per usi locali (es. chiavi temporanee lato client). */
export function generateShortId() {
  return Math.random().toString(36).slice(2, 10);
}
