// ============================================================
// MEMORY SERVICE — Long-Term Memory สำหรับ THE SYSTEM
// สกัด จัดเก็บ และดึงความทรงจำข้ามแชท ข้ามวัน ข้ามเดือน
// ============================================================

const MEMORY_STORAGE_KEY = 'god_system_memories';
const MAX_MEMORIES = 30; // จำกัดจำนวนความทรงจำเพื่อไม่ให้ Token บวมเกินไป
const MIN_MESSAGES_FOR_EXTRACTION = 4; // ต้องมีอย่างน้อย 4 ข้อความ (2 รอบโต้ตอบ) ถึงจะสกัด

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ─────────────────────────────────────────────
// Storage Helpers
// ─────────────────────────────────────────────

function loadMemoryStore() {
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    facts: [],
    summaries: [],
    lastExtractedSessionId: null,
    totalExtractions: 0,
  };
}

function saveMemoryStore(store) {
  try {
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error('Memory save failed:', err);
  }
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * สกัดข้อมูลสำคัญจากบทสนทนา โดยใช้ AI (Gemini)
 * รันเงียบๆ เบื้องหลัง ไม่บล็อค UI
 * 
 * @param {Array} messages — ข้อความในแชทปัจจุบัน
 * @param {object} aiConfig — config ที่มี geminiKeys
 * @param {string} sessionId — ID ของ chat session ปัจจุบัน
 * @returns {Promise<{extracted: number}>}
 */
export async function extractMemories(messages, aiConfig, sessionId) {
  // ไม่สกัดถ้าข้อความน้อยเกินไป
  if (!messages || messages.length < MIN_MESSAGES_FOR_EXTRACTION) {
    return { extracted: 0 };
  }

  // ไม่สกัดซ้ำถ้า session เดียวกันและจำนวนข้อความเท่าเดิม
  const store = loadMemoryStore();
  if (store.lastExtractedSessionId === `${sessionId}_${messages.length}`) {
    return { extracted: 0 };
  }

  // หา Gemini key ที่ใช้ได้
  const geminiKeys = (aiConfig?.geminiKeys || []).filter(k => k?.trim());
  if (geminiKeys.length === 0) {
    return { extracted: 0 }; // ไม่มี key ก็ข้ามไป ไม่ error
  }

  // ตัดเอาเฉพาะข้อความล่าสุด (ไม่เกิน 20 ข้อความ) เพื่อประหยัด Token
  const recentMessages = messages
    .filter(m => !m.content.startsWith('[ SYSTEM BOOT'))
    .slice(-20);

  const conversationText = recentMessages
    .map(m => `${m.role === 'user' ? 'ฮันเตอร์' : 'THE SYSTEM'}: ${m.content}`)
    .join('\n');

  const extractionPrompt = `คุณเป็นระบบสกัดข้อมูล (Memory Extractor) ของ THE SYSTEM
จากบทสนทนาต่อไปนี้ ให้สกัดข้อมูลสำคัญเกี่ยวกับ "ฮันเตอร์" (ผู้ใช้) ออกมา

กฎ:
- สกัดเฉพาะข้อมูลที่เป็นข้อเท็จจริงถาวรหรือกึ่งถาวร (ไม่ใช่เรื่องชั่วคราว)
- หมวดหมู่ที่ต้องจับ: personal (ชื่อ/อายุ/อาชีพ), goal (เป้าหมาย), habit (นิสัย/กิจวัตร), preference (ความชอบ), concern (ความกังวล/ปัญหา), achievement (สิ่งที่ทำสำเร็จ)
- เขียนเป็นประโยคสั้นๆ กระชับ ภาษาไทย
- ถ้าไม่มีข้อมูลสำคัญ ให้ตอบ: []
- ตอบเป็น JSON array เท่านั้น ห้ามมีข้อความอื่น

ตัวอย่าง output:
[
  {"category": "personal", "content": "ฮันเตอร์ชื่อต่อ อายุ 21 ปี"},
  {"category": "goal", "content": "อยากเป็นโปรแกรมเมอร์ Full-Stack"},
  {"category": "habit", "content": "ชอบดื่มกาแฟตอนเช้า นอนดึกบ่อย"}
]

=== บทสนทนา ===
${conversationText}

=== สกัดข้อมูล (JSON array เท่านั้น) ===`;

  // ลองสกัดด้วย Gemini key แรกที่ใช้ได้
  for (const apiKey of geminiKeys) {
    try {
      const res = await fetch(`${GEMINI_URL}?key=${apiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: extractionPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
        }),
      });

      if (!res.ok) continue; // ลอง key ถัดไป

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // แกะ JSON จากคำตอบ
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) continue;

      let extracted;
      try {
        extracted = JSON.parse(jsonMatch[0]);
      } catch {
        continue;
      }

      if (!Array.isArray(extracted) || extracted.length === 0) {
        // AI บอกว่าไม่มีข้อมูลสำคัญ — อัปเดต marker แล้วจบ
        store.lastExtractedSessionId = `${sessionId}_${messages.length}`;
        saveMemoryStore(store);
        return { extracted: 0 };
      }

      // เพิ่มความทรงจำใหม่ (ไม่ซ้ำกับที่มีอยู่แล้ว)
      let addedCount = 0;
      for (const item of extracted) {
        if (!item.content || !item.category) continue;

        // เช็คซ้ำแบบหลวมๆ (ถ้า content คล้ายกัน > 70% ถือว่าซ้ำ)
        const isDuplicate = store.facts.some(f =>
          similarity(f.content, item.content) > 0.7
        );

        if (!isDuplicate) {
          store.facts.push({
            id: `mem_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            category: item.category,
            content: item.content.trim(),
            timestamp: Date.now(),
            sourceSessionId: sessionId,
          });
          addedCount++;
        }
      }

      // ตัดความทรงจำเก่าถ้าเกิน limit
      if (store.facts.length > MAX_MEMORIES) {
        // เก็บอันใหม่สุดไว้
        store.facts = store.facts
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_MEMORIES);
      }

      store.lastExtractedSessionId = `${sessionId}_${messages.length}`;
      store.totalExtractions++;
      saveMemoryStore(store);

      console.log(`[Memory] Extracted ${addedCount} new memories`);
      return { extracted: addedCount };

    } catch (err) {
      console.warn('[Memory] Extraction failed with key, trying next:', err.message);
      continue;
    }
  }

  return { extracted: 0 };
}

/**
 * สร้างข้อความ "สรุปความทรงจำ" สำหรับแปะใน System Prompt
 * @returns {string} — ข้อความสรุป หรือ '' ถ้าไม่มีความทรงจำ
 */
export function buildMemoryContext() {
  const store = loadMemoryStore();
  if (!store.facts || store.facts.length === 0) return '';

  // จัดกลุ่มตาม category
  const grouped = {};
  for (const fact of store.facts) {
    if (!grouped[fact.category]) grouped[fact.category] = [];
    grouped[fact.category].push(fact.content);
  }

  const categoryLabels = {
    personal: '👤 ข้อมูลส่วนตัว',
    goal: '🎯 เป้าหมาย',
    habit: '🔄 นิสัย/กิจวัตร',
    preference: '💜 ความชอบ',
    concern: '⚠️ ความกังวล/ปัญหา',
    achievement: '🏆 สิ่งที่ทำสำเร็จ',
  };

  let context = '\n\n== ความทรงจำระยะยาวของ THE SYSTEM ==\n';
  context += 'ข้อมูลต่อไปนี้คือสิ่งที่ระบบจำได้จากบทสนทนาก่อนหน้า:\n';

  for (const [cat, items] of Object.entries(grouped)) {
    const label = categoryLabels[cat] || `📝 ${cat}`;
    context += `\n${label}:\n`;
    for (const item of items) {
      context += `◆ ${item}\n`;
    }
  }

  context += '\nใช้ข้อมูลเหล่านี้อ้างอิงเมื่อเหมาะสม — อย่ายกมาพูดทุกประโยค แต่ให้แสดงว่าจำได้เมื่อฮันเตอร์พูดถึงเรื่องเกี่ยวข้อง';

  return context;
}

/**
 * ดึงความทรงจำทั้งหมดมาแสดง (สำหรับ Settings Panel)
 * @returns {Array} — รายการ facts
 */
export function getAllMemories() {
  const store = loadMemoryStore();
  return store.facts || [];
}

/**
 * ดึงข้อมูลสถิติ Memory
 * @returns {{ totalFacts: number, totalExtractions: number }}
 */
export function getMemoryStats() {
  const store = loadMemoryStore();
  return {
    totalFacts: (store.facts || []).length,
    totalExtractions: store.totalExtractions || 0,
  };
}

/**
 * ลบความทรงจำ 1 อัน
 * @param {string} memoryId
 */
export function deleteMemory(memoryId) {
  const store = loadMemoryStore();
  store.facts = (store.facts || []).filter(f => f.id !== memoryId);
  saveMemoryStore(store);
}

/**
 * ล้างความทรงจำทั้งหมด
 */
export function clearAllMemories() {
  saveMemoryStore({
    facts: [],
    summaries: [],
    lastExtractedSessionId: null,
    totalExtractions: 0,
  });
}

// ─────────────────────────────────────────────
// Utility: Simple string similarity (Dice coefficient)
// ─────────────────────────────────────────────
function similarity(s1, s2) {
  if (!s1 || !s2) return 0;
  const a = s1.toLowerCase();
  const b = s2.toLowerCase();
  if (a === b) return 1;

  const bigrams = (str) => {
    const set = new Set();
    for (let i = 0; i < str.length - 1; i++) {
      set.add(str.substring(i, i + 2));
    }
    return set;
  };

  const setA = bigrams(a);
  const setB = bigrams(b);
  let intersection = 0;
  for (const bi of setA) {
    if (setB.has(bi)) intersection++;
  }

  return (2 * intersection) / (setA.size + setB.size);
}
