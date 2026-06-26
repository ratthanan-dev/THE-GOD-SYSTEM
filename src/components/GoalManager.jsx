import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import './GoalManager.css';

const STATUS_CYCLE = { pending: 'in_progress', in_progress: 'completed', completed: 'pending' };
const STATUS_ICON  = { pending: '⏳', in_progress: '🔄', completed: '✅' };
const STATUS_LABEL = { pending: 'รอดำเนินการ', in_progress: 'กำลังทำ', completed: 'สำเร็จ' };

export default function GoalManager() {
  const { state, dispatch } = useGame();
  const goals = state.settings?.goals || [];

  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDesc, setNewGoalDesc] = useState('');
  const [expandedGoalId, setExpandedGoalId] = useState(null);
  const [newSubGoalTexts, setNewSubGoalTexts] = useState({}); // goalId → text

  const handleAddGoal = () => {
    const title = newGoalTitle.trim();
    if (!title) return;
    dispatch({ type: 'ADD_GOAL', title, description: newGoalDesc.trim() });
    setNewGoalTitle('');
    setNewGoalDesc('');
  };

  const handleAddSubGoal = (goalId) => {
    const title = (newSubGoalTexts[goalId] || '').trim();
    if (!title) return;
    dispatch({ type: 'ADD_SUBGOAL', goalId, title });
    setNewSubGoalTexts(prev => ({ ...prev, [goalId]: '' }));
  };

  const handleCycleSubGoal = (goalId, subGoalId, currentStatus) => {
    const nextStatus = STATUS_CYCLE[currentStatus] || 'pending';
    dispatch({ type: 'UPDATE_SUBGOAL_STATUS', goalId, subGoalId, status: nextStatus });
  };

  const handleDeleteGoal = (goalId) => {
    if (window.confirm('ลบเป้าหมายนี้? จะไม่สามารถกู้คืนได้')) {
      dispatch({ type: 'DELETE_GOAL', goalId });
    }
  };

  const handleDeleteSubGoal = (goalId, subGoalId) => {
    dispatch({ type: 'DELETE_SUBGOAL', goalId, subGoalId });
  };

  const getProgress = (goal) => {
    const total = (goal.subGoals || []).length;
    if (total === 0) return 0;
    const done = (goal.subGoals || []).filter(sg => sg.status === 'completed').length;
    return Math.round((done / total) * 100);
  };

  return (
    <div className="goal-manager">
      <div className="goal-manager-header">
        <div className="goal-manager-title text-display">🎯 เป้าหมายระยะยาว</div>
        <div className="goal-manager-subtitle text-secondary">
          THE SYSTEM จะนำข้อมูลนี้ไปสร้างเควสต์และให้คำแนะนำที่เหมาะกับคุณ
        </div>
      </div>

      {/* Goal List */}
      {goals.length === 0 ? (
        <div className="goal-empty text-mono">
          ยังไม่มีเป้าหมาย — เพิ่มเป้าหมายแรกเพื่อให้ THE SYSTEM ช่วยวางแผน
        </div>
      ) : (
        <div className="goal-list">
          {goals.map(goal => {
            const progress = getProgress(goal);
            const isExpanded = expandedGoalId === goal.id;
            const inProgressCount = (goal.subGoals || []).filter(sg => sg.status === 'in_progress').length;
            const completedCount = (goal.subGoals || []).filter(sg => sg.status === 'completed').length;

            return (
              <div key={goal.id} className={`goal-card glass-panel ${goal.status === 'completed' ? 'goal-done' : ''}`}>
                {/* Goal Header */}
                <div className="goal-card-header" onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}>
                  <div className="goal-card-info">
                    <div className="goal-card-title text-display">{goal.title}</div>
                    <div className="goal-card-meta text-mono">
                      <span className="goal-meta-badge" style={{ color: '#00ff88' }}>{completedCount}/{(goal.subGoals || []).length} เสร็จ</span>
                      {inProgressCount > 0 && <span className="goal-meta-badge" style={{ color: '#ffd700' }}>🔄 {inProgressCount} กำลังทำ</span>}
                    </div>
                  </div>
                  <div className="goal-card-right">
                    <div className="goal-progress-ring">
                      <svg width="44" height="44" viewBox="0 0 44 44">
                        <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4"/>
                        <circle
                          cx="22" cy="22" r="18"
                          fill="none"
                          stroke={progress === 100 ? '#00ff88' : '#a78bfa'}
                          strokeWidth="4"
                          strokeDasharray={`${(progress / 100) * 113} 113`}
                          strokeLinecap="round"
                          transform="rotate(-90 22 22)"
                          style={{ transition: 'stroke-dasharray 0.5s ease' }}
                        />
                        <text x="22" y="27" textAnchor="middle" className="text-mono" style={{ fontSize: '9px', fill: 'white' }}>{progress}%</text>
                      </svg>
                    </div>
                    <button
                      className="goal-delete-btn"
                      onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal.id); }}
                      title="ลบเป้าหมาย"
                    >✕</button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="goal-progress-bar">
                  <div
                    className="goal-progress-fill"
                    style={{ width: `${progress}%`, background: progress === 100 ? '#00ff88' : 'linear-gradient(90deg, #a78bfa, #7c3aed)' }}
                  />
                </div>

                {/* Sub-Goals (Expanded) */}
                {isExpanded && (
                  <div className="goal-subgoals">
                    {(goal.subGoals || []).map(sg => (
                      <div key={sg.id} className={`subgoal-item ${sg.status}`}>
                        <button
                          className="subgoal-status-btn text-mono"
                          onClick={() => handleCycleSubGoal(goal.id, sg.id, sg.status)}
                          title={`สถานะ: ${STATUS_LABEL[sg.status]} — กดเพื่อเปลี่ยน`}
                        >
                          {STATUS_ICON[sg.status]}
                        </button>
                        <span className={`subgoal-title text-mono ${sg.status === 'completed' ? 'subgoal-done' : ''}`}>
                          {sg.title}
                        </span>
                        <button
                          className="subgoal-delete-btn"
                          onClick={() => handleDeleteSubGoal(goal.id, sg.id)}
                          title="ลบขั้นตอนนี้"
                        >✕</button>
                      </div>
                    ))}

                    {/* Add Sub-Goal */}
                    <div className="subgoal-add-row">
                      <input
                        type="text"
                        className="system-input subgoal-input"
                        placeholder="เพิ่มขั้นตอน... (เช่น Learn React, Build Portfolio)"
                        value={newSubGoalTexts[goal.id] || ''}
                        onChange={e => setNewSubGoalTexts(prev => ({ ...prev, [goal.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleAddSubGoal(goal.id)}
                      />
                      <button
                        className="btn btn-primary subgoal-add-btn"
                        onClick={() => handleAddSubGoal(goal.id)}
                        disabled={!(newSubGoalTexts[goal.id] || '').trim()}
                      >+ เพิ่ม</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Goal */}
      <div className="goal-add-section glass-panel-light">
        <div className="goal-add-title text-mono" style={{ color: 'var(--neon-primary)', marginBottom: '0.5rem' }}>
          + เพิ่มเป้าหมายใหม่
        </div>
        <input
          type="text"
          className="system-input"
          placeholder="เป้าหมายหลัก... (เช่น Become Full Stack Developer)"
          value={newGoalTitle}
          onChange={e => setNewGoalTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddGoal()}
          id="new-goal-title-input"
          style={{ marginBottom: '0.5rem' }}
        />
        <input
          type="text"
          className="system-input"
          placeholder="คำอธิบายเพิ่มเติม (ไม่บังคับ)"
          value={newGoalDesc}
          onChange={e => setNewGoalDesc(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddGoal()}
          style={{ marginBottom: '0.5rem' }}
        />
        <button
          className="btn btn-primary w-full"
          onClick={handleAddGoal}
          disabled={!newGoalTitle.trim()}
          id="add-goal-btn"
        >
          🎯 เพิ่มเป้าหมาย
        </button>
      </div>
    </div>
  );
}
