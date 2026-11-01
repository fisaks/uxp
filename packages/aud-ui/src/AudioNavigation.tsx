import { Box, Stack, Tab, Tabs } from "@mui/material";
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { SearchBox } from "./features/search/SearchBox";

const TABS = [
    { value: "/amplifier", label: "Amplifier" },
    { value: "/library", label: "Library" },
    { value: "/audiobooks", label: "Audiobooks" },
    { value: "/playlists", label: "Playlists" },
    { value: "/queue", label: "Queue" },
    { value: "/history", label: "History" },
];

/** The search box and the tabs between the pages of the app. The Library tab stays selected on the pages below /library. */
export const AudioNavigation: React.FC = () => {
    const { pathname } = useLocation();
    const selected = TABS.find((tab) => pathname.startsWith(tab.value))?.value ?? TABS[0].value;
    return (
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} spacing={1} sx={{ mb: 2 }}>
            <Tabs value={selected} variant="scrollable" scrollButtons="auto" sx={{ minWidth: 0, flex: 1 }}>
                {TABS.map((tab) => (
                    <Tab key={tab.value} value={tab.value} label={tab.label} component={Link} to={tab.value} />
                ))}
            </Tabs>
            <Box sx={{ width: { sm: 240 } }}>
                <SearchBox />
            </Box>
        </Stack>
    );
};
