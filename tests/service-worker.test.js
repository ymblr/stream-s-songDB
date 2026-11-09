import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(
  new URL('../public/sw.js', import.meta.url),
  'utf8'
);
const origin = 'https://example.test';
const base = '/stream-s-songDB/';
function environment() {
  const listeners = new Map();
  const data = new Map();
  const deleted = [];
  const key = (request) =>
    typeof request === 'string' ? new URL(request, origin).href : request.url;
  const caches = {
    async keys() {
      return ['songdb-cache-v1', 'songdb-cache-v2', 'another-app-v1'];
    },
    async delete(name) {
      deleted.push(name);
    },
    async match(request) {
      return data.get(key(request))?.clone();
    },
    async open() {
      return {
        async add(url) {
          data.set(key(url), new Response('offline home'));
        },
        async put(request, response) {
          data.set(key(request), response);
        },
        async keys() {
          return [...data.keys()].map((url) => new Request(url));
        },
        async delete(request) {
          data.delete(key(request));
        },
      };
    },
  };
  const context = {
    URL,
    Response,
    caches,
    fetch: async () => new Response('network'),
    self: {
      location: new URL(`${origin}${base}sw.js`),
      addEventListener: (name, listener) => listeners.set(name, listener),
      skipWaiting() {},
      clients: { async claim() {} },
    },
  };
  runInNewContext(source, context);
  async function dispatch(name, request) {
    let response;
    const pending = [];
    listeners.get(name)({
      request,
      respondWith(value) {
        response = Promise.resolve(value);
      },
      waitUntil(value) {
        pending.push(value);
      },
    });
    const result = await response;
    await Promise.all(pending);
    return result;
  }
  return { context, data, deleted, dispatch, key };
}

test('activation only deletes this application’s old caches', async () => {
  const env = environment();
  await env.dispatch('activate');
  assert.deepEqual(env.deleted, ['songdb-cache-v1']);
});
test('external requests and non-GET requests bypass service worker', async () => {
  const env = environment();
  assert.equal(
    await env.dispatch(
      'fetch',
      new Request('https://firestore.googleapis.com/test')
    ),
    undefined
  );
  assert.equal(
    await env.dispatch(
      'fetch',
      new Request(`${origin}${base}test`, { method: 'POST' })
    ),
    undefined
  );
  assert.equal(
    await env.dispatch('fetch', new Request(`${origin}/another-app/test.js`)),
    undefined
  );
});
test('hashed build assets use cached response first', async () => {
  const env = environment();
  const request = new Request(`${origin}${base}assets/index-abc123.js`);
  env.data.set(request.url, new Response('cached script'));
  assert.equal(
    await (await env.dispatch('fetch', request)).text(),
    'cached script'
  );
});
test('unhashed manifest uses network before the old cache', async () => {
  const env = environment();
  const request = new Request(`${origin}${base}manifest.json`);
  env.data.set(request.url, new Response('old manifest'));
  assert.equal(await (await env.dispatch('fetch', request)).text(), 'network');
});
test('offline navigation falls back to the home shell', async () => {
  const env = environment();
  await env.dispatch('install');
  env.context.fetch = async () => {
    throw Error('offline');
  };
  const response = await env.dispatch('fetch', {
    url: `${origin}${base}search`,
    method: 'GET',
    mode: 'navigate',
  });
  assert.equal(await response.text(), 'offline home');
});
