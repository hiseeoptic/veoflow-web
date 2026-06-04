import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { buildRuleEngine } from "@/lib/ruleEngine";
import { assembleClipPrompt } from "@/lib/promptAssembler";
import { validateUnifiedPrompt } from "@/lib/promptValidator";
import { validateEnvironment } from "@/lib/environment/environmentValidator";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
const ruleEngine = buildRuleEngine();

async function generateHash(message: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(req: NextRequest) {
  try {
    const { project, targetClip, masterManifest, previousClipContext } = await req.json();

    try { validateEnvironment(project, targetClip); } catch (e: any) {
      return NextResponse.json({ clip: { ...targetClip, status: 'failed', errorLog: e.message, final_json_output: null } });
    }

    const assembledContextJSON = assembleClipPrompt({
      manifest: {
        environment_lock: masterManifest.environment_lock,
        character_manifests: masterManifest.character_manifests,
        outfit_state: "Refer to character_manifests",
        camera_lock: masterManifest.camera_lock,
        audio_lock: masterManifest.audio_lock
      },
      subject_identity: "",
      action: targetClip.actionSummary,
      dialogue: targetClip.scriptSegment
    });

    const additionalContext = ruleEngine.getClipGenerationContext(targetClip, masterManifest, previousClipContext);

    const userPromptContent = `[INPUT CONTEXT JSON]
${assembledContextJSON}

[ADDITIONAL RULES & CONTINUITY]
${additionalContext}`;

    try {
      validateUnifiedPrompt(userPromptContent, ruleEngine, 1000);
    } catch (validationError: any) {
      return NextResponse.json({ clip: { ...targetClip, status: 'failed', errorLog: `Validation: ${validationError.message}`, final_json_output: null } });
    }

    const systemInstruction = ruleEngine.getSystemInstruction();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPromptContent,
      config: {
        systemInstruction: `${systemInstruction}

[OUTPUT SCHEMA]
Return a JSON object with these keys:
- clip_id (string)
- duration (number, always 8)
- visual_prompt: object with:
  - subjects (array of {character_id, visual_dna_full, outfit_dna, eye_details, skin_texture, accessories, gait_posture, signature_props, activity})
  - environment (full object)
  - environment_invariant (string)
  - lighting_invariant (string)
  - camera_invariant (string)
  - action_variant (string)
  - dialogue (array of {speaker, text}) - text MUST be quoted dialogue
  - technical (object)
  - negative_prompt (string) - PHASE 1: explicit negatives for Veo, e.g. "do not alter hair length or color, do not remove glasses, do not change outfit, no extra fingers, no text overlays, no watermarks, no facial hair changes, no random props added"
  - full_flattened_prompt (string >5000 chars combining all invariants verbatim)
- audio_config: object with ambient_layer_base, reverb_profile, voice_profile_id, region, accent_strength, timbre, pitch_range_hz, speech_rate_wpm, emotion_band, text
- metadata: object with continuity_hash, validation_passed

[CRITICAL: DIALOGUE FORMAT IN full_flattened_prompt]
When you write dialogue inside full_flattened_prompt, use COLON FORMAT:
  CharacterName says: "exact dialogue text"
This format prevents Veo from rendering subtitles in the video.
DO NOT use formats like "CharacterName: text" or "speaker: text". Always include 'says:' before the quoted string.

[CRITICAL: NEGATIVE_PROMPT FIELD]
The negative_prompt field is MANDATORY. It must explicitly list things that MUST NOT change between clips:
- hair (length, color, style)
- outfit (all clothing items)
- accessories (glasses, jewelry, watches)
- facial features (no facial hair changes if character has none)
- skin tone
- signature_props of the character
Plus generic technical negatives: "no text overlays, no watermarks, no subtitles, no extra fingers, no blurry faces, no cartoon effects"`,
        responseMimeType: "application/json",
        maxOutputTokens: 16384,
      }
    });

    const text = response.text || "{}";
    const result = JSON.parse(text);

    if (!result || !result.visual_prompt) {
      return NextResponse.json({ clip: { ...targetClip, status: "failed", errorLog: "Invalid JSON response", final_json_output: null } });
    }

    // PHASE 1: Build flattened prompt with COLON DIALOGUE format + forensic DNA fields
    let flattened = result.visual_prompt.full_flattened_prompt;
    if (!flattened) {
      const vp = result.visual_prompt;
      const subjectsStr = vp.subjects?.map((s: any) => {
        const parts = [s.visual_dna_full];
        if (s.outfit_dna) parts.push(`Outfit (locked): ${s.outfit_dna}`);
        if (s.eye_details) parts.push(`Eyes: ${s.eye_details}`);
        if (s.skin_texture) parts.push(`Skin: ${s.skin_texture}`);
        if (s.accessories) parts.push(`Accessories (always present): ${s.accessories}`);
        if (s.gait_posture) parts.push(`Posture: ${s.gait_posture}`);
        if (s.signature_props) parts.push(`Signature props: ${s.signature_props}`);
        if (s.activity) parts.push(`Activity: ${s.activity}`);
        return parts.join('. ');
      }).join(' | ') || '';

      // PHASE 1: Use colon-format dialogue (prevents subtitles)
      const dialogueStr = (vp.dialogue || []).map((d: any) =>
        `${d.speaker} says: "${d.text}"`
      ).join(' ');

      flattened = [
        `Subjects: ${subjectsStr}.`,
        `Environment Invariant: ${vp.environment_invariant || JSON.stringify(vp.environment)}.`,
        `Lighting Invariant: ${vp.lighting_invariant || 'Natural cinematic lighting'}.`,
        `Camera Invariant: ${vp.camera_invariant || 'Cinematic 35mm lens, eye-level'}.`,
        `Action: ${vp.action_variant || ''}.`,
        dialogueStr ? `Dialogue: ${dialogueStr}` : '',
      ].filter(Boolean).join(' ').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // PHASE 1: Extract negative prompt for Veo
    const negativePrompt = result.visual_prompt.negative_prompt
      || "no text overlays, no watermarks, no subtitles, no cartoon effects, no extra fingers, no blurry faces, do not alter hair, do not change outfit, do not remove accessories, no facial hair changes, no random props";

    const updatedClip = {
      ...targetClip,
      status: 'completed',
      flattenedPrompt: flattened,
      negativePrompt,
      final_json_output: result
    };

    if (result.visual_prompt.environment_invariant) {
      const envInvariant = result.visual_prompt.environment_invariant;
      updatedClip.continuity_snapshot = {
        environment_state: envInvariant,
        lock_hash: await generateHash(envInvariant)
      };
    }

    return NextResponse.json({ clip: updatedClip });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
