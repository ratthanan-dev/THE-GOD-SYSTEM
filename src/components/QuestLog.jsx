import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import './QuestLog.css';

const CATEGORY_CONFIG = {
  fitness: { label: 'FITNESS', icon: '💪', color: '#ff6b35' },
  study: { label: 'STUDY', icon: '📚', color: '#7b2fff' },
  mindset: { label: 'MINDSET', icon: '🧘', color: '#00d4ff' },
  daily: { label: 'DAILY', icon: '☀️', color: '#ffd700' },
};

const STAT_ICONS = {
  str: '⚔️',
  agi: '⚡',
  int: '📖',
  vit: '🛡️',
  sense: '👁️',
};

export default function QuestLog() {
  const { state, dispatch } = useGame();
  const { quests } = state;
  const [filter, setFilter] = useState('all');
  const [completing, setCompleting] = useState(null);

  const completedCount = quests.filter(q => q.completed).length;
  const totalCount = quests.length;

  const filteredQuests = filter === 'all'
    ? quests
    : filter === 'active'
    ? quests.filter(q => !q.completed)
    : quests.filter(q => q.completed);

  const handleComplete = (questId) => {
    if (completing) return;
    setCompleting(questId);

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate([50, 30, 100]);

    setTimeout(() => {
      dispatch({ type: 'COMPLETE_QUEST', questId });
      setCompleting(null);
    }, 600);
  };

  return (
    <div className="quest-log">
      {/* Header */}
      <div className="quest-header glass-panel corner-tl corner-tr">
        <div className="quest-header-title text-display">
          📋 บันทึกเควสต์
        </div>
        <div className="quest-progress-overview">
          <div className="quest-count text-mono">
            {completedCount}/{totalCount} ภารกิจสำเร็จ
          </div>
          <div className="progress-bar-container" style={{ height: '6px' }}>
            <div
              className="progress-bar-fill exp-bar"
              style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          {['all', 'active', 'done'].map(f => (
            <button
              key={f}
              className={`filter-tab text-mono ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'ทั้งหมด' : f === 'active' ? 'กำลังดำเนินการ' : 'สำเร็จแล้ว'}
            </button>
          ))}
        </div>
      </div>

      {/* Quest List */}
      <div className="quest-list">
        {filteredQuests.length === 0 && (
          <div className="empty-state glass-panel">
            <div className="empty-icon">🏆</div>
            <div className="empty-title text-display">ทำเควสต์ครบหมดแล้ว!</div>
            <div className="empty-sub text-mono">ยอดเยี่ยม ฮันเตอร์</div>
          </div>
        )}

        {filteredQuests.map((quest, idx) => {
          const catCfg = CATEGORY_CONFIG[quest.category] || CATEGORY_CONFIG.daily;
          const isCompleting = completing === quest.id;

          return (
            <div
              key={quest.id}
              className={`quest-card glass-panel ${quest.completed ? 'completed' : ''} ${isCompleting ? 'completing' : ''}`}
              style={{ animationDelay: `${idx * 0.08}s`, '--cat-color': catCfg.color }}
            >
              {/* Category Tag */}
              <div className="quest-category" style={{ background: `${catCfg.color}22`, borderColor: `${catCfg.color}55` }}>
                <span>{catCfg.icon}</span>
                <span className="text-mono" style={{ color: catCfg.color }}>{catCfg.label}</span>
              </div>

              {/* Quest Content */}
              <div className="quest-content">
                <div className="quest-title-row">
                  <div className={`quest-title ${quest.completed ? 'done' : ''}`}>
                    {quest.completed && <span className="checkmark">✓</span>}
                    {quest.title}
                  </div>
                </div>
                <div className="quest-desc text-secondary">{quest.desc}</div>

                {/* Rewards */}
                <div className="quest-rewards">
                  <div className="reward-item">
                    <span>✨</span>
                    <span className="text-mono reward-exp">+{quest.exp} EXP</span>
                  </div>
                  {quest.stat && (
                    <div className="reward-item">
                      <span>{STAT_ICONS[quest.stat] || '⬆️'}</span>
                      <span className="text-mono reward-stat">+{quest.statGain} {quest.stat.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Complete Button */}
              {!quest.completed && (
                <button
                  className={`btn btn-success quest-complete-btn ${isCompleting ? 'completing' : ''}`}
                  onClick={() => handleComplete(quest.id)}
                  disabled={!!completing}
                  id={`quest-btn-${quest.id}`}
                >
                  {isCompleting ? (
                    <span className="completing-text">⚡ กำลังรับรางวัล...</span>
                  ) : (
                    <>✅ เสร็จสิ้น</>
                  )}
                </button>
              )}

              {quest.completed && (
                <div className="quest-done-badge text-mono">
                  ⚡ CLEARED
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* System Notice */}
      <div className="system-notice glass-panel-light">
        <div className="notice-text text-mono">
          ⚠️ เควสต์จะรีเซ็ตเวลาเปิดแอปวันใหม่ — ทำไม่ครบจะถูกหักค่าสถิติ
        </div>
      </div>
    </div>
  );
}
