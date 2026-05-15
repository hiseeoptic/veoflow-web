import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildRuleEngine } from "@/lib/ruleEngine";
import { compileMasterManifest } from "@/lib/manifestCompiler";
import { environmentLibrary } from "@/lib/environment/environmentLibrary";
import { validateEnvironment } from "@/lib/environment/environmentValidator";
import { validateArchetype } from "@/lib/validator";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ruleEngine = buildRuleEngine();

export async function POST(req: NextRequest) {
  try {
    const { project } = await req.json();

    try { validateEnvironment(project); } catch {}

    const systemInstruction = ruleEngine.getSystemInstruction();
    const generationContext = ruleEngine.getManifestGenerationContext();
    const ecosystemInjection = JSON.stringify(environmentLibrary);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      max_tokens: 16384,
      messages: [
        { role: "system", content: systemInstruction },
        {
          role: "user",
          content: `${generationContext}

[ECOSYSTEM SOURCE LIBRARY - INJECTED FOR REFERENCE]
${ecosystemInjection}

[PROJECT INPUT]
Title: ${project.title}
Style: ${project.style}
Characters: ${JSON.stringify((project.characters || []).map((c: any) => ({ id: c.id, name: c.name, desc: c.clothing, voice_id: c.voice_profile_id })))}
Script Sample: ${project.script.substring(0, 2000)}...

[OUTPUT INSTRUCTION]
Return a JSON object with these top-level keys:
- "character_manifests": array of character manifest objects (character_id, visual_dna_full >150 words, voice_profile_id, region, accent_strength, timbre, pitch_range_hz, speech_rate_wpm, emotion_band, voice_dna_tech)
- "environment_lock": object with "master_state" containing full EnvironmentMasterState
- "camera_lock": object with lens_profile, grading_lut, fps, shutter_angle
- "audio_lock": object with ambient_layer_base, reverb_profile, voice_profile_id, region, accent_strength, timbre, pitch_range_hz, speech_rate_wpm, emotion_band`
        }
      ]
    });

    const text = response.choices[0]?.message?.content || "{}";
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
