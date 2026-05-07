import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import Navigation from './components/Navigation';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import MiniPlayer from './components/MiniPlayer';
import Home from './pages/Home';
import Search from './pages/Search';
import Playlists from './pages/Playlists';
import PlaylistDetail from './pages/PlaylistDetail';
import SongManager from './pages/SongManager';

const basename = import.meta.env.BASE_URL;

// PWA install banner
function InstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const h = (e) => { e.preventDefault(); setPrompt(e); setShow(true); };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: 'var(--card)', border: '1px solid var(--border2)', borderRadius: 12, padding: '12px 16px', boxShadow: 'var(--shadow-lg)', zIndex: 400, display: 'flex', alignItems: 'center', gap: 12, maxWidth: 320, width: 'calc(100vw - 28px)', animation: 'slideUp 0.22s ease' }}>
      <div style={{ fontSize: 24 }}>♪</div>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>アプリとして追加</p>
        <p style={{ fontSize: 11, color: 'var(--text3)' }}>ホーム画面に追加するとより便利に使えます</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
        <button className="btn-primary" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => { prompt?.prompt(); setShow(false); }}>追加</button>
        <button onClick={() => setShow(false)} style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>後で</button>
      </div>
    </div>
  );
}

// Inner layout that has access to SidebarContext
function AppLayout() {
  const { sidebarOpen } = useSidebar();

  return (
    <div className="app-layout">
      <Navigation />
      <Sidebar />
      <main className={`main-content${sidebarOpen ? '' : ' sidebar-collapsed'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/playlist/:id" element={<PlaylistDetail />} />
          <Route path="/manager" element={<SongManager />} />
        </Routes>
      </main>
      <MiniPlayer />
      <BottomNav />
      <InstallBanner />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PlayerProvider>
          <SidebarProvider>
            <BrowserRouter basename={basename}>
              <AppLayout />
            </BrowserRouter>
          </SidebarProvider>
        </PlayerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
