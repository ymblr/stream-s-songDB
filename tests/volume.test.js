import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampVolume,
  clampSongVolume,
  getSongVolume,
  getEffectiveVolume,
  applyPlayerVolume,
  getInitialVolume,
  DEFAULT_VOLUME,
} from '../src/utils/volume.js';

test('existing songs retain their original volume', () => {
  assert.equal(getSongVolume({}), 100);
  assert.equal(getSongVolume(null), 100);
  assert.equal(getEffectiveVolume(80, {}), 80);
});
test('song volume multiplies the master without changing it', () => {
  assert.equal(getEffectiveVolume(80, { volumePercent: 50 }), 40);
  assert.equal(getEffectiveVolume(100, { volumePercent: 75 }), 75);
  assert.equal(getEffectiveVolume(0, { volumePercent: 100 }), 0);
  assert.equal(getEffectiveVolume(80, { volumePercent: 0 }), 0);
});
test('louder settings use available headroom and cap at YouTube output limit', () => {
  assert.equal(getEffectiveVolume(50, { volumePercent: 200 }), 100);
  assert.equal(getEffectiveVolume(80, { volumePercent: 110 }), 88);
  assert.equal(getEffectiveVolume(80, { volumePercent: 125 }), 100);
  assert.equal(getEffectiveVolume(80, { volumePercent: 200 }), 100);
  assert.equal(getSongVolume({ volumePercent: 175 }), 175);
  assert.equal(clampSongVolume(250), 200);
});
test('invalid and out-of-range volume values are safe', () => {
  assert.equal(clampVolume(-10), 0);
  assert.equal(clampVolume(200), 100);
  for (const value of [null, undefined, NaN, Infinity, '50'])
    assert.equal(clampVolume(value), 100);
  assert.equal(getEffectiveVolume(NaN, {}), DEFAULT_VOLUME);
});
test('zero volume remains muted when the player is refreshed', () => {
  const player = {
    setVolume(value) {
      this.volume = value;
    },
    mute() {
      this.muted = true;
    },
    unMute() {
      this.muted = false;
    },
  };
  applyPlayerVolume(player, 80, { volumePercent: 0 });
  assert.equal(player.volume, 0);
  assert.equal(player.muted, true);
  applyPlayerVolume(player, 80, { volumePercent: 50 });
  assert.equal(player.volume, 40);
  assert.equal(player.muted, false);
});

function storage(values = {}) {
  const data = new Map(Object.entries(values));
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
}

test('new clients start at YouTube 40% without a song correction', () => {
  const preferences = storage();
  assert.equal(getInitialVolume(preferences), 40);
  assert.equal(getEffectiveVolume(getInitialVolume(preferences), {}), 40);
  assert.equal(preferences.getItem('uta_volume'), '40');
});

test('old persisted 80% is migrated once, including Strict Mode initialization', () => {
  const preferences = storage({ uta_volume: '80' });
  assert.equal(getInitialVolume(preferences), 40);
  assert.equal(getInitialVolume(preferences), 40);
  preferences.setItem('uta_volume', '80');
  assert.equal(getInitialVolume(preferences), 80);
});

test('existing custom volume and mute are preserved', () => {
  for (const volume of [0, 15, 40, 65, 100]) {
    assert.equal(
      getInitialVolume(storage({ uta_volume: String(volume) })),
      volume
    );
  }
});

test('invalid or inaccessible saved preferences fall back to 40%', () => {
  for (const raw of ['', 'abc', 'NaN', '-1', '101'])
    assert.equal(getInitialVolume(storage({ uta_volume: raw })), 40);
  assert.equal(
    getInitialVolume({
      getItem() {
        throw new Error('storage denied');
      },
    }),
    40
  );
});
