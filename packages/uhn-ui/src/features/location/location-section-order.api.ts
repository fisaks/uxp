import { UserLocationSectionOrder } from "@uhn/common";
import { uhnApi } from "../../app/uhnApi";
import { getBaseUrl } from "../../config";

export const locationSectionOrderApi = uhnApi.injectEndpoints({
    endpoints: (builder) => ({
        fetchLocationSectionOrder: builder.query<UserLocationSectionOrder, void>({
            query: () => ({ url: `${getBaseUrl()}/api/user/location-section-order` }),
            providesTags: ["LocationSectionOrder"],
        }),

        saveLocationSectionOrder: builder.mutation<UserLocationSectionOrder, { locationIds: string[] }>({
            query: ({ locationIds }) => ({
                url: `${getBaseUrl()}/api/user/location-section-order`,
                method: "PUT",
                data: { locationIds },
            }),
            async onQueryStarted({ locationIds }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    locationSectionOrderApi.util.updateQueryData("fetchLocationSectionOrder", undefined, () => {
                        return { locationIds } as UserLocationSectionOrder;
                    })
                );
                try {
                    const { data } = await queryFulfilled;
                    dispatch(
                        locationSectionOrderApi.util.updateQueryData("fetchLocationSectionOrder", undefined, () => {
                            return data;
                        })
                    );
                } catch {
                    patchResult.undo();
                }
            },
        }),

        deleteLocationSectionOrder: builder.mutation<void, void>({
            query: () => ({
                url: `${getBaseUrl()}/api/user/location-section-order`,
                method: "DELETE",
            }),
            async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    locationSectionOrderApi.util.updateQueryData("fetchLocationSectionOrder", undefined, () => {
                        return { locationIds: [] };
                    })
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
        }),
    }),
    overrideExisting: false,
});

export const {
    useFetchLocationSectionOrderQuery,
    useSaveLocationSectionOrderMutation,
    useDeleteLocationSectionOrderMutation,
} = locationSectionOrderApi;
