import React from 'react';
import { XIcon } from './Icons';
import { normalizeTags } from '../utils/songForm';

export default function TagInput({ tags, text, onChange, id }) {
  const commit = () => onChange(normalizeTags([...tags, text]), '');
  return (
    <div className="tag-input">
      {tags.map((tag) => (
        <span className="tag" key={tag}>
          {tag}
          <button
            type="button"
            aria-label={`${tag}を削除`}
            onClick={() =>
              onChange(
                tags.filter((t) => t !== tag),
                text
              )
            }
          >
            <XIcon size={12} />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={text}
        placeholder="例：アニソン、低音"
        onChange={(e) => onChange(tags, e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
          if (e.key === 'Enter' || e.key === ',' || e.key === '、') {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Backspace' && !text) onChange(tags.slice(0, -1), '');
        }}
      />
    </div>
  );
}
