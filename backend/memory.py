"""MnemOS memory layer — backed by HydraDB.

Tenant model (single shared tenant):
  tenant_id     = "mnemos"      (one tenant for the whole instance)
  sub_tenant_id = workflow_id   (per-workflow memory scoping)

Using a single tenant avoids HydraDB free-tier per-tenant limits and
eliminates provisioning delays on first run of a new workflow.
"""

from __future__ import annotations

import asyncio
import os
from typing import Any

_client = None
_TENANT = "mnemos"


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


async def ensure_tenant(tenant_id: str = _TENANT) -> None:
    """Create HydraDB tenant (idempotent — ignores 409). Waits up to 150s."""
    client = _get_client()
    try:
        await client.tenant.create(tenant_id=tenant_id)
    except Exception:
        pass  # already exists — that's fine
    # wait for vectorstore to be provisioned (up to 150s)
    for _ in range(30):
        try:
            status = await client.tenant.get_infra_status(tenant_id=tenant_id)
            vs = status.get("vectorstore_status", "")
            gr = status.get("graph_status", "")
            if (str(vs).lower() in ("active", "ready", "true", "1") and
                    str(gr).lower() in ("active", "ready", "true", "1")):
                return
        except Exception:
            pass
        await asyncio.sleep(5)


async def remember(
    key: str,
    value: str,
    workflow_id: str,
    run_id: str = "global",
) -> None:
    """Store a memory entry scoped to a workflow."""
    client = _get_client()
    await ensure_tenant(_TENANT)
    for attempt in range(3):
        try:
            await client.upload.add_memory(
                tenant_id=_TENANT,
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
            if "TENANT_NOT_FOUND" in str(e) and attempt < 2:
                await ensure_tenant(_TENANT)
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
            tenant_id=_TENANT,
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
            tenant_id=_TENANT,
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
            tenant_id=_TENANT,
            source_ids=[key],
        )
    except Exception:
        pass


async def get_all(workflow_id: str, limit: int = 50) -> list[dict]:
    """Fetch recent memories for the UI panel."""
    client = _get_client()
    try:
        result = await client.recall.recall_preferences(
            tenant_id=_TENANT,
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
