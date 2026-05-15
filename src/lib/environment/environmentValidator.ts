import { environmentLibrary } from "./environmentLibrary";
import { VideoClip, Project } from "../types";
import { EnvironmentArchetype } from "./environmentArchetype";

export const validateLayers = (): boolean => {
  if (Object.keys(environmentLibrary.layers).length < 2) throw new Error("HALT: Insufficient layers.");
  return true;
};

export const validateResponseTemplates = (): boolean => {
  return true;
};

export const validateArchetype = (archetype?: EnvironmentArchetype): boolean => {
  if (!archetype) return true;
  if (!archetype.archetype_id) throw new Error("HALT: Invalid Archetype ID");
  return true;
};

export const validateContinuity = (project: Project, currentClip: VideoClip): boolean => {
  const sceneRef = currentClip.scriptSegment.toLowerCase();
  const match = sceneRef.match(/(?:clip|scene|shot)\s*(\d+)?/i);

  if (match) {
    const explicitSeq = sceneRef.match(/\d+/);
    if (explicitSeq) {
      const refClipSeq = parseInt(explicitSeq[0]);
      const refClip = project.clips.find(c => c.sequence === refClipSeq);
      if (refClip && refClip.sequence < currentClip.sequence) {
        if (refClip.continuity_snapshot && currentClip.final_json_output?.visual_prompt?.environment) {
          const currState = JSON.stringify(currentClip.final_json_output.visual_prompt.environment);
          const refState = refClip.continuity_snapshot.environment_state;
          if (Math.abs(currState.length - refState.length) > 500) {
            console.warn("Continuity Alert: Significant length deviation from locked state.");
          }
        }
      }
    }
  }
  return true;
};

export const validateEnvironment = (project: Project, currentClip?: VideoClip): boolean => {
  validateLayers();
  validateResponseTemplates();

  if (project.masterManifest?.environment_lock?.master_state) {
    const env = project.masterManifest.environment_lock.master_state;
    if (!env.archetype) {
      env.archetype = environmentLibrary.archetypes["Interior_HumanScale_SemiEnclosed"];
    }
    if (!env.constraints) {
      env.constraints = environmentLibrary.constraints["default_physics"];
    }
    if (!env.layers) {
      env.layers = environmentLibrary.layers;
    }
  }

  if (currentClip) validateContinuity(project, currentClip);
  return true;
};
