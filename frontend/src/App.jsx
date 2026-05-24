import { useState, useCallback, useRef, useEffect } from 'react';
import VMViewer from './VMViewer';
import WorkspacePanel from './WorkspacePanel';
import DocsPanel from './DocsPanel';

const NAV_TABS = ['Home', 'Tasks', 'Desktop', 'Docs'];
const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function App() {
  const [activeTab, setActiveTab] = useState('Desktop');
  const [taskStatus, setTaskStatus] = useState('pending'); // 'pending' | 'running'
  const [paused, setPaused] = useState(false); // true = user in control
  const [pausePending, setPausePending] = useState(false); // pause requested, waiting for step to finish
  const [stopping, setStopping] = useState(false); // stop requested, waiting for task to die
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
      const delta = startX.current - e.clientX; // drag left → widen right panel
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
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs }),
    });
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
      setPausePending(true); // show "Pausing..." until /status confirms paused
    }
  }, [paused]);

  const handleStop = useCallback(async () => {
    setStopping(true);
    await fetch(`${API}/stop`, { method: 'POST' });
    // Backend now waits up to 5s — clear state after it responds
    setTaskStatus('pending');
    setPaused(false);
    setPausePending(false);
    setStopping(false);
  }, []);

  // Sync taskStatus with backend — catches cron/webhook-triggered runs
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`${API}/status`);
        const data = await res.json();
        if (data.state === 'running') {
          setTaskStatus('running');
          setPaused(false);
        } else if (data.state === 'paused') {
          setPaused(true);
          setPausePending(false);
        } else if (data.state === 'idle' && taskStatus === 'running') {
          setTaskStatus('pending');
          setPaused(false);
          setPausePending(false);
          setStopping(false);
        }
      } catch {}
    };
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [taskStatus]);

const handleWorkflowEnd = useCallback((status) => {
      if (status === 'success') {
        setTaskStatus('finished');
        setPaused(true);
      } else {
        setTaskStatus('pending');
        setPaused(false);
      }
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'Geist', sans-serif;
          background: #f4f3f0;
          color: #1a1a1a;
          height: 100vh;
          overflow: hidden;
        }

        .layout { display: flex; flex-direction: column; height: 100vh; }

        /* ── Top nav ── */
        .nav {
          display: flex;
          align-items: center;
          padding: 0 20px;
          height: 44px;
          background: #fff;
          border-bottom: 1px solid #e5e4e0;
          flex-shrink: 0;
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 15px;
          font-weight: 600;
          color: #1a1a1a;
          margin-right: 24px;
          letter-spacing: -0.3px;
        }

        .nav-logo-icon {
          width: 24px; height: 24px;
          background: #1a1a1a;
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
        }

        .nav-divider { width: 1px; height: 20px; background: #e5e4e0; margin-right: 24px; }

        .nav-tab {
          display: flex; align-items: center; gap: 6px;
          padding: 0 12px; height: 44px;
          font-size: 13px; font-weight: 500; color: #888;
          cursor: pointer; border: none; background: none;
          border-bottom: 2px solid transparent;
          transition: color 0.15s, border-color 0.15s;
          white-space: nowrap;
        }
        .nav-tab:hover { color: #1a1a1a; }
        .nav-tab.active { color: #1a1a1a; border-bottom-color: #1a1a1a; }
        .nav-tab-icon { width: 14px; height: 14px; opacity: 0.5; }
        .nav-tab.active .nav-tab-icon { opacity: 1; }

        /* ── Content ── */
        .content { display: flex; flex: 1; overflow: hidden; }

        /* ── Left panel ── */
        .left-panel {
          flex: 1; display: flex; flex-direction: column;
          border-right: 1px solid #e5e4e0;
          background: #fff; overflow: hidden;
        }

        .panel-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 16px;
          border-bottom: 1px solid #e5e4e0;
          flex-shrink: 0;
        }

        .task-meta { display: flex; flex-direction: column; gap: 2px; }

        .status-row { display: flex; align-items: center; gap: 6px; }

        .status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .status-dot.pending { background: #d1cfc9; }
        .status-dot.running {
          background: #22c55e;
          box-shadow: 0 0 0 2px #bbf7d0;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .status-dot.paused {
          background: #f59e0b;
          box-shadow: 0 0 0 2px #fde68a;
        }

        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 2px #bbf7d0; }
          50%       { box-shadow: 0 0 0 4px #bbf7d066; }
        }

        .status-label {
          font-size: 12px; font-weight: 600;
          text-transform: capitalize; color: #1a1a1a; letter-spacing: 0.1px;
        }

        .task-sublabel { font-size: 11px; color: #999; padding-left: 13px; }

        /* Take Over button — color depends on state */
        .take-over-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 12px; border-radius: 6px;
          font-family: 'Geist', sans-serif;
          font-size: 12px; font-weight: 500;
          cursor: pointer;
          transition: background 0.12s, border-color 0.12s, color 0.12s;
        }

        /* Agent running → neutral border, invite takeover */
        .take-over-btn.agent-running {
          border: 1.5px solid #e5e4e0;
          background: #fff;
          color: #1a1a1a;
        }
        .take-over-btn.agent-running:hover {
          border-color: #f59e0b;
          background: #fffbeb;
          color: #92400e;
        }

        /* User in control → amber border, invite hand-back */
        .take-over-btn.user-control {
          border: 1.5px solid #f59e0b;
          background: #fffbeb;
          color: #92400e;
        }
        .take-over-btn.user-control:hover {
          border-color: #22c55e;
          background: #f0fdf4;
          color: #166534;
        }

        .vm-container { flex: 1; overflow: hidden; position: relative; background: #111; }

        /* ── Right panel ── */
        .right-panel {
          flex-shrink: 0;
          display: flex; flex-direction: column;
          background: #fff; overflow: hidden;
        }

        .right-header { padding: 14px 16px 10px; border-bottom: 1px solid #e5e4e0; flex-shrink: 0; }
        .right-header h2 { font-size: 14px; font-weight: 600; color: #1a1a1a; letter-spacing: -0.2px; }

        .graph-area {
          flex: 1; background: #fafaf9;
          border: 1.5px dashed #e0deda;
          margin: 12px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
        }

        .graph-placeholder { font-size: 12px; color: #bbb; font-family: 'Geist Mono', monospace; }

        .start-btn {
          margin: 0 12px 12px; padding: 11px; border-radius: 7px;
          border: none; background: #1a1a1a; color: #fff;
          font-family: 'Geist', sans-serif; font-size: 13px; font-weight: 500;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 7px; transition: background 0.12s, transform 0.1s; letter-spacing: -0.1px;
        }
        .start-btn:hover { background: #333; }
        .start-btn:active { transform: scale(0.99); }
      `}</style>

      <div className="layout">

        {/* Nav */}
        <nav className="nav">
          <div className="nav-logo">
            <div className="nav-logo-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="3" fill="white"/>
                <circle cx="7" cy="2" r="1.2" fill="white"/>
                <circle cx="7" cy="12" r="1.2" fill="white"/>
                <circle cx="2" cy="7" r="1.2" fill="white"/>
                <circle cx="12" cy="7" r="1.2" fill="white"/>
              </svg>
            </div>
            MnemOS
          </div>

          <div className="nav-divider" />

          {NAV_TABS.map(tab => (
            <button
              key={tab}
              className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              <svg className="nav-tab-icon" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                {tab === 'Home'    && <path d="M1 6l6-5 6 5v7H9v-4H5v4H1z"/>}
                {tab === 'Tasks'   && <><rect x="2" y="2" width="10" height="10" rx="2"/><path d="M4 7h6M4 5h6M4 9h4"/></>}
                {tab === 'Desktop' && <><rect x="1" y="2" width="12" height="9" rx="1.5"/><path d="M4 13h6M7 11v2"/></>}
                {tab === 'Docs'    && <><path d="M3 1h6l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1z"/><path d="M8 1v4h4"/></>}
              </svg>
              {tab}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="content" style={activeTab === 'Docs' ? { overflow: 'hidden' } : {}}>

          {/* Docs tab — full-width overlay */}
          {activeTab === 'Docs' && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <DocsPanel />
            </div>
          )}

          {/* Left — VM feed */}
          <div className="left-panel" style={activeTab === 'Docs' ? { display: 'none' } : {}}>
            <div className="panel-header">
              <div className="task-meta">
                <div className="status-row">
                  <span className={`status-dot ${paused ? 'paused' : taskStatus}`} />
                  <span className="status-label">
                      {stopping ? 'Stopping…' : pausePending ? 'Pausing…' : paused ? "You're in control" : taskStatus === 'running' ? 'Agent running' : taskStatus === 'finished' ? 'Agent finished' : 'Idle'}
                    </span>
                  </div>
                  <span className="task-sublabel">
                    {stopping ? 'Waiting for current step to cancel' : pausePending ? 'Will pause after current step completes' : paused ? (taskStatus === 'finished' ? 'Workflow complete' : 'Agent paused') : taskStatus === 'pending' ? 'No workflow started' : 'Autonomous mode'}
                  </span>
                </div>
              <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className={`take-over-btn ${paused ? 'user-control' : 'agent-running'}`}
                    onClick={handleTakeOver}
                    disabled={taskStatus === 'finished' || pausePending || stopping}
                    style={(taskStatus === 'finished' || pausePending || stopping) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
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
                        padding: '5px 10px', borderRadius: 6,
                        border: '1.5px solid #fca5a5',
                        background: '#fff5f5', color: '#dc2626',
                        fontFamily: 'Geist, sans-serif', fontSize: 12, fontWeight: 500,
                        cursor: stopping ? 'not-allowed' : 'pointer',
                        opacity: stopping ? 0.6 : 1,
                      }}
                      onMouseEnter={e => { if (!stopping) e.currentTarget.style.background = '#fee2e2'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff5f5'; }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                        <rect x="1" y="1" width="8" height="8" rx="1.5"/>
                      </svg>
                      {stopping ? 'Stopping…' : 'Stop'}
                    </button>
                  )}
                </div>
            </div>

            <div className="vm-container">
              <VMViewer onConnect={() => setTaskStatus('running')} viewOnly={!paused} isActive={activeTab === 'Desktop'} />
            </div>
          </div>

          {/* Resize divider */}
          <div
            onMouseDown={onDividerMouseDown}
            style={activeTab === 'Docs' ? { display: 'none' } : undefined}
            style={{
              width: 4,
              flexShrink: 0,
              background: 'transparent',
              cursor: 'col-resize',
              position: 'relative',
              zIndex: 10,
            }}
          >
            <div style={{
              position: 'absolute',
              inset: '0 -2px',
              borderLeft: '3px solid #1a1a1a',
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#555'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a1a'}
            />
          </div>

          {/* Right — workspace */}
          <div className="right-panel" style={{ width: rightWidth, display: activeTab === 'Docs' ? 'none' : undefined }}>
            <WorkspacePanel onStart={handleStart} onWorkflowEnd={handleWorkflowEnd} />
          </div>

        </div>
      </div>
    </>
  );
}
