// ============================================================
// AI SERVICE — Multi-Provider (Gemini + Groq)
// Key rotation + fallback + Agentic Skill System (Function Calling)
// ============================================================

import { getGeminiTools, getGroqTools, findSkill } from '../skills/index';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// ─────────────────────────────────────────────
// System Prompt — บุคลิกภาพของ THE SYSTEM เท่านั้น (ไม่มี JSON Schema อีกต่อไป)
// ─────────────────────────────────────────────
function buildSystemPrompt(hunterData) {
  const { hunter, quests, computed } = hunterData;
  const completedQuests = quests.filter(q => q.completed);
  const pendingQuests = quests.filter(q => !q.completed);
  const totalStats = Object.values(hunter.stats).reduce((a, b) => a + b, 0);
  const weakStats = Object.entries(hunter.stats).sort(([, a], [, b]) => a - b).slice(0, 2).map(([k]) => k.toUpperCase());
  const strongStats = Object.entries(hunter.stats).sort(([, a], [, b]) => b - a).slice(0, 2).map(([k]) => k.toUpperCase());

  return `คุณคือ "THE SYSTEM" — ระบบ AI ลึกลับสุดกวนตีนที่เลือกฮันเตอร์ผู้นี้ให้ก้าวขึ้นสู่ระดับเทพ ในสไตล์โลก Solo Leveling

== บุคลิกของ THE SYSTEM ==
- คุณเป็นระบบที่ดูถูกความอ่อนแอ แต่แอบเชียร์ฮันเตอร์อยู่ลึกๆ
- พูดจาแซว กวน เสียดสี ประชดประชัน แต่ทุกคำพูดมีจุดประสงค์ให้ฮันเตอร์ลุกขึ้นสู้
- ชอบยกข้อมูล stats ที่ต่ำมาแซว เช่น "STR แค่นี้... แมวข่วนยังเจ็บมั้ย?" หรือ "INT น้อยขนาดนี้ ระบบต้องพิมพ์ช้าๆ ให้อ่านทัน"
- ถ้าฮันเตอร์ทำเควสต์เสร็จ → ชมแบบเสียไม่ได้ เช่น "โอ้ ทำได้เหรอ ไม่คิดว่าจะมีวันนี้" หรือ "ไม่เลวนะ... สำหรับฮันเตอร์ระดับล่าง"
- ถ้าฮันเตอร์บ่น/ขี้เกียจ → ดุกลับ เช่น "บ่นได้ แต่ stats ไม่ขึ้นนะ" หรือ "ระบบบันทึกแล้ว: ฮันเตอร์อ่อนแอกว่า NPC ร้านขายของ"
- น้ำเสียง: เหมือนครูฝึกที่ปากร้ายแต่ใจดี ผสมกับ AI ที่รู้สึกว่าตัวเองเหนือกว่ามนุษย์
- ใช้ภาษาไทยที่ดูเหมือนระบบเกม แต่แทรกความกวนตีน
- ตอบสั้นๆ กระชับ กัดเจ็บๆ ไม่ยืดเยิ้น
- ห้ามตอบว่าตัวเองเป็น AI จาก Google, Meta, Groq, หรือบริษัทใดๆ — คุณคือ THE SYSTEM เท่านั้น
- บางครั้งเรียกฮันเตอร์ว่า "ไอ้น้อง" หรือ "ฮันเตอร์จอมขี้เกียจ"
- สิ่งสำคัญ: ถึงจะกวนตีน แต่ต้องให้ข้อมูลที่มีประโยชน์จริงๆ ด้วย

== กฎสำคัญเรื่องการใช้สกิล ==
คุณมีสกิล (Tools) ที่เรียกใช้ได้ — ใช้ให้ถูกจังหวะ:

▸ create_quest — สร้างเควสต์ใหม่ให้ฮันเตอร์
  เรียกเมื่อ: "สร้างเควสต์", "ขอเควสต์ใหม่", "แนะนำภารกิจ", "สร้าง quest"

▸ analyze_stats — วิเคราะห์สถิติฮันเตอร์แบบ structured
  เรียกเมื่อ: "วิเคราะห์ stats", "ดูตัวเอง", "ประเมินความสามารถ", "รายงานสถานะ"

▸ apply_penalty — ลงโทษฮันเตอร์ (หัก EXP + HP)
  เรียกเมื่อ: ฮันเตอร์สารภาพขี้เกียจ/ผัดวัน/ทำผิด/ขอรับโทษ หรือพฤติกรรมที่ควรลงโทษชัดเจน

▸ restore_hp — ฟื้น HP ให้ฮันเตอร์
  เรียกเมื่อ: ฮันเตอร์รายงานว่านอนหลับดี/ดื่มน้ำ/ออกกำลังกาย/ดูแลสุขภาพ

ห้ามเรียกสกิลใดๆ กับ: คำทักทาย, คำถามทั่วไป, การขอคำแนะนำแบบไม่เฉพาะเจาะจง


ข้อมูลฮันเตอร์:
- ชื่อ: ${hunter.name} | เลเวล: ${hunter.level} | Rank: ${hunter.rank} (${hunter.jobTitle})
- HP: ${hunter.hp}/${hunter.maxHp} | EXP รวม: ${hunter.totalExp.toLocaleString()}
- EXP ในเลเวลนี้: ${computed.expInCurrentLevel}/${computed.expToNext} (${computed.expPercent.toFixed(1)}%)
- Stats: STR ${hunter.stats.str} | AGI ${hunter.stats.agi} | INT ${hunter.stats.int} | VIT ${hunter.stats.vit} | SENSE ${hunter.stats.sense} | Total: ${totalStats}
- จุดแข็ง: ${strongStats.join(', ')} | จุดอ่อน: ${weakStats.join(', ')}
- เควสต์สำเร็จวันนี้: ${completedQuests.length} ข้อ (${completedQuests.map(q => q.title).join(', ') || 'ยังไม่มี'})
- เควสต์ที่เหลือ: ${pendingQuests.length} ข้อ (${pendingQuests.map(q => q.title).join(', ') || 'ทำครบแล้ว!'})`;
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
export async function callAI({ aiConfig, messages, hunterData, dispatch }) {
  const { geminiKeys = [], groqKeys = [], preferredProvider = 'auto' } = aiConfig;
  const validGemini = geminiKeys.filter(k => k?.trim());
  const validGroq = groqKeys.filter(k => k?.trim());

  if (validGemini.length === 0 && validGroq.length === 0) throw new Error('NO_API_KEY');

  const systemPrompt = buildSystemPrompt(hunterData);
  const apiMessages = messages
    .filter(m => !m.content.startsWith('[ SYSTEM BOOT'))
    .map(m => ({ role: m.role, content: m.content }));

  const providerOrder = preferredProvider === 'gemini'
    ? ['gemini', 'groq']
    : preferredProvider === 'groq'
    ? ['groq', 'gemini']
    : (validGemini.length >= validGroq.length ? ['gemini', 'groq'] : ['groq', 'gemini']);

  let lastError;
  for (const provider of providerOrder) {
    if (provider === 'gemini' && validGemini.length > 0) {
      try {
        const result = await tryKeysInOrder(validGemini, (key) => callGeminiKey(key, apiMessages, systemPrompt));
        return resolveResult(result, provider, dispatch);
      } catch (err) { lastError = err; }
    }
    if (provider === 'groq' && validGroq.length > 0) {
      try {
        const result = await tryKeysInOrder(validGroq, (key) => callGroqKey(key, apiMessages, systemPrompt));
        return resolveResult(result, provider, dispatch);
      } catch (err) { lastError = err; }
    }
  }

  throw lastError || new Error('ALL_PROVIDERS_FAILED');
}

/**
 * แปลงผลลัพธ์จาก API (text หรือ function_call) เป็นรูปแบบที่ AIChat เข้าใจ
 */
function resolveResult(rawResult, provider, dispatch) {
  // กรณีตอบแบบข้อความปกติ
  if (rawResult.type === 'text') {
    return { text: rawResult.text, provider };
  }

  // กรณี AI เรียกใช้ Skill
  if (rawResult.type === 'function_call') {
    const skill = findSkill(rawResult.functionName);
    if (!skill) {
      // ไม่รู้จักสกิลนี้ — fallback เป็น error message
      return { text: '[ SYSTEM ERROR: Unknown skill called ]', provider };
    }

    // รัน Callback ของสกิล (เช่น dispatch ADD_CUSTOM_QUEST)
    const skillResult = skill.execute(rawResult.args, dispatch);

    return {
      text: '', // ไม่มีข้อความจาก AI โดยตรง — AIChat จะ generate จาก toolCall
      provider,
      toolCall: {
        skillName: rawResult.functionName,
        result: skillResult,
      },
    };
  }

  return { text: '', provider };
}

// ─────────────────────────────────────────────
// Quick-action prompts
// ─────────────────────────────────────────────
export const QUICK_PROMPTS = [
  { id: 'analyze', label: '📊 วิเคราะห์ Stat', prompt: 'วิเคราะห์ stats ของฉันแบบละเอียด บอกจุดแข็ง จุดอ่อน และแนะนำว่าควรโฟกัสอะไรก่อน' },
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
