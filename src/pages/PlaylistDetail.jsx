import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc, getDoc, getDocs, collection, query,
  where, updateDoc, deleteDoc, orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getThumbnailUrl } from '../utils/youtube';
import PasswordModal from '../components/PasswordModal';
import PlaylistModal from '../components/PlaylistModal';
import AddToPlaylistModal from '../components/AddToPlaylistModal';

function SortableRow({ song, index, isActive, onPlay, onRemove, isAuthed }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 14px',
          background: isActive ? 'var(--pink-dim)' : 'var(--card)',
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${isActive ? 'rgba(255,167,197,0.3)' : 'var(--border)'}`,
          marginBottom: 6,
          transition: 'all 0.15s',
        }}
      >
        {/* Drag handle */}
        {isAuthed && (
          <div
            {...attributes}
            {...listeners}
            style={{
              cursor: 'grab',
              color: 'var(--text3)',
              fontSize: 14,
              padding: '0 4px',
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            ⠿
          </div>
        )}

        {/* Index */}
        <span style={{ width: 20, textAlign: 'center', fontSize: 12, color: 'var(--text3)', flexShrink: 0 }}>
          {isActive ? '▶' : index + 1}
        </span>

        {/* Thumbnail */}
        <img
          src={getThumbnailUrl(song.videoId, 'mq')}
          alt=""
          style={{ width: 56, height: 32, objectFit: 'cover', borderRadius: 4, flexShrink: 0, cursor: 'pointer' }}
          onClick={() => onPlay(song, index)}
        />

        {/* Info */}
        <div
          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          onClick={() => onPlay(song, index)}
        >
          <p style={{
            fontSize: 14, fontWeight: 600,
            color: isActive ? 'var(--pink)' : 'var(--text)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{song.name}</p>
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>{song.artist}</p>
        </div>

        <span className={song.streamType === 'singing' ? 'badge-singing' : 'badge-ukulele'} style={{ flexShrink: 0 }}>
          {song.streamType === 'singing' ? '歌' : '🪕'}
        </span>

        {isAuthed && (
          <button
            className="btn-icon"
            onClick={() => onRemove(song.id)}
            style={{ color: 'var(--text3)', fontSize: 16, flexShrink: 0, width: 28, height: 28 }}
          >✕</button>
        )}
      </div>
    </div>
  );
}

export default function PlaylistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const { playSong, currentSong, currentPlaylist } = usePlayer();

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

      // Fetch songs in order
      const songIds = pl.songIds || [];
      if (songIds.length === 0) { setSongs([]); setLoading(false); return; }

      const snap = await getDocs(query(collection(db, 'songs'), where('__name__', 'in', songIds)));
      const songMap = {};
      snap.docs.forEach(d => { songMap[d.id] = { id: d.id, ...d.data() }; });
      const ordered = songIds.map(sid => songMap[sid]).filter(Boolean);
      setSongs(ordered);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const requireAuth = (action) => {
    if (isAuthed) action();
    else { setPendingAction(() => action); setShowPassword(true); }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = songs.findIndex(s => s.id === active.id);
    const newIdx = songs.findIndex(s => s.id === over.id);
    const reordered = arrayMove(songs, oldIdx, newIdx);
    setSongs(reordered);
    await updateDoc(doc(db, 'playlists', id), { songIds: reordered.map(s => s.id) });
  };

  const handleRemoveSong = async (songId) => {
    const updated = songs.filter(s => s.id !== songId);
    setSongs(updated);
    await updateDoc(doc(db, 'playlists', id), { songIds: updated.map(s => s.id) });
  };

  const handleDelete = async () => {
    if (!confirm(`「${playlist.name}」を削除しますか？`)) return;
    await deleteDoc(doc(db, 'playlists', id));
    navigate('/playlists');
  };

  const handlePlaySong = (song, index) => {
    playSong(song, songs, index);
  };

  const handlePlayAll = () => {
    if (songs.length > 0) playSong(songs[0], songs, 0);
  };

  const isPlaylistActive = currentPlaylist.length > 0 &&
    currentPlaylist[0]?.id === songs[0]?.id &&
    songs.length === currentPlaylist.length;

  if (loading) {
    return (
      <div style={{ padding: '88px 28px', textAlign: 'center' }}>
        <div style={{ animation: 'pulse 1.5s infinite', color: 'var(--text3)' }}>読み込み中...</div>
      </div>
    );
  }

  if (!playlist) return null;

  const color = playlist.color || '#ffa7c5';

  return (
    <div style={{ padding: '88px 0 120px' }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(180deg, ${color}18 0%, transparent 100%)`,
        borderBottom: '1px solid var(--border)',
        padding: '32px 28px 28px',
        marginBottom: 28,
      }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', flexWrap: 'wrap', maxWidth: 1200, margin: '0 auto' }}>
          {/* Cover */}
          <div style={{
            width: 140, height: 140,
            borderRadius: 20,
            background: `linear-gradient(135deg, ${color} 0%, ${color}60 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 52,
            boxShadow: `0 8px 32px ${color}40`,
            flexShrink: 0,
          }}>🎧</div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
              プレイリスト
            </p>
            <h1 style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: 'clamp(24px, 4vw, 36px)',
              fontWeight: 800,
              marginBottom: 8,
              lineHeight: 1.1,
            }}>{playlist.name}</h1>
            <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 20 }}>
              {songs.length}曲
            </p>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={handlePlayAll}
                disabled={songs.length === 0}
                style={{
                  background: color,
                  color: '#fff',
                  borderRadius: 24,
                  padding: '10px 28px',
                  fontWeight: 700,
                  fontSize: 15,
                  display: 'flex', alignItems: 'center', gap: 8,
                  opacity: songs.length === 0 ? 0.5 : 1,
                  transition: 'all 0.2s',
                  filter: 'brightness(1)',
                  boxShadow: `0 4px 16px ${color}40`,
                }}
              >
                ▶ 再生
              </button>

              {/* Edit controls - small and unobtrusive */}
              {isAuthed ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setShowAddSongs(true)}
                    className="btn-secondary"
                    style={{ fontSize: 12, padding: '8px 14px' }}
                  >
                    ＋ 曲を追加
                  </button>
                  <button
                    onClick={() => setShowEdit(true)}
                    className="btn-icon"
                    style={{ fontSize: 14 }}
                    title="編集"
                  >✎</button>
                  <button
                    onClick={handleDelete}
                    className="btn-icon"
                    style={{ fontSize: 14, color: 'var(--text3)' }}
                    title="削除"
                  >🗑</button>
                </div>
              ) : (
                <button
                  onClick={() => requireAuth(() => {})}
                  className="btn-icon"
                  style={{ fontSize: 13, color: 'var(--text3)', padding: '8px 12px' }}
                >
                  🔐 編集
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Song list */}
      <div style={{ padding: '0 28px', maxWidth: 1200, margin: '0 auto' }}>
        {songs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎵</div>
            <p style={{ fontSize: 15, marginBottom: 6 }}>楽曲がありません</p>
            <p style={{ fontSize: 13 }}>「曲を追加」から楽曲を追加してください</p>
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
                  onPlay={handlePlaySong}
                  onRemove={() => requireAuth(() => handleRemoveSong(song.id))}
                  isAuthed={isAuthed}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {showPassword && (
        <PasswordModal
          onClose={() => setShowPassword(false)}
          onSuccess={() => {
            if (pendingAction) { pendingAction(); setPendingAction(null); }
          }}
        />
      )}
      {showEdit && (
        <PlaylistModal
          playlist={playlist}
          onClose={() => setShowEdit(false)}
          onSave={() => { fetchData(); setShowEdit(false); }}
        />
      )}
      {showAddSongs && (
        <AddToPlaylistModal
          playlist={playlist}
          currentSongIds={songs.map(s => s.id)}
          onClose={() => setShowAddSongs(false)}
          onSave={() => { fetchData(); setShowAddSongs(false); }}
        />
      )}
    </div>
  );
}
