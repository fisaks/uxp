import MovieIcon from "@mui/icons-material/Movie";
import { Box, Grid2, Typography } from "@mui/material";
import { RuntimeResource, RuntimeScene } from "@uhn/common";
import { ReloadIconButton } from "@uxp/ui-lib";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useUHNWebSocket } from "../../../app/UHNAppBrowserWebSocketManager";
import { selectResourceById } from "../../resource/resourceSelector";
import { wideGridItemSx } from "../../shared/tileGridSx";
import { TechnicalSearchField } from "../../technical/components/TechnicalSearchField";
import { useDeepLinkHighlight } from "../../technical/hooks/useDeepLinkHighlight";
import { SearchIndexEntry, useTechnicalSearch } from "../../technical/hooks/useTechnicalSearch";
import { SceneTile } from "../components/SceneTile";
import { selectAllScenes } from "../sceneSelectors";

/** Builds a lowercase search string for a scene. Kept in the page (not the slice)
 *  because it joins data from two slices (scenes + resources) and is cheap derived data. */
const buildSearchText = (scene: RuntimeScene, resourceById: Record<string, RuntimeResource>): string => {
    const resourceIds = scene.commands.map(c => c.resourceId);
    const resourceNames = resourceIds.map(id => resourceById[id]?.name).filter(Boolean);
    return [
        scene.id, scene.name, scene.description,
        ...resourceIds,
        ...resourceNames,
    ].filter(Boolean).join(" ").toLowerCase();
};

export const ScenePage = () => {
    const { sendMessageAsync } = useUHNWebSocket();
    const [loading, setLoading] = useState(false);
    const allScenes = useSelector(selectAllScenes);
    const resourceById = useSelector(selectResourceById);

    const { highlightedTileId, highlightedTileRef, scrollToHighlightedTile } = useDeepLinkHighlight();
    const deepLinkLabel = highlightedTileId
        ? allScenes.find(s => s.id === highlightedTileId)?.name ?? highlightedTileId
        : undefined;
    const searchIndex: SearchIndexEntry<RuntimeScene>[] = useMemo(
        () => allScenes.map((scene) => ({ item: scene, text: buildSearchText(scene, resourceById) })),
        [allScenes, resourceById]
    );

    const { searchTerm, onSearchChange, filteredItems, totalCount } = useTechnicalSearch({
        searchIndex,
    });

    const refetch = async () => {
        setLoading(true);
        try {
            await sendMessageAsync("uhn:unsubscribe", { patterns: ["scene/*", "resource/*"] });
            await sendMessageAsync("uhn:subscribe", { patterns: ["scene/*", "resource/*"] });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <MovieIcon sx={{ color: "primary.main" }} />
                <Typography variant="h1">Scenes</Typography>
                <ReloadIconButton isLoading={loading} reload={refetch} />
            </Box>
            <TechnicalSearchField
                value={searchTerm}
                onChange={onSearchChange}
                placeholder="Filter scenes..."
                filteredCount={filteredItems.length}
                totalCount={totalCount}
                deepLinkLabel={deepLinkLabel}
                onScrollToHighlightedTile={scrollToHighlightedTile}
            />
            <Box mt={2}>
                {filteredItems.length > 0 ? (
                    <Grid2 container spacing={2} sx={{ width: "100%", margin: 0 }}>
                        {filteredItems.map(scene => (
                            <Grid2 key={scene.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                                ref={highlightedTileId ? highlightedTileRef(scene.id) : undefined}
                                sx={{
                                    ...wideGridItemSx,
                                    ...(highlightedTileId === scene.id && {
                                        "& > .MuiCard-root": {
                                            boxShadow: (theme) => `0 0 0 3px ${theme.palette.primary.main}`,
                                            transition: "box-shadow 0.3s ease",
                                        },
                                    }),
                                }}>
                                <SceneTile scene={scene} />
                            </Grid2>
                        ))}
                    </Grid2>
                ) : (
                    <Typography color="text.secondary">
                        {searchTerm ? "No scenes match your search." : "No scenes available."}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};
