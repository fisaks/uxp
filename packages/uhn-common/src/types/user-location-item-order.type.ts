import { UserLocationItemKind } from "./user-favorite.type";

export type LocationItemRef = { kind: UserLocationItemKind; refId: string };

export type UserLocationItemOrder = {
    locationId: string;
    locationItems: LocationItemRef[];
};

export type SaveLocationItemOrderRequest = {
    locationItems: LocationItemRef[];
};

export type LocationItemOrderParams = {
    locationId: string;
};
