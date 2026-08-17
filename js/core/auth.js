import {
  signInAnonymously,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { auth } from './firebase.js';

let readyPromise = null;

/**
 * Garantisce una sessione anonima Firebase attiva e restituisce l'uid.
 * L'utente non vede mai nulla di questo: nessun form di login, nessuna
 * password. Serve solo perché le Firestore Security Rules possano
 * verificare la proprietà dei documenti (request.auth.uid).
 *
 * Persistenza volutamente legata alla singola scheda (sessionStorage),
 * NON al browser intero (che sarebbe il default): il "session" di
 * QuizParty (vedi core/state.js) è già per-scheda, quindi due partite
 * aperte in due tab dello stesso dispositivo devono restare due identità
 * giocatore distinte invece di condividere lo stesso uid.
 * @returns {Promise<string>} uid
 */
export function ensureAuth() {
  if (!readyPromise) {
    readyPromise = new Promise((resolve, reject) => {
      const unsub = onAuthStateChanged(
        auth,
        (user) => {
          if (user) {
            unsub();
            resolve(user.uid);
          }
        },
        (err) => {
          unsub();
          readyPromise = null;
          reject(err);
        }
      );
      setPersistence(auth, browserSessionPersistence)
        .then(() => signInAnonymously(auth))
        .catch((err) => {
          unsub();
          readyPromise = null;
          reject(err);
        });
    });
  }
  return readyPromise;
}
