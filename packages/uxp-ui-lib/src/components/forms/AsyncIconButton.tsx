import {
    CircularProgress,
    IconButton,
    IconButtonProps
} from "@mui/material";
import React from "react";
import { useSafeState } from "../../hooks/useSafeState";
import { WithOptionalTooltip } from "../layout/WithOptionalTooltip";

type AsyncIconButtonProps = {
    children: React.ReactNode;
    tooltip?: string;
    tooltipPortal?: React.RefObject<HTMLElement | null>;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => Promise<unknown>;
} & Omit<IconButtonProps, "children" | "onClick">;

export const AsyncIconButton: React.FC<AsyncIconButtonProps> = ({
    children,
    onClick,
    tooltip,
    tooltipPortal,
    ...props
}) => {
    const [loading, setLoading] = useSafeState(false);
    const [error, setError] = useSafeState(false);

    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
        if (!onClick) return;

        setLoading(true);
        setError(false);

        try {
            const result = onClick(event);
            await Promise.resolve(result);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };



    return (<WithOptionalTooltip tooltip={tooltip} portalContainer={tooltipPortal}>
        <IconButton
            {...props}
            aria-label={tooltip}
            onClick={handleClick}
            disabled={loading || props.disabled}
            sx={{
                border: error ? "1px solid" : undefined,
                borderColor: error ? "error.main" : undefined,
                color: error ? "error.main" : undefined,
                ...props.sx,
            }}
        >
            {loading ? <CircularProgress size={20} /> : children}
        </IconButton>
    </WithOptionalTooltip>)


};
