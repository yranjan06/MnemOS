import { useState } from 'react';
import MonacoModal from './MonacoModal';

export default function PromptInput({ label, value, language = 'plaintext', placeholder, onChange, minHeight = 60 }) {
  const [open, setOpen] = useState(false);
  const isCode = language === 'python';
  const empty = !value || value.trim() === '';

  const lines = (value || '').split('\n');
  const previewLines = lines.slice(0, 3);
  const overflow = lines.length > 3;

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        style={{
          width: '100%',
          minHeight,
          maxHeight: 120,
          padding: '6px 26px 6px 8px',
          border: '1px solid #ddd',
          borderRadius: 4,
          boxSizing: 'border-box',
          background: '#fff',
          cursor: 'pointer',
          fontSize: isCode ? 11 : 12,
          fontFamily: isCode ? 'Consolas, monospace' : 'inherit',
          color: empty ? '#aaa' : '#1a1a1a',
          position: 'relative',
          overflow: 'hidden',
          lineHeight: 1.45,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          transition: 'border-color 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#999'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#ddd'; }}
        title="Click to edit"
      >
        {empty ? (placeholder || 'Click to edit…') : previewLines.join('\n')}
        {overflow && (
          <span style={{ color: '#aaa' }}>{'\n…'}</span>
        )}
        <span style={{
          position: 'absolute', top: 4, right: 6,
          fontSize: 11, color: '#aaa', pointerEvents: 'none',
          lineHeight: 1,
        }}>↗</span>
      </div>

      <MonacoModal
        open={open}
        title={label}
        value={value || ''}
        language={language}
        placeholder={placeholder}
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
