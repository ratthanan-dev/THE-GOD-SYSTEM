// ============================================================
// SKILL: analyze_stats
// THE SYSTEM วิเคราะห์สถิติฮันเตอร์แบบ Structured
// ============================================================

export const analyzeStatsSkill = {
  name: 'analyze_stats',

  description:
    'วิเคราะห์ Stats ของฮันเตอร์แบบละเอียด คืนรายงาน structured ที่ประกอบด้วยจุดแข็ง จุดอ่อน ' +
    'และคำแนะนำแผนพัฒนาเฉพาะบุคคล ' +
    'ใช้เมื่อผู้ใช้ขอวิเคราะห์ stats, ดูภาพรวมตัวเอง, หรือต้องการรายงานความก้าวหน้า',

  parameters: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: 'ข้อความสรุปภาพรวมสั้นๆ น้ำเสียง THE SYSTEM (กวนๆ แต่ตรงประเด็น) ≤ 3 ประโยค',
      },
      strengths: {
        type: 'array',
        description: 'จุดแข็งของฮันเตอร์ 1-3 ข้อ',
        items: {
          type: 'object',
          properties: {
            stat: { type: 'string', enum: ['str', 'agi', 'int', 'vit', 'sense'], description: 'ค่า stat ที่เด่น' },
            label: { type: 'string', description: 'ชื่อย่อ stat เช่น STR, AGI' },
            note: { type: 'string', description: 'คำอธิบายสั้นๆ ว่าดีอย่างไร' },
          },
          required: ['stat', 'label', 'note'],
        },
      },
      weaknesses: {
        type: 'array',
        description: 'จุดอ่อนที่ควรพัฒนา 1-3 ข้อ',
        items: {
          type: 'object',
          properties: {
            stat: { type: 'string', enum: ['str', 'agi', 'int', 'vit', 'sense'], description: 'ค่า stat ที่ต่ำ' },
            label: { type: 'string', description: 'ชื่อย่อ stat' },
            note: { type: 'string', description: 'คำอธิบายว่าอ่อนแออย่างไรและผลกระทบ' },
          },
          required: ['stat', 'label', 'note'],
        },
      },
      recommendations: {
        type: 'array',
        description: 'คำแนะนำเฉพาะ 2-4 ข้อ ควรทำอะไรเพื่อพัฒนาตนเอง',
        items: {
          type: 'string',
          description: 'คำแนะนำ 1 ข้อ สั้น กระชับ ทำได้จริงในชีวิตประจำวัน',
        },
      },
      rank_progress: {
        type: 'string',
        description: 'ความคิดเห็นเกี่ยวกับ Rank ปัจจุบันและเส้นทางสู่ Rank ถัดไป',
      },
    },
    required: ['summary', 'strengths', 'weaknesses', 'recommendations'],
  },

  /**
   * @param {object} args
   * @param {function} dispatch — ไม่ได้ใช้ในสกิลนี้ (read-only)
   * @returns {{ report: object }}
   */
  execute(args) {
    // สกิลนี้ไม่ต้อง dispatch อะไร — แค่ส่งข้อมูลกลับให้ UI แสดงผล
    return {
      report: {
        summary: args.summary || '',
        strengths: args.strengths || [],
        weaknesses: args.weaknesses || [],
        recommendations: args.recommendations || [],
        rank_progress: args.rank_progress || '',
      },
    };
  },
};
