import { ErrorOutline, NotificationsActive } from "@mui/icons-material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import React from "react";

type HeaderSectionProps = {
    subscribed: boolean;
    connectionError: boolean;
    hasLastExecution: boolean;
    infoAnchorRef: React.RefObject<HTMLButtonElement>;
    onOpenLastExecution: () => void;
};

export const HeaderSection: React.FC<HeaderSectionProps> = ({
    subscribed,
    connectionError,
    hasLastExecution,
    infoAnchorRef,
    onOpenLastExecution,
}) => (
    <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle1">UHN System</Typography>

        <Tooltip
            slotProps={{
                popper: {
                    disablePortal: true
                }
            }}
            title={subscribed
                ? "System status subscription active"
                : "Not subscribed to system status updates"
            }>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    color: subscribed ? "success.main" : "text.disabled",
                }}
            >
                <NotificationsActive fontSize="small" />
            </Box>
        </Tooltip>
        <Tooltip
            slotProps={{
                popper: {
                    disablePortal: true
                }
            }}
            title={
                hasLastExecution
                    ? "Show last system command execution"
                    : "No recent system command"
            }
        >
            <span>
                <IconButton
                    ref={infoAnchorRef}
                    size="small"
                    disabled={!hasLastExecution}
                    onClick={onOpenLastExecution}
                >
                    <InfoOutlinedIcon fontSize="small" />
                </IconButton>
            </span>
        </Tooltip>

        {connectionError && (
            <Tooltip
                slotProps={{
                    popper: {
                        disablePortal: true
                    }
                }}
                title="Remote connection issue">
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        color: "error.main",
                    }}
                >
                    <ErrorOutline fontSize="small" />
                </Box>
            </Tooltip>
        )}
    </Stack>
);
