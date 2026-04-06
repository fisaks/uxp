
import { ActionInputResourceBase, ActionOutputResourceBase, AnalogInputResourceBase, AnalogOutputOption, AnalogOutputResourceBase, BlueprintIcon, DigitalInputResourceBase, DigitalOutputResourceBase, HeroFontSize, LogicalResourceType, PhysicalResourceType, ResourceType, RuntimeRuleAction, ValueColorRule, ValueIconRule, ViewActiveCondition, ViewCommandType, ViewStateAggregation } from "@uhn/blueprint";

// --- Runtime rule serialization (for IPC + overview) ---

export type RuntimeRuleTriggerInfo =
  | { kind: "resource"; resourceId: string; event: "activated" | "deactivated" | "changed"; hysteresis?: number }
  | { kind: "threshold"; resourceId: string; direction: "above" | "below"; threshold: number; hysteresis?: number }
  | { kind: "tap"; resourceId: string }
  | { kind: "longPress"; resourceId: string; thresholdMs: number }
  | { kind: "timer"; resourceId: string; event: "activated" | "deactivated" }
  | { kind: "action"; resourceId: string; action: string };

export type RuntimeRuleInfo = {
  id: string;
  name?: string;
  description?: string;
  executionTarget?: string;
  triggers: RuntimeRuleTriggerInfo[];
  priority?: number;
  suppressMs?: number;
  cooldownMs?: number;
  /** Resource IDs this rule's actions typically affect (author-declared hint for UI). */
  actionHintResourceIds?: string[];
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
  /** When true, the state update does not trigger rule events (onChanged, etc.). */
  silent?: boolean;
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
    keywords?: string[];
    icon?: BlueprintIcon;
    errors?: ResourceErrorCode[];
};

export type RuntimePhysicalResource = RuntimeResourceCommon & {
    type: PhysicalResourceType;
    edge: string;
    device: string;
    pin: number | string;
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
    decimalPrecision?: number;
};

export type RuntimeAnalogOutputResource = RuntimePhysicalResource & {
    type: "analogOutput";
    analogOutputKind: AnalogOutputResourceBase["analogOutputKind"];
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    defaultOnValue?: number;
    options?: AnalogOutputOption[];
    decimalPrecision?: number;
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
  defaultOnValue?: number;
  options?: AnalogOutputOption[];
};

export type RuntimeActionInputResource = RuntimePhysicalResource & {
  type: "actionInput";
  actionInputKind: ActionInputResourceBase["actionInputKind"];
  actions: string[];
};

export type RuntimeActionOutputResource = RuntimePhysicalResource & {
  type: "actionOutput";
  actionOutputKind: ActionOutputResourceBase["actionOutputKind"];
  actions: string[];
};

export function isPhysicalResource(r: RuntimeResource): r is RuntimePhysicalResource {
    return r.type === "digitalInput" || r.type === "digitalOutput" || r.type === "analogInput" || r.type === "analogOutput" || r.type === "actionInput" || r.type === "actionOutput";
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

/** Action event → runtime. Triggers action rules in the runtime.
 *  Sources: physical button (Z2M transport), UI tap (WebSocket), or edge relay (MQTT). */
export type RuleRuntimeActionEventCommand = {
  kind: "event";
  cmd: "actionEvent";
  payload: {
    resourceId: string;
    action: string;
    metadata?: Record<string, unknown>;
    timestamp: number;
    /** Depth counter for loop prevention. 0 for physical/UI events, incremented for rule-emitted. */
    depth?: number;
  };
};

export type RuleRuntimeCommand = RuleRuntimeStateUpdateCommand
  | RuleRuntimeStateFullUpdateCommand
  | RuleRuntimeTimerCommand
  | RuleRuntimeMuteCommand
  | RuleRuntimeTapCommand
  | RuleRuntimeLongPressCommand
  | RuleRuntimeActionEventCommand;


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
    | { type: "emitSignal"; resourceId: string; value: boolean | undefined }
    | { type: "emitAction"; resourceId: string; action: string; metadata?: Record<string, unknown> }
    | { type: "setActionOutput"; resourceId: string; action: string };

export type RuntimeScene = {
    id: string;
    name: string;
    description?: string;
    keywords?: string[];
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
  actionEvent: {
    request: Omit<RuleRuntimeActionEventCommand, "kind">;
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
    simulateHold?: boolean;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    defaultOnValue?: number;
    options?: AnalogOutputOption[];
    action?: string;
    metadata?: Record<string, unknown>;
};

export type RuntimeViewCommand = RuntimeViewCommandTarget & {
    onDeactivate?: RuntimeViewCommandTarget;
};

/** Runtime version of DisplayValue — resource object resolved to string ID. */
export type RuntimeDisplayValue = {
    resourceId: string;
    label?: string;
    icon?: BlueprintIcon;
    unit?: string;
};

/** Runtime version of DisplayIcon — resource object resolved to string ID. */
export type RuntimeDisplayIcon = {
    resourceId: string;
    icon: BlueprintIcon;
    tooltip?: string | "value";
    showWhen?: "active" | "inactive" | "always";
    colorMap?: ValueColorRule[];
    iconMap?: ValueIconRule[];
};

/** Slot-keyed runtime state display — mirrors ViewStateDisplay with string IDs. */
export type RuntimeViewStateDisplay = {
    topLeft?: RuntimeDisplayIcon[];
    topCenter?: RuntimeDisplayIcon[];
    topRight?: RuntimeDisplayIcon[];
    left?: RuntimeDisplayValue[];
    right?: RuntimeDisplayValue[];
    badge?: RuntimeDisplayIcon[];
    hero?: RuntimeDisplayValue[];
    heroSize?: HeroFontSize;
};

export type RuntimeViewControl = {
    resourceId: string;
    label?: string;
    group?: string;
    inline?: boolean;
};

export type RuntimeInteractionView = {
    id: string;
    name: string;
    nameMap?: {
        active?: string;
        inactive?: string;
        resources?: { resourceId: string; name: string; activeWhen?: ViewActiveCondition }[];
    };
    description?: string;
    keywords?: string[];
    icon?: BlueprintIcon;
    stateFrom: RuntimeViewStateSource[];
    stateAggregation?: ViewStateAggregation;
    activeWhen?: ViewActiveCondition;
    command?: RuntimeViewCommand;
    sideEffects?: RuntimeActionSideEffect[];
    stateDisplay?: RuntimeViewStateDisplay;
    controls?: RuntimeViewControl[];
    alwaysEnableControls?: boolean;
    confirm?: boolean | string | {
        activate?: boolean | string;
        deactivate?: boolean | string;
    };
};

export type RuntimeActionSideEffect = {
    resourceId: string;
    action: string;
    metadata?: Record<string, unknown>;
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
    keywords?: string[];
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
