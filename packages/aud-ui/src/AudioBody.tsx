import { Box } from "@mui/material";
import { AppBodyContent } from "@uxp/ui-lib";
import { Navigate, Route, Routes } from "react-router-dom";
import { AudioNavigation } from "./AudioNavigation";
import AmplifierPage from "./features/amplifier/AmplifierPage";
import LibraryPage from "./features/library/LibraryPage";
import { NowPlayingBar } from "./features/player/NowPlayingBar";
import { PlayerErrorSnackbar } from "./features/player/PlayerErrorSnackbar";
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
                    <Route path="/playlists/*" element={<PlaylistsPage />} />
                    <Route path="/queue" element={<QueuePage />} />
                    <Route path="*" element={<Navigate to="/amplifier" replace={true} />} />
                </Routes>
                <NowPlayingBar />
                <PlayerErrorSnackbar />
            </Box>
        </AppBodyContent>
    );
};
