import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSongCatalog } from '../hooks/useSongCatalog';
import { searchSongs } from '../utils/search';
import SongCard from '../components/SongCard';
import { SearchIcon, GridIcon, ListIcon, XIcon } from '../components/Icons';

export default function Search() {
  const { songs, loading, error, refresh } = useSongCatalog();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const type = params.get('type') || '';
  const deferred = useDeferredValue(q);
  const [view, setView] = useState(
    () => localStorage.getItem('uta_search_view') || 'list'
  );
  const [visible, setVisible] = useState(48);
  const results = useMemo(
    () => searchSongs(songs, deferred, type || null),
    [songs, deferred, type]
  );
  useEffect(() => {
    setVisible(48);
  }, [deferred, type]);
  const change = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  return (
    <div className="page search-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">THE COLLECTION</p>
          <h1>楽曲を探す</h1>
          <p>曲名・アーティスト・タグから、聴きたい一曲へ。</p>
        </div>
        <span className="collection-total">
          {songs.length}
          <small>TRACKS</small>
        </span>
      </header>
      <div className="catalog-toolbar">
        <div className="catalog-search">
          <SearchIcon size={19} />
          <input
            aria-label="楽曲を検索"
            placeholder="曲名、アーティスト、タグで検索"
            value={q}
            onChange={(e) => change('q', e.target.value)}
          />
          {q && (
            <button
              className="btn-icon-sq"
              aria-label="検索をクリア"
              onClick={() => change('q', '')}
            >
              <XIcon size={16} />
            </button>
          )}
        </div>
        <div className="catalog-filters">
          <div className="segmented-control">
            {[
              ['', 'すべて'],
              ['singing', '歌枠'],
              ['ukulele', '弾き語り'],
            ].map(([value, label]) => (
              <button
                key={value}
                className={type === value ? 'selected' : ''}
                aria-pressed={type === value}
                onClick={() => change('type', value)}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="results-count">
            {loading ? '読み込み中…' : `${results.length}曲`}
          </span>
          <div className="view-switch">
            {[
              ['list', ListIcon, 'リスト表示'],
              ['grid', GridIcon, 'グリッド表示'],
            ].map(([value, Icon, label]) => (
              <button
                key={value}
                className={`btn-icon-sq ${view === value ? 'selected' : ''}`}
                aria-label={label}
                aria-pressed={view === value}
                onClick={() => {
                  setView(value);
                  localStorage.setItem('uta_search_view', value);
                }}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>
        <p className="field-hint">
          スペースで区切ると、すべてのキーワードを含む曲を検索します。
        </p>
      </div>
      {error ? (
        <div className="form-error" role="alert">
          {error}{' '}
          <button className="text-link" onClick={refresh}>
            再試行
          </button>
        </div>
      ) : loading && !songs.length ? (
        <p className="empty-note">ライブラリを読み込み中…</p>
      ) : !results.length ? (
        <div className="empty-state">
          <SearchIcon size={30} />
          <h2>楽曲が見つかりませんでした</h2>
          <p>キーワードや配信種別を変えてみてください。</p>
        </div>
      ) : (
        <>
          {view === 'list' && (
            <div className="song-list-heading">
              <span>楽曲 / アーティスト</span>
              <span>時間</span>
              <span>種別</span>
              <span>操作</span>
            </div>
          )}
          <div
            className={view === 'list' ? 'song-list' : 'song-grid'}
            aria-busy={deferred !== q}
          >
            {results.slice(0, visible).map((song, index) => (
              <SongCard
                key={song.id}
                song={song}
                playlist={results}
                index={index}
                compact={view === 'list'}
              />
            ))}
          </div>
          {results.length > visible && (
            <button
              className="btn-secondary load-more"
              onClick={() => setVisible((n) => n + 48)}
            >
              さらに表示（残り{results.length - visible}曲）
            </button>
          )}
        </>
      )}
    </div>
  );
}
