export function clampVolume(value, fallback = 100) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.round(Math.max(0, Math.min(100, value)))
    : fallback;
}

export function clampSongVolume(value) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.round(Math.max(0, Math.min(200, value)))
    : 100;
}

// Missing settings preserve the volume of existing songs.
export function getSongVolume(song) {
  return clampSongVolume(song?.volumePercent);
}

export function getEffectiveVolume(masterVolume, song) {
  return Math.min(
    100,
    Math.round((clampVolume(masterVolume, 80) * getSongVolume(song)) / 100)
  );
}

export function applyPlayerVolume(player, masterVolume, song) {
  const effective = getEffectiveVolume(masterVolume, song);
  player.setVolume(effective);
  if (effective === 0) player.mute();
  else player.unMute();
}
