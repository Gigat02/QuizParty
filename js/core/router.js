const routes = new Map();
let rootEl = null;
let currentCleanup = null;

/**
 * Registra una route.
 * @param {string} path es. '#home', '#mode', '#lobby', '#game'
 * @param {(root: HTMLElement, params: URLSearchParams) => (void | (() => void))} renderFn
 *   può restituire una funzione di cleanup (es. per rimuovere listener Firestore)
 */
export function route(path, renderFn) {
  routes.set(path, renderFn);
}

export function initRouter(root) {
  rootEl = root;
  window.addEventListener('hashchange', render);
  render();
}

export function navigate(path) {
  if (window.location.hash === path) {
    render();
  } else {
    window.location.hash = path;
  }
}

function render() {
  if (currentCleanup) {
    try {
      currentCleanup();
    } catch (err) {
      console.error('Errore durante cleanup della route precedente', err);
    }
    currentCleanup = null;
  }

  const rawHash = window.location.hash || '#home';
  const [path, query] = rawHash.split('?');
  const params = new URLSearchParams(query || '');
  const renderFn = routes.get(path) || routes.get('#home');

  if (!renderFn) return;
  const cleanup = renderFn(rootEl, params);
  if (typeof cleanup === 'function') currentCleanup = cleanup;
}
