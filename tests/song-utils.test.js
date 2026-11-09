import test from 'node:test';
import assert from 'node:assert/strict';
import { extractVideoId } from '../src/utils/youtube.js';
import {
  parseTimestamp,
  normalizeTags,
  validateSongRow,
} from '../src/utils/songForm.js';
import { searchSongs } from '../src/utils/search.js';

test('timestamps accept zero, hours and full-width numerals', () => {
  assert.equal(parseTimestamp('0:00'), 0);
  assert.equal(parseTimestamp('1:02:34'), 3754);
  assert.equal(parseTimestamp('１２：３４'), 754);
});
test('invalid timestamps cannot silently become zero', () => {
  for (const value of [
    '',
    'abc',
    '-1',
    '1:60',
    '1:02:99',
    '1::2',
    '1.5',
    '1:2:3:4',
  ])
    assert.equal(parseTimestamp(value), null, value);
});
test('a clip must have a name and positive duration', () => {
  assert.deepEqual(
    validateSongRow({ name: '曲', startTime: '0:00', endTime: '0:01' }),
    {}
  );
  assert.ok(
    validateSongRow({ name: '曲', startTime: '1:00', endTime: '1:00' }).endTime
  );
  assert.ok(
    validateSongRow({ name: ' ', startTime: '1:00', endTime: '0:30' }).name
  );
});
test('tags split pasted lists, trim and deduplicate', () => {
  assert.deepEqual(normalizeTags([' アニソン、低音 ', '低音', '夏,夜\n', '']), [
    'アニソン',
    '低音',
    '夏',
    '夜',
  ]);
});
test('YouTube URLs accept reordered query strings and supported paths', () => {
  for (const url of [
    'https://www.youtube.com/watch?list=123&v=abcdefghijk',
    'https://youtu.be/abcdefghijk?t=30',
    'https://www.youtube.com/live/abcdefghijk',
    'https://m.youtube.com/shorts/abcdefghijk',
  ])
    assert.equal(extractVideoId(url), 'abcdefghijk');
});
test('invalid URL clears video identity instead of matching a foreign host', () => {
  for (const url of [
    '',
    'not a URL',
    'https://evil.test/youtube.com/watch?v=abcdefghijk',
    'https://youtube.com.evil.test/watch?v=abcdefghijk',
    'https://youtu.be/short',
  ])
    assert.equal(extractVideoId(url), null, url);
});
const songs = [
  {
    name: 'サクラ',
    artist: 'Artist A',
    streamTitle: '春の配信',
    streamType: 'singing',
    tags: ['アニソン', '低音'],
  },
  {
    name: '星',
    artist: 'Artist B',
    streamTitle: '夜の配信',
    streamType: 'ukulele',
    tags: [],
  },
];
test('search matches kana, romaji and half-width text', () => {
  for (const term of ['さくら', 'sakura', 'ｻｸﾗ'])
    assert.equal(searchSongs(songs, term).length, 1, term);
});
test('AND terms can match different fields, including tags', () => {
  assert.deepEqual(searchSongs(songs, 'Artist アニソン 低音'), [songs[0]]);
  assert.deepEqual(searchSongs(songs, 'サクラ 夜'), []);
  assert.deepEqual(searchSongs(songs, '', 'ukulele'), [songs[1]]);
});
