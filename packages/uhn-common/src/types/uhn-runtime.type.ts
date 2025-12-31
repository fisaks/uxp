
import { DigitalInputResourceBase, DigitalOutputResourceBase, ResourceBase, ResourceType, RuntimeRuleAction } from "@uhn/blueprint";


export type ResourceStateValue = boolean | number;

export type RuntimeResourceState = {
  resourceId: string;
  value: ResourceStateValue | undefined;
  timestamp: number;
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

export type RuleRuntimeListResourcesCommand = {
  kind: "request";
  id: string;
  cmd: "listResources";
};
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
export type RuleRuntimeCommand = RuleRuntimeListResourcesCommand
  | RuleRuntimeStateUpdateCommand
  | RuleRuntimeStateFullUpdateCommand; // | MoreCommands


export type RuleRuntimeListResourcesResponse = {
  kind: "response"
  id: string;
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

export type RuleRuntimeErrorResponse = { kind: "response"; id: string; error: string };


export type RuleRuntimeResponse = RuleRuntimeListResourcesResponse
  | RuleRuntimeErrorResponse
  | RuleRuntimeReadyMessage
  | RuleRuntimeActionMessage
  | RuleRuntimeResourceMissingMessage
  | RuleRuntimeLogMessage;

export type RuleRuntimeCommandMap = {
  listResources: {
    request: Omit<RuleRuntimeListResourcesCommand, "id" | "kind">;
    response: Omit<RuleRuntimeListResourcesResponse, "id" | "kind">;
  };
  stateUpdate: {
    request: Omit<RuleRuntimeStateUpdateCommand, "kind">;
    response: void;
  };
  stateFullUpdate: {
    request: Omit<RuleRuntimeStateFullUpdateCommand, "kind">;
    response: void;
  };
};

export type CmdKey = keyof RuleRuntimeCommandMap;

export type FireAndForgetCmdKey = {
  [K in CmdKey]: RuleRuntimeCommandMap[K]["response"] extends void ? K : never
}[CmdKey];

export type AsyncCmdKey = Exclude<CmdKey, FireAndForgetCmdKey>;

export function isRuleRuntimeResponseObject(obj: unknown): obj is Extract<RuleRuntimeResponse, { kind: "response", id: string }> {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "kind" in obj &&
    obj.kind === "response" &&
    "id" in obj &&
    typeof (obj as any).id === "string"

  );
}
export function isRuleRuntimeEventObject(obj: unknown): obj is Extract<RuleRuntimeResponse, { kind: "event" }> {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "kind" in obj &&
    obj.kind === "event"

  );
}
