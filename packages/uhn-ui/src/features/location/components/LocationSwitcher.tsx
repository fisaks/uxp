import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import SearchIcon from "@mui/icons-material/Search";
import StarIcon from "@mui/icons-material/Star";
import { Box, FormControl, InputAdornment, MenuItem, Select, SelectChangeEvent, TextField, useTheme } from "@mui/material";
import { RuntimeLocation } from "@uhn/common";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React from "react";
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

type LocationSwitcherProps = {
    locations: RuntimeLocation[];
    activeLocationId: string | undefined;
    onLocationSelect: (locationId: string) => void;
    hasFavorites?: boolean;
};

export const LocationSwitcher: React.FC<LocationSwitcherProps> = ({
    locations, activeLocationId, onLocationSelect, hasFavorites,
}) => {
    const portalContainer = usePortalContainerRef();
    const theme = useTheme();
    const selectTextColor = (theme.typography.h2 as React.CSSProperties).color ?? theme.palette.text.primary;
    const { stickyBoxRef, isFixed, fixedWidth } = useStickyOnScroll(APP_BAR_HEIGHT);

    const handleLocationSelection = (event: SelectChangeEvent<string>) => {
        onLocationSelect(event.target.value);
    };

    const barContent = (
        <Box sx={{
            display: "flex", alignItems: "center", gap: 1,
            maxWidth: { xs: "100%", sm: 800, md: 900 }, mx: "auto",
        }}>
            <TextField
                size="small"
                placeholder="Search or command..."
                slotProps={{
                    input: {
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" sx={{ color: "primary.main" }} />
                            </InputAdornment>
                        ),
                    },
                }}
                sx={{ flex: 1, minWidth: "60%", maxWidth: { xs: "100%", sm: 400 } }}
            />
            {locations.length > 1 && (
                <FormControl size="small" sx={{ minWidth: 0, flex: 1 }}>
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
    );

    return (
        <>
            {/* Sticky box: always renders bar content to maintain consistent height,
                hidden visually when fixed to avoid layout shift during smooth scroll */}
            <Box ref={stickyBoxRef} sx={{ mb: 2, visibility: isFixed ? "hidden" : "visible" }}>
                {barContent}
            </Box>
            {/* Fixed bar: rendered when scrolled past threshold */}
            {isFixed && (
                <Box sx={{
                    position: "fixed",
                    top: APP_BAR_HEIGHT,
                    width: fixedWidth,
                    zIndex: theme.zIndex.appBar - 1,
                    bgcolor: "background.default",
                    py: 1,
                    boxShadow: 1,
                }}>
                    {barContent}
                </Box>
            )}
        </>
    );
};
