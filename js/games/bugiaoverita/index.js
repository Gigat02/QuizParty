import { h, clear } from '../../core/dom.js';
import { ACTION_KIND } from '../../transport/transport.js';
import { registerGame } from '../registry.js';
import { pickStatementSet } from './statements.js';

const STATEMENTS_PER_SET = 3;
const MAX_STATEMENT_LENGTH = 120;

// Punti di chi giudica: si assegna 1 punto per ogni affermazione classificata
// correttamente. Dato che la bugia è esattamente una e va indicata una sola
// volta, i casi possibili sono solo due: se la becchi hai ragione su tutte e
// tre (3 punti), se sbagli ne azzecchi comunque una (la verità che non hai
// accusato), quindi 1 punto.
const POINTS_LIE_FOUND = 3;
const POINTS_LIE_MISSED = 1;
// Bonus a chi ha scritto le affermazioni se nessuno scopre la sua bugia.
const POINTS_AUTHOR_FOOLED_EVERYONE = 1;

function playerInfo(players, playerId) {
  return players.find((p) => p.playerId === playerId) || { playerId, nickname: '???', color: '#ccc' };
}

function sanitizeStatement(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, MAX_STATEMENT_LENGTH);
}

/** @returns {string[]|null} le 3 affermazioni ripulite, o null se non sono valide */
function sanitizeStatements(value) {
  if (!Array.isArray(value) || value.length !== STATEMENTS_PER_SET) return null;
  const cleaned = value.map(sanitizeStatement);
  if (cleaned.some((s) => s.length === 0)) return null;
  return cleaned;
}

function isValidLieIndex(value) {
  return Number.isInteger(value) && value >= 0 && value < STATEMENTS_PER_SET;
}

/**
 * Chi deve giudicare il set corrente: in Personalizzata tutti tranne chi ha
 * scritto le affermazioni; in Standard (nessun autore) tutti quanti.
 */
function judgesFor(matchState) {
  return matchState.currentAuthorId
    ? matchState.playerOrder.filter((id) => id !== matchState.currentAuthorId)
    : matchState.playerOrder;
}

/** @param {{matchMode?: 'standard'|'custom'}} [config] usato solo alla primissima inizializzazione */
function initRoundState(players, previousMatchState, config = {}) {
  const playerOrder = players.map((p) => p.playerId);
  const matchMode = previousMatchState?.matchMode ?? config.matchMode ?? 'standard';
  const scores = { ...(previousMatchState?.scores || {}) };
  for (const id of playerOrder) if (!(id in scores)) scores[id] = 0;

  const common = {
    gameId: 'bugiaoverita',
    matchMode,
    playerOrder,
    scores,
    currentAuthorId: null,
    currentStatements: null,
    currentLieIndex: null,
    judgements: {},
  };

  if (matchMode === 'custom') {
    return {
      ...common,
      phase: 'writing',
      turnNumber: (previousMatchState?.turnNumber || 0) + 1,
      statementSets: {},
      queue: [],
      queueIndex: 0,
    };
  }

  // Standard: nessun autore, un set di cultura generale per round, lo
  // giudicano tutti. Senza autore non c'è nessuno a cui dare il punto extra.
  const usedSets = previousMatchState?.usedSets || [];
  const picked = pickStatementSet(usedSets);
  return {
    ...common,
    phase: 'judging',
    roundNumber: (previousMatchState?.roundNumber || 0) + 1,
    usedSets: [...usedSets, picked.id],
    currentStatements: picked.statements,
    currentLieIndex: picked.lieIndex,
  };
}

function computeResults(matchState) {
  if (!matchState || !Array.isArray(matchState.currentStatements)) return null;
  const judges = judgesFor(matchState);
  const scoreDeltas = {};
  const foundBy = [];

  for (const judgeId of judges) {
    const pick = matchState.judgements[judgeId];
    if (!isValidLieIndex(pick)) {
      scoreDeltas[judgeId] = 0;
      continue;
    }
    const correct = pick === matchState.currentLieIndex;
    if (correct) foundBy.push(judgeId);
    scoreDeltas[judgeId] = correct ? POINTS_LIE_FOUND : POINTS_LIE_MISSED;
  }

  // Il bonus scatta solo se c'era davvero qualcuno a cui mentire: con zero
  // giudici non si è ingannato nessuno.
  const authorFooledEveryone = Boolean(matchState.currentAuthorId) && judges.length > 0 && foundBy.length === 0;
  if (authorFooledEveryone) {
    scoreDeltas[matchState.currentAuthorId] =
      (scoreDeltas[matchState.currentAuthorId] || 0) + POINTS_AUTHOR_FOOLED_EVERYONE;
  }

  return { scoreDeltas, foundBy, authorFooledEveryone };
}

function reduceSubmitStatements(action, matchState) {
  if (matchState.matchMode !== 'custom' || matchState.phase !== 'writing') return matchState;
  if (!action.voterId || !matchState.playerOrder.includes(action.voterId)) return matchState;

  const statements = sanitizeStatements(action.statements);
  const lieIndex = action.lieIndex;
  if (!statements || !isValidLieIndex(lieIndex)) return matchState;

  const statementSets = { ...matchState.statementSets, [action.voterId]: { statements, lieIndex } };
  const allWritten = matchState.playerOrder.every((id) => statementSets[id]);
  if (!allWritten) return { ...matchState, statementSets };

  // Hanno scritto tutti: si fissa la coda (ordine di ingresso in lobby) e si
  // parte dal primo autore. Da qui in poi si scorre con advanceRound().
  const queue = [...matchState.playerOrder];
  const first = statementSets[queue[0]];
  return {
    ...matchState,
    statementSets,
    queue,
    queueIndex: 0,
    phase: 'judging',
    currentAuthorId: queue[0],
    currentStatements: first.statements,
    currentLieIndex: first.lieIndex,
    judgements: {},
  };
}

function reduceSubmitJudgement(action, matchState) {
  if (matchState.phase !== 'judging') return matchState;
  const judges = judgesFor(matchState);
  if (!action.voterId || !judges.includes(action.voterId)) return matchState;
  if (!isValidLieIndex(action.lieIndex)) return matchState;

  const judgements = { ...matchState.judgements, [action.voterId]: action.lieIndex };
  let next = { ...matchState, judgements };

  if (judges.every((id) => isValidLieIndex(judgements[id]))) {
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
  if (action.type === ACTION_KIND.SUBMIT_STATEMENTS) return reduceSubmitStatements(action, matchState);
  if (action.type === ACTION_KIND.SUBMIT_JUDGEMENT) return reduceSubmitJudgement(action, matchState);
  return matchState;
}

/**
 * Passa al set del giocatore successivo nella coda, senza aprire una nuova
 * fase di scrittura. È il meccanismo con cui si garantisce che il turno non
 * possa finire prima che siano state giudicate le affermazioni di tutti
 * (stessa logica della coda di domande in Classifico Personalizzata).
 */
function advanceRound(matchState) {
  if (matchState.matchMode !== 'custom' || matchState.phase !== 'results') return matchState;
  const nextIndex = matchState.queueIndex + 1;
  if (nextIndex >= matchState.queue.length) return matchState;

  const authorId = matchState.queue[nextIndex];
  const set = matchState.statementSets[authorId];
  return {
    ...matchState,
    phase: 'judging',
    queueIndex: nextIndex,
    currentAuthorId: authorId,
    currentStatements: set.statements,
    currentLieIndex: set.lieIndex,
    judgements: {},
  };
}

function isRoundComplete(matchState) {
  return matchState?.phase === 'results';
}

/* ---------------- UI ---------------- */

function headerLabel(matchState) {
  if (matchState.matchMode !== 'custom') return `Round ${matchState.roundNumber}`;
  const total = matchState.queue?.length || matchState.playerOrder.length;
  const position = (matchState.queueIndex ?? 0) + 1;
  return matchState.phase === 'writing' ? `Turno ${matchState.turnNumber}` : `Turno ${matchState.turnNumber} · ${position} di ${total}`;
}

function waitingList(ids, doneIds, players) {
  return h(
    'div',
    { class: 'waiting-list' },
    ids
      .map((id) => playerInfo(players, id))
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

function renderWriting(container, matchState, ctx) {
  const mine = matchState.statementSets[ctx.me.playerId];

  if (mine) {
    container.appendChild(
      h('div', { class: 'stack' }, [
        h('h3', { class: 'text-center' }, headerLabel(matchState)),
        h('p', { class: 'text-center text-muted' }, 'Affermazioni inviate! In attesa degli altri giocatori...'),
        h(
          'ul',
          { class: 'statement-list' },
          mine.statements.map((text, idx) =>
            h('li', { class: `statement-item ${idx === mine.lieIndex ? 'statement-lie' : 'statement-true'}` }, [
              h('span', { class: 'statement-mark' }, idx === mine.lieIndex ? '✕' : '✓'),
              h('span', { class: 'statement-text' }, text),
            ])
          )
        ),
        waitingList(matchState.playerOrder, new Set(Object.keys(matchState.statementSets)), ctx.players),
      ])
    );
    return;
  }

  let lieIndex = null;
  const inputs = [];
  const lieButtons = [];
  const errorEl = h('p', { class: 'text-center', style: { color: 'var(--color-danger)', minHeight: '1.2em' } });

  function refreshMarks() {
    lieButtons.forEach((btn, idx) => {
      const isLie = idx === lieIndex;
      btn.classList.toggle('is-lie', isLie);
      btn.classList.toggle('is-true', lieIndex !== null && !isLie);
      btn.textContent = lieIndex === null ? '?' : isLie ? '✕ bugia' : '✓ vera';
    });
  }

  const rows = Array.from({ length: STATEMENTS_PER_SET }, (_, idx) => {
    const input = h('input', {
      class: 'input',
      type: 'text',
      placeholder: `Affermazione ${idx + 1}`,
      maxlength: String(MAX_STATEMENT_LENGTH),
      autocomplete: 'off',
    });
    inputs.push(input);

    const lieBtn = h(
      'button',
      {
        class: 'statement-toggle',
        type: 'button',
        title: 'Segna questa come la bugia',
        onclick: () => {
          lieIndex = idx;
          refreshMarks();
        },
      },
      '?'
    );
    lieButtons.push(lieBtn);

    return h('div', { class: 'statement-row' }, [input, lieBtn]);
  });

  refreshMarks();

  container.appendChild(
    h('div', { class: 'stack' }, [
      h('h3', { class: 'text-center' }, headerLabel(matchState)),
      h(
        'p',
        { class: 'text-muted text-center' },
        'Scrivi 3 affermazioni su di te: 2 devono essere vere e 1 falsa. Poi tocca il pulsante accanto alla bugia per segnarla. Se non la scopre nessuno guadagni un punto extra!'
      ),
      ...rows,
      errorEl,
      h(
        'button',
        {
          class: 'btn btn-primary',
          onclick: () => {
            const statements = sanitizeStatements(inputs.map((i) => i.value));
            if (!statements) {
              errorEl.textContent = 'Scrivi tutte e 3 le affermazioni.';
              return;
            }
            if (!isValidLieIndex(lieIndex)) {
              errorEl.textContent = 'Segna quale delle 3 è la bugia.';
              return;
            }
            ctx.submitAction({ type: ACTION_KIND.SUBMIT_STATEMENTS, statements, lieIndex });
          },
        },
        'Conferma affermazioni'
      ),
    ])
  );
}

function renderJudging(container, matchState, ctx) {
  const isAuthor = matchState.currentAuthorId === ctx.me.playerId;
  const author = matchState.currentAuthorId ? playerInfo(ctx.players, matchState.currentAuthorId) : null;
  const judges = judgesFor(matchState);

  const titleCard = h('div', { class: 'question-card' }, [
    h('p', {}, headerLabel(matchState)),
    h('p', { class: 'adjective' }, author ? `Le affermazioni di ${author.nickname}` : 'Vero o falso?'),
  ]);

  if (isAuthor) {
    // L'autore rivede le proprie affermazioni (sa già dov'è la bugia) e aspetta.
    container.appendChild(
      h('div', { class: 'stack' }, [
        titleCard,
        h('p', { class: 'text-center text-muted' }, 'Gli altri stanno cercando di scoprire la tua bugia...'),
        h(
          'ul',
          { class: 'statement-list' },
          matchState.currentStatements.map((text, idx) =>
            h('li', { class: `statement-item ${idx === matchState.currentLieIndex ? 'statement-lie' : 'statement-true'}` }, [
              h('span', { class: 'statement-mark' }, idx === matchState.currentLieIndex ? '✕' : '✓'),
              h('span', { class: 'statement-text' }, text),
            ])
          )
        ),
        waitingList(judges, new Set(Object.keys(matchState.judgements)), ctx.players),
      ])
    );
    return;
  }

  const myJudgement = matchState.judgements[ctx.me.playerId];
  if (isValidLieIndex(myJudgement)) {
    container.appendChild(
      h('div', { class: 'stack' }, [
        titleCard,
        h(
          'ul',
          { class: 'statement-list' },
          matchState.currentStatements.map((text, idx) =>
            h('li', { class: `statement-item ${idx === myJudgement ? 'statement-lie' : 'statement-true'}` }, [
              h('span', { class: 'statement-mark' }, idx === myJudgement ? '✕' : '✓'),
              h('span', { class: 'statement-text' }, text),
            ])
          )
        ),
        h('p', { class: 'text-center text-muted' }, 'Scelta inviata! In attesa degli altri giocatori...'),
        waitingList(judges, new Set(Object.keys(matchState.judgements)), ctx.players),
      ])
    );
    return;
  }

  // Selezione + conferma: si sceglie quale affermazione è la bugia (le altre
  // due diventano automaticamente vere) e si vede l'anteprima ✕/✓ prima di
  // inviare, così si può cambiare idea.
  let selected = null;
  const items = [];
  const errorEl = h('p', { class: 'text-center', style: { color: 'var(--color-danger)', minHeight: '1.2em' } });

  function refresh() {
    items.forEach(({ li, mark }, idx) => {
      const isLie = idx === selected;
      li.classList.toggle('statement-lie', isLie);
      li.classList.toggle('statement-true', selected !== null && !isLie);
      mark.textContent = selected === null ? '?' : isLie ? '✕' : '✓';
    });
  }

  const list = h(
    'ul',
    { class: 'statement-list' },
    matchState.currentStatements.map((text, idx) => {
      const mark = h('span', { class: 'statement-mark' }, '?');
      const li = h(
        'li',
        {
          class: 'statement-item statement-choice',
          onclick: () => {
            selected = idx;
            refresh();
          },
        },
        [mark, h('span', { class: 'statement-text' }, text)]
      );
      items.push({ li, mark });
      return li;
    })
  );

  container.appendChild(
    h('div', { class: 'stack' }, [
      titleCard,
      h('p', { class: 'text-muted text-center' }, 'Tocca la frase che secondo te è la BUGIA: le altre due diventano vere. Poi conferma.'),
      list,
      errorEl,
      h(
        'button',
        {
          class: 'btn btn-primary',
          onclick: () => {
            if (!isValidLieIndex(selected)) {
              errorEl.textContent = 'Scegli quale affermazione è la bugia.';
              return;
            }
            ctx.submitAction({ type: ACTION_KIND.SUBMIT_JUDGEMENT, lieIndex: selected });
          },
        },
        'Conferma scelta'
      ),
    ])
  );
}

function renderResults(container, matchState, ctx) {
  const result = computeResults(matchState);
  const isCustom = matchState.matchMode === 'custom';
  const author = matchState.currentAuthorId ? playerInfo(ctx.players, matchState.currentAuthorId) : null;
  const myPoints = result.scoreDeltas[ctx.me.playerId] || 0;
  const isLastInQueue = isCustom && matchState.queueIndex >= matchState.queue.length - 1;

  const list = h(
    'ul',
    { class: 'statement-list' },
    matchState.currentStatements.map((text, idx) => {
      const isLie = idx === matchState.currentLieIndex;
      const accusers = Object.entries(matchState.judgements)
        .filter(([, pick]) => pick === idx)
        .map(([judgeId]) => playerInfo(ctx.players, judgeId).nickname);
      return h('li', { class: `statement-item ${isLie ? 'statement-lie' : 'statement-true'}` }, [
        h('span', { class: 'statement-mark' }, isLie ? '✕' : '✓'),
        h('div', { class: 'grow' }, [
          h('p', { class: 'statement-text' }, text),
          h(
            'p',
            { class: 'statement-note' },
            `${isLie ? 'Era la bugia' : 'Era vera'}${accusers.length ? ` · accusata da ${accusers.join(', ')}` : ''}`
          ),
        ]),
      ]);
    })
  );

  const summary = [];
  if (author) {
    summary.push(
      h(
        'p',
        { class: 'text-center text-muted' },
        result.authorFooledEveryone
          ? `Nessuno ha scoperto la bugia di ${author.nickname}: +${POINTS_AUTHOR_FOOLED_EVERYONE} punto extra!`
          : `Hanno scoperto la bugia di ${author.nickname}: ${result.foundBy.map((id) => playerInfo(ctx.players, id).nickname).join(', ')}.`
      )
    );
  } else {
    summary.push(
      h(
        'p',
        { class: 'text-center text-muted' },
        result.foundBy.length
          ? `Hanno scoperto la bugia: ${result.foundBy.map((id) => playerInfo(ctx.players, id).nickname).join(', ')}.`
          : 'Nessuno ha scoperto la bugia!'
      )
    );
  }

  const controls = [];
  if (ctx.me.isHost) {
    if (isCustom && !isLastInQueue) {
      // Finché ci sono altri giocatori in coda l'host può SOLO proseguire:
      // è così che si garantisce il giro completo prima di chiudere il turno.
      controls.push(
        h('button', { class: 'btn btn-primary', onclick: () => ctx.requestNextQuestion() }, 'Prossimo giocatore')
      );
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
      list,
      ...summary,
      ...controls,
    ])
  );
}

function render(container, matchState, ctx) {
  const phase = matchState?.phase || 'judging';

  // Come negli altri minigiochi: ogni azione ribroadcasta l'intero matchState,
  // quindi senza questa chiave il testo scritto (o la scelta non ancora
  // confermata) di chi sta ancora decidendo verrebbe azzerato ad ogni invio
  // altrui.
  let editingKey = null;
  if (phase === 'writing' && !matchState.statementSets[ctx.me.playerId]) {
    editingKey = `writing:${matchState.turnNumber}`;
  } else if (
    phase === 'judging' &&
    matchState.currentAuthorId !== ctx.me.playerId &&
    !isValidLieIndex(matchState.judgements[ctx.me.playerId])
  ) {
    editingKey = `judging:${matchState.matchMode}:${matchState.turnNumber ?? matchState.roundNumber}:${matchState.queueIndex ?? 0}`;
  }

  if (editingKey && container.dataset.qpRenderKey === editingKey) return;
  container.dataset.qpRenderKey = editingKey || '';

  clear(container);
  if (phase === 'writing') renderWriting(container, matchState, ctx);
  else if (phase === 'results') renderResults(container, matchState, ctx);
  else renderJudging(container, matchState, ctx);
}

/** @type {import('../gameModule.js').GameModule} */
export const BugiaOVeritaModule = {
  id: 'bugiaoverita',
  displayName: 'Bugia o Verità?',
  initRoundState,
  render,
  reduce,
  computeResults,
  isRoundComplete,
  advanceRound,
  // Personalizzata: con 2 giocatori ci sarebbe un solo giudice per set, e il
  // punto extra all'autore diventerebbe un lancio di moneta.
  minPlayers: (matchMode) => (matchMode === 'custom' ? 3 : 2),
};

registerGame(BugiaOVeritaModule.id, BugiaOVeritaModule);
