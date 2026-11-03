/// <reference lib="webworker" />
// FORMA LAB service worker.
// - Precaches the app shell (JS, CSS, fonts, bundled photos) so the program, the textual
//   instructions, the workout logger, the timer and the local history work offline.
// - Navigations are network-first: when online, an expired login session is correctly redirected
//   to the login page by the server; when offline, the cached app shell is used.
// - Nothing personal is ever cached here: training data lives in IndexedDB, not in HTTP caches.
import { precacheAndRoute, cleanupOutdatedCaches, matchPrecache } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const shell = new NetworkFirst({
  cacheName: 'app-shell',
  networkTimeoutSeconds: 4,
  plugins: [new CacheableResponsePlugin({ statuses: [200] })],
});

registerRoute(
  ({ request, url }) => request.mode === 'navigate' && !url.pathname.startsWith('/__auth/'),
  async (options) => {
    try {
      const res = await shell.handle(options);
      if (res) return res;
    } catch {
      /* offline and not in runtime cache: fall back to the precached shell */
    }
    const cached = await matchPrecache('/index.html');
    return cached ?? Response.error();
  },
);

// Public YouTube thumbnails: cache so the video library keeps its look offline.
registerRoute(
  ({ url }) => url.hostname === 'i.ytimg.com',
  new CacheFirst({
    cacheName: 'yt-thumbs',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 60 }),
    ],
  }),
);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') void self.skipWaiting();
});
