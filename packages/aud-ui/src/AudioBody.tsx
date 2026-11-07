import { Box } from "@mui/material";
import { AppBodyContent } from "@uxp/ui-lib";
import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AudioNavigation } from "./AudioNavigation";
import AudiobooksPage from "./features/audiobook/AudiobooksPage";
import AmplifierPage from "./features/amplifier/AmplifierPage";
import ChromecastPage from "./features/chromecast/ChromecastPage";
import HistoryPage from "./features/history/HistoryPage";
import { HomePage } from "./features/home/HomePage";
import LibraryPage from "./features/library/LibraryPage";
import { NOW_PLAYING_PATH } from "./features/player/nowPlayingPath";
import { BottomDock, DOCK_ROOM } from "./features/player/BottomDock";
import PlaylistsPage from "./features/playlist/PlaylistsPage";
import NowPlayingPage from "./features/player/NowPlayingPage";
import QueuePage from "./features/player/QueuePage";
import { SearchPage } from "./features/search/SearchPage";
import { ReadableWidth } from "./features/shared/ReadableWidth";
import { SEARCH_PATH } from "./features/search/searchPath";
import { HOME_PATH } from "./menu";

export const AudioBody = () => {
    const { pathname } = useLocation();
    // The room for the page scrollbar is always kept, so the centred pages do not move sideways when one is long enough to scroll.
    useEffect(() => {
        const root = document.documentElement;
        const before = root.style.scrollbarGutter;
        root.style.scrollbarGutter = "stable";
        return () => {
            root.style.scrollbarGutter = before;
        };
    }, []);
    return (
        <AppBodyContent appHaveOwnLeftSideBar={false}>
            <Box sx={{ pb: pathname === NOW_PLAYING_PATH ? 0 : DOCK_ROOM }}>
                <AudioNavigation />
                <Routes>
                    <Route
                        path={HOME_PATH}
                        element={
                            <ReadableWidth>
                                <HomePage />
                            </ReadableWidth>
                        }
                    />
                    <Route
                        path="/amplifier"
                        element={
                            <ReadableWidth>
                                <AmplifierPage />
                            </ReadableWidth>
                        }
                    />
                    <Route
                        path="/chromecast"
                        element={
                            <ReadableWidth>
                                <ChromecastPage />
                            </ReadableWidth>
                        }
                    />
                    <Route path="/library/*" element={<LibraryPage />} />
                    <Route path="/audiobooks/*" element={<AudiobooksPage />} />
                    <Route path="/playlists/*" element={<PlaylistsPage />} />
                    <Route
                        path={SEARCH_PATH}
                        element={
                            <ReadableWidth>
                                <SearchPage />
                            </ReadableWidth>
                        }
                    />
                    <Route path={NOW_PLAYING_PATH} element={<NowPlayingPage />} />
                    <Route
                        path="/queue"
                        element={
                            <ReadableWidth>
                                <QueuePage />
                            </ReadableWidth>
                        }
                    />
                    <Route
                        path="/history"
                        element={
                            <ReadableWidth>
                                <HistoryPage />
                            </ReadableWidth>
                        }
                    />
                    <Route path="*" element={<Navigate to={HOME_PATH} replace={true} />} />
                </Routes>
            </Box>
            <BottomDock />
        </AppBodyContent>
    );
};
