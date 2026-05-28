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
    };
    audio_config: any;
    metadata: any;
  } | null;
  duration: number;
  flattenedPrompt: string;
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
  EDITOR = 'EDITOR',
  ASSETS = 'ASSETS',
  EXPORT = 'EXPORT',
  GUIDE = 'GUIDE',
}

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
