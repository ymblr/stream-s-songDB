import React from 'react';
import SongEditor from './SongEditor';

export default function EditSongModal({ song, onClose, onSave }) {
  return (
    <SongEditor key={song.id} song={song} onClose={onClose} onSave={onSave} />
  );
}
