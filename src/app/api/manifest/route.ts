import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { buildRuleEngine } from "@/lib/ruleEngine";
import { compileMasterManifest } from "@/lib/manifestCompiler";
import { environmentLibrary } from "@/lib/environment/environmentLibrary";
import { validateEnvironment } from "@/lib/environment/environmentValidator";
import { validateArchetype } from "@/lib/validator";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
const ruleEngine = buildRuleEngine();

export async function POST(req: NextRequest) {
  try {
    const { project } = await req.json();

    try { validateEnvironment(project); } catch {}

    const systemInstruction = ruleEngine.getSystemInstruction();
    const generationContext = ruleEngine.getManifestGenerationContext();
    const ecosystemInjection = JSON.stringify(environmentLibrary);

    // PHASE 1: Send full character data including new forensic DNA fields
    const charactersDetail = (project.characters || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      gender: c.gender,
      age_group: c.age_group,
      hair: c.hair,
      face_features: c.face_features,
      clothing: c.clothing,
      voice_profile_id: c.voice_profile_id,
      voice_timbre: c.voice_timbre,
      // Phase 1 forensic fields
      eye_details: c.eye_details,
      skin_texture: c.skin_texture,
      accessories: c.accessories,
      gait_posture: c.gait_posture,
      signature_props: c.signature_props,
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${generationContext}

[ECOSYSTEM SOURCE LIBRARY - INJECTED FOR REFERENCE]
${ecosystemInjection}

[PROJECT INPUT]
Title: ${project.title}
Style: ${project.style}
Characters (FULL DATA - use ALL fields verbatim):
${JSON.stringify(charactersDetail, null, 2)}

Script Sample: ${project.script.substring(0, 2000)}...

[OUTPUT INSTRUCTION]
Return a JSON object with these top-level keys:
- "character_manifests": array of character manifest objects with:
    - character_id (string)
    - visual_dna_full (string >150 words, comprehensive description combining hair + face + clothing + eye + skin)
    - voice_profile_id (string)
    - region (string)
    - accent_strength (string)
    - timbre (string)
    - pitch_range_hz (string)
    - speech_rate_wpm (number)
    - emotion_band (string)
    - voice_dna_tech (string)
    - eye_details_locked (string - PHASE 1: forensic eye description, e.g. "warm brown almond eyes with double eyelid")
    - skin_texture_locked (string - PHASE 1: e.g. "smooth light beige, natural pores, minimal makeup")
    - accessories_locked (string - PHASE 1: every accessory the character ALWAYS wears)
    - gait_posture_locked (string - PHASE 1: how they walk/stand/hold themselves)
    - signature_props_locked (string - PHASE 1: props that always appear with them)
    - identity_negatives (string - PHASE 1: explicit list of "do not change X" rules)
  IMPORTANT: If user provided values for these fields, use them VERBATIM. If empty, infer from name/role/description.
- "environment_lock": object with "master_state" containing full EnvironmentMasterState
- "camera_lock": object with lens_profile, grading_lut, fps, shutter_angle
- "audio_lock": object with ambient_layer_base, reverb_profile, voice_profile_id, region, accent_strength, timbre, pitch_range_hz, speech_rate_wpm, emotion_band`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        maxOutputTokens: 16384,
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);

    const characterManifests = Array.isArray(data.character_manifests) ? data.character_manifests : [];

    const compiledManifest = compileMasterManifest({
      environment: data.environment_lock || {},
      characters: characterManifests,
      outfit: { note: "Integrated into character manifests" },
      camera: data.camera_lock || {},
      voice: data.audio_lock || {}
    }, project);

    if (compiledManifest.environment_lock?.master_state?.archetype) {
      try {
        validateArchetype(compiledManifest.environment_lock.master_state.archetype);
      } catch {}
    }

    const manifest = {
      project_id: project.id,
      generated_at: compiledManifest.generated_at,
      world_spec_ref: "v1.8.1",
      character_manifests: characterManifests,
      environment_lock: data.environment_lock || {},
      camera_lock: data.camera_lock || {},
      audio_lock: data.audio_lock || {}
    };

    return NextResponse.json({ manifest });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
