import { LocationItemRef, UserLocationOrder } from "@uhn/common";
import { uhnApi } from "../../app/uhnApi";
import { getBaseUrl } from "../../config";

function upsertLocationOrder(locationOrders: UserLocationOrder[], locationOrder: UserLocationOrder): void {
    const idx = locationOrders.findIndex(o => o.locationId === locationOrder.locationId);
    if (idx >= 0) {
        locationOrders[idx] = locationOrder;
    } else {
        locationOrders.push(locationOrder);
    }
}

export const locationOrderApi = uhnApi.injectEndpoints({
    endpoints: (builder) => ({
        fetchLocationOrders: builder.query<UserLocationOrder[], void>({
            query: () => ({ url: `${getBaseUrl()}/api/user/location-orders` }),
            providesTags: ["LocationOrders"],
        }),

        saveLocationOrder: builder.mutation<UserLocationOrder, { locationId: string; locationItems: LocationItemRef[] }>({
            query: ({ locationId, locationItems }) => ({
                url: `${getBaseUrl()}/api/user/location-orders/${encodeURIComponent(locationId)}`,
                method: "PUT",
                data: { locationItems },
            }),
            async onQueryStarted({ locationId, locationItems }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    locationOrderApi.util.updateQueryData("fetchLocationOrders", undefined, (locationOrders) => {
                        upsertLocationOrder(locationOrders, { locationId, locationItems });
                    })
                );
                try {
                    const { data } = await queryFulfilled;
                    dispatch(
                        locationOrderApi.util.updateQueryData("fetchLocationOrders", undefined, (locationOrders) => {
                            upsertLocationOrder(locationOrders, data);
                        })
                    );
                } catch {
                    patchResult.undo();
                }
            },
        }),

        deleteLocationOrder: builder.mutation<{ locationId: string }, string>({
            query: (locationId) => ({
                url: `${getBaseUrl()}/api/user/location-orders/${encodeURIComponent(locationId)}`,
                method: "DELETE",
            }),
            async onQueryStarted(locationId, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    locationOrderApi.util.updateQueryData("fetchLocationOrders", undefined, (locationOrders) => {
                        const idx = locationOrders.findIndex(o => o.locationId === locationId);
                        if (idx >= 0) locationOrders.splice(idx, 1);
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
    useFetchLocationOrdersQuery,
    useSaveLocationOrderMutation,
    useDeleteLocationOrderMutation,
} = locationOrderApi;
