import { Alert, CircularProgress } from "@mui/material";
import React from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AlbumCover } from "./AlbumCover";
import { Tile, TileGrid } from "./TileGrid";
import { useRequest } from "../shared/useRequest";

export const AlbumsView: React.FC = () => {
    const navigate = useNavigate();
    const { artistId = "" } = useParams();
    const { data, error } = useRequest("library_get_albums", { artistId });

    if (error) return <Alert severity="error">{error}</Alert>;
    if (!data) return <CircularProgress size={24} />;
    // With a single one there is nothing to choose from, so the page is skipped, and Back goes to the list the artist was chosen in.
    if (data.albums.length === 1) return <Navigate to={`/library/album/${data.albums[0].id}`} replace />;

    return (
        <>
            <TileGrid>
                {data.albums.map((album) => (
                    <Tile
                        key={album.id}
                        picture={<AlbumCover collection="music" albumId={album.id} hasCover={album.hasCover} />}
                        title={album.title}
                        subtitle={[album.year, `${album.trackCount} tracks`].filter(Boolean).join(" · ")}
                        onClick={() => navigate(`/library/album/${album.id}`)}
                    />
                ))}
            </TileGrid>
        </>
    );
};
