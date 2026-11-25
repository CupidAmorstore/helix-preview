import './polyfills'; // must stay first: sets Buffer/process before wallet libraries load
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Fonts are bundled (work offline inside the Android app; no Google Fonts request).
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/600.css';
import '@fontsource/instrument-sans/700.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

