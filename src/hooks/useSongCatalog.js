import { useEffect, useSyncExternalStore } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';

let state = { songs: [], loading: true, error: '' };
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

// Share one request between screens and forms, including Strict Mode mounts.
export function refreshSongCatalog(force = false) {
  if (request) {
    if (force) refreshAfterRequest = true;
    return request;
  }
  if (!force && Date.now() - loadedAt < 60_000) return Promise.resolve();
  publish({ loading: true, error: '' });
  request = getDocs(
    query(collection(db, 'songs'), orderBy('createdAt', 'desc'))
  )
    .then((snap) => {
      loadedAt = Date.now();
      publish({ songs: snap.docs.map((d) => ({ ...d.data(), id: d.id })) });
    })
    .catch(() =>
      publish({
        error: '楽曲を読み込めませんでした。接続を確認して再試行してください。',
      })
    )
    .finally(() => {
      request = null;
      if (refreshAfterRequest) {
        refreshAfterRequest = false;
        refreshSongCatalog(true);
      } else publish({ loading: false });
    });
  return request;
}

export function useSongCatalog() {
  const catalog = useSyncExternalStore(subscribe, snapshot);
  useEffect(() => {
    refreshSongCatalog();
  }, []);
  return { ...catalog, refresh: () => refreshSongCatalog(true) };
}
