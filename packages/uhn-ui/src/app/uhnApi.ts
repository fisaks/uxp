import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './axiosBaseQuery';
import { getBaseUrl } from '../config';

export const uhnApi = createApi({
  reducerPath: 'uhnApi',
  baseQuery: axiosBaseQuery(),
  tagTypes: [
    'Blueprints',
    'BlueprintActivations'
    // Add feature tagTypes here
  ],
  endpoints: () => ({}), // Empty, features will inject endpoints
});
