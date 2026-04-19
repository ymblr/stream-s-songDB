import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HomeIcon, SearchIcon, ListIcon, SettingsIcon, PlusIcon } from './Icons';
import AddSongModal from './AddSongModal';
import PasswordModal from './PasswordModal';

export default function BottomNav() {
  const { isAuthed } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleAdd = () => {
    if (isAuthed) setShowAdd(true);
    else setShowPw(true);
  };

  const linkStyle = (isActive) => ({
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 3, flex: 1, padding: '6px 0',
    color: isActive ? 'var(--pink)' : 'var(--text3)',
    textDecoration: 'none', fontSize: 10, fontWeight: isActive ? 600 : 400,
    transition: 'color 0.15s',
    WebkitTapHighlightColor: 'transparent',
  });

  return (
    <>
      <div className="bottom-nav" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
        <NavLink to="/" end style={({ isActive }) => linkStyle(isActive)}>
          <HomeIcon size={20} /> ホーム
        </NavLink>
        <NavLink to="/search" style={({ isActive }) => linkStyle(isActive)}>
          <SearchIcon size={20} /> 検索
        </NavLink>

        {/* Center add button */}
        <button
          onClick={handleAdd}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            flex: 1, padding: '4px 0', color: 'var(--text3)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: 'var(--pink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', marginBottom: 1,
            boxShadow: 'var(--glow-pink)',
            transform: 'translateY(-6px)',
          }}>
            <PlusIcon size={18} />
          </div>
        </button>

        <NavLink to="/playlists" style={({ isActive }) => linkStyle(isActive)}>
          <ListIcon size={20} /> リスト
        </NavLink>
        <NavLink to="/manager" style={({ isActive }) => linkStyle(isActive)}>
          <SettingsIcon size={20} /> 管理
        </NavLink>
      </div>

      {showPw && <PasswordModal onClose={() => setShowPw(false)} onSuccess={() => setShowAdd(true)} />}
      {showAdd && <AddSongModal onClose={() => setShowAdd(false)} />}
    </>
  );
}
