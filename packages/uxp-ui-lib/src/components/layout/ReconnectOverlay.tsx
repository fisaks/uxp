import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WifiIcon from '@mui/icons-material/Wifi';
import {
    Box,
    Button,
    Fade,
    LinearProgress,
    Paper,
    Typography,
} from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { ReconnectDetails } from '../../features/websocket/BrowserWebSocketManager';
import { useSafeState } from '../../hooks/useSafeState';

interface ReconnectOverlayProps {
    details?: ReconnectDetails;
    onRetryNow?: () => void;

}

const getStatusText = (details: ReconnectDetails, elapsedMs: number): string[] => {

    switch (details.phase) {
        case 'scheduled':
            return ['Connection Issue', `Reconnecting attempt ${details.reconnectAttempts}/${details.maxReconnectAttempts} in ${Math.max(
                (details.delay! - elapsedMs!) / 1000,
                0,
            ).toFixed(0)}s...`];
        case 'trying':
            if (details.reconnectAttempts >= details.maxReconnectAttempts) {
                return ['Connection Issue', `Final reconnection attempt in progress...`];
            }
            return ['Connection Issue', `Attempting to reconnect (${details.reconnectAttempts}/${details.maxReconnectAttempts})...`];
        case 'success':
        case 'remote_up':
            return ['Reconnected successfully.'];
        case 'failed':
            if (details.reconnectAttempts >= details.maxReconnectAttempts) {
                return ['Connection Issue', 'All reconnection attempts failed.'];
            }
            return ['Connection Issue', 'Reconnection failed. Retrying...'];
        case "remote_down":
            return ['Connection Issue', 'We are unable to reach the remote server.', 'Please try reloading the page or come back later.'];
        case "remote_recovering":
            return ['Connection Issue', 'Remote server connection is recovering.', 'Please wait...'];
        default:
            return [];
    }

};
const IconMap: Record<ReconnectDetails["phase"], JSX.Element> = {
    success: <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />,
    remote_up: <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />,
    failed: <ErrorIcon sx={{ fontSize: 40, color: 'error.main' }} />,
    trying: <WifiIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
    scheduled: <WifiIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
    remote_down: <ErrorIcon sx={{ fontSize: 40, color: 'error.main' }} />,
    remote_recovering: <BuildCircleIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
};

export const ReconnectOverlay: React.FC<ReconnectOverlayProps> = ({ details, onRetryNow }) => {
    const [visible, setVisible] = useSafeState(false);
    const [progress, setProgress] = useSafeState(0);
    const progressTimer = useRef<NodeJS.Timeout | null>(null);
    const [elapsedMs, setElapsedMs] = useSafeState(0);
    const [dismissed, setDismissed] = useState(false);
    const [inUseDetails, setInUseDetails] = useState<ReconnectDetails | undefined>(undefined);
    const remoteError = useRef(false);

    const handleDismissed = () => {
        setDismissed(true);
        setVisible(false);
        remoteError.current = false;
        if (progressTimer.current) {
            clearInterval(progressTimer.current);
            progressTimer.current = null;
        }
        setProgress(100);
    };

    useEffect(() => {
        if (!details) {
            setVisible(false);
            remoteError.current = false;
            setInUseDetails(undefined);
            return;
        }

        setDismissed(false);

        if (details.phase === 'remote_down') {
            remoteError.current = true;
            setVisible(true);
            setInUseDetails(details);
            return;
        }
        if (details.phase === 'remote_recovering') {
            remoteError.current = true;
            setInUseDetails(details);
            setVisible(true);
            return;
        }
        if (details.phase === 'remote_up') {
            remoteError.current = false;
            setInUseDetails(details);
            setVisible(false);
            return;
        }
        if (remoteError.current) {
            return;
        }

        if (details.phase === 'success') {
            setInUseDetails(details);
            setVisible(false);
            return;
        }

        if (details.phase === 'scheduled' && details.delay) {
            setInUseDetails(details);
            setVisible(true);
            const startTime = Date.now();
            setProgress(0);
            setElapsedMs(0);

            progressTimer.current = setInterval(() => {
                const elapsed = Date.now() - startTime;
                setElapsedMs(elapsed);
                const pct = Math.min((elapsed / details.delay!) * 100, 100);
                setProgress(pct);
            }, 100);

            return () => {
                if (progressTimer.current) {
                    clearInterval(progressTimer.current);
                    progressTimer.current = null;
                }
                setProgress(100);
            };
        }
        setInUseDetails(details);
        setVisible(true);
        return;


    }, [details]);

    if (!inUseDetails) return null;

    const isFinalFail =
        inUseDetails.phase === 'failed' &&
        inUseDetails.reconnectAttempts >= inUseDetails.maxReconnectAttempts;
    const remoteDown = inUseDetails.phase === 'remote_down' || inUseDetails.phase === "remote_recovering"

    return (
        <Fade in={visible && !dismissed} timeout={{ enter: 2000, exit: 3000 }}  >
            <Box
                sx={(theme) => ({
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 2000,
                    backgroundColor: theme.palette.mode === 'dark'
                        ? 'rgba(0, 0, 0, 0.4)'
                        : 'rgba(255, 255, 255, 0.4)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)', // Safari support
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'auto', // block clicks
                })}
            >
                <Paper
                    elevation={6}
                    sx={(theme) => ({
                        width: '100%',
                        maxWidth: 500,
                        m: 2,
                        p: 3,
                        textAlign: 'center',
                        pointerEvents: 'auto',
                        bgcolor: theme.palette.background.paper,
                        color: theme.palette.text.primary,
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 2,
                        boxShadow: theme.shadows[6],
                        backdropFilter: 'blur(4px)',


                    })}
                >
                    <Box sx={{ mb: 2 }}>{IconMap[inUseDetails?.phase]}</Box>

                    {inUseDetails && getStatusText(inUseDetails, elapsedMs).map((line, index) => (
                        <Typography key={index} variant="h6" gutterBottom>
                            {line}
                        </Typography>
                    ))}

                    {inUseDetails.phase === 'scheduled' && (
                        <LinearProgress
                            variant="determinate"
                            value={progress}
                            sx={{ mt: 2, mb: 2 }}
                        />
                    )}

                    {remoteDown && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap', mt: 2 }}>

                            <Button variant="contained" onClick={() => window.location.reload()}>
                                Reload Window
                            </Button>
                            <Button variant="text" onClick={handleDismissed}>
                                Dismiss
                            </Button>
                        </Box>

                    )}

                    {isFinalFail && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap', mt: 2 }}>
                            {onRetryNow && (
                                <Button variant="contained" onClick={onRetryNow}>
                                    Retry Now
                                </Button>
                            )}
                            <Button variant="text" onClick={handleDismissed}>
                                Dismiss
                            </Button>
                        </Box>
                    )}
                </Paper>
            </Box>
        </Fade>
    );
};
