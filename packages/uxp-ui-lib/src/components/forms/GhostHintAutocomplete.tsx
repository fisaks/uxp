import { Close } from "@mui/icons-material";
import { Autocomplete, Box, SxProps, TextField, Theme, Typography } from "@mui/material";
import React, { useMemo, useRef } from "react";
import { withErrorHandler } from "../layout/withErrorHandler";
import { AsyncIconButton } from "./AsyncIconButton";

type GhostHintAutocompleteProps = {
    options: string[];
    onInputChange: (value: string) => void;
    onRemoveHint?: (value: string) => Promise<unknown>;
    label?: string;
    value?: string;
    hintAdditionError?: boolean;
    sx: SxProps<Theme>
};

export const GhostHintAutocomplete: React.FC<GhostHintAutocompleteProps> = ({ options, onInputChange, value, label = "Field", onRemoveHint, hintAdditionError, sx }) => {
    const hint = useRef("");

    // Memoized lowercase options for case-insensitive matching
    const optionsMap = useMemo(() => {
        return options.map((original) => ({
            original,
            lower: original.toLowerCase(),
        }));
    }, [options]);

    const handleInputChange = (e: React.SyntheticEvent, value: string) => {
        console.log("handleInputChange", value);

        const match = optionsMap.find((opt) =>
            opt.lower.startsWith(value.toLowerCase())
        );
        hint.current = value && match ? match.original : "";
        onInputChange(value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Tab" && hint.current && value?.trim() && value !== hint.current) {
            e.preventDefault();
            onInputChange(hint.current);
        }

    };

    return (

        <Autocomplete

            freeSolo
            disablePortal
            autoHighlight
            disableClearable={false}
            selectOnFocus
            handleHomeEndKeys
            options={options}
            inputValue={value}
            onInputChange={handleInputChange}
            onClose={() => {
                hint.current = '';
            }}
            sx={{ flex: 2, minWidth: "15rem", ...sx }}

            slotProps={{
                popper: {
                    sx: {
                        '& .MuiAutocomplete-paper': {
                            border: hintAdditionError ? "1px solid" : undefined,
                            borderColor: hintAdditionError ? "error.main" : undefined,
                            color: hintAdditionError ? "error.main" : undefined,
                        },
                    },
                },
            }}
            renderInput={(params) => (
                <Box sx={{ position: "relative" }}>
                    {/* Ghost hint overlay */}
                    <Typography
                        sx={{
                            position: 'absolute',
                            opacity: 0.5,
                            left: 14,
                            top: 16,
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            width: 'calc(100% - 75px)'
                        }}
                    >
                        {hint.current}
                    </Typography>
                    <TextField
                        {...params}
                        label={label}
                        onKeyDown={handleKeyDown}
                    />
                </Box>
            )}

            renderOption={(props, option) => (
                <Box component="li" {...props} sx={{ p: 0 }}  >
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                        }}

                        onClick={(e) => {
                            // Prevent click on the remove button from selecting the item
                            if ((e.target as HTMLElement).closest(".remove-button")) {
                                e.stopPropagation();
                            } else {
                                props.onClick?.(e as any); // Allow default behavior
                            }
                        }}
                    >
                        <Typography>{option}</Typography>

                        {onRemoveHint && <AsyncIconButton

                            size="small"
                            className="remove-button"
                            sx={{
                                ml: 2,
                                flexShrink: 0, // prevent shrinking
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                return onRemoveHint(option);
                            }}
                        >
                            <Close fontSize="small" />
                        </AsyncIconButton>}

                    </Box>
                </Box>
            )}
        />


    );
};
withErrorHandler
