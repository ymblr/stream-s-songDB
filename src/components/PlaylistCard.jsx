import React from 'react';
import { Link } from 'react-router-dom';
import { ListIcon } from './Icons';

export default function PlaylistCard({ playlist }) {
  return (
    <Link
      to={`/playlist/${playlist.id}`}
      className="playlist-card"
      style={{ '--playlist-color': playlist.color || 'var(--pink)' }}
    >
      <div className="playlist-cover">
        <ListIcon size={36} />
        <span className="eyebrow">PERSONAL SELECTION</span>
      </div>
      <div className="playlist-card-info">
        <h2>{playlist.name}</h2>
        <p>
          {playlist.songIds?.length || 0}曲 <span>↗</span>
        </p>
      </div>
    </Link>
  );
}
