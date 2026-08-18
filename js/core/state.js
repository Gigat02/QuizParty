const NICKNAME_KEY = 'quizparty:nickname';
const SESSION_KEY = 'quizparty:session';

export function getNickname() {
  return localStorage.getItem(NICKNAME_KEY) || '';
}

export function setNickname(nickname) {
  localStorage.setItem(NICKNAME_KEY, nickname.trim().slice(0, 18));
}

/**
 * Sessione di partita corrente (non sopravvive volutamente a un refresh
 * a metà partita, vedi limiti noti nel CLAUDE.md — MVP).
 * @typedef {{ lobbyCode: string, playerId: string, isHost: boolean, mode: 'online'|'offline', matchMode: 'standard'|'custom', gameId: string }} Session
 */

/** @returns {Session|null} */
export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** @param {Session} session */
export function setSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
