import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AddSongModal from './AddSongModal';
import PasswordModal from './PasswordModal';

export default function Navigation() {
  const { isAuthed } = useAuth();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleAddClick = () => {
    if (isAuthed) {
      setShowAdd(true);
    } else {
      setShowPassword(true);
    }
  };

  const navStyle = {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    height: 60,
    background: 'rgba(15,14,23,0.85)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    gap: 8,
    zIndex: 100,
  };

  const linkStyle = (isActive) => ({
    color: isActive ? 'var(--pink)' : 'var(--text2)',
    textDecoration: 'none',
    padding: '6px 14px',
    borderRadius: 20,
    fontSize: 14,
    fontWeight: isActive ? 600 : 400,
    background: isActive ? 'var(--pink-dim)' : 'transparent',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  });

  return (
    <>
      <nav style={navStyle}>
        {/* Logo */}
        <div
          onClick={() => navigate('/')}
          style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: 18,
            color: 'var(--pink)',
            letterSpacing: '-0.02em',
            cursor: 'pointer',
            marginRight: 16,
            whiteSpace: 'nowrap',
          }}
        >
          うた<span style={{ color: 'var(--text3)', fontWeight: 400 }}>archive</span>
        </div>

        {/* Nav links */}
        <NavLink to="/" end style={({ isActive }) => linkStyle(isActive)}>ホーム</NavLink>
        <NavLink to="/search" style={({ isActive }) => linkStyle(isActive)}>検索</NavLink>
        <NavLink to="/playlists" style={({ isActive }) => linkStyle(isActive)}>プレイリスト</NavLink>

        <div style={{ flex: 1 }} />

        {/* Add song button */}
        <button
          onClick={handleAddClick}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: '8px 16px' }}
        >
          <span style={{ fontSize: 16, fontWeight: 300 }}>＋</span>
          楽曲を追加
        </button>
      </nav>

      {showPassword && (
        <PasswordModal
          onClose={() => setShowPassword(false)}
          onSuccess={() => setShowAdd(true)}
        />
      )}
      {showAdd && <AddSongModal onClose={() => setShowAdd(false)} />}
    </>
  );
}
