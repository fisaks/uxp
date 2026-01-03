import { getRequestContext, Token } from "@uxp/bff-common";


import { NavigationRoute, NavigationTags, SystemAppMeta, UserRole } from "@uxp/common";
import { QueryRunner } from "typeorm";
import { AppEntity } from "../db/entities/AppEntity";
import { AccessType, RouteEntity } from "../db/entities/RouteEntity";
import { TagEntity } from "../db/entities/TagEntity";


export class NavigationService {


    private readonly user?: Token;
    private readonly isGuest: boolean;

    constructor(private readonly queryRunner: QueryRunner) {
        const { user } = getRequestContext(true);

        this.queryRunner = queryRunner;
        this.user = user;
        this.isGuest = !this.user;
    }


    private shouldInclude(rolesOnElement: UserRole[], accessType?: AccessType): boolean {
        if (accessType === "unauthenticated") {
            return this.isGuest;
        }

        if (!this.isGuest && accessType === "authenticated") {
            return true;
        }

        return rolesOnElement.some((role) =>
            this.user?.roles.includes(role)
        );
    }

    async getRoutes(): Promise<NavigationRoute[]> {
        const routes = await this.queryRunner.manager
            .getRepository(RouteEntity)
            .createQueryBuilder("route")
            .leftJoinAndSelect("route.page", "page") // Include the referenced PageEntity
            .leftJoinAndSelect("page.contents", "contents") // Include related PageAppsEntity
            .orderBy("route.routePattern", "ASC") // Order by route link
            .addOrderBy("contents.order", "ASC") // Then order by contents order
            .getMany();

        return routes
            .filter((f) => this.shouldInclude(f.roles, f.accessType))
            .map((route) => {
                return {
                    routePattern: route.routePattern,
                    link: route.link,
                    page: route.page ? {
                        identifier: route.page.identifier,
                        name: route.page.name,
                        config: route.page.config ?? { pageType: "fullWidth" },
                        contents: route.page.contents
                            .filter((f) => this.shouldInclude(f.roles, route.accessType))
                            .map((content) => {
                                return {
                                    uuid: content.uuid,
                                    internalComponent: content.internalComponent ?? undefined,
                                    //roles: content.roles
                                };
                            }),
                    }
                        : undefined,
                    identifier: route.identifier,
                    //groupName: route.groupName ?? undefined,
                    config: route.config,
                    //unauthenticatedOnly: route.unauthenticatedOnly,
                    //roles: route.roles
                } satisfies NavigationRoute;

            });
    }

    async getTags(): Promise<NavigationTags> {


        const tags = await this.queryRunner.manager
            .getRepository(TagEntity)
            .createQueryBuilder("tag")
            .leftJoinAndSelect("tag.routeTags", "routeTag")
            .leftJoinAndSelect("routeTag.route", "route")
            .leftJoinAndSelect("route.page", "page")
            .orderBy("tag.name", "ASC") // Order by tag name first
            .addOrderBy("routeTag.routeOrder", "ASC") // Then by tag_order
            .addOrderBy("page.identifier", "ASC") // Finally by page identifier
            .getMany();

        return tags.reduce<NavigationTags>((acc, tag) => {
            const taggedRoutes = tag.routeTags
                .filter((f) => this.shouldInclude(f.route.roles, f.route.accessType))
                .map((m) => m.route.identifier);
            if (taggedRoutes.length > 0) {
                acc[tag.name] = taggedRoutes;
            }
            return acc;
        }, {});
    }

    async getSystemCapabilities(): Promise<SystemAppMeta[]> {
        const apps = await this.queryRunner.manager
            .getRepository(AppEntity)
            .find({
                where: { isActive: true },
                order: { name: "ASC" },
            });

        const systemApps = apps
            .map<SystemAppMeta | null>((app) => {
                const healthEnabled = Boolean(app.config?.healthEntry);
                const systemPanelEnabled = Boolean(app.config?.systemEntry);

                if (!healthEnabled && !systemPanelEnabled) {
                    return null;
                }

                return {
                    appId: app.identifier,
                    appName: app.name,
                    capabilities: {
                        health: healthEnabled,
                        systemPanel: systemPanelEnabled,
                    },
                    _sort: app.config?.systemSortOrder,
                } as SystemAppMeta & { _sort?: number };
            })
            .filter((v): v is (SystemAppMeta & { _sort?: number }) => v !== null);

        systemApps.sort((a, b) => {
            const aHas = typeof a._sort === "number";
            const bHas = typeof b._sort === "number";

            if (aHas && bHas) return a._sort! - b._sort!;
            if (aHas && !bHas) return -1;
            if (!aHas && bHas) return 1;

            return a.appName.localeCompare(b.appName, undefined, { sensitivity: "base" });
        });

        return systemApps;
    }

}
