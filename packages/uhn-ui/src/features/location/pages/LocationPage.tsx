import HomeIcon from "@mui/icons-material/Home";
import SettingsIcon from "@mui/icons-material/Settings";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import { Box, IconButton, Typography } from "@mui/material";
import { LocationItemRef } from "@uhn/common";
import { ReloadIconButton } from "@uxp/ui-lib";
import { useCallback, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useUHNWebSocket } from "../../../app/UHNAppBrowserWebSocketManager";
import { useFetchFavoritesQuery } from "../../favorite/favorite.api";
import { FavoritesSection, LOCATION_FAVORITES } from "../../favorite/components/FavoritesSection";
import { LocationSection } from "../components/LocationSection";
import { LOCATION_TOP, LocationSwitcher } from "../components/LocationSwitcher";
import { ReorderLocationsDialog } from "../components/ReorderLocationsDialog";
import { useLocationIntersectionObserver } from "../hooks/useLocationIntersectionObserver";
import { useOrderedLocations } from "../hooks/useOrderedLocations";
import { useFetchLocationItemOrdersQuery, useSaveLocationItemOrderMutation, useDeleteLocationItemOrderMutation } from "../location-item-order.api";
import { useFetchLocationSectionOrderQuery } from "../location-section-order.api";
import { SCROLL_OVERRIDE_TIMEOUT } from "../locationConstants";
import { selectAllLocations } from "../locationSelectors";

export const LocationPage = () => {
    const navigate = useNavigate();
    const { sendMessageAsync } = useUHNWebSocket();
    const blueprintLocations = useSelector(selectAllLocations);
    const { data: favorites } = useFetchFavoritesQuery();
    const { data: locationItemOrders } = useFetchLocationItemOrdersQuery();
    const { data: locationSectionOrder } = useFetchLocationSectionOrderQuery();
    const [saveLocationItemOrder] = useSaveLocationItemOrderMutation();
    const [deleteLocationItemOrder] = useDeleteLocationItemOrderMutation();
    const hasFavorites = (favorites?.length ?? 0) > 0;
    const [loading, setLoading] = useState(false);
    const [reorderDialogOpen, setReorderDialogOpen] = useState(false);

    const savedLocationSectionIds = locationSectionOrder?.locationIds;
    const locations = useOrderedLocations(blueprintLocations, savedLocationSectionIds?.length ? savedLocationSectionIds : undefined);
    const locationIds = useMemo(() => locations.map(l => l.id), [locations]);

    /** Maps locationId → saved item order for quick lookup per section. */
    const locationItemOrderMap = useMemo(() => {
        const map = new Map<string, LocationItemRef[]>();
        if (locationItemOrders) {
            for (const order of locationItemOrders) {
                map.set(order.locationId, order.locationItems);
            }
        }
        return map;
    }, [locationItemOrders]);

    // Include favorites in the section IDs for IntersectionObserver tracking
    const allSectionIds = useMemo(
        () => hasFavorites ? [LOCATION_FAVORITES, ...locationIds] : locationIds,
        [hasFavorites, locationIds],
    );

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const allExpanded = allSectionIds.length > 0 && expandedIds.size >= allSectionIds.length;

    const toggleSection = useCallback((id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleAll = useCallback(() => {
        if (allExpanded) {
            setExpandedIds(new Set());
        } else {
            setExpandedIds(new Set(allSectionIds));
        }
    }, [allExpanded, allSectionIds]);

    const pageHeaderRef = useRef<HTMLDivElement>(null);
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const activeLocationId = useLocationIntersectionObserver(sectionRefs, allSectionIds);

    // When the user picks a location from the switcher, smooth scrolling takes
    // ~800ms to reach the target section. During that animation the intersection
    // observer still reports the *departing* section as most visible, which would
    // make the dropdown flicker back to the old value. scrollOverrideRef holds the
    // user's chosen ID and takes priority over the observer until the animation
    // settles. scrollTimeoutRef lets us cancel a pending clear if the user selects
    // again before the previous scroll finishes.
    const scrollOverrideRef = useRef<string | null>(null);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

    const handleSwitcherSelect = useCallback((locationId: string) => {
        if (locationId === LOCATION_TOP) {
            // Instant scroll: smooth animation conflicts with the sticky bar
            // transition (fixed → in-flow) causing the scroll to stop short.
            // No override needed — instant scroll completes immediately and
            // the observer picks up the visible section.
            pageHeaderRef.current?.scrollIntoView({ block: "end" });
        } else {
            scrollOverrideRef.current = locationId;
            const el = sectionRefs.current[locationId];
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = setTimeout(() => {
                scrollOverrideRef.current = null;
            }, SCROLL_OVERRIDE_TIMEOUT);
        }
    }, []);

    const handleLocationItemReorder = useCallback((locationId: string, locationItems: LocationItemRef[]) => {
        saveLocationItemOrder({ locationId, locationItems });
    }, [saveLocationItemOrder]);

    const handleResetLocationItemOrder = useCallback((locationId: string) => {
        deleteLocationItemOrder(locationId);
    }, [deleteLocationItemOrder]);

    const displayActiveId = scrollOverrideRef.current ?? activeLocationId;

    const refetch = async () => {
        setLoading(true);
        try {
            await sendMessageAsync("uhn:unsubscribe", { patterns: ["location/*", "view/*", "state/*", "resource/*"] });
            await sendMessageAsync("uhn:subscribe", { patterns: ["location/*", "view/*", "state/*", "resource/*"] });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Box ref={pageHeaderRef} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <HomeIcon sx={{ color: "primary.main" }} />
                <Typography variant="h1">Locations</Typography>
                <ReloadIconButton isLoading={loading} reload={refetch} />
                <IconButton onClick={toggleAll}
                    title={allExpanded ? "Collapse all" : "Expand all"}
                    sx={{ color: "primary.main" }}>
                    {allExpanded ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
                </IconButton>
                <IconButton onClick={() => setReorderDialogOpen(true)}
                    title="Reorder locations"
                    sx={{ color: "primary.main" }}>
                    <SwapVertIcon />
                </IconButton>
                <IconButton onClick={() => navigate("/technical")} title="Technical"
                    sx={{ color: "primary.main" }}>
                    <SettingsIcon />
                </IconButton>
            </Box>
            <Box mt={2}>
                {locations.length > 0 ? (
                    <>
                        <LocationSwitcher
                            locations={locations}
                            activeLocationId={displayActiveId ?? allSectionIds[0]}
                            onLocationSelect={handleSwitcherSelect}
                            hasFavorites={hasFavorites}
                        />
                        {hasFavorites && (
                            <FavoritesSection
                                favorites={favorites!}
                                sectionRef={(el) => { sectionRefs.current[LOCATION_FAVORITES] = el; }}
                                expanded={expandedIds.has(LOCATION_FAVORITES)}
                                onExpandToggle={() => toggleSection(LOCATION_FAVORITES)}
                            />
                        )}
                        {locations.map(location => (
                            <LocationSection
                                key={location.id}
                                location={location}
                                savedOrder={locationItemOrderMap.get(location.id)}
                                sectionRef={(el) => { sectionRefs.current[location.id] = el; }}
                                expanded={expandedIds.has(location.id)}
                                onExpandToggle={() => toggleSection(location.id)}
                                onReorder={(locationItems) => handleLocationItemReorder(location.id, locationItems)}
                                onResetOrder={() => handleResetLocationItemOrder(location.id)}
                            />
                        ))}
                        {/* Ensures the last section can scroll fully to the top */}
                        <Box sx={{ minHeight: "60vh" }} />
                    </>
                ) : (
                    <Typography color="text.secondary">
                        No locations defined. Add locations to your blueprint in src/locations/.
                    </Typography>
                )}
            </Box>
            <ReorderLocationsDialog
                open={reorderDialogOpen}
                onClose={() => setReorderDialogOpen(false)}
            />
        </Box>
    );
};
