import CloseIcon from "@mui/icons-material/Close";
import {
    Box,
    CircularProgress,
    IconButton,
    Popover,
    Stack,
    Typography,
} from "@mui/material";
import { UhnSystemStatus } from "@uhn/common";
import { usePortalContainerRef } from "@uxp/ui-lib";
import { ExecutionStepRow } from "./ExecutionStepRow";

type ExecutionStatusPopoverProps = {
    anchorEl: HTMLElement | null;
    status: UhnSystemStatus;
    onClose: () => void;
};

export const ExecutionStatusPopover: React.FC<ExecutionStatusPopoverProps> = ({
    anchorEl,
    status,
    onClose,
}) => {
    const portalContainer = usePortalContainerRef();
    if (status.state === "idle") return null;

    return (
        <Popover
            container={portalContainer.current}
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
        >
            <Box sx={{ p: 1.5, minWidth: 220 }}>
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                >
                    <Stack direction="row" spacing={1} alignItems="center">
                        {status.state === "running" && (
                            <CircularProgress size={14} />
                        )}
                        <Typography variant="body2">
                            {status.message ?? status.command}
                        </Typography>
                    </Stack>

                    <IconButton
                        size="small"
                        onClick={onClose}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Stack>

                {status.steps.length > 0 && (
                    <Stack spacing={0.5} sx={{ mt: 1 }}>
                        {status.steps.map(step => (
                            <ExecutionStepRow
                                key={step.key}
                                step={step}
                            />
                        ))}
                    </Stack>
                )}
            </Box>
        </Popover>
    );
};
