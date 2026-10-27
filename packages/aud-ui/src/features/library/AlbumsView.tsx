import { Alert, Card, CardActionArea, CardContent, CircularProgress, Typography } from "@mui/material";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlbumCover } from "./AlbumCover";
import { LibraryBreadcrumbs } from "./LibraryBreadcrumbs";
import { useLibraryRequest } from "./useLibraryRequest";

export const AlbumsView: React.FC = () => {
    const navigate = useNavigate();
    const { artistId = "" } = useParams();
    const { data, error } = useLibraryRequest("library_get_albums", { artistId });

    if (error) return <Alert severity="error">{error}</Alert>;
    if (!data) return <CircularProgress size={24} />;

    return (
        <>
            <LibraryBreadcrumbs trail={[{ label: "Library", to: "/library" }]} current={data.artist.name} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 16 }}>
                {data.albums.map((album) => (
                    <Card key={album.id}>
                        <CardActionArea onClick={() => navigate(`/library/album/${album.id}`)}>
                            <AlbumCover albumId={album.id} hasCover={album.hasCover} />
                            <CardContent sx={{ p: 1.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, overflowWrap: "anywhere" }}>
                                    {album.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {[album.year, `${album.trackCount} tracks`].filter(Boolean).join(" · ")}
                                </Typography>
                            </CardContent>
                        </CardActionArea>
                    </Card>
                ))}
            </div>
        </>
    );
};
