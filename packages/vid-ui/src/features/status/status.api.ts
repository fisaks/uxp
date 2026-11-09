import { VidStatus } from "@vid/common";
import { apiUrl } from "../../api/home-video-api";
import { vidApi } from "../../app/vidApi";

export const statusApi = vidApi.injectEndpoints({
    endpoints: (builder) => ({
        getStatus: builder.query<VidStatus, void>({ query: () => ({ url: apiUrl("status") }) }),
    }),
    overrideExisting: false,
});

export const { useGetStatusQuery } = statusApi;
