import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import HomeIcon from "@mui/icons-material/Home";
import SearchIcon from "@mui/icons-material/Search";
import { Box, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useHomeVideos } from "./features/home-video/HomeVideosProvider";
import { SearchBox } from "./features/search/SearchBox";
import { LabelledIconButton } from "./features/shared/LabelledIconButton";
import { PAGE_WIDTH } from "./features/shared/pageWidth";
import { HOME_LABEL, HOME_PATH, MENU_ITEMS } from "./menu";

const SEARCH_BOX_WIDTH = 360;
const BAR_PADDING = 4;
const BAR_CONTENT_HEIGHT = 48;
const BAR_MARGIN = 8;

/** The room the bar takes at the top of the page, for what sticks below it. */
export const NAV_BAR_HEIGHT = BAR_CONTENT_HEIGHT + 2 * BAR_PADDING + BAR_MARGIN;

const sectionOf = (pathname: string) => MENU_ITEMS.find((item) => pathname.startsWith(item.path));

/**
 * The bar at the top of every page, as wide as the lists below it: the way back to the home page, the name of the page and
 * the search. On a wide screen the search stands in the middle of the bar, in the same place on every page. On a narrow
 * screen it is an icon that turns the bar into the search box.
 */
export const VideoNavigation: React.FC = () => {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const theme = useTheme();
    const wide = useMediaQuery(theme.breakpoints.up("sm"));
    const [searching, setSearching] = useState(false);
    const { searchAvailable } = useHomeVideos();
    const atHome = pathname === HOME_PATH;
    const section = sectionOf(pathname);
    // A page below the main page of its section, such as a clip, has the way up to that section.
    const belowSection = section && pathname.replace(/\/$/, "") !== section.path;

    return (
        <Box
            sx={{
                position: "sticky",
                top: 0,
                zIndex: (t) => t.zIndex.appBar - 1,
                bgcolor: "background.default",
                py: `${BAR_PADDING}px`,
                mb: `${BAR_MARGIN}px`,
            }}
        >
            <Stack
                direction="row"
                alignItems="center"
                sx={{
                    gap: 1,
                    minHeight: BAR_CONTENT_HEIGHT,
                    maxWidth: PAGE_WIDTH,
                    mx: "auto",
                    // The room left and right of the search is equal, so the search does not move with the buttons on the left.
                    ...(wide && searchAvailable && { display: "grid", gridTemplateColumns: `1fr minmax(0, ${SEARCH_BOX_WIDTH}px) 1fr` }),
                }}
            >
                {searching && !wide ? (
                    <>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <SearchBox autoFocus />
                        </Box>
                        <LabelledIconButton label="Close the search" onClick={() => setSearching(false)}>
                            <CloseIcon />
                        </LabelledIconButton>
                    </>
                ) : (
                    <>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, minWidth: 0 }}>
                            {atHome ? (
                                <HomeIcon color="primary" sx={{ mx: 1 }} />
                            ) : (
                                <>
                                    <LabelledIconButton label="Home" onClick={() => navigate(HOME_PATH)}>
                                        <HomeIcon />
                                    </LabelledIconButton>
                                    {belowSection && (
                                        <LabelledIconButton label={section.label} onClick={() => navigate(section.path)}>
                                            {section.icon}
                                        </LabelledIconButton>
                                    )}
                                    <LabelledIconButton label="Back" onClick={() => navigate(-1)}>
                                        <ArrowBackIcon />
                                    </LabelledIconButton>
                                </>
                            )}
                            <Typography variant="h6" noWrap sx={{ flex: 1, minWidth: 0 }}>
                                {section?.label ?? HOME_LABEL}
                            </Typography>
                        </Box>
                        {searchAvailable &&
                            (wide ? (
                                <>
                                    <Box sx={{ minWidth: 0 }}>
                                        <SearchBox />
                                    </Box>
                                    {/* Takes the same room as the buttons and the title, so the search is in the middle of the bar. */}
                                    <Box />
                                </>
                            ) : (
                                <LabelledIconButton label="Search" onClick={() => setSearching(true)}>
                                    <SearchIcon />
                                </LabelledIconButton>
                            ))}
                    </>
                )}
            </Stack>
        </Box>
    );
};
