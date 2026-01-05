import {
    updateMediaMetadata,
    updateMediaPlaybackState,
    updateMediaPositionState,
    initMediaSessionHandlers
} from './media-session.js';

document.addEventListener('DOMContentLoaded', () => {
    const audio = document.getElementById('audioPlayer');
    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const seekbar = document.getElementById('seekbar');
    const currentTimeElem = document.getElementById('currentTime');
    const durationElem = document.getElementById('duration');
    const repeatBtn = document.getElementById('repeatBtn');
    const repeatIcon = document.getElementById('repeatIcon');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeIcon = document.getElementById('volumeIcon');
    const titleElem = document.getElementById('trackTitle');
    const artistElem = document.getElementById('trackArtist');
    const coverImg = document.getElementById('coverImg');
    const favBtn = document.getElementById('favBtn');
    const trackCountElem = document.getElementById('trackCount');

    // Элементы для полноэкранного режима
    const playerFooter = document.querySelector('.player');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const fullscreenCloseBtn = document.getElementById('fullscreenCloseBtn');
    const fullscreenCoverImg = document.getElementById('fullscreenCoverImg');
    const fullscreenTitle = document.getElementById('fullscreenTrackTitle');
    const fullscreenArtist = document.getElementById('fullscreenTrackArtist');

    // === Глобальные переменные ===
    let allTracks = [];
    let recentTracks = [];
    let favoriteTracks = [];
    let searchResults = [];
    let currentPlaylist = [];
    let currentTrackIndex = 0;
    let currentSection = 'music';
    let isPlaying = false;
    let isRepeating = false;
    let trackOffset = 0;
    const trackLimit = 20;
    let isLoading = false;
    let allLoaded = false;
    let favoritesLoaded = false;
    let musicLoaded = false;
    let recentLoaded = false;

    function setupMediaSessionHandlers() {
        initMediaSessionHandlers({
            play: playTrack,
            pause: pauseTrack,
            next: nextTrack,
            prev: prevTrack,
        });
    }

    setupMediaSessionHandlers();

    // === Вспомогательные функции ===
    function formatTime(sec) {
        if (!isFinite(sec) || isNaN(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function createTrackRow(track, index, section) {
        const row = document.createElement('div');
        row.className = 'track-row';
        row.dataset.id = track.id;
        row.dataset.section = section;
        row.dataset.index = index;

        const coverUrl = track.cover && String(track.cover).trim() !== "" ? encodeURI(track.cover) : "/static/default_cover.png";
        const duration = track.duration ? formatTime(track.duration) : "--:--";

        row.innerHTML = `
            <div class="track-number w-6 opacity-60">${index + 1}</div>
            <img class="list-cover w-10 h-10 rounded-md object-cover" src="${coverUrl}" alt="cover" loading="lazy" onerror="this.onerror=null;this.src='/static/default_cover.png'">
            <div class="track-info flex-1 overflow-hidden ml-3">
                <div class="track-title font-semibold truncate">${track.title}</div>
                <div class="track-artist text-sm opacity-80 truncate">${track.artist}</div>
            </div>
            <div class="track-duration text-sm opacity-80 w-12 text-right">${duration}</div>
            <div class="track-actions flex gap-3 ml-4 items-center">
                <button class="fav-btn text-gray-400 hover:text-yellow-500 text-lg" aria-label="fav">
                    <i class="fa-solid ${track.favorite ? 'fa-star text-yellow-500' : 'fa-star'}"></i>
                </button>
            </div>
        `;

        row.querySelector('.fav-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavoriteForTrack(track);
        });

        row.addEventListener('click', () => {
            const idx = Number(row.dataset.index) || 0;
            playFromSection(section, idx);
        });

        return row;
    }

    // Создаёт карточку трека для горизонтального скролла
    function createTrackCard(track, index) {
        const card = document.createElement('div');
        card.className = 'track-card';
        card.dataset.id = track.id;
        card.dataset.index = index;

        const coverUrl = track.cover && String(track.cover).trim() !== "" ? encodeURI(track.cover) : "/static/default_cover.png";

        card.innerHTML = `
            <div class="track-card-cover-wrapper">
                <img class="track-card-cover" src="${coverUrl}" alt="cover" loading="lazy" onerror="this.onerror=null;this.src='/static/default_cover.png'">
                <div class="track-card-play">
                    <i class="fa-solid fa-play"></i>
                </div>
            </div>
            <div class="track-card-title">${track.title}</div>
            <div class="track-card-artist">${track.artist}</div>
        `;

        card.addEventListener('click', () => {
            // Играем из списка недавних
            currentPlaylist = recentTracks;
            currentSection = 'recent';
            currentTrackIndex = index;
            loadTrack(index);
            playTrack();
        });

        return card;
    }

    // === Рендеры списков ===
    function renderList(container, tracks, section) {
        if (!container) return;
        container.innerHTML = '';
        if (tracks.length === 0) {
            container.innerHTML = `<p class="p-4 text-center opacity-60">Здесь пока пусто</p>`;
        } else {
            tracks.forEach((track, index) => {
                container.appendChild(createTrackRow(track, index, section));
            });
        }
    }

    function renderAllTracks() {
        renderList(document.getElementById('allTracksList'), allTracks, 'music');
        if (trackCountElem) {
            trackCountElem.textContent = `Всего треков: ${allTracks.length}${allLoaded ? '' : '+'}`;
        }
    }

    // Рендер недавних треков как карточек
    function renderRecentTracks() {
        const container = document.getElementById('recentTracksList');
        if (!container) return;

        container.innerHTML = '';

        if (recentTracks.length === 0) {
            container.innerHTML = `<div class="track-cards-empty">Пока нет недавних треков</div>`;
            return;
        }

        recentTracks.forEach((track, index) => {
            container.appendChild(createTrackCard(track, index));
        });
    }

    function renderFavorites() {
        renderList(document.getElementById('favoritesList'), favoriteTracks, 'favorites');
    }

    function renderSearchResults() {
        renderList(document.getElementById('searchResults'), searchResults, 'search');
    }

    // === Загрузка треков ===
    
    // Загрузка недавно добавленных треков (с сортировкой recent)
    async function loadRecentTracks() {
        if (recentLoaded) return;
        console.log('Загрузка недавних треков...');

        try {
            const res = await fetch('/playlist/data?offset=0&limit=10&sort=recent');
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();

            if (data && !data.error && Array.isArray(data)) {
                recentTracks = data;
                renderRecentTracks();
                recentLoaded = true;
            }
        } catch (err) {
            console.error("Ошибка загрузки недавних треков:", err);
        }
    }

    async function loadFavoriteTracks() {
        if (favoritesLoaded) return;
        console.log('Загрузка любимых треков...');

        try {
            const res = await fetch('/playlist/favorites');
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();

            if (data && !data.error && Array.isArray(data)) {
                favoriteTracks = data;
                renderFavorites();
                favoritesLoaded = true;
            }
        } catch (err) {
            console.error("Ошибка загрузки любимых треков:", err);
        }
    }

    async function loadAllTracks(initial = false) {
        if (isLoading || allLoaded) return;
        isLoading = true;

        try {
            const res = await fetch(`/playlist/data?offset=${trackOffset}&limit=${trackLimit}`);
            const data = await res.json();

            if (!data.error && Array.isArray(data) && data.length > 0) {
                const uniqueTracks = data.filter(newTrack => !allTracks.some(existing => existing.id === newTrack.id));
                allTracks.push(...uniqueTracks);
                renderAllTracks();
                trackOffset += data.length;
            } else {
                allLoaded = true;
                if (trackCountElem) {
                    trackCountElem.textContent = `Всего треков: ${allTracks.length}`;
                }
            }
        } catch (err) {
            console.error("Ошибка загрузки треков:", err);
        }
        isLoading = false;
        musicLoaded = true;
    }

    // === Воспроизведение ===
    function playTrack() {
        audio.play();
        isPlaying = true;
        updatePlayIcon();
        updateMediaPlaybackState(true);
    }

    function pauseTrack() {
        audio.pause();
        isPlaying = false;
        updatePlayIcon();
        updateMediaPlaybackState(false);
    }

    function togglePlayPause() {
        if (!audio.src) return;
        isPlaying ? pauseTrack() : playTrack();
    }

    function updatePlayIcon() {
        playIcon.className = `fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`;
    }

    function playFromSection(section, index) {
        currentSection = section;
        switch (section) {
            case 'music':
                currentPlaylist = allTracks;
                break;
            case 'recent':
                currentPlaylist = recentTracks;
                break;
            case 'favorites':
                currentPlaylist = favoriteTracks;
                break;
            case 'search':
                currentPlaylist = searchResults;
                break;
            default:
                currentPlaylist = allTracks;
        }

        if (!currentPlaylist || currentPlaylist.length === 0) return;
        currentTrackIndex = Math.max(0, Math.min(index, currentPlaylist.length - 1));

        loadTrack(currentTrackIndex);
        playTrack();
    }

    function loadTrack(index) {
        const track = currentPlaylist[index];
        if (!track) return;

        titleElem.textContent = track.title;
        artistElem.textContent = track.artist;
        const coverUrl = track.cover && track.cover.trim() !== "" ? track.cover : "/static/default_cover.png";
        coverImg.src = coverUrl;
        audio.src = track.src || "";

        fullscreenTitle.textContent = track.title;
        fullscreenArtist.textContent = track.artist;
        fullscreenCoverImg.src = coverUrl;

        updateFavBtn(!!track.favorite);
        updateActiveRows();
        updateMediaMetadata({
            title: track.title,
            artist: track.artist,
            cover: coverUrl
        });
    }

    function nextTrack() {
        currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
        loadTrack(currentTrackIndex);
        playTrack();
    }

    function prevTrack() {
        currentTrackIndex = (currentTrackIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        loadTrack(currentTrackIndex);
        playTrack();
    }

    function updateActiveRows() {
        document.querySelectorAll('.track-row').forEach(row => row.classList.remove('active'));
        document.querySelectorAll('.track-card').forEach(card => card.classList.remove('active'));
        
        const currentTrack = currentPlaylist[currentTrackIndex];
        if (!currentTrack) return;

        // Подсветка в списках
        document.querySelectorAll(`.track-row[data-id="${currentTrack.id}"]`).forEach(row => {
            row.classList.add('active');
        });
        
        // Подсветка в карточках
        document.querySelectorAll(`.track-card[data-id="${currentTrack.id}"]`).forEach(card => {
            card.classList.add('active');
        });
    }

    // === Избранное ===
    async function toggleFavoriteForTrack(track) {
        if (!track || !track.id) return;

        const originalStatus = track.favorite;
        track.favorite = !track.favorite;

        updateUIAfterFavoriteToggle(track);

        try {
            const endpoint = originalStatus ? "/playlist/remove" : "/playlist/add";
            await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: track.id })
            });
        } catch (err) {
            console.error("Ошибка при смене избранного:", err);
            track.favorite = originalStatus;
            updateUIAfterFavoriteToggle(track);
        }
    }

    function updateUIAfterFavoriteToggle(track) {
        // Обновляем во всех массивах
        [allTracks, recentTracks, searchResults].forEach(arr => {
            const found = arr.find(t => t.id === track.id);
            if (found) found.favorite = track.favorite;
        });

        if (track.favorite) {
            if (!favoriteTracks.some(fav => fav.id === track.id)) {
                favoriteTracks.unshift(track);
            }
        } else {
            favoriteTracks = favoriteTracks.filter(fav => fav.id !== track.id);
        }

        // Обновляем иконки
        document.querySelectorAll(`[data-id="${track.id}"] .fa-star`).forEach(icon => {
            icon.classList.toggle('text-yellow-500', track.favorite);
        });

        if (currentPlaylist[currentTrackIndex]?.id === track.id) {
            updateFavBtn(track.favorite);
        }

        renderFavorites();
    }

    function updateFavBtn(isFavorite) {
        favBtn.querySelector('i').classList.toggle('text-yellow-500', isFavorite);
    }

    function toggleFavorite() {
        const track = currentPlaylist[currentTrackIndex];
        if (!track) return;
        toggleFavoriteForTrack(track);
    }

    // === Поиск ===
    async function searchMusic() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) {
            searchResults = [];
            renderSearchResults();
            return;
        }

        try {
            const res = await fetch(`/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            const tracks = data.tracks || [];

            searchResults = tracks;
            renderSearchResults();
        } catch (err) {
            console.error("Ошибка поиска:", err);
        }
    }

    window.searchMusic = searchMusic;

    // === Навигация по секциям ===
    function switchSection(targetSection) {
        document.querySelectorAll('[id^="section-"]').forEach(el => el.classList.add('hidden'));
        const targetElement = document.getElementById(`section-${targetSection}`);
        if (targetElement) {
            targetElement.classList.remove('hidden');
        }

        document.querySelectorAll('.menu-link').forEach(el => el.classList.remove('active'));
        const activeLink = document.querySelector(`.menu-link[data-section="${targetSection}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Загрузка данных при переходе
        if (targetSection === 'favorites') {
            loadFavoriteTracks();
        }
        if (targetSection === 'music' && !musicLoaded) {
            loadAllTracks(true);
        }
    }

    // === Обработчики событий ===
    playBtn.addEventListener('click', togglePlayPause);
    nextBtn.addEventListener('click', nextTrack);
    prevBtn.addEventListener('click', prevTrack);
    favBtn.addEventListener('click', toggleFavorite);

    audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
            seekbar.value = (audio.currentTime / audio.duration) * 100;
            currentTimeElem.textContent = formatTime(audio.currentTime);

            if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
                try {
                    navigator.mediaSession.setPositionState({
                        duration: audio.duration,
                        playbackRate: audio.playbackRate,
                        position: audio.currentTime,
                    });
                } catch(e) {}
            }
        }
    });

    audio.addEventListener('loadedmetadata', () => {
        durationElem.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('ended', () => {
        isRepeating ? playTrack() : nextTrack();
    });

    seekbar.addEventListener('input', () => {
        if (audio.duration) {
            audio.currentTime = (seekbar.value / 100) * audio.duration;
        }
    });

    volumeSlider.addEventListener('input', () => {
        audio.volume = volumeSlider.value;
        volumeIcon.className = `fa-solid ${volumeSlider.value == 0 ? 'fa-volume-xmark' : 'fa-volume-high'}`;
    });

    repeatBtn.addEventListener('click', () => {
        isRepeating = !isRepeating;
        repeatIcon.classList.toggle('text-blue-500', isRepeating);
    });

    document.getElementById('searchInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchMusic();
    });

    // Обработчики для меню и quick-cards
    document.querySelectorAll('.menu-link, .quick-card').forEach(link => {
        link.addEventListener('click', () => {
            const sectionId = link.dataset.section;
            if (sectionId) {
                switchSection(sectionId);
            }
        });
    });

    // Обработчики кнопок скролла для карточек
    document.querySelectorAll('.scroll-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const direction = btn.dataset.direction;
            const container = btn.closest('.cards-scroll-container').querySelector('.track-cards');
            const scrollAmount = 340;
            
            if (direction === 'left') {
                container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            } else {
                container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        });
    });

    // === Полноэкранный режим ===
    fullscreenBtn.addEventListener('click', () => playerFooter.classList.add('player-fullscreen'));
    fullscreenCloseBtn.addEventListener('click', () => playerFooter.classList.remove('player-fullscreen'));

    // === Ленивая загрузка при скролле ===
    const trackListContainer = document.getElementById('allTracksList');
    if (trackListContainer) {
        trackListContainer.addEventListener('scroll', () => {
            if (trackListContainer.scrollTop + trackListContainer.clientHeight >= trackListContainer.scrollHeight - 300) {
                loadAllTracks();
            }
        });
    }

    // === Инициализация ===
    loadRecentTracks();  // Загружаем недавние (с sort=recent)
    loadAllTracks(true); // Загружаем все треки
});