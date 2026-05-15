import { RuleEngineType } from "./ruleEngine";
import { environmentLibrary } from "./environment/environmentLibrary";

export const validateUnifiedPrompt = (
  prompt: string | undefined,
  ruleEngine: RuleEngineType,
  minLength: number = 5000
): true => {
  if (!prompt || typeof prompt !== "string") {
    throw new Error("HALT: Prompt is empty or invalid.");
  }
  if (prompt.length < minLength) {
    throw new Error(`HALT: Unified prompt too short (${prompt.length} chars). Minimum required is ${minLength} chars.`);
  }
  for (const term of ruleEngine.forbiddenTerms) {
    if (prompt.toLowerCase().includes(term.toLowerCase())) {
      throw new Error(`HALT: Forbidden shorthand detected: "${term}". Explicit repetition required.`);
    }
  }

  if (environmentLibrary.temporalRules["continuity_lock"].time_memory) {
    if (prompt.includes("variation") && prompt.includes("significant")) {
      throw new Error("HALT: Significant variation detected while continuity lock is active.");
    }
  }

  return true;
};
