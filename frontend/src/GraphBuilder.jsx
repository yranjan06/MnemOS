import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow, applyEdgeChanges, applyNodeChanges,
  Background, Controls, useReactFlow,
  BaseEdge, EdgeLabelRenderer, getSmoothStepPath,
} from '@xyflow/react';
import AgentNode from './OrbitNode';

const nodeTypes = { orbitNode: AgentNode };

// Custom edge with a × delete button at the midpoint
function DeletableEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, label, data, animated }) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <>
      <BaseEdge path={edgePath} style={style} />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          {label && (
            <span style={{ fontSize: 10, background: '#1c1c1c', padding: '1px 5px', borderRadius: 3, border: '1px solid rgba(255,255,255,0.1)', color: '#888880' }}>
              {label}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); data?.onDelete?.(id); }}
            title="Delete edge"
            style={{
              width: 16, height: 16,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.12)',
              background: '#1c1c1c',
              color: '#555550',
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              lineHeight: 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#2a1a1a'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#1c1c1c'; e.currentTarget.style.color = '#555550'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
          >
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = { deletable: DeletableEdge };

const EDGE_STROKE = {
  sequential:        'rgba(255,255,255,0.18)',
  conditional_true:  '#d4f53c',
  conditional_false: '#ef4444',
  loop_back:         'rgba(255,255,255,0.35)',
  foreach_done:      'rgba(255,255,255,0.25)',
};

// Auto-pans the viewport to the currently running node.
// Must live inside <ReactFlow> to use useReactFlow().
function AutoPanner({ nodeStatuses }) {
  const { setCenter, getNode, getZoom } = useReactFlow();
  const prevStatuses = useRef({});

  useEffect(() => {
    for (const [id, status] of Object.entries(nodeStatuses)) {
      if (status === 'running' && prevStatuses.current[id] !== 'running') {
        const node = getNode(id);
        if (node) {
          const w = node.measured?.width ?? 160;
          const h = node.measured?.height ?? 100;
          setCenter(node.position.x + w / 2, node.position.y + h / 2, {
            zoom: Math.max(getZoom(), 0.75),
            duration: 350,
          });
        }
      }
    }
    prevStatuses.current = { ...nodeStatuses };
  }, [nodeStatuses, setCenter, getNode, getZoom]);

  return null;
}

export default function GraphBuilder({ graph, onNodesChange, onEdgesChange, onConnect, onSelectNode, onEdgeDelete, selectedNodeId, nodeStatuses = {}, nodeOutputs = {}, nodeLogs = {}, onOpenLog }) {
  // Keep refs so edge/log callbacks always call the latest version, never a stale closure
  const onEdgeDeleteRef = useRef(onEdgeDelete);
  useEffect(() => { onEdgeDeleteRef.current = onEdgeDelete; }, [onEdgeDelete]);
  const stableOnEdgeDelete = useCallback((id) => onEdgeDeleteRef.current?.(id), []);

  const onOpenLogRef = useRef(onOpenLog);
  useEffect(() => { onOpenLogRef.current = onOpenLog; }, [onOpenLog]);
  const stableOnOpenLog = useCallback((id) => onOpenLogRef.current?.(id), []);

  const flowNodes = useMemo(
    () =>
      graph.nodes.map((node) => {
        const logs = nodeLogs[node.id] || [];
        return {
          id: node.id,
          type: 'orbitNode',
          position: node.position,
          width: node.width,
          height: node.height,
          measured: node.measured,
          data: {
            nodeType: node.type,
            label: node.label,
            preview: node.config?.target || node.config?.task || node.config?.condition || node.config?.code || node.config?.class_name || node.config?.packages || '',
            status: nodeStatuses[node.id] || null,
            output: nodeOutputs[node.id] ?? null,
            latestLog: logs.at(-1) || null,
            logCount: logs.length,
            hasLogs: logs.length > 0,
            onOpenLog: () => stableOnOpenLog(node.id),
          },
        };
      }),
    [graph.nodes, nodeStatuses, nodeOutputs, nodeLogs, stableOnOpenLog]
  );

  const flowEdges = useMemo(
    () =>
      graph.edges.map((edge) => {
        const label =
          edge.type === 'loop_back' ? `loop ×${edge.max_iterations || 3}`
          : edge.type === 'conditional_true' ? 'true'
          : edge.type === 'conditional_false' ? 'false'
          : edge.type === 'foreach_done' ? 'done'
          : '';
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          type: 'deletable',
          animated: edge.type !== 'sequential',
          label,
          style: {
            stroke: EDGE_STROKE[edge.type] || EDGE_STROKE.sequential,
            strokeWidth: 1.5,
          },
          data: { onDelete: stableOnEdgeDelete },
        };
      }),
    [graph.edges, stableOnEdgeDelete]
  );

  const handleNodesChange = useCallback(
    (changes) => {
      const nextFlowNodes = applyNodeChanges(changes, flowNodes);
      const nextGraphNodes = nextFlowNodes
        .map((fn) => {
          const og = graph.nodes.find((n) => n.id === fn.id);
          if (!og) return undefined;
          return { ...og, position: fn.position, width: fn.width, height: fn.height, measured: fn.measured };
        })
        .filter(Boolean);
      onNodesChange(nextGraphNodes);
    },
    [flowNodes, graph.nodes, onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes) => {
      const nextFlowEdges = applyEdgeChanges(changes, flowEdges);
      const nextGraphEdges = nextFlowEdges
        .map((fe) => {
          const og = graph.edges.find((e) => e.id === fe.id);
          return og ? { ...og, source: fe.source, target: fe.target, sourceHandle: fe.sourceHandle, targetHandle: fe.targetHandle } : undefined;
        })
        .filter(Boolean);
      onEdgesChange(nextGraphEdges);
    },
    [flowEdges, graph.edges, onEdgesChange]
  );

  return (
    <div style={{ flex: 1, width: '100%', height: '100%', minHeight: 0, borderRadius: 8, overflow: 'hidden', background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.07)', position: 'relative' }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        deleteKeyCode={['Delete', 'Backspace']}
        fitView
        attributionPosition="bottom-left"
      >
        <Background gap={20} color="#2a2a28" variant="dots" size={1} />
        <Controls showInteractive={false} />
        <AutoPanner nodeStatuses={nodeStatuses} />
      </ReactFlow>

      {graph.nodes.length === 0 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', gap: 6 }}>
          <div style={{ fontSize: 28, color: '#d1d0cc' }}>+</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#bbb' }}>Add a node to get started</div>
          <div style={{ fontSize: 11, color: '#ccc' }}>Use the buttons above to add Navigate, Do, Check and more</div>
        </div>
      )}
    </div>
  );
}
