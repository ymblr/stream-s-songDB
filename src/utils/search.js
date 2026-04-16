// ローマ字→ひらがな変換テーブル（長い順に処理）
const ROMAJI_TABLE = [
  // 4文字以上
  ['tchi', 'っち'], ['ttsu', 'っつ'], ['kkya', 'っきゃ'], ['sshu', 'っしゅ'],
  // 3文字（特殊）
  ['sha', 'しゃ'], ['shi', 'し'], ['shu', 'しゅ'], ['she', 'しぇ'], ['sho', 'しょ'],
  ['chi', 'ち'], ['tsu', 'つ'],
  ['cha', 'ちゃ'], ['chu', 'ちゅ'], ['che', 'ちぇ'], ['cho', 'ちょ'],
  ['dzu', 'づ'], ['dzi', 'ぢ'],
  ['jya', 'じゃ'], ['jyu', 'じゅ'], ['jyo', 'じょ'],
  ['nya', 'にゃ'], ['nyu', 'にゅ'], ['nyo', 'にょ'],
  ['mya', 'みゃ'], ['myu', 'みゅ'], ['myo', 'みょ'],
  ['rya', 'りゃ'], ['ryu', 'りゅ'], ['ryo', 'りょ'],
  ['hya', 'ひゃ'], ['hyu', 'ひゅ'], ['hyo', 'ひょ'],
  ['bya', 'びゃ'], ['byu', 'びゅ'], ['byo', 'びょ'],
  ['pya', 'ぴゃ'], ['pyu', 'ぴゅ'], ['pyo', 'ぴょ'],
  ['gya', 'ぎゃ'], ['gyu', 'ぎゅ'], ['gyo', 'ぎょ'],
  ['kya', 'きゃ'], ['kyu', 'きゅ'], ['kyo', 'きょ'],
  ['tya', 'ちゃ'], ['tyu', 'ちゅ'], ['tyo', 'ちょ'],
  // 2文字
  ['ka', 'か'], ['ki', 'き'], ['ku', 'く'], ['ke', 'け'], ['ko', 'こ'],
  ['sa', 'さ'], ['si', 'し'], ['su', 'す'], ['se', 'せ'], ['so', 'そ'],
  ['ta', 'た'], ['ti', 'ち'], ['tu', 'つ'], ['te', 'て'], ['to', 'と'],
  ['na', 'な'], ['ni', 'に'], ['nu', 'ぬ'], ['ne', 'ね'], ['no', 'の'],
  ['ha', 'は'], ['hi', 'ひ'], ['hu', 'ふ'], ['fu', 'ふ'], ['he', 'へ'], ['ho', 'ほ'],
  ['ma', 'ま'], ['mi', 'み'], ['mu', 'む'], ['me', 'め'], ['mo', 'も'],
  ['ya', 'や'], ['yu', 'ゆ'], ['yo', 'よ'],
  ['ra', 'ら'], ['ri', 'り'], ['ru', 'る'], ['re', 'れ'], ['ro', 'ろ'],
  ['wa', 'わ'], ['wi', 'ゐ'], ['we', 'ゑ'], ['wo', 'を'],
  ['ga', 'が'], ['gi', 'ぎ'], ['gu', 'ぐ'], ['ge', 'げ'], ['go', 'ご'],
  ['za', 'ざ'], ['zi', 'じ'], ['zu', 'ず'], ['ze', 'ぜ'], ['zo', 'ぞ'],
  ['da', 'だ'], ['di', 'ぢ'], ['du', 'づ'], ['de', 'で'], ['do', 'ど'],
  ['ba', 'ば'], ['bi', 'び'], ['bu', 'ぶ'], ['be', 'べ'], ['bo', 'ぼ'],
  ['pa', 'ぱ'], ['pi', 'ぴ'], ['pu', 'ぷ'], ['pe', 'ぺ'], ['po', 'ぽ'],
  ['ja', 'じゃ'], ['ji', 'じ'], ['ju', 'じゅ'], ['je', 'じぇ'], ['jo', 'じょ'],
  // 1文字
  ['a', 'あ'], ['i', 'い'], ['u', 'う'], ['e', 'え'], ['o', 'お'],
  ['n', 'ん'],
];

// ローマ字をひらがなに変換
export function romajiToHiragana(str) {
  let result = '';
  let s = str.toLowerCase().replace(/[-_\s]/g, '');

  while (s.length > 0) {
    // っ の処理（子音の重複）
    if (s.length >= 2 && s[0] === s[1] && s[0] !== 'n' && !/[aiueo]/.test(s[0])) {
      result += 'っ';
      s = s.slice(1);
      continue;
    }

    let matched = false;
    for (const [romaji, hiragana] of ROMAJI_TABLE) {
      if (s.startsWith(romaji)) {
        result += hiragana;
        s = s.slice(romaji.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      result += s[0];
      s = s.slice(1);
    }
  }
  return result;
}

// カタカナ→ひらがな
export function katakanaToHiragana(str) {
  return str.replace(/[\u30A1-\u30F6]/g, c =>
    String.fromCharCode(c.charCodeAt(0) - 0x60)
  );
}

// ひらがな→カタカナ
export function hiraganaToKatakana(str) {
  return str.replace(/[\u3041-\u3096]/g, c =>
    String.fromCharCode(c.charCodeAt(0) + 0x60)
  );
}

// 文字列を正規化（スペース除去、小文字化、カタカナ→ひらがな）
function normalizeText(str) {
  if (!str) return '';
  return katakanaToHiragana(str.toLowerCase().replace(/\s+/g, ''));
}

// ローマ字チェック
function isRomaji(str) {
  return /^[a-zA-Z\s\-_]+$/.test(str);
}

// 検索クエリのバリアントを生成
function getQueryVariants(query) {
  const q = query.toLowerCase().trim();
  const variants = new Set([q]);

  // スペースなし
  const qNoSpace = q.replace(/\s+/g, '');
  variants.add(qNoSpace);

  // カタカナ→ひらがな
  const qHira = katakanaToHiragana(qNoSpace);
  variants.add(qHira);

  // ひらがな→カタカナ
  variants.add(hiraganaToKatakana(qNoSpace));

  // ローマ字→ひらがな
  if (isRomaji(q) || isRomaji(qNoSpace)) {
    const romajiHira = romajiToHiragana(qNoSpace);
    if (romajiHira !== qNoSpace) {
      variants.add(romajiHira);
      variants.add(hiraganaToKatakana(romajiHira));
    }
  }

  return [...variants].filter(v => v.length > 0);
}

// メイン検索関数
export function searchSongs(songs, query, typeFilter = null) {
  let results = songs;

  // タイプフィルタ
  if (typeFilter) {
    results = results.filter(s => s.streamType === typeFilter);
  }

  if (!query || !query.trim()) return results;

  const variants = getQueryVariants(query);

  return results.filter(song => {
    const targets = [
      normalizeText(song.name),
      normalizeText(song.artist),
      normalizeText(song.streamTitle || ''),
    ];

    return variants.some(variant =>
      targets.some(target => target.includes(variant))
    );
  });
}
