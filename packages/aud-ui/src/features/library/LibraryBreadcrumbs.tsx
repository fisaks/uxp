import { Breadcrumbs, Link, Typography } from "@mui/material";
import React from "react";
import { Link as RouterLink } from "react-router-dom";

type LibraryBreadcrumbsProps = {
    /** The places above the current one, nearest to the library first. */
    trail: { label: string; to: string }[];
    current: string;
};

export const LibraryBreadcrumbs: React.FC<LibraryBreadcrumbsProps> = ({ trail, current }) => (
    <Breadcrumbs sx={{ mb: 2 }}>
        {trail.map(({ label, to }) => (
            <Link key={to} component={RouterLink} to={to} underline="hover" color="inherit">
                {label}
            </Link>
        ))}
        <Typography color="text.primary">{current}</Typography>
    </Breadcrumbs>
);
