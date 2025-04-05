import React, { useCallback, useState } from "react";

import ReplayIcon from "@mui/icons-material/Replay";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { Box, CircularProgress, debounce, IconButton, InputAdornment, TextField, TextFieldProps, useTheme } from "@mui/material";
import { useSafeState } from "../../hooks/useSafeState";
import { WithOptionalTooltip } from "../layout/WithOptionalTooltip";

type DebouncedAsyncTextFieldProps<T> = {
    field: keyof T;
    value?: string;
    asyncAction: (payload: { field: keyof T; value?: string }) => Promise<unknown>;

} & TextFieldProps;

const DebouncedAsyncTextField = <T,>({
    field,
    value,
    asyncAction,
    ...props
}: DebouncedAsyncTextFieldProps<T>) => {
    const theme = useTheme();

    const [localValue, setLocalValue] = useSafeState(value);
    const [loading, setLoading] = useSafeState(false);
    const [error, setError] = useState(false);

    const debouncedUpdate = useCallback(debounce(async (newValue?: string) => {
        setError(false);
        setLoading(true);
        try {
            const result = asyncAction({ field, value: newValue });
            await Promise.resolve(result);
        } catch (error) {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, 500),[asyncAction, field]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        debouncedUpdate(newValue);
        props.onChange?.(e);
    };

    const handleRetry = () => {
        debouncedUpdate(localValue);
    };

    return (
        <TextField
            {...props}
            value={localValue}
            onChange={handleChange}
            error={error}
            helperText={
                error ? (
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                        Error occurred
                        <WithOptionalTooltip tooltip="Retry" >
                            <IconButton size="small" sx={{ ml: 1 }} onClick={handleRetry}>
                                <ReplayIcon fontSize="small" />
                            </IconButton>
                        </WithOptionalTooltip>
                    </Box>
                ) : (
                    ""
                )
            }
            slotProps={{
                ...props.slotProps,
                input: {
                    ...props.slotProps?.input,
                    endAdornment: (
                        <InputAdornment position="end">
                            {loading && <CircularProgress size={20} />}
                            {!loading && localValue !== value && !error && <RadioButtonUncheckedIcon fontSize="small" sx={{ color: theme.palette.warning.main }} />}
                        </InputAdornment>)
                }
            }}
            sx={{
                mb: 1,
                //backgroundColor: localValue !== value && !error ? theme.palette.warning.light : theme.palette.background.paper,

            }}
        />
    );
};

export default DebouncedAsyncTextField;
