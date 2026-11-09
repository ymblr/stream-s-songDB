import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useSongCatalog, refreshSongCatalog } from '../hooks/useSongCatalog';
import {
  extractVideoId,
  fetchVideoInfo,
  getThumbnailUrl,
  secondsToTimestamp,
} from '../utils/youtube';
import {
  createSongRow,
  normalizeTags,
  parseTimestamp,
  validateSongRow,
} from '../utils/songForm';
import { XIcon, PlusIcon, TrashIcon, MusicIcon } from './Icons';
import TagInput from './TagInput';
import SongVolumePreview from './SongVolumePreview';
import { getSongVolume } from '../utils/volume';
import { usePlayer } from '../contexts/PlayerContext';

const DRAFT_KEY = 'uta_add_song_draft';
function initialForm(song) {
  if (song)
    return {
      url: song.streamUrl || `https://www.youtube.com/watch?v=${song.videoId}`,
      artist: song.artist || '',
      streamType: song.streamType || 'singing',
      memo: '',
      rows: [
        {
          id: song.id,
          name: song.name || '',
          startTime: secondsToTimestamp(song.startTime),
          endTime: secondsToTimestamp(song.endTime),
          tags: song.tags || [],
          tagInput: '',
          volumePercent: getSongVolume(song),
        },
      ],
    };
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY));
    if (draft && Array.isArray(draft.rows) && draft.rows.length)
      return {
        ...draft,
        rows: draft.rows.map((r) => ({
          ...r,
          tags: r.tags || [],
          tagInput: r.tagInput || '',
          volumePercent: getSongVolume(r),
        })),
      };
  } catch {}
  return {
    url: '',
    artist: '',
    streamType: 'singing',
    memo: '',
    rows: [createSongRow()],
  };
}

export default function SongEditor({ song, onClose, onSave }) {
  const player = usePlayer();
  const editing = Boolean(song);
  const [form, setForm] = useState(() => initialForm(song));
  const original = useRef(JSON.stringify(form));
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(0);
  const [confirmAction, setConfirmAction] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const { songs } = useSongCatalog();
  const artists = useMemo(
    () => [...new Set(songs.map((s) => s.artist).filter(Boolean))].sort(),
    [songs]
  );
  const videoId = extractVideoId(form.url);
  const errors = form.rows.map(validateSongRow);
  const change = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
    setConfirmAction('');
  };
  const changeRow = (id, patch) =>
    setForm((prev) => ({
      ...prev,
      rows: prev.rows.map((row) =>
        row.id === id ? { ...row, ...patch } : row
      ),
    }));
  const close = () => {
    if (savingRef.current) return;
    if (editing && original.current !== JSON.stringify(form))
      setConfirmAction('discard');
    else onClose();
  };
  closeRef.current = close;

  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const el = dialogRef.current;
    el.querySelector('input')?.focus();
    const keydown = (e) => {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRef.current();
      }
      if (e.key !== 'Tab') return;
      const nodes = [
        ...el.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]'
        ),
      ].filter((n) => n.getClientRects().length);
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    el.addEventListener('keydown', keydown);
    return () => {
      el.removeEventListener('keydown', keydown);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    if (editing || success) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {}
  }, [form, editing, success]);

  useEffect(() => {
    let active = true;
    setVideoInfo(null);
    if (!videoId) {
      setLoadingVideo(false);
      return;
    }
    setLoadingVideo(true);
    fetchVideoInfo(videoId).then((info) => {
      if (active) {
        setVideoInfo({ ...info, videoId });
        setLoadingVideo(false);
      }
    });
    return () => {
      active = false;
    };
  }, [videoId]);

  const save = async (e) => {
    e.preventDefault();
    if (savingRef.current) return;
    setAttempted(true);
    if (!videoId || errors.some((row) => Object.keys(row).length)) {
      setError('入力内容を確認してください。保存はまだ行っていません。');
      requestAnimationFrame(() =>
        dialogRef.current.querySelector('[aria-invalid="true"]')?.focus()
      );
      return;
    }
    if (form.rows.length > 500) {
      setError('一度に保存できる楽曲は500曲までです。');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError('');
    setConfirmAction('');
    try {
      const payload = (row) => ({
        name: row.name.trim(),
        artist: form.artist.trim(),
        streamType: form.streamType,
        videoId,
        streamUrl: form.url.trim(),
        startTime: parseTimestamp(row.startTime),
        endTime: parseTimestamp(row.endTime),
        streamTitle:
          (videoInfo?.videoId === videoId ? videoInfo.title : '') ||
          (videoId === song?.videoId ? song.streamTitle || '' : ''),
        streamThumbnail: getThumbnailUrl(videoId),
        tags: normalizeTags([...row.tags, row.tagInput]),
        volumePercent: getSongVolume(row),
      });
      if (editing) {
        const updated = payload(form.rows[0]);
        await updateDoc(doc(db, 'songs', song.id), updated);
        player?.updateSongVolume?.(song.id, updated.volumePercent);
      } else {
        const batch = writeBatch(db);
        form.rows.forEach((row) =>
          batch.set(doc(collection(db, 'songs')), {
            ...payload(row),
            playCount: 0,
            createdAt: serverTimestamp(),
          })
        );
        await batch.commit();
        try {
          sessionStorage.removeItem(DRAFT_KEY);
        } catch {}
        setSuccess(form.rows.length);
      }
      refreshSongCatalog(true);
      onSave?.();
      if (editing) onClose();
    } catch {
      setError(
        '保存できませんでした。接続や編集権限を確認して再試行してください。入力内容は保持しています。'
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const remove = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await deleteDoc(doc(db, 'songs', song.id));
      refreshSongCatalog(true);
      onSave?.();
      onClose();
    } catch {
      setError('削除できませんでした。接続や編集権限を確認してください。');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div
      className="overlay editor-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <form
        ref={dialogRef}
        className="modal song-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="song-editor-title"
        onSubmit={save}
        noValidate
      >
        <header className="editor-header">
          <div>
            <p className="eyebrow">
              LIBRARY / {editing ? 'EDIT' : 'NEW RECORD'}
            </p>
            <h2 id="song-editor-title">
              {editing ? '楽曲を編集' : '楽曲を追加'}
            </h2>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={close}
            disabled={saving}
            aria-label="閉じる"
          >
            <XIcon size={20} />
          </button>
        </header>
        {success ? (
          <div className="editor-success" role="status">
            <MusicIcon size={32} />
            <h3>{success}曲をライブラリに追加しました</h3>
            <p>続けて同じ配信から楽曲を登録できます。</p>
            <div className="editor-success-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                閉じる
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setSuccess(0);
                  setAttempted(false);
                  change('rows', [createSongRow()]);
                }}
              >
                同じ配信から追加
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setSuccess(0);
                  setAttempted(false);
                  setForm((prev) => ({
                    ...prev,
                    url: '',
                    rows: [createSongRow()],
                    memo: '',
                  }));
                }}
              >
                別の配信を追加
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="editor-body">
              <fieldset disabled={saving}>
                <section className="editor-section">
                  <div className="section-heading">
                    <span className="section-number">01</span>
                    <h3>配信を指定</h3>
                    <span>全曲共通</span>
                  </div>
                  <label htmlFor="song-url">
                    YouTubeの配信URL <span className="required">必須</span>
                  </label>
                  <input
                    id="song-url"
                    type="url"
                    value={form.url}
                    onChange={(e) => change('url', e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=…"
                    aria-invalid={attempted && !videoId}
                    aria-describedby="song-url-hint"
                  />
                  <p
                    id="song-url-hint"
                    className={
                      attempted && !videoId ? 'field-error' : 'field-hint'
                    }
                  >
                    {attempted && !videoId
                      ? '有効なYouTubeのURLを入力してください'
                      : '通常の動画・ライブ配信・短縮URLに対応'}
                  </p>
                  {loadingVideo && (
                    <p className="field-hint" role="status">
                      配信情報を取得中…
                    </p>
                  )}
                  {videoInfo && (
                    <div className="source-preview">
                      <img src={videoInfo.thumbnail} alt="" />
                      <div>
                        <strong>{videoInfo.title}</strong>
                        <span>{videoInfo.author}</span>
                      </div>
                    </div>
                  )}
                  <div className="field-grid">
                    <div>
                      <label htmlFor="song-artist">アーティスト</label>
                      <input
                        id="song-artist"
                        value={form.artist}
                        onChange={(e) => change('artist', e.target.value)}
                        list="song-artists"
                        placeholder="アーティスト名"
                      />
                      <datalist id="song-artists">
                        {artists.map((a) => (
                          <option key={a} value={a} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label htmlFor="song-type">配信種別</label>
                      <select
                        id="song-type"
                        value={form.streamType}
                        onChange={(e) => change('streamType', e.target.value)}
                      >
                        <option value="singing">歌枠</option>
                        <option value="ukulele">弾き語り</option>
                      </select>
                    </div>
                  </div>
                </section>
                <section className="editor-section">
                  <div className="section-heading">
                    <span className="section-number">02</span>
                    <h3>楽曲と再生区間</h3>
                    <span>{form.rows.length}曲</span>
                  </div>
                  <p className="field-hint">
                    配信全体での開始・終了時刻を入力してください。例：12:34 ／
                    1:02:34
                  </p>
                  {form.rows.map((row, i) => (
                    <div className="song-form-row" key={row.id}>
                      <div className="song-row-heading">
                        <span>TRACK {String(i + 1).padStart(2, '0')}</span>
                        {!editing && form.rows.length > 1 && (
                          <button
                            type="button"
                            className="btn-icon-sq"
                            aria-label={`${i + 1}曲目を削除`}
                            onClick={() =>
                              change(
                                'rows',
                                form.rows.filter((r) => r.id !== row.id)
                              )
                            }
                          >
                            <XIcon size={16} />
                          </button>
                        )}
                      </div>
                      <div className="track-fields">
                        {['name', 'startTime', 'endTime'].map((key, j) => (
                          <div key={key}>
                            <label htmlFor={`${row.id}-${key}`}>
                              {['楽曲名', '開始', '終了'][j]}{' '}
                              <span className="required">必須</span>
                            </label>
                            <input
                              id={`${row.id}-${key}`}
                              value={row[key]}
                              placeholder={j ? '0:00' : '楽曲名'}
                              className={j ? 'time-input' : ''}
                              onChange={(e) =>
                                changeRow(row.id, { [key]: e.target.value })
                              }
                              aria-invalid={
                                attempted && Boolean(errors[i][key])
                              }
                              aria-describedby={
                                attempted && errors[i][key]
                                  ? `${row.id}-${key}-error`
                                  : undefined
                              }
                            />
                            {attempted && errors[i][key] && (
                              <p
                                id={`${row.id}-${key}-error`}
                                className="field-error"
                              >
                                {errors[i][key]}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      <label htmlFor={`${row.id}-tags`}>
                        検索用タグ{' '}
                        <span className="field-optional">
                          任意 · Enterまたはカンマで区切る
                        </span>
                      </label>
                      <TagInput
                        id={`${row.id}-tags`}
                        tags={row.tags}
                        text={row.tagInput}
                        onChange={(tags, tagInput) =>
                          changeRow(row.id, { tags, tagInput })
                        }
                      />
                      {parseTimestamp(row.endTime) >
                        parseTimestamp(row.startTime) &&
                        parseTimestamp(row.startTime) !== null && (
                          <p className="clip-duration">
                            再生時間{' '}
                            {secondsToTimestamp(
                              parseTimestamp(row.endTime) -
                                parseTimestamp(row.startTime)
                            )}
                          </p>
                        )}
                    </div>
                  ))}
                  {!editing && (
                    <button
                      type="button"
                      className="add-track-btn"
                      onClick={() =>
                        change('rows', [...form.rows, createSongRow()])
                      }
                    >
                      <PlusIcon size={16} />
                      もう1曲追加
                    </button>
                  )}
                </section>
                {editing && (
                  <SongVolumePreview
                    videoId={videoId}
                    startTime={parseTimestamp(form.rows[0].startTime)}
                    endTime={parseTimestamp(form.rows[0].endTime)}
                    volumePercent={form.rows[0].volumePercent}
                    onChange={(value) =>
                      changeRow(form.rows[0].id, { volumePercent: value })
                    }
                    disabled={saving || Boolean(confirmAction)}
                  />
                )}
                {!editing && (
                  <details className="editor-memo">
                    <summary>作業用メモ</summary>
                    <textarea
                      aria-label="作業用メモ"
                      value={form.memo}
                      onChange={(e) => change('memo', e.target.value)}
                      placeholder="タイムスタンプなどを一時的にメモ"
                      rows={4}
                    />
                  </details>
                )}
              </fieldset>
            </div>
            <footer className="editor-footer">
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              {confirmAction ? (
                <div className="editor-confirm" role="alert">
                  <p>
                    {confirmAction === 'delete'
                      ? `「${song.name}」を削除しますか？ この操作は取り消せません。`
                      : '保存していない変更を破棄しますか？'}
                  </p>
                  <div className="editor-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      disabled={saving}
                      onClick={() => setConfirmAction('')}
                    >
                      戻る
                    </button>
                    <button
                      type="button"
                      className="btn-danger"
                      disabled={saving}
                      onClick={confirmAction === 'delete' ? remove : onClose}
                    >
                      {saving
                        ? '処理中…'
                        : confirmAction === 'delete'
                          ? '楽曲を削除'
                          : '破棄して閉じる'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="editor-actions">
                  {editing ? (
                    <button
                      type="button"
                      className="btn-icon"
                      disabled={saving}
                      aria-label="楽曲を削除"
                      onClick={() => setConfirmAction('delete')}
                    >
                      <TrashIcon size={18} />
                    </button>
                  ) : (
                    <span className="draft-hint">下書きを自動保存</span>
                  )}
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={close}
                    disabled={saving}
                  >
                    {editing ? 'キャンセル' : '下書きで閉じる'}
                  </button>
                  <button
                    className="btn-primary"
                    type="submit"
                    disabled={saving}
                  >
                    {saving
                      ? '保存中…'
                      : editing
                        ? '変更を保存'
                        : `${form.rows.length}曲を保存`}
                  </button>
                </div>
              )}
            </footer>
          </>
        )}
      </form>
    </div>
  );
}
