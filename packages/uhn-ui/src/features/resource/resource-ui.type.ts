import { BaseAnalogInputKind, BaseAnalogOutputKind, BaseInputKind, BaseOutputKind, InputType } from "@uhn/blueprint";
import { RuntimeComplexSubResourceRef, RuntimeResource, RuntimeResourceState } from "@uhn/common";

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
    inactiveValue?: number;
    emitsTap?: boolean;
    subResources?: RuntimeComplexSubResourceRef[];
};
export type TileRuntimeResourceState = Pick<RuntimeResourceState, "value" | "timestamp" | "details">;
