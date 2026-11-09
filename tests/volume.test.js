import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampVolume,
  clampSongVolume,
  getSongVolume,
  getEffectiveVolume,
  applyPlayerVolume,
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
  assert.equal(getEffectiveVolume(NaN, {}), 80);
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
