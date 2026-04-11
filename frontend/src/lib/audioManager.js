/**
 * audioManager.js
 * Singleton that tracks the currently playing <audio> element.
 * When a new audio starts, the previous one is paused automatically.
 */

let currentAudio = null;

export function registerAudio(audioEl) {
    if (!audioEl) return;

    audioEl.addEventListener("play", () => {
        if (currentAudio && currentAudio !== audioEl) {
            currentAudio.pause();
        }
        currentAudio = audioEl;
    });
}

export function stopCurrent() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
}
