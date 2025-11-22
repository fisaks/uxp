import { House, HouseGetVersionResponse } from "@h2c/common";
import { createSlice } from "@reduxjs/toolkit";
import { JSONContent } from "@tiptap/core";
import { ApiErrorResponse } from "@uxp/common";
import { HouseDataDiff } from "./houseDiff.types";
import { addBuilding, addHouse, deleteHouse, fetchHouseDocumentForDiff, fetchHouseVersionForDiff, fetchHouses, patchBuildingField, patchHouseField, removeBuilding, restoreHouseVersion } from "./houseThunks";

type DocumentDiff = {
    houseUuid: string,
    documentId: string
    documentVersion: number
    loading: boolean
    error: ApiErrorResponse | undefined
    json?: JSONContent;
}

type HouseState = {
    houses: House[];
    diff: {
        loading: boolean
        error: ApiErrorResponse | undefined
        data: HouseDiffData | undefined
        documents: DocumentDiff[]
    }
};

const initialState: HouseState = {
    houses: [],
    diff: {
        loading: false,
        error: undefined,
        data: undefined,
        documents: []
    }

};

export type HouseDiffData = {
    a: HouseGetVersionResponse;
    b: HouseGetVersionResponse;
    diff: HouseDataDiff

}
const houseSlice = createSlice({
    name: "house",
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchHouses.fulfilled, (state, action) => {
                state.houses = action.payload;
            })
            .addCase(addHouse.fulfilled, (state, action) => {
                state.houses.push(action.payload);
            })
            .addCase(deleteHouse.fulfilled, (state, action) => {
                state.houses = [...state.houses.filter((h) => h.uuid !== action.payload)];
            })
            .addCase(patchHouseField.fulfilled, (state, action) => {
                state.houses = [...state.houses.map((h) => (h.uuid === action.payload.uuid ? action.payload : h))];
            })
            .addCase(addBuilding.fulfilled, (state, action) => {
                state.houses = state.houses.map((h) => h.uuid === action.payload.uuid ? action.payload : h);
            })
            .addCase(removeBuilding.fulfilled, (state, action) => {
                state.houses = state.houses.map((h) => h.uuid === action.payload.uuid ? action.payload : h);
            })
            .addCase(patchBuildingField.fulfilled, (state, action) => {
                state.houses = [...state.houses.map((h) => (h.uuid === action.payload.uuid ? action.payload : h))];
            })
            .addCase(restoreHouseVersion.fulfilled, (state, action) => {
                state.houses = [...state.houses.map((h) => (h.uuid === action.payload.uuid ? action.payload : h))];
            })
            .addCase(fetchHouseVersionForDiff.pending, (state) => {
                state.diff.loading = true;
                state.diff.error = undefined;
                state.diff.data = undefined;
                state.diff.documents = [];
            })
            .addCase(fetchHouseVersionForDiff.fulfilled, (state, { payload }) => {
                state.diff.data = payload;
                state.diff.loading = false;

            })
            .addCase(fetchHouseVersionForDiff.rejected, (state, { payload }) => {
                state.diff.loading = false;
                state.diff.error = payload as ApiErrorResponse;
            })

            .addCase(fetchHouseDocumentForDiff.pending, (state, { meta: { arg } }) => {
                state.diff.documents = state.diff.documents.filter(
                    f => !(f.houseUuid === arg.houseUuid &&
                        f.documentId === arg.documentId &&
                        f.documentVersion === arg.documentVersion));
                state.diff.documents.push({
                    houseUuid: arg.houseUuid,
                    documentId: arg.documentId,
                    documentVersion: arg.documentVersion,
                    loading: true,
                    error: undefined
                });
            })
            .addCase(fetchHouseDocumentForDiff.fulfilled, (state, { meta: { arg }, payload }) => {
                state.diff.documents = state.diff.documents.map(m => {
                    if (m.houseUuid === payload.houseUuid &&
                        m.documentId === payload.documentId &&
                        m.documentVersion === payload.documentVersion
                    ) {
                        return {
                            ...m,
                            loading: false,
                            json: payload.json,
                        }
                    }
                    return m;
                })
            })
            .addCase(fetchHouseDocumentForDiff.rejected, (state, { meta: { arg }, payload }) => {
                state.diff.documents = state.diff.documents.map(m => {
                    if (m.houseUuid === arg.houseUuid &&
                        m.documentId === arg.documentId &&
                        m.documentVersion === arg.documentVersion) {
                        return {
                            ...m,
                            loading: false,
                            error: payload as ApiErrorResponse
                        }
                    }
                    return m;
                })
            })
    },
});

//export const { setHouseData } = houseSlice.actions;
export default houseSlice.reducer;
