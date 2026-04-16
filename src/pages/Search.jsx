import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { searchSongs } from '../utils/search';
import SongCard from '../components/SongCard';
import { useSearchParams } from 'react-router-dom';
import { SearchIcon, GridIcon, ListIcon, MicIcon, MusicIcon, XIcon } from '../components/Icons';

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
      .then(snap => {
        setAllSongs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    setResults(searchSongs(allSongs, q, typeFilter || null));
    const params = {};
    if (q) params.q = q;
    if (typeFilter) params.type = typeFilter;
    setSearchParams(params, { replace: true });
  }, [q, typeFilter, allSongs]);

  return (
    <div style={{ padding: '80px 28px 120px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, marginBottom: 16 }}>楽曲を探す</h1>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <SearchIcon size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          <input
            placeholder="楽曲名・アーティスト名（ひらがな・カタカナ・ローマ字対応）"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ paddingLeft: 42, height: 46, fontSize: 15 }}
            autoFocus
          />
          {q && (
            <button onClick={() => setQ('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }}>
              <XIcon size={15} />
            </button>
          )}
        </div>

        {/* Filters + view toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>フィルタ</span>

          {[
            { val: 'singing', label: '歌枠', Icon: MicIcon },
            { val: 'ukulele', label: 'ウクレレ枠', Icon: MusicIcon },
          ].map(({ val, label, Icon }) => {
            const active = typeFilter === val;
            return (
              <button
                key={val}
                onClick={() => setTypeFilter(active ? '' : val)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 20,
                  border: `1px solid ${active ? 'var(--pink)' : 'var(--border)'}`,
                  background: active ? 'var(--pink-dim)' : 'transparent',
                  color: active ? 'var(--pink)' : 'var(--text2)',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  display: 'flex', alignItems: 'center', gap: 5,
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={12} /> {label}
              </button>
            );
          })}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, background: 'var(--card2)', borderRadius: 8, padding: 3 }}>
            {[['grid', GridIcon], ['list', ListIcon]].map(([v, Ic]) => (
              <button key={v} onClick={() => setView(v)} style={{
                width: 30, height: 28, borderRadius: 6,
                background: view === v ? 'var(--card)' : 'transparent',
                color: view === v ? 'var(--text)' : 'var(--text3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}>
                <Ic size={14} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {!loading && (
        <p style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 18 }}>
          {q || typeFilter ? `${results.length}件の検索結果` : `全${results.length}曲`}
        </p>
      )}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ background: 'var(--card)', borderRadius: 'var(--radius)', aspectRatio: '1.2', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
          <SearchIcon size={36} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontSize: 15 }}>楽曲が見つかりませんでした</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>別のキーワードで試してみてください</p>
        </div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
          {results.map((song, i) => (
            <SongCard key={song.id} song={song} playlist={results} index={i} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {results.map((song, i) => (
            <SongCard key={song.id} song={song} playlist={results} index={i} compact />
          ))}
        </div>
      )}
    </div>
  );
}
