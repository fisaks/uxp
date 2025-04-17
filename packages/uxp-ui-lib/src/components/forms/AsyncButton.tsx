import CheckIcon from "@mui/icons-material/Check";
import ErrorIcon from "@mui/icons-material/Error";
import {
    Button,
    ButtonProps,
    CircularProgress,
    Popover,
    Typography
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import { usePortalContainer } from "../../features/shadow-root/ShadowRootContext";
import { useSafeState } from "../../hooks/useSafeState";
import { ErrorCodeMessageMap, mapApiErrorsToMessageString } from "../../util/browserErrorMessage";

type AsyncButtonProps = {
    children: React.ReactNode;
    doneText?: string;
    loadingText?: string;
    errorCodeMessage?: ErrorCodeMessageMap
    afterDone?: () => void;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => Promise<unknown>;
} & Omit<ButtonProps, "children" | "onClick">;

/**
 * This is Uncontrolled Button Component which manages its own internal loading done error state.
 * LoadingButton is a controlled version of this component.
 * @param param0 
 * @returns 
 */
export const AsyncButton: React.FC<AsyncButtonProps> = ({
    children,
    onClick,
    errorCodeMessage,
    doneText,
    loadingText,
    startIcon,
    afterDone,
    ...props
}) => {
    const [loading, setLoading] = useSafeState(false);
    const [done, setDone] = useSafeState(false);
    const [error, setError] = useSafeState<string | undefined>(undefined);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const container = usePortalContainer();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (done && doneText) {
            const timer = setTimeout(() => {
                setDone(false);
                afterDone?.();
            }, 2000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [done, doneText, afterDone])

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => {
                setAnchorEl(null);
                setError(undefined);
            }, 5000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [error])

    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!onClick) return;

        setLoading(true);
        setDone(false);
        setError(undefined);

        try {
            await onClick(event);
            setDone(true);
        } catch (err) {
            setError(mapApiErrorsToMessageString(err, errorCodeMessage));
            setAnchorEl(buttonRef.current);
        } finally {
            setLoading(false);
        }
    };



    return (<>
        <Button {...props}
            ref={buttonRef}
            disabled={loading || done || props.disabled} // Disable when loading or done
            onClick={handleClick}
            startIcon={
                loading ? (
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
            {done && !!doneText ? doneText : loading && !!loadingText ? loadingText : children} {/* Replace button text with doneText */}
        </Button>
        <Popover
            container={container}
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
                {error ?? "An error occurred"}
            </Typography>
        </Popover>

    </>
    )

};
