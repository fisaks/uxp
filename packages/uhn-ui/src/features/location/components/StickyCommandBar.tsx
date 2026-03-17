import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import StarIcon from "@mui/icons-material/Star";
import { Box, FormControl, MenuItem, Select, SelectChangeEvent, useTheme } from "@mui/material";
import { RuntimeLocation } from "@uhn/common";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useState } from "react";
import { QuickActionId } from "../../command-palette/commandPalette.types";
import { CommandPaletteAutocomplete } from "../../command-palette/CommandPaletteAutocomplete";
import { LOCATION_FAVORITES } from "../../favorite/components/FavoritesSection";
import { getBlueprintIcon } from "../../view/blueprintIconMap";
import { APP_BAR_HEIGHT } from "../locationConstants";
import { useStickyOnScroll } from "../../shared/useStickyOnScroll";

export const LOCATION_TOP = "__top__";

const truncateSx = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;

/** Renders an icon + label row for a location option. */
const LocationOption: React.FC<{ icon?: React.ElementType; label: string; truncate?: boolean }> = ({ icon: Icon, label, truncate }) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, ...(truncate && { overflow: "hidden" }) }}>
        {Icon && <Icon fontSize="small" sx={{ color: "primary.main", flexShrink: 0 }} />}
        {truncate
            ? <Box component="span" sx={truncateSx}>{label}</Box>
            : label}
    </Box>
);

type StickyCommandBarProps = {
    locations: RuntimeLocation[];
    activeLocationId: string | undefined;
    /** Called when the user picks a location from the dropdown selector (scroll only). */
    onLocationSelect: (locationId: string) => void;
    /** Called when the command palette selects a location (scroll + expand). */
    onPaletteLocationSelect: (locationId: string) => void;
    hasFavorites?: boolean;
    onSearchTermChange?: (term: string, exact?: boolean) => void;
    onHighlightItem?: (itemKey: string, locationId: string, durationMs?: number) => void;
    onQuickAction?: (action: QuickActionId) => void;
    onExpandLocation?: (locationId: string) => void;
    onCollapseLocation?: (locationId: string) => void;
    /** External filter term to display in the command palette input. */
    filterTerm?: string;
};

export const StickyCommandBar: React.FC<StickyCommandBarProps> = ({
    locations, activeLocationId, onLocationSelect, onPaletteLocationSelect, hasFavorites, onSearchTermChange, onHighlightItem, onQuickAction, onExpandLocation, onCollapseLocation, filterTerm,
}) => {
    const portalContainer = usePortalContainerRef();
    const theme = useTheme();
    const selectTextColor = (theme.typography.h2 as React.CSSProperties).color ?? theme.palette.text.primary;
    const { stickyBoxRef, isFixed, fixedWidth } = useStickyOnScroll(APP_BAR_HEIGHT);
    const [paletteFocused, setPaletteFocused] = useState(false);

    const handleLocationSelection = (event: SelectChangeEvent<string>) => {
        onLocationSelect(event.target.value);
    };

    // Single bar content — rendered once to preserve component state (voice, etc.)
    // across the in-flow ↔ fixed transition. When fixed, the ref box acts as a
    // height spacer so the page doesn't jump.
    return (
        <>
            <Box ref={stickyBoxRef} sx={{ mb: 2, ...(isFixed && { visibility: "hidden" }) }} />
            <Box sx={{
                position: "relative",

                ...(isFixed && {
                    position: "fixed",
                    top: APP_BAR_HEIGHT,
                    width: fixedWidth,
                    zIndex: theme.zIndex.appBar + 101,
                    bgcolor: "background.default",
                    py: 1,
                    boxShadow: 1,
                }),
            }}>
                <Box sx={{
                    display: "flex", alignItems: "center", gap: 1,
                    maxWidth: { xs: "100%", sm: 800, md: 900 }, mx: "auto",
                }}>
                    <CommandPaletteAutocomplete
                        onLocationSelect={onPaletteLocationSelect}
                        onSearchTermChange={onSearchTermChange}
                        onHighlightItem={onHighlightItem}
                        onQuickAction={onQuickAction}
                        onExpandLocation={onExpandLocation}
                        onCollapseLocation={onCollapseLocation}
                        onFocusChange={setPaletteFocused}
                        filterTerm={filterTerm}
                        sx={{ flex: 1, minWidth: "60%", maxWidth: { xs: "100%", sm: 400 } }}
                    />
                    {locations.length > 1 && (
                        <FormControl size="small" sx={{
                            minWidth: 0, flex: 1,
                            display: paletteFocused ? { xs: "none", sm: "inline-flex" } : "inline-flex",
                        }}>
                            <Select
                                value={activeLocationId ?? ""}
                                onChange={handleLocationSelection}
                                displayEmpty
                                MenuProps={{ container: portalContainer.current }}
                                sx={{
                                    "& .MuiSelect-select": {
                                        color: selectTextColor,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    },
                                    "& .MuiSelect-icon": { color: "text.secondary" },
                                }}
                                renderValue={(selected) => {
                                    if (selected === LOCATION_TOP) {
                                        return <LocationOption icon={ArrowUpwardIcon} label="Top" truncate />;
                                    }
                                    if (selected === LOCATION_FAVORITES) {
                                        return <LocationOption icon={StarIcon} label="Favorites" truncate />;
                                    }
                                    const loc = locations.find(l => l.id === selected);
                                    if (!loc) return null;
                                    const Icon = loc.icon ? getBlueprintIcon(loc.icon)?.active : undefined;
                                    return <LocationOption icon={Icon} label={loc.name ?? loc.id} truncate />;
                                }}
                            >
                                <MenuItem value={LOCATION_TOP}>
                                    <LocationOption icon={ArrowUpwardIcon} label="Top" />
                                </MenuItem>
                                {hasFavorites && (
                                    <MenuItem value={LOCATION_FAVORITES}>
                                        <LocationOption icon={StarIcon} label="Favorites" />
                                    </MenuItem>
                                )}
                                {locations.map(loc => {
                                    const Icon = loc.icon ? getBlueprintIcon(loc.icon)?.active : undefined;
                                    return (
                                        <MenuItem key={loc.id} value={loc.id}>
                                            <LocationOption icon={Icon} label={loc.name ?? loc.id} />
                                        </MenuItem>
                                    );
                                })}
                            </Select>
                        </FormControl>
                    )}
                </Box>
            </Box>
        </>
    );
};
