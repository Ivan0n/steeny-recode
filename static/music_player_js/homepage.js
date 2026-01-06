import { updateMediaMetadata, updateMediaPlaybackState, initMediaSessionHandlers } from './media-session.js';

document.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('audioPlayer');
  const miniPlayer = document.getElementById('miniPlayer');
  const playBtn = document.getElementById('playBtn');
  const playIcon = document.getElementById('playIcon');
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const repeatBtn = document.getElementById('repeatBtn');
  const seekbar = document.getElementById('seekbar');
  const currentTimeEl = document.getElementById('currentTime');
  const durationEl = document.getElementById('duration');
  const volumeSlider = document.getElementById('volumeSlider');
  const volumeIcon = document.getElementById('volumeIcon');
  const titleEl = document.getElementById('trackTitle');
  const artistEl = document.getElementById('trackArtist');
  const coverImg = document.getElementById('coverImg');
  const favBtn = document.getElementById('favBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const trackCountEl = document.getElementById('trackCount');

  const fsPlayer = document.getElementById('fullscreenPlayer');
  const fsCloseBtn = document.getElementById('fsCloseBtn');
  const fsBgImage = document.getElementById('fsBgImage');
  const fsCoverImg = document.getElementById('fsCoverImg');
  const fsTitle = document.getElementById('fsTrackTitle');
  const fsArtist = document.getElementById('fsTrackArtist');
  const fsPlayBtn = document.getElementById('fsPlayBtn');
  const fsPlayIcon = document.getElementById('fsPlayIcon');
  const fsPrevBtn = document.getElementById('fsPrevBtn');
  const fsNextBtn = document.getElementById('fsNextBtn');
  const fsShuffleBtn = document.getElementById('fsShuffleBtn');
  const fsRepeatBtn = document.getElementById('fsRepeatBtn');
  const fsSeekbar = document.getElementById('fsSeekbar');
  const fsCurrentTime = document.getElementById('fsCurrentTime');
  const fsDuration = document.getElementById('fsDuration');
  const fsVolumeSlider = document.getElementById('fsVolumeSlider');
  const fsFavBtn = document.getElementById('fsFavBtn');

  let allTracks = [], recentTracks = [], randomTracks = [], favoriteTracks = [], searchResults = [];
  let currentPlaylist = [], currentIndex = 0;
  let isPlaying = false, isRepeat = false, isShuffle = false;
  let trackOffset = 0, isLoading = false, allLoaded = false;

  initMediaSessionHandlers({ play: play, pause: pause, next: next, prev: prev });
  updateGreeting();
  loadHome();
  initCarousels();
  initEvents();

  function showPlayer() {
    miniPlayer.classList.remove('hidden');
    document.body.classList.remove('player-hidden');
  }

  function updateGreeting() {
    const h = new Date().getHours();
    const el = document.getElementById('heroGreeting');
    const icon = document.getElementById('heroTimeIcon');
    if (h >= 5 && h < 12) { el.textContent = 'Доброе утро'; icon.textContent = '🌅'; }
    else if (h >= 12 && h < 17) { el.textContent = 'Добрый день'; icon.textContent = '☀️'; }
    else if (h >= 17 && h < 22) { el.textContent = 'Добрый вечер'; icon.textContent = '🌆'; }
    else { el.textContent = 'Доброй ночи'; icon.textContent = '🌙'; }
  }

  async function loadHome() {
    const [recent, random, favs, artists] = await Promise.all([
      fetch('/playlist/data?offset=0&limit=15&sort=recent').then(r => r.json()).catch(() => []),
      fetch('/playlist/data?offset=0&limit=15&sort=random').then(r => r.json()).catch(() => []),
      fetch('/playlist/favorites').then(r => r.json()).catch(() => []),
      fetch('/playlist/data?offset=0&limit=50').then(r => r.json()).catch(() => [])
    ]);

    recentTracks = recent || [];
    randomTracks = random || [];
    favoriteTracks = favs || [];

    renderCards('recentTracksList', recentTracks, 'recent');
    renderCards('randomTracksList', randomTracks, 'random');
    renderCards('favoritesPreviewList', favoriteTracks.slice(0, 15), 'favorites');

    const artistsMap = new Map();
    (artists || []).forEach(t => { if (!artistsMap.has(t.artist)) artistsMap.set(t.artist, t.cover); });
    renderArtists('artistsList', Array.from(artistsMap, ([n, c]) => ({ name: n, cover: c })).slice(0, 15));
  }

  async function loadAllTracks() {
    if (isLoading || allLoaded) return;
    isLoading = true;
    try {
      const data = await fetch(`/playlist/data?offset=${trackOffset}&limit=20`).then(r => r.json());
      if (data?.length) {
        allTracks.push(...data.filter(t => !allTracks.some(e => e.id === t.id)));
        renderTrackList('allTracksList', allTracks, 'music');
        trackOffset += data.length;
        if (trackCountEl) trackCountEl.textContent = `Треков: ${allTracks.length}`;
      } else {
        allLoaded = true;
      }
    } catch (e) { console.error(e); }
    isLoading = false;
  }

  async function loadFavorites() {
    try {
      const data = await fetch('/playlist/favorites').then(r => r.json());
      favoriteTracks = data || [];
      renderTrackList('favoritesList', favoriteTracks, 'favorites');
    } catch (e) { console.error(e); }
  }

  function renderCards(id, tracks, section) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    if (!tracks.length) { el.innerHTML = '<div class="carousel-empty">Пусто</div>'; return; }
    tracks.forEach((t, i) => {
      const card = document.createElement('div');
      card.className = 'music-card';
      card.dataset.id = t.id;
      card.innerHTML = `
        <div class="music-card-cover-wrapper">
          <img class="music-card-cover" src="${t.cover || '/static/default_cover.png'}" onerror="this.src='/static/default_cover.png'">
          <button class="music-card-play"><i class="fa-solid fa-play"></i></button>
        </div>
        <div class="music-card-title">${t.title}</div>
        <div class="music-card-artist">${t.artist}</div>
      `;
      card.onclick = () => playFrom(section, i);
      el.appendChild(card);
    });
    setTimeout(() => updateCarouselBtns(el), 100);
  }

  function renderArtists(id, artists) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    if (!artists.length) { el.innerHTML = '<div class="carousel-empty">Пусто</div>'; return; }
    artists.forEach(a => {
      const card = document.createElement('div');
      card.className = 'artist-card';
      card.innerHTML = `
        <img class="artist-card-avatar" src="${a.cover || '/static/default_cover.png'}" onerror="this.src='/static/default_cover.png'">
        <div class="artist-card-name">${a.name}</div>
      `;
      card.onclick = () => {
        document.getElementById('searchInput').value = a.name;
        document.querySelector('.menu-link[data-section="search"]').click();
        searchMusic();
      };
      el.appendChild(card);
    });
    setTimeout(() => updateCarouselBtns(el), 100);
  }

  function renderTrackList(id, tracks, section) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    if (!tracks.length) { el.innerHTML = '<div class="empty-state">Пусто</div>'; return; }
    tracks.forEach((t, i) => {
      const row = document.createElement('div');
      row.className = 'track-row';
      row.dataset.id = t.id;
      const isFav = t.favorite;
      row.innerHTML = `
        <img class="list-cover" src="${t.cover || '/static/default_cover.png'}" onerror="this.src='/static/default_cover.png'">
        <div class="track-info">
          <div class="track-title">${t.title}</div>
          <div class="track-artist">${t.artist}</div>
        </div>
        <button class="fav-btn ${isFav ? 'active' : ''}"><i class="fa-solid fa-heart"></i></button>
      `;
      row.querySelector('.fav-btn').onclick = e => { e.stopPropagation(); toggleFav(t); };
      row.onclick = () => playFrom(section, i);
      el.appendChild(row);
    });
  }

  function playFrom(section, index) {
    switch (section) {
      case 'recent': currentPlaylist = recentTracks; break;
      case 'random': currentPlaylist = randomTracks; break;
      case 'favorites': currentPlaylist = favoriteTracks; break;
      case 'search': currentPlaylist = searchResults; break;
      default: currentPlaylist = allTracks;
    }
    currentIndex = index;
    loadTrack();
    play();
  }

  function loadTrack() {
    const t = currentPlaylist[currentIndex];
    if (!t) return;
    showPlayer();
    const cover = t.cover || '/static/default_cover.png';
    titleEl.textContent = t.title;
    artistEl.textContent = t.artist;
    coverImg.src = cover;
    audio.src = t.src;
    fsTitle.textContent = t.title;
    fsArtist.textContent = t.artist;
    fsCoverImg.src = cover;
    fsBgImage.src = cover;
    updateFavBtn(t.favorite);
    updateActive();
    updateMediaMetadata({ title: t.title, artist: t.artist, cover });
  }

  function play() { audio.play(); isPlaying = true; updatePlayIcons(); updateMediaPlaybackState(true); }
  function pause() { audio.pause(); isPlaying = false; updatePlayIcons(); updateMediaPlaybackState(false); }
  function toggle() { audio.src ? (isPlaying ? pause() : play()) : null; }
  function next() { currentIndex = isShuffle ? Math.floor(Math.random() * currentPlaylist.length) : (currentIndex + 1) % currentPlaylist.length; loadTrack(); play(); }
  function prev() { if (audio.currentTime > 3) { audio.currentTime = 0; return; } currentIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length; loadTrack(); play(); }

  function updatePlayIcons() {
    const cls = isPlaying ? 'fa-pause' : 'fa-play';
    playIcon.className = 'fa-solid ' + cls;
    fsPlayIcon.className = 'fa-solid ' + cls;
  }

  function updateActive() {
    document.querySelectorAll('.music-card, .track-row').forEach(e => e.classList.remove('active'));
    const t = currentPlaylist[currentIndex];
    if (t) document.querySelectorAll(`[data-id="${t.id}"]`).forEach(e => e.classList.add('active'));
  }

  function updateFavBtn(isFav) {
    favBtn.classList.toggle('active', isFav);
    fsFavBtn.classList.toggle('active', isFav);
  }

  async function toggleFav(track) {
    const was = track.favorite;
    track.favorite = !was;
    updateFavUI(track);
    try {
      await fetch(was ? '/playlist/remove' : '/playlist/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: track.id })
      });
    } catch (e) { track.favorite = was; updateFavUI(track); }
  }

  function updateFavUI(track) {
    [allTracks, recentTracks, randomTracks, searchResults].forEach(arr => {
      const f = arr.find(t => t.id === track.id);
      if (f) f.favorite = track.favorite;
    });
    if (track.favorite && !favoriteTracks.some(f => f.id === track.id)) favoriteTracks.unshift(track);
    else favoriteTracks = favoriteTracks.filter(f => f.id !== track.id);

    document.querySelectorAll(`[data-id="${track.id}"] .fav-btn`).forEach(b => b.classList.toggle('active', track.favorite));
    if (currentPlaylist[currentIndex]?.id === track.id) updateFavBtn(track.favorite);
    renderCards('favoritesPreviewList', favoriteTracks.slice(0, 15), 'favorites');
  }

  async function searchMusic() {
    const q = document.getElementById('searchInput')?.value.trim();
    if (!q) { searchResults = []; renderTrackList('searchResults', [], 'search'); return; }
    try {
      const data = await fetch(`/search?q=${encodeURIComponent(q)}`).then(r => r.json());
      searchResults = data.tracks || [];
      renderTrackList('searchResults', searchResults, 'search');
    } catch (e) { console.error(e); }
  }
  window.searchMusic = searchMusic;

  function initCarousels() {
    document.querySelectorAll('.carousel-btn').forEach(btn => {
      btn.onclick = () => {
        const track = document.getElementById(btn.dataset.target);
        if (!track) return;
        const card = track.querySelector('.music-card, .artist-card');
        if (!card) return;
        const scroll = (card.offsetWidth + 16) * 3;
        track.scrollBy({ left: btn.classList.contains('carousel-btn-left') ? -scroll : scroll, behavior: 'smooth' });
      };
    });
    document.querySelectorAll('.carousel-track').forEach(t => {
      t.onscroll = () => updateCarouselBtns(t);
    });
  }

  function updateCarouselBtns(track) {
    const container = track.closest('.carousel-container');
    if (!container) return;
    const left = container.querySelector('.carousel-btn-left');
    const right = container.querySelector('.carousel-btn-right');
    if (left) left.disabled = track.scrollLeft < 5;
    if (right) right.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 5;
  }

  function initEvents() {
    playBtn.onclick = toggle;
    nextBtn.onclick = next;
    prevBtn.onclick = prev;
    favBtn.onclick = () => { const t = currentPlaylist[currentIndex]; if (t) toggleFav(t); };
    shuffleBtn.onclick = () => { isShuffle = !isShuffle; shuffleBtn.classList.toggle('active', isShuffle); fsShuffleBtn.classList.toggle('active', isShuffle); };
    repeatBtn.onclick = () => { isRepeat = !isRepeat; repeatBtn.classList.toggle('active', isRepeat); fsRepeatBtn.classList.toggle('active', isRepeat); };

    audio.ontimeupdate = () => {
      if (!audio.duration) return;
      const p = (audio.currentTime / audio.duration) * 100;
      seekbar.value = p;
      fsSeekbar.value = p;
      currentTimeEl.textContent = fmt(audio.currentTime);
      fsCurrentTime.textContent = fmt(audio.currentTime);
    };
    audio.onloadedmetadata = () => { durationEl.textContent = fmt(audio.duration); fsDuration.textContent = fmt(audio.duration); };
    audio.onended = () => isRepeat ? (audio.currentTime = 0, play()) : next();
    seekbar.oninput = () => { if (audio.duration) audio.currentTime = (seekbar.value / 100) * audio.duration; };
    fsSeekbar.oninput = () => { if (audio.duration) audio.currentTime = (fsSeekbar.value / 100) * audio.duration; };
    volumeSlider.oninput = () => { audio.volume = volumeSlider.value; fsVolumeSlider.value = volumeSlider.value; updateVolIcon(); };
    fsVolumeSlider.oninput = () => { audio.volume = fsVolumeSlider.value; volumeSlider.value = fsVolumeSlider.value; updateVolIcon(); };

    fullscreenBtn.onclick = () => { if (currentPlaylist[currentIndex]) { fsPlayer.classList.add('active'); document.body.style.overflow = 'hidden'; } };
    fsCloseBtn.onclick = () => { fsPlayer.classList.remove('active'); document.body.style.overflow = ''; };
    fsPlayBtn.onclick = toggle;
    fsPrevBtn.onclick = prev;
    fsNextBtn.onclick = next;
    fsFavBtn.onclick = () => { const t = currentPlaylist[currentIndex]; if (t) toggleFav(t); };
    fsShuffleBtn.onclick = () => shuffleBtn.click();
    fsRepeatBtn.onclick = () => repeatBtn.click();

    document.getElementById('searchInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') searchMusic(); });
    document.getElementById('refreshRandomBtn')?.addEventListener('click', async () => {
      randomTracks = await fetch('/playlist/data?offset=0&limit=15&sort=random').then(r => r.json()).catch(() => []);
      renderCards('randomTracksList', randomTracks, 'random');
    });

    document.getElementById('allTracksList')?.addEventListener('scroll', function() {
      if (this.scrollTop + this.clientHeight >= this.scrollHeight - 200) loadAllTracks();
    });

    // Load data when switching sections
    document.querySelectorAll('.menu-link').forEach(l => {
      l.addEventListener('click', () => {
        const id = l.dataset.section;
        if (id === 'music' && !allTracks.length) loadAllTracks();
        if (id === 'favorites') loadFavorites();
      });
    });
  }

  function updateVolIcon() {
    const v = audio.volume;
    volumeIcon.className = 'fa-solid ' + (v === 0 ? 'fa-volume-xmark' : v < 0.5 ? 'fa-volume-low' : 'fa-volume-high');
  }

  function fmt(s) {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }
});