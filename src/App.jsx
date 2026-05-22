import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { GameProvider } from './context/GameContext';
import AppShell from './AppShell';
import Login from './components/Login';
import './index.css';

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  // Still checking auth state
  if (user === undefined) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: '#0a0a0f',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid rgba(0,255,136,0.2)',
          borderTopColor: '#00ff88',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not logged in → show Login screen
  if (!user) {
    return <Login />;
  }

  // Logged in → show main app
  return (
    <GameProvider userId={user.uid}>
      <AppShell />
    </GameProvider>
  );
}
