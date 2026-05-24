// ─────────────────────────────────────────────────────────────
//  Stream's SongDB — Service Worker
//
//  キャッシュ戦略:
//    HTML (navigate)  → ネットワーク優先  ★常に最新の index.html を取得
//    JS / CSS / 画像  → キャッシュ優先    Vite がビルドごとにハッシュを
//                                          ファイル名に付けるため自動更新
//
//  CACHE_NAME は変えなくて OK。
//  新ビルド = 新ハッシュ付きファイル名 = 自動的に新しいURLとして取得される。
// ─────────────────────────────────────────────────────────────

const CACHE_NAME = 'songdb-cache-v1';

// ── Install ──────────────────────────────────────────────────
self.addEventListener('install', e => {
  // 即座に新しい SW を有効化（待機なし）
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // オフライン時のフォールバック用に index.html だけ入れておく
      cache.add('/stream-s-songDB/').catch(() => {})
    )
  );
});

// ── Activate ─────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)   // 古いキャッシュを全て削除
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())   // 開いているページを即時コントロール
  );
});

// ── Fetch ────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const { request } = e;
  const url = new URL(request.url);

  // Firebase / YouTube / googleapis は SW でインターセプトしない
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('youtube') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('ytimg')
  ) return;

  // ── ナビゲーション (HTML) → ネットワーク優先 ──────────────
  // デプロイ後すぐに新しい index.html が読み込まれる。
  // オフラインのときだけキャッシュから返す。
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            // 取得できたら次回オフライン用にキャッシュを更新
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, res.clone()));
          }
          return res;
        })
        .catch(() =>
          // ネットワーク不可 → キャッシュから返す
          caches.match(request).then(cached =>
            cached || caches.match('/stream-s-songDB/')
          )
        )
    );
    return;
  }

  // ── 静的アセット (JS / CSS / 画像) → キャッシュ優先 ───────
  // Vite がビルド時にファイル名へハッシュを付加するため、
  // 新ビルド = 新URL → 自動的にキャッシュミスして最新ファイルを取得する。
  e.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.ok && res.type !== 'opaque') {
          caches.open(CACHE_NAME)
            .then(cache => cache.put(request, res.clone()));
        }
        return res;
      });
    })
  );
});

// ── Message ──────────────────────────────────────────────────
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
