import { Playlist, PlaylistRenameRequest, PlaylistSaveRequest } from "@vid/common";
import { apiUrl } from "../../api/home-video-api";
import { vidApi } from "../../app/vidApi";

export const playlistApi = vidApi.injectEndpoints({
    endpoints: (builder) => {
        /** Every change answers with the playlists as they are after it, which replace what is cached. */
        const change = <Arg>(request: (arg: Arg) => { url: string; method: "POST" | "PATCH" | "DELETE"; data?: object }) =>
            builder.mutation<Playlist[], Arg>({
                query: request,
                onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
                    try {
                        const { data } = await queryFulfilled;
                        dispatch(playlistApi.util.updateQueryData("getPlaylists", undefined, () => data));
                    } catch {
                        // The caller says what went wrong, from the result of the mutation.
                    }
                },
            });

        return {
            getPlaylists: builder.query<Playlist[], void>({ query: () => ({ url: apiUrl("playlists") }) }),
            savePlaylist: change<PlaylistSaveRequest>((data) => ({ url: apiUrl("playlists"), method: "POST", data })),
            renamePlaylist: change<{ id: string } & PlaylistRenameRequest>(({ id, name }) => ({
                url: apiUrl(`playlists/${id}`),
                method: "PATCH",
                data: { name },
            })),
            deletePlaylist: change<string>((id) => ({ url: apiUrl(`playlists/${id}`), method: "DELETE" })),
        };
    },
    overrideExisting: false,
});

export const { useGetPlaylistsQuery, useSavePlaylistMutation, useRenamePlaylistMutation, useDeletePlaylistMutation } = playlistApi;
