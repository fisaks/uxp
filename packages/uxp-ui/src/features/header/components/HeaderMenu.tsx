import AccountCircle from "@mui/icons-material/AccountCircle";
import MenuIcon from "@mui/icons-material/Menu";
import { AppBar, Box, Button, ClickAwayListener, Collapse, Divider, IconButton, Menu, MenuItem, Toolbar, Typography, useMediaQuery } from "@mui/material";
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useAppDispatch } from "../../../hooks";
import { selectGlobalConfig } from "../../global-config/globalConfigSelectors";
import { selectLinksForHeaderMenu, selectLinksForProfileIcon } from "../../navigation/navigationSelectors";
import { useUxpTheme } from "../../theme/useUxpTheme";
import { selectIsLoggedInUser } from "../../user/userSelectors";
import { logout } from "../../user/userThunks";

import { SystemCenterTab } from "../systemCenter.types";
import { HeaderHealth } from "./HeaderHealth";
import { HeaderMenuDesktopLinks } from "./HeaderMenuDesktopLinks";
import { SystemCenterButton } from "./SystemCenterButton";
import { SystemCenterDrawer } from "./SystemCenterDrawer";


const HeaderMenu: React.FC = () => {
    const dispatch = useAppDispatch();
    const theme = useUxpTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

    const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
    const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);

    const [systemCenterOpen, setSystemCenterOpen] = useState(false);
    const [systemCenterTab, setSystemCenterTab] = useState(0);

    const toggleHeaderMenu = () => setHeaderMenuOpen(!headerMenuOpen);
    const closeHeaderMenu = () => setHeaderMenuOpen(false);

    const headerMenuLinks = useSelector(selectLinksForHeaderMenu);
    const profileIconLinks = useSelector(selectLinksForProfileIcon);
    const globalConfig = useSelector(selectGlobalConfig);
    const isLoggedInUser = useSelector(selectIsLoggedInUser());


    const openProfileMenu = (event: React.MouseEvent<HTMLElement>) => {
        setProfileAnchorEl(event.currentTarget);
    };

    const closeProfileMenu = () => {
        setProfileAnchorEl(null);
    };

    const doLogout = () => {
        closeProfileMenu();
        dispatch(logout({}));
    };

    const systemTabs: SystemCenterTab[] = useMemo(
        () => [
            {
                appId: "uhn",
                appName: "UHN",
                content: (
                    <Box sx={{ p: 2 }}>
                        <Typography variant="subtitle1">UHN System</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            Static placeholder content.
                        </Typography>

                        <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                            <Button variant="contained">Enable debug mode</Button>
                            <Button variant="outlined">Restart runtime</Button>
                            <Button variant="outlined">Recompile blueprint</Button>
                        </Box>

                        <Divider sx={{ my: 2 }} />

                        <Typography variant="subtitle2">Nodes</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            🟢 Core service running<br />
                            🔴 Edge: Sauna unreachable
                        </Typography>
                    </Box>
                ),
            },
            {
                appId: "demo",
                appName: "Demo App",
                content: (
                    <Box sx={{ p: 2 }}>
                        <Typography variant="subtitle1">Demo System</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            Placeholder system panel for demo app.
                        </Typography>
                    </Box>
                ),
            },
        ],
        []
    );

    return (
        <>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    {!isDesktop && (
                        <IconButton color="inherit" edge="start" onClick={toggleHeaderMenu} sx={{ mr: 2 }}>
                            <MenuIcon />
                        </IconButton>
                    )}

                    <Typography variant="h6" noWrap title={globalConfig?.siteName}
                        sx={{
                            minWidth: 0,          // REQUIRED for ellipsis in flex
                            maxWidth: "100%",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                        }}
                    >
                        {globalConfig?.siteName ?? "Unified Experience Platform"}
                    </Typography>

                    <Box sx={{ flexGrow: 1, }}></Box>
                    {isDesktop && <HeaderMenuDesktopLinks headerMenuLinks={headerMenuLinks} />}

                    {isLoggedInUser && (
                        <>
                            <HeaderHealth />
                            <SystemCenterButton onClick={() => setSystemCenterOpen(true)} />
                            <IconButton color="inherit" onClick={openProfileMenu} sx={{ ml: 2 }}>
                                <AccountCircle />
                            </IconButton>
                        </>
                    )}
                    <Menu
                        anchorEl={profileAnchorEl}
                        open={Boolean(profileAnchorEl)}
                        onClose={closeProfileMenu}
                        slotProps={{
                            paper: {
                                elevation: 3,
                                sx: {
                                    mt: 1,
                                    "& .MuiMenuItem-root": { fontSize: "1rem" },
                                },
                            },
                            list: { "aria-labelledby": "profile-menu-button" },
                        }}
                    >
                        {profileIconLinks.map(({ link, label }) => (
                            <MenuItem key={link} component={Link} to={link} onClick={closeProfileMenu}>
                                {label}
                            </MenuItem>
                        ))}

                        <MenuItem onClick={doLogout} tabIndex={0}>
                            Logout
                        </MenuItem>
                    </Menu>

                </Toolbar>
            </AppBar>

            {!isDesktop && headerMenuOpen && (
                <ClickAwayListener onClickAway={closeHeaderMenu}>
                    <Collapse in={headerMenuOpen}>
                        <Box
                            sx={{
                                position: "fixed",
                                top: 64,
                                width: "100%",
                                maxHeight: "calc(100vh - 64px)", // Ensure the menu does not exceed the viewport height
                                overflowY: "auto", // Make the menu scrollable
                                bgcolor: "background.paper",
                                textAlign: "center",
                                boxShadow: 3,
                                zIndex: (theme) => theme.zIndex.drawer + 2,
                            }}
                        >
                            {headerMenuLinks.map(({ link, label }) => (
                                <Typography
                                    key={link}
                                    component={Link}
                                    to={link}
                                    sx={{
                                        display: "block",
                                        py: 2,
                                        fontSize: "1.2rem",
                                        textDecoration: "none",
                                        color: "primary.main",
                                        "&:hover": { color: "secondary.main" },
                                    }}
                                    onClick={closeHeaderMenu}
                                >
                                    {label}
                                </Typography>
                            ))}
                        </Box>
                    </Collapse>
                </ClickAwayListener>
            )
            }
            <SystemCenterDrawer
                open={systemCenterOpen}
                onClose={() => setSystemCenterOpen(false)}
                tabs={systemTabs}
                selectedTab={systemCenterTab}
                onTabChange={setSystemCenterTab}
            />
        </>
    );
};

export default HeaderMenu;
