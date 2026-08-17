const games = new Map();

/** @param {string} id @param {import('./gameModule.js').GameModule} module */
export function registerGame(id, module) {
  games.set(id, module);
}

/** @returns {import('./gameModule.js').GameModule} */
export function getGame(id) {
  const module = games.get(id);
  if (!module) throw new Error(`Minigioco non registrato: ${id}`);
  return module;
}

export function listGames() {
  return [...games.values()];
}
