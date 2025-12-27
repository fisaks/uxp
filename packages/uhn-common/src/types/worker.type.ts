
import { DigitalInputResourceBase, DigitalOutputResourceBase, ResourceBase, ResourceType } from "@uhn/blueprint";


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

export type RuntimeResourceBase<TType extends ResourceType> =
  Omit<ResourceBase<TType>, 'id' | 'name'> & {
    id: string;
    name: string;
    errors?: ResourceErrorCode[];
  };
export type RuntimeDigitalInputResourceBase =
  DigitalInputResourceBase & {
    id: string;
    name: string;
    errors?: ResourceErrorCode[];
  };
export type RuntimeDigitalOutputResourceBase = DigitalOutputResourceBase & {
  id: string;
  name: string;
  errors?: ResourceErrorCode[];
};

export type ResourceList = RuntimeResourceBase<ResourceType>[];

export type ListResourcesCommand = {
  id: string;
  cmd: "listResources";
};
export type WorkerCommand = ListResourcesCommand; // | MoreCommands

export type ListResourcesResponse = {
  id: string;
  resources: RuntimeResourceBase<ResourceType>[];
};
export type ReadyCommand = {
  cmd: "ready";
};
export type ErrorResponse = { id: string | null; error: string };
export type WorkerResponse = ListResourcesResponse | ErrorResponse | ReadyCommand;

export type WorkerCommandMap = {
  listResources: {
    request: Omit<ListResourcesCommand, "id">;
    response: Omit<ListResourcesResponse, "id">;
  };

};