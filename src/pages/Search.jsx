import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { searchSongs } from '../utils/search';
import SongCard from '../components/SongCard';
import { useSearchParams } from 'react-router-dom';

export default function Search() {
  const [allSongs, setAllSongs] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || '');
  const [view, setView] = useState('grid'); // 'grid' | 'list'

  useEffect(() => {
    getDocs(query(collection(db, 'songs'), orderBy('createdAt', 'desc')))
      .then(snap => {
        const songs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllSongs(songs);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const filtered = searchSongs(allSongs, q, typeFilter || null);
    setResults(filtered);
    // Update URL params
    const params = {};
    if (q) params.q = q;
    if (typeFilter) params.type = typeFilter;
    setSearchParams(params, { replace: true });
  }, [q, typeFilter, allSongs]);

  const handleType = (t) => setTypeFilter(prev => prev === t ? '' : t);

  return (
    <div style={{ padding: '88px 28px 120px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Search header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 22, marginBottom: 20 }}>
          楽曲を探す
        </h1>

        {/* Search bar */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            fontSize: 18, color: 'var(--text3)', pointerEvents: 'none',
          }}>🔍</span>
          <input
            placeholder="楽曲名・アーティスト名で検索（ひらがな・カタカナ・ローマ字対応）"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ paddingLeft: 48, fontSize: 15, height: 48 }}
            autoFocus
          />
          {q && (
            <button
              onClick={() => setQ('')}
              style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text3)', fontSize: 18, padding: 4,
              }}
            >✕</button>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            フィルタ
          </span>
          {[
            { val: 'singing', label: '🎤 歌枠', active: 'var(--pink)', activeBg: 'var(--pink-dim)', activeBorder: 'rgba(255,167,197,0.5)', text: '#0f0e17 stays text' },
            { val: 'ukulele', label: '🪕 ウクレレ枠', active: '#9d9bf0', activeBg: 'rgba(45,44,97,0.5)', activeBorder: 'rgba(45,44,97,0.8)' },
          ].map(({ val, label, active, activeBg, activeBorder }) => (
            <button
              key={val}
              onClick={() => handleType(val)}
              style={{
                padding: '6px 16px',
                borderRadius: 20,
                border: `1px solid ${typeFilter === val ? activeBorder : 'var(--border)'}`,
                background: typeFilter === val ? activeBg : 'transparent',
                color: typeFilter === val ? active : 'var(--text2)',
                fontSize: 13,
                fontWeight: typeFilter === val ? 600 : 400,
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}

          {/* View toggle */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, background: 'var(--card2)', borderRadius: 8, padding: 3 }}>
            {[['grid', '⊞'], ['list', '☰']].map(([v, icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 15,
                  background: view === v ? 'var(--card)' : 'transparent',
                  color: view === v ? 'var(--text)' : 'var(--text3)',
                  transition: 'all 0.15s',
                }}
              >{icon}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 20 }}>
          {q || typeFilter
            ? `${results.length}件の検索結果`
            : `全${results.length}曲`}
        </p>
      )}

      {/* Results */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {[...Array(8)].map((_, i) => (
            <div key={i} style={{ background: 'var(--card)', borderRadius: 'var(--radius)', aspectRatio: '1.2', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🎵</div>
          <p style={{ fontSize: 16 }}>楽曲が見つかりませんでした</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>別のキーワードで試してみてください</p>
        </div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {results.map((song, i) => (
            <SongCard key={song.id} song={song} playlist={results} index={i} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.map((song, i) => (
            <SongCard key={song.id} song={song} playlist={results} index={i} compact />
          ))}
        </div>
      )}
    </div>
  );
}
