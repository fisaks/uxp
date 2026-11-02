import { Alert, CircularProgress } from "@mui/material";
import React from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AlbumCover } from "../library/AlbumCover";
import { Tile, TileGrid } from "../library/TileGrid";
import { useRequest } from "../shared/useRequest";

export const BooksView: React.FC = () => {
    const navigate = useNavigate();
    const { authorId = "" } = useParams();
    const { data, error } = useRequest("audiobook_get_books", { artistId: authorId });

    if (error) return <Alert severity="error">{error}</Alert>;
    if (!data) return <CircularProgress size={24} />;
    // With a single one there is nothing to choose from, so the page is skipped, and Back goes to the list the artist was chosen in.
    if (data.albums.length === 1) return <Navigate to={`/audiobooks/book/${data.albums[0].id}`} replace />;

    return (
        <>
            <TileGrid>
                {data.albums.map((book) => (
                    <Tile
                        key={book.id}
                        picture={<AlbumCover collection="audiobooks" albumId={book.id} hasCover={book.hasCover} />}
                        title={book.title}
                        subtitle={book.trackCount === 1 ? "1 part" : `${book.trackCount} parts`}
                        onClick={() => navigate(`/audiobooks/book/${book.id}`)}
                    />
                ))}
            </TileGrid>
        </>
    );
};
