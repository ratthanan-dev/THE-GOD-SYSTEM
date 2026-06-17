// ============================================================
// SKILL REGISTRY — ศูนย์รวมและลงทะเบียนสกิลทั้งหมดของ THE SYSTEM
// เพิ่มสกิลใหม่: import แล้วเพิ่มเข้า ALL_SKILLS ได้เลย
// ============================================================

import { createQuestSkill } from './createQuestSkill';
import { analyzeStatsSkill } from './analyzeStatsSkill';
import { applyPenaltySkill } from './applyPenaltySkill';
import { restoreHpSkill } from './restoreHpSkill';

/** รายการสกิลทั้งหมดที่ THE SYSTEM มีอยู่ */
export const ALL_SKILLS = [
  createQuestSkill,
  analyzeStatsSkill,
  applyPenaltySkill,
  restoreHpSkill,
];

/**
 * แปลงสกิลทั้งหมดให้อยู่ในรูปแบบที่ Gemini API เข้าใจ
 * ใช้ใน tools ของ request body
 */
export function getGeminiTools() {
  return [
    {
      functionDeclarations: ALL_SKILLS.map((skill) => ({
        name: skill.name,
        description: skill.description,
        parameters: skill.parameters,
      })),
    },
  ];
}

/**
 * แปลงสกิลทั้งหมดให้อยู่ในรูปแบบที่ Groq/OpenAI API เข้าใจ
 * ใช้ใน tools ของ request body
 */
export function getGroqTools() {
  return ALL_SKILLS.map((skill) => ({
    type: 'function',
    function: {
      name: skill.name,
      description: skill.description,
      parameters: skill.parameters,
    },
  }));
}

/**
 * ค้นหาสกิลจากชื่อ
 * @param {string} name
 * @returns {object|undefined}
 */
export function findSkill(name) {
  return ALL_SKILLS.find((skill) => skill.name === name);
}
