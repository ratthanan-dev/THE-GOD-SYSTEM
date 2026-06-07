import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase';

// ============================================
// DATA MODELS
// ============================================

const RANKS = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
const RANK_MIN_LEVELS = { E: 1, D: 10, C: 20, B: 35, A: 50, S: 70, SS: 85, SSS: 100 };
const JOB_TITLES = {
  E: 'ฮันเตอร์มือใหม่',
  D: 'นักสำรวจ',
  C: 'มิสทิก',
  B: 'อัศวิน',
  A: 'วิซาร์ด',
  S: 'ฮันเตอร์ระดับชาติ',
  SS: 'นักล่าระดับเทพ',
  SSS: 'มอนาร์ค',
};

function getLevelFromExp(exp) {
  let level = 1;
  let totalRequired = 0;
  while (true) {
    const required = level * 100;
    if (exp < totalRequired + required) break;
    totalRequired += required;
    level++;
    if (level >= 100) break;
  }
  return level;
}

function getExpForLevel(level) {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += i * 100;
  }
  return total;
}

function getExpToNextLevel(level) {
  return level * 100;
}

function getRankForLevel(level) {
  let rank = 'E';
  for (const [r, minLevel] of Object.entries(RANK_MIN_LEVELS)) {
    if (level >= minLevel) rank = r;
  }
  return rank;
}

// ============================================
// GAME DAY HELPER
// A "game day" starts at resetHour (e.g. 4 AM)
// So 00:00–03:59 still counts as the previous day.
// ============================================
export function getGameDay(resetHour = 4) {
  const now = new Date();
  if (now.getHours() < resetHour) {
    // Still the previous game-day — subtract one day
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 1);
    return prev.toDateString();
  }
  return now.toDateString();
}

// ============================================
// QUEST TEMPLATES
// ============================================

const QUEST_TEMPLATES = {
  fitness: [
    { title: 'ซิทอัพ 50 ครั้ง', desc: 'ฝึกกล้ามเนื้อแกน — แสดงพลังของ S-Class!', exp: 80, stat: 'str', statGain: 2 },
    { title: 'วิ่ง 30 นาที', desc: 'เพิ่มความทรหดของร่างกาย — ไม่มีฮันเตอร์คนไหนออกแบบมาเพื่อนั่งอยู่กับที่', exp: 120, stat: 'agi', statGain: 2 },
    { title: 'วิดพื้น 30 ครั้ง', desc: 'กล้ามเนื้อหน้าอกและแขน — สร้างร่างกายระดับราชา', exp: 70, stat: 'str', statGain: 1 },
    { title: 'ยืดกล้ามเนื้อ 10 นาที', desc: 'ฟื้นฟูร่างกายหลังภารกิจ', exp: 40, stat: 'vit', statGain: 1 },
    { title: 'สควอท 50 ครั้ง', desc: 'ขาที่แข็งแกร่งคือรากฐานของฮันเตอร์', exp: 90, stat: 'str', statGain: 2 },
    { title: 'เดิน 10,000 ก้าว', desc: 'การเคลื่อนไหวต่อเนื่องสร้างความทนทาน', exp: 100, stat: 'agi', statGain: 1 },
  ],
  study: [
    { title: 'ศึกษาโปรแกรม 1 ชั่วโมง', desc: 'ความรู้คืออาวุธที่ทรงพลังที่สุด', exp: 100, stat: 'int', statGain: 2 },
    { title: 'อ่านหนังสือ 30 หน้า', desc: 'ขยายขอบเขตความรู้ของผู้ล่า', exp: 80, stat: 'int', statGain: 1 },
    { title: 'ฝึกภาษาต่างประเทศ 20 นาที', desc: 'นักล่าที่ดีสื่อสารได้ทุกภาษา', exp: 60, stat: 'sense', statGain: 1 },
    { title: 'เรียนคอร์สออนไลน์ 1 บท', desc: 'ยกระดับทักษะด้านวิชาชีพ', exp: 110, stat: 'int', statGain: 2 },
  ],
  mindset: [
    { title: 'นั่งสมาธิ 10 นาที', desc: 'จิตใจที่สงบคือพลังของผู้ปกครอง', exp: 50, stat: 'sense', statGain: 2 },
    { title: 'เขียน Journal ประจำวัน', desc: 'บันทึกการเดินทางของผู้ล่า', exp: 60, stat: 'int', statGain: 1 },
    { title: 'กำหนดเป้าหมาย 3 ข้อ', desc: 'ฮันเตอร์ที่ยิ่งใหญ่วางแผนก่อนออกรบ', exp: 40, stat: 'sense', statGain: 1 },
  ],
  daily: [
    { title: 'นอนหลับ 7-8 ชั่วโมง', desc: 'การพักผ่อนคือการชาร์จพลัง', exp: 70, stat: 'vit', statGain: 2 },
    { title: 'ดื่มน้ำ 8 แก้ว', desc: 'ร่างกายที่ชุ่มชื้นคือร่างกายที่พร้อมรบ', exp: 30, stat: 'vit', statGain: 1 },
    { title: 'ไม่ใช้โทรศัพท์ 1 ชั่วโมง', desc: 'สมาธิของผู้ล่าคือทรัพย์สินที่มีค่า', exp: 60, stat: 'sense', statGain: 2 },
    { title: 'อาบน้ำให้เสร็จก่อนเที่ยงคืน', desc: 'ชำระล้างร่างกายเพื่อรับพรแห่งการฟื้นฟู', exp: 100, stat: 'vit', statGain: 2 },
  ],
  creative: [
    { title: 'วาดภาพหรือหัดฝีมือ 1 ชิ้น', desc: 'ปลายปล่อยความคิดสร้างสรรค์ลงบนกระดาษ ไม่ต้องเก่งก็อนุญาตสร้าง', exp: 70, stat: 'sense', statGain: 2 },
    { title: 'เขียนเรื่องสั้น กลอน หรือไอเดีย 1 ชิ้น', desc: 'ถ่ายทอดความคิดสร้างสรรค์ลงเป็นการเขียน', exp: 80, stat: 'int', statGain: 2 },
    { title: 'เรียนทักษะใหม่ 1 อย่าง (YouTube/Tutorial)', desc: 'รับสิ่งใหม่เข้าเสมอ ความคิดสร้างสรรค์ต้องการอาหารใหม่', exp: 90, stat: 'int', statGain: 2 },
    { title: 'ถ่ายภาพสวยๆ 5 รูป', desc: 'เปิดตามองโลกด้วยสายตาของศิลปิน', exp: 50, stat: 'sense', statGain: 2 },
    { title: 'ทำ DIY หรืองานฝีมือสักอย่าง', desc: 'ใช้มือเป็นเครื่องมือแห่งการสร้างสรรค์', exp: 100, stat: 'str', statGain: 1 },
    { title: 'ฟังเพลงแนวใหม่ 3 เพลง', desc: 'เปิดหูให้กว้างและรับแรงบันดาลใจจากอารมณ์เสียง', exp: 40, stat: 'sense', statGain: 1 },
  ],
};

// ============================================
// INITIAL STATE
// ============================================

function createDefaultSession() {
  const id = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  return {
    id,
    title: 'การสนทนาใหม่',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function createInitialState() {
  const defaultSession = createDefaultSession();
  return {
    hunter: {
      name: 'ฮันเตอร์ไม่ระบุชื่อ',
      totalExp: 0,
      level: 1,
      rank: 'E',
      jobTitle: JOB_TITLES['E'],
      hp: 100,
      maxHp: 100,
      stats: { str: 10, agi: 10, int: 10, vit: 10, sense: 10 },
    },
    quests: [],
    lastLoginDate: null,
    notifications: [],
    showLevelUp: false,
    levelUpData: null,
    showPenalty: false,
    penaltyData: null,
    activeTab: 'status',
    settings: {
      hunterName: '',
      goals: [],
      dayResetHour: 4,
    },
    aiMessages: [],
    chatSessions: [defaultSession],
    activeChatSessionId: defaultSession.id,
    initialized: false,
  };
}

// ============================================
// QUEST GENERATOR
// ============================================

function generateDailyQuests(goals = []) {
  const selected = [];
  const categories = Object.keys(QUEST_TEMPLATES);
  categories.forEach(cat => {
    const catTemplates = QUEST_TEMPLATES[cat];
    const idx = Math.floor(Math.random() * catTemplates.length);
    const template = catTemplates[idx];
    
    let deadline = null;
    if (template.title === 'อาบน้ำให้เสร็จก่อนเที่ยงคืน') {
      const today = new Date();
      deadline = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 0).toISOString();
    }

    selected.push({
      ...template,
      id: `quest_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      category: cat,
      completed: false,
      type: 'daily',
      deadline,
    });
  });
  return selected;
}

// ============================================
// REDUCER
// ============================================

function gameReducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE': {
      const payload = { ...action.payload };
      const hasShowerQuest = (payload.quests || []).some(q => q.title.includes('อาบน้ำ'));
      if (!hasShowerQuest) {
        const today = new Date();
        const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 0);
        const showerQuest = {
          id: `quest_shower_${Date.now()}`,
          title: 'อาบน้ำให้เสร็จก่อนเที่ยงคืน',
          desc: 'ชำระล้างร่างกายเพื่อรับพรแห่งการฟื้นฟู',
          exp: 100,
          stat: 'vit',
          statGain: 2,
          category: 'daily',
          completed: false,
          type: 'daily',
          deadline: midnight.toISOString()
        };
        payload.quests = [showerQuest, ...(payload.quests || [])];
      }
      return {
        ...state,          // ← base: preserve all existing fields (aiMessages, activeTab, etc.)
        ...payload,        // ← override with Firestore data
        notifications: [],
        showLevelUp: false,
        showPenalty: false,
        aiMessages: state.aiMessages || [],  // never wipe AI chat
        aiConfig: state.aiConfig,            // always keep local AI config
        activeTab: payload.activeTab || state.activeTab || 'status',
        settings: {
          ...state.settings,
          ...(payload.settings || {}),
        },
      };
    }


    case 'SET_HUNTER_NAME':
      return {
        ...state,
        hunter: { ...state.hunter, name: action.name },
        settings: { ...state.settings, hunterName: action.name },
        initialized: true,
      };

    case 'COMPLETE_QUEST': {
      const quest = state.quests.find(q => q.id === action.questId);
      if (!quest || quest.completed) return state;

      const newQuests = state.quests.map(q =>
        q.id === action.questId ? { ...q, completed: true } : q
      );

      const expGained = quest.exp;
      const newTotalExp = state.hunter.totalExp + expGained;
      const newLevel = getLevelFromExp(newTotalExp);
      const oldLevel = state.hunter.level;
      const newRank = getRankForLevel(newLevel);
      const leveledUp = newLevel > oldLevel;

      const newStats = { ...state.hunter.stats };
      if (quest.stat && quest.statGain) {
        newStats[quest.stat] = (newStats[quest.stat] || 0) + quest.statGain;
      }

      const notification = {
        id: Date.now(),
        type: 'exp_gain',
        message: `+${expGained} EXP — ${quest.title}`,
        exp: expGained,
      };

      return {
        ...state,
        quests: newQuests,
        hunter: {
          ...state.hunter,
          totalExp: newTotalExp,
          level: newLevel,
          rank: newRank,
          jobTitle: JOB_TITLES[newRank] || state.hunter.jobTitle,
          stats: newStats,
        },
        showLevelUp: leveledUp,
        levelUpData: leveledUp ? { newLevel, newRank, oldLevel } : state.levelUpData,
        notifications: [...state.notifications, notification],
      };
    }

    case 'DAILY_RESET': {
      const newDailyQuests = generateDailyQuests();
      const carryOverQuests = state.quests.filter(q => {
        if (q.source !== 'user') return false;
        if (q.completed) return false;
        if (!q.deadline) return false;
        return new Date(q.deadline) >= new Date();
      });
      
      const newQuests = [...newDailyQuests, ...carryOverQuests];
      const notification = {
        id: Date.now(),
        type: 'system',
        message: '🚨 [เควสต์รายวันใหม่มาถึงแล้ว] — เตรียมพร้อมสำหรับภารกิจ!',
      };
      const resetHour = state.settings?.dayResetHour ?? 4;
      return {
        ...state,
        quests: newQuests,
        lastLoginDate: getGameDay(resetHour),
        notifications: [...state.notifications, notification],
      };
    }

    case 'APPLY_PENALTY': {
      const { expPenalty, hpPenalty, reason } = action;
      const newTotalExp = Math.max(0, state.hunter.totalExp - expPenalty);
      const newHp = Math.max(1, state.hunter.hp - hpPenalty);
      const newLevel = getLevelFromExp(newTotalExp);
      const newRank = getRankForLevel(newLevel);

      return {
        ...state,
        hunter: {
          ...state.hunter,
          totalExp: newTotalExp,
          level: newLevel,
          rank: newRank,
          hp: newHp,
        },
        showPenalty: true,
        penaltyData: { expPenalty, hpPenalty, reason },
      };
    }

    case 'DISMISS_LEVEL_UP':
      return { ...state, showLevelUp: false };

    case 'DISMISS_PENALTY':
      return { ...state, showPenalty: false };

    case 'SET_TAB':
      return { ...state, activeTab: action.tab };

    case 'CLEAR_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.id),
      };

    case 'RESTORE_HP': {
      const restoredHp = Math.min(state.hunter.maxHp, state.hunter.hp + action.amount);
      return {
        ...state,
        hunter: { ...state.hunter, hp: restoredHp },
      };
    }

    case 'SET_QUEST_DEADLINE': {
      const newQuests = state.quests.map(q =>
        q.id === action.questId ? { ...q, deadline: action.deadline } : q
      );
      return { ...state, quests: newQuests };
    }

    case 'REMOVE_QUEST_DEADLINE': {
      const newQuests = state.quests.map(q =>
        q.id === action.questId ? { ...q, deadline: null } : q
      );
      return { ...state, quests: newQuests };
    }

    case 'RESET_DATA':
      return { ...createInitialState(), initialized: false };

    case 'UPDATE_SETTINGS': {
      return {
        ...state,
        settings: { ...state.settings, ...action.patch },
      };
    }

    case 'SET_INITIALIZED':
      return { ...state, initialized: true, lastLoginDate: getGameDay(state.settings?.dayResetHour ?? 4) };

    case 'SET_AI_CONFIG': {
      // Store AI config in localStorage only (never synced to cloud)
      try { localStorage.setItem('god_system_ai_config', JSON.stringify(action.config)); } catch {}
      return {
        ...state,
        aiConfig: action.config,
      };
    }

    case 'ADD_CUSTOM_QUEST': {
      // Add an AI-generated quest to the quest list
      return { ...state, quests: [...state.quests, action.quest] };
    }

    case 'CREATE_QUEST': {
      // Add a user-created quest with AI-evaluated EXP
      const newQuest = {
        id: `quest_user_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        title: action.title,
        desc: action.desc || '',
        exp: action.exp || 60,
        stat: action.stat || 'int',
        statGain: action.statGain || 1,
        category: action.category || 'daily',
        completed: false,
        type: 'user_custom',
        deadline: action.deadline || null,
        source: 'user',
      };
      return { ...state, quests: [...state.quests, newQuest] };
    }

    case 'UPDATE_QUEST': {
      const updated = state.quests.map(q =>
        q.id === action.questId
          ? { ...q, title: action.title, desc: action.desc }
          : q
      );
      return { ...state, quests: updated };
    }

    case 'DELETE_QUEST': {
      return {
        ...state,
        quests: state.quests.filter(q => q.id !== action.questId),
      };
    }

    case 'UNDO_QUEST': {
      // Revert completed quest back to active — no EXP deduction (Option B)
      const undone = state.quests.map(q =>
        q.id === action.questId ? { ...q, completed: false } : q
      );
      return { ...state, quests: undone };
    }

    case 'ADD_AI_MESSAGE': {
      const newMessages = [...state.aiMessages, action.message];
      // Also update the active session
      const updatedSessions = state.chatSessions.map(s => {
        if (s.id === state.activeChatSessionId) {
          // Auto-title from first user message
          let title = s.title;
          if (title === 'การสนทนาใหม่' && action.message.role === 'user') {
            title = action.message.content.slice(0, 30) + (action.message.content.length > 30 ? '...' : '');
          }
          return { ...s, messages: newMessages, title, updatedAt: Date.now() };
        }
        return s;
      });
      return {
        ...state,
        aiMessages: newMessages,
        chatSessions: updatedSessions,
      };
    }

    case 'CLEAR_AI_CHAT': {
      // Clear current session messages
      const clearedSessions = state.chatSessions.map(s =>
        s.id === state.activeChatSessionId
          ? { ...s, messages: [], title: 'การสนทนาใหม่', updatedAt: Date.now() }
          : s
      );
      return { ...state, aiMessages: [], chatSessions: clearedSessions };
    }

    case 'CREATE_CHAT_SESSION': {
      const newSession = createDefaultSession();
      return {
        ...state,
        chatSessions: [newSession, ...state.chatSessions],
        activeChatSessionId: newSession.id,
        aiMessages: [],
      };
    }

    case 'SWITCH_CHAT_SESSION': {
      const targetSession = state.chatSessions.find(s => s.id === action.sessionId);
      return {
        ...state,
        activeChatSessionId: action.sessionId,
        aiMessages: targetSession ? targetSession.messages : [],
      };
    }

    case 'DELETE_CHAT_SESSION': {
      const remaining = state.chatSessions.filter(s => s.id !== action.sessionId);
      // If deleting active session, switch to the first remaining or create new
      if (remaining.length === 0) {
        const fallback = createDefaultSession();
        return {
          ...state,
          chatSessions: [fallback],
          activeChatSessionId: fallback.id,
          aiMessages: [],
        };
      }
      const isActive = state.activeChatSessionId === action.sessionId;
      const nextActive = isActive ? remaining[0] : remaining.find(s => s.id === state.activeChatSessionId) || remaining[0];
      return {
        ...state,
        chatSessions: remaining,
        activeChatSessionId: nextActive.id,
        aiMessages: isActive ? nextActive.messages : state.aiMessages,
      };
    }

    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

const GameContext = createContext(null);
const STORAGE_KEY = 'real_life_system_v1';

export function GameProvider({ children, userId }) {
  // Load AI config from localStorage on init (never stored in cloud)
  const defaultAiConfig = { geminiKeys: [], groqKeys: [], preferredProvider: 'auto' };
  const initialState = (() => {
    const base = createInitialState();
    try {
      const raw = localStorage.getItem('god_system_ai_config');
      base.aiConfig = raw ? JSON.parse(raw) : defaultAiConfig;
    } catch {
      base.aiConfig = defaultAiConfig;
    }
    return base;
  })();

  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const saveTimeoutRef = useRef(null);

  // ── Load from Firestore (Cloud) on mount ──
  useEffect(() => {
    if (!userId) return;

    const loadFromCloud = async () => {
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          dispatch({ type: 'LOAD_STATE', payload: data });

          // Check for daily reset
          const resetHour = data.settings?.dayResetHour ?? 4;
          const today = getGameDay(resetHour);
          if (data.lastLoginDate !== today) {
            const incompleteCount = (data.quests || []).filter(q => {
              if (q.completed) return false;
              if (!q.deadline) return true;
              return new Date(q.deadline) < new Date();
            }).length;
            if (incompleteCount > 0 && data.lastLoginDate) {
              setTimeout(() => {
                dispatch({
                  type: 'APPLY_PENALTY',
                  expPenalty: incompleteCount * 30,
                  hpPenalty: incompleteCount * 5,
                  reason: `ไม่ทำเควสต์ครบ ${incompleteCount} ข้อเมื่อวาน`,
                });
              }, 1500);
            }
            setTimeout(() => {
              dispatch({ type: 'DAILY_RESET' });
            }, incompleteCount > 0 ? 4000 : 500);
          }
        } else {
          // New user — no cloud data yet
          dispatch({ type: 'DAILY_RESET' });
        }
      } catch (err) {
        console.error('Cloud load failed, falling back to localStorage:', err);
        // Fallback to localStorage
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) dispatch({ type: 'LOAD_STATE', payload: JSON.parse(saved) });
          else dispatch({ type: 'DAILY_RESET' });
        } catch {
          dispatch({ type: 'DAILY_RESET' });
        }
      } finally {
        setCloudLoaded(true);
      }
    };

    loadFromCloud();
  }, [userId]);

  // ── Auto-save to Firestore + localStorage (debounced 1.5s) ──
  useEffect(() => {
    if (!cloudLoaded || !userId) return;

    // Exclude aiMessages + aiConfig from cloud save (stored locally only)
    const toSave = {
      hunter: state.hunter,
      quests: state.quests,
      lastLoginDate: state.lastLoginDate,
      settings: state.settings,
      initialized: state.initialized,
    };

    // Save to localStorage immediately (offline backup)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {}

    // Debounce cloud saves to avoid excessive writes
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await setDoc(doc(db, 'users', userId), toSave);
      } catch (err) {
        console.error('Cloud save failed:', err);
      }
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [state.hunter, state.quests, state.lastLoginDate, state.settings, state.initialized, cloudLoaded, userId]);

  // ── Export save data ──
  const exportData = useCallback(() => {
    const data = {
      hunter: state.hunter,
      quests: state.quests,
      lastLoginDate: state.lastLoginDate,
      settings: state.settings,
      initialized: state.initialized,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hunter_${state.hunter.name}_lv${state.hunter.level}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state]);

  // ── Import save data ──
  const importData = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          dispatch({ type: 'LOAD_STATE', payload: parsed });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }, []);

  // ── Sign out ──
  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  }, []);

  // Computed values
  const level = state.hunter.level;
  const expInCurrentLevel = state.hunter.totalExp - getExpForLevel(level);
  const expToNext = getExpToNextLevel(level);
  const expPercent = Math.min(100, (expInCurrentLevel / expToNext) * 100);

  const value = {
    state,
    dispatch,
    exportData,
    importData,
    signOut: handleSignOut,
    cloudLoaded,
    computed: {
      expInCurrentLevel,
      expToNext,
      expPercent,
      level,
    },
  };

  // Show loading spinner while fetching cloud data
  if (!cloudLoaded) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: '#0a0a0f',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '1rem',
      }}>
        <div style={{
          width: 48, height: 48,
          border: '3px solid rgba(0,255,136,0.2)',
          borderTopColor: '#00ff88',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <p style={{
          color: 'rgba(0,255,136,0.6)',
          fontFamily: 'monospace',
          fontSize: '0.75rem',
          letterSpacing: '0.15em',
        }}>LOADING HUNTER DATA...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export { RANKS, RANK_MIN_LEVELS, JOB_TITLES, getLevelFromExp, getExpForLevel, getExpToNextLevel, getRankForLevel };
