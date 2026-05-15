export interface ResponseTemplate {
  template_id: string;
  format: string;
  required_placeholders: string[];
}

export const responseTemplates: Record<string, ResponseTemplate> = {
  "veo_standard": {
    template_id: "veo_standard",
    format: "concatenated_invariant_string",
    required_placeholders: ["subject_invariant", "environment_invariant", "lighting_invariant", "camera_invariant", "action_variant"]
  },
};
