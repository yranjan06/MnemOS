const ADD_NODES = [
  ['Navigate', '#c8c8c4'],
  ['Do', '#c8c8c4'],
  ['Check', '#c8c8c4'],
  ['Fill', '#c8c8c4'],
  ['Read', '#c8c8c4'],
  ['Code', '#888880'],
  ['Agent', '#c8c8c4'],
  ['ForEach', '#888880'],
  ['Bootstrap', '#888880'],
  ['Remember', '#d4f53c'],
  ['Recall', '#d4f53c'],
  ['Recover', '#d4f53c'],
  ['Plan', '#d4f53c'],
];

const TYPE_ICONS = {
  Navigate: '→', Do: '⚡', Check: '✓', Fill: '≡', Read: '»', Code: '</>', Agent: '◈', ForEach: '∀', Bootstrap: '↓',
  Remember: '●', Recall: '⟳', Recover: '↺', Plan: '⊞',
};

export default function WorkspaceToolbar({ onAddNode, onSave, onGenerate, onPreview, onStart, status, disabled, running }) {
  return (
    <div style={{ padding: '5px 10px 6px', display: 'flex', flexDirection: 'column', gap: 5, background: '#0f0f0f', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Add-node section */}
      <div>
        <div style={sectionLabel}>// NODES //</div>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {ADD_NODES.map(([type, color]) => (
            <button key={type} type="button" onClick={() => onAddNode(type)} style={addBtn(color)}>
              <span style={{ opacity: 0.6 }}>{TYPE_ICONS[type]}</span> {type}
            </button>
          ))}
        </div>
      </div>

      {/* Actions section */}
      <div>
        <div style={sectionLabel}>// ACTIONS //</div>
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
  letterSpacing: '0.1em',
  color: '#555550',
  marginBottom: 3,
};

const addBtn = (color) => ({
  padding: '3px 8px',
  borderRadius: 4,
  background: '#1c1c1c',
  border: '1px solid rgba(255,255,255,0.07)',
  color: '#888880',
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 500,
  lineHeight: 1.4,
  fontFamily: "'Courier New', monospace",
  transition: 'border-color 0.15s, color 0.15s',
});

const actionBtn = (disabled) => ({
  padding: '3px 8px',
  borderRadius: 4,
  background: 'transparent',
  border: `1px solid ${disabled ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)'}`,
  color: disabled ? '#3a3a3a' : '#888880',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 11,
  fontWeight: 500,
  lineHeight: 1.4,
  fontFamily: "'Courier New', monospace",
});

const runBtn = (running) => ({
  padding: '3px 10px',
  borderRadius: 4,
  background: '#d4f53c',
  border: 'none',
  color: '#0f0f0f',
  cursor: 'pointer',
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1.4,
  fontFamily: "'Courier New', monospace",
  letterSpacing: '0.02em',
  boxShadow: running ? '0 0 0 3px rgba(212,245,60,0.3)' : 'none',
});

function statusColor(status) {
  if (!status) return '#555550';
  const s = status.toLowerCase();
  if (s.includes('error') || s.includes('fail')) return '#ef4444';
  if (s.includes('success') || s.includes('saved') || s.includes('generated') || s.includes('loaded')) return '#d4f53c';
  return '#888880';
}
