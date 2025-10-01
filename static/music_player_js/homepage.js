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

// === Глобальные переменные ===
let allTracks = [];            // все загруженные треки (пагинация добавляет)
let favoriteTracks = [];       // список избранного (локально обновляется)
let searchResults = [];        // результаты поиска
let currentPlaylist = [];      // текущий плейлист (home / favorites / search)
let currentTrackIndex = 0;
let currentSection = 'home';   // 'home' | 'favorites' | 'search'
let isPlaying = false;
let isRepeating = false;

let trackOffset = 0;
const trackLimit = 20;
let isLoading = false;
let allLoaded = false;


// === Вспомогательные функции ===
function formatTime(sec) {
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
}

// Создаёт DOM-строку для трека (универсально для home/favorites/search)
function createTrackRow(track, index, section) {
    const row = document.createElement('div');
    row.className = 'track-row flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer';
    row.dataset.id = track.id;
    row.dataset.section = section;
    row.dataset.index = index; // нужен чтобы корректно знать индекс в секции

    // безопасный URL обложки (и encodeURI на случай пробелов/символов)
    let coverUrl = track.cover && String(track.cover).trim() !== "" ? encodeURI(track.cover) : "/static/default_cover.png";

    // формат длительности
    const duration = track.duration ? formatTime(track.duration) : "--:--";

    row.innerHTML = `
        <div class="track-number w-6 text-gray-400">${index + 1}</div>
        <img class="list-cover w-10 h-10 rounded-md object-cover" src="${coverUrl}"
             alt="cover" loading="lazy"
             onerror="this.onerror=null;this.src='/static/default_cover.png'">
        <div class="track-info flex-1 overflow-hidden">
            <div class="track-title font-semibold truncate">${track.title}</div>
            <div class="track-artist text-sm text-gray-500 truncate">${track.artist}</div>
        </div>
        <div class="track-duration text-sm text-gray-500 w-12 text-right">${duration}</div>
        <div class="track-actions flex gap-2">
            <button class="fav-btn text-gray-400 hover:text-yellow-500" aria-label="fav">
                <i class="fa-solid ${track.favorite ? 'fa-star text-yellow-500' : 'fa-star'}"></i>
            </button>
            <button class="play-btn text-gray-400 hover:text-blue-500" aria-label="play">
                <i class="fa-solid fa-play"></i>
            </button>
        </div>
    `;

    // Обработчики: используем data-index чтобы корректно играть из секции
    const favButton = row.querySelector('.fav-btn');
    const playButton = row.querySelector('.play-btn');

    favButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavoriteForTrack(track, section);
    });

    playButton.addEventListener('click', (e) => {
        e.stopPropagation();
        // индекс в секции — берем из атрибутов (чтобы всегда корректно)
        const idx = Number(row.dataset.index) || 0;
        playFromSection(section, idx);
    });

    row.addEventListener('click', () => {
        const idx = Number(row.dataset.index) || 0;
        playFromSection(section, idx);
    });

    return row;
}


// === Рендеры списков ===
function renderAllTracks(initial = false) {
    const container = document.getElementById('allTracksList');
    if (!container) return;
    if (initial) container.innerHTML = '';

    // Добавляем только отсутствующие (защита от дублей)
    allTracks.forEach((track, idx) => {
        if (container.querySelector(`[data-id="${track.id}"]`)) return;
        container.appendChild(createTrackRow(track, idx, 'home'));
    });
}

function renderFavorites() {
    const container = document.getElementById('favoritesList');
    if (!container) return;

    container.innerHTML = '';

    const favorites = allTracks.filter(t => t.favorite); // ← только уникальные
    favorites.forEach((track, index) => {
        container.appendChild(createTrackRow(track, index, 'favorites'));
    });
}


function renderSearchResults() {
    const container = document.getElementById('searchResults');
    if (!container) return;

    container.innerHTML = '';

    // Синхронизируем поле favorite для результатов поиска по allTracks (если уже известны)
    searchResults = searchResults.map(sr => {
        const found = allTracks.find(t => t.id === sr.id);
        if (found) sr.favorite = !!found.favorite;
        return sr;
    });

    searchResults.forEach((track, idx) => {
        const row = createTrackRow(track, idx, 'search');
        // убедимся что в row.dataset.index стоит idx (на случай, если createTrackRow использует другое значение)
        row.dataset.index = idx;
        container.appendChild(row);
    });
}


// === Ленивая загрузка треков ===
async function loadAllTracks(initial = false) {
    if (isLoading || allLoaded) return;
    isLoading = true;

    try {
        const res = await fetch(`/playlist/data?offset=${trackOffset}&limit=${trackLimit}`);
        const data = await res.json();

        if (!data.error && data.length > 0) {
            // добавляем и рендерим новые
            allTracks.push(...data);
            renderAllTracks(initial);
            // обновляем offset
            trackOffset += data.length;
            // обновляем избранное (в случае если есть пометки в новых данных)
            renderFavorites();
        } else {
            allLoaded = true;
        }
    } catch (err) {
        console.error("Ошибка загрузки треков:", err);
    }

    isLoading = false;
}


// === Воспроизведение ===
function playFromSection(section, index) {
    currentSection = section;

    switch(section) {
        case 'home':
            currentPlaylist = allTracks;
            break;
        case 'favorites':
            currentPlaylist = allTracks.filter(track => track.favorite);
            break;
        case 'search':
            currentPlaylist = searchResults;
            break;
        default:
            currentPlaylist = allTracks;
    }

    // защитимся от неверного индекса
    if (!currentPlaylist || currentPlaylist.length === 0) return;
    if (index < 0) index = 0;
    if (index >= currentPlaylist.length) index = currentPlaylist.length - 1;

    currentTrackIndex = index;
    loadTrack(currentTrackIndex);
    playTrack();
    updateActiveRows();
}


function loadTrack(index) {
    const track = currentPlaylist[index];
    if (!track) return;

    titleElem.textContent = track.title;
    artistElem.textContent = track.artist;
    coverImg.src = track.cover && track.cover.trim() !== "" ? track.cover : "/static/default_cover.png";
    audio.src = track.src || "";

    updateFavBtn(!!track.favorite);
    isPlaying = false;
    updatePlayIcon(false);
    seekbar.value = 0;
    currentTimeElem.textContent = '0:00';
    durationElem.textContent = track.duration ? formatTime(track.duration) : '0:00';

    updateActiveRows();
}

function updateActiveRows() {
    document.querySelectorAll('.track-row').forEach(row => row.classList.remove('active'));

    const currentTrack = currentPlaylist[currentTrackIndex];
    if (!currentTrack) return;

    switch (currentSection) {
        case 'home':
            const homeIndex = allTracks.findIndex(t => t.id === currentTrack.id);
            if (homeIndex !== -1) {
                const homeRow = document.querySelectorAll('#allTracksList .track-row')[homeIndex];
                if (homeRow) homeRow.classList.add('active');
            }
            break;
        case 'favorites':
            const favs = allTracks.filter(t => t.favorite);
            const favIndex = favs.findIndex(t => t.id === currentTrack.id);
            if (favIndex !== -1) {
                const favRow = document.querySelectorAll('#favoritesList .track-row')[favIndex];
                if (favRow) favRow.classList.add('active');
            }
            break;
        case 'search':
            // у поиска активная строка — определяется при рендере (индекс)
            const searchIndex = searchResults.findIndex(t => t.id === currentTrack.id);
            if (searchIndex !== -1) {
                const searchRow = document.querySelectorAll('#searchResults .track-row')[searchIndex];
                if (searchRow) searchRow.classList.add('active');
            }
            break;
    }
}


// === Избранное (синхронизация) ===
async function toggleFavoriteForTrack(track, section) {
    if (!track || !track.id) return;

    try {
        if (track.favorite) {
            await fetch("/playlist/remove", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({id: track.id})
            });
            track.favorite = false;
        } else {
            await fetch("/playlist/add", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({id: track.id})
            });
            track.favorite = true;
        }
    } catch (err) {
        console.error("Ошибка при смене избранного:", err);
    }

    // обновляем состояние в allTracks (если он там есть)
    const orig = allTracks.find(t => t.id === track.id);
    if (orig) orig.favorite = !!track.favorite;

    // обновляем иконку в любом рендеренном ряду (если есть)
    const rows = document.querySelectorAll(`.track-row[data-id="${track.id}"]`);
    rows.forEach(row => {
        const icon = row.querySelector('.track-actions i.fa-star');
        if (icon) {
            if (track.favorite) icon.classList.add('text-yellow-500');
            else icon.classList.remove('text-yellow-500');
        }
    });

    // обновляем список избранного заново (без дубликатов, т.к. renderFavorites берет из allTracks)
    renderFavorites();

    // обновляем кнопку в плеере, если это текущий трек
    if (currentPlaylist[currentTrackIndex] && currentPlaylist[currentTrackIndex].id === track.id) {
        updateFavBtn(!!track.favorite);
    }
}




async function toggleFavorite() {
    const track = currentPlaylist[currentTrackIndex];
    if (!track) return;
    await toggleFavoriteForTrack(track, currentSection);
}


// === Поиск ===
async function searchMusic() {
    const query = document.getElementById('searchInput').value.trim();
    const resultsContainer = document.getElementById('searchResults');
    if (!query) {
        searchResults = [];
        renderSearchResults();
        resultsContainer.innerHTML = '<p class="text-gray-500">Введите запрос для поиска.</p>';
        return;
    }

    try {
        const res = await fetch(`/search?query=${encodeURIComponent(query)}`);
        const data = await res.json();

        if (!data || data.length === 0) {
            searchResults = [];
            renderSearchResults();
            resultsContainer.innerHTML = '<p class="text-gray-500">Ничего не найдено.</p>';
            return;
        }

        // Синхронизация favorite: если allTracks уже содержит этот трек, переносим флаг
        searchResults = data.map(sr => {
            const found = allTracks.find(t => t.id === sr.id);
            if (found) sr.favorite = !!found.favorite;
            return sr;
        });

        renderSearchResults();
        // переключаем контекст так, чтобы playFromSection('search', idx) работал
        currentSection = 'search';
        currentPlaylist = searchResults;
    } catch (err) {
        console.error("Ошибка при поиске:", err);
        resultsContainer.innerHTML = '<p class="text-red-500">Ошибка при поиске.</p>';
    }
}



// === Управление плеером (уже было) ===
function updateFavBtn(fav) {
    favBtn.style.color = fav ? "gold" : "gray";
}

function playTrack() {
    audio.play().then(() => {
        isPlaying = true;
        updatePlayIcon(true);
    }).catch(() => {
        isPlaying = false;
        updatePlayIcon(false);
    });
}

function pauseTrack() {
    audio.pause();
    isPlaying = false;
    updatePlayIcon(false);
}

function updatePlayIcon(playing) {
    playIcon.classList.toggle('fa-play', !playing);
    playIcon.classList.toggle('fa-pause', playing);
}

async function playNextTrack() {
    // Убедимся, что у нас есть текущий плейлист для секции
    if (!currentPlaylist || currentPlaylist.length === 0) {
        switch (currentSection) {
            case 'home':
                currentPlaylist = allTracks;
                break;
            case 'favorites':
                currentPlaylist = allTracks.filter(t => t.favorite);
                break;
            case 'search':
                currentPlaylist = searchResults;
                break;
            default:
                currentPlaylist = allTracks;
        }
    }

    // Если мы в "home" и следующий индекс выходит за пределы уже загруженных,
    // попробуем подгрузить ещё треки (если loadAllTracks реализован и лениво подгружает).
    if (currentSection === 'home') {
        const nextIndexWouldBe = currentTrackIndex + 1;
        // если next выходит за пределы уже загруженных allTracks и есть шанс подгрузить ещё
        if (nextIndexWouldBe >= allTracks.length && !allLoaded) {
            try {
                // ждем подгрузки следующей пачки (loadAllTracks сам следит за isLoading/allLoaded)
                await loadAllTracks();
            } catch (e) {
                console.warn('Ошибка при попытке подгрузить дополнительные треки:', e);
            }
            // после подгрузки обновим currentPlaylist
            currentPlaylist = (currentSection === 'home') ? allTracks : currentPlaylist;
        }
    }

    // если плейлист пуст — выходим
    if (!currentPlaylist || currentPlaylist.length === 0) return;

    // Вычисляем следующий индекс (wrap-around)
    currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;

    // Загружаем и проигрываем
    loadTrack(currentTrackIndex);
    playTrack();
    updateActiveRows();

    // Отладочная информация (можно убрать)
    console.debug('playNextTrack -> section:', currentSection, 'index:', currentTrackIndex, 'id:', currentPlaylist[currentTrackIndex] && currentPlaylist[currentTrackIndex].id);
}
// при загрузке метаданных — обновляем длительность трека и список
audio.addEventListener('loadedmetadata', () => {
    durationElem.textContent = formatTime(audio.duration);

    const track = currentPlaylist[currentTrackIndex];
    if (track) {
        // запишем длительность в объект трека и синхронизируем с allTracks
        track.duration = audio.duration;
        const orig = allTracks.find(t => t.id === track.id);
        if (orig) orig.duration = audio.duration;

        // обновляем отображение длительностей в списках
        renderAllTracks();
        renderFavorites();
        renderSearchResults();
    }
});

audio.onended = () => {
    if (!isRepeating) playNextTrack();
};


// === Прогресс и громкость ===
function updateProgress() {
    if (audio.duration) {
        const p = (audio.currentTime / audio.duration) * 100;
        seekbar.value = p;
        seekbar.style.background = `linear-gradient(90deg,#111827 ${p}%, #e6e6e6 ${p}%)`;
        currentTimeElem.textContent = formatTime(audio.currentTime);
    }
    requestAnimationFrame(updateProgress);
}
requestAnimationFrame(updateProgress);


// === Навигация, события и инициализация ===
document.addEventListener('DOMContentLoaded', function() {
    // кнопки плеера
    favBtn.onclick = toggleFavorite;
    playBtn.onclick = () => { isPlaying ? pauseTrack() : playTrack(); };
    prevBtn.onclick = () => {
        if (!currentPlaylist || currentPlaylist.length === 0) return;
        currentTrackIndex = (currentTrackIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        loadTrack(currentTrackIndex);
        playTrack();
    };
    nextBtn.onclick = () => { playNextTrack(); };
    repeatBtn.onclick = () => {
        isRepeating = !isRepeating;
        audio.loop = isRepeating;
        repeatIcon.style.color = isRepeating ? '#111827' : '#6b7280';
    };

    seekbar.addEventListener('input', () => {
        if (audio.duration) audio.currentTime = (seekbar.value / 100) * audio.duration;
    });

    volumeSlider.oninput = () => {
        audio.volume = volumeSlider.value;
        updateVolumeUI(audio.volume);
    };

    function updateVolumeUI(v) {
        const p = v * 100;
        volumeSlider.style.background = `linear-gradient(90deg,#111827 ${p}%, #e6e6e6 ${p}%)`;
        if (v === 0) volumeIcon.className = "fa-solid fa-volume-xmark";
        else if (v < 0.5) volumeIcon.className = "fa-solid fa-volume-low";
        else volumeIcon.className = "fa-solid fa-volume-high";
    }
    audio.volume = volumeSlider.value;
    updateVolumeUI(audio.volume);

    // навигация меню
    document.querySelectorAll(".menu-link").forEach(l => l.onclick = () => {
        document.querySelectorAll(".menu-link").forEach(x => x.classList.remove("active"));
        l.classList.add("active");
        document.querySelectorAll("#content > div").forEach(d => d.classList.add("hidden"));
        const sec = l.dataset.section;
        const el = document.getElementById(`section-${sec}`);
        if (el) el.classList.remove("hidden");
        currentSection = sec;
    });

    // скролл для ленивой подгрузки (главный список)
    const list = document.getElementById('allTracksList');
    if (list) {
        list.addEventListener('scroll', () => {
            if (list.scrollTop + list.clientHeight >= list.scrollHeight - 50) {
                loadAllTracks();
            }
        });
    }

    // поиск: если на странице есть кнопка/поле, связать (кнопка в HTML вызывает searchMusic())
    // первая подгрузка


    loadAllTracks(true);
});
