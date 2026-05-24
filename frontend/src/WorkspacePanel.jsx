import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadGraph, saveGraph, generateWorkflow, previewWorkflow, listWorkflows, createWorkflow, deleteWorkflow, renameWorkflow, listRuns, getRunLog, listFiles, uploadFile, downloadFile, deleteFile } from './useWorkflowApi';
import GlobalConfigBar from './GlobalConfigBar';
import WorkflowSelector from './WorkflowSelector';
import WorkspaceToolbar from './WorkspaceToolbar';
import GraphBuilder from './GraphBuilder';
import NodeConfigPanel from './NodeConfigPanel';
import NodeLogModal from './NodeLogModal';

const DEFAULT_GRAPH = {
  version: '1',
  global: { llm: 'gemini-3-flash-preview', human_in_the_loop: false },
  nodes: [],
  edges: [],
};

const TEMPLATES = [
  {
    name: 'Web Scrape',
    icon: '»',
    desc: 'Navigate to a page, extract structured data',
    graph: {
      version: '1',
      global: { llm: 'gemini-3-flash-preview', human_in_the_loop: false },
      nodes: [
        { id: 'n1', type: 'Navigate', label: 'Open page', position: { x: 180, y: 60 }, config: { target: 'https://example.com', max_steps: null, extra_info: '', llm: null } },
        { id: 'n2', type: 'Read', label: 'Extract data', position: { x: 180, y: 200 }, config: { task: 'Extract the main heading and description', max_steps: null, llm: null },
          output_schema: { fields: [{ name: 'heading', type: 'str' }, { name: 'description', type: 'str' }] } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', type: 'sequential', sourceHandle: 'handle-out', targetHandle: 'handle-in' },
      ],
    },
  },
  {
    name: 'Login & Fill',
    icon: '≡',
    desc: 'Log into a site and submit a form',
    graph: {
      version: '1',
      global: { llm: 'gemini-3-flash-preview', human_in_the_loop: false },
      nodes: [
        { id: 'n1', type: 'Navigate', label: 'Open login page', position: { x: 180, y: 60 }, config: { target: 'https://example.com/login', max_steps: null, extra_info: '', llm: null } },
        { id: 'n2', type: 'Fill', label: 'Fill login form', position: { x: 180, y: 200 }, config: { target: 'login form', data: { email: '{{secrets.EMAIL}}', password: '{{secrets.PASSWORD}}' }, llm: null } },
        { id: 'n3', type: 'Check', label: 'Logged in?', position: { x: 180, y: 340 }, config: { condition: 'We are now logged in and past the login page', max_steps: null, llm: null } },
        { id: 'n4', type: 'Do', label: 'Submit form', position: { x: 320, y: 460 }, config: { task: 'Fill and submit the main form on the page', max_steps: null, extra_info: '', llm: null } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', type: 'sequential', sourceHandle: 'handle-out', targetHandle: 'handle-in' },
        { id: 'e2', source: 'n2', target: 'n3', type: 'sequential', sourceHandle: 'handle-out', targetHandle: 'handle-in' },
        { id: 'e3', source: 'n3', target: 'n4', type: 'conditional_true', sourceHandle: 'true', targetHandle: 'handle-in' },
      ],
    },
  },
  {
    name: 'Retry Loop',
    icon: '↺',
    desc: 'Repeat an action until a condition passes',
    graph: {
      version: '1',
      global: { llm: 'gemini-3-flash-preview', human_in_the_loop: false },
      nodes: [
        { id: 'n1', type: 'Navigate', label: 'Open page',      position: { x: 180, y: 60  }, config: { target: 'https://example.com', max_steps: null, extra_info: '', llm: null } },
        { id: 'n2', type: 'Check',    label: 'Succeeded?',     position: { x: 180, y: 200 }, config: { condition: 'The action completed successfully and the expected result is visible', max_steps: null, llm: null } },
        { id: 'n3', type: 'Do',       label: 'Perform action', position: { x: 340, y: 340 }, config: { task: 'Click the main call-to-action button', max_steps: null, extra_info: '', llm: null } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', type: 'sequential',        sourceHandle: 'handle-out', targetHandle: 'handle-in' },
        { id: 'e2', source: 'n2', target: 'n3', type: 'conditional_false', sourceHandle: 'false',      targetHandle: 'handle-in' },
        { id: 'e3', source: 'n3', target: 'n2', type: 'loop_back',         sourceHandle: 'handle-out', targetHandle: 'handle-in', max_iterations: 3 },
      ],
    },
  },
  {
    name: 'Competitor Analysis',
    icon: '⚡',
    desc: 'Scrape pricing & models from multiple AI platforms, then analyse in ipython',
    graph: {
      version: '1',
      global: { llm: 'gemini-3-flash-preview', human_in_the_loop: false },
      nodes: [
        {
          id: 'n1', type: 'Code', label: 'Setup', position: { x: 180, y: 60 },
          config: { llm: null, code: "platforms = [\n    {'name': 'OpenAI',    'pricing_url': 'https://openai.com/api/pricing/',                             'models_url': 'https://platform.openai.com/docs/models',                          'api_url': 'https://platform.openai.com/docs/pricing'},\n    {'name': 'Anthropic', 'pricing_url': 'https://platform.claude.com/docs/en/about-claude/pricing',     'models_url': 'https://platform.claude.com/docs/en/docs/about-claude/models/overview', 'api_url': 'https://platform.claude.com/docs/en/about-claude/pricing'},\n    {'name': 'Google',    'pricing_url': 'https://ai.google.dev/gemini-api/docs/pricing',               'models_url': 'https://ai.google.dev/gemini-api/docs/models',                     'api_url': 'https://ai.google.dev/gemini-api/docs/pricing'},\n]\nsummary_rows = []\nmodels_rows = []" },
        },
        {
          id: 'n2', type: 'ForEach', label: 'For each platform', position: { x: 180, y: 200 },
          config: { items_expr: 'platforms', loop_var: 'platform', llm: null },
        },
        {
          id: 'n3', type: 'Navigate', label: 'Pricing page', position: { x: 180, y: 340 },
          config: { target: '{{platform.pricing_url}}', max_steps: null, extra_info: 'Dismiss any cookie banners. Wait for pricing tables to load.', llm: null },
        },
        {
          id: 'n4', type: 'Read', label: 'Read pricing', position: { x: 180, y: 480 },
          config: { task: 'Extract subscription plan names, whether a free tier exists, the entry paid price in USD, and whether enterprise is available.', max_steps: null, llm: null },
          output_schema: { fields: [
            { name: 'plan_names', type: 'list[str]' },
            { name: 'has_free_tier', type: 'bool' },
            { name: 'entry_paid_price_usd', type: 'str' },
            { name: 'enterprise_available', type: 'bool' },
          ]},
        },
        {
          id: 'n5', type: 'Navigate', label: 'Models page', position: { x: 180, y: 620 },
          config: { target: '{{platform.models_url}}', max_steps: null, extra_info: 'Scroll down to ensure all models are visible before reading.', llm: null },
        },
        {
          id: 'n6', type: 'Read', label: 'Read models', position: { x: 180, y: 760 },
          config: { task: 'Extract every model — names, context windows, total count, flagship model, and whether any model supports reasoning or extended thinking.', max_steps: null, llm: null },
          output_schema: { fields: [
            { name: 'model_names', type: 'list[str]' },
            { name: 'context_windows', type: 'list[str]' },
            { name: 'total_model_count', type: 'int' },
            { name: 'flagship_model', type: 'str' },
            { name: 'has_reasoning_model', type: 'bool' },
          ]},
        },
        {
          id: 'n7', type: 'Navigate', label: 'API pricing page', position: { x: 180, y: 900 },
          config: { target: '{{platform.api_url}}', max_steps: null, extra_info: 'Look for token pricing tables. Scroll through the full page.', llm: null },
        },
        {
          id: 'n8', type: 'Read', label: 'Read API pricing', position: { x: 180, y: 1040 },
          config: { task: 'Extract API token pricing per model — input and output cost per 1M tokens, cheapest model and price, whether a free API tier exists.', max_steps: null, llm: null },
          output_schema: { fields: [
            { name: 'api_models', type: 'list[str]' },
            { name: 'input_cost_per_1m', type: 'list[str]' },
            { name: 'cheapest_model_api', type: 'str' },
            { name: 'cheapest_input_price', type: 'str' },
            { name: 'has_free_api', type: 'bool' },
          ]},
        },
        {
          id: 'n9', type: 'Code', label: 'Collect data', position: { x: 180, y: 1180 },
          config: { llm: null, code: "summary_rows.append({\n    'platform':            platform['name'],\n    'has_free_tier':       n4_out.has_free_tier,\n    'entry_paid_price_usd': n4_out.entry_paid_price_usd,\n    'enterprise_available': n4_out.enterprise_available,\n    'total_model_count':   n6_out.total_model_count,\n    'flagship_model':      n6_out.flagship_model,\n    'has_reasoning_model': n6_out.has_reasoning_model,\n    'cheapest_model_api':  n8_out.cheapest_model_api,\n    'cheapest_input_price': n8_out.cheapest_input_price,\n    'has_free_api':        n8_out.has_free_api,\n})\nfor name, ctx in zip(n6_out.model_names, n6_out.context_windows):\n    models_rows.append({'platform': platform['name'], 'model_name': name, 'context_window': ctx})" },
        },
        {
          id: 'n10', type: 'Code', label: 'Write CSVs', position: { x: 180, y: 1320 },
          config: { llm: null, code: "import csv, os\nfrom datetime import datetime\nts = datetime.now().strftime('%Y%m%d_%H%M')\nos.makedirs('/workspace/uploads', exist_ok=True)\n\nif summary_rows:\n    with open(f'/workspace/uploads/platform_summary_{ts}.csv', 'w', newline='') as f:\n        w = csv.DictWriter(f, fieldnames=summary_rows[0].keys())\n        w.writeheader(); w.writerows(summary_rows)\n\nif models_rows:\n    with open(f'/workspace/uploads/models_detail_{ts}.csv', 'w', newline='') as f:\n        w = csv.DictWriter(f, fieldnames=models_rows[0].keys())\n        w.writeheader(); w.writerows(models_rows)\n\nprint(f'{len(summary_rows)} platforms, {len(models_rows)} models written')" },
        },
        {
          id: 'n11', type: 'Do', label: 'Analyse in terminal', position: { x: 180, y: 1460 },
          config: { max_steps: 100, extra_info: '', llm: null, task: "Open an xfce4-terminal. Run the following and wait for each to finish:\n  pip install ipython pandas matplotlib seaborn\n  ipython\nWait for the In [1]: prompt before continuing.\n\nSETUP (do first, in order):\n1. list_active_windows to find the xfce4-terminal pid\n2. manage_window(pid, action='maximize')\n3. manage_window(pid, action='focus')\n4. Type: %autoindent off and press Enter\n\nType all code using type_text, one line at a time, pressing Enter after each line. When inside an indented block, type your own indentation. Press Enter on a blank line to close and execute a block.\n\nAfter every line or block you execute, immediately call get_page_text(pid) on the xfce4-terminal and read what ipython printed. Only move on once you've confirmed the result is correct. Fix any errors before continuing.\n\nLoad the latest CSVs from /workspace/uploads/ using glob. Print columns, dtypes, and a few rows before writing any analysis code.\n\nThen write and run code to:\n1. Produce a multi-panel matplotlib figure (use Agg backend: import matplotlib; matplotlib.use('Agg')). Save to /workspace/ai_analysis.png and print a confirmation.\n2. Compute key insights from the data. Print a report and save to /workspace/insights.txt.\n\nAdapt everything to what you actually find in the data. Do not assume column names." },
        },
      ],
      edges: [
        { id: 'e1', source: 'n1',  target: 'n2',  type: 'sequential',   sourceHandle: 'handle-out',          targetHandle: 'handle-in' },
        { id: 'e2', source: 'n2',  target: 'n3',  type: 'sequential',   sourceHandle: 'handle-out',          targetHandle: 'handle-in' },
        { id: 'e3', source: 'n3',  target: 'n4',  type: 'sequential',   sourceHandle: 'handle-out',          targetHandle: 'handle-in' },
        { id: 'e4', source: 'n4',  target: 'n5',  type: 'sequential',   sourceHandle: 'handle-out',          targetHandle: 'handle-in' },
        { id: 'e5', source: 'n5',  target: 'n6',  type: 'sequential',   sourceHandle: 'handle-out',          targetHandle: 'handle-in' },
        { id: 'e6', source: 'n6',  target: 'n7',  type: 'sequential',   sourceHandle: 'handle-out',          targetHandle: 'handle-in' },
        { id: 'e7', source: 'n7',  target: 'n8',  type: 'sequential',   sourceHandle: 'handle-out',          targetHandle: 'handle-in' },
        { id: 'e8', source: 'n8',  target: 'n9',  type: 'sequential',   sourceHandle: 'handle-out',          targetHandle: 'handle-in' },
        { id: 'e9', source: 'n2',  target: 'n10', type: 'foreach_done', sourceHandle: 'handle-foreach-done', targetHandle: 'handle-in' },
        { id: 'e10', source: 'n10', target: 'n11', type: 'sequential',  sourceHandle: 'handle-out',          targetHandle: 'handle-in' },
      ],
    },
  },
  {
    name: 'CSV Batch',
    icon: '↺',
    desc: 'Load a CSV and process each row',
    graph: {
      version: '1',
      global: { llm: 'gemini-3-flash-preview', human_in_the_loop: false },
      nodes: [
        { id: 'n1', type: 'Code',    label: 'Load CSV',      position: { x: 180, y: 60  }, config: { code: "import csv\nwith open('/workspace/uploads/data.csv') as f:\n    rows = list(csv.DictReader(f))", llm: null } },
        { id: 'n2', type: 'ForEach', label: 'For each row',  position: { x: 180, y: 200 }, config: { items_expr: 'rows', loop_var: 'row', llm: null } },
        { id: 'n3', type: 'Do',      label: 'Process row',   position: { x: 60,  y: 340 }, config: { task: 'Process the current item: {{row}}', max_steps: null, extra_info: '', llm: null } },
        { id: 'n4', type: 'Do',      label: 'After loop',    position: { x: 180, y: 460 }, config: { task: 'All rows processed. Do any final steps.', max_steps: null, extra_info: '', llm: null } },
      ],
      edges: [
        { id: 'e1', source: 'n1', target: 'n2', type: 'sequential',   sourceHandle: 'handle-out',          targetHandle: 'handle-in' },
        { id: 'e2', source: 'n2', target: 'n3', type: 'sequential',   sourceHandle: 'handle-out',          targetHandle: 'handle-in' },
        { id: 'e3', source: 'n2', target: 'n4', type: 'foreach_done', sourceHandle: 'handle-foreach-done', targetHandle: 'handle-in' },
      ],
    },
  },
];

const TYPE_CONFIG = {
  Navigate: { target: '', max_steps: null, extra_info: '', llm: null },
  Do: { task: '', max_steps: null, extra_info: '', llm: null },
  Check: { condition: '', max_steps: null, llm: null },
  Fill: { target: '', data: {}, llm: null },
  Read: { task: '', max_steps: null, llm: null },
  Code: { code: '', llm: null },
  Agent: { class_name: '', task: '', prompt_template: '', max_steps: 20, llm: null },
  ForEach: { items_expr: '', loop_var: 'item', llm: null },
  Bootstrap: { packages: '' },
};

function createNode(type) {
  return {
    id: `n${Date.now()}`,
    type,
    label: `${type} node`,
    position: { x: 80 + Math.random() * 180, y: 80 + Math.random() * 120 },
    config: TYPE_CONFIG[type] || {},
    output_schema: null,
  };
}

function timeAgo(ts) {
  const s = Math.floor(Date.now() / 1000 - ts);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function fmtDuration(started, finished) {
  if (!finished) return '…';
  const s = Math.round(finished - started);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function fmtSize(bytes) {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const STATUS_DOT = { success: '#22c55e', error: '#ef4444', stopped: '#f59e0b', running: '#3b82f6' };

export default function WorkspacePanel({ onStart, onWorkflowEnd }) {
  const [graph, setGraph] = useState(DEFAULT_GRAPH);
  const [workflows, setWorkflows] = useState([]);
  const [currentWorkflowId, setCurrentWorkflowId] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [previewCode, setPreviewCode] = useState('No preview loaded yet.');
  const [status, setStatus] = useState('Loading workflow...');
  const [loading, setLoading] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [nodeStatuses, setNodeStatuses] = useState({});
  const [nodeOutputs, setNodeOutputs] = useState({});
  const [nodeLogs, setNodeLogs] = useState({});
  const [nodeLogModal, setNodeLogModal] = useState(null); // nodeId | null
  const [bottomTab, setBottomTab] = useState('preview');
  const [runs, setRuns] = useState([]);
  const [logModal, setLogModal] = useState(null); // {runId, content}
  const [filePath, setFilePath] = useState('');
  const [fileEntries, setFileEntries] = useState([]);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [inputsModal, setInputsModal] = useState(null); // {fields: [...], values: {...}}
  const [errorToast, setErrorToast] = useState(null);
  const errorToastTimer = useRef(null);
  const autosaveTimer = useRef(null);
  const esRef = useRef(null);
  const logScrollRef = useRef(null);
  const fileInputRef = useRef(null);

  const showError = useCallback((msg) => {
    clearTimeout(errorToastTimer.current);
    setErrorToast(msg);
    errorToastTimer.current = setTimeout(() => setErrorToast(null), 8000);
  }, []);

  // ── Initialization ────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;
    async function init() {
      // Retry for up to 90 seconds — backend inside the VM takes time to start
      const MAX_RETRIES = 30;
      const RETRY_DELAY = 3000;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (!mounted) return;
        try {
          let wlist = await listWorkflows();
          if (!mounted) return;
          setBackendAvailable(true);

          // First boot — seed a default workflow so currentWorkflowId is never null
          if (wlist.length === 0) {
            await createWorkflow('Untitled');
            wlist = await listWorkflows();
          }
          setWorkflows(wlist);

          const data = await loadGraph(wlist[0].id);
          if (!mounted) return;
          setCurrentWorkflowId(data.id);
          setGraph(data.graph || DEFAULT_GRAPH);
          setStatus('Workflow graph loaded.');
          if (mounted) setLoading(false);
          return;
        } catch {
          if (attempt < MAX_RETRIES - 1) {
            setStatus(`Waiting for backend… (${attempt + 1}/${MAX_RETRIES})`);
            await new Promise(r => setTimeout(r, RETRY_DELAY));
          } else {
            setStatus('Backend unreachable. Is the container running?');
            setBackendAvailable(false);
            if (mounted) setLoading(false);
          }
        }
      }
    }
    init();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!loading) fetchPreview();
  }, [loading]);

  // ── Workflow selector actions ─────────────────────────────────────────────

  const handleWorkflowSelect = async (id) => {
    if (id === currentWorkflowId) return;
    // Save current first
    if (currentWorkflowId) {
      await saveGraph(currentWorkflowId, graph).catch(() => {});
    }
    try {
      const data = await loadGraph(id);
      setCurrentWorkflowId(data.id);
      setGraph(data.graph || DEFAULT_GRAPH);
      setSelectedNodeId(null);
      setStatus('Workflow loaded.');
      setNodeStatuses({});
      setNodeLogs({});
      fetchRuns(data.id);
    } catch {
      setStatus('Failed to load workflow.');
    }
  };

  const handleWorkflowCreate = async (template = null) => {
    setShowTemplatePicker(false);
    try {
      const name = template ? template.name : 'Untitled';
      const created = await createWorkflow(name);
      const initialGraph = template ? template.graph : DEFAULT_GRAPH;
      await saveGraph(created.id, initialGraph);
      const wlist = await listWorkflows();
      setWorkflows(wlist);
      setCurrentWorkflowId(created.id);
      setGraph(initialGraph);
      setSelectedNodeId(null);
      setStatus('New workflow created.');
      setNodeStatuses({});
      setNodeOutputs({});
      setNodeLogs({});
    } catch {
      setStatus('Failed to create workflow.');
    }
  };

  const handleWorkflowDelete = async (id) => {
    try {
      await deleteWorkflow(id);
      const wlist = await listWorkflows();
      setWorkflows(wlist);
      // Switch to first remaining
      if (wlist.length > 0) {
        const data = await loadGraph(wlist[0].id);
        setCurrentWorkflowId(data.id);
        setGraph(data.graph || DEFAULT_GRAPH);
        setSelectedNodeId(null);
        setStatus('Workflow deleted.');
      }
    } catch {
      setStatus('Failed to delete workflow.');
    }
  };

  const handleWorkflowRename = async (id, name) => {
    try {
      await renameWorkflow(id, name);
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, name } : w));
    } catch {
      setStatus('Failed to rename workflow.');
    }
  };

  // ── Node / graph actions ──────────────────────────────────────────────────

  const selectedNode = useMemo(
    () => graph.nodes.find((node) => node.id === selectedNodeId) || null,
    [graph.nodes, selectedNodeId]
  );

  const updateNode = (updatedNode) => {
    setGraph((current) => ({
      ...current,
      nodes: current.nodes.map((node) => (node.id === updatedNode.id ? updatedNode : node)),
    }));
  };

  const deleteNode = (nodeId) => {
    setGraph((current) => ({
      ...current,
      nodes: current.nodes.filter((n) => n.id !== nodeId),
      edges: current.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    }));
    setSelectedNodeId(null);
  };

  const handleEdgeDelete = (edgeId) => {
    setGraph((current) => ({
      ...current,
      edges: current.edges.filter((e) => e.id !== edgeId),
    }));
  };

  const handleGlobalChange = (newGlobal) => {
    setGraph((current) => {
      const next = { ...current, global: newGlobal };
      if (backendAvailable && currentWorkflowId) {
        clearTimeout(autosaveTimer.current);
        autosaveTimer.current = setTimeout(() => {
          saveGraph(currentWorkflowId, next).catch(() => {});
        }, 1000);
      }
      return next;
    });
  };

  const handleNodesChange = (nodes) => {
    setGraph((current) => {
      const next = { ...current, nodes };
      if (backendAvailable && currentWorkflowId) {
        clearTimeout(autosaveTimer.current);
        autosaveTimer.current = setTimeout(() => {
          saveGraph(currentWorkflowId, next).catch(() => {});
        }, 1000);
      }
      return next;
    });
  };

  const handleEdgesChange = (edges) => {
    setGraph((current) => ({ ...current, edges }));
  };

  const handleAddNode = (type) => {
    setGraph((current) => ({ ...current, nodes: [...current.nodes, createNode(type)] }));
  };

  // Returns true if adding source→target would create a cycle among sequential edges.
  const _wouldCycle = (edges, source, target) => {
    // BFS: can we reach source from target through existing sequential edges?
    const adj = {};
    for (const e of edges) {
      if (e.type === 'loop_back') continue;
      if (!adj[e.source]) adj[e.source] = [];
      adj[e.source].push(e.target);
    }
    const queue = [target];
    const visited = new Set();
    while (queue.length) {
      const cur = queue.shift();
      if (cur === source) return true;
      if (visited.has(cur)) continue;
      visited.add(cur);
      for (const next of (adj[cur] || [])) queue.push(next);
    }
    return false;
  };

  const handleConnect = async (params) => {
    const sourceNode = graph.nodes.find((node) => node.id === params.source);
    const targetNode = graph.nodes.find((node) => node.id === params.target);
    let edgeType = 'sequential';
    let maxIterations = undefined;

    // Only treat as a back edge when the target is significantly above the source.
    // Horizontal offset is ignored — nodes are often laid out left/right without implying a loop.
    const isBackEdge = sourceNode && targetNode &&
      targetNode.position.y + 100 < sourceNode.position.y;

    if (isBackEdge) {
      const raw = window.prompt('Loop back detected. Enter max iterations:', '3');
      const iterations = parseInt(raw, 10);
      if (!raw || Number.isNaN(iterations) || iterations < 1) {
        setStatus('Loop creation canceled. Provide a positive integer.');
        return;
      }
      edgeType = 'loop_back';
      maxIterations = iterations;
    } else if (params.sourceHandle === 'handle-foreach-done') {
      edgeType = 'foreach_done';
    } else if (params.sourceHandle === 'true') {
      edgeType = 'conditional_true';
    } else if (params.sourceHandle === 'false') {
      edgeType = 'conditional_false';
    }

    // If the edge would create a cycle, offer to turn it into a loop_back instead.
    if (edgeType !== 'loop_back' && edgeType !== 'foreach_done' && _wouldCycle(graph.edges, params.source, params.target)) {
      const raw = window.prompt('This connection loops back. Enter max iterations for the retry loop:', '3');
      const iterations = parseInt(raw, 10);
      if (!raw || Number.isNaN(iterations) || iterations < 1) {
        setStatus('Loop creation canceled. Provide a positive integer.');
        return;
      }
      edgeType = 'loop_back';
      maxIterations = iterations;
    }

    const newEdge = {
      id: `e${Date.now()}`,
      source: params.source,
      target: params.target,
      type: edgeType,
      sourceHandle: params.sourceHandle || 'handle-out',
      targetHandle: params.targetHandle || 'handle-in',
      ...(edgeType === 'loop_back' ? { max_iterations: maxIterations } : {}),
    };

    setGraph((current) => ({ ...current, edges: [...current.edges, newEdge] }));
  };

  // ── Toolbar actions ───────────────────────────────────────────────────────

  const saveCurrentGraph = async () => {
    if (!currentWorkflowId) return;
    try {
      await saveGraph(currentWorkflowId, graph);
      setStatus('Workflow graph saved.');
      setBackendAvailable(true);
    } catch {
      setStatus('Failed to save workflow graph. Check backend and refresh.');
      setBackendAvailable(false);
    }
  };

  const generateCurrentWorkflow = async () => {
    if (!currentWorkflowId) {
      setStatus('No workflow selected.');
      return;
    }
    try {
      await saveGraph(currentWorkflowId, graph);
      const result = await generateWorkflow(currentWorkflowId);
      if (result.status === 'generated') {
        setStatus('Workflow generated successfully.');
      } else {
        const msg = result.message || 'Generation failed.';
        setStatus(msg);
        showError(msg);
      }
      await fetchPreview();
    } catch (err) {
      const msg = err.detail || err.message || 'Code generation failed.';
      setStatus(msg);
      showError(msg);
    }
  };

  const handleRun = useCallback(async (inputs = {}) => {
    setNodeStatuses({});
    try {
      await onStart(currentWorkflowId, inputs);
    } catch (err) {
      const msg = err.detail || err.message || 'Failed to start workflow.';
      setStatus(msg);
      showError(msg);
    }
  }, [onStart, currentWorkflowId]);

  // Always-on SSE connection — receives events from manual, webhook, and cron runs
  useEffect(() => {
    const connect = () => {
      esRef.current?.close();
      const es = new EventSource(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/events`);
      es.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'reset') {
          setNodeStatuses({});
          setNodeOutputs({});
          setNodeLogs({});
        } else if (data.type === 'snapshot') {
          setNodeStatuses(data.statuses || {});
          setNodeOutputs(data.outputs || {});
          setNodeLogs(data.logs || {});
        } else if (data.type === 'node_output') {
          setNodeOutputs(prev => ({ ...prev, [data.node_id]: data.output }));
        } else if (data.type === 'node_log') {
          setNodeLogs(prev => {
            const existing = prev[data.node_id] || [];
            const next = [...existing, data.entry].slice(-100);
            return { ...prev, [data.node_id]: next };
          });
        } else if (data.node_id === '__workflow__') {
          const terminal = data.status === 'error' || data.status === 'stopped' || data.status === 'success';
          if (terminal) {
            onWorkflowEnd?.(data.status);
            fetchRuns(currentWorkflowId);
            if (data.status === 'error' && data.message) showError(data.message);
          }
        } else if (data.node_id) {
          setNodeStatuses(prev => ({ ...prev, [data.node_id]: data.status }));
          if (data.status === 'error' && data.message) showError(`Node error: ${data.message}`);
        }
      };
      es.onerror = () => {
        es.close();
        setTimeout(connect, 2000); // reconnect after 2s
      };
      esRef.current = es;
    };
    connect();
    return () => esRef.current?.close();
  }, [currentWorkflowId]);

  useEffect(() => {
    if (!showTemplatePicker) return;
    const handler = (e) => { if (e.key === 'Escape') setShowTemplatePicker(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showTemplatePicker]);

  const fetchPreview = async () => {
    try {
      const result = await previewWorkflow();
      setPreviewCode(result.code || 'No workflow.py available.');
      setBackendAvailable(true);
    } catch {
      setPreviewCode('Backend unavailable. Cannot load preview.');
      setBackendAvailable(false);
    }
  };

  const fetchRuns = useCallback(async (wfId) => {
    if (!wfId) return;
    try {
      setRuns(await listRuns(wfId));
    } catch {
      // silently ignore
    }
  }, []);

  const fetchFiles = useCallback(async (path = '') => {
    try {
      const { entries } = await listFiles(path);
      setFileEntries(entries);
      setFilePath(path);
    } catch { /* ignore */ }
  }, []);

  const openLog = async (runId) => {
    try {
      const content = await getRunLog(runId);
      setLogModal({ runId, content });
    } catch {
      setLogModal({ runId, content: 'Log not available.' });
    }
  };

  // Live-poll log every 2s while modal is open
  useEffect(() => {
    if (!logModal?.runId) return;
    const iv = setInterval(async () => {
      try {
        const content = await getRunLog(logModal.runId);
        setLogModal(prev => prev ? { ...prev, content } : null);
      } catch { /* ignore */ }
    }, 2000);
    return () => clearInterval(iv);
  }, [logModal?.runId]);

  // Auto-scroll to bottom whenever log content changes
  useEffect(() => {
    if (logScrollRef.current) {
      logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
    }
  }, [logModal?.content]);

  if (loading) {
    return <div style={{ padding: 20, color: '#555', fontSize: 13 }}>Loading workflow builder...</div>;
  }

  return (
    <div className="workspace-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {errorToast && (
        <div style={{
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626',
          padding: '8px 14px 8px 12px', borderRadius: 7, fontSize: 12, zIndex: 9999,
          maxWidth: 520, boxShadow: '0 2px 12px rgba(220,38,38,0.12)',
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <span style={{ fontWeight: 700, flexShrink: 0 }}>⚠</span>
          <span style={{ flex: 1, wordBreak: 'break-word' }}>{errorToast}</span>
          <button
            onClick={() => setErrorToast(null)}
            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1, flexShrink: 0 }}
          >×</button>
        </div>
      )}
      {showTemplatePicker && (
        <div
          onClick={() => setShowTemplatePicker(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: '24px 24px 20px', width: 440, boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>New workflow</div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Start from a template or a blank canvas.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              {TEMPLATES.map(t => (
                <button
                  key={t.name}
                  onClick={() => handleWorkflowCreate(t)}
                  style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e4e0', background: '#fafaf9', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#1a1a1a'; e.currentTarget.style.background = '#f4f3f0'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e4e0'; e.currentTarget.style.background = '#fafaf9'; }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', marginBottom: 2 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: '#888', lineHeight: 1.4 }}>{t.desc}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => handleWorkflowCreate(null)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid #e5e4e0', background: '#fff', fontSize: 12, color: '#555', cursor: 'pointer', textAlign: 'center' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f4f3f0'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
            >
              Blank workflow
            </button>
          </div>
        </div>
      )}
      {inputsModal && (
        <div onClick={() => setInputsModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: '22px 22px 18px', width: 380, boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginBottom: 4 }}>Run with inputs</div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 14 }}>Fill in the workflow inputs before starting.</div>
            {inputsModal.fields.map(f => (
              <div key={f.name} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 3 }}>
                  {f.name}{f.description ? <span style={{ fontWeight: 400, color: '#aaa', marginLeft: 6 }}>{f.description}</span> : null}
                </div>
                <input
                  style={{ width: '100%', fontSize: 12, padding: '5px 8px', border: '1px solid #ddd', borderRadius: 5, boxSizing: 'border-box', fontFamily: 'Consolas, monospace' }}
                  placeholder={f.type || 'string'}
                  value={inputsModal.values[f.name] || ''}
                  onChange={e => setInputsModal(prev => ({ ...prev, values: { ...prev.values, [f.name]: e.target.value } }))}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setInputsModal(null)} style={{ flex: 1, padding: '7px', borderRadius: 6, border: '1px solid #e5e4e0', background: '#fff', fontSize: 12, color: '#555', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { const v = inputsModal.values; setInputsModal(null); handleRun(v); }} style={{ flex: 2, padding: '7px', borderRadius: 6, border: 'none', background: '#1a1a1a', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>▶ Run</button>
            </div>
          </div>
        </div>
      )}
      {nodeLogModal && (
        <NodeLogModal
          nodeId={nodeLogModal}
          node={graph.nodes.find(n => n.id === nodeLogModal) || null}
          logs={nodeLogs[nodeLogModal] || []}
          isRunning={nodeStatuses[nodeLogModal] === 'running'}
          onClose={() => setNodeLogModal(null)}
        />
      )}
      <WorkflowSelector
        workflows={workflows}
        currentId={currentWorkflowId}
        onSelect={handleWorkflowSelect}
        onCreate={() => setShowTemplatePicker(true)}
        onDelete={handleWorkflowDelete}
        onRename={handleWorkflowRename}
      />
      <GlobalConfigBar globalConfig={graph.global} onChange={handleGlobalChange} backendAvailable={backendAvailable} workflowId={currentWorkflowId} />
      <WorkspaceToolbar
        onAddNode={handleAddNode}
        onSave={saveCurrentGraph}
        onGenerate={generateCurrentWorkflow}
        onPreview={fetchPreview}
        onStart={() => {
          const declaredInputs = graph.global?.inputs || [];
          if (declaredInputs.length > 0) {
            const defaults = Object.fromEntries(declaredInputs.map(f => [f.name, '']));
            setInputsModal({ fields: declaredInputs, values: defaults });
          } else {
            handleRun({});
          }
        }}
        status={status}
        disabled={!backendAvailable}
      />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {selectedNode ? (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <NodeConfigPanel node={selectedNode} onUpdate={updateNode} onClose={() => setSelectedNodeId(null)} onDelete={deleteNode} />
          </div>
        ) : (
          <>
            <div style={{ flex: 1, minHeight: 0, padding: '0 8px 4px' }}>
              <GraphBuilder
                graph={graph}
                onNodesChange={handleNodesChange}
                onEdgesChange={handleEdgesChange}
                onConnect={handleConnect}
                onSelectNode={setSelectedNodeId}
                onEdgeDelete={handleEdgeDelete}
                selectedNodeId={selectedNodeId}
                nodeStatuses={nodeStatuses}
                nodeOutputs={nodeOutputs}
                nodeLogs={nodeLogs}
                onOpenLog={setNodeLogModal}
              />
            </div>
            <div style={{ flex: `0 0 ${bottomTab === 'files' ? 320 : 160}px`, margin: '0 8px 8px', background: '#0d1117', borderRadius: 10, border: '1px solid #30363d', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Tab bar */}
              <div style={{ padding: '0 8px', background: '#161b22', borderBottom: '1px solid #30363d', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, minHeight: 30 }}>
                {['preview', 'runs', 'files'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => {
                      setBottomTab(tab);
                      if (tab === 'runs') fetchRuns(currentWorkflowId);
                      if (tab === 'files') fetchFiles('');
                    }}
                    style={{
                      fontSize: 12, padding: '4px 10px', background: 'none', border: 'none', cursor: 'pointer',
                      color: bottomTab === tab ? '#e6edf3' : '#8b949e',
                      borderBottom: bottomTab === tab ? '2px solid #58a6ff' : '2px solid transparent',
                      fontFamily: 'Consolas, monospace',
                      fontWeight: bottomTab === tab ? 600 : 400,
                    }}
                  >
                    {tab === 'preview' ? 'workflow.py' : tab === 'runs' ? 'Runs' : 'Files'}
                  </button>
                ))}
                {bottomTab === 'preview' && (
                  <button
                    onClick={() => navigator.clipboard.writeText(previewCode)}
                    style={{ marginLeft: 'auto', fontSize: 11, color: '#8b949e', background: 'none', border: '1px solid #30363d', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}
                  >
                    Copy
                  </button>
                )}
              </div>

              {/* Tab content */}
              {bottomTab === 'preview' ? (
                <pre style={{ fontSize: 10, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#e6edf3', margin: 0, padding: '6px 10px', fontFamily: 'Consolas, monospace', overflow: 'auto', flex: 1 }}>
                  {previewCode}
                </pre>
              ) : bottomTab === 'runs' ? (
                <div style={{ overflow: 'auto', flex: 1, padding: '4px 0' }}>
                  {runs.length === 0 ? (
                    <div style={{ fontSize: 11, color: '#8b949e', padding: '12px 12px', textAlign: 'center' }}>No runs yet.</div>
                  ) : runs.map(run => (
                    <div
                      key={run.id}
                      onClick={() => openLog(run.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', cursor: 'pointer', borderRadius: 4 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#161b22'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: 10, color: STATUS_DOT[run.status] || '#8b949e' }}>●</span>
                      <span style={{ fontSize: 10, color: '#e6edf3', flex: 1, fontFamily: 'Consolas, monospace' }}>{run.status}</span>
                      <span style={{ fontSize: 10, color: '#8b949e' }}>{timeAgo(run.started_at)}</span>
                      <span style={{ fontSize: 10, color: '#8b949e', minWidth: 36, textAlign: 'right' }}>{fmtDuration(run.started_at, run.finished_at)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                /* Files tab */
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                  {/* Breadcrumb + upload */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderBottom: '1px solid #30363d', flexShrink: 0, flexWrap: 'wrap' }}>
                    <span
                      style={{ fontSize: 11, color: '#58a6ff', cursor: 'pointer', fontFamily: 'Consolas, monospace' }}
                      onClick={() => fetchFiles('')}
                    >/workspace</span>
                    {filePath && filePath.split('/').filter(Boolean).map((seg, i, arr) => (
                      <span key={i} style={{ fontSize: 11, fontFamily: 'Consolas, monospace', color: '#8b949e' }}>
                        {'/'}
                        <span
                          style={{ color: '#58a6ff', cursor: 'pointer' }}
                          onClick={() => fetchFiles(arr.slice(0, i + 1).join('/'))}
                        >{seg}</span>
                      </span>
                    ))}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{ fontSize: 11, padding: '2px 8px', background: '#238636', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                      >Upload</button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          for (const f of e.target.files) {
                            await uploadFile(filePath, f).catch(() => {});
                          }
                          fetchFiles(filePath);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  </div>
                  {/* File list */}
                  <div style={{ overflow: 'auto', flex: 1 }}>
                    {fileEntries.length === 0 ? (
                      <div style={{ fontSize: 11, color: '#8b949e', padding: '12px', textAlign: 'center' }}>Empty directory.</div>
                    ) : fileEntries.map(entry => (
                      <div
                        key={entry.path}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', cursor: entry.is_dir ? 'pointer' : 'default' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#161b22'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => entry.is_dir && fetchFiles(entry.path)}
                      >
                        <span style={{ fontSize: 11 }}>{entry.is_dir ? '📁' : '📄'}</span>
                        <span style={{ fontSize: 11, color: '#e6edf3', flex: 1, fontFamily: 'Consolas, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
                        {!entry.is_dir && (
                          <>
                            <span style={{ fontSize: 10, color: '#8b949e', flexShrink: 0 }}>{fmtSize(entry.size)}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); downloadFile(entry.path); }}
                              style={{ fontSize: 10, padding: '1px 6px', background: 'none', border: '1px solid #30363d', borderRadius: 3, color: '#8b949e', cursor: 'pointer', flexShrink: 0 }}
                            >↓</button>
                          </>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteFile(entry.path).then(() => fetchFiles(filePath)).catch(() => {}); }}
                          style={{ fontSize: 10, padding: '1px 6px', background: 'none', border: '1px solid #30363d', borderRadius: 3, color: '#8b949e', cursor: 'pointer', flexShrink: 0 }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Log modal */}
            {logModal && (
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setLogModal(null)}
              >
                <div
                  style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 10, width: '70vw', maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ padding: '8px 14px', borderBottom: '1px solid #30363d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#8b949e', fontFamily: 'Consolas, monospace' }}>run log — {logModal.runId.slice(0, 8)}…</span>
                    <button onClick={() => setLogModal(null)} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 16 }}>×</button>
                  </div>
                  <pre ref={logScrollRef} style={{ fontSize: 10, lineHeight: 1.6, color: '#e6edf3', margin: 0, padding: '10px 14px', fontFamily: 'Consolas, monospace', overflow: 'auto', flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {logModal.content}
                  </pre>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
