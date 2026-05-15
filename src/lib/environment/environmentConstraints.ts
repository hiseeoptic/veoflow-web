export interface EnvironmentConstraints {
  constraint_id: string;
  physics_rules: string;
  boundary_laws: string;
  variation_tolerance: number;
}

export const environmentConstraints: Record<string, EnvironmentConstraints> = {
  "default_physics": { constraint_id: "default_physics", physics_rules: "gravity: down", boundary_laws: "no_breach", variation_tolerance: 0.1 },
  "strict_continuity": { constraint_id: "strict_continuity", physics_rules: "gravity: down", boundary_laws: "absolute_lock", variation_tolerance: 0.0 }
};
