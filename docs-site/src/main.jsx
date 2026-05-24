import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import DocsPanel from './DocsPanel.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div style={{ height: '100vh' }}>
      <DocsPanel />
    </div>
  </StrictMode>
);
