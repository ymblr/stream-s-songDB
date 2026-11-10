import { extractVideoId } from './youtube.js';

// Some videos fail with error 5 when loaded at an offset, but play from zero.
// Retry once without offsets, then seek silently before returning control.
export function createYouTubeClipRecovery() {
  let clip = null;
  let attempted = false;
  let active = false;
  let paused = false;
  let timer = null;
  let phase = 'loading';
  let deadline = 0;
  let inspect = null;

  const clearTimer = () => {
    clearInterval(timer);
    timer = null;
    active = false;
    inspect = null;
  };

  const cancel = () => {
    clearTimer();
    clip = null;
  };

  return {
    get active() {
      return active;
    },
    reset(song) {
      cancel();
      clip = song && { ...song };
      attempted = false;
    },
    cancel,
    onStateChange(state) {
      if (active && state === 1) inspect?.(state);
    },
    setPaused(value) {
      if (!active) return;
      paused = value;
      deadline = Date.now() + 15000;
    },
    retry(code, player, { onRecovered, onFailed }) {
      if (code !== 5 || !clip || clip.startTime <= 0 || attempted) return false;
      attempted = true;
      active = true;
      paused = false;
      phase = 'loading';
      deadline = Date.now() + 15000;
      const target = clip;
      const fail = () => {
        if (!active || clip !== target) return;
        clearTimer();
        try {
          player.pauseVideo();
        } catch {}
        onFailed();
      };

      inspect = (state) => {
        if (!active || paused || clip !== target) return;
        try {
          if (Date.now() >= deadline) {
            fail();
            return;
          }
          if (
            (state ?? player.getPlayerState()) !== 1 ||
            extractVideoId(player.getVideoUrl()) !== target.videoId
          )
            return;
          const time = player.getCurrentTime();
          if (phase === 'loading') {
            // A provisional PLAYING event can arrive before content decodes.
            // Wait for the clock to advance before seeking into this video.
            if (time < Math.min(1, target.startTime / 2)) return;
            phase = 'seeking';
            player.seekTo(target.startTime, true);
            return;
          }
          if (time >= target.startTime - 0.5 && time < target.endTime) {
            clearTimer();
            onRecovered();
          }
        } catch {
          fail();
        }
      };
      timer = setInterval(() => inspect?.(), 200);

      try {
        // mute() itself can trigger error 5 for these videos. Keep output at 0
        // until the requested position is playing, without the mute flag.
        player.setVolume(0);
        player.unMute();
        // Deliberately omit both startSeconds and endSeconds on this retry.
        player.loadVideoById({ videoId: target.videoId });
      } catch {
        clearTimer();
        return false;
      }
      return true;
    },
  };
}
