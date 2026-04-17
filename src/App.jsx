import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SidebarProvider } from './contexts/SidebarContext';
import Navigation from './components/Navigation';
import Sidebar from './components/Sidebar';
import MiniPlayer from './components/MiniPlayer';
import Home from './pages/Home';
import Search from './pages/Search';
import Playlists from './pages/Playlists';
import PlaylistDetail from './pages/PlaylistDetail';

const basename = import.meta.env.BASE_URL;

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PlayerProvider>
          <SidebarProvider>
            <BrowserRouter basename={basename}>
              <div className="app-layout">
                <Navigation />
                <div className="app-body">
                  <Sidebar />
                  <main className="main-content">
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/search" element={<Search />} />
                      <Route path="/playlists" element={<Playlists />} />
                      <Route path="/playlist/:id" element={<PlaylistDetail />} />
                    </Routes>
                  </main>
                </div>
              </div>
              <MiniPlayer />
            </BrowserRouter>
          </SidebarProvider>
        </PlayerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
