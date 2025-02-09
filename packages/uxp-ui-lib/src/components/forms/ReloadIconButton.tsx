import RefreshIcon from "@mui/icons-material/Refresh";
import { IconButton, Tooltip, useTheme } from "@mui/material";
import { MouseEventHandler, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loading } from "../layout/Loading";

type ReloadIconButtonProps = {
    reload: MouseEventHandler<HTMLButtonElement>;
    isLoading: boolean;
};
export const ReloadIconButton = ({ reload, isLoading }: ReloadIconButtonProps) => {
    const popupContainerRef = useRef<HTMLDivElement>(null);
    const theme = useTheme();
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
        <div ref={popupContainerRef}>
            <Tooltip title={showLoading ? "Refreshing..." : "Reload"} slotProps={{ popper: { container: popupContainerRef.current } }}>
                <span>
                    <IconButton
                        aria-label="reload settings"
                        onClick={onClick}
                        disabled={isLoading}
                        sx={{ color: theme.palette.primary.main }}
                    >
                        {showLoading ? <Loading size={20} /> : <RefreshIcon />}
                    </IconButton>
                </span>
            </Tooltip>
        </div>
    );
};
export default ReloadIconButton;
