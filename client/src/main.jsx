import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const AppProviders = ({ children }) => {
  if (!googleClientId) {
    console.warn('VITE_GOOGLE_CLIENT_ID is not set. Google sign-in UI may not work until it is configured.');
    return <AuthProvider>{children}</AuthProvider>;
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>{children}</AuthProvider>
    </GoogleOAuthProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
)
