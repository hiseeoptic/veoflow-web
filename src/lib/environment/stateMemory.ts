export interface StateMemory {
  memory_id: string;
  past_events: string;
  recall_required: boolean;
}

export const stateMemories: Record<string, StateMemory> = {
  "clip1_event": { memory_id: "clip1_event", past_events: "door_opened", recall_required: true },
};
