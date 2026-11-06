import SearchIcon from "@mui/icons-material/Search";
import { Alert, Box, CircularProgress } from "@mui/material";
import React from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AlbumCover } from "./AlbumCover";
import { Tile, TileGrid } from "./TileGrid";
import { useRequest } from "../shared/useRequest";
import { searchPagePath } from "../search/searchPath";
import { useRestoreScroll } from "../shared/useRestoreScroll";

export const AlbumsView: React.FC = () => {
    const navigate = useNavigate();
    const { artistId = "" } = useParams();
    const { data, error } = useRequest("library_get_albums", { artistId });
    useRestoreScroll(data !== undefined);

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
                <Tile
                    picture={
                        <Box sx={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "action.hover", color: "text.disabled" }}>
                            <SearchIcon sx={{ width: "40%", height: "auto" }} />
                        </Box>
                    }
                    title={`More from ${data.artist.name}`}
                    onClick={() => navigate(searchPagePath(data.artist.name))}
                />
            </TileGrid>
        </>
    );
};
