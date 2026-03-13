import { UserFavorite, UserLocationItemKind } from "@uhn/common";
import { AppErrorV2, AppLogger } from "@uxp/bff-common";
import { UserFavoriteEntity } from "../db/entities/UserFavoriteEntity";
import { BlueprintRepository } from "../repositories/blueprint.repository";
import { UserFavoriteRepository } from "../repositories/user-favorite.repository";

function toUserFavorite(entity: UserFavoriteEntity): UserFavorite {
    return {
        id: entity.id,
        itemKind: entity.itemKind,
        itemRefId: entity.itemRefId,
        sortOrder: entity.sortOrder,
    };
}

async function getActiveBlueprintIdentifier(): Promise<string | null> {
    const active = await BlueprintRepository.findActive();
    return active?.identifier ?? null;
}

async function listFavorites(username: string): Promise<UserFavorite[]> {
    const blueprintIdentifier = await getActiveBlueprintIdentifier();
    if (!blueprintIdentifier) return [];
    const entities = await UserFavoriteRepository.findByUser(blueprintIdentifier, username);
    return entities.map(toUserFavorite);
}

async function addFavorite(username: string, itemKind: UserLocationItemKind, itemRefId: string): Promise<UserFavorite> {
    const blueprintIdentifier = await getActiveBlueprintIdentifier();
    if (!blueprintIdentifier) {
        throw new AppErrorV2({ statusCode: 400, code: "NOT_FOUND", message: "No active blueprint" });
    }
    const existing = await UserFavoriteRepository.findByUserAndItem(blueprintIdentifier, username, itemKind, itemRefId);
    if (existing) {
        return toUserFavorite(existing);
    }

    const maxOrder = await UserFavoriteRepository.getMaxSortOrder(blueprintIdentifier, username);

    const entity = new UserFavoriteEntity({
        blueprintIdentifier,
        username,
        itemKind,
        itemRefId,
        sortOrder: maxOrder + 1,
    });

    const saved = await UserFavoriteRepository.save(entity);

    AppLogger.info({ message: `Favorite added: ${itemKind}/${itemRefId} by ${username}` });

    return toUserFavorite(saved);
}

async function removeFavorite(id: number, username: string): Promise<void> {
    const entity = await UserFavoriteRepository.findByIdAndUser(id, username);
    if (!entity) return;

    await UserFavoriteRepository.remove(entity);

    AppLogger.info({ message: `Favorite removed: id=${id} by ${username}` });
}

async function removeAllFavorites(username: string): Promise<number> {
    const blueprintIdentifier = await getActiveBlueprintIdentifier();
    if (!blueprintIdentifier) return 0;
    const count = await UserFavoriteRepository.removeAllByUser(blueprintIdentifier, username);

    AppLogger.info({ message: `All favorites removed for ${username} (blueprint: ${blueprintIdentifier}, count: ${count})` });

    return count;
}

async function reorderFavorites(username: string, orderedIds: number[]): Promise<UserFavorite[]> {
    const blueprintIdentifier = await getActiveBlueprintIdentifier();
    if (!blueprintIdentifier) return [];
    const entities = await UserFavoriteRepository.findByUser(blueprintIdentifier, username);
    const entityMap = new Map(entities.map(e => [e.id, e]));

    const seen = new Set<number>();
    let nextOrder = 0;

    // Apply explicit order from the client
    for (const id of orderedIds) {
        const entity = entityMap.get(id);
        if (entity) {
            entity.sortOrder = nextOrder++;
            await UserFavoriteRepository.save(entity);
            seen.add(id);
        }
    }

    // Append any DB items not included in orderedIds (e.g. added on another device)
    for (const entity of entities) {
        if (!seen.has(entity.id)) {
            entity.sortOrder = nextOrder++;
            await UserFavoriteRepository.save(entity);
        }
    }

    const updated = await UserFavoriteRepository.findByUser(blueprintIdentifier, username);
    return updated.map(toUserFavorite);
}

export const userFavoriteService = {
    listFavorites,
    addFavorite,
    removeFavorite,
    removeAllFavorites,
    reorderFavorites,
};
