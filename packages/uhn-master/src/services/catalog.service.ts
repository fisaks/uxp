import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

export class CatalogService {
    private static instance: CatalogService | null = null;

    private catalogs = new Map<string, unknown>();

    private constructor() { }

    static getInstance() {
        return this.instance ?? (this.instance = new CatalogService());
    }

    handleCatalog(topic: string, payload: unknown) {
        this.catalogs.set(topic, payload);

        UHNAppServerWebSocketManager.getInstance().broadcastTopicMessage({
            payload: { topic, message: payload }
        });
    }

    getCatalog(topic: string) {
        return this.catalogs.get(topic);
    }
}
