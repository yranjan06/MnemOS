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

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus rename input when editing
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
    if (workflows.length <= 1) return; // can't delete last
    if (!window.confirm(`Delete "${current?.name}"? This cannot be undone.`)) return;
    await onDelete(currentId);
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderBottom: '1px solid #e5e4e0', background: '#fafaf9', flexShrink: 0 }}>
      {/* Current workflow name — click to open dropdown, double-click to rename */}
      <div ref={dropdownRef} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        {renaming ? (
          <input
            ref={renameRef}
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false); }}
            style={{ width: '100%', fontSize: 12, fontWeight: 600, padding: '2px 6px', border: '1px solid #1a1a1a', borderRadius: 5, outline: 'none', background: '#fff', boxSizing: 'border-box' }}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <button
              onClick={() => setOpen(o => !o)}
              title="Switch workflow"
              style={{
                display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0,
                background: 'none', border: 'none', padding: '2px 4px',
                borderRadius: 5, cursor: 'pointer', textAlign: 'left',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#888" strokeWidth="1.5">
                <rect x="1" y="1" width="8" height="5" rx="1"/>
                <path d="M3 8h4"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {current?.name || 'Untitled'}
              </span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#888" strokeWidth="1.5">
                <path d="M2 3.5l3 3 3-3"/>
              </svg>
            </button>
            <button
              onClick={startRename}
              title="Rename workflow"
              style={{ background: 'none', border: 'none', padding: '2px 4px', borderRadius: 4, cursor: 'pointer', color: '#bbb', display: 'flex', alignItems: 'center', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.color = '#555'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#bbb'; }}
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
            background: '#fff', border: '1px solid #e5e4e0', borderRadius: 8,
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 220, maxHeight: 240,
            overflowY: 'auto', marginTop: 4,
          }}>
            {workflows.map(w => (
              <button
                key={w.id}
                onClick={() => { onSelect(w.id); setOpen(false); }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', padding: '7px 12px', background: w.id === currentId ? '#f4f3f0' : 'none',
                  border: 'none', cursor: 'pointer', textAlign: 'left', gap: 8,
                }}
                onMouseEnter={e => { if (w.id !== currentId) e.currentTarget.style.background = '#fafaf9'; }}
                onMouseLeave={e => { if (w.id !== currentId) e.currentTarget.style.background = 'none'; }}
              >
                <span style={{ fontSize: 12, fontWeight: w.id === currentId ? 600 : 400, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {w.name}
                </span>
                <span style={{ fontSize: 10, color: '#aaa', whiteSpace: 'nowrap', flexShrink: 0 }}>
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
        style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: 5, border: '1px solid #ddd', background: '#fff', fontSize: 11, color: '#555', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
        onMouseEnter={e => { e.currentTarget.style.background = '#f4f3f0'; }}
        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 1v8M1 5h8"/>
        </svg>
        New
      </button>

      {/* Delete button — hidden if only one workflow */}
      {workflows.length > 1 && (
        <button
          onClick={handleDelete}
          title="Delete workflow"
          style={{ display: 'flex', alignItems: 'center', padding: '3px 6px', borderRadius: 5, border: '1px solid #fca5a5', background: '#fff5f5', color: '#dc2626', cursor: 'pointer', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff5f5'; }}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1.5 3h8M4 3V2h3v1M2.5 3l.5 7h5l.5-7"/>
          </svg>
        </button>
      )}
    </div>
  );
}
