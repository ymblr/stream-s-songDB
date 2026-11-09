import React from 'react';
import SongEditor from './SongEditor';

export default function AddSongModal({ onClose, onSave }) {
  return <SongEditor onClose={onClose} onSave={onSave} />;
}
