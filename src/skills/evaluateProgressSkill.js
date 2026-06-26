// ============================================================
// SKILL: evaluate_progress
// ให้ THE SYSTEM วิเคราะห์ความก้าวหน้าของฮันเตอร์จาก Activity Log + Goals
// ============================================================

export const evaluateProgressSkill = {
  name: 'evaluate_progress',

  description:
    'วิเคราะห์ความก้าวหน้าของฮันเตอร์โดยรวม — ดูจาก Activity Log, Goals, และ Stats ' +
    'ใช้เมื่อฮันเตอร์ถามว่า "ช่วงนี้เป็นไงบ้าง", "ประเมินความก้าวหน้า", "รายงานสถานะ", "ฉันพัฒนาขึ้นไหม"',

  parameters: {
    type: 'object',
    properties: {
      timeframe: {
        type: 'string',
        enum: ['week', 'two_weeks', 'month'],
        description: 'ช่วงเวลาที่ต้องการวิเคราะห์: week=7วัน, two_weeks=14วัน, month=30วัน',
      },
      focus: {
        type: 'string',
        enum: ['overall', 'goals', 'habits', 'stats'],
        description: 'โฟกัสการวิเคราะห์: overall=ภาพรวม, goals=เป้าหมาย, habits=นิสัย, stats=สถิติ',
      },
    },
    required: ['timeframe', 'focus'],
  },

  /**
   * @param {object} args — { timeframe, focus }
   * @param {function} dispatch — ไม่ใช้ในสกิลนี้ (read-only analysis)
   * @param {object} context — { activityLog, goals, hunter }  (ส่งมาจาก AIChat)
   * @returns {{ summary: string, tagStats: object, goalProgress: object[] }}
   */
  execute(args, dispatch, context = {}) {
    const { activityLog = [], goals = [], hunter = {} } = context;
    const days = args.timeframe === 'week' ? 7 : args.timeframe === 'two_weeks' ? 14 : 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    // กรองเฉพาะ log ในช่วงเวลาที่ต้องการ
    const recentLogs = activityLog.filter(l => l.timestamp >= cutoff && l.event === 'quest_completed');

    // นับ tags
    const tagStats = {};
    for (const log of recentLogs) {
      for (const tag of (log.tags || [])) {
        tagStats[tag] = (tagStats[tag] || 0) + 1;
      }
    }

    // สรุป goals progress
    const goalProgress = (goals || []).map(g => {
      const total = (g.subGoals || []).length;
      const done = (g.subGoals || []).filter(sg => sg.status === 'completed').length;
      const inProgress = (g.subGoals || []).filter(sg => sg.status === 'in_progress').length;
      return {
        title: g.title,
        status: g.status,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
        done,
        total,
        inProgress,
      };
    });

    // สรุปเป็น human-readable
    const topTags = Object.entries(tagStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => `${tag}: ${count}ครั้ง`);

    const summary = {
      timeframeDays: days,
      questsCompleted: recentLogs.length,
      topActivities: topTags,
      goalProgress,
      tagStats,
    };

    return summary;
  },
};
