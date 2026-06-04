import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { CriticReport, MasterManifest } from "@/lib/types";

/**
 * PHASE 3: VLM Critic Feedback Loop (inspired by ViMax architecture)
 *
 * After generate-clip produces a prompt, this critic agent:
 *   1. Compares the generated visual_prompt against the master manifest
 *   2. Detects character/environment/lighting/camera drift
 *   3. Returns drift_score (0-1) + categorized issues + correction suggestions
 *   4. If drift > 0.4, the caller should regenerate with the suggested_correction
 *
 * This mimics the human director/QC step in ViMax's multi-agent pipeline.
 */

export const maxDuration = 120;

const CRITIC_SYSTEM = `You are a strict CONTINUITY SUPERVISOR for AI video production.
Your ONLY job is to detect drift between a clip's generated prompt and the project's locked manifest.

ROLE: You are NOT generating new content. You are AUDITING.

YOU MUST DETECT:
- Character drift: hair, eyes, skin, outfit, accessories, posture changes vs manifest
- Environment drift: lighting changes, color palette, materials, layout
- Camera drift: lens swap, shutter angle, fps changes without narrative reason
- Style drift: missing scene_bible_tokens, paraphrased instead of verbatim
- Continuity drift: contradicts previous clip context

For each issue, assign severity:
- "high": viewer will notice immediately (hair color change, outfit swap, lens change)
- "medium": noticeable on close inspection (slight lighting shift, accessory missing)
- "low": minor cosmetic drift (skin tone slight variance, prop position)

Drift score formula:
- 3+ high issues = 0.8-1.0 (regenerate_required)
- 1-2 high OR 4+ medium = 0.5-0.7 (regenerate_required)
- 1-3 medium = 0.3-0.5 (warning, optional regen)
- Only low issues = 0.0-0.3 (pass)

Return STRICT JSON with the schema in user prompt.`;

export async function POST(req: NextRequest) {
  try {
    const { generatedPrompt, masterManifest, previousClipContext, iteration } = await req.json();

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: "GOOGLE_API_KEY is not configured." }, { status: 500 });
    }

    if (!generatedPrompt || !masterManifest) {
      return NextResponse.json(
        { error: "generatedPrompt and masterManifest are required." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

    // Build a focused audit prompt - we don't need to send the whole manifest,
    // just the lockable fields
    const manifest = masterManifest as MasterManifest;
    const characterLocks = (manifest.character_manifests || []).map((c) => ({
      id: c.character_id,
      visual_dna: c.visual_dna_full?.substring(0, 800),
      eye_locked: c.eye_details_locked,
      skin_locked: c.skin_texture_locked,
      accessories_locked: c.accessories_locked,
      gait_locked: c.gait_posture_locked,
      props_locked: c.signature_props_locked,
      negatives: c.identity_negatives,
    }));

    const envSummary = manifest.environment_lock?.master_state
      ? {
          class: manifest.environment_lock.master_state.environment_class,
          lighting: manifest.environment_lock.master_state.time_atmosphere?.lighting_state,
          weather: manifest.environment_lock.master_state.time_atmosphere?.weather_state,
          materials: manifest.environment_lock.master_state.surface_materials?.dominant_surfaces,
        }
      : {};

    const sceneBibleTokens = (manifest as any).scene_bible_tokens || [];

    const userPrompt = `[MASTER MANIFEST LOCKS (must match)]
Characters: ${JSON.stringify(characterLocks, null, 2)}
Environment: ${JSON.stringify(envSummary, null, 2)}
Camera Lock: ${JSON.stringify(manifest.camera_lock || {})}
Audio Lock: ${JSON.stringify(manifest.audio_lock || {})}
Scene Bible Tokens (must appear verbatim): ${JSON.stringify(sceneBibleTokens)}

[PREVIOUS CLIP CONTEXT (for continuity check)]
${previousClipContext || "Start of sequence."}

[GENERATED CLIP PROMPT TO AUDIT]
${JSON.stringify(generatedPrompt, null, 2)}

[ITERATION] ${iteration || 0}/3

[REQUIRED OUTPUT JSON]
{
  "drift_score": number (0.0 to 1.0),
  "issues": [
    {
      "category": "character" | "environment" | "lighting" | "camera" | "continuity" | "style",
      "severity": "low" | "medium" | "high",
      "description": "specific drift detected, e.g. 'Character Sarah had wire-rimmed glasses in manifest but generated prompt mentions no glasses'",
      "suggested_fix": "exact correction, e.g. 'Add: Sarah wears wire-rimmed glasses (locked accessory)'"
    }
  ],
  "verdict": "pass" | "warning" | "regenerate_required",
  "suggested_correction": "string - if regenerate_required, provide stricter instructions to append to the next generation attempt (use forensic language, force verbatim tokens)"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: CRITIC_SYSTEM,
        responseMimeType: "application/json",
        maxOutputTokens: 4096,
        temperature: 0.2, // low temp for consistent auditing
      },
    });

    const text = response.text || "{}";
    const report = JSON.parse(text) as CriticReport;

    // Normalize
    report.drift_score = Math.max(0, Math.min(1, Number(report.drift_score) || 0));
    report.issues = Array.isArray(report.issues) ? report.issues : [];
    report.verdict = ["pass", "warning", "regenerate_required"].includes(report.verdict)
      ? report.verdict
      : "pass";
    report.iteration = (iteration || 0) + 1;

    return NextResponse.json({ report });
  } catch (error: any) {
    console.error("Critic check error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
