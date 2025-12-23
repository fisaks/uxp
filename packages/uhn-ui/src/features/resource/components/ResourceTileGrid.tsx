import Grid2 from "@mui/material/Grid2/Grid2";
import { useSelector } from "react-redux";
import { selectResourcesWithState } from "../resourceSelector";
import { ResourceTile } from "./ResourceTile";

export const ResourceTileGrid = () => {
    const tiles = useSelector(selectResourcesWithState);

    return (
        <Grid2 container spacing={2} sx={{ width: "100%", margin: 0 }}>
            {tiles.map(({ resource, state }) => (
                <Grid2 key={resource.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <ResourceTile resource={resource} state={state} onAction={() => {console.log("Resource clicked")}}/>
                </Grid2>
            ))}
        </Grid2>
    );
}