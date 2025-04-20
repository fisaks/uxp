export type HouseData = {
    name: string;
    address?: string;
    yearBuilt?: string;
    legalRegistrationNumber?: string;
    details?: Record<string, string>;
    documentId: string;
    buildings: BuildingData[];
};

export type HouseDataVersion = Omit<HouseData, "buildings"> & {
    documentVersion: number;
    buildings: BuildingDataVersion[];
}
export type BuildingData = {
    uuid: string;
    name: string;
    yearBuilt?: string;
    documentId: string;
    details?: Record<string, string>;
};

export type BuildingDataVersion = BuildingData & {
    documentVersion: number;
}

export type HouseSummary = {
    uuid: string;
    name: string;
};
export type House = {
    uuid: string;
} & HouseData;

export type HousePatchPayload = {
    key: string;
    value?: string | null; // The new value for that field
};

export type BuildingPatchPayload = {
    key: string;
    value?: string | null; // The new value for that field
};

export type HouseCreateVersionPayload = {
    label?: string;
}
export type HouseCreateVersionResponse = {
    uuid: string;
    version: number;
    label?: string;
    new: boolean
}
export type HouseGetVersionResponse = {
    uuid: string;
    version: number;
    data: HouseDataVersion;
    createdAt: string;
    label?: string;
}