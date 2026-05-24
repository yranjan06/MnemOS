import { useEffect, useRef, useState } from 'react';

export default function VMViewer({ onConnect, viewOnly = true, isActive = true }) {
  const containerRef = useRef(null);
  const rfbRef = useRef(null);
  const [status, setStatus] = useState('Connecting...');
  const reconnectTimer = useRef(null);
  const RFBRef = useRef(null);
  const destroyedRef = useRef(false);

  // Update synchronously during render — NOT in a useEffect
  // This ensures isActiveRef is already correct when a disconnect fires right after display:none
  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;

  const connect = () => {
    if (destroyedRef.current || !containerRef.current || !RFBRef.current) return;
    clearTimeout(reconnectTimer.current);

    const old = rfbRef.current;
    rfbRef.current = null;
    if (old) try { old.disconnect(); } catch {}

    // Clear stale noVNC canvas — each new RFB appends its own canvas
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    setStatus('Connecting...');
    const rfb = new RFBRef.current(containerRef.current, 'ws://127.0.0.1:6080', {
      credentials: { password: '' },
    });
    rfb.viewOnly = viewOnly;
    rfb.scaleViewport = true;
    rfb.clipViewport = true;
    rfb.showDotCursor = true;

    rfb.addEventListener('connect', () => {
      setStatus('Connected');
      onConnect?.();
    });
    rfb.addEventListener('disconnect', () => {
      if (destroyedRef.current || rfbRef.current !== rfb) return;
      rfbRef.current = null;
      if (!isActiveRef.current) {
        // Panel is hidden — don't loop, reconnect when user comes back
        setStatus('Disconnected');
        return;
      }
      setStatus('Reconnecting...');
      reconnectTimer.current = setTimeout(connect, 2000);
    });
    rfb.addEventListener('credentialsrequired', () => setStatus('Credentials required'));
    rfbRef.current = rfb;
  };

  useEffect(() => {
    destroyedRef.current = false;
    const initViaModule = async () => {
      try {
        const { default: RFB } = await import(
          'https://cdn.jsdelivr.net/npm/@novnc/novnc@1.4.0/core/rfb.js'
        );
        RFBRef.current = RFB;
        connect();
      } catch (err) {
        setStatus(`Error: ${err.message}`);
      }
    };
    initViaModule();

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && isActiveRef.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = setTimeout(connect, 200);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      destroyedRef.current = true;
      clearTimeout(reconnectTimer.current);
      document.removeEventListener('visibilitychange', onVisibility);
      const old = rfbRef.current;
      rfbRef.current = null;
      if (old) try { old.disconnect(); } catch {}
    };
  }, []);

  // When switching back to Desktop, always reconnect for a fresh frame
  useEffect(() => {
    if (isActive && RFBRef.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(connect, 200);
    }
  }, [isActive]);

  useEffect(() => {
    if (rfbRef.current) rfbRef.current.viewOnly = viewOnly;
  }, [viewOnly]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#111' }}>
      <div style={{
        padding: '3px 10px', background: '#111',
        color: status.startsWith('Connected') ? '#22c55e' : '#666',
        fontSize: '10px', fontFamily: 'monospace', flexShrink: 0,
      }}>
        Status: {status}
      </div>
      <div ref={containerRef} style={{ flex: 1, width: '100%', height: '100%' }} />
    </div>
  );
}
