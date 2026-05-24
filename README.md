# MnemOS

# MnemOS — Complete Build Guide
> **An agentic OS that remembers, recovers, and adapts.**
> Built on Orbit-UI · Powered by Groq (Llama 3.3 70B) · Hackathon: "Agents Under Pressure"

---

## Identity

| Field | Value |
|-------|-------|
| **Project Name** | MnemOS |
| **GitHub Repo** | `mnemos` |
| **Tagline** | *An agentic OS that remembers, recovers, and adapts* |
| **Name Origin** | Mnemosyne — Greek goddess of memory + OS |
| **Base** | Fork of [Orbit-UI](https://github.com/orbitproject/orbit-ui) |
| **LLM** | Groq API → `llama-3.3-70b-versatile` |
| **Embeddings** | `sentence-transformers/all-MiniLM-L6-v2` (local, CPU) |

---

## GitHub Strategy — Commit History That Tells a Story

Every commit should be readable as a changelog. Judges and recruiters will look at your history.

### Commit Message Format
```
<type>(<scope>): <short description>

Types: feat | fix | refactor | docs | chore | style | test
```

### Target Commit History (in order)
```
chore: initial project setup — fork of orbit-ui, rename to mnemos
docs: add README with MnemOS vision and architecture overview
chore: configure Groq/Llama as default LLM via LiteLLM
feat(memory): add SQLite memory schema (memories table)
feat(memory): implement remember() recall() forget() functions
feat(memory): add sentence-transformers embedding support
feat(memory): expose /memory endpoints in FastAPI
feat(nodes): add Memory node type to codegen pipeline
feat(recovery): implement RecoveryAgent node with screenshot + LLM retry
feat(recovery): wire on_error edge type into graph execution
feat(ui): add Memory Panel to sidebar (shows live memory contents)
feat(ui): add Mission Control dashboard (runs, memory, recovery log)
feat(ui): rebrand UI — MnemOS color scheme, logo, typography
feat(demo): add price-monitor demo workflow (exercises all 4 tracks)
docs: update README with setup guide and demo walkthrough
chore: final Docker + env cleanup for submission
```

---

## Phase 0 — Setup (30 min)

### Step 1: Fork & Clone

```bash
# Fork orbit-ui on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/orbit-ui.git mnemos
cd mnemos

# Update remote to your new repo
git remote set-url origin https://github.com/YOUR_USERNAME/mnemos.git
git push origin main

# First commit
git add .
git commit -m "chore: initial project setup — fork of orbit-ui, rename to mnemos"
git push
```

### Step 2: Rename References

In the codebase, find+replace:
- `orbit-ui` → `mnemos`
- `Orbit` → `MnemOS` (in UI strings, titles, README)

### Step 3: Folder Structure (Final Target)

```
mnemos/
├── backend/
│   ├── main.py              # FastAPI app (existing)
│   ├── codegen.py           # Graph → Python codegen (existing)
│   ├── state.py             # SSE state manager (existing)
│   ├── memory.py            # 🆕 MnemOS memory layer
│   ├── recovery.py          # 🆕 Recovery agent logic
│   ├── nodes/
│   │   ├── base.py          # existing
│   │   ├── memory_node.py   # 🆕 Memory node type
│   │   └── recovery_node.py # 🆕 Recovery node type
│   └── db/
│       └── mnemos.db        # SQLite (auto-created)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MemoryPanel/     # 🆕 Live memory viewer
│   │   │   ├── MissionControl/  # 🆕 Dashboard
│   │   │   └── nodes/           # existing node UI + new ones
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── ...
├── docker-compose.yml
├── .env.example             # 🆕 updated with Groq vars
└── README.md                # 🆕 full rewrite
```

### Step 4: Configure Groq

Create `.env` from `.env.example`:
```env
# LLM
LITELLM_MODEL=groq/llama-3.3-70b-versatile
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

# Fallback (optional — local Ollama)
# LITELLM_MODEL=ollama/llama3.2
# OLLAMA_BASE_URL=http://localhost:11434
```

Commit:
```bash
git add .
git commit -m "chore: configure Groq/Llama as default LLM via LiteLLM"
```

---

## Phase 1 — Memory Layer (Day 1, Hours 0–8)

### Step 5: SQLite Schema

**`backend/memory.py`**
```python
import sqlite3
import json
import numpy as np
from datetime import datetime
from sentence_transformers import SentenceTransformer
from pathlib import Path

DB_PATH = Path("db/mnemos.db")
_embed_model = None

def _get_embed_model():
    global _embed_model
    if _embed_model is None:
        _embed_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embed_model

def init_db():
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id TEXT,
            run_id TEXT,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            embedding BLOB,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.commit()
    conn.close()

def remember(key: str, value: str, workflow_id: str = None, run_id: str = None):
    """Store a memory with embedding."""
    model = _get_embed_model()
    embedding = model.encode(f"{key}: {value}")
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO memories (workflow_id, run_id, key, value, embedding) VALUES (?,?,?,?,?)",
        (workflow_id, run_id, key, value, embedding.tobytes())
    )
    conn.commit()
    conn.close()

def recall(query: str, top_k: int = 5, workflow_id: str = None) -> list[dict]:
    """Semantic recall — returns top_k most relevant memories."""
    model = _get_embed_model()
    query_emb = model.encode(query)
    
    conn = sqlite3.connect(DB_PATH)
    where = "WHERE workflow_id = ?" if workflow_id else ""
    params = (workflow_id,) if workflow_id else ()
    rows = conn.execute(
        f"SELECT key, value, embedding, created_at FROM memories {where} ORDER BY created_at DESC LIMIT 100",
        params
    ).fetchall()
    conn.close()
    
    if not rows:
        return []
    
    scored = []
    for key, value, emb_bytes, created_at in rows:
        if emb_bytes:
            emb = np.frombuffer(emb_bytes, dtype=np.float32)
            score = float(np.dot(query_emb, emb) / (np.linalg.norm(query_emb) * np.linalg.norm(emb) + 1e-8))
            scored.append({"key": key, "value": value, "score": score, "created_at": created_at})
    
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]

def forget(key: str, workflow_id: str = None):
    """Delete memories by key."""
    conn = sqlite3.connect(DB_PATH)
    if workflow_id:
        conn.execute("DELETE FROM memories WHERE key=? AND workflow_id=?", (key, workflow_id))
    else:
        conn.execute("DELETE FROM memories WHERE key=?", (key,))
    conn.commit()
    conn.close()

def get_all(workflow_id: str = None) -> list[dict]:
    """Get all memories (for UI panel)."""
    conn = sqlite3.connect(DB_PATH)
    where = "WHERE workflow_id = ?" if workflow_id else ""
    params = (workflow_id,) if workflow_id else ()
    rows = conn.execute(
        f"SELECT id, workflow_id, run_id, key, value, created_at FROM memories {where} ORDER BY created_at DESC",
        params
    ).fetchall()
    conn.close()
    return [{"id": r[0], "workflow_id": r[1], "run_id": r[2], "key": r[3], "value": r[4], "created_at": r[5]} for r in rows]
```

```bash
pip install sentence-transformers numpy
git add backend/memory.py
git commit -m "feat(memory): add SQLite memory schema and remember/recall/forget functions"
```

### Step 6: FastAPI Memory Endpoints

In `backend/main.py`, add:
```python
from memory import init_db, remember, recall, get_all, forget

# Call at startup
init_db()

@app.get("/memory")
def list_memory(workflow_id: str = None):
    return get_all(workflow_id)

@app.post("/memory/remember")
def api_remember(payload: dict):
    remember(
        key=payload["key"],
        value=payload["value"],
        workflow_id=payload.get("workflow_id"),
        run_id=payload.get("run_id")
    )
    return {"status": "ok"}

@app.post("/memory/recall")
def api_recall(payload: dict):
    return recall(query=payload["query"], top_k=payload.get("top_k", 5))

@app.delete("/memory/{key}")
def api_forget(key: str):
    forget(key)
    return {"status": "deleted"}
```

```bash
git add backend/main.py
git commit -m "feat(memory): expose /memory REST endpoints in FastAPI"
```

### Step 7: Memory Node Type in Codegen

In `backend/codegen.py`, inside the node handler switch/dict, add:

```python
# Inside the node type handlers:

elif node["verb"] == "Remember":
    key = node["params"].get("key", "observation")
    value_expr = node["params"].get("value", "''")
    code = f"""
    # Memory: Remember
    from memory import remember
    remember(
        key={json.dumps(key)},
        value=str({value_expr}),
        workflow_id=workflow_id,
        run_id=run_id
    )
    outputs[{json.dumps(node_id)}] = {{"status": "remembered", "key": {json.dumps(key)}}}
    """

elif node["verb"] == "Recall":
    query_expr = node["params"].get("query", "''")
    top_k = node["params"].get("top_k", 5)
    code = f"""
    # Memory: Recall
    from memory import recall
    memories = recall(query=str({query_expr}), top_k={top_k}, workflow_id=workflow_id)
    memory_context = "\\n".join([f"[{{m['key']}}]: {{m['value']}}" for m in memories])
    outputs[{json.dumps(node_id)}] = {{"memories": memories, "context": memory_context}}
    """
```

```bash
git add backend/codegen.py backend/memory.py
git commit -m "feat(nodes): add Memory (Remember/Recall) node types to codegen pipeline"
```

---

## Phase 2 — Recovery Agent (Day 1, Hours 8–16)

### Step 8: Recovery Logic

**`backend/recovery.py`**
```python
import base64
from litellm import acompletion
from memory import remember, recall
import os

MODEL = os.getenv("LITELLM_MODEL", "groq/llama-3.3-70b-versatile")

async def analyze_failure_and_recover(
    node_id: str,
    error: str,
    screenshot_b64: str = None,
    workflow_id: str = None,
    task_description: str = ""
) -> dict:
    """
    Given a failure, query memory for past attempts,
    ask LLM for alternative approach.
    Returns: { "strategy": str, "should_retry": bool, "alternative_action": str }
    """
    # Store this failure in memory
    remember(
        key=f"failure:{node_id}",
        value=f"Error: {error} | Task: {task_description}",
        workflow_id=workflow_id
    )
    
    # Recall past failures for this node
    past = recall(query=f"failure {node_id} {task_description}", top_k=3, workflow_id=workflow_id)
    past_context = "\n".join([f"- {m['value']}" for m in past]) or "No past failures recorded."

    # Build recovery prompt
    messages = [
        {
            "role": "system",
            "content": (
                "You are a recovery agent for an agentic OS. "
                "Analyze failures and suggest concrete alternative approaches. "
                "Be specific and actionable. Respond in JSON only."
            )
        },
        {
            "role": "user",
            "content": (
                f"Task: {task_description}\n"
                f"Error: {error}\n"
                f"Past failures:\n{past_context}\n\n"
                "Respond with JSON: "
                '{"should_retry": true/false, "strategy": "brief strategy name", '
                '"alternative_action": "specific instruction for what to try instead", '
                '"confidence": 0.0-1.0}'
            )
        }
    ]
    
    # Attach screenshot if available
    if screenshot_b64:
        messages[1]["content"] = [
            {"type": "text", "text": messages[1]["content"]},
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{screenshot_b64}"}}
        ]

    response = await acompletion(model=MODEL, messages=messages, max_tokens=512)
    raw = response.choices[0].message.content
    
    import json, re
    try:
        clean = re.sub(r"```json|```", "", raw).strip()
        return json.loads(clean)
    except Exception:
        return {"should_retry": True, "strategy": "generic_retry", "alternative_action": raw, "confidence": 0.5}
```

In `codegen.py`, add Recovery node handler:
```python
elif node["verb"] == "Recover":
    wrapped_node_id = node["params"].get("wraps")  # which node to wrap
    task_desc = node["params"].get("task", "unknown task")
    code = f"""
    # Recovery wrapper for node: {wrapped_node_id}
    from recovery import analyze_failure_and_recover
    _recovery_result = await analyze_failure_and_recover(
        node_id={json.dumps(wrapped_node_id)},
        error=str(outputs.get("__last_error__", "unknown")),
        workflow_id=workflow_id,
        task_description={json.dumps(task_desc)}
    )
    outputs[{json.dumps(node_id)}] = _recovery_result
    """
```

```bash
git add backend/recovery.py backend/codegen.py
git commit -m "feat(recovery): implement RecoveryAgent with memory-aware LLM retry logic"
```

---

## Phase 3 — UI Changes (Day 2, Hours 0–8)

### Step 9: Memory Panel Component

**`frontend/src/components/MemoryPanel/MemoryPanel.jsx`**
```jsx
import { useState, useEffect } from "react";

export default function MemoryPanel({ workflowId }) {
  const [memories, setMemories] = useState([]);

  useEffect(() => {
    const fetchMemories = async () => {
      const url = workflowId ? `/memory?workflow_id=${workflowId}` : "/memory";
      const res = await fetch(url);
      const data = await res.json();
      setMemories(data);
    };
    fetchMemories();
    const interval = setInterval(fetchMemories, 3000); // poll every 3s
    return () => clearInterval(interval);
  }, [workflowId]);

  return (
    <div className="memory-panel">
      <div className="memory-panel__header">
        <span className="memory-panel__icon">🧠</span>
        <h3>Agent Memory</h3>
        <span className="memory-panel__count">{memories.length} entries</span>
      </div>
      <div className="memory-panel__list">
        {memories.length === 0 && (
          <p className="memory-panel__empty">No memories yet. Run a workflow.</p>
        )}
        {memories.map((m) => (
          <div key={m.id} className="memory-panel__item">
            <div className="memory-panel__key">{m.key}</div>
            <div className="memory-panel__value">{m.value}</div>
            <div className="memory-panel__meta">{m.created_at}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**`frontend/src/components/MemoryPanel/MemoryPanel.css`**
```css
.memory-panel {
  background: #0d0d0d;
  border: 1px solid #1e1e2e;
  border-radius: 8px;
  padding: 16px;
  font-family: 'JetBrains Mono', monospace;
  color: #cdd6f4;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.memory-panel__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  border-bottom: 1px solid #1e1e2e;
  padding-bottom: 8px;
}

.memory-panel__header h3 {
  font-size: 13px;
  font-weight: 600;
  color: #89b4fa;
  margin: 0;
}

.memory-panel__count {
  margin-left: auto;
  font-size: 11px;
  color: #6c7086;
  background: #1e1e2e;
  padding: 2px 6px;
  border-radius: 999px;
}

.memory-panel__list {
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.memory-panel__item {
  background: #1e1e2e;
  border-radius: 6px;
  padding: 8px 10px;
  border-left: 3px solid #89b4fa;
}

.memory-panel__key {
  font-size: 11px;
  color: #89b4fa;
  font-weight: 600;
  margin-bottom: 2px;
}

.memory-panel__value {
  font-size: 12px;
  color: #cdd6f4;
  word-break: break-word;
}

.memory-panel__meta {
  font-size: 10px;
  color: #6c7086;
  margin-top: 4px;
}

.memory-panel__empty {
  font-size: 12px;
  color: #6c7086;
  text-align: center;
  margin-top: 24px;
}
```

```bash
git add frontend/src/components/MemoryPanel/
git commit -m "feat(ui): add Memory Panel — live agent memory viewer with 3s polling"
```

### Step 10: MnemOS Branding (CSS Variables)

In `frontend/src/index.css` or global styles, add:
```css
:root {
  /* MnemOS Design System */
  --mnemos-bg: #0a0a0f;
  --mnemos-surface: #0d0d1a;
  --mnemos-border: #1a1a2e;
  --mnemos-accent: #7c6af7;       /* memory purple */
  --mnemos-accent-2: #3bd9c8;     /* recovery teal */
  --mnemos-accent-3: #f7a76a;     /* warning amber */
  --mnemos-text: #e8e8f0;
  --mnemos-text-muted: #6b6b8a;
  --mnemos-font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --mnemos-font-ui: 'DM Sans', system-ui, sans-serif;
}
```

Update `index.html` title:
```html
<title>MnemOS — Agentic OS</title>
```

```bash
git add frontend/
git commit -m "feat(ui): rebrand to MnemOS — color system, typography, title"
```

---

## Phase 4 — Demo Workflow (Day 2, Hours 8–12)

### Step 11: The Demo Workflow JSON

Save as `demos/price-monitor.json` in your repo:

```json
{
  "name": "Price Monitor — MnemOS Demo",
  "description": "Monitors a product page, remembers price history, recovers from failures, adapts to layout changes",
  "nodes": [
    { "id": "bootstrap", "verb": "Bootstrap", "label": "Start" },
    { "id": "recall_history", "verb": "Recall", "label": "Recall Price History",
      "params": { "query": "product price observation" } },
    { "id": "navigate", "verb": "Navigate", "label": "Go to Product Page",
      "params": { "url": "https://books.toscrape.com/catalogue/a-light-in-the-attic_1000/index.html" } },
    { "id": "read_price", "verb": "Read", "label": "Extract Price",
      "params": { "schema": { "price": "string", "title": "string", "in_stock": "boolean" } } },
    { "id": "remember_price", "verb": "Remember", "label": "Store Price",
      "params": { "key": "product_price", "value": "{{read_price.price}} at {{read_price.title}}" } },
    { "id": "check_change", "verb": "Check", "label": "Price Changed?",
      "params": { "condition": "{{read_price.price}} != {{recall_history.memories[0].value}}" } },
    { "id": "alert", "verb": "Do", "label": "Log Alert",
      "params": { "action": "Log that price has changed from {{recall_history.memories[0].value}} to {{read_price.price}}" } }
  ],
  "edges": [
    { "from": "bootstrap", "to": "recall_history" },
    { "from": "recall_history", "to": "navigate" },
    { "from": "navigate", "to": "read_price" },
    { "from": "read_price", "to": "remember_price" },
    { "from": "remember_price", "to": "check_change" },
    { "from": "check_change", "to": "alert", "type": "conditional_true" }
  ]
}
```

```bash
mkdir demos
git add demos/price-monitor.json
git commit -m "feat(demo): add price-monitor workflow — exercises all 4 hackathon tracks"
```

---

## Phase 5 — README (Final Commit Before Submission)

**`README.md`** structure:
```markdown
# MnemOS

> An agentic OS that remembers, recovers, and adapts.

![MnemOS Banner]

## What is MnemOS?

MnemOS is a visual workflow builder for desktop AI agents that adds 
**persistent memory**, **automatic recovery**, and **adaptive re-planning** 
to agent execution — built on top of Orbit-UI.

## Architecture

[diagram: Static Graph → Codegen → Execute ↔ Memory Layer ↔ Recovery Agent]

## Hackathon Tracks Coverage

| Track | How MnemOS handles it |
|-------|----------------------|
| Memory | SQLite + semantic embeddings — agents recall past runs |
| Tools | Playwright browser + MCP + file system + webhooks |
| Recovery | RecoveryAgent node — screenshot + LLM retry with memory |
| Adaptation | Recall-informed re-planning via Planner node |

## Quick Start

\`\`\`bash
git clone https://github.com/YOUR_USERNAME/mnemos
cd mnemos
cp .env.example .env  # add your GROQ_API_KEY
docker compose up
# Open http://localhost:3000
\`\`\`

## LLM Configuration

Default: Groq (llama-3.3-70b-versatile)
Fallback: Any LiteLLM-compatible model (OpenAI, Anthropic, Ollama)

## Demo

[Link to demo video]

Built for "Agents Under Pressure: Build Your Own OS" hackathon.
```

```bash
git add README.md .env.example
git commit -m "docs: complete README with architecture, quick start, and track coverage"
git push origin main
```

---

## Checklist Before Submission

```
[ ] Groq API key works, LLM calls succeed
[ ] memory.py init_db() called on startup (no crash on fresh run)
[ ] /memory endpoint returns data after a workflow run
[ ] Memory Panel visible in sidebar, updates live
[ ] Recovery node handles at least one failure gracefully
[ ] Demo workflow (price-monitor) runs end-to-end
[ ] README has setup instructions a judge can follow
[ ] GitHub has clean commit history (matches the 16-commit plan above)
[ ] .env.example has all vars (no real keys committed!)
[ ] Docker compose up works from a fresh clone
```

---

## Quick Reference — What Each File Does

| File | Purpose |
|------|---------|
| `backend/memory.py` | Core memory layer — remember/recall/forget |
| `backend/recovery.py` | Failure analysis + LLM recovery strategy |
| `backend/codegen.py` | Modified to handle Memory + Recovery node verbs |
| `backend/main.py` | FastAPI — add /memory endpoints, call init_db() |
| `frontend/src/components/MemoryPanel/` | Live memory UI |
| `demos/price-monitor.json` | The demo workflow |
| `.env.example` | Groq + config template |
| `README.md` | Project overview for judges |
