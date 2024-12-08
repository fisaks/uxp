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
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useAppDispatch } from "../../../hooks";
import { selectIsLoading } from "../../loading/loadingSelectors";
import { selectIsLoggedInUser } from "../../user/userSelectors";
import { logout } from "../../user/userThunks";
import { selectHeaderMenuItems } from "../headerMenuSelectors";
import { fetchMenuItems } from "../headerMenuThunk";

interface HeaderMenuProps {
    isDesktop: boolean;
}

const HeaderMenu: React.FC<HeaderMenuProps> = ({ isDesktop }) => {
    const dispatch = useAppDispatch();
    const fetchMenuItemsLoading = useSelector(selectIsLoading("header/fetchMenuItems"));
    const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const toggleHeaderMenu = () => setHeaderMenuOpen(!headerMenuOpen);
    const closeHeaderMenu = () => setHeaderMenuOpen(false);
    const headerMenuItems = useSelector(selectHeaderMenuItems());
    const isLoggedInUser = useSelector(selectIsLoggedInUser());

    useEffect(() => {
        dispatch(fetchMenuItems({}));
        console.log("FO header", isLoggedInUser);
    }, [dispatch, isLoggedInUser]);

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
                        Responsive UI
                    </Typography>

                    {isDesktop &&
                        headerMenuItems.map(({ name, url }) => (
                            <Typography
                                key={name}
                                component={Link}
                                to={url}
                                sx={{
                                    mx: 2,
                                    textDecoration: "none",
                                    color: "inherit",
                                    "&:hover": { textDecoration: "underline" },
                                }}
                            >
                                {name}
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
                        <MenuItem
                            component={Link}
                            to="/profile"
                            tabIndex={0}
                            onClick={(event) => {
                                handleMenuClose(); // Close the menu
                            }}
                        >
                            My Profile
                        </MenuItem>
                        <MenuItem
                            component={Link}
                            to="/my-settings"
                            tabIndex={0}
                            onClick={(event) => {
                                handleMenuClose(); // Close the menu
                            }}
                        >
                            My Settings
                        </MenuItem>

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
                                position: "absolute",
                                top: 64,
                                width: "100%",
                                bgcolor: "background.paper",
                                textAlign: "center",
                                boxShadow: 3,
                                zIndex: (theme) => theme.zIndex.drawer + 2,
                            }}
                        >
                            {headerMenuItems.map(({ name, url }) => (
                                <Typography
                                    key={name}
                                    component={Link}
                                    to={url}
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
                                    {name}
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
