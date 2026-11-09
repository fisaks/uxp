import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "../api/axiosBaseQuery";

export const vidApi = createApi({
    reducerPath: "vidApi",
    baseQuery: axiosBaseQuery(),
    tagTypes: ["Labels"],
    endpoints: () => ({}), // Empty, features inject their endpoints
});
