import { Box, ButtonBase, Typography } from "@mui/material";
import { MovieItem } from "@vid/common";
import MovieIcon from "@mui/icons-material/Movie";
import React from "react";
import { Link } from "react-router-dom";
import { formatRating, movieName } from "./movieFormat";
import { MovieSectionCategory, moviePath } from "./movieSections";
import { posterUrl } from "./movieUrls";

/** A poster with the title under it. A film without a poster shows a picture of a film. */
export const MovieTile: React.FC<{ item: MovieItem; category: MovieSectionCategory }> = ({ item, category }) => {
    const rating = formatRating(item.rating);
    return (
        <ButtonBase
            component={Link}
            to={moviePath(category, item.id)}
            sx={{
                display: "block",
                textAlign: "left",
                width: "100%",
                "&:hover .poster, &:focus-visible .poster": { boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}` },
                "&:hover img, &:focus-visible img": { transform: "scale(1.04)" },
            }}
        >
            <Box
                className="poster"
                sx={{
                    transition: "box-shadow 0.15s",
                    aspectRatio: "2 / 3",
                    bgcolor: "action.hover",
                    borderRadius: 1,
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {item.hasPoster ? (
                    <Box
                        component="img"
                        src={posterUrl(item.id)}
                        alt=""
                        loading="lazy"
                        sx={{ display: "block", width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.2s" }}
                    />
                ) : (
                    <MovieIcon color="disabled" sx={{ fontSize: 48 }} />
                )}
            </Box>
            <Typography variant="body2" noWrap sx={{ mt: 0.5 }}>
                {item.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap component="div">
                {[item.year, rating && `★ ${rating}`].filter(Boolean).join(" · ")}
            </Typography>
        </ButtonBase>
    );
};
