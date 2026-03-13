import { Grid2 } from "@mui/material";
import React from "react";
import { wideGridItemSx } from "../../shared/tileGridSx";
import { ViewWithState } from "../viewSelectors";
import { ViewTile } from "./ViewTile";

type ViewTileGridProps = {
    items: ViewWithState[];
    highlightedTileId: string | undefined;
    highlightedTileRef: (id: string) => ((el: HTMLElement | null) => void) | undefined;
};

export const ViewTileGrid: React.FC<ViewTileGridProps> = ({ items, highlightedTileId, highlightedTileRef }) => {
    return (
        <Grid2 container spacing={2} sx={{ width: "100%", margin: 0 }}>
            {items.map(({ view, active, stateDisplayValues }) => (
                <Grid2 key={view.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                    ref={highlightedTileId ? highlightedTileRef(view.id) : undefined}
                    sx={{
                        ...wideGridItemSx,
                        ...(highlightedTileId === view.id && {
                            "& > .MuiCard-root": {
                                boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}`,
                                transition: "box-shadow 0.3s ease",
                            },
                        }),
                    }}>
                    <ViewTile view={view} active={active} stateDisplayValues={stateDisplayValues} />
                </Grid2>
            ))}
        </Grid2>
    );
};
