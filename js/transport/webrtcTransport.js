// Transport "Partial Offline": topologia a stella centrata sull'host.
// Firestore viene usato SOLO per la segnalazione WebRTC (offer/answer/ICE)
// mentre c'è internet; una volta aperto il DataChannel, il gioco viaggia
// peer-to-peer e Firestore non viene più toccato per lo stato di partita.
//
// L'ospite è sempre il "caller" (crea l'offerta e il DataChannel), l'host
// è sempre il "callee" (risponde). Limite noto: senza server TURN la
// connessione diretta regge solo se i dispositivi sono raggiungibili
// direttamente (stessa rete locale/hotspot al momento dell'aggancio).
import {
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { signalingRef, signalingCol, subscribePlayers } from './firestoreSignaling.js';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function createWebrtcTransport() {
  let role = null;
  let code = null;
  let playerId = null;
  let roster = [];
  const firestoreUnsubs = [];
  const stateHandlers = [];
  // Ultimo matchState visto (inviato se host, ricevuto se ospite). A
  // differenza di Firestore (onSnapshot ridà sempre lo stato corrente ai
  // nuovi listener), i messaggi DataChannel sono effimeri: senza questa
  // cache, un handler registrato dopo l'invio del primo broadcast (tipico
  // se l'host arriva a #game più velocemente dell'ospite, che deve
  // aspettare un giro Firestore per il redirect) perderebbe per sempre lo
  // stato iniziale del round.
  let lastState = null;
  const actionHandlers = [];
  const playersHandlers = [];

  // host: guestId -> { pc, channel, status }
  const guestPeers = new Map();
  // guest: connessione unica verso l'host
  let hostPeer = null; // { pc, channel, status }

  function emitPlayersChanged() {
    const withStatus = roster.map((p) => {
      if (role === 'host') {
        if (p.playerId === playerId) return { ...p, p2pStatus: 'connected' };
        const entry = guestPeers.get(p.playerId);
        return { ...p, p2pStatus: entry ? entry.status : 'connecting' };
      }
      if (p.playerId === playerId) return { ...p, p2pStatus: 'connected' };
      if (p.isHost) return { ...p, p2pStatus: hostPeer ? hostPeer.status : 'connecting' };
      return p;
    });
    playersHandlers.forEach((h) => h(withStatus));
  }

  function wireChannel(channel, peerId, onStatusChange) {
    channel.onopen = () => onStatusChange('connected');
    channel.onclose = () => onStatusChange('failed');
    channel.onerror = () => onStatusChange('failed');
    channel.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      if (msg.kind === 'state') {
        lastState = msg.payload;
        stateHandlers.forEach((h) => h(msg.payload));
      }
      else if (msg.kind === 'action') actionHandlers.forEach((h) => h(msg.payload, peerId));
    };
  }

  function watchGuest(guestId) {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const entry = { pc, channel: null, status: 'connecting' };
    guestPeers.set(guestId, entry);

    let remoteDescSet = false;
    const pendingCandidates = [];

    pc.ondatachannel = (event) => {
      entry.channel = event.channel;
      wireChannel(entry.channel, guestId, (status) => {
        entry.status = status;
        emitPlayersChanged();
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        entry.status = 'failed';
        emitPlayersChanged();
      }
    };

    const guestDocRef = signalingRef(code, guestId);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(collection(guestDocRef, 'calleeCandidates'), event.candidate.toJSON()).catch(() => {});
      }
    };

    const unsubDoc = onSnapshot(guestDocRef, async (snap) => {
      const data = snap.data();
      if (!data?.offer || remoteDescSet) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        remoteDescSet = true;
        for (const c of pendingCandidates.splice(0)) {
          pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await updateDoc(guestDocRef, { answer: { type: answer.type, sdp: answer.sdp } });
      } catch (err) {
        console.error('Errore risposta WebRTC verso ospite', guestId, err);
        entry.status = 'failed';
        emitPlayersChanged();
      }
    });

    const unsubCandidates = onSnapshot(collection(guestDocRef, 'callerCandidates'), (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type !== 'added') return;
        const data = change.doc.data();
        if (remoteDescSet) pc.addIceCandidate(new RTCIceCandidate(data)).catch(() => {});
        else pendingCandidates.push(data);
      });
    });

    firestoreUnsubs.push(unsubDoc, unsubCandidates);
  }

  async function connectAsGuest() {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const channel = pc.createDataChannel('game');
    hostPeer = { pc, channel, status: 'connecting' };

    wireChannel(channel, 'host', (status) => {
      hostPeer.status = status;
      emitPlayersChanged();
    });

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        hostPeer.status = 'failed';
        emitPlayersChanged();
      }
    };

    const myDocRef = signalingRef(code, playerId);
    let remoteDescSet = false;
    const pendingCandidates = [];

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(collection(myDocRef, 'callerCandidates'), event.candidate.toJSON()).catch(() => {});
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await setDoc(myDocRef, { offer: { type: offer.type, sdp: offer.sdp } });

    const unsubDoc = onSnapshot(myDocRef, async (snap) => {
      const data = snap.data();
      if (!data?.answer || remoteDescSet) return;
      await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      remoteDescSet = true;
      for (const c of pendingCandidates.splice(0)) {
        pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
    });

    const unsubCandidates = onSnapshot(collection(myDocRef, 'calleeCandidates'), (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type !== 'added') return;
        const data = change.doc.data();
        if (remoteDescSet) pc.addIceCandidate(new RTCIceCandidate(data)).catch(() => {});
        else pendingCandidates.push(data);
      });
    });

    firestoreUnsubs.push(unsubDoc, unsubCandidates);
  }

  return {
    async connect(_role, _code, _playerId) {
      role = _role;
      code = _code;
      playerId = _playerId;

      // Aspetta il primo snapshot del roster prima di risolvere (stesso
      // motivo di firestoreTransport: getPlayers() subito dopo connect()
      // non deve restituire [] e far partire un round con playerOrder vuoto).
      await new Promise((resolve) => {
        const unsub = subscribePlayers(code, (list) => {
          roster = list;
          emitPlayersChanged();
          resolve();
        });
        firestoreUnsubs.push(unsub);
      });

      if (role === 'host') {
        const unsubList = onSnapshot(signalingCol(code), (snap) => {
          snap.docChanges().forEach((change) => {
            if (change.type === 'added' && !guestPeers.has(change.doc.id)) {
              watchGuest(change.doc.id);
            }
          });
        });
        firestoreUnsubs.push(unsubList);
      } else {
        await connectAsGuest();
      }
    },

    disconnect() {
      firestoreUnsubs.forEach((u) => u());
      firestoreUnsubs.length = 0;
      guestPeers.forEach((entry) => entry.pc.close());
      guestPeers.clear();
      if (hostPeer) {
        hostPeer.pc.close();
        hostPeer = null;
      }
    },

    broadcastState(matchState) {
      if (role !== 'host') return;
      lastState = matchState;
      const payload = JSON.stringify({ kind: 'state', payload: matchState });
      guestPeers.forEach((entry) => {
        if (entry.channel && entry.channel.readyState === 'open') entry.channel.send(payload);
      });
      stateHandlers.forEach((h) => h(matchState));
    },

    sendAction(action) {
      if (role !== 'guest') return;
      if (hostPeer?.channel?.readyState === 'open') {
        hostPeer.channel.send(JSON.stringify({ kind: 'action', payload: action }));
      }
    },

    onState(handler) {
      stateHandlers.push(handler);
      if (lastState) handler(lastState);
      return () => {
        const i = stateHandlers.indexOf(handler);
        if (i >= 0) stateHandlers.splice(i, 1);
      };
    },

    onAction(handler) {
      if (role !== 'host') return () => {};
      actionHandlers.push(handler);
      return () => {
        const i = actionHandlers.indexOf(handler);
        if (i >= 0) actionHandlers.splice(i, 1);
      };
    },

    onPlayersChanged(handler) {
      playersHandlers.push(handler);
      return () => {
        const i = playersHandlers.indexOf(handler);
        if (i >= 0) playersHandlers.splice(i, 1);
      };
    },

    getPlayers() {
      return roster;
    },

    /** true quando ogni ospite del roster ha DataChannel aperto (per gate "Avvia partita"). */
    allGuestsReady() {
      const guests = roster.filter((p) => !p.isHost);
      return guests.length > 0 && guests.every((p) => guestPeers.get(p.playerId)?.status === 'connected');
    },
  };
}
