import React, { useEffect, useState } from 'react';
import { getThumbnailUrl, secondsToTimestamp } from '../utils/youtube';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { PlayIcon, MicIcon, MusicIcon, EditIcon, PlusIcon } from './Icons';
import EditSongModal from './EditSongModal';
import PasswordModal from './PasswordModal';
import MarqueeText from './MarqueeText';

export default function SongCard({
  song,
  playlist = [],
  index = 0,
  compact = false,
  onUpdate,
}) {
  const { playSong, currentSong, isPlaying, addToQueue } = usePlayer();
  const { isAuthed } = useAuth();
  const [showEdit, setShowEdit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [queued, setQueued] = useState(false);
  const active = currentSong?.id === song.id;
  const duration = Math.max(0, (song.endTime || 0) - (song.startTime || 0));
  useEffect(() => {
    if (!queued) return;
    const timer = setTimeout(() => setQueued(false), 1600);
    return () => clearTimeout(timer);
  }, [queued]);
  const play = () =>
    playSong(
      song,
      playlist.length ? playlist : [song],
      playlist.length ? index : 0
    );
  return (
    <>
      <article
        className={`song-card ${compact ? 'song-card-compact' : ''} ${active ? 'is-active' : ''}`}
      >
        <button
          className="song-artwork"
          onClick={play}
          aria-label={`${song.name}を再生`}
        >
          <img src={getThumbnailUrl(song.videoId)} alt="" loading="lazy" />
          <span className="artwork-play">
            <PlayIcon size={18} />
          </span>
          {!compact && duration > 0 && (
            <span className="artwork-duration">
              {secondsToTimestamp(duration)}
            </span>
          )}
        </button>
        <div className="song-info">
          <button className="song-title" onClick={play}>
            <MarqueeText text={song.name} active={active && isPlaying} />
          </button>
          <p>{song.artist || 'アーティスト未設定'}</p>
          {!compact && (
            <span
              className={
                song.streamType === 'singing'
                  ? 'badge-singing'
                  : 'badge-ukulele'
              }
            >
              {song.streamType === 'singing' ? (
                <>
                  <MicIcon size={11} />
                  歌枠
                </>
              ) : (
                <>
                  <MusicIcon size={11} />
                  弾き語り
                </>
              )}
            </span>
          )}
        </div>
        {compact && (
          <>
            <span className="row-duration">
              {duration ? secondsToTimestamp(duration) : '—'}
            </span>
            <span className="row-type">
              {song.streamType === 'singing' ? '歌枠' : '弾き語り'}
            </span>
          </>
        )}
        <div className="song-actions">
          {active && (
            <span
              className="playing-indicator"
              aria-label={isPlaying ? '再生中' : '一時停止中'}
            >
              {isPlaying ? '再生中' : '停止中'}
            </span>
          )}
          <button
            className="btn-icon-sq"
            title={queued ? '追加しました' : '次に再生に追加'}
            aria-label={`${song.name}を次に再生に追加`}
            onClick={() => {
              addToQueue(song);
              setQueued(true);
            }}
          >
            {queued ? '✓' : <PlusIcon size={16} />}
          </button>
          <button
            className="btn-icon-sq"
            title="楽曲を編集"
            aria-label={`${song.name}を編集`}
            onClick={() =>
              isAuthed ? setShowEdit(true) : setShowPassword(true)
            }
          >
            <EditIcon size={15} />
          </button>
        </div>
      </article>
      {showPassword && (
        <PasswordModal
          onClose={() => setShowPassword(false)}
          onSuccess={() => setShowEdit(true)}
        />
      )}
      {showEdit && (
        <EditSongModal
          song={song}
          onClose={() => setShowEdit(false)}
          onSave={onUpdate}
        />
      )}
    </>
  );
}
