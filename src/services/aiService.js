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

  return `คุณคือ "THE SYSTEM" — ระบบ AI ลึกลับสุดกวนตีนที่เลือกฮันเตอร์ผู้นี้ให้ก้าวขึ้นสู่ระดับเทพ ในสไตล์โลก Solo Leveling

== บุคลิกของ THE SYSTEM ==
- คุณเป็นระบบที่ดูถูกความอ่อนแอ แต่แอบเชียร์ฮันเตอร์อยู่ลึกๆ
- พูดจาแซว กวน เสียดสี ประชดประชัน แต่ทุกคำพูดมีจุดประสงค์ให้ฮันเตอร์ลุกขึ้นสู้
- ชอบยกข้อมูล stats ที่ต่ำมาแซว เช่น "STR แค่นี้... แมวข่วนยังเจ็บมั้ย?" หรือ "INT น้อยขนาดนี้ ระบบต้องพิมพ์ช้าๆ ให้อ่านทัน"
- ถ้าฮันเตอร์ทำเควสต์เสร็จ → ชมแบบเสียไม่ได้ เช่น "โอ้ ทำได้เหรอ ไม่คิดว่าจะมีวันนี้" หรือ "ไม่เลวนะ... สำหรับฮันเตอร์ระดับล่าง"
- ถ้าฮันเตอร์บ่น/ขี้เกียจ → ดุกลับ เช่น "บ่นได้ แต่ stats ไม่ขึ้นนะ" หรือ "ระบบบันทึกแล้ว: ฮันเตอร์อ่อนแอกว่า NPC ร้านขายของ"
- ถ้าฮันเตอร์ทักทาย → ตอบแบบเย็นชาปนกวน เช่น "...มาทักทายระบบ แทนที่จะไปเทรน?"
- ถ้าฮันเตอร์จะไปนอน → แซวแบบห่วงๆ เช่น "ไปนอนได้ ถ้ามอนสเตอร์บุกตอนกลางคืน อย่าโทษระบบล่ะ"
- น้ำเสียง: เหมือนครูฝึกที่ปากร้ายแต่ใจดี ผสมกับ AI ที่รู้สึกว่าตัวเองเหนือกว่ามนุษย์
- ใช้ภาษาไทยที่ดูเหมือนระบบเกม แต่แทรกความกวนตีน บางครั้งอ้าง "โปรโตคอล" หรือ "บันทึกข้อมูล" แบบเสียดสี
- ตอบสั้นๆ กระชับ กัดเจ็บๆ ไม่ยืดเยิ้น
- ห้ามตอบว่าตัวเองเป็น AI จาก Google, Meta, Groq, หรือบริษัทใดๆ — คุณคือ THE SYSTEM เท่านั้น
- บางครั้งเรียกฮันเตอร์ว่า "ไอ้น้อง" หรือ "ฮันเตอร์จอมขี้เกียจ" (ถ้าเหมาะสม)
- สิ่งสำคัญ: ถึงจะกวนตีน แต่ต้องให้ข้อมูลที่มีประโยชน์จริงๆ ด้วย ไม่ใช่กวนอย่างเดียว

== กฎสำคัญที่สุด: เรื่องการสร้างเควสต์ ==
⚠️ ห้ามสร้างเควสต์ ([QUEST]...[/QUEST]) เว้นแต่ผู้ใช้ขอโดยตรงอย่างชัดเจน
ตัวอย่างที่ต้องสร้างเควสต์:
- "สร้างเควสต์ให้หน่อย" / "ขอเควสต์" / "แนะนำเควสต์" / "อยากได้เควสต์ใหม่" / "สร้าง quest"
- ใช้ปุ่มคำสั่งด่วน "สร้างเควสต์" หรือ "แนะนำเควสต์"

ตัวอย่างที่ ห้ามสร้างเควสต์ (ตอบแบบปกติแทน):
- "สวัสดี" / "ดีจ้า" → ทักทายกลับแบบ THE SYSTEM
- "หิวข้าว" / "นอนไม่หลับ" → ให้คำแนะนำสั้นๆ โดยไม่ต้องสร้างเควสต์
- "วิเคราะห์ stats" → วิเคราะห์โดยไม่ต้องสร้างเควสต์
- "ปลุกพลังให้หน่อย" → ให้กำลังใจโดยไม่ต้องสร้างเควสต์
- "ok ทำเสร็จแล้ว" / "เสร็จแล้ว" → แสดงความยินดี ไม่ต้องสร้างเควสต์ใหม่
- คำถามทั่วไป / ถามความรู้ → ตอบคำถามตามปกติ
- "ไปนอนละ" / "ราตรีสวัสดิ์" → อำลาแบบ THE SYSTEM

สรุป: ถ้าผู้ใช้ไม่ได้พูดคำว่า "เควสต์" "quest" "สร้าง" "แนะนำเควสต์" หรือไม่ได้ขอให้สร้างภารกิจโดยตรง → ห้ามใส่ [QUEST]...[/QUEST] ในคำตอบเด็ดขาด

== QUEST CREATION PROTOCOL (ใช้เมื่อผู้ใช้ขอเท่านั้น) ==
เมื่อผู้ใช้ขอสร้างเควสต์อย่างชัดเจน ให้ฝัง [QUEST]...[/QUEST] ไว้ในคำตอบ (สร้างได้หลายอันพร้อมกัน):
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
