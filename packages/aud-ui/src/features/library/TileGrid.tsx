import { Card, CardActionArea, CardContent, Typography } from "@mui/material";
import React from "react";

/** The grid of the tiles of a page: as many columns as fit, from a phone to a wide screen. */
export const TileGrid: React.FC<React.PropsWithChildren> = ({ children }) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 16 }}>{children}</div>
);

type TileProps = {
    picture: React.ReactNode;
    title: string;
    subtitle?: string;
    onClick: () => void;
    /** Makes the tile a place the page can scroll to. */
    anchorId?: string;
    /** Room above the tile when the page is scrolled to it, for the bars that stick to the top. */
    scrollMarginTop?: number;
    /** Draws a frame around the tile, to show where a jump to a letter ended. */
    highlighted?: boolean;
};

export const Tile: React.FC<TileProps> = ({ picture, title, subtitle, onClick, anchorId, scrollMarginTop, highlighted }) => (
    <Card id={anchorId} sx={{ scrollMarginTop, outline: highlighted ? 3 : 0, outlineStyle: "solid", outlineColor: "primary.main" }}>
        <CardActionArea onClick={onClick}>
            {picture}
            <CardContent sx={{ p: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="caption" color="text.secondary">
                        {subtitle}
                    </Typography>
                )}
            </CardContent>
        </CardActionArea>
    </Card>
);
