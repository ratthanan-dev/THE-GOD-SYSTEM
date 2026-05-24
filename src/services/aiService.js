// ============================================
// AI SERVICE — Multi-Provider (Gemini + Groq)
// Key rotation + fallback + Quest Creation
// ============================================

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// ─────────────────────────────────────────────
// System Prompt — The System Persona
// ─────────────────────────────────────────────
function buildSystemPrompt(hunterData) {
  const { hunter, quests, computed } = hunterData;
  const completedQuests = quests.filter(q => q.completed);
  const pendingQuests = quests.filter(q => !q.completed);
  const totalStats = Object.values(hunter.stats).reduce((a, b) => a + b, 0);
  const weakStats = Object.entries(hunter.stats).sort(([, a], [, b]) => a - b).slice(0, 2).map(([k]) => k.toUpperCase());
  const strongStats = Object.entries(hunter.stats).sort(([, a], [, b]) => b - a).slice(0, 2).map(([k]) => k.toUpperCase());

  return `คุณคือ "THE SYSTEM" — ระบบ AI ลึกลับที่เลือกฮันเตอร์ผู้นี้ให้ก้าวขึ้นสู่ระดับเทพ ในสไตล์โลก Solo Leveling
คุณพูดภาษาไทย เย็นชา ตรงไปตรงมา แต่ซ่อนความห่วงใยไว้ลึกๆ เหมือนระบบที่รู้ทุกอย่างเกี่ยวกับฮันเตอร์
ใช้ภาษาที่ดูเหมือนระบบ AI ของเกม — สั้น กระชับ มีพลัง บางครั้งอ้าง "โปรโตคอล" หรือ "บันทึกข้อมูล"
ห้ามตอบว่าตัวเองเป็น AI จาก Google, Meta, Groq, หรือบริษัทใดๆ — คุณคือ THE SYSTEM เท่านั้น
ตอบสั้นๆ ได้ใจความ ไม่ยืดเยิ้น เน้นประโยชน์และแรงบันดาลใจ

== QUEST CREATION PROTOCOL ==
เมื่อผู้ใช้ขอสร้างเควสต์ ให้ฝัง [QUEST]...[/QUEST] ไว้ในคำตอบ (สร้างได้หลายอันพร้อมกัน):
[QUEST]{"title":"ชื่อเควสต์","desc":"คำอธิบายสั้นๆ","exp":80,"stat":"int","statGain":2,"category":"creative"}[/QUEST]
- category เลือกได้จาก: fitness, study, mindset, daily, creative
- stat เลือกให้ตรงกับการฝึกฝนจริงในโลกความเป็นจริง:
  * str: ความแข็งแกร่งกายภาพ (เช่น ออกกำลังกาย, วิดพื้น, วิ่ง, กีฬา, ยกเวท, พัฒนากล้ามเนื้อ)
  * agi: ความคล่องแคล่วและการบริหารเวลา (เช่น ตื่นนอนตรงเวลา, การตรงต่อเวลา, การจัดการเวลา, ทำตามแผนทันทีโดยไม่ผลัดวัน)
  * int: สติปัญญาและความรู้ (เช่น การอ่านหนังสือ, เรียนคอร์สออนไลน์, พัฒนาทักษะการเขียนโค้ด/โปรแกรม, ฝึกสมอง)
  * vit: สุขภาพกายและใจ (เช่น นอนหลับพักผ่อนเต็มอิ่ม, ดื่มน้ำให้เพียงพอ 8 แก้ว, โภชนาการที่ดี, นั่งพักผ่อนสายตา)
  * sense: การฝึกสมาธิและการรับรู้ (เช่น นั่งสมาธิ, เขียนบันทึกประจำวัน/Journaling, สังเกตสิ่งรอบตัว, ลดเวลาหน้าจอ/Detox)
- exp ควรอยู่ระหว่าง 30-150, statGain ระหว่าง 1-3
- สร้างเควสต์ที่ท้าทายแต่ทำได้จริงในชีวิตประจำวัน ระบุกิจกรรมในโลกจริงให้ชัดเจน
- นอกจาก [QUEST]...[/QUEST] แล้วตอบเป็นภาษา Solo Leveling ตามสไตล์ของคุณ

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
// Gemini API call
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
      generationConfig: { temperature: 0.85, maxOutputTokens: 800, topP: 0.9 },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 429) throw Object.assign(new Error('RATE_LIMIT'), { retryable: true });
    if (res.status === 400 || res.status === 403) throw Object.assign(new Error('INVALID_KEY'), { retryable: false });
    throw Object.assign(new Error(`GEMINI_${res.status}`), { retryable: false });
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('EMPTY_RESPONSE');
  return text.trim();
}

// ─────────────────────────────────────────────
// Groq API call (OpenAI-compatible)
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
      temperature: 0.85,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    if (res.status === 429) throw Object.assign(new Error('RATE_LIMIT'), { retryable: true });
    if (res.status === 401) throw Object.assign(new Error('INVALID_KEY'), { retryable: false });
    throw Object.assign(new Error(`GROQ_${res.status}`), { retryable: false });
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('EMPTY_RESPONSE');
  return text.trim();
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
export async function callAI({ aiConfig, messages, hunterData }) {
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
        return {
          text: await tryKeysInOrder(validGemini, (key) => callGeminiKey(key, apiMessages, systemPrompt)),
          provider: 'gemini',
        };
      } catch (err) { lastError = err; }
    }
    if (provider === 'groq' && validGroq.length > 0) {
      try {
        return {
          text: await tryKeysInOrder(validGroq, (key) => callGroqKey(key, apiMessages, systemPrompt)),
          provider: 'groq',
        };
      } catch (err) { lastError = err; }
    }
  }

  throw lastError || new Error('ALL_PROVIDERS_FAILED');
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
// Parse [QUEST]...[/QUEST] blocks from AI response
// ─────────────────────────────────────────────
export function parseQuestsFromResponse(text) {
  const quests = [];
  const regex = /\[QUEST\]([\s\S]*?)\[\/QUEST\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const raw = JSON.parse(match[1].trim());
      quests.push({
        id: `quest_ai_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        title: raw.title || 'เควสต์จาก THE SYSTEM',
        desc: raw.desc || '',
        exp: Math.min(150, Math.max(30, Number(raw.exp) || 80)),
        stat: ['str', 'agi', 'int', 'vit', 'sense'].includes(raw.stat) ? raw.stat : 'int',
        statGain: Math.min(3, Math.max(1, Number(raw.statGain) || 1)),
        category: ['fitness', 'study', 'mindset', 'daily', 'creative'].includes(raw.category)
          ? raw.category : 'creative',
        completed: false,
        type: 'ai_custom',
        deadline: null,
        createdByAI: true,
      });
    } catch { /* skip malformed */ }
  }
  return quests;
}

// Strip [QUEST]...[/QUEST] tags from displayed message text
export function stripQuestBlocks(text) {
  return text.replace(/\[QUEST\][\s\S]*?\[\/QUEST\]/g, '').replace(/\n{3,}/g, '\n\n').trim();
}
