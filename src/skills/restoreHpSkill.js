// ============================================================
// SKILL: restore_hp
// THE SYSTEM ฟื้นฟู HP ให้ฮันเตอร์เมื่อดูแลตัวเองดี
// ============================================================

export const restoreHpSkill = {
  name: 'restore_hp',

  description:
    'ฟื้นฟู HP ให้ฮันเตอร์ผ่านระบบเกม ' +
    'ใช้เมื่อ: ฮันเตอร์บอกว่านอนหลับพักผ่อนเพียงพอ, ดื่มน้ำ, ออกกำลังกาย, ' +
    'กินอาหารดี, หรือทำกิจกรรมที่ส่งผลต่อสุขภาพในเชิงบวกอย่างชัดเจน ' +
    'ห้ามใช้กับคำถามทั่วไป — ต้องมีการรายงานกิจกรรมดูแลสุขภาพจริงๆ',

  parameters: {
    type: 'object',
    properties: {
      amount: {
        type: 'integer',
        description: 'HP ที่จะฟื้นฟู ระหว่าง 5-30 ขึ้นกับกิจกรรมที่ทำ (นอนหลับ=20, ดื่มน้ำ=5, ออกกำลังกาย=15)',
      },
      reason: {
        type: 'string',
        description: 'เหตุผลของการฟื้นฟู น้ำเสียง THE SYSTEM แบบ "ประกาศรางวัล" เช่น "ระบบตรวจพบ: ฮันเตอร์บำรุงร่างกายอย่างสม่ำเสมอ"',
      },
      activity: {
        type: 'string',
        description: 'ชื่อกิจกรรมที่ทำ เช่น "SLEEP_RESTORED", "HYDRATION_BONUS", "EXERCISE_RECOVERY"',
      },
    },
    required: ['amount', 'reason', 'activity'],
  },

  /**
   * @param {object} args
   * @param {function} dispatch
   * @returns {{ amount: number, reason: string, activity: string }}
   */
  execute(args, dispatch) {
    const amount = Math.min(30, Math.max(5, Number(args.amount) || 10));
    const reason = args.reason || 'ระบบตรวจพบ: ฮันเตอร์ดูแลตัวเองดีขึ้น';
    const activity = args.activity || 'RECOVERY_BONUS';

    dispatch({
      type: 'RESTORE_HP',
      amount,
    });

    return { amount, reason, activity };
  },
};
