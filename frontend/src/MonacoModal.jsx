import { useEffect } from 'react';
import Editor from '@monaco-editor/react';

export default function MonacoModal({ open, title, value, language = 'plaintext', placeholder, onChange, onClose }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const isCode = language === 'python';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 720, maxWidth: '90vw',
          height: '60vh',
          background: '#0d1117',
          border: '1px solid #30363d',
          borderRadius: 12,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          padding: '10px 14px',
          background: '#161b22',
          borderBottom: '1px solid #30363d',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          color: '#e6edf3',
          fontFamily: 'Geist, sans-serif',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{title}</span>
            <span style={{ fontSize: 10, color: '#7d8590', fontFamily: 'Geist Mono, Consolas, monospace' }}>
              {language}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              fontSize: 14, lineHeight: 1, width: 22, height: 22,
              border: '1px solid #30363d', borderRadius: 4,
              background: 'transparent', color: '#7d8590', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            title="Close (Esc)"
          >×</button>
        </div>

        <div style={{ flex: 1, minHeight: 0, background: '#0d1117' }}>
          <Editor
            height="100%"
            language={language}
            value={value}
            onChange={(v) => onChange(v ?? '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              lineNumbers: isCode ? 'on' : 'off',
              wordWrap: isCode ? 'off' : 'on',
              fontSize: 13,
              fontFamily: 'Geist Mono, Consolas, monospace',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              padding: { top: 10, bottom: 10 },
            }}
          />
        </div>

        {placeholder && !value && (
          <div style={{
            padding: '6px 14px',
            background: '#161b22',
            borderTop: '1px solid #30363d',
            fontSize: 10,
            color: '#7d8590',
            fontFamily: 'Geist, sans-serif',
            whiteSpace: 'pre-wrap',
          }}>
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
}
