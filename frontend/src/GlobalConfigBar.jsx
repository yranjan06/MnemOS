import { useEffect, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const LLM_SUGGESTIONS = [
  "groq/llama-3.1-8b-instant",
  "groq/llama-3.3-70b-versatile",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "anthropic/claude-sonnet-4-5",
  "gemini/gemini-2.5-flash",
  "ollama/llama3.2",
];

const inputStyle = {
  background: '#1c1c1c',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 4,
  color: '#f0f0ee',
  fontSize: 11,
  padding: '4px 8px',
  fontFamily: "'Courier New', monospace",
  outline: 'none',
};

const codeStyle = {
  background: '#1c1c1c',
  color: '#d4f53c',
  padding: '1px 5px',
  borderRadius: 3,
  fontFamily: "'Courier New', monospace",
  fontSize: 10,
};

function SecretsModal({ onClose }) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API}/secrets`)
      .then(r => r.json())
      .then(d => {
        setRows((d.keys || []).map(k => ({ key: k, value: '' })));
      })
      .catch(() => {});
  }, []);

  const update = (i, field, val) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  const remove = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));
  const add = () => setRows(prev => [...prev, { key: '', value: '' }]);

  const save = async () => {
    setSaving(true);
    await fetch(`${API}/secrets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secrets: rows.filter(r => r.key.trim()) }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)',
    }} onClick={onClose}>
      <div style={{
        background: '#0f0f0f',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        padding: 20,
        width: 420,
        boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Courier New', monospace",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#f0f0ee', letterSpacing: '0.02em' }}>// Secrets //</div>
            <div style={{ fontSize: 10, color: '#555550', marginTop: 3 }}>
              Reference as <code style={codeStyle}>{'{{secrets.KEY}}'}</code> in any node
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#555550', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, marginBottom: 12 }}>
          {rows.length === 0 && (
            <div style={{ fontSize: 11, color: '#3a3a3a', textAlign: 'center', padding: '20px 0' }}>
              No secrets yet. Add one below.
            </div>
          )}
          {rows.map((row, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 7, alignItems: 'center' }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                placeholder="KEY_NAME"
                value={row.key}
                onChange={e => update(i, 'key', e.target.value.toUpperCase().replace(/\s/g, '_'))}
              />
              <input
                type="password"
                style={{ ...inputStyle, flex: 1.5 }}
                placeholder={row.value === '' && row.key ? '(unchanged)' : 'value'}
                value={row.value}
                onChange={e => update(i, 'value', e.target.value)}
              />
              <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: '#3a3a3a', cursor: 'pointer', fontSize: 16, padding: '0 2px' }}>×</button>
            </div>
          ))}
        </div>

        <button
          onClick={add}
          style={{ width: '100%', padding: '6px', borderRadius: 5, border: '1px dashed rgba(255,255,255,0.1)', background: 'transparent', color: '#555550', fontSize: 11, cursor: 'pointer', marginBottom: 10, fontFamily: "'Courier New', monospace" }}
        >
          + Add secret
        </button>

        <button
          onClick={save}
          disabled={saving}
          style={{ width: '100%', padding: '8px', borderRadius: 6, border: 'none', background: saved ? '#1a2200' : '#d4f53c', color: saved ? '#d4f53c' : '#0f0f0f', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'background 0.2s', fontFamily: "'Courier New', monospace", letterSpacing: '0.03em' }}
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save secrets'}
        </button>
      </div>
    </div>
  );
}

function btnStyle(extra = {}) {
  return {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '3px 8px', borderRadius: 4,
    border: '1px solid rgba(255,255,255,0.1)',
    background: '#1c1c1c',
    fontSize: 11, color: '#888880', cursor: 'pointer', whiteSpace: 'nowrap',
    fontFamily: "'Courier New', monospace",
    transition: 'border-color 0.15s, color 0.15s',
    ...extra,
  };
}

function TriggersModal({ globalConfig, onChange, workflowId, onClose }) {
  const [tab, setTab] = useState('inputs');
  const inputs = globalConfig.inputs || [];
  const triggers = globalConfig.triggers || [];
  const cronTriggers = triggers.filter(t => t.type === 'cron');
  const webhookSecret = globalConfig.webhook_secret || '';
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${API}/webhook/${workflowId || '<workflow-id>'}`;

  const updateInputs = (newInputs) => onChange({ ...globalConfig, inputs: newInputs });
  const updateTriggers = (newTriggers) => onChange({ ...globalConfig, triggers: newTriggers });
  const updateWebhookSecret = (v) => onChange({ ...globalConfig, webhook_secret: v });

  const addInput = () => updateInputs([...inputs, { name: '', type: 'str', description: '' }]);
  const removeInput = (i) => updateInputs(inputs.filter((_, idx) => idx !== i));
  const updateInput = (i, field, val) => updateInputs(inputs.map((f, idx) => idx === i ? { ...f, [field]: val } : f));

  const addCron = () => updateTriggers([...triggers, { type: 'cron', cron: '0 9 * * *', enabled: true, inputs: {} }]);
  const removeCron = (i) => updateTriggers(cronTriggers.filter((_, idx) => idx !== i).map(t => ({ ...t })));
  const updateCron = (i, field, val) => {
    const updated = cronTriggers.map((t, idx) => idx === i ? { ...t, [field]: val } : t);
    updateTriggers(updated);
  };

  const exampleBody = inputs.length > 0
    ? JSON.stringify(Object.fromEntries(inputs.filter(f => f.name).map(f => [f.name, f.type === 'int' ? 0 : '...'])), null, 2)
    : '{}';

  const copy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const tabBtn = (key, label) => (
    <button onClick={() => setTab(key)} style={{
      padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer',
      fontSize: 11, fontWeight: tab === key ? 700 : 400,
      background: tab === key ? '#d4f53c' : 'transparent',
      color: tab === key ? '#0f0f0f' : '#555550',
      fontFamily: "'Courier New', monospace",
      letterSpacing: '0.02em',
    }}>{label}</button>
  );

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '20px 22px', width: 460, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,0.6)', fontFamily: "'Courier New', monospace" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#f0f0ee', letterSpacing: '0.02em' }}>// Triggers & Inputs //</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#555550', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 3, marginBottom: 16, background: '#1c1c1c', borderRadius: 6, padding: 3, border: '1px solid rgba(255,255,255,0.07)' }}>
          {tabBtn('inputs', 'Inputs')}
          {tabBtn('webhook', 'Webhook')}
          {tabBtn('cron', 'Schedule')}
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {tab === 'inputs' && (
            <div>
              <div style={{ fontSize: 11, color: '#555550', marginBottom: 12 }}>
                Declare runtime inputs. Reference as <code style={codeStyle}>{'{{inputs.name}}'}</code>
              </div>
              {inputs.length === 0 && <div style={{ fontSize: 11, color: '#3a3a3a', textAlign: 'center', padding: '16px 0' }}>No inputs declared.</div>}
              {inputs.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 7, alignItems: 'center' }}>
                  <input style={{ ...inputStyle, flex: 2 }}
                    placeholder="name" value={f.name}
                    onChange={e => updateInput(i, 'name', e.target.value.replace(/\s/g, '_'))} />
                  <select style={{ ...selectStyle, flex: 1 }}
                    value={f.type} onChange={e => updateInput(i, 'type', e.target.value)}>
                    <option value="str">str</option>
                    <option value="int">int</option>
                    <option value="float">float</option>
                    <option value="bool">bool</option>
                  </select>
                  <input style={{ ...inputStyle, flex: 3 }}
                    placeholder="description (optional)" value={f.description || ''}
                    onChange={e => updateInput(i, 'description', e.target.value)} />
                  <button onClick={() => removeInput(i)} style={{ background: 'none', border: 'none', color: '#3a3a3a', cursor: 'pointer', fontSize: 16, padding: '0 2px' }}>×</button>
                </div>
              ))}
              <button onClick={addInput} style={{ width: '100%', padding: '6px', borderRadius: 5, border: '1px dashed rgba(255,255,255,0.1)', background: 'transparent', color: '#555550', fontSize: 11, cursor: 'pointer', marginTop: 4, fontFamily: "'Courier New', monospace" }}>
                + Add input
              </button>
            </div>
          )}

          {tab === 'webhook' && (
            <div>
              <div style={{ fontSize: 11, color: '#555550', marginBottom: 10 }}>POST to this URL to trigger a run. Request body is passed as workflow inputs.</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <input readOnly value={webhookUrl} style={{ ...inputStyle, flex: 1, color: '#8aaa18' }} />
                <button onClick={copy} style={{ ...btnStyle(), padding: '4px 10px', color: copied ? '#d4f53c' : '#888880', borderColor: copied ? 'rgba(212,245,60,0.3)' : undefined }}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888880', marginBottom: 4, letterSpacing: '0.04em' }}>// EXAMPLE</div>
              <pre style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, padding: '10px 12px', fontSize: 10, fontFamily: "'Courier New', monospace", color: '#8aaa18', margin: 0, overflowX: 'auto' }}>
                {`curl -X POST ${webhookUrl} \\\n  -H "Content-Type: application/json" \\\n  -d '${exampleBody}'`}
              </pre>
              <div style={{ marginTop: 14, fontSize: 11, fontWeight: 700, color: '#888880', marginBottom: 4, letterSpacing: '0.04em' }}>// SECRET (optional)</div>
              <input
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                placeholder="X-MnemOS-Secret header value"
                value={webhookSecret}
                onChange={e => updateWebhookSecret(e.target.value)}
              />
            </div>
          )}

          {tab === 'cron' && (
            <div>
              <div style={{ fontSize: 11, color: '#555550', marginBottom: 12 }}>Schedules use standard cron syntax. Backend checks every minute.</div>
              {cronTriggers.length === 0 && <div style={{ fontSize: 11, color: '#3a3a3a', textAlign: 'center', padding: '16px 0' }}>No schedules yet.</div>}
              {cronTriggers.map((t, i) => (
                <div key={i} style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder="0 9 * * *"
                      value={t.cron}
                      onChange={e => updateCron(i, 'cron', e.target.value)}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#888880', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" checked={t.enabled} onChange={e => updateCron(i, 'enabled', e.target.checked)} />
                      Enabled
                    </label>
                    <button onClick={() => removeCron(i)} style={{ background: 'none', border: 'none', color: '#3a3a3a', cursor: 'pointer', fontSize: 16, padding: '0 2px' }}>×</button>
                  </div>
                  {inputs.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, color: '#555550', marginBottom: 4 }}>Default inputs (JSON)</div>
                      <textarea
                        style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 48 }}
                        placeholder={`{"${inputs[0]?.name || 'key'}": "value"}`}
                        value={typeof t.inputs === 'string' ? t.inputs : JSON.stringify(t.inputs || {}, null, 2)}
                        onChange={e => { try { updateCron(i, 'inputs', JSON.parse(e.target.value)); } catch { updateCron(i, 'inputs', e.target.value); } }}
                      />
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addCron} style={{ width: '100%', padding: '6px', borderRadius: 5, border: '1px dashed rgba(255,255,255,0.1)', background: 'transparent', color: '#555550', fontSize: 11, cursor: 'pointer', marginTop: 4, fontFamily: "'Courier New', monospace" }}>
                + Add schedule
              </button>
              <div style={{ marginTop: 12, fontSize: 10, color: '#3a3a3a' }}>
                Examples: <code style={codeStyle}>0 9 * * *</code> = daily 9am · <code style={codeStyle}>*/30 * * * *</code> = every 30min
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GlobalConfigBar({ globalConfig, onChange, backendAvailable, workflowId }) {
  const [showSecrets, setShowSecrets] = useState(false);
  const [showTriggers, setShowTriggers] = useState(false);

  return (
    <>
      <div style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#080810', flexShrink: 0 }}>
        {/* Backend status dot */}
        <span
          title={backendAvailable ? 'Backend connected' : 'Backend unreachable'}
          style={{ fontSize: 9, color: backendAvailable ? '#d4f53c' : '#ef4444', lineHeight: 1, flexShrink: 0 }}
          className={!backendAvailable ? 'status-blink' : undefined}
        >
          ●
        </span>

        <span style={{ fontSize: 10, fontWeight: 700, color: '#555550', whiteSpace: 'nowrap', letterSpacing: '0.06em', textTransform: 'uppercase' }}>LLM</span>
        <datalist id="global-llm-suggestions">
          {LLM_SUGGESTIONS.map(s => <option key={s} value={s} />)}
        </datalist>
        <input
          list="global-llm-suggestions"
          style={{
            background: '#1c1c1c',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4,
            color: '#8aaa18',
            fontSize: 11,
            padding: '3px 7px',
            flex: 1,
            minWidth: 0,
            fontFamily: "'Courier New', monospace",
            outline: 'none',
          }}
          value={globalConfig.llm}
          onChange={(e) => onChange({ ...globalConfig, llm: e.target.value })}
          placeholder="e.g. gemini/gemini-2.5-flash"
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555550', whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: "'Courier New', monospace" }}>
          <input
            type="checkbox"
            checked={globalConfig.human_in_the_loop}
            onChange={(e) => onChange({ ...globalConfig, human_in_the_loop: e.target.checked })}
          />
          Human review
        </label>

        <button onClick={() => setShowTriggers(true)} style={btnStyle()}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,245,60,0.3)'; e.currentTarget.style.color = '#d4f53c'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#888880'; }}>
          ⚡ Triggers
        </button>

        <button
          onClick={() => setShowSecrets(true)}
          title="Manage secrets"
          style={btnStyle()}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,245,60,0.3)'; e.currentTarget.style.color = '#d4f53c'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#888880'; }}
        >
          🔑 Secrets
        </button>
      </div>

      {showSecrets && <SecretsModal onClose={() => setShowSecrets(false)} />}
      {showTriggers && (
        <TriggersModal
          globalConfig={globalConfig}
          onChange={onChange}
          workflowId={workflowId}
          onClose={() => setShowTriggers(false)}
        />
      )}
    </>
  );
}
