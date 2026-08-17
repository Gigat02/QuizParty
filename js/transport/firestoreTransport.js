// Transport "Full Online": Firestore è l'unica fonte di verità, per tutta
// la partita. Implementa il contratto in transport.js.
import {
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  roundRef,
  actionRef,
  actionsCol,
  subscribePlayers,
} from './firestoreSignaling.js';

export function createFirestoreTransport() {
  let role = null;
  let code = null;
  let playerId = null;
  let players = [];
  const unsubs = [];

  return {
    async connect(_role, _code, _playerId) {
      role = _role;
      code = _code;
      playerId = _playerId;
      unsubs.push(
        subscribePlayers(code, (list) => {
          players = list;
        })
      );
    },

    disconnect() {
      unsubs.forEach((u) => u());
      unsubs.length = 0;
    },

    broadcastState(matchState) {
      if (role !== 'host') return;
      setDoc(roundRef(code), { ...matchState, updatedAt: serverTimestamp() });
    },

    sendAction(action) {
      if (role !== 'guest') return;
      setDoc(actionRef(code, playerId), { ...action, submittedAt: serverTimestamp() });
    },

    onState(handler) {
      const unsub = onSnapshot(roundRef(code), (snap) => {
        if (snap.exists()) handler(snap.data());
      });
      unsubs.push(unsub);
      return unsub;
    },

    onAction(handler) {
      if (role !== 'host') return () => {};
      const unsub = onSnapshot(actionsCol(code), (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            handler(change.doc.data(), change.doc.id);
          }
        });
      });
      unsubs.push(unsub);
      return unsub;
    },

    onPlayersChanged(handler) {
      const unsub = subscribePlayers(code, (list) => {
        players = list;
        handler(list);
      });
      unsubs.push(unsub);
      return unsub;
    },

    getPlayers() {
      return players;
    },
  };
}
