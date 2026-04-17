import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSidebar } from '../contexts/SidebarContext';
import { SearchIcon, SunIcon, MoonIcon, PlusIcon, MenuIcon } from './Icons';
import AddSongModal from './AddSongModal';
import PasswordModal from './PasswordModal';

export default function Navigation() {
  const { isAuthed } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddClick = () => {
    if (isAuthed) setShowAdd(true);
    else setShowPassword(true);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 'var(--nav-h)',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 12, zIndex: 200,
      }}>
        {/* Left: hamburger + logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 180, flexShrink: 0 }}>
          <button onClick={toggleSidebar} className="btn-icon" title="サイドバー">
            <MenuIcon size={18} />
          </button>
          <span
            className="logo-text"
            onClick={() => navigate('/')}
            style={{ fontSize: 15, color: 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
          >
            Stream's <span style={{ color: 'var(--pink)' }}>Song DB</span>
          </span>
        </div>

        {/* Center: search bar */}
        <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 560, margin: '0 auto' }}>
          <div style={{ position: 'relative' }}>
            <SearchIcon size={15} style={{
              position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text3)', pointerEvents: 'none',
            }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="楽曲名・アーティスト名で検索"
              style={{
                paddingLeft: 38, paddingRight: 44,
                height: 38, fontSize: 14,
                borderRadius: 24,
                background: 'var(--card2)',
                border: '1px solid var(--border2)',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: 16 }}
              >✕</button>
            )}
          </div>
        </form>

        {/* Right: theme + add */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={toggleTheme} className="btn-icon" title={theme === 'light' ? 'ダーク' : 'ライト'}>
            {theme === 'light' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
          </button>
          <button onClick={handleAddClick} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 13 }}>
            <PlusIcon size={13} /> 楽曲を追加
          </button>
        </div>
      </nav>

      {showPassword && <PasswordModal onClose={() => setShowPassword(false)} onSuccess={() => setShowAdd(true)} />}
      {showAdd && <AddSongModal onClose={() => setShowAdd(false)} />}
    </>
  );
}
