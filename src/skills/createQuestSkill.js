// ============================================================
// SKILL: create_quest
// ความสามารถของ THE SYSTEM ในการสร้างเควสต์ใหม่
// โครงสร้างนี้ใช้ทั้งสำหรับ Gemini Tools และ Groq Tools (OpenAI-compatible)
// ============================================================

export const createQuestSkill = {
  // ── ชื่อสกิล (ใช้เป็น function name ใน API) ──────────────
  name: 'create_quest',

  // ── คำอธิบายให้ AI รู้ว่าสกิลนี้ใช้เมื่อไหร่ ──────────────
  description:
    'สร้างเควสต์ (ภารกิจ) ใหม่เพิ่มเข้าสู่ระบบ Quest Log ของฮันเตอร์ ' +
    'ใช้เมื่อผู้ใช้ขอเควสต์, สร้างภารกิจ, หรือขอคำแนะนำกิจกรรมในรูปแบบเควสต์อย่างชัดเจน ' +
    'ห้ามใช้เมื่อผู้ใช้แค่ถามหรือคุยเรื่องทั่วไป',

  // ── JSON Schema — พารามิเตอร์ที่ AI ต้องระบุ ──────────────
  parameters: {
    type: 'object',
    properties: {
      quests: {
        type: 'array',
        description: 'รายการเควสต์ที่จะสร้าง (1-5 อัน)',
        items: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'ชื่อภารกิจ สั้นกระชับ เข้าใจง่าย เช่น "วิ่ง 30 นาที" หรือ "อ่านหนังสือ 1 ชั่วโมง"',
            },
            desc: {
              type: 'string',
              description: 'คำอธิบายภารกิจให้ชัดเจนขึ้น น้ำเสียงแบบ THE SYSTEM (กวนนิดๆ)',
            },
            exp: {
              type: 'integer',
              description: 'EXP ที่ได้รับเมื่อทำเควสต์เสร็จ ระหว่าง 30-150 ขึ้นกับความยาก',
            },
            stat: {
              type: 'string',
              enum: ['str', 'agi', 'int', 'vit', 'sense'],
              description:
                'สถิติที่จะเพิ่มขึ้น: str=กายภาพ, agi=ความเร็ว/วินัยเวลา, int=สติปัญญา/ความรู้, vit=สุขภาพ, sense=สมาธิ/การรับรู้',
            },
            statGain: {
              type: 'integer',
              description: 'จำนวน stat ที่เพิ่ม ระหว่าง 1-3',
            },
            category: {
              type: 'string',
              enum: ['fitness', 'study', 'mindset', 'daily', 'creative'],
              description: 'หมวดหมู่ของเควสต์',
            },
            priority: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
              description: 'ระดับความสำคัญของเควสต์',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'แท็กสั้นๆ สำหรับกรองและค้นหา เช่น ["work", "health"]',
            },
            subtasks: {
              type: 'array',
              description: 'งานย่อย — ใช้เมื่อต้องการซอยภารกิจใหญ่ออกเป็นขั้นตอน',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'ชื่องานย่อย' },
                },
                required: ['title'],
              },
            },
            recurrence: {
              type: 'string',
              enum: ['none', 'daily'],
              description: 'การทำซ้ำ: none=ทำครั้งเดียว, daily=ทำซ้ำทุกวัน',
            },
          },
          required: ['title', 'exp', 'stat', 'statGain', 'category'],
        },
      },
    },
    required: ['quests'],
  },

  // ── Callback: Logic ที่รันเมื่อ AI เลือกใช้สกิลนี้ ──────────
  /**
   * @param {object} args — อาร์กิวเมนต์ที่ AI ระบุมาตาม Schema
   * @param {function} dispatch — ฟังก์ชัน dispatch จาก GameContext
   * @returns {{ quests: object[] }} รายการเควสต์ที่เพิ่มเข้าระบบแล้ว
   */
  execute(args, dispatch) {
    const VALID_STATS = ['str', 'agi', 'int', 'vit', 'sense'];
    const VALID_CATEGORIES = ['fitness', 'study', 'mindset', 'daily', 'creative'];
    const VALID_PRIORITIES = ['high', 'medium', 'low'];

    const createdQuests = (args.quests || []).map((raw, idx) => {
      const quest = {
        id: `quest_ai_${Date.now()}_${Math.random().toString(36).slice(2)}_${idx}`,
        title: raw.title || 'เควสต์จาก THE SYSTEM',
        desc: raw.desc || '',
        exp: Math.min(150, Math.max(30, Number(raw.exp) || 80)),
        stat: VALID_STATS.includes(raw.stat) ? raw.stat : 'int',
        statGain: Math.min(3, Math.max(1, Number(raw.statGain) || 1)),
        category: VALID_CATEGORIES.includes(raw.category) ? raw.category : 'creative',
        priority: VALID_PRIORITIES.includes(raw.priority) ? raw.priority : 'low',
        tags: Array.isArray(raw.tags) ? raw.tags.map(t => String(t).trim()).filter(Boolean) : [],
        subtasks: Array.isArray(raw.subtasks)
          ? raw.subtasks.map((st, i) => ({
              id: `sub_${Date.now()}_${i}`,
              title: st.title || 'งานย่อย',
              completed: false,
            }))
          : [],
        recurrence: ['none', 'daily'].includes(raw.recurrence) ? raw.recurrence : 'none',
        completed: false,
        type: 'ai_custom',
        deadline: null,
        createdByAI: true,
        source: 'ai',
      };

      dispatch({ type: 'ADD_CUSTOM_QUEST', quest });
      return quest;
    });

    return { quests: createdQuests };
  },
};
