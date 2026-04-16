import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import SongCard from '../components/SongCard';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [recentSongs, setRecentSongs] = useState([]);
  const [singSongs, setSingSongs] = useState([]);
  const [ukuSongs, setUkuSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const [recentSnap, singSnap, ukuSnap] = await Promise.all([
          getDocs(query(collection(db, 'songs'), orderBy('createdAt', 'desc'), limit(6))),
          getDocs(query(collection(db, 'songs'), where('streamType', '==', 'singing'), orderBy('createdAt', 'desc'), limit(8))),
          getDocs(query(collection(db, 'songs'), where('streamType', '==', 'ukulele'), orderBy('createdAt', 'desc'), limit(8))),
        ]);
        const toSong = (d) => ({ id: d.id, ...d.data() });
        setRecentSongs(recentSnap.docs.map(toSong));
        setSingSongs(singSnap.docs.map(toSong));
        setUkuSongs(ukuSnap.docs.map(toSong));
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    fetchSongs();
  }, []);

  const Section = ({ title, songs, type }) => (
    <section style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18,
          }}>{title}</h2>
          {type && <span className={type === 'singing' ? 'badge-singing' : 'badge-ukulele'}>
            {type === 'singing' ? '歌枠' : 'ウクレレ枠'}
          </span>}
        </div>
        <button
          onClick={() => navigate(`/search?type=${type || ''}`)}
          style={{ fontSize: 13, color: 'var(--text3)', textDecoration: 'none', transition: 'color 0.2s' }}
          onMouseEnter={e => (e.target.style.color = 'var(--pink)')}
          onMouseLeave={e => (e.target.style.color = 'var(--text3)')}
        >
          すべて表示 →
        </button>
      </div>
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{
              background: 'var(--card)', borderRadius: 'var(--radius)',
              aspectRatio: '1.2',
              animation: 'pulse 1.5s infinite',
            }} />
          ))}
        </div>
      ) : songs.length === 0 ? (
        <p style={{ color: 'var(--text3)', fontSize: 14 }}>まだ楽曲がありません</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {songs.map((song, i) => (
            <SongCard key={song.id} song={song} playlist={songs} index={i} />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div style={{ padding: '88px 28px 120px' }}>
      {/* Hero */}
      <div style={{ marginBottom: 48 }}>
        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 'clamp(32px, 5vw, 52px)',
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: 12,
          background: `linear-gradient(135deg, var(--text) 0%, var(--pink) 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          うたアーカイブ
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 15, maxWidth: 460 }}>
          歌枠・ウクレレ配信から切り出した楽曲をいつでもどこでも。
        </p>
      </div>

      {/* Quick stats */}
      {!loading && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 40, flexWrap: 'wrap' }}>
          {[
            { label: '歌枠', count: singSongs.length, color: 'var(--pink)', bg: 'var(--pink-dim)' },
            { label: 'ウクレレ枠', count: ukuSongs.length, color: '#9d9bf0', bg: 'rgba(45,44,97,0.3)' },
          ].map(({ label, count, color, bg }) => (
            <div key={label} style={{
              background: bg,
              border: `1px solid ${color}30`,
              borderRadius: 12,
              padding: '14px 24px',
              minWidth: 120,
            }}>
              <p style={{ fontSize: 28, fontFamily: 'Syne, sans-serif', fontWeight: 800, color }}>{count}+</p>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{label}の楽曲</p>
            </div>
          ))}
        </div>
      )}

      <Section title="最近追加された楽曲" songs={recentSongs} />
      <Section title="歌枠" songs={singSongs} type="singing" />
      <Section title="ウクレレ枠" songs={ukuSongs} type="ukulele" />
    </div>
  );
}
