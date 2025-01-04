import AccountCircle from "@mui/icons-material/AccountCircle";
import MenuIcon from "@mui/icons-material/Menu";
import {
    AppBar,
    Box,
    ClickAwayListener,
    Collapse,
    IconButton,
    Menu,
    MenuItem,
    Toolbar,
    Typography,
    useMediaQuery,
} from "@mui/material";
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useAppDispatch } from "../../../hooks";
import { selectLinksForHeaderMenu, selectLinksForProfileIcon } from "../../navigation/navigationSelectors";
import { selectIsLoggedInUser } from "../../user/userSelectors";
import { logout } from "../../user/userThunks";
import { useUxpTheme } from "../../theme/useUxpTheme";

const HeaderMenu: React.FC = () => {
    const dispatch = useAppDispatch();
    const theme = useUxpTheme();
    const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

    const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const toggleHeaderMenu = () => setHeaderMenuOpen(!headerMenuOpen);
    const closeHeaderMenu = () => setHeaderMenuOpen(false);
    const headerMenuLinks = useSelector(selectLinksForHeaderMenu());
    const profileIconLinks = useSelector(selectLinksForProfileIcon());

    const isLoggedInUser = useSelector(selectIsLoggedInUser());

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const doLogout = () => {
        handleMenuClose();
        dispatch(logout({}));
    };

    return (
        <>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    {!isDesktop && (
                        <IconButton color="inherit" edge="start" onClick={toggleHeaderMenu} sx={{ mr: 2 }}>
                            <MenuIcon />
                        </IconButton>
                    )}

                    <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
                        Unified Experience Platform
                    </Typography>

                    {isDesktop &&
                        headerMenuLinks.map((link) => (
                            <Typography
                                key={link.link}
                                component={Link}
                                to={link.link}
                                sx={{
                                    mx: 2,
                                    textDecoration: "none",
                                    color: "inherit",
                                    "&:hover": { textDecoration: "underline" },
                                }}
                            >
                                {link.label}
                            </Typography>
                        ))}

                    {isLoggedInUser && (
                        <IconButton color="inherit" onClick={handleMenuOpen} sx={{ ml: 2 }}>
                            <AccountCircle />
                        </IconButton>
                    )}
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleMenuClose}
                        slotProps={{
                            paper: {
                                elevation: 3,
                                sx: {
                                    mt: 1,
                                    "& .MuiMenuItem-root": { fontSize: "1rem" },
                                },
                            },
                        }}
                        MenuListProps={{
                            "aria-labelledby": "user-menu-button",
                        }}
                    >
                        {profileIconLinks.map(({ link, label }) => (
                            <MenuItem key={link} component={Link} to={link} onClick={handleMenuClose}>
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
            )}
        </>
    );
};

export default HeaderMenu;
