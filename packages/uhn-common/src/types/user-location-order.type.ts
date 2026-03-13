import { UserLocationItemKind } from "./user-favorite.type";

export type LocationItemRef = { kind: UserLocationItemKind; refId: string };

export type UserLocationOrder = {
    locationId: string;
    locationItems: LocationItemRef[];
};

export type SaveLocationOrderRequest = {
    locationItems: LocationItemRef[];
};

export type LocationOrderParams = {
    locationId: string;
};
