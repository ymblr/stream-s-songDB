import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, getDocs, collection, query, where, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getThumbnailUrl } from '../utils/youtube';
import { PlayIcon, SkipPrevIcon, SkipNextIcon, GripIcon, XIcon, EditIcon, TrashIcon, PlusIcon, MicIcon, MusicIcon } from '../components/Icons';
import PasswordModal from '../components/PasswordModal';
import PlaylistModal from '../components/PlaylistModal';
import AddToPlaylistModal from '../components/AddToPlaylistModal';

function SortableRow({ song, index, isActive, onPlay, onRemove, isAuthed }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, zIndex: isDragging ? 10 : 'auto' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 12px',
        background: isActive ? 'var(--pink-dim)' : 'var(--card)',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${isActive ? 'rgba(232,96,138,0.25)' : 'var(--border)'}`,
        marginBottom: 5, transition: 'all 0.15s',
      }}>
        {isAuthed && (
          <div {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--text3)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            <GripIcon size={14} />
          </div>
        )}
        <span style={{ width: 18, textAlign: 'center', fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>
          {isActive ? <PlayIcon size={10} /> : index + 1}
        </span>
        <img src={getThumbnailUrl(song.videoId, 'mq')} alt="" onClick={() => onPlay(song, index)}
          style={{ width: 52, height: 29, objectFit: 'cover', borderRadius: 3, flexShrink: 0, cursor: 'pointer' }} />
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onPlay(song, index)}>
          <p style={{ fontSize: 13, fontWeight: 600, color: isActive ? 'var(--pink)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.name}</p>
          <p style={{ fontSize: 11, color: 'var(--text3)' }}>{song.artist}</p>
        </div>
        <span className={song.streamType === 'singing' ? 'badge-singing' : 'badge-ukulele'} style={{ flexShrink: 0 }}>
          {song.streamType === 'singing' ? <><MicIcon size={10} /> 歌</> : <><MusicIcon size={10} /> ウクレレ</>}
        </span>
        {isAuthed && (
          <button className="btn-icon" onClick={() => onRemove(song.id)} style={{ width: 26, height: 26, flexShrink: 0, color: 'var(--text3)' }}>
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
  const { playSong, currentSong, currentPlaylist, loadSongIntoPlayer } = usePlayer();
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddSongs, setShowAddSongs] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchData = useCallback(async () => {
    try {
      const plDoc = await getDoc(doc(db, 'playlists', id));
      if (!plDoc.exists()) { navigate('/playlists'); return; }
      const pl = { id: plDoc.id, ...plDoc.data() };
      setPlaylist(pl);
      const songIds = pl.songIds || [];
      if (!songIds.length) { setSongs([]); setLoading(false); return; }
      const snap = await getDocs(query(collection(db, 'songs'), where('__name__', 'in', songIds)));
      const map = {};
      snap.docs.forEach(d => { map[d.id] = { id: d.id, ...d.data() }; });
      setSongs(songIds.map(sid => map[sid]).filter(Boolean));
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
    const oldIdx = songs.findIndex(s => s.id === active.id);
    const newIdx = songs.findIndex(s => s.id === over.id);
    const reordered = arrayMove(songs, oldIdx, newIdx);
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

  if (loading) return <div style={{ padding: '88px 28px', textAlign: 'center', color: 'var(--text3)', animation: 'pulse 1.5s infinite' }}>読み込み中...</div>;
  if (!playlist) return null;

  const color = playlist.color || '#e8608a';

  return (
    <div style={{ padding: '80px 0 120px' }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(180deg, ${color}14 0%, transparent 100%)`, borderBottom: '1px solid var(--border)', padding: '28px 28px 24px', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{
            width: 120, height: 120, borderRadius: 18, flexShrink: 0,
            background: `linear-gradient(135deg, ${color} 0%, ${color}70 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 6px 24px ${color}30`,
          }}>
            <MusicIcon size={44} style={{ color: '#fff', opacity: 0.9 }} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>プレイリスト</p>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 'clamp(20px, 3vw, 30px)', fontWeight: 800, marginBottom: 6, lineHeight: 1.1 }}>{playlist.name}</h1>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 18 }}>{songs.length}曲</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => songs.length && playSong(songs[0], songs, 0)}
                disabled={!songs.length}
                style={{
                  background: color, color: '#fff', borderRadius: 24, padding: '9px 24px',
                  fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7,
                  opacity: songs.length ? 1 : 0.5, transition: 'all 0.2s', boxShadow: `0 3px 12px ${color}40`,
                }}
              >
                <PlayIcon size={14} /> 再生
              </button>
              {isAuthed ? (
                <>
                  <button onClick={() => setShowAddSongs(true)} className="btn-secondary" style={{ fontSize: 12, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <PlusIcon size={12} /> 曲を追加
                  </button>
                  <button onClick={() => setShowEdit(true)} className="btn-icon" title="編集"><EditIcon size={14} /></button>
                  <button onClick={handleDelete} className="btn-icon" title="削除" style={{ color: 'var(--text3)' }}><TrashIcon size={14} /></button>
                </>
              ) : (
                <button onClick={() => requireAuth(() => {})} className="btn-secondary" style={{ fontSize: 12, padding: '7px 12px' }}>編集</button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Song list */}
      <div style={{ padding: '0 28px', maxWidth: 1200, margin: '0 auto' }}>
        {songs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
            <MusicIcon size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>楽曲がありません</p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={isAuthed ? handleDragEnd : undefined}>
            <SortableContext items={songs.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {songs.map((song, i) => (
                <SortableRow key={song.id} song={song} index={i}
                  isActive={currentSong?.id === song.id}
                  onPlay={(s, idx) => loadSongIntoPlayer(s, songs, idx)}
                  onRemove={() => requireAuth(() => handleRemove(song.id))}
                  isAuthed={isAuthed}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {showPassword && <PasswordModal onClose={() => setShowPassword(false)} onSuccess={() => { pendingAction?.(); setPendingAction(null); }} />}
      {showEdit && <PlaylistModal playlist={playlist} onClose={() => setShowEdit(false)} onSave={() => { fetchData(); setShowEdit(false); }} />}
      {showAddSongs && <AddToPlaylistModal playlist={playlist} currentSongIds={songs.map(s => s.id)} onClose={() => setShowAddSongs(false)} onSave={() => { fetchData(); setShowAddSongs(false); }} />}
    </div>
  );
}
