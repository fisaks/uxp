import HomeIcon from "@mui/icons-material/Home";
import SettingsIcon from "@mui/icons-material/Settings";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import { Box, Typography } from "@mui/material";
import { LocationItemRef } from "@uhn/common";
import { assertNever } from "@uxp/common";
import { ReloadIconButton, TooltipIconButton, usePortalContainerRef } from "@uxp/ui-lib";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useUHNWebSocket } from "../../../app/UHNAppBrowserWebSocketManager";
import { useFetchFavoritesQuery } from "../../favorite/favorite.api";
import { FavoritesSection, LOCATION_FAVORITES } from "../../favorite/components/FavoritesSection";
import { LocationSection } from "../components/LocationSection";
import { LOCATION_TOP, StickyCommandBar } from "../components/StickyCommandBar";
import { ReorderLocationsDialog } from "../components/ReorderLocationsDialog";
import { useLocationIntersectionObserver } from "../hooks/useLocationIntersectionObserver";
import { useOrderedLocations } from "../hooks/useOrderedLocations";
import { useVisibleTileCount } from "../hooks/useVisibleTileCount";
import { useFetchLocationItemOrdersQuery, useSaveLocationItemOrderMutation, useDeleteLocationItemOrderMutation } from "../location-item-order.api";
import { useFetchLocationSectionOrderQuery } from "../location-section-order.api";
import { QuickActionId } from "../../command-palette/commandPalette.types";
import { SCROLL_OVERRIDE_TIMEOUT } from "../locationConstants";
import { selectAllLocations } from "../locationSelectors";

export const LocationPage = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const portalContainer = usePortalContainerRef();
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
    const [searchTerm, setSearchTerm] = useState("");
    const [filterExact, setFilterExact] = useState(false);
    const [highlightedItemKey, setHighlightedItemKey] = useState<string | null>(null);
    const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const expandedIdsRef = useRef<Set<string>>(new Set());
    const tilesPerRowRef = useRef<number>(1);
    tilesPerRowRef.current = useVisibleTileCount();

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

    /** Maps itemKey (e.g. "view:living-room-light") → its index within its location section (respecting custom order). */
    const itemIndexMapRef = useRef<Map<string, number>>(new Map());
    itemIndexMapRef.current = useMemo(() => {
        const map = new Map<string, number>(); // key: "kind:refId", value: position index in section
        for (const loc of locations) {
            const savedOrder = locationItemOrderMap.get(loc.id);
            let keys: string[];
            if (savedOrder?.length) {
                const itemSet = new Set(loc.items.map(i => `${i.kind}:${i.refId}`));
                keys = [];
                const seen = new Set<string>();
                for (const ref of savedOrder) {
                    const key = `${ref.kind}:${ref.refId}`;
                    if (itemSet.has(key)) { keys.push(key); seen.add(key); }
                }
                for (const item of loc.items) {
                    const key = `${item.kind}:${item.refId}`;
                    if (!seen.has(key)) keys.push(key);
                }
            } else {
                keys = loc.items.map(i => `${i.kind}:${i.refId}`);
            }
            keys.forEach((key, index) => map.set(key, index));
        }
        return map;
    }, [locations, locationItemOrderMap]);

    const handleHighlightItem = useCallback((itemKey: string, locationId: string, durationMs?: number) => {
        setHighlightedItemKey(itemKey);
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = setTimeout(() => setHighlightedItemKey(null), durationMs ?? 5000);

        // Only expand if the item is in the overflow area (beyond the first visible row)
        const itemIndex = itemIndexMapRef.current.get(itemKey) ?? -1;
        const itemInOverflow = itemIndex === -1 || itemIndex >= tilesPerRowRef.current;
        const needsExpand = itemInOverflow && !expandedIdsRef.current.has(locationId);
        if (needsExpand) {
            setExpandedIds(prev => {
                const next = new Set(prev);
                next.add(locationId);
                return next;
            });
        }
        // Delay scroll when expanding so the Collapse animation renders the tiles first
        const scrollDelay = needsExpand ? 350 : 0;
        setTimeout(() => {
            scrollOverrideRef.current = locationId;
            // Try to scroll directly to the tile element for accurate centering
            // (scrolling to the section header can leave the tile off-screen on mobile)
            const sectionEl = sectionRefs.current[locationId];
            const tileEl = sectionEl?.querySelector<HTMLElement>(`[data-item-key="${itemKey}"]`);
            const target = tileEl ?? sectionEl;
            if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
            clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = setTimeout(() => {
                scrollOverrideRef.current = null;
            }, SCROLL_OVERRIDE_TIMEOUT);
        }, scrollDelay);
    }, []);

    // Include favorites in the section IDs for IntersectionObserver tracking
    const allSectionIds = useMemo(
        () => hasFavorites ? [LOCATION_FAVORITES, ...locationIds] : locationIds,
        [hasFavorites, locationIds],
    );

    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    expandedIdsRef.current = expandedIds;
    const allExpanded = allSectionIds.length > 0 && expandedIds.size >= allSectionIds.length;

    const toggleSection = useCallback((id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const expandLocation = useCallback((id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.add(id);
            return next;
        });
    }, []);

    const collapseLocation = useCallback((id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
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

    const scrollToSection = useCallback((locationId: string) => {
        scrollOverrideRef.current = locationId;
        const el = sectionRefs.current[locationId];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            scrollOverrideRef.current = null;
        }, SCROLL_OVERRIDE_TIMEOUT);
    }, []);

    // Dropdown selector: scroll only, no auto-expand
    const handleSwitcherSelect = useCallback((locationId: string) => {
        if (locationId === LOCATION_TOP) {
            // Instant scroll: smooth animation conflicts with the sticky bar
            // transition (fixed → in-flow) causing the scroll to stop short.
            // No override needed — instant scroll completes immediately and
            // the observer picks up the visible section.
            pageHeaderRef.current?.scrollIntoView({ block: "end" });
        } else {
            scrollToSection(locationId);
        }
    }, [scrollToSection]);

    // Command palette: expand the section so the user sees its contents, then scroll.
    // Delays scroll when expanding so the Collapse animation renders first.
    const handlePaletteLocationSelect = useCallback((locationId: string) => {
        if (locationId === LOCATION_TOP) {
            pageHeaderRef.current?.scrollIntoView({ block: "end" });
        } else {
            const needsExpand = !expandedIdsRef.current.has(locationId);
            if (needsExpand) {
                setExpandedIds(prev => {
                    const next = new Set(prev);
                    next.add(locationId);
                    return next;
                });
            }
            setTimeout(() => scrollToSection(locationId), needsExpand ? 350 : 0);
        }
    }, [scrollToSection]);

    const handleLocationItemReorder = useCallback((locationId: string, locationItems: LocationItemRef[]) => {
        saveLocationItemOrder({ locationId, locationItems });
    }, [saveLocationItemOrder]);

    const handleResetLocationItemOrder = useCallback((locationId: string) => {
        deleteLocationItemOrder(locationId);
    }, [deleteLocationItemOrder]);

    // Apply deferred actions from URL search params (e.g., Ctrl+K dialog on another page).
    // Params are cleared immediately via replace so they don't persist in the URL.
    // Uses polling to wait for section refs to become available after navigation.
    const scrollToParam = searchParams.get("scrollTo");
    const filterParam = searchParams.get("filter");
    const highlightParam = searchParams.get("highlight");
    const actionParam = searchParams.get("quick");

    useEffect(() => {
        if (!scrollToParam && !filterParam && !highlightParam && !actionParam) return;

        // Capture values before clearing — setSearchParams triggers a re-render
        // that nullifies the params, which would cancel our polling timer via
        // the cleanup function if the params were in the dependency array.
        const capturedScrollTo = scrollToParam;
        const capturedFilter = filterParam;
        const capturedHighlight = highlightParam;
        const capturedAction = actionParam as QuickActionId | null;

        // Clear search params from URL immediately (replace so no history entry)
        setSearchParams({}, { replace: true });

        if (capturedFilter) {
            setSearchTerm(capturedFilter);
        }

        // Quick actions that don't need section refs can execute immediately
        if (capturedAction) {
            // Delay slightly so the page has rendered (e.g. allSectionIds populated).
            // Use ref to get the latest callback with current allSectionIds.
            setTimeout(() => handleQuickActionRef.current(capturedAction), 100);
            return;
        }

        const targetLocationId = capturedScrollTo ?? undefined;
        if (!targetLocationId && !capturedHighlight) return;

        let attempts = 0;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout>;

        const tryApply = () => {
            if (cancelled) return;
            attempts++;
            const refReady = targetLocationId ? !!sectionRefs.current[targetLocationId] : true;

            if (refReady || attempts >= 20) {
                if (capturedHighlight && targetLocationId) {
                    handleHighlightItem(capturedHighlight, targetLocationId);
                } else if (targetLocationId) {
                    handlePaletteLocationSelect(targetLocationId);
                }
            } else {
                timer = setTimeout(tryApply, 50);
            }
        };

        timer = setTimeout(tryApply, 50);
        return () => { cancelled = true; clearTimeout(timer); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Ctrl+K on home page focuses the inline palette input.
    // The sticky bar renders barContent twice (hidden in-flow + visible fixed),
    // so we pick the last [data-palette-input] which is always the visible one.
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "k") {
                event.preventDefault();
                const root = portalContainer.current?.getRootNode() as ShadowRoot | Document | undefined;
                const inputs = (root ?? document).querySelectorAll<HTMLInputElement>("[data-palette-input]");
                inputs[inputs.length - 1]?.focus();
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

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

    const handleQuickAction = useCallback((action: QuickActionId) => {
        switch (action) {
            case "expand-all":
                setExpandedIds(new Set(allSectionIds));
                break;
            case "collapse-all":
                setExpandedIds(new Set());
                break;
            case "refresh":
                refetch();
                break;
            case "scroll-to-top":
                pageHeaderRef.current?.scrollIntoView({ block: "end" });
                break;
            case "clear-filter":
                setSearchTerm("");
                setFilterExact(false);
                break;
            default:
                assertNever(action, "Unhandled quick action type");
        }
    }, [allSectionIds]); // eslint-disable-line react-hooks/exhaustive-deps
    const handleQuickActionRef = useRef(handleQuickAction);
    handleQuickActionRef.current = handleQuickAction;

    return (
        <Box>
            <Box ref={pageHeaderRef} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <HomeIcon sx={{ color: "primary.main" }} />
                <Typography variant="h1">Locations</Typography>
                <ReloadIconButton isLoading={loading} reload={refetch} tooltipPortal={portalContainer} />
                <TooltipIconButton onClick={toggleAll}
                    tooltip={allExpanded ? "Collapse all" : "Expand all"}
                    tooltipPortal={portalContainer}
                    sx={{ color: "primary.main" }}>
                    {allExpanded ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
                </TooltipIconButton>
                <TooltipIconButton onClick={() => setReorderDialogOpen(true)}
                    tooltip="Reorder locations"
                    tooltipPortal={portalContainer}
                    sx={{ color: "primary.main" }}>
                    <SwapVertIcon />
                </TooltipIconButton>
                <TooltipIconButton onClick={() => navigate("/technical")}
                    tooltip="Technical"
                    tooltipPortal={portalContainer}
                    sx={{ color: "primary.main" }}>
                    <SettingsIcon />
                </TooltipIconButton>
            </Box>
            <Box mt={2}>
                {locations.length > 0 ? (
                    <>
                        <StickyCommandBar
                            locations={locations}
                            activeLocationId={displayActiveId ?? allSectionIds[0]}
                            onLocationSelect={handleSwitcherSelect}
                            onPaletteLocationSelect={handlePaletteLocationSelect}
                            hasFavorites={hasFavorites}
                            onSearchTermChange={(term, exact) => { setSearchTerm(term); setFilterExact(!!exact); }}
                            onHighlightItem={handleHighlightItem}
                            onQuickAction={handleQuickAction}
                            onExpandLocation={expandLocation}
                            onCollapseLocation={collapseLocation}
                            filterTerm={searchTerm}
                        />
                        {hasFavorites && (
                            <FavoritesSection
                                favorites={favorites!}
                                sectionRef={(el) => { sectionRefs.current[LOCATION_FAVORITES] = el; }}
                                expanded={expandedIds.has(LOCATION_FAVORITES)}
                                onExpandToggle={() => toggleSection(LOCATION_FAVORITES)}
                                filterTerm={searchTerm}
                                filterExact={filterExact}
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
                                filterTerm={searchTerm}
                                filterExact={filterExact}
                                highlightedItemKey={highlightedItemKey}
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
