import React, { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import './SystemAlerts.css';

const RANK_COLORS = {
  E: '#a0a0b0', D: '#60c8ff', C: '#00ff88',
  B: '#a855f7', A: '#ffd700', S: '#ff6b35',
  SS: '#ff2d55', SSS: '#ffffff',
};

export function LevelUpOverlay() {
  const { state, dispatch } = useGame();
  const { showLevelUp, levelUpData } = state;

  useEffect(() => {
    if (showLevelUp) {
      if (navigator.vibrate) navigator.vibrate([100, 80, 150, 80, 300]);
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [showLevelUp]);

  if (!showLevelUp || !levelUpData) return null;

  const rankColor = RANK_COLORS[levelUpData.newRank] || '#00d4ff';
  const rankChanged = levelUpData.newRank !== (levelUpData.oldRank || 'E');

  return (
    <div className="overlay-backdrop level-up-backdrop" onClick={() => dispatch({ type: 'DISMISS_LEVEL_UP' })}>
      <div className="level-up-container" onClick={e => e.stopPropagation()}>
        {/* Scan line effect */}
        <div className="scan-line" />

        {/* Glow rings */}
        <div className="glow-ring ring-1" style={{ borderColor: rankColor }} />
        <div className="glow-ring ring-2" style={{ borderColor: rankColor }} />

        {/* Content */}
        <div className="level-up-content">
          <div className="level-up-badge text-mono">⚡ LEVEL UP ⚡</div>

          <div className="level-up-number text-display" style={{ color: rankColor }}>
            {levelUpData.newLevel}
          </div>

          <div className="level-up-subtitle text-mono">เลเวลใหม่ของคุณ</div>

          {rankChanged && (
            <div className="rank-up-notice" style={{ '--rank-color': rankColor }}>
              <div className="rank-up-label text-mono">RANK UP!</div>
              <div className="rank-up-value text-display" style={{ color: rankColor }}>
                {levelUpData.newRank}-CLASS
              </div>
            </div>
          )}

          <div className="level-up-particles">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="particle"
                style={{
                  '--angle': `${i * 45}deg`,
                  '--color': rankColor,
                }}
              />
            ))}
          </div>

          <button
            className="btn btn-primary level-up-close"
            onClick={() => dispatch({ type: 'DISMISS_LEVEL_UP' })}
            id="level-up-close-btn"
          >
            ✊ รับทราบ
          </button>
        </div>
      </div>
    </div>
  );
}

export function PenaltyOverlay() {
  const { state, dispatch } = useGame();
  const { showPenalty, penaltyData } = state;

  useEffect(() => {
    if (showPenalty) {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }, [showPenalty]);

  if (!showPenalty || !penaltyData) return null;

  return (
    <div className="overlay-backdrop penalty-backdrop" onClick={() => dispatch({ type: 'DISMISS_PENALTY' })}>
      <div className="penalty-container" onClick={e => e.stopPropagation()}>
        <div className="penalty-icon">☠️</div>
        <div className="penalty-title text-display">บทลงโทษ</div>
        <div className="penalty-reason text-mono">{penaltyData.reason}</div>

        <div className="penalty-stats">
          <div className="penalty-stat">
            <div className="penalty-stat-value text-display">-{penaltyData.expPenalty}</div>
            <div className="penalty-stat-label text-mono">EXP</div>
          </div>
          <div className="penalty-divider" />
          <div className="penalty-stat">
            <div className="penalty-stat-value text-display">-{penaltyData.hpPenalty}</div>
            <div className="penalty-stat-label text-mono">HP</div>
          </div>
        </div>

        <div className="penalty-warning text-mono">
          ⚠️ ฮันเตอร์ที่อ่อนแอย่อมถูกลงโทษ — ลุกขึ้นสู้!
        </div>

        <button
          className="btn btn-danger penalty-close"
          onClick={() => dispatch({ type: 'DISMISS_PENALTY' })}
          id="penalty-close-btn"
        >
          ☠️ รับทราบ
        </button>
      </div>
    </div>
  );
}

export function NotificationToast() {
  const { state, dispatch } = useGame();
  const notification = state.notifications[state.notifications.length - 1];

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'CLEAR_NOTIFICATION', id: notification.id });
    }, 3000);
    return () => clearTimeout(timer);
  }, [notification?.id]);

  if (!notification) return null;

  const isSystem = notification.type === 'system';

  return (
    <div className={`notification-toast ${isSystem ? 'system-alert' : 'exp-toast'}`}>
      <div className="toast-content text-mono">{notification.message}</div>
    </div>
  );
}

export function DailyQuestAlert() {
  const { state } = useGame();
  const systemNotif = state.notifications.find(n => n.type === 'system');

  if (!systemNotif) return null;

  return null; // Handled by NotificationToast
}
