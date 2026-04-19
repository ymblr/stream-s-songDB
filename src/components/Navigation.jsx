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
  const [q, setQ] = useState('');

  const handleAddClick = () => {
    if (isAuthed) setShowAdd(true);
    else setShowPassword(true);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (q.trim()) { navigate(`/search?q=${encodeURIComponent(q.trim())}`); setQ(''); }
  };

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        height: 'var(--nav-h)',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 12px', gap: 8, zIndex: 200,
      }}>
        {/* Hamburger + Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Desktop only hamburger */}
          <button onClick={toggleSidebar} className="btn-icon"
            style={{ display: 'none' }}
            ref={el => { if (el) { el.style.display = window.innerWidth > 768 ? 'flex' : 'none'; } }}>
            <MenuIcon size={18} />
          </button>
          <DesktopHamburger toggleSidebar={toggleSidebar} />

          <span className="logo-text" onClick={() => navigate('/')}
            style={{ fontSize: 14, color: 'var(--text)', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}>
            Stream's <span style={{ color: 'var(--pink)' }}>Song DB</span>
          </span>
        </div>

        {/* Search bar - center */}
        <form onSubmit={handleSearch} style={{ flex: 1, maxWidth: 520, margin: '0 auto' }}>
          <div style={{ position: 'relative' }}>
            <SearchIcon size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="楽曲名・アーティスト名"
              style={{ paddingLeft: 34, paddingRight: 8, height: 36, fontSize: 14, borderRadius: 20 }}
            />
          </div>
        </form>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <button onClick={toggleTheme} className="btn-icon" title={theme === 'light' ? 'ダーク' : 'ライト'}>
            {theme === 'light' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
          </button>
          <button onClick={handleAddClick} className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '7px 12px', fontSize: 13 }}>
            <PlusIcon size={13} />
            <span style={{ display: 'none' }} className="nav-add-label">楽曲を追加</span>
          </button>
        </div>
      </nav>

      {/* CSS to show label on desktop */}
      <style>{`
        @media (min-width: 480px) { .nav-add-label { display: inline !important; } }
      `}</style>

      {showPassword && <PasswordModal onClose={() => setShowPassword(false)} onSuccess={() => setShowAdd(true)} />}
      {showAdd && <AddSongModal onClose={() => setShowAdd(false)} />}
    </>
  );
}

// Separate component to avoid hook-in-ref issues
function DesktopHamburger({ toggleSidebar }) {
  return (
    <>
      <button onClick={toggleSidebar} className="btn-icon desktop-only">
        <MenuIcon size={18} />
      </button>
      <style>{`
        .desktop-only { display: none !important; }
        @media (min-width: 769px) { .desktop-only { display: flex !important; } }
      `}</style>
    </>
  );
}
