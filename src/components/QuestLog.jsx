import React, { useState, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { callAI } from '../services/aiService';
import QuestTimer, { DeadlineModal } from './QuestTimer';
import ReactMarkdown from 'react-markdown';
import './QuestLog.css';
import './QuestTimer.css';

const CATEGORY_CONFIG = {
  fitness: { label: 'FITNESS', icon: '💪', color: '#ff6b35' },
  study: { label: 'STUDY', icon: '📚', color: '#7b2fff' },
  mindset: { label: 'MINDSET', icon: '🧘', color: '#00d4ff' },
  daily: { label: 'DAILY', icon: '☀️', color: '#ffd700' },
  creative: { label: 'CREATIVE', icon: '🎨', color: '#ff2d91' },
};

const STAT_ICONS = {
  str: '⚔️', agi: '⚡', int: '📖', vit: '🛡️', sense: '👁️',
};

const CATEGORY_STAT_DEFAULT = {
  fitness: { stat: 'str', statGain: 2 },
  study: { stat: 'int', statGain: 2 },
  mindset: { stat: 'sense', statGain: 2 },
  daily: { stat: 'vit', statGain: 1 },
  creative: { stat: 'sense', statGain: 2 },
};

// ── AI EXP Evaluator (lightweight — no history) ──────────────────────────────
async function evaluateExpWithAI(title, desc, category, aiConfig) {
  const prompt = `คุณคือ THE SYSTEM ประเมิน EXP สำหรับภารกิจ:
ชื่อ: "${title}"
รายละเอียด: "${desc || 'ไม่ระบุ'}"
หมวด: ${category}

ตอบเฉพาะ JSON เท่านั้น ไม่มีข้อความเพิ่มเติม:
{"exp": <ตัวเลข 30-150>, "stat": "<str|agi|int|vit|sense>", "statGain": <1-3>}`;

  try {
    const result = await callAI({
      aiConfig,
      messages: [{ role: 'user', content: prompt }],
      hunterData: { hunter: { name: '', level: 1, rank: 'E', jobTitle: '', hp: 100, maxHp: 100, totalExp: 0, stats: {} }, quests: [], computed: { expInCurrentLevel: 0, expToNext: 100, expPercent: 0 } },
    });
    const jsonMatch = result.text.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        exp: Math.min(150, Math.max(30, Number(parsed.exp) || 60)),
        stat: ['str', 'agi', 'int', 'vit', 'sense'].includes(parsed.stat) ? parsed.stat : CATEGORY_STAT_DEFAULT[category]?.stat || 'int',
        statGain: Math.min(3, Math.max(1, Number(parsed.statGain) || 1)),
      };
    }
  } catch {
    /* fallback to default */
  }
  return {
    exp: 60,
    ...CATEGORY_STAT_DEFAULT[category] || { stat: 'int', statGain: 1 },
  };
}

// ── Add/Edit Modal ────────────────────────────────────────────────────────────
function QuestFormModal({ mode = 'add', initialData = {}, onSubmit, onClose, isLoading }) {
  const [title, setTitle] = useState(initialData.title || '');
  const [desc, setDesc] = useState(initialData.desc || '');
  const [category, setCategory] = useState(initialData.category || 'daily');
  const [deadlineDays, setDeadlineDays] = useState(0);
  const [priority, setPriority] = useState(initialData.priority || 'low');
  const [recurrence, setRecurrence] = useState(initialData.recurrence || 'none');
  const [tagsInput, setTagsInput] = useState((initialData.tags || []).join(', '));
  const [subtasks, setSubtasks] = useState(initialData.subtasks || []);
  const [newSubtask, setNewSubtask] = useState('');

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks([...subtasks, { id: Date.now().toString(), title: newSubtask.trim(), completed: false }]);
    setNewSubtask('');
  };

  const removeSubtask = (id) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    let deadline = null;
    if (deadlineDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() + deadlineDays);
      d.setHours(23, 59, 59, 999);
      deadline = d.toISOString();
    }
    
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    onSubmit({ title: title.trim(), desc: desc.trim(), category, deadline, priority, tags, subtasks, recurrence });
  };

  return (
    <div className="quest-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="quest-modal glass-panel corner-tl corner-tr">
        {/* Modal Header */}
        <div className="quest-modal-header">
          <span className="quest-modal-title text-display">
            {mode === 'edit' ? '[ EDIT MISSION ]' : '[ NEW MISSION ]'}
          </span>
          <button className="quest-modal-close" onClick={onClose} aria-label="ปิด">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="quest-modal-form">
          {/* Title */}
          <div className="form-group">
            <label className="form-label text-mono">ชื่อภารกิจ <span className="required-mark">*</span></label>
            <input
              className="form-input"
              type="text"
              placeholder="เช่น วิ่ง 30 นาที, อ่านหนังสือ 1 ชั่วโมง..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              autoFocus
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label text-mono">รายละเอียด <span className="optional-mark">(ไม่บังคับ)</span></label>
            <textarea
              className="form-input form-textarea"
              placeholder="อธิบายภารกิจให้ชัดเจนขึ้น..."
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              maxLength={200}
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* Priority selector */}
          <div className="form-group">
            <label className="form-label text-mono">ระดับความสำคัญ</label>
            <div className="priority-pills">
              {[
                { val: 'high', label: '🔴 High' },
                { val: 'medium', label: '🟡 Medium' },
                { val: 'low', label: '🔵 Low' }
              ].map(p => (
                <button
                  type="button"
                  key={p.val}
                  className={`priority-pill ${priority === p.val ? 'active' : ''}`}
                  onClick={() => setPriority(p.val)}
                  disabled={isLoading}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="form-group">
            <label className="form-label text-mono">แท็ก (Tags) <span className="optional-mark">คั่นด้วยลูกน้ำ (,)</span></label>
            <input
              className="form-input"
              type="text"
              placeholder="เช่น #urgent, work, shopping"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Subtasks */}
          <div className="form-group">
            <label className="form-label text-mono">งานย่อย (Subtasks)</label>
            <div className="subtasks-container">
              {subtasks.map(st => (
                <div key={st.id} className="subtask-item">
                  <span className="subtask-title">{st.title}</span>
                  <button type="button" className="subtask-remove" onClick={() => removeSubtask(st.id)}>✕</button>
                </div>
              ))}
              <div className="subtask-input-row" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <input
                  className="form-input subtask-input"
                  type="text"
                  placeholder="เพิ่มงานย่อย..."
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
                  disabled={isLoading}
                />
                <button type="button" className="btn btn-secondary subtask-add-btn" onClick={addSubtask} style={{ padding: '0 16px' }}>เพิ่ม</button>
              </div>
            </div>
          </div>

          {/* Category selector — only for Add mode */}
          {mode === 'add' && (
            <div className="form-group">
              <label className="form-label text-mono">หมวดหมู่</label>
              <div className="category-pills">
                {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                  <button
                    type="button"
                    key={key}
                    className={`category-pill ${category === key ? 'active' : ''}`}
                    style={category === key
                      ? { background: `${cfg.color}28`, borderColor: cfg.color, color: cfg.color, boxShadow: `0 0 10px ${cfg.color}44` }
                      : {}}
                    onClick={() => setCategory(key)}
                    disabled={isLoading}
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Deadline selector */}
          {mode === 'add' && (
            <div className="form-group">
              <label className="form-label text-mono">เวลาที่กำหนด (Deadline)</label>
              <select
                className="form-input"
                style={{ appearance: 'none', background: 'rgba(20,20,30,0.5)' }}
                value={deadlineDays}
                onChange={(e) => setDeadlineDays(Number(e.target.value))}
                disabled={isLoading}
              >
                <option value={0}>สิ้นสุดวันนี้ (Daily)</option>
                <option value={1}>พรุ่งนี้ (+1 วัน)</option>
                <option value={2}>มะรืนนี้ (+2 วัน)</option>
                <option value={3}>3 วัน</option>
                <option value={7}>1 สัปดาห์</option>
              </select>
            </div>
          )}

          {/* Recurrence */}
          {mode === 'add' && (
            <div className="form-group">
              <label className="form-label text-mono">การทำซ้ำ (Recurrence)</label>
              <select
                className="form-input"
                style={{ appearance: 'none', background: 'rgba(20,20,30,0.5)' }}
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                disabled={isLoading}
              >
                <option value="none">ไม่ทำซ้ำ (One-time)</option>
                <option value="daily">ทำซ้ำทุกวัน (Daily)</option>
              </select>
            </div>
          )}

          {/* AI EXP notice */}
          {mode === 'add' && (
            <div className="ai-exp-notice text-mono">
              🤖 EXP จะถูกประเมินโดย AI อัตโนมัติ
            </div>
          )}

          {/* Actions */}
          <div className="quest-modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isLoading}>
              ยกเลิก
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading || !title.trim()}>
              {isLoading ? (
                <span className="completing-text">⚡ กำลังประเมิน...</span>
              ) : mode === 'edit' ? (
                '✏️ บันทึกการแก้ไข'
              ) : (
                '⚡ สร้างภารกิจ'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({ questTitle, onConfirm, onClose }) {
  return (
    <div className="quest-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="quest-modal quest-modal-sm glass-panel">
        <div className="quest-modal-header">
          <span className="quest-modal-title text-display" style={{ color: 'var(--accent-red)', textShadow: '0 0 10px var(--accent-red)' }}>
            ⚠️ ยืนยันการลบ
          </span>
        </div>
        <p className="delete-confirm-text text-secondary">
          ต้องการลบภารกิจ <strong style={{ color: 'var(--text-primary)' }}>"{questTitle}"</strong> ออกจากระบบ?
          <br />
          <span className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--accent-red)' }}>⚠️ ไม่สามารถกู้คืนได้</span>
        </p>
        <div className="quest-modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-danger" onClick={onConfirm}>🗑️ ลบภารกิจ</button>
        </div>
      </div>
    </div>
  );
}

// ── Main QuestLog ─────────────────────────────────────────────────────────────
export default function QuestLog() {
  const { state, dispatch } = useGame();
  const { quests } = state;

  const [filter, setFilter] = useState('all');
  const [completing, setCompleting] = useState(null);
  const [deadlineModal, setDeadlineModal] = useState(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);   // quest object to edit
  const [deleteModal, setDeleteModal] = useState(null); // quest object to delete
  const [aiLoading, setAiLoading] = useState(false);

  const completedCount = quests.filter(q => q.completed).length;
  const activeCount = quests.filter(q => !q.completed).length;
  const totalCount = quests.length;

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [smartFilter, setSmartFilter] = useState('all');

  // Compute final filtered & sorted quests
  const getProcessedQuests = () => {
    let result = quests;

    // 1. Base status filter (all, active, done)
    if (filter === 'active') result = result.filter(q => !q.completed);
    if (filter === 'done') result = result.filter(q => q.completed);

    // 2. Search query
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(q => 
        q.title.toLowerCase().includes(lowerQ) || 
        (q.desc && q.desc.toLowerCase().includes(lowerQ)) ||
        (q.tags && q.tags.some(t => t.toLowerCase().includes(lowerQ)))
      );
    }

    // 3. Smart Filter
    if (smartFilter !== 'all') {
      const now = new Date();
      if (smartFilter === 'myday') {
        result = result.filter(q => {
          if (!q.deadline) return true; // consider no deadline as today
          const d = new Date(q.deadline);
          return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
      } else if (smartFilter === 'upcoming') {
        result = result.filter(q => {
          if (!q.deadline) return false;
          const d = new Date(q.deadline);
          d.setHours(0,0,0,0);
          const today = new Date();
          today.setHours(0,0,0,0);
          return d > today;
        });
      } else if (['high', 'medium', 'low'].includes(smartFilter)) {
        result = result.filter(q => q.priority === smartFilter);
      }
    }

    // 4. Sort
    if (sortBy === 'priority') {
      const pLevel = { high: 3, medium: 2, low: 1 };
      result = [...result].sort((a, b) => (pLevel[b.priority] || 1) - (pLevel[a.priority] || 1));
    } else if (sortBy === 'date_asc') {
      result = [...result].sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      });
    }

    return result;
  };

  const filteredQuests = getProcessedQuests();

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleComplete = (questId) => {
    if (completing) return;
    setCompleting(questId);
    if (navigator.vibrate) navigator.vibrate([50, 30, 100]);
    setTimeout(() => {
      dispatch({ type: 'COMPLETE_QUEST', questId });
      setCompleting(null);
    }, 600);
  };

  const handleUndo = (questId) => {
    dispatch({ type: 'UNDO_QUEST', questId });
    if (navigator.vibrate) navigator.vibrate(30);
  };

  const handleSaveDeadline = (questId, deadline) => {
    dispatch({ type: 'SET_QUEST_DEADLINE', questId, deadline });
    setDeadlineModal(null);
  };

  const handleRemoveDeadline = (questId) => {
    dispatch({ type: 'REMOVE_QUEST_DEADLINE', questId });
    setDeadlineModal(null);
  };

  const handleToggleSubtask = (questId, subtaskId) => {
    dispatch({ type: 'TOGGLE_SUBTASK', questId, subtaskId });
    if (navigator.vibrate) navigator.vibrate(20);
  };

  // ── Add Quest (with AI EXP) ────────────────────────────────────────────────
  const handleAddSubmit = useCallback(async ({ title, desc, category, deadline, priority, tags, subtasks, recurrence }) => {
    setAiLoading(true);
    let expData = { exp: 60, ...CATEGORY_STAT_DEFAULT[category] || { stat: 'int', statGain: 1 } };

    const hasAiKey = (state.aiConfig?.geminiKeys?.some(k => k?.trim()) || state.aiConfig?.groqKeys?.some(k => k?.trim()));

    if (hasAiKey) {
      expData = await evaluateExpWithAI(title, desc, category, state.aiConfig);
    }

    dispatch({
      type: 'CREATE_QUEST',
      title,
      desc,
      category,
      deadline,
      priority,
      tags,
      subtasks,
      recurrence,
      ...expData,
    });

    setAiLoading(false);
    setShowAddModal(false);
  }, [dispatch, state.aiConfig]);

  // ── Edit Quest ─────────────────────────────────────────────────────────────
  const handleEditSubmit = useCallback(({ title, desc, deadline, priority, tags, subtasks, recurrence }) => {
    dispatch({ type: 'UPDATE_QUEST', questId: editModal.id, title, desc, priority, tags, subtasks, recurrence });
    setEditModal(null);
  }, [dispatch, editModal]);

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDragStart = (e, questId) => {
    if (sortBy !== 'default' || filter !== 'all' || smartFilter !== 'all') return;
    e.dataTransfer.setData('questId', questId);
    e.currentTarget.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };

  const handleDragOver = (e) => {
    if (sortBy !== 'default' || filter !== 'all' || smartFilter !== 'all') return;
    e.preventDefault();
  };

  const handleDrop = (e, targetId) => {
    if (sortBy !== 'default' || filter !== 'all' || smartFilter !== 'all') return;
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('questId');
    if (sourceId && sourceId !== targetId) {
      dispatch({ type: 'REORDER_QUESTS', sourceId, targetId });
    }
  };

  // ── Delete Quest ───────────────────────────────────────────────────────────
  const handleDeleteConfirm = useCallback(() => {
    dispatch({ type: 'DELETE_QUEST', questId: deleteModal.id });
    setDeleteModal(null);
    if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
  }, [dispatch, deleteModal]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="quest-log">
      {/* ── Header ── */}
      <div className="quest-header glass-panel corner-tl corner-tr">
        <div className="quest-header-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="quest-header-title text-display">
            📋 บันทึกเควสต์
          </div>
          <button 
            className={`icon-btn hamburger-btn ${showAdvanced ? 'active' : ''}`}
            onClick={() => setShowAdvanced(!showAdvanced)}
            aria-label="ค้นหาและตัวกรอง"
            style={{ fontSize: '1.2rem', padding: '4px 8px' }}
          >
            {showAdvanced ? '✕' : '☰'}
          </button>
        </div>
        
        {showAdvanced && (
          <div className="advanced-filters-panel" style={{ marginTop: '16px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="🔍 ค้นหางาน, แท็ก..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
                <label className="form-label text-mono">ตัวกรองอัจฉริยะ</label>
                <select className="form-input" value={smartFilter} onChange={e => setSmartFilter(e.target.value)} style={{ padding: '8px' }}>
                  <option value="all">ทั้งหมด</option>
                  <option value="myday">⭐ งานวันนี้ (My Day)</option>
                  <option value="upcoming">📅 ล่วงหน้า (Upcoming)</option>
                  <option value="high">🔴 สำคัญมาก (High)</option>
                  <option value="medium">🟡 ปานกลาง (Medium)</option>
                  <option value="low">🔵 ทั่วไป (Low)</option>
                </select>
              </div>
              
              <div className="form-group" style={{ flex: 1, minWidth: '120px' }}>
                <label className="form-label text-mono">เรียงลำดับ</label>
                <select className="form-input" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '8px' }}>
                  <option value="default">ปกติ (ตามที่สร้าง)</option>
                  <option value="priority">🔥 ความสำคัญสูงสุด</option>
                  <option value="date_asc">⏳ ใกล้ครบกำหนดที่สุด</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="quest-progress-overview" style={{ marginTop: '16px' }}>
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
          {[
            { key: 'all', label: 'ทั้งหมด', count: totalCount },
            { key: 'active', label: 'กำลังดำเนินการ', count: activeCount },
            { key: 'done', label: 'สำเร็จแล้ว', count: completedCount },
          ].map(f => (
            <button
              key={f.key}
              className={`filter-tab text-mono ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="filter-count">{f.count}</span>
            </button>
          ))}
        </div>

        {/* Add Task Button */}
        <button
          className="btn btn-primary add-task-btn"
          onClick={() => setShowAddModal(true)}
          id="add-task-btn"
        >
          <span>➕</span>
          <span>เพิ่มภารกิจใหม่</span>
        </button>
      </div>

      {/* ── Quest List ── */}
      <div className="quest-list">
        {filteredQuests.length === 0 && (
          <div className="empty-state glass-panel">
            <div className="empty-icon">
              {filter === 'done' ? '🏆' : filter === 'active' ? '✅' : '📭'}
            </div>
            <div className="empty-title text-display">
              {filter === 'done'
                ? 'ยังไม่มีภารกิจที่สำเร็จ'
                : filter === 'active'
                  ? 'ทำเควสต์ครบหมดแล้ว!'
                  : 'ไม่มีภารกิจในระบบ'}
            </div>
            <div className="empty-sub text-mono">
              {filter === 'active' ? 'ยอดเยี่ยม ฮันเตอร์' : 'กด "เพิ่มภารกิจใหม่" เพื่อเริ่มต้น'}
            </div>
          </div>
        )}

        {filteredQuests.map((quest, idx) => {
          const catCfg = CATEGORY_CONFIG[quest.category] || CATEGORY_CONFIG.daily;
          const isCompleting = completing === quest.id;
          const hasDeadline = !!quest.deadline;

          return (
            <div
              key={quest.id}
              className={`quest-card glass-panel ${quest.completed ? 'completed' : ''} ${isCompleting ? 'completing' : ''}`}
              style={{ animationDelay: `${idx * 0.08}s`, '--cat-color': catCfg.color }}
              draggable={sortBy === 'default' && filter === 'all' && smartFilter === 'all'}
              onDragStart={(e) => handleDragStart(e, quest.id)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, quest.id)}
            >
              {/* Category Tag + Timer Row */}
              <div className="quest-card-top">
                <div className="quest-category" style={{ background: `${catCfg.color}22`, borderColor: `${catCfg.color}55` }}>
                  <span>{catCfg.icon}</span>
                  <span className="text-mono" style={{ color: catCfg.color }}>{catCfg.label}</span>
                </div>

                <div className="quest-card-actions-top">
                  {/* Timer */}
                  {!quest.completed && (
                    hasDeadline
                      ? (
                        <div className="quest-timer-click" onClick={() => setDeadlineModal(quest)} title="แตะเพื่อแก้ไขเวลา">
                          <QuestTimer deadline={quest.deadline} compact />
                        </div>
                      ) : (
                        <button className="quest-timer-btn" onClick={() => setDeadlineModal(quest)} id={`timer-btn-${quest.id}`}>
                          ⏰ ตั้งเวลา
                        </button>
                      )
                  )}

                  {/* Edit icon (only user-created quests) */}
                  {!quest.completed && quest.source === 'user' && (
                    <button
                      className="icon-btn icon-btn-edit"
                      onClick={() => setEditModal(quest)}
                      title="แก้ไขภารกิจ"
                      id={`edit-btn-${quest.id}`}
                      aria-label="แก้ไข"
                    >
                      ✏️
                    </button>
                  )}

                  {/* Delete icon */}
                  <button
                    className="icon-btn icon-btn-delete"
                    onClick={() => setDeleteModal(quest)}
                    title="ลบภารกิจ"
                    id={`delete-btn-${quest.id}`}
                    aria-label="ลบ"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Quest Content */}
              <div className="quest-content">
                <div className="quest-title-row">
                  {quest.priority === 'high' && <span className="priority-badge high">🔴 High</span>}
                  {quest.priority === 'medium' && <span className="priority-badge medium">🟡 Med</span>}
                  {quest.priority === 'low' && <span className="priority-badge low">🔵 Low</span>}
                  <div className={`quest-title ${quest.completed ? 'done' : ''}`}>
                    {quest.completed && <span className="checkmark">✓</span>}
                    {quest.title}
                  </div>
                  {quest.recurrence === 'daily' && <span className="recurrence-icon" title="ทำซ้ำทุกวัน">🔁</span>}
                </div>
                {quest.desc && (
                  <div className="quest-desc text-secondary markdown-content">
                    <ReactMarkdown>{quest.desc}</ReactMarkdown>
                  </div>
                )}
                
                {/* Subtasks */}
                {quest.subtasks && quest.subtasks.length > 0 && (
                  <div className="quest-subtasks-list">
                    {quest.subtasks.map(st => (
                      <div key={st.id} className={`quest-subtask ${st.completed ? 'completed' : ''}`} onClick={() => !quest.completed && handleToggleSubtask(quest.id, st.id)}>
                        <div className="subtask-checkbox">{st.completed ? '✓' : ''}</div>
                        <span className="subtask-text">{st.title}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tags */}
                {quest.tags && quest.tags.length > 0 && (
                  <div className="quest-tags-list">
                    {quest.tags.map(tag => (
                      <span key={tag} className="quest-tag text-mono">#{tag}</span>
                    ))}
                  </div>
                )}

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
                  {quest.source === 'user' && (
                    <span className="user-quest-badge text-mono">📝 ของฉัน</span>
                  )}
                </div>
              </div>

              {/* Complete Button (active only) */}
              {!quest.completed && (
                <button
                  className={`btn btn-success quest-complete-btn ${isCompleting ? 'completing' : ''}`}
                  onClick={() => handleComplete(quest.id)}
                  disabled={!!completing || (quest.subtasks && quest.subtasks.length > 0 && !quest.subtasks.every(st => st.completed))}
                  id={`quest-btn-${quest.id}`}
                >
                  {isCompleting ? (
                    <span className="completing-text">⚡ กำลังรับรางวัล...</span>
                  ) : (
                    <>✅ เสร็จสิ้น</>
                  )}
                </button>
              )}

              {/* Cleared + Undo (completed only) */}
              {quest.completed && (
                <div className="quest-done-row">
                  <div className="quest-done-badge text-mono">⚡ CLEARED</div>
                  <button
                    className="undo-btn text-mono"
                    onClick={() => handleUndo(quest.id)}
                    id={`undo-btn-${quest.id}`}
                    title="ยกเลิก — ทำกลับมาใหม่"
                  >
                    ↩️ Undo
                  </button>
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

      {/* ── Modals ── */}
      {showAddModal && (
        <QuestFormModal
          mode="add"
          onSubmit={handleAddSubmit}
          onClose={() => setShowAddModal(false)}
          isLoading={aiLoading}
        />
      )}

      {editModal && (
        <QuestFormModal
          mode="edit"
          initialData={editModal}
          onSubmit={handleEditSubmit}
          onClose={() => setEditModal(null)}
          isLoading={false}
        />
      )}

      {deleteModal && (
        <DeleteConfirmModal
          questTitle={deleteModal.title}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteModal(null)}
        />
      )}

      {deadlineModal && (
        <DeadlineModal
          quest={deadlineModal}
          onSave={(deadline) => handleSaveDeadline(deadlineModal.id, deadline)}
          onRemove={() => handleRemoveDeadline(deadlineModal.id)}
          onClose={() => setDeadlineModal(null)}
        />
      )}
    </div>
  );
}
