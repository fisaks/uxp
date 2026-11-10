import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PowerSettingsNewIcon from "@mui/icons-material/PowerSettingsNew";
import {
    Alert,
    Box,
    Button,
    Card,
    CircularProgress,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TextField,
    Slider,
    Stack,
    Typography,
} from "@mui/material";
import { usePortalContainerRef } from "@uxp/ui-lib";
import { ChromecastInfo } from "@vid/common";
import React, { useEffect, useState } from "react";
import { useAppSelector } from "../../hooks";
import { formatDuration } from "../home-video/clipFormat";
import { LabelledIconButton } from "../shared/LabelledIconButton";
import { PAGE_WIDTH } from "../shared/pageWidth";
import {
    usePauseChromecastMutation,
    usePlayChromecastMutation,
    useRebootChromecastMutation,
    useConfirmTvPairingMutation,
    useForgetTvPairingMutation,
    useSeekChromecastMutation,
    useSetTvPowerMutation,
    useStartTvPairingMutation,
    useStopChromecastMutation,
} from "./chromecast.api";
import { selectChromecasts } from "./chromecastSelectors";
import { isWeakSignal, playbackPosition, playbackStateText, uptimeText, wifiSignalText } from "./chromecastText";

const TICK_MS = 1000;
const REBOOT_TIMEOUT_MS = 2 * 60 * 1000;
// A device that restarted by itself shows as a short uptime.
const RECENT_RESTART_SEC = 5 * 60;
const POSTER = { width: 96, height: 54 };

const useNow = (active: boolean) => {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        if (!active) return;
        const timer = setInterval(() => setNow(Date.now()), TICK_MS);
        return () => clearInterval(timer);
    }, [active]);
    return now;
};

const DetailRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
        <Typography color="text.secondary">{label}</Typography>
        <Typography color={color} sx={{ textAlign: "right" }}>
            {value}
        </Typography>
    </Stack>
);

/** What plays on the device, with the buttons the app on it accepts. */
const NowPlaying: React.FC<{ device: ChromecastInfo }> = ({ device }) => {
    const { playback } = device;
    const [play] = usePlayChromecastMutation();
    const [pause] = usePauseChromecastMutation();
    const [seek] = useSeekChromecastMutation();
    const [dragging, setDragging] = useState<number | undefined>(undefined);
    const now = useNow(playback?.state === "PLAYING");
    if (!playback) {
        return <Typography color="text.secondary">{device.app ? `${device.app} · nothing is playing.` : "Nothing is playing."}</Typography>;
    }
    const duration = playback.durationSec ?? 0;
    const position = Math.min(dragging ?? playbackPosition(playback, now), duration || Infinity);
    const playing = playback.state === "PLAYING" || playback.state === "BUFFERING";
    const subtitle = [device.app, playback.subtitle].filter(Boolean).join(" · ");

    return (
        <Stack spacing={1}>
            <Stack direction="row" spacing={1.5} alignItems="center">
                {playback.imageUrl && (
                    <Box
                        component="img"
                        src={playback.imageUrl}
                        alt=""
                        sx={{ ...POSTER, flexShrink: 0, objectFit: "cover", borderRadius: 0.5 }}
                    />
                )}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{ fontWeight: 600 }}>
                        {playback.title || "Playing"}
                    </Typography>
                    <Typography noWrap variant="body2" color="text.secondary">
                        {[subtitle, playbackStateText(playback)].filter(Boolean).join(" · ")}
                    </Typography>
                </Box>
                {playback.commands.pause && (
                    <LabelledIconButton
                        label={playing ? "Pause" : "Play"}
                        onClick={() => void (playing ? pause(device.id) : play(device.id))}
                    >
                        {playing ? <PauseIcon /> : <PlayArrowIcon />}
                    </LabelledIconButton>
                )}
            </Stack>
            {duration > 0 && (
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36, textAlign: "right" }}>
                        {formatDuration(position)}
                    </Typography>
                    <Slider
                        size="small"
                        min={0}
                        max={duration}
                        value={position}
                        disabled={!playback.commands.seek}
                        onChange={(_event, value) => setDragging(value as number)}
                        onChangeCommitted={(_event, value) => {
                            setDragging(undefined);
                            void seek({ deviceId: device.id, positionSec: value as number });
                        }}
                        aria-label="Position"
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36 }}>
                        {formatDuration(duration)}
                    </Typography>
                </Stack>
            )}
        </Stack>
    );
};

/**
 * Waits for a rebooting Chromecast to come back: it is gone for a while after the command, and when it is reachable again the
 * wait is over. Gives up with a message after two minutes.
 */
const useRebootWait = (reachable: boolean) => {
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
        if (!reachable) setSeenDown(true);
        else if (seenDown) setWaiting(false);
    }, [waiting, reachable, seenDown]);

    const start = () => {
        setSeenDown(false);
        setTimedOut(false);
        setWaiting(true);
    };
    return { waiting, timedOut, start };
};

/** Pairing with a Philips TV: the TV shows a PIN, which is typed here. Needs someone at the TV. */
const TvPairing: React.FC<{ device: ChromecastInfo }> = ({ device }) => {
    const [start, { isLoading: starting }] = useStartTvPairingMutation();
    const [confirm, { isLoading: confirming }] = useConfirmTvPairingMutation();
    const [forget] = useForgetTvPairingMutation();
    const [setPower, { isLoading: switching }] = useSetTvPowerMutation();
    const portalContainer = usePortalContainerRef();
    const [asking, setAsking] = useState(false);
    const [pin, setPin] = useState("");
    const paired = device.powerControl === "paired";

    const close = () => {
        setAsking(false);
        setPin("");
    };

    return (
        <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                <Typography color="text.secondary">Power control</Typography>
                <Stack direction="row" alignItems="center" spacing={1}>
                    {paired && <CheckCircleIcon color="success" fontSize="small" />}
                    <Typography color={paired ? "success.main" : undefined} sx={{ fontWeight: paired ? 600 : undefined }}>
                        {paired ? `Paired${device.powerState ? ` · ${device.powerState === "On" ? "on" : "standby"}` : ""}` : "Not paired"}
                    </Typography>
                    {paired ? (
                        <>
                            <Button
                                size="small"
                                variant="outlined"
                                disabled={switching}
                                startIcon={switching ? <CircularProgress size={16} color="inherit" /> : <PowerSettingsNewIcon />}
                                onClick={() =>
                                    void setPower({ deviceId: device.id, state: device.powerState === "Standby" ? "On" : "Standby" })
                                }
                            >
                                {device.powerState === "Standby" ? "Switch on" : "Switch off"}
                            </Button>
                            <Button size="small" variant="outlined" onClick={() => void forget(device.id)}>
                                Forget
                            </Button>
                        </>
                    ) : (
                        <Button
                            size="small"
                            variant="contained"
                            disabled={!device.reachable || starting}
                            startIcon={starting ? <CircularProgress size={16} color="inherit" /> : undefined}
                            onClick={async () => {
                                if (
                                    await start(device.id)
                                        .unwrap()
                                        .then(
                                            () => true,
                                            () => false
                                        )
                                )
                                    setAsking(true);
                            }}
                        >
                            {starting ? "Asking the TV…" : "Pair"}
                        </Button>
                    )}
                </Stack>
            </Stack>
            <Dialog open={asking} container={portalContainer.current} onClose={close}>
                <DialogTitle>Pair {device.name}</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>Type the PIN that the TV shows.</DialogContentText>
                    <TextField
                        autoFocus
                        fullWidth
                        label="PIN"
                        value={pin}
                        onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
                        slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 8 } }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={close} disabled={confirming}>
                        Cancel
                    </Button>
                    <Button
                        disabled={pin.length < 4 || confirming}
                        startIcon={confirming ? <CircularProgress size={16} color="inherit" /> : undefined}
                        onClick={async () => {
                            if (
                                await confirm({ deviceId: device.id, pin })
                                    .unwrap()
                                    .then(
                                        () => true,
                                        () => false
                                    )
                            )
                                close();
                        }}
                    >
                        {confirming ? "Pairing…" : "Pair"}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

const DeviceCard: React.FC<{ device: ChromecastInfo }> = ({ device }) => {
    const [stop] = useStopChromecastMutation();
    const [reboot] = useRebootChromecastMutation();
    const [confirmingReboot, setConfirmingReboot] = useState(false);
    const portalContainer = usePortalContainerRef();
    const rebootWait = useRebootWait(device.reachable);
    const weakSignal = device.wifiSignalDbm !== undefined && isWeakSignal(device.wifiSignalDbm);

    return (
        <Card variant="outlined">
            <CardContent>
                <Stack spacing={1.5}>
                    <Box>
                        <Typography variant="h6">{device.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {device.model}
                        </Typography>
                    </Box>
                    {rebootWait.waiting ? (
                        <Alert severity="info">The Chromecast restarts, which takes about a minute.</Alert>
                    ) : rebootWait.timedOut ? (
                        <Alert severity="error">The Chromecast did not come back within 2 minutes.</Alert>
                    ) : (
                        !device.reachable && <Alert severity="warning">The Chromecast cannot be reached.</Alert>
                    )}
                    {device.reachable && device.uptimeSec !== undefined && device.uptimeSec < RECENT_RESTART_SEC && (
                        <Alert severity="info">The Chromecast restarted recently.</Alert>
                    )}
                    {device.reachable && <NowPlaying device={device} />}
                    <Box>
                        <DetailRow label="Address" value={device.ip} />
                        {device.firmware && (
                            <DetailRow
                                label="Software"
                                value={device.hasUpdate ? `${device.firmware} (update available, installs by itself)` : device.firmware}
                            />
                        )}
                        {device.uptimeSec !== undefined && <DetailRow label="Running for" value={uptimeText(device.uptimeSec)} />}
                        {device.wifiSignalDbm !== undefined && (
                            <DetailRow
                                label="Wi-Fi signal"
                                value={wifiSignalText(device.wifiSignalDbm)}
                                color={weakSignal ? "warning.main" : undefined}
                            />
                        )}
                        {device.powerControl && device.powerControl !== "unavailable" && <TvPairing device={device} />}
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Button
                            fullWidth
                            variant="outlined"
                            disabled={!device.reachable || !device.app}
                            onClick={() => void stop(device.id)}
                        >
                            {device.playback ? "Stop casting" : "Stop app"}
                        </Button>
                        {device.canRestart && (
                            <Button
                                fullWidth
                                variant="outlined"
                                color="warning"
                                disabled={!device.reachable || rebootWait.waiting}
                                onClick={() => setConfirmingReboot(true)}
                            >
                                Restart
                            </Button>
                        )}
                    </Stack>
                </Stack>
            </CardContent>
            <Dialog open={confirmingReboot} container={portalContainer.current} onClose={() => setConfirmingReboot(false)}>
                <DialogTitle>Restart {device.name}?</DialogTitle>
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
                            if (
                                await reboot(device.id)
                                    .unwrap()
                                    .then(
                                        () => true,
                                        () => false
                                    )
                            )
                                rebootWait.start();
                        }}
                    >
                        Restart
                    </Button>
                </DialogActions>
            </Dialog>
        </Card>
    );
};

/** Every Chromecast on the network, with what plays on it, whoever cast it. */
export const ChromecastsPage: React.FC = () => {
    const state = useAppSelector(selectChromecasts);

    return (
        <Box sx={{ p: { xs: 0, sm: 2 }, maxWidth: PAGE_WIDTH, mx: "auto" }}>
            {state?.devices.length === 0 && <Typography color="text.secondary">No Chromecast found on the network.</Typography>}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(auto-fill, minmax(420px, 1fr))" }, gap: 1.5 }}>
                {state?.devices.map((device) => <DeviceCard key={device.id} device={device} />)}
            </Box>
        </Box>
    );
};
