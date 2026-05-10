import { UhnScheduleCreatePayload, UhnScheduleMutePayload, UhnScheduleUnmutePayload, UserScheduleInfo } from "@uhn/common";
import { uhnApi } from "../../app/uhnApi";
import { getBaseUrl } from "../../config";

export const scheduleApi = uhnApi.injectEndpoints({
    endpoints: (builder) => ({
        createSchedule: builder.mutation<UserScheduleInfo, UhnScheduleCreatePayload>({
            query: (payload) => ({
                url: `${getBaseUrl()}/api/schedules`,
                method: "POST",
                data: payload,
            }),
        }),

        updateSchedule: builder.mutation<UserScheduleInfo, { id: number; payload: Partial<UhnScheduleCreatePayload> }>({
            query: ({ id, payload }) => ({
                url: `${getBaseUrl()}/api/schedules/${id}`,
                method: "PUT",
                data: payload,
            }),
        }),

        deleteSchedule: builder.mutation<{ id: number; scheduleId: string }, number>({
            query: (id) => ({
                url: `${getBaseUrl()}/api/schedules/${id}`,
                method: "DELETE",
            }),
        }),

        muteSchedule: builder.mutation<void, UhnScheduleMutePayload>({
            query: (payload) => ({
                url: `${getBaseUrl()}/api/schedules/mute`,
                method: "POST",
                data: payload,
            }),
        }),

        unmuteSchedule: builder.mutation<void, UhnScheduleUnmutePayload>({
            query: (payload) => ({
                url: `${getBaseUrl()}/api/schedules/unmute`,
                method: "POST",
                data: payload,
            }),
        }),
    }),
    overrideExisting: false,
});

export const {
    useCreateScheduleMutation,
    useUpdateScheduleMutation,
    useDeleteScheduleMutation,
    useMuteScheduleMutation,
    useUnmuteScheduleMutation,
} = scheduleApi;
