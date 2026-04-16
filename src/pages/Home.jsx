import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import SongCard from '../components/SongCard';
import { useNavigate } from 'react-router-dom';
import { MicIcon, MusicIcon } from '../components/Icons';

export default function Home() {
  const [recentSongs, setRecentSongs] = useState([]);
  const [singSongs, setSingSongs] = useState([]);
  const [ukuSongs, setUkuSongs] = useState([]);
  const [singCount, setSingCount] = useState(0);
  const [ukuCount, setUkuCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const [recentSnap, singSnap, ukuSnap, singCountSnap, ukuCountSnap] = await Promise.all([
          getDocs(query(collection(db, 'songs'), orderBy('createdAt', 'desc'), limit(6))),
          getDocs(query(collection(db, 'songs'), where('streamType', '==', 'singing'), orderBy('createdAt', 'desc'), limit(6))),
          getDocs(query(collection(db, 'songs'), where('streamType', '==', 'ukulele'), orderBy('createdAt', 'desc'), limit(6))),
          getCountFromServer(query(collection(db, 'songs'), where('streamType', '==', 'singing'))),
          getCountFromServer(query(collection(db, 'songs'), where('streamType', '==', 'ukulele'))),
        ]);
        const toSong = d => ({ id: d.id, ...d.data() });
        setRecentSongs(recentSnap.docs.map(toSong));
        setSingSongs(singSnap.docs.map(toSong));
        setUkuSongs(ukuSnap.docs.map(toSong));
        setSingCount(singCountSnap.data().count);
        setUkuCount(ukuCountSnap.data().count);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch();
  }, []);

  const Section = ({ title, songs, type }) => (
    <section style={{ marginBottom: 44 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 17 }}>{title}</h2>
          {type && (
            <span className={type === 'singing' ? 'badge-singing' : 'badge-ukulele'}>
              {type === 'singing' ? <><MicIcon size={10} /> 歌枠</> : <><MusicIcon size={10} /> ウクレレ枠</>}
            </span>
          )}
        </div>
        <button
          onClick={() => navigate(`/search?type=${type || ''}`)}
          style={{ fontSize: 12, color: 'var(--text3)', transition: 'color 0.2s', background: 'none', border: 'none', cursor: 'pointer' }}
          onMouseEnter={e => (e.target.style.color = 'var(--pink)')}
          onMouseLeave={e => (e.target.style.color = 'var(--text3)')}
        >
          すべて表示 →
        </button>
      </div>
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ background: 'var(--card)', borderRadius: 'var(--radius)', aspectRatio: '1.2', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : songs.length === 0 ? (
        <p style={{ color: 'var(--text3)', fontSize: 13 }}>まだ楽曲がありません</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
          {songs.map((song, i) => (
            // Single song play - pass empty playlist so it plays alone
            <SongCard key={song.id} song={song} playlist={[song]} index={0} />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div style={{ padding: '80px 28px 120px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: 'clamp(28px, 4vw, 44px)',
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: 10,
        }}>
          Stream's <span style={{ color: 'var(--pink)' }}>Song DB</span>
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: 14 }}>
          歌枠・ウクレレ配信から切り出した楽曲をいつでもどこでも。
        </p>
      </div>

      {/* Stats - cleaner design */}
      {!loading && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 40, flexWrap: 'wrap' }}>
          {[
            { label: '歌枠', count: singCount, color: 'var(--pink)', bg: 'var(--pink-dim)', Icon: MicIcon, type: 'singing' },
            { label: 'ウクレレ枠', count: ukuCount, color: 'var(--badge-uku-color)', bg: 'var(--badge-uku-bg)', Icon: MusicIcon, type: 'ukulele' },
          ].map(({ label, count, color, bg, Icon, type }) => (
            <button
              key={label}
              onClick={() => navigate(`/search?type=${type}`)}
              style={{
                background: bg,
                border: `1px solid ${color}30`,
                borderRadius: 14,
                padding: '16px 24px',
                minWidth: 140,
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, color }}>
                <Icon size={14} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
              </div>
              <p style={{ fontSize: 26, fontFamily: 'Syne, sans-serif', fontWeight: 800, color, lineHeight: 1 }}>{count}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>曲</p>
            </button>
          ))}
        </div>
      )}

      <Section title="最近追加された楽曲" songs={recentSongs} />
      <Section title="歌枠" songs={singSongs} type="singing" />
      <Section title="ウクレレ枠" songs={ukuSongs} type="ukulele" />
    </div>
  );
}
