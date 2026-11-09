export const DEFAULT_VOLUME = 40;
const VOLUME_STORAGE_KEY = 'uta_volume';
const DEFAULT_VERSION_KEY = 'uta_volume_default_version';
const DEFAULT_VERSION = '40-v1';

export function getInitialVolume(storage) {
  try {
    const preferences = storage ?? globalThis.localStorage;
    if (!preferences) return DEFAULT_VOLUME;
    const raw = preferences.getItem(VOLUME_STORAGE_KEY);
    const value = raw !== null && raw.trim() !== '' ? Number(raw) : NaN;
    const saved =
      Number.isFinite(value) && value >= 0 && value <= 100
        ? Math.round(value)
        : null;
    if (preferences.getItem(DEFAULT_VERSION_KEY) !== DEFAULT_VERSION) {
      // The old initial 80% was persisted even without a user volume change.
      const migrated = saved === null || saved === 80 ? DEFAULT_VOLUME : saved;
      try {
        preferences.setItem(VOLUME_STORAGE_KEY, String(migrated));
        preferences.setItem(DEFAULT_VERSION_KEY, DEFAULT_VERSION);
      } catch {}
      return migrated;
    }
    return saved ?? DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

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
    Math.round(
      (clampVolume(masterVolume, DEFAULT_VOLUME) * getSongVolume(song)) / 100
    )
  );
}

export function applyPlayerVolume(player, masterVolume, song) {
  const effective = getEffectiveVolume(masterVolume, song);
  player.setVolume(effective);
  if (effective === 0) player.mute();
  else player.unMute();
}
