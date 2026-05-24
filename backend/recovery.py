"""MnemOS recovery agent.

When a node fails, analyze the error against past failures from HydraDB
and ask the LLM for a concrete alternative action to retry with.

Intentionally text-only — Groq's llama-3.3-70b-versatile has no vision.
Screenshot capture is skipped; error text + memory context is sufficient.
"""

from __future__ import annotations

import json
import os
import re

from litellm import acompletion

import memory as _memory

_MODEL = os.environ.get("LITELLM_MODEL", "groq/llama-3.3-70b-versatile")

_SYSTEM = (
    "You are a recovery agent for MnemOS, an agentic OS. "
    "Your job is to analyze agent failures and suggest a concrete, different approach. "
    "Be specific and actionable. Never suggest retrying the identical action. "
    "Respond with valid JSON only — no markdown, no commentary."
)


async def analyze_and_recover(
    node_id: str,
    node_label: str,
    original_action: str,
    error: str,
    workflow_id: str,
    run_id: str = "global",
) -> dict:
    """Return a recovery plan dict:
    {
        "should_retry": bool,
        "alternative_action": str,
        "strategy": str,
        "confidence": float 0-1
    }
    """
    # store this failure so future runs can learn from it
    await _memory.remember(
        key=f"failure:{node_id}",
        value=f"node={node_label} | error={error[:300]} | action={original_action[:200]}",
        workflow_id=workflow_id,
        run_id=run_id,
    )

    # recall past failures for this node across all runs
    past = await _memory.recall_all_runs(
        query=f"failure {node_label} {error[:100]}",
        workflow_id=workflow_id,
        top_k=3,
    )
    past_text = "\n".join(
        f"- {m.get('value') or m.get('text') or str(m)}" for m in past
    ) or "No past failures on record."

    prompt = (
        f"Node: {node_label} (id={node_id})\n"
        f"Original action: {original_action}\n"
        f"Error: {error}\n"
        f"Past failures for this node:\n{past_text}\n\n"
        'Respond with JSON: {"should_retry": true/false, "strategy": "brief name", '
        '"alternative_action": "specific instruction — different from original", '
        '"confidence": 0.0}'
    )

    try:
        resp = await acompletion(
            model=_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": prompt},
            ],
            max_tokens=512,
            temperature=0.3,
        )
        raw = resp.choices[0].message.content or "{}"
        clean = re.sub(r"```json|```", "", raw).strip()
        plan = json.loads(clean)
    except json.JSONDecodeError:
        plan = {
            "should_retry": True,
            "strategy": "llm_suggested",
            "alternative_action": raw if "raw" in dir() else original_action,
            "confidence": 0.4,
        }
    except Exception as exc:
        plan = {
            "should_retry": False,
            "strategy": "recovery_failed",
            "alternative_action": "",
            "confidence": 0.0,
            "error": str(exc),
        }

    # store the chosen recovery strategy so we don't repeat bad ones
    if plan.get("should_retry"):
        await _memory.remember(
            key=f"recovery:{node_id}",
            value=f"strategy={plan.get('strategy')} | action={plan.get('alternative_action', '')[:200]}",
            workflow_id=workflow_id,
            run_id=run_id,
        )

    return plan
