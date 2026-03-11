import type { SxProps, Theme } from "@mui/material";

/**
 * Sx override for Grid2 items to show 6 tiles per row on wide screens (≥2200px).
 * Uses MUI Grid2's internal CSS variables so gap spacing is handled correctly.
 */
export const wideGridItemSx: SxProps<Theme> = {
    "@media (min-width: 2200px)": {
        flexGrow: 0,
        flexBasis: "auto",
        width: "calc(100% * 2 / var(--Grid-parent-columns) - (var(--Grid-parent-columns) - 2) * (var(--Grid-parent-columnSpacing) / var(--Grid-parent-columns)))",
    },
};
