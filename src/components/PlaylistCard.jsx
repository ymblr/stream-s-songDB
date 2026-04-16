import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#ffa7c5', '#9d9bf0', '#aa1331', '#2d2c61', '#6ee7b7', '#f59e0b', '#60a5fa', '#f472b6'];

export default function PlaylistCard({ playlist, onUpdate }) {
  const navigate = useNavigate();
  const color = playlist.color || '#ffa7c5';
  const songCount = playlist.songIds?.length || 0;

  return (
    <div
      onClick={() => navigate(`/playlist/${playlist.id}`)}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Color banner */}
      <div style={{
        height: 120,
        background: `linear-gradient(135deg, ${color}40 0%, ${color}20 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        borderBottom: `1px solid ${color}20`,
      }}>
        <div style={{
          width: 64, height: 64,
          borderRadius: 16,
          background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          boxShadow: `0 4px 20px ${color}40`,
        }}>
          🎧
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '16px' }}>
        <p style={{
          fontWeight: 700,
          fontSize: 15,
          fontFamily: 'Syne, sans-serif',
          marginBottom: 4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{playlist.name}</p>
        <p style={{ fontSize: 12, color: 'var(--text3)' }}>{songCount}曲</p>
      </div>
    </div>
  );
}
