import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import './ChatHistorySidebar.css';

// ─────────────────────────────────────────────
// Format relative time label
// ─────────────────────────────────────────────
function getGroupLabel(ts) {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const sessionDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (sessionDay.getTime() === today.getTime()) return 'วันนี้';
  if (sessionDay.getTime() === yesterday.getTime()) return 'เมื่อวาน';

  const diffDays = Math.floor((today - sessionDay) / 86400000);
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} สัปดาห์ที่แล้ว`;
  return d.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

// ─────────────────────────────────────────────
// Group sessions by date
// ─────────────────────────────────────────────
function groupSessionsByDate(sessions) {
  const groups = [];
  const seen = {};
  const sorted = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

  sorted.forEach(s => {
    const label = getGroupLabel(s.updatedAt);
    if (!seen[label]) {
      seen[label] = true;
      groups.push({ label, sessions: [] });
    }
    groups[groups.length - 1].sessions.push(s);
  });
  return groups;
}

// ─────────────────────────────────────────────
// Main Sidebar Component
// ─────────────────────────────────────────────
export default function ChatHistorySidebar({ isOpen, onClose }) {
  const { state, dispatch } = useGame();
  const { chatSessions, activeChatSessionId } = state;
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const handleNewChat = () => {
    dispatch({ type: 'CREATE_CHAT_SESSION' });
    onClose();
  };

  const handleSelect = (sessionId) => {
    dispatch({ type: 'SWITCH_CHAT_SESSION', sessionId });
    onClose();
  };

  const handleDelete = (sessionId) => {
    setDeleteConfirmId(sessionId);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      dispatch({ type: 'DELETE_CHAT_SESSION', sessionId: deleteConfirmId });
      setDeleteConfirmId(null);
    }
  };

  const groups = groupSessionsByDate(chatSessions);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`sidebar-backdrop ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar Panel */}
      <aside className={`chat-history-sidebar ${isOpen ? 'open' : ''}`} role="navigation" aria-label="ประวัติการแชท">
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-title">
            <span className="sidebar-title-icon">⬡</span>
            <span className="text-display sidebar-title-text">CHAT LOG</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="ปิด" id="sidebar-close-btn">✕</button>
        </div>

        {/* New Chat Button */}
        <div className="sidebar-new-chat">
          <button className="new-chat-btn" onClick={handleNewChat} id="new-chat-btn">
            <span>＋</span>
            <span>การสนทนาใหม่</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="sidebar-sessions">
          {groups.length === 0 ? (
            <div className="sidebar-empty">
              <div className="sidebar-empty-icon">◈</div>
              <div>ไม่พบการสนทนา</div>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.label} className="session-group">
                <div className="session-group-label">{group.label}</div>
                {group.sessions.map(session => {
                  const isActive = session.id === activeChatSessionId;
                  const msgCount = session.messages?.length || 0;
                  return (
                    <div key={session.id} className="session-item-wrapper">
                      <div
                        className={`session-item ${isActive ? 'active' : ''}`}
                        onClick={() => handleSelect(session.id)}
                      >
                        <span className="session-icon">
                          {isActive ? '⬡' : '◇'}
                        </span>
                        <div className="session-info">
                          <div className="session-title">{session.title}</div>
                          <div className="session-meta">
                            <span>{formatTime(session.updatedAt)}</span>
                            <span>·</span>
                            <span>{msgCount} ข้อความ</span>
                          </div>
                        </div>
                        {isActive && <div className="session-active-bar" />}
                        <button
                          className="session-delete-btn"
                          onClick={(e) => { e.stopPropagation(); handleDelete(session.id); }}
                          aria-label="ลบ"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          {chatSessions.length} การสนทนา · บันทึกในเครื่อง
        </div>
      </aside>

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="delete-confirm-overlay">
          <div className="delete-confirm-modal">
            <div className="delete-confirm-icon">⚠️</div>
            <div className="delete-confirm-title">ยืนยันการลบ</div>
            <div className="delete-confirm-desc">
              การสนทนานี้จะถูกลบถาวร<br />ไม่สามารถกู้คืนได้
            </div>
            <div className="delete-confirm-actions">
              <button
                className="btn btn-ghost"
                onClick={() => setDeleteConfirmId(null)}
                id="delete-cancel-btn"
              >
                ยกเลิก
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmDelete}
                id="delete-confirm-btn"
              >
                🗑 ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
