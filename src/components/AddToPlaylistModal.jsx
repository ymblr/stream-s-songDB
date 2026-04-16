import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { searchSongs } from '../utils/search';
import { getThumbnailUrl } from '../utils/youtube';

export default function AddToPlaylistModal({ playlist, currentSongIds, onClose, onSave }) {
  const [allSongs, setAllSongs] = useState([]);
  const [results, setResults] = useState([]);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selected, setSelected] = useState(new Set(currentSongIds));
  const [order, setOrder] = useState([...currentSongIds]); // preserve order
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDocs(query(collection(db, 'songs'), orderBy('createdAt', 'desc')))
      .then(snap => {
        const songs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllSongs(songs);
        setResults(songs);
      });
  }, []);

  useEffect(() => {
    setResults(searchSongs(allSongs, q, typeFilter || null));
  }, [q, typeFilter, allSongs]);

  const toggleSong = (songId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(songId)) {
        next.delete(songId);
        setOrder(o => o.filter(id => id !== songId));
      } else {
        next.add(songId);
        setOrder(o => [...o, songId]);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Keep order: existing order for already-selected, append new ones
      const existingOrdered = order.filter(id => selected.has(id));
      await updateDoc(doc(db, 'playlists', playlist.id), { songIds: existingOrdered });
      onSave?.();
    } catch (e) {
      alert('保存に失敗しました: ' + e.message);
    }
    setSaving(false);
  };

  const added = selected.size;
  const original = currentSongIds.length;

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: '92vw', maxWidth: 600, padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>曲を追加</h2>
            <button className="btn-icon" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 16 }}>🔍</span>
            <input
              placeholder="楽曲名・アーティスト名"
              value={q}
              onChange={e => setQ(e.target.value)}
              style={{ paddingLeft: 38, height: 40, fontSize: 14 }}
              autoFocus
            />
          </div>

          {/* Type filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[['', 'すべて'], ['singing', '🎤 歌枠'], ['ukulele', '🪕 ウクレレ']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setTypeFilter(val)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 16,
                  fontSize: 12,
                  border: `1px solid ${typeFilter === val ? 'var(--pink)' : 'var(--border)'}`,
                  background: typeFilter === val ? 'var(--pink-dim)' : 'transparent',
                  color: typeFilter === val ? 'var(--pink)' : 'var(--text3)',
                  fontWeight: typeFilter === val ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >{label}</button>
            ))}
          </div>
        </div>

        {/* Song list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {results.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text3)', padding: 24 }}>見つかりませんでした</p>
          ) : (
            results.map(song => {
              const isSelected = selected.has(song.id);
              return (
                <div
                  key={song.id}
                  onClick={() => toggleSong(song.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--pink-dim)' : 'transparent',
                    marginBottom: 4,
                    transition: 'all 0.15s',
                    border: `1px solid ${isSelected ? 'rgba(255,167,197,0.3)' : 'transparent'}`,
                  }}
                >
                  {/* Checkbox */}
                  <div style={{
                    width: 20, height: 20,
                    borderRadius: 4,
                    border: `2px solid ${isSelected ? 'var(--pink)' : 'var(--border2)'}`,
                    background: isSelected ? 'var(--pink)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                    fontSize: 12,
                    color: '#0f0e17',
                    fontWeight: 700,
                  }}>
                    {isSelected && '✓'}
                  </div>

                  <img
                    src={getThumbnailUrl(song.videoId, 'mq')}
                    alt=""
                    style={{ width: 48, height: 27, objectFit: 'cover', borderRadius: 3, flexShrink: 0 }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 13, fontWeight: isSelected ? 600 : 400,
                      color: isSelected ? 'var(--pink)' : 'var(--text)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{song.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text3)' }}>{song.artist}</p>
                  </div>

                  <span className={song.streamType === 'singing' ? 'badge-singing' : 'badge-ukulele'}>
                    {song.streamType === 'singing' ? '歌' : '🪕'}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '14px 20px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <p style={{ flex: 1, fontSize: 13, color: 'var(--text3)' }}>
            <span style={{ color: 'var(--pink)', fontWeight: 600 }}>{added}曲</span> 選択中
          </p>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '9px 18px' }}>キャンセル</button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '9px 20px', opacity: saving ? 0.7 : 1 }}
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  );
}
