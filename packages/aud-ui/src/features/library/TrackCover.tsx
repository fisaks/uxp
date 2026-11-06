import { QueueTrack } from "@aud/common";
import React from "react";
import { AlbumCover } from "./AlbumCover";

/** The cover of a track of the queue: the one of its album in the library, or for a track of Spotify its own picture, marked as Spotify's. */
export const TrackCover: React.FC<{ track: QueueTrack }> = ({ track }) =>
    track.spotify ? (
        <AlbumCover collection="music" albumId="" hasCover={!!track.spotify.coverUrl} imageUrl={track.spotify.coverUrl} banner="Spotify" />
    ) : (
        <AlbumCover collection={track.collection} albumId={track.albumId} hasCover={track.hasCover} />
    );
