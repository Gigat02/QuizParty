import { h, clear } from '../../core/dom.js';
import { ACTION_KIND } from '../../transport/transport.js';
import { registerGame } from '../registry.js';
import { pickAdjective, questionTextFor } from './adjectives.js';
import { aggregateRanking, scoreRoundDeltas, allSubmitted } from './ranking.js';
import { createRankList } from './rankList.js';

const MAX_QUESTION_LENGTH = 140;

function playerInfo(players, playerId) {
  return players.find((p) => p.playerId === playerId) || { playerId, nickname: '???', color: '#ccc' };
}

/**
 * @param {import('../../transport/transport.js').PlayerInfo[]} players
 * @param {object|null} previousMatchState
 * @param {{matchMode?: 'standard'|'custom'}} [config] usato solo alla primissima inizializzazione
 *   (i turni/round successivi ereditano matchMode da previousMatchState)
 */
function initRoundState(players, previousMatchState, config = {}) {
  const playerOrder = players.map((p) => p.playerId);
  const matchMode = previousMatchState?.matchMode ?? config.matchMode ?? 'standard';
  const scores = { ...(previousMatchState?.scores || {}) };
  for (const id of playerOrder) if (!(id in scores)) scores[id] = 0;

  if (matchMode === 'custom') {
    return {
      gameId: 'classifico',
      matchMode,
      phase: 'writing',
      turnNumber: (previousMatchState?.turnNumber || 0) + 1,
      playerOrder,
      customQuestions: {},
      questionQueue: [],
      queueIndex: 0,
      questionText: null,
      submissions: {},
      scores,
    };
  }

  const usedAdjectives = previousMatchState?.usedAdjectives || [];
  const adjective = pickAdjective(usedAdjectives);

  return {
    gameId: 'classifico',
    matchMode,
    phase: 'submitting',
    roundNumber: (previousMatchState?.roundNumber || 0) + 1,
    usedAdjectives: [...usedAdjectives, adjective],
    questionAdjective: adjective,
    questionText: questionTextFor(adjective),
    playerOrder,
    submissions: {},
    scores,
  };
}

function computeResults(matchState) {
  if (!matchState?.submissions || !matchState.playerOrder) return null;
  const ranking = aggregateRanking(matchState.submissions, matchState.playerOrder);
  const scoreDeltas = scoreRoundDeltas(ranking, matchState.submissions);
  return { ranking, scoreDeltas };
}

function reduceSubmitQuestion(action, matchState) {
  if (matchState.matchMode !== 'custom' || matchState.phase !== 'writing') return matchState;
  if (!action.voterId || typeof action.questionText !== 'string') return matchState;
  const text = action.questionText.trim().slice(0, MAX_QUESTION_LENGTH);
  if (!text) return matchState;

  const customQuestions = { ...matchState.customQuestions, [action.voterId]: text };
  const allWritten = matchState.playerOrder.every(
    (id) => typeof customQuestions[id] === 'string' && customQuestions[id].length > 0
  );

  if (!allWritten) return { ...matchState, customQuestions };

  // Tutti hanno scritto: si parte con la prima domanda della coda,
  // riusando la stessa fase 'submitting'/'results' della modalità Standard.
  const questionQueue = [...matchState.playerOrder];
  return {
    ...matchState,
    customQuestions,
    questionQueue,
    queueIndex: 0,
    phase: 'submitting',
    questionText: customQuestions[questionQueue[0]],
    submissions: {},
  };
}

function reduceSubmitRanking(action, matchState) {
  if (matchState.phase !== 'submitting') return matchState;
  if (!action.voterId || !Array.isArray(action.ranking)) return matchState;

  const submissions = { ...matchState.submissions, [action.voterId]: action.ranking };
  let next = { ...matchState, submissions };

  if (allSubmitted(submissions, matchState.playerOrder)) {
    const result = computeResults(next);
    const scores = { ...matchState.scores };
    for (const [pid, delta] of Object.entries(result.scoreDeltas)) {
      scores[pid] = (scores[pid] || 0) + delta;
    }
    next = { ...next, phase: 'results', scores };
  }
  return next;
}

function reduce(action, matchState) {
  if (action.type === ACTION_KIND.SUBMIT_QUESTION) return reduceSubmitQuestion(action, matchState);
  if (action.type === ACTION_KIND.SUBMIT_RANKING) return reduceSubmitRanking(action, matchState);
  return matchState;
}

/**
 * Passo intermedio usato solo in modalità Personalizzata: passa alla
 * prossima domanda già scritta dai giocatori senza aprire un nuovo turno
 * di scrittura. Non fa parte del contratto GameModule "ufficiale" — è
 * un'estensione opzionale che gameScreen.js chiama solo se presente.
 */
function advanceRound(matchState) {
  if (matchState.matchMode !== 'custom' || matchState.phase !== 'results') return matchState;
  const nextIndex = matchState.queueIndex + 1;
  if (nextIndex >= matchState.questionQueue.length) return matchState;
  const nextAuthor = matchState.questionQueue[nextIndex];
  return {
    ...matchState,
    phase: 'submitting',
    queueIndex: nextIndex,
    questionText: matchState.customQuestions[nextAuthor],
    submissions: {},
  };
}

function isRoundComplete(matchState) {
  return matchState?.phase === 'results';
}

function renderWriting(container, matchState, ctx) {
  const myQuestion = matchState.customQuestions[ctx.me.playerId];
  const roundPlayers = matchState.playerOrder.map((id) => playerInfo(ctx.players, id));
  const turnLabel = h('h3', { class: 'text-center' }, `Turno ${matchState.turnNumber}`);

  if (myQuestion) {
    const submittedIds = new Set(Object.keys(matchState.customQuestions));
    const waitList = h(
      'div',
      { class: 'waiting-list' },
      roundPlayers.map((p) =>
        h('span', { class: 'player-chip' }, [
          h('span', { class: 'player-dot', style: { '--dot-color': p.color } }),
          h('span', { class: 'nickname' }, p.nickname),
          h(
            'span',
            { class: `badge ${submittedIds.has(p.playerId) ? 'ok' : 'pending'}` },
            submittedIds.has(p.playerId) ? 'Fatto' : 'In attesa'
          ),
        ])
      )
    );
    container.appendChild(
      h('div', { class: 'stack' }, [
        turnLabel,
        h('p', { class: 'text-center text-muted' }, 'Domanda inviata! In attesa degli altri giocatori...'),
        waitList,
      ])
    );
    return;
  }

  const textarea = h('textarea', {
    class: 'input question-textarea',
    placeholder: 'Scrivi una domanda tipo "Chi è il più...?"',
    maxlength: String(MAX_QUESTION_LENGTH),
  });

  const errorEl = h('p', { class: 'text-center', style: { color: 'var(--color-danger)', minHeight: '1.2em' } });

  const confirmBtn = h(
    'button',
    {
      class: 'btn btn-primary',
      onclick: () => {
        const text = textarea.value.trim();
        if (!text) {
          errorEl.textContent = 'Scrivi una domanda prima di confermare.';
          return;
        }
        ctx.submitAction({ type: ACTION_KIND.SUBMIT_QUESTION, questionText: text });
      },
    },
    'Conferma domanda'
  );

  container.appendChild(
    h('div', { class: 'stack' }, [
      turnLabel,
      h('p', { class: 'text-muted text-center' }, 'Scrivi una domanda per gli altri giocatori, poi confermala.'),
      h('div', { class: 'field' }, [textarea]),
      errorEl,
      confirmBtn,
    ])
  );
}

function renderSubmitting(container, matchState, ctx) {
  const mySubmission = matchState.submissions[ctx.me.playerId];
  const roundPlayers = matchState.playerOrder.map((id) => playerInfo(ctx.players, id));
  const isCustom = matchState.matchMode === 'custom';

  const headerLabel = isCustom
    ? `Turno ${matchState.turnNumber} · Domanda ${matchState.queueIndex + 1} di ${matchState.questionQueue.length}`
    : `Round ${matchState.roundNumber}`;

  const questionCardChildren = [h('p', {}, headerLabel), h('p', { class: 'adjective' }, matchState.questionText)];
  if (isCustom) {
    const author = playerInfo(ctx.players, matchState.questionQueue[matchState.queueIndex]);
    questionCardChildren.push(h('p', {}, `— domanda di ${author.nickname}`));
  }
  const questionCard = h('div', { class: 'question-card' }, questionCardChildren);

  if (mySubmission) {
    const submittedIds = new Set(Object.keys(matchState.submissions));
    const waitList = h(
      'div',
      { class: 'waiting-list' },
      roundPlayers.map((p) =>
        h('span', { class: 'player-chip' }, [
          h('span', { class: 'player-dot', style: { '--dot-color': p.color } }),
          h('span', { class: 'nickname' }, p.nickname),
          h('span', { class: `badge ${submittedIds.has(p.playerId) ? 'ok' : 'pending'}` }, submittedIds.has(p.playerId) ? 'Fatto' : 'In attesa'),
        ])
      )
    );
    container.appendChild(
      h('div', { class: 'stack' }, [
        questionCard,
        h('p', { class: 'text-center text-muted' }, 'Classifica inviata! In attesa degli altri giocatori...'),
        waitList,
      ])
    );
    return;
  }

  const listWrap = h('div', {});
  const rankList = createRankList(listWrap, roundPlayers);

  const confirmBtn = h(
    'button',
    {
      class: 'btn btn-primary',
      onclick: () => {
        ctx.submitAction({ type: ACTION_KIND.SUBMIT_RANKING, ranking: rankList.getOrder() });
      },
    },
    'Conferma classifica'
  );

  container.appendChild(
    h('div', { class: 'stack' }, [
      questionCard,
      h('p', { class: 'text-muted text-center' }, 'Usa le frecce per ordinare i giocatori dal più al meno.'),
      listWrap,
      confirmBtn,
    ])
  );
}

function renderResults(container, matchState, ctx) {
  const result = computeResults(matchState);
  const finalRanking = result.ranking.map((id) => playerInfo(ctx.players, id));
  const myOrder = matchState.submissions[ctx.me.playerId] || [];
  const myPoints = result.scoreDeltas[ctx.me.playerId] || 0;
  const isCustom = matchState.matchMode === 'custom';
  const isLastQueuedQuestion = isCustom && matchState.queueIndex >= matchState.questionQueue.length - 1;

  const finalCol = h('div', {}, [
    h('h4', {}, 'Classifica finale'),
    h(
      'ul',
      { class: 'rank-list' },
      finalRanking.map((p, idx) =>
        h('li', { class: 'rank-item' }, [
          h('span', { class: 'rank-index' }, String(idx + 1)),
          h('span', { class: 'player-dot', style: { '--dot-color': p.color } }),
          h('span', { class: 'nickname' }, p.nickname),
        ])
      )
    ),
  ]);

  const mineCol = h('div', {}, [
    h('h4', {}, 'La tua classifica'),
    h(
      'ul',
      { class: 'rank-list' },
      myOrder.map((id, idx) => {
        const p = playerInfo(ctx.players, id);
        const correct = result.ranking[idx] === id;
        return h('li', { class: `rank-item ${correct ? 'result-correct' : 'result-wrong'}` }, [
          h('span', { class: 'rank-index' }, String(idx + 1)),
          h('span', { class: 'player-dot', style: { '--dot-color': p.color } }),
          h('span', { class: 'nickname' }, p.nickname),
        ]);
      })
    ),
  ]);

  const controls = [];
  if (ctx.me.isHost) {
    if (isCustom && !isLastQueuedQuestion) {
      controls.push(h('button', { class: 'btn btn-primary', onclick: () => ctx.requestNextQuestion() }, 'Prossima domanda'));
    } else {
      controls.push(
        h('div', { class: 'btn-row' }, [
          h('button', { class: 'btn btn-secondary', onclick: () => ctx.requestEndMatch() }, 'Termina partita'),
          h(
            'button',
            { class: 'btn btn-primary', onclick: () => ctx.requestNewRound() },
            isCustom ? 'Nuovo turno' : 'Nuovo round'
          ),
        ])
      );
    }
  } else {
    controls.push(h('p', { class: 'text-center text-muted' }, "In attesa che l'host continui..."));
  }

  container.appendChild(
    h('div', { class: 'stack' }, [
      h('p', { class: 'round-points' }, `+${myPoints} ${myPoints === 1 ? 'punto' : 'punti'} questo round`),
      h('div', { class: 'results-columns' }, [finalCol, mineCol]),
      ...controls,
    ])
  );
}

function render(container, matchState, ctx) {
  const phase = matchState?.phase || 'submitting';

  // Ogni submit_ranking/submit_question di UN giocatore fa ribroadcastare
  // l'intero matchState a TUTTI, anche a chi non ha ancora confermato.
  // Senza questo controllo, ogni broadcast intermedio ricostruiva da zero
  // la lista/textarea di chi stava ancora decidendo, cancellando il
  // riordino o il testo non ancora confermati. Se per la mia vista non è
  // cambiato nulla di rilevante (stessa fase/domanda, io non ho ancora
  // confermato), non tocco il DOM.
  let editingKey = null;
  if (phase === 'writing' && !matchState.customQuestions[ctx.me.playerId]) {
    editingKey = `writing:${matchState.turnNumber}`;
  } else if (phase === 'submitting' && !matchState.submissions[ctx.me.playerId]) {
    editingKey = `submitting:${matchState.matchMode}:${matchState.questionText}:${matchState.queueIndex ?? ''}`;
  }

  if (editingKey && container.dataset.qpRenderKey === editingKey) return;
  container.dataset.qpRenderKey = editingKey || '';

  clear(container);
  if (phase === 'writing') {
    renderWriting(container, matchState, ctx);
  } else if (phase === 'results') {
    renderResults(container, matchState, ctx);
  } else {
    renderSubmitting(container, matchState, ctx);
  }
}

/** @type {import('../gameModule.js').GameModule} */
export const ClassificoModule = {
  id: 'classifico',
  displayName: 'Classifico',
  initRoundState,
  render,
  reduce,
  computeResults,
  isRoundComplete,
  advanceRound,
  minPlayers: () => 2,
};

registerGame(ClassificoModule.id, ClassificoModule);
