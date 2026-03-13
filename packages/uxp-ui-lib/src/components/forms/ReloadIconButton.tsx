import RefreshIcon from "@mui/icons-material/Refresh";
import { MouseEventHandler, useCallback, useEffect, useMemo, useState } from "react";
import { Loading } from "../layout/Loading";
import React from "react";
import { TooltipIconButton } from "./TooltipIconButton";

type ReloadIconButtonProps = {
    reload: MouseEventHandler<HTMLButtonElement>;
    isLoading: boolean;
    tooltipPortal?: React.RefObject<HTMLElement | null>;
};
export const ReloadIconButton = ({ reload, isLoading, tooltipPortal }: ReloadIconButtonProps) => {
    const [reloadTriggeredFromHere, setReloadTriggeredFromHere] = useState(false);
    const onClick: MouseEventHandler<HTMLButtonElement> = useCallback(
        (e) => {
            setReloadTriggeredFromHere(true);
            reload(e);
        },
        [reload]
    );
    useEffect(() => {
        if (!isLoading && reloadTriggeredFromHere) {
            setReloadTriggeredFromHere(false);
        }
    }, [isLoading]);

    const showLoading = useMemo(() => isLoading && reloadTriggeredFromHere, [isLoading, reloadTriggeredFromHere]);
    return (
        <TooltipIconButton
            tooltip={showLoading ? "Refreshing..." : "Reload"}
            tooltipPortal={tooltipPortal}
            onClick={onClick}
            disabled={isLoading}
            sx={{ color: "primary.main" }}
        >
            {showLoading ? <Loading size={20} /> : <RefreshIcon />}
        </TooltipIconButton>
    );
};
export default ReloadIconButton;
