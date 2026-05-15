export interface SpatialAffordance {
  affordance_id: string;
  usage_purpose: string;
  spatial_coords: { x: number; y: number; z: number };
}

export const spatialAffordances: Record<string, SpatialAffordance> = {
  "walk_zone": { affordance_id: "walk_zone", usage_purpose: "navigation", spatial_coords: { x: 0, y: 0, z: 0 } },
  "rest_zone": { affordance_id: "rest_zone", usage_purpose: "seating", spatial_coords: { x: 2, y: 0, z: 2 } }
};
