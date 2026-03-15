import ClearIcon from "@mui/icons-material/Clear";
import FilterListIcon from "@mui/icons-material/FilterList";
import SearchIcon from "@mui/icons-material/Search";
import {
    Autocomplete,
    AutocompleteRenderGroupParams,
    Box,
    IconButton,
    InputAdornment,
    ListSubheader,
    TextField,
    Typography,
    useTheme,
} from "@mui/material";
import { SxProps, Theme } from "@mui/material/styles";
import { selectCurrentUser, usePortalContainerRef } from "@uxp/ui-lib";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useFetchFavoritesQuery } from "../favorite/favorite.api";
import { getBlueprintIcon } from "../view/blueprintIconMap";
import { selectCommandPaletteItems } from "./commandPaletteSelectors";
import { navigationItems, quickActionItems } from "./commandPaletteNavigationItems";
import { useCommandPaletteFilter } from "./useCommandPaletteFilter";
import { AnalogPopupState, useCommandPaletteActions } from "./useCommandPaletteActions";
import { AnalogSliderPopup } from "./AnalogSliderPopup";
import { PaletteGroup, PaletteItem, QuickActionId } from "./commandPalette.types";

type CommandPaletteAutocompleteProps = {
    /** Called when the user selects a location entry — scrolls to that section on the home page. */
    onLocationSelect?: (locationId: string) => void;
    /** Called when the search term should be applied as a grid filter (Enter key or "Filter:" entry). */
    onSearchTermChange?: (term: string) => void;
    /** Called when a specific item should be highlighted and scrolled into view within its location. */
    onHighlightItem?: (itemKey: string, locationId: string) => void;
    /** Notifies the parent when the input gains or loses focus (used to hide the location selector on mobile). */
    onFocusChange?: (focused: boolean) => void;
    /** Called when a quick action (e.g. expand/collapse all) is selected. */
    onQuickAction?: (action: QuickActionId) => void;
    /** Called when the palette should close (blur without action, Escape in dialog mode). */
    onClose?: () => void;
    /** Focus the input immediately on mount (used in dialog mode). */
    autoFocus?: boolean;
    /** External filter term to sync into the input (e.g. from URL search params). */
    filterTerm?: string;
    sx?: SxProps<Theme>;
};

const groupOrder: PaletteGroup[] = ["Filter", "Locations", "Items", "Actions", "Quick Actions", "Navigation"];

function sortByGroup(a: PaletteItem, b: PaletteItem): number {
    return groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group);
}

export const CommandPaletteAutocomplete: React.FC<CommandPaletteAutocompleteProps> = ({
    onLocationSelect, onSearchTermChange, onHighlightItem, onQuickAction, onFocusChange, onClose, autoFocus, filterTerm, sx,
}) => {
    const theme = useTheme();
    const portalContainer = usePortalContainerRef();
    const inputRef = useRef<HTMLInputElement>(null);
    const clearButtonRef = useRef<HTMLButtonElement>(null);

    const [inputValue, setInputValue] = useState(filterTerm ?? "");
    const [open, setOpen] = useState(false);

    // Sync external filter term into the input (e.g. navigated from another page with ?filter=).
    // Uses an effect so the update happens after MUI Autocomplete has committed its render.
    // The intermediate const coalesces undefined → "" so React's dependency comparison sees
    // a stable primitive and the effect only re-runs when the actual value changes.
    const filterTermForEffect = filterTerm ?? "";
    useEffect(() => {
        setInputValue(filterTermForEffect);
    }, [filterTermForEffect]);

    // Selectors
    const allPaletteItems = useSelector(selectCommandPaletteItems);
    const user = useSelector(selectCurrentUser);
    const isAdmin = user?.roles.includes("admin");

    // Favorites for empty query
    const { data: favorites } = useFetchFavoritesQuery();

    // Combine all items with navigation (admin only) and quick actions (all users)
    const allItems = useMemo(() => {
        const items = [...allPaletteItems, ...quickActionItems];
        if (isAdmin) items.push(...navigationItems);
        return items;
    }, [allPaletteItems, isAdmin]);

    // Filter items based on search term
    const { filteredItems } = useCommandPaletteFilter(inputValue, allItems);

    // When the input is empty, show actions for favorited items as quick-access suggestions.
    const favoriteItems = useMemo((): PaletteItem[] => {
        if (!favorites?.length) return [];
        const favItems: PaletteItem[] = [];
        const favRefIds = new Set(favorites.map(f => f.itemRefId));

        // Find palette action items that match favorites
        for (const item of allPaletteItems) {
            if (item.group !== "Actions") continue;
            // Check if this action's ID contains a favorite refId
            const actionId = item.id;
            for (const refId of favRefIds) {
                if (actionId.includes(refId)) {
                    favItems.push(item);
                    break;
                }
            }
        }
        return favItems;
    }, [favorites, allPaletteItems]);

    // Decide which items to show
    const displayItems = useMemo(() => {
        if (inputValue.trim()) {
            const sorted = [...filteredItems].sort(sortByGroup);
            // Prepend a "Filter" group entry so the user can apply grid filtering explicitly
            const filterEntry: PaletteItem = {
                id: `filter:${inputValue.trim()}`,
                label: `Filter: ${inputValue.trim()}`,
                group: "Filter",
                searchText: "",
                action: { type: "filter-grid", term: inputValue.trim() },
            };
            return [filterEntry, ...sorted];
        }
        // Empty query: show favorite actions
        return favoriteItems;
    }, [inputValue, filteredItems, favoriteItems]);

    // When true, prevents onClose from propagating to the parent dialog.
    // Set during analog popup display and Tab-to-clear-button focus shifts,
    // where MUI fires close events (blur/selectOption) that should not dismiss the dialog.
    const suppressCloseRef = useRef(false);
    const [analogPopup, setAnalogPopup] = useState<AnalogPopupState & { open: boolean }>({
        open: false, resourceId: "", min: 0, max: 100, step: 1, label: "",
    });
    const handleAnalogInputNeeded = useCallback((state: Omit<AnalogPopupState, "open">) => {
        setAnalogPopup({ ...state, open: true });
    }, []);

    const handleAnalogPopupClose = useCallback(() => {
        setAnalogPopup(prev => ({ ...prev, open: false }));
        suppressCloseRef.current = false;
        onClose?.();
    }, [onClose]);

    // Action executor
    const execute = useCommandPaletteActions({
        onLocationSelect,
        onAnalogInputNeeded: handleAnalogInputNeeded,
        onHighlightItem,
        onQuickAction,
    });

    const handleInputChange = useCallback((_event: React.SyntheticEvent, value: string, reason: string) => {
        // After selecting an option, MUI fires onInputChange with reason "reset"
        // and the selected option's label — ignore it so the input stays cleared.
        if (reason === "reset") return;
        setInputValue(value);
        // Clear grid filter when the user clears the input
        if (!value.trim()) onSearchTermChange?.("");
    }, [onSearchTermChange]);

    const handleChange = useCallback((_event: React.SyntheticEvent, value: string | PaletteItem) => {
        if (typeof value === "string") {
            // freeSolo Enter — apply as grid filter
            const term = value.trim();
            if (term) {
                onSearchTermChange?.(term);
                setOpen(false);
                inputRef.current?.blur();
            }
            return;
        }

        if (value.action.type === "filter-grid") {
            // Apply grid filter, keep raw term in input (not the "Filter: ..." label), close dropdown
            setInputValue(value.action.term);
            onSearchTermChange?.(value.action.term);
            setOpen(false);
            inputRef.current?.blur();
            return;
        }

        // All other actions: execute, clear input, clear grid filter
        execute(value);
        setInputValue("");
        onSearchTermChange?.("");
        if (value.action.type === "open-analog-popup") {
            // Suppress onClose propagation so the dialog (on technical pages) stays
            // open while the analog slider popup is shown.  The flag stays set until
            // the analog popup closes — MUI fires multiple close events (blur +
            // selectOption) and all of them must be suppressed.
            suppressCloseRef.current = true;
        }
        inputRef.current?.blur();
    }, [execute, onSearchTermChange]);

    const handleOpen = useCallback(() => {
        // Delay by one frame so the layout settles first (e.g., Select hiding on mobile).
        // This ensures the Popper measures the correct input width.
        requestAnimationFrame(() => setOpen(true));
    }, []);
    const handleClose = useCallback(() => {
        setOpen(false);
        if (suppressCloseRef.current) return;
        onClose?.();
    }, [onClose]);

    const handleClear = useCallback(() => {
        setInputValue("");
        onSearchTermChange?.("");
        inputRef.current?.focus();
    }, [onSearchTermChange]);

    // Wraps MUI Autocomplete's inputProps.onKeyDown so we can intercept Tab/Escape
    // *before* MUI processes them (MUI's handler would close the popup and select
    // the highlighted option on Tab, which propagates onClose to the dialog).
    const makeInputKeyDown = useCallback(
        (muiOnKeyDown?: React.KeyboardEventHandler<HTMLInputElement>) =>
            (event: React.KeyboardEvent<HTMLInputElement>) => {
                if (event.key === "Escape" && open) {
                    setOpen(false);
                    event.stopPropagation();
                    return;
                }
                if (event.key === "Tab" && inputValue) {
                    // Prevent default Tab + stop bubbling to MUI's root-level handler
                    // (Autocomplete has handlers on both the input and its wrapper).
                    // Manually focus the clear button. The focus() call blurs the input
                    // which triggers handleClose — suppress it so the dialog stays open.
                    event.preventDefault();
                    event.stopPropagation();
                    suppressCloseRef.current = true;
                    clearButtonRef.current?.focus();
                    requestAnimationFrame(() => { suppressCloseRef.current = false; });
                    return;
                }
                muiOnKeyDown?.(event);
            },
        [open, inputValue],
    );

    return (
        <>
            <Autocomplete<PaletteItem, false, true, true>
                freeSolo
                disableClearable
                openOnFocus
                // Controlled value prevents MUI from storing the selected option
                // and reconciling the input with its label on next interaction.
                value=""
                open={open && displayItems.length > 0}
                onOpen={handleOpen}
                onClose={handleClose}
                inputValue={inputValue}
                onInputChange={handleInputChange}
                onChange={handleChange}
                options={displayItems}
                getOptionLabel={(option) => typeof option === "string" ? option : option.label}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                groupBy={(option) => option.group}
                filterOptions={(options) => options}
                slotProps={{
                    popper: {
                        container: portalContainer.current,
                        sx: { zIndex: theme.zIndex.modal + 1 },
                    },
                    paper: {
                        sx: { borderRadius: 2, boxShadow: 6 },
                    },
                }}
                renderGroup={(params: AutocompleteRenderGroupParams) => (
                    <li key={params.key}>
                        <ListSubheader
                            component="div"
                            sx={{
                                bgcolor: "background.paper",
                                fontWeight: 700,
                                fontSize: "0.75rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                color: "text.secondary",
                                lineHeight: 2.5,
                            }}
                        >
                            {params.group}
                        </ListSubheader>
                        <ul style={{ padding: 0 }}>{params.children}</ul>
                    </li>
                )}
                renderOption={(props, option) => {
                    const isFilter = option.group === "Filter";
                    const iconEntry = !isFilter ? getBlueprintIcon(option.icon) : undefined;
                    const Icon = isFilter
                        ? FilterListIcon
                        : option.active ? iconEntry?.active : (iconEntry?.inactive ?? iconEntry?.active);
                    const mode = theme.palette.mode;
                    const activeColor = iconEntry?.colors?.active[mode] ?? theme.palette.primary.main;
                    const surfaceColor = iconEntry?.colors?.surface[mode] ?? theme.palette.action.disabled;
                    const iconColor = isFilter ? theme.palette.primary.main
                        : option.active ? activeColor
                        // undefined = no state (locations, scenes, nav) → use colored inactive
                        // false = explicitly off → use disabled gray
                        : option.active === undefined ? surfaceColor
                        : theme.palette.action.disabled;
                    return (
                        <li {...props} key={option.id}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, width: "100%", minWidth: 0 }}>
                                {Icon && (
                                    <Icon
                                        fontSize="small"
                                        sx={{ color: iconColor, flexShrink: 0 }}
                                    />
                                )}
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography variant="body2" noWrap>{option.label}</Typography>
                                    {option.secondary && (
                                        <Typography variant="caption" color="text.secondary" noWrap>
                                            {option.secondary}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        </li>
                    );
                }}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        inputRef={inputRef}
                        size="small"
                        placeholder="Search or command..."
                        autoFocus={autoFocus}
                        onFocus={() => onFocusChange?.(true)}
                        onBlur={() => onFocusChange?.(false)}
                        slotProps={{
                            htmlInput: {
                                ...params.inputProps,
                                "data-palette-input": true,
                                onKeyDown: makeInputKeyDown(params.inputProps?.onKeyDown as React.KeyboardEventHandler<HTMLInputElement> | undefined),
                            },
                            input: {
                                ...params.InputProps,
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" sx={{ color: "primary.main" }} />
                                    </InputAdornment>
                                ),
                                endAdornment: inputValue ? (
                                    <InputAdornment position="end">
                                        <IconButton
                                            ref={clearButtonRef}
                                            size="small" onClick={handleClear} edge="end" aria-label="Clear"
                                            sx={{ color: "primary.main" }}
                                            onKeyDown={(e) => { if (e.key === "Tab") { e.preventDefault(); onClose?.(); } }}
                                        >
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ) : null,
                            },
                        }}
                    />
                )}
                sx={sx}
            />
            <AnalogSliderPopup
                open={analogPopup.open}
                onClose={handleAnalogPopupClose}
                label={analogPopup.label}
                min={analogPopup.min}
                max={analogPopup.max}
                step={analogPopup.step}
                unit={analogPopup.unit}
                resourceId={analogPopup.resourceId}
            />
        </>
    );
};
