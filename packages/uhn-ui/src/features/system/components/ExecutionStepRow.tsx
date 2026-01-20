import CheckIcon from "@mui/icons-material/Check";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { CircularProgress, Stack, Typography } from "@mui/material";
import { UhnSystemStep } from "@uhn/common";

export const ExecutionStepRow: React.FC<{ step: UhnSystemStep }> = ({ step }) => {

    return (
        <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
                opacity: step.state === "completed" ? 0.6 : 1,
                transition: "opacity 150ms ease",
            }}
        >
            {step.state === "started" && <CircularProgress size={12} />}
            {step.state === "completed" && (
                <CheckIcon fontSize="small" color="success" />
            )}
            {step.state === "failed" && (
                <ErrorOutlineIcon
                    fontSize="small"
                    color="error"
                />
            )}
            <Typography
                variant="body2"
                sx={{ whiteSpace: "nowrap" }}
            >
                {step.label}
            </Typography>
        </Stack>
    );
};
