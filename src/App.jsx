import React, { useEffect } from 'react';
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

// Inner layout that has access to SidebarContext
function AppLayout() {
  const { sidebarOpen } = useSidebar();

  return (
    <div className="app-layout">
      <Navigation />
      <Sidebar />
      <main
        className={`main-content${sidebarOpen ? '' : ' sidebar-collapsed'}`}
      >
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
    </div>
  );
}

export default function App() {
  useEffect(() => {
    // Suppress automatic prompts; manual browser installation remains available.
    const suppressInstallPrompt = (event) => event.preventDefault();
    window.addEventListener('beforeinstallprompt', suppressInstallPrompt);
    return () =>
      window.removeEventListener('beforeinstallprompt', suppressInstallPrompt);
  }, []);
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
