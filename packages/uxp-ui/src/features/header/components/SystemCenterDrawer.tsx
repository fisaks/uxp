import { Box, Button, Divider, Drawer, Tab, Tabs, Toolbar, Typography, useMediaQuery } from "@mui/material";
import { SystemAppMeta } from "@uxp/common";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectSystemPanelApps } from "../../navigation/navigationSelectors";
import { SystemPanelRemoteApp } from "../../remote-app/SystemPanelRemoteApp";
import { useUxpTheme } from "../../theme/useUxpTheme";

export type SystemCenterDrawerProps = {
    open: boolean;
    onClose: () => void;
    targetAppId?: string;
};

export const SystemCenterDrawer: React.FC<SystemCenterDrawerProps> = ({
    open,
    onClose,
    targetAppId
}) => {
    const theme = useUxpTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
    const [selectedTab, setSelectedTab] = useState(0);
    const systemApps: SystemAppMeta[] = useSelector(selectSystemPanelApps);
    const activeApp = systemApps.length > selectedTab ? systemApps[selectedTab] : undefined;
    useEffect(() => {
        if (!open || !targetAppId) return;

        const index = systemApps.findIndex(
            app => app.appId === targetAppId
        );

        if (index !== -1) {
            setSelectedTab(index);
        }
    }, [open, targetAppId, systemApps]);

    useEffect(() => {
        if (!open || targetAppId) return;
        setSelectedTab(0);
    }, [open, targetAppId]);

    return (
        <Drawer
            anchor={isDesktop ? "right" : "bottom"}
            open={open}
            onClose={onClose}
            slotProps={{
                paper: {
                    sx: isDesktop
                        ? { width: "clamp(360px, 30vw, 520px)", maxWidth: "90vw" }
                        : {
                            height: "70vh", borderTopLeftRadius: 12, borderTopRightRadius: 12
                        }
                }
            }}
        >
            {isDesktop && <Toolbar />}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1 }}>
                <Typography variant="h6">System Center</Typography>
                <Button onClick={onClose}>Close</Button>
            </Box>

            <Divider />

            <Tabs
                value={selectedTab}
                onChange={(_, v) => setSelectedTab(v)}
                variant="scrollable"
                scrollButtons="auto"
            >
                {systemApps.map((t) => (
                    <Tab key={t.appId} label={t.appName} />
                ))}
            </Tabs>

            <Divider />
            <Box sx={{ flex: 1, overflowY: "auto" }}>
                {activeApp ? (
                    <SystemPanelRemoteApp appIdentifier={activeApp.appId} />
                ) : (
                    <Box sx={{ p: 2 }}>
                        <Typography color="text.secondary">
                            No system tools are available.
                        </Typography>
                    </Box>
                )}
            </Box>

        </Drawer>
    );
};
