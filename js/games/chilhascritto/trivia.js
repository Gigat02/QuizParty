// Banco di domande per la modalità Standard: il sistema fa da "banco" e
// conosce già la risposta corretta (i giocatori no, la scoprono solo in
// fase di voto). Domande da cultura generale facile, pensate per lasciare
// spazio a risposte finte plausibili.
export const TRIVIA_QUESTIONS = [
  { question: "Qual è la capitale dell'Australia?", answer: 'Canberra' },
  { question: 'In che anno è caduto il Muro di Berlino?', answer: '1989' },
  { question: 'Quante zampe ha un ragno?', answer: '8' },
  { question: 'Qual è il pianeta più vicino al Sole?', answer: 'Mercurio' },
  { question: 'Come si chiama la moneta ufficiale del Giappone?', answer: 'Yen' },
  { question: "Qual è l'osso più lungo del corpo umano?", answer: 'Il femore' },
  { question: 'In quale continente si trova l\'Egitto?', answer: 'Africa' },
  { question: 'Qual è il fiume più lungo del mondo?', answer: 'Il Nilo' },
  { question: 'Quanti lati ha un ettagono?', answer: '7' },
  { question: 'Qual è l\'animale terrestre più veloce del mondo?', answer: 'Il ghepardo' },
  { question: 'In quale città si trova la Torre Eiffel?', answer: 'Parigi' },
  { question: 'Quanti giorni ha febbraio in un anno bisestile?', answer: '29' },
  { question: 'Qual è l\'unico metallo liquido a temperatura ambiente?', answer: 'Il mercurio' },
  { question: 'Quante corde ha una chitarra classica?', answer: '6' },
  { question: 'In quale sport si usa il termine "scacco matto"?', answer: 'Negli scacchi' },
  { question: 'Come si chiama il piccolo della rana?', answer: 'Il girino' },
  { question: 'Quale colore si ottiene mescolando blu e giallo?', answer: 'Il verde' },
  { question: "Qual è l'oceano più grande del mondo?", answer: 'Il Pacifico' },
  { question: 'In quale nazione è nata la pizza margherita?', answer: 'Italia' },
  { question: 'Quanti denti ha di solito un adulto umano?', answer: '32' },
  { question: 'Qual è il paese più popoloso del mondo?', answer: "L'India" },
  { question: 'Quante ossa ha il corpo umano adulto?', answer: '206' },
  { question: 'Come si chiama il gruppo di leoni?', answer: 'Branco' },
  { question: 'In che squadra ha giocato più a lungo Maradona in Italia?', answer: 'Napoli' },
  { question: 'Qual è il vulcano attivo più alto d\'Europa?', answer: "L'Etna" },
];

/** Estrae una domanda non ancora usata in questa partita, se possibile. */
export function pickTrivia(usedIds = []) {
  const allIds = TRIVIA_QUESTIONS.map((_, i) => i);
  const unused = allIds.filter((i) => !usedIds.includes(i));
  const pool = unused.length > 0 ? unused : allIds;
  const id = pool[Math.floor(Math.random() * pool.length)];
  return { id, question: TRIVIA_QUESTIONS[id].question, answer: TRIVIA_QUESTIONS[id].answer };
}
