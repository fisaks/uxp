import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ReadableWidth } from "../shared/ReadableWidth";
import { PlaylistListView } from "./PlaylistListView";
import { PlaylistView } from "./PlaylistView";

/** The playlists, and one playlist. The paths are relative to /playlists. */
const PlaylistsPage: React.FC = () => (
    <Routes>
        <Route
            index
            element={
                <ReadableWidth>
                    <PlaylistListView />
                </ReadableWidth>
            }
        />
        <Route
            path=":id"
            element={
                <ReadableWidth>
                    <PlaylistView />
                </ReadableWidth>
            }
        />
        <Route path="*" element={<Navigate to="/playlists" replace={true} />} />
    </Routes>
);

export default PlaylistsPage;
