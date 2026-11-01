import { HIGHLIGHT_END, HIGHLIGHT_START } from "@aud/common";
import { Box } from "@mui/material";
import React from "react";

type HighlightedTextProps = {
    /** The text with `HIGHLIGHT_START` / `HIGHLIGHT_END` around the matched parts, or the plain text when the search did not mark it. */
    text: string;
};

/** Text from a search hit, with the matched parts in bold. */
export const HighlightedText: React.FC<HighlightedTextProps> = ({ text }) => (
    <>
        {text.split(HIGHLIGHT_START).map((part, index) => {
            const [marked, rest] = part.split(HIGHLIGHT_END);
            return index === 0 ? (
                part
            ) : (
                <React.Fragment key={index}>
                    <Box component="strong" sx={{ fontWeight: 700 }}>
                        {marked}
                    </Box>
                    {rest}
                </React.Fragment>
            );
        })}
    </>
);
