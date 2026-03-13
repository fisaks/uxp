import { LocationItemRef, UserLocationOrder } from "@uhn/common";
import { AppErrorV2, AppLogger } from "@uxp/bff-common";
import { UserLocationOrderEntity } from "../db/entities/UserLocationOrderEntity";
import { BlueprintRepository } from "../repositories/blueprint.repository";
import { UserLocationOrderRepository } from "../repositories/user-location-order.repository";

function toUserLocationOrder(entity: UserLocationOrderEntity): UserLocationOrder {
    return {
        locationId: entity.locationId,
        locationItems: entity.locationItems,
    };
}

async function getActiveBlueprintIdentifier(): Promise<string | null> {
    const active = await BlueprintRepository.findActive();
    return active?.identifier ?? null;
}

async function listLocationOrders(username: string): Promise<UserLocationOrder[]> {
    const blueprintIdentifier = await getActiveBlueprintIdentifier();
    if (!blueprintIdentifier) return [];
    const entities = await UserLocationOrderRepository.findByUser(blueprintIdentifier, username);
    return entities.map(toUserLocationOrder);
}

async function saveLocationOrder(username: string, locationId: string, locationItems: LocationItemRef[]): Promise<UserLocationOrder> {
    const blueprintIdentifier = await getActiveBlueprintIdentifier();
    if (!blueprintIdentifier) {
        throw new AppErrorV2({ statusCode: 400, code: "NOT_FOUND", message: "No active blueprint" });
    }
    let entity = await UserLocationOrderRepository.findByUserAndLocation(blueprintIdentifier, username, locationId);

    if (entity) {
        entity.locationItems = locationItems;
    } else {
        entity = new UserLocationOrderEntity({
            blueprintIdentifier,
            username,
            locationId,
            locationItems,
        });
    }

    const saved = await UserLocationOrderRepository.save(entity);

    AppLogger.info({ message: `Location order saved: ${locationId} by ${username}` });

    return toUserLocationOrder(saved);
}

async function deleteLocationOrder(username: string, locationId: string): Promise<void> {
    const blueprintIdentifier = await getActiveBlueprintIdentifier();
    if (!blueprintIdentifier) return;
    await UserLocationOrderRepository.removeByUserAndLocation(blueprintIdentifier, username, locationId);

    AppLogger.info({ message: `Location order deleted: ${locationId} by ${username}` });
}

export const userLocationOrderService = {
    listLocationOrders,
    saveLocationOrder,
    deleteLocationOrder,
};
