import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Breadcrumbs, Link as MuiLink, Typography } from "@mui/material";
import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";
import { RootState } from "../../../app/store";

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
    "/technical/rules": "Rules",
};

/** Sections that support deep linking via /:itemId suffix. */
const deepLinkSections = ["/technical/resources", "/technical/views", "/technical/scenes", "/technical/rules"];

type DeepLinkInfo = { section: string; itemId: string } | null;

function parseDeepLink(pathname: string): DeepLinkInfo {
    for (const section of deepLinkSections) {
        if (pathname.startsWith(section + "/")) {
            return { section, itemId: pathname.slice(section.length + 1) };
        }
    }
    return null;
}

/** Resolve item name from Redux by section + itemId. Falls back to itemId. */
function selectItemName(state: RootState, section: string, itemId: string): string {
    switch (section) {
        case "/technical/resources":
            return state.resources.byId[itemId]?.name ?? itemId;
        case "/technical/views":
            return state.views.byId[itemId]?.name ?? itemId;
        case "/technical/scenes":
            return state.scenes.byId[itemId]?.name ?? itemId;
        case "/technical/rules":
            return state.rules.byId[itemId]?.name ?? itemId;
        default:
            return itemId;
    }
}

type BreadcrumbSegment = {
    label: string;
    to: string;
};

function buildBreadcrumbs(pathname: string, deepLink: DeepLinkInfo): BreadcrumbSegment[] {
    const segments: BreadcrumbSegment[] = [
        { label: "Home", to: "/" },
    ];

    if (pathname !== "/technical") {
        segments.push({ label: "Technical", to: "/technical" });
    }

    if (pathname.startsWith("/technical/blueprints/") && pathname !== "/technical/blueprints") {
        segments.push({ label: "Blueprints", to: "/technical/blueprints" });
    }

    // When deep linking, the section label becomes a link too
    if (deepLink) {
        segments.push({ label: routeLabels[deepLink.section] ?? "", to: deepLink.section });
    }

    return segments;
}

export const TechnicalBreadcrumb: React.FC = () => {
    const location = useLocation();
    const deepLink = parseDeepLink(location.pathname);
    const crumbs = buildBreadcrumbs(location.pathname, deepLink);

    const itemName = useSelector((state: RootState) =>
        deepLink ? selectItemName(state, deepLink.section, deepLink.itemId) : null
    );

    const currentLabel = deepLink ? (itemName ?? deepLink.itemId) : (routeLabels[location.pathname] ?? "");

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
