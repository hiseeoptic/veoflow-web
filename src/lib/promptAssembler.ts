import { environmentLibrary } from "./environment/environmentLibrary";
import { CharacterManifestItem, EnvironmentMasterState } from "./types";

export const assembleClipPrompt = ({
  manifest,
  subject_identity,
  action,
  dialogue,
}: {
  manifest: {
    character_manifests?: CharacterManifestItem[];
    environment_lock?: { master_state: EnvironmentMasterState };
    camera_lock?: any;
    audio_lock?: any;
    outfit_state?: any;
    character_states?: CharacterManifestItem[];
    environment_state?: EnvironmentMasterState;
  };
  subject_identity: string;
  environment_identity?: string;
  action: string;
  dialogue: string;
}) => {
  const subjects: CharacterManifestItem[] = manifest.character_manifests || manifest.character_states || [];
  const masterEnv = manifest.environment_lock?.master_state || manifest.environment_state || ({} as EnvironmentMasterState);

  const changeAuth = masterEnv.change_authorization || environmentLibrary.temporalRules["continuity_lock"];
  const isStrictLock = changeAuth.change_allowed === false || masterEnv.recall_logic?.recall_required === true;
  const environmentToInject = isStrictLock ? masterEnv : { ...masterEnv, _note: "Flexible adaptation allowed based on narrative" };

  const fullEcosystem = JSON.stringify((masterEnv as any).ecosystem || {
    archetype: masterEnv.archetype || environmentLibrary.archetypes["Interior_HumanScale_SemiEnclosed"],
    constraints: masterEnv.constraints || environmentLibrary.constraints["default_physics"],
    layers: masterEnv.layers || environmentLibrary.layers,
    assets: masterEnv.assetDna || [],
    affordances: masterEnv.spatialAffordance || []
  });

  const inputContext = {
    meta: {
      instruction: "Populate visual_prompt JSON output using these definitions.",
      strict_mode: isStrictLock
    },
    scene_context: {
      action_raw: action,
      dialogue_raw: dialogue
    },
    subjects_definition: subjects.map((char) => ({
      id: char.character_id,
      visual_dna: char.visual_dna_full,
      voice: {
        id: char.voice_profile_id,
        region: char.region,
        timbre: char.timbre
      }
    })),
    environment_definition: {
      master_state: environmentToInject,
      ecosystem_full_dump: fullEcosystem
    },
    technical_locks: {
      camera: manifest.camera_lock,
      audio: manifest.audio_lock,
      outfit: manifest.outfit_state
    }
  };

  return JSON.stringify(inputContext, null, 2);
};
