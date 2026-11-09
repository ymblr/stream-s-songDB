import test from 'node:test';
import assert from 'node:assert/strict';
import { sortPlaylists, assignPlaylistOrder } from '../src/utils/playlists.js';

test('unranked playlists retain newest-first display', () => {
  const source = [
    { id: 'old', createdAt: { seconds: 1 } },
    { id: 'new', createdAt: { seconds: 2 } },
  ];
  assert.deepEqual(
    sortPlaylists(source).map((p) => p.id),
    ['new', 'old']
  );
  assert.equal(source[0].id, 'old');
});
test('saved ordering wins over creation date and survives reload', () => {
  const source = [
    { id: 'new', createdAt: { seconds: 20 } },
    { id: 'old', createdAt: { seconds: 10 } },
  ];
  const ordered = assignPlaylistOrder([source[1], source[0]]);
  assert.deepEqual(
    sortPlaylists([...ordered].reverse()).map((p) => p.id),
    ['old', 'new']
  );
  assert.equal(source[1].sortOrder, undefined);
});
test('new playlists append after an explicitly sorted collection', () => {
  assert.deepEqual(
    sortPlaylists([
      { id: 'new', createdAt: { seconds: 20 } },
      { id: 'pinned', sortOrder: 0 },
    ]).map((p) => p.id),
    ['pinned', 'new']
  );
});
test('equal or absent timestamps and invalid ranks have deterministic fallback', () => {
  assert.deepEqual(
    sortPlaylists([{ id: 'b', sortOrder: NaN }, { id: 'a' }]).map((p) => p.id),
    ['a', 'b']
  );
});
