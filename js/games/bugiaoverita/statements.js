// Set di affermazioni per la modalità Standard: ognuno ha 2 affermazioni vere
// e 1 falsa (`lieIndex` = posizione della bugia). Criteri di scelta: cultura
// generale verificabile, niente domande di attualità che invecchiano, e la
// bugia non deve essere in posizione fissa (varia fra i set, altrimenti si
// impara lo schema invece di ragionare).
export const STATEMENT_SETS = [
  { statements: ['Il Sole è una stella', "L'acqua bolle a 100°C al livello del mare", 'La Luna è più grande della Terra'], lieIndex: 2 },
  { statements: ['Il cuore umano ha quattro camere', 'I pipistrelli sono uccelli', 'Il diamante è composto di carbonio'], lieIndex: 1 },
  { statements: ['La Torre Eiffel si trova a Parigi', 'Il Nilo scorre in Africa', "L'Everest si trova nelle Ande"], lieIndex: 2 },
  { statements: ['Marte è chiamato il pianeta rosso', 'Gli squali sono mammiferi', 'Il miele si conserva molto a lungo'], lieIndex: 1 },
  { statements: ['Gli struzzi non sanno volare', 'Il Giappone è formato da isole', 'Il sale da cucina è un metallo'], lieIndex: 2 },
  { statements: ['Leonardo da Vinci dipinse la Gioconda', 'La Grande Muraglia si trova in Cina', 'Il Colosseo fu costruito nel Rinascimento'], lieIndex: 2 },
  { statements: ['Le api producono il miele', 'I ragni hanno sei zampe', "Il ghiaccio galleggia sull'acqua"], lieIndex: 1 },
  { statements: ["L'Australia è sia uno stato che un continente", 'Il Portogallo confina con la Spagna', 'Il Mar Morto è il lago più profondo del mondo'], lieIndex: 2 },
  { statements: ['Il cervello consuma energia anche quando dormiamo', 'I delfini sono pesci', 'Il bambù cresce molto rapidamente'], lieIndex: 1 },
  { statements: ['La Terra impiega circa 365 giorni a girare intorno al Sole', 'Venere è il pianeta più vicino al Sole', "L'ossigeno è indispensabile alla respirazione umana"], lieIndex: 1 },
  { statements: ['Il ferro arrugginisce a contatto con acqua e aria', 'La Norvegia si trova in Europa', 'I cammelli immagazzinano acqua nella gobba'], lieIndex: 2 },
  { statements: ['Il caffè si ricava da semi tostati', "L'Antartide è il continente più freddo", 'I pinguini vivono al Polo Nord'], lieIndex: 2 },
  { statements: ["Roma è la capitale d'Italia", 'Il violino ha quattro corde', 'La Groenlandia è più grande dell\'Africa'], lieIndex: 2 },
  { statements: ['Gli elefanti sono i mammiferi terrestri più grandi', 'Il vetro si ottiene dalla sabbia', 'Le tigri vivono in Africa allo stato selvatico'], lieIndex: 2 },
  { statements: ['Il DNA contiene le informazioni genetiche', 'Il suono viaggia più veloce della luce', 'La Luna influenza le maree'], lieIndex: 1 },
  { statements: ['Shakespeare scrisse Romeo e Giulietta', 'La capitale della Spagna è Barcellona', 'Il tè verde e il tè nero vengono dalla stessa pianta'], lieIndex: 1 },
  { statements: ['Gli alberi producono ossigeno', 'Il mercurio è solido a temperatura ambiente', 'Il polmone destro ha tre lobi'], lieIndex: 1 },
  { statements: ['I Mondiali di calcio si giocano ogni quattro anni', 'Il basket nacque negli Stati Uniti', 'Una partita di calcio dura 100 minuti'], lieIndex: 2 },
  { statements: ['Il sale scioglie il ghiaccio', 'Il bronzo è una lega di rame e stagno', 'I serpenti hanno le palpebre'], lieIndex: 2 },
  { statements: ['Il Vesuvio è un vulcano attivo', 'Venezia è costruita su isole', 'La Sicilia è più piccola della Sardegna'], lieIndex: 2 },
];

/** Estrae un set non ancora usato in questa partita, se possibile. */
export function pickStatementSet(usedIds = []) {
  const allIds = STATEMENT_SETS.map((_, i) => i);
  const unused = allIds.filter((i) => !usedIds.includes(i));
  const pool = unused.length > 0 ? unused : allIds;
  const id = pool[Math.floor(Math.random() * pool.length)];
  return { id, statements: [...STATEMENT_SETS[id].statements], lieIndex: STATEMENT_SETS[id].lieIndex };
}
