import {
    Blueprint,
    BlueprintActivationDetails,
    BlueprintVersion,
    BlueprintVersionLog
} from '@uhn/common';
import { uhnApi } from '../../app/uhnApi';
import { getBaseUrl } from '../../config';


export const blueprintApi = uhnApi.injectEndpoints({
    endpoints: (builder) => ({
        fetchBlueprints: builder.query<Blueprint[], void>({
            query: () => ({ url: `${getBaseUrl()}/api/blueprints` }),
            providesTags: ['Blueprints'],
        }),

        fetchBlueprintVersionActivations: builder.query<
            BlueprintActivationDetails[],
            { identifier: string; version: number }
        >({
            query: (args) => ({
                url: `${getBaseUrl()}/api/blueprints/${args.identifier}/${args.version}/activations`
            }),
            providesTags: (_r, _e, arg) => [
                { type: 'BlueprintActivations', id: `${arg.identifier}-${arg.version}` }
            ],
        }),

        fetchBlueprintActivations: builder.query<
            BlueprintActivationDetails[],
            number | void
        >({
            query: (limit = 100) => ({
                url: `${getBaseUrl()}/api/blueprints/activations`,
                params: { limit },
            }),
            providesTags: ['BlueprintActivations'],
        }),
        fetchBlueprintVersionLog: builder.query<
            BlueprintVersionLog,
            { identifier: string; version: number }
        >({
            query: ({ identifier, version }) => ({
                url: `${getBaseUrl()}/api/blueprints/${identifier}/${version}/log`,
            }),
            providesTags: (_r, _e, arg) => [
                { type: 'Blueprints', id: `${arg.identifier}-${arg.version}-log` }
            ],
        }),
        activateBlueprint: builder.mutation<
            BlueprintVersion,
            { identifier: string; version: number }
        >({
            query: ({ identifier, version }) => ({
                url: `${getBaseUrl()}/api/blueprints/${identifier}/${version}/activate`,
                method: 'POST',
            }),
            invalidatesTags: ['Blueprints', 'BlueprintActivations'],
        }),

        deactivateBlueprint: builder.mutation<
            BlueprintVersion,
            { identifier: string; version: number }
        >({
            query: ({ identifier, version }) => ({
                url: `${getBaseUrl()}/api/blueprints/${identifier}/${version}/deactivate`,
                method: 'POST',
            }),
            invalidatesTags: ['Blueprints', 'BlueprintActivations'],

        }),

        deleteBlueprint: builder.mutation<
            { identifier: string; version: number },
            { identifier: string; version: number }
        >({
            query: ({ identifier, version }) => ({
                url: `${getBaseUrl()}/api/blueprints/${identifier}/${version}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Blueprints', 'BlueprintActivations'],
        }),
    }),
    overrideExisting: false,
});

export const {
    useFetchBlueprintsQuery,
    useFetchBlueprintVersionActivationsQuery,
    useFetchBlueprintActivationsQuery,
    useFetchBlueprintVersionLogQuery,
    useActivateBlueprintMutation,
    useDeactivateBlueprintMutation,
    useDeleteBlueprintMutation,
} = blueprintApi;
