import { Link as MuiLink } from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";

type TechnicalDeepLinkProps = {
    to: string;
    children: React.ReactNode;
};

export const TechnicalDeepLink: React.FC<TechnicalDeepLinkProps> = ({ to, children }) => (
    <MuiLink
        component={Link}
        to={to}
        underline="hover"
        color="primary"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
    >
        {children}
    </MuiLink>
);
