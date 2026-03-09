
import { AnalogInputResourceBase, AnalogOutputResourceBase, BlueprintIcon, DigitalInputResourceBase, DigitalOutputResourceBase, LogicalResourceType, PhysicalResourceType, ResourceType, RuntimeRuleAction, StateDisplayAggregation, StateDisplayStyle, ViewActiveCondition, ViewCommandType, ViewStateAggregation } from "@uhn/blueprint";

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
    icon?: BlueprintIcon;
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
  stateLabel?: string;
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

export type RuntimeVirtualAnalogOutputResource = RuntimeLogicalResource & {
  type: "virtualAnalogOutput";
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
};

export function isPhysicalResource(r: RuntimeResource): r is RuntimePhysicalResource {
    return r.type === "digitalInput" || r.type === "digitalOutput" || r.type === "analogInput" || r.type === "analogOutput";
}

export function isLogicalResource(r: RuntimeResource): r is RuntimeLogicalResource {
    return r.type === "timer" || r.type === "complex" || r.type === "virtualDigitalInput" || r.type === "virtualAnalogOutput";
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

export type RuleRuntimeLongPressCommand = {
  kind: "event";
  cmd: "longPressCommand";
  payload: {
    resourceId: string;
    timestamp: number;
    thresholdMs: number;
  };
};

export type RuleRuntimeCommand = RuleRuntimeStateUpdateCommand
  | RuleRuntimeStateFullUpdateCommand
  | RuleRuntimeTimerCommand
  | RuleRuntimeMuteCommand
  | RuleRuntimeTapCommand
  | RuleRuntimeLongPressCommand;


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

export type RuleRuntimeViewsLoadedMessage = {
  kind: "event";
  cmd: "viewsLoaded";
  views: RuntimeInteractionView[];
};

export type RuleRuntimeLocationsLoadedMessage = {
  kind: "event";
  cmd: "locationsLoaded";
  locations: RuntimeLocation[];
};

// --- Runtime Scene types (resourceId instead of resource objects) ---

export type RuntimeSceneCommand =
    | { type: "setDigitalOutput"; resourceId: string; value: boolean }
    | { type: "setAnalogOutput"; resourceId: string; value: number }
    | { type: "emitSignal"; resourceId: string; value: boolean | undefined };

export type RuntimeScene = {
    id: string;
    name: string;
    description?: string;
    icon?: BlueprintIcon;
    commands: RuntimeSceneCommand[];
};

export type RuleRuntimeScenesLoadedMessage = {
  kind: "event";
  cmd: "scenesLoaded";
  scenes: RuntimeScene[];
};

export type RuleRuntimeResponse = RuleRuntimeReadyMessage
  | RuleRuntimeActionMessage
  | RuleRuntimeResourceMissingMessage
  | RuleRuntimeLogMessage
  | RuleRuntimeLogicalResourceStateChangedMessage
  | RuleRuntimeRulesLoadedMessage
  | RuleRuntimeResourcesLoadedMessage
  | RuleRuntimeViewsLoadedMessage
  | RuleRuntimeLocationsLoadedMessage
  | RuleRuntimeScenesLoadedMessage;

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
  longPressCommand: {
    request: Omit<RuleRuntimeLongPressCommand, "kind">;
    response: void;
  };
};

export type FireAndForgetCmdKey = keyof RuleRuntimeCommandMap;

// --- Runtime InteractionView types (resourceId instead of resource objects) ---

export type RuntimeViewStateSource = {
    resourceId: string;
    activeWhen?: ViewActiveCondition;
};

export type RuntimeViewCommandTarget = {
    resourceId: string;
    type: ViewCommandType;
    holdMs?: number;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
};

export type RuntimeViewCommand = RuntimeViewCommandTarget & {
    onDeactivate?: RuntimeViewCommandTarget;
};

type RuntimeStateDisplayItemBase = {
    resourceId: string;
    label?: string;
    unit?: string;
};

export type RuntimeStateDisplayItem = RuntimeStateDisplayItemBase & (
    | { style?: "value" }
    | { style: "indicator"; icon: BlueprintIcon }
    | { style: "flash"; icon: BlueprintIcon }
);

export type RuntimeViewStateDisplay = {
    items: RuntimeStateDisplayItem[];
    aggregation?: StateDisplayAggregation;
};

export type RuntimeInteractionView = {
    id: string;
    name: string;
    description?: string;
    icon?: BlueprintIcon;
    stateFrom: RuntimeViewStateSource[];
    stateAggregation?: ViewStateAggregation;
    activeWhen?: ViewActiveCondition;
    command?: RuntimeViewCommand;
    stateDisplay?: RuntimeViewStateDisplay;
};

// --- Runtime Location types (resourceId/viewId instead of objects) ---

export type RuntimeLocationItem =
    | { kind: "resource"; refId: string; name?: string }
    | { kind: "view"; refId: string; name?: string }
    | { kind: "scene"; refId: string; name?: string };

export type RuntimeLocation = {
    id: string;
    name?: string;
    description?: string;
    icon?: BlueprintIcon;
    items: RuntimeLocationItem[];
};

export function isRuleRuntimeEventObject(obj: unknown): obj is Extract<RuleRuntimeResponse, { kind: "event" }> {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "kind" in obj &&
    obj.kind === "event"

  );
}
