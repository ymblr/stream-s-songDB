import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { SearchIcon, SunIcon, MoonIcon, PlusIcon, XIcon } from './Icons';
import AddSongModal from './AddSongModal';
import PasswordModal from './PasswordModal';

export default function Navigation() {
  const { isAuthed } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  const handleAddClick = () => {
    if (isAuthed) setShowAdd(true);
    else setShowPassword(true);
  };

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      closeSearch();
    }
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') closeSearch();
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

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
      <nav style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: 60,
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 6,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div
          onClick={() => navigate('/')}
          style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: 15,
            color: 'var(--pink)',
            letterSpacing: '-0.01em',
            cursor: 'pointer',
            marginRight: 10,
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Stream's <span style={{ color: 'var(--text3)', fontWeight: 400 }}>Song DB</span>
        </div>

        {/* Nav links */}
        <NavLink to="/" end style={({ isActive }) => linkStyle(isActive)}>ホーム</NavLink>
        <NavLink to="/playlists" style={({ isActive }) => linkStyle(isActive)}>プレイリスト</NavLink>

        <div style={{ flex: 1 }} />

        {/* Search bar */}
        {searchOpen ? (
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 400 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <SearchIcon size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="楽曲名・アーティスト名"
                style={{ paddingLeft: 34, height: 36, fontSize: 13, borderRadius: 20 }}
              />
            </div>
            <button type="button" className="btn-icon" onClick={closeSearch} style={{ width: 28, height: 28, flexShrink: 0 }}>
              <XIcon size={15} />
            </button>
          </form>
        ) : (
          <button
            onClick={openSearch}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '6px 14px',
              borderRadius: 20,
              background: 'var(--card2)',
              border: '1px solid var(--border)',
              color: 'var(--text3)',
              fontSize: 13,
              transition: 'all 0.2s',
            }}
          >
            <SearchIcon size={14} />
            <span>検索</span>
            <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 4 }}>⌘K</span>
          </button>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="btn-icon"
          title={theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え'}
        >
          {theme === 'light' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
        </button>

        {/* Add song button */}
        <button
          onClick={handleAddClick}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, padding: '7px 14px' }}
        >
          <PlusIcon size={14} />
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
