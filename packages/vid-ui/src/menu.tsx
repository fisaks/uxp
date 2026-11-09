import CastIcon from "@mui/icons-material/Cast";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import React from "react";

export type MenuItem = { path: string; label: string; icon: React.ReactElement };

/** The places of the app: the tiles of the home page, and what the top bar calls the page you are on. */
export const MENU_ITEMS: MenuItem[] = [
    { path: "/home-videos", label: "Home videos", icon: <VideoLibraryIcon /> },
    { path: "/chromecasts", label: "Chromecasts", icon: <CastIcon /> },
    { path: "/playlists", label: "Playlists", icon: <PlaylistPlayIcon /> },
];

export const HOME_PATH = "/";
export const HOME_LABEL = "Video";
export const HOME_VIDEOS_PATH = MENU_ITEMS[0].path;
export const CHROMECASTS_PATH = MENU_ITEMS[1].path;
export const PLAYLISTS_PATH = MENU_ITEMS[2].path;

export const PLAYER_PATH = "/player";
export const playerPath = (deviceId: string) => `${PLAYER_PATH}/${encodeURIComponent(deviceId)}`;

/** The page of the player tab, opened in a window of its own without the header and the menus of the app. */
export const PLAYER_WINDOW_PATH = "/player-window";
