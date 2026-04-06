import DeviceHubIcon from "@mui/icons-material/DeviceHub";
import { alpha, Theme } from "@mui/material";
import { BlueprintIcon } from "@uhn/blueprint";
import { getBlueprintIcon } from "../view/blueprintIconMap";

export function useViewIconColors(icon: BlueprintIcon | undefined, active: boolean, theme: Theme) {
    const iconEntry = getBlueprintIcon(icon);
    const IconComponent = iconEntry
        ? (active || !iconEntry.inactive ? iconEntry.active : iconEntry.inactive)
        : DeviceHubIcon;

    const mode = theme.palette.mode;
    const activeColor = iconEntry?.colors?.active[mode] ?? theme.palette.primary.main;
    const inactiveColor = iconEntry?.colors?.inactive?.[mode] ?? theme.palette.action.disabled;
    const iconColor = active ? activeColor : inactiveColor;
    const surfaceColor = active && iconEntry?.colors
        ? alpha(iconEntry.colors.surface[mode], mode === "dark" ? 0.06 : 0.045)
        : undefined;

    return { IconComponent, iconColor, surfaceColor };
}
