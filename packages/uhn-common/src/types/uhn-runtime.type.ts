
import { DigitalInputResourceBase, DigitalOutputResourceBase, ResourceBase, ResourceType } from "@uhn/blueprint";


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
  id: string;
  cmd: "listResources";
};
export type RuleRuntimeCommand = RuleRuntimeListResourcesCommand; // | MoreCommands

export type RuleRuntimeListResourcesResponse = {
  id: string;
  resources: RuntimeResource[];
};

export type RuleRuntimeReadyMessage = {
  cmd: "ready";
};

export type RuleRuntimeErrorResponse = { id: string | null; error: string };

export type RuleRuntimeResponse = RuleRuntimeListResourcesResponse | RuleRuntimeErrorResponse | RuleRuntimeReadyMessage;

export type RuleRuntimeCommandMap = {
  listResources: {
    request: Omit<RuleRuntimeListResourcesCommand, "id">;
    response: Omit<RuleRuntimeListResourcesResponse, "id">;
  };

};