import { h, clear } from '../../core/dom.js';
import { ACTION_KIND } from '../../transport/transport.js';
import { registerGame } from '../registry.js';
import { nextInRotation, shuffle } from '../rotation.js';
import { pickWord } from './words.js';
import { computeClueResults, sameWord } from './matching.js';

const MAX_WORD_LENGTH = 30;
const MAX_ATTEMPTS = 3;

function playerInfo(players, playerId) {
  return players.find((p) => p.playerId === playerId) || { playerId, nickname: '???', color: '#ccc' };
}

/**
 * Una parola sola: via ogni spazio interno (il gioco vieta le frasi) e taglio
 * di lunghezza. Il testo resta con le maiuscole scritte dal giocatore — la UI
 * mostra l'originale, i confronti passano sempre da matching.js.
 */
function sanitizeWord(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, '').slice(0, MAX_WORD_LENGTH);
}

/** Chi deve scrivere un indizio: tutti tranne l'indovino (in Personalizzata include chi ha scelto la parola). */
function clueGivers(matchState) {
  return matchState.playerOrder.filter((id) => id !== matchState.guesserId);
}

/** @param {{matchMode?: 'standard'|'custom'}} [config] usato solo alla primissima inizializzazione */
function initRoundState(players, previousMatchState, config = {}) {
  const playerOrder = players.map((p) => p.playerId);
  const matchMode = previousMatchState?.matchMode ?? config.matchMode ?? 'standard';
  const scores = { ...(previousMatchState?.scores || {}) };
  for (const id of playerOrder) if (!(id in scores)) scores[id] = 0;

  // Rotazione equa dell'indovino: un turno a testa per ciclo (vedi rotation.js).
  const { queue: guesserQueue, index: guesserQueueIndex, playerId: guesserId } = nextInRotation(
    previousMatchState?.guesserQueue,
    previousMatchState?.guesserQueueIndex,
    playerOrder
  );

  const common = {
    gameId: 'trovalaparola',
    matchMode,
    playerOrder,
    guesserQueue,
    guesserQueueIndex,
    guesserId,
    clues: {},
    clueResults: null,
    attempts: [],
    outcome: null,
    scores,
  };

  if (matchMode === 'custom') {
    // Chi scrive la parola è uno degli altri (l'indovino non può saperla) e
    // dà comunque il proprio indizio come tutti: l'unica differenza con
    // Standard è chi sceglie la parola.
    const candidates = playerOrder.filter((id) => id !== guesserId);
    return {
      ...common,
      phase: 'writing',
      turnNumber: (previousMatchState?.turnNumber || 0) + 1,
      wordWriterId: shuffle(candidates)[0],
      secretWord: null,
    };
  }

  const usedWords = previousMatchState?.usedWords || [];
  const picked = pickWord(usedWords);
  return {
    ...common,
    phase: 'clues',
    roundNumber: (previousMatchState?.roundNumber || 0) + 1,
    usedWords: [...usedWords, picked.id],
    secretWord: picked.word,
  };
}

/**
 * Gioco cooperativo: se l'indovino ci arriva, vincono tutti (indovino
 * compreso) e i punti sono tanti quanti più tentativi sono rimasti — 3 al
 * primo colpo, 2 al secondo, 1 al terzo. Se i tentativi finiscono, nessuno
 * prende niente ("tutti perdono").
 */
function scoreDeltasFor(outcome, attemptsUsed, playerOrder) {
  const points = outcome === 'won' ? MAX_ATTEMPTS + 1 - attemptsUsed : 0;
  const deltas = {};
  for (const id of playerOrder) deltas[id] = points;
  return deltas;
}

function computeResults(matchState) {
  if (!matchState) return null;
  const attemptsUsed = matchState.attempts?.length || 0;
  return {
    outcome: matchState.outcome,
    attemptsUsed,
    clueResults: matchState.clueResults || [],
    scoreDeltas: scoreDeltasFor(matchState.outcome, attemptsUsed, matchState.playerOrder || []),
  };
}

function reduceSubmitSecretWord(action, matchState) {
  if (matchState.matchMode !== 'custom' || matchState.phase !== 'writing') return matchState;
  if (!action.voterId || action.voterId !== matchState.wordWriterId) return matchState;
  const secretWord = sanitizeWord(action.word);
  if (!secretWord) return matchState;
  return { ...matchState, secretWord, phase: 'clues' };
}

function reduceSubmitClue(action, matchState) {
  if (matchState.phase !== 'clues') return matchState;
  const givers = clueGivers(matchState);
  if (!action.voterId || !givers.includes(action.voterId)) return matchState;
  const clue = sanitizeWord(action.clue);
  if (!clue) return matchState;

  const clues = { ...matchState.clues, [action.voterId]: clue };
  if (!givers.every((id) => typeof clues[id] === 'string' && clues[id].length > 0)) {
    return { ...matchState, clues };
  }

  // Tutti gli indizi sono arrivati: i controlli (doppioni + radice della
  // parola segreta) vengono fatti una volta sola qui dall'host e il risultato
  // finisce nel matchState, così ogni client mostra esattamente le stesse
  // eliminazioni senza ricalcolare nulla.
  const clueResults = computeClueResults(clues, matchState.secretWord, givers);
  return { ...matchState, clues, clueResults, phase: 'guessing' };
}

function reduceSubmitWordGuess(action, matchState) {
  if (matchState.phase !== 'guessing') return matchState;
  if (!action.voterId || action.voterId !== matchState.guesserId) return matchState;
  if (matchState.attempts.length >= MAX_ATTEMPTS) return matchState;
  const guess = sanitizeWord(action.word);
  if (!guess) return matchState;

  const attempts = [...matchState.attempts, guess];
  const correct = sameWord(guess, matchState.secretWord);
  if (!correct && attempts.length < MAX_ATTEMPTS) return { ...matchState, attempts };

  const outcome = correct ? 'won' : 'lost';
  const deltas = scoreDeltasFor(outcome, attempts.length, matchState.playerOrder);
  const scores = { ...matchState.scores };
  for (const [pid, delta] of Object.entries(deltas)) scores[pid] = (scores[pid] || 0) + delta;
  return { ...matchState, attempts, outcome, phase: 'results', scores };
}

function reduce(action, matchState) {
  if (action.type === ACTION_KIND.SUBMIT_SECRET_WORD) return reduceSubmitSecretWord(action, matchState);
  if (action.type === ACTION_KIND.SUBMIT_CLUE) return reduceSubmitClue(action, matchState);
  if (action.type === ACTION_KIND.SUBMIT_WORD_GUESS) return reduceSubmitWordGuess(action, matchState);
  return matchState;
}

function isRoundComplete(matchState) {
  return matchState?.phase === 'results';
}

/* ---------------- UI ---------------- */

function roundLabel(matchState) {
  return matchState.matchMode === 'custom' ? `Turno ${matchState.turnNumber}` : `Round ${matchState.roundNumber}`;
}

/** Input di una parola sola: gli spazi vengono rimossi mentre si digita (e anche se incollati). */
function wordInput(placeholder) {
  return h('input', {
    class: 'input',
    type: 'text',
    placeholder,
    maxlength: String(MAX_WORD_LENGTH),
    autocomplete: 'off',
    oninput: (e) => {
      const stripped = e.target.value.replace(/\s+/g, '');
      if (stripped !== e.target.value) e.target.value = stripped;
    },
  });
}

function playerBadgeList(matchState, ctx, ids, doneIds) {
  return h(
    'div',
    { class: 'waiting-list' },
    ids
      .map((id) => playerInfo(ctx.players, id))
      .map((p) =>
        h('span', { class: 'player-chip' }, [
          h('span', { class: 'player-dot', style: { '--dot-color': p.color } }),
          h('span', { class: 'nickname' }, p.nickname),
          h(
            'span',
            { class: `badge ${doneIds.has(p.playerId) ? 'ok' : 'pending'}` },
            doneIds.has(p.playerId) ? 'Fatto' : 'In attesa'
          ),
        ])
      )
  );
}

function secretWordCard(matchState) {
  return h('div', { class: 'question-card' }, [
    h('p', {}, `${roundLabel(matchState)} · parola da far indovinare`),
    h('p', { class: 'adjective' }, matchState.secretWord),
  ]);
}

/**
 * Lista degli indizi. `hideEliminated` = vista dell'indovino: gli slot delle
 * parole eliminate ci sono (così sa quanti indizi ha perso) ma la parola non
 * si vede. Gli altri vedono tutto, con la X rossa sulle eliminate.
 */
function clueList(matchState, ctx, { hideEliminated }) {
  const results = matchState.clueResults || [];
  return h(
    'ul',
    { class: 'clue-list' },
    results.map((entry) => {
      const author = playerInfo(ctx.players, entry.playerId);
      const hidden = hideEliminated && !entry.valid;
      return h('li', { class: `clue-item ${entry.valid ? '' : 'clue-eliminated'}` }, [
        h('span', { class: 'clue-mark' }, entry.valid ? '' : '✕'),
        h('span', { class: `clue-word ${hidden ? 'clue-word-hidden' : ''}` }, hidden ? '•••••' : entry.text),
        h('span', { class: 'clue-author' }, [
          h('span', { class: 'player-dot', style: { '--dot-color': author.color } }),
          h('span', {}, author.nickname),
        ]),
      ]);
    })
  );
}

function attemptsRow(matchState) {
  if (!matchState.attempts.length) return null;
  return h('div', { class: 'attempt-row' }, [
    h('span', { class: 'text-muted' }, 'Tentativi:'),
    ...matchState.attempts.map((word, idx) => {
      const isWinning = matchState.outcome === 'won' && idx === matchState.attempts.length - 1;
      return h('span', { class: `attempt-chip ${isWinning ? 'attempt-ok' : 'attempt-ko'}` }, word);
    }),
  ]);
}

function renderWriting(container, matchState, ctx) {
  const writer = playerInfo(ctx.players, matchState.wordWriterId);
  const guesser = playerInfo(ctx.players, matchState.guesserId);

  if (ctx.me.playerId !== matchState.wordWriterId) {
    container.appendChild(
      h('div', { class: 'stack text-center' }, [
        h('h3', {}, roundLabel(matchState)),
        h('p', { class: 'text-muted' }, `${writer.nickname} sta scegliendo la parola da far indovinare...`),
        h('p', { class: 'text-muted' }, `Chi deve indovinare: ${guesser.nickname}`),
      ])
    );
    return;
  }

  const input = wordInput('Una parola sola, senza spazi');
  const errorEl = h('p', { class: 'text-center', style: { color: 'var(--color-danger)', minHeight: '1.2em' } });

  container.appendChild(
    h('div', { class: 'stack' }, [
      h('h3', { class: 'text-center' }, roundLabel(matchState)),
      h(
        'p',
        { class: 'text-muted text-center' },
        `Tocca a te scegliere la parola: ${guesser.nickname} dovrà indovinarla, tutti gli altri (te compreso) daranno un indizio.`
      ),
      h('div', { class: 'field' }, [h('label', {}, 'Parola da indovinare'), input]),
      errorEl,
      h(
        'button',
        {
          class: 'btn btn-primary',
          onclick: () => {
            const word = sanitizeWord(input.value);
            if (!word) {
              errorEl.textContent = 'Scrivi una parola prima di confermare.';
              return;
            }
            ctx.submitAction({ type: ACTION_KIND.SUBMIT_SECRET_WORD, word });
          },
        },
        'Conferma parola'
      ),
    ])
  );
}

function renderClues(container, matchState, ctx) {
  const guesser = playerInfo(ctx.players, matchState.guesserId);
  const givers = clueGivers(matchState);
  const isGuesser = ctx.me.playerId === matchState.guesserId;

  if (isGuesser) {
    // L'indovino non deve vedere né la parola né gli indizi in arrivo.
    container.appendChild(
      h('div', { class: 'stack text-center' }, [
        h('h3', {}, roundLabel(matchState)),
        h('p', { class: 'round-points' }, 'Tocca a te indovinare!'),
        h('p', { class: 'text-muted' }, 'Gli altri stanno scrivendo un indizio a testa. Non sbirciare 👀'),
        playerBadgeList(matchState, ctx, givers, new Set(Object.keys(matchState.clues))),
      ])
    );
    return;
  }

  const myClue = matchState.clues[ctx.me.playerId];

  if (myClue) {
    container.appendChild(
      h('div', { class: 'stack' }, [
        secretWordCard(matchState),
        h('p', { class: 'text-center' }, [h('span', { class: 'text-muted' }, 'Il tuo indizio: '), h('strong', {}, myClue)]),
        h('p', { class: 'text-center text-muted' }, 'In attesa degli altri indizi...'),
        playerBadgeList(matchState, ctx, givers, new Set(Object.keys(matchState.clues))),
      ])
    );
    return;
  }

  const input = wordInput('Una parola sola, senza spazi');
  const errorEl = h('p', { class: 'text-center', style: { color: 'var(--color-danger)', minHeight: '1.2em' } });

  container.appendChild(
    h('div', { class: 'stack' }, [
      secretWordCard(matchState),
      h(
        'p',
        { class: 'text-muted text-center' },
        `Scrivi UNA parola per aiutare ${guesser.nickname} a indovinare. Attenzione: se un altro giocatore scrive la stessa parola si annullano a vicenda, e non puoi usare la radice della parola segreta.`
      ),
      h('div', { class: 'field' }, [h('label', {}, 'Il tuo indizio'), input]),
      errorEl,
      h(
        'button',
        {
          class: 'btn btn-primary',
          onclick: () => {
            const clue = sanitizeWord(input.value);
            if (!clue) {
              errorEl.textContent = 'Scrivi un indizio prima di confermare.';
              return;
            }
            ctx.submitAction({ type: ACTION_KIND.SUBMIT_CLUE, clue });
          },
        },
        'Conferma indizio'
      ),
    ])
  );
}

function renderGuessing(container, matchState, ctx) {
  const guesser = playerInfo(ctx.players, matchState.guesserId);
  const isGuesser = ctx.me.playerId === matchState.guesserId;
  const left = MAX_ATTEMPTS - matchState.attempts.length;

  if (!isGuesser) {
    container.appendChild(
      h('div', { class: 'stack' }, [
        secretWordCard(matchState),
        h('h4', { class: 'text-center' }, 'Indizi'),
        clueList(matchState, ctx, { hideEliminated: false }),
        attemptsRow(matchState),
        h(
          'p',
          { class: 'text-center text-muted' },
          `${guesser.nickname} sta provando a indovinare — ${left} ${left === 1 ? 'tentativo' : 'tentativi'} ${
            left === 1 ? 'rimasto' : 'rimasti'
          }.`
        ),
      ])
    );
    return;
  }

  const input = wordInput('La tua risposta, senza spazi');
  const errorEl = h('p', { class: 'text-center', style: { color: 'var(--color-danger)', minHeight: '1.2em' } });

  container.appendChild(
    h('div', { class: 'stack' }, [
      h('div', { class: 'question-card' }, [
        h('p', {}, roundLabel(matchState)),
        h('p', { class: 'adjective' }, `${left} ${left === 1 ? 'tentativo' : 'tentativi'}`),
      ]),
      h('h4', { class: 'text-center' }, 'I tuoi indizi'),
      clueList(matchState, ctx, { hideEliminated: true }),
      attemptsRow(matchState),
      h('div', { class: 'field' }, [h('label', {}, 'Qual è la parola?'), input]),
      errorEl,
      h(
        'button',
        {
          class: 'btn btn-primary',
          onclick: () => {
            const word = sanitizeWord(input.value);
            if (!word) {
              errorEl.textContent = 'Scrivi una parola prima di confermare.';
              return;
            }
            ctx.submitAction({ type: ACTION_KIND.SUBMIT_WORD_GUESS, word });
          },
        },
        'Indovina'
      ),
    ])
  );
}

function renderResults(container, matchState, ctx) {
  const result = computeResults(matchState);
  const guesser = playerInfo(ctx.players, matchState.guesserId);
  const won = matchState.outcome === 'won';
  const myPoints = result.scoreDeltas[ctx.me.playerId] || 0;

  const controls = ctx.me.isHost
    ? [
        h('div', { class: 'btn-row' }, [
          h('button', { class: 'btn btn-secondary', onclick: () => ctx.requestEndMatch() }, 'Termina partita'),
          h(
            'button',
            { class: 'btn btn-primary', onclick: () => ctx.requestNewRound() },
            matchState.matchMode === 'custom' ? 'Nuovo turno' : 'Nuovo round'
          ),
        ]),
      ]
    : [h('p', { class: 'text-center text-muted' }, "In attesa che l'host continui...")];

  container.appendChild(
    h('div', { class: 'stack' }, [
      h('h3', { class: 'text-center' }, won ? '🎉 Indovinata!' : '💀 Nessuno ha indovinato'),
      h('div', { class: 'question-card' }, [
        h('p', {}, 'La parola era'),
        h('p', { class: 'adjective' }, matchState.secretWord),
      ]),
      h(
        'p',
        { class: 'text-center text-muted' },
        // Frasi senza accordo di genere: il nickname non dice come si
        // identifica chi gioca, quindi niente participi tipo "arrivato/a".
        won
          ? `Indovinata da ${guesser.nickname} in ${result.attemptsUsed} ${result.attemptsUsed === 1 ? 'tentativo' : 'tentativi'}.`
          : `${guesser.nickname} ha esaurito i ${MAX_ATTEMPTS} tentativi: questo round non fa punti per nessuno.`
      ),
      h('p', { class: 'round-points' }, `+${myPoints} ${myPoints === 1 ? 'punto' : 'punti'} questo round`),
      attemptsRow(matchState),
      h('h4', { class: 'text-center' }, 'Indizi'),
      clueList(matchState, ctx, { hideEliminated: false }),
      ...controls,
    ])
  );
}

function render(container, matchState, ctx) {
  const phase = matchState?.phase || 'clues';

  // Stesso meccanismo di classifico/chilhascritto: ogni azione ribroadcasta
  // l'intero matchState a tutti, quindi senza questa chiave chi sta ancora
  // scrivendo si vedrebbe azzerare l'input ad ogni invio altrui.
  let editingKey = null;
  if (phase === 'writing' && ctx.me.playerId === matchState.wordWriterId) {
    editingKey = `writing:${matchState.turnNumber}`;
  } else if (phase === 'clues' && ctx.me.playerId !== matchState.guesserId && !matchState.clues[ctx.me.playerId]) {
    editingKey = `clues:${matchState.turnNumber ?? matchState.roundNumber}`;
  } else if (phase === 'guessing' && ctx.me.playerId === matchState.guesserId) {
    // Include il numero di tentativi: dopo un tentativo sbagliato la vista
    // DEVE ricostruirsi (contatore e lista tentativi cambiano).
    editingKey = `guessing:${matchState.turnNumber ?? matchState.roundNumber}:${matchState.attempts.length}`;
  }

  if (editingKey && container.dataset.qpRenderKey === editingKey) return;
  container.dataset.qpRenderKey = editingKey || '';

  clear(container);
  if (phase === 'writing') renderWriting(container, matchState, ctx);
  else if (phase === 'guessing') renderGuessing(container, matchState, ctx);
  else if (phase === 'results') renderResults(container, matchState, ctx);
  else renderClues(container, matchState, ctx);
}

/** @type {import('../gameModule.js').GameModule} */
export const TrovaLaParolaModule = {
  id: 'trovalaparola',
  displayName: 'Trova la parola',
  initRoundState,
  render,
  reduce,
  computeResults,
  isRoundComplete,
  // 1 indovino + almeno 2 che danno indizi: sotto i 3 il meccanismo dei
  // doppioni che si annullano non può nemmeno scattare.
  minPlayers: () => 3,
};

registerGame(TrovaLaParolaModule.id, TrovaLaParolaModule);
