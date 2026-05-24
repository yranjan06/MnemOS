import { useEffect, useRef, useState } from 'react';
import imageDoc from './assets/image-doc.png';

/* â”€â”€ Sidebar topics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const TOPICS = [
  { id: 'quickstart',   label: 'Quick Start' },
  { id: 'workflows',    label: 'Workflows' },
  { id: 'nodes',        label: 'Nodes' },
  { id: 'connections',  label: 'Connections' },
  { id: 'nodeconfig',   label: 'Node Config' },
  { id: 'schema',       label: 'Output Schema' },
  { id: 'data',         label: 'Passing Data' },
  { id: 'inputs',       label: 'Workflow Inputs' },
  { id: 'triggers',     label: 'Triggers' },
  { id: 'secrets',      label: 'Secrets' },
  { id: 'mcp',          label: 'MCP Servers' },
  { id: 'code',         label: 'Code Node' },
  { id: 'files',        label: 'Files' },
  { id: 'runs',         label: 'Run History' },
  { id: 'llm',          label: 'Multi-LLM' },
  { id: 'selfhost',     label: 'Self-hosting' },
  { id: 'bootstrap',    label: 'Bootstrap' },
  { id: 'advanced',     label: 'Advanced' },
];

/* â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const s = {
  root: { height: '100%', display: 'flex', background: '#000', overflow: 'hidden' },
  sidebar: {
    width: 184,
    flexShrink: 0,
    borderRight: '1px solid rgba(255,255,255,0.06)',
    overflowY: 'auto',
    padding: '28px 0 40px',
    background: '#000',
  },
  sidebarLabel: {
    fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)',
    padding: '0 18px', marginBottom: 8,
  },
  sideLink: (active) => ({
    display: 'block', padding: '5px 18px',
    fontSize: 11.5, fontWeight: active ? 700 : 400,
    color: active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
    background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
    borderLeft: active ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent',
    cursor: 'pointer', textDecoration: 'none',
    transition: 'all 0.1s', whiteSpace: 'nowrap',
    fontFamily: "'Courier New', monospace",
  }),
  content: {
    flex: 1, overflowY: 'auto',
    padding: '48px 52px 80px',
    fontFamily: "'Courier New', Courier, monospace",
    color: 'rgba(255,255,255,0.7)', lineHeight: 1.65,
    maxWidth: 820,
  },
  h1: { fontSize: 24, fontWeight: 700, letterSpacing: '-0.3px', marginBottom: 6, color: '#fff' },
  lead: { fontSize: 13, color: 'rgba(255,255,255,0.28)', marginBottom: 36 },
  h2: { fontSize: 15, fontWeight: 700, letterSpacing: '0.02em', marginTop: 56, marginBottom: 12, scrollMarginTop: 24, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' },
  h3: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginTop: 28, marginBottom: 8 },
  p: { fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginBottom: 10 },
  hr: { border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '44px 0 0' },
  ul: { paddingLeft: 20, marginBottom: 12 },
  li: { fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginBottom: 5 },
  code: {
    fontFamily: "'Courier New', monospace", fontSize: 11,
    background: 'rgba(255,255,255,0.06)', padding: '1px 5px', color: 'rgba(255,255,255,0.75)',
  },
  pre: {
    fontFamily: "'Courier New', monospace", fontSize: 11,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    padding: '14px 16px',
    overflowX: 'auto', marginBottom: 12,
    lineHeight: 1.7, color: 'rgba(255,255,255,0.65)',
  },
  tip: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
    padding: '10px 14px',
    fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 12,
  },
  warn: {
    background: 'rgba(255,200,50,0.04)', border: '1px solid rgba(255,200,50,0.15)',
    padding: '10px 14px',
    fontSize: 12, color: 'rgba(255,200,100,0.6)', marginBottom: 12,
  },
  info: {
    background: 'rgba(100,180,255,0.04)', border: '1px solid rgba(100,180,255,0.12)',
    padding: '10px 14px',
    fontSize: 12, color: 'rgba(120,180,255,0.6)', marginBottom: 12,
  },
  nodeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 },
  nodeCard: { border: '1px solid rgba(255,255,255,0.07)', padding: '12px 14px', background: 'rgba(255,255,255,0.02)' },
  nodeLabel: { fontSize: 12, fontWeight: 700, marginBottom: 3, color: 'rgba(255,255,255,0.75)' },
  nodeDesc: { fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 },
  badge: {
    display: 'inline-block', fontSize: 9, fontWeight: 700,
    padding: '2px 6px', marginRight: 5, verticalAlign: 'middle',
  },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 12 },
  th: { textAlign: 'left', padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 700, fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  td: { padding: '7px 10px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', verticalAlign: 'top' },
};

/* â”€â”€ Small helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const C = ({ children }) => <code style={s.code}>{children}</code>;

const NodeCard = ({ icon, name, color, children }) => (
  <div style={s.nodeCard}>
    <div style={s.nodeLabel}>
      <span style={{ ...s.badge, background: color + '18', color }}>{icon}</span>{name}
    </div>
    <div style={s.nodeDesc}>{children}</div>
  </div>
);

const EdgeRow = ({ color, label, children }) => (
  <div style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
    <span style={{ flexShrink: 0, marginTop: 3, display: 'inline-block', width: 28, height: 3, background: color, borderRadius: 2 }} />
    <div>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{label} â€” </span>
      <span style={{ fontSize: 13, color: '#555' }}>{children}</span>
    </div>
  </div>
);

const Section = ({ id, title, children }) => (
  <>
    <hr style={s.hr} />
    <h2 id={id} style={s.h2}>{title}</h2>
    {children}
  </>
);

const Step = ({ n, title, children }) => (
  <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
    <div style={{
      flexShrink: 0, width: 26, height: 26, borderRadius: 7,
      background: '#1a1a1a', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, marginTop: 1,
    }}>{n}</div>
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#555' }}>{children}</div>
    </div>
  </div>
);

/* â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function DocsPanel() {
  const [active, setActive] = useState('quickstart');
  const contentRef = useRef(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const headings = TOPICS.map(t => document.getElementById(t.id)).filter(Boolean);
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id); }),
      { root: el, rootMargin: '-15% 0px -72% 0px', threshold: 0 }
    );
    headings.forEach(h => obs.observe(h));
    return () => obs.disconnect();
  }, []);

  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div style={s.root}>

      {/* â”€â”€ Sidebar â”€â”€ */}
      <nav style={s.sidebar}>
        <div style={s.sidebarLabel}>Docs</div>
        {TOPICS.map(t => (
          <a key={t.id} style={s.sideLink(active === t.id)} onClick={() => scrollTo(t.id)}>
            {t.label}
          </a>
        ))}
      </nav>

      {/* â”€â”€ Content â”€â”€ */}
      <div style={s.content} ref={contentRef}>

        <h1 style={s.h1}>MnemOS</h1>
        <p style={s.lead}>
          Self-hosted visual workflow builder for browser AI agents. Connect nodes, run the agent, watch it work in real time â€” then schedule it to run while you sleep.
        </p>

        <img src={imageDoc} alt="Example workflow"
          style={{ width: '100%', borderRadius: 10, border: '1px solid #e5e4e0', marginBottom: 6, display: 'block' }} />
        <p style={{ fontSize: 11, color: '#aaa', marginBottom: 40, textAlign: 'center' }}>An example multi-step workflow</p>

        {/* â”€â”€ QUICK START â”€â”€ */}
        <h2 id="quickstart" style={{ ...s.h2, marginTop: 0 }}>Quick Start</h2>
        <Step n={1} title="Add your API key">
          Open <strong>Secrets</strong> (key icon in the global config bar). Add <C>GEMINI_API_KEY</C> from <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>Google AI Studio</a>. The model defaults to <C>gemini-3-flash-preview</C> â€” change it in the top bar.
        </Step>
        <Step n={2} title="Create a workflow">
          Click <strong>+ New</strong> in the workflow selector, or choose a built-in template (Web Scrape, Login &amp; Fill, Retry Loop, CSV Batch).
        </Step>
        <Step n={3} title="Add and connect nodes">
          Use the toolbar to add nodes, drag to arrange, then draw edges between them by dragging from one node's bottom handle to another's top handle.
        </Step>
        <Step n={4} title="Run">
          Click <strong>â–¶ Run</strong>. Watch the agent work in the VM on the left. Node borders pulse green as they complete, and extracted outputs appear inline on the graph.
        </Step>
        <div style={s.tip}>
          <strong>Tip:</strong> Use <strong>Take Over</strong> (top-left of the desktop panel) to manually control the VM at any point. Click <strong>Hand Back</strong> to return control to the agent.
        </div>

        {/* â”€â”€ WORKFLOWS â”€â”€ */}
        <Section id="workflows" title="Workflows">
          <p style={s.p}>Each workflow is a named graph of nodes and edges stored in the database. You can have as many as you like.</p>

          <h3 style={s.h3}>Managing workflows</h3>
          <ul style={s.ul}>
            <li style={s.li}><strong>Create</strong> â€” click <strong>+ New</strong> in the workflow selector (top of right panel)</li>
            <li style={s.li}><strong>Rename</strong> â€” double-click the workflow name in the selector</li>
            <li style={s.li}><strong>Delete</strong> â€” hover the workflow name and click the trash icon</li>
            <li style={s.li}><strong>Switch</strong> â€” click any workflow in the dropdown</li>
          </ul>

          <h3 style={s.h3}>Templates</h3>
          <p style={s.p}>Click <strong>+ New â†’ From template</strong> to start from one of four pre-built starters:</p>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Template</th>
                <th style={s.th}>What it does</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Web Scrape', 'Navigate to a URL, extract structured data with a Read node, save to file with a Code node'],
                ['Login & Fill', 'Navigate to a login page, fill credentials from Secrets, submit, then perform an action once logged in'],
                ['Retry Loop', 'Check a condition, retry a Do action in a loop until the condition passes (max iterations configurable)'],
                ['CSV Batch', 'Load a CSV with a Code node, iterate over rows with ForEach, perform an action per row, then post-process'],
              ].map(([name, desc]) => (
                <tr key={name}>
                  <td style={{ ...s.td, fontWeight: 600, whiteSpace: 'nowrap' }}>{name}</td>
                  <td style={s.td}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={s.h3}>Autosave</h3>
          <p style={s.p}>The graph saves automatically 1 second after any change. A status indicator in the toolbar shows <em>Saved</em>, <em>Savingâ€¦</em>, or an error.</p>
        </Section>

        {/* â”€â”€ NODES â”€â”€ */}
        <Section id="nodes" title="Nodes">
          <p style={s.p}>Each node is one step. Click a node on the canvas to configure it in the right panel. After a run, extracted outputs appear as green pills directly on each node.</p>
          <div style={s.nodeGrid}>
            <NodeCard icon="â†’" name="Navigate" color="#059669">
              Open a URL. Accepts <C>{'{{inputs.url}}'}</C>, <C>{'{{node_id.field}}'}</C>, or a plain URL.
            </NodeCard>
            <NodeCard icon="âš¡" name="Do" color="#2563eb">
              Describe an action in plain English. The agent figures out the clicks, keystrokes, and scrolling.
            </NodeCard>
            <NodeCard icon="Â»" name="Read" color="#0891b2">
              Extract data from the current page. Add an <strong>Output Schema</strong> to get typed, structured results.
            </NodeCard>
            <NodeCard icon="â‰¡" name="Fill" color="#7c3aed">
              Fill a form. Specify the form target and a field â†’ value map. Use <C>{'{{secrets.PWD}}'}</C> for credentials.
            </NodeCard>
            <NodeCard icon="âœ“" name="Check" color="#d97706">
              Ask a yes/no question about the current screen state. Routes to a <strong>true</strong> (green) or <strong>false</strong> (red) path.
            </NodeCard>
            <NodeCard icon="</>" name="Code" color="#6b7280">
              Run arbitrary Python inline. Has access to all workflow variables. Great for data transforms and file I/O.
            </NodeCard>
            <NodeCard icon="â†º" name="ForEach" color="#f59e0b">
              Iterate over a list. Body nodes connect to the bottom handle. Post-loop nodes connect to the <strong>done</strong> handle (bottom-right).
            </NodeCard>
            <NodeCard icon="â—ˆ" name="Agent" color="#7c3aed">
              A custom verb â€” provide a class name and prompt template. Subclasses <C>BaseActionAgent</C>. For when built-in verbs aren't enough.
            </NodeCard>
            <NodeCard icon="â†“" name="Bootstrap" color="#b45309">
              Install system packages via <C>apt-get</C> before the workflow begins. No LLM involved â€” pure subprocess. Runs once at graph start.
            </NodeCard>
          </div>
        </Section>

        {/* â”€â”€ CONNECTIONS â”€â”€ */}
        <Section id="connections" title="Connections">
          <p style={s.p}>Draw edges by dragging from a node's handle to another node. The edge type is determined by which handle you start from.</p>

          <EdgeRow color="#c0bdb8" label="Sequential">Normal order. Drag from the <strong>bottom</strong> handle of any node to the top of the next.</EdgeRow>
          <EdgeRow color="#4ade80" label="Conditional true">From a Check node's <strong>right</strong> (green) handle. Taken when the condition passes.</EdgeRow>
          <EdgeRow color="#f87171" label="Conditional false">From a Check node's <strong>left</strong> (red) handle. Taken when the condition fails.</EdgeRow>
          <EdgeRow color="#f59e0b" label="Loop back">Draw an edge <em>upward</em> â€” from a lower node to a higher one. You'll be prompted for max iterations. Creates a retry loop.</EdgeRow>
          <EdgeRow color="#94a3b8" label="ForEach done">From a ForEach node's <strong>done</strong> handle (bottom-right). Runs after all loop iterations complete.</EdgeRow>

          <div style={{ ...s.tip, marginTop: 16 }}>
            <strong>Delete an edge:</strong> hover over it and click the Ã— that appears at its midpoint.
          </div>
          <div style={s.info}>
            <strong>Building a retry loop:</strong> Connect <em>Navigate â†’ Check â†’ Do</em>, then draw an edge from Do back up to Check. When prompted, set max iterations. The loop breaks when Check passes.
          </div>
        </Section>

        {/* â”€â”€ NODE CONFIG â”€â”€ */}
        <Section id="nodeconfig" title="Node Config">
          <p style={s.p}>Click any node to open its config panel on the right. Every node type shares a set of common fields, plus type-specific ones.</p>

          <h3 style={s.h3}>Common fields</h3>
          <table style={s.table}>
            <thead><tr><th style={s.th}>Field</th><th style={s.th}>Description</th></tr></thead>
            <tbody>
              {[
                ['Label', 'Custom display name for the node on the canvas'],
                ['Max steps', 'Limit how many individual tool calls the agent can make for this node'],
                ['Timeout', 'Hard timeout in seconds. The node fails if it exceeds this'],
                ['Extra info', 'Advisory context injected into the agent\'s system prompt for this step (Navigate, Do only)'],
                ['LLM override', 'Use a different model just for this node â€” overrides the global setting'],
              ].map(([f, d]) => (
                <tr key={f}><td style={{ ...s.td, fontWeight: 600, whiteSpace: 'nowrap' }}>{f}</td><td style={s.td}>{d}</td></tr>
              ))}
            </tbody>
          </table>

          <h3 style={s.h3}>Type-specific fields</h3>
          <table style={s.table}>
            <thead><tr><th style={s.th}>Node</th><th style={s.th}>Fields</th></tr></thead>
            <tbody>
              {[
                ['Navigate', 'Target URL (supports template variables)'],
                ['Do', 'Task â€” plain English description of what to do'],
                ['Check', 'Condition â€” a yes/no question about the current screen'],
                ['Fill', 'Target â€” form description; Data â€” list of field â†’ value pairs'],
                ['Read', 'Task â€” what to look for; Output Schema â€” structured fields to extract'],
                ['Code', 'Code â€” Python to execute inline'],
                ['ForEach', 'Items expr â€” Python expression that evaluates to a list; Loop var â€” variable name (default: item)'],
                ['Agent', 'Class name â€” custom class identifier; Task â€” runtime description; Prompt template â€” Jinja2 template with {task}'],
                ['Bootstrap', 'Packages â€” one per line (or comma-separated). Installs via apt-get before the graph runs.'],
              ].map(([n, f]) => (
                <tr key={n}><td style={{ ...s.td, fontWeight: 600, whiteSpace: 'nowrap' }}>{n}</td><td style={s.td}>{f}</td></tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* â”€â”€ OUTPUT SCHEMA â”€â”€ */}
        <Section id="schema" title="Output Schema">
          <p style={s.p}>
            Add an <strong>Output Schema</strong> to a Read, Do, or Agent node to capture structured data from the page. The schema defines the field names and types that the agent must extract.
          </p>

          <h3 style={s.h3}>Defining a schema</h3>
          <p style={s.p}>In the node config panel, click <strong>+ Add field</strong> under Output Schema. Give each field a name and a type:</p>
          <table style={s.table}>
            <thead><tr><th style={s.th}>Type</th><th style={s.th}>Use for</th></tr></thead>
            <tbody>
              {[
                ['str', 'Text, names, URLs, anything string-like'],
                ['int', 'Counts, IDs, prices without decimals'],
                ['float', 'Prices, ratings, decimal numbers'],
                ['bool', 'Yes/no flags'],
                ['list[str]', 'Multiple values â€” e.g. a list of tags or bullet points'],
              ].map(([t, u]) => (
                <tr key={t}><td style={{ ...s.td, fontFamily: 'Geist Mono, monospace', fontSize: 12 }}>{t}</td><td style={s.td}>{u}</td></tr>
              ))}
            </tbody>
          </table>

          <h3 style={s.h3}>Referencing the output</h3>
          <p style={s.p}>After the node runs, its output is available downstream as <C>{'{{node_id.field_name}}'}</C>. The node ID is shown in grey at the top of the config panel.</p>
          <pre style={s.pre}>{`# Read node "n_abc" with schema: { title: str, salary: str, url: str }
# Downstream Navigate node:
target = "{{n_abc.url}}"

# Downstream Do node:
task = "Apply to {{n_abc.title}} â€” salary is {{n_abc.salary}}"`}</pre>
        </Section>

        {/* â”€â”€ DATA PASSING â”€â”€ */}
        <Section id="data" title="Passing Data">
          <p style={s.p}>
            Three kinds of template variables are available anywhere in node config fields:
          </p>

          <table style={s.table}>
            <thead><tr><th style={s.th}>Syntax</th><th style={s.th}>Resolves to</th></tr></thead>
            <tbody>
              {[
                ['{{node_id.field}}', 'A field from another node\'s Output Schema'],
                ['{{inputs.name}}', 'A workflow input parameter passed at run time'],
                ['{{secrets.KEY}}', 'A value from the Secrets vault'],
                ['{{item}}', 'Current iteration value inside a ForEach loop (or your custom loop_var name)'],
              ].map(([syn, res]) => (
                <tr key={syn}>
                  <td style={{ ...s.td, fontFamily: 'Geist Mono, monospace', fontSize: 12, whiteSpace: 'nowrap' }}>{syn}</td>
                  <td style={s.td}>{res}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={s.tip}>
            Variables are resolved at code-generation time. If a referenced node ID doesn't exist, code generation will show an error before the run starts.
          </div>
        </Section>

        {/* â”€â”€ WORKFLOW INPUTS â”€â”€ */}
        <Section id="inputs" title="Workflow Inputs">
          <p style={s.p}>
            Declare named parameters so the same workflow can be reused with different values â€” passed via the UI, a webhook call, or a cron trigger.
          </p>

          <h3 style={s.h3}>1. Declare inputs</h3>
          <p style={s.p}>
            Click <strong>âš¡ Triggers</strong> in the global config bar â†’ <strong>Inputs</strong> tab. Add entries with a name, type (<C>str</C>, <C>int</C>, <C>float</C>, <C>bool</C>), and optional description.
          </p>

          <h3 style={s.h3}>2. Reference in nodes</h3>
          <pre style={s.pre}>{`# Navigate â€” target field:
{{inputs.job_url}}

# Do â€” task field:
Apply to {{inputs.company_name}} on the current page

# Fill â€” data field:
email    â†’ {{inputs.email}}
password â†’ {{secrets.LOGIN_PASSWORD}}`}</pre>

          <h3 style={s.h3}>3. Provide values at run time</h3>
          <p style={s.p}>When a workflow has declared inputs, clicking <strong>â–¶ Run</strong> opens a dialog to fill in the values before starting. When triggered via webhook or cron, inputs are passed in the request body / trigger config.</p>
        </Section>

        {/* â”€â”€ TRIGGERS â”€â”€ */}
        <Section id="triggers" title="Triggers">
          <p style={s.p}>
            Run workflows automatically without clicking â–¶ Run. Open <strong>âš¡ Triggers</strong> in the global config bar.
          </p>

          <h3 style={s.h3}>Webhook</h3>
          <p style={s.p}>Every workflow has a stable webhook URL. POST to it to trigger a run with custom inputs:</p>
          <pre style={s.pre}>{`POST http://localhost:8000/webhook/{workflow_id}
Content-Type: application/json
X-MnemOS-Secret: your_secret   # optional

{
  "job_url": "https://example.com/jobs/123",
  "email":   "you@example.com"
}`}</pre>
          <p style={s.p}>The Triggers panel shows a pre-filled curl command you can copy directly. Set a <strong>webhook secret</strong> to require the <C>X-MnemOS-Secret</C> header â€” requests without it will be rejected with 403.</p>

          <h3 style={s.h3}>Cron schedule</h3>
          <p style={s.p}>Add one or more schedules per workflow. Each has a cron expression, an enable/disable toggle, and optional default inputs:</p>
          <pre style={s.pre}>{`0 9 * * 1-5     every weekday at 9:00 AM
*/30 * * * *    every 30 minutes
0 0 * * *       daily at midnight
* * * * *       every minute (testing)`}</pre>
          <p style={s.p}>The backend scheduler checks every 60 seconds. If a workflow is already running when a trigger fires, that firing is skipped.</p>

          <div style={s.warn}>
            Cron triggers require <C>croniter</C> to be installed in the Docker container. Run <C>docker compose up --build</C> to pick up the dependency.
          </div>
        </Section>

        {/* â”€â”€ SECRETS â”€â”€ */}
        <Section id="secrets" title="Secrets">
          <p style={s.p}>
            Store API keys, passwords, and tokens in the <strong>Secrets</strong> vault (key icon in the global config bar). They are injected as environment variables at workflow runtime and never returned by the API after saving.
          </p>
          <pre style={s.pre}>{`# In any node config field:
{{secrets.GEMINI_API_KEY}}
{{secrets.LOGIN_PASSWORD}}
{{secrets.STRIPE_SECRET_KEY}}`}</pre>
          <p style={s.p}>Common keys to add:</p>
          <table style={s.table}>
            <thead><tr><th style={s.th}>Key</th><th style={s.th}>Used for</th></tr></thead>
            <tbody>
              {[
                ['GEMINI_API_KEY', 'Default LLM (gemini-* models)'],
                ['OPENAI_API_KEY', 'OpenAI models via openai/gpt-4o etc.'],
                ['ANTHROPIC_API_KEY', 'Anthropic models via anthropic/claude-...'],
                ['OPENROUTER_API_KEY', 'OpenRouter-hosted models'],
                ['LOGIN_EMAIL / LOGIN_PASSWORD', 'Credentials for Fill nodes'],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td style={{ ...s.td, fontFamily: 'Geist Mono, monospace', fontSize: 11, whiteSpace: 'nowrap' }}>{k}</td>
                  <td style={s.td}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={s.warn}>
            Secrets are stored in plaintext in <C>/workspace/mnemos.db</C>. Do not expose the workspace volume or the backend port publicly.
          </div>
        </Section>

        {/* â”€â”€ MCP SERVERS â”€â”€ */}
        <Section id="mcp" title="MCP Servers">
          <p style={s.p}>
            Attach any MCP-compatible tool server to a node. The agent running that node gains access to the MCP tools â€” file system access, database queries, custom APIs, etc.
          </p>
          <p style={s.p}>Open a node's config panel and scroll to the <strong>MCP Servers</strong> section. You can attach multiple servers to the same node.</p>

          <h3 style={s.h3}>stdio transport (local process)</h3>
          <p style={s.p}>Spawns a local process. Provide a command and comma-separated args:</p>
          <pre style={s.pre}>{`Command:  npx
Args:     -y, @modelcontextprotocol/server-filesystem, /workspace`}</pre>
          <pre style={s.pre}>{`Command:  python
Args:     -m, my_mcp_server`}</pre>

          <h3 style={s.h3}>SSE transport (remote server)</h3>
          <p style={s.p}>Connects to a running HTTP server that exposes an SSE endpoint:</p>
          <pre style={s.pre}>{`URL:  http://localhost:9000/sse`}</pre>

          <div style={s.tip}>
            The MCP filesystem server is particularly useful for Read nodes â€” give the agent access to <C>/workspace</C> so it can write extracted data directly to files.
          </div>
        </Section>

        {/* â”€â”€ CODE NODE â”€â”€ */}
        <Section id="code" title="Code Node">
          <p style={s.p}>
            Write arbitrary Python that runs inline inside the workflow's async context. All variables defined in previous nodes are accessible directly.
          </p>

          <h3 style={s.h3}>Common uses</h3>
          <pre style={s.pre}>{`# Load a CSV for a downstream ForEach
import pandas as pd
rows = pd.read_csv('/workspace/uploads/jobs.csv').to_dict('records')`}</pre>
          <pre style={s.pre}>{`# Transform extracted data before the next step
price = float(result_n1.price.replace('$', '').replace(',', ''))
is_affordable = price < 500`}</pre>
          <pre style={s.pre}>{`# Write output to /workspace
import json
with open('/workspace/results.json', 'w') as f:
    json.dump(result_n2.__dict__, f, indent=2)`}</pre>
          <pre style={s.pre}>{`# Make an HTTP request
import httpx
resp = httpx.get("https://api.example.com/data", headers={"Authorization": "Bearer {{secrets.API_KEY}}"})`}</pre>

          <div style={s.tip}>
            <strong>Need a package that isn't installed?</strong> Add a Code node before your main logic:{' '}
            <code style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>
              import subprocess, sys; subprocess.run([sys.executable, "-m", "pip", "install", "-q", "httpx"], check=True)
            </code>
          </div>
        </Section>

        {/* â”€â”€ FILES â”€â”€ */}
        <Section id="files" title="Files">
          <p style={s.p}>
            The <strong>Files</strong> tab (bottom of the workspace panel) gives you a full file browser for <C>/workspace</C> â€” the persistent volume shared between the host and the agent.
          </p>

          <h3 style={s.h3}>What you can do</h3>
          <ul style={s.ul}>
            <li style={s.li}><strong>Upload</strong> â€” drag files or click to upload CSVs, configs, or any input the agent needs</li>
            <li style={s.li}><strong>Download</strong> â€” click any file to download outputs, screenshots, or results the agent wrote</li>
            <li style={s.li}><strong>Delete</strong> â€” remove individual files or empty directories</li>
            <li style={s.li}><strong>Navigate</strong> â€” click folders to browse; breadcrumb trail shows the current path</li>
          </ul>

          <h3 style={s.h3}>Useful paths</h3>
          <table style={s.table}>
            <thead><tr><th style={s.th}>Path</th><th style={s.th}>Contents</th></tr></thead>
            <tbody>
              {[
                ['/workspace/uploads/', 'Files you upload from the Files tab'],
                ['/workspace/logs/', 'One log file per run â€” named by run ID'],
                ['/workspace/workflow.py', 'The last generated workflow â€” inspect for debugging'],
                ['/workspace/mnemos.db', 'SQLite database â€” workflows, runs, secrets'],
              ].map(([p, c]) => (
                <tr key={p}>
                  <td style={{ ...s.td, fontFamily: 'Geist Mono, monospace', fontSize: 11, whiteSpace: 'nowrap' }}>{p}</td>
                  <td style={s.td}>{c}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={s.info}>
            <strong>In Code nodes,</strong> read and write files under <C>/workspace/</C> â€” this is the same directory the Files tab shows, so you can upload an input CSV and immediately reference it as <C>/workspace/uploads/jobs.csv</C>.
          </div>
        </Section>

        {/* â”€â”€ RUNS â”€â”€ */}
        <Section id="runs" title="Run History">
          <p style={s.p}>
            The <strong>Runs</strong> tab (bottom of the workspace panel) shows the last 20 runs for the current workflow.
          </p>

          <ul style={s.ul}>
            <li style={s.li}>Each run shows its <strong>status</strong> (success / error / running), <strong>start time</strong>, and <strong>duration</strong></li>
            <li style={s.li}>Click a run to open the <strong>log viewer</strong> â€” streams the full output, auto-scrolling to the bottom as new lines arrive</li>
            <li style={s.li}>Logs are persisted in <C>/workspace/logs/</C> and survive container restarts</li>
          </ul>

          <h3 style={s.h3}>Live status while running</h3>
          <p style={s.p}>
            While a workflow is executing, each node on the canvas updates in real time via an SSE stream:
          </p>
          <ul style={s.ul}>
            <li style={s.li}><strong>Pulsing green border</strong> â€” node is currently running</li>
            <li style={s.li}><strong>Solid green border</strong> â€” node completed successfully</li>
            <li style={s.li}><strong>Red border</strong> â€” node failed</li>
            <li style={s.li}><strong>Green output pill</strong> â€” extracted output shown inline on the node</li>
          </ul>
        </Section>

        {/* â”€â”€ MULTI-LLM â”€â”€ */}
        <Section id="llm" title="Multi-LLM">
          <p style={s.p}>
            All model calls go through <strong>LiteLLM</strong>, so you can use any supported provider. Set the global model in the top bar â€” accepts any LiteLLM model string.
          </p>

          <h3 style={s.h3}>Supported model strings</h3>
          <pre style={s.pre}>{`# Google Gemini (default)
gemini-3-flash-preview
gemini-2.5-flash
gemini-2.5-pro

# OpenAI
openai/gpt-4o
openai/gpt-4o-mini

# Anthropic
anthropic/claude-3-5-sonnet-20241022
anthropic/claude-3-haiku-20240307

# OpenRouter (access 100+ models)
openrouter/google/gemini-flash-1.5
openrouter/meta-llama/llama-3.1-70b-instruct

# Local (Ollama)
ollama/llama3
ollama/mistral`}</pre>

          <h3 style={s.h3}>Required secrets per provider</h3>
          <table style={s.table}>
            <thead><tr><th style={s.th}>Provider</th><th style={s.th}>Secret key</th></tr></thead>
            <tbody>
              {[
                ['gemini-*', 'GEMINI_API_KEY'],
                ['openai/*', 'OPENAI_API_KEY'],
                ['anthropic/*', 'ANTHROPIC_API_KEY'],
                ['openrouter/*', 'OPENROUTER_API_KEY'],
                ['ollama/*', 'No key needed â€” runs locally'],
              ].map(([p, k]) => (
                <tr key={p}>
                  <td style={{ ...s.td, fontFamily: 'Geist Mono, monospace', fontSize: 12 }}>{p}</td>
                  <td style={{ ...s.td, fontFamily: 'Geist Mono, monospace', fontSize: 12 }}>{k}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={s.h3}>Per-node model override</h3>
          <p style={s.p}>
            Use a cheap fast model globally and override to a powerful model only for nodes that need reasoning. Open the node config â†’ <strong>Advanced</strong> â†’ <strong>LLM override</strong>.
          </p>
          <div style={s.tip}>
            <strong>Good split:</strong> <C>gemini-3-flash-preview</C> globally for navigation/clicks, <C>openai/gpt-4o</C> override on Read nodes that extract complex structured data.
          </div>
        </Section>

        {/* â”€â”€ SELF-HOSTING â”€â”€ */}
        <Section id="selfhost" title="Self-hosting">
          <p style={s.p}>MnemOS runs entirely in Docker. One command gets you a full browser agent environment.</p>

          <h3 style={s.h3}>Setup</h3>
          <pre style={s.pre}>{`# Clone the repo
git clone https://github.com/your-org/mnemos
cd mnemos

# Create your env file
cp .env.example .env
# Edit .env â€” set GEMINI_API_KEY (or your preferred LLM key)

# Start everything
docker compose up`}</pre>
          <p style={s.p}>Then open <C>http://127.0.0.1:3000</C>. (On Windows, use <C>127.0.0.1</C> â€” <C>localhost</C> resolves to IPv6 and won't connect.)</p>

          <h3 style={s.h3}>Ports</h3>
          <table style={s.table}>
            <thead><tr><th style={s.th}>Port</th><th style={s.th}>Service</th></tr></thead>
            <tbody>
              {[
                ['3000', 'Frontend (nginx)'],
                ['8000', 'Backend API (FastAPI)'],
                ['6080', 'noVNC â€” browser-based VNC viewer'],
                ['7878', 'OculOS daemon'],
              ].map(([p, svc]) => (
                <tr key={p}>
                  <td style={{ ...s.td, fontFamily: 'Geist Mono, monospace', fontSize: 12 }}>{p}</td>
                  <td style={s.td}>{svc}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={s.h3}>Data persistence</h3>
          <p style={s.p}>Everything lives in the <C>./workspace</C> directory (a bind mount). This persists across container restarts and rebuilds â€” back it up by copying the folder.</p>
          <pre style={s.pre}>{`# Backup
cp -r ./workspace ./workspace-backup

# Upgrade (data preserved)
git pull
docker compose up --build`}</pre>

          <h3 style={s.h3}>.env reference</h3>
          <pre style={s.pre}>{`GEMINI_API_KEY=...    # or whichever LLM key you use
# VITE_API_URL is set automatically via docker-compose build args`}</pre>
        </Section>

        {/* â”€â”€ BOOTSTRAP â”€â”€ */}
        <Section id="bootstrap" title="Bootstrap">
          <p style={s.p}>
            The <strong>Bootstrap</strong> node installs system packages via <C>apt-get install -y</C> before any other node runs. It doesn't use an LLM â€” it's a pure subprocess call. Use it when your workflow needs tools not pre-installed in the Docker image (e.g. <C>ffmpeg</C>, <C>imagemagick</C>, <C>wkhtmltopdf</C>).
          </p>
          <h3 style={s.h3}>Configuration</h3>
          <p style={s.p}>Enter one package name per line in the <strong>Packages</strong> field, or use comma-separation:</p>
          <pre style={s.pre}>{`ffmpeg\nimagemagick\nwkhtmltopdf`}</pre>
          <h3 style={s.h3}>Behaviour</h3>
          <ul style={s.ul}>
            <li style={s.li}>Runs before the session context is created â€” no browser, no screen.</li>
            <li style={s.li}>If installation fails the workflow stops immediately with an error.</li>
            <li style={s.li}>Only works on Linux (the Docker container). On Windows/macOS it returns a failed status immediately.</li>
            <li style={s.li}>Add it as the very first node in your graph, connected to the first agent node.</li>
          </ul>
          <div style={s.tip}>Place Bootstrap at the top of your graph. Downstream nodes can use the installed tools immediately in Code nodes or shell commands.</div>
        </Section>

        {/* â”€â”€ ADVANCED â”€â”€ */}
        <Section id="advanced" title="Advanced">

          <h3 style={s.h3}>Human-in-the-loop</h3>
          <p style={s.p}>
            Toggle <strong>Human in the loop</strong> in the global config bar to have the agent pause before each action and wait for your confirmation. Useful for sensitive workflows (form submissions, purchases, deletions) where you want oversight before each step.
          </p>

          <h3 style={s.h3}>Take Over / Hand Back</h3>
          <p style={s.p}>
            Click <strong>Take Over</strong> (top-left of the desktop panel) at any point to pause the agent and take manual control of the VM. Interact with the browser directly, then click <strong>Hand Back</strong> to return control. The agent resumes from where it left off.
          </p>

          <h3 style={s.h3}>Generated code</h3>
          <p style={s.p}>
            Click <strong>Generate</strong> in the toolbar (or open the <strong>Preview</strong> tab) to see the Python workflow file compiled from your graph. The same file is written to <C>/workspace/workflow.py</C> before every run â€” inspect it to understand exactly what the agent will do or to debug unexpected behavior.
          </p>

          <h3 style={s.h3}>Verbose mode</h3>
          <p style={s.p}>
            Toggle <strong>Verbose</strong> in the global config bar to control whether every tool call is logged. Disable it for cleaner logs when running on a cron schedule.
          </p>

          <h3 style={s.h3}>API reference</h3>
          <p style={s.p}>The backend exposes a REST API at <C>http://127.0.0.1:8000</C>. Explore it interactively at <C>/docs</C> (Swagger UI).</p>
          <pre style={s.pre}>{`GET    /workflows                  list all workflows
POST   /workflows                  create workflow
DELETE /workflows/{id}             delete workflow
GET    /workflow/load?id={id}      load graph
POST   /workflow/save              save graph
POST   /start?id={id}              run workflow
POST   /stop                       stop running workflow
POST   /interrupt                  pause
POST   /resume                     resume after pause
GET    /events                     SSE stream â€” live node statuses
GET    /runs?workflow_id={id}      run history
GET    /runs/{run_id}/log          stream log file
POST   /webhook/{workflow_id}      external trigger with inputs
GET    /files?path={dir}           list /workspace files
POST   /files/upload               upload files
GET    /files/download?path={f}    download file
DELETE /files?path={p}             delete file`}</pre>
        </Section>

        <p style={{ fontSize: 12, color: '#bbb', marginTop: 48 }}>
          orbit-cua â€” <a href="https://pypi.org/project/orbit-cua/" target="_blank" rel="noreferrer" style={{ color: '#bbb' }}>PyPI</a>
          {' Â· '}
          <a href="https://github.com/yranjan06/MnemOS" target="_blank" rel="noreferrer" style={{ color: '#bbb' }}>GitHub</a>
        </p>

      </div>
    </div>
  );
}

