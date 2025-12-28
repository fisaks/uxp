import { BaseInputKind, BaseOutputKind, InputType } from "@uhn/blueprint";
import { RuntimeResource, RuntimeResourceState } from "@uhn/common";

// Helper types

export type TileRuntimeResource = RuntimeResource & { outputKind?: BaseOutputKind, inputKind?: BaseInputKind, inputType?: InputType };
export type TileRuntimeResourceState = Pick<RuntimeResourceState, "value" | "timestamp">;
