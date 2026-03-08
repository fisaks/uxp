import { Box, Typography } from "@mui/material";
import { ReloadIconButton } from "@uxp/ui-lib";
import { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { useUHNWebSocket } from "../../../app/UHNAppBrowserWebSocketManager";
import { LocationDetail } from "../components/LocationDetail";
import { LocationNav } from "../components/LocationNav";
import { selectAllLocations } from "../locationSelectors";

export const LocationPage = () => {
    const { sendMessageAsync } = useUHNWebSocket();
    const locations = useSelector(selectAllLocations);
    const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);

    const refetch = async () => {
        setLoading(true);
        try {
            await sendMessageAsync("uhn:unsubscribe", { patterns: ["location/*", "view/*", "state/*", "resource/*"] });
            await sendMessageAsync("uhn:subscribe", { patterns: ["location/*", "view/*", "state/*", "resource/*"] });
        } finally {
            setLoading(false);
        }
    };

    // Auto-select first location if none selected
    const effectiveSelectedId = selectedId && locations.some(l => l.id === selectedId)
        ? selectedId
        : locations[0]?.id;

    const selectedLocation = locations.find(l => l.id === effectiveSelectedId);

    const onSelect = useCallback((id: string) => setSelectedId(id), []);

    return (
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h1">Locations</Typography>
                <ReloadIconButton isLoading={loading} reload={refetch} />
            </Box>
            <Box mt={2}>
                {locations.length > 0 ? (
                    <>
                        <LocationNav
                            locations={locations}
                            selectedId={effectiveSelectedId}
                            onSelect={onSelect}
                        />
                        {selectedLocation && <LocationDetail location={selectedLocation} />}
                    </>
                ) : (
                    <Typography color="text.secondary">
                        No locations defined. Add locations to your blueprint in src/locations/.
                    </Typography>
                )}
            </Box>
        </Box>
    );
};
