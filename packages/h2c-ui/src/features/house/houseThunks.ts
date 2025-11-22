import { BuildingDataVersion, House, HouseDataVersion, HouseGetVersionResponse } from "@h2c/common";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { JSONContent } from "@tiptap/core";
import { AxiosUtil } from "@uxp/common";
import { generateRichTextDiffFromJson, yDocToJson } from "@uxp/ui-lib";
import axios from "axios";
import { DateTime } from "luxon";


import * as Y from 'yjs';
import { getBaseUrl } from "../../config";
import { getDocument } from "../document/document.api";
import { createLoadingErrorAwareThunk } from "../loading-error/loadingErrorSlice";
import { fetchHouse, fetchHouseVersion } from "./house.api";
import { diffHouseData } from "./houseDiff";
import { HouseDiffData } from "./houseSlice";

export const fetchHouses = createLoadingErrorAwareThunk("houses/fetch", async () => {
    //await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await axios.get<House[]>(`${getBaseUrl()}/api/houses`);
    return response.data;
});

export const addHouse = createAsyncThunk("houses/add", async () => {
    //await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await axios.post<House>(`${getBaseUrl()}/api/houses`);
    return response.data;
});

export const deleteHouse = createAsyncThunk("houses/delete", async (houseuuid: string) => {
    //await new Promise((resolve) => setTimeout(resolve, 1000));
    await axios.delete(`${getBaseUrl()}/api/houses/${houseuuid}`);
    return houseuuid;
});

export const patchHouseField = createAsyncThunk(
    "house/patchHouseField",
    async ({ entityId, field, value }: { entityId: string; field: string; value?: string }, { rejectWithValue }) => {
        //await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
            const response = await axios.patch<House>(`${getBaseUrl()}/api/houses/${entityId}`, {
                key: field,
                value: value,
            });
            return response.data;
        } catch (e: unknown) {
            const error = AxiosUtil.getErrorResponse(e);
            return rejectWithValue(error);
        }
    }
);

export const addBuilding = createAsyncThunk("houses/building/add", async (houseuuid: string) => {
    //await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await axios.post<House>(`${getBaseUrl()}/api/houses/${houseuuid}/buildings`);
    return response.data;
});
type RemoveBuildingParams = { houseUuid: string; buildingUuid: string }


export const removeBuilding = createAsyncThunk("houses/building/remove", async ({ houseUuid, buildingUuid }: RemoveBuildingParams) => {
    //await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await axios.delete<House>(`${getBaseUrl()}/api/houses/${houseUuid}/buildings/${buildingUuid}`);
    return response.data;
});


export const patchBuildingField = createAsyncThunk(
    "house/patchBuildingField",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async ({ uuidHouse, uuidBuilding, field, value }: { uuidHouse: string; uuidBuilding: string, field: string; value?: string }) => {
        //await new Promise((resolve) => setTimeout(resolve, 1000));
        const response = await axios.patch<House>(`${getBaseUrl()}/api/houses/${uuidHouse}/buildings/${uuidBuilding}`, {
            key: field,
            value: value,
        });
        return response.data;
    }
);

export const restoreHouseVersion = createAsyncThunk(
    "house/restoreHouseVersion",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async ({ uuidHouse, version }: { uuidHouse: string; version: string }, { rejectWithValue }) => {
        //await new Promise((resolve) => setTimeout(resolve, 1000));
        try {
            const response = await axios.post(`${getBaseUrl()}/api/houses/${uuidHouse}/versions/${version}/restore`);
            return response.data;
        } catch (e: unknown) {
            return rejectWithValue(AxiosUtil.getErrorResponse(e));
        }
    }
);

type HouseVersionDiffArgs = {
    uuidHouse: string;
    versionA: string;
    versionB: string;
}
export const fetchHouseVersionForDiff = createAsyncThunk(
    "house/fetchHouseVersionForDiff",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async ({ uuidHouse, versionA, versionB }: HouseVersionDiffArgs, { rejectWithValue, dispatch, getState }) => {
        //await new Promise((resolve) => setTimeout(resolve, 1000));
        const fetch = async (version: string) => {
            if (version === "snapshot") {
                const house = await fetchHouse(uuidHouse);
                const { uuid, name, address, buildings, documentId, details, legalRegistrationNumber, yearBuilt } = house
                return {
                    uuid,
                    version: 0,
                    label: "snapshot",
                    createdAt: DateTime.now().toUTC().toISO(),
                    data: {
                        name,
                        address,
                        documentId,
                        documentVersion: 0,
                        details,
                        legalRegistrationNumber,
                        yearBuilt,
                        buildings: buildings.map(({ uuid, documentId, name, details, yearBuilt }) => ({
                            uuid,
                            documentId,
                            documentVersion: 0,
                            name,
                            details,
                            yearBuilt
                        } satisfies BuildingDataVersion))
                    }
                } satisfies HouseGetVersionResponse;
            }
            return fetchHouseVersion(uuidHouse, parseInt(version));
        }
        try {
            const houseA = fetch(versionA);
            const houseB = fetch(versionB);
            const houses = await Promise.all([houseA, houseB]);
            const documents = collectAllDocumentIds(houses[0].data, houses[1].data);

            documents.forEach((doc) => {
                dispatch(fetchHouseDocumentForDiff({
                    houseUuid: uuidHouse,
                    documentId: doc.documentId,
                    documentVersion: doc.version,

                }));

            });
            const diff = diffHouseData(houses[0].data, houses[1].data);

            return {
                a: houses[0],
                b: houses[1],
                diff

            } satisfies HouseDiffData;
        } catch (e: unknown) {
            return rejectWithValue(AxiosUtil.getErrorResponse(e));
        }
    }
);

type FetchDocumentForDiffArgs = {
    houseUuid: string;
    documentId: string;
    documentVersion: number;
}
export type FetchDocumentForDiffResponse = {
    houseUuid: string,
    documentId: string
    a: {
        originalJson: JSONContent;
        diff: JSONContent;
    };
    b: {
        originalJson: JSONContent;
        diff: JSONContent;
    };
}
export const fetchHouseDocumentForDiff = createAsyncThunk(
    "house/fetchHouseDocument",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async ({ houseUuid, documentId, documentVersion }:
        FetchDocumentForDiffArgs, { rejectWithValue }) => {
        //await new Promise((resolve) => setTimeout(resolve, 1000));
        const getVersion = (version: number) => {
            return version === 0 ? "snapshot" : version.toString();
        }
        try {
            const document = await getDocument(documentId, getVersion(documentVersion));
            const yDoc = new Y.Doc();
            Y.applyUpdate(yDoc, document.data);

            const json = yDocToJson(yDoc, {
                basePath: `${getBaseUrl()}/api/file`
            });
            return {
                houseUuid,
                documentId,
                documentVersion,
                json
            };

        } catch (e: unknown) {
            return rejectWithValue(AxiosUtil.getErrorResponse(e));
        }
    }
);

type DocumentReference = {
    documentId: string;
    version: number; // include this only if available
};

function collectAllDocumentIds(
    houseA: HouseDataVersion,
    houseB: HouseDataVersion
): DocumentReference[] {
    const documentIds = new Set<string>();

    const addDoc = (docId?: string, version?: number) => {
        if (docId) {
            const combined = version != null ? `${docId}@${version}` : docId;
            documentIds.add(combined);
        }
    };

    const collect = (house: HouseDataVersion) => {
        addDoc(house.documentId, house.documentVersion);
        house.buildings.forEach(building =>
            addDoc(building.documentId, building.documentVersion)
        );
    };

    collect(houseA);
    collect(houseB);
    return Array.from(documentIds).map((entry) => {
        const [documentId, version] = entry.split("@");
        return { documentId, version: Number(version) };

    });

}
