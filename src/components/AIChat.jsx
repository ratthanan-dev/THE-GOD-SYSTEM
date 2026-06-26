import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { callAI, QUICK_PROMPTS, generateMorningBriefing, parseQuestsFromResponse, stripQuestBlocks } from '../services/aiService';
import { buildMemoryContext, extractMemories } from '../services/memoryService';
import ChatHistorySidebar from './ChatHistorySidebar';
import './AIChat.css';

const PROVIDER_LABELS = {
  gemini: { label: 'Gemini', color: '#4285f4', icon: '✦' },
  groq:   { label: 'Groq',   color: '#f55036', icon: '⚡' },
};

// ─────────────────────────────────────────────
// Message Bubble
// ─────────────────────────────────────────────
const STAT_ICON = { str: '⚔️', agi: '⚡', int: '📖', vit: '🛡️', sense: '👁️' };

function MessageBubble({ msg }) {
  const isSystem = msg.role === 'model';
  const provider = msg.provider ? PROVIDER_LABELS[msg.provider] : null;
  const tc = msg.toolCall;

  return (
    <div className={`ai-message ${isSystem ? 'system-msg' : 'user-msg'}`}>
      {isSystem && (
        <div className="system-avatar">
          <span className="system-avatar-icon">⬡</span>
        </div>
      )}
      <div className="message-bubble">
        {isSystem && (
          <div className="system-sender-row">
            <span className="text-mono system-sender">THE SYSTEM</span>
            {msg.isSkillResult && (
              <span className="skill-badge text-mono">⚙ SKILL</span>
            )}
            {provider && (
              <span className="provider-badge text-mono" style={{ color: provider.color }}>
                {provider.icon} {provider.label}
              </span>
            )}
          </div>
        )}
        <div className="message-text">{msg.content}</div>

        {/* ── Quest Cards (create_quest) ── */}
        {msg.quests && msg.quests.length > 0 && (
          <div className="ai-quest-cards">
            {msg.quests.map((q, idx) => (
              <div key={idx} className="ai-quest-card">
                <div className="ai-quest-card-header">
                  <span className="ai-quest-icon">📜</span>
                  <span className="ai-quest-title">{q.title}</span>
                  {q.priority && q.priority !== 'low' && (
                    <span className="ai-quest-priority" data-priority={q.priority}>
                      {q.priority === 'high' ? '🔴' : '🟡'}
                    </span>
                  )}
                </div>
                {q.desc && <div className="ai-quest-desc">{q.desc}</div>}
                {q.subtasks && q.subtasks.length > 0 && (
                  <div className="ai-quest-subtasks text-mono">
                    {q.subtasks.map((st, si) => (
                      <div key={si} className="ai-subtask-item">▸ {st.title}</div>
                    ))}
                  </div>
                )}
                <div className="ai-quest-rewards text-mono">
                  <span className="reward-exp">+{q.exp} EXP</span>
                  <span className="reward-stat">+{q.statGain} {q.stat?.toUpperCase()}</span>
                  {q.recurrence === 'daily' && <span className="ai-quest-recur">🔁 daily</span>}
                </div>
              </div>
            ))}
            <div className="ai-quest-added-notice text-mono">✓ เพิ่มลงใน Quest Log แล้ว</div>
          </div>
        )}

        {/* ── Stat Analysis Card (analyze_stats) ── */}
        {tc?.skillName === 'analyze_stats' && tc.result?.report && (() => {
          const r = tc.result.report;
          return (
            <div className="ai-stat-report">
              {r.summary && <div className="ai-report-summary text-mono">{r.summary}</div>}
              <div className="ai-report-grid">
                {r.strengths?.length > 0 && (
                  <div className="ai-report-section">
                    <div className="ai-report-section-title text-mono">▲ จุดแข็ง</div>
                    {r.strengths.map((s, i) => (
                      <div key={i} className="ai-report-item ai-report-strong">
                        <span>{STAT_ICON[s.stat] || '⬆️'}</span>
                        <span className="text-mono">{s.label}</span>
                        <span className="ai-report-note">{s.note}</span>
                      </div>
                    ))}
                  </div>
                )}
                {r.weaknesses?.length > 0 && (
                  <div className="ai-report-section">
                    <div className="ai-report-section-title text-mono">▼ จุดอ่อน</div>
                    {r.weaknesses.map((w, i) => (
                      <div key={i} className="ai-report-item ai-report-weak">
                        <span>{STAT_ICON[w.stat] || '⬇️'}</span>
                        <span className="text-mono">{w.label}</span>
                        <span className="ai-report-note">{w.note}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {r.recommendations?.length > 0 && (
                <div className="ai-report-recs">
                  <div className="ai-report-section-title text-mono">▸ คำแนะนำ</div>
                  {r.recommendations.map((rec, i) => (
                    <div key={i} className="ai-rec-item text-mono">◆ {rec}</div>
                  ))}
                </div>
              )}
              {r.rank_progress && (
                <div className="ai-rank-progress text-mono">{r.rank_progress}</div>
              )}
            </div>
          );
        })()}

        {/* ── Penalty Card (apply_penalty) ── */}
        {tc?.skillName === 'apply_penalty' && tc.result && (
          <div className="ai-penalty-card text-mono">
            <div className="ai-penalty-header">⚠️ [ {tc.result.crime} ]</div>
            <div className="ai-penalty-reason">{tc.result.reason}</div>
            <div className="ai-penalty-stats">
              <span className="ai-penalty-exp">-{tc.result.expPenalty} EXP</span>
              <span className="ai-penalty-hp">-{tc.result.hpPenalty} HP</span>
            </div>
          </div>
        )}

        {/* ── Restore HP Card (restore_hp) ── */}
        {tc?.skillName === 'restore_hp' && tc.result && (
          <div className="ai-restore-card text-mono">
            <div className="ai-restore-header">❖ [ {tc.result.activity} ]</div>
            <div className="ai-restore-reason">{tc.result.reason}</div>
            <div className="ai-restore-amount">+{tc.result.amount} HP ฟื้นคืนแล้ว</div>
          </div>
        )}

        <div className="message-time text-mono">
          {new Date(msg.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────
// No Config State
// ─────────────────────────────────────────────
function NoApiKey() {
  const { dispatch } = useGame();
  return (
    <div className="ai-no-key">
      <div className="no-key-icon">🔑</div>
      <div className="no-key-title text-display">ต้องการ API Key</div>
      <div className="no-key-desc text-mono">
        ตั้งค่า Gemini หรือ Groq API Key<br />
        เพื่อเปิดใช้งาน THE SYSTEM
      </div>
      <div className="no-key-steps text-mono">
        <div>Gemini → aistudio.google.com/apikey</div>
        <div>Groq → console.groq.com/keys</div>
      </div>
      <button
        className="btn btn-primary"
        onClick={() => dispatch({ type: 'SET_TAB', tab: 'settings' })}
        id="go-settings-btn"
      >
        ⚙️ ไปที่ Settings
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main AIChat Component
// ─────────────────────────────────────────────
export default function AIChat() {
  const { state, dispatch, computed } = useGame();
  const { aiMessages, aiConfig, hunter, quests, chatSessions, activeChatSessionId } = state;
  const config = aiConfig || { geminiKeys: [], groqKeys: [], preferredProvider: 'auto' };

  const totalKeys = (config.geminiKeys?.filter(k => k?.trim()).length || 0)
    + (config.groqKeys?.filter(k => k?.trim()).length || 0);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState(null);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef(null);

  // Active session info
  const activeSession = (chatSessions || []).find(s => s.id === activeChatSessionId);
  const sessionTitle = activeSession?.title || 'การสนทนาใหม่';

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, isLoading]);

  // Welcome message on first open
  useEffect(() => {
    if (totalKeys > 0 && aiMessages.length === 0) {
      const geminiCount = config.geminiKeys?.filter(k => k?.trim()).length || 0;
      const groqCount = config.groqKeys?.filter(k => k?.trim()).length || 0;
      const welcome = {
        id: Date.now(),
        role: 'model',
        content: `[ SYSTEM BOOT COMPLETE ]

ตรวจพบฮันเตอร์: ${hunter.name}
Level ${hunter.level} | Rank ${hunter.rank} | ${hunter.jobTitle}

[ API STATUS ]
◆ Gemini: ${geminiCount} key${geminiCount !== 1 ? 's' : ''} ${geminiCount > 0 ? '✓ ONLINE' : '✗ OFFLINE'}
◆ Groq: ${groqCount} key${groqCount !== 1 ? 's' : ''} ${groqCount > 0 ? '✓ ONLINE' : '✗ OFFLINE'}
◆ Mode: ${config.preferredProvider === 'auto' ? 'AUTO (fallback enabled)' : config.preferredProvider.toUpperCase()}

ระบบออนไลน์ — พร้อมรับคำสั่ง`,
        timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_AI_MESSAGE', message: welcome });
    }
  }, [totalKeys, activeChatSessionId]);

  // \u2190 NEW: Morning Briefing \u2014 \u0e40\u0e14\u0e49\u0e07\u0e2a\u0e23\u0e38\u0e1b\u0e15\u0e2d\u0e19\u0e40\u0e0a\u0e49\u0e32\u0e15\u0e32\u0e21\u0e40\u0e27\u0e25\u0e32\u0e17\u0e35\u0e48\u0e15\u0e31\u0e49\u0e07\u0e44\u0e27\u0e49\n  useEffect(() => {\n    if (totalKeys === 0) return;\n    if (!state.initialized) return;\n\n    const briefingHour = state.settings?.morningBriefingHour ?? 8;\n    const now = new Date();\n    const todayKey = now.toDateString();\n\n    // \u0e04\u0e27\u0e23\u0e2a\u0e48\u0e07\u0e16\u0e49\u0e32:\n    // 1. \u0e16\u0e36\u0e07\u0e40\u0e27\u0e25\u0e32\u0e17\u0e35\u0e48\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e2b\u0e23\u0e37\u0e2d\u0e40\u0e25\u0e22\u0e1c\u0e48\u0e32\u0e19\u0e44\u0e1b\u0e41\u0e25\u0e49\u0e27\n    // 2. \u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e40\u0e04\u0e22\u0e2a\u0e48\u0e07\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49\n    if (now.getHours() >= briefingHour && state.lastBriefingDate !== todayKey) {\n      const generate = async () => {\n        try {\n          const briefingText = await generateMorningBriefing({\n            aiConfig: config,\n            hunterData: { hunter, quests, computed },\n            activityLog: state.activityLog || [],\n            goals: state.settings?.goals || [],\n          });\n          if (briefingText) {\n            dispatch({\n              type: 'ADD_AI_MESSAGE',\n              message: {\n                id: Date.now(),\n                role: 'model',\n                content: `\ud83c\udf05 [ MORNING BRIEFING ]\n\n${briefingText}`,\n                timestamp: Date.now(),\n                isBriefing: true,\n              },\n            });\n            dispatch({ type: 'MORNING_BRIEFING_SENT', date: todayKey });\n          }\n        } catch (err) {\n          console.error('Morning briefing failed:', err);\n        }\n      };\n      generate();\n    }\n  }, [state.initialized, totalKeys, state.lastBriefingDate, state.settings?.morningBriefingHour]);

  const sendMessage = async (text) => {
    if (!text.trim() || isLoading) return;
    setError('');
    setActiveProvider(null);

    const userMsg = { id: Date.now(), role: 'user', content: text.trim(), timestamp: Date.now() };
    dispatch({ type: 'ADD_AI_MESSAGE', message: userMsg });
    setInput('');
    setIsLoading(true);

    const historyMessages = [...aiMessages, userMsg]
      .filter(m => !m.content.startsWith('[ SYSTEM BOOT'))
      .map(m => ({ role: m.role, content: m.content }));

    const apiMessages = historyMessages.length > 0
      ? historyMessages
      : [{ role: 'user', content: text.trim() }];

    try {
      // ดึง Memory Context แปะใน System Prompt
      const memoryContext = buildMemoryContext();

      // ส่ง dispatch เข้าไปด้วย เพื่อให้ Skill execute() สามารถ dispatch action ได้โดยตรง
      const result = await callAI({
        aiConfig: config,
        messages: apiMessages,
        hunterData: {
          hunter, quests, computed,
          activityLog: state.activityLog || [],  // ← NEW
          goals: state.settings?.goals || [],     // ← NEW
        },
        dispatch,
        memoryContext,
      });

      setActiveProvider(result.provider);

      let systemMsg;
      if (result.toolCall) {
        // ── กรณี AI เรียกใช้ Skill (Function Call) ──
        const { skillName, result: skillResult } = result.toolCall;
        const createdQuests = skillResult?.quests || [];
        systemMsg = {
          id: Date.now() + 1,
          role: 'model',
          content: `[ SKILL ACTIVATED: ${skillName.toUpperCase()} ]`,
          provider: result.provider,
          timestamp: Date.now(),
          quests: createdQuests,
          isSkillResult: true,
          toolCall: result.toolCall,   // เก็บ toolCall ไว้เพื่อให้ MessageBubble แสดงผล
        };
      } else {
        // ── กรณีตอบแบบข้อความปกติ ──
        systemMsg = {
          id: Date.now() + 1,
          role: 'model',
          content: result.text,
          provider: result.provider,
          timestamp: Date.now(),
          quests: [],
        };
      }

      dispatch({ type: 'ADD_AI_MESSAGE', message: systemMsg });

      // สกัดความทรงจำเบื้องหลัง (ไม่บล็อค UI)
      const allMsgs = [...aiMessages, userMsg, systemMsg];
      extractMemories(allMsgs, config, activeChatSessionId).catch(() => {});
    } catch (err) {
      const errorMessages = {
        NO_API_KEY: 'ไม่พบ API Key — ตั้งค่าใน Settings',
        INVALID_KEY: 'API Key ไม่ถูกต้อง — ตรวจสอบใน Settings',
        RATE_LIMIT: 'ถึง rate limit ทุก key แล้ว — รอสักครู่',
        ALL_PROVIDERS_FAILED: 'ทุก provider ล้มเหลว — ตรวจสอบ keys ใน Settings',
        EMPTY_RESPONSE: 'ไม่มีคำตอบ — ลองใหม่อีกครั้ง',
      };
      setError(errorMessages[err.message] || `Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };


  const handleSubmit = (e) => { e.preventDefault(); sendMessage(input); };
  const handleQuickAction = (prompt) => { sendMessage(prompt); if (navigator.vibrate) navigator.vibrate(30); };

  const handleNewChat = () => {
    dispatch({ type: 'CREATE_CHAT_SESSION' });
    if (navigator.vibrate) navigator.vibrate(20);
  };

  if (totalKeys === 0) return <NoApiKey />;

  const geminiCount = config.geminiKeys?.filter(k => k?.trim()).length || 0;
  const groqCount = config.groqKeys?.filter(k => k?.trim()).length || 0;

  return (
    <>
      <ChatHistorySidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="ai-chat">
        {/* ── Terminal Header ── */}
        <div className="ai-header glass-panel corner-tl corner-tr">
          <div className="ai-header-left">
            {/* History Toggle */}
            <button
              className="ai-history-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="ประวัติการแชท"
              id="open-history-btn"
            >
              <span className="history-btn-bars">
                <span /><span /><span />
              </span>
            </button>

            <div>
              <div className="ai-title text-display">THE SYSTEM</div>
              <div className="ai-session-title text-mono">{sessionTitle}</div>
            </div>
          </div>

          <div className="ai-header-actions">
            {/* New Chat */}
            <button
              className="ai-new-chat-btn text-mono"
              onClick={handleNewChat}
              title="สร้างการสนทนาใหม่"
              id="new-chat-header-btn"
            >
              ＋
            </button>
            {/* Clear current */}
            <button
              className="ai-clear-btn text-mono"
              onClick={() => dispatch({ type: 'CLEAR_AI_CHAT' })}
              title="ล้างการสนทนานี้"
              id="clear-chat-btn"
            >
              🗑
            </button>
          </div>
        </div>

        {/* ── Status Bar ── */}
        <div className="ai-status-bar text-mono">
          <div className="ai-status-dot" />
          <span>
            {geminiCount > 0 && `✦ Gemini ×${geminiCount}`}
            {geminiCount > 0 && groqCount > 0 && ' · '}
            {groqCount > 0 && `⚡ Groq ×${groqCount}`}
            {' · '}
            {config.preferredProvider === 'auto' ? 'AUTO' : config.preferredProvider.toUpperCase()}
          </span>
          <span className="ai-session-count">
            {(chatSessions || []).length} sessions
          </span>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          {QUICK_PROMPTS.map(qp => (
            <button
              key={qp.id}
              className="quick-action-btn text-mono"
              onClick={() => handleQuickAction(qp.prompt)}
              disabled={isLoading}
              id={`quick-${qp.id}`}
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="ai-messages">
          {aiMessages.length === 0 && !isLoading && (
            <div className="ai-empty-state">
              <div className="ai-empty-icon">⬡</div>
              <div className="ai-empty-text text-mono">THE SYSTEM พร้อมรับคำสั่ง</div>
              <div className="ai-empty-sub text-mono">พิมพ์คำถาม หรือเลือกคำสั่งด่วนด้านบน</div>
            </div>
          )}

          {aiMessages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}

          {isLoading && (
            <div className="ai-message system-msg">
              <div className="system-avatar"><span className="system-avatar-icon">⬡</span></div>
              <div className="message-bubble">
                <div className="system-sender-row">
                  <span className="text-mono system-sender">THE SYSTEM</span>
                  <span className="text-mono" style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>กำลังประมวลผล...</span>
                </div>
                <div className="typing-dots"><span /><span /><span /></div>
              </div>
            </div>
          )}

          {error && <div className="ai-error text-mono">⚠️ {error}</div>}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form className="ai-input-area" onSubmit={handleSubmit}>
          <div className="ai-input-row">
            <input
              type="text"
              className="ai-input text-mono"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="พิมพ์คำถาม..."
              disabled={isLoading}
              id="ai-chat-input"
              autoComplete="off"
            />
            <button type="submit" className={`ai-send-btn ${isLoading ? 'loading' : ''}`} disabled={!input.trim() || isLoading} id="ai-send-btn">
              {isLoading ? <span className="send-spinner" /> : <span>⚡</span>}
            </button>
          </div>
          <div className="ai-input-hint text-mono">
            {isLoading ? 'กำลังประมวลผล...' : `${hunter.name} | LV.${hunter.level} ${hunter.rank}-CLASS · ${totalKeys} keys พร้อมใช้`}
          </div>
        </form>
      </div>
    </>
  );
}
