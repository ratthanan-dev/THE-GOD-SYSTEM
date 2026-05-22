import React, { useState, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────
// useCountdown Hook
// ─────────────────────────────────────────────
export function useCountdown(deadline) {
  const getRemaining = useCallback(() => {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return { total: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { total: diff, hours, minutes, seconds, expired: false };
  }, [deadline]);

  const [remaining, setRemaining] = useState(getRemaining);

  useEffect(() => {
    if (!deadline) { setRemaining(null); return; }
    setRemaining(getRemaining());
    const interval = setInterval(() => {
      const r = getRemaining();
      setRemaining(r);
      if (r?.expired) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline, getRemaining]);

  return remaining;
}

// ─────────────────────────────────────────────
// Urgency calculation
// ─────────────────────────────────────────────
function getUrgency(remaining, deadline) {
  if (!remaining || !deadline) return 'none';
  if (remaining.expired) return 'expired';

  const total = new Date(deadline).getTime() - Date.now();
  const original = new Date(deadline).getTime();

  // Heuristic: if < 1 hour → critical, < 3 hours → warning, < 6 hours → soon
  const hoursLeft = remaining.total / 3600000;
  if (hoursLeft < 1) return 'critical';
  if (hoursLeft < 3) return 'warning';
  if (hoursLeft < 6) return 'soon';
  return 'normal';
}

// ─────────────────────────────────────────────
// QuestTimer Display Component
// ─────────────────────────────────────────────
export default function QuestTimer({ deadline, compact = false }) {
  const remaining = useCountdown(deadline);

  if (!deadline || remaining === null) return null;

  const urgency = getUrgency(remaining, deadline);

  const urgencyConfig = {
    expired:  { color: '#ff2d55', glow: 'rgba(255,45,85,0.5)',  icon: '☠️', label: 'หมดเวลา!', pulse: true },
    critical: { color: '#ff2d55', glow: 'rgba(255,45,85,0.4)',  icon: '🚨', label: 'วิกฤต!',   pulse: true },
    warning:  { color: '#ff9500', glow: 'rgba(255,149,0,0.4)',  icon: '⚠️', label: 'ใกล้หมด',  pulse: false },
    soon:     { color: '#ffd700', glow: 'rgba(255,215,0,0.3)',  icon: '⏰', label: 'เร็วๆนี้',  pulse: false },
    normal:   { color: '#00d4ff', glow: 'rgba(0,212,255,0.2)', icon: '⏱️', label: '',          pulse: false },
    none:     { color: '#00d4ff', glow: 'rgba(0,212,255,0.2)', icon: '⏱️', label: '',          pulse: false },
  };

  const cfg = urgencyConfig[urgency];

  if (remaining.expired) {
    return (
      <div
        className={`quest-timer ${compact ? 'compact' : ''} expired ${cfg.pulse ? 'timer-pulse' : ''}`}
        style={{ '--timer-color': cfg.color, '--timer-glow': cfg.glow }}
      >
        <span className="timer-icon">{cfg.icon}</span>
        <span className="timer-text">หมดเวลาแล้ว!</span>
      </div>
    );
  }

  const pad = (n) => String(n).padStart(2, '0');

  if (compact) {
    return (
      <div
        className={`quest-timer compact ${urgency} ${cfg.pulse ? 'timer-pulse' : ''}`}
        style={{ '--timer-color': cfg.color, '--timer-glow': cfg.glow }}
      >
        <span className="timer-icon">{cfg.icon}</span>
        <span className="timer-digits">
          {remaining.hours > 0 && <span>{pad(remaining.hours)}:</span>}
          <span>{pad(remaining.minutes)}:</span>
          <span>{pad(remaining.seconds)}</span>
        </span>
        {cfg.label && <span className="timer-urgency-label">{cfg.label}</span>}
      </div>
    );
  }

  return (
    <div
      className={`quest-timer full ${urgency} ${cfg.pulse ? 'timer-pulse' : ''}`}
      style={{ '--timer-color': cfg.color, '--timer-glow': cfg.glow }}
    >
      <div className="timer-header">
        <span className="timer-icon">{cfg.icon}</span>
        <span className="timer-header-label">เวลาที่เหลือ</span>
        {cfg.label && <span className="timer-urgency-badge">{cfg.label}</span>}
      </div>
      <div className="timer-blocks">
        {remaining.hours > 0 && (
          <div className="timer-block">
            <div className="timer-num">{pad(remaining.hours)}</div>
            <div className="timer-unit">ชั่วโมง</div>
          </div>
        )}
        {remaining.hours > 0 && <div className="timer-sep">:</div>}
        <div className="timer-block">
          <div className="timer-num">{pad(remaining.minutes)}</div>
          <div className="timer-unit">นาที</div>
        </div>
        <div className="timer-sep">:</div>
        <div className="timer-block">
          <div className="timer-num">{pad(remaining.seconds)}</div>
          <div className="timer-unit">วินาที</div>
        </div>
      </div>
      <div className="timer-progress-bar">
        <TimerProgressBar deadline={deadline} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Timer Progress Bar (shows elapsed time)
// ─────────────────────────────────────────────
function TimerProgressBar({ deadline }) {
  const [pct, setPct] = useState(100);

  useEffect(() => {
    const dl = new Date(deadline).getTime();
    const update = () => {
      const now = Date.now();
      const remaining = dl - now;
      if (remaining <= 0) { setPct(0); return; }
      // Show remaining as percentage (estimate from 24h window if no start)
      // Use 24h as the "full" reference window
      const WINDOW = 24 * 3600 * 1000;
      const raw = Math.min(100, (remaining / WINDOW) * 100);
      setPct(raw);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [deadline]);

  const color = pct > 50 ? '#00d4ff' : pct > 20 ? '#ffd700' : '#ff2d55';

  return (
    <div className="timer-bar-track">
      <div
        className="timer-bar-fill"
        style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}` }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// DeadlineModal — set / edit deadline
// ─────────────────────────────────────────────
export function DeadlineModal({ quest, onSave, onRemove, onClose }) {
  const now = new Date();
  // Default: today end of day
  const defaultDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0);

  const toInputValue = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [value, setValue] = useState(
    quest.deadline ? toInputValue(new Date(quest.deadline)) : toInputValue(defaultDate)
  );
  const [error, setError] = useState('');

  // Quick presets
  const PRESETS = [
    { label: '+1 ชม.', ms: 3600000 },
    { label: '+3 ชม.', ms: 10800000 },
    { label: '+6 ชม.', ms: 21600000 },
    { label: '+12 ชม.', ms: 43200000 },
    { label: 'สิ้นวัน', special: 'eod' },
  ];

  const applyPreset = (preset) => {
    const base = new Date();
    if (preset.special === 'eod') {
      base.setHours(23, 59, 0, 0);
    } else {
      base.setTime(base.getTime() + preset.ms);
    }
    setValue(toInputValue(base));
    setError('');
  };

  const handleSave = () => {
    if (!value) { setError('กรุณาเลือกเวลา'); return; }
    const d = new Date(value);
    if (d <= new Date()) { setError('ต้องเลือกเวลาในอนาคต'); return; }
    onSave(d.toISOString());
  };

  return (
    <div className="deadline-modal-overlay" onClick={onClose}>
      <div className="deadline-modal glass-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="deadline-modal-header">
          <span className="text-display" style={{ fontSize: '0.85rem' }}>⏰ ตั้งเวลาถอยหลัง</span>
          <button className="deadline-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Quest Info */}
        <div className="deadline-quest-label">
          <span className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>เควสต์:</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{quest.title}</span>
        </div>

        {/* Quick Presets */}
        <div className="deadline-presets">
          {PRESETS.map(p => (
            <button key={p.label} className="preset-btn text-mono" onClick={() => applyPreset(p)}>
              {p.label}
            </button>
          ))}
        </div>

        {/* DateTime Input */}
        <div className="deadline-input-wrap">
          <label className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            กำหนดวัน / เวลา
          </label>
          <input
            type="datetime-local"
            className="deadline-input"
            value={value}
            min={toInputValue(now)}
            onChange={e => { setValue(e.target.value); setError(''); }}
          />
        </div>

        {error && <div className="deadline-error text-mono">{error}</div>}

        {/* Live Preview */}
        {value && new Date(value) > new Date() && (
          <div className="deadline-preview">
            <QuestTimer deadline={new Date(value).toISOString()} />
          </div>
        )}

        {/* Actions */}
        <div className="deadline-actions">
          {quest.deadline && (
            <button className="btn btn-danger" style={{ flex: 1, minHeight: 44 }} onClick={onRemove}>
              🗑️ ลบเวลา
            </button>
          )}
          <button className="btn btn-success" style={{ flex: 2, minHeight: 44 }} onClick={handleSave}>
            ✅ บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}
