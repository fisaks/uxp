import ViewQuiltIcon from "@mui/icons-material/ViewQuilt";
import { Box, Typography } from "@mui/material";
import { RuntimeResource } from "@uhn/common";
import { ReloadIconButton } from "@uxp/ui-lib";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useUHNWebSocket } from "../../../app/UHNAppBrowserWebSocketManager";
import { selectResourceById } from "../../resource/resourceSelector";
import { TechnicalSearchField } from "../../technical/components/TechnicalSearchField";
import { useDeepLinkHighlight } from "../../technical/hooks/useDeepLinkHighlight";
import { SearchIndexEntry, useTechnicalSearch } from "../../technical/hooks/useTechnicalSearch";
import { ViewTileGrid } from "../components/ViewTileGrid";
import { ViewWithState, selectViewsWithState } from "../viewSelectors";

/** Builds a lowercase search string for a view. Kept in the page (not the slice)
 *  because it joins data from two slices (views + resources) and is cheap derived data. */
const buildSearchText = (item: ViewWithState, resourceById: Record<string, RuntimeResource>): string => {
    const v = item.view;
    const resourceIds = [
        ...v.stateFrom.map(s => s.resourceId),
        v.command?.resourceId,
    ].filter(Boolean) as string[];
    const resourceNames = resourceIds.map(id => resourceById[id]?.name).filter(Boolean);
    return [
        v.id, v.name, v.description,
        v.command?.type,
        ...resourceIds,
        ...resourceNames,
    ].filter(Boolean).join(" ").toLowerCase();
};

export const ViewPage = () => {
    const { sendMessageAsync } = useUHNWebSocket();
    const [loading, setLoading] = useState(false);
    const allItems = useSelector(selectViewsWithState);
    const resourceById = useSelector(selectResourceById);

    const { highlightedTileId, highlightedTileRef, scrollToHighlightedTile } = useDeepLinkHighlight();
    const deepLinkLabel = highlightedTileId
        ? allItems.find(i => i.view.id === highlightedTileId)?.view.name ?? highlightedTileId
        : undefined;
    const searchIndex: SearchIndexEntry<ViewWithState>[] = useMemo(
        () => allItems.map((item) => ({ item, text: buildSearchText(item, resourceById) })),
        [allItems, resourceById]
    );

    const { searchTerm, onSearchChange, filteredItems, totalCount } = useTechnicalSearch({
        searchIndex,
    });

    const refetch = async () => {
        setLoading(true);
        try {
            await sendMessageAsync("uhn:unsubscribe", { patterns: ["view/*", "state/*", "resource/*"] });
            await sendMessageAsync("uhn:subscribe", { patterns: ["view/*", "state/*", "resource/*"] });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ViewQuiltIcon sx={{ color: "primary.main" }} />
                <Typography variant="h1">Views</Typography>
                <ReloadIconButton isLoading={loading} reload={refetch} />
            </Box>
            <TechnicalSearchField
                value={searchTerm}
                onChange={onSearchChange}
                placeholder="Filter views..."
                filteredCount={filteredItems.length}
                totalCount={totalCount}
                deepLinkLabel={deepLinkLabel}
                onScrollToHighlightedTile={scrollToHighlightedTile}
                historyKey="uhn-view-search-history"
            />
            <Box mt={2}>
                {filteredItems.length > 0 ? (
                    <ViewTileGrid items={filteredItems} highlightedTileId={highlightedTileId} highlightedTileRef={highlightedTileRef} />
                ) : (
                    <Typography color="text.secondary">
                        {searchTerm ? "No views match your search." : "No views available."}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};
