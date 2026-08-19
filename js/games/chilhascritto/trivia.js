// Banco di domande per la modalità Standard: il sistema fa da "banco" e
// conosce già la risposta corretta (i giocatori no, la scoprono solo in
// fase di voto).
//
// Criterio di scelta (importante, richiesto esplicitamente dall'utente):
// le domande devono essere DIFFICILI — quasi nessuno deve sapere con
// certezza la risposta giusta. È il cuore del gioco: se la risposta vera è
// nota a tutti, nessuno vota i bluff e non c'è partita. Funzionano bene:
// capitali "controintuitive" (quelle famose sono spesso la città sbagliata),
// nomi tecnici di oggetti comuni, primati sorprendenti, date precise.
// La risposta deve restare breve e verificabile: è un party game, non un
// esame — se è lunga o discutibile il round finisce in litigio.
export const TRIVIA_QUESTIONS = [
  // --- capitali che quasi nessuno indovina ---
  { question: "Qual è la capitale dell'Australia?", answer: 'Canberra' },
  { question: 'Qual è la capitale della Svizzera?', answer: 'Berna' },
  { question: 'Qual è la capitale della Turchia?', answer: 'Ankara' },
  { question: 'Qual è la capitale del Brasile?', answer: 'Brasilia' },
  { question: 'Qual è la capitale del Marocco?', answer: 'Rabat' },
  { question: 'Qual è la capitale del Vietnam?', answer: 'Hanoi' },
  { question: 'Qual è la capitale della Nigeria?', answer: 'Abuja' },
  { question: 'Qual è la capitale del Canada?', answer: 'Ottawa' },
  { question: 'Qual è la capitale della Nuova Zelanda?', answer: 'Wellington' },
  { question: 'Qual è la capitale del Bhutan?', answer: 'Thimphu' },
  { question: 'Qual è la capitale della Mongolia?', answer: 'Ulan Bator' },
  { question: 'Qual è la capitale del Kazakistan?', answer: 'Astana' },
  { question: "Qual è la capitale dell'Islanda?", answer: 'Reykjavík' },
  { question: 'Qual è la capitale del Myanmar?', answer: 'Naypyidaw' },
  { question: 'Qual è la città sede del governo del Sudafrica?', answer: 'Pretoria' },
  { question: 'Qual è la città sede del governo della Bolivia?', answer: 'La Paz' },
  { question: 'Qual è la capitale della Croazia?', answer: 'Zagabria' },
  { question: 'Qual è la capitale della Slovenia?', answer: 'Lubiana' },
  { question: "Qual è la capitale dell'Ecuador?", answer: 'Quito' },
  { question: 'Qual è la capitale della Malesia?', answer: 'Kuala Lumpur' },

  // --- nomi tecnici di cose comuni ---
  { question: "Come si chiama la punta rigida all'estremità dei lacci delle scarpe?", answer: 'Aglietto' },
  { question: 'Come si chiama il segno & ?', answer: 'E commerciale' },
  { question: 'Come si chiama lo spazio tra le due sopracciglia?', answer: 'Glabella' },
  { question: 'Come si chiama la parte bianca a mezzaluna alla base delle unghie?', answer: 'Lunula' },
  { question: 'Come si chiama il solco verticale tra naso e labbro superiore?', answer: 'Filtro' },
  { question: 'Come si chiama il simbolo # usato in musica?', answer: 'Il diesis' },
  { question: 'Come si chiama la mossa degli scacchi che coinvolge re e torre?', answer: "L'arrocco" },
  { question: 'Come si chiama la tecnica di pittura su intonaco fresco?', answer: "L'affresco" },

  // --- fobie e nomi di scienze ---
  { question: 'Come si chiama la paura del numero 13?', answer: 'Triscaidecafobia' },
  { question: 'Come si chiama la paura di parlare in pubblico?', answer: 'Glossofobia' },
  { question: 'Come si chiama la paura degli specchi?', answer: 'Eisoptrofobia' },
  { question: 'Come si chiama il timore irrazionale dei numeri?', answer: 'Aritmofobia' },
  { question: 'Come si chiama la paura dei luoghi affollati?', answer: 'Agorafobia' },
  { question: 'Come si chiama la scienza che studia i funghi?', answer: 'La micologia' },
  { question: 'Come si chiama la scienza che studia i terremoti?', answer: 'La sismologia' },
  { question: 'Come si chiama la scienza che studia gli insetti?', answer: "L'entomologia" },
  { question: 'Come si chiama la scienza che studia gli uccelli?', answer: "L'ornitologia" },
  { question: 'Come si chiama lo studio delle monete antiche?', answer: 'La numismatica' },

  // --- animali ---
  { question: "Come si chiama il maschio dell'ape?", answer: 'Il fuco' },
  { question: 'Come si chiama la femmina del cinghiale?', answer: 'La scrofa' },
  { question: 'Come si chiama il piccolo del canguro?', answer: 'Joey' },
  { question: 'Quanti cuori ha un polpo?', answer: 'Tre' },
  { question: 'Di che colore è il sangue dei polpi?', answer: 'Blu' },
  { question: "Qual è l'animale più veloce del mondo?", answer: 'Il falco pellegrino' },
  { question: 'Qual è il pesce più veloce del mondo?', answer: 'Il pesce vela' },
  { question: "Qual è l'unico mammifero che non riesce a saltare?", answer: "L'elefante" },
  { question: "Qual è l'unico serpente che costruisce un nido?", answer: 'Il cobra reale' },
  { question: 'Quale animale ha il morso più potente mai misurato?', answer: 'Il coccodrillo marino' },
  { question: 'Quale animale ha impronte digitali quasi identiche a quelle umane?', answer: 'Il koala' },
  { question: 'Quante camere ha lo stomaco di una mucca?', answer: 'Quattro' },
  { question: "Quanti muscoli ha circa la proboscide di un elefante?", answer: 'Circa 40.000' },
  { question: "Qual è l'animale nazionale della Scozia?", answer: "L'unicorno" },
  { question: 'Quale grande felino non riesce a ruggire?', answer: 'Il ghepardo' },

  // --- corpo umano ---
  { question: "Come si chiama l'osso che non è collegato a nessun altro osso del corpo?", answer: "L'osso ioide" },
  { question: 'Quante ossa ha circa un neonato?', answer: 'Circa 300' },
  { question: 'Quante ossa ha un piede umano?', answer: '26' },
  { question: 'Qual è la frattura più frequente nel corpo umano?', answer: 'La clavicola' },
  { question: 'Qual è il muscolo più forte in rapporto alle sue dimensioni?', answer: 'Il massetere' },
  { question: "Qual è l'organo più grande del corpo umano?", answer: 'La pelle' },
  { question: 'Quale organo umano è capace di rigenerarsi completamente?', answer: 'Il fegato' },
  { question: 'Quanti litri di sangue ha in media un adulto?', answer: 'Circa 5' },
  { question: 'Quante volte batte in media il cuore umano in un giorno?', answer: 'Circa 100.000' },
  { question: 'In quale parte del corpo si trova la staffa, il più piccolo osso umano?', answer: "Nell'orecchio" },

  // --- scienza e spazio ---
  { question: 'Qual è il simbolo chimico del tungsteno?', answer: 'W' },
  { question: 'Qual è il simbolo chimico del piombo?', answer: 'Pb' },
  { question: 'Qual è il simbolo chimico del potassio?', answer: 'K' },
  { question: "Qual è il simbolo chimico dell'argento?", answer: 'Ag' },
  { question: 'Qual è il simbolo chimico dello stagno?', answer: 'Sn' },
  { question: "Qual è l'elemento più abbondante nella crosta terrestre?", answer: "L'ossigeno" },
  { question: 'Quanti elementi contiene oggi la tavola periodica?', answer: '118' },
  { question: 'Qual è il metallo più leggero?', answer: 'Il litio' },
  { question: 'Che cosa misura la scala di Mohs?', answer: 'La durezza dei minerali' },
  { question: 'Qual è la montagna più alta del sistema solare?', answer: 'Olympus Mons, su Marte' },
  { question: 'Qual è il pianeta più caldo del sistema solare?', answer: 'Venere' },
  { question: 'Quale pianeta ruota su se stesso in senso contrario agli altri?', answer: 'Venere' },
  { question: 'Quanto impiega la luce del Sole ad arrivare sulla Terra?', answer: 'Circa 8 minuti' },
  { question: 'Qual è la stella più vicina al Sole?', answer: 'Proxima Centauri' },
  { question: 'Che cosa misura un anno luce?', answer: 'Una distanza' },
  { question: 'Come si chiamava il primo satellite artificiale della storia?', answer: 'Sputnik 1' },
  { question: 'Chi è stato il secondo uomo a camminare sulla Luna?', answer: 'Buzz Aldrin' },
  { question: 'Come si chiama il numero 1 seguito da cento zeri?', answer: 'Googol' },
  { question: 'Quanti secondi ci sono in 24 ore?', answer: '86.400' },
  { question: "Come si chiama lo strumento che misura l'umidità dell'aria?", answer: "L'igrometro" },
  { question: 'Come si chiama il pigmento che rende rossi i pomodori?', answer: 'Il licopene' },

  // --- geografia e primati ---
  { question: 'Qual è il deserto più grande del mondo?', answer: "L'Antartide" },
  { question: 'Qual è il lago più profondo del mondo?', answer: 'Il Bajkal' },
  { question: "Qual è l'unico mare al mondo senza coste?", answer: 'Il Mar dei Sargassi' },
  { question: "Qual è l'unico stato al mondo con la bandiera non rettangolare?", answer: 'Il Nepal' },
  { question: 'Qual è il fiume più lungo d\'Europa?', answer: 'Il Volga' },
  { question: 'Qual è il paese più lungo del mondo da nord a sud?', answer: 'Il Cile' },
  { question: 'Quale paese ha il maggior numero di fusi orari?', answer: 'La Francia' },
  { question: 'Quale paese ospita il maggior numero di piramidi al mondo?', answer: 'Il Sudan' },
  { question: 'Quale paese ha il maggior numero di isole al mondo?', answer: 'La Svezia' },
  { question: 'Quale paese ha il maggior numero di lingue ufficiali?', answer: 'La Bolivia' },
  { question: 'In quale paese si trova la città di Timbuctù?', answer: 'Il Mali' },
  { question: 'Qual è lo stato americano più piccolo?', answer: 'Il Rhode Island' },
  { question: 'Quanti stati americani confinano con il Messico?', answer: 'Quattro' },
  { question: 'Qual è il secondo stato più piccolo del mondo dopo il Vaticano?', answer: 'Monaco' },

  // --- storia ---
  { question: "In che anno cadde l'Impero Romano d'Occidente?", answer: '476' },
  { question: 'In che anno cadde Costantinopoli?', answer: '1453' },
  { question: 'Quanto durò davvero la Guerra dei Cent\'anni?', answer: '116 anni' },
  { question: 'Quanto durò la guerra più breve della storia?', answer: 'Circa 38 minuti' },
  { question: 'Chi fu il primo imperatore romano?', answer: 'Augusto' },
  { question: 'Quale civiltà inventò la scrittura cuneiforme?', answer: 'I Sumeri' },
  { question: 'Come si chiamava il cavallo di Napoleone?', answer: 'Marengo' },
  { question: 'Come si chiamava il cavallo di Alessandro Magno?', answer: 'Bucefalo' },
  { question: 'In che anno affondò il Titanic?', answer: '1912' },
  { question: "In che anno venne fondata l'ONU?", answer: '1945' },

  // --- arte, musica, sport, tecnologia ---
  { question: "Chi ha dipinto 'La ragazza con l'orecchino di perla'?", answer: 'Vermeer' },
  { question: 'Qual è il museo più visitato al mondo?', answer: 'Il Louvre' },
  { question: 'Quanti tasti ha un pianoforte standard?', answer: '88' },
  { question: 'Quanti tasti neri ha un pianoforte standard?', answer: '36' },
  { question: 'Quante corde ha un\'arpa da concerto?', answer: '47' },
  { question: 'In quale sport si usa il termine "albatross"?', answer: 'Il golf' },
  { question: 'Quanti minuti dura un quarto nel basket NBA?', answer: '12' },
  { question: 'Chi ha inventato il World Wide Web?', answer: 'Tim Berners-Lee' },
  { question: 'Chi ha creato il sistema operativo Linux?', answer: 'Linus Torvalds' },
  { question: 'In che anno è stato presentato il primo iPhone?', answer: '2007' },
  { question: 'Quanti byte ci sono in un kilobyte secondo la vecchia convenzione informatica?', answer: '1024' },
];

/** Estrae una domanda non ancora usata in questa partita, se possibile. */
export function pickTrivia(usedIds = []) {
  const allIds = TRIVIA_QUESTIONS.map((_, i) => i);
  const unused = allIds.filter((i) => !usedIds.includes(i));
  const pool = unused.length > 0 ? unused : allIds;
  const id = pool[Math.floor(Math.random() * pool.length)];
  return { id, question: TRIVIA_QUESTIONS[id].question, answer: TRIVIA_QUESTIONS[id].answer };
}
