import React, { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc, getDocs, collection, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { extractVideoId, fetchVideoInfo, timestampToSeconds, secondsToTimestamp } from '../utils/youtube';
import { XIcon, TrashIcon } from './Icons';

export default function EditSongModal({ song, onClose, onSave }) {
  const [name, setName] = useState(song.name || '');
  const [artist, setArtist] = useState(song.artist || '');
  const [startTime, setStartTime] = useState(secondsToTimestamp(song.startTime));
  const [endTime, setEndTime] = useState(secondsToTimestamp(song.endTime));
  const [streamType, setStreamType] = useState(song.streamType || 'singing');
  const [url, setUrl] = useState(song.streamUrl || '');
  const [videoInfo, setVideoInfo] = useState(null);
  const [artists, setArtists] = useState([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (song.streamThumbnail) {
      setVideoInfo({ title: song.streamTitle, thumbnail: song.streamThumbnail });
    }
    getDocs(query(collection(db, 'songs'), orderBy('createdAt', 'desc')))
      .then(snap => {
        const set = new Set();
        snap.docs.forEach(d => { if (d.data().artist) set.add(d.data().artist); });
        setArtists([...set]);
      }).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'songs', song.id), {
        name: name.trim(),
        artist: artist.trim(),
        startTime: timestampToSeconds(startTime),
        endTime: timestampToSeconds(endTime),
        streamType,
        streamUrl: url,
      });
      onSave?.();
      onClose();
    } catch (e) {
      alert('保存に失敗しました: ' + e.message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'songs', song.id));
      onSave?.();
      onClose();
    } catch (e) {
      alert('削除に失敗しました: ' + e.message);
    }
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: '92vw', maxWidth: 480, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700 }}>楽曲を編集</h2>
          <button className="btn-icon" onClick={onClose}><XIcon size={16} /></button>
        </div>

        {/* Video preview */}
        {videoInfo && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--card2)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: 18 }}>
            <img src={videoInfo.thumbnail} alt="" style={{ width: 64, height: 36, objectFit: 'cover', borderRadius: 4 }} />
            <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{videoInfo.title}</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Stream type */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>配信種別</label>
            <div style={{ display: 'flex', gap: 4, background: 'var(--card2)', borderRadius: 'var(--radius-sm)', padding: 3, width: 'fit-content' }}>
              {[['singing', '歌枠'], ['ukulele', 'ウクレレ枠']].map(([val, label]) => (
                <button key={val} onClick={() => setStreamType(val)} style={{
                  padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  background: streamType === val ? (val === 'singing' ? 'var(--pink)' : 'var(--navy-bright)') : 'transparent',
                  color: streamType === val ? '#fff' : 'var(--text3)', transition: 'all 0.2s',
                }}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>楽曲名</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="楽曲名" autoFocus />
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>アーティスト</label>
            <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="アーティスト名" list="edit-artists" />
            <datalist id="edit-artists">{artists.map(a => <option key={a} value={a} />)}</datalist>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>開始</label>
              <input value={startTime} onChange={e => setStartTime(e.target.value)} placeholder="0:00" style={{ fontFamily: 'monospace', textAlign: 'center' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>終了</label>
              <input value={endTime} onChange={e => setEndTime(e.target.value)} placeholder="3:30" style={{ fontFamily: 'monospace', textAlign: 'center' }} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 24, alignItems: 'center' }}>
          {/* Delete */}
          {confirmDelete ? (
            <div style={{ display: 'flex', gap: 6, flex: 1 }}>
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary" style={{ flex: 1, fontSize: 12, padding: '8px' }}>キャンセル</button>
              <button onClick={handleDelete} className="btn-danger" style={{ flex: 1, fontSize: 12, padding: '8px' }}>本当に削除</button>
            </div>
          ) : (
            <>
              <button onClick={() => setConfirmDelete(true)} className="btn-icon" title="削除" style={{ color: 'var(--text3)', width: 36, height: 36 }}>
                <TrashIcon size={15} />
              </button>
              <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>キャンセル</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 2, opacity: saving ? 0.7 : 1 }}>
                {saving ? '保存中...' : '変更を保存'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
