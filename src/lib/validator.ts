import { RuleEngineType } from "./ruleEngine";
import { EnvironmentArchetype } from "./environment/environmentArchetype";
import { validateEnvironment } from "./environment/environmentValidator";
import { Project } from "./types";

export const validateArchetype = (archetype: EnvironmentArchetype): boolean => {
  if (!archetype.archetype_id || !archetype.meta.display_name) {
    throw new Error("HALT: Missing required meta fields in archetype.");
  }
  if (
    archetype.geometry_scale.overall_dimensions.width_m.value < 0 ||
    archetype.geometry_scale.overall_dimensions.width_m.tolerance < 0
  ) {
    throw new Error("HALT: Invalid dimension values/tolerance (must be >= 0).");
  }
  const validDepthRatios = ["shallow", "medium", "deep"];
  if (!validDepthRatios.includes(archetype.geometry_scale.spatial_depth_ratio)) {
    throw new Error(`HALT: Invalid spatial_depth_ratio enum. Got: ${archetype.geometry_scale.spatial_depth_ratio}`);
  }
  if (typeof archetype.structural_surfaces?.walls?.count?.value !== 'number') {
    throw new Error("HALT: Missing structural_surfaces.walls.count configuration.");
  }
  if (archetype.stability_constraints.forbidden_variation.length < 5) {
    throw new Error("HALT: Insufficient forbidden_variation constraints (min 5 required).");
  }
  return true;
};

export const validatePrompt = (prompt: string, ruleEngine: RuleEngineType, projectContext?: Project): boolean => {
  if (!prompt) {
    throw new Error("HALT: Prompt is empty or missing.");
  }
  if (projectContext) {
    try {
      validateEnvironment(projectContext);
    } catch (e: any) {
      console.warn("Ecosystem Validation Warning:", e.message);
    }
  }
  if (prompt.length < 500) {
    throw new Error(`HALT: Prompt too short (${prompt.length} chars). Must be > 500 chars.`);
  }
  for (const term of ruleEngine.forbiddenTerms) {
    if (prompt.toLowerCase().includes(term.toLowerCase())) {
      throw new Error(`HALT: Forbidden shorthand detected: "${term}".`);
    }
  }
  return true;
};
