import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import applyTheme from './lib/applyTheme';

// Inject the configured palette / fonts / locale onto <html> before first paint.
applyTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
