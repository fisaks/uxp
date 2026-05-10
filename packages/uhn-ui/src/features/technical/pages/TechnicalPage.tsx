import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DescriptionIcon from "@mui/icons-material/Description";
import HubIcon from "@mui/icons-material/Hub";
import ImageIcon from "@mui/icons-material/Image";
import KeyIcon from "@mui/icons-material/Key";
import MemoryIcon from "@mui/icons-material/Memory";
import MovieIcon from "@mui/icons-material/Movie";
import ViewQuiltIcon from "@mui/icons-material/ViewQuilt";
import SettingsIcon from "@mui/icons-material/Settings";
import { Box, Card, CardActionArea, CardContent, Grid2, Typography } from "@mui/material";
import { selectCurrentUser } from "@uxp/ui-lib";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

type TechnicalCardItem = {
    title: string;
    description: string;
    icon: React.ReactNode;
    to: string;
    adminOnly?: boolean;
};

const technicalItems: TechnicalCardItem[] = [
    {
        title: "Blueprints",
        description: "View and manage uploaded blueprints",
        icon: <DescriptionIcon sx={{ fontSize: 40 }} />,
        to: "/technical/blueprints",
        adminOnly: true,
    },
    {
        title: "Upload Blueprint",
        description: "Upload a new blueprint .zip file",
        icon: <CloudUploadIcon sx={{ fontSize: 40 }} />,
        to: "/technical/blueprints/upload",
        adminOnly: true,
    },
    {
        title: "Icons",
        description: "Preview available blueprint icons",
        icon: <ImageIcon sx={{ fontSize: 40 }} />,
        to: "/technical/blueprints/icons",
    },
    {
        title: "API Tokens",
        description: "Create and manage API access tokens",
        icon: <KeyIcon sx={{ fontSize: 40 }} />,
        to: "/technical/api-tokens",
        adminOnly: true,
    },
    {
        title: "Resources",
        description: "View all runtime resources and their states",
        icon: <MemoryIcon sx={{ fontSize: 40 }} />,
        to: "/technical/resources",
    },
    {
        title: "Views",
        description: "View all interaction views and their states",
        icon: <ViewQuiltIcon sx={{ fontSize: 40 }} />,
        to: "/technical/views",
    },
    {
        title: "Scenes",
        description: "View and trigger defined scenes",
        icon: <MovieIcon sx={{ fontSize: 40 }} />,
        to: "/technical/scenes",
    },
    {
        title: "Rules",
        description: "View all rules, triggers, and execution targets",
        icon: <AccountTreeIcon sx={{ fontSize: 40 }} />,
        to: "/technical/rules",
    },
    {
        title: "Schedules",
        description: "Time-based automation schedules and mute control",
        icon: <AccessTimeIcon sx={{ fontSize: 40 }} />,
        to: "/technical/schedules",
    },
    {
        title: "Topic Trace",
        description: "MQTT/WebSocket message trace viewer",
        icon: <HubIcon sx={{ fontSize: 40 }} />,
        to: "/technical/topic-trace",
        adminOnly: true,
    },
];

export const TechnicalPage: React.FC = () => {
    const user = useSelector(selectCurrentUser);
    const isAdmin = user?.roles.includes("admin");

    const visibleItems = useMemo(
        () => technicalItems.filter((item) => !item.adminOnly || isAdmin),
        [isAdmin],
    );

    return (
        <Box sx={{ maxWidth: 1200, mx: "auto" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <SettingsIcon sx={{ color: "primary.main" }} />
                <Typography variant="h1">Technical</Typography>
            </Box>
            <Box mt={2}>
                <Grid2 container spacing={2} sx={{ width: "100%", margin: 0 }}>
                    {visibleItems.map((item) => (
                        <Grid2 key={item.to} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                            <Card
                                variant="outlined"
                                sx={{
                                    height: "100%",
                                    borderRadius: 3,
                                    transition: "box-shadow 0.2s",
                                    "&:hover": { boxShadow: 4 },
                                }}
                            >
                                <CardActionArea
                                    component={Link}
                                    to={item.to}
                                    sx={{
                                        height: "100%",
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        p: 3,
                                    }}
                                >
                                    <CardContent
                                        sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            textAlign: "center",
                                        }}
                                    >
                                        <Box sx={{ color: "primary.main", mb: 1.5 }}>
                                            {item.icon}
                                        </Box>
                                        <Typography variant="h6" gutterBottom>
                                            {item.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {item.description}
                                        </Typography>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        </Grid2>
                    ))}
                </Grid2>
            </Box>
        </Box>
    );
};
