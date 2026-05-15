export interface SceneIntent {
  intent_id: string;
  scene_goal: string;
  emotional_arc: string;
}

export const sceneIntents: Record<string, SceneIntent> = {
  "tension_build": { intent_id: "tension_build", scene_goal: "increase_suspense", emotional_arc: "calm_to_tense" },
  "relief": { intent_id: "relief", scene_goal: "release_tension", emotional_arc: "tense_to_calm" }
};
