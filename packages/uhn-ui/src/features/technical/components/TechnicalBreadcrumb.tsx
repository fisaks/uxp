import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Breadcrumbs, Link as MuiLink, Typography } from "@mui/material";
import { Link, useLocation } from "react-router-dom";

const routeLabels: Record<string, string> = {
    "/technical": "Technical",
    "/technical/topic-trace": "Topic Trace",
    "/technical/blueprints": "Blueprints",
    "/technical/blueprints/upload": "Upload Blueprint",
    "/technical/blueprints/icons": "Icons",
    "/technical/api-tokens": "API Tokens",
    "/technical/resources": "Resources",
    "/technical/views": "Views",
    "/technical/scenes": "Scenes",
};

type BreadcrumbSegment = {
    label: string;
    to: string;
};

function buildBreadcrumbs(pathname: string): BreadcrumbSegment[] {
    const segments: BreadcrumbSegment[] = [
        { label: "Home", to: "/" },
    ];

    if (pathname !== "/technical") {
        segments.push({ label: "Technical", to: "/technical" });
    }

    if (pathname.startsWith("/technical/blueprints/") && pathname !== "/technical/blueprints") {
        segments.push({ label: "Blueprints", to: "/technical/blueprints" });
    }

    return segments;
}

export const TechnicalBreadcrumb: React.FC = () => {
    const location = useLocation();
    const crumbs = buildBreadcrumbs(location.pathname);
    const currentLabel = routeLabels[location.pathname] ?? "";

    return (
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }}>
            {crumbs.map((crumb) => (
                <MuiLink
                    key={crumb.to}
                    component={Link}
                    to={crumb.to}
                    underline="hover"
                    color="inherit"
                    variant="body2"
                >
                    {crumb.label}
                </MuiLink>
            ))}
            <Typography variant="body2" color="text.primary">
                {currentLabel}
            </Typography>
        </Breadcrumbs>
    );
};
