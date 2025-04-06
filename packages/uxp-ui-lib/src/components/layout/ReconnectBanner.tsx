import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WifiIcon from '@mui/icons-material/Wifi';
import {
    Box,
    Button,
    LinearProgress,
    Paper,
    Slide,
    Typography,
} from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { ReconnectDetails } from '../../features/websocket/BrowserWebSocketManager';
import { useSafeState } from '../../hooks/useSafeState';


interface ReconnectBannerProps {
    details: ReconnectDetails | undefined;
    onRetryNow?: () => void;
}

const getStatusText = (details: ReconnectDetails, elapsedMs: number): string => {
    switch (details.phase) {
        case 'scheduled':
            return `Reconnecting attempt ${details.reconnectAttempts}/${details.maxReconnectAttempts} in ${Math.max(((details.delay! - elapsedMs) / 1000), 0).toFixed(0)}s...`;
        case 'trying':
            if (details.reconnectAttempts >= details.maxReconnectAttempts) {
                return `Final reconnection attempt in progress...`;
            }
            return `Attempting to reconnect (${details.reconnectAttempts}/${details.maxReconnectAttempts})...`;
        case 'success':
            return 'Reconnected successfully.';
        case 'failed':
            if (details.reconnectAttempts >= details.maxReconnectAttempts) {
                return 'All reconnection attempts failed.';
            }
            return 'Reconnection failed. Retrying...';
        default:
            return '';
    }
};

export const ReconnectBanner: React.FC<ReconnectBannerProps> = ({ details, onRetryNow }) => {
    const [visible, setVisible] = useSafeState(false);
    const [progress, setProgress] = useSafeState(0);
    const progressTimer = useRef<NodeJS.Timeout | null>(null);
    const [elapsedMs, setElapsedMs] = useSafeState(0);
    const [dismissed, setDismissed] = useState(false);


    useEffect(() => {
        if (!details) {
            setVisible(false);
            return;
        }
        setDismissed(false);
        setVisible(true);

        if (details.phase === 'success') {
            setTimeout(() => setVisible(false), 3000);
        }

        if (details.phase === 'scheduled' && details.delay) {
            const startTime = Date.now();
            setProgress(0);
            setElapsedMs(0);

            progressTimer.current = setInterval(() => {
                const elapsed = Date.now() - (startTime ?? 0);
                setElapsedMs(elapsed);
                const pct = Math.min((elapsed / details.delay!) * 100, 100);
                setProgress(pct);
            }, 100);

            return () => {
                if (progressTimer.current) clearInterval(progressTimer.current);
            };
        } else {
            if (progressTimer.current) {
                clearInterval(progressTimer.current);
                progressTimer.current = null;
            }
            setProgress(100);
        }
    }, [details]);

    if (!details || !visible || dismissed) return null;

    const isFinalFail =
        details.phase === 'failed' &&
        details.reconnectAttempts >= details.maxReconnectAttempts;

    const icon =
        details.phase === 'success' ? (
            <CheckCircleIcon color="success" sx={{ mr: 1, color: 'success.main' }} />
        ) : details.phase === 'failed' ? (
            <ErrorIcon color="error" sx={{ mr: 1, color: 'error.main' }} />
        ) : (
            <WifiIcon color="warning" sx={{ mr: 1, color: 'warn.main' }} />
        );

    return (
        <Slide in direction="up" appear mountOnEnter unmountOnExit timeout={{ enter: 500 }}>
            <Paper
                elevation={6}
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 2000,
                    mt: 1,
                    ml: 1,
                    mr: 1,
                    bgcolor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    boxShadow: (theme) => theme.shadows[4],
                }}
            >
                <Box sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 2,
                    py: 1,
                    rowGap: 1,
                    columnGap: 2,
                    margin: 1
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 240 }}>
                        {icon}
                        <Typography variant="body2" color="text.secondary">
                            {getStatusText(details, elapsedMs)}
                        </Typography>
                    </Box>
                    {isFinalFail && (
                        <Box sx={{
                            display: 'flex',
                            justifyContent: { xs: 'center', sm: 'flex-end' },
                            width: { xs: "100%", sm: 'auto' },
                            flexWrap: 'wrap',
                            gap: 1,
                        }}>
                            {onRetryNow && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={onRetryNow}
                                >
                                    Retry Now
                                </Button>
                            )}
                            <Button
                                size="small"
                                color="inherit"
                                onClick={() => setDismissed(true)}
                            >
                                Dismiss
                            </Button>
                        </Box>
                    )}
                </Box>
                {details.phase === 'scheduled' && details.delay && (
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{ transition: 'none' }} // disables sudden transitions
                    />
                )}
            </Paper>
        </Slide>
    );
};


