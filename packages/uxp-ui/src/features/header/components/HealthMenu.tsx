import { Box, Button, Divider, Menu, Typography } from "@mui/material";
import { SystemAppMeta } from "@uxp/common";
import React, { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import axiosInstance from "../../../app/axiosInstance";
import { selectHealthIndicatorApps } from "../../navigation/navigationSelectors";
import { selectGlobalHealthLevel, selectHealthSnapshots } from "../healthSelectors";
import { useUxpNavigate } from "../../navigation/useUxpNavigate";

export type HealthMenuProps = {
    anchorEl: HTMLElement | null;
    onClose: () => void;
};

export const HealthMenu: React.FC<HealthMenuProps> = ({ anchorEl, onClose }) => {
    const [rechecking, setRechecking] = useState<string | null>(null);

    const handleRecheck = useCallback(async (id: string) => {
        setRechecking(id);
        try {
            await axiosInstance.post(`/platform-health/recheck/${id}`);
        } catch {
            // silent — the health snapshot will update via WS
        } finally {
            setRechecking(null);
        }
    }, []);

    const healthLevel = useSelector(selectGlobalHealthLevel);
    const healthSnapshots = useSelector(selectHealthSnapshots);
    const healthApps: SystemAppMeta[] = useSelector(selectHealthIndicatorApps)
    const uxpNavigate = useUxpNavigate();

    return (
        <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={onClose}
            slotProps={{
                paper: {
                    elevation: 3,
                    sx: { mt: 1, width: 360, maxWidth: "90vw" },
                },
            }}
        >
            <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle1">Health</Typography>
                <Typography variant="body2" color="text.secondary">
                    {healthLevel === "ok" && "All systems reporting OK."}
                    {healthLevel === "warn" && "Some warnings need attention."}
                    {healthLevel === "error" && "Errors detected."}
                    {healthLevel === "unknown" && "Some apps are not reporting."}
                </Typography>
            </Box>

            <Divider />

            {healthSnapshots.map((app) => {
                const items = app.items;
                const reporting = items !== undefined;
                const alertItems = items?.filter((i) => i.severity !== "ok");
                const appName = app.appId === "uxp"
                    ? "Platform"
                    : healthApps.find(a => a.appId === app.appId)?.appName ?? app.appId;

                if (!reporting) {
                    return (
                        <Box key={app.appId} sx={{ px: 2, py: 1 }}>
                            <Typography variant="subtitle2">{appName}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Status unknown (not reporting)
                            </Typography>
                        </Box>
                    );
                }

                if (!alertItems || alertItems.length === 0) {
                    return (
                        <Box key={app.appId} sx={{ px: 2, py: 1 }}>
                            <Typography variant="subtitle2">{appName}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                OK
                            </Typography>
                        </Box>
                    );
                }

                return (
                    <Box key={app.appId}>
                        <Box sx={{ px: 2, pt: 1 }}>
                            <Typography variant="subtitle2">{appName}</Typography>
                        </Box>

                        {alertItems!.map((n) => (
                            <Box key={n.id} sx={{ px: 2, py: 1 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Box
                                        sx={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: "50%",
                                            bgcolor:
                                                n.severity === "error"
                                                    ? "error.main"
                                                    : n.severity === "warn"
                                                        ? "warning.main"
                                                        : "text.disabled",
                                        }}
                                    />
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                        {n.message}
                                    </Typography>
                                </Box>

                                <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                                    {n.action && (
                                        <Button size="small"
                                            onClick={() => {
                                                uxpNavigate(n.action!.target);
                                                onClose();
                                            }}>
                                            {n.action.label}
                                        </Button>
                                    )}
                                    {app.appId === "uxp" && (
                                        <Button size="small"
                                            disabled={rechecking === n.id}
                                            onClick={() => handleRecheck(n.id)}>
                                            {rechecking === n.id ? "Checking..." : "Recheck"}
                                        </Button>
                                    )}
                                </Box>
                            </Box>
                        ))}
                    </Box>
                );
            })}
        </Menu>
    );
};
