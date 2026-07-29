import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from "react-router-dom";
import { Toaster } from 'sonner'
import { GoogleOAuthProvider } from '@react-oauth/google'
import ErrorBoundary from './components/ErrorBoundary'

// Suppress COOP warnings and errors from Google OAuth (non-blocking)
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  const message = args[0]?.toString() || '';
  if (message.includes('Cross-Origin-Opener-Policy') || 
      message.includes('window.postMessage') || 
      message.includes('window.closed')) {
    // Suppress these specific warnings
    return;
  }
  originalWarn.apply(console, args);
};

console.error = (...args) => {
  const message = args[0]?.toString() || '';
  // Suppress COOP-related errors from Google OAuth library
  if (message.includes('Cross-Origin-Opener-Policy') || 
      message.includes('window.postMessage') ||
      message.includes('window.closed')) {
    return;
  }
  originalError.apply(console, args);
};

// Google OAuth client IDs are public (they ship in the frontend bundle), so a
// hardcoded fallback is safe and lets Google sign-in work on deploys where the
// VITE_GOOGLE_CLIENT_ID build env var was not set (e.g. Vercel). Mirrors the
// VITE_API_URL fallback used elsewhere. The real access control is the
// "Authorized JavaScript origins" list on the OAuth client in Google Cloud.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1016673639934-o2ql49egbqq77vgavo6lh6r5pgfgril4.apps.googleusercontent.com'

// Wrap App with GoogleOAuthProvider only if client ID exists
const AppWithProviders = () => {
  if (GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider 
        clientId={GOOGLE_CLIENT_ID}
        onScriptLoadError={() => console.error('Google OAuth script failed to load')}
        onScriptLoadSuccess={() => console.log('Google OAuth script loaded')}
      >
        <App />
      </GoogleOAuthProvider>
    );
  }
  return <App />;
};

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AppWithProviders />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
)
