function timestamp(value) {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  return (value?.seconds || 0) * 1000 + (value?.nanoseconds || 0) / 1e6;
}

export function sortPlaylists(playlists) {
  return [...playlists].sort((a, b) => {
    const left = Number.isFinite(a.sortOrder) ? a.sortOrder : Infinity;
    const right = Number.isFinite(b.sortOrder) ? b.sortOrder : Infinity;
    if (left !== right) return left - right;
    return (
      timestamp(b.createdAt) - timestamp(a.createdAt) ||
      a.id.localeCompare(b.id)
    );
  });
}

export function assignPlaylistOrder(playlists) {
  return playlists.map((playlist, sortOrder) => ({ ...playlist, sortOrder }));
}
