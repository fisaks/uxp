import MemoryIcon from "@mui/icons-material/Memory";
import { Box, Typography } from "@mui/material";
import { isPhysicalResource, isLogicalResource } from "@uhn/common";
import { ReloadIconButton } from "@uxp/ui-lib";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useUHNWebSocket } from "../../../app/UHNAppBrowserWebSocketManager";
import { TechnicalSearchField } from "../../technical/components/TechnicalSearchField";
import { useDeepLinkHighlight } from "../../technical/hooks/useDeepLinkHighlight";
import { SearchIndexEntry, useTechnicalSearch } from "../../technical/hooks/useTechnicalSearch";
import { TileRuntimeResource, TileRuntimeResourceState } from "../resource-ui.type";
import { ResourceTileGrid } from "../components/ResourceTileGrid";
import { selectResourcesWithState } from "../resourceSelector";

type ResourceWithState = { resource: TileRuntimeResource; state: TileRuntimeResourceState | undefined };

/** Builds a lowercase search string for a resource. Kept in the page (not the slice)
 *  because it's cheap derived data and avoids extra Redux state. */
const buildSearchText = (item: ResourceWithState): string => {
    const r = item.resource;
    return [
        r.id, r.name, r.description, r.type,
        isPhysicalResource(r) ? `${r.edge} ${r.device}` : "",
        isLogicalResource(r) ? r.host : "",
        r.inputKind, r.outputKind, r.analogInputKind, r.analogOutputKind,
    ].filter(Boolean).join(" ").toLowerCase();
};

export const ResourcePage = () => {
    const { sendMessageAsync } = useUHNWebSocket();
    const [loading, setLoading] = useState(false);
    const allItems = useSelector(selectResourcesWithState);

    const { highlightedTileId, highlightedTileRef, scrollToHighlightedTile } = useDeepLinkHighlight();
    const deepLinkLabel = highlightedTileId
        ? allItems.find(i => i.resource.id === highlightedTileId)?.resource.name ?? highlightedTileId
        : undefined;

    const searchIndex: SearchIndexEntry<ResourceWithState>[] = useMemo(
        () => allItems.map((item) => ({ item, text: buildSearchText(item) })),
        [allItems]
    );

    const { searchTerm, onSearchChange, filteredItems, totalCount } = useTechnicalSearch({
        searchIndex,
    });

    const refetch = async () => {
        setLoading(true);
        try {
            await sendMessageAsync("uhn:unsubscribe", { patterns: ["resource/*", "state/*"] });
            await sendMessageAsync("uhn:subscribe", { patterns: ["resource/*", "state/*"] });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <MemoryIcon sx={{ color: "primary.main" }} />
                <Typography variant="h1">Resources</Typography>
                <ReloadIconButton isLoading={loading} reload={refetch} />
            </Box>
            <TechnicalSearchField
                value={searchTerm}
                onChange={onSearchChange}
                placeholder="Filter resources..."
                filteredCount={filteredItems.length}
                totalCount={totalCount}
                deepLinkLabel={deepLinkLabel}
                onScrollToHighlightedTile={scrollToHighlightedTile}
                historyKey="uhn-resource-search-history"
            />
            <Box mt={2}>
                {filteredItems.length > 0 ? (
                    <ResourceTileGrid items={filteredItems} highlightedTileId={highlightedTileId} highlightedTileRef={highlightedTileRef} />
                ) : (
                    <Typography color="text.secondary">
                        {searchTerm ? "No resources match your search." : "No resources available."}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};
