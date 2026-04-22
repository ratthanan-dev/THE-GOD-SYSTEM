import React from 'react';
import { GameProvider } from './context/GameContext';
import AppShell from './AppShell';
import './index.css';

export default function App() {
  return (
    <GameProvider>
      <AppShell />
    </GameProvider>
  );
}
