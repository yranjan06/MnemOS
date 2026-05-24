import { useEffect, useRef, useState } from 'react';

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function WorkflowSelector({
  workflows,
  currentId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
}) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const renameRef = useRef(null);
  const dropdownRef = useRef(null);

  const current = workflows.find(w => w.id === currentId);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (renaming) renameRef.current?.focus();
  }, [renaming]);

  const startRename = (e) => {
    e.stopPropagation();
    setRenameVal(current?.name || '');
    setRenaming(true);
  };

  const commitRename = async () => {
    const name = renameVal.trim();
    if (name && name !== current?.name) await onRename(currentId, name);
    setRenaming(false);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (workflows.length <= 1) return;
    if (!window.confirm(`Delete "${current?.name}"? This cannot be undone.`)) return;
    await onDelete(currentId);
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#0f0f0f', flexShrink: 0, fontFamily: "'Courier New', monospace" }}>
      <div ref={dropdownRef} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        {renaming ? (
          <input
            ref={renameRef}
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false); }}
            style={{ width: '100%', fontSize: 12, fontWeight: 700, padding: '2px 6px', background: '#1c1c1c', border: '1px solid rgba(212,245,60,0.3)', borderRadius: 4, outline: 'none', color: '#f0f0ee', boxSizing: 'border-box', fontFamily: "'Courier New', monospace" }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <button
              onClick={() => setOpen(o => !o)}
              title="Switch workflow"
              style={{
                display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0,
                background: 'none', border: 'none', padding: '2px 4px',
                borderRadius: 4, cursor: 'pointer', textAlign: 'left', fontFamily: "'Courier New', monospace",
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#555550" strokeWidth="1.5">
                <rect x="1" y="1" width="8" height="5" rx="1"/>
                <path d="M3 8h4"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f0f0ee', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
                {current?.name || 'Untitled'}
              </span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#555550" strokeWidth="1.5">
                <path d="M2 3.5l3 3 3-3"/>
              </svg>
            </button>
            <button
              onClick={startRename}
              title="Rename workflow"
              style={{ background: 'none', border: 'none', padding: '2px 4px', borderRadius: 4, cursor: 'pointer', color: '#3a3a3a', display: 'flex', alignItems: 'center', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#888880'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#3a3a3a'; }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M7.5 1.5l2 2-6 6H1.5v-2l6-6z"/>
              </svg>
            </button>
          </div>
        )}

        {/* Dropdown */}
        {open && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, zIndex: 200,
            background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 220, maxHeight: 240,
            overflowY: 'auto', marginTop: 4,
          }}>
            {workflows.map(w => (
              <button
                key={w.id}
                onClick={() => { onSelect(w.id); setOpen(false); }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', padding: '7px 12px',
                  background: w.id === currentId ? '#1a2200' : 'none',
                  border: 'none', cursor: 'pointer', textAlign: 'left', gap: 8,
                  fontFamily: "'Courier New', monospace",
                }}
                onMouseEnter={e => { if (w.id !== currentId) e.currentTarget.style.background = '#1c1c1c'; }}
                onMouseLeave={e => { if (w.id !== currentId) e.currentTarget.style.background = 'none'; }}
              >
                <span style={{ fontSize: 11, fontWeight: w.id === currentId ? 700 : 400, color: w.id === currentId ? '#d4f53c' : '#888880', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {w.name}
                </span>
                <span style={{ fontSize: 10, color: '#3a3a3a', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {timeAgo(w.updated)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New workflow button */}
      <button
        onClick={onCreate}
        title="New workflow"
        style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', fontSize: 11, color: '#555550', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: "'Courier New', monospace" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,245,60,0.3)'; e.currentTarget.style.color = '#d4f53c'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#555550'; }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 1v8M1 5h8"/>
        </svg>
        New
      </button>

      {/* Delete button */}
      {workflows.length > 1 && (
        <button
          onClick={handleDelete}
          title="Delete workflow"
          style={{ display: 'flex', alignItems: 'center', padding: '3px 6px', borderRadius: 4, border: '1px solid rgba(239,68,68,0.25)', background: 'transparent', color: '#3a3a3a', cursor: 'pointer', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#3a3a3a'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1.5 3h8M4 3V2h3v1M2.5 3l.5 7h5l.5-7"/>
          </svg>
        </button>
      )}
    </div>
  );
}
