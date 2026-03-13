import { LocationItemRef, UserLocationItemOrder } from "@uhn/common";
import { uhnApi } from "../../app/uhnApi";
import { getBaseUrl } from "../../config";

function upsertLocationItemOrder(locationItemOrders: UserLocationItemOrder[], locationItemOrder: UserLocationItemOrder): void {
    const idx = locationItemOrders.findIndex(o => o.locationId === locationItemOrder.locationId);
    if (idx >= 0) {
        locationItemOrders[idx] = locationItemOrder;
    } else {
        locationItemOrders.push(locationItemOrder);
    }
}

export const locationItemOrderApi = uhnApi.injectEndpoints({
    endpoints: (builder) => ({
        fetchLocationItemOrders: builder.query<UserLocationItemOrder[], void>({
            query: () => ({ url: `${getBaseUrl()}/api/user/location-item-orders` }),
            providesTags: ["LocationItemOrders"],
        }),

        saveLocationItemOrder: builder.mutation<UserLocationItemOrder, { locationId: string; locationItems: LocationItemRef[] }>({
            query: ({ locationId, locationItems }) => ({
                url: `${getBaseUrl()}/api/user/location-item-orders/${encodeURIComponent(locationId)}`,
                method: "PUT",
                data: { locationItems },
            }),
            async onQueryStarted({ locationId, locationItems }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    locationItemOrderApi.util.updateQueryData("fetchLocationItemOrders", undefined, (locationItemOrders) => {
                        upsertLocationItemOrder(locationItemOrders, { locationId, locationItems });
                    })
                );
                try {
                    const { data } = await queryFulfilled;
                    dispatch(
                        locationItemOrderApi.util.updateQueryData("fetchLocationItemOrders", undefined, (locationItemOrders) => {
                            upsertLocationItemOrder(locationItemOrders, data);
                        })
                    );
                } catch {
                    patchResult.undo();
                }
            },
        }),

        deleteLocationItemOrder: builder.mutation<{ locationId: string }, string>({
            query: (locationId) => ({
                url: `${getBaseUrl()}/api/user/location-item-orders/${encodeURIComponent(locationId)}`,
                method: "DELETE",
            }),
            async onQueryStarted(locationId, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    locationItemOrderApi.util.updateQueryData("fetchLocationItemOrders", undefined, (locationItemOrders) => {
                        const idx = locationItemOrders.findIndex(o => o.locationId === locationId);
                        if (idx >= 0) locationItemOrders.splice(idx, 1);
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
    useFetchLocationItemOrdersQuery,
    useSaveLocationItemOrderMutation,
    useDeleteLocationItemOrderMutation,
} = locationItemOrderApi;
