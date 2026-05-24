const ADD_NODES = [
  ['Navigate', '#059669'],
  ['Do', '#2563eb'],
  ['Check', '#d97706'],
  ['Fill', '#7c3aed'],
  ['Read', '#0891b2'],
  ['Code', '#6b7280'],
  ['Agent', '#7c3aed'],
  ['ForEach', '#f59e0b'],
  ['Bootstrap', '#b45309'],
];

const TYPE_ICONS = {
  Navigate: '→', Do: '⚡', Check: '✓', Fill: '≡', Read: '»', Code: '</>', Agent: '◈', ForEach: '∀', Bootstrap: '↓',
};

export default function WorkspaceToolbar({ onAddNode, onSave, onGenerate, onPreview, onStart, status, disabled, running }) {
  return (
    <div style={{ padding: '5px 10px 6px', display: 'flex', flexDirection: 'column', gap: 5, background: '#fff', borderBottom: '1px solid #e5e4e0' }}>
      {/* Add-node section */}
      <div>
        <div style={sectionLabel}>NODES</div>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {ADD_NODES.map(([type, color]) => (
            <button key={type} type="button" onClick={() => onAddNode(type)} style={addBtn()}>
              <span style={{ opacity: 0.7 }}>{TYPE_ICONS[type]}</span> {type}
            </button>
          ))}
        </div>
      </div>

      {/* Actions section */}
      <div>
        <div style={sectionLabel}>ACTIONS</div>
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          <button type="button" onClick={onSave} disabled={disabled} style={actionBtn(disabled)}>Save</button>
          <button type="button" onClick={onGenerate} disabled={disabled} style={actionBtn(disabled)}>Generate</button>
          <button type="button" onClick={onPreview} disabled={disabled} style={actionBtn(disabled)}>Preview</button>
          <button type="button" onClick={onStart} style={runBtn(running)}>▶ Run</button>
          {status && (
            <span style={{ fontSize: 10, color: statusColor(status), marginLeft: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const sectionLabel = {
  fontSize: 9,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#bbb',
  marginBottom: 3,
};

const addBtn = () => ({
  padding: '3px 8px',
  borderRadius: 4,
  background: '#fff',
  border: '1px solid #e2e2e2',
  color: '#444',
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 500,
  lineHeight: 1.4,
});

const actionBtn = (disabled) => ({
  padding: '3px 8px',
  borderRadius: 4,
  background: 'transparent',
  border: `1px solid ${disabled ? '#e5e4e0' : '#d1d0cc'}`,
  color: disabled ? '#bbb' : '#444',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 11,
  fontWeight: 500,
  lineHeight: 1.4,
});

const runBtn = (running) => ({
  padding: '3px 9px',
  borderRadius: 4,
  background: '#059669',
  border: 'none',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1.4,
  boxShadow: running ? '0 0 0 3px #bbf7d0' : 'none',
});

function statusColor(status) {
  if (!status) return '#888';
  const s = status.toLowerCase();
  if (s.includes('error') || s.includes('fail')) return '#dc2626';
  if (s.includes('success') || s.includes('saved') || s.includes('generated') || s.includes('loaded')) return '#059669';
  return '#888';
}
