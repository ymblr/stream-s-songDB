import { useEffect, useSyncExternalStore } from 'react';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { sortPlaylists, assignPlaylistOrder } from '../utils/playlists';

let state = {
  playlists: [],
  loading: true,
  saving: false,
  error: '',
  notice: '',
};
let request = null;
let refreshAfterRequest = false;
let loadedAt = 0;
const listeners = new Set();
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const snapshot = () => state;
const publish = (patch) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

export function refreshPlaylistCatalog(force = false) {
  if (request) {
    if (force) refreshAfterRequest = true;
    return request;
  }
  if (!force && Date.now() - loadedAt < 60_000) return Promise.resolve();
  publish({ loading: true, error: '' });
  request = getDocs(collection(db, 'playlists'))
    .then((snap) => {
      loadedAt = Date.now();
      publish({
        playlists: sortPlaylists(
          snap.docs.map((d) => ({ ...d.data(), id: d.id }))
        ),
      });
    })
    .catch(() =>
      publish({
        error:
          'プレイリストを読み込めませんでした。接続を確認して再試行してください。',
      })
    )
    .finally(() => {
      request = null;
      if (refreshAfterRequest) {
        refreshAfterRequest = false;
        refreshPlaylistCatalog(true);
      } else publish({ loading: false });
    });
  return request;
}

export async function savePlaylistOrder(playlists) {
  if (state.saving || state.loading) return;
  const previous = state.playlists;
  const ordered = assignPlaylistOrder(playlists);
  const changed = ordered.filter(
    (playlist, index) => playlists[index].sortOrder !== playlist.sortOrder
  );
  if (!changed.length) return;
  if (changed.length > 500) {
    publish({ error: '一度に並べ替えできるプレイリストは500件までです。' });
    return;
  }
  publish({ playlists: ordered, saving: true, error: '', notice: '' });
  try {
    const batch = writeBatch(db);
    changed.forEach((playlist) =>
      batch.update(doc(db, 'playlists', playlist.id), {
        sortOrder: playlist.sortOrder,
      })
    );
    await batch.commit();
    loadedAt = Date.now();
    publish({ notice: '並び順を保存しました。' });
  } catch {
    publish({
      playlists: previous,
      error:
        '並び順を保存できなかったため、元の順番に戻しました。もう一度お試しください。',
    });
  } finally {
    publish({ saving: false });
  }
}

export function usePlaylistCatalog() {
  const catalog = useSyncExternalStore(subscribe, snapshot);
  useEffect(() => {
    refreshPlaylistCatalog();
  }, []);
  return {
    ...catalog,
    refresh: () => refreshPlaylistCatalog(true),
    saveOrder: savePlaylistOrder,
  };
}
