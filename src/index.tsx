import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // We'll create this component next
import { ThemeProvider } from './contexts/ThemeContext'; // Import ThemeProvider
import './index.css'; // We'll create this CSS file next

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider> {/* Wrap App with ThemeProvider */}
      <App />
    </ThemeProvider>
  </React.StrictMode>,
); 