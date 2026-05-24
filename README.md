# MnemOS

> **An agentic OS that remembers, recovers, and adapts.**

Built for the **"Agents Under Pressure: Build Your Own OS"** hackathon.  
Powered by [HydraDB](https://hydradb.com) · [Groq](https://groq.com) (Llama 3.3 70B) · Browser computer-use

---

## What is MnemOS?

MnemOS is a **visual workflow builder for desktop AI agents** that runs in a fully containerized virtual desktop. Unlike standard agent frameworks, MnemOS agents don't start fresh each run — they carry memory across sessions, recover from failures automatically, and adapt their strategy based on what they've learned.

It extends a browser-automation execution engine with four new primitives:

| Primitive | What it does |
|-----------|-------------|
| **Remember node** | Stores observations, outcomes, and errors in HydraDB |
| **Recall node** | Retrieves relevant memory via graph-enhanced hybrid search |
| **Recover node** | Wraps any action in try/catch — queries memory for past failures, asks LLM for alternative approach |
| **Plan node** | Reads memory context, asks LLM to choose the best next action from defined options |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   MnemOS UI (React)                 │
│   Graph Builder · Mission Control · Memory Panel    │
└──────────────┬──────────────────────────────────────┘
               │ REST + SSE
┌──────────────▼──────────────────────────────────────┐
│              FastAPI Backend (Python)               │
│   Workflow CRUD · Codegen · Cron · File Manager     │
└──────┬───────────────┬───────────────┬──────────────┘
       │               │               │
┌──────▼──────┐ ┌──────▼──────┐ ┌─────▼──────────────┐
│  SQLite DB  │ │  HydraDB    │ │  Virtual Desktop    │
│  workflows  │ │  Memory +   │ │  Chrome · Playwright│
│  runs       │ │  Knowledge  │ │  noVNC · XFCE       │
│  secrets    │ │  Graph      │ │                     │
└─────────────┘ └─────────────┘ └────────────────────┘
```

**Execution flow:** Visual graph → JSON → Codegen (Python) → Execute in VM → SSE stream → UI

---

## Hackathon Track Coverage

| Track | MnemOS implementation | Status |
|-------|----------------------|--------|
| **Memory** | HydraDB `remember` / `recall` nodes — graph-enhanced semantic retrieval across all runs | ✅ |
| **Tools** | Browser (Playwright), HydraDB API, MCP server support, webhooks, cron, file system, code execution | ✅ |
| **Recovery** | `Recover` node wraps any action — on failure: queries memory for past errors, LLM proposes alternative, retries | ✅ |
| **Adaptation** | `Plan` node reads memory context, LLM selects strategy from defined options at runtime | ✅ |

---

## Quick Start

```bash
git clone https://github.com/yranjan06/MnemOS
cd MnemOS
cp .env.example .env
```

Edit `.env` with real keys:

```env
GROQ_API_KEY=gsk_...              # console.groq.com → API Keys (free tier)
HYDRA_DB_API_KEY=sk_live_...      # app.hydradb.com → Settings → API Keys (free sandbox)
LITELLM_MODEL=groq/llama-3.3-70b-versatile
```

```bash
docker compose up --build
# First build: ~8-10 min (downloads Chrome, Playwright, Python deps)
# Subsequent starts: ~30s (images cached)
```

**Services after startup:**

| URL | What |
|-----|------|
| `http://localhost:3000` | MnemOS UI |
| `http://localhost:8000/docs` | FastAPI Swagger |
| `http://localhost:6080` | Virtual desktop (noVNC) |

> **Note:** The HydraDB API key format is `sk_live_...` (not `hdb_...`). Both formats are accepted.

---

## Demo Workflow

`demos/price-monitor.json` — import via the UI.

**What it demonstrates:**

1. **Recall** — fetches price history from HydraDB before navigating
2. **Navigate + Recover** — goes to product page; if extraction fails, LLM proposes alternative and retries
3. **Plan** — reads memory context, decides: `alert_price_change` | `log_no_change` | `investigate_further`
4. **Remember** — stores observation in HydraDB for next run

Every run learns from the previous one.

---

## Node Types

| Node | Track | Description |
|------|-------|-------------|
| `Do` | Tools | Freeform action on the visible page |
| `Navigate` | Tools | Go to a URL |
| `Read` | Tools | Extract structured data with schema |
| `Fill` | Tools | Fill forms (supports `{{secrets.KEY}}`) |
| `Check` | Tools | Conditional branching |
| `Code` | Tools | Inline Python execution |
| `Remember` | **Memory** | Store observation in HydraDB |
| `Recall` | **Memory** | Retrieve from HydraDB (graph-enhanced) |
| `Recover` | **Recovery** | Try/catch wrapper with LLM-guided retry |
| `Plan` | **Adaptation** | Memory-informed LLM decision node |

---

## Why HydraDB?

Vector databases return *similar* results. HydraDB returns *useful* ones — graph traversal over extracted entities + temporal versioning.

For MnemOS: recovery agent sees all past failures for a node, not just similar text. Plan node gets coherent context threads, not isolated chunks. Memory persists across container restarts. No local embedding model to download or manage.

---

## LLM Configuration

Default: **Groq (llama-3.3-70b-versatile)**. Switch in the UI LLM field or `.env`:

```env
# OpenAI
LITELLM_MODEL=openai/gpt-4o-mini
OPENAI_API_KEY=sk-...

# Local
LITELLM_MODEL=ollama/llama3.2
OLLAMA_BASE_URL=http://localhost:11434
```

---

## Project Structure

```
MnemOS/
├── backend/
│   ├── backend.py      # FastAPI — all endpoints
│   ├── codegen.py      # Graph JSON → Python workflow
│   ├── memory.py       # HydraDB integration
│   ├── recovery.py     # Failure analysis + LLM retry
│   └── state.py        # SSE pub-sub
├── frontend/
│   └── src/
│       └── components/
│           ├── MemoryPanel/     # Live memory viewer
│           └── MissionControl/  # Memory + Runs dashboard
├── demos/
│   └── price-monitor.json
└── docker-compose.yml
```

---

*Built for "Agents Under Pressure: Build Your Own OS" · HydraDB community hackathon*
