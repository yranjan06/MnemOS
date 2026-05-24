import { useEffect, useState } from 'react';
import { Handle, Position } from '@xyflow/react';

const TYPE_META = {
  Do:        { icon: '⚡', color: '#2563eb' },
  Navigate:  { icon: '→',  color: '#059669' },
  Check:     { icon: '✓',  color: '#d97706' },
  Fill:      { icon: '≡',  color: '#7c3aed' },
  Read:      { icon: '»',  color: '#0891b2' },
  Code:      { icon: '</>', color: '#6b7280' },
  Agent:     { icon: '◈',  color: '#7c3aed' },
  Bootstrap: { icon: '↓',  color: '#b45309' },
  Remember:  { icon: '🧠', color: '#6d28d9' },
  Recall:    { icon: '⟳',  color: '#6d28d9' },
  Recover:   { icon: '⚕',  color: '#dc2626' },
  Plan:      { icon: '⊞',  color: '#0369a1' },
};

const handle = {
  width: 8,
  height: 8,
  background: '#d1d0cc',
  border: '2px solid #fff',
};

function truncate(str, n = 26) {
  if (!str) return null;
  const s = str.trim();
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function formatOutput(output) {
  if (output === null || output === undefined) return null;
  if (Array.isArray(output)) return [`[${output.length} item${output.length !== 1 ? 's' : ''}]`];
  if (typeof output === 'object') {
    const entries = Object.entries(output).slice(0, 3);
    const lines = entries.map(([k, v]) => {
      const val = typeof v === 'string' ? v : JSON.stringify(v);
      const short = val.length > 22 ? val.slice(0, 22) + '…' : val;
      return `${k}: ${short}`;
    });
    if (Object.keys(output).length > 3) lines.push('…');
    return lines;
  }
  const s = String(output);
  return [s.length > 40 ? s.slice(0, 40) + '…' : s];
}

export default function AgentNode({ data, selected }) {
  const meta = TYPE_META[data.nodeType] || { icon: '•', color: '#888' };
  const preview = truncate(data.preview);

  // Auto-clear success status after 2 s for green-flash effect
  const [displayStatus, setDisplayStatus] = useState(data.status);
  useEffect(() => {
    if (data.status === 'success') {
      setDisplayStatus('success');
      const t = setTimeout(() => setDisplayStatus(null), 2000);
      return () => clearTimeout(t);
    }
    setDisplayStatus(data.status);
  }, [data.status]);

  const isRunning = displayStatus === 'running';
  const isSuccess = displayStatus === 'success';
  const isError   = displayStatus === 'error';

  let borderColor = selected ? '#1a1a1a' : '#e2e2e2';
  let boxShadow = selected
    ? '0 0 0 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.1)'
    : '0 1px 4px rgba(0,0,0,0.06)';

  if (isSuccess) { borderColor = '#22c55e'; boxShadow = '0 0 0 2.5px #22c55e'; }
  if (isError)   { borderColor = '#ef4444'; boxShadow = '0 0 0 2.5px #ef4444'; }

  // Latest log message for live preview (filter out very short/empty lines)
  const latestMsg = data.latestLog?.msg?.trim();
  const showLiveLog = isRunning && latestMsg && latestMsg.length > 3;
  const truncatedLog = latestMsg && latestMsg.length > 44
    ? latestMsg.slice(0, 44) + '…'
    : latestMsg;

  return (
    <div
      className={isRunning ? 'node-running' : undefined}
      style={{
        '--node-color': meta.color,
        width: 160,
        borderRadius: 12,
        background: '#fff',
        border: `1.5px solid ${borderColor}`,
        boxShadow,
        padding: '14px 12px 10px',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Top} id="handle-in" style={handle} />

      {/* Status badge */}
      {isRunning && (
        <div style={{
          position: 'absolute', top: -5, right: -5,
          width: 12, height: 12, borderRadius: '50%',
          background: meta.color, border: '2px solid #fff',
        }} />
      )}
      {isSuccess && (
        <div style={{
          position: 'absolute', top: -5, right: -5,
          width: 14, height: 14, borderRadius: '50%',
          background: '#22c55e', border: '2px solid #fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, color: '#fff', fontWeight: 700,
        }}>✓</div>
      )}
      {isError && (
        <div style={{
          position: 'absolute', top: -5, right: -5,
          width: 14, height: 14, borderRadius: '50%',
          background: '#ef4444', border: '2px solid #fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: '#fff', fontWeight: 700,
        }}>!</div>
      )}

      {/* Icon badge */}
      <div style={{
        width: 40, height: 40,
        borderRadius: 10,
        background: `${meta.color}12`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 10px',
        fontSize: data.nodeType === 'Code' ? 13 : 18,
        color: meta.color,
        fontWeight: 700,
      }}>
        {meta.icon}
      </div>

      {/* Label */}
      <div style={{ fontWeight: 600, fontSize: 12, color: '#1a1a1a', lineHeight: 1.3 }}>
        {data.label || data.nodeType}
      </div>

      {/* Config preview */}
      {preview && (
        <div style={{
          marginTop: 4,
          fontSize: 10,
          color: '#9ca3af',
          lineHeight: 1.3,
          fontFamily: data.nodeType === 'Code' ? 'Consolas, monospace' : 'inherit',
        }}>
          {preview}
        </div>
      )}

      {/* Live log line while running */}
      {showLiveLog && (
        <div style={{
          marginTop: 6,
          fontSize: 9,
          color: '#6b7280',
          fontFamily: 'Geist Mono, Consolas, monospace',
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textAlign: 'left',
          padding: '0 1px',
        }}>
          {truncatedLog}
        </div>
      )}

      {/* Output pill */}
      {data.output != null && (() => {
        const lines = formatOutput(data.output);
        if (!lines) return null;
        return (
          <div style={{
            marginTop: 7,
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 6,
            padding: '4px 7px',
            textAlign: 'left',
          }}>
            {lines.map((line, i) => (
              <div key={i} style={{
                fontSize: 10,
                fontFamily: "'Geist Mono', Consolas, monospace",
                color: '#166534',
                lineHeight: 1.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>{line}</div>
            ))}
          </div>
        );
      })()}

      {/* Log button — always visible */}
      <button
        className="nodrag"
        onClick={(e) => { e.stopPropagation(); data.onOpenLog?.(); }}
        title={data.hasLogs ? 'View run log' : 'No logs yet — run the workflow first'}
        style={{
          marginTop: 8,
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '4px 8px',
          background: data.hasLogs ? '#1a1a1a' : '#f0efed',
          border: `1px solid ${data.hasLogs ? '#1a1a1a' : '#d4d2ce'}`,
          borderRadius: 5,
          cursor: 'pointer',
          fontSize: 10,
          fontWeight: 500,
          color: data.hasLogs ? '#fff' : '#888',
          fontFamily: 'Geist, sans-serif',
          letterSpacing: '-0.1px',
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = data.hasLogs ? '#333' : '#e5e3df';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = data.hasLogs ? '#1a1a1a' : '#f0efed';
        }}
      >
        <span>logs</span>
        {data.logCount > 0
          ? <span style={{ fontSize: 9, opacity: 0.7, fontFamily: 'Geist Mono, monospace' }}>{data.logCount}</span>
          : <span style={{ fontSize: 9, opacity: 0.5 }}>—</span>
        }
      </button>

      {data.nodeType === 'Check' && (
        <>
          <Handle type="source" position={Position.Right} id="true"
            style={{ ...handle, top: '50%', background: '#4ade80', width: 10, height: 10 }} />
          <Handle type="source" position={Position.Left} id="false"
            style={{ ...handle, top: '50%', background: '#f87171', width: 10, height: 10 }} />
        </>
      )}

      <Handle type="source" position={Position.Bottom} id="handle-out" style={handle} />

      {data.nodeType === 'ForEach' && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="handle-foreach-done"
            style={{ ...handle, left: '75%', background: '#94a3b8', width: 10, height: 10 }}
            title="After loop (done)"
          />
          <div style={{
            position: 'absolute', bottom: -18, left: '75%', transform: 'translateX(-50%)',
            fontSize: 9, color: '#94a3b8', whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>done</div>
        </>
      )}
    </div>
  );
}
