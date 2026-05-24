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

function SecretsModal({ onClose }) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${API}/secrets`)
      .then(r => r.json())
      .then(d => {
        // Pre-populate keys with blank values — values never returned from server
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
      background: 'rgba(0,0,0,0.35)',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: 20, width: 420,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1a1a' }}>Secrets</div>
            <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
              Reference in nodes as <code style={{ background: '#f4f3f0', padding: '1px 4px', borderRadius: 3 }}>{'{{secrets.KEY}}'}</code>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#aaa', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, marginBottom: 12 }}>
          {rows.length === 0 && (
            <div style={{ fontSize: 12, color: '#bbb', textAlign: 'center', padding: '20px 0' }}>
              No secrets yet. Add one below.
            </div>
          )}
          {rows.map((row, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 7, alignItems: 'center' }}>
              <input
                style={{ flex: 1, fontSize: 12, padding: '5px 8px', border: '1px solid #ddd', borderRadius: 5, fontFamily: 'Consolas, monospace' }}
                placeholder="KEY_NAME"
                value={row.key}
                onChange={e => update(i, 'key', e.target.value.toUpperCase().replace(/\s/g, '_'))}
              />
              <input
                type="password"
                style={{ flex: 1.5, fontSize: 12, padding: '5px 8px', border: '1px solid #ddd', borderRadius: 5 }}
                placeholder={row.value === '' && row.key ? '(unchanged)' : 'value'}
                value={row.value}
                onChange={e => update(i, 'value', e.target.value)}
              />
              <button onClick={() => remove(i)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 15, padding: '0 2px' }}>×</button>
            </div>
          ))}
        </div>

        <button
          onClick={add}
          style={{ width: '100%', padding: '6px', borderRadius: 6, border: '1px dashed #ddd', background: 'transparent', color: '#888', fontSize: 12, cursor: 'pointer', marginBottom: 10 }}
        >
          + Add secret
        </button>

        <button
          onClick={save}
          disabled={saving}
          style={{ width: '100%', padding: '8px', borderRadius: 7, border: 'none', background: saved ? '#22c55e' : '#1a1a1a', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
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
    padding: '3px 8px', borderRadius: 5,
    border: '1px solid #ddd', background: '#fafafa',
    fontSize: 11, color: '#555', cursor: 'pointer', whiteSpace: 'nowrap',
    ...extra,
  };
}

function TriggersModal({ globalConfig, onChange, workflowId, onClose }) {
  const [tab, setTab] = useState('inputs'); // 'inputs' | 'webhook' | 'cron'
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
      padding: '4px 10px', borderRadius: 5, border: 'none', cursor: 'pointer',
      fontSize: 11, fontWeight: tab === key ? 700 : 400,
      background: tab === key ? '#1a1a1a' : 'transparent',
      color: tab === key ? '#fff' : '#888',
    }}>{label}</button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', width: 460, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Triggers & Inputs</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#aaa', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#f4f3f0', borderRadius: 7, padding: 3 }}>
          {tabBtn('inputs', 'Inputs')}
          {tabBtn('webhook', 'Webhook')}
          {tabBtn('cron', 'Schedule')}
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {/* ── INPUTS TAB ── */}
          {tab === 'inputs' && (
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>
                Declare runtime inputs. Reference them in any node as <code style={{ background: '#f4f3f0', padding: '1px 4px', borderRadius: 3 }}>{'{{inputs.name}}'}</code>
              </div>
              {inputs.length === 0 && <div style={{ fontSize: 12, color: '#bbb', textAlign: 'center', padding: '16px 0' }}>No inputs declared.</div>}
              {inputs.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 7, alignItems: 'center' }}>
                  <input style={{ flex: 2, fontSize: 11, padding: '4px 7px', border: '1px solid #ddd', borderRadius: 5, fontFamily: 'Consolas, monospace' }}
                    placeholder="name" value={f.name}
                    onChange={e => updateInput(i, 'name', e.target.value.replace(/\s/g, '_'))} />
                  <select style={{ flex: 1, fontSize: 11, padding: '4px 5px', border: '1px solid #ddd', borderRadius: 5 }}
                    value={f.type} onChange={e => updateInput(i, 'type', e.target.value)}>
                    <option value="str">str</option>
                    <option value="int">int</option>
                    <option value="float">float</option>
                    <option value="bool">bool</option>
                  </select>
                  <input style={{ flex: 3, fontSize: 11, padding: '4px 7px', border: '1px solid #ddd', borderRadius: 5 }}
                    placeholder="description (optional)" value={f.description || ''}
                    onChange={e => updateInput(i, 'description', e.target.value)} />
                  <button onClick={() => removeInput(i)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 15, padding: '0 2px' }}>×</button>
                </div>
              ))}
              <button onClick={addInput} style={{ width: '100%', padding: '6px', borderRadius: 6, border: '1px dashed #ddd', background: 'transparent', color: '#888', fontSize: 11, cursor: 'pointer', marginTop: 4 }}>
                + Add input
              </button>
            </div>
          )}

          {/* ── WEBHOOK TAB ── */}
          {tab === 'webhook' && (
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>POST to this URL to trigger a run. The request body is passed as workflow inputs.</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <input readOnly value={webhookUrl} style={{ flex: 1, fontSize: 11, padding: '5px 8px', border: '1px solid #ddd', borderRadius: 5, background: '#fafaf9', fontFamily: 'Consolas, monospace', color: '#333' }} />
                <button onClick={copy} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid #ddd', background: copied ? '#f0fdf4' : '#fff', fontSize: 11, color: copied ? '#166534' : '#555', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>Example</div>
              <pre style={{ background: '#f4f3f0', borderRadius: 6, padding: '10px 12px', fontSize: 10, fontFamily: 'Consolas, monospace', color: '#333', margin: 0, overflowX: 'auto' }}>
                {`curl -X POST ${webhookUrl} \\\n  -H "Content-Type: application/json" \\\n  -d '${exampleBody}'`}
              </pre>
              <div style={{ marginTop: 14, fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>Secret (optional)</div>
              <input
                style={{ width: '100%', fontSize: 11, padding: '5px 8px', border: '1px solid #ddd', borderRadius: 5, boxSizing: 'border-box', fontFamily: 'Consolas, monospace' }}
                placeholder="Set a secret — send as X-MnemOS-Secret header"
                value={webhookSecret}
                onChange={e => updateWebhookSecret(e.target.value)}
              />
            </div>
          )}

          {/* ── CRON TAB ── */}
          {tab === 'cron' && (
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>Schedules use standard cron syntax. The backend checks every minute.</div>
              {cronTriggers.length === 0 && <div style={{ fontSize: 12, color: '#bbb', textAlign: 'center', padding: '16px 0' }}>No schedules yet.</div>}
              {cronTriggers.map((t, i) => (
                <div key={i} style={{ border: '1px solid #e5e4e0', borderRadius: 7, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <input
                      style={{ flex: 1, fontSize: 11, padding: '4px 7px', border: '1px solid #ddd', borderRadius: 5, fontFamily: 'Consolas, monospace' }}
                      placeholder="0 9 * * *"
                      value={t.cron}
                      onChange={e => updateCron(i, 'cron', e.target.value)}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" checked={t.enabled} onChange={e => updateCron(i, 'enabled', e.target.checked)} />
                      Enabled
                    </label>
                    <button onClick={() => removeCron(i)} style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 15, padding: '0 2px' }}>×</button>
                  </div>
                  {inputs.length > 0 && (
                    <div>
                      <div style={{ fontSize: 10, color: '#aaa', marginBottom: 4 }}>Default inputs (JSON)</div>
                      <textarea
                        style={{ width: '100%', fontSize: 10, padding: '4px 7px', border: '1px solid #ddd', borderRadius: 5, fontFamily: 'Consolas, monospace', boxSizing: 'border-box', resize: 'vertical', minHeight: 48 }}
                        placeholder={`{"${inputs[0]?.name || 'key'}": "value"}`}
                        value={typeof t.inputs === 'string' ? t.inputs : JSON.stringify(t.inputs || {}, null, 2)}
                        onChange={e => { try { updateCron(i, 'inputs', JSON.parse(e.target.value)); } catch { updateCron(i, 'inputs', e.target.value); } }}
                      />
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addCron} style={{ width: '100%', padding: '6px', borderRadius: 6, border: '1px dashed #ddd', background: 'transparent', color: '#888', fontSize: 11, cursor: 'pointer', marginTop: 4 }}>
                + Add schedule
              </button>
              <div style={{ marginTop: 12, fontSize: 10, color: '#bbb' }}>
                Examples: <code style={{ background: '#f4f3f0', padding: '1px 3px', borderRadius: 2 }}>0 9 * * *</code> = daily 9am · <code style={{ background: '#f4f3f0', padding: '1px 3px', borderRadius: 2 }}>*/30 * * * *</code> = every 30min · <code style={{ background: '#f4f3f0', padding: '1px 3px', borderRadius: 2 }}>0 9 * * 1</code> = every Monday 9am
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
      <div style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #e5e4e0', background: '#fff', flexShrink: 0 }}>
        {/* Backend status dot */}
        <span
          title={backendAvailable ? 'Backend connected' : 'Backend unreachable'}
          style={{ fontSize: 9, color: backendAvailable ? '#22c55e' : '#ef4444', lineHeight: 1, flexShrink: 0 }}
        >
          ●
        </span>

        <span style={{ fontSize: 11, fontWeight: 600, color: '#555', whiteSpace: 'nowrap' }}>LLM</span>
        <datalist id="global-llm-suggestions">
          {LLM_SUGGESTIONS.map(s => <option key={s} value={s} />)}
        </datalist>
        <input
          list="global-llm-suggestions"
          style={{ fontSize: 11, padding: '3px 6px', borderRadius: 5, border: '1px solid #ddd', flex: 1, minWidth: 0 }}
          value={globalConfig.llm}
          onChange={(e) => onChange({ ...globalConfig, llm: e.target.value })}
          placeholder="e.g. gemini-2.5-flash or openai/gpt-4o"
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#555', whiteSpace: 'nowrap', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={globalConfig.human_in_the_loop}
            onChange={(e) => onChange({ ...globalConfig, human_in_the_loop: e.target.checked })}
          />
          Human review
        </label>

        <button onClick={() => setShowTriggers(true)} style={btnStyle()}
          onMouseEnter={e => { e.currentTarget.style.background = '#f0f0f0'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fafafa'; }}>
          ⚡ Triggers
        </button>

        <button
          onClick={() => setShowSecrets(true)}
          title="Manage secrets"
          style={btnStyle()}
          onMouseEnter={e => { e.currentTarget.style.background = '#f0f0f0'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fafafa'; }}
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
