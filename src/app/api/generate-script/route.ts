import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  ScriptIdea,
  StoryBible,
  BeatItem,
  ScriptGenResult,
  Character,
  StoryLocation,
} from "@/lib/types";
import { buildNumerologyBrief, LIFE_PATH, MISSION } from "@/lib/numerologyData";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

// Allow up to 5 min processing on Vercel
export const maxDuration = 300;

const SCENE_DURATION = 8;

const PLATFORM_HOOK_RULES: Record<string, string> = {
  youtube: "Hook in first 5 seconds. Open question or bold claim. Slow-burn pacing OK.",
  short: "Hook in first 1-2 seconds. Visual + auditory shock. NO intro. Direct payoff.",
  reel: "Hook in first 2 seconds. Visual surprise + curiosity gap. Loop-friendly ending.",
  tiktok: "Hook in first 2 seconds. Pattern interrupt. Conversational tone. Loop ending.",
  story: "Hook in first 3 seconds. Personal angle. CTA at end.",
};

const BEAT_FRAMEWORKS = {
  long: `15-beat structure (Save the Cat):
1. Opening Image (0-2%)
2. Theme Stated (5%)
3. Set-Up (1-10%)
4. Catalyst (10%)
5. Debate (10-20%)
6. Break into Two (20%)
7. B Story (22%)
8. Fun and Games (20-50%)
9. Midpoint (50%)
10. Bad Guys Close In (50-75%)
11. All Is Lost (75%)
12. Dark Night of Soul (75-80%)
13. Break into Three (80%)
14. Finale (80-99%)
15. Final Image (99-100%)`,
  short: `5-beat structure (Hook Frame):
1. Hook (0-15%) - Visual surprise, bold claim, or question
2. Setup (15-30%) - Context, who/what/where
3. Tension (30-60%) - Conflict, problem, twist
4. Payoff (60-90%) - Resolution or reveal
5. CTA (90-100%) - Call to action / loop`,
};

function pickFramework(durationSec: number): "long" | "short" {
  return durationSec >= 90 ? "long" : "short";
}

// ========== PRODUCT COMMERCIAL MODE ==========

/**
 * Commercial beat structure based on AIDA + modern 30-90s spot formula.
 * Sources: classic advertising structure (Attention-Interest-Desire-Action),
 * PromptVeo3 product-reveal templates, Veo 3 JSON prompting community patterns.
 */
const COMMERCIAL_BEAT_FRAMEWORK = `6-beat PRODUCT COMMERCIAL structure (AIDA-based):
1. HOOK / Tease (0-12%) - Stunning macro detail or intriguing motion. Product NOT fully revealed yet. Pattern interrupt.
2. DESIRE SETUP (12-25%) - The need/problem visualized OR sensory immersion in ingredient world.
3. HERO REVEAL (25-40%) - Product appears in full glory. Orbit/rotation shot. Studio lighting.
4. INGREDIENT SHOWCASE / VFX ASSEMBLY (40-75%) - THE CENTERPIECE. Each ingredient gets its moment:
   macro texture shots, then ingredients fly/orbit/spiral INTO or AROUND the product container.
   This is the longest beat - one ingredient per 8s scene for clarity.
5. BENEFIT / TRANSFORMATION (75-88%) - Result visualized: glow, energy, freshness radiating.
6. PACK SHOT + CTA (88-100%) - Final hero composition: product centered, label crisp and readable, tagline, logo lockup.`;

/**
 * VFX choreography vocabulary - injected into product scene generation.
 * These motion primitives are what Veo 3 renders well for product spots.
 */
const VFX_VOCABULARY = `VFX MOTION PRIMITIVES (use these exact terms in actions):
- ORBIT: camera or objects circle the product in smooth 360° arc, constant radius
- SPIRAL-IN: ingredients fly in shrinking circular orbit, then enter container opening
- LEVITATION: product/ingredients float weightlessly, slow gentle bobbing, soft shadows below
- SLOW-MO DROP: ingredient falls into liquid/container at 120fps ramp, crown splash
- PARTICLE TRAIL: glowing light particles stream behind moving ingredients
- MACRO GLIDE: extreme close-up camera glides across ingredient texture (pores, fibers, droplets)
- BURST: ingredients explode outward from center then REVERSE back into formation
- ASSEMBLY: separated components fly together and snap into final product composition
- LIGHT SWEEP: a band of light sweeps across label/product revealing details
- DOLLY PUSH-IN: camera pushes toward product as background defocuses

LIGHTING FOR PRODUCT SPOTS:
- Studio softbox key + rim light separating product from backdrop
- Gradient seamless backdrop (brand color, darker at edges)
- Specular highlights on glass/container must stay consistent across ALL clips
- Caustics for glass bottles, subsurface glow for herbal/organic ingredients

CONSISTENCY RULES FOR PRODUCT:
- Container DNA, label DNA, brand colors repeat VERBATIM in every scene
- Same backdrop environment across all scenes (only camera + VFX change)
- Ingredients keep identical visual description every appearance`;

/**
 * STAGE 1-P: Generate Product Bible.
 * KEY ARCHITECTURE: the product becomes a "character" (id: product-hero) so the
 * ENTIRE existing consistency pipeline applies: DNA locks, manifest, critic,
 * negative prompts, even I2V reference images (user can upload real product photo).
 */
async function generateProductBible(idea: ScriptIdea): Promise<StoryBible> {
  const p = idea.product!;
  const langInstruction = idea.language === "vi"
    ? "Output trong tiếng Việt tự nhiên (trừ thuật ngữ kỹ thuật camera/VFX giữ tiếng Anh)."
    : "Output in natural English.";

  const ingredientList = (p.ingredients || [])
    .map((i, n) => `${n + 1}. ${i.name}: ${i.visual_description || "(infer vivid forensic description)"}`)
    .join("\n");

  const system = `You are a senior COMMERCIAL DIRECTOR + product cinematographer.
Generate a PRODUCT BIBLE for a ${idea.platform} product commercial.
${langInstruction}

${VFX_VOCABULARY}

CRITICAL: The product is the HERO CHARACTER of this commercial. Its visual DNA must be
forensic-level locked so it looks IDENTICAL across every clip.`;

  const user = `[PRODUCT INPUT]
Name: ${p.product_name}
Type: ${p.product_type}
Container: ${p.container_dna || "(infer premium container design)"}
Label: ${p.label_dna || "(infer label design)"}
Brand colors: ${p.brand_colors || "(infer palette)"}
VFX style: ${p.vfx_style}
Tagline: ${p.tagline || "(create one)"}
Ingredients:
${ingredientList || "(infer from product type)"}

[CAMPAIGN INPUT]
Concept: ${idea.idea}
Platform: ${idea.platform} (${idea.durationSeconds}s)
Tone: ${idea.tone}
Audience: ${idea.audience}
Visual style: ${idea.style}

[OUTPUT JSON SCHEMA]
{
  "log_line": "one-sentence commercial concept (max 25 words)",
  "premise": "2-3 sentences: the commercial's visual journey",
  "characters": [
    {
      "id": "product-hero",
      "name": "${p.product_name}",
      "gender": "female",
      "age_group": "n/a",
      "hair": "n/a - this is a product",
      "face_features": "PRODUCT FRONT FACE: exact label layout, logo position, typography description",
      "clothing": "CONTAINER DNA (locked verbatim): ${p.container_dna || "describe shape, material, cap, proportions, finish"}",
      "voice_profile_id": "narrator_warm_trustworthy",
      "voice_timbre": "n/a",
      "description": "150+ word FULL forensic product description: container shape/material/size, cap, label colors + logo + typography, finish (matte/gloss), how light reflects on it",
      "eye_details": "LABEL DNA: ${p.label_dna || "describe label artwork verbatim"}",
      "skin_texture": "SURFACE FINISH: material texture, reflectivity, e.g. amber glass with soft specular highlights",
      "accessories": "BRAND COLORS (locked): ${p.brand_colors || "describe exact palette"}",
      "gait_posture": "PRODUCT MOTION STYLE: how it moves in VFX (e.g., slow majestic rotation, gentle levitation)",
      "signature_props": "INGREDIENTS (each locked): comma-separated list with forensic visual description per ingredient"
    }
  ],
  "locations": [
    {
      "location_id": "loc_studio_set",
      "display_name": "string - the ONE studio set used in ALL scenes",
      "description": "50+ words: seamless gradient backdrop in brand colors, surface material (marble/wood/glass), lighting setup",
      "visual_anchors": "softbox key light, rim light, gradient backdrop spec, surface reflections",
      "archetype_ref": "Interior_HumanScale_SemiEnclosed"
    }
  ],
  "visual_style_note": ">100 words: commercial cinematography style - lens choices, lighting consistency, color grade, VFX style '${p.vfx_style}' described in detail using VFX MOTION PRIMITIVES vocabulary",
  "emotional_arc": "sensory journey: curiosity -> desire -> wonder (VFX) -> trust -> action",
  "hook_strategy": "exact first-2-second visual (macro detail or motion tease, product NOT fully shown)",
  "cta_line": "${p.tagline || "final tagline + call to action"}"
}`;

  // Higher token budget: product bible packs all ingredients + forensic DNA
  return await jsonCall(system, user, 24576);
}

// ========== NUMEROLOGY MODE (Thần Số Học) ==========

/** Viral short-video structure for a numerology profile video. */
const NUMEROLOGY_BEAT_FRAMEWORK = `Cấu trúc VIDEO VIRAL THẦN SỐ HỌC (Hook → Problem → Insight → Payoff → CTA):
1. HOOK (cảnh 1) - câu mở chặn tay người lướt: gọi thẳng số chủ đạo + gợi nỗi đau, hoặc nghịch lý.
2. PROBLEM / PAIN - chạm nỗi đau (lấy từ "Bóng tối" của Số Chủ Đạo). Khiến người xem gật gù "đúng là mình".
3. INSIGHT / GIẢI MÃ - giải thích bằng thần số học: siêu năng lực thật sự, vì sao họ như vậy, mâu thuẫn chủ đạo↔sứ mệnh (ngũ hành).
4. PAYOFF / SỨ MỆNH - hé lộ sứ mệnh: con người ấy SINH RA ĐỂ LÀM GÌ. Dùng câu chốt sứ mệnh.
5. CTA - kêu gọi comment số chủ đạo / lưu / tag bạn bè.
Nếu video dài hơn 5 cảnh: giãn phần INSIGHT và PAYOFF thành nhiều cảnh (mỗi đặc điểm/bài học một cảnh).`;

/**
 * STAGE 1-N: build a numerology persona bible.
 * Creates ONE consistent character (persona representing the Life Path) + setting,
 * so the video has a coherent human face across all 8s shots.
 */
async function generateNumerologyBible(idea: ScriptIdea): Promise<StoryBible> {
  const lp = idea.numerology?.lifePath;
  const mi = idea.numerology?.mission;
  const brief = buildNumerologyBrief(lp, mi);
  const lpArch = lp && LIFE_PATH[lp] ? LIFE_PATH[lp].archetype : "";
  const miEss = mi && MISSION[mi] ? MISSION[mi].essence : "";

  const system = `Bạn là biên kịch video viral chuyên về THẦN SỐ HỌC cho TikTok/Reel/YouTube Short.
Output tiếng Việt, giọng gần gũi (xưng "bạn"/"mình"), chạm cảm xúc trước - tri thức sau.

[KIẾN THỨC NỀN - DÙNG VERBATIM]
${brief}

Nhiệm vụ: tạo PERSONA BIBLE — một nhân vật đại diện cho người mang ${lp ? `Số Chủ Đạo ${lp}` : "chỉ số này"}${mi ? ` và Sứ Mệnh ${mi}` : ""},
cùng bối cảnh thị giác nhất quán, để dựng video ${idea.durationSeconds}s (mỗi cảnh 8s).`;

  const user = `[YÊU CẦU]
Số Chủ Đạo: ${lp || "(không có)"} ${lpArch ? `– ${lpArch}` : ""}
Sứ Mệnh: ${mi || "(không có)"} ${miEss ? `– ${miEss}` : ""}
Concept thêm (nếu có): ${idea.idea || "(tự do sáng tạo theo đặc điểm số)"}
Thời lượng: ${idea.durationSeconds}s (${Math.max(2, Math.ceil(idea.durationSeconds / 8))} cảnh 8s)
Visual style: ${idea.style}

[OUTPUT JSON SCHEMA]
{
  "log_line": "tiêu đề video hấp dẫn (có số + cảm xúc), max 20 từ",
  "premise": "2-3 câu: thông điệp lõi của video (kết hợp siêu năng lực + nỗi đau + sứ mệnh)",
  "characters": [
    {
      "id": "char-persona",
      "name": "tên nhân vật đại diện (vd: Minh, Linh...)",
      "gender": "male" | "female",
      "age_group": "vd 25-30",
      "hair": "mô tả tóc cụ thể",
      "face_features": "đặc điểm khuôn mặt",
      "clothing": "trang phục phản ánh tính cách số chủ đạo (locked, nhất quán mọi cảnh)",
      "voice_profile_id": "vd narrator_warm_vi",
      "voice_timbre": "ấm/trầm/...",
      "description": "100+ từ: chân dung nhân vật thể hiện đúng năng lượng số chủ đạo",
      "eye_details": "chi tiết mắt",
      "skin_texture": "chất da",
      "accessories": "phụ kiện nhất quán",
      "gait_posture": "dáng/cử chỉ đặc trưng",
      "signature_props": "đạo cụ biểu tượng cho số (vd Số 5: ba lô, bản đồ)"
    }
  ],
  "locations": [
    {
      "location_id": "loc_main",
      "display_name": "bối cảnh chính phản ánh số chủ đạo",
      "description": "50+ từ mô tả thị giác",
      "visual_anchors": "ánh sáng, tông màu, chi tiết đặc trưng",
      "archetype_ref": "Interior_HumanScale_SemiEnclosed" | "Exterior_Urban_Open" | "Interior_Narrow_Transitional" | "Interior_Large_Public"
    }
  ],
  "visual_style_note": ">80 từ: phong cách quay (lens, ánh sáng, màu, mood) hợp với năng lượng số",
  "emotional_arc": "tò mò -> đồng cảm nỗi đau -> vỡ lẽ (insight) -> được nâng đỡ (sứ mệnh) -> hành động",
  "hook_strategy": "câu/hình ảnh 3 giây đầu (dựa trên BÓNG TỐI của số để gây tò mò)",
  "cta_line": "lời CTA cuối (comment số chủ đạo / lưu / tag) + tinh thần câu chốt sứ mệnh"
}`;

  return await jsonCall(system, user, 12288);
}

/**
 * Robust JSON parse with repair for truncated/malformed model output.
 * Handles: markdown fences, unterminated strings, unclosed braces/brackets.
 */
function safeJsonParse(text: string, fallback: any = {}): any {
  if (!text) return fallback;
  // Strip markdown code fences
  let clean = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  // First attempt: parse as-is
  try {
    return JSON.parse(clean);
  } catch {
    // Repair attempt
  }

  try {
    let repaired = clean;

    // If string ends mid-value (unterminated string), close the open quote.
    // Count unescaped double-quotes; if odd, the last string is open.
    const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      repaired += '"';
    }

    // Remove a trailing comma if present (e.g., "...", -> "...")
    repaired = repaired.replace(/,\s*$/g, "");

    // Balance braces and brackets
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;

    // Close arrays first, then objects (inner-to-outer heuristic)
    repaired += "]".repeat(Math.max(0, openBrackets - closeBrackets));
    repaired += "}".repeat(Math.max(0, openBraces - closeBraces));

    return JSON.parse(repaired);
  } catch {
    return fallback;
  }
}

async function jsonCall(systemPrompt: string, userPrompt: string, maxTokens = 16384) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      maxOutputTokens: maxTokens,
      temperature: 0.7,
      // CRITICAL: disable thinking so all tokens go to JSON output (prevents truncation)
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = response.text || "{}";
  const parsed = safeJsonParse(text, null);

  if (parsed === null) {
    // Surface a clear error instead of crashing with cryptic JSON message
    const finishReason = (response as any)?.candidates?.[0]?.finishReason || "unknown";
    throw new Error(
      `AI returned invalid JSON (finishReason: ${finishReason}). ` +
      `This usually means the output was too long. Try fewer ingredients or shorter duration.`
    );
  }
  return parsed;
}

// ========== STAGE 1: STORY BIBLE ==========
async function generateStoryBible(idea: ScriptIdea): Promise<StoryBible> {
  const langInstruction = idea.language === "vi"
    ? "Output trong tiếng Việt tự nhiên. Tên nhân vật có thể giữ tiếng Anh hoặc Việt theo bối cảnh."
    : "Output in natural English.";

  const system = `You are a senior screenwriter & creative director.
Generate a STORY BIBLE (foundation document) for a ${idea.platform} video.
${langInstruction}

CRITICAL RULES:
- Characters: detailed, distinguishable, consistent for AI video generation
- Locations: visually specific (lighting, materials, atmosphere)
- Visual style: must support character/scene continuity across many 8s clips
- Hook strategy: ${PLATFORM_HOOK_RULES[idea.platform] || PLATFORM_HOOK_RULES.youtube}`;

  const user = `[IDEA]
${idea.idea}

[PARAMETERS]
Platform: ${idea.platform} (${idea.durationSeconds}s)
Tone: ${idea.tone}
Audience: ${idea.audience}
Visual Style: ${idea.style}
Character count: ${idea.characterCount}
${idea.customAngle ? `Custom angle: ${idea.customAngle}` : ""}
${idea.hookStyle && idea.hookStyle !== "auto" ? `Hook style preference: ${idea.hookStyle}` : ""}

[OUTPUT JSON SCHEMA]
{
  "log_line": "string - one sentence pitch (max 25 words)",
  "premise": "string - 2-3 sentences explaining the story core",
  "characters": [
    {
      "id": "char-<lowercase_name>",
      "name": "string",
      "gender": "male" | "female",
      "age_group": "string (e.g., 25-30, 40-45)",
      "hair": "string - specific hair description",
      "face_features": "string - distinctive face features",
      "clothing": "string - specific outfit anchor for visual consistency",
      "voice_profile_id": "string - e.g., 'hanoi_male_warm', 'saigon_female_bright', 'english_male_deep'",
      "voice_timbre": "string",
      "description": "string - 50+ word complete description",
      "eye_details": "string - PHASE 1 FORENSIC: e.g., 'warm brown almond-shaped eyes with double eyelid, slight crow's feet'",
      "skin_texture": "string - PHASE 1 FORENSIC: e.g., 'smooth light beige, natural pores, single beauty mark on left cheek'",
      "accessories": "string - PHASE 1 FORENSIC: items ALWAYS worn, e.g., 'silver wristwatch on left wrist, wire-rimmed glasses'",
      "gait_posture": "string - PHASE 1 FORENSIC: e.g., 'confident upright stance, hands often in pockets'",
      "signature_props": "string - PHASE 1 FORENSIC: props always appearing with character, e.g., 'brown leather satchel, fountain pen'"
    }
  ],
  "locations": [
    {
      "location_id": "loc_<name>",
      "display_name": "string",
      "description": "string - 50+ word visual description",
      "visual_anchors": "string - specific lighting, materials, signature elements",
      "archetype_ref": "Interior_HumanScale_SemiEnclosed" | "Exterior_Urban_Open" | "Interior_Narrow_Transitional" | "Interior_Large_Public"
    }
  ],
  "visual_style_note": "string - cinematography, color grading, mood notes (>100 words)",
  "emotional_arc": "string - how emotion shifts across the video",
  "hook_strategy": "string - exact strategy for first 3-5 seconds",
  "cta_line": "string - final call to action line"
}

Generate EXACTLY ${idea.characterCount} character(s). Create 2-4 locations as needed.`;

  return await jsonCall(system, user, 8192);
}

// ========== STAGE 2: BEAT SHEET ==========
async function generateBeatSheet(
  idea: ScriptIdea,
  bible: StoryBible,
  totalScenes: number
): Promise<BeatItem[]> {
  const isProduct = idea.mode === "product";
  const isNumero = idea.mode === "numerology";
  const framework = pickFramework(idea.durationSeconds);
  // Choose framework by mode
  const beatTemplate = isNumero
    ? NUMEROLOGY_BEAT_FRAMEWORK
    : isProduct ? COMMERCIAL_BEAT_FRAMEWORK : BEAT_FRAMEWORKS[framework];

  const langInstruction = idea.language === "vi"
    ? "Output trong tiếng Việt."
    : "Output in English.";

  const productNote = isProduct
    ? `\nPRODUCT MODE: This is a COMMERCIAL. The INGREDIENT SHOWCASE / VFX ASSEMBLY beat is the centerpiece -
allocate ONE scene per ingredient so each gets a full 8s moment (macro intro -> flight into orbit -> entry into container).
VFX style for the whole spot: ${idea.product?.vfx_style || "orbit_assembly"}.`
    : isNumero
    ? `\nNUMEROLOGY MODE: video viral thần số học. Mỗi cảnh 8s tương ứng một nhịp cảm xúc. Hook nằm ở cảnh 1.
Phần PROBLEM phải chạm nỗi đau, phần PAYOFF hé lộ sứ mệnh. Giữ nhân vật persona nhất quán.`
    : "";

  const system = `You are a ${isNumero ? "viral numerology scriptwriter" : isProduct ? "commercial director" : "story architect"}.
Generate a BEAT SHEET breaking the ${isNumero ? "video" : isProduct ? "commercial" : "story"} into ${totalScenes} scenes (each 8s).
${langInstruction}

USE THIS FRAMEWORK:
${beatTemplate}
${productNote}

CRITICAL: Each beat gets specific scene_range. Total = ${totalScenes} scenes.`;

  const user = `[STORY BIBLE]
Log-line: ${bible.log_line}
Premise: ${bible.premise}
Hook: ${bible.hook_strategy}
Emotional Arc: ${bible.emotional_arc}
Characters: ${bible.characters.map(c => c.name).join(", ")}
Locations: ${bible.locations.map(l => l.display_name).join(", ")}

[TOTAL SCENES] ${totalScenes} (each 8s, total ${idea.durationSeconds}s)

[OUTPUT JSON]
{
  "beats": [
    {
      "beat_id": "beat_1",
      "beat_name": "string",
      "scene_range": "Scene 1-3",
      "percentage": 0,
      "description": "string - what happens in this beat (50+ words)",
      "emotional_intent": "string"
    }
  ]
}`;

  const result = await jsonCall(system, user, 4096);
  return result.beats || [];
}

// ========== STAGE 3: SCENE-BY-SCENE SCRIPT ==========
async function generateScenesBatch(
  idea: ScriptIdea,
  bible: StoryBible,
  beatSheet: BeatItem[],
  startScene: number,
  endScene: number,
  totalScenes: number,
  priorContext: string
): Promise<Array<{ scene: number; character: string; action: string; dialogue: string; location: string }>> {
  const langInstruction = idea.language === "vi"
    ? "Output dialogue trong tiếng Việt tự nhiên, sống động."
    : "Output dialogue in natural, vivid English.";

  // BUGFIX: List the EXACT props/accessories from Story Bible to lock against drift
  const propLock = bible.characters.map(c => {
    const items: string[] = [];
    if ((c as any).accessories) items.push(`accessories: ${(c as any).accessories}`);
    if ((c as any).signature_props) items.push(`signature props: ${(c as any).signature_props}`);
    if (c.clothing) items.push(`outfit: ${c.clothing}`);
    return `${c.name}: ${items.join(' | ')}`;
  }).join('\n');

  const isProduct = idea.mode === "product";
  const isNumero = idea.mode === "numerology";

  // PRODUCT MODE: VFX choreography rules replace character-dialogue rules
  const productRules = isProduct ? `
${VFX_VOCABULARY}

PRODUCT COMMERCIAL SCENE RULES:
- The "character" of every scene is the PRODUCT (${idea.product?.product_name || bible.characters[0]?.name}). Use its name in the character field.
- "dialogue" field = NARRATOR VOICEOVER line (max 20 words, warm trustworthy tone) OR empty for pure-VFX scenes
- Every action MUST use VFX MOTION PRIMITIVES vocabulary (ORBIT, SPIRAL-IN, MACRO GLIDE, etc.)
- Every action MUST restate: container appearance + label + brand colors (verbatim from bible) so the prompt engine locks them
- Ingredient scenes: name the ingredient + its EXACT visual description from bible, describe its flight path geometrically (radius, direction, speed)
- Example action: "MACRO GLIDE across dried goji berries (vivid orange-red, glossy wrinkled skin), then berries lift off and SPIRAL-IN clockwise, radius shrinking from 40cm to 5cm, entering the open amber glass bottle (forest-green label, gold logo) with PARTICLE TRAIL of warm golden light"
- Camera: studio set only, gradient backdrop in brand colors, lighting identical every scene` : "";

  // NUMEROLOGY MODE: voiceover narration over persona b-roll
  const numeroRules = isNumero ? `
NUMEROLOGY VIDEO SCENE RULES:
- "character" field = the persona name (${bible.characters[0]?.name || "persona"}). Keep this SAME persona every scene for seamless editing.
- "dialogue" field = VOICEOVER narration (tiếng Việt, ~18-24 từ để vừa 8 giây, giọng gần gũi xưng "bạn").
- The voiceover follows the beat: Hook → Problem (nỗi đau) → Insight (giải mã) → Payoff (sứ mệnh) → CTA.
- "action" = mô tả hình ảnh/B-roll thể hiện cảm xúc của nhịp đó (persona làm gì, bối cảnh, ánh sáng), nhất quán nhân vật + bối cảnh.
- KHÔNG nhồi nhét: mỗi cảnh một ý cảm xúc. Chạm cảm xúc trước, tri thức sau.
- Cảnh cuối phải có CTA (comment số chủ đạo / lưu / tag).` : "";

  const system = `You are a ${isNumero ? "viral numerology scriptwriter + visual director" : isProduct ? "commercial VFX director" : "dialogue writer + visual director"}.
Write scenes ${startScene}-${endScene} of ${totalScenes} for an 8s-per-clip video.
${langInstruction}
${productRules}
${numeroRules}

ABSOLUTE RULES:
- Each scene = EXACTLY 8 seconds
- Max 25 words dialogue per scene (fits 8s)
- BUGFIX: NEVER introduce new props, accessories, jewelry, or outfit items not listed below in [CHARACTER PROP LOCK]
- If a character is OFF-SCREEN (e.g., voice on phone, V.O.), explicitly note "off-screen" in action
- Dialogue text MUST NOT contain speaker prefix. Write text without "CharacterName:" before it.
- VOICE FIX: For each scene with dialogue, identify ONE primary speaker. Avoid 2 characters speaking in same 8s clip.
- VOICE FIX: If multi-speaker is essential, use clear TURN-TAKING with camera cuts: "Character A speaks (close-up), then character B replies (close-up)" - never overlapping dialogue.
- VOICE FIX: When a character speaks, their face MUST be on camera in close-up or medium close-up.

[CHARACTER PROP LOCK - do not invent additional items]
${propLock}
- Action description: vivid, specific, references character ID and location
- Character voice must match their character_id voice profile
- NO repetition with prior scenes (already written)
- NO "same as before" or shortcuts
- Reference CHARACTER NAMES exactly: ${bible.characters.map(c => c.name).join(" | ")}
- Reference LOCATION NAMES exactly: ${bible.locations.map(l => l.display_name).join(" | ")}`;

  const user = `[STORY BIBLE]
${JSON.stringify(bible, null, 2)}

[BEAT SHEET]
${beatSheet.map(b => `${b.beat_name} (${b.scene_range}, ${b.percentage}%): ${b.description}`).join("\n")}

[PRIOR SCENES CONTEXT]
${priorContext || "Start of story. No prior scenes."}

[YOUR TASK]
Write scenes ${startScene} through ${endScene} of ${totalScenes}.

[OUTPUT JSON]
{
  "scenes": [
    {
      "scene": ${startScene},
      "character": "Character name (must match bible)",
      "location": "Location name (must match bible)",
      "action": "string - visual action description (40+ words, specific)",
      "dialogue": "string - max 25 words OR empty string for action-only scene"
    }
  ]
}`;

  const result = await jsonCall(system, user, 16384);
  return result.scenes || [];
}

// ========== FORMAT SCRIPT FOR ScriptProcessor ==========
function formatScript(
  scenes: Array<{ scene: number; character: string; action: string; dialogue: string; location: string }>,
  bible: StoryBible,
  isProduct = false,
  vfxStyle = "",
  isNumero = false
): string {
  const lines: string[] = [];

  lines.push(`# ${bible.log_line}`);
  if (isProduct) {
    lines.push(`[MODE: PRODUCT_COMMERCIAL | VFX: ${vfxStyle || "orbit_assembly"}]`);
  } else if (isNumero) {
    lines.push(`[MODE: NUMEROLOGY]`);
  }
  lines.push("");

  scenes.forEach((s) => {
    lines.push(`Scene ${s.scene}`);
    lines.push(`[Location: ${s.location}]`);
    lines.push(`[Action] ${s.action}`);
    if (s.dialogue && s.dialogue.trim()) {
      // Product + numerology dialogue = voiceover narration
      lines.push((isProduct || isNumero) ? `Narrator (V.O.): "${s.dialogue}"` : `${s.character}: "${s.dialogue}"`);
    }
    lines.push("");
    lines.push("---");
    lines.push("");
  });

  if (bible.cta_line) {
    lines.push(`[CTA] ${bible.cta_line}`);
  }

  return lines.join("\n");
}

// ========== MAIN HANDLER ==========
export async function POST(req: NextRequest) {
  try {
    const idea: ScriptIdea = await req.json();

    const isProduct = idea.mode === "product";
    const isNumero = idea.mode === "numerology";

    // Validation (numerology only needs a Life Path; others need an idea)
    if (isNumero) {
      if (!idea.numerology?.lifePath) {
        return NextResponse.json({ error: "Chế độ Thần Số Học cần chọn Số Chủ Đạo." }, { status: 400 });
      }
    } else if (!isProduct) {
      if (!idea.idea || idea.idea.length < 5) {
        return NextResponse.json({ error: "Idea is too short. Min 5 characters." }, { status: 400 });
      }
    }
    if (idea.durationSeconds < 15 || idea.durationSeconds > 900) {
      return NextResponse.json({ error: "Duration must be 15-900s." }, { status: 400 });
    }

    // PRODUCT MODE validation
    if (isProduct && !idea.product?.product_name) {
      return NextResponse.json({ error: "Product mode requires product_name." }, { status: 400 });
    }

    let totalScenes = Math.max(2, Math.ceil(idea.durationSeconds / SCENE_DURATION));

    // PRODUCT MODE: ensure enough scenes to showcase every ingredient.
    // Need: hook + hero reveal + (1 per ingredient) + benefit + packshot.
    if (isProduct) {
      const ingredientCount = idea.product?.ingredients?.length || 0;
      const minScenesNeeded = ingredientCount + 4; // hook, reveal, benefit, packshot
      if (minScenesNeeded > totalScenes) {
        totalScenes = minScenesNeeded;
      }
      // Cap to keep generation time reasonable
      totalScenes = Math.min(totalScenes, 40);
    }

    // STAGE 1: Bible — numerology / product / narrative
    const storyBible = isNumero
      ? await generateNumerologyBible(idea)
      : isProduct
      ? await generateProductBible(idea)
      : await generateStoryBible(idea);

    storyBible.characters = (storyBible.characters || []).map((c: any, i: number) => ({
      // PRODUCT MODE: preserve "product-hero" id so downstream pipeline recognizes it
      id: c.id || (isProduct ? `product-hero` : `char-${i}-${Date.now()}`),
      name: c.name || (isProduct ? idea.product!.product_name : `Character ${i + 1}`),
      gender: c.gender || "female",
      age_group: c.age_group || (isProduct ? "n/a" : "25-35"),
      hair: c.hair || "",
      face_features: c.face_features || "",
      clothing: c.clothing || "",
      voice_profile_id: c.voice_profile_id || (isProduct ? "narrator_warm_trustworthy" : "hanoi_female_soft_trust"),
      voice_timbre: c.voice_timbre || "neutral",
      description: c.description || "",
      // PHASE 1: Forensic DNA fields (product mode repurposes these as product DNA)
      eye_details: c.eye_details || "",
      skin_texture: c.skin_texture || "",
      accessories: c.accessories || "",
      gait_posture: c.gait_posture || "",
      signature_props: c.signature_props || "",
    })) as Character[];

    storyBible.locations = (storyBible.locations || []) as StoryLocation[];

    // STAGE 2: Beat Sheet
    const beatSheet = await generateBeatSheet(idea, storyBible, totalScenes);

    // STAGE 3: Generate scenes in batches of 6
    const BATCH = 6;
    const allScenes: Array<{ scene: number; character: string; action: string; dialogue: string; location: string }> = [];

    for (let start = 1; start <= totalScenes; start += BATCH) {
      const end = Math.min(start + BATCH - 1, totalScenes);

      const priorContext = allScenes.length > 0
        ? allScenes.slice(-3).map(s => `Scene ${s.scene} (${s.location}): ${s.action} | "${s.dialogue}"`).join("\n")
        : "";

      // Resilient: a single failed batch should not crash the whole script.
      let batch: Array<{ scene: number; character: string; action: string; dialogue: string; location: string }> = [];
      try {
        batch = await generateScenesBatch(
          idea, storyBible, beatSheet, start, end, totalScenes, priorContext
        );
      } catch (batchErr) {
        console.warn(`Scene batch ${start}-${end} failed, retrying smaller:`, batchErr);
        // Retry this batch one scene at a time
        for (let s = start; s <= end; s++) {
          try {
            const single = await generateScenesBatch(idea, storyBible, beatSheet, s, s, totalScenes, priorContext);
            batch.push(...single);
          } catch {
            // Last-resort placeholder so the sequence stays intact
            const heroName = storyBible.characters[0]?.name || "Subject";
            const locName = storyBible.locations[0]?.display_name || "Scene";
            batch.push({
              scene: s,
              character: heroName,
              location: locName,
              action: `Scene ${s}: continuation shot. (Auto-placeholder — regenerate this clip for full detail.)`,
              dialogue: "",
            });
          }
        }
      }

      allScenes.push(...batch);
    }

    const formattedScript = formatScript(allScenes, storyBible, isProduct, idea.product?.vfx_style, isNumero);

    const result: ScriptGenResult = {
      storyBible,
      beatSheet,
      script: formattedScript,
      metadata: {
        generatedAt: new Date().toISOString(),
        sceneCount: allScenes.length,
        estimatedDuration: `${allScenes.length * SCENE_DURATION}s (~${Math.round(allScenes.length * SCENE_DURATION / 60)}min)`,
        platform: idea.platform,
        language: idea.language,
      },
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Script generation error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
