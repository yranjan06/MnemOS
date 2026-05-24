"""MnemOS memory layer — backed by HydraDB.

Tenant model:
  tenant_id    = workflow_id  (one isolated memory space per workflow)
  sub_tenant_id = workflow_id | "global"  (for cross-run recall)

ensure_tenant checks infra status FIRST — skips creation if already ready.
This avoids ForbiddenError on free-tier re-runs and handles slow provisioning.
"""

from __future__ import annotations

import asyncio
import os
from typing import Any

_client = None


def _get_client():
    global _client
    if _client is None:
        api_key = os.environ.get("HYDRA_DB_API_KEY", "")
        if not api_key:
            raise RuntimeError(
                "HYDRA_DB_API_KEY not set. Get a free key at app.hydradb.com"
            )
        from hydra_db import AsyncHydraDB
        _client = AsyncHydraDB(token=api_key)
    return _client


def _infra_ready(status) -> bool:
    """Check InfraStatusResponse object or plain dict for ready vectorstore+graph."""
    def _ok(v):
        if isinstance(v, bool):
            return v
        if isinstance(v, list):
            return len(v) > 0 and all(bool(x) for x in v)
        return str(v).lower() in ("active", "ready", "true", "1")

    # Pydantic InfraStatusResponse object: status.infra.vectorstore_status
    if hasattr(status, "infra"):
        infra = status.infra
        return _ok(getattr(infra, "vectorstore_status", False)) and \
               _ok(getattr(infra, "graph_status", False))
    # Plain dict fallback
    return _ok(status.get("vectorstore_status", "")) and \
           _ok(status.get("graph_status", ""))


async def ensure_tenant(workflow_id: str) -> None:
    """Ensure HydraDB tenant is ready. Checks status first, creates if missing."""
    client = _get_client()

    # Fast path: tenant already provisioned
    try:
        status = await client.tenant.get_infra_status(tenant_id=workflow_id)
        if _infra_ready(status):
            return
    except Exception:
        pass

    # Try to create (idempotent — 409 is fine, ForbiddenError means already exists)
    try:
        await client.tenant.create(tenant_id=workflow_id)
    except Exception:
        pass  # already exists or free-tier limit — will poll status below

    # Poll up to 150s for provisioning
    for _ in range(30):
        await asyncio.sleep(5)
        try:
            status = await client.tenant.get_infra_status(tenant_id=workflow_id)
            if _infra_ready(status):
                return
        except Exception:
            pass


async def remember(
    key: str,
    value: str,
    workflow_id: str,
    run_id: str = "global",
) -> None:
    """Store a memory entry scoped to a workflow."""
    client = _get_client()
    await ensure_tenant(workflow_id)
    for attempt in range(3):
        try:
            await client.upload.add_memory(
                tenant_id=workflow_id,
                sub_tenant_id=workflow_id,
                memories=[
                    {
                        "text": f"[{key}]: {value}",
                        "infer": True,
                    }
                ],
            )
            return
        except Exception as e:
            if "NOT_FOUND" in str(e) and attempt < 2:
                await ensure_tenant(workflow_id)
                await asyncio.sleep(5)
            else:
                raise


async def recall(
    query: str,
    workflow_id: str,
    top_k: int = 5,
    run_id: str = "global",
) -> list[dict]:
    """Semantic + graph recall scoped to this workflow."""
    client = _get_client()
    try:
        result = await client.recall.recall_preferences(
            tenant_id=workflow_id,
            sub_tenant_id=workflow_id,
            query=query,
            mode="fast",
            max_results=top_k,
        )
        if isinstance(result, list):
            return result
        return result.get("results", []) if isinstance(result, dict) else []
    except Exception:
        return []


async def recall_all_runs(
    query: str,
    workflow_id: str,
    top_k: int = 5,
) -> list[dict]:
    """Recall across all runs for this workflow."""
    client = _get_client()
    try:
        result = await client.recall.recall_preferences(
            tenant_id=workflow_id,
            sub_tenant_id=workflow_id,
            query=query,
            mode="fast",
            max_results=top_k,
        )
        chunks = getattr(result, "chunks", None)
        if chunks is not None:
            return [
                {
                    "key": c.source_id or "",
                    "value": c.chunk_content or "",
                    "text": c.chunk_content or "",
                    "score": c.relevancy_score or 0,
                }
                for c in chunks
            ]
        if isinstance(result, list):
            return result
        return result.get("results", []) if isinstance(result, dict) else []
    except Exception:
        return []


async def forget(key: str, workflow_id: str) -> None:
    """Best-effort deletion by key prefix."""
    client = _get_client()
    try:
        await client.upload.delete_knowledge(
            tenant_id=workflow_id,
            source_ids=[key],
        )
    except Exception:
        pass


async def get_all(workflow_id: str, limit: int = 50) -> list[dict]:
    """Fetch recent memories for the UI panel."""
    client = _get_client()
    try:
        result = await client.recall.recall_preferences(
            tenant_id=workflow_id,
            sub_tenant_id=workflow_id,
            query="all observations outcomes errors",
            mode="fast",
            max_results=limit,
        )
        items = result if isinstance(result, list) else result.get("results", [])
        return [_normalise(m) for m in items]
    except Exception:
        return []


def _normalise(m: Any) -> dict:
    """Flatten HydraDB result shape to a consistent dict for the UI."""
    if isinstance(m, dict):
        return {
            "key":   m.get("key") or m.get("id") or "",
            "value": m.get("value") or m.get("text") or m.get("content") or str(m),
            "score": m.get("score", 0),
            "created_at": m.get("created_at") or m.get("timestamp") or "",
        }
    return {"key": "", "value": str(m), "score": 0, "created_at": ""}
