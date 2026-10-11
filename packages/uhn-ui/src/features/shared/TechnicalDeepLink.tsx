import { Link as MuiLink } from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";

type TechnicalDeepLinkProps = {
    to: string;
    /** Router state handed to the target page (e.g. which items to preselect). */
    state?: unknown;
    children: React.ReactNode;
};

export const TechnicalDeepLink: React.FC<TechnicalDeepLinkProps> = ({ to, state, children }) => (
    <MuiLink
        component={Link}
        to={to}
        state={state}
        underline="hover"
        color="primary"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
        {children}
    </MuiLink>
);
