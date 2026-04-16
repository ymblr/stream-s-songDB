// YouTubeのURLからビデオIDを取得
export function extractVideoId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]{11})/,
    /youtube\.com\/live\/([^&?/\s]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
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
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
    const res = await fetch(url);
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
export function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const existing = document.getElementById('yt-api-script');
    if (!existing) {
      const script = document.createElement('script');
      script.id = 'yt-api-script';
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      resolve(window.YT);
    };
  });
}
