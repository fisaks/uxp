import React, { useCallback, useState } from "react";

import ReplayIcon from "@mui/icons-material/Replay";
import { Box, debounce, IconButton, TextField, Tooltip, useTheme } from "@mui/material";
import ReadOnlyField from "./ReadOnlyField";

type DebouncedPatchTextFieldProps<T> = {
    entityId: string;
    label: string;
    field: keyof T;
    value?: string;
    disabled?: boolean;
    patchAction: (payload: { entityId: string; field: keyof T; value?: string }) => any; // Generic patch action
    dispatch: (action: ReturnType<DebouncedPatchTextFieldProps<T>["patchAction"]>) => {
        unwrap: () => ReturnType<DebouncedPatchTextFieldProps<T>["patchAction"]>["unwrap"];
    }; // Generic dispatch
};

const DebouncedPatchTextField = <T,>({
    entityId,
    label,
    field,
    value,
    patchAction,
    dispatch,
    disabled,
}: DebouncedPatchTextFieldProps<T>) => {
    const theme = useTheme();

    const [localValue, setLocalValue] = useState(value);
    const [hasError, setHasError] = useState(false);

    const debouncedUpdate = useCallback(
        debounce(async (newValue?: string) => {
            try {
                await dispatch(patchAction({ entityId, field, value: newValue })).unwrap();
                setHasError(false);
            } catch (error) {
                console.error(error);
                setHasError(true);
            }
        }, 500),
        [dispatch, entityId, field, patchAction]
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        debouncedUpdate(newValue);
    };

    const handleRetry = () => {
        debouncedUpdate(localValue);
    };
    if (disabled) {
        return <ReadOnlyField label={label} value={localValue as string} />;
    }

    return (
        <TextField
            fullWidth
            label={label}
            value={localValue}
            onChange={handleChange}
            error={hasError}
            helperText={
                hasError ? (
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                        Error occurred
                        <Tooltip title="Retry">
                            <IconButton size="small" sx={{ ml: 1 }} onClick={handleRetry}>
                                <ReplayIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                ) : (
                    ""
                )
            }
            sx={{
                mb: 1,
                backgroundColor: localValue !== value && !hasError ? theme.palette.warning.light : theme.palette.background.paper,

                color: theme.palette.text.primary,
                "& .MuiOutlinedInput-root": {
                    height: 56, // Matches ReadOnlyField height
                },
            }}
        />
    );
};

export default DebouncedPatchTextField;
