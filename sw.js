const CACHE_NAME = 'joker-pwa-cache-v1';

// Bypass waiting phase agar update service worker langsung aktif
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Strategi Network-First: Ambil dari internet dulu (update otomatis), kalau gagal/offline baru pakai Cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Jangan cache request yang gagal atau bukan dari protokol http/https (seperti ekstensi chrome)
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                // Simpan/Timpa (replace) file terbaru ke dalam cache
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                return networkResponse;
            })
            .catch(() => {
                // Jika offline atau jaringan putus, ambil file dari cache
                return caches.match(event.request);
            })
    );
});