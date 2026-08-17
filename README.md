# QuizParty

Party game multiplayer da giocare direttamente dal browser (nessuna app da installare). Due modalità:

- **🌐 Full Online** — comunicazione continua via internet per tutta la partita.
- **🚌 Partial Offline** — ci si aggancia una volta (serve internet solo in questa fase), poi si può continuare a giocare senza, telefono-a-telefono (es. in viaggio, su un bus).

Primo minigioco incluso: **Classifico** — viene estratta una domanda ("Chi è il più simpatico? Metti in ordine i giocatori dal più al meno simpatico"), ogni giocatore ordina gli altri con un trascinamento touch-friendly, il sistema calcola una classifica aggregata e la confronta con quella di ognuno (verde = indovinato, rosso = diverso), assegnando punti. L'architettura è pensata per aggiungere altri minigiochi in futuro — vedi [CLAUDE.md](./CLAUDE.md) per i dettagli tecnici.

100% gratuito: hosting su GitHub Pages, backend su Firebase (piano gratuito Spark).

## ⚠️ Limite noto della modalità Partial Offline

Senza un server TURN (che richiederebbe un servizio a pagamento) la connessione diretta tra i telefoni regge in modo affidabile solo se, al momento dell'aggancio in lobby, i dispositivi sono sulla stessa rete Wi-Fi/hotspot locale. Con connessioni dati cellulari diverse la connessione diretta potrebbe non riuscire a stabilirsi.

## Setup (una tantum)

### 1. Crea un progetto Firebase gratuito

Questo passaggio richiede il tuo account Google e non può essere automatizzato:

1. Vai su [console.firebase.google.com](https://console.firebase.google.com) ed effettua l'accesso.
2. "Aggiungi progetto" → dagli un nome (es. `quizparty`) → puoi disattivare Google Analytics, non serve.
3. Nel progetto, vai su **Build > Firestore Database** → "Crea database" → scegli una località vicina a te → avvia in **modalità produzione** (le regole di sicurezza sono già pronte in `firestore.rules`).
4. Vai su **Build > Authentication** → scheda "Sign-in method" → abilita il provider **Anonimo**.
5. Vai su **Impostazioni progetto** (icona ingranaggio) → in basso "Le tue app" → clicca l'icona web `</>` → registra una nuova app web (non serve Firebase Hosting).
6. Copia i valori mostrati (`apiKey`, `authDomain`, `projectId`, ecc.) dentro [js/config/firebase-config.js](./js/config/firebase-config.js), sostituendo i placeholder `REPLACE_ME`.

### 2. Pubblica le regole di sicurezza Firestore

Nella Console Firebase → Firestore Database → scheda "Regole", incolla il contenuto di [firestore.rules](./firestore.rules) e pubblica. (In alternativa, con `firebase-tools` installato: `npx firebase-tools deploy --only firestore:rules` dopo `firebase login` e `firebase use <project-id>`.)

### 3. Deploy su GitHub Pages

Il sito è già pubblicato automaticamente dal branch `main` (root) del repository [Gigat02/QuizParty](https://github.com/Gigat02/QuizParty) su GitHub Pages, all'indirizzo:

```
https://gigat02.github.io/QuizParty/
```

Ogni `git push` su `main` aggiorna il sito in pochi minuti. Nessuna build da eseguire.

## Sviluppo locale

Nessun bundler richiesto, ma serve un server statico (i moduli ES e il service worker non funzionano da `file://`):

```bash
npx serve .
```

poi apri l'URL mostrato (es. `http://localhost:3000`).

Per testare **Full Online** con due giocatori: apri due finestre browser in incognito/profili diversi.

Per testare **Partial Offline**: stesso setup a due finestre; osserva nella lobby i badge di stato P2P passare a "Connesso" (è una vera negoziazione WebRTC, valida anche su localhost), poi prova a mettere entrambe le finestre offline da DevTools → Network una volta avviata la partita: il gioco deve continuare a funzionare.

## Struttura del progetto

Vedi [CLAUDE.md](./CLAUDE.md) per l'architettura completa (interfaccia Transport, GameModule, schema dati Firestore, limiti noti dell'MVP).
