import { h, clear } from '../../core/dom.js';
import { ACTION_KIND } from '../../transport/transport.js';
import { registerGame } from '../registry.js';
import { pickAdjective, questionTextFor } from './adjectives.js';
import { aggregateRanking, scoreRoundDeltas, allSubmitted } from './ranking.js';
import { createRankList } from './rankList.js';

function playerInfo(players, playerId) {
  return players.find((p) => p.playerId === playerId) || { playerId, nickname: '???', color: '#ccc' };
}

function initRoundState(players, previousMatchState) {
  const playerOrder = players.map((p) => p.playerId);
  const usedAdjectives = previousMatchState?.usedAdjectives || [];
  const adjective = pickAdjective(usedAdjectives);
  const scores = { ...(previousMatchState?.scores || {}) };
  for (const id of playerOrder) if (!(id in scores)) scores[id] = 0;

  return {
    gameId: 'classifico',
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

function reduce(action, matchState) {
  if (action.type !== ACTION_KIND.SUBMIT_RANKING) return matchState;
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

function isRoundComplete(matchState) {
  return matchState?.phase === 'results';
}

function renderSubmitting(container, matchState, ctx) {
  const mySubmission = matchState.submissions[ctx.me.playerId];
  const roundPlayers = matchState.playerOrder.map((id) => playerInfo(ctx.players, id));

  const questionCard = h('div', { class: 'question-card' }, [
    h('p', {}, `Round ${matchState.roundNumber}`),
    h('p', { class: 'adjective' }, matchState.questionText),
  ]);

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
    controls.push(
      h('div', { class: 'btn-row' }, [
        h('button', { class: 'btn btn-secondary', onclick: () => ctx.requestEndMatch() }, 'Termina partita'),
        h('button', { class: 'btn btn-primary', onclick: () => ctx.requestNewRound() }, 'Nuovo round'),
      ])
    );
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
  clear(container);
  if (!matchState || matchState.phase === 'submitting') {
    renderSubmitting(container, matchState, ctx);
  } else if (matchState.phase === 'results') {
    renderResults(container, matchState, ctx);
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
};

registerGame(ClassificoModule.id, ClassificoModule);
