const CACHE_NAME = 'joker-app-assets-v3';
const BASE_URL = 'https://raw.githubusercontent.com/udankkeramat/Underground-Joker/main/';

// Pre-cache hanya untuk App Shell inti agar PWA bisa terdeteksi offline
let coreAssets = [
    './',
    './index.html',
    './manifest.json',
    BASE_URL + 'logo.png',
    BASE_URL + 'button.png'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            for (let url of coreAssets) {
                try {
                    const response = await fetch(url);
                    if (response.ok) { await cache.put(url, response); }
                } catch (err) {}
            }
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) return caches.delete(name);
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Strategi: Stale-While-Revalidate (Otomatis caching jika ada file yang ditarik saat main)
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
                }
                return networkResponse;
            }).catch(() => {});
            return cachedResponse || fetchPromise;
        })
    );
});