import { HealthItem, HealthSnapshot } from "@uxp/common";

export type UhnHealthId =
    | "uhn:blueprint"
    | "uhn:runtime"
    | "uhn:resources"
    | `uhn:edge:${string}:status`
    | `uhn:edge:${string}:runtime`
    | `uhn:edge:${string}:blueprint`
    | `uhn:edge:${string}:device:${string}`;

export type UhnHealthItem = HealthItem<UhnHealthId>;
export type UhnHealthSnapshot = HealthSnapshot<"uhn", UhnHealthId>;