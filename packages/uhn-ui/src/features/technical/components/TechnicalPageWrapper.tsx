import { Box } from "@mui/material";
import { useEffect } from "react";
import { useLocation, useNavigationType, useParams } from "react-router-dom";
import { TechnicalBreadcrumb } from "./TechnicalBreadcrumb";

type TechnicalPageWrapperProps = {
    children: React.ReactNode;
};

export const TechnicalPageWrapper: React.FC<TechnicalPageWrapperProps> = ({ children }) => {
    const { pathname } = useLocation();
    const navigationType = useNavigationType();
    const { itemId } = useParams<{ itemId: string }>();

    // Scroll to top on forward navigation (PUSH/REPLACE) so new pages start
    // at the top. Skip on POP (back/forward button) to let the browser restore
    // the previous scroll position. Also skip when a deep link :itemId is
    // present — the useDeepLinkHighlight hook handles scrolling to the tile.
    useEffect(() => {
        if (navigationType !== "POP" && !itemId) {
            window.scrollTo(0, 0);
        }
    }, [pathname, navigationType, itemId]);

    return (
        <Box>
            <TechnicalBreadcrumb />
            {children}
        </Box>
    );
};
