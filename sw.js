const CACHE_NAME = 'joker-app-assets-v7';
const TEMP_CACHE = 'joker-temp';
const BASE_URL = 'https://raw.githubusercontent.com/udankkeramat/Underground-Joker/main/';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME && name !== TEMP_CACHE) return caches.delete(name);
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

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
                                ['Content-Range', `bytes \${start}-${end}/${arrayBuffer.byteLength}`],
                                ['Content-Length', String(sliced.byteLength)]
                            ]
                        });
                    }
                }
                return cachedResponse;
            }
            return fetch(event.request).catch(() => new Response('', { status: 503, statusText: 'Offline' }));
        })
    );
});