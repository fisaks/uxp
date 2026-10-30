import { Tab, Tabs } from "@mui/material";
import React from "react";
import { Link, useLocation } from "react-router-dom";

const TABS = [
    { value: "/amplifier", label: "Amplifier" },
    { value: "/library", label: "Library" },
    { value: "/audiobooks", label: "Audiobooks" },
    { value: "/playlists", label: "Playlists" },
    { value: "/queue", label: "Queue" },
    { value: "/history", label: "History" },
];

/** The tabs between the pages of the app. The Library tab stays selected on the pages below /library. */
export const AudioNavigation: React.FC = () => {
    const { pathname } = useLocation();
    const selected = TABS.find((tab) => pathname.startsWith(tab.value))?.value ?? TABS[0].value;
    return (
        <Tabs value={selected} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
            {TABS.map((tab) => (
                <Tab key={tab.value} value={tab.value} label={tab.label} component={Link} to={tab.value} />
            ))}
        </Tabs>
    );
};
