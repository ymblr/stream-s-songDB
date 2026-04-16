import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { extractVideoId, fetchVideoInfo, timestampToSeconds } from '../utils/youtube';
import { XIcon, PlusIcon } from './Icons';

const emptyRow = () => ({
  id: Math.random().toString(36).slice(2),
  name: '',
  startTime: '',
  endTime: '',
});

export default function AddSongModal({ onClose }) {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [streamType, setStreamType] = useState('singing');
  const [artist, setArtist] = useState('');
  const [rows, setRows] = useState([emptyRow()]);
  const [memo, setMemo] = useState('');
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    getDocs(query(collection(db, 'songs'), orderBy('createdAt', 'desc')))
      .then(snap => {
        const set = new Set();
        snap.docs.forEach(d => { if (d.data().artist) set.add(d.data().artist); });
        setArtists([...set]);
      }).catch(() => {});
  }, []);

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
          artist: artist.trim(),
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
      <div className="modal" style={{ width: '96vw', maxWidth: 860, padding: 0, display: 'flex', maxHeight: '90vh' }}>

        {/* Left: Form */}
        <div style={{ flex: 1, padding: '24px 24px', overflow: 'auto', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>楽曲を追加</h2>
            <button className="btn-icon" onClick={onClose}><XIcon size={16} /></button>
          </div>

          {/* URL */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>YouTube配信URL</label>
            <input placeholder="https://www.youtube.com/watch?v=..." value={url} onChange={e => handleUrlChange(e.target.value)} />
            {loading && <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5, animation: 'pulse 1.5s infinite' }}>情報を取得中...</p>}
          </div>

          {videoInfo && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--card2)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: 14 }}>
              <img src={videoInfo.thumbnail} alt="" style={{ width: 72, height: 40, objectFit: 'cover', borderRadius: 4 }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{videoInfo.title}</p>
                <p style={{ fontSize: 11, color: 'var(--text3)' }}>{videoInfo.author}</p>
              </div>
            </div>
          )}

          {/* Stream type + Artist on same row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>配信種別</label>
              <div style={{ display: 'flex', gap: 4, background: 'var(--card2)', borderRadius: 'var(--radius-sm)', padding: 3, width: 'fit-content' }}>
                {[['singing', 'マイク', '歌枠'], ['ukulele', 'ウクレレ', 'ウクレレ枠']].map(([val, , label]) => (
                  <button key={val} onClick={() => setStreamType(val)} style={{
                    padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: streamType === val ? (val === 'singing' ? 'var(--pink)' : 'var(--navy-bright)') : 'transparent',
                    color: streamType === val ? '#fff' : 'var(--text3)',
                    transition: 'all 0.2s ease',
                  }}>{label}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>アーティスト（配信共通）</label>
              <input
                placeholder="アーティスト名"
                value={artist}
                onChange={e => setArtist(e.target.value)}
                list="artists-list"
                style={{ padding: '8px 10px', fontSize: 13 }}
              />
              <datalist id="artists-list">
                {artists.map(a => <option key={a} value={a} />)}
              </datalist>
            </div>
          </div>

          {/* Song rows */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 88px 88px 28px', gap: 6, marginBottom: 5, padding: '0 2px' }}>
              {['楽曲名', '開始', '終了', ''].map((h, i) => (
                <span key={i} style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {rows.map((row, idx) => (
                <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 88px 88px 28px', gap: 6, alignItems: 'center' }}>
                  <input placeholder={`楽曲名 ${idx + 1}`} value={row.name} onChange={e => updateRow(row.id, 'name', e.target.value)} style={{ padding: '7px 10px', fontSize: 13 }} />
                  <input placeholder="0:00" value={row.startTime} onChange={e => updateRow(row.id, 'startTime', e.target.value)} style={{ padding: '7px 10px', fontSize: 13, textAlign: 'center', fontFamily: 'monospace' }} />
                  <input placeholder="3:30" value={row.endTime} onChange={e => updateRow(row.id, 'endTime', e.target.value)} style={{ padding: '7px 10px', fontSize: 13, textAlign: 'center', fontFamily: 'monospace' }} />
                  <button onClick={() => rows.length > 1 && removeRow(row.id)} className="btn-icon" style={{ width: 28, height: 28, opacity: rows.length > 1 ? 1 : 0.2 }}>
                    <XIcon size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button onClick={addRow} style={{
            width: '100%', padding: '7px', border: '1px dashed var(--border2)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text3)', fontSize: 13,
            transition: 'all 0.2s', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <PlusIcon size={13} /> 楽曲を追加
          </button>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>キャンセル</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 2, opacity: saving ? 0.7 : 1 }}>
              {saving ? '保存中...' : `${rows.filter(r => r.name.trim()).length}曲を保存`}
            </button>
          </div>
          {savedCount > 0 && (
            <p style={{ textAlign: 'center', color: 'var(--pink)', fontSize: 13, marginTop: 10, fontWeight: 600 }}>
              ✓ {savedCount}曲を保存しました
            </p>
          )}
        </div>

        {/* Right: Memo */}
        <div style={{ width: 180, borderLeft: '1px solid var(--border)', padding: '24px 14px', display: 'flex', flexDirection: 'column', background: 'var(--bg2)', flexShrink: 0 }}>
          <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>メモ</p>
          <textarea
            placeholder="タイムスタンプのメモなど..."
            value={memo}
            onChange={e => setMemo(e.target.value)}
            style={{ flex: 1, resize: 'none', fontSize: 12, lineHeight: 1.8, padding: '8px', fontFamily: 'monospace', background: 'var(--card)' }}
          />
        </div>
      </div>
    </div>
  );
}
