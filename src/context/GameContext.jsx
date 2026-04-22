import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

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
  // Each level requires: (level * 100) exp
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
  // Total exp needed to reach this level
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
  ],
};

// ============================================
// INITIAL STATE
// ============================================

function createInitialState() {
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
    },
    initialized: false,
  };
}

// ============================================
// QUEST GENERATOR
// ============================================

function generateDailyQuests(goals = []) {
  const allTemplates = Object.values(QUEST_TEMPLATES).flat();
  const selected = [];
  const usedIndices = new Set();

  // Always include one from each category
  const categories = Object.keys(QUEST_TEMPLATES);
  categories.forEach(cat => {
    const catTemplates = QUEST_TEMPLATES[cat];
    const idx = Math.floor(Math.random() * catTemplates.length);
    selected.push({
      ...catTemplates[idx],
      id: `quest_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      category: cat,
      completed: false,
      type: 'daily',
    });
  });

  return selected;
}

// ============================================
// REDUCER
// ============================================

function gameReducer(state, action) {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...action.payload, notifications: [], showLevelUp: false, showPenalty: false };

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

      // Stat gain
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
      const newQuests = generateDailyQuests();
      const notification = {
        id: Date.now(),
        type: 'system',
        message: '🚨 [เควสต์รายวันใหม่มาถึงแล้ว] — เตรียมพร้อมสำหรับภารกิจ!',
      };
      return {
        ...state,
        quests: newQuests,
        lastLoginDate: new Date().toDateString(),
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

    case 'RESET_DATA':
      return { ...createInitialState(), initialized: false };

    case 'SET_INITIALIZED':
      return { ...state, initialized: true, lastLoginDate: new Date().toDateString() };

    default:
      return state;
  }
}

// ============================================
// CONTEXT
// ============================================

const GameContext = createContext(null);
const STORAGE_KEY = 'real_life_system_v1';

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, createInitialState());

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'LOAD_STATE', payload: parsed });

        // Check for daily reset
        const today = new Date().toDateString();
        if (parsed.lastLoginDate !== today) {
          // Check for incomplete quests penalty
          const yesterday = parsed.quests || [];
          const incompleteCount = yesterday.filter(q => !q.completed).length;
          if (incompleteCount > 0 && parsed.lastLoginDate) {
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
        // New user
        dispatch({ type: 'DAILY_RESET' });
      }
    } catch (e) {
      console.error('Failed to load state:', e);
      dispatch({ type: 'DAILY_RESET' });
    }
  }, []);

  // Save to localStorage on state changes
  useEffect(() => {
    const toSave = {
      hunter: state.hunter,
      quests: state.quests,
      lastLoginDate: state.lastLoginDate,
      settings: state.settings,
      initialized: state.initialized,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }, [state.hunter, state.quests, state.lastLoginDate, state.settings, state.initialized]);

  // Export save data
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

  // Import save data
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
    computed: {
      expInCurrentLevel,
      expToNext,
      expPercent,
      level,
    },
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export { RANKS, RANK_MIN_LEVELS, JOB_TITLES, getLevelFromExp, getExpForLevel, getExpToNextLevel, getRankForLevel };
