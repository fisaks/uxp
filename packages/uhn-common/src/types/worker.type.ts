
import { ResourceBase, ResourceType } from "@uhn/blueprint";


export type ResourceErrorCode =
  | "duplicate-id"
  | "duplicate-address"
  | "missing-id"

export type RuntimeResourceBase<TType extends ResourceType> =
  Omit<ResourceBase<TType>, 'id' | 'name'> & {
    id: string;
    name: string;
    errors?: ResourceErrorCode[];
  };

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