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

/**
 * PHASE 3: Run VLM critic agent in-process (avoids extra HTTP round-trip).
 * Returns null if disabled or on error.
 */
async function runCritic(
  generatedPrompt: any,
  masterManifest: any,
  previousClipContext: string | undefined,
  iteration: number
): Promise<any | null> {
  try {
    const critic = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `[MASTER MANIFEST LOCKS]
${JSON.stringify({
  characters: (masterManifest.character_manifests || []).map((c: any) => ({
    id: c.character_id,
    eye: c.eye_details_locked,
    skin: c.skin_texture_locked,
    accessories: c.accessories_locked,
    props: c.signature_props_locked,
  })),
  env_class: masterManifest.environment_lock?.master_state?.environment_class,
  camera: masterManifest.camera_lock,
  scene_bible_tokens: (masterManifest as any).scene_bible_tokens || [],
}, null, 2)}

[PREVIOUS CLIP]
${previousClipContext || "Start of sequence."}

[GENERATED PROMPT TO AUDIT]
${JSON.stringify(generatedPrompt).substring(0, 6000)}

[ITERATION] ${iteration}/3

Return JSON: {drift_score (0-1), issues[{category, severity, description, suggested_fix}], verdict ("pass"|"warning"|"regenerate_required"), suggested_correction}`,
      config: {
        systemInstruction: `You are a strict CONTINUITY SUPERVISOR. Audit the generated prompt against the manifest locks.
Detect drift in: character (hair/eyes/outfit/accessories), environment, lighting, camera, scene_bible_tokens (must appear verbatim).

CRITICAL VOICE-SWAP DETECTION (highest priority):
- Check every dialogue line has visual_descriptor and voice_fingerprint
- Verify the descriptor matches the speaker's actual gender + appearance from manifest
- Flag as HIGH severity if: male character has female-pitch voice (or vice versa)
- Flag as HIGH severity if: dialogue speaker doesn't have face visible in matching timestamp_subshot
- Flag as HIGH severity if: off-screen character is somehow rendered as visible

Severity: high (viewer notices), medium (close inspection), low (cosmetic).
Score: 3+ high = 0.8+, 1-2 high = 0.5-0.7, only medium/low = <0.5.
Voice swap alone = automatic 0.7+ score.`,
        responseMimeType: "application/json",
        maxOutputTokens: 4096,
        temperature: 0.2,
      },
    });
    const report = JSON.parse(critic.text || "{}");
    // BUGFIX: Force verdict from drift_score (model sometimes ignores threshold)
    const score = Math.max(0, Math.min(1, Number(report.drift_score) || 0));
    report.drift_score = score;
    if (score >= 0.5) report.verdict = "regenerate_required";
    else if (score >= 0.3) report.verdict = "warning";
    else report.verdict = "pass";
    return report;
  } catch (e) {
    console.warn("Critic check failed (non-fatal):", e);
    return null;
  }
}

/** BUGFIX: strip nested speaker prefix from dialogue text to prevent "Speaker says: 'Speaker: text'" */
function cleanDialogueText(text: string, speaker: string): string {
  if (!text) return "";
  let clean = text.trim();
  // Remove "Speaker:" or "Speaker (modifier):" prefix from text
  const speakerEscaped = speaker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefixRegex = new RegExp(`^${speakerEscaped}\\s*(?:\\([^)]+\\))?\\s*:\\s*`, "i");
  clean = clean.replace(prefixRegex, "");
  // Strip leading/trailing quotes if present
  clean = clean.replace(/^["“”']+|["“”']+$/g, "").trim();
  return clean;
}

export async function POST(req: NextRequest) {
  try {
    const { project, targetClip, masterManifest, previousClipContext, enableCritic = true } = await req.json();

    try { validateEnvironment(project, targetClip); } catch (e: any) {
      return NextResponse.json({ clip: { ...targetClip, status: 'failed', errorLog: e.message, final_json_output: null } });
    }

    // === BUGFIX: Detect characters ACTUALLY present in this scene ===
    // Prevents "phantom character" / ghost rendering when AI feeds all character DNA
    // even for scenes with only one character.
    const allCharacters = masterManifest.character_manifests || [];
    const sceneText = `${targetClip.scriptSegment} ${targetClip.actionSummary}`.toLowerCase();
    const targetCharId = String(targetClip.characterId || "").toLowerCase();

    const presentCharacters = allCharacters.filter((c: any) => {
      const id = String(c.character_id || "").toLowerCase();
      const nameFromId = id.replace(/^char-/, "").replace(/[_-]/g, " ");
      // Always include the target character
      if (id === targetCharId) return true;
      // Include other characters only if their name/id appears in the scene action or dialogue
      if (id && sceneText.includes(id)) return true;
      if (nameFromId && sceneText.includes(nameFromId)) return true;
      return false;
    });

    const offScreenCharacters = allCharacters.filter((c: any) =>
      !presentCharacters.find((p: any) => p.character_id === c.character_id)
    );

    const assembledContextJSON = assembleClipPrompt({
      manifest: {
        environment_lock: masterManifest.environment_lock,
        // Only feed characters actually in scene to prevent ghost rendering
        character_manifests: presentCharacters,
        outfit_state: "Refer to character_manifests",
        camera_lock: masterManifest.camera_lock,
        audio_lock: masterManifest.audio_lock
      },
      subject_identity: "",
      action: targetClip.actionSummary,
      dialogue: targetClip.scriptSegment
    });

    // === BUGFIX: Language detection from script ===
    // Force output language matching script to prevent English drift
    const vietnamesePattern = /[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
    const isVietnamese = vietnamesePattern.test(targetClip.scriptSegment);
    const languageLock = isVietnamese
      ? "Vietnamese (Tiếng Việt) - ALL action descriptions, dialogue, and prompt text MUST be in Vietnamese. NO English mixing except technical terms like 'medium shot', '85mm', 'fps'."
      : "English - ALL action descriptions and dialogue MUST be in English.";

    const additionalContext = ruleEngine.getClipGenerationContext(targetClip, masterManifest, previousClipContext);

    // BUGFIX: Off-screen character note (don't render them, but acknowledge dialogue source)
    const offScreenBlock = offScreenCharacters.length > 0
      ? `\n[OFF-SCREEN CHARACTERS - DO NOT RENDER, DO NOT INCLUDE IN visual_prompt.subjects]
The following characters are NOT physically in this scene. Their voice may be heard off-camera (V.O.) but they MUST NOT appear visually:
${offScreenCharacters.map((c: any) => `- ${c.character_id}`).join("\n")}
CRITICAL: Do not include these in visual_prompt.subjects. Do not describe them visually. They produce no shadow, no reflection, no background figure.\n`
      : "";

    // === VOICE FIX: Build Voice Profile Cards for active speakers ===
    // Per Veo 3 community research (glbgpt.com, skywork.ai): dialogue should be
    // tagged with VISUAL DESCRIPTOR of the speaker, not just name. This lets Veo
    // correctly assign voice to the right character.
    const buildSpeakerDescriptor = (c: any): string => {
      const gender = c.gender === "female" ? "woman" : "man";
      const ageHint = c.age_group ? `${c.age_group}-year-old` : "";
      const hairDesc = c.hair || c.hair_dna || "";
      const outfit = c.clothing || "";
      const distinguishing: string[] = [];
      if (hairDesc) distinguishing.push(hairDesc);
      if (outfit) distinguishing.push(`in ${outfit}`);
      return `the ${ageHint} ${gender} ${distinguishing.join(", ")}`.replace(/\s+/g, " ").trim();
    };

    // Get full character data (not just manifest) for descriptors
    const projChars = project.characters || [];
    const allCharsWithProj = allCharacters.map((m: any) => {
      const proj = projChars.find((p: any) => p.id === m.character_id || p.name === m.character_id);
      return { ...m, ...(proj || {}) };
    });

    const voiceProfileBlock = allCharsWithProj.length > 0
      ? `\n[VOICE PROFILE ANCHORS - STRICT SPEAKER-TO-VOICE BINDING]
This is the MOST IMPORTANT block to prevent voice swap. Veo MUST bind these voices to these visual descriptors:

${allCharsWithProj.map((c: any) => {
  const descriptor = buildSpeakerDescriptor(c);
  return `▸ Character ID: ${c.character_id}
  Visual descriptor (use this in dialogue tags): "${descriptor}"
  Voice timbre: ${c.timbre || c.voice_timbre || "neutral"}
  Pitch range: ${c.pitch_range_hz || (c.gender === "female" ? "180-260 Hz" : "100-140 Hz")}
  Accent: ${c.region || ""} ${c.accent_strength || "standard"}
  Speech rate: ${c.speech_rate_wpm || 140} wpm
  Emotion band: ${c.emotion_band || "neutral"}`;
}).join("\n\n")}

[CRITICAL VOICE BINDING RULES]
1. Each dialogue line MUST start with the visual descriptor, NOT just the character name.
   BAD:  "Sếp Tuấn says: 'Linh này...'"
   GOOD: "The man with short black hair in dark business suit says with authoritative deep voice: 'Linh này...'"
2. The character whose FACE is on-camera during a dialogue line MUST be the one speaking that line.
3. NEVER let a female character speak with a male voice (or vice versa) - check pitch range strictly.
4. If a character is off-screen (V.O.), explicitly mark "(off-screen voice, deep male timbre 100-140 Hz)" in dialogue.
5. Active speaker must have a close-up or medium close-up shot in their dialogue's sub-shot timestamp.\n`
      : "";

    const userPromptContent = `[INPUT CONTEXT JSON]
${assembledContextJSON}

[LANGUAGE LOCK]
Output language: ${languageLock}

[ON-SCREEN CHARACTERS (RENDER THESE ONLY)]
${presentCharacters.map((c: any) => `- ${c.character_id}`).join("\n") || "- (no characters in scene - environment only)"}
${offScreenBlock}${voiceProfileBlock}
[ADDITIONAL RULES & CONTINUITY]
${additionalContext}`;

    try {
      validateUnifiedPrompt(userPromptContent, ruleEngine, 1000);
    } catch (validationError: any) {
      return NextResponse.json({ clip: { ...targetClip, status: 'failed', errorLog: `Validation: ${validationError.message}`, final_json_output: null } });
    }

    const systemInstruction = ruleEngine.getSystemInstruction();

    // PHASE 2: Extract scene_bible_tokens for verbatim repetition
    const sceneBibleTokens: string[] = (masterManifest as any).scene_bible_tokens || [];
    const sceneBibleBlock = sceneBibleTokens.length > 0
      ? `\n[SCENE BIBLE TOKENS - MUST APPEAR VERBATIM IN full_flattened_prompt]\n${sceneBibleTokens.map((t: string, i: number) => `${i + 1}. "${t}"`).join("\n")}\n`
      : "";

    // PRODUCT MODE detection: script header marker OR product-hero subject present
    const isProductMode = /\[MODE:\s*PRODUCT_COMMERCIAL/i.test(project.script || "")
      || allCharacters.some((c: any) => String(c.character_id || "").startsWith("product"));
    const productModeBlock = isProductMode ? `

[PRODUCT COMMERCIAL MODE - ACTIVE]
The hero "subject" of this clip is a PRODUCT, not a human. Adjust all rules:
1. subjects[0] = the product. Its visual_dna_full, outfit_dna (= container DNA), accessories (= brand colors),
   signature_props (= ingredients) MUST repeat VERBATIM from manifest in every clip.
2. NO human face/identity rules apply. Instead: CONTAINER GEOMETRY LOCK - same bottle shape, same label
   layout, same logo position, same cap, same material finish in every frame.
3. Use VFX motion vocabulary in action_variant and timestamp_subshots:
   ORBIT (360° arc around product), SPIRAL-IN (ingredients fly shrinking circles into container),
   LEVITATION, SLOW-MO DROP (120fps ramp), PARTICLE TRAIL (glowing light streams),
   MACRO GLIDE (extreme close-up across texture), BURST-REVERSE, ASSEMBLY, LIGHT SWEEP, DOLLY PUSH-IN.
4. Describe ingredient flight paths GEOMETRICALLY: direction (clockwise/counter-clockwise),
   radius change (40cm -> 5cm), speed (slow majestic / quick snap), entry point (bottle mouth).
5. Lighting = studio product photography: softbox key + rim light + gradient seamless backdrop
   in brand colors. Specular highlights on container IDENTICAL across clips.
6. dialogue = narrator voiceover only (speaker: "Narrator"), warm trustworthy tone, no on-screen speaker.
7. negative_prompt MUST add: "no label distortion, no warped text on label, no extra products,
   no brand logo changes, no container shape morphing, no human hands unless scripted, consistent backdrop".
8. Physics elegance: ingredients move with weight and grace - herbs flutter, liquids arc,
   powders billow. No teleporting; every entry/exit is a smooth continuous path.` : "";

    // NUMEROLOGY MODE detection: viral short-video style, NOT cinematic-detail style
    const isNumeroMode = /\[MODE:\s*NUMEROLOGY/i.test(project.script || "");
    const numeroModeBlock = isNumeroMode ? `

[NUMEROLOGY VIRAL MODE - ACTIVE — ƯU TIÊN HƠN MỌI QUY TẮC ĐIỆN ẢNH DÀI DÒNG]
Đây là VIDEO VIRAL THẦN SỐ HỌC ngắn (TikTok/Reel), KHÔNG phải phim điện ảnh. Ghi đè:
1. THOẠI NGẮN — GIỮ VERBATIM: copy ĐÚNG câu thoại trong input, TỐI ĐA 16 từ. TUYỆT ĐỐI KHÔNG mở rộng,
   không thêm chữ, không thuyết giảng, không liệt kê. Một câu đắt giá. dialogue[].text = đúng câu gốc.
2. BỐI CẢNH THEO TỪNG CẢNH (KHÔNG khóa cứng 1 environment): mô tả environment theo đúng ẩn dụ của action_variant
   trong cảnh này. Mỗi cảnh có thể ở nơi khác nhau (đường phố, mỏm núi, sân thượng, quán xá...). KHÓA NHÂN VẬT
   (mặt/tóc/trang phục giữ nguyên) nhưng KHÔNG ép bối cảnh giống nhau.
3. HÌNH ẢNH ẨN DỤ + CÓ DUYÊN/HÀI NHẸ: action_variant và timestamp_subshots phải kể bằng hình ảnh ẩn dụ
   sống động, đúng nội dung, relatable, có một chút hài để người xem mỉm cười. KHÔNG generic kiểu
   "ngồi bàn lướt laptop, nhìn xa xăm".
4. NGẮN GỌN: full_flattened_prompt KHÔNG cần dài 5000 ký tự — viết SÚC TÍCH, đủ để Veo hiểu cảnh + nhân vật +
   hành động + thoại ngắn. Bỏ mọi đoạn lặp DNA lê thê. Ưu tiên hình ảnh hơn chữ nghĩa.
5. visual_dna_full của persona: mô tả gọn (40-70 từ) đủ giữ nhận diện, KHÔNG cần >150 từ.
6. ÁNH SÁNG & TÔNG MÀU phục vụ cảm xúc nhịp (lạnh/cô đơn ở Problem, ấm/vỡ òa ở Payoff).` : "";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPromptContent + sceneBibleBlock + productModeBlock + numeroModeBlock,
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
  - dialogue (array of {speaker, text, visual_descriptor, voice_fingerprint}) - VOICE FIX:
      - speaker: character_id (e.g. "char-sep_tuan")
      - text: ONLY the dialogue words, no speaker prefix
      - visual_descriptor: REQUIRED - exact descriptor from [VOICE PROFILE ANCHORS] block
        e.g. "the middle-aged Vietnamese man with short black hair in dark business suit"
      - voice_fingerprint: REQUIRED - timbre + pitch range + accent
        e.g. "medium_deep_authoritative, 100-140 Hz, Northern Vietnamese standard"
      These fields force Veo to bind the right voice to the right face.
  - technical (object)
  - negative_prompt (string) - PHASE 1: explicit negatives for Veo
  - timestamp_subshots (array) - PHASE 2: 4 sub-shots within 8s clip, each {time, description, sfx?, active_speaker_id?}
      VOICE FIX: include "active_speaker_id" when dialogue happens in this sub-shot.
      The active speaker's face MUST be on camera (close-up or medium close-up) during their line.
      Example: [
        {"time": "00:00-00:02", "description": "Medium close-up on the man with short black hair in suit at his desk", "active_speaker_id": "char-sep_tuan"},
        {"time": "00:02-00:04", "description": "Same medium close-up on the man in suit, mouth moving as he speaks", "active_speaker_id": "char-sep_tuan"},
        {"time": "00:04-00:06", "description": "Cut to medium close-up on the young woman with long black hair, reaction", "active_speaker_id": null},
        {"time": "00:06-00:08", "description": "Same shot on the woman, she begins replying", "active_speaker_id": "char-linh_nhan_vien"}
      ]
      Per Google official Veo 3.1 guide: timestamp prompting creates dynamic, cinematic 8s clips.
      Each sub-shot ~2s. Adjust shots to match action_variant pacing.
  - scene_bible_tokens_used (array of strings) - PHASE 2: list the EXACT tokens from scene bible you included in full_flattened_prompt
  - full_flattened_prompt (string >5000 chars combining all invariants verbatim)
- audio_config: object with ambient_layer_base, reverb_profile, voice_profile_id, region, accent_strength, timbre, pitch_range_hz, speech_rate_wpm, emotion_band, text
- metadata: object with continuity_hash, validation_passed

[CRITICAL: DIALOGUE FORMAT IN full_flattened_prompt]
When you write dialogue inside full_flattened_prompt, use COLON FORMAT:
  CharacterName says: "exact dialogue text only - NO speaker prefix inside the quotes"
This format prevents Veo from rendering subtitles in the video.
DO NOT use formats like "CharacterName: text". Always include 'says:' before the quoted string.
BAD: Sếp Tuấn says: "Sếp Tuấn: Linh này..." (nested prefix - WRONG)
GOOD: Sếp Tuấn says: "Linh này, anh muốn em tạo ra..." (clean)
Also, in visual_prompt.dialogue array, the "text" field MUST contain ONLY the dialogue, never "Speaker: ..." or "(V.O.):" prefixes. Put any modifier like (V.O.) or (thở dài) in a separate context note in action_variant, not inside text.

[CRITICAL: NEGATIVE_PROMPT FIELD]
The negative_prompt field is MANDATORY. It must explicitly list things that MUST NOT change between clips:
- hair, outfit, accessories, facial features, skin tone, signature_props
Plus generic technical negatives: "no text overlays, no watermarks, no subtitles, no extra fingers, no blurry faces, no cartoon effects"

[CRITICAL PHASE 2: SCENE BIBLE TOKENS VERBATIM]
You received scene bible tokens at the bottom of the input. You MUST:
1. Copy each token VERBATIM (character-for-character) into full_flattened_prompt
2. List which ones you used in scene_bible_tokens_used array
3. DO NOT paraphrase, abbreviate, or substitute synonyms for these tokens
4. They act as style fingerprints to prevent visual drift across the video

[CRITICAL PHASE 2: TIMESTAMP SUBSHOTS IN full_flattened_prompt]
Include the timestamp_subshots in full_flattened_prompt using this exact format:
[00:00-00:02] <description>
[00:02-00:04] <description>
[00:04-00:06] <description>
[00:06-00:08] <description>
This creates dynamic camera movement instead of one static 8s shot.

[CRITICAL BUGFIX: ON-SCREEN CHARACTERS ONLY]
The [ON-SCREEN CHARACTERS] block in the user prompt lists exactly which characters can appear visually.
- visual_prompt.subjects MUST contain ONLY these on-screen characters
- NEVER include off-screen characters' visual DNA in subjects
- If an off-screen character speaks (V.O.), include their dialogue ONLY in dialogue array, NOT in subjects
- DO NOT add background figures, shadows, reflections of off-screen characters
- Single-character scenes must have EXACTLY ONE subject - no phantom second person

[CRITICAL BUGFIX: LANGUAGE LOCK]
Follow the [LANGUAGE LOCK] directive at the top of the user prompt EXACTLY.
If the script is in Vietnamese, ALL action_variant, environment descriptions, lighting descriptions, and dialogue MUST be in Vietnamese.
Technical camera terms (medium shot, 50mm, fps, 4200K) may stay in English/numbers, but everything else stays in the script's language.
NEVER auto-translate dialogue to English.

[CRITICAL VOICE FIX: SPEAKER-VOICE BINDING]
The [VOICE PROFILE ANCHORS] block at the top of user prompt is the ULTIMATE authority for voice assignment.
For EVERY dialogue line you generate:
1. Determine WHO is speaking (use character_id)
2. Copy their visual descriptor and voice fingerprint from [VOICE PROFILE ANCHORS]
3. Put visual descriptor in dialogue[].visual_descriptor field
4. Put voice fingerprint in dialogue[].voice_fingerprint field
5. In full_flattened_prompt, format as: "<visual_descriptor> (voice: <voice_fingerprint>) says: \\"<text>\\""
6. In timestamp_subshots, mark active_speaker_id for the sub-shot containing the dialogue
7. The active speaker's FACE MUST be in close-up or medium close-up during their dialogue line

VOICE SWAP IS A CRITICAL FAILURE. If male character speaks with female voice (or vice versa), the entire clip is rejected.
Pitch ranges: Male typically 100-140 Hz, Female typically 180-260 Hz. Cross-binding is FORBIDDEN.

[CRITICAL: SINGLE-SPEAKER PREFERENCE]
If the scene has multiple characters but only ONE speaks, the other character should be:
- Visible but silent (reaction shot), OR
- Off-camera entirely
Multi-speaker overlapping dialogue in 8 seconds causes voice confusion - prefer turn-taking with clear camera cuts between speakers.`,
        responseMimeType: "application/json",
        maxOutputTokens: 16384,
      }
    });

    const text = response.text || "{}";
    const result = JSON.parse(text);

    if (!result || !result.visual_prompt) {
      return NextResponse.json({ clip: { ...targetClip, status: "failed", errorLog: "Invalid JSON response", final_json_output: null } });
    }

    // BUGFIX: Filter visual_prompt.subjects to only ON-SCREEN characters
    // Prevents Veo from rendering a "ghost" of the off-screen character
    if (Array.isArray(result.visual_prompt.subjects) && presentCharacters.length > 0) {
      const presentIds = new Set(presentCharacters.map((c: any) => String(c.character_id).toLowerCase()));
      result.visual_prompt.subjects = result.visual_prompt.subjects.filter((s: any) =>
        presentIds.has(String(s.character_id || "").toLowerCase())
      );
      // If model dropped all subjects, fall back to forcing present characters back in
      if (result.visual_prompt.subjects.length === 0) {
        result.visual_prompt.subjects = presentCharacters.map((c: any) => ({
          character_id: c.character_id,
          visual_dna_full: c.visual_dna_full,
          eye_details: c.eye_details_locked,
          skin_texture: c.skin_texture_locked,
          accessories: c.accessories_locked,
          gait_posture: c.gait_posture_locked,
          signature_props: c.signature_props_locked,
        }));
      }
    }

    // BUGFIX: clean nested "Speaker says: 'Speaker: text'" in AI-generated flattened prompt
    if (result.visual_prompt.full_flattened_prompt) {
      result.visual_prompt.full_flattened_prompt = result.visual_prompt.full_flattened_prompt
        // Speaker says: "Speaker: text"  ->  Speaker says: "text"
        .replace(/(\w+(?:\s\w+)?)\s+says:\s*"\s*\1\s*(?:\([^)]+\))?\s*:\s*/gi, '$1 says: "')
        // Speaker says: ""Speaker: text""  ->  Speaker says: "text"
        .replace(/(\w+(?:\s\w+)?)\s+says:\s*""\s*\1\s*:\s*([^"]+?)""/gi, '$1 says: "$2"');
    }

    // Clean nested prefixes in dialogue.text array too
    if (Array.isArray(result.visual_prompt.dialogue)) {
      result.visual_prompt.dialogue = result.visual_prompt.dialogue.map((d: any) => ({
        ...d,
        text: cleanDialogueText(d.text || "", d.speaker || ""),
      }));
    }

    // PHASE 1+2: Build flattened prompt with COLON DIALOGUE + forensic DNA + timestamps + scene bible
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

      // VOICE FIX: dialogue uses visual descriptor + voice fingerprint (Veo community best practice)
      const dialogueStr = (vp.dialogue || []).map((d: any) => {
        const cleanText = cleanDialogueText(d.text || "", d.speaker || "");
        const descriptor = d.visual_descriptor
          || allCharsWithProj.find((c: any) => c.character_id === d.speaker)
            ? buildSpeakerDescriptor(allCharsWithProj.find((c: any) => c.character_id === d.speaker) || {})
            : (d.speaker || "the character");
        const voiceFp = d.voice_fingerprint ? ` (voice: ${d.voice_fingerprint})` : "";
        return `${descriptor}${voiceFp} says: "${cleanText}"`;
      }).join(' ');

      // PHASE 2: Format timestamp sub-shots
      const subshotsStr = (vp.timestamp_subshots || []).map((s: any) =>
        `[${s.time}] ${s.description}${s.sfx ? ` SFX: ${s.sfx}.` : ''}`
      ).join(' ');

      flattened = [
        `Subjects: ${subjectsStr}.`,
        `Environment Invariant: ${vp.environment_invariant || JSON.stringify(vp.environment)}.`,
        `Lighting Invariant: ${vp.lighting_invariant || 'Natural cinematic lighting'}.`,
        `Camera Invariant: ${vp.camera_invariant || 'Cinematic 35mm lens, eye-level'}.`,
        subshotsStr ? `Sequence: ${subshotsStr}` : `Action: ${vp.action_variant || ''}.`,
        dialogueStr ? `Dialogue: ${dialogueStr}` : '',
      ].filter(Boolean).join(' ').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // PHASE 2: ENFORCE scene_bible_tokens verbatim presence in flattened (fallback if model forgot)
    if (sceneBibleTokens.length > 0) {
      const missingTokens: string[] = [];
      for (const token of sceneBibleTokens) {
        if (!flattened.includes(token)) missingTokens.push(token);
      }
      if (missingTokens.length > 0) {
        flattened = `${flattened} [STYLE LOCK] ${missingTokens.join(' | ')}`;
      }
    }

    // PHASE 1 + VOICE FIX: Negative prompt includes anti-voice-swap directives
    const voiceSwapNegatives = allCharsWithProj.length > 1
      ? " do not swap character voices, do not let male character speak with female voice, do not let female character speak with male voice, off-screen character must not borrow on-screen character's voice, each speaker's pitch must match their voice profile,"
      : "";

    const negativePrompt = (result.visual_prompt.negative_prompt
      || "")
      + ` no text overlays, no watermarks, no subtitles, no cartoon effects, no extra fingers, no blurry faces, do not alter hair, do not change outfit, do not remove accessories, no facial hair changes, no random props,${voiceSwapNegatives}`;

    // PHASE 3: Run VLM critic feedback loop
    let criticReport: any = null;
    if (enableCritic) {
      criticReport = await runCritic(result, masterManifest, previousClipContext, 0);

      // Auto-retry once if critic says regenerate_required
      if (criticReport?.verdict === "regenerate_required" && criticReport?.suggested_correction) {
        try {
          const retryPrompt = `${userPromptContent}${sceneBibleBlock}${productModeBlock}${numeroModeBlock}

[CRITIC FEEDBACK - MANDATORY CORRECTIONS]
The first attempt had drift score ${criticReport.drift_score}. Issues:
${(criticReport.issues || []).map((i: any) => `- [${i.severity}] ${i.category}: ${i.description} -> FIX: ${i.suggested_fix}`).join("\n")}

REQUIRED CORRECTION: ${criticReport.suggested_correction}

Regenerate the visual_prompt JSON with these corrections applied STRICTLY.`;

          const retry = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: retryPrompt,
            config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json",
              maxOutputTokens: 16384,
              temperature: 0.4,
            },
          });
          const retryResult = JSON.parse(retry.text || "{}");
          if (retryResult?.visual_prompt) {
            Object.assign(result, retryResult);
            // Re-run critic on the corrected version
            const recheck = await runCritic(result, masterManifest, previousClipContext, 1);
            if (recheck) criticReport = recheck;
            // Rebuild flattened from corrected result
            if (result.visual_prompt.full_flattened_prompt) {
              flattened = result.visual_prompt.full_flattened_prompt;
            }
          }
        } catch (retryErr) {
          console.warn("Critic-driven retry failed:", retryErr);
        }
      }
    }

    const updatedClip = {
      ...targetClip,
      status: 'completed',
      flattenedPrompt: flattened,
      negativePrompt,
      final_json_output: result,
      criticReport: criticReport || undefined,
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
