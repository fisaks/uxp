import { InputType, ResourceType } from "@uhn/blueprint";
import { RuntimeResourceBase, RuntimeResourceState } from "@uhn/common";

// Helper types
export type TileRuntimeResource = RuntimeResourceBase<ResourceType> & { outputKind?: string, inputKind?: string, inputType?: InputType };
export type TileRuntimeResourceState = Pick<RuntimeResourceState, "value" | "timestamp">;
