import { Box, Button, Divider, Menu, Typography } from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";
import type { AppHealthSnapshot, HealthLevel } from "../health.types";

export type HealthMenuProps = {
    anchorEl: HTMLElement | null;
    onClose: () => void;
    level: HealthLevel;
    snapshots: AppHealthSnapshot[];
};

export const HealthMenu: React.FC<HealthMenuProps> = ({ anchorEl, onClose, level, snapshots }) => {
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
                    {level === "ok" && "All systems reporting OK."}
                    {level === "warning" && "Some warnings need attention."}
                    {level === "error" && "Errors detected."}
                    {level === "unknown" && "Some apps are not reporting."}
                </Typography>
            </Box>

            <Divider />

            {snapshots.map((app) => {
                const items = app.items;
                const reporting = items !== undefined;

                if (!reporting) {
                    return (
                        <Box key={app.appId} sx={{ px: 2, py: 1 }}>
                            <Typography variant="subtitle2">{app.appName}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Status unknown (not reporting)
                            </Typography>
                        </Box>
                    );
                }

                if (items.length === 0) {
                    return (
                        <Box key={app.appId} sx={{ px: 2, py: 1 }}>
                            <Typography variant="subtitle2">{app.appName}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                OK
                            </Typography>
                        </Box>
                    );
                }

                return (
                    <Box key={app.appId}>
                        <Box sx={{ px: 2, pt: 1 }}>
                            <Typography variant="subtitle2">{app.appName}</Typography>
                        </Box>

                        {items.map((n) => (
                            <Box key={n.id} sx={{ px: 2, py: 1 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Box
                                        sx={{
                                            width: 10,
                                            height: 10,
                                            borderRadius: "50%",
                                            bgcolor:
                                                n.level === "error"
                                                    ? "error.main"
                                                    : n.level === "warning"
                                                        ? "warning.main"
                                                        : "text.disabled",
                                        }}
                                    />
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                        {n.title}
                                    </Typography>
                                </Box>

                                {n.message && (
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                        {n.message}
                                    </Typography>
                                )}

                                {n.action && (
                                    <Box sx={{ mt: 1 }}>
                                        <Button size="small" component={Link} to={n.action.to} onClick={onClose}>
                                            {n.action.label}
                                        </Button>
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Box>
                );
            })}
        </Menu>
    );
};
