export interface Message {
  role: "user" | "assistant" | "tool";  // "tool" = a live activity chip
  content: string;
  streaming?: boolean;                   // assistant bubble still receiving token deltas
}

export interface PlanStep {
  title: string;
  description: string;
  completed: boolean;
}

export interface PlanState {
  title: string;
  current_step: number;
  steps: PlanStep[];
  is_complete: boolean;
}

export type PermissionLevel = "confirm" | "auto-approve" | "discuss";
export type EngineType = "dcr4py" | "dcrjs";

export const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  "confirm": "Confirm",
  "auto-approve": "Auto",
  "discuss": "Discuss",
};

export const PERMISSION_ORDER: PermissionLevel[] = ["confirm", "auto-approve", "discuss"];
