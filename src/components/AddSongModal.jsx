import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { extractVideoId, fetchVideoInfo, timestampToSeconds } from '../utils/youtube';

const emptyRow = () => ({
  id: Math.random().toString(36).slice(2),
  name: '',
  artist: '',
  startTime: '',
  endTime: '',
});

export default function AddSongModal({ onClose }) {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [streamType, setStreamType] = useState('singing');
  const [rows, setRows] = useState([emptyRow()]);
  const [memo, setMemo] = useState('');
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // 過去のアーティスト一覧を取得
  useEffect(() => {
    getDocs(query(collection(db, 'songs'), orderBy('createdAt', 'desc')))
      .then(snap => {
        const set = new Set();
        snap.docs.forEach(d => { if (d.data().artist) set.add(d.data().artist); });
        setArtists([...set]);
      })
      .catch(() => {});
  }, []);

  // URL変更時にビデオ情報を取得
  const handleUrlChange = useCallback(async (val) => {
    setUrl(val);
    const vid = extractVideoId(val);
    if (vid && vid !== videoId) {
      setVideoId(vid);
      setLoading(true);
      const info = await fetchVideoInfo(vid);
      setVideoInfo(info);
      setLoading(false);
    }
  }, [videoId]);

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (id) => setRows(prev => prev.filter(r => r.id !== id));

  const handleSave = async () => {
    if (!videoId) return alert('YouTubeのURLを入力してください');
    const validRows = rows.filter(r => r.name.trim() && r.startTime.trim() && r.endTime.trim());
    if (validRows.length === 0) return alert('楽曲名・開始・終了タイムスタンプを入力してください');

    setSaving(true);
    let count = 0;
    try {
      for (const row of validRows) {
        await addDoc(collection(db, 'songs'), {
          name: row.name.trim(),
          artist: row.artist.trim(),
          videoId,
          streamUrl: url,
          streamTitle: videoInfo?.title || '',
          streamThumbnail: videoInfo?.thumbnail || '',
          streamType,
          startTime: timestampToSeconds(row.startTime),
          endTime: timestampToSeconds(row.endTime),
          playCount: 0,
          createdAt: serverTimestamp(),
        });
        count++;
      }
      setSavedCount(count);
      setRows([emptyRow()]);
      setTimeout(() => setSavedCount(0), 3000);
    } catch (e) {
      alert('保存に失敗しました: ' + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: '96vw', maxWidth: 900, padding: 0, display: 'flex', maxHeight: '90vh' }}>

        {/* Left: Main Form */}
        <div style={{ flex: 1, padding: 28, overflow: 'auto', minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700 }}>楽曲を追加</h2>
            <button className="btn-icon" onClick={onClose} style={{ fontSize: 20 }}>✕</button>
          </div>

          {/* YouTube URL */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              YouTube配信URL
            </label>
            <input
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={e => handleUrlChange(e.target.value)}
            />
            {loading && <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6, animation: 'pulse 1.5s infinite' }}>情報を取得中...</p>}
          </div>

          {/* Video info preview */}
          {videoInfo && (
            <div style={{
              display: 'flex', gap: 12, alignItems: 'center',
              background: 'var(--card2)', borderRadius: 'var(--radius-sm)',
              padding: '10px 14px', marginBottom: 16,
            }}>
              <img src={videoInfo.thumbnail} alt="" style={{ width: 80, height: 45, objectFit: 'cover', borderRadius: 4 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{videoInfo.title}</p>
                <p style={{ fontSize: 12, color: 'var(--text3)' }}>{videoInfo.author}</p>
              </div>
            </div>
          )}

          {/* Stream type toggle */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              配信種別
            </label>
            <div style={{ display: 'flex', gap: 6, background: 'var(--card2)', borderRadius: 'var(--radius-sm)', padding: 4, width: 'fit-content' }}>
              {[['singing', '🎤 歌枠'], ['ukulele', '🪕 ウクレレ枠']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setStreamType(val)}
                  style={{
                    padding: '7px 18px',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    background: streamType === val ? (val === 'singing' ? 'var(--pink)' : 'var(--navy-bright)') : 'transparent',
                    color: streamType === val ? (val === 'singing' ? '#0f0e17' : '#e8e6f0') : 'var(--text3)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Song rows */}
          <div style={{ marginBottom: 12 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 80px 80px 32px',
              gap: 6,
              marginBottom: 6,
              padding: '0 4px',
            }}>
              {['楽曲名', 'アーティスト', '開始', '終了', ''].map((h, i) => (
                <span key={i} style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rows.map(row => (
                <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px 32px', gap: 6, alignItems: 'center' }}>
                  <input
                    placeholder="楽曲名"
                    value={row.name}
                    onChange={e => updateRow(row.id, 'name', e.target.value)}
                    style={{ padding: '8px 10px', fontSize: 13 }}
                  />
                  <div style={{ position: 'relative' }}>
                    <input
                      placeholder="アーティスト"
                      value={row.artist}
                      onChange={e => updateRow(row.id, 'artist', e.target.value)}
                      list={`artists-${row.id}`}
                      style={{ padding: '8px 10px', fontSize: 13 }}
                    />
                    <datalist id={`artists-${row.id}`}>
                      {artists.map(a => <option key={a} value={a} />)}
                    </datalist>
                  </div>
                  <input
                    placeholder="0:00"
                    value={row.startTime}
                    onChange={e => updateRow(row.id, 'startTime', e.target.value)}
                    style={{ padding: '8px 10px', fontSize: 13, textAlign: 'center', fontFamily: 'monospace' }}
                  />
                  <input
                    placeholder="3:30"
                    value={row.endTime}
                    onChange={e => updateRow(row.id, 'endTime', e.target.value)}
                    style={{ padding: '8px 10px', fontSize: 13, textAlign: 'center', fontFamily: 'monospace' }}
                  />
                  <button
                    onClick={() => rows.length > 1 ? removeRow(row.id) : null}
                    style={{ color: 'var(--text3)', fontSize: 16, opacity: rows.length > 1 ? 1 : 0.2, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, transition: 'all 0.2s' }}
                    className="btn-icon"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add row */}
          <button
            onClick={addRow}
            style={{
              width: '100%', padding: '8px', border: '1px dashed var(--border2)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text3)', fontSize: 13,
              transition: 'all 0.2s', marginBottom: 20,
            }}
            onMouseEnter={e => { e.target.style.borderColor = 'var(--pink)'; e.target.style.color = 'var(--pink)'; }}
            onMouseLeave={e => { e.target.style.borderColor = 'var(--border2)'; e.target.style.color = 'var(--text3)'; }}
          >
            ＋ 楽曲を追加
          </button>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>キャンセル</button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ flex: 2, opacity: saving ? 0.7 : 1 }}
            >
              {saving ? '保存中...' : `${rows.filter(r => r.name.trim()).length}曲を保存`}
            </button>
          </div>
          {savedCount > 0 && (
            <p style={{ textAlign: 'center', color: 'var(--pink)', fontSize: 13, marginTop: 10, fontWeight: 600 }}>
              ✓ {savedCount}曲を保存しました
            </p>
          )}
        </div>

        {/* Right: Memo pad */}
        <div style={{
          width: 200,
          borderLeft: '1px solid var(--border)',
          padding: '28px 16px',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(0,0,0,0.1)',
          flexShrink: 0,
        }}>
          <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
            メモ
          </p>
          <textarea
            placeholder="タイムスタンプのメモなど..."
            value={memo}
            onChange={e => setMemo(e.target.value)}
            style={{
              flex: 1,
              resize: 'none',
              fontSize: 12,
              lineHeight: 1.8,
              padding: '10px',
              background: 'var(--card2)',
              fontFamily: 'monospace',
            }}
          />
        </div>
      </div>
    </div>
  );
}
