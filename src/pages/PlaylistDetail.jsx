import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, getDocs, collection, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getThumbnailUrl } from '../utils/youtube';
import { PlayIcon, SkipPrevIcon, SkipNextIcon, GripIcon, XIcon, EditIcon, TrashIcon, PlusIcon, MicIcon, MusicIcon, ShuffleIcon } from '../components/Icons';
import PasswordModal from '../components/PasswordModal';
import PlaylistModal from '../components/PlaylistModal';
import AddToPlaylistModal from '../components/AddToPlaylistModal';

function SortableRow({ song, index, isActive, onPlay, onRemove, isAuthed }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.id });
  const clickRef = useRef(true);

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 8, marginBottom: 4,
        background: isActive ? 'var(--pink-dim)' : 'var(--card)',
        border: `1px solid ${isActive ? 'rgba(212,84,122,0.25)' : 'var(--border)'}`,
        transition: 'all 0.14s',
      }}>
        {/* Drag handle — only this area triggers DnD */}
        {isAuthed && (
          <div
            {...attributes}
            {...listeners}
            onPointerDown={() => { clickRef.current = false; }}
            onPointerUp={() => { setTimeout(() => { clickRef.current = true; }, 100); }}
            style={{ cursor: 'grab', color: 'var(--text3)', display: 'flex', alignItems: 'center', flexShrink: 0, padding: '2px 2px' }}
          >
            <GripIcon size={13} />
          </div>
        )}

        {/* Index */}
        <span style={{ width: 18, textAlign: 'center', fontSize: 11, color: isActive ? 'var(--pink)' : 'var(--text3)', flexShrink: 0 }}>
          {isActive ? <PlayIcon size={9} /> : index + 1}
        </span>

        {/* Thumbnail — click to play */}
        <img
          src={getThumbnailUrl(song.videoId, 'mq')} alt=""
          onClick={() => onPlay(song, index)}
          style={{ width: 50, height: 28, objectFit: 'cover', borderRadius: 4, flexShrink: 0, cursor: 'pointer' }}
        />

        {/* Info — click to play */}
        <div
          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          onClick={() => onPlay(song, index)}
        >
          <p style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--pink)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.name}</p>
          <p style={{ fontSize: 11, color: 'var(--text3)' }}>{song.artist}</p>
        </div>

        <span className={song.streamType === 'singing' ? 'badge-singing' : 'badge-ukulele'} style={{ flexShrink: 0 }}>
          {song.streamType === 'singing' ? <><MicIcon size={9} /> 歌</> : <><MusicIcon size={9} /> ウクレレ</>}
        </span>

        {isAuthed && (
          <button className="btn-icon-sq" onClick={() => onRemove(song.id)} style={{ flexShrink: 0 }}>
            <XIcon size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const { playSong, loadSong, currentSong } = usePlayer();
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddSongs, setShowAddSongs] = useState(false);

  // Distance 8px to distinguish click from drag
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const fetchData = useCallback(async () => {
    try {
      const plDoc = await getDoc(doc(db, 'playlists', id));
      if (!plDoc.exists()) { navigate('/playlists'); return; }
      const pl = { id: plDoc.id, ...plDoc.data() };
      setPlaylist(pl);
      const ids = pl.songIds || [];
      if (!ids.length) { setSongs([]); setLoading(false); return; }
      // Firestore 'in' limit is 30 — handle large playlists
      const chunks = [];
      for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));
      const songMap = {};
      for (const chunk of chunks) {
        const snap = await getDocs(query(collection(db, 'songs'), where('__name__', 'in', chunk)));
        snap.docs.forEach(d => { songMap[d.id] = { id: d.id, ...d.data() }; });
      }
      setSongs(ids.map(sid => songMap[sid]).filter(Boolean));
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const requireAuth = (action) => {
    if (isAuthed) action();
    else { setPendingAction(() => action); setShowPassword(true); }
  };

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const o = songs.findIndex(s => s.id === active.id);
    const n = songs.findIndex(s => s.id === over.id);
    const reordered = arrayMove(songs, o, n);
    setSongs(reordered);
    await updateDoc(doc(db, 'playlists', id), { songIds: reordered.map(s => s.id) });
  };

  const handleRemove = async (songId) => {
    const updated = songs.filter(s => s.id !== songId);
    setSongs(updated);
    await updateDoc(doc(db, 'playlists', id), { songIds: updated.map(s => s.id) });
  };

  const handleDelete = async () => {
    if (!confirm(`「${playlist.name}」を削除しますか？`)) return;
    await deleteDoc(doc(db, 'playlists', id));
    navigate('/playlists');
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', animation: 'pulse 1.5s infinite' }}>読み込み中...</div>;
  if (!playlist) return null;

  const color = playlist.color || '#d4547a';

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap', padding: '0 0 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 110, height: 110, borderRadius: 16, flexShrink: 0, background: `linear-gradient(135deg, ${color} 0%, ${color}70 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 20px ${color}30` }}>
          <MusicIcon size={40} style={{ color: '#fff', opacity: 0.9 }} />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>プレイリスト</p>
          <h1 style={{ fontFamily: 'var(--font-logo)', fontSize: 'clamp(18px, 3vw, 28px)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4, lineHeight: 1.1 }}>{playlist.name}</h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 14 }}>{songs.length}曲</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => songs.length && playSong(songs[0], songs, 0)}
              disabled={!songs.length}
              style={{ background: color, color: '#fff', borderRadius: 24, padding: '8px 22px', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, opacity: songs.length ? 1 : 0.5, boxShadow: `0 3px 12px ${color}35` }}>
              <PlayIcon size={13} /> 再生
            </button>
            <button
              onClick={() => { if (songs.length) { const shuffled = [...songs].sort(() => Math.random() - 0.5); playSong(shuffled[0], shuffled, 0); } }}
              disabled={!songs.length}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, padding: '8px 16px' }}>
              <ShuffleIcon size={13} /> シャッフル
            </button>
            {isAuthed ? (
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setShowAddSongs(true)} className="btn-secondary" style={{ fontSize: 12, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 4 }}><PlusIcon size={12} /> 追加</button>
                <button onClick={() => setShowEdit(true)} className="btn-icon" title="編集"><EditIcon size={14} /></button>
                <button onClick={handleDelete} className="btn-icon" title="削除" style={{ color: 'var(--text3)' }}><TrashIcon size={14} /></button>
              </div>
            ) : (
              <button onClick={() => requireAuth(() => {})} className="btn-secondary" style={{ fontSize: 12, padding: '7px 12px' }}>編集</button>
            )}
          </div>
        </div>
      </div>

      {/* Song list */}
      {songs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text3)' }}>
          <MusicIcon size={32} style={{ marginBottom: 10, opacity: 0.3 }} />
          <p>楽曲がありません</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={isAuthed ? handleDragEnd : undefined}>
          <SortableContext items={songs.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {songs.map((song, i) => (
              <SortableRow
                key={song.id}
                song={song}
                index={i}
                isActive={currentSong?.id === song.id}
                onPlay={(s, idx) => loadSong(s, songs, idx)}
                onRemove={() => requireAuth(() => handleRemove(song.id))}
                isAuthed={isAuthed}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {showPassword && <PasswordModal onClose={() => setShowPassword(false)} onSuccess={() => { pendingAction?.(); setPendingAction(null); }} />}
      {showEdit && <PlaylistModal playlist={playlist} onClose={() => setShowEdit(false)} onSave={() => { fetchData(); setShowEdit(false); }} />}
      {showAddSongs && <AddToPlaylistModal playlist={playlist} currentSongIds={songs.map(s => s.id)} onClose={() => setShowAddSongs(false)} onSave={() => { fetchData(); setShowAddSongs(false); }} />}
    </div>
  );
}
