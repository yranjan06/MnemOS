from dotenv import load_dotenv

load_dotenv()

import asyncio
import importlib
import importlib.util
import json
import os
import sqlite3
import subprocess
import time
import uuid
from pathlib import Path
import mimetypes
import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File, Body, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from contextlib import asynccontextmanager

# Ensure DBUS_SESSION_BUS_ADDRESS is set so OculOS can connect to the session bus.
if not os.environ.get("DBUS_SESSION_BUS_ADDRESS"):
    _result = subprocess.run(
        ["dbus-launch", "--sh-syntax"], capture_output=True, text=True
    )
    for _line in _result.stdout.splitlines():
        if "=" in _line:
            _key, _, _val = _line.partition("=")
            os.environ[_key.strip()] = _val.strip().rstrip(";").strip("'")

import state as _state
from state import pause_event
from codegen import generate, CodegenError

FILES_ROOT = Path("/workspace")
WORKFLOW_JSON = Path("/workspace/workflow.json")  # legacy migration source
WORKFLOW_PY = Path("/workspace/workflow.py")  # always overwritten by current workflow
SECRETS_FILE = Path("/workspace/.secrets.env")  # legacy migration source
ENV_FILE = Path("/workspace/.env")  # legacy migration source
DB_PATH = Path("/workspace/mnemos.db")

agent_task: asyncio.Task | None = None
_current_run_id: str | None = None
_current_workflow_name: str = ""


# ── SQLite helpers ────────────────────────────────────────────────────────────


def _db() -> sqlite3.Connection:
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def _reload_secrets() -> None:
    """Load all secrets from DB into os.environ."""
    with _db() as con:
        for row in con.execute("SELECT key, value FROM secrets"):
            os.environ[row["key"]] = row["value"]


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _db() as con:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS workflows (
                id      TEXT PRIMARY KEY,
                name    TEXT NOT NULL DEFAULT 'Untitled',
                graph   TEXT NOT NULL,
                created REAL NOT NULL,
                updated REAL NOT NULL
            )
        """
        )
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS secrets (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """
        )
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS runs (
                id            TEXT PRIMARY KEY,
                workflow_id   TEXT NOT NULL,
                workflow_name TEXT NOT NULL,
                started_at    REAL NOT NULL,
                finished_at   REAL,
                status        TEXT,
                log_file      TEXT
            )
        """
        )

    # Migrate legacy workflow.json → DB (only if DB is empty)
    with _db() as con:
        if con.execute("SELECT COUNT(*) FROM workflows").fetchone()[0] == 0:
            if WORKFLOW_JSON.exists():
                now = time.time()
                con.execute(
                    "INSERT INTO workflows VALUES (?,?,?,?,?)",
                    (
                        str(uuid.uuid4()),
                        "Untitled",
                        WORKFLOW_JSON.read_text(),
                        now,
                        now,
                    ),
                )

    # Migrate legacy .secrets.env and .env → DB (only if secrets table is empty)
    with _db() as con:
        if con.execute("SELECT COUNT(*) FROM secrets").fetchone()[0] == 0:
            for src in (SECRETS_FILE, ENV_FILE):
                if src.exists():
                    for line in src.read_text().splitlines():
                        line = line.strip()
                        if "=" in line and not line.startswith("#"):
                            k, _, v = line.partition("=")
                            con.execute(
                                "INSERT OR IGNORE INTO secrets VALUES (?,?)",
                                (k.strip(), v.strip()),
                            )

    _reload_secrets()


# ── App lifecycle ─────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    scheduler = asyncio.create_task(_scheduler_loop())
    yield
    scheduler.cancel()
    if agent_task and not agent_task.done():
        agent_task.cancel()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Secrets endpoints ─────────────────────────────────────────────────────────


@app.get("/secrets")
async def secrets_list():
    """Return secret keys only — values never leave the server."""
    with _db() as con:
        keys = [
            row["key"] for row in con.execute("SELECT key FROM secrets ORDER BY key")
        ]
    return {"keys": keys}


@app.post("/secrets")
async def secrets_save(payload: dict):
    """Full replace of secrets table from payload."""
    secrets = [s for s in payload.get("secrets", []) if s.get("key", "").strip()]
    with _db() as con:
        con.execute("DELETE FROM secrets")
        for s in secrets:
            con.execute(
                "INSERT INTO secrets VALUES (?,?)",
                (s["key"].strip(), s["value"]),
            )
    _reload_secrets()
    return {"status": "saved", "count": len(secrets)}


# ── Workflow CRUD endpoints ───────────────────────────────────────────────────


@app.get("/workflows")
async def workflows_list():
    with _db() as con:
        rows = con.execute(
            "SELECT id, name, created, updated FROM workflows ORDER BY updated DESC"
        ).fetchall()
    return {"workflows": [dict(r) for r in rows]}


@app.post("/workflows")
async def workflow_create(payload: dict = {}):
    wid = str(uuid.uuid4())
    name = payload.get("name", "Untitled")
    now = time.time()
    empty = json.dumps(
        {
            "version": "1",
            "global": {"llm": "groq/llama-3.3-70b-versatile", "human_in_the_loop": False},
            "nodes": [],
            "edges": [],
        }
    )
    with _db() as con:
        con.execute(
            "INSERT INTO workflows VALUES (?,?,?,?,?)", (wid, name, empty, now, now)
        )
    return {"id": wid, "name": name}


@app.delete("/workflows/{wid}")
async def workflow_delete(wid: str):
    with _db() as con:
        cur = con.execute("DELETE FROM workflows WHERE id=?", (wid,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Workflow not found")
    return {"status": "deleted"}


@app.patch("/workflows/{wid}/rename")
async def workflow_rename(wid: str, payload: dict):
    name = payload.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    with _db() as con:
        cur = con.execute(
            "UPDATE workflows SET name=?, updated=? WHERE id=?",
            (name, time.time(), wid),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Workflow not found")
    return {"id": wid, "name": name}


# ── Workflow graph endpoints ──────────────────────────────────────────────────


@app.get("/workflow/load")
async def workflow_load(id: str | None = None):
    with _db() as con:
        if id:
            row = con.execute(
                "SELECT graph FROM workflows WHERE id=?", (id,)
            ).fetchone()
        else:
            row = con.execute(
                "SELECT graph FROM workflows ORDER BY updated DESC LIMIT 1"
            ).fetchone()
    if not row:
        return {"graph": None, "id": None}
    # Also return the id so the frontend knows which workflow is loaded
    with _db() as con:
        if id:
            meta = con.execute(
                "SELECT id, name FROM workflows WHERE id=?", (id,)
            ).fetchone()
        else:
            meta = con.execute(
                "SELECT id, name FROM workflows ORDER BY updated DESC LIMIT 1"
            ).fetchone()
    return {"graph": json.loads(row["graph"]), "id": meta["id"], "name": meta["name"]}


@app.post("/workflow/save")
async def workflow_save(payload: dict):
    wid = payload.get("id")
    graph = payload.get("graph")
    if not wid or graph is None:
        raise HTTPException(status_code=400, detail="id and graph are required")
    with _db() as con:
        cur = con.execute(
            "UPDATE workflows SET graph=?, updated=? WHERE id=?",
            (json.dumps(graph), time.time(), wid),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Workflow not found")
    return {"status": "saved"}


@app.post("/workflow/generate")
async def workflow_generate(payload: dict = {}):
    wid = payload.get("id")
    with _db() as con:
        if wid:
            row = con.execute(
                "SELECT graph FROM workflows WHERE id=?", (wid,)
            ).fetchone()
        else:
            row = con.execute(
                "SELECT graph FROM workflows ORDER BY updated DESC LIMIT 1"
            ).fetchone()
    if not row:
        return {"status": "error", "message": "No workflow found. Create one first."}
    try:
        graph_data = json.loads(row["graph"])
        code = generate(graph_data)
        WORKFLOW_PY.write_text(code)
        return {"status": "generated", "length": len(code)}
    except CodegenError as e:
        return {"status": "error", "message": str(e)}
    except Exception as e:
        return {"status": "error", "message": f"Unexpected error: {e}"}


@app.get("/workflow/preview")
async def workflow_preview():
    if WORKFLOW_PY.exists():
        return {"code": WORKFLOW_PY.read_text()}
    return {"code": None}


# ── SSE execution events ──────────────────────────────────────────────────────


@app.get("/events")
async def events():
    q: asyncio.Queue = asyncio.Queue()
    _state._sse_queues.append(q)

    async def stream():
        snapshot = json.dumps(
            {
                "type": "snapshot",
                "statuses": _state.get_node_statuses(),
                "outputs": _state.get_node_outputs(),
                "logs": _state.get_node_logs(),
            }
        )
        yield f"data: {snapshot}\n\n"
        try:
            while True:
                event = await q.get()
                yield f"data: {json.dumps(event)}\n\n"
        finally:
            _state._sse_queues.remove(q)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Agent control endpoints ───────────────────────────────────────────────────


async def _run_workflow(workflow_id: str, inputs: dict | None = None) -> dict:
    """Core workflow execution — shared by /start, /webhook, and the cron scheduler."""
    global agent_task, _current_run_id

    if agent_task and not agent_task.done():
        return {"status": "already_running"}

    with _db() as con:
        row = con.execute(
            "SELECT id, name, graph FROM workflows WHERE id=?", (workflow_id,)
        ).fetchone()

    if not row:
        return {"status": "error", "message": "Workflow not found."}

    wid = row["id"]
    workflow_name = row["name"]
    run_id = str(uuid.uuid4())
    log_path = f"/workspace/runs/{run_id}.log"
    Path("/workspace/runs").mkdir(parents=True, exist_ok=True)

    try:
        graph_data = json.loads(row["graph"])
        code = generate(graph_data, log_file_path=log_path, inputs=inputs or {})
        WORKFLOW_PY.write_text(code)
    except Exception as e:
        return {"status": "error", "message": f"Code generation failed: {e}"}

    with _db() as con:
        con.execute(
            "INSERT INTO runs VALUES (?,?,?,?,?,?,?)",
            (run_id, wid, workflow_name, time.time(), None, "running", log_path),
        )
    _current_run_id = run_id

    spec = importlib.util.spec_from_file_location("workflow", WORKFLOW_PY)
    _wf = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(_wf)

    _state.reset_execution()
    pause_event.set()

    async def _run():
        global _current_run_id
        final_status = "success"
        try:
            await _wf.main(pause_event=pause_event)
        except asyncio.CancelledError:
            final_status = "stopped"
            _state.report_node("__workflow__", "stopped")
            raise
        except Exception:
            import traceback as _tb
            final_status = "error"
            _state.report_node("__workflow__", "error")
            _tb.print_exc()  # goes to tee'd stderr → log file
            raise
        finally:
            rid = _current_run_id
            if rid:
                with _db() as con:
                    con.execute(
                        "UPDATE runs SET finished_at=?, status=? WHERE id=?",
                        (time.time(), final_status, rid),
                    )

    agent_task = asyncio.create_task(_run())
    return {"status": "started", "run_id": run_id}


@app.post("/start")
async def start(id: str | None = None, payload: dict | None = Body(default=None)):
    inputs = (payload or {}).get("inputs", {})

    if id:
        return await _run_workflow(id, inputs)

    # Default to most recently updated workflow
    with _db() as con:
        row = con.execute(
            "SELECT id FROM workflows ORDER BY updated DESC LIMIT 1"
        ).fetchone()
    if not row:
        return {"status": "error", "message": "No workflow found. Create one first."}
    return await _run_workflow(row["id"], inputs)


@app.post("/webhook/{workflow_id}")
async def webhook_trigger(
    workflow_id: str,
    payload: dict | None = Body(default=None),
    x_mnemos_secret: str | None = Header(default=None),
):
    """Trigger a workflow run via HTTP. Request body is passed as workflow inputs."""
    with _db() as con:
        row = con.execute(
            "SELECT graph FROM workflows WHERE id=?", (workflow_id,)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Workflow not found")

    graph_data = json.loads(row["graph"])
    expected_secret = graph_data.get("global", {}).get("webhook_secret", "")
    if expected_secret and x_mnemos_secret != expected_secret:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    inputs = payload or {}
    return await _run_workflow(workflow_id, inputs)


# ── Cron scheduler ────────────────────────────────────────────────────────────

async def _scheduler_loop():
    """Check every minute (aligned to clock boundaries) for cron triggers."""
    try:
        from croniter import croniter
    except ImportError:
        import logging
        logging.getLogger("mnemos").warning(
            "croniter not installed — cron scheduling disabled. Rebuild the container."
        )
        return

    while True:
        # Sleep until the top of the next minute so matches are always exact
        now = datetime.datetime.now()
        seconds_until_next_minute = 60 - now.second - now.microsecond / 1_000_000
        await asyncio.sleep(seconds_until_next_minute)

        try:
            tick = datetime.datetime.now().replace(second=0, microsecond=0)
            with _db() as con:
                rows = con.execute("SELECT id, graph FROM workflows").fetchall()
            for row in rows:
                graph_data = json.loads(row["graph"])
                triggers = graph_data.get("global", {}).get("triggers", [])
                for t in triggers:
                    if not t.get("enabled", True):
                        continue
                    if t.get("type") != "cron":
                        continue
                    cron_expr = t.get("cron", "").strip()
                    if not cron_expr:
                        continue
                    try:
                        if croniter.match(cron_expr, tick):
                            inputs = t.get("inputs", {})
                            await _run_workflow(row["id"], inputs)
                    except Exception:
                        pass  # malformed cron expression — skip
        except Exception:
            pass  # never crash the scheduler loop


@app.get("/debug/cron")
async def debug_cron():
    """Diagnose cron scheduling — shows what the scheduler sees right now."""
    result = {"croniter_installed": False, "now": None, "workflows": []}
    try:
        from croniter import croniter
        result["croniter_installed"] = True
    except ImportError:
        return result

    now = datetime.datetime.now().replace(second=0, microsecond=0)
    result["now"] = now.isoformat()

    with _db() as con:
        rows = con.execute("SELECT id, name, graph FROM workflows").fetchall()

    for row in rows:
        graph_data = json.loads(row["graph"])
        triggers = graph_data.get("global", {}).get("triggers", [])
        wf_entry = {"id": row["id"], "name": row["name"], "triggers": []}
        for t in triggers:
            match = None
            error = None
            try:
                match = croniter.match(t.get("cron", ""), now)
            except Exception as e:
                error = str(e)
            wf_entry["triggers"].append({
                "type": t.get("type"),
                "cron": t.get("cron"),
                "enabled": t.get("enabled"),
                "would_match_now": match,
                "error": error,
            })
        result["workflows"].append(wf_entry)

    return result


@app.get("/runs")
async def list_runs(workflow_id: str):
    with _db() as con:
        rows = con.execute(
            "SELECT id, workflow_name, started_at, finished_at, status FROM runs "
            "WHERE workflow_id=? ORDER BY started_at DESC LIMIT 20",
            (workflow_id,),
        ).fetchall()
    return {"runs": [dict(r) for r in rows]}


@app.get("/runs/{run_id}/log")
async def get_run_log(run_id: str):
    with _db() as con:
        row = con.execute("SELECT log_file FROM runs WHERE id=?", (run_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Run not found")
    log_path = Path(row["log_file"])
    if not log_path.exists():
        raise HTTPException(status_code=404, detail="Log file not found")

    def _iter():
        with open(log_path, encoding="utf-8") as f:
            yield from f

    return StreamingResponse(_iter(), media_type="text/plain")


@app.post("/interrupt")
async def interrupt():
    pause_event.clear()
    return {"status": "paused", "message": "Pause requested — will pause after current step completes."}


@app.post("/resume")
async def resume():
    pause_event.set()
    return {"status": "resumed"}


@app.post("/stop")
async def stop():
    global agent_task
    if agent_task and not agent_task.done():
        agent_task.cancel()
        try:
            await asyncio.wait_for(asyncio.shield(agent_task), timeout=5.0)
        except (asyncio.CancelledError, asyncio.TimeoutError):
            pass
        # If task is still alive after 5 s, it swallowed CancelledError — force-clear it
        if not agent_task.done():
            agent_task.cancel()
            agent_task = None
        _state.report_node("__workflow__", "stopped")
        return {"status": "stopped"}
    return {"status": "not_running"}


@app.get("/status")
async def status():
    running = agent_task is not None and not agent_task.done()
    paused = not pause_event.is_set()
    return {
        "running": running,
        "paused": paused,
        "state": "paused" if paused else ("running" if running else "idle"),
    }


# ── File manager endpoints ────────────────────────────────────────────────────


def _safe_path(rel: str) -> Path:
    """Resolve rel inside FILES_ROOT; raise 400 if it would escape."""
    p = (FILES_ROOT / rel).resolve()
    if not str(p).startswith(str(FILES_ROOT.resolve())):
        raise HTTPException(status_code=400, detail="Invalid path")
    return p


@app.get("/files")
async def list_files(path: str = ""):
    dir_path = _safe_path(path)
    if not dir_path.exists() or not dir_path.is_dir():
        raise HTTPException(status_code=404, detail="Directory not found")
    entries = []
    for item in sorted(
        dir_path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())
    ):
        entries.append(
            {
                "name": item.name,
                "path": str(item.relative_to(FILES_ROOT)).replace("\\", "/"),
                "is_dir": item.is_dir(),
                "size": item.stat().st_size if item.is_file() else None,
                "modified": item.stat().st_mtime,
            }
        )
    return {"path": path, "entries": entries}


@app.post("/files/upload")
async def upload_file(path: str = "", file: UploadFile = File(...)):
    dir_path = _safe_path(path)
    dir_path.mkdir(parents=True, exist_ok=True)
    dest = _safe_path(str(Path(path) / file.filename))
    with open(dest, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            f.write(chunk)
    return {
        "status": "uploaded",
        "path": str(dest.relative_to(FILES_ROOT)).replace("\\", "/"),
    }


@app.get("/files/download")
async def download_file(path: str):
    file_path = _safe_path(path)
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    mime, _ = mimetypes.guess_type(str(file_path))
    return StreamingResponse(
        open(file_path, "rb"),
        media_type=mime or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{file_path.name}"'},
    )


@app.delete("/files")
async def delete_file(path: str):
    target = _safe_path(path)
    if not target.exists():
        raise HTTPException(status_code=404, detail="Not found")
    if target.is_dir():
        target.rmdir()  # only empty dirs — prevents accidental data loss
    else:
        target.unlink()
    return {"status": "deleted"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend:app", host="0.0.0.0", port=8000, reload=False)
