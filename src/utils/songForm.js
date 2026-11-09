export function parseTimestamp(value) {
  const text = String(value ?? '')
    .trim()
    .normalize('NFKC');
  if (!/^\d+(?::\d{1,2}){0,2}$/.test(text)) return null;
  const parts = text.split(':').map(Number);
  if (parts.slice(1).some((n) => n > 59)) return null;
  const seconds = parts.reduce((sum, part) => sum * 60 + part, 0);
  return Number.isSafeInteger(seconds) ? seconds : null;
}

export function normalizeTags(tags) {
  return [
    ...new Set(
      tags
        .flatMap((tag) => String(tag).split(/[,、\n]/))
        .map((tag) => tag.trim())
        .filter(Boolean)
    ),
  ];
}

export function validateSongRow(row) {
  const errors = {};
  const start = parseTimestamp(row.startTime);
  const end = parseTimestamp(row.endTime);
  if (!row.name.trim()) errors.name = '楽曲名を入力してください';
  if (start === null) errors.startTime = '0:00 または 1:00:00 の形式で入力';
  if (end === null) errors.endTime = '0:00 または 1:00:00 の形式で入力';
  else if (start !== null && end <= start)
    errors.endTime = '終了は開始より後にしてください';
  return errors;
}

export function createSongRow() {
  return {
    id: crypto.randomUUID(),
    name: '',
    startTime: '',
    endTime: '',
    tags: [],
    tagInput: '',
    volumePercent: 100,
  };
}
