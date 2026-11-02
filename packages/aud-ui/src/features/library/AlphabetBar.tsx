import { Box, ButtonBase } from "@mui/material";
import React from "react";

const NON_LETTER = "#";

/** The letter an item is listed under: its first letter without accent, or # for a digit or a sign. */
export const letterOf = (name: string) => {
    const letter = name.trim().charAt(0).normalize("NFD").charAt(0).toUpperCase();
    return /\p{L}/u.test(letter) ? letter : NON_LETTER;
};

export const letterAnchorId = (letter: string) => `letter-${letter === NON_LETTER ? "other" : letter}`;

/** The app lives in a shadow root, where `document` cannot find the tiles, so they are looked for from the button. */
const jumpTo = (button: HTMLElement, letter: string) =>
    (button.getRootNode() as Document | ShadowRoot).getElementById(letterAnchorId(letter))?.scrollIntoView({ block: "start" });

/** Where the bar sticks: just under the top bar of the page. */
const TOP_BAR_HEIGHT = 56;

const BAR_HEIGHT = 36;

/** The room a tile needs above it to stay clear of the top bar and this bar when the page scrolls to it. */
export const ALPHABET_SCROLL_MARGIN = TOP_BAR_HEIGHT + BAR_HEIGHT + 8;

type AlphabetBarProps = {
    /** Called with the letter when it is pressed, after the page is scrolled to it. */
    onJump?: (letter: string) => void;
    /** The letters that have items, in order. */
    letters: string[];
};

/** A row of letters that jump to the items under that letter. It scrolls sideways when it does not fit. */
export const AlphabetBar: React.FC<AlphabetBarProps> = ({ letters, onJump }) => (
    <Box
        sx={{
            position: "sticky",
            top: TOP_BAR_HEIGHT,
            zIndex: (t) => t.zIndex.appBar - 2,
            bgcolor: "background.default",
            display: "flex",
            overflowX: "auto",
            mb: 1,
        }}
    >
        {letters.map((letter) => (
            <ButtonBase
                key={letter}
                onClick={(event) => {
                    jumpTo(event.currentTarget, letter);
                    onJump?.(letter);
                }}
                aria-label={`Jump to ${letter}`}
                sx={{ minWidth: 32, height: BAR_HEIGHT, typography: "body2", fontWeight: 600, color: "primary.main", borderRadius: 1 }}
            >
                {letter}
            </ButtonBase>
        ))}
    </Box>
);
