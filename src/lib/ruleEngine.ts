import { MasterManifest, VideoClip } from "./types";
import { environmentLibrary } from "./environment/environmentLibrary";

export const FORBIDDEN_TERMS = [
  "same environment", "same scene", "same character", "same outfit",
  "same camera", "same lighting", "same as before", "same as above",
  "like before", "as previously", "repeat the", "keep the same",
  "unchanged", "identical to", "copy from", "refer to previous",
  "use previous", "maintain same", "no change", "as in clip",
  "similar to above", "continue with same", "ignore time memory"
];

const WORLD_GEN_SPEC = `
[GLOBAL EXECUTION DIRECTIVE]
MODE: STRICT_EXECUTOR
AUTHORITY: SCHEMA_OVER_MODEL
VIOLATION_BEHAVIOR: HALT_AND_REPORT

[LAYER 1: VISUAL REALITY]
- No cinematic stylization that contradicts physical realism.
- Lighting must follow weather and time-of-day strictly.
- Shadows must have imperfect edges (Shadow Realism Patch v1.2).

[LAYER 2: ENTITY CONTINUITY]
- Identity Persistence: Absolute. No model default faces.
- Presence: All entities must be declared. No teleporting.

[LAYER 3: VEO FLOW 8s TIMELINE]
- Clip Duration: EXACTLY 8.0 seconds.
- No single static shot for entire clip.
- Camera switch allowed only with narrative reason.
`;

const VEO_CODEX_CORE = `
[PART I: CHARACTER]
- Identity is visual memory. Do not alter hair, skin tone, or outfit details explicitly defined in the Master Manifest.

[PART II: LIGHTING]
- Light is emotion. Kelvin temperature must track the emotional arc (e.g., 4200K for calm, 6000K for tension).
- Shadows must have character memory.

[PART III: CAMERA]
- The camera feels, it does not just watch.
- Maintain lens continuity (e.g., 35mm vs 85mm) unless emotion shifts.
- Horizon lock: Pitch constraints min -3, max +3 degrees.

[PART V: VARIATION RULES]
- Constant Identity Rule: Visual identity immutable.
- Emotional Flow Rule: Emotion intensity varies max 20% per clip.
- No Visual Addition Rule: No new props without narrative cause.

[PART XV: DIALOGUE & SUBTEXT]
- Dialogue must fit within the 8s shot.
- Subtext Encoding: Every line carries literal content AND emotional contradiction.
`;

export interface RuleEngineType {
  forbiddenTerms: string[];
  specs: { world: string; codex: string };
  getSystemInstruction: () => string;
  getManifestGenerationContext: () => string;
  getClipGenerationContext: (clip: VideoClip, manifest: MasterManifest, prevContext?: string) => string;
}

export const buildRuleEngine = (): RuleEngineType => {
  return {
    forbiddenTerms: FORBIDDEN_TERMS,
    specs: { world: WORLD_GEN_SPEC, codex: VEO_CODEX_CORE },

    getSystemInstruction: () => `
SYSTEM ROLE: VEO FLOW 3 COMPILER (STRICT MODE v1.9).

YOU ARE NOT A CREATIVE WRITER. YOU ARE A JSON COMPILER.
YOUR GOAL: Convert Input Context Data into Strict JSON satisfying the 'visual_prompt' Schema.

[ECOSYSTEM FULL ENFORCE]
You MUST include ALL ecosystem components in output:
- Archetype (ID & Meta)
- Constraints (Physics)
- Layers
Do not summarize. Flatten complex objects into strings if schema requires strings.

[CRITICAL: MULTI-CHARACTER & ECOSYSTEM SYNC]
- Output 'visual_prompt.subjects' MUST be an ARRAY containing full details for ALL characters present.
- Output 'visual_prompt.environment' MUST mirror the 'environment_definition.master_state'.
- Do NOT summarize. REPEAT the visual DNA and environment rules verbatim.

[CRITICAL: OUTPUT FORMAT]
The output MUST be a valid JSON Object.
The field visual_prompt is MANDATORY and must be STRUCTURED (subjects, environment, etc.), NOT a flattened string.

[FORCE FULL OUTPUT]
Generate full data. Do NOT truncate. Do NOT use placeholders like "same as above".
Every clip must be self-contained for generation.

[SOURCE OF TRUTH]
${WORLD_GEN_SPEC}

[CODEX RULES]
${VEO_CODEX_CORE}

[PROHIBITED PHRASES]
Usage of terms like "${FORBIDDEN_TERMS.join('", "')}" will cause a SYSTEM HALT.
    `,

    getManifestGenerationContext: () => `
TASK: Generate 'Master Manifest' (The Project DNA).
REQUIREMENTS:
- Define strictly 4 Locks: Character Visuals, Environment, Camera, Audio.
- Character descriptions must be >150 words each.
- Lighting must be defined in Kelvin and Lux behavior.
- Output must be a valid JSON Object matching the 'MasterManifest' schema.
    `,

    getClipGenerationContext: (clip, manifest, prevContext) => {
      const charCount = manifest.character_manifests ? manifest.character_manifests.length : 0;
      const multiCharInstruction = charCount > 1
        ? `[MULTI-CHARACTER ENFORCEMENT]\nThis project contains ${charCount} locked characters. You MUST populate the 'visual_prompt.subjects' array with ALL of them.`
        : "";

      const continuityRule = environmentLibrary.temporalRules["continuity_lock"];

      return `
[INPUT: MASTER MANIFEST (READ-ONLY)]
${JSON.stringify(manifest)}

[INPUT: CURRENT SCENE ACTION]
Sequence: ${clip.sequence}
Action: ${clip.actionSummary}
Dialogue: "${clip.scriptSegment}"
Character Ref: ${clip.characterId}

[INPUT: PRIOR CLIP CONTEXT (FOR CONTINUITY)]
${prevContext || "Start of sequence. No prior motion."}

[CONTINUITY ENFORCE]
Time Memory: ${continuityRule?.time_memory ? "Repeat ref clip state verbatim" : "No recall"}
Temporal Variation Rules: ${continuityRule?.variation_rules || "standard"}

${multiCharInstruction}
      `;
    }
  };
};

export const RuleEngine = buildRuleEngine();
