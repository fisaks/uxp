import { Tab, Tabs } from "@mui/material";
import { isPathInRootPath, isWildcardRoutePattern } from "@uxp/common";
import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { RouteLink } from "../../navigation/navigationSelectors";

type HeaderMenuDesktopLinksProps = {
    headerMenuLinks: RouteLink[]
}
export const HeaderMenuDesktopLinks: React.FC<HeaderMenuDesktopLinksProps> = ({ headerMenuLinks }) => {
    const location = useLocation();

    /*
     * Determines which header menu item should be marked as active.
     *
     * A menu item is considered active if:
     * - the current pathname exactly matches its link, OR
     * - the route uses a wildcard pattern (e.g. `/houses/*`) and the
     *   current pathname is within that route root.
     *
     * Returns the index of the active menu item, or `false` if no item
     * should be selected (as expected by MUI Tabs).
    */
    const activeTabIndex = useMemo(() => {
        const index = headerMenuLinks.findIndex((link) =>
            location.pathname === link.link ||
            (isWildcardRoutePattern(link.routePattern) &&
                isPathInRootPath(location.pathname, link.routePattern))
        );

        return index === -1 ? false : index;
    }, [location.pathname, headerMenuLinks]);
    return (

        <Tabs
            value={activeTabIndex}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
                minHeight: 0,
                "& .MuiTabs-scrollButtons": {
                    color: "inherit",
                },
            }}
        >
            {headerMenuLinks.map((link) => (
                <Tab key={link.link}
                    label={link.label}
                    component={Link}
                    to={link.link}
                    sx={{
                        minHeight: 0,
                        textTransform: "none",
                        fontSize: "1rem",
                        color: "inherit",
                        opacity: 0.85,
                        borderRadius: 1,
                        px: 1.5,

                        "&:hover": {
                            opacity: 1,
                            backgroundColor: "action.hover",
                        },
                    }}
                />

            ))}


        </Tabs>

    )
}