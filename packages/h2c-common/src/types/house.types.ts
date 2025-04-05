export type HouseData = {
    name: string;
    address?: string;
    yearBuilt?: string;
    legalRegistrationNumber?: string;
    details?: Record<string, string>;
    documentId: string;
    buildings: BuildingData[];
};

export type BuildingData = {
    uuid: string;
    name: string;
    yearBuilt?: string;
    documentId: string;
    details?: Record<string, string>;
};

export type HouseSummary = {
    uuid: string;
    name: string;
};
export type House = {
    uuid: string;
    version: number;
} & HouseData;

export type HousePatchPayload = {
    key: string;
    value?: string | null; // The new value for that field
};

export type BuildingPatchPayload = {
    key: string;
    value?: string | null; // The new value for that field
};
