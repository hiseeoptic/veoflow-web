export interface Layer {
  layer_id: string;
  description: string;
  dependencies: string[];
}

export const layers: Record<string, Layer> = {
  "layer_1_visual": { layer_id: "layer_1_visual", description: "Visual Reality & Physics", dependencies: [] },
  "layer_2_entity": { layer_id: "layer_2_entity", description: "Entity Presence & Continuity", dependencies: ["layer_1_visual"] },
  "layer_3_timeline": { layer_id: "layer_3_timeline", description: "8s Temporal constraints", dependencies: ["layer_1_visual", "layer_2_entity"] },
};
