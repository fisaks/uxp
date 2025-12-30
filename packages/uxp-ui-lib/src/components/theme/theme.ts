import "@fontsource/roboto";
import { createTheme } from "@mui/material";
import type { Theme } from "@mui/material/styles";
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
    MuiTextField: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
          '& .MuiInputBase-root.Mui-disabled': {
            backgroundColor: 'transparent',
          },
          '& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.divider,
          },
          '& .MuiInputLabel-root.Mui-disabled': {
            color: theme.palette.text.secondary,
          },
          '& .MuiInputBase-input.Mui-disabled': {
            color: theme.palette.text.primary,
            WebkitTextFillColor: 'unset',
          },
        })
      }
    }
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
      warning: { main: "#e1d81e" },
      info: { main: "#8be9fd" },
      success: {
        main: "#5fd38d",
        light: "#8ee6b3",
        dark: "#3a9c66",
      },
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
      MuiIconButton: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            color: theme.palette.text.primary,

            "&:hover": {
              backgroundColor: theme.palette.action.hover,
            },

            "&.Mui-disabled": {
              color: theme.palette.action.disabled,
            },
          }),
        },

      },
    },
  })
);

export const starWarsDarkSideTheme = createTheme(
  deepmerge(baseTheme, {
    palette: {
      mode: "dark",
      primary: { main: "#ff3c3c" }, // Lightsaber red
      secondary: { main: "#9e0000" },
      background: {
        default: "#0d0d0d", // Death Star-like dark
        paper: "#1c1c1c",
      },
      text: {
        primary: "#e0e0e0",
        secondary: "#888",
      },
      error: { main: "#ff3c3c" },
      warning: { main: "#f57c00" },
      info: { main: "#0288d1" },
      success: {
        main: "#4f8f5a",
        light: "#7bb58a",
        dark: "#356b42",
      },
    },
    typography: {
      h1: { color: "#ff3c3c" },
      h2: { color: "#ff3c3c" },
      body1: { color: "#e0e0e0" },
      body2: { color: "#aaa" },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: "#1c1c1c",
            borderBottom: "1px solid #ff3c3c",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: "#0d0d0d",
            color: "#e0e0e0",
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            "&:hover": {
              backgroundColor: "#ff3c3c40",
              color: "#ff3c3c",
            },
            "&.Mui-focusVisible": {
              backgroundColor: "#ff3c3c80",
              color: "#ffffff",
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "uppercase",
            fontWeight: 600,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            color: theme.palette.text.primary,

            "&.Mui-disabled": {
              color: theme.palette.action.disabled,
            },
          }),
        }
      },

    },
  })
);

export const sunsetTheme = createTheme(
  deepmerge(baseTheme, {
    palette: {
      mode: "light",
      primary: { main: "#ff6f61" }, // Sunset orange
      secondary: { main: "#6a1b9a" }, // Twilight purple
      background: {
        default: "#fff8f0",
        paper: "#ffeedd",
      },
      text: {
        primary: "#4e342e", // Warm brown
        secondary: "#6a1b9a",
      },
      error: { main: "#d84315" },
      warning: { main: "#f9a825" },
      info: { main: "#4fc3f7" },
      success: {
        main: "#8fbf6a",
        light: "#b2d88e",
        dark: "#6a9446",
      },
    },
    typography: {
      h1: { color: "#6a1b9a" },
      h2: { color: "#ff6f61" },
      body1: { color: "#4e342e" },
      body2: { color: "#6a1b9a" },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: "linear-gradient(to right, #ff6f61, #fbc02d)",
            color: "#fff",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: "#fff3e0",
            color: "#4e342e",
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            "&:hover": {
              backgroundColor: "#ff6f6140",
              color: "#6a1b9a",
            },
            "&.Mui-focusVisible": {
              backgroundColor: "#fbc02d80",
              color: "#6a1b9a",
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: "16px",
            fontWeight: 500,
          },
        },
      },
    },
  })
);

export const rebelAllianceTheme = createTheme(
  deepmerge(baseTheme, {
    palette: {
      mode: "light",
      primary: { main: "#f57c00" }, // Rebel orange
      secondary: { main: "#0277bd" }, // Resistance blue
      background: {
        default: "#f4f4f4",
        paper: "#ffffff",
      },
      text: {
        primary: "#1c1c1c",
        secondary: "#616161",
      },
      error: { main: "#d32f2f" },
      warning: { main: "#fbc02d" },
      info: { main: "#0288d1" },
      success: {
        main: "#5fae64",
        light: "#8ed28f",
        dark: "#3e7f47",
      },
    },
    typography: {
      h1: { color: "#f57c00" },
      h2: { color: "#0277bd" },
      body1: { color: "#1c1c1c" },
      body2: { color: "#616161" },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: "#f57c00",
            color: "#fff",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: "#e3f2fd", // subtle blue
            color: "#1c1c1c",
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            "&:hover": {
              backgroundColor: "#f57c0040",
              color: "#f57c00",
            },
            "&.Mui-focusVisible": {
              backgroundColor: "#0277bd80",
              color: "#fff",
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 4,
            textTransform: "uppercase",
            fontWeight: 600,
          },
        },
      },
    },
  })
);
export const tatooineTheme = createTheme(
  deepmerge(baseTheme, {
    palette: {
      mode: "light",
      primary: { main: "#d4a373" }, // Sandy clay
      secondary: { main: "#a0522d" }, // Rich brown
      background: {
        default: "#fefae0", // Dune sand
        paper: "#fff5d7",
      },
      text: {
        primary: "#3e2723",
        secondary: "#6d4c41",
      },
      error: { main: "#bf360c" },
      warning: { main: "#f57f17" },
      info: { main: "#4e342e" },
      success: {
        main: "#7fa06a",
        light: "#a6bf8a",
        dark: "#5d7a4c",
      },
    },
    typography: {
      h1: { color: "#a0522d" },
      h2: { color: "#d4a373" },
      body1: { color: "#3e2723" },
      body2: { color: "#6d4c41" },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: "#a0522d",
            color: "#fff",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: "#fefae0",
            color: "#3e2723",
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            "&:hover": {
              backgroundColor: "#d4a37340",
              color: "#a0522d",
            },
            "&.Mui-focusVisible": {
              backgroundColor: "#a0522d80",
              color: "#fff",
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
          },
          containedPrimary: {
            backgroundColor: "#d4a373",
            color: "#3e2723",

            "&:hover": {
              backgroundColor: "#c68650",
            },
          },
        },
      },
    },
  })
);

export const windsOfWinterTheme = createTheme(
  deepmerge(baseTheme, {
    palette: {
      mode: "dark",
      primary: { main: "#90caf9" }, // Frozen sky blue
      secondary: { main: "#b0bec5" }, // Cold steel
      background: {
        default: "#1c1f26", // Night sky
        paper: "#2a2e38",   // Stone gray
      },
      text: {
        primary: "#e0e0e0",  // Pale snow
        secondary: "#90a4ae", // Misty gray
      },
      action: {
        disabled: "rgba(224,224,224,0.35)",          // readable but muted
        disabledBackground: "rgba(144,164,174,0.12)", // subtle frosty plate
        hover: "rgba(144,202,249,0.08)",               // icy hover
        selected: "rgba(144,202,249,0.16)",
      },
      error: { main: "#ef5350" },     // Red for blood
      warning: { main: "#ffa726" },   // Fire hazard
      info: { main: "#81d4fa" },      // Frosty blue
      success: {
        main: "#7fa8a3", // Frosted green
        light: "#a3c6c2", // Icy highlight
        dark: "#577c78",  // Cold pine shadow
      },   // Life in the snow

    },
    typography: {
      h1: { color: "#90caf9", fontWeight: 700 },
      h2: { color: "#b0bec5", fontWeight: 600 },
      body1: { color: "#e0e0e0" },
      body2: { color: "#90a4ae" },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: "linear-gradient(to right, #1c1f26, #2a2e38)",
            color: "#e0e0e0",
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: "#2a2e38",
            color: "#e0e0e0",
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            "&:hover": {
              backgroundColor: "#90caf940",
              color: "#90caf9",
            },
            "&.Mui-focusVisible": {
              backgroundColor: "#90caf980",
              color: "#ffffff",
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "uppercase",
            borderRadius: 4,
            fontWeight: 500,
            color: "#e0e0e0",
            backgroundColor: "#2a2e38",
            "&:hover": {
              backgroundColor: "#3a3f4b",
            },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: ({ theme }: { theme: Theme }) => ({
            color: theme.palette.text.primary,

            "&.Mui-disabled": {
              color: theme.palette.action.disabled,
            },
          }),
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: "#2a2e38",
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
