// Helper condivisi per lobby/players su Firestore. Usati sia dagli screen
// di creazione/ingresso lobby, sia da firestoreTransport e webrtcTransport
// (quest'ultimo li usa solo per la fase di segnalazione iniziale).
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  serverTimestamp,
  deleteField,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from '../core/firebase.js';
import { generateLobbyCode } from '../core/id.js';

const MAX_CODE_ATTEMPTS = 8;

export function lobbyRef(code) {
  return doc(db, 'lobbies', code);
}

export function playersCol(code) {
  return collection(db, 'lobbies', code, 'players');
}

export function playerRef(code, playerId) {
  return doc(db, 'lobbies', code, 'players', playerId);
}

export function roundRef(code) {
  return doc(db, 'lobbies', code, 'rounds', 'current');
}

export function actionsCol(code) {
  return collection(db, 'lobbies', code, 'rounds', 'current', 'actions');
}

export function actionRef(code, playerId) {
  return doc(db, 'lobbies', code, 'rounds', 'current', 'actions', playerId);
}

export function signalingCol(code) {
  return collection(db, 'lobbies', code, 'signaling');
}

export function signalingRef(code, guestId) {
  return doc(db, 'lobbies', code, 'signaling', guestId);
}

/**
 * Crea una nuova lobby con un codice a 6 cifre libero.
 * @returns {Promise<string>} il codice generato
 */
export async function createLobby({ hostId, nickname, color, mode }) {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateLobbyCode();
    const ref = lobbyRef(code);
    const existing = await getDoc(ref);
    if (existing.exists()) continue;

    await setDoc(ref, {
      code,
      mode,
      hostId,
      status: 'lobby',
      currentGameId: 'classifico',
      createdAt: serverTimestamp(),
    });
    await setDoc(playerRef(code, hostId), {
      nickname,
      color,
      isHost: true,
      joinedAt: serverTimestamp(),
      connected: true,
    });
    return code;
  }
  throw new Error('Impossibile generare un codice lobby libero, riprova.');
}

/** @returns {Promise<{code:string, mode:string, hostId:string, status:string}>} */
export async function joinLobby({ code, playerId, nickname, color }) {
  const ref = lobbyRef(code);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Nessuna lobby trovata con questo codice.');
  }
  const lobby = snap.data();
  if (lobby.status !== 'lobby') {
    throw new Error('La partita è già iniziata.');
  }
  await setDoc(playerRef(code, playerId), {
    nickname,
    color,
    isHost: false,
    joinedAt: serverTimestamp(),
    connected: true,
  });
  return { code, ...lobby };
}

export function subscribeLobby(code, onChange) {
  return onSnapshot(lobbyRef(code), (snap) => {
    if (snap.exists()) onChange(snap.data());
  });
}

export async function getPlayersOnce(code) {
  const q = query(playersCol(code), orderBy('joinedAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ playerId: d.id, ...d.data() }));
}

export function subscribePlayers(code, onChange) {
  const q = query(playersCol(code), orderBy('joinedAt', 'asc'));
  return onSnapshot(q, (snap) => {
    const players = snap.docs.map((d) => ({ playerId: d.id, ...d.data() }));
    onChange(players);
  });
}

export async function setLobbyStatus(code, status) {
  await updateDoc(lobbyRef(code), { status });
}

export async function markPlayerDisconnected(code, playerId) {
  await updateDoc(playerRef(code, playerId), { connected: false }).catch(() => {});
}

export { deleteField };
