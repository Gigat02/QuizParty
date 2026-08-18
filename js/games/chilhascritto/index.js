import { h, clear } from '../../core/dom.js';
import { ACTION_KIND } from '../../transport/transport.js';
import { registerGame } from '../registry.js';
import { pickTrivia } from './trivia.js';
import { buildAnswerPool, allGuessed, allVoted, computeVoteResults } from './voting.js';

const MAX_QUESTION_LENGTH = 140;
const MAX_ANSWER_LENGTH = 80;

function playerInfo(players, playerId) {
  return players.find((p) => p.playerId === playerId) || { playerId, nickname: '???', color: '#ccc' };
}

function shufflePlayers(playerIds) {
  const out = [...playerIds];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Sceglie il prossimo autore del turno da una coda rimescolata: garantisce
 * che ogni giocatore faccia l'autore esattamente una volta per ciclo
 * completo (equità), pur restando "un giocatore casuale a turno" nell'ordine
 * effettivo. La coda si rimescola da capo alla primissima inizializzazione,
 * a fine ciclo, o se l'elenco giocatori è cambiato rispetto al turno precedente.
 */
function nextAuthor(previousMatchState, playerOrder) {
  const prevQueue = previousMatchState?.authorQueue;
  const sameSet =
    Array.isArray(prevQueue) &&
    prevQueue.length === playerOrder.length &&
    prevQueue.every((id) => playerOrder.includes(id));

  let queue = prevQueue;
  let index = previousMatchState?.authorQueueIndex ?? -1;

  if (!sameSet || index + 1 >= queue.length) {
    queue = shufflePlayers(playerOrder);
    index = 0;
  } else {
    index += 1;
  }
  return { authorQueue: queue, authorQueueIndex: index, authorId: queue[index] };
}

/** @param {{matchMode?: 'standard'|'custom'}} [config] usato solo alla primissima inizializzazione */
function initRoundState(players, previousMatchState, config = {}) {
  const playerOrder = players.map((p) => p.playerId);
  const matchMode = previousMatchState?.matchMode ?? config.matchMode ?? 'standard';
  const scores = { ...(previousMatchState?.scores || {}) };
  for (const id of playerOrder) if (!(id in scores)) scores[id] = 0;

  if (matchMode === 'custom') {
    const { authorQueue, authorQueueIndex, authorId } = nextAuthor(previousMatchState, playerOrder);
    return {
      gameId: 'chilhascritto',
      matchMode,
      phase: 'writing',
      turnNumber: (previousMatchState?.turnNumber || 0) + 1,
      playerOrder,
      authorQueue,
      authorQueueIndex,
      authorId,
      questionText: null,
      correctAnswer: null,
      guesses: {},
      answerPool: null,
      votes: {},
      scores,
    };
  }

  const usedQuestions = previousMatchState?.usedQuestions || [];
  const trivia = pickTrivia(usedQuestions);

  return {
    gameId: 'chilhascritto',
    matchMode,
    phase: 'guessing',
    roundNumber: (previousMatchState?.roundNumber || 0) + 1,
    usedQuestions: [...usedQuestions, trivia.id],
    questionText: trivia.question,
    correctAnswer: trivia.answer,
    playerOrder,
    guesses: {},
    answerPool: null,
    votes: {},
    scores,
  };
}

/** Giocatori che scrivono una risposta e votano: tutti tranne l'autore del turno (solo Personalizzata). */
function eligibleGuessers(matchState) {
  return matchState.matchMode === 'custom'
    ? matchState.playerOrder.filter((id) => id !== matchState.authorId)
    : matchState.playerOrder;
}

function reduceSubmitQuestionAnswer(action, matchState) {
  if (matchState.matchMode !== 'custom' || matchState.phase !== 'writing') return matchState;
  if (!action.voterId || action.voterId !== matchState.authorId) return matchState;

  const questionText = typeof action.questionText === 'string' ? action.questionText.trim().slice(0, MAX_QUESTION_LENGTH) : '';
  const correctAnswer = typeof action.correctAnswer === 'string' ? action.correctAnswer.trim().slice(0, MAX_ANSWER_LENGTH) : '';
  if (!questionText || !correctAnswer) return matchState;

  return { ...matchState, phase: 'guessing', questionText, correctAnswer };
}

function reduceSubmitGuess(action, matchState) {
  if (matchState.phase !== 'guessing') return matchState;
  const eligible = eligibleGuessers(matchState);
  if (!action.voterId || !eligible.includes(action.voterId)) return matchState;

  const text = typeof action.guessText === 'string' ? action.guessText.trim().slice(0, MAX_ANSWER_LENGTH) : '';
  if (!text) return matchState;

  const guesses = { ...matchState.guesses, [action.voterId]: text };
  if (!allGuessed(guesses, eligible)) return { ...matchState, guesses };

  const answerPool = buildAnswerPool(guesses, matchState.correctAnswer);
  return { ...matchState, guesses, answerPool, phase: 'voting' };
}

function reduceSubmitVote(action, matchState) {
  if (matchState.phase !== 'voting') return matchState;
  const eligible = eligibleGuessers(matchState);
  if (!action.voterId || !eligible.includes(action.voterId)) return matchState;

  const entry = matchState.answerPool.find((e) => e.key === action.answerKey);
  if (!entry || entry.authorId === action.voterId) return matchState; // non si vota la propria risposta

  const votes = { ...matchState.votes, [action.voterId]: action.answerKey };
  let next = { ...matchState, votes };

  if (allVoted(votes, eligible)) {
    const result = computeVoteResults(next);
    const scores = { ...matchState.scores };
    for (const [pid, delta] of Object.entries(result.scoreDeltas)) {
      scores[pid] = (scores[pid] || 0) + delta;
    }
    next = { ...next, phase: 'results', scores };
  }
  return next;
}

function reduce(action, matchState) {
  if (action.type === ACTION_KIND.SUBMIT_QUESTION_ANSWER) return reduceSubmitQuestionAnswer(action, matchState);
  if (action.type === ACTION_KIND.SUBMIT_GUESS) return reduceSubmitGuess(action, matchState);
  if (action.type === ACTION_KIND.SUBMIT_VOTE) return reduceSubmitVote(action, matchState);
  return matchState;
}

function isRoundComplete(matchState) {
  return matchState?.phase === 'results';
}

function renderWriting(container, matchState, ctx) {
  const author = playerInfo(ctx.players, matchState.authorId);
  const isAuthor = ctx.me.playerId === matchState.authorId;
  const turnLabel = h('h3', { class: 'text-center' }, `Turno ${matchState.turnNumber}`);

  if (!isAuthor) {
    container.appendChild(
      h('div', { class: 'stack text-center' }, [
        turnLabel,
        h('span', { class: 'player-chip', style: { justifyContent: 'center' } }, [
          h('span', { class: 'player-dot', style: { '--dot-color': author.color } }),
          h('span', { class: 'nickname' }, author.nickname),
        ]),
        h('p', { class: 'text-muted' }, `${author.nickname} sta scrivendo una domanda con la risposta giusta...`),
      ])
    );
    return;
  }

  const questionInput = h('textarea', {
    class: 'input question-textarea',
    placeholder: 'Scrivi una domanda tipo "Qual è la capitale del..."',
    maxlength: String(MAX_QUESTION_LENGTH),
  });
  const answerInput = h('input', {
    class: 'input',
    type: 'text',
    placeholder: 'Scrivi qui la risposta corretta',
    maxlength: String(MAX_ANSWER_LENGTH),
  });
  const errorEl = h('p', { class: 'text-center', style: { color: 'var(--color-danger)', minHeight: '1.2em' } });

  const confirmBtn = h(
    'button',
    {
      class: 'btn btn-primary',
      onclick: () => {
        const questionText = questionInput.value.trim();
        const correctAnswer = answerInput.value.trim();
        if (!questionText || !correctAnswer) {
          errorEl.textContent = 'Scrivi sia la domanda che la risposta corretta.';
          return;
        }
        ctx.submitAction({ type: ACTION_KIND.SUBMIT_QUESTION_ANSWER, questionText, correctAnswer });
      },
    },
    'Conferma'
  );

  container.appendChild(
    h('div', { class: 'stack' }, [
      turnLabel,
      h('p', { class: 'text-muted text-center' }, 'Tocca a te: scrivi una domanda e la sua risposta corretta. Gli altri proveranno a bluffare o a indovinarla.'),
      h('div', { class: 'field' }, [h('label', {}, 'Domanda'), questionInput]),
      h('div', { class: 'field' }, [h('label', {}, 'Risposta corretta'), answerInput]),
      errorEl,
      confirmBtn,
    ])
  );
}

function questionCardFor(matchState) {
  const isCustom = matchState.matchMode === 'custom';
  const headerLabel = isCustom ? `Turno ${matchState.turnNumber}` : `Round ${matchState.roundNumber}`;
  return h('div', { class: 'question-card' }, [h('p', {}, headerLabel), h('p', { class: 'adjective' }, matchState.questionText)]);
}

function renderGuessing(container, matchState, ctx) {
  const isCustom = matchState.matchMode === 'custom';
  const isAuthor = isCustom && ctx.me.playerId === matchState.authorId;
  const questionCard = questionCardFor(matchState);

  if (isAuthor) {
    container.appendChild(
      h('div', { class: 'stack' }, [questionCard, h('p', { class: 'text-center text-muted' }, 'Hai scritto tu la domanda: aspetta che gli altri rispondano.')])
    );
    return;
  }

  const eligible = eligibleGuessers(matchState);
  const myGuess = matchState.guesses[ctx.me.playerId];

  if (myGuess) {
    const doneIds = new Set(Object.keys(matchState.guesses));
    const waitList = h(
      'div',
      { class: 'waiting-list' },
      eligible.map((id) => playerInfo(ctx.players, id)).map((p) =>
        h('span', { class: 'player-chip' }, [
          h('span', { class: 'player-dot', style: { '--dot-color': p.color } }),
          h('span', { class: 'nickname' }, p.nickname),
          h('span', { class: `badge ${doneIds.has(p.playerId) ? 'ok' : 'pending'}` }, doneIds.has(p.playerId) ? 'Fatto' : 'In attesa'),
        ])
      )
    );
    container.appendChild(
      h('div', { class: 'stack' }, [questionCard, h('p', { class: 'text-center text-muted' }, 'Risposta inviata! In attesa degli altri...'), waitList])
    );
    return;
  }

  const guessInput = h('input', { class: 'input', type: 'text', placeholder: 'Scrivi la tua risposta (vera o bluff)', maxlength: String(MAX_ANSWER_LENGTH) });
  const errorEl = h('p', { class: 'text-center', style: { color: 'var(--color-danger)', minHeight: '1.2em' } });

  const confirmBtn = h(
    'button',
    {
      class: 'btn btn-primary',
      onclick: () => {
        const text = guessInput.value.trim();
        if (!text) {
          errorEl.textContent = 'Scrivi una risposta prima di confermare.';
          return;
        }
        ctx.submitAction({ type: ACTION_KIND.SUBMIT_GUESS, guessText: text });
      },
    },
    'Conferma risposta'
  );

  container.appendChild(
    h('div', { class: 'stack' }, [
      questionCard,
      h('p', { class: 'text-muted text-center' }, 'Scrivi una risposta plausibile: guadagni un punto per ogni voto che ricevi, anche se è falsa!'),
      h('div', { class: 'field' }, [guessInput]),
      errorEl,
      confirmBtn,
    ])
  );
}

function renderVoting(container, matchState, ctx) {
  const isCustom = matchState.matchMode === 'custom';
  const isAuthor = isCustom && ctx.me.playerId === matchState.authorId;
  const questionCard = questionCardFor(matchState);

  if (isAuthor) {
    container.appendChild(
      h('div', { class: 'stack' }, [questionCard, h('p', { class: 'text-center text-muted' }, 'Gli altri stanno votando quale risposta pensano sia quella vera...')])
    );
    return;
  }

  const eligible = eligibleGuessers(matchState);
  const myVote = matchState.votes[ctx.me.playerId];

  if (myVote) {
    const doneIds = new Set(Object.keys(matchState.votes));
    const waitList = h(
      'div',
      { class: 'waiting-list' },
      eligible.map((id) => playerInfo(ctx.players, id)).map((p) =>
        h('span', { class: 'player-chip' }, [
          h('span', { class: 'player-dot', style: { '--dot-color': p.color } }),
          h('span', { class: 'nickname' }, p.nickname),
          h('span', { class: `badge ${doneIds.has(p.playerId) ? 'ok' : 'pending'}` }, doneIds.has(p.playerId) ? 'Fatto' : 'In attesa'),
        ])
      )
    );
    container.appendChild(
      h('div', { class: 'stack' }, [questionCard, h('p', { class: 'text-center text-muted' }, 'Voto inviato! In attesa degli altri...'), waitList])
    );
    return;
  }

  const options = matchState.answerPool.filter((entry) => entry.authorId !== ctx.me.playerId);
  const optionsList = h(
    'div',
    { class: 'stack' },
    options.map((entry) =>
      h(
        'button',
        {
          class: 'card card-tap answer-option',
          onclick: () => ctx.submitAction({ type: ACTION_KIND.SUBMIT_VOTE, answerKey: entry.key }),
        },
        entry.text
      )
    )
  );

  container.appendChild(
    h('div', { class: 'stack' }, [
      questionCard,
      h('p', { class: 'text-muted text-center' }, 'Quale pensi sia la risposta VERA? (non puoi votare la tua)'),
      optionsList,
    ])
  );
}

function renderResults(container, matchState, ctx) {
  const result = computeVoteResults(matchState);
  const isCustom = matchState.matchMode === 'custom';
  const myPoints = result.scoreDeltas[ctx.me.playerId] || 0;

  const poolList = h(
    'ul',
    { class: 'rank-list' },
    matchState.answerPool.map((entry) => {
      const isTruth = entry.key === 'truth';
      const author = entry.authorId ? playerInfo(ctx.players, entry.authorId) : null;
      const votes = result.voteCounts[entry.key] || 0;
      const voters = Object.entries(matchState.votes)
        .filter(([, key]) => key === entry.key)
        .map(([voterId]) => playerInfo(ctx.players, voterId).nickname);
      const subtitle = `${isTruth ? '✅ Risposta vera' : `Scritta da ${author.nickname}`} · ${votes} ${votes === 1 ? 'voto' : 'voti'}${
        voters.length ? ' (' + voters.join(', ') + ')' : ''
      }`;
      return h('li', { class: `rank-item ${isTruth ? 'result-correct' : ''}` }, [
        h('div', { class: 'grow' }, [h('p', {}, entry.text), h('p', { class: 'text-muted', style: { fontSize: '0.8rem' } }, subtitle)]),
      ]);
    })
  );

  const controls = [];
  if (ctx.me.isHost) {
    controls.push(
      h('div', { class: 'btn-row' }, [
        h('button', { class: 'btn btn-secondary', onclick: () => ctx.requestEndMatch() }, 'Termina partita'),
        h('button', { class: 'btn btn-primary', onclick: () => ctx.requestNewRound() }, isCustom ? 'Nuovo turno' : 'Nuovo round'),
      ])
    );
  } else {
    controls.push(h('p', { class: 'text-center text-muted' }, "In attesa che l'host continui..."));
  }

  container.appendChild(
    h('div', { class: 'stack' }, [
      h('p', { class: 'round-points' }, `+${myPoints} ${myPoints === 1 ? 'punto' : 'punti'} questo round`),
      h('h4', { class: 'text-center' }, 'Riepilogo'),
      poolList,
      ...controls,
    ])
  );
}

function render(container, matchState, ctx) {
  const phase = matchState?.phase || 'guessing';

  // Stesso motivo dell'"editingKey" in classifico/index.js: ogni azione
  // ribroadcasta l'intero matchState a tutti, quindi senza questo controllo
  // il riordino/testo non ancora confermato di chi sta ancora scrivendo
  // verrebbe cancellato ad ogni submit altrui.
  let editingKey = null;
  if (phase === 'writing' && ctx.me.playerId === matchState.authorId) {
    editingKey = `writing:${matchState.turnNumber}`;
  } else if (phase === 'guessing' && ctx.me.playerId !== matchState.authorId && !matchState.guesses[ctx.me.playerId]) {
    editingKey = `guessing:${matchState.matchMode}:${matchState.turnNumber ?? matchState.roundNumber}`;
  } else if (phase === 'voting' && ctx.me.playerId !== matchState.authorId && !matchState.votes[ctx.me.playerId]) {
    editingKey = `voting:${matchState.matchMode}:${matchState.turnNumber ?? matchState.roundNumber}`;
  }

  if (editingKey && container.dataset.qpRenderKey === editingKey) return;
  container.dataset.qpRenderKey = editingKey || '';

  clear(container);
  if (phase === 'writing') renderWriting(container, matchState, ctx);
  else if (phase === 'voting') renderVoting(container, matchState, ctx);
  else if (phase === 'results') renderResults(container, matchState, ctx);
  else renderGuessing(container, matchState, ctx);
}

/** @type {import('../gameModule.js').GameModule} */
export const ChiLHaScrittoModule = {
  id: 'chilhascritto',
  displayName: "Chi l'ha scritto?",
  initRoundState,
  render,
  reduce,
  computeResults: computeVoteResults,
  isRoundComplete,
  minPlayers: (matchMode) => (matchMode === 'custom' ? 4 : 2),
};

registerGame(ChiLHaScrittoModule.id, ChiLHaScrittoModule);
