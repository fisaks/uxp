import { Box } from "@mui/material";
import React from "react";

export const READABLE_WIDTH = 900;
export const SIDE_COLUMN_WIDTH = 280;
export const SIDE_COLUMN_GAP = 32;
/** The width of every page: the album page, a list at a readable width with a column beside it, sets it. */
export const PAGE_WIDTH = SIDE_COLUMN_WIDTH + SIDE_COLUMN_GAP + READABLE_WIDTH;

/** Keeps a page at the width of the pages, in the middle of a wide screen. */
export const ReadableWidth: React.FC<React.PropsWithChildren> = ({ children }) => (
    <Box sx={{ maxWidth: PAGE_WIDTH, mx: "auto" }}>{children}</Box>
);
