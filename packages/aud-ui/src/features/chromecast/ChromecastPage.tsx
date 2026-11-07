import {
    Alert,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
    Typography,
} from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import React, { useEffect, useState } from "react";
import { useAppSelector } from "../../hooks";
import { selectAmplifierState } from "../amplifier/amplifierSelectors";
import { selectChromecastState } from "./chromecastSelectors";
import { CHROMECAST_WEAK_SIGNAL_DBM, wifiSignalText } from "./chromecastText";
import { ChromecastNowPlaying, PAGE_WIDTH } from "./ChromecastNowPlaying";
import { CommandErrorSnackbar } from "./CommandErrorSnackbar";
import { useChromecastCommand } from "./useChromecastCommand";

const REBOOT_TIMEOUT_MS = 2 * 60 * 1000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;
// A device that restarted by itself shows as a short uptime.
const RECENT_RESTART_SEC = 5 * SECONDS_PER_MINUTE;

const uptimeText = (seconds: number): string => {
    if (seconds >= SECONDS_PER_DAY)
        return `${Math.floor(seconds / SECONDS_PER_DAY)} d ${Math.floor((seconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR)} h`;
    if (seconds >= SECONDS_PER_HOUR)
        return `${Math.floor(seconds / SECONDS_PER_HOUR)} h ${Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)} min`;
    return `${Math.floor(seconds / SECONDS_PER_MINUTE)} min`;
};

const StatusRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
        <Typography color="text.secondary">{label}</Typography>
        <Typography color={color}>{value}</Typography>
    </Stack>
);

/**
 * Waits for a rebooting Chromecast to come back: it is gone for a while after the command, and when it is reachable again the
 * wait is over. Gives up with a message after two minutes.
 */
const useRebootWait = (reachable: boolean | undefined) => {
    const [waiting, setWaiting] = useState(false);
    const [seenDown, setSeenDown] = useState(false);
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        if (!waiting) return;
        const timer = setTimeout(() => {
            setWaiting(false);
            setTimedOut(true);
        }, REBOOT_TIMEOUT_MS);
        return () => clearTimeout(timer);
    }, [waiting]);

    useEffect(() => {
        if (!waiting) return;
        if (reachable === false) setSeenDown(true);
        else if (reachable && seenDown) setWaiting(false);
    }, [waiting, reachable, seenDown]);

    const start = () => {
        setSeenDown(false);
        setTimedOut(false);
        setWaiting(true);
    };
    return { waiting, timedOut, start };
};

/** The Chromecast: what it plays with the buttons for it, the way to switch the amplifier to it, and its own status and restart. */
const ChromecastPage: React.FC = () => {
    const state = useAppSelector(selectChromecastState);
    const amplifier = useAppSelector(selectAmplifierState);
    const { send, error, clearError } = useChromecastCommand();
    const [confirmingReboot, setConfirmingReboot] = useState(false);
    const portalContainer = usePortalContainerRef();
    const reboot = useRebootWait(state?.reachable);

    if (!state) return null;
    if (!state.configured) return <Alert severity="info">No Chromecast is set up.</Alert>;

    const { device, playback } = state;
    const chromecastInput = amplifier?.info?.chromecastInput;
    const canSelectAmplifier = chromecastInput !== undefined;
    const amplifierStatus = amplifier?.status;
    const amplifierOnChromecast = !!amplifierStatus?.power && amplifierStatus.input === chromecastInput;
    const casting = playback !== null;
    const weakSignal = device?.wifiSignalDbm !== undefined && device.wifiSignalDbm < CHROMECAST_WEAK_SIGNAL_DBM;

    return (
        <Stack spacing={2} sx={{ maxWidth: PAGE_WIDTH, mx: "auto" }}>
            {reboot.waiting ? (
                <Alert severity="info">The Chromecast restarts, which takes about a minute.</Alert>
            ) : reboot.timedOut ? (
                <Alert severity="error">The Chromecast did not come back within 2 minutes.</Alert>
            ) : (
                !state.reachable && <Alert severity="warning">The Chromecast cannot be reached.</Alert>
            )}
            {device && device.uptimeSec < RECENT_RESTART_SEC && state.reachable && (
                <Alert severity="info">The Chromecast restarted recently.</Alert>
            )}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                {canSelectAmplifier && (
                    <Button
                        fullWidth
                        variant="outlined"
                        disabled={!state.reachable || amplifierOnChromecast}
                        onClick={() => send("chromecast_select_amp", {})}
                    >
                        Switch amp
                    </Button>
                )}
                <Button fullWidth variant="outlined" disabled={!state.app} onClick={() => send("chromecast_stop_app", {})}>
                    {casting ? "Stop casting" : "Stop app"}
                </Button>
                <Button
                    fullWidth
                    variant="outlined"
                    color="warning"
                    disabled={!state.reachable || reboot.waiting}
                    onClick={() => setConfirmingReboot(true)}
                >
                    Restart
                </Button>
            </Stack>
            {device && (
                <Card variant="outlined">
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Status
                        </Typography>
                        <StatusRow label="Name" value={device.name} />
                        <StatusRow
                            label="Software"
                            value={device.hasUpdate ? `${device.firmware} (update available, installs by itself)` : device.firmware}
                        />
                        <StatusRow label="Running for" value={uptimeText(device.uptimeSec)} />
                        {device.wifiSignalDbm !== undefined && (
                            <StatusRow
                                label="Wi-Fi signal"
                                value={wifiSignalText(device.wifiSignalDbm)}
                                color={weakSignal ? "warning.main" : undefined}
                            />
                        )}
                        {amplifierStatus && chromecastInput !== undefined && (
                            <StatusRow
                                label="Amplifier"
                                value={
                                    !amplifierStatus.power
                                        ? "Off"
                                        : amplifierOnChromecast
                                          ? "On, on the Chromecast"
                                          : `On, on ${amplifierStatus.input}`
                                }
                            />
                        )}
                        {state.lastCast && (
                            <StatusRow
                                label="Last cast"
                                value={`${state.lastCast.app}, ${new Date(state.lastCast.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                            />
                        )}
                        <StatusRow label="Address" value={device.ip} />
                    </CardContent>
                </Card>
            )}
            {playback ? (
                <ChromecastNowPlaying />
            ) : (
                state.reachable && (
                    <Typography color="text.secondary" sx={{ textAlign: "center" }}>
                        {state.app ? `${state.app} · nothing is playing.` : "Nothing is playing."}
                    </Typography>
                )
            )}
            <Dialog open={confirmingReboot} container={portalContainer.current} onClose={() => setConfirmingReboot(false)}>
                <DialogTitle>Restart the Chromecast?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        What is cast to it stops, and it takes about a minute before it can be used again.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmingReboot(false)}>Cancel</Button>
                    <Button
                        color="warning"
                        onClick={async () => {
                            setConfirmingReboot(false);
                            if (await send("chromecast_reboot", {})) reboot.start();
                        }}
                    >
                        Restart
                    </Button>
                </DialogActions>
            </Dialog>
            <CommandErrorSnackbar error={error} onClose={clearError} />
        </Stack>
    );
};

export default ChromecastPage;
