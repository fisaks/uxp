import { Alert, Box, CircularProgress, Snackbar, Stack } from "@mui/material";
import React from "react";
import { useAppSelector } from "../../hooks";
import { selectAmplifierState } from "./amplifierSlice";
import { AdvancedCard } from "./components/AdvancedCard";
import { InputCard } from "./components/InputCard";
import { PowerVolumeCard } from "./components/PowerVolumeCard";
import { TunerCard } from "./components/TunerCard";
import { useAmplifierCommand } from "./useAmplifierCommand";

type AmplifierPageProps = {
    /** The short form for the System Center panel: no advanced settings and only the favourite stations. */
    compact?: boolean;
};

const AmplifierPage: React.FC<AmplifierPageProps> = ({ compact = false }) => {
    const state = useAppSelector(selectAmplifierState);
    const { send, error, clearError } = useAmplifierCommand();

    if (!state || !state.status || !state.info) {
        // Nothing to show until the server has read the amplifier once.
        return state?.reachable === false ? (
            <Alert severity="error">The amplifier cannot be reached.</Alert>
        ) : (
            <Box sx={{ py: 2 }}>
                <CircularProgress size={24} />
            </Box>
        );
    }

    const { info, status } = state;
    const disabled = !state.reachable;

    return (
        <Stack spacing={2} sx={compact ? { p: 2 } : { maxWidth: 700, mx: "auto" }}>
            {!state.reachable && <Alert severity="warning">The amplifier cannot be reached. Showing the last known state.</Alert>}
            <PowerVolumeCard info={info} status={status} disabled={disabled} send={send} compact={compact} />
            <InputCard info={info} status={status} disabled={disabled} send={send} />
            {status.tuner && <TunerCard info={info} tuner={status.tuner} disabled={disabled} send={send} favoritesOnly={compact} />}
            {!compact && <AdvancedCard info={info} status={status} disabled={disabled} send={send} />}
            <Snackbar open={error !== undefined} autoHideDuration={6000} onClose={clearError}>
                <Alert severity="error" onClose={clearError}>
                    {error}
                </Alert>
            </Snackbar>
        </Stack>
    );
};

export default AmplifierPage;
