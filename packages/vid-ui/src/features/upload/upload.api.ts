import { UploadCreateRequest, UploadSession, UploadStatus } from "@vid/common";
import { apiUrl } from "../../api/home-video-api";
import axiosInstance from "../../api/axiosInstance";
import { vidApi } from "../../app/vidApi";

export const uploadApi = vidApi.injectEndpoints({
    endpoints: (builder) => ({
        /** Whether uploads are taken right now, and the limits. Asked again each time the page opens. */
        getUploadStatus: builder.query<UploadStatus, void>({
            query: () => ({ url: apiUrl("uploads/status") }),
            keepUnusedDataFor: 0,
        }),
    }),
    overrideExisting: false,
});

export const { useGetUploadStatusQuery } = uploadApi;

// The chunks are not data of the pages, so they go with axios and not through the cache.

export const createUpload = (request: UploadCreateRequest) =>
    axiosInstance.post<UploadSession>(apiUrl("uploads"), request).then(({ data }) => data);

export const getUpload = (id: string) => axiosInstance.get<UploadSession>(apiUrl(`uploads/${id}`)).then(({ data }) => data);

export const putChunk = (id: string, offset: number, chunk: Blob, signal: AbortSignal, onProgress: (sent: number) => void) =>
    axiosInstance
        .put<UploadSession>(apiUrl(`uploads/${id}`), chunk, {
            params: { offset },
            headers: { "Content-Type": "application/octet-stream" },
            signal,
            onUploadProgress: (event) => onProgress(offset + event.loaded),
        })
        .then(({ data }) => data);

export const deleteUpload = (id: string) => axiosInstance.delete(apiUrl(`uploads/${id}`)).then(() => undefined);
