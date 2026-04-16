import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const COLORS = [
  '#ffa7c5', '#f472b6', '#c084fc', '#818cf8',
  '#60a5fa', '#34d399', '#fbbf24', '#f87171',
  '#2d2c61', '#aa1331', '#0f766e', '#92400e',
];

export default function PlaylistModal({ onClose, onSave, playlist = null }) {
  const [name, setName] = useState(playlist?.name || '');
  const [color, setColor] = useState(playlist?.color || '#ffa7c5');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (playlist) {
        await updateDoc(doc(db, 'playlists', playlist.id), { name: name.trim(), color });
      } else {
        await addDoc(collection(db, 'playlists'), {
          name: name.trim(),
          color,
          songIds: [],
          createdAt: serverTimestamp(),
        });
      }
      onSave?.();
    } catch (e) {
      alert('保存に失敗しました: ' + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 400, padding: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700 }}>
            {playlist ? 'プレイリストを編集' : '新しいプレイリスト'}
          </h2>
          <button className="btn-icon" onClick={onClose} style={{ fontSize: 18 }}>✕</button>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            プレイリスト名
          </label>
          <input
            placeholder="プレイリスト名を入力"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
            カラー
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 32, height: 32,
                  borderRadius: '50%',
                  background: c,
                  border: color === c ? '3px solid var(--text)' : '3px solid transparent',
                  transition: 'all 0.15s',
                  transform: color === c ? 'scale(1.2)' : 'scale(1)',
                  outline: color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
        </div>

        {/* Preview */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          background: 'var(--card2)', borderRadius: 'var(--radius-sm)',
          padding: '14px', marginBottom: 24,
        }}>
          <div style={{
            width: 48, height: 48,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${color}, ${color}99)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
            boxShadow: `0 4px 12px ${color}40`,
            flexShrink: 0,
          }}>🎧</div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14 }}>{name || 'プレイリスト名'}</p>
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>0曲</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>キャンセル</button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            style={{ flex: 2, opacity: saving || !name.trim() ? 0.6 : 1 }}
          >
            {saving ? '保存中...' : (playlist ? '変更を保存' : '作成する')}
          </button>
        </div>
      </div>
    </div>
  );
}
