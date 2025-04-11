import { Box, useMediaQuery, useTheme } from "@mui/material";
import React from "react";
import { useQuery } from "../../hooks/useQuery";

/**
 * Props for the AppBodyContent component.
 *
 * @typedef {Object} BodyContentProps
 * @property {React.ReactNode} children - The content to be displayed within the component.
 * @property {boolean} appHaveOwnLeftSideBar - Flag indicating whether the app has its own left sidebar not mainained by uxp.
 */

/**
 * AppBodyContent component.
 *
 * This component adjusts its left margin based on the screen size and the presence of a left sidebar.
 *
 * @param {BodyContentProps} props - The props for the component.
 * @param {React.ReactNode} props.children - The content to be displayed within the component.
 * @param {boolean} props.appHaveOwnLeftSideBar - Flag indicating whether the app has its own left sidebar not mainained by uxp.
 * @returns {JSX.Element} The rendered component.
 */

type BodyContentProps = {
    children: React.ReactNode;
    appHaveOwnLeftSideBar: boolean;
};

export const AppBodyContent: React.FC<BodyContentProps> = ({ children, appHaveOwnLeftSideBar: haveLeftSideBar }) => {
    const theme = useTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
    const query = useQuery();
    const printView = query.get("printView") === "true";
    return (
        <Box
            sx={{
                pt: printView ? 0 : 1,
                ml: isDesktop && haveLeftSideBar ? "15rem" : 0,
            }}
        >
            {children}
        </Box>
    );
};
