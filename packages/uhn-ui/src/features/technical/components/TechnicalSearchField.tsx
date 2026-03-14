import ClearIcon from "@mui/icons-material/Clear";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import SearchIcon from "@mui/icons-material/Search";
import { alpha, Autocomplete, Box, Chip, IconButton, InputAdornment, TextField, Typography, useTheme } from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useEffect, useRef } from "react";
import { APP_BAR_HEIGHT } from "../../location/locationConstants";
import { useStickyOnScroll } from "../../shared/useStickyOnScroll";
import { useSearchHistory } from "../hooks/useSearchHistory";

type TechnicalSearchFieldProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    filteredCount: number;
    totalCount: number;
    /** Label for the deep-linked item (shown as a clickable chip to scroll back). */
    deepLinkLabel?: string;
    /** Callback to scroll back to the deep-linked tile. */
    onScrollToHighlightedTile?: () => void;
    /** localStorage key for search history. */
    historyKey: string;
    /** Extra content rendered to the right of the search field (e.g. mobile resource button). */
    rightContent?: React.ReactNode;
};

export const TechnicalSearchField: React.FC<TechnicalSearchFieldProps> = ({
    value,
    onChange,
    placeholder = "Filter...",
    filteredCount,
    totalCount,
    deepLinkLabel,
    onScrollToHighlightedTile,
    historyKey,
    rightContent,
}) => {
    const theme = useTheme();
    const portalContainer = usePortalContainerRef();
    const { stickyBoxRef, isFixed, fixedWidth } = useStickyOnScroll(APP_BAR_HEIGHT);
    const isFiltering = value.trim().length > 0;
    const hadFocusRef = useRef(false);
    const inFlowInputRef = useRef<HTMLInputElement>(null);
    const fixedInputRef = useRef<HTMLInputElement>(null);

    const { history, commit, remove } = useSearchHistory(historyKey, value);

    // When isFixed toggles, restore focus to the newly visible input
    useEffect(() => {
        if (!hadFocusRef.current) return;
        const target = isFixed ? fixedInputRef.current : inFlowInputRef.current;
        target?.focus();
    }, [isFixed]);

    const handleFocus = () => { hadFocusRef.current = true; };
    const handleBlur = () => {
        // Delay so the isFixed useEffect can read hadFocusRef before it's cleared.
        // When isFixed toggles, the unmounting input fires blur synchronously,
        // but the useEffect needs to know focus was active to restore it.
        requestAnimationFrame(() => {
            if (document.activeElement !== inFlowInputRef.current &&
                document.activeElement !== fixedInputRef.current) {
                hadFocusRef.current = false;
            }
        });
    };

    const containerSx = {
        display: "flex", alignItems: "center", gap: 1,
        maxWidth: { xs: "100%", sm: 800, md: 900 }, mx: "auto",
    };

    const hasDeepLink = !!deepLinkLabel && !!onScrollToHighlightedTile;

    const textFieldSx = { maxWidth: { xs: "100%", sm: 500, md: 600 }, minWidth: 0 };

    const counter = isFiltering && (
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
            {filteredCount} of {totalCount}
        </Typography>
    );

    const deepLinkChip = hasDeepLink && (
        <>
            {/* Icon-only on xs, full chip on sm+ */}
            <IconButton
                size="small"
                onClick={onScrollToHighlightedTile}
                sx={{
                    display: { xs: "inline-flex", sm: "none" },
                    ml: "auto",
                    color: "primary.main",
                    "&:hover": { bgcolor: "action.hover" },
                }}
            >
                <MyLocationIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <Chip
                icon={<MyLocationIcon sx={{ fontSize: 16 }} />}
                label={deepLinkLabel}
                size="small"
                variant="outlined"
                onClick={onScrollToHighlightedTile}
                sx={{
                    display: { xs: "none", sm: "inline-flex" },
                    cursor: "pointer",
                    ml: "auto",
                    "& .MuiChip-label": {
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    },
                }}
            />
        </>
    );

    const renderSearchInput = (ref: React.Ref<HTMLInputElement>) => (
        <Autocomplete
            freeSolo
            fullWidth
            size="small"
            options={history}
            inputValue={value}
            onInputChange={(_, v, reason) => {
                onChange(v);
                if (reason === "reset" && v) commit(v);
            }}
            onChange={(_, v) => {
                if (typeof v === "string") {
                    onChange(v);
                    commit(v);
                }
            }}
            clearOnBlur={false}
            onClose={() => { commit(value); }}
            renderOption={(props, option) => (
                <li {...props} key={option}>
                    <Box sx={{ display: "flex", alignItems: "center", width: "100%", gap: 1 }}>
                        <Typography variant="body2" sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {option}
                        </Typography>
                        <IconButton
                            size="small"
                            onClick={(e) => { e.stopPropagation(); remove(option); }}
                            sx={{ p: 0.25, flexShrink: 0, color: "action.disabled", "&:hover": { color: "text.secondary" } }}
                        >
                            <ClearIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                    </Box>
                </li>
            )}
            slotProps={{
                popper: { container: portalContainer.current },
                paper: { sx: { bgcolor: (t) => alpha(t.palette.background.paper, 0.6), backgroundImage: "none", boxShadow: "none" } },
            }}
            sx={{
                ...textFieldSx,
                "& .MuiAutocomplete-popupIndicator": { display: "none" },
                "& .MuiAutocomplete-clearIndicator": { color: "text.secondary" },
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    inputRef={ref}
                    placeholder={placeholder}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") commit(value);
                    }}
                    slotProps={{
                        input: {
                            ...params.InputProps,
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                                </InputAdornment>
                            ),
                        },
                    }}
                />
            )}
        />
    );

    return (
        <>
            <Box ref={stickyBoxRef} sx={{ mt: 2, mb: 2, visibility: isFixed ? "hidden" : "visible" }}>
                <Box sx={containerSx}>
                    {renderSearchInput(inFlowInputRef)}
                    {counter}
                    {deepLinkChip}
                    {rightContent}
                </Box>
            </Box>
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
                    <Box sx={containerSx}>
                        {renderSearchInput(fixedInputRef)}
                        {counter}
                        {deepLinkChip}
                        {rightContent}
                    </Box>
                </Box>
            )}
        </>
    );
};
