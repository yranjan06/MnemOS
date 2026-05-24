import { useState, useEffect, useCallback } from 'react';
import MemoryPanel from '../MemoryPanel/MemoryPanel';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function RunsTab({ workflowId }) {
  const [runs, setRuns] = useState([]);

  const fetchRuns = useCallback(async () => {
    if (!workflowId) return;
    try {
      const res = await fetch(`${API}/runs?workflow_id=${encodeURIComponent(workflowId)}`);
      if (res.ok) {
        const data = await res.json();
        setRuns(data.runs || []);
      }
    } catch {}
  }, [workflowId]);

  useEffect(() => {
    fetchRuns();
    const t = setInterval(fetchRuns, 5000);
    return () => clearInterval(t);
  }, [fetchRuns]);

  const statusColor = (s) => ({
    success: '#22c55e',
    error:   '#ef4444',
    stopped: '#f59e0b',
    running: '#6d28d9',
  }[s] || '#6b6b8a');

  const fmt = (ts) => {
    if (!ts) return '—';
    return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const dur = (r) => {
    if (!r.finished_at) return 'running…';
    const s = Math.round(r.finished_at - r.started_at);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div style={{ padding: 8, overflowY: 'auto', flex: 1 }}>
      {!workflowId && <p style={emptyStyle}>Select a workflow first.</p>}
      {workflowId && runs.length === 0 && <p style={emptyStyle}>No runs yet.</p>}
      {runs.map(r => (
        <div key={r.id} style={runCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor(r.status), flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#e8e8f0' }}>{r.status}</span>
            <span style={{ fontSize: 10, color: '#6b6b8a', marginLeft: 'auto' }}>{dur(r)}</span>
          </div>
          <div style={{ fontSize: 10, color: '#6b6b8a', fontFamily: 'monospace' }}>
            {fmt(r.started_at)} · {r.id.slice(0, 8)}…
          </div>
        </div>
      ))}
    </div>
  );
}

const emptyStyle = { fontSize: 11, color: '#6b6b8a', textAlign: 'center', marginTop: 20 };
const runCard = {
  background: '#12121e',
  border: '1px solid #1e1e3a',
  borderRadius: 5,
  padding: '7px 9px',
  marginBottom: 6,
};

export default function MissionControl({ workflowId }) {
  const [tab, setTab] = useState('memory');

  const tabs = [
    { id: 'memory', label: '🧠 Memory' },
    { id: 'runs',   label: '📋 Runs' },
  ];

  return (
    <div style={root}>
      <div style={header}>
        <span style={titleStyle}>Mission Control</span>
      </div>
      <div style={tabBar}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={tabBtn(tab === t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={body}>
        {tab === 'memory' && <MemoryPanel workflowId={workflowId} />}
        {tab === 'runs'   && <RunsTab workflowId={workflowId} />}
      </div>
    </div>
  );
}

const root = {
  background: '#0a0a0f',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  fontFamily: "'Geist', system-ui, sans-serif",
  color: '#e8e8f0',
};

const header = {
  padding: '10px 14px 6px',
  borderBottom: '1px solid #1a1a2e',
  flexShrink: 0,
};

const titleStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: '#a78bfa',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

const tabBar = {
  display: 'flex',
  gap: 2,
  padding: '6px 8px',
  borderBottom: '1px solid #1a1a2e',
  flexShrink: 0,
  background: '#0d0d18',
};

const tabBtn = (active) => ({
  background: active ? '#6d28d9' : 'transparent',
  border: 'none',
  borderRadius: 4,
  color: active ? '#fff' : '#6b6b8a',
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: active ? 600 : 400,
  padding: '4px 10px',
  transition: 'background 0.12s, color 0.12s',
});

const body = {
  flex: 1,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};
