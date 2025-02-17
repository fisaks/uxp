import "@fontsource/roboto";
import { createTheme } from "@mui/material";
import { deepmerge } from "@mui/utils";

// Base theme with common settings
const baseTheme = createTheme({
    typography: {
        fontFamily: "'Roboto', 'Arial', sans-serif",
        h1: {
            fontSize: "2.0rem", // 32px
            fontWeight: 700,
            lineHeight: 1.3,
        },
        h2: {
            fontSize: "1.75rem", 
            fontWeight: 600,
            lineHeight: 1.3,
        },
        h3: {
            fontSize: "1.5rem", 
            fontWeight: 500,
            lineHeight: 1.4,
        },
        h4: {
            fontSize: "1.25rem", 
            fontWeight: 500,
            lineHeight: 1.5,
        },
        h5: {
            fontSize: "1.125rem",
            fontWeight: 400,
            lineHeight: 1.6,
        },
        h6: {
            fontSize: "1rem", 
            fontWeight: 400,
            lineHeight: 1.7,
        },
    },
    components: {
        MuiListItem: {
            styleOverrides: {
                root: {
                    "&:hover": {
                        backgroundColor: "#1976d240",
                        color: "#1976d2",
                    },
                    "&.Mui-focusVisible": {
                        backgroundColor: "#1976d280",
                        color: "#ffffff",
                    },
                },
            },
        },
    },
});

// Dracula theme
export const draculaTheme = createTheme(
    deepmerge(baseTheme, {
        palette: {
            mode: "dark",
            primary: { main: "#bd93f9" },
            secondary: { main: "#ff79c6" },
            background: {
                default: "#282a36",
                paper: "#44475a",
            },
            text: {
                primary: "#f8f8f2",
                secondary: "#6272a4",
            },
            error: { main: "#ff5555" },
            warning: { main: "#f1fa8c" },
            info: { main: "#8be9fd" },
            success: { main: "#50fa7b" },
        },
        typography: {
            body1: {
                color: "#f8f8f2",
            },
            body2: {
                color: "#6272a4",
            },
        },
        components: {
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundColor: "#44475a",
                    },
                },
            },
            MuiDrawer: {
                styleOverrides: {
                    paper: {
                        backgroundColor: "#282a36",
                        color: "#f8f8f2",
                    },
                },
            },
            MuiListItem: {
                styleOverrides: {
                    root: {
                        "&:hover": {
                            backgroundColor: "#6272a440",
                            color: "#bd93f9",
                        },
                        "&.Mui-focusVisible": {
                            backgroundColor: "#6272a480",
                            color: "#50fa7b",
                        },
                    },
                },
            },
            MuiSvgIcon: {
                styleOverrides: {
                    root: {
                        color: "#f8f8f2", // Default icon color (Dracula foreground)
                    },
                },
            },
            MuiIconButton: {
                styleOverrides: {
                    root: {
                        color: "#f8f8f2", // IconButton color override
                    },
                },
            },
        },
    })
);

// Default theme
export const defaultTheme = createTheme(
    deepmerge(baseTheme, {
        palette: {
            mode: "light",
            primary: { main: "#1976d2" },
            secondary: { main: "#ff4081" },
            background: {
                default: "#f5f5f5",
                paper: "#ffffff",
            },
        },
    })
);
