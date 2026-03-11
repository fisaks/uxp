import { Box } from "@mui/material";
import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { TechnicalBreadcrumb } from "./TechnicalBreadcrumb";

type TechnicalPageWrapperProps = {
    children: React.ReactNode;
};

export const TechnicalPageWrapper: React.FC<TechnicalPageWrapperProps> = ({ children }) => {
    const { pathname } = useLocation();
    const navigationType = useNavigationType();

    // Scroll to top on forward navigation (PUSH/REPLACE) so new pages start
    // at the top. Skip on POP (back/forward button) to let the browser restore
    // the previous scroll position.
    useEffect(() => {
        if (navigationType !== "POP") {
            window.scrollTo(0, 0);
        }
    }, [pathname, navigationType]);

    return (
        <Box>
            <TechnicalBreadcrumb />
            {children}
        </Box>
    );
};
