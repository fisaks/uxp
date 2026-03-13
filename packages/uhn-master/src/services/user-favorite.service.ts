import { UserFavorite, UserFavoriteItemKind } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { UserFavoriteEntity } from "../db/entities/UserFavoriteEntity";
import { UserFavoriteRepository } from "../repositories/user-favorite.repository";

function toUserFavorite(entity: UserFavoriteEntity): UserFavorite {
    return {
        id: entity.id,
        itemKind: entity.itemKind,
        itemRefId: entity.itemRefId,
        sortOrder: entity.sortOrder,
    };
}

async function listFavorites(username: string): Promise<UserFavorite[]> {
    const entities = await UserFavoriteRepository.findByUser(username);
    return entities.map(toUserFavorite);
}

async function addFavorite(username: string, itemKind: UserFavoriteItemKind, itemRefId: string): Promise<UserFavorite> {
    const existing = await UserFavoriteRepository.findByUserAndItem(username, itemKind, itemRefId);
    if (existing) {
        return toUserFavorite(existing);
    }

    const maxOrder = await UserFavoriteRepository.getMaxSortOrder(username);

    const entity = new UserFavoriteEntity({
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

async function reorderFavorites(username: string, orderedIds: number[]): Promise<UserFavorite[]> {
    const entities = await UserFavoriteRepository.findByUser(username);
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

    const updated = await UserFavoriteRepository.findByUser(username);
    return updated.map(toUserFavorite);
}

export const userFavoriteService = {
    listFavorites,
    addFavorite,
    removeFavorite,
    reorderFavorites,
};
