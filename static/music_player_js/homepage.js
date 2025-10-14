document.addEventListener('DOMContentLoaded', () => {
    // === Элементы DOM ===
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
    const favoritesList = document.getElementById('favoritesList');
    const favBtn = document.getElementById('favBtn');

    // Элементы для полноэкранного режима
    const playerFooter = document.querySelector('.player');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const fullscreenCloseBtn = document.getElementById('fullscreenCloseBtn');
    const fullscreenCoverImg = document.getElementById('fullscreenCoverImg');
    const fullscreenTitle = document.getElementById('fullscreenTrackTitle');
    const fullscreenArtist = document.getElementById('fullscreenTrackArtist');

    // === Глобальные переменные ===
    let allTracks = [];
    let favoriteTracks = []; // ДОБАВЛЕНО: Отдельный массив для любимых треков
    let searchResults = [];
    let currentPlaylist = [];
    let currentTrackIndex = 0;
    let currentSection = 'home';
    let isPlaying = false;
    let isRepeating = false;
    let trackOffset = 0;
    const trackLimit = 20;
    let isLoading = false;
    let allLoaded = false;
    let favoritesLoaded = false; // ДОБАВЛЕНО: Флаг, чтобы не загружать любимые треки повторно

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
            toggleFavoriteForTrack(track); // Убрали 'section', так как логика теперь централизована
        });

        row.addEventListener('click', () => {
            const idx = Number(row.dataset.index) || 0;
            playFromSection(section, idx);
        });

        return row;
    }

    // === Рендеры списков ===
    function renderList(container, tracks, section) {
        if (!container) return;
        container.innerHTML = ''; // Очищаем перед рендером
        if (tracks.length === 0) {
            container.innerHTML = `<p class="p-4 text-center opacity-60">Здесь пока пусто</p>`;
        } else {
            tracks.forEach((track, index) => {
                container.appendChild(createTrackRow(track, index, section));
            });
        }
    }

    function renderAllTracks() {
        renderList(document.getElementById('allTracksList'), allTracks, 'home');
    }

    // ИЗМЕНЕНО: Функция теперь рендерит данные из нового, отдельного массива
    function renderFavorites() {
        renderList(document.getElementById('favoritesList'), favoriteTracks, 'favorites');
    }

    function renderSearchResults() {
        renderList(document.getElementById('searchResults'), searchResults, 'search');
    }

    // ДОБАВЛЕНО: Новая функция для загрузки ВСЕХ любимых треков с сервера
    async function loadFavoriteTracks() {
        if (favoritesLoaded) return; // Не грузить, если уже загружено
        console.log('Загрузка любимых треков...');

        try {
            const res = await fetch('/playlist/favorites'); // Запрос к новому эндпоинту
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            
            if (data && !data.error) {
                favoriteTracks = data; // Сохраняем в отдельный массив
                renderFavorites(); // Рендерим список
                favoritesLoaded = true; // Устанавливаем флаг
            }
        } catch (err) {
            console.error("Ошибка загрузки любимых треков:", err);
        }
    }

    // === Ленивая загрузка треков ===
    async function loadAllTracks(initial = false) {
        if (isLoading || allLoaded) return;
        isLoading = true;

        try {
            const res = await fetch(`/playlist/data?offset=${trackOffset}&limit=${trackLimit}`);
            const data = await res.json();

            if (!data.error && data.length > 0) {
                const uniqueTracks = data.filter(newTrack => !allTracks.some(existing => existing.id === newTrack.id));
                allTracks.push(...uniqueTracks);
                renderAllTracks();
                trackOffset += data.length;
                // ИЗМЕНЕНО: Удалена строка renderFavorites(); так как любимые теперь грузятся отдельно
            } else {
                allLoaded = true;
            }
        } catch (err) {
            console.error("Ошибка загрузки треков:", err);
        }
        isLoading = false;
    }

    // === Воспроизведение ===
    function playTrack() {
        audio.play();
        isPlaying = true;
        updatePlayIcon();
    }

    function pauseTrack() {
        audio.pause();
        isPlaying = false;
        updatePlayIcon();
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
            case 'home':
                currentPlaylist = allTracks;
                break;
            case 'favorites':
                // ИЗМЕНЕНО: Плейлист теперь берется из нового массива
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
        const currentTrack = currentPlaylist[currentTrackIndex];
        if (!currentTrack) return;

        const activeRows = document.querySelectorAll(`.track-row[data-id="${currentTrack.id}"]`);
        activeRows.forEach(row => {
             if (row.dataset.section === currentSection) {
                 row.classList.add('active');
             }
        });
    }

    // === Избранное ===
    async function toggleFavoriteForTrack(track) {
        if (!track || !track.id) return;

        const originalStatus = track.favorite;
        track.favorite = !track.favorite; // Оптимистичное обновление UI

        // Обновляем все UI элементы сразу
        updateUIAfterFavoriteToggle(track);

        try {
            const endpoint = originalStatus ? "/playlist/remove" : "/playlist/add";
            await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id: track.id
                })
            });
        } catch (err) {
            console.error("Ошибка при смене избранного:", err);
            track.favorite = originalStatus; // Откатываем в случае ошибки
            updateUIAfterFavoriteToggle(track);
        }
    }

    // ИЗМЕНЕНО: Полностью переписанная функция для поддержки двух списков
    function updateUIAfterFavoriteToggle(track) {
        // 1. Обновляем статус в основном списке allTracks (если трек там есть)
        const mainTrack = allTracks.find(t => t.id === track.id);
        if (mainTrack) {
            mainTrack.favorite = track.favorite;
        }

        // 2. Обновляем отдельный массив favoriteTracks
        if (track.favorite) {
            // Добавляем, если его там еще нет (предотвращает дублирование)
            if (!favoriteTracks.some(fav => fav.id === track.id)) {
                favoriteTracks.unshift(track); // Добавляем в начало
            }
        } else {
            // Удаляем из списка любимых
            favoriteTracks = favoriteTracks.filter(fav => fav.id !== track.id);
        }

        // 3. Обновляем иконки звезд везде
        document.querySelectorAll(`.track-row[data-id="${track.id}"] .fa-star`).forEach(icon => {
            icon.classList.toggle('text-yellow-500', track.favorite);
        });

        // 4. Обновляем кнопку в плеере, если это текущий трек
        if (currentPlaylist[currentTrackIndex]?.id === track.id) {
            updateFavBtn(track.favorite);
        }

        // 5. Перерисовываем список любимых из обновленного массива
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
            // ИЗМЕНЕНО: Ваш бэкенд возвращает объект {tracks: [], artists: []}
            const tracks = data.tracks || []; 
    
            searchResults = tracks.map(sr => {
                // ИЗМЕНЕНО: Проверяем статус 'favorite' в обоих массивах для точности
                const isFavorite = favoriteTracks.some(fav => fav.id === sr.id) || 
                                   allTracks.find(t => t.id === sr.id)?.favorite;
                return { ...sr, favorite: !!isFavorite };
            });
            renderSearchResults();
        } catch (err) {
            console.error("Ошибка поиска:", err);
        }
    }

    // Глобализируем функцию поиска для вызова из HTML (onclick="searchMusic()")
    window.searchMusic = searchMusic;

    // === Навигация по секциям ===
    // Эта функция остается здесь, так как она вызывается из обработчика ниже
    function switchSection(targetSection) {
        document.querySelectorAll('[id^="section-"]').forEach(el => el.classList.add('hidden'));
        const targetElement = document.getElementById(`section-${targetSection}`);
        if(targetElement) {
            targetElement.classList.remove('hidden');
        }

        document.querySelectorAll('.menu-link').forEach(el => el.classList.remove('active'));
        const activeLink = document.querySelector(`.menu-link[data-section="${targetSection}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
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

    // ИЗМЕНЕНО: Добавлена логика вызова загрузки любимых треков
    document.querySelectorAll('.menu-link').forEach(link => {
        link.addEventListener('click', () => {
            const sectionId = link.dataset.section;
            if (sectionId === 'favorites') {
                loadFavoriteTracks(); // Вызываем загрузку только при клике на "Любимое"
            }
            switchSection(sectionId);
        });
    });

    // === Полноэкранный режим ===
    fullscreenBtn.addEventListener('click', () => playerFooter.classList.add('player-fullscreen'));
    fullscreenCloseBtn.addEventListener('click', () => playerFooter.classList.remove('player-fullscreen'));

    // === Инициализация ===
    const trackListContainer = document.getElementById('allTracksList');
    if (trackListContainer) {
        trackListContainer.addEventListener('scroll', () => {
            if (trackListContainer.scrollTop + trackListContainer.clientHeight >= trackListContainer.scrollHeight - 300) {
                loadAllTracks();
            }
        });
    }

    loadAllTracks(true); // Загружаем первую порцию треков на главной
    // switchSection('home'); // Удалено, так как навигация теперь в newhome.html
});