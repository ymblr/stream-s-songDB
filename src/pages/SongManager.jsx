import React, { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { searchSongs } from '../utils/search';
import { getThumbnailUrl, secondsToTimestamp } from '../utils/youtube';
import EditSongModal from '../components/EditSongModal';
import PasswordModal from '../components/PasswordModal';
import { PlayIcon, EditIcon, DownloadIcon, SearchIcon, FilterIcon, MicIcon, MusicIcon, XIcon } from '../components/Icons';

const SORT_OPTIONS = [
  { key: 'createdAt', label: '追加日', dir: 'desc' },
  { key: 'name', label: '楽曲名', dir: 'asc' },
  { key: 'artist', label: 'アーティスト', dir: 'asc' },
  { key: 'playCount', label: '再生数', dir: 'desc' },
];

export default function SongManager() {
  const { isAuthed } = useAuth();
  const { playSong } = usePlayer();
  const [allSongs, setAllSongs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [artistFilter, setArtistFilter] = useState('');
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [editSong, setEditSong] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEdit, setPendingEdit] = useState(null);
  const [artists, setArtists] = useState([]);

  const fetchSongs = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'songs'), orderBy('createdAt', 'desc')));
      const songs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllSongs(songs);
      const aSet = new Set(songs.map(s => s.artist).filter(Boolean));
      setArtists([...aSet].sort());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSongs(); }, []);

  useEffect(() => {
    let result = searchSongs(allSongs, q, typeFilter || null);
    if (artistFilter) result = result.filter(s => s.artist === artistFilter);
    result = [...result].sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey];
      if (sortKey === 'createdAt') { va = va?.seconds ?? 0; vb = vb?.seconds ?? 0; }
      if (sortKey === 'playCount') { va = va || 0; vb = vb || 0; }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    setFiltered(result);
  }, [allSongs, q, typeFilter, artistFilter, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(SORT_OPTIONS.find(o => o.key === key)?.dir || 'asc'); }
  };

  const handleEdit = (song) => {
    if (isAuthed) setEditSong(song);
    else { setPendingEdit(song); setShowPassword(true); }
  };

  const exportCSV = () => {
    const rows = [['楽曲名', 'アーティスト', '種別', '再生数', 'videoId', '開始', '終了']];
    filtered.forEach(s => rows.push([s.name, s.artist, s.streamType, s.playCount || 0, s.videoId, secondsToTimestamp(s.startTime), secondsToTimestamp(s.endTime)]));
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'songs.csv';
    a.click();
  };

  const SortArrow = ({ k }) => {
    if (sortKey !== k) return <span style={{ color: 'var(--border2)', fontSize: 10 }}> ↕</span>;
    return <span style={{ color: 'var(--pink)', fontSize: 10 }}> {sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const thStyle = (k) => ({
    padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: sortKey === k ? 'var(--pink)' : 'var(--text3)',
    letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
    whiteSpace: 'nowrap', userSelect: 'none', background: 'var(--card2)',
    borderBottom: '2px solid var(--border)',
    transition: 'color 0.14s',
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', marginBottom: 2 }}>楽曲管理</h1>
          <p style={{ color: 'var(--text3)', fontSize: 12 }}>{filtered.length} / {allSongs.length}曲</p>
        </div>
        <button onClick={exportCSV} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '7px 14px' }}>
          <DownloadIcon size={13} /> CSVエクスポート
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: 180 }}>
          <SearchIcon size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="検索（AND対応）" style={{ paddingLeft: 32, height: 36, fontSize: 13 }} />
          {q && <button onClick={() => setQ('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }}><XIcon size={12} /></button>}
        </div>

        {/* Type filter */}
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ height: 36, width: 'auto', padding: '0 10px', fontSize: 13 }}>
          <option value="">すべての種別</option>
          <option value="singing">歌枠</option>
          <option value="ukulele">ウクレレ枠</option>
        </select>

        {/* Artist filter */}
        <select value={artistFilter} onChange={e => setArtistFilter(e.target.value)} style={{ height: 36, width: 'auto', padding: '0 10px', fontSize: 13, maxWidth: 160 }}>
          <option value="">すべてのアーティスト</option>
          {artists.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {/* Sort */}
        <select value={sortKey} onChange={e => handleSort(e.target.value)} style={{ height: 36, width: 'auto', padding: '0 10px', fontSize: 13 }}>
          {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          className="btn-secondary"
          style={{ height: 36, padding: '0 12px', fontSize: 13 }}>
          {sortDir === 'asc' ? '↑ 昇順' : '↓ 降順'}
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...Array(6)].map((_, i) => <div key={i} style={{ height: 52, background: 'var(--card)', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />)}
        </div>
      ) : (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle('name'), width: 50 }}>#</th>
                <th style={thStyle('name')} onClick={() => handleSort('name')}>楽曲名<SortArrow k="name" /></th>
                <th style={thStyle('artist')} onClick={() => handleSort('artist')}>アーティスト<SortArrow k="artist" /></th>
                <th style={thStyle('streamType')}>種別</th>
                <th style={thStyle('playCount')} onClick={() => handleSort('playCount')}>再生数<SortArrow k="playCount" /></th>
                <th style={thStyle('createdAt')} onClick={() => handleSort('createdAt')}>追加日<SortArrow k="createdAt" /></th>
                <th style={{ ...thStyle(''), textAlign: 'center' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((song, i) => {
                const date = song.createdAt?.seconds ? new Date(song.createdAt.seconds * 1000).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }) : '-';
                return (
                  <tr key={song.id}
                    style={{ borderTop: '1px solid var(--border)', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--card2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '8px 12px', fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>{i + 1}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img src={getThumbnailUrl(song.videoId, 'mq')} alt="" style={{ width: 44, height: 25, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{song.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{song.artist || '-'}</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span className={song.streamType === 'singing' ? 'badge-singing' : 'badge-ukulele'}>
                        {song.streamType === 'singing' ? <><MicIcon size={9} /> 歌</> : <><MusicIcon size={9} /> ウクレレ</>}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text2)', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{song.playCount || 0}</td>
                    <td style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{date}</td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
                        <button onClick={() => playSong(song, [song], 0)} className="btn-icon-sq" title="再生" style={{ color: 'var(--pink)' }}>
                          <PlayIcon size={13} />
                        </button>
                        <button onClick={() => handleEdit(song)} className="btn-icon-sq" title="編集">
                          <EditIcon size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text3)' }}>
              <p style={{ fontSize: 14 }}>楽曲が見つかりませんでした</p>
            </div>
          )}
        </div>
      )}

      {showPassword && <PasswordModal onClose={() => setShowPassword(false)} onSuccess={() => { if (pendingEdit) { setEditSong(pendingEdit); setPendingEdit(null); } }} />}
      {editSong && <EditSongModal song={editSong} onClose={() => setEditSong(null)} onSave={() => { fetchSongs(); setEditSong(null); }} />}
    </div>
  );
}
