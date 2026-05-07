import React, { useEffect, useState, useCallback } from 'react';
import { collection, query, orderBy, limit, getDocs, where, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import SongCard from '../components/SongCard';
import { useNavigate } from 'react-router-dom';
import { MicIcon, MusicIcon, StarIcon, SparkleIcon } from '../components/Icons';

// Fisher-Yates shuffle — returns new shuffled array
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Recommend songs:
// - Mix of both types
// - Not already in popular list
// - Pick some mid-playcount + some new ones
function pickRecommended(allSongs, popularIds, count = 6) {
  const pool = allSongs.filter(s => !popularIds.has(s.id));
  if (!pool.length) return [];
  // Score: balance between playCount and recency
  const now = Date.now() / 1000;
  const scored = pool.map(s => {
    const age = now - (s.createdAt?.seconds || now); // seconds old
    const play = s.playCount || 0;
    // Recency bonus decays over 30 days
    const recency = Math.max(0, 1 - age / (86400 * 30));
    // Combined score: some popularity + some freshness + randomness
    return { song: s, score: play * 0.4 + recency * 40 + Math.random() * 20 };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map(s => s.song);
}

export default function Home() {
  const [popular, setPopular] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [recent, setRecent] = useState([]);
  const [singSongs, setSingSongs] = useState([]);
  const [ukuSongs, setUkuSongs] = useState([]);
  const [singCount, setSingCount] = useState(0);
  const [ukuCount, setUkuCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        // Fetch more songs for random selection
        const [popSnap, recentSnap, singSnap, ukuSnap, scSnap, ucSnap] = await Promise.all([
          getDocs(query(collection(db, 'songs'), orderBy('playCount', 'desc'), limit(6))),
          getDocs(query(collection(db, 'songs'), orderBy('createdAt', 'desc'), limit(6))),
          // Fetch more than needed so we can shuffle
          getDocs(query(collection(db, 'songs'), where('streamType', '==', 'singing'), orderBy('createdAt', 'desc'), limit(30))),
          getDocs(query(collection(db, 'songs'), where('streamType', '==', 'ukulele'), orderBy('createdAt', 'desc'), limit(30))),
          getCountFromServer(query(collection(db, 'songs'), where('streamType', '==', 'singing'))),
          getCountFromServer(query(collection(db, 'songs'), where('streamType', '==', 'ukulele'))),
        ]);

        const toSong = d => ({ id: d.id, ...d.data() });
        const popSongs = popSnap.docs.map(toSong).filter(s => (s.playCount || 0) > 0);
        const popularIds = new Set(popSongs.map(s => s.id));
        const allSingSongs = singSnap.docs.map(toSong);
        const allUkuSongs = ukuSnap.docs.map(toSong);
        const allSongs = [...allSingSongs, ...allUkuSongs];

        setPopular(popSongs);
        setRecent(recentSnap.docs.map(toSong));
        // ✅ Random order — show 6 from shuffled pool
        setSingSongs(shuffle(allSingSongs).slice(0, 6));
        setUkuSongs(shuffle(allUkuSongs).slice(0, 6));
        setSingCount(scSnap.data().count);
        setUkuCount(ucSnap.data().count);
        // Recommended
        setRecommended(pickRecommended(allSongs, popularIds, 6));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetch();
  }, []);

  const Section = ({ title, icon, songs, type, badge, emptyMsg }) => (
    <section style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon}
          <h2 style={{ fontFamily: 'var(--font-logo)', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>{title}</h2>
          {badge}
        </div>
        {type !== undefined && (
          <button
            onClick={() => navigate(`/search?type=${type || ''}`)}
            style={{ fontSize: 12, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
            onMouseEnter={e => e.target.style.color = 'var(--pink)'}
            onMouseLeave={e => e.target.style.color = 'var(--text3)'}
          >
            すべて表示 →
          </button>
        )}
      </div>
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ background: 'var(--card)', borderRadius: 'var(--radius)', aspectRatio: '1.2', animation: 'pulse 1.5s infinite' }} />
          ))}
        </div>
      ) : songs.length === 0 ? (
        <p style={{ color: 'var(--text3)', fontSize: 13 }}>{emptyMsg || 'まだ楽曲がありません'}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
          {songs.map((song, i) => (
            <SongCard key={song.id} song={song} playlist={[song]} index={0} />
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Hero */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-logo)', fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6, lineHeight: 1.1 }}>
          Stream's <span style={{ color: 'var(--pink)' }}>Song DB</span>
        </h1>
        <p style={{ color: 'var(--text3)', fontSize: 13 }}>歌枠・ウクレレ配信から切り出した楽曲をいつでもどこでも</p>
      </div>

      {/* Stats */}
      {!loading && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 36, flexWrap: 'wrap' }}>
          {[
            { label: '歌枠', count: singCount, color: 'var(--pink)', bg: 'var(--pink-dim)', Icon: MicIcon, type: 'singing' },
            { label: 'ウクレレ枠', count: ukuCount, color: 'var(--badge-uku-color)', bg: 'var(--badge-uku-bg)', Icon: MusicIcon, type: 'ukulele' },
          ].map(({ label, count, color, bg, Icon, type }) => (
            <button key={label} onClick={() => navigate(`/search?type=${type}`)}
              style={{ background: bg, border: `1px solid ${color}28`, borderRadius: 12, padding: '14px 20px', minWidth: 120, textAlign: 'left', cursor: 'pointer', transition: 'transform 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color }}>
                <Icon size={13} /><span style={{ fontSize: 11, fontWeight: 600 }}>{label}</span>
              </div>
              <p className="stat-num" style={{ color }}>{count}</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>曲</p>
            </button>
          ))}
        </div>
      )}

      {popular.length > 0 && (
        <Section
          title="人気の楽曲"
          icon={<StarIcon size={16} style={{ color: '#f59e0b' }} />}
          songs={popular}
          badge={<span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '2px 7px' }}>再生数順</span>}
        />
      )}

      {recommended.length > 0 && (
        <Section
          title="おすすめ"
          icon={<SparkleIcon size={16} style={{ color: '#8b5cf6' }} />}
          songs={recommended}
          badge={<span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '2px 7px' }}>今日のピック</span>}
          emptyMsg="楽曲が増えるとおすすめが表示されます"
        />
      )}

      <Section title="最近追加された楽曲" songs={recent} type="" />

      <Section
        title="歌枠"
        songs={singSongs}
        type="singing"
        badge={<span className="badge-singing"><MicIcon size={10} />歌枠</span>}
      />
      <Section
        title="ウクレレ枠"
        songs={ukuSongs}
        type="ukulele"
        badge={<span className="badge-ukulele"><MusicIcon size={10} />ウクレレ枠</span>}
      />
    </div>
  );
}
