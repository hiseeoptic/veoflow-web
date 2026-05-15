import { environmentLibrary } from "./environment/environmentLibrary";
import { validateEnvironment } from "./environment/environmentValidator";
import { Project, MasterManifest, EnvironmentMasterState } from "./types";

export const compileMasterManifest = (
  input: {
    environment: any;
    characters: any[];
    outfit: any;
    camera: any;
    voice: any;
  },
  project?: Project
): MasterManifest => {
  if (project) {
    try {
      validateEnvironment(project);
    } catch (e: any) {
      console.warn("Environment Validation Warning during compilation:", e.message);
    }
  }

  const environmentClass = input.environment?.master_state?.environment_class || "Interior_HumanScale_SemiEnclosed";

  const mergedEnvironmentState: EnvironmentMasterState = {
    ...input.environment?.master_state,
    environment_class: environmentClass,
    archetype: input.environment?.master_state?.archetype || environmentLibrary.archetypes[environmentClass] || environmentLibrary.archetypes["Interior_HumanScale_SemiEnclosed"],
    constraints: input.environment?.master_state?.constraints || environmentLibrary.constraints["default_physics"],
    assetDna: input.environment?.master_state?.assetDna || Object.values(environmentLibrary.assetDna),
    spatialAffordance: input.environment?.master_state?.spatialAffordance || Object.values(environmentLibrary.spatialAffordance),
    stateMemory: input.environment?.master_state?.stateMemory || environmentLibrary.stateMemory["clip1_event"],
    sceneIntent: input.environment?.master_state?.sceneIntent || environmentLibrary.sceneIntent["tension_build"],
    temporalRules: input.environment?.master_state?.temporalRules || environmentLibrary.temporalRules["continuity_lock"],
    layers: input.environment?.master_state?.layers || environmentLibrary.layers
  };

  const manifest: MasterManifest = {
    project_id: project?.id || crypto.randomUUID(),
    generated_at: new Date().toISOString(),
    world_spec_ref: environmentLibrary.version,
    character_manifests: input.characters,
    environment_lock: { master_state: mergedEnvironmentState },
    camera_lock: input.camera,
    audio_lock: input.voice,
  };

  return manifest;
};
