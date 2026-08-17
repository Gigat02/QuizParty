import {
  signInAnonymously,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { auth } from './firebase.js';

let readyPromise = null;

/**
 * Garantisce una sessione anonima Firebase attiva e restituisce l'uid.
 * L'utente non vede mai nulla di questo: nessun form di login, nessuna
 * password. Serve solo perché le Firestore Security Rules possano
 * verificare la proprietà dei documenti (request.auth.uid).
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
        reject
      );
      signInAnonymously(auth).catch((err) => {
        unsub();
        reject(err);
      });
    });
  }
  return readyPromise;
}
