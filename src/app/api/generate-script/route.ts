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

async function jsonCall(systemPrompt: string, userPrompt: string, maxTokens = 8192) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      maxOutputTokens: maxTokens,
      temperature: 0.8,
    },
  });
  const text = response.text || "{}";
  return JSON.parse(text);
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
  const framework = pickFramework(idea.durationSeconds);
  const beatTemplate = BEAT_FRAMEWORKS[framework];

  const langInstruction = idea.language === "vi"
    ? "Output trong tiếng Việt."
    : "Output in English.";

  const system = `You are a story architect.
Generate a BEAT SHEET breaking the story into ${totalScenes} scenes (each 8s).
${langInstruction}

USE THIS FRAMEWORK:
${beatTemplate}

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

  const system = `You are a dialogue writer + visual director.
Write scenes ${startScene}-${endScene} of ${totalScenes} for an 8s-per-clip video.
${langInstruction}

ABSOLUTE RULES:
- Each scene = EXACTLY 8 seconds
- Max 25 words dialogue per scene (fits 8s)
- BUGFIX: NEVER introduce new props, accessories, jewelry, or outfit items not listed below in [CHARACTER PROP LOCK]
- If a character is OFF-SCREEN (e.g., voice on phone, V.O.), explicitly note "off-screen" in action
- Dialogue text MUST NOT contain speaker prefix. Write text without "CharacterName:" before it.

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

  const result = await jsonCall(system, user, 8192);
  return result.scenes || [];
}

// ========== FORMAT SCRIPT FOR ScriptProcessor ==========
function formatScript(
  scenes: Array<{ scene: number; character: string; action: string; dialogue: string; location: string }>,
  bible: StoryBible
): string {
  const lines: string[] = [];

  lines.push(`# ${bible.log_line}`);
  lines.push("");

  scenes.forEach((s) => {
    lines.push(`Scene ${s.scene}`);
    lines.push(`[Location: ${s.location}]`);
    lines.push(`[Action] ${s.action}`);
    if (s.dialogue && s.dialogue.trim()) {
      lines.push(`${s.character}: "${s.dialogue}"`);
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

    if (!idea.idea || idea.idea.length < 5) {
      return NextResponse.json({ error: "Idea is too short. Min 5 characters." }, { status: 400 });
    }
    if (idea.durationSeconds < 15 || idea.durationSeconds > 900) {
      return NextResponse.json({ error: "Duration must be 15-900s." }, { status: 400 });
    }

    const totalScenes = Math.max(2, Math.ceil(idea.durationSeconds / SCENE_DURATION));

    // STAGE 1: Story Bible
    const storyBible = await generateStoryBible(idea);

    storyBible.characters = (storyBible.characters || []).map((c: any, i: number) => ({
      id: c.id || `char-${i}-${Date.now()}`,
      name: c.name || `Character ${i + 1}`,
      gender: c.gender || "female",
      age_group: c.age_group || "25-35",
      hair: c.hair || "",
      face_features: c.face_features || "",
      clothing: c.clothing || "",
      voice_profile_id: c.voice_profile_id || "hanoi_female_soft_trust",
      voice_timbre: c.voice_timbre || "neutral",
      description: c.description || "",
      // PHASE 1: Forensic DNA fields
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

      const batch = await generateScenesBatch(
        idea, storyBible, beatSheet, start, end, totalScenes, priorContext
      );

      allScenes.push(...batch);
    }

    const formattedScript = formatScript(allScenes, storyBible);

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
