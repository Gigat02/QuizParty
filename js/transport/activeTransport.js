// Singleton del transport attivo per la sessione corrente. Creato una sola
// volta in lobbyScreen (così, in modalità offline, la connessione WebRTC
// avviata durante l'attesa in lobby non viene mai ricreata/persa quando si
// passa alla schermata di gioco).
import { createFirestoreTransport } from './firestoreTransport.js';
import { createWebrtcTransport } from './webrtcTransport.js';

let current = null;
let currentKey = null;

export async function getOrCreateTransport(mode, role, code, playerId) {
  const key = `${mode}:${code}:${playerId}`;
  if (current && currentKey === key) return current;
  if (current) current.disconnect();

  current = mode === 'offline' ? createWebrtcTransport() : createFirestoreTransport();
  currentKey = key;
  await current.connect(role, code, playerId);
  return current;
}

export function getActiveTransport() {
  return current;
}

export function resetTransport() {
  if (current) current.disconnect();
  current = null;
  currentKey = null;
}
