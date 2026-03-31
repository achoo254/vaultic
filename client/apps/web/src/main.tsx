import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { ThemeProvider, I18nProvider, type StorageAdapter } from '@vaultic/ui';
import { App } from './app';
import './global.css';

// Web-specific storage adapter — uses localStorage instead of chrome.storage
const webStorageAdapter: StorageAdapter = {
  get: (key: string) => Promise.resolve(localStorage.getItem(key)),
  set: (key: string, value: string) => {
    localStorage.setItem(key, value);
    return Promise.resolve();
  },
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider storageAdapter={webStorageAdapter}>
        <I18nProvider storageAdapter={webStorageAdapter}>
          <App />
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
