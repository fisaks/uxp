import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PlaylistListView } from "./PlaylistListView";
import { PlaylistView } from "./PlaylistView";

/** The playlists, and one playlist. The paths are relative to /playlists. */
const PlaylistsPage: React.FC = () => (
    <Routes>
        <Route index element={<PlaylistListView />} />
        <Route path=":id" element={<PlaylistView />} />
        <Route path="*" element={<Navigate to="/playlists" replace={true} />} />
    </Routes>
);

export default PlaylistsPage;
