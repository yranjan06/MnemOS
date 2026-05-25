import { useEffect, useState } from 'react';
import { Handle, Position } from '@xyflow/react';

const TYPE_META = {
  Navigate:  { icon: '→',  color: '#c8c8c4' },
  Do:        { icon: '⚡', color: '#c8c8c4' },
  Check:     { icon: '✓',  color: '#c8c8c4' },
  Fill:      { icon: '≡',  color: '#c8c8c4' },
  Read:      { icon: '»',  color: '#c8c8c4' },
  Code:      { icon: '</>', color: '#888880' },
  Agent:     { icon: '◈',  color: '#c8c8c4' },
  Bootstrap: { icon: '↓',  color: '#888880' },
  ForEach:   { icon: '∀',  color: '#888880' },
  Remember:  { icon: '●',  color: '#d4f53c' },
  Recall:    { icon: '⟳',  color: '#d4f53c' },
  Recover:   { icon: '↺',  color: '#d4f53c' },
  Plan:      { icon: '⊞',  color: '#d4f53c' },
};

const handle = {
  width: 8,
  height: 8,
  background: '#2a2a2a',
  border: '2px solid #0f0f0f',
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
  const meta = TYPE_META[data.nodeType] || { icon: '•', color: '#888880' };
  const preview = truncate(data.preview);

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

  let borderColor = selected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)';
  let boxShadow = selected
    ? '0 0 0 1px rgba(212,245,60,0.3), 0 4px 20px rgba(0,0,0,0.4)'
    : '0 2px 8px rgba(0,0,0,0.3)';

  if (isSuccess) { borderColor = '#d4f53c'; boxShadow = '0 0 0 2px rgba(212,245,60,0.4)'; }
  if (isError)   { borderColor = '#ef4444'; boxShadow = '0 0 0 2px rgba(239,68,68,0.4)'; }

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
        borderRadius: 10,
        background: '#1c1c1c',
        border: `1.5px solid ${borderColor}`,
        boxShadow,
        padding: '12px 10px 8px',
        textAlign: 'center',
        position: 'relative',
        fontFamily: "'Courier New', monospace",
      }}
    >
      <Handle type="target" position={Position.Top} id="handle-in" style={handle} />

      {/* Status badge */}
      {isRunning && (
        <div style={{
          position: 'absolute', top: -5, right: -5,
          width: 12, height: 12, borderRadius: '50%',
          background: meta.color, border: '2px solid #0f0f0f',
        }} />
      )}
      {isSuccess && (
        <div style={{
          position: 'absolute', top: -5, right: -5,
          width: 14, height: 14, borderRadius: '50%',
          background: '#d4f53c', border: '2px solid #0f0f0f',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 8, color: '#0f0f0f', fontWeight: 700,
        }}>✓</div>
      )}
      {isError && (
        <div style={{
          position: 'absolute', top: -5, right: -5,
          width: 14, height: 14, borderRadius: '50%',
          background: '#ef4444', border: '2px solid #0f0f0f',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: '#fff', fontWeight: 700,
        }}>!</div>
      )}

      {/* Icon badge */}
      <div style={{
        width: 36, height: 36,
        borderRadius: 8,
        background: `${meta.color}18`,
        border: `1px solid ${meta.color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 8px',
        fontSize: data.nodeType === 'Code' ? 12 : 16,
        color: meta.color,
        fontWeight: 700,
      }}>
        {meta.icon}
      </div>

      {/* Label */}
      <div style={{ fontWeight: 700, fontSize: 11, color: '#f0f0ee', lineHeight: 1.3, letterSpacing: '0.01em' }}>
        {data.label || data.nodeType}
      </div>

      {/* Config preview */}
      {preview && (
        <div style={{
          marginTop: 4,
          fontSize: 9,
          color: '#555550',
          lineHeight: 1.3,
          fontFamily: "'Courier New', monospace",
        }}>
          {preview}
        </div>
      )}

      {/* Live log line while running */}
      {showLiveLog && (
        <div style={{
          marginTop: 5,
          fontSize: 9,
          color: '#888880',
          fontFamily: "'Courier New', monospace",
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
            marginTop: 6,
            background: '#1a2200',
            border: '1px solid rgba(212,245,60,0.15)',
            borderRadius: 5,
            padding: '4px 6px',
            textAlign: 'left',
          }}>
            {lines.map((line, i) => (
              <div key={i} style={{
                fontSize: 9,
                fontFamily: "'Courier New', monospace",
                color: '#8aaa18',
                lineHeight: 1.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>{line}</div>
            ))}
          </div>
        );
      })()}

      {/* Log button */}
      <button
        className="nodrag"
        onClick={(e) => { e.stopPropagation(); data.onOpenLog?.(); }}
        title={data.hasLogs ? 'View run log' : 'No logs yet — run the workflow first'}
        style={{
          marginTop: 7,
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '3px 7px',
          background: data.hasLogs ? '#0f0f0f' : 'transparent',
          border: `1px solid ${data.hasLogs ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 10,
          fontWeight: 500,
          color: data.hasLogs ? '#888880' : '#3a3a3a',
          fontFamily: "'Courier New', monospace",
          letterSpacing: '0.02em',
          transition: 'background 0.12s, color 0.12s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = '#2a2a2a';
          e.currentTarget.style.color = '#f0f0ee';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = data.hasLogs ? '#0f0f0f' : 'transparent';
          e.currentTarget.style.color = data.hasLogs ? '#888880' : '#3a3a3a';
        }}
      >
        <span>logs</span>
        {data.logCount > 0
          ? <span style={{ fontSize: 9, opacity: 0.7, color: '#d4f53c' }}>{data.logCount}</span>
          : <span style={{ fontSize: 9, opacity: 0.4 }}>—</span>
        }
      </button>

      {data.nodeType === 'Check' && (
        <>
          <Handle type="source" position={Position.Right} id="true"
            style={{ ...handle, top: '50%', background: '#d4f53c', width: 10, height: 10 }} />
          <Handle type="source" position={Position.Left} id="false"
            style={{ ...handle, top: '50%', background: '#ef4444', width: 10, height: 10 }} />
        </>
      )}

      <Handle type="source" position={Position.Bottom} id="handle-out" style={handle} />

      {data.nodeType === 'ForEach' && (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="handle-foreach-done"
            style={{ ...handle, left: '75%', background: '#555550', width: 10, height: 10 }}
            title="After loop (done)"
          />
          <div style={{
            position: 'absolute', bottom: -18, left: '75%', transform: 'translateX(-50%)',
            fontSize: 9, color: '#555550', whiteSpace: 'nowrap', pointerEvents: 'none',
          }}>done</div>
        </>
      )}
    </div>
  );
}
