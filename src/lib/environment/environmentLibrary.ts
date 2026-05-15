import { layers, Layer } from "./layer";
import { responseTemplates, ResponseTemplate } from "./response";
import { environmentArchetypes, EnvironmentArchetype } from "./environmentArchetype";
import { environmentConstraints, EnvironmentConstraints } from "./environmentConstraints";
import { assetDnas, AssetDNA } from "./assetDna";
import { spatialAffordances, SpatialAffordance } from "./spatialAffordance";
import { stateMemories, StateMemory } from "./stateMemory";
import { sceneIntents, SceneIntent } from "./sceneIntent";
import { temporalRules, TemporalRules } from "./temporalRules";

export type { Layer, ResponseTemplate, EnvironmentArchetype, EnvironmentConstraints, AssetDNA, SpatialAffordance, StateMemory, SceneIntent, TemporalRules };

export const environmentLibrary = {
  version: "1.3",
  layers,
  responseTemplates,
  archetypes: environmentArchetypes,
  constraints: environmentConstraints,
  assetDna: assetDnas,
  spatialAffordance: spatialAffordances,
  stateMemory: stateMemories,
  sceneIntent: sceneIntents,
  temporalRules,
};
