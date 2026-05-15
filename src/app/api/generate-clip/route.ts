import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildRuleEngine } from "@/lib/ruleEngine";
import { assembleClipPrompt } from "@/lib/promptAssembler";
import { validateUnifiedPrompt } from "@/lib/promptValidator";
import { validateEnvironment } from "@/lib/environment/environmentValidator";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      max_tokens: 16384,
      messages: [
        {
          role: "system",
          content: `${systemInstruction}

[OUTPUT SCHEMA]
Return a JSON object with these keys:
- clip_id (string)
- duration (number, always 8)
- visual_prompt: object with subjects (array), environment (full object), environment_invariant (string), lighting_invariant (string), camera_invariant (string), action_variant (string), dialogue (array of {speaker, text}), technical (object), full_flattened_prompt (string >5000 chars combining all invariants verbatim)
- audio_config: object with ambient_layer_base, reverb_profile, voice_profile_id, region, accent_strength, timbre, pitch_range_hz, speech_rate_wpm, emotion_band, text
- metadata: object with continuity_hash, validation_passed`
        },
        { role: "user", content: userPromptContent }
      ]
    });

    const text = response.choices[0]?.message?.content || "{}";
    const result = JSON.parse(text);

    if (!result || !result.visual_prompt) {
      return NextResponse.json({ clip: { ...targetClip, status: "failed", errorLog: "Invalid JSON response", final_json_output: null } });
    }

    let flattened = result.visual_prompt.full_flattened_prompt;
    if (!flattened) {
      const vp = result.visual_prompt;
      flattened = `Subjects: ${vp.subjects?.map((s: any) => `${s.visual_dna_full}. Outfit: ${s.outfit_dna || ''}`).join('. ') || ''}. Environment Invariant: ${vp.environment_invariant || JSON.stringify(vp.environment)}. Lighting Invariant: ${vp.lighting_invariant || 'Natural'}. Camera Invariant: ${vp.camera_invariant || 'Cinematic'}. Action: ${vp.action_variant}`.replace(/\n/g, ' ').trim();
    }

    const updatedClip = {
      ...targetClip,
      status: 'completed',
      flattenedPrompt: flattened,
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
