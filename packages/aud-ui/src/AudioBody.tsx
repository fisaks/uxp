import { Box } from "@mui/material";
import { AppBodyContent } from "@uxp/ui-lib";
import { Navigate, Route, Routes } from "react-router-dom";
import { AudioNavigation } from "./AudioNavigation";
import AudiobooksPage from "./features/audiobook/AudiobooksPage";
import AmplifierPage from "./features/amplifier/AmplifierPage";
import HistoryPage from "./features/history/HistoryPage";
import LibraryPage from "./features/library/LibraryPage";
import { BottomDock } from "./features/player/BottomDock";
import PlaylistsPage from "./features/playlist/PlaylistsPage";
import QueuePage from "./features/player/QueuePage";

export const AudioBody = () => {
    return (
        <AppBodyContent appHaveOwnLeftSideBar={false}>
            <Box sx={{ maxWidth: 900, mx: "auto" }}>
                <AudioNavigation />
                <Routes>
                    <Route path="/amplifier" element={<AmplifierPage />} />
                    <Route path="/library/*" element={<LibraryPage />} />
                    <Route path="/audiobooks/*" element={<AudiobooksPage />} />
                    <Route path="/playlists/*" element={<PlaylistsPage />} />
                    <Route path="/queue" element={<QueuePage />} />
                    <Route path="/history" element={<HistoryPage />} />
                    <Route path="*" element={<Navigate to="/amplifier" replace={true} />} />
                </Routes>
                <BottomDock />
            </Box>
        </AppBodyContent>
    );
};
