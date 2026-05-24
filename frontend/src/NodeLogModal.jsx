import { useEffect, useRef } from 'react';

const TYPE_COLORS = {
  Do: '#2563eb',
  Navigate: '#059669',
  Check: '#d97706',
  Fill: '#7c3aed',
  Read: '#0891b2',
  Code: '#6b7280',
  Agent: '#7c3aed',
  Bootstrap: '#b45309',
  ForEach: '#0891b2',
};

function fmtTime(ms) {
  const d = new Date(ms);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function NodeLogModal({ nodeId, node, logs, isRunning, onClose }) {
  const scrollRef = useRef(null);
  const userScrolledUp = useRef(false);

  // Close on ESC
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Auto-scroll to bottom only if user hasn't scrolled up
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
  const color = TYPE_COLORS[nodeType] || '#888';

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
          width: 640, maxWidth: '90vw',
          height: '65vh',
          background: '#0d1117',
          border: '1px solid #30363d',
          borderRadius: 12,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '10px 14px',
          background: '#161b22',
          borderBottom: '1px solid #30363d',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px',
            borderRadius: 4, background: color, color: '#fff',
            fontFamily: 'Geist, sans-serif',
          }}>
            {nodeType}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', flex: 1 }}>
            {nodeLabel}
          </span>
          <span style={{ fontSize: 10, color: '#8b949e', fontFamily: 'Geist Mono, Consolas, monospace' }}>
            {nodeId}
          </span>
          {isRunning && (
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 10, color: '#3fb950',
              fontFamily: 'Geist, sans-serif',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#3fb950',
                animation: 'pulse-green 1.4s ease-in-out infinite',
              }} />
              live
            </span>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: '#8b949e',
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
              fontSize: 12, color: '#484f58',
              fontFamily: 'Geist Mono, Consolas, monospace',
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
              onMouseEnter={e => e.currentTarget.style.background = '#161b22'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{
                fontSize: 10, color: '#484f58',
                fontFamily: 'Geist Mono, Consolas, monospace',
                flexShrink: 0, paddingTop: 1,
                userSelect: 'none',
              }}>
                {fmtTime(entry.t)}
              </span>
              <span style={{
                fontSize: 11, color: '#e6edf3',
                fontFamily: 'Geist Mono, Consolas, monospace',
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
          background: '#161b22',
          borderTop: '1px solid #30363d',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <span style={{ fontSize: 10, color: '#484f58', fontFamily: 'Geist Mono, Consolas, monospace' }}>
            {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
          </span>
          {logs.length >= 100 && (
            <span style={{ fontSize: 10, color: '#d29922' }}>
              · capped at 100 — oldest entries dropped
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse-green {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
