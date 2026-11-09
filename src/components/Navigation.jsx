import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  return (
    <>
      <nav className="top-nav" aria-label="メインナビゲーション">
        <div className="brand-area">
          <button
            className="btn-icon hamburger-btn"
            onClick={toggleSidebar}
            aria-label="サイドバーを切り替え"
          >
            <MenuIcon size={19} />
          </button>
          <Link to="/" className="brand">
            <span className="brand-mark">
              S<span>●</span>
            </span>
            <span>
              Stream's<span>SONG DB</span>
            </span>
          </Link>
        </div>
        <form
          className="nav-search"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(`/search?q=${encodeURIComponent(q.trim())}`);
            setQ('');
          }}
        >
          <SearchIcon size={16} />
          <input
            aria-label="ライブラリを検索"
            placeholder="ライブラリを検索"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>
        <div className="nav-actions">
          <button
            className="btn-icon"
            onClick={toggleTheme}
            aria-label={
              theme === 'light'
                ? 'ダークモードに切り替え'
                : 'ライトモードに切り替え'
            }
            title={theme === 'light' ? 'ダークモード' : 'ライトモード'}
          >
            {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
          </button>
          <button
            className="btn-primary"
            onClick={() =>
              isAuthed ? setShowAdd(true) : setShowPassword(true)
            }
            aria-label="楽曲を追加"
          >
            <PlusIcon size={16} />
            <span className="nav-label-text">楽曲を追加</span>
          </button>
        </div>
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
