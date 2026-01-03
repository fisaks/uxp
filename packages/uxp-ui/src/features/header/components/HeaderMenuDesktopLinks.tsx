import { Tab, Tabs } from "@mui/material";
import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { RouteLink } from "../../navigation/navigationSelectors";

type HeaderMenuDesktopLinksProps = {
    headerMenuLinks: RouteLink[]
}
export const HeaderMenuDesktopLinks: React.FC<HeaderMenuDesktopLinksProps> = ({ headerMenuLinks }) => {
    const location = useLocation();

    const activeTabIndex = useMemo(() => {
        const index = headerMenuLinks.findIndex((link) =>
            location.pathname === link.link ||
            location.pathname.startsWith(link.link + "/")
        );

        return index === -1 ? false : index;
    }, [location.pathname, headerMenuLinks]);
    return (

        <Tabs
            value={activeTabIndex} // no selected tab logic
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