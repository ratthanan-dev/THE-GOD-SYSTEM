import React, { useRef, useState } from 'react';
import { useGame, getGameDay } from '../context/GameContext';
import './SettingsPanel.css';

// ─────────────────────────────────────────────
// Key List Sub-component
// ─────────────────────────────────────────────
function KeyList({ provider, keys, onAddMultiple, onRemove, placeholder, accentColor }) {
  const [input, setInput] = useState('');
  const [showInputs, setShowInputs] = useState({});
  const [testStatuses, setTestStatuses] = useState({}); // { [keyIndex]: 'success' | 'invalid' | 'ratelimit' | 'loading' | 'error' }

  const toggleShow = (i) => setShowInputs(p => ({ ...p, [i]: !p[i] }));

  const maskKey = (k) => {
    if (!k) return '';
    if (k.length <= 8) return '•'.repeat(k.length);
    return k.slice(0, 6) + '••••••••' + k.slice(-4);
  };

  const handleAdd = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const newKeys = trimmed.split(',').map(k => k.trim()).filter(k => k && !keys.includes(k));
    if (newKeys.length > 0) {
      onAddMultiple(newKeys);
    }
    setInput('');
  };

  const handleTestKey = async (key, index) => {
    setTestStatuses(p => ({ ...p, [index]: 'loading' }));
    try {
      if (provider === 'gemini') {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'say ok' }] }]
          })
        });
        if (res.ok) {
          setTestStatuses(p => ({ ...p, [index]: 'success' }));
        } else {
          if (res.status === 429) {
            setTestStatuses(p => ({ ...p, [index]: 'ratelimit' }));
          } else if (res.status === 400 || res.status === 403) {
            setTestStatuses(p => ({ ...p, [index]: 'invalid' }));
          } else {
            setTestStatuses(p => ({ ...p, [index]: 'error' }));
          }
        }
      } else {
        // Groq
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: 'say ok' }],
            max_tokens: 3
          })
        });
        if (res.ok) {
          setTestStatuses(p => ({ ...p, [index]: 'success' }));
        } else {
          if (res.status === 429) {
            setTestStatuses(p => ({ ...p, [index]: 'ratelimit' }));
          } else if (res.status === 401) {
            setTestStatuses(p => ({ ...p, [index]: 'invalid' }));
          } else {
            setTestStatuses(p => ({ ...p, [index]: 'error' }));
          }
        }
      }
    } catch (err) {
      setTestStatuses(p => ({ ...p, [index]: 'error' }));
    }
  };

  return (
    <div className="key-list-section">
      {/* Existing keys */}
      {keys.length > 0 && (
        <div className="key-entries">
          {keys.map((k, i) => (
            <div key={i} className="key-entry">
              <span className="key-index text-mono" style={{ color: accentColor }}>#{i + 1}</span>
              <span className="key-value text-mono">
                {showInputs[i] ? k : maskKey(k)}
              </span>
              
              {/* Test Status Info */}
              {testStatuses[i] && (
                <span className={`key-test-status text-mono ${testStatuses[i]}`}>
                  {testStatuses[i] === 'loading' && '⏳ กำลังทดสอบ...'}
                  {testStatuses[i] === 'success' && '🟢 ใช้งานได้'}
                  {testStatuses[i] === 'invalid' && '🔴 คีย์ไม่ถูกต้อง'}
                  {testStatuses[i] === 'ratelimit' && '🟡 Rate Limit'}
                  {testStatuses[i] === 'error' && '🔴 ล้มเหลว'}
                </span>
              )}

              <button
                className="key-test-btn text-mono"
                onClick={() => handleTestKey(k, i)}
                disabled={testStatuses[i] === 'loading'}
                title="ทดสอบการใช้งานคีย์นี้"
              >
                🧪 ทดสอบ
              </button>

              <button className="key-toggle-btn" onClick={() => toggleShow(i)} title="แสดง/ซ่อน">
                {showInputs[i] ? '🙈' : '👁️'}
              </button>
              <button className="key-remove-btn" onClick={() => onRemove(i)} title="ลบ">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new key */}
      <div className="key-add-row">
        <input
          type="password"
          className="system-input key-add-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}
        />
        <button
          className="btn btn-primary key-add-btn"
          onClick={handleAdd}
          disabled={!input.trim()}
          style={{ background: `${accentColor}22`, borderColor: `${accentColor}55`, color: accentColor }}
        >
          + เพิ่ม
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main SettingsPanel
// ─────────────────────────────────────────────
export default function SettingsPanel() {
  const { state, dispatch, exportData, importData, signOut, cloudLoaded } = useGame();
  const importRef = useRef(null);
  const nameRef = useRef(null);

  const config = state.aiConfig || { geminiKeys: [], groqKeys: [], preferredProvider: 'auto' };
  const geminiKeys = config.geminiKeys || [];
  const groqKeys = config.groqKeys || [];
  const totalKeys = geminiKeys.filter(k => k?.trim()).length + groqKeys.filter(k => k?.trim()).length;

  const updateConfig = (patch) => {
    dispatch({ type: 'SET_AI_CONFIG', config: { ...config, ...patch } });
  };

  const addKeys = (provider, keysToAdd) => {
    const current = provider === 'gemini' ? geminiKeys : groqKeys;
    const arr = Array.from(new Set([...current, ...keysToAdd]));
    updateConfig(provider === 'gemini' ? { geminiKeys: arr } : { groqKeys: arr });
  };

  const removeKey = (provider, index) => {
    const arr = provider === 'gemini'
      ? geminiKeys.filter((_, i) => i !== index)
      : groqKeys.filter((_, i) => i !== index);
    updateConfig(provider === 'gemini' ? { geminiKeys: arr } : { groqKeys: arr });
  };

  const handleSaveName = () => {
    const name = nameRef.current?.value?.trim();
    if (name) {
      dispatch({ type: 'SET_HUNTER_NAME', name });
      if (navigator.vibrate) navigator.vibrate(50);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { await importData(file); } catch { alert('❌ ไม่สามารถอ่านไฟล์ได้ — ตรวจสอบรูปแบบไฟล์อีกครั้ง'); }
    e.target.value = '';
  };

  const handleReset = () => {
    if (window.confirm('⚠️ ต้องการรีเซ็ตข้อมูลทั้งหมดจริงหรือไม่?\nการกระทำนี้ไม่สามารถย้อนกลับได้!')) {
      dispatch({ type: 'RESET_DATA' });
      dispatch({ type: 'DAILY_RESET' });
      if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
    }
  };

  const { hunter } = state;

  return (
    <div className="settings-panel">

      {/* Hunter Profile */}
      <div className="settings-section glass-panel corner-tl corner-tr">
        <div className="settings-title text-display">⚙️ โปรไฟล์ฮันเตอร์</div>
        <div className="form-group">
          <label className="form-label text-mono">ชื่อฮันเตอร์</label>
          <div className="form-row">
            <input ref={nameRef} type="text" className="system-input" defaultValue={hunter.name} placeholder="ใส่ชื่อฮันเตอร์..." maxLength={20} id="hunter-name-input" />
            <button className="btn btn-primary" onClick={handleSaveName} id="save-name-btn">บันทึก</button>
          </div>
        </div>

        {/* Day Reset Hour */}
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="form-label text-mono">
            🌙 วันใหม่เริ่มเมื่อ
            <span className="form-label-hint"> · เควสต์จะรีเซ็ตตามเวลานี้</span>
          </label>
          <div className="reset-hour-pills">
            {[
              { h: 0, label: '00:00', note: 'เที่ยงคืน' },
              { h: 2, label: '02:00', note: 'ตี 2' },
              { h: 3, label: '03:00', note: 'ตี 3' },
              { h: 4, label: '04:00', note: 'ตี 4 (แนะนำ)' },
              { h: 5, label: '05:00', note: 'ตี 5' },
            ].map(({ h, label, note }) => {
              const active = (state.settings?.dayResetHour ?? 4) === h;
              return (
                <button
                  key={h}
                  className={`reset-hour-pill text-mono ${active ? 'active' : ''}`}
                  onClick={() => dispatch({ type: 'UPDATE_SETTINGS', patch: { dayResetHour: h } })}
                  id={`reset-hour-${h}`}
                >
                  <span className="reset-hour-time">{label}</span>
                  <span className="reset-hour-note">{note}</span>
                </button>
              );
            })}
          </div>
          <div className="reset-hour-info text-mono">
            📅 วันเกมปัจจุบัน: <span style={{ color: 'var(--neon-primary)' }}>
              {getGameDay(state.settings?.dayResetHour ?? 4)}
            </span>
          </div>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="settings-section glass-panel" style={{ borderColor: totalKeys > 0 ? 'rgba(0,255,136,0.3)' : undefined }}>
        <div className="settings-title text-display" style={{ color: '#00ff88', textShadow: '0 0 10px #00ff88' }}>
          🧠 AI Configuration
        </div>
        <div className="settings-subtitle text-secondary">
          รองรับ Gemini + Groq — ใส่ได้หลาย keys ต่อ provider — auto-rotate เมื่อ rate limit
        </div>

        {/* Status Summary */}
        <div className="ai-status-row">
          <div className="ai-status-item">
            <span className="ai-status-dot-sm" style={{ background: geminiKeys.filter(k=>k?.trim()).length > 0 ? '#4285f4' : '#444' }} />
            <span className="text-mono ai-status-label">Gemini</span>
            <span className="text-mono ai-key-count" style={{ color: '#4285f4' }}>
              {geminiKeys.filter(k=>k?.trim()).length} key{geminiKeys.filter(k=>k?.trim()).length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="ai-status-item">
            <span className="ai-status-dot-sm" style={{ background: groqKeys.filter(k=>k?.trim()).length > 0 ? '#f55036' : '#444' }} />
            <span className="text-mono ai-status-label">Groq</span>
            <span className="text-mono ai-key-count" style={{ color: '#f55036' }}>
              {groqKeys.filter(k=>k?.trim()).length} key{groqKeys.filter(k=>k?.trim()).length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="ai-status-item" style={{ marginLeft: 'auto' }}>
            <span className="text-mono" style={{ fontSize: '0.6rem', color: totalKeys > 0 ? '#00ff88' : 'var(--text-muted)' }}>
              {totalKeys > 0 ? `✓ ${totalKeys} keys พร้อมใช้` : '⚠ ยังไม่มี key'}
            </span>
          </div>
        </div>

        {/* Provider Preference */}
        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label className="form-label text-mono">โหมดการใช้งาน</label>
          <div className="provider-selector">
            {[
              { value: 'auto',   label: '⚡ AUTO',   desc: 'สลับอัตโนมัติ' },
              { value: 'gemini', label: '✦ Gemini', desc: 'ใช้ Gemini หลัก' },
              { value: 'groq',   label: '🔥 Groq',   desc: 'ใช้ Groq หลัก' },
            ].map(opt => (
              <button
                key={opt.value}
                className={`provider-opt-btn text-mono ${config.preferredProvider === opt.value ? 'active' : ''}`}
                onClick={() => updateConfig({ preferredProvider: opt.value })}
              >
                <div>{opt.label}</div>
                <div className="provider-opt-desc">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Gemini Keys */}
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="form-label text-mono" style={{ color: '#4285f4' }}>
            ✦ Gemini API Keys
            <span className="form-label-hint"> · aistudio.google.com/apikey</span>
          </label>
          <KeyList
            provider="gemini"
            keys={geminiKeys}
            onAddMultiple={(keys) => addKeys('gemini', keys)}
            onRemove={(i) => removeKey('gemini', i)}
            placeholder="AIzaSy..."
            accentColor="#4285f4"
          />
        </div>

        {/* Groq Keys */}
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label className="form-label text-mono" style={{ color: '#f55036' }}>
            ⚡ Groq API Keys
            <span className="form-label-hint"> · console.groq.com/keys</span>
          </label>
          <KeyList
            provider="groq"
            keys={groqKeys}
            onAddMultiple={(keys) => addKeys('groq', keys)}
            onRemove={(i) => removeKey('groq', i)}
            placeholder="gsk_..."
            accentColor="#f55036"
          />
        </div>

        <div className="text-mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
          🔒 Keys เก็บใน localStorage เท่านั้น — ไม่ถูก sync ขึ้น Cloud
        </div>
      </div>

      {/* Cloud Sync Status */}
      <div className="settings-section glass-panel-light">
        <div className="settings-title text-display">☁️ Cloud Sync</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cloudLoaded ? '#00ff88' : '#ffd700', boxShadow: cloudLoaded ? '0 0 8px #00ff88' : '0 0 8px #ffd700', display: 'inline-block' }} />
          <span className="text-mono" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {cloudLoaded ? 'ซิงค์กับ Firebase เรียบร้อย — ข้อมูลปลอดภัย 100%' : 'กำลังซิงค์...'}
          </span>
        </div>
        <button className="btn btn-ghost w-full" onClick={signOut} id="signout-btn" style={{ marginTop: '0.75rem', borderColor: 'rgba(255,255,255,0.1)' }}>
          🚪 ออกจากระบบ
        </button>
      </div>

      {/* Data Management */}
      <div className="settings-section glass-panel">
        <div className="settings-title text-display">💾 จัดการข้อมูล</div>
        <div className="settings-subtitle text-secondary">ข้อมูลถูก Auto-save ขึ้น Cloud อัตโนมัติ — Export ไว้เป็นสำรองเพิ่มเติม</div>
        <div className="data-actions">
          <button className="btn btn-primary data-btn" onClick={exportData} id="export-btn">
            <span>📤</span>
            <div><div>Export ข้อมูล</div><div className="btn-sub text-mono">บันทึกเป็นไฟล์ .json</div></div>
          </button>
          <button className="btn btn-ghost data-btn" onClick={() => importRef.current?.click()} id="import-btn">
            <span>📥</span>
            <div><div>Import ข้อมูล</div><div className="btn-sub text-mono">โหลดไฟล์ .json</div></div>
          </button>
          <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </div>
      </div>

      {/* Current Save Info */}
      <div className="settings-section glass-panel-light">
        <div className="settings-title text-display" style={{ fontSize: '0.75rem' }}>📊 ข้อมูลปัจจุบัน</div>
        <div className="save-info-grid">
          <div className="save-info-item">
            <span className="text-mono" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>ชื่อ</span>
            <span className="text-mono" style={{ color: 'var(--neon-primary)', fontSize: '0.8rem' }}>{hunter.name}</span>
          </div>
          <div className="save-info-item">
            <span className="text-mono" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>LEVEL</span>
            <span className="text-mono" style={{ color: 'var(--neon-primary)', fontSize: '0.8rem' }}>{hunter.level}</span>
          </div>
          <div className="save-info-item">
            <span className="text-mono" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>RANK</span>
            <span className="text-mono" style={{ color: 'var(--accent-gold)', fontSize: '0.8rem' }}>{hunter.rank}</span>
          </div>
          <div className="save-info-item">
            <span className="text-mono" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>TOTAL EXP</span>
            <span className="text-mono" style={{ color: 'var(--neon-primary)', fontSize: '0.8rem' }}>{hunter.totalExp.toLocaleString()}</span>
          </div>
        </div>
        <div className="last-login text-mono">เข้าสู่ระบบล่าสุด: {state.lastLoginDate || '—'}</div>
      </div>

      {/* Danger Zone */}
      <div className="settings-section danger-zone glass-panel">
        <div className="settings-title text-display" style={{ color: 'var(--accent-red)' }}>⚠️ โซนอันตราย</div>
        <div className="settings-subtitle text-secondary">การรีเซ็ตจะลบข้อมูลทั้งหมดอย่างถาวร — ส่งออกข้อมูลสำรองก่อนดำเนินการ</div>
        <button className="btn btn-danger w-full" onClick={handleReset} id="reset-btn">
          🗑️ รีเซ็ตข้อมูลทั้งหมด
        </button>
      </div>

      {/* About */}
      <div className="about-section text-center">
        <div className="text-mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          REAL-LIFE SYSTEM v1.0 — Firebase Cloud Edition
        </div>
        <div className="text-mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Powered by THE-GOD-SYSTEM ✦ Auto-save enabled
        </div>
      </div>

    </div>
  );
}
