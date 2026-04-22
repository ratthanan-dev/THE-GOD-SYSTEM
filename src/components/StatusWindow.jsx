import React, { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import './StatusWindow.css';

const STAT_CONFIG = {
  str: { label: 'STR', fullName: 'ความแข็งแกร่ง', barClass: 'str-bar', icon: '⚔️', max: 200 },
  agi: { label: 'AGI', fullName: 'ความคล่องแคล่ว', barClass: 'agi-bar', icon: '⚡', max: 200 },
  int: { label: 'INT', fullName: 'สติปัญญา', barClass: 'int-bar', icon: '📖', max: 200 },
  vit: { label: 'VIT', fullName: 'ชีวิต', barClass: 'vit-bar', icon: '🛡️', max: 200 },
  sense: { label: 'SENSE', fullName: 'การรับรู้', barClass: 'sense-bar', icon: '👁️', max: 200 },
};

const RANK_COLORS = {
  E: '#a0a0b0',
  D: '#60c8ff',
  C: '#00ff88',
  B: '#a855f7',
  A: '#ffd700',
  S: '#ff6b35',
  SS: '#ff2d55',
  SSS: '#ffffff',
};

export default function StatusWindow() {
  const { state, computed, dispatch } = useGame();
  const { hunter } = state;
  const { expInCurrentLevel, expToNext, expPercent, level } = computed;
  const rankColor = RANK_COLORS[hunter.rank] || '#a0a0b0';
  const hpPercent = (hunter.hp / hunter.maxHp) * 100;
  const panelRef = useRef(null);

  return (
    <div className="status-window" ref={panelRef}>
      {/* Header */}
      <div className="status-header glass-panel corner-tl corner-tr">
        <div className="status-header-top">
          <div className="rank-badge" style={{ '--rank-color': rankColor }}>
            <span className="rank-letter">{hunter.rank}</span>
          </div>
          <div className="hunter-identity">
            <div className="hunter-name text-display">{hunter.name}</div>
            <div className="job-title text-mono">{hunter.jobTitle}</div>
          </div>
          <div className="level-display">
            <div className="level-label text-mono">LEVEL</div>
            <div className="level-number text-display">{level}</div>
          </div>
        </div>

        {/* HP Bar */}
        <div className="bar-section">
          <div className="bar-label">
            <span className="text-mono" style={{ color: '#ff6b6b' }}>⚡ HP</span>
            <span className="text-mono bar-numbers">{hunter.hp} / {hunter.maxHp}</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill hp-bar" style={{ width: `${hpPercent}%` }} />
          </div>
        </div>

        {/* EXP Bar */}
        <div className="bar-section">
          <div className="bar-label">
            <span className="text-mono">✨ EXP</span>
            <span className="text-mono bar-numbers">{expInCurrentLevel} / {expToNext}</span>
          </div>
          <div className="progress-bar-container">
            <div className="progress-bar-fill exp-bar" style={{ width: `${expPercent}%` }} />
          </div>
          <div className="exp-percent text-mono">{expPercent.toFixed(1)}%</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-section glass-panel">
        <div className="section-title text-display">
          <span className="section-icon">📊</span>
          STATUS
        </div>
        <div className="stats-grid">
          {Object.entries(STAT_CONFIG).map(([key, cfg]) => {
            const value = hunter.stats[key] || 0;
            const pct = Math.min(100, (value / cfg.max) * 100);
            return (
              <div className="stat-row" key={key}>
                <div className="stat-meta">
                  <span className="stat-icon">{cfg.icon}</span>
                  <span className="stat-label text-display">{cfg.label}</span>
                  <span className="stat-fullname text-secondary">{cfg.fullName}</span>
                </div>
                <div className="stat-bar-area">
                  <div className="progress-bar-container thin">
                    <div className={`progress-bar-fill ${cfg.barClass}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="stat-value text-mono">{value}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total Stats */}
      <div className="totals-row">
        <div className="total-card glass-panel-light">
          <div className="total-value text-display">{hunter.totalExp.toLocaleString()}</div>
          <div className="total-label text-mono">TOTAL EXP</div>
        </div>
        <div className="total-card glass-panel-light">
          <div className="total-value text-display" style={{ color: rankColor }}>{hunter.rank}</div>
          <div className="total-label text-mono">RANK</div>
        </div>
        <div className="total-card glass-panel-light">
          <div className="total-value text-display">
            {state.quests.filter(q => q.completed).length}/{state.quests.length}
          </div>
          <div className="total-label text-mono">QUESTS</div>
        </div>
      </div>

      {/* HP Restore */}
      {hunter.hp < hunter.maxHp && (
        <button
          className="btn btn-success w-full hp-restore-btn"
          onClick={() => dispatch({ type: 'RESTORE_HP', amount: 20 })}
        >
          ⚡ ใช้ยาฟื้นฟู (+20 HP)
        </button>
      )}
    </div>
  );
}
