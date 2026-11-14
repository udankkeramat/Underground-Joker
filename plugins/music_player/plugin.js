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
            this.layer = ctx.getPluginLayer();

            this.songs = [];
            this.currentIndex = -1;
            this.isPlaying = false;
            this.isOpen = false;
            this.isPlaylistOpen = false;
            this.isAnimating = false;

            this.audio = new Audio();
            this.audio.preload = 'auto';

            // Posisi custom saat draggable (>= 5 players)
            this.customPos = null;
            this.isDragging = false;
            this.dragStartClient = { x: 0, y: 0 };
            this.dragStartPos = { right: 100, bottom: 128 };

            this.injectStyles();
            this.buildDOM();
            this.bindAudioEvents();
            this.bindDragEvents();
            this.loadSongsList();

            const showButton = () => {
                this.mp3Btn.classList.remove('mp-btn-hide');
                this.mp3Btn.classList.add('mp-btn-show');
            };

            const hideButton = () => {
                this.mp3Btn.classList.remove('mp-btn-show');
                this.mp3Btn.classList.add('mp-btn-hide');
                if (this.isOpen) {
                    this.forceCloseImmediate();
                }
            };

            // Jika plugin selesai dimuat saat user sudah di Main Screen, langsung tampilkan tombol
            if (ctx.getAppState && ctx.getAppState() === 'game') {
                setTimeout(showButton, 50);
            }

            ctx.on('onMainScreenEnter', showButton);
            ctx.on('onMainScreenLeave', hideButton);

            ctx.on('onPlayersRender', () => {
                if (this.isOpen) {
                    this.applyLayoutByPlayerCount();
                }
            });
        },

        injectStyles() {
            const style = document.createElement('style');
            style.textContent = `
                /* Tombol MP3 di pojok kiri bawah main screen */
                #btn-mp3-plugin {
                    position: absolute;
                    left: 40px;
                    bottom: 40px;
                    z-index: 105;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.8s ease;
                }
                #btn-mp3-plugin.mp-btn-hide {
                    transform: translateY(250px);
                    opacity: 0;
                    pointer-events: none;
                }
                #btn-mp3-plugin.mp-btn-show {
                    transform: translateY(0);
                    opacity: 1;
                    pointer-events: auto;
                }
                #btn-mp3-plugin:active {
                    transform: scale(0.9) !important;
                    transition: transform 0.1s !important;
                }
                #btn-mp3-plugin img {
                    display: block;
                    width: auto;
                    height: auto;
                    pointer-events: none;
                }
                #btn-mp3-plugin span {
                    position: absolute;
                    color: #ffffff;
                    font-size: 32px;
                    font-weight: bold;
                    text-transform: uppercase;
                    text-shadow: 2px 2px 4px #000;
                    pointer-events: none;
                }

                /* Root Wrapper untuk Music Player + Playlist (Layering di atas Players Container z-index 60) */
                #mp-root-wrapper {
                    position: absolute;
                    right: 100px;
                    bottom: 128px;
                    z-index: 85;
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

                /* Kontainer Playlist (Layer di bawah Kontainer Music Player) */
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