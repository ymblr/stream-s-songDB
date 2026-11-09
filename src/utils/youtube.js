// YouTubeのURLからビデオIDを取得
export function extractVideoId(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    if (!['https:', 'http:'].includes(parsed.protocol)) return null;
    const host = parsed.hostname.toLowerCase();
    let id = null;
    if (host === 'youtu.be') id = parsed.pathname.split('/')[1];
    if (
      [
        'youtube.com',
        'www.youtube.com',
        'm.youtube.com',
        'music.youtube.com',
        'www.youtube-nocookie.com',
      ].includes(host)
    ) {
      id =
        parsed.pathname === '/watch'
          ? parsed.searchParams.get('v')
          : /^\/(?:live|embed|shorts)\/([^/]+)/.exec(parsed.pathname)?.[1];
    }
    return /^[\w-]{11}$/.test(id || '') ? id : null;
  } catch {
    return null;
  }
}

// タイムスタンプ文字列（MM:SS または HH:MM:SS）を秒数に変換
export function timestampToSeconds(ts) {
  if (!ts) return 0;
  const parts = ts.trim().split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parseInt(ts) || 0;
}

// 秒数をMM:SS形式に変換
export function secondsToTimestamp(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// YouTubeサムネイルURL
export function getThumbnailUrl(videoId, quality = 'hq') {
  if (!videoId) return '';
  const qualityMap = {
    default: 'default',
    mq: 'mqdefault',
    hq: 'hqdefault',
    sd: 'sddefault',
    max: 'maxresdefault',
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality] || 'hqdefault'}.jpg`;
}

// YouTube oEmbedからビデオ情報を取得
export async function fetchVideoInfo(videoId) {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    return {
      title: data.title,
      thumbnail: getThumbnailUrl(videoId, 'hq'),
      author: data.author_name,
    };
  } catch (e) {
    return {
      title: `動画 (${videoId})`,
      thumbnail: getThumbnailUrl(videoId, 'hq'),
      author: '',
    };
  }
}

// YouTubeのIFrame APIを読み込む
let youtubeAPIPromise;
export function loadYouTubeAPI() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeAPIPromise) return youtubeAPIPromise;
  youtubeAPIPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      youtubeAPIPromise = null;
      reject(new Error('YouTube APIの読み込みに失敗しました'));
    }, 15000);
    if (window.YT && window.YT.Player) {
      clearTimeout(timer);
      resolve(window.YT);
      return;
    }
    const existing = document.getElementById('yt-api-script');
    if (!existing) {
      const script = document.createElement('script');
      script.id = 'yt-api-script';
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => {
        clearTimeout(timer);
        script.remove();
        youtubeAPIPromise = null;
        reject(new Error('YouTube APIの読み込みに失敗しました'));
      };
      document.head.appendChild(script);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      if (prev) prev();
      resolve(window.YT);
    };
  });
  return youtubeAPIPromise;
}
