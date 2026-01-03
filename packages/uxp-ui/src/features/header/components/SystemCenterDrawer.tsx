import { Box, Button, Divider, Drawer, Tab, Tabs, Typography, useMediaQuery } from "@mui/material";
import React from "react";
import { useUxpTheme } from "../../theme/useUxpTheme";
import type { SystemCenterTab } from "../systemCenter.types";

export type SystemCenterDrawerProps = {
    open: boolean;
    onClose: () => void;
    tabs: SystemCenterTab[];
    selectedTab: number;
    onTabChange: (index: number) => void;
};

export const SystemCenterDrawer: React.FC<SystemCenterDrawerProps> = ({
    open,
    onClose,
    tabs,
    selectedTab,
    onTabChange,
}) => {
    const theme = useUxpTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

    return (
        <Drawer
            anchor={isDesktop ? "right" : "bottom"}
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: isDesktop
                    ? { width: 420, maxWidth: "90vw" }
                    : { height: "70vh", borderTopLeftRadius: 12, borderTopRightRadius: 12 },
            }}
        >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1 }}>
                <Typography variant="h6">System Center</Typography>
                <Button onClick={onClose}>Close</Button>
            </Box>

            <Divider />

            <Tabs
                value={selectedTab}
                onChange={(_, v) => onTabChange(v)}
                variant="scrollable"
                scrollButtons="auto"
            >
                {tabs.map((t) => (
                    <Tab key={t.appId} label={t.appName} />
                ))}
            </Tabs>

            <Divider />

            <Box sx={{ flex: 1, overflowY: "auto" }}>
                {tabs[selectedTab]?.content}
            </Box>
        </Drawer>
    );
};
