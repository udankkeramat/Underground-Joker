const CACHE_NAME = 'joker-app-assets-v7';
const SHELL_CACHE = 'joker-app-shell-v1';
const TEMP_CACHE = 'joker-temp';
const BASE_URL = 'https://raw.githubusercontent.com/udankkeramat/Underground-Joker/main/';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then((cache) => cache.addAll(['./', 'index.html', 'manifest.json']).catch(() => {}))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME && name !== SHELL_CACHE && name !== TEMP_CACHE) {
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    const isNavigation = event.request.mode === 'navigate' ||
        (url.origin === self.location.origin && (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')));

    if (isNavigation) {
        event.respondWith(
            fetch(event.request)
                .then((networkRes) => {
                    if (networkRes && networkRes.ok) {
                        const clone = networkRes.clone();
                        caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, clone));
                    }
                    return networkRes;
                })
                .catch(async () => {
                    const cached = await caches.match(event.request, { ignoreSearch: true });
                    return cached || caches.match('index.html') || new Response('', { status: 503, statusText: 'Offline' });
                })
        );
        return;
    }

    const rangeHeader = event.request.headers.get('range');

    event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(async (cachedResponse) => {
            if (cachedResponse) {
                if (rangeHeader) {
                    const arrayBuffer = await cachedResponse.arrayBuffer();
                    const bytes = /^bytes\=(\d+)\-(\d+)?$/g.exec(rangeHeader);
                    if (bytes) {
                        const start = Number(bytes[1]);
                        const end = bytes[2] ? Number(bytes[2]) : arrayBuffer.byteLength - 1;
                        const sliced = arrayBuffer.slice(start, end + 1);
                        return new Response(sliced, {
                            status: 206,
                            statusText: 'Partial Content',
                            headers: [
                                ['Content-Type', cachedResponse.headers.get('Content-Type') || 'application/octet-stream'],
                                ['Content-Range', `bytes ${start}-${end}/${arrayBuffer.byteLength}`],
                                ['Content-Length', String(sliced.byteLength)]
                            ]
                        });
                    }
                }
                return cachedResponse;
            }
            return fetch(event.request)
                .then((networkRes) => {
                    if (networkRes && networkRes.ok && url.origin === self.location.origin) {
                        const clone = networkRes.clone();
                        caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, clone));
                    }
                    return networkRes;
                })
                .catch(() => new Response('', { status: 503, statusText: 'Offline' }));
        })
    );
});