import { UserLocationSectionOrder } from "@uhn/common";
import { AppErrorV2, AppLogger } from "@uxp/bff-common";
import { UserLocationSectionOrderEntity } from "../db/entities/UserLocationSectionOrderEntity";
import { BlueprintRepository } from "../repositories/blueprint.repository";
import { UserLocationSectionOrderRepository } from "../repositories/user-location-section-order.repository";

function toUserLocationSectionOrder(entity: UserLocationSectionOrderEntity): UserLocationSectionOrder {
    return {
        locationIds: entity.locationIds,
    };
}

async function getActiveBlueprintIdentifier(): Promise<string | null> {
    const active = await BlueprintRepository.findActive();
    return active?.identifier ?? null;
}

async function getLocationSectionOrder(username: string): Promise<UserLocationSectionOrder> {
    const blueprintIdentifier = await getActiveBlueprintIdentifier();
    if (!blueprintIdentifier) return { locationIds: [] };
    const entity = await UserLocationSectionOrderRepository.findByUser(blueprintIdentifier, username);
    return entity ? toUserLocationSectionOrder(entity) : { locationIds: [] };
}

async function saveLocationSectionOrder(username: string, locationIds: string[]): Promise<UserLocationSectionOrder> {
    const blueprintIdentifier = await getActiveBlueprintIdentifier();
    if (!blueprintIdentifier) {
        throw new AppErrorV2({ statusCode: 400, code: "NOT_FOUND", message: "No active blueprint" });
    }

    let entity = await UserLocationSectionOrderRepository.findByUser(blueprintIdentifier, username);

    if (entity) {
        entity.locationIds = locationIds;
    } else {
        entity = new UserLocationSectionOrderEntity({
            blueprintIdentifier,
            username,
            locationIds,
        });
    }

    const saved = await UserLocationSectionOrderRepository.save(entity);

    AppLogger.info({ message: `Location section order saved by ${username}` });

    return toUserLocationSectionOrder(saved);
}

async function deleteLocationSectionOrder(username: string): Promise<void> {
    const blueprintIdentifier = await getActiveBlueprintIdentifier();
    if (!blueprintIdentifier) return;
    await UserLocationSectionOrderRepository.removeByUser(blueprintIdentifier, username);

    AppLogger.info({ message: `Location section order deleted by ${username}` });
}

export const userLocationSectionOrderService = {
    getLocationSectionOrder,
    saveLocationSectionOrder,
    deleteLocationSectionOrder,
};
