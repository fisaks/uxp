import { useMediaQuery, useTheme } from "@mui/material";

/** Returns the number of tiles that fit in one grid row at the current viewport width. */
export function useVisibleTileCount(): number {
    const theme = useTheme();
    const isWide = useMediaQuery("(min-width: 2200px)");
    const isLg = useMediaQuery(theme.breakpoints.up("lg"));
    const isMd = useMediaQuery(theme.breakpoints.up("md"));
    const isSm = useMediaQuery(theme.breakpoints.up("sm"));

    if (isWide) return 6;
    if (isLg) return 4;
    if (isMd) return 3;
    if (isSm) return 2;
    return 1;
}
