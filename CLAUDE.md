# QuizParty — contesto progetto

Gioco multiplayer da party, 100% browser (no app, no build step), pubblicato gratis su GitHub Pages. Repo: `Gigat02/QuizParty`.

## Cos'è

Party game tipo Jackbox: un host crea una lobby con codice a 6 cifre, gli amici entrano dal loro telefono (via link/QR), e giocano insieme minigiochi a round. Quattro minigiochi finora (dettagli di ognuno più sotto): **Classifico** (viene estratta una domanda "Chi è il più simpatico?", ogni giocatore ordina gli altri, il sistema calcola una classifica aggregata stile Borda e assegna +1 punto per posizione indovinata), **"Chi l'ha scritto?"** (bluff/trivia in stile Fibbing It), **"Trova la parola"** (cooperativo, stile Just One) e **"Bugia o Verità?"** (due verità e una bugia).

Chi crea la partita sceglie, in sequenza (dopo Full Online/Partial Offline, prima di entrare in lobby):
1. **Tipo di gioco** (`js/screens/gameSelectScreen.js`, route `#gametype`): quale minigioco giocare. Schermata generica, costruita su `listGames()` dal registry — registrare un nuovo `GameModule` basta a farlo comparire qui, senza toccare questo file (a meno di volergli un'icona/tagline dedicata in `GAME_META`).
2. **Modalità di gioco** (`js/screens/matchModeSelectScreen.js`, route `#matchmode`): Standard o Personalizzata, **per ogni gioco**:
   - **Standard**: il sistema genera/estrae automaticamente le domande.
   - **Personalizzata**: le domande le scrivono i giocatori stessi. Cosa significhi in pratica cambia da gioco a gioco (vedi sotto) — i testi descrittivi delle due card sono in `MATCH_MODE_COPY` dentro `matchModeSelectScreen.js`, non nel `GameModule`.

Chi si unisce eredita entrambe le scelte dall'host (lette dal doc lobby, campi `currentGameId`/`matchMode`).

### Minigioco 1: Classifico

- **Standard**: il sistema estrae automaticamente un aggettivo ad ogni round (comportamento originale).
- **Personalizzata**: ad ogni turno tutti i giocatori scrivono prima una propria domanda (fase `writing`), poi il gioco le mostra e le fa classificare una alla volta in sequenza (stessa meccanica di voto/risultati di Standard, riusata identica). Non si può terminare la partita finché non sono state mostrate e classificate tutte le domande del turno — vedi dettaglio più sotto.

### Minigioco 2: "Chi l'ha scritto?" (`js/games/chilhascritto/`)

Bluff/trivia stile Fibbing It: si scrivono risposte plausibili per farsi votare (un punto a voto ricevuto), e si guadagna un punto extra indovinando quella vera. Fasi: `writing` (solo Personalizzata) → `guessing` → `voting` → `results`.

- **Standard**: il sistema propone una domanda con risposta vera nota (banco in `chilhascritto/trivia.js`) — **tutti** i giocatori scrivono una risposta (fase `guessing` diretta, nessun `writing`), poi tutti votano quale pensano sia quella vera (non la propria). Minimo 2 giocatori.
- **Personalizzata**: ad ogni turno un giocatore casuale (rotazione equa via `authorQueue`, un autore per ciclo completo — vedi `nextAuthor()` in `chilhascritto/index.js`) scrive domanda e risposta vera (fase `writing`, non gioca oltre in quel turno); gli altri scrivono una risposta (fase `guessing`) e poi votano (fase `voting`, autore escluso). Ogni voto ricevuto vale un punto per chi ha scritto quella risposta — **inclusa la risposta vera**: chi ha scritto la domanda guadagna un punto per ogni voto sulla verità, esattamente come un guesser per i voti sul suo bluff (simmetria voluta). Chi vota la risposta vera guadagna comunque un punto extra. Minimo **4 giocatori** (1 autore + almeno 3 guesser, altrimenti il voto è banale).

Nota di sicurezza accettata: la risposta corretta vive nel `matchState` broadcast fin dall'inizio del round (server pure, nessun canale segreto separato — vedi il vincolo architetturale "host broadcasta l'intero stato" più sotto), anche se la UI non la mostra mai prima della fase `voting`. Un giocatore che ispezionasse devtools/Firestore potrebbe vederla in anticipo: stesso compromesso già accettato per il codice lobby a 6 cifre (vedi "Limiti noti dell'MVP").

Nella fase di voto ogni giocatore vede **anche la propria risposta**, ma resa opaca (`.answer-option-mine`), non cliccabile ed etichettata "la tua": così il pool visualizzato è lo stesso per tutti (nessuna riga che "manca") senza permettere l'autovoto, che `reduce()` rifiuterebbe comunque.

### Minigioco 3: "Trova la parola" (`js/games/trovalaparola/`)

Cooperativo, ispirato a Just One: un giocatore non conosce la parola, gli altri gli danno **un indizio di una parola sola a testa**, ma gli indizi che si assomigliano troppo si annullano. Fasi: `writing` (solo Personalizzata) → `clues` → `guessing` → `results`.

- **Standard**: la parola la estrae il sistema (banco in `trovalaparola/words.js`) e la vedono tutti tranne l'indovino.
- **Personalizzata**: un giocatore a caso fra i non-indovini scrive lui la parola (fase `writing`) e poi **dà comunque il suo indizio come tutti** — è l'unica differenza fra le due modalità.
- L'indovino ha **3 tentativi**: se non ci arriva, il round non fa punti per nessuno ("tutti perdono"). Se indovina, vincono tutti e i punti sono `4 − tentativi usati` (3 al primo colpo, 2 al secondo, 1 al terzo), uguali per tutti perché il gioco è cooperativo.
- Minimo **3 giocatori** (1 indovino + 2 che danno indizi: sotto questa soglia il meccanismo dei doppioni non può nemmeno scattare).

Regole di confronto fra parole (tutte in `trovalaparola/matching.js`, funzioni pure):
- confronto **senza distinzione di maiuscole** e senza accenti (NFD + filtro `[^a-z0-9]`, quindi "perché" → "perche" senza tabelle di conversione);
- **maschile/femminile equivalenti** — e di riflesso anche singolare/plurale, perché la regola è "via la vocale finale": `gatto`/`gatta`/`gatti`/`gatte` → radice `gatt`. Vale sia per l'eliminazione degli indizi sia per il tentativo dell'indovino;
- indizi **uguali fra loro** (a livello di radice) si annullano a vicenda (`reason: 'duplicate'`);
- indizio che **contiene la radice della parola segreta** eliminato (`reason: 'root'`), con controllo simmetrico così copre sia "gattino" per `gatto` sia "gatto" per `gattino`;
- gli **spazi sono vietati**: l'input li elimina mentre si digita (anche se incollati) e `sanitizeWord()` li ributta via lato host, perché un client modificato non deve poter aggirare la UI.

Attenzione a una conseguenza voluta della regola sulla vocale finale: parole diverse che differiscono solo per l'ultima vocale ("casa"/"caso") risultano uguali. È il prezzo di non avere un vero stemmer italiano, accettato consapevolmente per un party game. Sotto le 4 lettere la vocale non viene tolta, altrimenti resterebbero radici di 1-2 lettere che farebbero scattare eliminazioni a caso ("re" dentro "sereno") — per lo stesso motivo la ricerca di radice condivisa pretende almeno 3 caratteri.

Visualizzazione degli indizi (requisito esplicito dell'utente): chi **non** deve indovinare vede tutti gli indizi con accanto **chi li ha scritti**, e quelli eliminati con una **✕ rossa** e la parola barrata; l'indovino vede gli stessi slot nello stesso ordine, ma delle parole eliminate legge solo `•••••` (sa quanti indizi ha perso, non quali erano). A fine round, in `results`, tutti vedono tutto in chiaro.

### Minigioco 4: "Bugia o Verità?" (`js/games/bugiaoverita/`)

Due verità e una bugia. Fasi: `writing` (solo Personalizzata) → `judging` → `results`.

- **Standard**: il sistema propone **un set per round** di 3 affermazioni di cultura generale (banco in `bugiaoverita/statements.js`), lo giudicano **tutti** i giocatori. Non esistendo un autore, non c'è nessuno a cui dare il punto extra. Minimo 2 giocatori.
- **Personalizzata**: nella fase `writing` **tutti** scrivono 3 affermazioni su di sé segnando quale è la bugia; poi si scorrono i set **uno per giocatore** con una coda (`queue`/`queueIndex` + `advanceRound`, identico alla coda di domande di Classifico Personalizzata), e l'autore di turno non giudica il proprio set. Minimo 3 giocatori.
- **Punteggio**: 1 punto per ogni affermazione classificata correttamente — che nella pratica vale **3 se becchi la bugia, 1 se sbagli** (indicando una sola bugia, quando sbagli ne azzecchi comunque una). In Personalizzata l'autore prende **+1 punto extra se nessuno scopre la sua bugia**.

**Vincolo di design importante — perché si indica UNA sola bugia invece di marcare liberamente le 3 frasi.** La proposta iniziale prevedeva 3 segni indipendenti (✕/✓ su ognuna). Con "2 vere e 1 falsa" noto a tutti, quella regola crea una **strategia dominante degenere**: marcare tutte e tre come vere garantisce 2 punti sicuri, mentre giocare davvero ne rende 1,67 di media (3 se indovini, 1 se no, con 1/3 di probabilità). Serviva indovinare la bugia più del 50% delle volte per giustificare il gioco onesto — quindi chi se ne accorgeva vinceva senza ragionare, e per giunta il punto extra all'autore sarebbe scattato sempre (nessuno accusa mai nulla). Risolto vincolando l'azione a un solo indice: `SUBMIT_JUDGEMENT` porta un `lieIndex`, quindi "sono tutte vere" **non è nemmeno rappresentabile**. La UI resta quella pensata dall'utente (✕ rossa sulla scelta, ✓ verdi sulle altre due, in anteprima prima di confermare).

La selezione si conferma con un bottone dedicato ("Conferma scelta") invece di inviare al primo tocco: si può cambiare idea vedendo l'anteprima ✕/✓.

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
    registry.js                     # registerGame()/getGame()/listGames()
    rotation.js                     # shuffle() + nextInRotation(): ruolo a turno equo, condiviso fra minigiochi
    classifico/{index,adjectives,ranking,rankList}.js
    chilhascritto/{index,trivia,voting}.js
    trovalaparola/{index,words,matching}.js
    bugiaoverita/{index,statements}.js
  screens/{homeScreen,modeSelectScreen,gameSelectScreen,matchModeSelectScreen,createLobbyScreen,joinLobbyScreen,lobbyScreen,gameScreen}.js
  ui/{qrInvite,scoreboardPanel,playerChip}.js
assets/{icons/, fonts/, logo.png}
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
advanceRound(matchState, players) -> matchState   // opzionale, host — passo intermedio più leggero di initRoundState
minPlayers(matchMode) -> number                    // opzionale — se assente, lobbyScreen.js usa 2 di default
```

`gameScreen.js` passa a `render()` una `ctx.submitAction()` che decide internamente se applicare localmente (host) o inviare via transport (ospite). Un nuovo minigioco si registra con `registerGame(id, module)` in `games/registry.js` e non richiede modifiche a `screens/gameScreen.js` né alle implementazioni di `Transport` (`firestoreTransport.js`/`webrtcTransport.js`, che trattano l'azione come oggetto opaco), a patto che segua il modello "un'azione per giocatore per round, stato host-autoritativo" (non generalizza a giochi con azioni sequenziali/a turni — vedi limiti noti). In pratica di solito aggiunge però le proprie costanti di tipo-azione all'`ACTION_KIND` condiviso in `transport/transport.js` (solo per convenzione/DX, non obbligatorio: sono stringhe opache, un modulo potrebbe definirle anche localmente) — vedi `chilhascritto/index.js` come secondo esempio dopo `classifico/index.js`.

## Schema dati Firestore

```
lobbies/{code}                          # code = "123456"
  code, mode: 'online'|'offline', matchMode: 'standard'|'custom', hostId, status: 'lobby'|'playing'|'finished', currentGameId, createdAt
  players/{playerId}                    # playerId == auth.uid, NIENTE punteggio qui (vive in matchState)
    nickname, color, isHost, joinedAt, connected
  rounds/current                        # scritto solo dall'host, È il matchState (forma dipende da gameId e matchMode)
    # comuni a entrambi i giochi: gameId, matchMode, phase, playerOrder[], scores{}
    # classifico standard: phase 'submitting'|'results', questionAdjective, questionText, roundNumber, usedAdjectives[], submissions{}
    # classifico custom:   phase 'writing'|'submitting'|'results', turnNumber, customQuestions{playerId:testo},
    #                       questionQueue[] (ordine autori, fissato quando tutti hanno scritto), queueIndex, questionText, submissions{}
    # chilhascritto standard: phase 'guessing'|'voting'|'results', roundNumber, usedQuestions[], questionText,
    #                         correctAnswer (in matchState fin da subito, mai mostrata in UI prima di 'voting' — vedi nota sopra),
    #                         guesses{playerId:testo}, answerPool[{key,text,authorId|null}], votes{playerId:answerKey}
    # chilhascritto custom:   come standard + phase 'writing' iniziale, turnNumber, authorQueue[]/authorQueueIndex/authorId
    # trovalaparola standard: phase 'clues'|'guessing'|'results', roundNumber, usedWords[], secretWord (nascosta in UI
    #                         all'indovino fino a 'results'), guesserQueue[]/guesserQueueIndex/guesserId,
    #                         clues{playerId:parola}, clueResults[{playerId,text,valid,reason}], attempts[], outcome 'won'|'lost'
    # trovalaparola custom:   come standard + phase 'writing' iniziale, turnNumber, wordWriterId
    # bugiaoverita standard:  phase 'judging'|'results', roundNumber, usedSets[], currentAuthorId null,
    #                         currentStatements[3], currentLieIndex, judgements{playerId:indice scelto}
    # bugiaoverita custom:    come standard + phase 'writing' iniziale, turnNumber, currentAuthorId,
    #                         statementSets{playerId:{statements[3],lieIndex}}, queue[]/queueIndex
    actions/{playerId}                  # input grezzo dell'ultima azione del giocatore (submit_ranking / submit_question /
                                         # submit_question_answer / submit_guess / submit_vote / submit_secret_word /
                                         # submit_clue / submit_word_guess / submit_statements / submit_judgement
                                         # a seconda del gioco/fase),
                                         # scrivibile solo dal proprietario, leggibile da proprietario+host
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

Firebase configurato e funzionante (progetto `quizparty-feefe`), config reale in `js/config/firebase-config.js`, regole di sicurezza pubblicate sulla Console. **Entrambe le modalità testate end-to-end con successo** (due origini browser separate, vedi sotto):
- **Full Online**: lobby, join, sync live, round, classifica pesata con evidenziazione verde/rosso, punteggi cumulativi su più round, nuovo round, fine partita.
- **Partial Offline**: aggancio P2P riuscito al lobby screen (badge "Connesso"), partita giocata interamente su WebRTC DataChannel. Testato anche il caso critico: con `fetch`/`XMLHttpRequest` bloccati su ENTRAMBE le schede (simulando zero internet), un intero round — nuovo round, voto, invio, calcolo risultati, punteggio — ha continuato a funzionare perfettamente, confermando che la promessa "gioca senza internet dopo l'aggancio" è reale.

Live su GitHub Pages: https://gigat02.github.io/QuizParty/ — repo: https://github.com/Gigat02/QuizParty (branch `main`).

### Bug reali trovati e corretti durante il testing

1. **Auth anonima condivisa tra tab** (`js/core/auth.js`): di default Firebase persiste l'utente anonimo per tutto il browser (indexedDB), quindi due tab dello stesso browser finivano per condividere lo stesso uid/giocatore, sovrascrivendosi a vicenda. Fix: `setPersistence(auth, browserSessionPersistence)` prima di `signInAnonymously`, coerente col fatto che la sessione di gioco (`core/state.js`) è già per-scheda (`sessionStorage`). Su dispositivi reali separati (i telefoni degli amici) questo non sarebbe comunque stato un problema, ma è comunque il comportamento corretto.
2. **L'host non navigava mai a `#game`** (`js/screens/lobbyScreen.js`): il redirect automatico su cambio status della lobby era guardato da `!started`, ma l'host stesso settava `started = true` nel click handler prima ancora di scrivere su Firestore — quindi il proprio redirect non scattava mai (funzionava solo per gli ospiti). Fix: l'host naviga esplicitamente a `#game` subito dopo `setLobbyStatus(...)`.
3. **Race condition su `connect()`** (`js/transport/firestoreTransport.js` e `webrtcTransport.js`): `connect()` si risolveva prima che arrivasse il primo snapshot Firestore della lista giocatori, quindi `getPlayers()` poteva restituire `[]` subito dopo — l'host inizializzava il primo round con `playerOrder` vuoto. Fix: `connect()` ora aspetta (`await new Promise(...)`) il primo snapshot prima di risolvere.
4. **`gameScreen.js` non si iscriveva mai a `transport.onAction`**: l'host non riceveva mai le azioni (es. classifiche votate) inviate dagli ospiti. Fix: aggiunta la sottoscrizione `t.onAction(...)` nel ramo host, che applica `reduce()` e ribroadcasta lo stato.
5. **Messaggi DataChannel persi in caso di sottoscrizione tardiva** (`js/transport/webrtcTransport.js`): a differenza di Firestore (`onSnapshot` ridà sempre lo stato corrente ai nuovi listener), i messaggi su un WebRTC DataChannel sono effimeri — se l'host trasmetteva lo stato iniziale del round prima che l'ospite avesse registrato il proprio `onState` (probabile, perché l'ospite deve aspettare un giro Firestore per il redirect a `#game`, più lento del percorso locale dell'host), il messaggio andava perso per sempre e l'ospite restava con lo schermo di gioco vuoto. Fix: aggiunta una cache `lastState` (sia lato invio che ricezione) che viene ridata immediatamente a ogni nuovo handler registrato via `onState`, replicando il comportamento di `onSnapshot`.

### Nota per il debugging futuro (ambiente di sviluppo, non bug dell'app)

Il pacchetto `serve` (usato inizialmente come server statico locale) manda header di cache aggressivi: anche navigando di nuovo alla stessa pagina, il browser può continuare a eseguire moduli JS vecchi (cache-ata), rendendo invisibili le modifiche appena fatte e portando a diagnosi fuorvianti. **Usare `http-server -c-1`** (disabilita la cache) per qualunque sessione di debug locale — vedi `.claude/launch.json` nella cartella padre del repo (due config: `quizparty` porta 5173, `quizparty-player2` porta 5174, utile per simulare due giocatori con storage completamente isolato, dato che due tab dello stesso browser/porta condividono comunque `localStorage`/indexedDB). Inoltre, ri-navigare tramite tool a un URL identico a quello corrente (stesso hash incluso) può non ricaricare la pagina — per forzare un reload vero, navigare prima a un URL diverso (es. l'origine senza hash) e poi guidare l'app via click/JS in-page.

### Redesign grafico (18 agosto 2026)

Su richiesta dell'utente: logo sostituito con l'immagine fornita (`assets/logo.png` + icone rigenerate con sfondo bianco arrotondato per PWA/favicon, processate con `sharp` per rimuovere lo sfondo e ritagliare), palette senza blu (primario tangerine `#ff7a45`, secondario viola `#7c5cfc`, terzo accento verde acqua `#17a398`, coerenti con la palette giocatori), font vendorizzati (Fredoka per titoli/bottoni, Nunito per il testo — coppia scelta apposta per stare bene insieme), testo di default nero/quasi nero invece che colorato, grassetto ridotto a un uso selettivo, "Invita amici" rinominato "Fai scaricare l'app agli altri" e rimosso dalla lobby (resta solo in home), bottoni con colori distinti per azione (Crea=primario, Unisciti=secondario, mode card colorate per modalità), sfondo con forme sfumate morbide per dare più profondità senza appesantire.

Due bug reali trovati durante la verifica visiva del redesign (nessuno dei due era stato notato prima perché i test precedenti controllavano solo dati/testo, non screenshot):

6. **`core/dom.js` non applicava mai i colori dei pallini giocatore**: l'helper `h()` usava `Object.assign(el.style, {...})` per applicare gli stili inline, ma questo NON funziona per le CSS custom properties (es. `--dot-color`) — il browser lo ignora silenziosamente, quindi ogni pallino mostrava sempre il colore di fallback (uguale per tutti). Bug preesistente, mai notato prima perché i test precedenti verificavano solo i dati (Firestore) e il testo, non l'aspetto visivo. Fix: per le chiavi che iniziano con `--`, usare `el.style.setProperty(prop, val)` invece dell'assegnazione diretta.
7. **Non è un bug dell'app, ma un'insidia per il debugging locale**: il service worker (per design) precarica `js/core/dom.js` e tutti i file dell'app shell. Se durante lo sviluppo locale hai già visitato l'app una volta in un tab/porta, il service worker continuerà a servire la versione vecchia dei file **anche dopo un reload con query string anti-cache sull'URL della pagina**, perché intercetta le singole richieste ai file per path indipendentemente dalla query string della pagina che le ha originate. Per testare modifiche JS/CSS in locale: apri la console e lancia `navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())); caches.keys().then(ks => ks.forEach(k => caches.delete(k)))`, poi ricarica.

### Seconda passata di redesign: tema scuro (18 agosto 2026)

Su richiesta dell'utente, palette sostituita di nuovo per allinearsi a un'altra sua app (github.com/Gigat02/Offline-game): sfondo viola molto scuro `#0c0b1c`, superfici `#16152c`/`#27263c`, viola chiaro `#a14fff` come colore primario (bottoni/azioni importanti), verde acido `#c4e621` come accento (bottoni secondari, numeri/testi rilevanti come il codice lobby e i punti round). Il token `--color-secondary` (viola) della passata precedente è stato rimosso: ora l'app usa solo 2 colori brand (primary viola + accent verde) invece di 3. Logo e icone rigenerati con inchiostro verde acido su sfondo trasparente (logo) o viola scuro arrotondato (icone), stesso script di prima (`sharp`) con colori parametrizzati.

Altre due modifiche in questa passata:
- **Riordino classifica**: rimosso il drag/swipe (`dragReorder.js` → cancellato), sostituito con due bottoni ▲/▼ per riga (`js/games/classifico/rankList.js`, stesso nome di funzione esportata `createRankList` per non toccare `classifico/index.js` più del necessario). Verificato che lo scambio e la disabilitazione ai bordi (primo/ultimo) funzionino.
- **Testo domanda accorciato**: `questionTextFor()` in `adjectives.js` ora restituisce solo `Chi è il più {aggettivo}?`, senza più "Metti in ordine i giocatori dal più al meno...".

Se in futuro si tocca ancora la palette, ricordarsi che `--color-secondary` non esiste più — i due colori disponibili sono `--color-primary` (viola, azioni importanti) e `--color-accent` (verde acido, secondarie/testi rilevanti).

### Bug: il riordino/testo non confermato di un giocatore veniva azzerato dal voto di un altro (18 agosto 2026)

Segnalato dall'utente dopo il rilascio di Personalizzata: quando un giocatore confermava la propria classifica, la lista degli ALTRI giocatori (ancora in fase di scelta) sembrava "riordinarsi secondo il voto di chi aveva confermato". Causa reale: ogni `submit_ranking`/`submit_question` fa ribroadcastare l'INTERO matchState a tutti (anche a chi non ha ancora confermato), e `classifico/index.js`'s `render()` ricostruiva sempre da zero la lista/textarea ad ogni matchState ricevuto — quindi il riordino locale non ancora confermato veniva perso e sostituito dall'ordine di default (`playerOrder`), che nei test a 2 giocatori può facilmente sembrare "l'ordine scelto dall'altro" per pura coincidenza (solo 2 permutazioni possibili).

Fix in due parti:
1. `classifico/index.js`: `render()` ora calcola una `editingKey` (fase + domanda/round + "sto ancora scrivendo/votando") e salta la ricostruzione se per la mia vista non è cambiato nulla di rilevante, preservando lo stato locale non confermato.
2. **Bug nel primo tentativo del fix**: `gameScreen.js`'s `renderRound()` chiamava `clear(contentEl)` incondizionatamente PRIMA di `module.render(...)`, vanificando il punto 1 — quando `render()` decideva di saltare, il contenitore restava vuoto (era già stato ripulito da fuori), causando uno schermo di gioco completamente bianco al posto del riordino "congelato". Trovato con un MutationObserver + wrapper di `render()` per tracciare esattamente cosa succedeva al DOM tra una chiamata e l'altra (i controlli data/testo da soli non lo avrebbero mai rivelato). Fix: rimossa la `clear()` da `gameScreen.js` — ora ogni `GameModule.render()` è responsabile della propria pulizia/ricostruzione (vedi JSDoc aggiornato in `games/gameModule.js`).

Verificato dal vivo a 3 giocatori: un giocatore riordina senza confermare, un altro conferma, il riordino del primo resta intatto e viene sottomesso correttamente quando poi conferma lui stesso.

### Promemoria service worker

**Bump `CACHE_NAME` in `service-worker.js` ad OGNI deploy che cambia file cacheati** — è stato dimenticato per due commit di fila (Personalizzata + relax regole matchMode), causando esattamente il tipo di "client con cache vecchia" che ha già creato confusione due volte in questa sessione (una volta con me durante il debugging, una volta con l'utente in produzione). Prima di ogni push, controllare che il numero di versione sia stato incrementato se sono cambiati file in `PRECACHE_URLS` o il loro contenuto.

### Modalità "Personalizzata" (18 agosto 2026)

Nuova scelta, solo per chi crea la partita, tra route `#mode` (online/offline) e `#create`: `#matchmode` (`js/screens/matchModeSelectScreen.js`) fa scegliere Standard (comportamento originale) o Personalizzata. Chi si unisce non sceglie nulla, eredita `matchMode` dal doc della lobby (stesso pattern già usato per `mode`).

Design chiave: la modalità Personalizzata **riusa interamente** la macchina a stati esistente (`submissions`, `computeResults`, `scoreRoundDeltas`, la UI di voto/risultati) — l'unica cosa nuova è una fase `writing` prima e un meccanismo di coda per mostrare le domande scritte una alla volta:
- `initRoundState(players, previousMatchState, config)` ora accetta un terzo parametro opzionale `config.matchMode`, letto solo alla primissima inizializzazione (i turni successivi ereditano `matchMode` da `previousMatchState`, esattamente come già succede per `scores`).
- Fase `writing`: ogni giocatore scrive+conferma una domanda (azione `submit_question`, nuovo `ACTION_KIND`). Quando tutti hanno scritto, si fissa `questionQueue` (ordine = `playerOrder`) e si passa a `phase:'submitting'` con la prima domanda in coda — da qui in poi è identico a Standard.
- Fine di una domanda in coda (`phase:'results'`): se non è l'ultima, l'host vede **solo** "Prossima domanda" (nessun bottone per terminare la partita — questo è il modo in cui si garantisce "non si può terminare finché tutte le domande non sono state classificate"); se è l'ultima, vede "Nuovo turno"/"Termina partita" come in Standard.
- "Prossima domanda" usa un nuovo metodo opzionale del GameModule, `advanceRound(matchState)` — non fa parte del contratto minimo, `gameScreen.js` lo chiama solo `if (typeof module.advanceRound === 'function')`. Aggiunta una funzione gemella in `gameScreen.js`, `requestNextQuestion()`, sullo stesso pattern di `requestNewRound`/`requestEndMatch`.

Testato con un test isolato (import diretto del modulo, senza Firestore) che simula scrittura → coda → voto → avanzamento → nuovo turno con punteggi mantenuti, poi end-to-end dal vivo a due giocatori (entrambi scrivono, votano 2 domande in sequenza, verificato che "Termina partita" non compaia prima dell'ultima, punteggi cumulativi corretti). Nessuna regressione sulla modalità Standard (verificata con lo stesso approccio).

**Promemoria**: se si tocca ancora `firestore.rules`, la lista `hasOnly([...])` sulla `create` del doc lobby include ora anche `matchMode` — dimenticarla causa `permission-denied` silenzioso su ogni nuova creazione lobby (è già successo una volta in questa sessione). Per `currentGameId` invece la rule **non** elenca i minigiochi esistenti (controlla solo che sia una stringa non vuota): un enum lì costringerebbe a ripubblicare le regole a mano ad ogni gioco nuovo, e scordarsene darebbe un `permission-denied` silenzioso solo per quel gioco. Non è comunque un confine di sicurezza reale. Quindi **aggiungere un minigioco non richiede di toccare `firestore.rules`**.

**Le `firestore.rules` non si deployano con GitHub Pages**: il push aggiorna solo il file nel repo, le regole vere vanno incollate/pubblicate a mano dalla Console Firebase (non c'è la firebase CLI installata su questa macchina). Se una modifica alle regole è necessaria per far funzionare una feature, va detto esplicitamente all'utente, altrimenti la feature sembrerà rotta in produzione.

### Secondo minigioco: "Chi l'ha scritto?" + selezione tipo di gioco (18 agosto 2026)

Su richiesta dell'utente, implementato un secondo `GameModule` (`js/games/chilhascritto/`) e, prerequisito architetturale, un vero livello di scelta del tipo di gioco prima di Standard/Personalizzata — prima il `gameId` era hardcoded a `'classifico'` in 3 punti (`firestoreSignaling.js`, `classifico/index.js`, `gameScreen.js`) nonostante l'architettura fosse già pensata per supportare più giochi. Nuovo albero di route: `#mode` → `#gametype` (nuovo, generico via `listGames()`) → `#matchmode` (ora generico, con copy per-gioco in `MATCH_MODE_COPY`) → `#create`. `gameId` ora viaggia in `Session` (`core/state.js`) esattamente come `matchMode`, letto/scritto in `lobbies/{code}.currentGameId`.

Meccanica del nuovo gioco (dettagliata sopra, sezione "Minigioco 2"): fasi `writing`(solo custom)/`guessing`/`voting`/`results`, rotazione equa dell'autore in Personalizzata (`nextAuthor()`), pool di risposte anonime costruito una volta dall'host e broadcast (`buildAnswerPool` in `chilhascritto/voting.js`). Aggiunto anche un contratto opzionale al `GameModule`, `minPlayers(matchMode)`, consultato da `lobbyScreen.js` invece del minimo 2 hardcoded — necessario perché la Personalizzata di questo gioco richiede almeno 4 giocatori (1 autore + 3 guesser) per non essere banale.

**Bug reale trovato dal test isolato prima di qualunque test dal vivo**: la prima versione di `computeVoteResults` (in `chilhascritto/voting.js`) assegnava il punto "voto ricevuto" solo leggendo `entry.authorId`, che per la risposta vera è sempre `null` (non ha un guesser-autore) — risultato, in Personalizzata l'autore del turno non riceveva mai i punti per i voti sulla risposta vera, nonostante fosse una scelta di design esplicitamente confermata con l'utente. Il test isolato (stesso approccio già usato per Classifico Personalizzata: import diretto del modulo, nessun Firestore, simulazione completa di un turno con `assert`) lo ha preso subito confrontando i punteggi attesi con quelli calcolati. Fix: `computeVoteResults` ora controlla esplicitamente `matchState.authorId` per il ramo "risposta vera".

Testato dal vivo end-to-end con `http-server -c-1` (nuovo `.claude/launch.json` dentro il repo stesso, con 4 porte 5173-5176, perché il tool di preview del browser cerca la config nella working directory del progetto — quella preesistente nella cartella padre resta valida per l'uso da terminale manuale): Personalizzata a 4 giocatori (rotazione autore su 2 turni, punteggi verificati voto per voto, reveal con attribuzione autore/voti corretta) e Standard a 2 giocatori, incluso il caso limite di un guesser che scrive per coincidenza lo stesso testo della risposta vera (nessun crash, nessuna confusione tra le due entry nel pool). Verificata anche l'assenza di regressioni su Classifico con lo stesso setup. Nota collaterale (non un bug, comportamento già documentato): più tab sulla stessa porta condividono `localStorage` (quindi il nickname, se scritto in tab diversi troppo ravvicinati, può andare in race) ma non `sessionStorage`/l'utente anonimo — motivo per cui i giocatori nei test restavano comunque distinti nonostante il nickname duplicato visualizzato.

### Terzo minigioco: "Trova la parola" (18 agosto 2026)

Terzo `GameModule` (`js/games/trovalaparola/`), regole e vincoli descritti sopra nella sezione "Minigioco 3". Comparso automaticamente nella schermata `#gametype` senza modifiche a quel file (basta l'icona/tagline in `GAME_META`), confermando che il livello di selezione gioco introdotto col minigioco precedente regge.

Cose decise in fase di implementazione, non dettate esplicitamente dall'utente (quindi rinegoziabili):
- **Punteggio**: cooperativo e graduato, `4 − tentativi usati` a tutti in caso di vittoria, 0 a tutti in caso di sconfitta. L'utente aveva specificato solo "se non indovina tutti perdono": la graduazione serve a dare un senso ai 3 tentativi e a premiare gli indizi buoni.
- **Chi indovina**: rotazione equa con `nextInRotation()`, un turno a testa per ciclo, come già l'autore in "Chi l'ha scritto?".
- **Minimo 3 giocatori**, per lo stesso motivo per cui la Personalizzata di "Chi l'ha scritto?" ne chiede 4.

Rifattorizzazione colta al volo: la rotazione equa del ruolo e lo `shuffle` erano stati scritti dentro `chilhascritto/`, e servivano identici qui — sono stati estratti in `js/games/rotation.js` e `chilhascritto/` è stato riportato a usarli, verificando col suo test isolato che non ci fossero regressioni.

Nella stessa passata, su richiesta dell'utente, in "Chi l'ha scritto?" la fase di voto mostra ora anche la propria risposta (opaca, non cliccabile, etichettata "la tua") invece di ometterla del tutto.

**Un problema di UI trovato durante il test dal vivo**: la schermata di risultato diceva "*{nickname} ci è arrivato in N tentativi*", cioè un participio maschile applicato a chiunque — il nickname non dice come si identifica chi gioca. Riformulato in modo neutro ("Indovinata da {nickname} in N tentativi"). Vale come promemoria per i testi futuri: **evitare participi/aggettivi con accordo di genere riferiti ai giocatori**.

Testato con test isolato (import diretto del modulo, senza Firestore) su normalizzazione, radici, doppioni, entrambe le modalità, vittoria/sconfitta, rotazione; poi dal vivo a 4 giocatori su 4 porte diverse — servono origini separate, non solo tab diversi, altrimenti il `localStorage` condiviso dà a tutti lo stesso nickname e non si riesce a verificare l'attribuzione "di chi è l'indizio". Verificati dal vivo anche gli stili calcolati (✕ rossa, parola barrata, opacità) invece dei soli testi, dato che in questo progetto i controlli solo testuali hanno già lasciato passare due bug visivi.

### Quarto minigioco: "Bugia o Verità?" (18 agosto 2026)

Quarto `GameModule` (`js/games/bugiaoverita/`), regole nella sezione "Minigioco 4". Anche questo comparso da solo nella schermata `#gametype`, e senza toccare `firestore.rules` (grazie alla rimozione dell'enum `currentGameId` fatta col minigioco precedente): il livello di selezione gioco ha ormai retto tre aggiunte di fila.

L'utente aveva chiesto esplicitamente di cercare falle logiche prima di implementare, e ne sono uscite due, entrambe corrette in fase di design (dettagli sopra): la **strategia dominante "marco tutto vero"** e il fatto che in Standard il **punto extra non avesse un destinatario**. Vale come promemoria di metodo: su un gioco a punti conviene sempre fare il conto del valore atteso delle strategie degeneri prima di scrivere il codice — qui la regola "1 punto per ogni assegnazione corretta" sembrava innocua e invece premiava chi non giocava.

Su richiesta dell'utente la scelta si conferma con un bottone dedicato invece di inviare al primo tocco.

**Trappola di debug scoperta qui (ambiente, non app)**: verificando gli stili calcolati, i pulsanti ✕/✓ risultavano tutti dello stesso colore anche con le classi giuste applicate e le regole CSS correttamente caricate. Non era un bug: `.statement-toggle` ha una `transition` e **il pannello browser non era visibile, quindi la pagina non compone frame e le transizioni CSS non avanzano mai** — `getComputedStyle` restituisce all'infinito il valore di partenza. Confermato azzerando la transizione (`el.style.transition = 'none'`), che fa scattare subito il colore giusto. Se in futuro un colore "non si applica" pur essendo tutto corretto, controllare questo prima di dare la caccia a un bug di CSS.

Testato con test isolato (banco affermazioni ben formato, punteggi 3/1, bonus autore solo se non lo scopre nessuno, coda completa con azzeramento dei giudizi, rifiuto di indici non validi/autore che giudica sé stesso) e dal vivo a 4 giocatori su 4 porte: giro completo di 4 set, verificato che "Termina partita" non compaia prima dell'ultimo della coda, anteprima ✕/✓ e cambio idea prima della conferma, e Standard a 2 giocatori. Nessuna regressione sugli altri tre giochi.

### Prossimi passi

- Test su dispositivi reali (telefoni) prima di considerare la modalità offline affidabile in produzione, specialmente: comportamento drag-and-drop touch, negoziazione WebRTC reale tra due dispositivi separati sulla stessa rete Wi-Fi (i test fatti finora sono su due origini `localhost` sulla stessa macchina — provano che il meccanismo funziona, non che regga su reti reali/NAT diversi). Vale anche per "Chi l'ha scritto?" e "Trova la parola", testati finora solo in Full Online.
- Nessun altro bug noto al momento; l'app è considerata funzionalmente completa per l'MVP descritto nel piano.

Il piano di implementazione originale (con le assunzioni discusse e confermate con l'utente) è in `C:\Users\gigat\.claude\plans\sleepy-weaving-wilkinson.md`.
