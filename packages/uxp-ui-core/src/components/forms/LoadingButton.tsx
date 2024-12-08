import CheckIcon from "@mui/icons-material/Check"; // Use simple CheckIcon
import { Button, ButtonProps, CircularProgress } from "@mui/material";
import React from "react";

interface LoadingButtonProps extends ButtonProps {
    isLoading?: boolean;
    done?: boolean;
    doneText?: string;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({ isLoading, done, doneText, children, startIcon, ...props }) => {
    return (
        <Button
            {...props}
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
            {done ? doneText : children} {/* Replace button text with doneText */}
        </Button>
    );
};

export default LoadingButton;
