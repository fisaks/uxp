import CheckIcon from "@mui/icons-material/Check";
import ClearIcon from "@mui/icons-material/Clear";
import CloseIcon from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import SearchIcon from "@mui/icons-material/Search";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import {
    Autocomplete,
    AutocompleteRenderGroupParams,
    Box,
    CircularProgress,
    IconButton,
    InputAdornment,
    keyframes,
    ListSubheader,
    TextField,
    Typography,
    useTheme,
} from "@mui/material";
import { SxProps, Theme } from "@mui/material/styles";
import { selectCurrentUser, TooltipIconButton, usePortalContainerRef } from "@uxp/ui-lib";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useFetchFavoritesQuery } from "../favorite/favorite.api";
import { getBlueprintIcon } from "../view/blueprintIconMap";
import { selectCommandPaletteItems } from "./commandPaletteSelectors";
import { navigationItems, quickActionItems } from "./commandPaletteNavigationItems";
import { useCommandPaletteFilter } from "./useCommandPaletteFilter";
import { useCommandPaletteActions } from "./useCommandPaletteActions";
import { AnalogSliderPopup } from "./AnalogSliderPopup";
import { AnalogPopupState, AnalogValueVoiceHandlers, PaletteGroup, PaletteItem, QuickActionId } from "./commandPalette.types";
import { useVoiceCommandFlow } from "./useVoiceCommandFlow";
import { parseBareCommand, resolveHighlightedAction, useVoiceCommandResolver, VoiceCommandMatch } from "./useVoiceCommandResolver";

const micPulse = keyframes`
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
`;

/** How long the voice-highlighted item stays active for bare follow-up commands. */
const VOICE_HIGHLIGHT_SECONDS = 10;

type CommandPaletteAutocompleteProps = {
    /** Called when the user selects a location entry — scrolls to that section on the home page. */
    onLocationSelect?: (locationId: string) => void;
    /** Called when the search term should be applied as a grid filter (Enter key or "Filter:" entry).
     *  When `exact` is true, the grid uses exact substring matching instead of fuzzy — used by
     *  voice "filter" commands since speech recognition produces real words, not typos. */
    onSearchTermChange?: (term: string, exact?: boolean) => void;
    /** Called when a specific item should be highlighted and scrolled into view within its location. */
    onHighlightItem?: (itemKey: string, locationId: string, durationMs?: number) => void;
    /** Notifies the parent when the input gains or loses focus (used to hide the location selector on mobile). */
    onFocusChange?: (focused: boolean) => void;
    /** Called when a quick action (e.g. expand/collapse all) is selected. */
    onQuickAction?: (action: QuickActionId) => void;
    /** Called when a location should be expanded. */
    onExpandLocation?: (locationId: string) => void;
    /** Called when a location should be collapsed. */
    onCollapseLocation?: (locationId: string) => void;
    /** Called when the palette should close (Escape, navigation to home, etc.). */
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
    onLocationSelect, onSearchTermChange, onHighlightItem, onQuickAction, onExpandLocation, onCollapseLocation, onFocusChange, onClose, autoFocus, filterTerm, sx,
}) => {
    const theme = useTheme();
    const portalContainer = usePortalContainerRef();
    const inputRef = useRef<HTMLInputElement>(null);
    const clearButtonRef = useRef<HTMLButtonElement>(null);
    const endAdornmentRef = useRef<HTMLDivElement>(null);

    const [inputValue, setInputValue] = useState(filterTerm ?? "");
    const [autocompleteOpen, setAutocompleteOpen] = useState(false);

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

    // Tracks the last item highlighted by a voice "locate" command.
    // When set, bare follow-up commands ("tap", "on", "set 50") act on this item.
    const voiceHighlightedRef = useRef<{ kind: string; refId: string } | null>(null);
    const voiceHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [highlightCountdown, setHighlightCountdown] = useState(0);
    const [highlightedItemName, setHighlightedItemName] = useState("");
    const highlightCountdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    /** Tracks whether voice is currently in use (phase !== "idle"). Read when opening
     *  the analog popup to snapshot the voice state into the popup's props. */
    const voiceActiveRef = useRef(false);
    // Shared ref: useAnalogValueVoiceControl writes handlers here while the popup is open;
    // the single SpeechRecognition in useVoiceCommandFlow reads it to redirect results.
    const analogValueVoiceControlRef = useRef<AnalogValueVoiceHandlers | null>(null);
    const [analogPopup, setAnalogPopup] = useState<AnalogPopupState>({
        open: false, voiceActive: false, resourceId: "", min: 0, max: 100, step: 1, label: "",
    });
    const handleAnalogInputNeeded = useCallback((state: Omit<AnalogPopupState, "open" | "voiceActive">) => {
        setAnalogPopup({ ...state, open: true, voiceActive: voiceActiveRef.current });
    }, []);

    const handleAnalogPopupClose = useCallback(() => {
        setAnalogPopup(prev => ({ ...prev, open: false }));
    }, []);

    // Wrap onHighlightItem to extend the blue ring duration during voice mode
    const handleHighlightItem = useCallback((itemKey: string, locationId: string, durationMs?: number) => {
        onHighlightItem?.(itemKey, locationId, durationMs ?? (voiceActiveRef.current ? VOICE_HIGHLIGHT_SECONDS * 1000 : undefined));
    }, [onHighlightItem]);

    // Action executor
    const execute = useCommandPaletteActions({
        onLocationSelect,
        onAnalogInputNeeded: handleAnalogInputNeeded,
        onHighlightItem: handleHighlightItem,
        onQuickAction,
        onExpandLocation,
        onCollapseLocation,
    });

    // Keep filtered items in a ref so the voice confirm callback can read the current top match
    const filteredItemsRef = useRef(filteredItems);
    filteredItemsRef.current = filteredItems;

    // Ref to the top resolved voice item — read by the voice flow for conditional confirmation
    const voiceMatchedCmdRef = useRef<VoiceCommandMatch | null>(null);

    const clearHighlightCountdown = useCallback(() => {
        if (highlightCountdownTimerRef.current) {
            clearInterval(highlightCountdownTimerRef.current);
            highlightCountdownTimerRef.current = null;
        }
        setHighlightCountdown(0);
        setHighlightedItemName("");
    }, []);

    /** Set the voice-highlighted item ref with auto-clear and visible countdown. */
    const setVoiceHighlighted = useCallback((kind: string, refId: string, itemName?: string) => {
        voiceHighlightedRef.current = { kind, refId };
        if (voiceHighlightTimerRef.current) clearTimeout(voiceHighlightTimerRef.current);
        if (highlightCountdownTimerRef.current) clearInterval(highlightCountdownTimerRef.current);

        voiceHighlightTimerRef.current = setTimeout(() => {
            voiceHighlightedRef.current = null;
            voiceHighlightTimerRef.current = null;
            clearHighlightCountdown();
        }, VOICE_HIGHLIGHT_SECONDS * 1000);

        if (itemName) setHighlightedItemName(itemName);
        setHighlightCountdown(VOICE_HIGHLIGHT_SECONDS);
        highlightCountdownTimerRef.current = setInterval(() => {
            setHighlightCountdown(prev => {
                if (prev <= 1) {
                    if (highlightCountdownTimerRef.current) {
                        clearInterval(highlightCountdownTimerRef.current);
                        highlightCountdownTimerRef.current = null;
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, [clearHighlightCountdown]);

    // Voice command flow: listen → confirm/cancel → execute top match.
    // Uses a single SpeechRecognition — results are redirected to the analog
    // popup via analogValueVoiceControlRef when it's open with voice enabled.
    const voice = useVoiceCommandFlow({
        setInputValue,
        userName: user ? `${user.firstName} ${user.lastName}`.trim() : undefined,
        analogValueVoiceControlRef,
        voiceMatchedCmdRef,
        onConfirm: () => {
            const resolved = voiceMatchedCmdRef.current;
            if (resolved && !resolved.isNoOp) {
                execute(resolved);
                // Track highlighted item for bare command follow-up
                if (resolved.action.type === "scroll-to-item") {
                    console.debug("[voice] setting highlight:", resolved.action.itemRef.kind, resolved.action.itemRef.refId);
                    setVoiceHighlighted(resolved.action.itemRef.kind, resolved.action.itemRef.refId, resolved.label);
                }

                // Navigate actions: close the dialog (which also stops voice via unmount cleanup).
                // Other navigate-like actions (scroll-to-location, scroll-to-item, filter-grid,
                // quick-action) already close via CommandPaletteDialog's own callbacks.
                if (resolved.action.type === "navigate") {
                    onClose?.();
                }
            }
            // No text-filtered fallback — voice mode must use the voice resolver's
            // output to get intent-aware actions (idempotent on/off, set N, etc.).
            // The text-filtered items have state-based toggle actions that would
            // do the wrong thing (e.g. "Turn off" when the user said "on").
            setInputValue("");
            onSearchTermChange?.("");
        },
        onCancel: () => {
            setInputValue("");
            onSearchTermChange?.("");
        },
        onFilter: (term) => {
            setInputValue(term);
            onSearchTermChange?.(term, true);
            setAutocompleteOpen(false);
            inputRef.current?.blur();
        },
        onBareCommand: (transcript) => {
            const highlighted = voiceHighlightedRef.current;
            console.debug("[voice] onBareCommand:", JSON.stringify(transcript), "highlighted:", highlighted);
            if (!highlighted) return false;

            const bareCmd = parseBareCommand(transcript);
            console.debug("[voice] parseBareCommand:", bareCmd);
            if (!bareCmd) return false;

            const resolved = resolveHighlightedAction(bareCmd, highlighted.kind, highlighted.refId, allItems);
            console.debug("[voice] resolveHighlightedAction:", resolved?.confirmLabel, resolved?.action.type, resolved?.isNoOp);
            if (!resolved) return false;

            if (resolved.isNoOp) {
                // Set voiceMatchedCmdRef so the noop UI shows the correct label
                voiceMatchedCmdRef.current = resolved;
                return "noop";
            }

            execute(resolved);
            return "executed";
        },
    });

    // Clear the voice-highlighted item when returning to idle.
    useEffect(() => {
        if (voice.phase === "idle") {
            voiceHighlightedRef.current = null;
            if (voiceHighlightTimerRef.current) {
                clearTimeout(voiceHighlightTimerRef.current);
                voiceHighlightTimerRef.current = null;
            }
            clearHighlightCountdown();
        }
    }, [voice.phase, clearHighlightCountdown]);

    // Decide which items to show — filter entry is hidden during voice phases
    // (voice has its own "filter" keyword; showing the entry would be confusing)
    const voiceActive = voice.phase !== "idle";
    voiceActiveRef.current = voiceActive;
    // Voice command resolver: intent parsing + exact matching + action resolution
    const voiceResolverTranscript = voiceActive ? inputValue : "";
    const { resolvedItems: voiceResolvedItems } = useVoiceCommandResolver(voiceResolverTranscript, allItems);
    // Update voiceMatchedCmdRef with the top voice-resolved item (for conditional confirmation)
    voiceMatchedCmdRef.current = voiceResolvedItems.length > 0 ? voiceResolvedItems[0] : null;
    const displayItems = useMemo(() => {
        if (inputValue.trim()) {
            if (voiceActive) {
                // Voice mode: use resolved items with voice labels
                return [...voiceResolvedItems].sort(sortByGroup) as PaletteItem[];
            }
            const sorted = [...filteredItems].sort(sortByGroup);
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
    }, [inputValue, filteredItems, favoriteItems, voiceActive, voiceResolvedItems]);

    const handleInputChange = useCallback((_event: React.SyntheticEvent, value: string, reason: string) => {
        // After selecting an option, MUI fires onInputChange with reason "reset"
        // and the selected option's label — ignore it so the input stays cleared.
        if (reason === "reset") return;
        setInputValue(value);
        // Clear grid filter when the user clears the input
        if (!value.trim()) onSearchTermChange?.("");
    }, [onSearchTermChange]);

    const handleAutocompleteSelect = useCallback((_event: React.SyntheticEvent, value: string | PaletteItem) => {
        if (typeof value === "string") {
            // freeSolo Enter — apply as grid filter
            const term = value.trim();
            if (term) {
                onSearchTermChange?.(term);
                setAutocompleteOpen(false);
                inputRef.current?.blur();
            }
            return;
        }

        if (value.action.type === "filter-grid") {
            // Apply grid filter, keep raw term in input (not the "Filter: ..." label), close dropdown
            setInputValue(value.action.term);
            onSearchTermChange?.(value.action.term);
            setAutocompleteOpen(false);
            inputRef.current?.blur();
            return;
        }

        // All other actions: execute, clear input, clear grid filter
        execute(value);
        setInputValue("");
        onSearchTermChange?.("");
        // Close dialog when navigating to home — the home page has its own
        // inline command palette so the dialog would be redundant.
        if (value.action.type === "navigate" && !value.action.to.startsWith("/technical")) {
            onClose?.();
        }
        inputRef.current?.blur();
    }, [execute, onSearchTermChange, onClose]);

    const handleAutocompleteOpen = useCallback(() => {
        // Delay by one frame so the layout settles first (e.g., Select hiding on mobile).
        // This ensures the Popper measures the correct input width.
        requestAnimationFrame(() => setAutocompleteOpen(true));
    }, []);
    const handleAutocompleteClose = useCallback(() => {
        setAutocompleteOpen(false);
    }, []);

    const handleInputClear = useCallback(() => {
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
                if (event.key === "Escape" && autocompleteOpen) {
                    setAutocompleteOpen(false);
                    event.stopPropagation();
                    return;
                }
                if (event.key === "Tab") {
                    // Focus the first available button in the end adornment (clear button
                    // when there's text, mic/speaker when empty) instead of leaving the palette.
                    const target = inputValue
                        ? clearButtonRef.current
                        : endAdornmentRef.current?.querySelector<HTMLButtonElement>("button");
                    if (target) {
                        event.preventDefault();
                        event.stopPropagation();
                        target.focus();
                        return;
                    }
                }
                muiOnKeyDown?.(event);
            },
        [autocompleteOpen, inputValue],
    );

    return (
        <>
            <Box sx={{ position: "relative", ...((sx ?? {}) as Record<string, unknown>) }}>
            {/* Voice hint bar — floats above the input, does not affect layout */}
            {voiceActive && (
                <Box sx={{
                    position: "absolute",
                    left: 0, right: 0,
                    bottom: "100%",
                    mb: 0.5,
                    display: "flex", alignItems: "baseline", justifyContent: "center", gap: 1, flexWrap: "wrap",
                    pointerEvents: "none",
                }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                        {voice.phase === "noop"
                            ? (voiceMatchedCmdRef.current?.confirmLabel ?? "Already in that state")
                            : voice.phase === "listening" && highlightCountdown > 0
                                ? `${highlightedItemName} — "on" · "off" · "set 50" (${highlightCountdown}s)`
                                : voice.phase === "listening"
                                    ? '"light on" · "set dimmer 50" · "filter ..." · "stop"'
                                    : '"yes" · "no" · "stop"'}
                    </Typography>
                    {voice.lastHeard && voice.phase !== "noop" && (
                        <Typography variant="caption" sx={{ fontSize: "0.75rem", fontStyle: "italic" }}>
                            {`Heard: "${voice.lastHeard}"`}
                        </Typography>
                    )}
                </Box>
            )}
            <Autocomplete<PaletteItem, false, true, true>
                freeSolo
                disableClearable
                openOnFocus
                // Controlled value prevents MUI from storing the selected option
                // and reconciling the input with its label on next interaction.
                value=""
                open={displayItems.length > 0 && (voiceActive ? voice.showMatchesInDropdown : autocompleteOpen)}
                onOpen={handleAutocompleteOpen}
                onClose={handleAutocompleteClose}
                inputValue={inputValue}
                onInputChange={handleInputChange}
                onChange={handleAutocompleteSelect}
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
                    const voiceItem = voiceActive ? (option as VoiceCommandMatch) : undefined;
                    const displayLabel = voiceItem?.confirmLabel ?? option.label;
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
                                    <Typography variant="body2" noWrap sx={voiceItem?.isNoOp ? { fontStyle: "italic", color: "text.secondary" } : undefined}>{displayLabel}</Typography>
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
                                readOnly: voice.phase !== "idle",
                                onKeyDown: makeInputKeyDown(params.inputProps?.onKeyDown as React.KeyboardEventHandler<HTMLInputElement> | undefined),
                            },
                            input: {
                                ...params.InputProps,
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" sx={{ color: "primary.main" }} />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <Box ref={endAdornmentRef} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                            {/* Voice confirmation phase: confirm + cancel + countdown */}
                                            {voice.phase === "confirming" && (
                                                <>
                                                    <TooltipIconButton size="small" onClick={voice.confirm} tooltip="Confirm (or say 'yes')" tooltipPortal={portalContainer} sx={{ color: "success.main" }}>
                                                        <CheckIcon fontSize="small" />
                                                    </TooltipIconButton>
                                                    <TooltipIconButton size="small" onClick={voice.cancel} tooltip="Cancel (or say 'no')" tooltipPortal={portalContainer} sx={{ color: "error.main" }}>
                                                        <CloseIcon fontSize="small" />
                                                    </TooltipIconButton>
                                                    <Box sx={{ position: "relative", display: "inline-flex", width: 24, height: 24 }}>
                                                        <CircularProgress
                                                            variant="determinate"
                                                            value={(voice.confirmTimeLeft / voice.confirmTimeDuration) * 100}
                                                            size={24}
                                                            thickness={4}
                                                            sx={{ color: "warning.main" }}
                                                        />
                                                        <Box sx={{
                                                            position: "absolute", inset: 0,
                                                            display: "flex", alignItems: "center", justifyContent: "center",
                                                        }}>
                                                            <Typography variant="caption" sx={{ fontSize: "0.65rem", fontWeight: 700, lineHeight: 1 }}>
                                                                {voice.confirmTimeLeft}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </>
                                            )}
                                            {/* Mic button: visible when supported and not in confirming/noop phase */}
                                            {voice.supported && voice.phase !== "confirming" && voice.phase !== "noop" && (
                                                <>
                                                    <TooltipIconButton
                                                        size="small"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={voice.toggleSpeaker}
                                                        tooltip={voice.speakerEnabled ? "Disable voice readout" : "Enable voice readout"}
                                                        tooltipPortal={portalContainer}
                                                        sx={{ color: voice.speakerEnabled ? "primary.main" : "action.disabled" }}
                                                    >
                                                        {voice.speakerEnabled ? <VolumeUpIcon fontSize="small" /> : <VolumeOffIcon fontSize="small" />}
                                                    </TooltipIconButton>
                                                    <TooltipIconButton
                                                        size="small"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={voice.toggleMic}
                                                        tooltip={voice.phase === "listening" ? "Stop listening" : "Voice input"}
                                                        tooltipPortal={portalContainer}
                                                        onKeyDown={(e) => { if (e.key === "Tab") { e.preventDefault(); onClose?.(); } }}
                                                        sx={{
                                                            color: voice.error ? "action.disabled"
                                                                : voice.phase === "listening" ? "error.main"
                                                                : "primary.main",
                                                            ...(voice.phase === "listening" && {
                                                                animation: `${micPulse} 1.5s ease-in-out infinite`,
                                                            }),
                                                        }}
                                                    >
                                                        {voice.error ? <MicOffIcon fontSize="small" /> : <MicIcon fontSize="small" />}
                                                    </TooltipIconButton>
                                                </>
                                            )}
                                            {/* Clear button: visible when input has text and voice is idle */}
                                            {inputValue && voice.phase === "idle" && (
                                                <IconButton
                                                    ref={clearButtonRef}
                                                    size="small" onClick={handleInputClear} edge="end" aria-label="Clear"
                                                    sx={{ color: "primary.main" }}
                                                    onKeyDown={(e) => { if (e.key === "Tab") { e.preventDefault(); onClose?.(); } }}
                                                >
                                                    <ClearIcon fontSize="small" />
                                                </IconButton>
                                            )}
                                        </Box>
                                    </InputAdornment>
                                ),
                            },
                        }}
                    />
                )}
            />
            </Box>
            <AnalogSliderPopup
                open={analogPopup.open}
                onClose={handleAnalogPopupClose}
                label={analogPopup.label}
                min={analogPopup.min}
                max={analogPopup.max}
                step={analogPopup.step}
                unit={analogPopup.unit}
                defaultOnValue={analogPopup.defaultOnValue}
                resourceId={analogPopup.resourceId}
                voiceActive={analogPopup.voiceActive}
                speakerEnabled={voice.speakerEnabled}
                analogValueVoiceControlRef={analogValueVoiceControlRef}
            />
        </>
    );
};
