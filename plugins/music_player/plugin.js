(function () {
    const PLUGIN_BASE = 'https://raw.githubusercontent.com/udankkeramat/Underground-Joker/main/plugins/music_player/';
    const IMG_BASE = PLUGIN_BASE + 'images/';
    const SONG_BASE = PLUGIN_BASE + 'song/';
    const MAIN_BASE = 'https://raw.githubusercontent.com/udankkeramat/Underground-Joker/main/';

    window.JokerPlugins.register({
        id: 'music_player',
        name: 'Underground Joker Music Player',

        init(ctx) {
            this.ctx = ctx;
            this.AudioSys = ctx.AudioSys;
            this.appEl = ctx.getAppElement();
            this.menuLayer = ctx.getMenuLayer();
            this.gameLayer = ctx.getPluginLayer();

            this.songs = [];
            this.currentIndex = -1;
            this.isPlaying = false;
            this.isOpen = false;
            this.isPlaylistOpen = false;
            this.isAnimating = false;
            this.activeAnchor = 'game';

            this.audio = new Audio();
            this.audio.preload = 'auto';

            this.customPos = null;
            this.isDragging = false;
            this.dragStartClient = { x: 0, y: 0 };
            this.dragStartPos = { right: 100, bottom: 128 };

            this.injectStyles();
            this.buildDOM();
            this.bindAudioEvents();
            this.bindDragEvents();
            this.loadSongsList();

            const showGameButton = () => {
                this.gameBtn.classList.remove('mp-btn-hide');
                this.gameBtn.classList.add('mp-btn-show');
            };

            const hideGameButton = () => {
                this.gameBtn.classList.remove('mp-btn-show');
                this.gameBtn.classList.add('mp-btn-hide');
                if (this.isOpen) {
                    this.forceClosePanelOnly();
                }
            };

            const hideMenuPanel = () => {
                if (this.isOpen) {
                    this.forceClosePanelOnly();
                }
            };

            if (ctx.getAppState && ctx.getAppState() === 'game') {
                setTimeout(showGameButton, 50);
            }

            ctx.on('onMainMenuLeave', hideMenuPanel);
            ctx.on('onMainScreenEnter', showGameButton);
            ctx.on('onMainScreenLeave', hideGameButton);

            ctx.on('onPlayersRender', () => {
                if (this.isOpen && this.ctx.getAppState() === 'game') {
                    this.applyLayoutByPlayerCount();
                }
            });
        },

        injectStyles() {
            const style = document.createElement('style');
            style.textContent = `
                /* a. Button Music Player di Main Menu Screen (pojok kanan atas, dimensi asli) */
                #btn-mp3-menu {
                    position: absolute;
                    top: 33px;
                    right: 46px;
                    width: auto;
                    height: auto;
                    max-width: none;
                    max-height: none;
                    display: block;
                    z-index: 25;
                    cursor: pointer;
                    transition: transform 0.1s ease;
                }
                #btn-mp3-menu:active {
                    transform: scale(0.9);
                }

                /* b. Button Music Player di Main Screen (pojok kiri bawah, dimensi asli) */
                #btn-mp3-game {
                    position: absolute;
                    left: 40px;
                    bottom: 40px;
                    width: auto;
                    height: auto;
                    max-width: none;
                    max-height: none;
                    display: block;
                    z-index: 105;
                    cursor: pointer;
                    transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.8s ease;
                }
                #btn-mp3-game.mp-btn-hide {
                    transform: translateY(250px);
                    opacity: 0;
                    pointer-events: none;
                }
                #btn-mp3-game.mp-btn-show {
                    transform: translateY(0);
                    opacity: 1;
                    pointer-events: auto;
                }
                #btn-mp3-game:active {
                    transform: scale(0.9) !important;
                    transition: transform 0.1s !important;
                }

                /* Root Wrapper Music Player + Playlist */
                #mp-root-wrapper {
                    position: absolute;
                    right: 100px;
                    bottom: 128px;
                    z-index: 350;
                    display: none;
                    opacity: 0;
                    pointer-events: none;
                    will-change: transform, opacity;
                }
                #mp-root-wrapper.mp-visible {
                    pointer-events: auto;
                }

                /* Kontainer Music Player */
                #music-player-container {
                    position: relative;
                    z-index: 2;
                    display: inline-block;
                }

                #mp-tools-bg {
                    position: relative;
                    z-index: 2;
                    display: block;
                    pointer-events: none;
                }

                @keyframes mpDiscSpin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                #mp-disc {
                    position: absolute;
                    left: 32px;
                    bottom: -50px;
                    z-index: 1;
                    pointer-events: none;
                    animation: mpDiscSpin 8s linear infinite;
                    animation-play-state: paused;
                }
                #mp-disc.spinning {
                    animation-play-state: running;
                }

                .mp-tool-btn {
                    position: absolute;
                    z-index: 3;
                    display: block;
                    transition: transform 0.1s ease, filter 0.2s ease;
                }
                .mp-tool-btn.pressed {
                    transform: scale(0.9);
                }
                #mp-btn-play.is-playing {
                    filter: brightness(1.15) drop-shadow(0 0 12px rgba(241, 196, 15, 0.85));
                }

                #mp-btn-play {
                    right: 126px;
                    bottom: 134px;
                }
                #mp-btn-next {
                    right: 46px;
                    bottom: 220px;
                }
                #mp-btn-prev {
                    right: 212px;
                    bottom: 50px;
                }
                #mp-btn-playlist {
                    right: 398px;
                    bottom: 220px;
                }

                #mp-btn-close {
                    position: absolute;
                    right: 0px;
                    bottom: 448px;
                    width: 90px;
                    height: 90px;
                    object-fit: contain;
                    z-index: 4;
                    cursor: pointer;
                    transition: transform 0.1s;
                }
                #mp-btn-close:active {
                    transform: scale(0.85);
                }

                /* Kontainer Playlist */
                #music-playlist-container {
                    position: absolute;
                    right: 50%;
                    top: 50%;
                    transform: translateY(-50%);
                    z-index: 1;
                    clip-path: inset(0 0 0 100%);
                    transition: clip-path 0.42s cubic-bezier(0.25, 0.8, 0.25, 1);
                    pointer-events: none;
                }
                #music-playlist-container.playlist-open {
                    clip-path: inset(0 0 0 0%);
                    pointer-events: auto;
                }

                #mp-playlist-bg {
                    display: block;
                    position: relative;
                    z-index: 1;
                    pointer-events: none;
                }

                /* Kontainer Lagu 1372px x 460px */
                #mp-song-list-box {
                    position: absolute;
                    left: 152px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 1372px;
                    height: 460px;
                    border-radius: 25px;
                    background: rgba(0, 0, 0, 0.75);
                    border: 2px solid rgba(255, 255, 255, 0.18);
                    z-index: 2;
                    overflow: hidden;
                    box-shadow: inset 0 0 25px rgba(0, 0, 0, 0.85);
                }

                /* Scrollbar di sisi kiri kontainer lagu */
                #mp-song-scroll {
                    width: 100%;
                    height: 100%;
                    overflow-y: auto;
                    direction: rtl;
                    padding: 22px 35px 22px 24px;
                }
                #mp-song-scroll::-webkit-scrollbar {
                    width: 12px;
                }
                #mp-song-scroll::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 10px;
                    margin: 18px 0;
                }
                #mp-song-scroll::-webkit-scrollbar-thumb {
                    background: #f1c40f;
                    border-radius: 10px;
                }

                #mp-song-items {
                    direction: ltr;
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }

                .mp-song-row {
                    color: #ffffff;
                    font-size: 40px;
                    font-weight: bold;
                    text-shadow: 4px 4px 0px #000, -4px -4px 0px #000, 4px -4px 0px #000, -4px 4px 0px #000;
                    padding: 10px 20px;
                    border-radius: 14px;
                    cursor: pointer;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    transition: background-color 0.15s ease, transform 0.1s ease;
                }
                .mp-song-row:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                }
                .mp-song-row:active {
                    transform: scale(0.98);
                }
                .mp-song-row.active {
                    color: #f1c40f;
                    background-color: rgba(241, 196, 15, 0.12);
                }

                /* Indikator Segitiga Atas & Bawah Kontainer Lagu */
                .mp-scroll-tri {
                    position: absolute;
                    left: calc(152px + 686px);
                    transform: translateX(-50%);
                    z-index: 4;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px;
                    filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.8));
                    transition: opacity 0.25s ease, transform 0.1s ease;
                }
                .mp-scroll-tri:active {
                    transform: translateX(-50%) scale(0.88);
                }
                #mp-scroll-up {
                    bottom: calc(50% + 234px);
                }
                #mp-scroll-down {
                    top: calc(50% + 234px);
                }
            `;
            document.head.appendChild(style);
        },

        buildDOM() {
            // a. Button di Main Menu Screen (pojok kanan atas, ukuran dimensi asli)
            const menuBtn = document.createElement('img');
            menuBtn.id = 'btn-mp3-menu';
            menuBtn.src = IMG_BASE + 'button_music_player.png';
            menuBtn.alt = 'Music Player';
            menuBtn.onclick = () => {
                this.AudioSys.playSFX('button.mp3');
                if (this.isOpen) {
                    this.closeMusicPlayer();
                } else {
                    this.openMusicPlayer('menu');
                }
            };
            this.menuLayer.appendChild(menuBtn);
            this.menuBtn = menuBtn;

            // b. Button di Main Screen (pojok kiri bawah, ukuran dimensi asli)
            const gameBtn = document.createElement('img');
            gameBtn.id = 'btn-mp3-game';
            gameBtn.className = 'mp-btn-hide';
            gameBtn.src = IMG_BASE + 'button_music_player.png';
            gameBtn.alt = 'Music Player';
            gameBtn.onclick = () => {
                this.AudioSys.playSFX('button.mp3');
                if (this.isOpen) {
                    this.closeMusicPlayer();
                } else {
                    this.openMusicPlayer('game');
                }
            };
            this.gameLayer.appendChild(gameBtn);
            this.gameBtn = gameBtn;

            // Panel Music Player + Playlist
            const root = document.createElement('div');
            root.id = 'mp-root-wrapper';
            root.innerHTML = `
                <div id="music-playlist-container">
                    <img id="mp-playlist-bg" src="${IMG_BASE}playlist_background.png" alt="Playlist Background">
                    <div id="mp-scroll-up" class="mp-scroll-tri" style="opacity:0; pointer-events:none;">
                        <svg width="44" height="44" viewBox="0 0 24 24">
                            <polygon points="3,17 12,7 21,17" fill="white" stroke="white" stroke-width="2" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div id="mp-song-list-box">
                        <div id="mp-song-scroll">
                            <div id="mp-song-items"></div>
                        </div>
                    </div>
                    <div id="mp-scroll-down" class="mp-scroll-tri" style="opacity:0; pointer-events:none;">
                        <svg width="44" height="44" viewBox="0 0 24 24">
                            <polygon points="3,7 12,17 21,7" fill="white" stroke="white" stroke-width="2" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>

                <div id="music-player-container">
                    <img id="mp-disc" src="${IMG_BASE}music_disc.png" alt="Music Disc">
                    <img id="mp-tools-bg" src="${IMG_BASE}tools_background.png" alt="Tools Background">
                    <img id="mp-btn-play" class="mp-tool-btn" src="${IMG_BASE}button_play.png" alt="Play">
                    <img id="mp-btn-next" class="mp-tool-btn" src="${IMG_BASE}button_next.png" alt="Next">
                    <img id="mp-btn-prev" class="mp-tool-btn" src="${IMG_BASE}button_previous.png" alt="Previous">
                    <img id="mp-btn-playlist" class="mp-tool-btn" src="${IMG_BASE}button_playlist.png" alt="Playlist">
                    <img id="mp-btn-close" src="${MAIN_BASE}close.png" alt="Close">
                </div>
            `;
            this.appEl.appendChild(root);

            this.root = root;
            this.playerCont = root.querySelector('#music-player-container');
            this.playlistCont = root.querySelector('#music-playlist-container');
            this.discImg = root.querySelector('#mp-disc');
            this.toolsBg = root.querySelector('#mp-tools-bg');
            this.songScroll = root.querySelector('#mp-song-scroll');
            this.songItems = root.querySelector('#mp-song-items');
            this.scrollUpBtn = root.querySelector('#mp-scroll-up');
            this.scrollDownBtn = root.querySelector('#mp-scroll-down');

            this.setupPixelHitbox(root.querySelector('#mp-btn-play'), () => this.togglePlayPause());
            this.setupPixelHitbox(root.querySelector('#mp-btn-next'), () => this.playNext());
            this.setupPixelHitbox(root.querySelector('#mp-btn-prev'), () => this.playPrevious());
            this.setupPixelHitbox(root.querySelector('#mp-btn-playlist'), () => this.togglePlaylist());

            root.querySelector('#mp-btn-close').onclick = (e) => {
                e.stopPropagation();
                this.AudioSys.playSFX('close.mp3');
                this.closeMusicPlayer();
            };

            this.songScroll.addEventListener('scroll', () => this.updateScrollIndicators());
            this.scrollUpBtn.onclick = (e) => {
                e.stopPropagation();
                this.AudioSys.playSFX('button.mp3');
                this.songScroll.scrollBy({ top: -180, behavior: 'smooth' });
            };
            this.scrollDownBtn.onclick = (e) => {
                e.stopPropagation();
                this.AudioSys.playSFX('button.mp3');
                this.songScroll.scrollBy({ top: 180, behavior: 'smooth' });
            };
        },

        setupPixelHitbox(imgEl, onClickAction) {
            const canvas = document.createElement('canvas');
            const ctx2d = canvas.getContext('2d', { willReadFrequently: true });
            let pixelReady = false;

            const probeImg = new Image();
            probeImg.crossOrigin = 'anonymous';
            probeImg.onload = () => {
                canvas.width = probeImg.naturalWidth;
                canvas.height = probeImg.naturalHeight;
                try {
                    ctx2d.drawImage(probeImg, 0, 0);
                    ctx2d.getImageData(0, 0, 1, 1);
                    pixelReady = true;
                } catch (e) {
                    pixelReady = false;
                }
            };
            probeImg.src = imgEl.src;

            const isOpaqueAt = (clientX, clientY) => {
                if (!pixelReady) return true;
                const rect = imgEl.getBoundingClientRect();
                if (rect.width === 0 || rect.height === 0) return false;

                const { isPortrait } = this.ctx.getAppTransformState();
                let normX, normY;
                if (isPortrait) {
                    normX = (clientY - rect.top) / rect.height;
                    normY = 1 - ((clientX - rect.left) / rect.width);
                } else {
                    normX = (clientX - rect.left) / rect.width;
                    normY = (clientY - rect.top) / rect.height;
                }

                const px = Math.floor(normX * canvas.width);
                const py = Math.floor(normY * canvas.height);
                if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) return false;

                try {
                    const alpha = ctx2d.getImageData(px, py, 1, 1).data[3];
                    return alpha > 15;
                } catch (e) {
                    return true;
                }
            };

            imgEl.addEventListener('pointermove', (e) => {
                imgEl.style.cursor = isOpaqueAt(e.clientX, e.clientY) ? 'pointer' : 'default';
            });

            imgEl.addEventListener('pointerdown', (e) => {
                if (!isOpaqueAt(e.clientX, e.clientY)) return;
                e.stopPropagation();
                imgEl.classList.add('pressed');
            });

            const clearPress = () => imgEl.classList.remove('pressed');
            imgEl.addEventListener('pointerup', (e) => {
                const wasPressed = imgEl.classList.contains('pressed');
                clearPress();
                if (wasPressed && isOpaqueAt(e.clientX, e.clientY)) {
                    e.stopPropagation();
                    this.AudioSys.playSFX('button.mp3');
                    onClickAction();
                }
            });
            imgEl.addEventListener('pointerleave', clearPress);
            imgEl.addEventListener('pointercancel', clearPress);
        },

        async loadSongsList() {
            let songNames = [];
            try {
                const res = await fetch('https://api.github.com/repos/udankkeramat/Underground-Joker/contents/plugins/music_player/song');
                if (res.ok) {
                    const items = await res.json();
                    if (Array.isArray(items)) {
                        songNames = items
                            .filter(item => item.type === 'file' && /\.(mp3|ogg|wav|m4a|webm)$/i.test(item.name))
                            .map(item => item.name);
                        localStorage.setItem('joker_plugin_songs', JSON.stringify(songNames));
                    }
                }
            } catch (e) {}

            if (songNames.length === 0) {
                const cached = localStorage.getItem('joker_plugin_songs');
                if (cached) {
                    try { songNames = JSON.parse(cached); } catch (e) {}
                }
            }

            this.songs = songNames.map(fileName => ({
                fileName,
                title: fileName.replace(/\.[^/.]+$/, ''),
                url: SONG_BASE + encodeURIComponent(fileName)
            }));

            this.renderPlaylist();
        },

        renderPlaylist() {
            this.songItems.innerHTML = '';
            if (this.songs.length === 0) {
                const empty = document.createElement('div');
                empty.className = 'mp-song-row';
                empty.style.opacity = '0.6';
                empty.style.cursor = 'default';
                empty.textContent = 'Belum ada lagu di folder song';
                this.songItems.appendChild(empty);
                this.updateScrollIndicators();
                return;
            }

            this.songs.forEach((song, idx) => {
                const row = document.createElement('div');
                row.className = 'mp-song-row' + (idx === this.currentIndex ? ' active' : '');
                row.textContent = song.title;
                row.onclick = (e) => {
                    e.stopPropagation();
                    this.AudioSys.playSFX('button.mp3');
                    this.playSongAt(idx);
                };
                this.songItems.appendChild(row);
            });

            setTimeout(() => this.updateScrollIndicators(), 50);
        },

        updateScrollIndicators() {
            const el = this.songScroll;
            if (!el) return;
            if (el.scrollTop > 5) {
                this.scrollUpBtn.style.opacity = '1';
                this.scrollUpBtn.style.pointerEvents = 'auto';
            } else {
                this.scrollUpBtn.style.opacity = '0';
                this.scrollUpBtn.style.pointerEvents = 'none';
            }

            if (Math.ceil(el.scrollTop + el.clientHeight) < el.scrollHeight - 5) {
                this.scrollDownBtn.style.opacity = '1';
                this.scrollDownBtn.style.pointerEvents = 'auto';
            } else {
                this.scrollDownBtn.style.opacity = '0';
                this.scrollDownBtn.style.pointerEvents = 'none';
            }
        },

        bindAudioEvents() {
            this.audio.addEventListener('play', () => {
                this.isPlaying = true;
                this.discImg.classList.add('spinning');
                this.root.querySelector('#mp-btn-play').classList.add('is-playing');
                this.AudioSys.pauseBGMForPlugin();
                this.renderPlaylist();
            });

            this.audio.addEventListener('pause', () => {
                this.isPlaying = false;
                this.discImg.classList.remove('spinning');
                this.root.querySelector('#mp-btn-play').classList.remove('is-playing');
                this.AudioSys.resumeBGMFromPlugin();
            });

            this.audio.addEventListener('ended', () => {
                this.playNext();
            });
        },

        playSongAt(index) {
            if (this.songs.length === 0) return;
            if (index < 0) index = this.songs.length - 1;
            if (index >= this.songs.length) index = 0;

            this.currentIndex = index;
            this.audio.src = this.songs[index].url;
            this.audio.play().catch(() => {});
            this.renderPlaylist();
        },

        togglePlayPause() {
            if (this.songs.length === 0) return;
            if (this.currentIndex === -1) {
                this.playSongAt(0);
                return;
            }
            if (this.audio.paused) {
                this.audio.play().catch(() => {});
            } else {
                this.audio.pause();
            }
        },

        playNext() {
            if (this.songs.length === 0) return;
            const nextIdx = this.currentIndex === -1 ? 0 : (this.currentIndex + 1) % this.songs.length;
            this.playSongAt(nextIdx);
        },

        playPrevious() {
            if (this.songs.length === 0) return;
            if (this.currentIndex === -1) {
                this.playSongAt(0);
                return;
            }
            if (this.audio.currentTime > 3) {
                this.audio.currentTime = 0;
            } else {
                const prevIdx = (this.currentIndex - 1 + this.songs.length) % this.songs.length;
                this.playSongAt(prevIdx);
            }
        },

        togglePlaylist() {
            if (!this.isOpen || this.isAnimating) return;
            this.isPlaylistOpen = !this.isPlaylistOpen;
            if (this.isPlaylistOpen) {
                this.playlistCont.classList.add('playlist-open');
                setTimeout(() => this.updateScrollIndicators(), 60);
            } else {
                this.playlistCont.classList.remove('playlist-open');
            }
        },

        getZoomOriginOffset() {
            const mpWidth = this.toolsBg.naturalWidth || 550;
            const mpHeight = this.toolsBg.naturalHeight || 500;
            const currentRight = parseFloat(this.root.style.right || 100);
            const currentBottom = parseFloat(this.root.style.bottom || 128);

            const playerCenterX = 2392 - currentRight - (mpWidth / 2);
            const playerCenterY = 1080 - currentBottom - (mpHeight / 2);

            let btnCenterX, btnCenterY;
            if (this.activeAnchor === 'menu') {
                const bw = this.menuBtn.naturalWidth || 90;
                const bh = this.menuBtn.naturalHeight || 90;
                btnCenterX = 2392 - 46 - (bw / 2);
                btnCenterY = 33 + (bh / 2);
            } else {
                const bw = this.gameBtn.naturalWidth || 90;
                const bh = this.gameBtn.naturalHeight || 90;
                btnCenterX = 40 + (bw / 2);
                btnCenterY = 1080 - 40 - (bh / 2);
            }

            return {
                dx: btnCenterX - playerCenterX,
                dy: btnCenterY - playerCenterY
            };
        },

        openMusicPlayer(anchor = 'game') {
            if (this.isOpen || this.isAnimating) return;
            this.activeAnchor = anchor;
            this.isOpen = true;
            this.isAnimating = true;
            this.isPlaylistOpen = false;
            this.playlistCont.classList.remove('playlist-open');

            if (anchor === 'menu') {
                this.root.style.right = '100px';
                this.root.style.bottom = '260px';
                this.playerCont.style.cursor = 'default';
            } else {
                const count = this.ctx.getActivePlayerCount();
                if (count <= 4 || !this.customPos) {
                    this.root.style.right = '100px';
                    this.root.style.bottom = '128px';
                } else {
                    this.root.style.right = this.customPos.right + 'px';
                    this.root.style.bottom = this.customPos.bottom + 'px';
                }
                this.applyLayoutByPlayerCount();
            }

            this.root.style.display = 'block';

            const { dx, dy } = this.getZoomOriginOffset();
            this.root.style.transition = 'none';
            this.root.style.transform = `translate(${dx}px, ${dy}px) scale(0.15)`;
            this.root.style.opacity = '0';

            void this.root.offsetWidth;

            this.root.style.transition = 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.15), opacity 0.35s ease';
            this.root.style.transform = 'translate(0px, 0px) scale(1)';
            this.root.style.opacity = '1';

            setTimeout(() => {
                this.root.classList.add('mp-visible');
                this.isAnimating = false;
            }, 460);
        },

        closeMusicPlayer() {
            if (!this.isOpen || this.isAnimating) return;
            this.isAnimating = true;
            this.root.classList.remove('mp-visible');

            const performZoomOutToBtn = () => {
                if (this.activeAnchor === 'game') {
                    const playersCont = this.ctx.getPlayersContainer();
                    if (playersCont) {
                        playersCont.style.transform = '';
                    }
                }

                const { dx, dy } = this.getZoomOriginOffset();
                this.root.style.transition = 'transform 0.4s cubic-bezier(0.55, 0.055, 0.675, 0.19), opacity 0.35s ease';
                this.root.style.transform = `translate(${dx}px, ${dy}px) scale(0.15)`;
                this.root.style.opacity = '0';

                setTimeout(() => {
                    this.root.style.display = 'none';
                    this.isOpen = false;
                    this.isAnimating = false;
                }, 410);
            };

            if (this.isPlaylistOpen) {
                this.isPlaylistOpen = false;
                this.playlistCont.classList.remove('playlist-open');
                setTimeout(performZoomOutToBtn, 430);
            } else {
                performZoomOutToBtn();
            }
        },

        forceClosePanelOnly() {
            this.isOpen = false;
            this.isPlaylistOpen = false;
            this.isAnimating = false;
            this.playlistCont.classList.remove('playlist-open');
            this.root.classList.remove('mp-visible');
            this.root.style.display = 'none';
            const playersCont = this.ctx.getPlayersContainer();
            if (playersCont) playersCont.style.transform = '';
        },

        applyLayoutByPlayerCount() {
            const count = this.ctx.getActivePlayerCount();
            const playersCont = this.ctx.getPlayersContainer();
            if (!playersCont) return;

            if (count <= 4) {
                this.root.style.right = '100px';
                this.root.style.bottom = '128px';
                this.playerCont.style.cursor = 'default';

                const mpWidth = this.toolsBg.naturalWidth || 560;
                const mpLeftEdge = 2392 - 100 - mpWidth;
                const totalPlayersWidth = (count * 340) + ((count - 1) * 40);
                const rightmostPlayerEdge = 1196 + (totalPlayersWidth / 2);
                const shiftLeft = Math.max(0, (rightmostPlayerEdge + 40) - mpLeftEdge);

                playersCont.style.transform = shiftLeft > 0 ? `translateX(-${shiftLeft}px)` : 'translateX(0px)';
            } else {
                playersCont.style.transform = 'translateX(0px)';
                this.playerCont.style.cursor = 'grab';
            }
        },

        bindDragEvents() {
            this.playerCont.addEventListener('pointerdown', (e) => {
                if (!this.isOpen || this.activeAnchor !== 'game' || this.ctx.getActivePlayerCount() < 5) return;
                if (e.target.id === 'mp-btn-close') return;

                this.isDragging = true;
                this.playerCont.style.cursor = 'grabbing';
                this.dragStartClient = { x: e.clientX, y: e.clientY };
                this.dragStartPos = {
                    right: parseFloat(this.root.style.right || 100),
                    bottom: parseFloat(this.root.style.bottom || 128)
                };
                this.playerCont.setPointerCapture(e.pointerId);
            });

            this.playerCont.addEventListener('pointermove', (e) => {
                if (!this.isDragging) return;
                const { isPortrait, scale } = this.ctx.getAppTransformState();
                const rawDx = e.clientX - this.dragStartClient.x;
                const rawDy = e.clientY - this.dragStartClient.y;

                let appDx, appDy;
                if (isPortrait) {
                    appDx = rawDy / scale;
                    appDy = -rawDx / scale;
                } else {
                    appDx = rawDx / scale;
                    appDy = rawDy / scale;
                }

                const mpWidth = this.toolsBg.naturalWidth || 560;
                const mpHeight = this.toolsBg.naturalHeight || 500;

                let newRight = this.dragStartPos.right - appDx;
                let newBottom = this.dragStartPos.bottom - appDy;

                newRight = Math.max(0, Math.min(2392 - mpWidth, newRight));
                newBottom = Math.max(50, Math.min(1080 - mpHeight, newBottom));

                this.root.style.right = newRight + 'px';
                this.root.style.bottom = newBottom + 'px';
                this.customPos = { right: newRight, bottom: newBottom };
            });

            const endDrag = () => {
                if (!this.isDragging) return;
                this.isDragging = false;
                if (this.activeAnchor === 'game' && this.ctx.getActivePlayerCount() >= 5) {
                    this.playerCont.style.cursor = 'grab';
                }
            };

            this.playerCont.addEventListener('pointerup', endDrag);
            this.playerCont.addEventListener('pointercancel', endDrag);
        }
    });
})();