
import { DigitalInputResourceBase, DigitalOutputResourceBase, ResourceBase, ResourceType, RuntimeRuleAction } from "@uhn/blueprint";

// --- Runtime rule serialization (for IPC + overview) ---

export type RuntimeRuleTriggerInfo =
  | { kind: "resource"; resourceId: string; event: "activated" | "deactivated" | "changed" }
  | { kind: "tap"; resourceId: string }
  | { kind: "longPress"; resourceId: string; thresholdMs: number }
  | { kind: "timer"; resourceId: string; event: "activated" | "deactivated" };

export type RuntimeRuleInfo = {
  id: string;
  name?: string;
  description?: string;
  executionTarget?: string;
  triggers: RuntimeRuleTriggerInfo[];
  priority?: number;
  suppressMs?: number;
  cooldownMs?: number;
};

export type RuleRuntimeRulesLoadedMessage = {
  kind: "event";
  cmd: "rulesLoaded";
  rules: RuntimeRuleInfo[];
  allRules?: RuntimeRuleInfo[];
};

// --- Runtime overview types ---

export const RUNTIME_STATUSES = ["unconfigured", "starting", "running", "stopped", "restarting", "failed"] as const;
export type RuntimeStatus = (typeof RUNTIME_STATUSES)[number];

export type RuntimeInfo = {
  runtimeId: string;
  status: RuntimeStatus;
  expectedRuleCount: number;
  loadedRuleCount: number | null;
  rules: RuntimeRuleInfo[];
};

export type RuntimeOverviewPayload = {
  runtimes: RuntimeInfo[];
  updatedAt: number;
};

export type ResourceStateValue = boolean | number;

export type TimerStateDetails = {
  type: "timer";
  startedAt: number;
  stopAt: number;
};

export type ResourceStateDetails = TimerStateDetails;

export type RuntimeResourceState = {
  resourceId: string;
  value: ResourceStateValue | undefined;
  timestamp: number;
  details?: ResourceStateDetails;
};

export type ResourceErrorCode =
  | "duplicate-id"
  | "duplicate-address"
  | "missing-id"
  | "unknown-edge"
  | "unknown-device"
  | "invalid-pin"
  | "missing-pin"
  | "missing-address";


export type ResourceValidationError = {
  type: ResourceErrorCode;
  resourceId?: string;
  conflictingId?: string;
  details?: string;
};

export type RuntimeResource =
  Omit<ResourceBase<ResourceType>, 'id' | 'name'> & {
    id: string;
    name: string;
    errors?: ResourceErrorCode[];
  };

export type RuntimeDigitalInputResource =
  DigitalInputResourceBase & {
    id: string;
    name: string;
    errors?: ResourceErrorCode[];
  };

export type RuntimeDigitalOutputResource = DigitalOutputResourceBase & {
  id: string;
  name: string;
  errors?: ResourceErrorCode[];
};

export type RuntimeResourceList = RuntimeResource[];

export type RuleRuntimeStateUpdateCommand = {
  kind: "event";
  cmd: "stateUpdate";
  payload: RuntimeResourceState;
};
export type RuleRuntimeStateFullUpdateCommand = {
  kind: "event";
  cmd: "stateFullUpdate";
  payload: RuntimeResourceState[];
};
export type RuleRuntimeTimerCommand = {
  kind: "event";
  cmd: "timerCommand";
  payload: {
    resourceId: string;
    action: "start" | "clear";
    durationMs?: number;
    mode?: "restart" | "startOnce";
  };
};

export type RuleRuntimeMuteCommand = {
  kind: "event";
  cmd: "muteCommand";
  payload: {
    targetType: "rule" | "resource";
    targetId: string;
    action: "mute" | "clearMute";
    expiresAt?: number;
    identifier?: string;
  };
};

export type RuleRuntimeCommand = RuleRuntimeStateUpdateCommand
  | RuleRuntimeStateFullUpdateCommand
  | RuleRuntimeTimerCommand
  | RuleRuntimeMuteCommand;


export type RuleRuntimeResourcesLoadedMessage = {
  kind: "event";
  cmd: "resourcesLoaded";
  resources: RuntimeResource[];
};
export type RuleRuntimeActionMessage = {
  kind: "event"
  cmd: "actions"
  actions: RuntimeRuleAction[];
};
export type RuleRuntimeResourceMissingMessage = {
  kind: "event"
  cmd: "resourceMissing"

  ruleId: string;
  resourceId: string;
  resourceType: ResourceType;

  reason: "stateUnavailable";
};
export type RuleRuntimeLogMessage = {
  kind: "event"
  cmd: "log"
  level: "info" | "warn" | "error";
  component: string;
  message: string
  data?: unknown
};
export type RuleRuntimeReadyMessage = {
  kind: "event";
  cmd: "ready";
};

export type RuleRuntimeTimerStateChangedMessage = {
  kind: "event";
  cmd: "timerStateChanged";
  payload: { id: string; active: boolean; startedAt: number; stopAt: number };
};

export type RuleRuntimeResponse = RuleRuntimeReadyMessage
  | RuleRuntimeActionMessage
  | RuleRuntimeResourceMissingMessage
  | RuleRuntimeLogMessage
  | RuleRuntimeTimerStateChangedMessage
  | RuleRuntimeRulesLoadedMessage
  | RuleRuntimeResourcesLoadedMessage;

export type RuleRuntimeCommandMap = {
  stateUpdate: {
    request: Omit<RuleRuntimeStateUpdateCommand, "kind">;
    response: void;
  };
  stateFullUpdate: {
    request: Omit<RuleRuntimeStateFullUpdateCommand, "kind">;
    response: void;
  };
  muteCommand: {
    request: Omit<RuleRuntimeMuteCommand, "kind">;
    response: void;
  };
};

export type FireAndForgetCmdKey = keyof RuleRuntimeCommandMap;

export function isRuleRuntimeEventObject(obj: unknown): obj is Extract<RuleRuntimeResponse, { kind: "event" }> {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "kind" in obj &&
    obj.kind === "event"

  );
}
