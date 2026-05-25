import { useState, useCallback, useRef, useEffect } from 'react';
import VMViewer from './VMViewer';
import WorkspacePanel from './WorkspacePanel';
import DocsPanel from './DocsPanel';

const NAV_TABS = ['Home', 'Tasks', 'Desktop', 'Docs'];
const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// pixel font glyphs for "MnemOS"
const GLYPHS = {
  M: [[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  n: [[0,0,0,0],[0,0,0,0],[1,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,0,0,1]],
  e: [[0,0,0,0],[0,0,0,0],[0,1,1,0],[1,0,0,1],[1,1,1,1],[1,0,0,0],[0,1,1,1]],
  m: [[0,0,0,0,0],[0,0,0,0,0],[1,1,0,1,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1]],
  O: [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
  S: [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
};
const WORD = ['M','n','e','m','O','S'];

function PixelLogo({ scale = 8 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const GAP = Math.round(scale * 1.2);
    const H = 7 * scale;
    let totalW = 0;
    WORD.forEach((ch, i) => {
      totalW += (GLYPHS[ch][0].length) * scale;
      if (i < WORD.length - 1) totalW += GAP;
    });
    canvas.width = totalW;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const dots = [];
    let x0 = 0;
    WORD.forEach(ch => {
      const rows = GLYPHS[ch];
      rows.forEach((row, ry) => {
        row.forEach((px, rx) => {
          dots.push({ x: x0 + rx * scale + scale / 2, y: ry * scale + scale / 2, lit: px === 1 });
        });
      });
      x0 += rows[0].length * scale + GAP;
    });

    let t = 0;
    const cx = totalW / 2, cy = H / 2;

    function draw() {
      ctx.clearRect(0, 0, totalW, H);
      const sweep = (t * 0.7) % (Math.PI * 2);
      dots.forEach(d => {
        if (!d.lit) {
          ctx.globalAlpha = 0.07;
          ctx.beginPath();
          ctx.arc(d.x, d.y, scale * 0.28, 0, Math.PI * 2);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.globalAlpha = 1;
          return;
        }
        const ang = Math.atan2(d.y - cy, d.x - cx);
        const da = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const trail = (sweep - da + Math.PI * 2) % (Math.PI * 2);
        const sb = trail < 0.08 ? 1 : trail < 1.5 ? 0.8 * (1 - (trail - 0.08) / 1.42) : 0;
        const alpha = sb > 0.05 ? 0.5 + sb * 0.5 : 0.88;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(d.x, d.y, scale * 0.34, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.globalAlpha = 1;
      });
      t += 0.016;
      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [scale]);

  return <canvas ref={canvasRef} style={{ imageRendering: 'pixelated', display: 'block' }} />;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('Tasks');
  const [taskStatus, setTaskStatus] = useState('pending');
  const [paused, setPaused] = useState(false);
  const [pausePending, setPausePending] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [rightWidth, setRightWidth] = useState(460);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const onDividerMouseDown = useCallback((e) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = rightWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMouseMove = (e) => {
      if (!isDragging.current) return;
      const delta = startX.current - e.clientX;
      const next = Math.min(720, Math.max(320, startWidth.current + delta));
      setRightWidth(next);
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [rightWidth]);

  const handleStart = useCallback(async (workflowId = null, inputs = {}) => {
    const url = workflowId ? `${API}/start?id=${workflowId}` : `${API}/start`;
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inputs }) });
    setTaskStatus('running');
    setPaused(false);
  }, []);

  const handleTakeOver = useCallback(async () => {
    if (paused) {
      await fetch(`${API}/resume`, { method: 'POST' });
      setPaused(false);
      setPausePending(false);
    } else {
      await fetch(`${API}/interrupt`, { method: 'POST' });
      setPausePending(true);
    }
  }, [paused]);

  const handleStop = useCallback(async () => {
    setStopping(true);
    await fetch(`${API}/stop`, { method: 'POST' });
    setTaskStatus('pending');
    setPaused(false);
    setPausePending(false);
    setStopping(false);
  }, []);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API}/status`);
        const data = await res.json();
        if (data.state === 'running') { setTaskStatus('running'); setPaused(false); }
        else if (data.state === 'paused') { setPaused(true); setPausePending(false); }
        else if (data.state === 'idle' && taskStatus === 'running') {
          setTaskStatus('pending'); setPaused(false); setPausePending(false); setStopping(false);
        }
      } catch {}
    };
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [taskStatus]);

  const handleWorkflowEnd = useCallback((status) => {
    if (status === 'success') { setTaskStatus('finished'); setPaused(true); }
    else { setTaskStatus('pending'); setPaused(false); }
  }, []);

  const statusLabel = stopping ? 'Stopping…' : pausePending ? 'Pausing…' : paused ? "You're in control" : taskStatus === 'running' ? 'Agent running' : taskStatus === 'finished' ? 'Finished' : 'Idle';
  const statusSub = stopping ? 'Waiting for current step to cancel' : pausePending ? 'Will pause after current step' : paused ? (taskStatus === 'finished' ? 'Workflow complete' : 'Agent paused') : taskStatus === 'pending' ? 'No workflow started' : 'Autonomous mode';
  const dotColor = paused ? 'rgba(255,255,255,0.5)' : taskStatus === 'running' ? '#fff' : 'rgba(255,255,255,0.15)';

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Courier New', Courier, monospace;
          background: #000;
          color: rgba(255,255,255,0.8);
          height: 100vh; overflow: hidden;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .layout { display: flex; flex-direction: column; height: 100vh; }

        .nav {
          display: flex; align-items: center;
          padding: 0 20px; height: 52px;
          background: #000;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0; gap: 0;
        }
        .nav-logo {
          font-size: 12px; font-weight: 700;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.22em; text-transform: uppercase;
          margin-right: 28px; white-space: nowrap;
          user-select: none;
        }
        .nav-tab {
          display: flex; align-items: center;
          padding: 0 14px; height: 52px;
          font-family: 'Courier New', monospace;
          font-size: 11px; font-weight: 700;
          color: rgba(255,255,255,0.22);
          letter-spacing: 0.1em; text-transform: uppercase;
          cursor: pointer; border: none; background: none;
          border-bottom: 1px solid transparent;
          transition: color 0.12s, border-color 0.12s;
          white-space: nowrap;
        }
        .nav-tab:hover { color: rgba(255,255,255,0.55); }
        .nav-tab.active {
          color: rgba(255,255,255,0.9);
          border-bottom-color: rgba(255,255,255,0.5);
        }

        .content { display: flex; flex: 1; overflow: hidden; }

        /* vm panel */
        .left-panel {
          flex: 1; display: flex; flex-direction: column;
          border-right: 1px solid rgba(255,255,255,0.06);
          background: #000; overflow: hidden;
        }
        .panel-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0; gap: 8px;
        }
        .status-row { display: flex; align-items: center; gap: 7px; }
        .status-dot {
          width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
          transition: background 0.3s;
        }
        .status-dot.running {
          animation: dot-pulse 1.4s ease-in-out infinite;
        }
        @keyframes dot-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.4); }
          50%      { box-shadow: 0 0 0 4px rgba(255,255,255,0); }
        }
        .status-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.7); letter-spacing: 0.04em; }
        .status-sub { font-size: 10px; color: rgba(255,255,255,0.2); margin-top: 1px; }
        .take-over-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 11px;
          font-family: 'Courier New', monospace;
          font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
          cursor: pointer; border: 1px solid rgba(255,255,255,0.15);
          background: transparent; color: rgba(255,255,255,0.5);
          transition: border-color 0.12s, color 0.12s, background 0.12s;
        }
        .take-over-btn:hover:not(:disabled) {
          border-color: rgba(255,255,255,0.4);
          color: rgba(255,255,255,0.9);
          background: rgba(255,255,255,0.04);
        }
        .take-over-btn.user-control {
          border-color: rgba(255,255,255,0.35);
          color: rgba(255,255,255,0.75);
        }
        .vm-container { flex: 1; overflow: hidden; position: relative; background: #000; }

        .right-panel {
          flex-shrink: 0;
          display: flex; flex-direction: column;
          background: #000; overflow: hidden;
        }

        /* home page */
        .home-page {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          overflow: auto; padding: 48px 32px;
          text-align: center;
        }
        .home-logo-wrap { margin-bottom: 28px; }
        .home-tagline {
          font-size: 12px; color: rgba(255,255,255,0.28);
          line-height: 2; margin-bottom: 28px;
          max-width: 380px;
        }
        .home-tagline strong { color: rgba(255,255,255,0.6); font-weight: 700; }
        .home-cta-row { display: flex; gap: 10px; justify-content: center; margin-bottom: 36px; }
        .home-btn-primary {
          font-size: 10px; font-weight: 700; padding: 9px 22px;
          background: rgba(255,255,255,0.9); color: #000;
          border: none; cursor: pointer;
          font-family: 'Courier New', monospace;
          letter-spacing: 0.1em; text-transform: uppercase;
          transition: background 0.12s;
        }
        .home-btn-primary:hover { background: #fff; }
        .home-btn-ghost {
          font-size: 10px; font-weight: 700; padding: 9px 22px;
          background: transparent; color: rgba(255,255,255,0.4);
          border: 1px solid rgba(255,255,255,0.12); cursor: pointer;
          font-family: 'Courier New', monospace;
          letter-spacing: 0.1em; text-transform: uppercase;
          transition: border-color 0.12s, color 0.12s;
        }
        .home-btn-ghost:hover { border-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.7); }
        .home-stats {
          display: flex; gap: 0;
          border: 1px solid rgba(255,255,255,0.06);
          margin-bottom: 32px;
        }
        .home-stat {
          padding: 18px 32px; text-align: center;
          border-right: 1px solid rgba(255,255,255,0.06);
        }
        .home-stat:last-child { border-right: none; }
        .home-stat-n { font-size: 28px; font-weight: 700; color: #fff; line-height: 1; }
        .home-stat-l { font-size: 8px; color: rgba(255,255,255,0.2); letter-spacing: 0.12em; text-transform: uppercase; margin-top: 5px; }
        .home-feat-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 1px; background: rgba(255,255,255,0.05);
          width: 100%; max-width: 720px;
          border: 1px solid rgba(255,255,255,0.05);
          text-align: left;
        }
        .home-feat {
          background: #000; padding: 18px 20px;
          transition: background 0.12s;
        }
        .home-feat:hover { background: rgba(255,255,255,0.02); }
        .home-feat-title {
          font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.5);
          letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 6px;
        }
        .home-feat-body { font-size: 10px; color: rgba(255,255,255,0.2); line-height: 1.7; }

        /* desktop logo banner */
        .desktop-logo-banner {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 28px 0 22px;
          gap: 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
          background: #000;
        }
        .desktop-brand-name {
          font-size: 11px; font-weight: 700;
          color: rgba(255,255,255,0.35);
          letter-spacing: 0.38em; text-transform: uppercase;
          user-select: none;
        }
        .desktop-brand-tag {
          font-size: 9px;
          color: rgba(255,255,255,0.14);
          letter-spacing: 0.2em; text-transform: uppercase;
          user-select: none;
          margin-top: -6px;
        }
      `}</style>

      <div className="layout">
        <nav className="nav">
          <div className="nav-logo">MnemOS</div>
          {NAV_TABS.map(tab => (
            <button
              key={tab}
              className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="content" style={activeTab === 'Docs' ? { overflow: 'hidden' } : {}}>

          {/* Docs — full-width */}
          {activeTab === 'Docs' && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <DocsPanel />
            </div>
          )}

          {/* Home — hero page */}
          {activeTab === 'Home' && (
            <div className="home-page">
              <div className="home-logo-wrap">
                <PixelLogo scale={10} />
              </div>
              <p className="home-tagline">
                Visual workflow builder for desktop AI agents.<br />
                Drag nodes · Connect logic · Run in Docker.<br />
                <strong>Every run remembered by HydraDB.</strong>
              </p>
              <div className="home-stats">
                <div className="home-stat"><div className="home-stat-n">14</div><div className="home-stat-l">node types</div></div>
                <div className="home-stat"><div className="home-stat-n">∞</div><div className="home-stat-l">memory via HydraDB</div></div>
                <div className="home-stat"><div className="home-stat-n">any</div><div className="home-stat-l">LLM provider</div></div>
              </div>
              <div className="home-cta-row">
                <button className="home-btn-primary" onClick={() => setActiveTab('Tasks')}>open workspace →</button>
                <button className="home-btn-ghost" onClick={() => setActiveTab('Desktop')}>view desktop</button>
              </div>
              <div className="home-feat-grid">
                {[
                  ['browser automation', 'Playwright-powered Navigate, Do, Fill, Check, Read nodes. Full desktop browser inside Docker.'],
                  ['persistent memory', 'HydraDB graph-enhanced vector store. Remember nodes write, Recall nodes retrieve across runs.'],
                  ['code + agents', 'Code nodes run arbitrary Python. Agent nodes spawn sub-agents with full tool access.'],
                  ['plan node', 'LLM decides the next branch from options. Dynamic routing without conditional code.'],
                  ['any LLM', 'Groq, Gemini, OpenAI, Anthropic, Ollama. Per-node LLM override in one workflow.'],
                  ['docker native', 'Everything runs in a single container. One docker-compose up and you\'re live.'],
                ].map(([title, body]) => (
                  <div key={title} className="home-feat">
                    <div className="home-feat-title">{title}</div>
                    <div className="home-feat-body">{body}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tasks + Desktop — VM + (optionally) workspace */}
          {(activeTab === 'Tasks' || activeTab === 'Desktop') && (
            <>
              <div className="left-panel">
                {activeTab === 'Desktop' && (
                  <div className="desktop-logo-banner">
                    <PixelLogo scale={8} />
                    <div className="desktop-brand-name">MnemOS</div>
                    <div className="desktop-brand-tag">visual workflow builder · ai memory · docker native</div>
                  </div>
                )}
                <div className="panel-header">
                  <div>
                    <div className="status-row">
                      <span
                        className={`status-dot ${taskStatus === 'running' && !paused ? 'running' : ''}`}
                        style={{ background: dotColor }}
                      />
                      <span className="status-label">{statusLabel}</span>
                    </div>
                    <div className="status-sub">{statusSub}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className={`take-over-btn ${paused ? 'user-control' : ''}`}
                      onClick={handleTakeOver}
                      disabled={taskStatus === 'finished' || pausePending || stopping}
                      style={(taskStatus === 'finished' || pausePending || stopping) ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
                    >
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                        {paused
                          ? <path d="M3 2l7 4-7 4V2z"/>
                          : <><rect x="2" y="2" width="3" height="8" rx="0.5"/><rect x="7" y="2" width="3" height="8" rx="0.5"/></>
                        }
                      </svg>
                      {pausePending ? 'Pausing…' : paused ? 'Hand Back' : 'Take Over'}
                    </button>
                    {(taskStatus === 'running' || taskStatus === 'finished') && (
                      <button
                        onClick={handleStop}
                        disabled={stopping}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 10px',
                          border: '1px solid rgba(255,60,60,0.3)',
                          background: 'transparent', color: 'rgba(255,80,80,0.7)',
                          fontFamily: "'Courier New', monospace",
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                          cursor: stopping ? 'not-allowed' : 'pointer',
                          opacity: stopping ? 0.4 : 1,
                          transition: 'border-color 0.12s, color 0.12s',
                        }}
                        onMouseEnter={e => { if (!stopping) { e.currentTarget.style.borderColor = 'rgba(255,60,60,0.6)'; e.currentTarget.style.color = 'rgba(255,80,80,1)'; }}}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,60,60,0.3)'; e.currentTarget.style.color = 'rgba(255,80,80,0.7)'; }}
                      >
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
                          <rect x="1" y="1" width="8" height="8" rx="1.5"/>
                        </svg>
                        {stopping ? 'Stopping…' : 'Stop'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="vm-container">
                  <VMViewer
                    onConnect={() => setTaskStatus('running')}
                    viewOnly={!paused}
                    isActive={activeTab === 'Desktop' || activeTab === 'Tasks'}
                  />
                </div>
              </div>

              {activeTab === 'Tasks' && (
                <>
                  <div
                    onMouseDown={onDividerMouseDown}
                    style={{
                      width: 4, flexShrink: 0,
                      background: 'transparent',
                      cursor: 'col-resize',
                      position: 'relative', zIndex: 10,
                    }}
                  >
                    <div style={{
                      position: 'absolute', inset: '0 -2px',
                      borderLeft: '2px solid rgba(255,255,255,0.06)',
                      transition: 'border-color 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                    />
                  </div>
                  <div className="right-panel" style={{ width: rightWidth }}>
                    <WorkspacePanel onStart={handleStart} onWorkflowEnd={handleWorkflowEnd} />
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </>
  );
}
