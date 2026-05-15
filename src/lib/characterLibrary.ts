import { CharacterLibrary } from "./types";

export const characterLibrary: CharacterLibrary = {
  version: "2.0",
  description: "Full high-beauty character library.",
  characters: [
    {
      character_id: "female_oval_gentle_01",
      gender: "female",
      height_cm: 167,
      ethnicity: "Vietnamese",
      face_dna: "Oval craniofacial structure with balanced skull proportions. Medium-height forehead. Large round eyes with clear double eyelids. Soft gentle gaze. Nose slender and straight. Lips full. Skin smooth, light beige.",
      hair_dna: "Long straight black hair, medium density, naturally glossy.",
      body_dna: "Graceful feminine proportions, slim waist.",
      expression_baseline: "Soft gentle smile.",
      aesthetic_class: "Classic Vietnamese Beauty"
    },
    {
      character_id: "male_leader_01",
      gender: "male",
      height_cm: 178,
      ethnicity: "Vietnamese",
      face_dna: "Rectangular face with strong jaw. Deep-set eyes. Straight proportional nose.",
      hair_dna: "Short classic black hair, side-parted.",
      body_dna: "Broad shoulders, athletic build.",
      expression_baseline: "Calm authoritative gaze.",
      aesthetic_class: "Gentleman Leader"
    }
  ]
};
