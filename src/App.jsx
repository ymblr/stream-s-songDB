import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import Navigation from './components/Navigation';
import MiniPlayer from './components/MiniPlayer';
import Home from './pages/Home';
import Search from './pages/Search';
import Playlists from './pages/Playlists';
import PlaylistDetail from './pages/PlaylistDetail';

// GitHub Pages SPA routing fix
const basename = import.meta.env.BASE_URL;

export default function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <BrowserRouter basename={basename}>
          <Navigation />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/playlists" element={<Playlists />} />
            <Route path="/playlist/:id" element={<PlaylistDetail />} />
          </Routes>
          <MiniPlayer />
        </BrowserRouter>
      </PlayerProvider>
    </AuthProvider>
  );
}
