import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import React from "react";

export type MenuItem = { path: string; label: string; icon: React.ReactElement };

/** The places of the app: the tiles of the home page, and what the top bar calls the page you are on. */
export const MENU_ITEMS: MenuItem[] = [{ path: "/home-videos", label: "Home videos", icon: <VideoLibraryIcon /> }];

export const HOME_PATH = "/";
export const HOME_LABEL = "Video";
export const HOME_VIDEOS_PATH = MENU_ITEMS[0].path;
