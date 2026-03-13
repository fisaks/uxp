import { LocationItemRef, UserLocationItemOrder } from "@uhn/common";
import { AppErrorV2, AppLogger } from "@uxp/bff-common";
import { UserLocationItemOrderEntity } from "../db/entities/UserLocationItemOrderEntity";
import { BlueprintRepository } from "../repositories/blueprint.repository";
import { UserLocationItemOrderRepository } from "../repositories/user-location-item-order.repository";

function toUserLocationItemOrder(entity: UserLocationItemOrderEntity): UserLocationItemOrder {
    return {
        locationId: entity.locationId,
        locationItems: entity.locationItems,
    };
}

async function getActiveBlueprintIdentifier(): Promise<string | null> {
    const active = await BlueprintRepository.findActive();
    return active?.identifier ?? null;
}

async function listLocationItemOrders(username: string): Promise<UserLocationItemOrder[]> {
    const blueprintIdentifier = await getActiveBlueprintIdentifier();
    if (!blueprintIdentifier) return [];
    const entities = await UserLocationItemOrderRepository.findByUser(blueprintIdentifier, username);
    return entities.map(toUserLocationItemOrder);
}

async function saveLocationItemOrder(username: string, locationId: string, locationItems: LocationItemRef[]): Promise<UserLocationItemOrder> {
    const blueprintIdentifier = await getActiveBlueprintIdentifier();
    if (!blueprintIdentifier) {
        throw new AppErrorV2({ statusCode: 400, code: "NOT_FOUND", message: "No active blueprint" });
    }
    let entity = await UserLocationItemOrderRepository.findByUserAndLocation(blueprintIdentifier, username, locationId);

    if (entity) {
        entity.locationItems = locationItems;
    } else {
        entity = new UserLocationItemOrderEntity({
            blueprintIdentifier,
            username,
            locationId,
            locationItems,
        });
    }

    const saved = await UserLocationItemOrderRepository.save(entity);

    AppLogger.info({ message: `Location item order saved: ${locationId} by ${username}` });

    return toUserLocationItemOrder(saved);
}

async function deleteLocationItemOrder(username: string, locationId: string): Promise<void> {
    const blueprintIdentifier = await getActiveBlueprintIdentifier();
    if (!blueprintIdentifier) return;
    await UserLocationItemOrderRepository.removeByUserAndLocation(blueprintIdentifier, username, locationId);

    AppLogger.info({ message: `Location item order deleted: ${locationId} by ${username}` });
}

export const userLocationItemOrderService = {
    listLocationItemOrders,
    saveLocationItemOrder,
    deleteLocationItemOrder,
};
