import { BaseAnalogInputKind, BaseAnalogOutputKind, BaseInputKind, BaseOutputKind, InputType } from "@uhn/blueprint";
import { RuntimeComplexSubResourceRef, RuntimeComplexTileSummaryConfig, RuntimeResource, RuntimeResourceState } from "@uhn/common";

// Helper types

export type TileRuntimeResource = RuntimeResource & {
    outputKind?: BaseOutputKind;
    inputKind?: BaseInputKind;
    inputType?: InputType;
    analogInputKind?: BaseAnalogInputKind;
    analogOutputKind?: BaseAnalogOutputKind;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    subResources?: RuntimeComplexSubResourceRef[];
    tileSummary?: RuntimeComplexTileSummaryConfig;
};
export type TileRuntimeResourceState = Pick<RuntimeResourceState, "value" | "timestamp" | "details">;
