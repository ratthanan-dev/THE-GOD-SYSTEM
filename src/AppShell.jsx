import React, { useEffect, useRef } from 'react';
import { useGame } from './context/GameContext';
import StatusWindow from './components/StatusWindow';
import QuestLog from './components/QuestLog';
import SettingsPanel from './components/SettingsPanel';
import AIChat from './components/AIChat';
import { LevelUpOverlay, PenaltyOverlay, NotificationToast } from './components/SystemAlerts';
import './AppShell.css';

const TABS = [
  { id: 'status', label: 'สถานะ', icon: 'person', shortLabel: 'STATUS' },
  { id: 'quests', label: 'เควสต์', icon: 'assignment', shortLabel: 'QUESTS' },
  { id: 'settings', label: 'ตั้งค่า', icon: 'settings', shortLabel: 'SETTINGS' },
  { id: 'ai', label: 'The System', icon: 'psychology', shortLabel: 'SYSTEM', mobileOnly: true },
];

export default function AppShell() {
  const { state, dispatch } = useGame();
  const { activeTab } = state;
  const contentRef = useRef(null);

  // Scroll to top on tab change
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  const handleTabChange = (tabId) => {
    dispatch({ type: 'SET_TAB', tab: tabId });
    if (navigator.vibrate) navigator.vibrate(30);
  };

  return (
    <div className="app-shell">
      {/* System Header */}
      <header className="system-header">
        <div className="header-content">
          <div className="header-logo">
            <div className="logo-hex">
              <span className="logo-icon">⬡</span>
            </div>
            <div className="header-titles">
              <div className="header-main text-display">REAL-LIFE SYSTEM</div>
              <div className="header-sub text-mono">Hunter Interface v1.0</div>
            </div>
          </div>

          {/* Status Quick View */}
          <div className="header-quick">
            <div className="quick-stat">
              <span className="quick-label text-mono">LV</span>
              <span className="quick-value text-display">{state.hunter.level}</span>
            </div>
            <div className="quick-rank" style={{
              color: getRankColor(state.hunter.rank),
              textShadow: `0 0 10px ${getRankColor(state.hunter.rank)}`,
            }}>
              <span className="text-display">{state.hunter.rank}</span>
            </div>
          </div>
        </div>

        {/* Scanning line */}
        <div className="header-scan" />
      </header>

      {/* Main Content */}
      <main className="app-content" ref={contentRef}>
        {/* Tab Panels */}
        <div className={`tab-panel ${activeTab === 'status' ? 'active' : ''}`}>
          <StatusWindow />
        </div>
        <div className={`tab-panel ${activeTab === 'quests' ? 'active' : ''}`}>
          <QuestLog />
        </div>
        <div className={`tab-panel ${activeTab === 'settings' ? 'active' : ''}`}>
          <SettingsPanel />
        </div>
      </main>

      {/* AI Sidebar / Tab (Always visible on Desktop, behaves like a tab on Mobile) */}
      <aside className={`ai-sidebar ${activeTab === 'ai' ? 'active' : ''}`}>
        <AIChat />
      </aside>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="nav-inner">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''} ${tab.mobileOnly ? 'mobile-only' : ''}`}
              onClick={() => handleTabChange(tab.id)}
              id={`nav-${tab.id}`}
              aria-label={tab.label}
            >
              <span 
                className="material-symbols-outlined nav-icon"
                style={activeTab === tab.id ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {tab.icon}
              </span>
              <span className="nav-label text-mono">{tab.shortLabel}</span>
              {activeTab === tab.id && <div className="nav-indicator" />}
            </button>
          ))}
        </div>
      </nav>

      {/* Global Overlays */}
      <LevelUpOverlay />
      <PenaltyOverlay />
      <NotificationToast />
    </div>
  );
}

function getRankColor(rank) {
  const colors = {
    E: '#a0a0b0', D: '#60c8ff', C: '#00ff88',
    B: '#a855f7', A: '#ffd700', S: '#ff6b35',
    SS: '#ff2d55', SSS: '#ffffff',
  };
  return colors[rank] || '#a0a0b0';
}
