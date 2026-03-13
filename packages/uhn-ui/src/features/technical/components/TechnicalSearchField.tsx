import ClearIcon from "@mui/icons-material/Clear";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import SearchIcon from "@mui/icons-material/Search";
import { Box, Chip, IconButton, InputAdornment, TextField, Typography, useTheme } from "@mui/material";
import React, { useEffect, useRef } from "react";
import { APP_BAR_HEIGHT } from "../../location/locationConstants";
import { useStickyOnScroll } from "../../shared/useStickyOnScroll";

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
};

export const TechnicalSearchField: React.FC<TechnicalSearchFieldProps> = ({
    value,
    onChange,
    placeholder = "Filter...",
    filteredCount,
    totalCount,
    deepLinkLabel,
    onScrollToHighlightedTile,
}) => {
    const theme = useTheme();
    const { stickyBoxRef, isFixed, fixedWidth } = useStickyOnScroll(APP_BAR_HEIGHT);
    const isFiltering = value.trim().length > 0;
    const hadFocusRef = useRef(false);
    const inFlowInputRef = useRef<HTMLInputElement>(null);
    const fixedInputRef = useRef<HTMLInputElement>(null);

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

    const inputSlotProps = {
        startAdornment: (
            <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 20, color: "text.secondary" }} />
            </InputAdornment>
        ),
        endAdornment: isFiltering ? (
            <InputAdornment position="end">
                <IconButton size="small" onClick={() => onChange("")} sx={{ p: 0.5 }}>
                    <ClearIcon sx={{ fontSize: 18 }} />
                </IconButton>
            </InputAdornment>
        ) : undefined,
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

    return (
        <>
            <Box ref={stickyBoxRef} sx={{ mt: 2, mb: 2, visibility: isFixed ? "hidden" : "visible" }}>
                <Box sx={containerSx}>
                    <TextField
                        inputRef={inFlowInputRef}
                        size="small"
                        fullWidth
                        placeholder={placeholder}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        sx={textFieldSx}
                        slotProps={{ input: inputSlotProps }}
                    />
                    {counter}
                    {deepLinkChip}
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
                        <TextField
                            inputRef={fixedInputRef}
                            size="small"
                            fullWidth
                            placeholder={placeholder}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            onFocus={handleFocus}
                            onBlur={handleBlur}
                            sx={textFieldSx}
                            slotProps={{ input: inputSlotProps }}
                        />
                        {counter}
                        {deepLinkChip}
                    </Box>
                </Box>
            )}
        </>
    );
};
