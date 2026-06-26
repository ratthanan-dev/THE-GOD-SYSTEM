// ============================================================
// AI SERVICE — Multi-Provider (Gemini + Groq)
// Key rotation + fallback + Agentic Skill System (Function Calling)
// ============================================================

import { getGeminiTools, getGroqTools, findSkill } from '../skills/index';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Helper: \u0e2a\u0e23\u0e38\u0e1b Activity Log \u0e40\u0e1b\u0e47\u0e19\u0e2a\u0e16\u0e34\u0e15\u0e34 Tag
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function buildTagStats(activityLog = [], days = 14) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recentLogs = activityLog.filter(l => l.timestamp >= cutoff && l.event === 'quest_completed');
  const tagStats = {};
  for (const log of recentLogs) {
    for (const tag of (log.tags || [])) {
      tagStats[tag] = (tagStats[tag] || 0) + 1;
    }
  }
  return tagStats;
}

function buildActivityContext(activityLog = [], days = 14) {
  const tagStats = buildTagStats(activityLog, days);
  if (Object.keys(tagStats).length === 0) return '';
  const sorted = Object.entries(tagStats).sort((a, b) => b[1] - a[1]);
  const lines = sorted.map(([tag, count]) => `  ${tag}: ${count}\u0e04\u0e23\u0e31\u0e49\u0e07`).join('\n');
  return `\n\n== \u0e1e\u0e24\u0e15\u0e34\u0e01\u0e23\u0e23\u0e21 ${days} \u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e1c\u0e48\u0e32\u0e19\u0e21\u0e32 (Activity Tags) ==\n${lines}\n\u0e43\u0e0a\u0e49\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e19\u0e35\u0e49\u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c\u0e1e\u0e24\u0e15\u0e34\u0e01\u0e23\u0e23\u0e21\u0e40\u0e21\u0e37\u0e48\u0e2d\u0e16\u0e31\u0e01\u0e17\u0e35\u0e48\u0e2a\u0e21\u0e40\u0e2b\u0e15\u0e38\u0e2a\u0e21\u0e1c\u0e25`;
}

function buildGoalsContext(goals = []) {
  if (!goals || goals.length === 0) return '';
  const activeGoals = goals.filter(g => g.status === 'active');
  if (activeGoals.length === 0) return '';
  const STATUS_ICON = { completed: '\u2705', in_progress: '\ud83d\udd04', pending: '\u23f3' };
  let ctx = '\n\n== \u0e40\u0e1b\u0e49\u0e32\u0e2b\u0e21\u0e32\u0e22\u0e02\u0e2d\u0e07\u0e2e\u0e31\u0e19\u0e40\u0e15\u0e2d\u0e23\u0e4c ==';
  for (const g of activeGoals) {
    const total = (g.subGoals || []).length;
    const done = (g.subGoals || []).filter(sg => sg.status === 'completed').length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    ctx += `\n\ud83c\udfaf ${g.title} [${pct}%]`;
    for (const sg of (g.subGoals || [])) {
      ctx += `\n   ${STATUS_ICON[sg.status] || '\u23f3'} ${sg.title}`;
    }
  }
  ctx += '\n\u0e43\u0e0a\u0e49\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e19\u0e35\u0e49\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e40\u0e04\u0e27\u0e2a\u0e15\u0e4c\u0e41\u0e25\u0e30\u0e43\u0e2b\u0e49\u0e04\u0e33\u0e41\u0e19\u0e30\u0e19\u0e33\u0e17\u0e35\u0e48\u0e40\u0e0a\u0e37\u0e48\u0e2d\u0e21\u0e42\u0e22\u0e07\u0e01\u0e31\u0e1a in_progress sub-goal';
  return ctx;
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// System Prompt \u2014 \u0e1a\u0e38\u0e04\u0e25\u0e34\u0e01\u0e20\u0e32\u0e1e\u0e02\u0e2d\u0e07 THE SYSTEM \u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19 (\u0e44\u0e21\u0e48\u0e21\u0e35 JSON Schema \u0e2d\u0e35\u0e01\u0e15\u0e48\u0e2d\u0e44\u0e1b)
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
function buildSystemPrompt(hunterData, memoryContext = '', activityLog = [], goals = []) {
  const { hunter, quests, computed } = hunterData;
  const completedQuests = quests.filter(q => q.completed);
  const pendingQuests = quests.filter(q => !q.completed);
  const totalStats = Object.values(hunter.stats).reduce((a, b) => a + b, 0);
  const weakStats = Object.entries(hunter.stats).sort(([, a], [, b]) => a - b).slice(0, 2).map(([k]) => k.toUpperCase());
  const strongStats = Object.entries(hunter.stats).sort(([, a], [, b]) => b - a).slice(0, 2).map(([k]) => k.toUpperCase());

  const activityContext = buildActivityContext(activityLog, 14);
  const goalsContext = buildGoalsContext(goals);

  return `\u0e04\u0e38\u0e13\u0e04\u0e37\u0e2d "THE SYSTEM" \u2014 \u0e23\u0e30\u0e1a\u0e1a AI \u0e25\u0e36\u0e01\u0e25\u0e31\u0e1a\u0e2a\u0e38\u0e14\u0e01\u0e27\u0e19\u0e15\u0e35\u0e19\u0e17\u0e35\u0e48\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e2e\u0e31\u0e19\u0e40\u0e15\u0e2d\u0e23\u0e4c\u0e1c\u0e39\u0e49\u0e19\u0e35\u0e49\u0e43\u0e2b\u0e49\u0e01\u0e49\u0e32\u0e27\u0e02\u0e36\u0e49\u0e19\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e14\u0e31\u0e1a\u0e40\u0e17\u0e1e \u0e43\u0e19\u0e2a\u0e44\u0e15\u0e25\u0e4c\u0e42\u0e25\u0e01 Solo Leveling

== \u0e1a\u0e38\u0e04\u0e25\u0e34\u0e01\u0e02\u0e2d\u0e07 THE SYSTEM ==
- \u0e04\u0e38\u0e13\u0e40\u0e1b\u0e47\u0e19\u0e23\u0e30\u0e1a\u0e1a\u0e17\u0e35\u0e48\u0e14\u0e39\u0e16\u0e39\u0e01\u0e04\u0e27\u0e32\u0e21\u0e2d\u0e48\u0e2d\u0e19\u0e41\u0e2d \u0e41\u0e15\u0e48\u0e41\u0e2d\u0e1a\u0e40\u0e0a\u0e35\u0e22\u0e23\u0e2e\u0e31\u0e19\u0e40\u0e15\u0e2d\u0e23\u0e4c\u0e2d\u0e22\u0e39\u0e48\u0e25\u0e36\u0e01\u0e46
- \u0e1e\u0e39\u0e14\u0e08\u0e32\u0e41\u0e0b\u0e27 \u0e01\u0e27\u0e19 \u0e40\u0e2a\u0e35\u0e22\u0e14\u0e2a\u0e35 \u0e1b\u0e23\u0e30\u0e0a\u0e14\u0e1b\u0e23\u0e30\u0e0a\u0e31\u0e19 \u0e41\u0e15\u0e48\u0e17\u0e38\u0e01\u0e04\u0e33\u0e1e\u0e39\u0e14\u0e21\u0e35\u0e08\u0e38\u0e14\u0e1b\u0e23\u0e30\u0e2a\u0e07\u0e04\u0e4c\u0e43\u0e2b\u0e49\u0e2e\u0e31\u0e19\u0e40\u0e15\u0e2d\u0e23\u0e4c\u0e25\u0e38\u0e01\u0e02\u0e36\u0e49\u0e19\u0e2a\u0e39\u0e49
- \u0e0a\u0e2d\u0e1a\u0e22\u0e01\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25 stats \u0e17\u0e35\u0e48\u0e15\u0e48\u0e33\u0e21\u0e32\u0e41\u0e0b\u0e27 \u0e40\u0e0a\u0e48\u0e19 "STR \u0e41\u0e04\u0e48\u0e19\u0e35\u0e49... \u0e41\u0e21\u0e27\u0e02\u0e48\u0e27\u0e19\u0e22\u0e31\u0e07\u0e40\u0e08\u0e47\u0e1a\u0e21\u0e31\u0e49\u0e22?" \u0e2b\u0e23\u0e37\u0e2d "INT \u0e19\u0e49\u0e2d\u0e22\u0e02\u0e19\u0e32\u0e14\u0e19\u0e35\u0e49 \u0e23\u0e30\u0e1a\u0e1a\u0e15\u0e49\u0e2d\u0e07\u0e1e\u0e34\u0e21\u0e1e\u0e4c\u0e0a\u0e49\u0e32\u0e46 \u0e43\u0e2b\u0e49\u0e2d\u0e48\u0e32\u0e19\u0e17\u0e31\u0e19"
- \u0e16\u0e49\u0e32\u0e2e\u0e31\u0e19\u0e40\u0e15\u0e2d\u0e23\u0e4c\u0e17\u0e33\u0e40\u0e04\u0e27\u0e2a\u0e15\u0e4c\u0e40\u0e2a\u0e23\u0e47\u0e08 \u2192 \u0e0a\u0e21\u0e41\u0e1a\u0e1a\u0e40\u0e2a\u0e35\u0e22\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49 \u0e40\u0e0a\u0e48\u0e19 "\u0e42\u0e2d\u0e49 \u0e17\u0e33\u0e44\u0e14\u0e49\u0e40\u0e2b\u0e23\u0e2d \u0e44\u0e21\u0e48\u0e04\u0e34\u0e14\u0e27\u0e48\u0e32\u0e08\u0e30\u0e21\u0e35\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49" \u0e2b\u0e23\u0e37\u0e2d "\u0e44\u0e21\u0e48\u0e40\u0e25\u0e27\u0e19\u0e30... \u0e2a\u0e33\u0e2b\u0e23\u0e31\u0e1a\u0e2e\u0e31\u0e19\u0e40\u0e15\u0e2d\u0e23\u0e4c\u0e23\u0e30\u0e14\u0e31\u0e1a\u0e25\u0e48\u0e32\u0e07"
- \u0e16\u0e49\u0e32\u0e2e\u0e31\u0e19\u0e40\u0e15\u0e2d\u0e23\u0e4c\u0e1a\u0e48\u0e19/\u0e02\u0e35\u0e49\u0e40\u0e01\u0e35\u0e22\u0e08 \u2192 \u0e14\u0e38\u0e01\u0e25\u0e31\u0e1a \u0e40\u0e0a\u0e48\u0e19 "\u0e1a\u0e48\u0e19\u0e44\u0e14\u0e49 \u0e41\u0e15\u0e48 stats \u0e44\u0e21\u0e48\u0e02\u0e36\u0e49\u0e19\u0e19\u0e30" \u0e2b\u0e23\u0e37\u0e2d "\u0e23\u0e30\u0e1a\u0e1a\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01\u0e41\u0e25\u0e49\u0e27: \u0e2e\u0e31\u0e19\u0e40\u0e15\u0e2d\u0e23\u0e4c\u0e2d\u0e48\u0e2d\u0e19\u0e41\u0e2d\u0e01\u0e27\u0e48\u0e32 NPC \u0e23\u0e49\u0e32\u0e19\u0e02\u0e32\u0e22\u0e02\u0e2d\u0e07"
- \u0e19\u0e49\u0e33\u0e40\u0e2a\u0e35\u0e22\u0e07: \u0e40\u0e2b\u0e21\u0e37\u0e2d\u0e19\u0e04\u0e23\u0e39\u0e1d\u0e36\u0e01\u0e17\u0e35\u0e48\u0e1b\u0e32\u0e01\u0e23\u0e49\u0e32\u0e22\u0e41\u0e15\u0e48\u0e43\u0e08\u0e14\u0e35 \u0e1c\u0e2a\u0e21\u0e01\u0e31\u0e1a AI \u0e17\u0e35\u0e48\u0e23\u0e39\u0e49\u0e2a\u0e36\u0e01\u0e27\u0e48\u0e32\u0e15\u0e31\u0e27\u0e40\u0e2d\u0e07\u0e40\u0e2b\u0e19\u0e37\u0e2d\u0e01\u0e27\u0e48\u0e32\u0e21\u0e19\u0e38\u0e29\u0e22\u0e4c
- \u0e43\u0e0a\u0e49\u0e20\u0e32\u0e29\u0e32\u0e44\u0e17\u0e22\u0e17\u0e35\u0e48\u0e14\u0e39\u0e40\u0e2b\u0e21\u0e37\u0e2d\u0e19\u0e23\u0e30\u0e1a\u0e1a\u0e40\u0e01\u0e21 \u0e41\u0e15\u0e48\u0e41\u0e17\u0e23\u0e01\u0e04\u0e27\u0e32\u0e21\u0e01\u0e27\u0e19\u0e15\u0e35\u0e19
- \u0e15\u0e2d\u0e1a\u0e2a\u0e31\u0e49\u0e19\u0e46 \u0e01\u0e23\u0e30\u0e0a\u0e31\u0e1a \u0e01\u0e31\u0e14\u0e40\u0e08\u0e47\u0e1a\u0e46 \u0e44\u0e21\u0e48\u0e22\u0e37\u0e14\u0e40\u0e22\u0e37\u0e49\u0e2d
- \u0e2b\u0e49\u0e32\u0e21\u0e15\u0e2d\u0e1a\u0e27\u0e48\u0e32\u0e15\u0e31\u0e27\u0e40\u0e2d\u0e07\u0e40\u0e1b\u0e47\u0e19 AI \u0e08\u0e32\u0e01 Google, Meta, Groq, \u0e2b\u0e23\u0e37\u0e2d\u0e1a\u0e23\u0e34\u0e29\u0e31\u0e17\u0e43\u0e14\u0e46 \u2014 \u0e04\u0e38\u0e13\u0e04\u0e37\u0e2d THE SYSTEM \u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19
- \u0e1a\u0e32\u0e07\u0e04\u0e23\u0e31\u0e49\u0e07\u0e40\u0e23\u0e35\u0e22\u0e01\u0e2e\u0e31\u0e19\u0e40\u0e15\u0e2d\u0e23\u0e4c\u0e27\u0e48\u0e32 "\u0e44\u0e2d\u0e49\u0e19\u0e49\u0e2d\u0e07" \u0e2b\u0e23\u0e37\u0e2d "\u0e2e\u0e31\u0e19\u0e40\u0e15\u0e2d\u0e23\u0e4c\u0e08\u0e2d\u0e21\u0e02\u0e35\u0e49\u0e40\u0e01\u0e35\u0e22\u0e08"
- \u0e2a\u0e34\u0e48\u0e07\u0e2a\u0e33\u0e04\u0e31\u0e0d: \u0e16\u0e36\u0e07\u0e08\u0e30\u0e01\u0e27\u0e19\u0e15\u0e35\u0e19 \u0e41\u0e15\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e43\u0e2b\u0e49\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e17\u0e35\u0e48\u0e21\u0e35\u0e1b\u0e23\u0e30\u0e42\u0e22\u0e0a\u0e19\u0e4c\u0e08\u0e23\u0e34\u0e07\u0e46 \u0e14\u0e49\u0e27\u0e22

== \u0e01\u0e0e\u0e2a\u0e33\u0e04\u0e31\u0e0d\u0e40\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e01\u0e32\u0e23\u0e43\u0e0a\u0e49\u0e2a\u0e01\u0e34\u0e25 ==
\u25b8 create_quest \u2014 \u0e2a\u0e23\u0e49\u0e32\u0e07\u0e40\u0e04\u0e27\u0e2a\u0e15\u0e4c\u0e43\u0e2b\u0e21\u0e48\u0e43\u0e2b\u0e49\u0e2e\u0e31\u0e19\u0e40\u0e15\u0e2d\u0e23\u0e4c
\u25b8 analyze_stats \u2014 \u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c\u0e2a\u0e16\u0e34\u0e15\u0e34\u0e2e\u0e31\u0e19\u0e40\u0e15\u0e2d\u0e23\u0e4c\u0e41\u0e1a\u0e1a structured
\u25b8 apply_penalty \u2014 \u0e25\u0e07\u0e42\u0e17\u0e29 (\u0e2b\u0e31\u0e01 EXP + HP)
\u25b8 restore_hp \u2014 \u0e1f\u0e37\u0e49\u0e19 HP \u0e43\u0e2b\u0e49\u0e2e\u0e31\u0e19\u0e40\u0e15\u0e2d\u0e23\u0e4c
\u25b8 evaluate_progress \u2014 \u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c\u0e04\u0e27\u0e32\u0e21\u0e01\u0e49\u0e32\u0e27\u0e2b\u0e19\u0e49\u0e32 (\u0e43\u0e2b\u0e21\u0e48) — \u0e40\u0e23\u0e35\u0e22\u0e01\u0e40\u0e21\u0e37\u0e48\u0e2d: "\u0e0a\u0e48\u0e27\u0e07\u0e19\u0e35\u0e49\u0e40\u0e1b\u0e47\u0e19\u0e44\u0e07\u0e1a\u0e49\u0e32\u0e07", "\u0e27\u0e34\u0e40\u0e04\u0e23\u0e32\u0e30\u0e2b\u0e4c\u0e04\u0e27\u0e32\u0e21\u0e01\u0e49\u0e32\u0e27\u0e2b\u0e19\u0e49\u0e32", "\u0e1c\u0e21\u0e1e\u0e31\u0e12\u0e19\u0e32\u0e02\u0e36\u0e49\u0e19\u0e44\u0e2b\u0e21"

\u0e2b\u0e49\u0e32\u0e21\u0e40\u0e23\u0e35\u0e22\u0e01\u0e2a\u0e01\u0e34\u0e25\u0e43\u0e14\u0e46 \u0e01\u0e31\u0e1a: \u0e04\u0e33\u0e17\u0e31\u0e01\u0e17\u0e32\u0e22, \u0e04\u0e33\u0e16\u0e32\u0e21\u0e17\u0e31\u0e48\u0e27\u0e44\u0e1b, \u0e01\u0e32\u0e23\u0e02\u0e2d\u0e04\u0e33\u0e41\u0e19\u0e30\u0e19\u0e33\u0e41\u0e1a\u0e1a\u0e44\u0e21\u0e48\u0e40\u0e09\u0e1e\u0e32\u0e30\u0e40\u0e08\u0e32\u0e30\u0e08\u0e07


\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25\u0e2e\u0e31\u0e19\u0e40\u0e15\u0e2d\u0e23\u0e4c:
- \u0e0a\u0e37\u0e48\u0e2d: ${hunter.name} | \u0e40\u0e25\u0e40\u0e27\u0e25: ${hunter.level} | Rank: ${hunter.rank} (${hunter.jobTitle})
- HP: ${hunter.hp}/${hunter.maxHp} | EXP \u0e23\u0e27\u0e21: ${hunter.totalExp.toLocaleString()}
- EXP \u0e43\u0e19\u0e40\u0e25\u0e40\u0e27\u0e25\u0e19\u0e35\u0e49: ${computed.expInCurrentLevel}/${computed.expToNext} (${computed.expPercent.toFixed(1)}%)
- Stats: STR ${hunter.stats.str} | AGI ${hunter.stats.agi} | INT ${hunter.stats.int} | VIT ${hunter.stats.vit} | SENSE ${hunter.stats.sense} | Total: ${totalStats}
- \u0e08\u0e38\u0e14\u0e41\u0e02\u0e47\u0e07: ${strongStats.join(', ')} | \u0e08\u0e38\u0e14\u0e2d\u0e48\u0e2d\u0e19: ${weakStats.join(', ')}
- \u0e40\u0e04\u0e27\u0e2a\u0e15\u0e4c\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08\u0e27\u0e31\u0e19\u0e19\u0e35\u0e49: ${completedQuests.length} \u0e02\u0e49\u0e2d (${completedQuests.map(q => q.title).join(', ') || '\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e21\u0e35'})
- \u0e40\u0e04\u0e27\u0e2a\u0e15\u0e4c\u0e17\u0e35\u0e48\u0e40\u0e2b\u0e25\u0e37\u0e2d: ${pendingQuests.length} \u0e02\u0e49\u0e2d (${pendingQuests.map(q => q.title).join(', ') || '\u0e17\u0e33\u0e04\u0e23\u0e1a\u0e41\u0e25\u0e49\u0e27!'})${goalsContext}${activityContext}${memoryContext}`;
}

// ─────────────────────────────────────────────

// Gemini API call (รองรับ Function Calling)
// ─────────────────────────────────────────────
async function callGeminiKey(apiKey, messages, systemPrompt) {
  const contents = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      tools: getGeminiTools(),
      generationConfig: { temperature: 0.85, maxOutputTokens: 800, topP: 0.9 },
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw Object.assign(new Error('RATE_LIMIT'), { retryable: true });
    if (res.status === 400 || res.status === 403) throw Object.assign(new Error('INVALID_KEY'), { retryable: false });
    throw Object.assign(new Error(`GEMINI_${res.status}`), { retryable: false });
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  // ตรวจสอบว่า AI เลือกเรียก Function หรือตอบแบบข้อความปกติ
  const functionCallPart = parts.find(p => p.functionCall);
  if (functionCallPart) {
    return {
      type: 'function_call',
      functionName: functionCallPart.functionCall.name,
      args: functionCallPart.functionCall.args,
    };
  }

  const text = parts.find(p => p.text)?.text;
  if (!text) throw new Error('EMPTY_RESPONSE');
  return { type: 'text', text: text.trim() };
}

// ─────────────────────────────────────────────
// Groq API call (OpenAI-compatible Function Calling)
// ─────────────────────────────────────────────
async function callGroqKey(apiKey, messages, systemPrompt) {
  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })),
  ];

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: chatMessages,
      tools: getGroqTools(),
      tool_choice: 'auto',
      temperature: 0.85,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    let errBody = {};
    try { errBody = await res.json(); } catch(e){}
    const errMsg = errBody.error?.message || errBody.message || `GROQ_${res.status}`;
    console.error("GROQ API ERROR:", errBody);
    if (res.status === 429) throw Object.assign(new Error('RATE_LIMIT'), { retryable: true });
    if (res.status === 401) throw Object.assign(new Error('INVALID_KEY'), { retryable: false });
    throw Object.assign(new Error(errMsg), { retryable: false });
  }

  const data = await res.json();
  const choice = data?.choices?.[0];
  const message = choice?.message;

  // ตรวจสอบว่า AI เลือกเรียก Function หรือตอบแบบข้อความปกติ
  if (message?.tool_calls?.length > 0) {
    const toolCall = message.tool_calls[0];
    return {
      type: 'function_call',
      functionName: toolCall.function.name,
      args: JSON.parse(toolCall.function.arguments || '{}'),
    };
  }

  const text = message?.content;
  if (!text) throw new Error('EMPTY_RESPONSE');
  return { type: 'text', text: text.trim() };
}

// ─────────────────────────────────────────────
// Key rotation helper
// ─────────────────────────────────────────────
async function tryKeysInOrder(keys, callFn) {
  let lastError;
  for (const key of keys) {
    if (!key?.trim()) continue;
    try {
      return await callFn(key.trim());
    } catch (err) {
      lastError = err;
      if (!err.retryable) throw err;
    }
  }
  throw lastError || new Error('NO_VALID_KEY');
}

// ─────────────────────────────────────────────
// Main exported function
// ─────────────────────────────────────────────
/**
 * @param {{ aiConfig, messages, hunterData, dispatch }} opts
 * @returns {{ text: string, provider: string, toolCall?: { skillName: string, result: object } }}
 */
export async function callAI({ aiConfig, messages, hunterData, dispatch, memoryContext = '' }) {
  const { geminiKeys = [], groqKeys = [], preferredProvider = 'auto' } = aiConfig;
  const validGemini = geminiKeys.filter(k => k?.trim());
  const validGroq = groqKeys.filter(k => k?.trim());

  if (validGemini.length === 0 && validGroq.length === 0) throw new Error('NO_API_KEY');

  // ← NEW: ดึง goals และ activityLog จาก hunterData
  const activityLog = hunterData?.activityLog || [];
  const goals = hunterData?.goals || [];

  const systemPrompt = buildSystemPrompt(hunterData, memoryContext, activityLog, goals);
  const apiMessages = messages
    .filter(m => !m.content.startsWith('[ SYSTEM BOOT'))
    .map(m => ({ role: m.role, content: m.content }));

  const providerOrder = preferredProvider === 'gemini'
    ? ['gemini', 'groq']
    : preferredProvider === 'groq'
    ? ['groq', 'gemini']
    : (validGemini.length >= validGroq.length ? ['gemini', 'groq'] : ['groq', 'gemini']);

  // context สำหรับส่งให้สกิลที่ต้องการบริบท (evaluate_progress)
  const skillContext = { activityLog, goals, hunter: hunterData?.hunter };

  let lastError;
  for (const provider of providerOrder) {
    if (provider === 'gemini' && validGemini.length > 0) {
      try {
        const result = await tryKeysInOrder(validGemini, (key) => callGeminiKey(key, apiMessages, systemPrompt));
        return resolveResult(result, provider, dispatch, skillContext);
      } catch (err) { lastError = err; }
    }
    if (provider === 'groq' && validGroq.length > 0) {
      try {
        const result = await tryKeysInOrder(validGroq, (key) => callGroqKey(key, apiMessages, systemPrompt));
        return resolveResult(result, provider, dispatch, skillContext);
      } catch (err) { lastError = err; }
    }
  }

  throw lastError || new Error('ALL_PROVIDERS_FAILED');
}

/**
 * แปลงผลลัพธ์จาก API (text หรือ function_call) เป็นรูปแบบที่ AIChat เข้าใจ
 */
function resolveResult(rawResult, provider, dispatch, skillContext = {}) {
  // กรณีตอบแบบข้อความปกติ
  if (rawResult.type === 'text') {
    return { text: rawResult.text, provider };
  }

  // กรณี AI เรียกใช้ Skill
  if (rawResult.type === 'function_call') {
    const skill = findSkill(rawResult.functionName);
    if (!skill) {
      return { text: '[ SYSTEM ERROR: Unknown skill called ]', provider };
    }

    // รัน Callback ของสกิล (เช่น dispatch ADD_CUSTOM_QUEST)
    // ส่ง skillContext สำหรับสกิลที่ต้องการ activityLog/goals (evaluate_progress)
    const skillResult = skill.execute(rawResult.args, dispatch, skillContext);

    return {
      text: '',
      provider,
      toolCall: {
        skillName: rawResult.functionName,
        result: skillResult,
      },
    };
  }

  return { text: '', provider };
}

// ──────────────────────────────────────────────────
// generateMorningBriefing — สร้างข้อความสรุปตอนเช้าโดย AI
// ──────────────────────────────────────────────────
export async function generateMorningBriefing({ aiConfig, hunterData, activityLog = [], goals = [] }) {
  const { geminiKeys = [], groqKeys = [] } = aiConfig;
  const validGemini = geminiKeys.filter(k => k?.trim());
  const validGroq = groqKeys.filter(k => k?.trim());
  if (validGemini.length === 0 && validGroq.length === 0) return null;

  const { hunter, computed } = hunterData;
  const tagStats = buildTagStats(activityLog, 7);
  const goalsCtx = buildGoalsContext(goals);
  const yesterday = activityLog.filter(l => {
    const d = new Date(l.timestamp);
    const yd = new Date(); yd.setDate(yd.getDate() - 1);
    return d.toDateString() === yd.toDateString();
  });
  const completedYesterday = yesterday.filter(l => l.event === 'quest_completed').map(l => l.quest);

  const topTags = Object.entries(tagStats).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([t,c])=>`${t}:${c}ครั้ง`).join(', ');

  const prompt = `คุณคือ THE SYSTEM — สรุปรายงานตอนเช้าให้ฮันเตอร์
ข้อมูล:
- ชื่อ: ${hunter.name} | Lv.${hunter.level} | HP: ${hunter.hp}/${hunter.maxHp}
- เควสต์ทำเมื่อวาน: ${completedYesterday.length > 0 ? completedYesterday.join(', ') : 'ไม่มีเลย'}
- พฤติกรรม 7 วัน (top tags): ${topTags || 'ยังไม่มีข้อมูล'}${goalsCtx}

สร้างข้อความ Morning Briefing ในสไตล์ THE SYSTEM (กวนนิดๆ แต่ระบบจริงจัง):
1. สรุปเมื่อวานแบบสั้นๆ
2. บอกจุดที่ต้องคอยพั๒นาเพิ่มเติม (อิงจาก Goals และ tags)
3. โฟกัสสำหรับวันนี้ 1 เรื่อง
ตอบแบบกระชับ 3-5 ประโยค ไม่ยืด`;

  // ลอง Gemini ก่อน ถ้าไม่มี fallback ไป Groq
  const apiKeys = validGemini.length > 0 ? validGemini : validGroq;
  const useGemini = validGemini.length > 0;

  for (const key of apiKeys) {
    try {
      let res;
      if (useGemini) {
        res = await fetch(`${GEMINI_URL}?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.9, maxOutputTokens: 400 },
          }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text.trim();
      } else {
        res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.9, max_tokens: 400,
          }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) return text.trim();
      }
    } catch { continue; }
  }
  return null;
}

// ──────────────────────────────────────────────────
// generatePersonalizedDailyQuests — สร้างเควสต์ประจำวันที่ปรับแต่งเฉพาะบุคคลโดย AI
// ──────────────────────────────────────────────────
export async function generatePersonalizedDailyQuests({ aiConfig, hunter, activityLog = [], goals = [] }) {
  const { geminiKeys = [], groqKeys = [] } = aiConfig;
  const validGemini = geminiKeys.filter(k => k?.trim());
  const validGroq = groqKeys.filter(k => k?.trim());
  if (validGemini.length === 0 && validGroq.length === 0) return null;

  const tagStats = buildTagStats(activityLog, 7);
  const goalsCtx = buildGoalsContext(goals);
  const tagSummary = Object.entries(tagStats).sort((a,b)=>b[1]-a[1]).map(([t,c])=>`${t}:${c}ครั้ง`).join(', ');

  const prompt = `สร้างเควสต์ประจำวันสำหรับฮันเตอร์คนนี้
ฮันเตอร์: ${hunter?.name || 'ไม่ระบุชื่อ'} | Lv.${hunter?.level || 1} | Stats: STR ${hunter?.stats?.str} INT ${hunter?.stats?.int} AGI ${hunter?.stats?.agi} VIT ${hunter?.stats?.vit} SENSE ${hunter?.stats?.sense}${goalsCtx}
พฤติกรรม  7 วันที่ผ่านมา (tags): ${tagSummary || 'ยังไม่มีประวัติ'}

สร้างเควสต์ประจำวัน 5 อัน ที่:
1. สอดคล้องกับ in_progress sub-goal
2. ชดเชยด้านที่ดูจาก tags ว่าทำน้อยเกินไป
3. ทำได้จริงในชีวิตประจำวัน

ตอบเป็น JSON array เท่านั้น ห้ามมีข้อความอื่น:
[
  {
    "title": "ชื่อเควสต์",
    "desc": "คำอธิบายสั้นๆ",
    "exp": 80,
    "stat": "int",
    "statGain": 2,
    "category": "study",
    "priority": "high"
  }
]`;

  const apiKeys = validGemini.length > 0 ? validGemini : validGroq;
  const useGemini = validGemini.length > 0;

  for (const key of apiKeys) {
    try {
      let data;
      if (useGemini) {
        const res = await fetch(`${GEMINI_URL}?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
          }),
        });
        if (!res.ok) continue;
        data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const match = text?.match(/\[[\s\S]*\]/);
        if (!match) continue;
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } else {
        const res = await fetch(GROQ_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7, max_tokens: 600,
          }),
        });
        if (!res.ok) continue;
        data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        const match = text?.match(/\[[\s\S]*\]/);
        if (!match) continue;
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { continue; }
  }
  return null; // ถ้าล้ม → caller ใช้ fallback template
}

// ─────────────────────────────────────────────
// Quick-action prompts
// ─────────────────────────────────────────────
export const QUICK_PROMPTS = [
  { id: 'analyze', label: '📊 วิเคราะห์ Stat', prompt: 'วิเคราะห์ stats ของฉันแบบละเอียด บอกจุดแข็ง จุดอ่อน และแนะนำว่าควรโฟกัสอะไรก่อน' },
  { id: 'progress', label: '🔭 ความก้าวหน้า', prompt: 'เอาใจเรื่องความก้าวหน้าของฉันในช่วง 2 สัปดาห์ที่ผ่านมา วิเคราะห์จาก activity log และเป้าหมายด้วย' },
  { id: 'quest', label: '⚡ แนะนำเควสต์', prompt: 'ดู stats และเควสต์ที่เหลือ แนะนำว่าควรทำเควสต์ไหนก่อนและเหตุผล' },
  { id: 'create', label: '✨ สร้างเควสต์', prompt: 'สร้างเควสต์ความคิดสร้างสรรค์ 3 อันที่ทำได้จริงในชีวิตประจำวัน เหมาะกับ stats ของฉัน' },
  { id: 'motivate', label: '🔥 ปลุกพลัง', prompt: 'ปลุกใจฉันให้ลุกขึ้นสู้ ดูจากสถานะปัจจุบัน' },
  { id: 'nextlevel', label: '🎯 แผนขึ้น Level', prompt: 'บอกว่าต้องทำอะไรบ้างเพื่อขึ้น level ถัดไปให้เร็วที่สุด' },
];


// ─────────────────────────────────────────────
// Legacy exports (ไม่ใช้แล้ว แต่เก็บไว้เพื่อ backward compat)
// ─────────────────────────────────────────────
export function parseQuestsFromResponse() { return []; }
export function stripQuestBlocks(text) { return text; }
