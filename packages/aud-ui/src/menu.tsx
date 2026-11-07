import CastIcon from "@mui/icons-material/Cast";
import HistoryIcon from "@mui/icons-material/History";
import LibraryMusicIcon from "@mui/icons-material/LibraryMusic";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import PlaylistPlayIcon from "@mui/icons-material/PlaylistPlay";
import QueueMusicIcon from "@mui/icons-material/QueueMusic";
import TuneIcon from "@mui/icons-material/Tune";
import React from "react";

import { NOW_PLAYING_PATH } from "./features/player/nowPlayingPath";

export type MenuItem = { path: string; label: string; icon: React.ReactElement };

/** The places of the app: the tiles of the home page, and what the top bar calls the page you are on. */
export const MENU_ITEMS: MenuItem[] = [
    { path: NOW_PLAYING_PATH, label: "Now playing", icon: <PlayCircleOutlineIcon /> },
    { path: "/amplifier", label: "Amplifier", icon: <TuneIcon /> },
    { path: "/chromecast", label: "Chromecast", icon: <CastIcon /> },
    { path: "/library", label: "Library", icon: <LibraryMusicIcon /> },
    { path: "/playlists", label: "Playlists", icon: <PlaylistPlayIcon /> },
    { path: "/audiobooks", label: "Audiobooks", icon: <MenuBookIcon /> },
    { path: "/queue", label: "Queue", icon: <QueueMusicIcon /> },
    { path: "/history", label: "History", icon: <HistoryIcon /> },
];

export const HOME_PATH = "/";
export const HOME_LABEL = "Audio";
