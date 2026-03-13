import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './axiosBaseQuery';
import { getBaseUrl } from '../config';

export const uhnApi = createApi({
  reducerPath: 'uhnApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: [
    'Blueprints',
    'BlueprintActivations',
    'ApiTokens',
    'Favorites',
    'LocationOrders',
    'LocationSectionOrder',
  ],
  endpoints: () => ({}), // Empty, features will inject endpoints
});
