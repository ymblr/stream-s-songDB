import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function PasswordModal({ onClose, onSuccess }) {
  const { authenticate } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (authenticate(password)) {
      onSuccess?.();
      onClose?.();
    } else {
      setError('パスワードが違います');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div
        className="modal"
        style={{
          width: 360,
          padding: 32,
          textAlign: 'center',
          animation: shake ? 'shakeX 0.4s ease' : undefined,
        }}
      >
        <div style={{
          width: 48, height: 48,
          background: 'var(--pink-dim)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: 22,
        }}>🔐</div>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          認証が必要です
        </h2>
        <p style={{ color: 'var(--text2)', marginBottom: 24, fontSize: 13 }}>
          編集・追加にはパスワードが必要です
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: 18, marginBottom: 12 }}
            autoFocus
          />
          {error && (
            <p style={{ color: '#ff6b87', fontSize: 12, marginBottom: 12 }}>{error}</p>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>
              確認
            </button>
          </div>
        </form>
      </div>
      <style>{`
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
