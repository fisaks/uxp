import React, { useCallback, useMemo, useState } from "react";

import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ReplayIcon from "@mui/icons-material/Replay";
import { Box, CircularProgress, debounce, IconButton, InputAdornment, TextField, TextFieldProps, useTheme } from "@mui/material";
import { useSafeState } from "../../hooks/useSafeState";
import { mapApiErrorsToMessageString } from "../../util/browserErrorMessage";
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
    const [error, setError] = useState<string | undefined>(undefined);

    const doUpdate = useCallback(async (newValue?: string) => {
        setError(undefined);
        setLoading(true);
        try {
            const result = asyncAction({ field, value: newValue });
            await Promise.resolve(result);
        } catch (error) {
            console.error("Error in async action", error);
            setError(mapApiErrorsToMessageString(error));
        } finally {
            setLoading(false);
        }
    }, [asyncAction, field]);

    const debouncedUpdate = useMemo(() => debounce(doUpdate, 500), [doUpdate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        debouncedUpdate(newValue);
        props.onChange?.(e); //  call possible original onClick handler
    };

    const handleRetry = () => {
        doUpdate(localValue,);
    };

    return (
        <TextField
            {...props}
            value={localValue}
            onChange={handleChange}
            error={!!error}
            helperText={
                error ? (
                    <Box component="span" sx={{ display: "flex", alignItems: "center" }}>
                        <span>{error}</span>
                        <WithOptionalTooltip tooltip="Retry" >
                            <IconButton size="small" sx={{ ml: 1 }} onClick={handleRetry}>
                                <ReplayIcon fontSize="small" />
                            </IconButton>
                        </WithOptionalTooltip>
                    </Box>
                ) : undefined
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
