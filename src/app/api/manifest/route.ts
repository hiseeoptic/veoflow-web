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

    // PRODUCT MODE: detect product commercial projects
    const isProductMode = /\[MODE:\s*PRODUCT_COMMERCIAL/i.test(project.script || "")
      || (project.characters || []).some((c: any) => String(c.id || "").startsWith("product"));
    const productManifestNote = isProductMode ? `

[PRODUCT COMMERCIAL MODE]
This project's hero is a PRODUCT (character id starts with "product"). For the product character:
- visual_dna_full: 150+ word forensic PRODUCT description (container shape/material/size, cap, label layout, logo, typography, finish, light behavior on surface) - copy user fields VERBATIM
- eye_details_locked = LABEL DNA verbatim
- skin_texture_locked = SURFACE FINISH (material, reflectivity)
- accessories_locked = BRAND COLORS verbatim
- gait_posture_locked = PRODUCT MOTION STYLE (rotation/levitation manner)
- signature_props_locked = full INGREDIENT list, each with forensic visual description
- identity_negatives = "no label distortion, no warped label text, no logo changes, no container shape morphing, no extra products, no color shift on brand palette"
- voice settings = narrator profile (warm, trustworthy)
environment_lock.master_state should describe ONE studio set: seamless gradient backdrop in brand colors, surface (marble/wood/acrylic), softbox + rim lighting - reused in every clip.
camera_lock: macro-capable lens (100mm macro or 50mm), low ISO clean image, 24fps; note that VFX scenes may use 120fps slow-mo ramps.
scene_bible_tokens MUST include: backdrop spec, key+rim lighting spec, container finish spec, brand color hex-like values.` : "";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${generationContext}
${productManifestNote}
[ECOSYSTEM SOURCE LIBRARY - INJECTED FOR REFERENCE]
${ecosystemInjection}

[PROJECT INPUT]
Title: ${project.title}
Style: ${project.style}
Tone: ${project.tone || "Professional"}
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
- "audio_lock": object with ambient_layer_base, reverb_profile, voice_profile_id, region, accent_strength, timbre, pitch_range_hz, speech_rate_wpm, emotion_band
- "scene_bible_tokens": array of 5-10 SHORT VERBATIM strings (each <120 chars) - PHASE 2 CRITICAL:
    These are the IMMUTABLE STYLE TOKENS that must be REPEATED IDENTICALLY in every clip's flattened prompt.
    Examples:
      "4200K warm tungsten key light + 5600K cool rim light"
      "85mm f/1.8 cinema lens, shallow DoF, 24fps shutter 180°"
      "Kodak Vision3 250D film stock emulation, slight grain"
      "DCI-P3 color grade: teal shadows, warm highlights, contrast 1.2"
      "Camera height: eye-level 1.6m, horizon lock ±3 degrees"
      "Ambient: low-frequency room tone -42dB, no music bed"
    These tokens act as 'style fingerprints' that prevent visual drift across 5-10 minute videos.
    Make them SPECIFIC, MEASURABLE, and SHORT (will be copy-pasted into 40+ prompts).`,
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

    // PHASE 2: Extract scene_bible_tokens with fallback if AI didn't generate
    const sceneBibleTokens: string[] = Array.isArray(data.scene_bible_tokens)
      ? data.scene_bible_tokens.filter((t: any) => typeof t === "string" && t.length > 0 && t.length < 200)
      : [];

    // VOICE FIX: Enforce gender-appropriate pitch ranges to prevent voice swap
    for (const cm of characterManifests) {
      // PRODUCT MODE: skip gender-pitch enforcement for product heroes (narrator V.O. instead)
      if (String(cm.character_id || "").startsWith("product")) continue;
      const proj = (project.characters || []).find((p: any) => p.id === cm.character_id || p.name === cm.character_id);
      const gender = proj?.gender || (cm.character_id?.includes("female") || cm.character_id?.includes("nu") ? "female" : "male");
      // Force pitch range if missing or gender-mismatched
      const isFemalePitch = /1[8-9]\d|2\d\d|3\d\d/.test(cm.pitch_range_hz || "");
      const isMalePitch = /[5-9]\d-1[3-5]\d|^1[0-4]\d/.test(cm.pitch_range_hz || "");
      if (gender === "female" && !isFemalePitch) {
        cm.pitch_range_hz = "180-260 Hz";
      } else if (gender === "male" && !isMalePitch) {
        cm.pitch_range_hz = "100-140 Hz";
      }
      // Mark voice_dna_tech with gender for downstream binding
      if (!cm.voice_dna_tech || cm.voice_dna_tech.length < 10) {
        cm.voice_dna_tech = gender === "female"
          ? "feminine resonance, soft head voice, smooth vibrato"
          : "masculine chest resonance, firm baritone, low formant";
      }
    }

    // Fallback: derive tokens from camera_lock + audio_lock if none generated
    if (sceneBibleTokens.length === 0 && data.camera_lock) {
      const cam = data.camera_lock;
      if (cam.lens_profile) sceneBibleTokens.push(`Lens: ${cam.lens_profile}`);
      if (cam.grading_lut) sceneBibleTokens.push(`Color grade: ${cam.grading_lut}`);
      if (cam.fps) sceneBibleTokens.push(`Frame rate: ${cam.fps}fps, shutter ${cam.shutter_angle || 180}°`);
      if (data.audio_lock?.ambient_layer_base) sceneBibleTokens.push(`Ambient: ${data.audio_lock.ambient_layer_base}`);
    }

    const manifest = {
      project_id: project.id,
      generated_at: compiledManifest.generated_at,
      world_spec_ref: "v1.8.1",
      character_manifests: characterManifests,
      environment_lock: data.environment_lock || {},
      camera_lock: data.camera_lock || {},
      audio_lock: data.audio_lock || {},
      scene_bible_tokens: sceneBibleTokens
    };

    return NextResponse.json({ manifest });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
