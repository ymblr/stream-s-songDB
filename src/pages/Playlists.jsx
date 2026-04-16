import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import PasswordModal from '../components/PasswordModal';
import PlaylistModal from '../components/PlaylistModal';
import PlaylistCard from '../components/PlaylistCard';

export default function Playlists() {
  const { isAuthed } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fetchPlaylists = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'playlists'), orderBy('createdAt', 'desc')));
      setPlaylists(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchPlaylists(); }, []);

  const handleCreateClick = () => {
    if (isAuthed) setShowCreate(true);
    else setShowPassword(true);
  };

  return (
    <div style={{ padding: '88px 28px 120px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
            プレイリスト
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>
            {playlists.length}件のプレイリスト
          </p>
        </div>
        <button className="btn-primary" onClick={handleCreateClick} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>＋</span> 新規作成
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ background: 'var(--card)', borderRadius: 'var(--radius-lg)', aspectRatio: '1', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text3)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎧</div>
          <p style={{ fontSize: 16, marginBottom: 8 }}>プレイリストがまだありません</p>
          <p style={{ fontSize: 13 }}>「新規作成」からプレイリストを作りましょう</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {playlists.map(pl => (
            <PlaylistCard key={pl.id} playlist={pl} onUpdate={fetchPlaylists} />
          ))}
        </div>
      )}

      {showPassword && (
        <PasswordModal
          onClose={() => setShowPassword(false)}
          onSuccess={() => setShowCreate(true)}
        />
      )}
      {showCreate && (
        <PlaylistModal
          onClose={() => setShowCreate(false)}
          onSave={() => { fetchPlaylists(); setShowCreate(false); }}
        />
      )}
    </div>
  );
}
