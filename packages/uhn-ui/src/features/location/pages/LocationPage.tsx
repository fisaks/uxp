import HomeIcon from "@mui/icons-material/Home";
import SettingsIcon from "@mui/icons-material/Settings";
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
import { useLocationIntersectionObserver } from "../hooks/useLocationIntersectionObserver";
import { useFetchLocationOrdersQuery, useSaveLocationOrderMutation, useDeleteLocationOrderMutation } from "../location-order.api";
import { SCROLL_OVERRIDE_TIMEOUT } from "../locationConstants";
import { selectAllLocations } from "../locationSelectors";

export const LocationPage = () => {
    const navigate = useNavigate();
    const { sendMessageAsync } = useUHNWebSocket();
    const locations = useSelector(selectAllLocations);
    const { data: favorites } = useFetchFavoritesQuery();
    const { data: locationOrders } = useFetchLocationOrdersQuery();
    const [saveLocationOrder] = useSaveLocationOrderMutation();
    const [deleteLocationOrder] = useDeleteLocationOrderMutation();
    const hasFavorites = (favorites?.length ?? 0) > 0;
    const [loading, setLoading] = useState(false);
    const locationIds = useMemo(() => locations.map(l => l.id), [locations]);

    /** Maps locationId → saved item order for quick lookup per section. */
    const locationOrderMap = useMemo(() => {
        const map = new Map<string, LocationItemRef[]>();
        if (locationOrders) {
            for (const order of locationOrders) {
                map.set(order.locationId, order.locationItems);
            }
        }
        return map;
    }, [locationOrders]);

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

    const handleLocationReorder = useCallback((locationId: string, locationItems: LocationItemRef[]) => {
        saveLocationOrder({ locationId, locationItems });
    }, [saveLocationOrder]);

    const handleResetLocationOrder = useCallback((locationId: string) => {
        deleteLocationOrder(locationId);
    }, [deleteLocationOrder]);

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
                    sx={{ color: "text.secondary" }}>
                    {allExpanded ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
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
                                savedOrder={locationOrderMap.get(location.id)}
                                sectionRef={(el) => { sectionRefs.current[location.id] = el; }}
                                expanded={expandedIds.has(location.id)}
                                onExpandToggle={() => toggleSection(location.id)}
                                onReorder={(locationItems) => handleLocationReorder(location.id, locationItems)}
                                onResetOrder={() => handleResetLocationOrder(location.id)}
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
        </Box>
    );
};
