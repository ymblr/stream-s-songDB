import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { searchSongs } from '../utils/search';
import SongCard from '../components/SongCard';
import { useSearchParams } from 'react-router-dom';
import { SearchIcon, GridIcon, ListIcon, MicIcon, MusicIcon, XIcon } from '../components/Icons';

// AND search: all space-separated terms must match
function andSearch(songs, rawQuery, typeFilter) {
  let results = typeFilter ? songs.filter(s => s.streamType === typeFilter) : songs;
  if (!rawQuery.trim()) return results;

  const terms = rawQuery.trim().split(/\s+/).filter(Boolean);
  return results.filter(song => {
    return terms.every(term => {
      const filtered = searchSongs([song], term, null);
      return filtered.length > 0;
    });
  });
}

export default function Search() {
  const [allSongs, setAllSongs] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [view, setView] = useState('grid');

  useEffect(() => {
    getDocs(query(collection(db, 'songs'), orderBy('createdAt', 'desc')))
      .then(snap => { setAllSongs(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    setResults(andSearch(allSongs, q, typeFilter));
    const params = {};
    if (q) params.q = q;
    if (typeFilter) params.type = typeFilter;
    setSearchParams(params, { replace: true });
  }, [q, typeFilter, allSongs]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', marginBottom: 14 }}>楽曲を探す</h1>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <SearchIcon size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          <input
            placeholder="楽曲名・アーティスト（スペースでAND検索）"
            value={q} onChange={e => setQ(e.target.value)}
            style={{ paddingLeft: 40, height: 44, fontSize: 14 }}
            autoFocus
          />
          {q && (
            <button onClick={() => setQ('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }}>
              <XIcon size={15} />
            </button>
          )}
        </div>
        {q.includes(' ') && (
          <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>
            AND検索: 「{q.trim().split(/\s+/).join('」「')}」すべてを含む楽曲
          </p>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>絞り込み</span>
          {[['singing','歌枠',MicIcon],['ukulele','ウクレレ枠',MusicIcon]].map(([val, label, Ic]) => (
            <button key={val} onClick={() => setTypeFilter(typeFilter === val ? '' : val)}
              style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${typeFilter === val ? 'var(--pink)' : 'var(--border)'}`, background: typeFilter === val ? 'var(--pink-dim)' : 'transparent', color: typeFilter === val ? 'var(--pink)' : 'var(--text2)', fontSize: 12, fontWeight: typeFilter === val ? 600 : 400, display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.14s' }}>
              <Ic size={11} /> {label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, background: 'var(--card2)', borderRadius: 7, padding: 3 }}>
            {[['grid', GridIcon], ['list', ListIcon]].map(([v, Ic]) => (
              <button key={v} onClick={() => setView(v)}
                style={{ width: 28, height: 26, borderRadius: 5, background: view === v ? 'var(--card)' : 'transparent', color: view === v ? 'var(--text)' : 'var(--text3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.14s' }}>
                <Ic size={13} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {!loading && <p style={{ color: 'var(--text3)', fontSize: 11, marginBottom: 16 }}>{q || typeFilter ? `${results.length}件` : `全${results.length}曲`}</p>}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {[...Array(8)].map((_, i) => <div key={i} style={{ background: 'var(--card)', borderRadius: 'var(--radius)', aspectRatio: '1.2', animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
          <SearchIcon size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
          <p style={{ fontSize: 14 }}>見つかりませんでした</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>スペースで区切るとAND検索ができます</p>
        </div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {results.map((song, i) => <SongCard key={song.id} song={song} playlist={results} index={i} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {results.map((song, i) => <SongCard key={song.id} song={song} playlist={results} index={i} compact />)}
        </div>
      )}
    </div>
  );
}
