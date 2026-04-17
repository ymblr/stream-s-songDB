import React, { useState, useEffect, useCallback, useRef } from 'react';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { extractVideoId, fetchVideoInfo, timestampToSeconds } from '../utils/youtube';
import { XIcon, PlusIcon } from './Icons';

const STORAGE_KEY = 'uta_add_song_draft';
const emptyRow = () => ({ id: Math.random().toString(36).slice(2), name: '', startTime: '', endTime: '' });

function loadDraft() {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
}
function saveDraft(data) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}
function clearDraft() {
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
}

export default function AddSongModal({ onClose }) {
  const draft = loadDraft();

  const [url, setUrl] = useState(draft?.url || '');
  const [videoId, setVideoId] = useState(draft?.videoId || '');
  const [videoInfo, setVideoInfo] = useState(draft?.videoInfo || null);
  const [streamType, setStreamType] = useState(draft?.streamType || 'singing');
  const [artist, setArtist] = useState(draft?.artist || '');
  const [rows, setRows] = useState(draft?.rows || [emptyRow()]);
  const [memo, setMemo] = useState(draft?.memo || '');
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0); // 0 = not yet saved
  const prevVideoIdRef = useRef(draft?.videoId || '');

  // Persist draft on every change
  useEffect(() => {
    if (savedCount > 0) return; // don't overwrite after save
    saveDraft({ url, videoId, videoInfo, streamType, artist, rows, memo });
  }, [url, videoId, videoInfo, streamType, artist, rows, memo, savedCount]);

  // Fetch existing artists
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
    if (vid && vid !== prevVideoIdRef.current) {
      prevVideoIdRef.current = vid;
      setVideoId(vid);
      setLoading(true);
      const info = await fetchVideoInfo(vid);
      setVideoInfo(info);
      setLoading(false);
    }
  }, []);

  const updateRow = (id, field, value) =>
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (id) => setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);

  const handleSave = async () => {
    if (!videoId) return alert('YouTubeのURLを入力してください');
    const valid = rows.filter(r => r.name.trim() && r.startTime.trim() && r.endTime.trim());
    if (!valid.length) return alert('楽曲名・開始・終了タイムスタンプを入力してください');
    setSaving(true);
    let count = 0;
    try {
      for (const row of valid) {
        await addDoc(collection(db, 'songs'), {
          name: row.name.trim(), artist: artist.trim(),
          videoId, streamUrl: url,
          streamTitle: videoInfo?.title || '', streamThumbnail: videoInfo?.thumbnail || '',
          streamType, startTime: timestampToSeconds(row.startTime),
          endTime: timestampToSeconds(row.endTime), playCount: 0,
          createdAt: serverTimestamp(),
        });
        count++;
      }
      clearDraft();
      setSavedCount(count);
    } catch (e) { alert('保存に失敗しました: ' + e.message); }
    setSaving(false);
  };

  const handleAddMore = () => {
    // Reset form for next batch, keep artist/streamType
    setSavedCount(0);
    setUrl(''); setVideoId(''); setVideoInfo(null); setRows([emptyRow()]); setMemo('');
    prevVideoIdRef.current = '';
  };

  const handleClose = () => {
    // Don't clear draft on close — user can resume
    onClose();
  };

  return (
    // ⚠️ NO onClick on overlay — intentionally can't close by clicking outside
    <div className="overlay" style={{ alignItems: 'flex-start', paddingTop: 40 }}>
      <div className="modal" style={{ width: '96vw', maxWidth: 860, padding: 0, display: 'flex', maxHeight: '88vh' }}>

        {/* ── LEFT: Form ── */}
        <div style={{ flex: 1, padding: '22px 24px', overflow: 'auto', minWidth: 0 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ fontFamily: 'var(--font-logo)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em' }}>楽曲を追加</h2>
            <button className="btn-icon" onClick={handleClose} title="閉じる（入力内容は保持されます）">
              <XIcon size={16} />
            </button>
          </div>

          {/* ── SUCCESS STATE ── */}
          {savedCount > 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--pink-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 26 }}>✓</div>
              <p style={{ fontFamily: 'var(--font-logo)', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{savedCount}曲を保存しました</p>
              <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 28 }}>楽曲がデータベースに追加されました</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button className="btn-secondary" onClick={handleClose} style={{ minWidth: 110 }}>閉じる</button>
                <button className="btn-primary" onClick={handleAddMore} style={{ minWidth: 140 }}>続けて追加する</button>
              </div>
            </div>
          ) : (
            <>
              {/* URL */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>YouTube配信URL</label>
                <input placeholder="https://www.youtube.com/watch?v=..." value={url} onChange={e => handleUrlChange(e.target.value)} />
                {loading && <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, animation: 'pulse 1.5s infinite' }}>情報を取得中...</p>}
              </div>

              {videoInfo && (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--card2)', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
                  <img src={videoInfo.thumbnail} alt="" style={{ width: 68, height: 38, objectFit: 'cover', borderRadius: 4 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{videoInfo.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--text3)' }}>{videoInfo.author}</p>
                  </div>
                </div>
              )}

              {/* Stream type + Artist */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>配信種別</label>
                  <div style={{ display: 'flex', gap: 3, background: 'var(--card2)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
                    {[['singing', '歌枠'], ['ukulele', 'ウクレレ枠']].map(([val, label]) => (
                      <button key={val} onClick={() => setStreamType(val)} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: streamType === val ? (val === 'singing' ? 'var(--pink)' : 'var(--navy-bright)') : 'transparent', color: streamType === val ? '#fff' : 'var(--text3)', transition: 'all 0.15s' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>アーティスト（配信共通）</label>
                  <input placeholder="アーティスト名" value={artist} onChange={e => setArtist(e.target.value)} list="artists-dl" style={{ padding: '8px 10px', fontSize: 13 }} />
                  <datalist id="artists-dl">{artists.map(a => <option key={a} value={a} />)}</datalist>
                </div>
              </div>

              {/* Song rows */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 86px 86px 26px', gap: 6, padding: '0 2px', marginBottom: 5 }}>
                  {['楽曲名', '開始', '終了', ''].map((h, i) => (
                    <span key={i} style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {rows.map((row, idx) => (
                    <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 86px 86px 26px', gap: 6, alignItems: 'center' }}>
                      <input placeholder={`楽曲名 ${idx + 1}`} value={row.name} onChange={e => updateRow(row.id, 'name', e.target.value)} style={{ padding: '7px 10px', fontSize: 13 }} />
                      <input placeholder="0:00" value={row.startTime} onChange={e => updateRow(row.id, 'startTime', e.target.value)} style={{ padding: '7px 10px', fontSize: 13, textAlign: 'center', fontFamily: 'monospace' }} />
                      <input placeholder="3:30" value={row.endTime} onChange={e => updateRow(row.id, 'endTime', e.target.value)} style={{ padding: '7px 10px', fontSize: 13, textAlign: 'center', fontFamily: 'monospace' }} />
                      <button onClick={() => removeRow(row.id)} className="btn-icon-sq" style={{ opacity: rows.length > 1 ? 1 : 0.2 }}><XIcon size={12} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={addRow} style={{ width: '100%', padding: '7px', border: '1px dashed var(--border2)', borderRadius: 8, color: 'var(--text3)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 18, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.target.style.borderColor = 'var(--pink)'; e.target.style.color = 'var(--pink)'; }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--border2)'; e.target.style.color = 'var(--text3)'; }}>
                <PlusIcon size={12} /> 楽曲を追加
              </button>

              <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 12 }}>
                ※ 閉じても入力内容はページをリロードするまで保持されます
              </p>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-secondary" onClick={handleClose} style={{ flex: 1 }}>キャンセル</button>
                <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 2, opacity: saving ? 0.7 : 1 }}>
                  {saving ? '保存中...' : `${rows.filter(r => r.name.trim()).length || 0}曲を保存`}
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT: Memo ── */}
        {savedCount === 0 && (
          <div style={{ width: 176, borderLeft: '1px solid var(--border)', padding: '22px 14px', display: 'flex', flexDirection: 'column', background: 'var(--bg2)', flexShrink: 0 }}>
            <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>メモ</p>
            <textarea placeholder="タイムスタンプのメモなど..." value={memo} onChange={e => setMemo(e.target.value)}
              style={{ flex: 1, resize: 'none', fontSize: 12, lineHeight: 1.8, padding: '8px', fontFamily: 'monospace', background: 'var(--card)', borderRadius: 6 }} />
          </div>
        )}
      </div>
    </div>
  );
}
