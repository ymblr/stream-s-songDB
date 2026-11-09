import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../contexts/AuthContext';
import { usePlaylistCatalog } from '../hooks/usePlaylistCatalog';
import PasswordModal from '../components/PasswordModal';
import PlaylistModal from '../components/PlaylistModal';
import PlaylistCard from '../components/PlaylistCard';
import { GripIcon, PlusIcon, ListIcon } from '../components/Icons';

function SortablePlaylist({ playlist, canSort }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: playlist.id, disabled: !canSort });
  return (
    <div
      ref={setNodeRef}
      className={`playlist-sortable${isDragging ? ' is-dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <PlaylistCard playlist={playlist} />
      {canSort && (
        <button
          type="button"
          className="playlist-drag-handle btn-icon"
          {...attributes}
          {...listeners}
          aria-label={`${playlist.name}の表示順を変更`}
          title="ドラッグで並べ替え"
        >
          <GripIcon size={19} />
        </button>
      )}
    </div>
  );
}

export default function Playlists() {
  const { isAuthed } = useAuth();
  const { playlists, loading, saving, error, notice, refresh, saveOrder } =
    usePlaylistCatalog();
  const [showCreate, setShowCreate] = useState(false);
  const [passwordAction, setPasswordAction] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const handleDragEnd = ({ active, over }) => {
    if (!isAuthed || saving || loading || !over || active.id === over.id)
      return;
    const from = playlists.findIndex((playlist) => playlist.id === active.id);
    const to = playlists.findIndex((playlist) => playlist.id === over.id);
    if (from !== -1 && to !== -1) saveOrder(arrayMove(playlists, from, to));
  };
  return (
    <div className="page">
      <header className="page-heading playlist-page-heading">
        <div>
          <p className="eyebrow">YOUR SELECTIONS</p>
          <h1>プレイリスト</h1>
          <p>{playlists.length}件のプレイリスト</p>
        </div>
        <div className="playlist-page-actions">
          {!isAuthed && playlists.length > 1 && (
            <button
              className="btn-secondary"
              onClick={() => setPasswordAction('sort')}
            >
              並べ替え
            </button>
          )}
          <button
            className="btn-primary"
            onClick={() =>
              isAuthed ? setShowCreate(true) : setPasswordAction('create')
            }
          >
            <PlusIcon size={15} />
            新規作成
          </button>
        </div>
      </header>
      {isAuthed && playlists.length > 1 && (
        <p className="playlist-sort-help">
          カード右上のハンドルをドラッグして並べ替え。変更は自動保存されます。キーボードではSpace
          → 矢印キー → Spaceで操作できます。
        </p>
      )}
      <p className="playlist-order-status" role="status">
        {saving ? '並び順を保存中…' : notice}
      </p>
      {error && (
        <div className="form-error" role="alert">
          {error}
          <button className="text-link" disabled={saving} onClick={refresh}>
            再読み込み
          </button>
        </div>
      )}
      {loading && !playlists.length ? (
        <p className="empty-note">プレイリストを読み込み中…</p>
      ) : !playlists.length ? (
        <div className="empty-state">
          <ListIcon size={32} />
          <h2>プレイリストがまだありません</h2>
          <p>「新規作成」からお気に入りの曲をまとめましょう。</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          accessibility={{
            screenReaderInstructions: {
              draggable:
                'Spaceキーで選択し、矢印キーで移動、Spaceキーで確定します。Escapeキーで取り消します。',
            },
          }}
        >
          <SortableContext
            items={playlists.map((playlist) => playlist.id)}
            strategy={rectSortingStrategy}
          >
            <div className="playlist-grid" aria-busy={saving}>
              {playlists.map((playlist) => (
                <SortablePlaylist
                  key={playlist.id}
                  playlist={playlist}
                  canSort={isAuthed && !saving && !loading}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {passwordAction && (
        <PasswordModal
          onClose={() => setPasswordAction(null)}
          onSuccess={() => {
            if (passwordAction === 'create') setShowCreate(true);
          }}
        />
      )}
      {showCreate && (
        <PlaylistModal
          onClose={() => setShowCreate(false)}
          onSave={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
