import CheckIcon from "@mui/icons-material/Check";
import ErrorIcon from "@mui/icons-material/Error";
import { Button, ButtonProps, CircularProgress, Popover, Typography } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";

interface LoadingButtonProps extends ButtonProps {
    isLoading?: boolean;
    done?: boolean;
    doneText?: string;
    error?: boolean;
    errorText?: string;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({ isLoading, done, doneText, error, errorText, children, startIcon, ...props }) => {
    const divRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    useEffect(() => {
        if (error && buttonRef.current) {
            setAnchorEl(buttonRef.current);
            const timer = setTimeout(() => setAnchorEl(null), 5000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [error]);

    return (
        <div ref={divRef}>
            <Button
                {...props}
                ref={buttonRef}
                disabled={isLoading || done || props.disabled} // Disable when loading or done
                startIcon={
                    isLoading ? (
                        <CircularProgress size={20} sx={{ color: "info.main" }} />
                    ) : done ? (
                        <CheckIcon sx={{ color: "success.main" }} /> // Use checkmark icon in success color
                    ) : (
                        startIcon
                    )
                }
                sx={{
                    "&:disabled": {
                        color: done ? "success.main" : "inherit", // Change text color to success.main when done
                    },
                    ...props.sx,
                }}
            >
                {done && !!doneText ? doneText : children} {/* Replace button text with doneText */}
            </Button>
            <Popover
                container={divRef.current}
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{
                    vertical: "top",
                    horizontal: "center",
                }}
                transformOrigin={{
                    vertical: "top",
                    horizontal: "center",
                }}
                disableAutoFocus
                disableEnforceFocus
            >
                <Typography
                    variant="body2"
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        backgroundColor: "error.main",
                        color: "white",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        cursor: "pointer",
                    }}
                    onClick={() => setAnchorEl(null)}
                >
                    <ErrorIcon fontSize="small" />
                    {errorText ?? "An error occurred"}
                </Typography>
            </Popover>
        </div>
    );
};

export default LoadingButton;
