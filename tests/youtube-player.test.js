import test from 'node:test';
import assert from 'node:assert/strict';
import { getYouTubeEmbedUrl } from '../src/utils/youtube.js';

test('HTTPS embeds preserve relative src without changing the secure destination', () => {
  const base = 'https://ymblr.github.io/stream-s-songDB/';
  const src = getYouTubeEmbedUrl('rErymdqpLG4', {}, base);
  assert.ok(src.startsWith('//www.youtube.com/embed/'));
  assert.equal(src.startsWith('https://'), false);
  const resolved = new URL(src, base);
  assert.equal(resolved.protocol, 'https:');
  assert.equal(resolved.hostname, 'www.youtube.com');
  assert.equal(resolved.pathname, '/embed/rErymdqpLG4');
});

test('API identity, clip offsets, and control options survive iframe creation', () => {
  const src = getYouTubeEmbedUrl(
    'rErymdqpLG4',
    {
      origin: 'https://ymblr.github.io',
      start: 60,
      end: 200,
      controls: 0,
      playsinline: 1,
      autoplay: 0,
    },
    'https://ymblr.github.io/stream-s-songDB/'
  );
  const params = new URL(src, 'https://ymblr.github.io').searchParams;
  assert.equal(params.get('enablejsapi'), '1');
  assert.equal(params.get('origin'), 'https://ymblr.github.io');
  assert.equal(params.get('start'), '60');
  assert.equal(params.get('end'), '200');
  assert.equal(params.get('controls'), '0');
  assert.equal(params.get('playsinline'), '1');
  assert.equal(params.get('autoplay'), '0');
});

test('HTTP development pages still request YouTube through HTTPS', () => {
  const src = getYouTubeEmbedUrl('', { controls: 1 }, 'http://localhost:5173/');
  const resolved = new URL(src, 'http://localhost:5173/');
  assert.equal(resolved.protocol, 'https:');
  assert.equal(resolved.pathname, '/embed/');
  assert.equal(resolved.searchParams.get('controls'), '1');
});

test('unset options are omitted while zero values are preserved', () => {
  const src = getYouTubeEmbedUrl(
    undefined,
    { start: 0, end: undefined, controls: null },
    'https://example.com/'
  );
  const params = new URL(src, 'https://example.com').searchParams;
  assert.equal(params.get('start'), '0');
  assert.equal(params.has('end'), false);
  assert.equal(params.has('controls'), false);
});
