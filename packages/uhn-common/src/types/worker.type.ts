
import { ResourceBase, ResourceType } from "@uhn/blueprint";


export type ListResourcesCommand = {
  id: string;
  cmd: "listResources";
};
export type WorkerCommand = ListResourcesCommand; // | MoreCommands

export type ListResourcesResponse = {
  id: string;
  resources: ResourceBase<ResourceType>[];
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