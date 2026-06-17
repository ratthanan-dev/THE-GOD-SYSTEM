// ============================================================
// SKILL: apply_penalty
// THE SYSTEM ลงโทษฮันเตอร์โดยตรง — หัก EXP และ HP
// ============================================================

export const applyPenaltySkill = {
  name: 'apply_penalty',

  description:
    'ลงโทษฮันเตอร์โดยการหัก EXP และ HP ผ่านระบบเกม ' +
    'ใช้เมื่อ: ฮันเตอร์สารภาพว่าขี้เกียจ/ผัดวันประกันพรุ่ง/ไม่ทำตามแผน/ขอโทษระบบ ' +
    'หรือเมื่อระบบตรวจพบพฤติกรรมที่ควรรับโทษอย่างชัดเจน ' +
    'ห้ามใช้กับคำถามทั่วไป — ต้องมีการสารภาพความผิดหรือขอรับโทษจริงๆ',

  parameters: {
    type: 'object',
    properties: {
      exp_penalty: {
        type: 'integer',
        description: 'EXP ที่จะหัก ระหว่าง 10-200 ขึ้นกับความร้ายแรงของความผิด',
      },
      hp_penalty: {
        type: 'integer',
        description: 'HP ที่จะหัก ระหว่าง 5-30 ขึ้นกับความร้ายแรง',
      },
      reason: {
        type: 'string',
        description: 'เหตุผลของการลงโทษ น้ำเสียง THE SYSTEM แบบ "ประกาศโทษ" เช่น "ระบบตรวจพบ: ผัดวันประกันพรุ่ง 3 วันติด"',
      },
      crime: {
        type: 'string',
        description: 'ชื่อ "ความผิด" แบบเป็นทางการสไตล์เกม เช่น "LAZINESS DETECTED", "MISSION ABANDONED"',
      },
    },
    required: ['exp_penalty', 'hp_penalty', 'reason', 'crime'],
  },

  /**
   * @param {object} args
   * @param {function} dispatch
   * @returns {{ expPenalty: number, hpPenalty: number, reason: string, crime: string }}
   */
  execute(args, dispatch) {
    const expPenalty = Math.min(200, Math.max(10, Number(args.exp_penalty) || 30));
    const hpPenalty = Math.min(30, Math.max(5, Number(args.hp_penalty) || 10));
    const reason = args.reason || 'ระบบตรวจพบพฤติกรรมที่ไม่เหมาะสม';
    const crime = args.crime || 'VIOLATION_DETECTED';

    dispatch({
      type: 'APPLY_PENALTY',
      expPenalty,
      hpPenalty,
      reason,
    });

    return { expPenalty, hpPenalty, reason, crime };
  },
};
