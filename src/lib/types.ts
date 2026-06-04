export interface Character {
  id: string;
  name: string;
  gender: 'male' | 'female';
  age_group: string;
  hair: string;
  face_features: string;
  clothing: string;
  voice_profile_id: string;
  voice_timbre: string;
  description: string;
  imageBase64?: string;

  // === PHASE 1: Forensic-level DNA fields (anti-drift) ===
  /** e.g., "warm brown, slightly almond-shaped, double eyelid" */
  eye_details?: string;
  /** e.g., "smooth light beige, natural pores, minimal makeup, single beauty mark on left cheek" */
  skin_texture?: string;
  /** e.g., "silver wristwatch on left wrist, gold wedding band, wire-rimmed glasses" */
  accessories?: string;
  /** e.g., "confident upright posture, slow deliberate walk, hands often in pockets" */
  gait_posture?: string;
  /** Props that ALWAYS appear with this character e.g., "brown leather satchel, fountain pen, notebook" */
  signature_props?: string;

  // === PHASE 3: Green Screen Master Frame ===
  /**
   * AI-generated portrait of this character on PLAIN GREEN background.
   * Used as the universal identity anchor for I2V across ALL scenes.
   * Per Veo 3 best practice: a single master frame composited into different
   * scenes yields the highest character consistency over long videos.
   */
  masterFrameBase64?: string;
  /** Timestamp when master frame was generated (for cache invalidation) */
  masterFrameGeneratedAt?: number;
}

export interface CharacterLibraryItem {
  character_id: string;
  gender: 'male' | 'female';
  height_cm: number;
  ethnicity: string;
  face_dna: string;
  hair_dna: string;
  body_dna: string;
  expression_baseline: string;
  aesthetic_class: string;
  notes?: string;
}

export interface CharacterLibrary {
  version: string;
  description: string;
  characters: CharacterLibraryItem[];
}

export interface VisualReference {
  type: 'character' | 'environment';
  image_base64?: string;
  image_uri?: string;
  description?: string;
}

export interface CharacterManifestItem {
  character_id: string;
  visual_dna_full: string;
  voice_profile_id: string;
  region: string;
  accent_strength: string;
  timbre: string;
  pitch_range_hz: string;
  speech_rate_wpm: number;
  emotion_band: string;
  voice_dna_tech: string;

  // === PHASE 1: Forensic identity locks ===
  eye_details_locked?: string;
  skin_texture_locked?: string;
  accessories_locked?: string;
  gait_posture_locked?: string;
  signature_props_locked?: string;
  /** Compiled negative prompt specific to this character (do not change X, do not remove Y) */
  identity_negatives?: string;
}

export interface EnvironmentMasterState {
  environment_class: string;
  description_snapshot?: string;
  archetype?: any;
  constraints?: any;
  assetDna?: any[];
  spatialAffordance?: any[];
  stateMemory?: any;
  sceneIntent?: any;
  temporalRules?: any;
  layers?: any;
  spatial_topology: {
    space_boundaries: string;
    enclosure_level: string;
    horizon_logic: string;
    navigable_zones: string;
    non_navigable_zones: string;
    depth_continuity_rules: string;
  };
  structural_framework: {
    framework_type: string;
    architectural_system?: string;
    load_bearing_logic?: string;
    terrain_topology?: string;
    ground_continuity?: string;
    boundary_blending_rules?: string;
  };
  surface_materials: {
    dominant_surfaces: string;
    color_numeric_ranges: string;
    roughness_reflectance_behavior: string;
    weathering_erosion_logic: string;
    contact_wear_logic: string;
  };
  object_ecosystem: {
    fixed_elements: string;
    semi_fixed_elements: string;
    organic_elements: string;
    spatial_anchoring_rules: string;
    scale_relationship_rules: string;
  };
  environmental_forces: {
    gravity_direction: string;
    wind_presence_direction: string;
    water_flow_direction?: string;
    light_source_hierarchy: string;
    ambient_motion_baseline: string;
  };
  time_atmosphere: {
    time_state: string;
    weather_state: string;
    lighting_state: string;
    atmospheric_variation_tolerance: string;
  };
  recall_logic: {
    recall_required: boolean;
    must_match_fields: string;
    allowed_variations: string;
  };
  change_authorization: {
    change_allowed: boolean;
    allowed_change_type?: string;
    change_requirements?: string;
  };
}

export interface MasterManifest {
  project_id: string;
  generated_at: string;
  world_spec_ref: string;
  character_manifests: CharacterManifestItem[];
  environment_lock: {
    master_state: EnvironmentMasterState;
  };
  camera_lock: any;
  audio_lock: any;
  /**
   * PHASE 2: Scene Bible Tokens
   * Short verbatim strings that MUST be repeated identically in every clip's flattened prompt
   * to prevent style/lighting/lens drift across long videos.
   * Example tokens: "4200K warm tungsten key + cool 5600K rim", "Kodak Vision3 250D film stock",
   *                 "85mm f/1.8 lens, shallow DoF", "DCI-P3 wide gamut, warm-cool color grade"
   */
  scene_bible_tokens?: string[];
}

/** PHASE 2: Sub-shot within an 8s clip with timestamp */
export interface TimestampSubshot {
  /** e.g., "00:00-00:02" */
  time: string;
  /** Camera + action description */
  description: string;
  /** Optional SFX cue */
  sfx?: string;
}

/** PHASE 3: VLM Critic feedback on a generated clip prompt */
export interface CriticReport {
  /** 0 (perfect consistency) - 1 (severe drift) */
  drift_score: number;
  /** Specific drift issues found */
  issues: Array<{
    category: 'character' | 'environment' | 'lighting' | 'camera' | 'continuity' | 'style';
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggested_fix: string;
  }>;
  /** Overall verdict */
  verdict: 'pass' | 'warning' | 'regenerate_required';
  /** Stricter prompt to use if regenerating */
  suggested_correction?: string;
  /** Iteration count (incremented on each regen) */
  iteration?: number;
}

export interface VideoClip {
  id: string;
  sequence: number;
  scriptSegment: string;
  actionSummary: string;
  characterId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  errorLog?: string;
  final_json_output: {
    clip_id: string;
    duration: number;
    visual_prompt: {
      subjects: Array<{
        character_id: string;
        visual_dna_full: string;
        activity?: string;
      }>;
      environment: EnvironmentMasterState;
      lighting: { description: string };
      camera: { description: string };
      action: string;
      dialogue: Array<{ speaker: string; text: string }>;
      technical: { description: string };
      /** Phase 1: Explicit negatives for Veo */
      negative_prompt?: string;
      /** Phase 2: Timestamp sub-shots for dynamic 8s clips */
      timestamp_subshots?: TimestampSubshot[];
      /** Phase 2: Scene bible tokens repeated verbatim */
      scene_bible_tokens_used?: string[];
    };
    audio_config: any;
    metadata: any;
  } | null;
  duration: number;
  flattenedPrompt: string;
  /** Phase 1: Negative prompt extracted for Veo API */
  negativePrompt?: string;
  /** Phase 2: Last frame of this clip (extracted client-side via canvas) - used as first frame of next clip */
  lastFrameBase64?: string;
  /** Phase 2: First frame chained from previous clip */
  firstFrameBase64?: string;
  /** Phase 3: VLM critic feedback on this clip's prompt */
  criticReport?: CriticReport;
  videoOperationName?: string;
  videoUri?: string;
  videoStatus?: VideoGenStatus;
  videoError?: string;
  continuity_snapshot?: {
    environment_state: string;
    ref_clip_id?: string;
    lock_hash?: string;
  };
}

export interface Project {
  id: string;
  title: string;
  script: string;
  style: string;
  characters: Character[];
  clips: VideoClip[];
  masterManifest?: MasterManifest;
  createdAt: number;
  visual_references?: VisualReference[];
}

export enum AppView {
  SCRIPT_GEN = 'SCRIPT_GEN',
  EDITOR = 'EDITOR',
  ASSETS = 'ASSETS',
  EXPORT = 'EXPORT',
  GUIDE = 'GUIDE',
}

// === SCRIPT GENERATOR TYPES ===
export type ScriptPlatform = 'youtube' | 'short' | 'reel' | 'tiktok' | 'story';
export type ScriptLanguage = 'vi' | 'en';
export type ScriptTone =
  | 'educational' | 'inspiring' | 'dramatic' | 'comedic'
  | 'documentary' | 'commercial' | 'storytelling' | 'mystery';

export interface ScriptIdea {
  idea: string;
  platform: ScriptPlatform;
  durationSeconds: number;
  tone: ScriptTone;
  audience: string;
  language: ScriptLanguage;
  style: string;
  characterCount: number;
  customAngle?: string;
  hookStyle?: 'shocking' | 'question' | 'statement' | 'visual' | 'auto';
}

export interface StoryLocation {
  location_id: string;
  display_name: string;
  description: string;
  visual_anchors: string;
  archetype_ref?: string;
}

export interface BeatItem {
  beat_id: string;
  beat_name: string;
  scene_range: string;
  percentage: number;
  description: string;
  emotional_intent: string;
}

export interface StoryBible {
  log_line: string;
  premise: string;
  characters: Character[];
  locations: StoryLocation[];
  visual_style_note: string;
  emotional_arc: string;
  hook_strategy: string;
  cta_line: string;
}

export interface ScriptGenResult {
  storyBible: StoryBible;
  beatSheet: BeatItem[];
  script: string;
  metadata: {
    generatedAt: string;
    sceneCount: number;
    estimatedDuration: string;
    platform: ScriptPlatform;
    language: ScriptLanguage;
  };
}

export const SCRIPT_PLATFORMS: { id: ScriptPlatform; label: string; defaultSec: number; range: string }[] = [
  { id: 'youtube', label: 'YouTube Long-form', defaultSec: 300, range: '120-600s' },
  { id: 'story',   label: 'YouTube Short / Story', defaultSec: 60,  range: '30-90s' },
  { id: 'short',   label: 'Shorts / Reels',   defaultSec: 45,  range: '15-60s' },
  { id: 'reel',    label: 'Instagram Reel',   defaultSec: 30,  range: '15-90s' },
  { id: 'tiktok',  label: 'TikTok',           defaultSec: 30,  range: '15-180s' },
];

export const SCRIPT_TONES: { id: ScriptTone; label: string }[] = [
  { id: 'educational',  label: 'Educational / Giáo dục' },
  { id: 'inspiring',    label: 'Inspiring / Truyền cảm hứng' },
  { id: 'storytelling', label: 'Storytelling / Kể chuyện' },
  { id: 'dramatic',     label: 'Dramatic / Kịch tính' },
  { id: 'comedic',      label: 'Comedic / Hài hước' },
  { id: 'documentary',  label: 'Documentary / Tài liệu' },
  { id: 'commercial',   label: 'Commercial / Quảng cáo' },
  { id: 'mystery',      label: 'Mystery / Bí ẩn' },
];

export const VEO_STYLES = [
  "Realistic Life",
  "Cinematic 8K",
  "3D Animation",
  "Epic Fantasy",
  "Documentary",
  "Action Drama",
  "Cyberpunk Neon",
  "Mystery Noir",
  "Commercial Studio",
  "Vintage 35mm"
];

export interface VeoModelConfig {
  id: string;
  name: string;
  modelId: string;
  label: string;
  maxDuration: number;
}

export const VEO_MODELS: VeoModelConfig[] = [
  { id: "veo2", name: "Veo 2", modelId: "veo-2.0-generate-001", label: "Veo 2 · Stable", maxDuration: 8 },
  { id: "veo3", name: "Veo 3", modelId: "veo-3.0-generate-preview", label: "Veo 3 · With Audio", maxDuration: 8 },
];

export const VEO_ASPECT_RATIOS = ["16:9", "9:16", "1:1"];

export type VideoGenStatus = 'idle' | 'queued' | 'generating' | 'ready' | 'failed';
