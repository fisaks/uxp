import { CAST_GROUP_MIN_MEMBERS, CastGroup, CastGroupRequest } from "@vid/common";
import { AppErrorV2 } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { randomBytes } from "crypto";
import { castConfig } from "./cast.config";
import { CastGroupStore } from "./cast-group-store";

const sameName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;

/** The saved groups of Chromecasts. A group is only a name and a list of devices; running one is up to the cast service. */
export class CastGroupService {
    private readonly store = new CastGroupStore(castConfig.groupsFile);

    load(): Promise<void> {
        return this.store.load();
    }

    flush(): Promise<void> {
        return this.store.flush();
    }

    list(): CastGroup[] {
        return [...this.store.all()];
    }

    get(id: string): CastGroup | undefined {
        return this.store.get(id);
    }

    create(request: CastGroupRequest): CastGroup[] {
        this.store.put({ id: randomBytes(16).toString("hex"), ...this.checkedRequest(request) });
        return this.list();
    }

    update(id: string, request: CastGroupRequest): CastGroup[] {
        this.find(id);
        this.store.put({ id, ...this.checkedRequest(request, id) });
        return this.list();
    }

    remove(id: string): CastGroup[] {
        if (!this.store.delete(id)) {
            throw this.notFound();
        }
        return this.list();
    }

    private find(id: string): CastGroup {
        const group = this.store.get(id);
        if (!group) {
            throw this.notFound();
        }
        return group;
    }

    private checkedRequest({ name, deviceIds, browser = false }: CastGroupRequest, ownId?: string): Omit<CastGroup, "id"> {
        if (deviceIds.length + (browser ? 1 : 0) < CAST_GROUP_MIN_MEMBERS) {
            throw new AppErrorV2({
                statusCode: 400,
                code: ErrorCodes.VALIDATION,
                message: `A group needs at least ${CAST_GROUP_MIN_MEMBERS} members, counting the player tab`,
            });
        }
        return { name: this.checkedName(name, ownId), deviceIds: [...deviceIds], browser };
    }

    /** The name is unique among the groups, apart from the group that is being changed. */
    private checkedName(name: string, ownId?: string): string {
        const trimmed = name.trim();
        if (trimmed === "") {
            throw new AppErrorV2({ statusCode: 400, code: ErrorCodes.VALIDATION, message: "A group needs a name" });
        }
        if (this.store.all().some((g) => g.id !== ownId && sameName(g.name, trimmed))) {
            throw new AppErrorV2({ statusCode: 409, code: ErrorCodes.INVALID_STATE, message: "A group with that name exists" });
        }
        return trimmed;
    }

    private notFound() {
        return new AppErrorV2({ statusCode: 404, code: ErrorCodes.NOT_FOUND, message: "There is no such group" });
    }
}

export const castGroupService = new CastGroupService();
