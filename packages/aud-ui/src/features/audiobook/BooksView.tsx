import { Alert, CircularProgress, List, ListItemButton, ListItemText } from "@mui/material";
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LibraryBreadcrumbs } from "../library/LibraryBreadcrumbs";
import { useRequest } from "../shared/useRequest";

export const BooksView: React.FC = () => {
    const navigate = useNavigate();
    const { authorId = "" } = useParams();
    const { data, error } = useRequest("audiobook_get_books", { artistId: authorId });

    if (error) return <Alert severity="error">{error}</Alert>;
    if (!data) return <CircularProgress size={24} />;

    return (
        <>
            <LibraryBreadcrumbs trail={[{ label: "Audiobooks", to: "/audiobooks" }]} current={data.artist.name} />
            <List disablePadding>
                {data.albums.map((book) => (
                    <ListItemButton key={book.id} onClick={() => navigate(`/audiobooks/book/${book.id}`)}>
                        <ListItemText primary={book.title} secondary={book.trackCount === 1 ? "1 part" : `${book.trackCount} parts`} />
                    </ListItemButton>
                ))}
            </List>
        </>
    );
};
