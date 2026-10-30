import { createSelector } from "@reduxjs/toolkit";
import { PlaylistSummary } from "@aud/common";
import { RootState } from "../../app/store";
import { requestKey } from "../shared/requestKey";

const PLAYLIST_LIST_KEY = requestKey("playlist_list", {});

/** The playlists as the last answer of the server has them, when it has answered. */
const selectPlaylistList = (state: RootState) => state.requestCache.answers[PLAYLIST_LIST_KEY] as PlaylistSummary[] | undefined;

/** The playlist that was changed last, which is where tracks are most likely to go. */
export const selectMostRecentPlaylist = createSelector(
    [selectPlaylistList],
    (playlists): PlaylistSummary | undefined => [...(playlists ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
);
