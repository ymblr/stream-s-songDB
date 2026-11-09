import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSongCatalog } from '../hooks/useSongCatalog';
import { usePlayer } from '../contexts/PlayerContext';
import SongCard from '../components/SongCard';
import { MicIcon, MusicIcon } from '../components/Icons';

function Section({ number, title, subtitle, songs, compact = false, to }) {
  return (
    <section className="library-section">
      <div className="library-section-heading">
        <div>
          <p className="eyebrow">
            {number} / {subtitle}
          </p>
          <h2>{title}</h2>
        </div>
        {to && (
          <Link to={to}>
            すべて見る <span>↗</span>
          </Link>
        )}
      </div>
      {songs.length ? (
        <div className={compact ? 'song-list' : 'song-grid'}>
          {songs.map((song, index) => (
            <SongCard
              key={song.id}
              song={song}
              index={index}
              compact={compact}
            />
          ))}
        </div>
      ) : (
        <p className="empty-note">楽曲を追加すると、ここに表示されます。</p>
      )}
    </section>
  );
}

export default function Home() {
  const { songs, loading, error, refresh } = useSongCatalog();
  const { history } = usePlayer();
  const popular = useMemo(
    () =>
      [...songs]
        .filter((s) => s.playCount > 0)
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, 5),
    [songs]
  );
  const recommended = useMemo(() => {
    const pool = songs.filter((s) => !popular.some((p) => p.id === s.id));
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 5);
  }, [songs, popular]);
  const singing = songs.filter((s) => s.streamType === 'singing');
  const acoustic = songs.filter((s) => s.streamType === 'ukulele');
  return (
    <div className="page library-home">
      <header className="library-hero">
        <div>
          <p className="eyebrow">STREAM'S SONG DB / PERSONAL ARCHIVE</p>
          <h1>
            好きな一曲を、
            <br />
            いつもの場所で。
          </h1>
          <p className="hero-description">
            歌枠と弾き語り。配信で出会った音楽を、あなたのライブラリに。
          </p>
          <Link className="text-link" to="/search">
            ライブラリを探す <span>↗</span>
          </Link>
        </div>
        <div className="archive-count">
          <span className="eyebrow">IN THE LIBRARY</span>
          <strong>
            {loading ? '—' : String(songs.length).padStart(3, '0')}
          </strong>
          <span>TRACKS & COUNTING</span>
          <div>
            <Link to="/search?type=singing">
              <MicIcon size={14} />
              歌枠 <b>{singing.length}</b>
            </Link>
            <Link to="/search?type=ukulele">
              <MusicIcon size={14} />
              弾き語り <b>{acoustic.length}</b>
            </Link>
          </div>
        </div>
      </header>
      {error ? (
        <div className="form-error" role="alert">
          {error}{' '}
          <button className="text-link" onClick={refresh}>
            再試行
          </button>
        </div>
      ) : loading && !songs.length ? (
        <div className="skeleton-grid" aria-label="楽曲を読み込み中">
          {[0, 1, 2, 3, 4].map((n) => (
            <div key={n} />
          ))}
        </div>
      ) : (
        <>
          {history.length > 0 && (
            <Section
              number="00"
              title="最近聴いた曲"
              subtitle="RECENTLY PLAYED"
              songs={history.slice(0, 4).map((h) => h.song)}
              compact
            />
          )}
          <Section
            number="01"
            title="ライブラリの新着"
            subtitle="RECENTLY ADDED"
            songs={songs.slice(0, 5)}
            to="/search"
          />
          <div className="library-columns">
            <Section
              number="02"
              title="よく聴く曲"
              subtitle="ON REPEAT"
              songs={popular}
              compact
            />
            <Section
              number="03"
              title="今日はこの曲から"
              subtitle="PICK SOMETHING"
              songs={recommended}
              compact
            />
          </div>
          <Section
            number="04"
            title="歌枠"
            subtitle="SINGING"
            songs={singing.slice(0, 5)}
            to="/search?type=singing"
          />
          <Section
            number="05"
            title="弾き語り"
            subtitle="ACOUSTIC"
            songs={acoustic.slice(0, 5)}
            to="/search?type=ukulele"
          />
        </>
      )}
    </div>
  );
}
