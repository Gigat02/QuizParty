// Cache-first dell'app shell, così dopo la prima apertura con internet il
// sito continua a funzionare offline (scenario "pullman senza internet").
// Bump manuale di CACHE_NAME ad ogni deploy che cambia file cacheati,
// altrimenti gli utenti restano bloccati su una versione vecchia.
const CACHE_NAME = 'quizparty-v4';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './css/screens.css',
  './js/app.js',
  './js/config/firebase-config.js',
  './js/core/dom.js',
  './js/core/state.js',
  './js/core/router.js',
  './js/core/colors.js',
  './js/core/id.js',
  './js/core/auth.js',
  './js/core/firebase.js',
  './js/transport/transport.js',
  './js/transport/firestoreTransport.js',
  './js/transport/webrtcTransport.js',
  './js/transport/firestoreSignaling.js',
  './js/transport/activeTransport.js',
  './js/games/gameModule.js',
  './js/games/registry.js',
  './js/games/classifico/index.js',
  './js/games/classifico/adjectives.js',
  './js/games/classifico/ranking.js',
  './js/games/classifico/rankList.js',
  './js/screens/homeScreen.js',
  './js/screens/modeSelectScreen.js',
  './js/screens/matchModeSelectScreen.js',
  './js/screens/createLobbyScreen.js',
  './js/screens/joinLobbyScreen.js',
  './js/screens/lobbyScreen.js',
  './js/screens/gameScreen.js',
  './js/ui/qrInvite.js',
  './js/ui/playerChip.js',
  './js/ui/scoreboardPanel.js',
  './js/vendor/qrcode/qrcode.js',
  './assets/fonts/fredoka.woff2',
  './assets/fonts/nunito.woff2',
  './assets/logo.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
  './assets/icons/favicon-32.png',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          fetch(url, { mode: url.startsWith('http') ? 'cors' : 'same-origin' })
            .then((res) => {
              if (res.ok) return cache.put(url, res);
            })
            .catch(() => {})
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  const isPrecached = PRECACHE_URLS.some((u) => url.endsWith(u.replace('./', '')) || url === u);
  if (!isPrecached) return; // lascia passare Firestore/altre chiamate dinamiche

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, res.clone()));
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
