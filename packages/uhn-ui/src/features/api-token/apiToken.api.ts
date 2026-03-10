import { ApiTokenCreateResponse, ApiTokenInfo } from "@uhn/common";
import { uhnApi } from "../../app/uhnApi";
import { getBaseUrl } from "../../config";

export const apiTokenApi = uhnApi.injectEndpoints({
    endpoints: (builder) => ({
        fetchApiTokens: builder.query<ApiTokenInfo[], void>({
            query: () => ({ url: `${getBaseUrl()}/api/api-tokens` }),
            providesTags: ["ApiTokens"],
        }),

        createApiToken: builder.mutation<
            ApiTokenCreateResponse,
            { label: string; blueprintIdentifier: string }
        >({
            query: (body) => ({
                url: `${getBaseUrl()}/api/api-tokens`,
                method: "POST",
                data: body,
            }),
            invalidatesTags: ["ApiTokens"],
        }),

        revokeApiToken: builder.mutation<{ id: number }, number>({
            query: (id) => ({
                url: `${getBaseUrl()}/api/api-tokens/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["ApiTokens"],
        }),
    }),
    overrideExisting: false,
});

export const {
    useFetchApiTokensQuery,
    useCreateApiTokenMutation,
    useRevokeApiTokenMutation,
} = apiTokenApi;
