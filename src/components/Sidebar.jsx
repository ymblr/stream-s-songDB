import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSidebar } from '../contexts/SidebarContext';
import { usePlayer } from '../contexts/PlayerContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { HomeIcon, SearchIcon, ListIcon, MicIcon, MusicIcon, ChevronRightIcon, ClockIcon, SettingsIcon } from './Icons';

export default function Sidebar() {
  const { sidebarOpen } = useSidebar();
  const { history, playSong } = usePlayer();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState([]);
  const [artists, setArtists] = useState([]);

  useEffect(() => {
    getDocs(query(collection(db, 'playlists'), orderBy('createdAt', 'desc')))
      .then(snap => setPlaylists(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 6)))
      .catch(() => {});
    getDocs(query(collection(db, 'songs'), orderBy('createdAt', 'desc')))
      .then(snap => {
        const map = new Map();
        snap.docs.forEach(d => { const a = d.data().artist; if (a && !map.has(a)) map.set(a, { name: a, type: d.data().streamType }); });
        setArtists([...map.values()].slice(0, 8));
      }).catch(() => {});
  }, []);

  const linkCss = (isActive) => ({
    display: 'flex', alignItems: 'center', gap: 11,
    padding: '8px 14px', color: isActive ? 'var(--pink)' : 'var(--text2)',
    background: isActive ? 'var(--pink-dim)' : 'transparent',
    borderRadius: 8, textDecoration: 'none', fontSize: 13,
    fontWeight: isActive ? 600 : 400, transition: 'all 0.14s',
    overflow: 'hidden', whiteSpace: 'nowrap',
  });

  const btnHoverStyle = {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '7px 14px', borderRadius: 8, color: 'var(--text2)',
    fontSize: 13, transition: 'all 0.14s', width: '100%', textAlign: 'left',
    overflow: 'hidden', whiteSpace: 'nowrap',
  };

  const SectionLabel = ({ title }) => (
    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 14px 4px' }}>
      {title}
    </p>
  );

  const Divider = () => <div style={{ height: 1, background: 'var(--border)', margin: '8px 10px' }} />;

  return (
    <aside className={`sidebar${sidebarOpen ? '' : ' collapsed'}`}>
      <div style={{ padding: '10px 6px' }}>
        {/* Main nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <NavLink to="/" end style={({ isActive }) => linkCss(isActive)}><HomeIcon size={15} />ホーム</NavLink>
          <NavLink to="/search" style={({ isActive }) => linkCss(isActive)}><SearchIcon size={15} />検索</NavLink>
          <NavLink to="/playlists" style={({ isActive }) => linkCss(isActive)}><ListIcon size={15} />プレイリスト</NavLink>
          <NavLink to="/manager" style={({ isActive }) => linkCss(isActive)}><SettingsIcon size={15} />楽曲管理</NavLink>
        </nav>

        <Divider />

        {/* Recently played */}
        {history.length > 0 && (
          <>
            <SectionLabel title="最近再生" />
            {history.slice(0, 5).map((h, i) => (
              <button key={h.song.id + i} onClick={() => playSong(h.song, [h.song], 0)}
                style={btnHoverStyle}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--card2)'; e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)'; }}>
                <ClockIcon size={13} style={{ flexShrink: 0, color: 'var(--text3)' }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{h.song.name}</span>
              </button>
            ))}
            <Divider />
          </>
        )}

        {/* Playlists */}
        {playlists.length > 0 && (
          <>
            <SectionLabel title="プレイリスト" />
            {playlists.map(pl => (
              <button key={pl.id} onClick={() => navigate(`/playlist/${pl.id}`)}
                style={btnHoverStyle}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--card2)'; e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)'; }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, flexShrink: 0, background: pl.color || 'var(--pink)', opacity: 0.85 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{pl.name}</span>
              </button>
            ))}
            <button onClick={() => navigate('/playlists')}
              style={{ ...btnHoverStyle, color: 'var(--text3)', fontSize: 11, paddingTop: 4, paddingBottom: 4 }}>
              <ChevronRightIcon size={11} />すべて表示
            </button>
            <Divider />
          </>
        )}

        {/* Artists */}
        {artists.length > 0 && (
          <>
            <SectionLabel title="アーティスト" />
            {artists.map(a => (
              <button key={a.name} onClick={() => navigate(`/search?q=${encodeURIComponent(a.name)}`)}
                style={btnHoverStyle}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--card2)'; e.currentTarget.style.color = 'var(--text)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)'; }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: a.type === 'singing' ? 'var(--badge-sing-bg)' : 'var(--badge-uku-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.type === 'singing' ? 'var(--badge-sing-color)' : 'var(--badge-uku-color)' }}>
                  {a.type === 'singing' ? <MicIcon size={10} /> : <MusicIcon size={10} />}
                </div>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{a.name}</span>
              </button>
            ))}
          </>
        )}
      </div>
    </aside>
  );
}
