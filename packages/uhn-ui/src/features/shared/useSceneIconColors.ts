import TheaterComedyIcon from "@mui/icons-material/TheaterComedy";
import { alpha, Theme } from "@mui/material";
import { BlueprintIcon } from "@uhn/blueprint";
import { getBlueprintIcon } from "../view/blueprintIconMap";

export function useSceneIconColors(icon: BlueprintIcon | undefined, pending: boolean, theme: Theme) {
    const iconEntry = getBlueprintIcon(icon);
    const IconComponent = iconEntry?.active ?? TheaterComedyIcon;

    const mode = theme.palette.mode;
    const activeColor = iconEntry?.colors?.active[mode] ?? theme.palette.primary.main;
    const iconColor = pending ? theme.palette.action.disabled : activeColor;
    const surfaceColor = iconEntry?.colors
        ? alpha(iconEntry.colors.surface[mode], mode === "dark" ? 0.06 : 0.045)
        : undefined;

    return { IconComponent, iconColor, surfaceColor };
}
