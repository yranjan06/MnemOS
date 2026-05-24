import SchemaEditor from "./SchemaEditor";
import PromptInput from "./PromptInput";

const LLM_SUGGESTIONS = [
  "groq/llama-3.1-8b-instant",
  "groq/llama-3.3-70b-versatile",
  "groq/llama-3.1-70b-versatile",
  "gemini/gemini-2.5-flash",
  "gemini/gemini-2.5-pro",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "anthropic/claude-sonnet-4-5",
  "openrouter/google/gemini-flash-1.5",
];

const styles = {
  panel: {
    padding: 12,
    background: "#fff",
    height: "100%",
    overflowY: "auto",
    fontSize: 12,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { fontSize: 13, fontWeight: 700, color: "#1a1a1a" },
  badge: {
    fontSize: 10,
    padding: "2px 6px",
    borderRadius: 4,
    fontWeight: 600,
    color: "#fff",
  },
  closeBtn: {
    fontSize: 11,
    padding: "4px 10px",
    border: "1px solid #ddd",
    borderRadius: 4,
    background: "#fff",
    cursor: "pointer",
  },
  fieldGroup: { marginBottom: 10 },
  label: {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "#555",
    marginBottom: 3,
  },
  input: {
    width: "100%",
    fontSize: 12,
    padding: "5px 7px",
    border: "1px solid #ddd",
    borderRadius: 4,
    boxSizing: "border-box",
  },
  textarea: {
    width: "100%",
    fontSize: 12,
    padding: "5px 7px",
    border: "1px solid #ddd",
    borderRadius: 4,
    boxSizing: "border-box",
    minHeight: 60,
    fontFamily: "inherit",
    resize: "vertical",
  },
  codeArea: {
    width: "100%",
    fontSize: 11,
    padding: "5px 7px",
    border: "1px solid #ddd",
    borderRadius: 4,
    boxSizing: "border-box",
    minHeight: 80,
    fontFamily: "Consolas, monospace",
    resize: "vertical",
  },
  select: {
    width: "100%",
    fontSize: 12,
    padding: "5px 7px",
    border: "1px solid #ddd",
    borderRadius: 4,
    boxSizing: "border-box",
  },
  numberInput: {
    width: 70,
    fontSize: 12,
    padding: "5px 7px",
    border: "1px solid #ddd",
    borderRadius: 4,
  },
  kvRow: {
    display: "flex",
    gap: 4,
    marginBottom: 4,
    alignItems: "center",
  },
  kvInput: {
    flex: 1,
    fontSize: 11,
    padding: "3px 5px",
    border: "1px solid #ddd",
    borderRadius: 4,
  },
  kvAddBtn: {
    fontSize: 10,
    padding: "2px 6px",
    border: "1px solid #ccc",
    borderRadius: 4,
    background: "#fff",
    cursor: "pointer",
    marginTop: 4,
  },
  kvRemoveBtn: {
    fontSize: 10,
    padding: "2px 5px",
    border: "none",
    background: "transparent",
    color: "#999",
    cursor: "pointer",
  },
};

const TYPE_COLORS = {
  Do: "#2563eb",
  Navigate: "#059669",
  Check: "#d97706",
  Fill: "#7c3aed",
  Read: "#0891b2",
  Code: "#6b7280",
  Agent: "#7c3aed",
  Bootstrap: "#b45309",
  Remember: "#6d28d9",
  Recall: "#6d28d9",
  Recover: "#dc2626",
  Plan: "#0369a1",
};

const divider = { border: 'none', borderTop: '1px solid #f0f0f0', margin: '10px 0 6px' };
const sectionLabel = { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#bbb', marginBottom: 6 };

function KeyValueEditor({ data, onChange }) {
  const entries = Object.entries(data || {});

  function update(oldKey, newKey, newVal) {
    const updated = {};
    for (const [k, v] of entries) {
      if (k === oldKey) {
        updated[newKey] = newVal;
      } else {
        updated[k] = v;
      }
    }
    onChange(updated);
  }

  function add() {
    onChange({ ...data, "": "" });
  }

  function remove(key) {
    const updated = { ...data };
    delete updated[key];
    onChange(updated);
  }

  return (
    <div>
      {entries.map(([k, v], i) => (
        <div key={i} style={styles.kvRow}>
          <input
            style={styles.kvInput}
            placeholder="field label"
            value={k}
            onChange={(e) => update(k, e.target.value, v)}
          />
          <input
            style={styles.kvInput}
            placeholder="value"
            value={v}
            onChange={(e) => update(k, k, e.target.value)}
          />
          <button style={styles.kvRemoveBtn} onClick={() => remove(k)}>
            x
          </button>
        </div>
      ))}
      <button style={styles.kvAddBtn} onClick={add}>
        + Field
      </button>
    </div>
  );
}

function McpServersEditor({ servers, onChange }) {
  function addServer() {
    onChange([...servers, { transport: 'stdio', command: '', args: [], url: '' }]);
  }
  function removeServer(i) {
    onChange(servers.filter((_, idx) => idx !== i));
  }
  function updateServer(i, patch) {
    onChange(servers.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  }
  function updateArgs(i, rawText) {
    // Split comma-separated args
    const args = rawText.split(',').map(a => a.trim()).filter(Boolean);
    updateServer(i, { args });
  }

  return (
    <>
      <hr style={divider} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={sectionLabel}>MCP SERVERS</div>
        <button style={styles.kvAddBtn} onClick={addServer}>+ Add</button>
      </div>
      {servers.length === 0 && (
        <div style={{ fontSize: 10, color: '#bbb', marginBottom: 6 }}>No MCP servers. Click + Add to connect one.</div>
      )}
      {servers.map((srv, i) => (
        <div key={i} style={{ border: '1px solid #f0f0f0', borderRadius: 5, padding: '7px 8px', marginBottom: 7, background: '#fafafa' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <select
              style={{ ...styles.select, width: 90, padding: '3px 5px', fontSize: 11 }}
              value={srv.transport}
              onChange={e => updateServer(i, { transport: e.target.value })}
            >
              <option value="stdio">stdio</option>
              <option value="sse">SSE</option>
            </select>
            <button style={{ ...styles.kvRemoveBtn, fontSize: 12 }} onClick={() => removeServer(i)}>×</button>
          </div>
          {srv.transport === 'stdio' ? (
            <>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Command</label>
                <input style={styles.input} value={srv.command || ''} placeholder="e.g. npx" onChange={e => updateServer(i, { command: e.target.value })} />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Args (comma-separated)</label>
                <input style={styles.input} value={(srv.args || []).join(', ')} placeholder="-y, @modelcontextprotocol/server-filesystem, /workspace" onChange={e => updateArgs(i, e.target.value)} />
              </div>
            </>
          ) : (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>URL</label>
              <input style={styles.input} value={srv.url || ''} placeholder="http://localhost:8000/sse" onChange={e => updateServer(i, { url: e.target.value })} />
            </div>
          )}
        </div>
      ))}
    </>
  );
}

export default function NodeConfigPanel({ node, onUpdate, onClose, onDelete }) {
  if (!node) return null;

  // Handle both the raw backend node format (node.type) and the frontend format
  const nodeType = node.type || node.data?.nodeType;
  const config = node.config || node.data?.config || {};
  const schemaFields = (node.output_schema || node.data?.output_schema)?.fields || [];

  function updateConfig(key, value) {
    onUpdate({
      ...node,
      config: { ...config, [key]: value },
    });
  }

  function updateSchema(fields) {
    onUpdate({
      ...node,
      output_schema: fields.length > 0 ? { fields } : null,
    });
  }

  function updateLabel(label) {
    onUpdate({ ...node, label });
  }

  const showSchema = nodeType === "Read" || nodeType === "Do" || nodeType === "Agent";
  const showMaxSteps = nodeType !== "Code" && nodeType !== "ForEach" && nodeType !== "Bootstrap" && nodeType !== "Remember" && nodeType !== "Recall" && nodeType !== "Recover" && nodeType !== "Plan";
  const showExtraInfo = nodeType === "Do" || nodeType === "Navigate";

  return (
    <div style={styles.panel}>
      {/* Header: type badge + Done */}
      <div style={styles.header}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ ...styles.badge, background: TYPE_COLORS[nodeType] || "#888", alignSelf: 'flex-start' }}>
            {nodeType}
          </span>
          <span
            title="Use this ID to reference this node's output: {{node_id.field}}"
            style={{ fontSize: 9, color: '#bbb', fontFamily: 'monospace', cursor: 'default', userSelect: 'all' }}
          >
            {node.id}
          </span>
        </div>
        <button style={styles.closeBtn} onClick={onClose}>Done</button>
      </div>

      {/* Label */}
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Label</label>
        <input style={styles.input} value={node.label || ""} onChange={(e) => updateLabel(e.target.value)} />
      </div>

      <hr style={divider} />
      <div style={sectionLabel}>CONFIGURATION</div>

      {/* Type-specific fields */}
      {nodeType === "Navigate" && (
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Target URL</label>
          <input style={styles.input} value={config.target || ""} onChange={(e) => updateConfig("target", e.target.value)} placeholder="https://..." />
        </div>
      )}
      {nodeType === "Do" && (
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Task</label>
          <PromptInput
            label="Task"
            value={config.task || ""}
            onChange={(v) => updateConfig("task", v)}
            placeholder="Describe the action..."
          />
        </div>
      )}
      {nodeType === "Check" && (
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Condition</label>
          <PromptInput
            label="Condition"
            value={config.condition || ""}
            onChange={(v) => updateConfig("condition", v)}
            placeholder="Describe the condition to check..."
          />
        </div>
      )}
      {nodeType === "Fill" && (
        <>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Form target</label>
            <PromptInput
              label="Form target"
              value={config.target || ""}
              onChange={(v) => updateConfig("target", v)}
              placeholder="Describe which form to fill..."
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Data (field : value)</label>
            <KeyValueEditor data={config.data || {}} onChange={(d) => updateConfig("data", d)} />
          </div>
        </>
      )}
      {nodeType === "Read" && (
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Task</label>
          <PromptInput
            label="Task"
            value={config.task || ""}
            onChange={(v) => updateConfig("task", v)}
            placeholder="Describe what to extract..."
          />
        </div>
      )}
      {nodeType === "Code" && (
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Python code</label>
          <PromptInput
            label="Python code"
            language="python"
            value={config.code || ""}
            onChange={(v) => updateConfig("code", v)}
            placeholder="await asyncio.sleep(3)"
            minHeight={80}
          />
        </div>
      )}
      {nodeType === "Agent" && (
        <>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Class name</label>
            <input style={styles.input} value={config.class_name || ""} onChange={(e) => updateConfig("class_name", e.target.value)} placeholder="MyCustomVerb" />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Task</label>
            <input style={styles.input} value={config.task || ""} onChange={(e) => updateConfig("task", e.target.value)} placeholder="What to do at runtime..." />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Prompt template</label>
            <PromptInput
              label="Prompt template"
              value={config.prompt_template || ""}
              onChange={(v) => updateConfig("prompt_template", v)}
              placeholder={"Use {task} to refer to the runtime task.\nExample: Search for {task} and return the first result."}
            />
          </div>
        </>
      )}

      {nodeType === "ForEach" && (
        <>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Items expression</label>
            <PromptInput
              label="Items expression"
              language="python"
              value={config.items_expr || ''}
              onChange={(v) => updateConfig("items_expr", v)}
              placeholder={"open('/workspace/uploads/links.txt').read().splitlines()\n# or: ['url1', 'url2']\n# or: read_node_out.urls"}
              minHeight={70}
            />
            <span style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>Any Python expression returning an iterable. Use a Code node above for imports.</span>
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Loop variable name</label>
            <input
              style={styles.input}
              value={config.loop_var || 'item'}
              onChange={(e) => updateConfig("loop_var", e.target.value)}
              placeholder="item"
            />
            <span style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>Reference as {'{{item}}'} in downstream node targets and tasks</span>
          </div>
        </>
      )}

      {nodeType === "Bootstrap" && (
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Packages</label>
          <PromptInput
            label="Packages"
            value={config.packages || ''}
            onChange={(v) => updateConfig("packages", v)}
            placeholder={"ffmpeg\nimagemagick\nwkhtmltopdf"}
            minHeight={70}
          />
          <span style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>One package per line (or comma-separated). Runs apt-get install before the workflow starts.</span>
        </div>
      )}

      {nodeType === "Remember" && (
        <>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Key</label>
            <input style={styles.input} value={config.key || ""} onChange={(e) => updateConfig("key", e.target.value)} placeholder="e.g. product_price" />
            <span style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>Label for this memory entry in HydraDB.</span>
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Value</label>
            <PromptInput
              label="Value"
              value={config.value || ""}
              onChange={(v) => updateConfig("value", v)}
              placeholder={"What to store. Use {{node_id_out.field}} to pipe from a previous node."}
              minHeight={60}
            />
          </div>
        </>
      )}

      {nodeType === "Recall" && (
        <>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Query</label>
            <PromptInput
              label="Query"
              value={config.query || ""}
              onChange={(v) => updateConfig("query", v)}
              placeholder={"Natural language search — e.g. 'product price observation'"}
              minHeight={50}
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Top K results</label>
            <input style={styles.numberInput} type="number" min={1} max={20} value={config.top_k ?? 5} onChange={(e) => updateConfig("top_k", parseInt(e.target.value) || 5)} />
          </div>
        </>
      )}

      {nodeType === "Recover" && (
        <>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Action</label>
            <PromptInput
              label="Action"
              value={config.action || ""}
              onChange={(v) => updateConfig("action", v)}
              placeholder={"What the agent should try to do — e.g. 'Find and extract the book price on the page'"}
              minHeight={60}
            />
            <span style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>On failure, LLM queries memory for past errors and proposes an alternative approach, then retries.</span>
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Max retries</label>
            <input style={styles.numberInput} type="number" min={1} max={5} value={config.max_retries ?? 1} onChange={(e) => updateConfig("max_retries", parseInt(e.target.value) || 1)} />
          </div>
        </>
      )}

      {nodeType === "Plan" && (
        <>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Task</label>
            <PromptInput
              label="Task"
              value={config.task || ""}
              onChange={(v) => updateConfig("task", v)}
              placeholder={"Based on memory context, decide what to do next"}
              minHeight={60}
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Options (one per line)</label>
            <textarea
              style={styles.textarea}
              value={Array.isArray(config.options) ? config.options.join('\n') : (config.options || '')}
              onChange={(e) => updateConfig("options", e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
              placeholder={"alert_price_change\nlog_no_change\ninvestigate_further"}
            />
            <span style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>LLM picks one option based on memory context. Use snake_case.</span>
          </div>
        </>
      )}

      {(showMaxSteps || showExtraInfo) && (
        <>
          <hr style={divider} />
          <div style={sectionLabel}>ADVANCED</div>
          {showMaxSteps && (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Max steps</label>
              <input style={styles.numberInput} type="number" min={1} max={100} value={config.max_steps ?? ''} placeholder="unlimited" onChange={(e) => updateConfig("max_steps", e.target.value === '' ? null : parseInt(e.target.value) || null)} />
            </div>
          )}
          {showMaxSteps && (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Timeout (seconds)</label>
              <input style={styles.numberInput} type="number" min={10} value={config.timeout ?? ''} placeholder="none" onChange={(e) => updateConfig("timeout", e.target.value === '' ? null : parseInt(e.target.value) || null)} />
            </div>
          )}
          {showExtraInfo && (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Extra info (optional)</label>
              <PromptInput
                label="Extra info"
                value={config.extra_info || ""}
                onChange={(v) => updateConfig("extra_info", v)}
                placeholder="Advisory context for the agent..."
              />
            </div>
          )}

          {nodeType !== "Code" && nodeType !== "ForEach" && nodeType !== "Bootstrap" && (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>LLM override</label>
              <datalist id="node-llm-suggestions">
                {LLM_SUGGESTIONS.map(s => <option key={s} value={s} />)}
              </datalist>
              <input
                list="node-llm-suggestions"
                style={styles.input}
                value={config.llm || ""}
                onChange={(e) => updateConfig("llm", e.target.value || null)}
                placeholder="(use global)"
              />
            </div>
          )}
        </>
      )}

      {/* LLM override when ADVANCED section not shown (Check node) */}
      {!showMaxSteps && !showExtraInfo && nodeType !== "Code" && nodeType !== "Bootstrap" && (
        <>
          <hr style={divider} />
          <div style={sectionLabel}>ADVANCED</div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>LLM override</label>
            <select style={styles.select} value={config.llm || ""} onChange={(e) => updateConfig("llm", e.target.value || null)}>
              {LLM_SUGGESTIONS.map((m) => (<option key={m} value={m}>{m || "(use global)"}</option>))}
            </select>
          </div>
        </>
      )}

      {showSchema && (
        <>
          <hr style={divider} />
          <div style={sectionLabel}>OUTPUT SCHEMA</div>
          <SchemaEditor fields={schemaFields} onChange={updateSchema} />
        </>
      )}

      {/* MCP Servers — available for agent-like nodes */}
      {(nodeType === "Do" || nodeType === "Navigate" || nodeType === "Fill" || nodeType === "Read" || nodeType === "Check" || nodeType === "Agent") && nodeType !== "Bootstrap" && (
        <McpServersEditor
          servers={config.mcp_servers || []}
          onChange={(servers) => updateConfig("mcp_servers", servers.length > 0 ? servers : undefined)}
        />
      )}

      {/* Delete — full-width at bottom */}
      {onDelete && (
        <>
          <hr style={{ ...divider, marginTop: 14 }} />
          <button
            onClick={() => onDelete(node.id)}
            style={{ width: '100%', marginTop: 4, padding: '6px', borderRadius: 5, border: '1px solid #fca5a5', background: 'transparent', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
          >
            Delete node
          </button>
        </>
      )}
    </div>
  );
}
