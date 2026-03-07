
import { AnalogInputResourceBase, AnalogOutputResourceBase, DigitalInputResourceBase, DigitalOutputResourceBase, LogicalResourceType, PhysicalResourceType, ResourceType, RuntimeRuleAction } from "@uhn/blueprint";

// --- Runtime rule serialization (for IPC + overview) ---

export type RuntimeRuleTriggerInfo =
  | { kind: "resource"; resourceId: string; event: "activated" | "deactivated" | "changed"; hysteresis?: number }
  | { kind: "threshold"; resourceId: string; direction: "above" | "below"; threshold: number; hysteresis?: number }
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

/** Runtime version of ComplexSubResourceRef — resource objects resolved to string IDs */
export type RuntimeComplexSubResourceRef = {
    resourceId: string;
    label?: string;
    group?: string;
};


type RuntimeResourceCommon = {
    id: string;
    name: string;
    description?: string;
    hidden?: boolean;
    errors?: ResourceErrorCode[];
};

export type RuntimePhysicalResource = RuntimeResourceCommon & {
    type: PhysicalResourceType;
    edge: string;
    device: string;
    pin: number;
};

export type RuntimeLogicalResource = RuntimeResourceCommon & {
    type: LogicalResourceType;
    host: string;
};

export type RuntimeResource = RuntimePhysicalResource | RuntimeLogicalResource;

export type RuntimeDigitalInputResource = RuntimePhysicalResource & {
    type: "digitalInput";
    inputKind: DigitalInputResourceBase["inputKind"];
    inputType: DigitalInputResourceBase["inputType"];
};

export type RuntimeDigitalOutputResource = RuntimePhysicalResource & {
    type: "digitalOutput";
    outputKind: DigitalOutputResourceBase["outputKind"];
};

export type RuntimeAnalogInputResource = RuntimePhysicalResource & {
    type: "analogInput";
    analogInputKind: AnalogInputResourceBase["analogInputKind"];
    unit?: string;
};

export type RuntimeAnalogOutputResource = RuntimePhysicalResource & {
    type: "analogOutput";
    analogOutputKind: AnalogOutputResourceBase["analogOutputKind"];
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
};

export type RuntimeComplexResource = RuntimeLogicalResource & {
  type: "complex";
  subResources: RuntimeComplexSubResourceRef[];
  unit?: string;
  inactiveValue?: number;
  emitsTap?: boolean;
};

export type RuntimeTimerResource = RuntimeLogicalResource & {
  type: "timer";
};

export type RuntimeVirtualDigitalInputResource = RuntimeLogicalResource & {
  type: "virtualDigitalInput";
  inputType: "push" | "toggle";
};

export function isPhysicalResource(r: RuntimeResource): r is RuntimePhysicalResource {
    return r.type === "digitalInput" || r.type === "digitalOutput" || r.type === "analogInput" || r.type === "analogOutput";
}

export function isLogicalResource(r: RuntimeResource): r is RuntimeLogicalResource {
    return r.type === "timer" || r.type === "complex" || r.type === "virtualDigitalInput";
}

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

export type RuleRuntimeTapCommand = {
  kind: "event";
  cmd: "tapCommand";
  payload: {
    resourceId: string;
    timestamp: number;
  };
};

export type RuleRuntimeCommand = RuleRuntimeStateUpdateCommand
  | RuleRuntimeStateFullUpdateCommand
  | RuleRuntimeTimerCommand
  | RuleRuntimeMuteCommand
  | RuleRuntimeTapCommand;


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
  level: "trace" | "debug" | "info" | "warn" | "error";
  component: string;
  message: string
  data?: unknown
};
export type RuleRuntimeReadyMessage = {
  kind: "event";
  cmd: "ready";
};

export type RuleRuntimeLogicalResourceStateChangedMessage = {
  kind: "event";
  cmd: "logicalResourceStateChanged";
  payload: {
    resourceId: string;
    value: ResourceStateValue;
    timestamp: number;
    details?: ResourceStateDetails;
  };
};

export type RuleRuntimeResponse = RuleRuntimeReadyMessage
  | RuleRuntimeActionMessage
  | RuleRuntimeResourceMissingMessage
  | RuleRuntimeLogMessage
  | RuleRuntimeLogicalResourceStateChangedMessage
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
  timerCommand: {
    request: Omit<RuleRuntimeTimerCommand, "kind">;
    response: void;
  };
  muteCommand: {
    request: Omit<RuleRuntimeMuteCommand, "kind">;
    response: void;
  };
  tapCommand: {
    request: Omit<RuleRuntimeTapCommand, "kind">;
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
