
export type ElectricityPriceEntry = {
    price: number;
    /** Interval start as a full ISO 8601 UTC date-time (not just a date), e.g. "2026-06-10T21:00:00.000Z". */
    startDate: string;
    /** Interval end as a full ISO 8601 UTC date-time (not just a date); equals the next entry's startDate. */
    endDate: string;
};

export type ElectricityPriceSnapshot = {
    prices: ElectricityPriceEntry[];
    fetchedAt: string;
};

export type UhnElectricityPricesResponse = {
    snapshot: ElectricityPriceSnapshot;
};

export type UhnElectricityPayloadResponseMap = {
    "uhn:electricity:prices": UhnElectricityPricesResponse;
};

export type UhnElectricityRefreshPayload = Record<string, never>;

export type UhnElectricityPayloadRequestMap = {
    "uhn:electricity:refresh": UhnElectricityRefreshPayload;
};

/** IPC command: electricity price update -> rule runtime. */
export type RuleRuntimeElectricityPriceCommand = {
    kind: "event";
    cmd: "electricityPriceUpdate";
    payload: ElectricityPriceSnapshot;
};
