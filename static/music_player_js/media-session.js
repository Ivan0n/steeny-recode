/**
 * Модуль для управления Media Session API (системный плеер).
 */

// Проверяем, поддерживается ли API
const isMediaSessionSupported = 'mediaSession' in navigator;

/**
 * Обновляет метаданные трека (название, артист, обложка) в системном плеере.
 * @param {object} track - Объект текущего трека.
 */
export function updateMediaMetadata(track) {
    if (!isMediaSessionSupported || !track) return;

    navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: 'Steeny Music', // Можно оставить как есть или добавить поле альбома в объект трека
        artwork: [
            { src: track.cover || '/static/default_cover.png', sizes: '96x96', type: 'image/png' },
            { src: track.cover || '/static/default_cover.png', sizes: '128x128', type: 'image/png' },
            { src: track.cover || '/static/default_cover.png', sizes: '192x192', type: 'image/png' },
            { src: track.cover || '/static/default_cover.png', sizes: '256x256', type: 'image/png' },
            { src: track.cover || '/static/default_cover.png', sizes: '384x384', type: 'image/png' },
            { src: track.cover || '/static/default_cover.png', sizes: '512x512', type: 'image/png' },
        ]
    });
}

/**
 * Обновляет состояние воспроизведения (играет/пауза).
 * @param {boolean} isPlaying - true, если музыка играет.
 */
export function updateMediaPlaybackState(isPlaying) {
    if (!isMediaSessionSupported) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
}

/**
 * Обновляет позицию и длительность трека в системном плеере.
 * @param {HTMLAudioElement} audio - HTML-элемент <audio>.
 */
export function updateMediaPositionState(audio) {
    if (!isMediaSessionSupported || !('setPositionState' in navigator.mediaSession) || !audio) return;
    
    try {
        navigator.mediaSession.setPositionState({
            duration: audio.duration || 0,
            playbackRate: audio.playbackRate,
            position: audio.currentTime || 0,
        });
    } catch (error) {
        console.error('Ошибка при обновлении позиции трека:', error);
    }
}

/**
 * Инициализирует обработчики действий (нажатия на кнопки в системном плеере).
 * @param {object} handlers - Объект с функциями-обработчиками: { play, pause, next, prev }.
 */
export function initMediaSessionHandlers({ play, pause, next, prev }) {
    if (!isMediaSessionSupported) return;

    navigator.mediaSession.setActionHandler('play', play);
    navigator.mediaSession.setActionHandler('pause', pause);
    navigator.mediaSession.setActionHandler('nexttrack', next);
    navigator.mediaSession.setActionHandler('previoustrack', prev);
}