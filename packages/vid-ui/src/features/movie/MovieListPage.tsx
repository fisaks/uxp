import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import React from "react";
import { PAGE_WIDTH } from "../shared/pageWidth";
import { useRestoreScroll } from "../shared/useRestoreScroll";
import { useGetMovieItemsQuery } from "./movie.api";
import { MovieSectionCategory, moviePath } from "./movieSections";
import { MovieTile } from "./MovieTile";
import { TmdbAttribution } from "./TmdbAttribution";

/** The films of a category as a grid of posters, by title. */
export const MovieListPage: React.FC<{ category: MovieSectionCategory }> = ({ category }) => {
    const { data: items, isError } = useGetMovieItemsQuery(category);
    useRestoreScroll(items !== undefined);

    if (isError) return <Alert severity="error">The films could not be read.</Alert>;
    if (!items) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;

    return (
        <Box sx={{ p: { xs: 0, sm: 2 }, maxWidth: PAGE_WIDTH, mx: "auto" }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {items.length} {items.length === 1 ? "film" : "films"}
            </Typography>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
                {items.map((item) => (
                    <MovieTile key={item.id} item={item} to={moviePath(category, item.id)} />
                ))}
            </Box>
            <TmdbAttribution />
        </Box>
    );
};
