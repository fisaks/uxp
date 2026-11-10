import { CastGroup, CastGroupRequest } from "@vid/common";
import { apiUrl } from "../../api/home-video-api";
import { vidApi } from "../../app/vidApi";

export const castGroupApi = vidApi.injectEndpoints({
    endpoints: (builder) => {
        /** Every change answers with the groups as they are after it, which replace what is cached. */
        const change = <Arg>(request: (arg: Arg) => { url: string; method: "POST" | "PUT" | "DELETE"; data?: object }) =>
            builder.mutation<CastGroup[], Arg>({
                query: request,
                onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
                    try {
                        const { data } = await queryFulfilled;
                        dispatch(castGroupApi.util.updateQueryData("getCastGroups", undefined, () => data));
                    } catch {
                        // The caller says what went wrong, from the result of the mutation.
                    }
                },
            });

        return {
            getCastGroups: builder.query<CastGroup[], void>({ query: () => ({ url: apiUrl("cast/groups") }) }),
            createCastGroup: change<CastGroupRequest>((data) => ({ url: apiUrl("cast/groups"), method: "POST", data })),
            updateCastGroup: change<{ id: string } & CastGroupRequest>(({ id, ...data }) => ({
                url: apiUrl(`cast/groups/${id}`),
                method: "PUT",
                data,
            })),
            deleteCastGroup: change<string>((id) => ({ url: apiUrl(`cast/groups/${id}`), method: "DELETE" })),
        };
    },
    overrideExisting: false,
});

export const { useGetCastGroupsQuery, useCreateCastGroupMutation, useUpdateCastGroupMutation, useDeleteCastGroupMutation } = castGroupApi;
