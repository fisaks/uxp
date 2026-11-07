import { Box, ButtonBase } from "@mui/material";
import React from "react";
import { NAV_BAR_HEIGHT } from "../../VideoNavigation";
import { NO_DATE_LABEL } from "./clipFormat";

const BAR_HEIGHT = 36;

/** The room a year needs above it to stay clear of the bar when the page scrolls to it. */
export const YEAR_SCROLL_MARGIN = NAV_BAR_HEIGHT + BAR_HEIGHT + 8;

export const yearAnchorId = (year: string) => `year-${year === NO_DATE_LABEL ? "none" : year}`;

/** The app lives in a shadow root, where `document` cannot find the years, so they are looked for from the button. */
const jumpTo = (button: HTMLElement, year: string) =>
    (button.getRootNode() as Document | ShadowRoot).getElementById(yearAnchorId(year))?.scrollIntoView({ block: "start" });

type YearBarProps = {
    /** The years that have clips, in order. */
    years: string[];
    /** Called with the year when it is pressed, after the page is scrolled to it. */
    onJump: (year: string) => void;
};

/** A row of years that jump to the clips of that year. It scrolls sideways when it does not fit. */
export const YearBar: React.FC<YearBarProps> = ({ years, onJump }) => (
    <Box sx={{ position: "sticky", top: NAV_BAR_HEIGHT, zIndex: (t) => t.zIndex.appBar - 2, bgcolor: "background.default", display: "flex", overflowX: "auto", mb: 1 }}>
        {years.map((year) => (
            <ButtonBase
                key={year}
                onClick={(event) => {
                    jumpTo(event.currentTarget, year);
                    onJump(year);
                }}
                aria-label={`Jump to ${year}`}
                sx={{ px: 1, minWidth: 48, height: BAR_HEIGHT, typography: "body2", fontWeight: 600, color: "primary.main", borderRadius: 1, whiteSpace: "nowrap" }}
            >
                {year}
            </ButtonBase>
        ))}
    </Box>
);
