import test from 'node:test';
import assert from 'node:assert/strict';
import { createYouTubeClipRecovery } from '../src/utils/youtubeRecovery.js';

const song = { videoId: 'rErymdqpLG4', startTime: 60, endTime: 200 };

function setup(t, clip = song) {
  t.mock.timers.enable({ apis: ['setInterval', 'Date'] });
  const recovery = createYouTubeClipRecovery();
  recovery.reset(clip);
  const calls = { loads: [], seeks: [], recovered: 0, failed: 0 };
  const player = {
    state: 1,
    time: 1,
    videoId: song.videoId,
    muted: false,
    volume: 40,
    mute() {
      this.muted = true;
    },
    unMute() {
      this.muted = false;
    },
    setVolume(value) {
      this.volume = value;
    },
    loadVideoById(clip) {
      calls.loads.push(clip);
    },
    seekTo(time) {
      calls.seeks.push(time);
    },
    getPlayerState() {
      return this.state;
    },
    getCurrentTime() {
      return this.time;
    },
    getVideoUrl() {
      return `https://youtu.be/${this.videoId}`;
    },
    pauseVideo() {
      this.state = 2;
    },
  };
  const callbacks = {
    onRecovered() {
      calls.recovered++;
    },
    onFailed() {
      calls.failed++;
    },
  };
  t.after(() => recovery.cancel());
  return {
    recovery,
    player,
    calls,
    retry: (code) => recovery.retry(code, player, callbacks),
  };
}

test('only error 5 at a nonzero clip start uses the fallback', (t) => {
  const { recovery, retry, calls } = setup(t);
  for (const code of [undefined, 2, 100, 101, 150, 153])
    assert.equal(retry(code), false);
  recovery.reset({ ...song, startTime: 0 });
  assert.equal(retry(5), false);
  recovery.cancel();
  assert.equal(retry(5), false);
  assert.deepEqual(calls.loads, []);
});

test('retry loads without offsets, keeps output silent, and waits for the requested clip', (t) => {
  const { recovery, player, calls, retry } = setup(t);
  assert.equal(retry(5), true);
  assert.deepEqual(calls.loads, [{ videoId: song.videoId }]);
  assert.equal(player.muted, false);
  assert.equal(player.volume, 0);
  t.mock.timers.tick(200);
  assert.deepEqual(calls.seeks, [60]);
  t.mock.timers.tick(200);
  assert.equal(calls.recovered, 0);
  assert.equal(recovery.active, true);
  player.state = 3;
  player.time = 60;
  t.mock.timers.tick(200);
  assert.equal(calls.recovered, 0);
  player.state = 1;
  t.mock.timers.tick(200);
  assert.equal(calls.recovered, 1);
  assert.equal(recovery.active, false);
  t.mock.timers.tick(20000);
  assert.equal(calls.failed, 0);
});

test('old-video clocks and end events cannot finish a recovery', (t) => {
  const { player, calls, retry } = setup(t);
  retry(5);
  player.videoId = 'rcG1sZILjfc';
  player.time = 60;
  t.mock.timers.tick(200);
  assert.deepEqual(calls.seeks, []);
  player.videoId = song.videoId;
  player.state = 0;
  t.mock.timers.tick(200);
  assert.equal(calls.recovered, 0);
});

test('native PLAYING events seek immediately without waiting for a timer', (t) => {
  const { recovery, player, calls, retry } = setup(t);
  retry(5);
  recovery.onStateChange(1);
  assert.deepEqual(calls.seeks, [60]);
  assert.equal(calls.recovered, 0);
  player.time = 60;
  recovery.onStateChange(1);
  assert.equal(calls.recovered, 1);
});

test('provisional PLAYING at time zero cannot trigger an early seek', (t) => {
  const { recovery, player, calls, retry } = setup(t);
  player.time = 0;
  retry(5);
  recovery.onStateChange(1);
  t.mock.timers.tick(400);
  assert.deepEqual(calls.seeks, []);
  player.time = 1;
  t.mock.timers.tick(200);
  assert.deepEqual(calls.seeks, [60]);
});

test('a synchronous load failure returns control to the caller error handler', (t) => {
  const { recovery, player, calls, retry } = setup(t);
  player.loadVideoById = () => {
    throw Error('load failed');
  };
  assert.equal(retry(5), false);
  assert.equal(recovery.active, false);
  t.mock.timers.tick(20000);
  assert.equal(calls.failed, 0);
});

test('one retry per load prevents repeated error loops; a new load may retry', (t) => {
  const { recovery, player, calls, retry } = setup(t);
  retry(5);
  assert.equal(retry(5), false);
  t.mock.timers.tick(200);
  player.time = 60;
  t.mock.timers.tick(200);
  assert.equal(retry(5), false);
  assert.equal(calls.loads.length, 1);
  recovery.reset(song);
  assert.equal(retry(5), true);
  assert.equal(calls.loads.length, 2);
});

test('stop, close, or replacement cancels stale seeks and callbacks', (t) => {
  const { recovery, calls, retry } = setup(t);
  retry(5);
  recovery.cancel();
  t.mock.timers.tick(20000);
  assert.deepEqual(calls.seeks, []);
  assert.equal(calls.failed, 0);
  recovery.reset(song);
  retry(5);
  recovery.reset({ ...song, videoId: 'rcG1sZILjfc' });
  t.mock.timers.tick(20000);
  assert.equal(calls.recovered, 0);
  assert.equal(calls.failed, 0);
});

test('a stalled retry stops with a single failure instead of hanging', (t) => {
  const { recovery, player, calls, retry } = setup(t);
  player.state = 3;
  retry(5);
  t.mock.timers.tick(15000);
  assert.equal(player.state, 2);
  assert.equal(calls.failed, 1);
  assert.equal(recovery.active, false);
  t.mock.timers.tick(15000);
  assert.equal(calls.failed, 1);
});

test('manual pause suspends recovery until resume', (t) => {
  const { recovery, player, calls, retry } = setup(t);
  retry(5);
  recovery.setPaused(true);
  player.state = 2;
  t.mock.timers.tick(20000);
  assert.deepEqual(calls.seeks, []);
  assert.equal(calls.failed, 0);
  recovery.setPaused(false);
  player.state = 1;
  t.mock.timers.tick(200);
  player.time = 60;
  t.mock.timers.tick(200);
  assert.equal(calls.recovered, 1);
});

test('player API errors stop the retry cleanly', (t) => {
  const { player, calls, retry } = setup(t);
  player.seekTo = () => {
    throw Error('player destroyed');
  };
  retry(5);
  t.mock.timers.tick(200);
  assert.equal(calls.failed, 1);
  assert.equal(calls.recovered, 0);
});
