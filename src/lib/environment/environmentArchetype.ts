import { EnvironmentMasterState } from "../types";

export interface EnvironmentArchetype {
  archetype_id: string;
  meta: {
    display_name: string;
    environment_class_ref: EnvironmentMasterState["environment_class"];
    is_habitable: boolean;
    supports_human_scale: boolean;
    description_note: string;
  };
  geometry_scale: {
    overall_dimensions: { width_m: { value: number; tolerance: number }; depth_m: { value: number; tolerance: number }; height_m: { value: number; tolerance: number } };
    ceiling_height_m: { value: number; tolerance: number };
    spatial_depth_ratio: "shallow" | "medium" | "deep";
    axis_definition: { primary_axis: "x" | "y" | "z"; secondary_axis: "x" | "y" | "z"; axis_variation_allowed: boolean };
    compression_points: { allowed: boolean; definition_required: boolean; count_range: { min: number; max: number } };
    expansion_zones: { allowed: boolean; definition_required: boolean; area_ratio_range: { min: number; max: number } };
  };
  structural_surfaces: {
    walls: { count: { value: number; locked: boolean }; material_ref: string; condition: "new" | "worn" | "aged" | "damaged" | "maintained" };
    floor: { material_ref: string; condition: "new" | "worn" | "aged" | "damaged" | "maintained"; level_variation: { enum: "flat" | "slight" | "stepped" | "organic"; max_delta_m: number } };
    ceiling: { material_ref: string; height_variation: { enum: "uniform" | "segmented" | "irregular" | "layered" | "none"; locked: boolean }; exposed_structure: { value: boolean; locked: boolean } };
    columns_beams: { present: boolean; material_ref: string; spacing_m: { min: number; max: number } };
  };
  material_texture: {
    dominant_materials: { list_required: boolean; max_count: number };
    surface_properties: { roughness: { value: number; tolerance: number }; reflectivity: { value: number; tolerance: number }; absorption: { value: number; tolerance: number } };
    aging_pattern: { uniformity: "uniform" | "uneven"; wear_sources: { list_required: boolean } };
    pattern_repetition: "none" | "subtle" | "strong";
  };
  objects_furniture: {
    object_policy: { object_count_mode: "fixed" | "ranged"; regeneration_allowed: boolean };
    object_list: { definition_required: boolean; each_object_requires: string[] };
    object_alignment: "aligned" | "semi_aligned" | "organic";
  };
  decoration_micro_details: {
    detail_budget: { min_instances: number; max_instances: number; pattern_seed_required: boolean; reuse_pattern: boolean };
    detail_types: { list_required: boolean };
    imperfections: { list_required: boolean };
    maintenance_level: "pristine" | "maintained" | "neglected" | "self_sustaining";
  };
  openings_boundaries: {
    doors: { count: { value: number; locked: boolean }; types: string[]; default_state: "closed" | "open" };
    windows: { count: { value: number; locked: boolean }; visibility_out: "none" | "limited" | "open" };
    other_openings: { definition_required: boolean; fixed_identity: boolean };
  };
  visibility_enclosure: {
    enclosure_level: "open" | "semi_enclosed" | "enclosed";
    sightline_length: "short" | "medium" | "long";
    external_connection: "none" | "visual" | "physical";
  };
  stability_constraints: {
    allow_micro_variation: boolean;
    micro_variation_scope: string[];
    forbidden_variation: string[];
  };
}

export const environmentArchetypes: Record<string, EnvironmentArchetype> = {
  "Interior_HumanScale_SemiEnclosed": {
    archetype_id: "Interior_HumanScale_SemiEnclosed",
    meta: { display_name: "Urban Cafe", environment_class_ref: "interior_semi_open", is_habitable: true, supports_human_scale: true, description_note: "Semi-open space with friendly furniture" },
    geometry_scale: { overall_dimensions: { width_m: { value: 10, tolerance: 2 }, depth_m: { value: 8, tolerance: 1 }, height_m: { value: 3, tolerance: 0.5 } }, ceiling_height_m: { value: 3, tolerance: 0.2 }, spatial_depth_ratio: "medium", axis_definition: { primary_axis: "x", secondary_axis: "y", axis_variation_allowed: false }, compression_points: { allowed: true, definition_required: true, count_range: { min: 1, max: 3 } }, expansion_zones: { allowed: true, definition_required: true, area_ratio_range: { min: 0.1, max: 0.3 } } },
    structural_surfaces: { walls: { count: { value: 4, locked: true }, material_ref: "white painted concrete", condition: "worn" }, floor: { material_ref: "natural wood", condition: "worn", level_variation: { enum: "flat", max_delta_m: 0.1 } }, ceiling: { material_ref: "plaster", height_variation: { enum: "uniform", locked: true }, exposed_structure: { value: false, locked: true } }, columns_beams: { present: false, material_ref: "", spacing_m: { min: 0, max: 0 } } },
    material_texture: { dominant_materials: { list_required: true, max_count: 3 }, surface_properties: { roughness: { value: 0.5, tolerance: 0.1 }, reflectivity: { value: 0.3, tolerance: 0.05 }, absorption: { value: 0.7, tolerance: 0.1 } }, aging_pattern: { uniformity: "uneven", wear_sources: { list_required: true } }, pattern_repetition: "subtle" },
    objects_furniture: { object_policy: { object_count_mode: "ranged", regeneration_allowed: false }, object_list: { definition_required: true, each_object_requires: ["object_class_ref", "count", "distribution", "position_seed", "mobility", "condition"] }, object_alignment: "semi_aligned" },
    decoration_micro_details: { detail_budget: { min_instances: 5, max_instances: 20, pattern_seed_required: true, reuse_pattern: true }, detail_types: { list_required: true }, imperfections: { list_required: true }, maintenance_level: "maintained" },
    openings_boundaries: { doors: { count: { value: 2, locked: true }, types: ["glass door"], default_state: "open" }, windows: { count: { value: 3, locked: true }, visibility_out: "open" }, other_openings: { definition_required: true, fixed_identity: true } },
    visibility_enclosure: { enclosure_level: "semi_enclosed", sightline_length: "medium", external_connection: "visual" },
    stability_constraints: { allow_micro_variation: true, micro_variation_scope: ["minor_surface_noise", "small_particle_shift"], forbidden_variation: ["geometry_change", "material_change", "object_count_change", "layout_rebuild", "palette_shift"] }
  },
  "Exterior_Urban_Open": {
    archetype_id: "Exterior_Urban_Open",
    meta: { display_name: "Open Urban Street", environment_class_ref: "exterior_urban", is_habitable: true, supports_human_scale: true, description_note: "Wide street, natural light" },
    geometry_scale: { overall_dimensions: { width_m: { value: 20, tolerance: 5 }, depth_m: { value: 100, tolerance: 50 }, height_m: { value: 100, tolerance: 0 } }, ceiling_height_m: { value: 0, tolerance: 0 }, spatial_depth_ratio: "deep", axis_definition: { primary_axis: "z", secondary_axis: "x", axis_variation_allowed: true }, compression_points: { allowed: false, definition_required: false, count_range: { min: 0, max: 0 } }, expansion_zones: { allowed: true, definition_required: true, area_ratio_range: { min: 0.5, max: 1.0 } } },
    structural_surfaces: { walls: { count: { value: 2, locked: false }, material_ref: "shophouse facade", condition: "aged" }, floor: { material_ref: "asphalt/concrete", condition: "worn", level_variation: { enum: "flat", max_delta_m: 0.2 } }, ceiling: { material_ref: "sky", height_variation: { enum: "none", locked: true }, exposed_structure: { value: false, locked: true } }, columns_beams: { present: true, material_ref: "utility poles", spacing_m: { min: 15, max: 30 } } },
    material_texture: { dominant_materials: { list_required: true, max_count: 5 }, surface_properties: { roughness: { value: 0.8, tolerance: 0.1 }, reflectivity: { value: 0.1, tolerance: 0.1 }, absorption: { value: 0.6, tolerance: 0.2 } }, aging_pattern: { uniformity: "uneven", wear_sources: { list_required: true } }, pattern_repetition: "strong" },
    objects_furniture: { object_policy: { object_count_mode: "ranged", regeneration_allowed: true }, object_list: { definition_required: true, each_object_requires: ["vehicle_density", "pedestrian_density"] }, object_alignment: "aligned" },
    decoration_micro_details: { detail_budget: { min_instances: 50, max_instances: 200, pattern_seed_required: false, reuse_pattern: false }, detail_types: { list_required: true }, imperfections: { list_required: true }, maintenance_level: "neglected" },
    openings_boundaries: { doors: { count: { value: 10, locked: false }, types: ["shop entrance"], default_state: "closed" }, windows: { count: { value: 50, locked: false }, visibility_out: "none" }, other_openings: { definition_required: true, fixed_identity: true } },
    visibility_enclosure: { enclosure_level: "open", sightline_length: "long", external_connection: "physical" },
    stability_constraints: { allow_micro_variation: true, micro_variation_scope: ["traffic_flow", "weather_impact"], forbidden_variation: ["road_width", "building_height_avg"] }
  },
  "Interior_Narrow_Transitional": {
    archetype_id: "Interior_Narrow_Transitional",
    meta: { display_name: "Hotel/Train Corridor", environment_class_ref: "interior_corridor", is_habitable: false, supports_human_scale: true, description_note: "Narrow, long space, artificial lighting" },
    geometry_scale: { overall_dimensions: { width_m: { value: 2, tolerance: 0.5 }, depth_m: { value: 20, tolerance: 5 }, height_m: { value: 2.5, tolerance: 0.2 } }, ceiling_height_m: { value: 2.5, tolerance: 0.1 }, spatial_depth_ratio: "deep", axis_definition: { primary_axis: "z", secondary_axis: "y", axis_variation_allowed: false }, compression_points: { allowed: false, definition_required: false, count_range: { min: 0, max: 0 } }, expansion_zones: { allowed: false, definition_required: false, area_ratio_range: { min: 0, max: 0 } } },
    structural_surfaces: { walls: { count: { value: 2, locked: true }, material_ref: "wallpaper/metal", condition: "new" }, floor: { material_ref: "carpet", condition: "maintained", level_variation: { enum: "flat", max_delta_m: 0 } }, ceiling: { material_ref: "acoustic panels", height_variation: { enum: "uniform", locked: true }, exposed_structure: { value: false, locked: true } }, columns_beams: { present: false, material_ref: "", spacing_m: { min: 0, max: 0 } } },
    material_texture: { dominant_materials: { list_required: true, max_count: 2 }, surface_properties: { roughness: { value: 0.4, tolerance: 0.05 }, reflectivity: { value: 0.2, tolerance: 0.05 }, absorption: { value: 0.8, tolerance: 0.1 } }, aging_pattern: { uniformity: "uniform", wear_sources: { list_required: false } }, pattern_repetition: "strong" },
    objects_furniture: { object_policy: { object_count_mode: "fixed", regeneration_allowed: false }, object_list: { definition_required: true, each_object_requires: ["fixture_type", "spacing"] }, object_alignment: "aligned" },
    decoration_micro_details: { detail_budget: { min_instances: 5, max_instances: 10, pattern_seed_required: true, reuse_pattern: true }, detail_types: { list_required: true }, imperfections: { list_required: false }, maintenance_level: "pristine" },
    openings_boundaries: { doors: { count: { value: 6, locked: false }, types: ["room door"], default_state: "closed" }, windows: { count: { value: 0, locked: true }, visibility_out: "none" }, other_openings: { definition_required: false, fixed_identity: false } },
    visibility_enclosure: { enclosure_level: "enclosed", sightline_length: "medium", external_connection: "none" },
    stability_constraints: { allow_micro_variation: false, micro_variation_scope: [], forbidden_variation: ["width", "height", "lighting_temperature"] }
  },
  "Interior_Large_Public": {
    archetype_id: "Interior_Large_Public",
    meta: { display_name: "Grand Hall/Station", environment_class_ref: "interior_public_hall", is_habitable: true, supports_human_scale: true, description_note: "Large scale, high ceiling, many people" },
    geometry_scale: { overall_dimensions: { width_m: { value: 40, tolerance: 10 }, depth_m: { value: 60, tolerance: 10 }, height_m: { value: 12, tolerance: 2 } }, ceiling_height_m: { value: 12, tolerance: 1 }, spatial_depth_ratio: "medium", axis_definition: { primary_axis: "z", secondary_axis: "x", axis_variation_allowed: true }, compression_points: { allowed: true, definition_required: true, count_range: { min: 2, max: 5 } }, expansion_zones: { allowed: true, definition_required: true, area_ratio_range: { min: 0.5, max: 0.8 } } },
    structural_surfaces: { walls: { count: { value: 4, locked: true }, material_ref: "glass/marble", condition: "maintained" }, floor: { material_ref: "polished granite", condition: "maintained", level_variation: { enum: "flat", max_delta_m: 0.05 } }, ceiling: { material_ref: "steel/glass structure", height_variation: { enum: "layered", locked: true }, exposed_structure: { value: true, locked: true } }, columns_beams: { present: true, material_ref: "clad concrete", spacing_m: { min: 10, max: 20 } } },
    material_texture: { dominant_materials: { list_required: true, max_count: 4 }, surface_properties: { roughness: { value: 0.2, tolerance: 0.1 }, reflectivity: { value: 0.7, tolerance: 0.1 }, absorption: { value: 0.3, tolerance: 0.1 } }, aging_pattern: { uniformity: "uniform", wear_sources: { list_required: true } }, pattern_repetition: "strong" },
    objects_furniture: { object_policy: { object_count_mode: "ranged", regeneration_allowed: true }, object_list: { definition_required: true, each_object_requires: ["kiosk", "seating_cluster", "signage"] }, object_alignment: "organic" },
    decoration_micro_details: { detail_budget: { min_instances: 50, max_instances: 150, pattern_seed_required: true, reuse_pattern: false }, detail_types: { list_required: true }, imperfections: { list_required: true }, maintenance_level: "maintained" },
    openings_boundaries: { doors: { count: { value: 8, locked: false }, types: ["revolving door", "automatic door"], default_state: "closed" }, windows: { count: { value: 20, locked: true }, visibility_out: "open" }, other_openings: { definition_required: true, fixed_identity: true } },
    visibility_enclosure: { enclosure_level: "enclosed", sightline_length: "long", external_connection: "visual" },
    stability_constraints: { allow_micro_variation: true, micro_variation_scope: ["crowd_density", "ad_displays"], forbidden_variation: ["column_layout", "ceiling_height"] }
  }
};
