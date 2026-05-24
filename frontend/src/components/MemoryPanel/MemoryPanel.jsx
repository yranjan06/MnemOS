import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function MemoryPanel({ workflowId }) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState(null);

  const fetchMemories = useCallback(async () => {
    if (!workflowId) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/memory?workflow_id=${encodeURIComponent(workflowId)}`);
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch {
      // backend may not be up yet
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    fetchMemories();
    const t = setInterval(fetchMemories, 4000);
    return () => clearInterval(t);
  }, [fetchMemories]);

  const filtered = filter
    ? memories.filter(m =>
        (m.key || '').toLowerCase().includes(filter.toLowerCase()) ||
        (m.value || '').toLowerCase().includes(filter.toLowerCase())
      )
    : memories;

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.icon}>🧠</span>
          <span style={styles.title}>Agent Memory</span>
          {!workflowId && (
            <span style={styles.badge('#6b6b8a')}>no workflow</span>
          )}
          {workflowId && (
            <span style={styles.badge('#6d28d9')}>{memories.length}</span>
          )}
        </div>
        <button onClick={fetchMemories} style={styles.refreshBtn} title="Refresh">
          ↻
        </button>
      </div>

      {workflowId && memories.length > 4 && (
        <div style={styles.filterRow}>
          <input
            style={styles.filterInput}
            placeholder="filter memories…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>
      )}

      <div style={styles.list}>
        {!workflowId && (
          <p style={styles.empty}>Select a workflow to view its memory.</p>
        )}
        {workflowId && loading && memories.length === 0 && (
          <p style={styles.empty}>Loading…</p>
        )}
        {workflowId && !loading && memories.length === 0 && (
          <p style={styles.empty}>No memories yet. Run a workflow with Remember nodes.</p>
        )}
        {filtered.map((m, i) => {
          const isOpen = expanded === i;
          return (
            <div
              key={i}
              style={{ ...styles.item(m.key), cursor: 'pointer', transition: 'border-color 0.15s' }}
              onClick={() => setExpanded(isOpen ? null : i)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={styles.itemKey}>{m.key || '—'}</div>
                <span style={{ fontSize: 10, color: '#6b6b8a', lineHeight: 1 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
              {isOpen ? (
                <div style={{ ...styles.itemValue, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {m.value}
                </div>
              ) : (
                <div style={{
                  ...styles.itemValue,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {m.value}
                </div>
              )}
              {isOpen && m.score !== undefined && m.score > 0 && (
                <div style={{ ...styles.itemMeta, marginTop: 6, paddingTop: 6, borderTop: '1px solid #1e1e3a' }}>
                  relevance {(m.score * 100).toFixed(0)}%
                  {m.created_at ? ` · ${m.created_at.slice(0, 16)}` : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function styles_badge(color) {
  return {
    fontSize: 10, fontWeight: 600,
    background: color + '22',
    color,
    padding: '1px 6px',
    borderRadius: 999,
    marginLeft: 6,
  };
}

const styles = {
  root: {
    background: '#0a0a0f',
    border: '1px solid #1a1a2e',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    fontFamily: "'Geist Mono', 'Fira Code', monospace",
    color: '#e8e8f0',
    fontSize: 12,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px 8px',
    borderBottom: '1px solid #1a1a2e',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  icon: { fontSize: 14 },
  title: { fontWeight: 600, fontSize: 12, color: '#a78bfa' },
  badge: (color) => ({
    fontSize: 10, fontWeight: 600,
    background: color + '22',
    color,
    padding: '1px 6px',
    borderRadius: 999,
  }),
  refreshBtn: {
    background: 'none',
    border: 'none',
    color: '#6b6b8a',
    cursor: 'pointer',
    fontSize: 14,
    lineHeight: 1,
    padding: '2px 4px',
    borderRadius: 4,
  },
  filterRow: {
    padding: '6px 12px',
    borderBottom: '1px solid #1a1a2e',
    flexShrink: 0,
  },
  filterInput: {
    width: '100%',
    background: '#12121e',
    border: '1px solid #2a2a4e',
    borderRadius: 4,
    color: '#e8e8f0',
    fontSize: 11,
    padding: '4px 8px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    outline: 'none',
  },
  list: {
    overflowY: 'auto',
    flex: 1,
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  empty: {
    fontSize: 11,
    color: '#6b6b8a',
    textAlign: 'center',
    marginTop: 20,
  },
  item: (key) => ({
    background: '#12121e',
    border: '1px solid #1e1e3a',
    borderLeft: `3px solid ${key?.startsWith('failure:') ? '#dc2626' : key?.startsWith('recovery:') ? '#0d9488' : '#6d28d9'}`,
    borderRadius: 5,
    padding: '7px 9px',
  }),
  itemKey: {
    fontSize: 10,
    fontWeight: 700,
    color: '#a78bfa',
    marginBottom: 3,
    letterSpacing: '0.02em',
  },
  itemValue: {
    fontSize: 11,
    color: '#c4c4d4',
    wordBreak: 'break-word',
    lineHeight: 1.5,
  },
  itemMeta: {
    fontSize: 9,
    color: '#6b6b8a',
    marginTop: 4,
  },
};
