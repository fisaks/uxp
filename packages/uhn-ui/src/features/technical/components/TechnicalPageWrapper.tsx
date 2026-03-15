import SearchIcon from "@mui/icons-material/Search";
import { Box } from "@mui/material";
import { TooltipIconButton, usePortalContainerRef } from "@uxp/ui-lib";
import { useEffect, useRef } from "react";
import { useLocation, useNavigationType, useParams } from "react-router-dom";
import { useOpenCommandPalette } from "../../command-palette/CommandPaletteContext";
import { TechnicalBreadcrumb } from "./TechnicalBreadcrumb";

type TechnicalPageWrapperProps = {
    children: React.ReactNode;
};

export const TechnicalPageWrapper: React.FC<TechnicalPageWrapperProps> = ({ children }) => {
    const { pathname } = useLocation();
    const navigationType = useNavigationType();
    const { itemId } = useParams<{ itemId: string }>();
    const prevPathnameRef = useRef(pathname);
    const openCommandPalette = useOpenCommandPalette();
    const portalContainer = usePortalContainerRef();

    // Scroll to top on forward navigation (PUSH/REPLACE) so new pages start
    // at the top. Skip on POP (back/forward button) to let the browser restore
    // the previous scroll position. Also skip when a deep link :itemId is
    // present — the useDeepLinkHighlight hook handles scrolling to the tile.
    // Only scroll when pathname actually changes — same-page state updates
    // (e.g. rule selection via location.state) should not reset scroll.
    useEffect(() => {
        if (pathname !== prevPathnameRef.current) {
            prevPathnameRef.current = pathname;
            if (navigationType !== "POP" && !itemId) {
                window.scrollTo(0, 0);
            }
        }
    }, [pathname, navigationType, itemId]);

    return (
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <TechnicalBreadcrumb />
                <TooltipIconButton
                    onClick={openCommandPalette}
                    tooltip="Search (Ctrl+K)"
                    tooltipPortal={portalContainer}
                    sx={{ color: "primary.main" }}
                >
                    <SearchIcon />
                </TooltipIconButton>
            </Box>
            {children}
        </Box>
    );
};
