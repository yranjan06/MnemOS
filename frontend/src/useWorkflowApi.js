const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// ── Workflow CRUD ─────────────────────────────────────────────────────────────

export async function listWorkflows() {
  const r = await fetch(`${API}/workflows`);
  if (!r.ok) throw new Error(`Failed to list workflows: ${r.statusText}`);
  return (await r.json()).workflows; // [{id, name, created, updated}]
}

export async function createWorkflow(name = "Untitled") {
  const r = await fetch(`${API}/workflows`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!r.ok) throw new Error(`Failed to create workflow: ${r.statusText}`);
  return await r.json(); // {id, name}
}

export async function deleteWorkflow(id) {
  const r = await fetch(`${API}/workflows/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error(`Failed to delete workflow: ${r.statusText}`);
  return await r.json();
}

export async function renameWorkflow(id, name) {
  const r = await fetch(`${API}/workflows/${id}/rename`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!r.ok) throw new Error(`Failed to rename workflow: ${r.statusText}`);
  return await r.json(); // {id, name}
}

// ── Workflow graph ────────────────────────────────────────────────────────────

export async function loadGraph(id = null) {
  const url = id ? `${API}/workflow/load?id=${id}` : `${API}/workflow/load`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Failed to load workflow graph: ${r.statusText}`);
  return await r.json(); // {graph, id, name}
}

export async function saveGraph(id, graph) {
  const r = await fetch(`${API}/workflow/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, graph }),
  });
  if (!r.ok) throw new Error(`Failed to save workflow graph: ${r.statusText}`);
  return await r.json();
}

export async function generateWorkflow(id = null) {
  const r = await fetch(`${API}/workflow/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!r.ok) throw new Error(`Failed to generate workflow: ${r.statusText}`);
  return await r.json();
}

export async function previewWorkflow() {
  const r = await fetch(`${API}/workflow/preview`);
  if (!r.ok) throw new Error(`Failed to load workflow preview: ${r.statusText}`);
  return await r.json();
}

// ── Run history ───────────────────────────────────────────────────────────────

export async function listRuns(workflowId) {
  const r = await fetch(`${API}/runs?workflow_id=${workflowId}`);
  if (!r.ok) throw new Error(`Failed to list runs: ${r.statusText}`);
  return (await r.json()).runs; // [{id, workflow_name, started_at, finished_at, status}]
}

export async function getRunLog(runId) {
  const r = await fetch(`${API}/runs/${runId}/log`);
  if (!r.ok) throw new Error(`Log not found`);
  return await r.text();
}

// ── File manager ──────────────────────────────────────────────────────────────

export async function listFiles(path = '') {
  const r = await fetch(`${API}/files?path=${encodeURIComponent(path)}`);
  if (!r.ok) throw new Error('Failed to list files');
  return r.json(); // {path, entries: [{name, path, is_dir, size, modified}]}
}

export async function uploadFile(path, file) {
  const fd = new FormData();
  fd.append('file', file);
  const r = await fetch(`${API}/files/upload?path=${encodeURIComponent(path)}`, {
    method: 'POST',
    body: fd,
  });
  if (!r.ok) throw new Error('Upload failed');
  return r.json();
}

export function downloadFile(path) {
  window.open(`${API}/files/download?path=${encodeURIComponent(path)}`, '_blank');
}

export async function deleteFile(path) {
  const r = await fetch(`${API}/files?path=${encodeURIComponent(path)}`, { method: 'DELETE' });
  if (!r.ok) throw new Error('Delete failed');
  return r.json();
}
