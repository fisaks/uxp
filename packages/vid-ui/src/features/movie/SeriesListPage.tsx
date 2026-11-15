import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import React, { useMemo } from "react";
import { PAGE_WIDTH } from "../shared/pageWidth";
import { useRestoreScroll } from "../shared/useRestoreScroll";
import { useGetMovieItemsQuery } from "./movie.api";
import { MovieTile } from "./MovieTile";
import { groupSeries } from "./series";
import { seriesPath } from "./movieSections";
import { TmdbAttribution } from "./TmdbAttribution";

/** The series as a grid of posters, by name. */
export const SeriesListPage: React.FC = () => {
    const { data: items, isError } = useGetMovieItemsQuery("tv");
    const series = useMemo(() => groupSeries(items ?? []), [items]);
    useRestoreScroll(items !== undefined);

    if (isError) return <Alert severity="error">The series could not be read.</Alert>;
    if (!items) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 4 }} />;

    return (
        <Box sx={{ p: { xs: 0, sm: 2 }, maxWidth: PAGE_WIDTH, mx: "auto" }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {series.length} series
            </Typography>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
                {series.map(({ name, episodes }) => (
                    <MovieTile
                        key={name}
                        item={episodes[0]}
                        to={seriesPath(name)}
                        title={name}
                        caption={`${episodes.length} ${episodes.length === 1 ? "episode" : "episodes"}`}
                    />
                ))}
            </Box>
            <TmdbAttribution />
        </Box>
    );
};
