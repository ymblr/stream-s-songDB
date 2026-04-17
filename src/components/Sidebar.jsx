import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSidebar } from '../contexts/SidebarContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { HomeIcon, SearchIcon, ListIcon, MicIcon, MusicIcon, PlusIcon, ChevronRightIcon } from './Icons';

export default function Sidebar() {
  const { sidebarOpen } = useSidebar();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState([]);
  const [artists, setArtists] = useState([]);

  useEffect(() => {
    getDocs(query(collection(db, 'playlists'), orderBy('createdAt', 'desc')))
      .then(snap => setPlaylists(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 8)))
      .catch(() => {});
    getDocs(query(collection(db, 'songs'), orderBy('createdAt', 'desc')))
      .then(snap => {
        const set = new Map();
        snap.docs.forEach(d => {
          const a = d.data().artist;
          if (a && !set.has(a)) set.set(a, { name: a, type: d.data().streamType });
        });
        setArtists([...set.values()].slice(0, 10));
      })
      .catch(() => {});
  }, []);

  const linkStyle = (isActive) => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '9px 16px',
    color: isActive ? 'var(--pink)' : 'var(--text2)',
    background: isActive ? 'var(--pink-dim)' : 'transparent',
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: isActive ? 600 : 400,
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  });

  const sectionTitle = (title) => (
    <p style={{
      fontSize: 10, fontWeight: 700, color: 'var(--text3)',
      letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '14px 16px 6px',
    }}>{title}</p>
  );

  return (
    <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
      <div style={{ padding: '10px 8px', flex: 1 }}>
        {/* Main nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <NavLink to="/" end style={({ isActive }) => linkStyle(isActive)}>
            <HomeIcon size={16} /> ホーム
          </NavLink>
          <NavLink to="/search" style={({ isActive }) => linkStyle(isActive)}>
            <SearchIcon size={16} /> 検索
          </NavLink>
          <NavLink to="/playlists" style={({ isActive }) => linkStyle(isActive)}>
            <ListIcon size={16} /> プレイリスト
          </NavLink>
        </nav>

        <div style={{ height: 1, background: 'var(--border)', margin: '12px 8px' }} />

        {/* Playlists */}
        {playlists.length > 0 && (
          <>
            {sectionTitle('プレイリスト')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {playlists.map(pl => (
                <button
                  key={pl.id}
                  onClick={() => navigate(`/playlist/${pl.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 16px', borderRadius: 8,
                    color: 'var(--text2)', fontSize: 13,
                    transition: 'all 0.15s', width: '100%', textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--card2)'; e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)'; }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: 5, flexShrink: 0,
                    background: pl.color || 'var(--pink)',
                    opacity: 0.8,
                  }} />
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{pl.name}</span>
                </button>
              ))}
              <button
                onClick={() => navigate('/playlists')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', color: 'var(--text3)', fontSize: 12, transition: 'all 0.15s' }}
              >
                <ChevronRightIcon size={12} /> すべて表示
              </button>
            </div>
          </>
        )}

        <div style={{ height: 1, background: 'var(--border)', margin: '12px 8px' }} />

        {/* Artists */}
        {artists.length > 0 && (
          <>
            {sectionTitle('アーティスト')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {artists.map(a => (
                <button
                  key={a.name}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(a.name)}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '7px 16px', borderRadius: 8,
                    color: 'var(--text2)', fontSize: 13,
                    transition: 'all 0.15s', width: '100%', textAlign: 'left',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--card2)'; e.currentTarget.style.color = 'var(--text)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)'; }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: a.type === 'singing' ? 'var(--badge-sing-bg)' : 'var(--badge-uku-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: a.type === 'singing' ? 'var(--badge-sing-color)' : 'var(--badge-uku-color)',
                  }}>
                    {a.type === 'singing' ? <MicIcon size={11} /> : <MusicIcon size={11} />}
                  </div>
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
