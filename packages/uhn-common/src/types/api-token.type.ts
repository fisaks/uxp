export type ApiTokenInfo = {
    id: number;
    label: string;
    blueprintIdentifier: string;
    lastFourChars: string;
    createdAt: string;
    createdBy: string;
    lastUsedAt?: string;
    revokedAt?: string;
};

export type ApiTokenCreateResponse = {
    id: number;
    token: string;
    label: string;
    blueprintIdentifier: string;
};
