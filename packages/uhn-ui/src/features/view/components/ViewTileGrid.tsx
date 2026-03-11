import { Grid2 } from "@mui/material";
import React from "react";
import { useSelector } from "react-redux";
import { wideGridItemSx } from "../../shared/tileGridSx";
import { selectViewsWithState } from "../viewSelectors";
import { ViewTile } from "./ViewTile";

export const ViewTileGrid: React.FC = () => {
    const viewsWithState = useSelector(selectViewsWithState);

    return (
        <Grid2 container spacing={2} sx={{ width: "100%", margin: 0 }}>
            {viewsWithState.map(({ view, active, stateDisplayValues }) => (
                <Grid2 key={view.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                    sx={wideGridItemSx}>
                    <ViewTile view={view} active={active} stateDisplayValues={stateDisplayValues} />
                </Grid2>
            ))}
        </Grid2>
    );
};
