import { HealthItem, HealthSnapshot } from "@uxp/common";

export type UhnHealthId =
    | "uhn:blueprint"
    | "uhn:runtime"
    | "uhn:resources";

export type UhnHealthItem = HealthItem<UhnHealthId>;
export type UhnHealthSnapshot = HealthSnapshot<"uhn", UhnHealthId>;