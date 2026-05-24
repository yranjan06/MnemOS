import { useEffect, useRef } from 'react';

const TYPE_COLORS = {
  Do: '#6ec6f5',
  Navigate: '#d4f53c',
  Check: '#f59e0b',
  Fill: '#a78bfa',
  Read: '#6ec6f5',
  Code: '#888880',
  Agent: '#a78bfa',
  Bootstrap: '#f59e0b',
  ForEach: '#6ec6f5',
};

function fmtTime(ms) {
  const d = new Date(ms);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function NodeLogModal({ nodeId, node, logs, isRunning, onClose }) {
  const scrollRef = useRef(null);
  const userScrolledUp = useRef(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || userScrolledUp.current) return;
    el.scrollTop = el.scrollHeight;
  }, [logs]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    userScrolledUp.current = !atBottom;
  };

  const nodeType = node?.type || '';
  const nodeLabel = node?.label || nodeId;
  const color = TYPE_COLORS[nodeType] || '#888880';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 640, maxWidth: '90vw',
          height: '65vh',
          background: '#0f0f0f',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          fontFamily: "'Courier New', monospace",
        }}
      >
        {/* Header */}
        <div style={{
          padding: '10px 14px',
          background: '#0f0f0f',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px',
            borderRadius: 4, background: `${color}20`, color,
            border: `1px solid ${color}40`,
            letterSpacing: '0.04em',
          }}>
            {nodeType}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f0f0ee', flex: 1 }}>
            {nodeLabel}
          </span>
          <span style={{ fontSize: 9, color: '#3a3a3a' }}>
            {nodeId}
          </span>
          {isRunning && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 10, color: '#d4f53c',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#d4f53c',
                animation: 'pulse-lime 1.4s ease-in-out infinite',
              }} />
              live
            </span>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#555550',
              cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 2px',
            }}
          >
            ×
          </button>
        </div>

        {/* Log body */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            flex: 1, overflow: 'auto',
            padding: '8px 0',
          }}
        >
          {logs.length === 0 ? (
            <div style={{
              padding: '32px 16px', textAlign: 'center',
              fontSize: 11, color: '#3a3a3a',
            }}>
              {isRunning ? 'Waiting for output…' : 'No logs for this node.'}
            </div>
          ) : logs.map((entry, i) => (
            <div
              key={i}
              style={{
                display: 'flex', gap: 12,
                padding: '2px 14px',
                lineHeight: 1.6,
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1c1c1c'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                fontSize: 10, color: '#3a3a3a',
                flexShrink: 0, paddingTop: 1,
                userSelect: 'none',
              }}>
                {fmtTime(entry.t)}
              </span>
              <span style={{
                fontSize: 11, color: '#8aaa18',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                flex: 1,
              }}>
                {entry.msg}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '6px 14px',
          background: '#0f0f0f',
          borderTop: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: '#3a3a3a' }}>
            {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
          </span>
          {logs.length >= 100 && (
            <span style={{ fontSize: 10, color: '#f59e0b' }}>
              · capped at 100 — oldest entries dropped
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse-lime {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
