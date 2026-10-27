import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AlbumsView } from "./AlbumsView";
import { ArtistsView } from "./ArtistsView";
import { TracksView } from "./TracksView";

/** The library: artists, then the albums of an artist, then the tracks of an album. The paths are relative to /library. */
const LibraryPage: React.FC = () => (
    <Routes>
        <Route index element={<ArtistsView />} />
        <Route path="artist/:artistId" element={<AlbumsView />} />
        <Route path="album/:albumId" element={<TracksView />} />
        <Route path="*" element={<Navigate to="/library" replace={true} />} />
    </Routes>
);

export default LibraryPage;
