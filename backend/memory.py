"""MnemOS memory layer — backed by HydraDB.

Tenant model:
  tenant_id    = workflow_id  (one isolated memory space per workflow)
  sub_tenant_id = run_id | "global"  (per-run scoping within a workflow)

Memories  — dynamic observations, errors, outcomes stored per run
Knowledge — static documents (site maps, domain docs) stored per workflow
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


async def ensure_tenant(workflow_id: str) -> None:
    """Create HydraDB tenant for this workflow (idempotent — ignores 409)."""
    client = _get_client()
    try:
        await client.tenant.create(tenant_id=workflow_id)
        # wait briefly for infra to provision
        for _ in range(12):
            status = await client.tenant.get_infra_status(tenant_id=workflow_id)
            if status.get("graph_status") and status.get("vectorstore_status"):
                break
            await asyncio.sleep(5)
    except Exception:
        pass  # already exists or provisioning failed silently


async def remember(
    key: str,
    value: str,
    workflow_id: str,
    run_id: str = "global",
) -> None:
    """Store a memory entry scoped to a workflow."""
    client = _get_client()
    await ensure_tenant(workflow_id)
    await client.upload.add_memory(
        tenant_id=workflow_id,
        sub_tenant_id=run_id,
        memories=[
            {
                "text": f"[{key}]: {value}",
                "infer": True,
            }
        ],
    )


async def recall(
    query: str,
    workflow_id: str,
    top_k: int = 5,
    run_id: str = "global",
) -> list[dict]:
    """Semantic + graph recall of relevant memories."""
    client = _get_client()
    try:
        result = await client.recall.recall_preferences(
            tenant_id=workflow_id,
            sub_tenant_id=run_id,
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
    """Recall across all runs (for recovery agent — needs cross-run context)."""
    client = _get_client()
    try:
        result = await client.recall.full_recall(
            tenant_id=workflow_id,
            query=query,
            max_results=top_k,
            mode="fast",
            graph_context=True,
        )
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
            sub_tenant_id="global",
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
