export interface TemporalRules {
  rule_id: string;
  time_memory: boolean;
  duration_lock: number;
  variation_rules: string;
  change_allowed: boolean;
}

export const temporalRules: Record<string, TemporalRules> = {
  "continuity_lock": {
    rule_id: "continuity_lock",
    time_memory: true,
    duration_lock: 8,
    variation_rules: "minor_only",
    change_allowed: false
  },
  "free_flow": {
    rule_id: "free_flow",
    time_memory: false,
    duration_lock: 8,
    variation_rules: "adaptive",
    change_allowed: true
  }
};
