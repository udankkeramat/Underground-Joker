const CACHE_NAME = 'joker-app-assets-v1';
const BASE_URL = 'https://raw.githubusercontent.com/udankkeramat/Underground-Joker/main/';

// 1. GENERATE DAFTAR SEMUA ASSET (Sama persis dengan urutan di index.html)
let assetsToCache = [
    './',
    './index.html',
    './manifest.json',
    // Main Asset & Video
    'logo.png', 'background.png', 'background_classic.mp4', 'background_farm.mp4', 'menu_screen.png', 'background_screen4.png',
    'thumbnail_classic_on.png', 'thumbnail_classic_off.png', 'thumbnail_farm_on.png', 'thumbnail_farm_off.png',
    // UI Game
    'players_count.png', 'goal_score.png', 'sound.png', 'tutorial.png', 'exit_app.png', 'start.png', 'main_menu.png', 'next_match.png',
    'option.png', 'players.png', 'star.png', 'star_2.png', 'use.png', 'back.png', 'border_avatar.png', 'badge.png',
    // Flags
    'flag_1_classic.png', 'flag_2_classic.png', 'flag_3_classic.png', 'flag_4_classic.png', 'flag_5_classic.png',
    'flag_1_farm.png', 'flag_2_farm.png', 'flag_3_farm.png', 'flag_4_farm.png', 'flag_5_farm.png',
    // UI Tambahan
    'submit.png', 'log.png', 'modal_default.png', 'close.png', 'cancel.png', 'yes.png', 'no.png', 'ok.png', 
    'english.png', 'indonesia.png', 'reset.png', 'language.png', 'edit.png', 'winner.png', 'button_edit.png',
    // Font
    'velthoven_black.ttf',
    // Audio SFX
    'close.mp3', 'keypad.mp3', 'start.mp3', 'notification.mp3', 'button.mp3', 'welcome.mp3', 'score_for_round.mp3',
    // Audio BGM
    'bgm_main_menu.mp3', 'bgm_classic.mp3', 'bgm_farm.mp3', 'bgm_fanfare.mp3',
    // Audio Badge/Announcer
    '1_star.mp3', 'wildcard.mp3', 'illusionist.mp3', 'mastermind.mp3', 'godlike.mp3', 'legendary.mp3', 'god_of_joker.mp3', 'on_the_stage.mp3'
].map(item => item.startsWith('./') ? item : BASE_URL + item);

// Push asset mp3 1 sampai 20
for(let i = 1; i <= 20; i++) {
    assetsToCache.push(BASE_URL + i + '.mp3');
}

// Push asset Avatar (PNG & MP3)
const avatarNamesList = ["kamaruddin", "rustam", "suardi", "ridwan", "rizal", "rudy", "fajrin", "arya", "juragan", "tolingu"];
avatarNamesList.forEach(name => {
    assetsToCache.push(BASE_URL + `avatar_${name}.png`);
    assetsToCache.push(BASE_URL + `${name}.mp3`);
});


// 2. EVENT INSTALL: Download paksa semua aset ke Cache Storage
self.addEventListener('install', (event) => {
    // Agar Service Worker baru langsung aktif tanpa menunggu tab ditutup
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME).then(async (cache) => {
            console.log('[Service Worker] Memulai download seluruh asset untuk offline mode...');
            // Download file satu per satu agar jika ada 1 file yang gagal (misal typo nama), 
            // instalasi keseluruhan tidak langsung berhenti.
            for (let url of assetsToCache) {
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        await cache.put(url, response);
                    }
                } catch (err) {
                    console.error('[Service Worker] Gagal cache asset:', url, err);
                }
            }
            console.log('[Service Worker] Semua asset berhasil masuk Cache Storage!');
        })
    );
});


// 3. EVENT ACTIVATE: Menghapus cache versi lama jika CACHE_NAME diubah
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        console.log('[Service Worker] Menghapus cache lama:', name);
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});


// 4. EVENT FETCH: Strategi "Stale-While-Revalidate" (Cek Cache + Update Network)
self.addEventListener('fetch', (event) => {
    // Hanya tangkap metode GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            
            // Proses cek ke jaringan (GitHub) di latar belakang
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // a. Pengecekan aset berbeda/baru:
                // Jika jaringan berhasil merespons dengan status 200 OK (berarti ada file baru / belum ada di cache),
                // maka simpan ke Cache untuk me-replace file lama.
                // Jika file di GitHub tidak ada perubahan, GitHub otomatis membalas dengan status HTTP 304 (Not Modified),
                // sehingga file tidak akan di-download ulang dari nol (menghemat kuota).
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // b. Kondisi Offline: Permintaan ke jaringan dibatalkan secara diam-diam.
                // Logika akan otomatis menggunakan 'cachedResponse' di bawah ini.
            });

            // Prioritas: Jika file ada di Cache, kembalikan instan ke game.
            // Jika file belum ada di Cache sama sekali, kembalikan hasil download dari jaringan (fetchPromise).
            return cachedResponse || fetchPromise;
        })
    );
});