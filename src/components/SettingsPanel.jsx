import React, { useRef } from 'react';
import { useGame } from '../context/GameContext';
import './SettingsPanel.css';

export default function SettingsPanel() {
  const { state, dispatch, exportData, importData, signOut, cloudLoaded } = useGame();
  const importRef = useRef(null);
  const nameRef = useRef(null);

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
    try {
      await importData(file);
    } catch (err) {
      alert('❌ ไม่สามารถอ่านไฟล์ได้ — ตรวจสอบรูปแบบไฟล์อีกครั้ง');
    }
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
            <input
              ref={nameRef}
              type="text"
              className="system-input"
              defaultValue={hunter.name}
              placeholder="ใส่ชื่อฮันเตอร์..."
              maxLength={20}
              id="hunter-name-input"
            />
            <button className="btn btn-primary" onClick={handleSaveName} id="save-name-btn">
              บันทึก
            </button>
          </div>
        </div>
      </div>

      {/* Cloud Sync Status */}
      <div className="settings-section glass-panel-light">
        <div className="settings-title text-display">☁️ Cloud Sync</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: cloudLoaded ? '#00ff88' : '#ffd700',
            boxShadow: cloudLoaded ? '0 0 8px #00ff88' : '0 0 8px #ffd700',
            display: 'inline-block',
            animation: cloudLoaded ? 'none' : 'pulse 1s ease-in-out infinite',
          }} />
          <span className="text-mono" style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            {cloudLoaded ? 'ซิงค์กับ Firebase เรียบร้อย — ข้อมูลปลอดภัย 100%' : 'กำลังซิงค์...'}
          </span>
        </div>

        <button
          className="btn btn-ghost w-full"
          onClick={signOut}
          id="signout-btn"
          style={{ marginTop: '0.75rem', borderColor: 'rgba(255,255,255,0.1)' }}
        >
          🚪 ออกจากระบบ
        </button>
      </div>

      {/* Data Management */}
      <div className="settings-section glass-panel">
        <div className="settings-title text-display">💾 จัดการข้อมูล</div>
        <div className="settings-subtitle text-secondary">
          ข้อมูลถูก Auto-save ขึ้น Cloud อัตโนมัติ — Export ไว้เป็นสำรองเพิ่มเติม
        </div>

        <div className="data-actions">
          <button
            className="btn btn-primary data-btn"
            onClick={exportData}
            id="export-btn"
          >
            <span>📤</span>
            <div>
              <div>Export ข้อมูล</div>
              <div className="btn-sub text-mono">บันทึกเป็นไฟล์ .json</div>
            </div>
          </button>

          <button
            className="btn btn-ghost data-btn"
            onClick={() => importRef.current?.click()}
            id="import-btn"
          >
            <span>📥</span>
            <div>
              <div>Import ข้อมูล</div>
              <div className="btn-sub text-mono">โหลดไฟล์ .json</div>
            </div>
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
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

        <div className="last-login text-mono">
          เข้าสู่ระบบล่าสุด: {state.lastLoginDate || '—'}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="settings-section danger-zone glass-panel">
        <div className="settings-title text-display" style={{ color: 'var(--accent-red)' }}>
          ⚠️ โซนอันตราย
        </div>
        <div className="settings-subtitle text-secondary">
          การรีเซ็ตจะลบข้อมูลทั้งหมดอย่างถาวร — ส่งออกข้อมูลสำรองก่อนดำเนินการ
        </div>
        <button
          className="btn btn-danger w-full"
          onClick={handleReset}
          id="reset-btn"
        >
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
