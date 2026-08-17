# QuizParty — contesto progetto

Gioco multiplayer da party, 100% browser (no app, no build step), pubblicato gratis su GitHub Pages. Repo: `Gigat02/QuizParty`.

## Cos'è

Party game tipo Jackbox: un host crea una lobby con codice a 6 cifre, gli amici entrano dal loro telefono (via link/QR), e giocano insieme minigiochi a round. Primo (e per ora unico) minigioco: **Classifico** — viene estratta una domanda ("Chi è il più simpatico? Metti in ordine i giocatori dal più al meno simpatico"), ogni giocatore ordina gli altri, il sistema calcola una classifica aggregata (media delle posizioni, stile Borda) e confronta con la classifica di ognuno (verde=corretto, rosso=diverso), assegnando +1 punto per posizione indovinata.

## Le due modalità (IMPORTANTE, decisione architetturale centrale)

- **Full Online**: comunicazione continua via Firestore per tutta la partita.
- **Partial Offline**: lobby/aggancio via Firestore (serve internet solo in questa fase), poi la partita gira su **WebRTC DataChannel** peer-to-peer (topologia a stella: ogni ospite ↔ host), zero internet necessario dopo l'aggancio. Limite noto: senza server TURN, il P2P regge solo se i dispositivi erano sulla stessa rete locale/hotspot al momento dell'aggancio.

Il codice di gioco (Classifico, e i futuri minigiochi) **non conosce mai il trasporto**: parla solo con l'interfaccia `Transport` (`js/transport/transport.js`), implementata sia da `firestoreTransport.js` che da `webrtcTransport.js`. Questo è il punto di design più importante del progetto — va preservato quando si aggiungono nuovi minigiochi o funzionalità.

**Host autoritativo**: l'host calcola sempre lo stato di gioco (`matchState`) e lo trasmette; gli ospiti mandano solo azioni (es. la propria classifica). Questo vale in entrambe le modalità.

## Stack tecnico

- HTML/CSS/JS vanilla, ES modules, nessun bundler/build step.
- Firebase Firestore (piano gratuito Spark) per online + segnalazione WebRTC.
- Firebase Auth anonima (`signInAnonymously`) — invisibile all'utente, serve solo per far rispettare le Firestore Security Rules (ownership dei documenti).
- Firebase SDK caricato via CDN (moduli ufficiali gstatic), non vendorizzato.
- Libreria QR **vendorizzata localmente** in `js/vendor/qrcode/` (deve funzionare anche offline).
- PWA: `manifest.webmanifest` + `service-worker.js` cache-first, così il sito funziona offline dopo la prima apertura (scenario "pullman senza internet").
- Hosting: GitHub Pages, root del branch `main` — attenzione al sotto-percorso `/QuizParty/` in manifest/service worker.

## Struttura file (vedi anche il piano originale in `.claude/plans` se serve lo storico decisionale)

```
index.html, manifest.webmanifest, service-worker.js, firestore.rules, README.md
css/{tokens,base,components,screens}.css
js/
  app.js                          # bootstrap, router, SW registration
  config/firebase-config.js       # config pubblica Firebase (safe da committare)
  vendor/qrcode/                  # libreria QR vendorizzata
  core/{state,router,auth,colors,id,dom}.js
  transport/{transport,firestoreTransport,webrtcTransport,firestoreSignaling}.js
  games/
    gameModule.js                  # interfaccia comune ai minigiochi
    registry.js                     # registerGame()/getGame()
    classifico/{index,adjectives,ranking,dragReorder}.js
  screens/{homeScreen,modeSelectScreen,createLobbyScreen,joinLobbyScreen,lobbyScreen,gameScreen}.js
  ui/{qrInvite,scoreboardPanel,playerChip}.js
assets/{icons/, logo.svg}
```

## Interfaccia Transport (contratto)

```
connect(role, lobbyCode, playerId)
disconnect()
broadcastState(matchState)      // solo host
sendAction(action)               // solo ospite
onState(handler) -> unsubscribe
onAction(handler) -> unsubscribe // solo host
onPlayersChanged(handler) -> unsubscribe
getPlayers()
```

## Interfaccia GameModule (per aggiungere un nuovo minigioco in futuro)

```
id, displayName
initRoundState(players, previousMatchState) -> matchState   // host
render(container, matchState, ctx) -> void                   // identico per host/ospite
reduce(action, matchState, players) -> matchState             // host, puro
computeResults(matchState, players) -> {ranking, scoreDeltas} // puro
isRoundComplete(matchState, players) -> boolean
```

`gameScreen.js` passa a `render()` una `ctx.submitAction()` che decide internamente se applicare localmente (host) o inviare via transport (ospite). Un nuovo minigioco si registra con `registerGame(id, module)` in `games/registry.js` e non richiede modifiche a `transport/` o `screens/gameScreen.js`, a patto che segua il modello "un'azione per giocatore per round, stato host-autoritativo" (non generalizza a giochi con azioni sequenziali/a turni — vedi limiti noti).

## Schema dati Firestore

```
lobbies/{code}                          # code = "123456"
  code, mode: 'online'|'offline', hostId, status: 'lobby'|'playing'|'finished', currentGameId, createdAt
  players/{playerId}                    # playerId == auth.uid, NIENTE punteggio qui (vive in matchState)
    nickname, color, isHost, joinedAt, connected
  rounds/current                        # scritto solo dall'host, È il matchState
    gameId, phase, questionAdjective, questionText, playerOrder[], roundNumber, usedAdjectives[], scores{}, submissions{}
    actions/{playerId}                  # input grezzo, scrivibile solo dal proprietario, leggibile da proprietario+host
  signaling/{guestId}                   # solo modalità offline: offer/answer + callerCandidates/calleeCandidates
```

## Limiti noti dell'MVP (voluti, non dimenticati)

- Nessun TURN server (P2P offline richiede stessa rete locale al momento dell'aggancio).
- Nessun fallback se un ospite non riesce l'aggancio P2P (blocca "Avvia partita").
- Nessuna pulizia/scadenza lobby vecchie su Firestore.
- Nessuna riconnessione automatica dopo refresh/chiusura pagina a metà partita.
- Nessuna migrazione host se l'host si disconnette.
- Codice a 6 cifre non è un vero segreto (nessun rate-limiting).

## Setup Firebase (manuale, richiede login Google dell'utente)

Il progetto Firebase (Spark, gratuito) va creato dalla console da chi possiede l'account Google — non automatizzabile da Claude. Config finale va incollata in `js/config/firebase-config.js`. Vedi `README.md` per i passaggi esatti.

## Stato di avanzamento (17 agosto 2026)

Firebase configurato e funzionante (progetto `quizparty-feefe`), config reale in `js/config/firebase-config.js`, regole di sicurezza pubblicate sulla Console. **Full Online testato end-to-end con successo** (due origini browser separate, vedi sotto): lobby, join, sync live, round, classifica pesata con evidenziazione verde/rosso, punteggi cumulativi su più round, nuovo round, fine partita. Partial Offline (WebRTC) non ancora testato end-to-end.

Live su GitHub Pages: https://gigat02.github.io/QuizParty/ — repo: https://github.com/Gigat02/QuizParty (branch `main`).

### Bug reali trovati e corretti durante il testing

1. **Auth anonima condivisa tra tab** (`js/core/auth.js`): di default Firebase persiste l'utente anonimo per tutto il browser (indexedDB), quindi due tab dello stesso browser finivano per condividere lo stesso uid/giocatore, sovrascrivendosi a vicenda. Fix: `setPersistence(auth, browserSessionPersistence)` prima di `signInAnonymously`, coerente col fatto che la sessione di gioco (`core/state.js`) è già per-scheda (`sessionStorage`). Su dispositivi reali separati (i telefoni degli amici) questo non sarebbe comunque stato un problema, ma è comunque il comportamento corretto.
2. **L'host non navigava mai a `#game`** (`js/screens/lobbyScreen.js`): il redirect automatico su cambio status della lobby era guardato da `!started`, ma l'host stesso settava `started = true` nel click handler prima ancora di scrivere su Firestore — quindi il proprio redirect non scattava mai (funzionava solo per gli ospiti). Fix: l'host naviga esplicitamente a `#game` subito dopo `setLobbyStatus(...)`.
3. **Race condition su `connect()`** (`js/transport/firestoreTransport.js` e `webrtcTransport.js`): `connect()` si risolveva prima che arrivasse il primo snapshot Firestore della lista giocatori, quindi `getPlayers()` poteva restituire `[]` subito dopo — l'host inizializzava il primo round con `playerOrder` vuoto. Fix: `connect()` ora aspetta (`await new Promise(...)`) il primo snapshot prima di risolvere.
4. **`gameScreen.js` non si iscriveva mai a `transport.onAction`**: l'host non riceveva mai le azioni (es. classifiche votate) inviate dagli ospiti. Fix: aggiunta la sottoscrizione `t.onAction(...)` nel ramo host, che applica `reduce()` e ribroadcasta lo stato.

### Nota per il debugging futuro (ambiente di sviluppo, non bug dell'app)

Il pacchetto `serve` (usato inizialmente come server statico locale) manda header di cache aggressivi: anche navigando di nuovo alla stessa pagina, il browser può continuare a eseguire moduli JS vecchi (cache-ata), rendendo invisibili le modifiche appena fatte e portando a diagnosi fuorvianti. **Usare `http-server -c-1`** (disabilita la cache) per qualunque sessione di debug locale — vedi `.claude/launch.json` nella cartella padre del repo (due config: `quizparty` porta 5173, `quizparty-player2` porta 5174, utile per simulare due giocatori con storage completamente isolato, dato che due tab dello stesso browser/porta condividono comunque `localStorage`/indexedDB). Inoltre, ri-navigare tramite tool a un URL identico a quello corrente (stesso hash incluso) può non ricaricare la pagina — per forzare un reload vero, navigare prima a un URL diverso (es. l'origine senza hash) e poi guidare l'app via click/JS in-page.

### Prossimi passi

- Testare Partial Offline end-to-end (due origini, verificare badge P2P nella lobby, poi mettere entrambe offline da DevTools a metà partita e verificare che il gioco continui via DataChannel).
- Test su dispositivi reali (telefoni) prima di considerare la modalità offline affidabile, specialmente il comportamento drag-and-drop touch.

Il piano di implementazione originale (con le assunzioni discusse e confermate con l'utente) è in `C:\Users\gigat\.claude\plans\sleepy-weaving-wilkinson.md`.
