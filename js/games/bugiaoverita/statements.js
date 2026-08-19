// Set di affermazioni per la modalità Standard: ognuno ha 2 affermazioni vere
// e 1 falsa (`lieIndex` = posizione della bugia).
//
// Criterio di scelta (richiesto esplicitamente dall'utente): devono essere
// DIFFICILI, i giocatori non devono quasi mai sapere con certezza quale sia
// la falsa. Per ottenerlo tutte e tre devono suonare ugualmente incredibili:
// le due vere sono fatti reali controintuitivi, la falsa è di norma un luogo
// comune molto diffuso (quindi "suona vero" più delle altre due). Se una
// frase è palesemente assurda il set è sbagliato — si indovina per esclusione.
//
// REGOLA FONDAMENTALE per chi aggiunge set: le due affermazioni vere devono
// essere vere in modo INEQUIVOCABILE. Un fatto "quasi vero", stimato o
// dibattuto qui non è un difetto estetico ma un bug: il punteggio del round
// dipende da quale sia univocamente la bugia. Nel dubbio, si scarta.
//
// La posizione della bugia NON va curata a mano: ci pensa pickStatementSet()
// a mescolare le tre frasi ad ogni estrazione (vedi in fondo al file).
import { shuffle } from '../rotation.js';

export const STATEMENT_SETS = [
  // ---------- animali ----------
  {
    statements: ['I polpi hanno tre cuori', 'Il sangue dei polpi è blu', 'I pesci rossi hanno una memoria di appena tre secondi'],
    lieIndex: 2,
  },
  {
    statements: [
      'Le impronte digitali dei koala sono quasi indistinguibili da quelle umane',
      'Il cuore dei gamberi si trova nella testa',
      'I camaleonti cambiano colore soprattutto per mimetizzarsi con lo sfondo',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Gli elefanti sono gli unici mammiferi che non riescono a saltare',
      'I tori si infuriano perché vedono il colore rosso',
      'Il koala può dormire anche venti ore al giorno',
    ],
    lieIndex: 1,
  },
  {
    statements: ['Le zebre hanno la pelle nera sotto il pelo', 'Gli orsi polari hanno la pelle nera', 'I cani vedono soltanto in bianco e nero'],
    lieIndex: 2,
  },
  {
    statements: [
      'Le giraffe hanno il nostro stesso numero di vertebre nel collo',
      'Le talpe sono completamente cieche',
      'Il picchio ha una lingua così lunga da avvolgergli il cranio',
    ],
    lieIndex: 1,
  },
  {
    statements: [
      'Le farfalle percepiscono il gusto attraverso le zampe',
      'Le impronte digitali dei gemelli identici sono identiche',
      'Il naso di ogni cane è unico come un\'impronta digitale',
    ],
    lieIndex: 1,
  },
  {
    statements: ['Il polpo ha nove cervelli', 'Le stelle marine non hanno un cervello', 'I pesci non provano dolore'],
    lieIndex: 2,
  },
  {
    statements: [
      'Le formiche tagliafoglie coltivano funghi sottoterra',
      'Ogni anno ingoiamo nel sonno una decina di ragni',
      'Le api riescono a riconoscere i volti umani',
    ],
    lieIndex: 1,
  },
  {
    statements: ['I ghepardi non riescono a ruggire', 'Gli alligatori vivono nelle fogne di New York', 'I delfini dormono con metà cervello alla volta'],
    lieIndex: 1,
  },
  {
    statements: [
      'Il cobra reale è l\'unico serpente che costruisce un nido',
      'Il coccodrillo marino ha il morso più potente mai misurato',
      'Il ghepardo è l\'animale più veloce del mondo in assoluto',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il falco pellegrino in picchiata supera i trecento chilometri orari',
      'Gli elefanti hanno paura dei topi',
      'Gli scoiattoli piantano alberi dimenticando dove nascondono le ghiande',
    ],
    lieIndex: 1,
  },
  {
    statements: [
      'Le tartarughe marine tornano a deporre le uova sulla spiaggia dove sono nate',
      'I lemming si gettano in massa dalle scogliere',
      'I salmoni risalgono il fiume in cui sono nati',
    ],
    lieIndex: 1,
  },
  {
    statements: [
      'I moscerini della frutta furono i primi animali mandati nello spazio',
      'Laika fu il primo animale a orbitare intorno alla Terra',
      'Le mucche non riescono a scendere le scale',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Le lucciole producono luce quasi senza calore',
      'Il sushi significa letteralmente "pesce crudo"',
      'Il gambero mantide colpisce con una forza capace di creare bolle nell\'acqua',
    ],
    lieIndex: 1,
  },
  {
    statements: [
      'I pinguini imperatore si immergono oltre i cinquecento metri di profondità',
      'I dinosauri e i primi esseri umani sono vissuti nello stesso periodo',
      'Gli squali esistevano già prima che sulla Terra comparissero gli alberi',
    ],
    lieIndex: 1,
  },
  {
    statements: [
      'Gli struzzi nascondono la testa sotto la sabbia quando hanno paura',
      'L\'occhio di uno struzzo è più grande del suo cervello',
      'Le lumache possono restare addormentate per anni',
    ],
    lieIndex: 0,
  },
  {
    statements: ['I pipistrelli sono ciechi', 'I gatti non riescono a percepire il sapore dolce', 'Le mosche comuni vivono più di ventiquattro ore'],
    lieIndex: 0,
  },
  {
    statements: [
      'I fenicotteri nascono grigi e diventano rosa per via di quello che mangiano',
      'Il colore dei fenicotteri dipende dai gamberetti che mangiano',
      'Le anatre sono gli unici animali il cui verso non produce eco',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Le mucche stringono amicizie stabili e si stressano se vengono separate',
      'Un maiale non riesce a guardare il cielo senza sdraiarsi',
      'I ricci di mare hanno i denti',
    ],
    lieIndex: 0,
  },
  {
    statements: [
      'Il cuore di un colibrì può superare i mille battiti al minuto',
      'Le formiche non dormono a lungo ma alternano moltissimi micro riposi',
      'Bere caffè aiuta a smaltire più in fretta l\'alcol',
    ],
    lieIndex: 2,
  },

  // ---------- corpo umano ----------
  {
    statements: [
      'Naso e orecchie continuano a cambiare forma per tutta la vita',
      'Capelli e unghie continuano a crescere dopo la morte',
      'Un neonato ha più ossa di un adulto',
    ],
    lieIndex: 1,
  },
  {
    statements: [
      'L\'osso ioide è l\'unico osso del corpo a non essere collegato a nessun altro',
      'La lingua è il muscolo più forte del corpo umano',
      'Non si riesce a respirare e deglutire nello stesso istante',
    ],
    lieIndex: 1,
  },
  {
    statements: [
      'Il cervello consuma circa un quinto dell\'energia del corpo',
      'Il cervello umano continua a svilupparsi ben oltre i vent\'anni',
      'Gli esseri umani percepiscono soltanto cinque sensi',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Uno starnuto può superare i centocinquanta chilometri orari',
      'I bambini hanno più papille gustative degli adulti',
      'Il raffreddore si prende stando al freddo',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Gli occhi azzurri non contengono alcun pigmento blu',
      'L\'osso più piccolo del corpo umano si trova nell\'orecchio',
      'Le persone mancine sono circa il trenta per cento della popolazione',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il corpo umano contiene abbastanza ferro da farne un chiodo',
      'Lo stomaco rigenera il proprio rivestimento in pochi giorni',
      'Gli esseri umani discendono dalle scimmie che vediamo oggi',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Condividiamo circa il sessanta per cento del DNA con le banane',
      'Condividiamo circa il novantotto per cento del DNA con gli scimpanzé',
      'Gli esseri umani sono gli unici primati ad avere il pollice opponibile',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Le dita si raggrinziscono in acqua per una reazione del sistema nervoso',
      'Servono esattamente ventuno giorni per formare una nuova abitudine',
      'Perdiamo circa mezzo chilo di pelle ogni anno',
    ],
    lieIndex: 1,
  },
  {
    statements: [
      'Far scrocchiare le dita provoca artrite',
      'Leggere al buio non danneggia in modo permanente la vista',
      'Il cuore umano batte circa tre miliardi di volte in una vita',
    ],
    lieIndex: 0,
  },
  {
    statements: [
      'Le unghie delle mani crescono più in fretta di quelle dei piedi',
      'Bere otto bicchieri d\'acqua al giorno è una regola medica ufficiale',
      'L\'idea che le carote migliorino la vista notturna nasce da una propaganda di guerra',
    ],
    lieIndex: 1,
  },
  {
    statements: [
      'Lo zucchero rende i bambini iperattivi',
      'Il corpo umano emette una debolissima luce invisibile a occhio nudo',
      'Le impronte della lingua sono uniche come quelle digitali',
    ],
    lieIndex: 0,
  },
  {
    statements: [
      'Lo stomaco umano può sciogliere una lametta da barba',
      'Ogni essere umano ha un odore corporeo unico',
      'Il gruppo sanguigno determina il carattere di una persona',
    ],
    lieIndex: 2,
  },

  // ---------- spazio e scienza ----------
  {
    statements: [
      'Venere ruota su se stessa nel senso opposto rispetto alla Terra',
      'Su Venere un giorno dura più di un anno',
      'Il sangue nelle vene è blu finché non incontra l\'ossigeno',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Le stagioni dipendono dalla distanza della Terra dal Sole',
      'L\'asse terrestre è inclinato di circa ventitré gradi',
      'In gennaio la Terra è più vicina al Sole che in luglio',
    ],
    lieIndex: 0,
  },
  {
    statements: ['Mercurio è il pianeta più caldo del sistema solare', 'Venere è più caldo di Mercurio', 'Il Sole in realtà è di colore bianco'],
    lieIndex: 0,
  },
  {
    statements: [
      'Le stelle cadenti sono stelle che stanno morendo',
      'La Stella Polare non è la stella più luminosa del cielo',
      'Un anno luce misura una distanza e non un tempo',
    ],
    lieIndex: 0,
  },
  {
    statements: [
      'Il lato nascosto della Luna riceve luce solare come quello visibile',
      'Nello spazio gli astronauti non sono privi di gravità ma in caduta libera',
      'La Grande Muraglia cinese è visibile a occhio nudo dalla Luna',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Nell\'universo osservabile ci sono più stelle che granelli di sabbia sulla Terra',
      'La Russia ha una superficie maggiore di quella di Plutone',
      'Nello spazio il corpo umano esploderebbe all\'istante',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Nettuno fu previsto con i calcoli matematici prima di essere osservato',
      'Ci sono più alberi sulla Terra che stelle nella Via Lattea',
      'Su Marte il cielo diventa rossastro al tramonto',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Un fulmine può essere molto più caldo della superficie del Sole',
      'Un fulmine non colpisce mai due volte lo stesso punto',
      'La luce impiega più di un secondo ad arrivare dalla Luna alla Terra',
    ],
    lieIndex: 1,
  },
  {
    statements: [
      'Il diamante e la grafite sono fatti dello stesso elemento',
      'L\'oro puro è così morbido da poter essere piegato con le mani',
      'Il diamante è il minerale più raro che esista',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il ghiaccio secco non è fatto di acqua congelata',
      'In certe condizioni l\'acqua calda può ghiacciare prima di quella fredda',
      'Aggiungere sale fa bollire l\'acqua a temperatura più bassa',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'In montagna l\'acqua bolle a temperatura più bassa',
      'Il vetro delle vetrate antiche è più spesso in basso perché è colato nei secoli',
      'La neve appare bianca pur essendo fatta di ghiaccio trasparente',
    ],
    lieIndex: 1,
  },
  {
    statements: [
      'Il mercurio è l\'unico metallo liquido a temperatura ambiente',
      'L\'idrogeno è l\'elemento più abbondante dell\'universo',
      'Il diamante è la sostanza più abbondante nella crosta terrestre',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'L\'oro è talmente duttile che un solo grammo può essere steso per oltre un chilometro',
      'Negli oceani è disciolta una quantità enorme di oro',
      'La ruggine rende il ferro più resistente',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il suono viaggia più veloce nell\'acqua che nell\'aria',
      'Nel vuoto il suono non si propaga',
      'Il suono viaggia più veloce della luce',
    ],
    lieIndex: 2,
  },

  // ---------- geografia ----------
  {
    statements: [
      'Il Sahara è il deserto più grande del mondo',
      'In Islanda non esistono zanzare',
      'Misurato dalla base sottomarina il Mauna Kea supera l\'Everest',
    ],
    lieIndex: 0,
  },
  {
    statements: [
      'La Russia confina con quattordici stati',
      'Il Canada ha più laghi di tutto il resto del mondo messo insieme',
      'Gli inuit hanno centinaia di parole diverse per dire neve',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'L\'Africa è attraversata sia dall\'equatore sia da entrambi i tropici',
      'Il fuso orario del Nepal è sfalsato di quarantacinque minuti',
      'La Cina è divisa in cinque fusi orari ufficiali',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il Mar Caspio è il lago più grande del mondo',
      'L\'Arabia Saudita importa sabbia per costruire',
      'Nel Triangolo delle Bermuda spariscono molte più navi che altrove',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'L\'Everest cresce di qualche millimetro ogni anno',
      'Il Mar Morto è tecnicamente un lago',
      'Sulla terraferma australiana ci sono vulcani ancora attivi',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'La fossa delle Marianne è più profonda di quanto l\'Everest sia alto',
      'La Groenlandia sembra enorme sulle mappe per via della proiezione usata',
      'La Groenlandia è più grande dell\'Australia',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'L\'Australia è più larga della Luna',
      'La Groenlandia fa parte del Regno di Danimarca',
      'L\'Islanda deve il suo nome al fatto di essere quasi interamente ghiacciata',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il punto più stretto tra Russia e Stati Uniti misura pochi chilometri',
      'La Finlandia ha più saune che automobili',
      'La Svizzera ha uno sbocco sul mare attraverso il Reno navigabile fino all\'oceano',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Esiste un solo paese al mondo con la bandiera non rettangolare',
      'La bandiera del Nepal è composta da due triangoli',
      'La bandiera più antica ancora in uso è quella italiana',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il Vaticano è lo stato più piccolo del mondo',
      'Il Vaticano ha una propria stazione ferroviaria',
      'Il Vaticano è l\'unico stato al mondo senza cittadini',
    ],
    lieIndex: 2,
  },

  // ---------- storia ----------
  {
    statements: [
      'Cleopatra visse più vicina nel tempo allo sbarco sulla Luna che alla costruzione della Grande Piramide',
      'Napoleone era molto più basso della media dei suoi contemporanei',
      'La Guerra dei Cent\'anni durò più di cento anni',
    ],
    lieIndex: 1,
  },
  {
    statements: [
      'La Grande Piramide fu costruita da lavoratori retribuiti e non da schiavi',
      'Il Colosseo poteva essere allagato per simulare battaglie navali',
      'Le piramidi egizie sono più numerose di quelle sudanesi',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'I vichinghi indossavano elmi con le corna',
      'I vichinghi arrivarono in America molto prima di Colombo',
      'Il nome "vichingo" indicava più un\'attività che un popolo',
    ],
    lieIndex: 0,
  },
  {
    statements: [
      'La Statua della Libertà in origine era di colore ramato',
      'La Torre Eiffel avrebbe dovuto essere smontata dopo vent\'anni',
      'Einstein veniva bocciato in matematica a scuola',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'La guerra più breve della storia durò meno di un\'ora',
      'L\'Impero Romano d\'Oriente sopravvisse quasi mille anni a quello d\'Occidente',
      'L\'Impero Romano cadde definitivamente nel 476',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'La Torre di Pisa cominciò a pendere già durante la costruzione',
      'Venezia è costruita su pali di legno conficcati nel fango',
      'Il Colosseo prende il nome dalle sue dimensioni colossali',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Gli antichi romani usavano l\'urina per lavare i tessuti',
      'I gladiatori combattevano quasi sempre fino alla morte',
      'Alcuni gladiatori diventavano vere e proprie celebrità',
    ],
    lieIndex: 1,
  },
  {
    statements: [
      'Oxford è più antica dell\'Impero Azteco',
      'La Coca-Cola alle origini conteneva estratto di foglie di coca',
      'Il primo volo dei fratelli Wright durò più di un\'ora',
    ],
    lieIndex: 2,
  },

  // ---------- tecnologia e marchi ----------
  {
    statements: [
      'Nintendo è stata fondata nel 1889',
      'Nintendo agli inizi produceva carte da gioco',
      'Il nome Wi-Fi è l\'abbreviazione di "Wireless Fidelity"',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Google all\'inizio si chiamava BackRub',
      'Amazon all\'inizio si chiamava Cadabra',
      'Il primo sito web della storia è stato cancellato da tempo',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il primo prodotto letto da un lettore di codici a barre fu una confezione di gomme',
      'La Coca-Cola sarebbe verde senza colorante',
      'Il nome Google deriva da un termine matematico',
    ],
    lieIndex: 1,
  },
  {
    statements: [
      'La prima fotocamera digitale fu costruita da Kodak',
      'Kodak fallì nonostante avesse inventato la fotografia digitale',
      'Il primo telefono cellulare pesava meno di mezzo chilo',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il simbolo della batteria scarica esiste in quasi tutte le lingue',
      'Il termine "bug" informatico nacque da un vero insetto trovato in un computer',
      'Il primo computer occupava lo spazio di una scrivania',
    ],
    lieIndex: 2,
  },

  // ---------- cibo e piante ----------
  {
    statements: [
      'Dal punto di vista botanico le banane sono bacche',
      'Dal punto di vista botanico le fragole non sono bacche',
      'Gli esseri umani usano solo il dieci per cento del proprio cervello',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il miele resta commestibile praticamente per sempre',
      'Se ingoiata, una gomma da masticare resta nello stomaco per sette anni',
      'D\'estate la Torre Eiffel si allunga di una quindicina di centimetri',
    ],
    lieIndex: 1,
  },
  {
    statements: [
      'Il tè verde e il tè nero si ricavano dalla stessa pianta',
      'Le arachidi non sono frutta secca ma legumi',
      'Il cioccolato bianco contiene cacao in polvere',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il bambù può crescere di quasi un metro in un solo giorno',
      'Gli ananas crescono su alberi molto alti',
      'Le mandorle amare contengono una sostanza tossica',
    ],
    lieIndex: 1,
  },
  {
    statements: [
      'I pomodori all\'inizio erano considerati velenosi in Europa',
      'La patata arrivò in Europa dalle Americhe',
      'Il peperoncino è originario dell\'Asia',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il wasabi servito nella maggior parte dei ristoranti non è vero wasabi',
      'La noce moscata in dosi elevate ha effetti tossici',
      'Il pane raffermo diventa duro perché perde acqua',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Toccare un rospo può far venire le verruche',
      'I mirtilli galleggiano nell\'acqua',
      'Il caffè decaffeinato contiene comunque un po\' di caffeina',
    ],
    lieIndex: 0,
  },
  {
    statements: [
      'Il frutto del cacao cresce direttamente sul tronco della pianta',
      'La vaniglia naturale proviene da un\'orchidea',
      'Lo zafferano si ricava dalle radici di un fiore',
    ],
    lieIndex: 2,
  },

  // ---------- lingue, arte, sport ----------
  {
    statements: [
      'Il portoghese ha più madrelingua dell\'italiano',
      'In Brasile si parla portoghese e non spagnolo',
      'Lo spagnolo è la lingua con più madrelingua al mondo',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Nella pallavolo si può toccare la palla con qualsiasi parte del corpo',
      'Il basket è stato inventato usando dei cesti da frutta',
      'Nel tennis il punteggio parte da uno',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Le Olimpiadi antiche prevedevano gare di poesia',
      'Nelle prime Olimpiadi moderne le medaglie d\'oro erano d\'argento',
      'La maratona ha sempre avuto la stessa lunghezza fin dall\'antichità',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Leonardo da Vinci scriveva usando la scrittura speculare',
      'La Gioconda è dipinta su tavola di legno e non su tela',
      'La Gioconda è il dipinto più grande del Louvre',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Le statue greche antiche erano dipinte con colori vivaci',
      'Il colore blu era rarissimo e costosissimo nella pittura antica',
      'Il marmo bianco era la scelta estetica preferita dagli antichi greci',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Mozart compose la sua prima musica da bambino piccolissimo',
      'Beethoven continuò a comporre da sordo',
      'Il pianoforte è nato prima del clavicembalo',
    ],
    lieIndex: 2,
  },

  // ---------- miscellanea difficile ----------
  {
    statements: [
      'Il cuore di un toporagno batte più di mille volte al minuto',
      'Le monete lanciate da un grattacielo possono uccidere una persona',
      'Un fulmine può colpire lo stesso edificio più volte in un anno',
    ],
    lieIndex: 1,
  },
  {
    statements: [
      'Esistono più combinazioni possibili in un mazzo di carte mescolato che stelle nella galassia',
      'Mescolando bene un mazzo si ottiene quasi certamente un ordine mai visto prima',
      'Un mazzo di carte francesi contiene cinquantaquattro carte senza jolly',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il numero zero è arrivato in Europa molto dopo gli altri numeri',
      'I numeri che chiamiamo arabi hanno origine indiana',
      'I romani avevano un simbolo per lo zero',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'In un gruppo di ventitré persone è più probabile che due compiano gli anni lo stesso giorno che il contrario',
      'La probabilità di fare testa lanciando una moneta non cambia dopo dieci teste di fila',
      'Alla roulette il rosso diventa più probabile dopo molti neri consecutivi',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il simbolo del pericolo biologico fu disegnato apposta per non ricordare nulla di esistente',
      'Il colore arancione prende il nome dal frutto e non viceversa',
      'Il colore rosa esiste nello spettro della luce',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'La plastica impiega centinaia di anni a degradarsi',
      'Il vetro può essere riciclato infinite volte',
      'La carta può essere riciclata infinite volte',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il fuso orario più avanti al mondo è quasi un giorno avanti rispetto a quello più indietro',
      'Esistono fusi orari sfalsati di mezz\'ora',
      'Tutti i fusi orari del mondo sono sfalsati di un\'ora esatta',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il Titanic aveva scialuppe per meno della metà dei passeggeri',
      'Il Titanic affondò durante il suo viaggio inaugurale',
      'Il Titanic era stato dichiarato ufficialmente inaffondabile dai costruttori',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il primo film della storia dura pochi secondi',
      'Il cinema muto non era davvero silenzioso durante le proiezioni',
      'Il primo film a colori è degli anni Sessanta',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'La Nutella fu inventata per sostituire il cioccolato scarseggiante nel dopoguerra',
      'Il tiramisù è un dolce relativamente recente',
      'La pasta fu portata in Italia da Marco Polo',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il pomodoro nella pizza napoletana arrivò secoli dopo la nascita della pizza',
      'La pizza margherita prende il nome da una regina',
      'La pizza è stata inventata a Roma',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Gli aerei di linea scaricano i rifiuti dei bagni in volo',
      'Gli aerei possono volare anche perdendo tutti i motori, planando',
      'La parte più pericolosa di un volo sono decollo e atterraggio',
    ],
    lieIndex: 0,
  },
  {
    statements: [
      'L\'ossigeno nelle maschere degli aerei dura pochi minuti',
      'Le luci in cabina vengono abbassate all\'atterraggio per abituare gli occhi',
      'I finestrini degli aerei sono rotondi per motivi puramente estetici',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il Big Ben è il nome della campana e non della torre',
      'La torre dell\'orologio di Londra ha cambiato nome nel 2012',
      'Il Big Ben è l\'orologio più grande del mondo',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'In Giappone ci sono più animali domestici che bambini',
      'In Giappone esistono distributori automatici quasi ovunque',
      'In Giappone è vietato possedere animali domestici in città',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Una nuvola di medie dimensioni può pesare centinaia di tonnellate',
      'La grandine può formarsi anche in piena estate',
      'La pioggia cade sempre a velocità costante indipendentemente dalla goccia',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'L\'Antartide contiene circa il settanta per cento dell\'acqua dolce del pianeta',
      'In Antartide esistono zone senza neve da millenni',
      'In Antartide non è mai stata registrata pioggia',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il deserto del Sahara è stato verde e ricco d\'acqua in passato',
      'Nel Sahara può nevicare',
      'Nel Sahara la temperatura non scende mai sotto lo zero',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Lo stato del Wyoming ha meno di un milione di abitanti',
      'Ci sono più persone a Tokyo che in molti stati interi',
      'La Città del Vaticano ha più di diecimila abitanti',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'La lingua ha zone diverse dedicate ai diversi sapori',
      'Il gusto dipende in larga parte dall\'olfatto',
      'Esiste un quinto gusto riconosciuto chiamato umami',
    ],
    lieIndex: 0,
  },
  {
    statements: [
      'Il ferro da stiro è stato inventato prima dell\'elettricità',
      'Il microonde è stato scoperto per caso',
      'Il forno a microonde cuoce gli alimenti dall\'interno verso l\'esterno',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Gli specchi non hanno un colore perfettamente neutro',
      'Uno specchio riflette leggermente più il verde',
      'Guardandosi allo specchio ci si vede esattamente come ci vedono gli altri',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il suono di una frusta è un piccolo bang supersonico',
      'Un colibrì può battere le ali più di cinquanta volte al secondo',
      'Le zanzare sono attratte soprattutto dal colore rosso',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Le impronte digitali si formano prima della nascita',
      'Anche i koala e alcuni primati hanno impronte digitali',
      'Le impronte digitali cambiano leggermente con l\'età',
    ],
    lieIndex: 2,
  },
  {
    statements: [
      'Il sale era usato come forma di pagamento nell\'antichità',
      'La parola "salario" deriva dal sale',
      'Il sale era considerato di poco valore perché facilissimo da produrre',
    ],
    lieIndex: 2,
  },
];

/**
 * Estrae un set non ancora usato in questa partita, se possibile, e ne
 * mescola le tre frasi.
 *
 * Il rimescolamento non è un dettaglio: scrivendo i set a mano la bugia
 * finisce quasi sempre in fondo (è l'ordine naturale — prima i due fatti
 * veri, poi il luogo comune falso). In un file di un centinaio di set la
 * bugia risultava in terza posizione nel ~70% dei casi, cioè "nel dubbio
 * scegli l'ultima" sarebbe stata una strategia vincente il doppio del
 * dovuto. Mescolando qui la posizione torna equiprobabile e chi aggiunge
 * nuovi set non deve preoccuparsi di bilanciarli.
 */
export function pickStatementSet(usedIds = []) {
  const allIds = STATEMENT_SETS.map((_, i) => i);
  const unused = allIds.filter((i) => !usedIds.includes(i));
  const pool = unused.length > 0 ? unused : allIds;
  const id = pool[Math.floor(Math.random() * pool.length)];

  const set = STATEMENT_SETS[id];
  const shuffled = shuffle(set.statements.map((text, i) => ({ text, isLie: i === set.lieIndex })));
  return {
    id,
    statements: shuffled.map((s) => s.text),
    lieIndex: shuffled.findIndex((s) => s.isLie),
  };
}
