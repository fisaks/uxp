import { Collection, LibraryArtist } from "@aud/common";
import React, { useEffect, useState } from "react";
import { ALPHABET_SCROLL_MARGIN, AlphabetBar, letterAnchorId, letterOf } from "./AlphabetBar";
import { CoverMosaic } from "./CoverMosaic";
import { Tile, TileGrid } from "./TileGrid";

/** How long the tile that was jumped to keeps its frame. */
const HIGHLIGHT_MS = 2000;

type ArtistGridProps = {
    collection: Collection;
    artists: LibraryArtist[];
    /** What an album of the artist is called: "album" or "book". */
    unit: string;
    onOpen: (artist: LibraryArtist) => void;
};

/** The artists (or authors) as tiles with a picture made of their covers, under an A-Z bar. They are in order of name. */
export const ArtistGrid: React.FC<ArtistGridProps> = ({ collection, artists, unit, onOpen }) => {
    const [jumpedTo, setJumpedTo] = useState<string>();
    useEffect(() => {
        if (!jumpedTo) return;
        const timer = setTimeout(() => setJumpedTo(undefined), HIGHLIGHT_MS);
        return () => clearTimeout(timer);
    }, [jumpedTo]);
    const letters = [...new Set(artists.map((artist) => letterOf(artist.name)))];
    const firstOfLetter = new Set(letters.map((letter) => artists.find((artist) => letterOf(artist.name) === letter)!.id));
    return (
        <>
            <AlphabetBar letters={letters} onJump={setJumpedTo} />
            <TileGrid>
                {artists.map((artist) => (
                    <Tile
                        key={artist.id}
                        anchorId={firstOfLetter.has(artist.id) ? letterAnchorId(letterOf(artist.name)) : undefined}
                        scrollMarginTop={ALPHABET_SCROLL_MARGIN}
                        highlighted={firstOfLetter.has(artist.id) && letterOf(artist.name) === jumpedTo}
                        picture={<CoverMosaic collection={collection} albumIds={artist.coverAlbumIds} />}
                        title={artist.name}
                        subtitle={`${artist.albumCount} ${unit}${artist.albumCount === 1 ? "" : "s"}`}
                        onClick={() => onOpen(artist)}
                    />
                ))}
            </TileGrid>
        </>
    );
};
