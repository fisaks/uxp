import { alpha, Theme } from "@mui/material";
import { getBlueprintIcon } from "../../view/blueprintIconMap";
import { isResourceActive } from "../isResourceActive";
import { TileRuntimeResource, TileRuntimeResourceState } from "../resource-ui.type";

export function getResourceIconColor(
    theme: Theme,
    resource: TileRuntimeResource,
    state?: TileRuntimeResourceState,
): string {
    if (resource.errors?.length) return theme.palette.error.main;

    const entry = resource.icon ? getBlueprintIcon(resource.icon) : undefined;
    const active = isResourceActive(resource, state);

    if (!active) return theme.palette.action.disabled;
    if (entry?.colors) return entry.colors.active[theme.palette.mode];
    return theme.palette.primary.main;
}

export function getResourceSurfaceColor(
    theme: Theme,
    resource: TileRuntimeResource,
): string {
    const entry = resource.icon ? getBlueprintIcon(resource.icon) : undefined;
    if (!entry?.colors) return "transparent";

    const mode = theme.palette.mode;
    const base = entry.colors.surface[mode];
    return alpha(base, mode === "dark" ? 0.06 : 0.045);
}
